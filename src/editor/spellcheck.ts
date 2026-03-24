import { EditorView } from '@codemirror/view';
import { linter, Diagnostic } from '@codemirror/lint';
import Typo from 'typo-js';

// Global cache for the dictionary to prevent reloading on every rerender
let typo: Typo | null = null;
let typoLoading = false;

// Async function to load the dictionary files built into the public folder
async function loadDictionary() {
  if (typo || typoLoading) return;
  typoLoading = true;
  try {
    const affRes = await fetch('/dictionaries/en_GB.aff');
    const dicRes = await fetch('/dictionaries/en_GB.dic');
    const affData = await affRes.text();
    const dicData = await dicRes.text();
    
    // Initialize typo.js with the downloaded data
    typo = new Typo("en_GB", affData, dicData);
  } catch (err) {
    console.error("Failed to load spelling dictionaries:", err);
  } finally {
    typoLoading = false;
  }
}

// Start loading immediately in the background
loadDictionary();

// Linter function that runs over the document
export const spellcheckLinter = linter((view) => {
  const diagnostics: Diagnostic[] = [];
  
  // If dictionary isn't loaded yet, don't show any errors
  if (!typo) return diagnostics;

  const doc = view.state.doc;
  // A simple regex to find sequences of alphabetical characters (words)
  const wordRegex = /[a-zA-Z']+/g;

  // We only check the currently visible viewport to keep performance high
  // But for a simple doc, we can check the whole thing or chunks. 
  // Let's iterate over all text in the document line by line.
  // To avoid lag on huge documents, you might want to slice `doc` or use view.viewport.
  for (let i = 1; i <= doc.lines; i++) {
    const line = doc.line(i);
    let match;
    while ((match = wordRegex.exec(line.text)) !== null) {
      const word = match[0];
      
      // Skip words that are preceded directly by a backslash, as they are LaTeX macros/commands
      const beforeMatch = line.text.slice(0, match.index);
      if (beforeMatch.endsWith('\\')) continue;

      // Clean trailing/leading quotes
      const cleanWord = word.replace(/^'|'$/g, '');
      if (cleanWord.length <= 1) continue;

      if (!typo.check(cleanWord)) {
        diagnostics.push({
          from: line.from + match.index,
          to: line.from + match.index + word.length,
          severity: "error",
          source: "spellcheck",
          message: `Spelling: "${cleanWord}"`,
        });
      }
    }
  }

  return diagnostics;
}, {
  // Linter configuration
  delay: 600, 
});

// A custom theme to make our linter errors look like native red squigglies
export const spellcheckTheme = EditorView.theme({
  ".cm-diagnostic-error": {
    borderLeft: "none", // Remove standard lint block border
  },
  ".cm-lintRange-error": {
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='6' height='3'%3E%3Cpath d='M0 2.5 L1.5 1 L3 2.5 L4.5 1 L6 2.5' fill='none' stroke='%23ff453a' stroke-width='1'/%3E%3C/svg%3E")`,
    backgroundPosition: "bottom left",
    backgroundRepeat: "repeat-x",
    paddingBottom: "2px",
  }
});

export const spellcheckExtension = [
  spellcheckLinter,
  spellcheckTheme
];
