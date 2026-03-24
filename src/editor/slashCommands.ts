import { CompletionContext, CompletionResult, snippetCompletion } from "@codemirror/autocomplete";
import { Extension } from "@codemirror/state";
import { autocompletion } from "@codemirror/autocomplete";

const latexSnippets = [
  snippetCompletion("\\begin{figure}[h!]\n  \\centering\n  \\includegraphics[width=\\linewidth]{${1:image-file}}\n  \\caption{${2:Caption here}}\n  \\label{fig:${3:label}}\n\\end{figure}", {
    label: "\\figure",
    detail: "Insert a typical image figure",
    type: "keyword"
  }),
  snippetCompletion("\\begin{align}\n  ${1:equation} &= ${2:value}\n\\end{align}", {
    label: "\\align",
    detail: "Insert an align environment",
    type: "keyword"
  }),
  snippetCompletion("\\begin{itemize}\n  \\item ${1:First item}\n  \\item ${2}\n\\end{itemize}", {
    label: "\\itemize",
    detail: "Unordered list",
    type: "keyword"
  }),
  snippetCompletion("\\begin{enumerate}\n  \\item ${1:First item}\n  \\item ${2}\n\\end{enumerate}", {
    label: "\\enumerate",
    detail: "Numbered list",
    type: "keyword"
  }),
  snippetCompletion("\\begin{table}[h!]\n  \\centering\n  \\begin{tabular}{${1:c c c}}\n    ${2:1} & ${3:2} & ${4:3} \\\\\n  \\end{tabular}\n  \\caption{${5:Caption}}\n  \\label{tab:${6:label}}\n\\end{table}", {
    label: "\\table",
    detail: "Insert a simple table",
    type: "keyword"
  }),
  snippetCompletion("\\section{${1:Section Name}}\n$0", {
    label: "\\section",
    detail: "Top level heading",
    type: "keyword"
  }),
  snippetCompletion("\\subsection{${1:Subsection Name}}\n$0", {
    label: "\\subsection",
    detail: "Second level heading",
    type: "keyword"
  }),
];

function slashCommandCompletion(context: CompletionContext): CompletionResult | null {
  const word = context.matchBefore(/\\[a-zA-Z]*/);
  if (!word) return null;

  return {
    from: word.from,
    options: latexSnippets,
    filter: true,
  };
}

export function createSlashCommandExtension(): Extension {
  return [
    autocompletion({
      override: [slashCommandCompletion],
      defaultKeymap: true,
    })
  ];
}
