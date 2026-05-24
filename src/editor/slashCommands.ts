import {
  CompletionContext,
  CompletionResult,
  snippetCompletion,
  Completion,
} from "@codemirror/autocomplete";
import { Extension } from "@codemirror/state";
import { autocompletion } from "@codemirror/autocomplete";

const SNIPPETS: Completion[] = [
  // ── Environments ──────────────────────────────────────────────────────────
  snippetCompletion(
    "\\begin{figure}[h!]\n  \\centering\n  \\includegraphics[width=\\linewidth]{${1:image}}\n  \\caption{${2:Caption}}\n  \\label{fig:${3:label}}\n\\end{figure}",
    { label: "\\figure", detail: "figure environment", type: "keyword", boost: 10 }
  ),
  snippetCompletion(
    "\\begin{equation}\n  ${1:expression}\n\\end{equation}",
    { label: "\\equation", detail: "numbered equation", type: "keyword", boost: 9 }
  ),
  snippetCompletion(
    "\\begin{equation*}\n  ${1:expression}\n\\end{equation*}",
    { label: "\\equation*", detail: "unnumbered equation", type: "keyword" }
  ),
  snippetCompletion(
    "\\begin{align}\n  ${1:left} &= ${2:right} \\\\\\\\\n  ${3:}\n\\end{align}",
    { label: "\\align", detail: "aligned equations", type: "keyword", boost: 9 }
  ),
  snippetCompletion(
    "\\begin{align*}\n  ${1:left} &= ${2:right}\n\\end{align*}",
    { label: "\\align*", detail: "aligned equations (unnumbered)", type: "keyword" }
  ),
  snippetCompletion(
    "\\begin{itemize}\n  \\item ${1:first}\n  \\item ${2:second}\n\\end{itemize}",
    { label: "\\itemize", detail: "unordered list", type: "keyword", boost: 8 }
  ),
  snippetCompletion(
    "\\begin{enumerate}\n  \\item ${1:first}\n  \\item ${2:second}\n\\end{enumerate}",
    { label: "\\enumerate", detail: "numbered list", type: "keyword", boost: 8 }
  ),
  snippetCompletion(
    "\\begin{table}[h!]\n  \\centering\n  \\begin{tabular}{${1:l l l}}\n    \\hline\n    ${2:Col 1} & ${3:Col 2} & ${4:Col 3} \\\\\\\\\n    \\hline\n    ${5:} & ${6:} & ${7:} \\\\\\\\\n    \\hline\n  \\end{tabular}\n  \\caption{${8:Caption}}\n  \\label{tab:${9:label}}\n\\end{table}",
    { label: "\\table", detail: "table environment", type: "keyword", boost: 8 }
  ),
  snippetCompletion(
    "\\begin{abstract}\n  ${1:abstract text}\n\\end{abstract}",
    { label: "\\abstract", detail: "abstract environment", type: "keyword" }
  ),
  snippetCompletion(
    "\\begin{verbatim}\n${1:code}\n\\end{verbatim}",
    { label: "\\verbatim", detail: "verbatim text", type: "keyword" }
  ),
  snippetCompletion(
    "\\begin{pmatrix}\n  ${1:a} & ${2:b} \\\\\\\\\n  ${3:c} & ${4:d}\n\\end{pmatrix}",
    { label: "\\pmatrix", detail: "matrix (parentheses)", type: "keyword" }
  ),
  snippetCompletion(
    "\\begin{bmatrix}\n  ${1:a} & ${2:b} \\\\\\\\\n  ${3:c} & ${4:d}\n\\end{bmatrix}",
    { label: "\\bmatrix", detail: "matrix (brackets)", type: "keyword" }
  ),
  snippetCompletion(
    "\\begin{cases}\n  ${1:expr_1} & \\text{if } ${2:condition_1} \\\\\\\\\n  ${3:expr_2} & \\text{otherwise}\n\\end{cases}",
    { label: "\\cases", detail: "piecewise / cases", type: "keyword" }
  ),
  snippetCompletion(
    "\\begin{tikzpicture}\n  ${1:% tikz drawing}\n\\end{tikzpicture}",
    { label: "\\tikzpicture", detail: "TikZ drawing", type: "keyword" }
  ),
  // ── Sections ──────────────────────────────────────────────────────────────
  snippetCompletion("\\chapter{${1:Chapter Name}}", { label: "\\chapter", detail: "chapter heading", type: "keyword", boost: 7 }),
  snippetCompletion("\\section{${1:Section Name}}", { label: "\\section", detail: "section heading", type: "keyword", boost: 10 }),
  snippetCompletion("\\subsection{${1:Subsection Name}}", { label: "\\subsection", detail: "subsection heading", type: "keyword", boost: 9 }),
  snippetCompletion("\\subsubsection{${1:Name}}", { label: "\\subsubsection", detail: "subsubsection", type: "keyword" }),
  snippetCompletion("\\paragraph{${1:Title}}", { label: "\\paragraph", detail: "paragraph heading", type: "keyword" }),
  // ── Text formatting ───────────────────────────────────────────────────────
  snippetCompletion("\\textbf{${1:text}}", { label: "\\textbf", detail: "bold", type: "function", boost: 8 }),
  snippetCompletion("\\textit{${1:text}}", { label: "\\textit", detail: "italic", type: "function", boost: 8 }),
  snippetCompletion("\\emph{${1:text}}", { label: "\\emph", detail: "emphasis", type: "function", boost: 7 }),
  snippetCompletion("\\underline{${1:text}}", { label: "\\underline", detail: "underline", type: "function" }),
  snippetCompletion("\\texttt{${1:text}}", { label: "\\texttt", detail: "monospace", type: "function" }),
  snippetCompletion("\\textsc{${1:text}}", { label: "\\textsc", detail: "small caps", type: "function" }),
  snippetCompletion("\\footnote{${1:note}}", { label: "\\footnote", detail: "footnote", type: "function", boost: 6 }),
  snippetCompletion("\\textcolor{${1:color}}{${2:text}}", { label: "\\textcolor", detail: "colored text", type: "function" }),
  // ── References & citations ────────────────────────────────────────────────
  snippetCompletion("\\label{${1:label}}", { label: "\\label", detail: "define label", type: "function", boost: 9 }),
  snippetCompletion("\\ref{${1:label}}", { label: "\\ref", detail: "reference", type: "function", boost: 9 }),
  snippetCompletion("\\eqref{${1:label}}", { label: "\\eqref", detail: "equation reference", type: "function", boost: 7 }),
  snippetCompletion("\\pageref{${1:label}}", { label: "\\pageref", detail: "page reference", type: "function" }),
  snippetCompletion("\\cite{${1:key}}", { label: "\\cite", detail: "citation", type: "function", boost: 9 }),
  snippetCompletion("\\citep{${1:key}}", { label: "\\citep", detail: "parenthetical citation", type: "function" }),
  snippetCompletion("\\citet{${1:key}}", { label: "\\citet", detail: "textual citation", type: "function" }),
  // ── Math ──────────────────────────────────────────────────────────────────
  snippetCompletion("\\frac{${1:num}}{${2:denom}}", { label: "\\frac", detail: "fraction", type: "function", boost: 8 }),
  snippetCompletion("\\sqrt{${1:expr}}", { label: "\\sqrt", detail: "square root", type: "function", boost: 7 }),
  snippetCompletion("\\sqrt[${1:n}]{${2:expr}}", { label: "\\sqrt[n]", detail: "nth root", type: "function" }),
  snippetCompletion("\\sum_{${1:i=0}}^{${2:n}} ${3:f(i)}", { label: "\\sum", detail: "summation", type: "function", boost: 7 }),
  snippetCompletion("\\int_{${1:a}}^{${2:b}} ${3:f(x)} \\, dx", { label: "\\int", detail: "integral", type: "function", boost: 7 }),
  snippetCompletion("\\prod_{${1:i=1}}^{${2:n}} ${3:f(i)}", { label: "\\prod", detail: "product", type: "function" }),
  snippetCompletion("\\lim_{${1:x \\to \\infty}} ${2:f(x)}", { label: "\\lim", detail: "limit", type: "function" }),
  snippetCompletion("\\left( ${1:expr} \\right)", { label: "\\left(", detail: "auto parentheses", type: "function" }),
  snippetCompletion("\\left[ ${1:expr} \\right]", { label: "\\left[", detail: "auto brackets", type: "function" }),
  snippetCompletion("\\left\\{ ${1:expr} \\right\\}", { label: "\\left{", detail: "auto braces", type: "function" }),
  snippetCompletion("\\hat{${1:x}}", { label: "\\hat", detail: "hat accent", type: "function" }),
  snippetCompletion("\\bar{${1:x}}", { label: "\\bar", detail: "bar accent", type: "function" }),
  snippetCompletion("\\vec{${1:x}}", { label: "\\vec", detail: "vector arrow", type: "function" }),
  snippetCompletion("\\dot{${1:x}}", { label: "\\dot", detail: "dot accent", type: "function" }),
  snippetCompletion("\\tilde{${1:x}}", { label: "\\tilde", detail: "tilde accent", type: "function" }),
  snippetCompletion("\\overline{${1:expr}}", { label: "\\overline", detail: "overline", type: "function" }),
  snippetCompletion("\\underbrace{${1:expr}}_{${2:label}}", { label: "\\underbrace", detail: "underbrace", type: "function" }),
  snippetCompletion("\\overbrace{${1:expr}}^{${2:label}}", { label: "\\overbrace", detail: "overbrace", type: "function" }),
  // ── File inclusion ────────────────────────────────────────────────────────
  snippetCompletion("\\includegraphics[width=${1:\\linewidth}]{${2:filename}}", { label: "\\includegraphics", detail: "include image", type: "function", boost: 8 }),
  snippetCompletion("\\input{${1:filename}}", { label: "\\input", detail: "include .tex file", type: "function", boost: 7 }),
  snippetCompletion("\\include{${1:filename}}", { label: "\\include", detail: "include .tex (new page)", type: "function" }),
  // ── Bibliography ──────────────────────────────────────────────────────────
  snippetCompletion("\\bibliography{${1:references}}", { label: "\\bibliography", detail: "bibliography file", type: "function" }),
  snippetCompletion("\\bibliographystyle{${1:plain}}", { label: "\\bibliographystyle", detail: "bib style", type: "function" }),
  // ── Preamble ──────────────────────────────────────────────────────────────
  snippetCompletion("\\usepackage{${1:package}}", { label: "\\usepackage", detail: "import package", type: "function", boost: 6 }),
  snippetCompletion("\\usepackage[${1:options}]{${2:package}}", { label: "\\usepackage[...]", detail: "import package with options", type: "function" }),
  snippetCompletion("\\documentclass[${1:12pt,a4paper}]{${2:article}}", { label: "\\documentclass", detail: "document class", type: "function" }),
  snippetCompletion("\\newcommand{\\${1:name}}{${2:definition}}", { label: "\\newcommand", detail: "define command", type: "function" }),
  snippetCompletion("\\renewcommand{\\${1:name}}{${2:definition}}", { label: "\\renewcommand", detail: "redefine command", type: "function" }),
  // ── Misc ──────────────────────────────────────────────────────────────────
  snippetCompletion("\\item ${1:}", { label: "\\item", detail: "list item", type: "keyword", boost: 7 }),
  snippetCompletion("\\href{${1:url}}{${2:text}}", { label: "\\href", detail: "hyperlink", type: "function" }),
  snippetCompletion("\\url{${1:url}}", { label: "\\url", detail: "typeset URL", type: "function" }),
  snippetCompletion("\\hspace{${1:1em}}", { label: "\\hspace", detail: "horizontal space", type: "function" }),
  snippetCompletion("\\vspace{${1:1em}}", { label: "\\vspace", detail: "vertical space", type: "function" }),
  snippetCompletion("\\noindent\n${1:}", { label: "\\noindent", detail: "suppress indent", type: "function" }),
  snippetCompletion("\\caption{${1:caption text}}", { label: "\\caption", detail: "float caption", type: "function", boost: 7 }),
];

// Environment names offered inside \begin{...} / \end{...}
const ENVIRONMENTS: Completion[] = [
  "figure", "figure*", "table", "table*",
  "equation", "equation*", "align", "align*", "gather", "gather*",
  "multline", "multline*", "subequations", "split", "cases",
  "itemize", "enumerate", "description",
  "abstract", "verbatim", "lstlisting",
  "minipage", "center", "flushleft", "flushright",
  "pmatrix", "bmatrix", "vmatrix", "Bmatrix", "matrix",
  "tikzpicture", "scope",
  "theorem", "lemma", "corollary", "proposition", "definition",
  "proof", "remark", "example",
  "frame", "block", "alertblock",
  "document", "titlepage",
].map((env) => ({ label: env, detail: "environment", type: "type" }));

const IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".pdf", ".eps", ".svg", ".gif", ".bmp", ".tiff"]);
const TEX_FILE_CMDS = new Set(["input", "include"]);
const BIB_CMDS = new Set(["bibliography", "addbibresource"]);
const REF_CMDS = new Set(["ref", "eqref", "pageref", "autoref", "nameref", "cref", "Cref"]);
const CITE_CMDS = new Set([
  "cite", "citep", "citet", "citeyear", "citeyearpar", "citeauthor",
  "citealp", "citealt", "Citep", "Citet", "nocite", "fullcite", "textcite", "parencite",
]);

function extractLabels(doc: string): string[] {
  const labels: string[] = [];
  const re = /\\label\{([^}]+)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(doc)) !== null) labels.push(m[1]);
  return labels;
}

// Walk back from pos to find the LaTeX command whose { we're inside.
// Handles optional args: \cmd[...]{cursor}
function getEnclosingCommand(docText: string, pos: number): string | null {
  let depth = 0;
  const limit = Math.max(0, pos - 300);
  for (let i = pos - 1; i >= limit; i--) {
    const ch = docText[i];
    if (ch === "}") { depth++; continue; }
    if (ch === "{") {
      if (depth > 0) { depth--; continue; }
      const before = docText.slice(Math.max(0, i - 150), i);
      const m = before.match(/\\([a-zA-Z]+\*?)(?:\[[^\]]*\])*$/);
      return m ? m[1] : null;
    }
    if (ch === "\n") break;
  }
  return null;
}

export interface SlashCommandConfig {
  /** All project file paths (relative). Used for image/.tex/.bib argument completions. */
  projectFiles?: string[];
  /** Returns labels gathered from other tex files in the project. */
  getExtraLabels?: () => string[];
  /** Returns citation keys gathered from .bib files in the project. */
  getBibCitations?: () => string[];
}

export function createSlashCommandExtension(
  configOrFiles: SlashCommandConfig | string[] = {},
): Extension {
  // Back-compat: allow passing string[] directly
  const config: SlashCommandConfig = Array.isArray(configOrFiles)
    ? { projectFiles: configOrFiles }
    : configOrFiles;
  const projectFiles = config.projectFiles ?? [];
  const getExtraLabels = config.getExtraLabels ?? (() => []);
  const getBibCitations = config.getBibCitations ?? (() => []);

  function completionSource(context: CompletionContext): CompletionResult | null {
    // Backslash-triggered command/snippet completions
    const cmdMatch = context.matchBefore(/\\[a-zA-Z*]*/);
    if (cmdMatch) {
      return { from: cmdMatch.from, options: SNIPPETS, filter: true };
    }

    // Only stringify a small window around the cursor — avoids O(doc) work on
    // each trigger for large documents.
    const windowStart = Math.max(0, context.pos - 300);
    const slice = context.state.sliceDoc(windowStart, context.pos);
    const cmd = getEnclosingCommand(slice, slice.length);
    if (!cmd) return null;

    // Match partial text already typed inside the braces
    const inner = context.matchBefore(/[^{}\n,]*/);
    const from = inner ? inner.from : context.pos;

    if (cmd === "begin" || cmd === "end") {
      return { from, options: ENVIRONMENTS, filter: true };
    }

    if (REF_CMDS.has(cmd)) {
      // Labels in current doc (full scan needed) + cross-file labels.
      const docText = context.state.doc.toString();
      const inDoc = extractLabels(docText);
      const merged = Array.from(new Set([...inDoc, ...getExtraLabels()]));
      if (!merged.length) return null;
      return {
        from,
        options: merged.map((l) => ({ label: l, detail: "label", type: "variable" })),
        filter: true,
      };
    }

    if (CITE_CMDS.has(cmd)) {
      const keys = getBibCitations();
      if (!keys.length) return null;
      return {
        from,
        options: keys.map((k) => ({ label: k, detail: "citation", type: "variable" })),
        filter: true,
      };
    }

    if (cmd === "includegraphics") {
      const images = projectFiles.filter((f) => {
        const ext = "." + (f.split(".").pop() ?? "").toLowerCase();
        return IMAGE_EXTS.has(ext);
      });
      if (!images.length) return null;
      return {
        from,
        options: images.map((f) => ({ label: f, detail: "image file", type: "variable" })),
        filter: true,
      };
    }

    if (TEX_FILE_CMDS.has(cmd)) {
      const texFiles = projectFiles.filter((f) => f.toLowerCase().endsWith(".tex"));
      if (!texFiles.length) return null;
      return {
        from,
        options: texFiles.map((f) => ({
          label: f.replace(/\.tex$/i, ""),
          detail: ".tex file",
          type: "variable",
        })),
        filter: true,
      };
    }

    if (BIB_CMDS.has(cmd)) {
      const bibFiles = projectFiles.filter((f) => f.toLowerCase().endsWith(".bib"));
      if (!bibFiles.length) return null;
      return {
        from,
        options: bibFiles.map((f) => ({
          label: f.replace(/\.bib$/i, ""),
          detail: ".bib file",
          type: "variable",
        })),
        filter: true,
      };
    }

    return null;
  }

  return autocompletion({
    override: [completionSource],
    defaultKeymap: true,
    activateOnTyping: true,
  });
}
