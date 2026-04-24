import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";

const bg = "transparent";
const caret = "var(--accent)";
const selection = "rgba(0, 122, 255, 0.3)";
const fg = "var(--text-primary)";
const secondary = "var(--text-secondary)";

const baseTheme = EditorView.theme(
  {
    "&": {
      color: fg,
      backgroundColor: bg,
    },
    ".cm-content": {
      caretColor: caret,
    },
    ".cm-line": {
      paddingBottom: "2px",
    },
    "&.cm-focused .cm-cursor": {
      borderLeftColor: caret,
      borderLeftWidth: "2px",
    },
    "&.cm-focused .cm-selectionBackground, ::selection": {
      backgroundColor: selection,
    },
    ".cm-gutters": {
      backgroundColor: bg,
      color: secondary,
      border: "none",
      paddingRight: "8px",
    },
    ".cm-activeLineGutter": {
      color: fg,
      backgroundColor: 'transparent',
    },
    ".cm-activeLine": {
      backgroundColor: "rgba(255, 255, 255, 0.03)",
      borderRadius: "4px",
    },
    ".cm-tooltip": {
      backgroundColor: "var(--bg-secondary)",
      border: "1px solid var(--border-color)",
      borderRadius: "8px",
      boxShadow: "0 8px 24px rgba(0,0,0,0.55)",
      overflow: "hidden",
    },
    ".cm-tooltip-autocomplete": {
      padding: "4px 0",
      "& > ul": {
        maxHeight: "280px",
        minWidth: "240px",
        maxWidth: "440px",
        overflowY: "auto",
        scrollbarWidth: "thin",
      },
      "& > ul > li": {
        display: "flex",
        alignItems: "center",
        padding: "5px 12px",
        gap: "0",
        cursor: "default",
        lineHeight: "1.5",
        fontSize: "13px",
      },
      "& > ul > li[aria-selected]": {
        backgroundColor: "var(--accent)",
        color: "white",
      },
      "& .cm-completionIcon": {
        display: "none",
      },
      "& .cm-completionLabel": {
        fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
        fontSize: "13px",
        flex: "1",
        minWidth: 0,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      },
      "& .cm-completionMatchedText": {
        fontWeight: "700",
        textDecoration: "none",
      },
      "& .cm-completionDetail": {
        fontSize: "11px",
        opacity: "0.55",
        flexShrink: "0",
        paddingLeft: "12px",
        maxWidth: "160px",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      },
      "& > ul > li[aria-selected] .cm-completionDetail": {
        opacity: "0.75",
      },
      "& > ul > li[aria-selected] .cm-completionMatchedText": {
        textDecoration: "underline",
      },
    }
  },
  { dark: true }
);

const smoothTheme = EditorView.theme({
  ".cm-scroller": {
    scrollBehavior: "smooth",
  },
  ".cm-cursorLayer": {
    transition: "transform 110ms ease-out",
    willChange: "transform",
  },
  ".cm-cursor": {
    transition:
      "left 90ms ease-out, top 90ms ease-out, height 90ms ease-out, border-color 120ms ease-out, opacity 120ms ease-out",
    willChange: "left, top, height",
  },
  ".cm-activeLine": {
    boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.04)",
    transition: "background-color 140ms ease-out, box-shadow 140ms ease-out",
  },
  ".cm-activeLineGutter": {
    transition: "color 140ms ease-out",
  },
  ".cm-selectionBackground": {
    borderRadius: "4px",
    transition: "background-color 140ms ease-out",
  },
  "&.cm-focused .cm-cursor": {
    animation: "cm-smooth-caret-blink 1.1s steps(1) infinite",
  },
  "@keyframes cm-smooth-caret-blink": {
    "0%, 46%": { opacity: "1" },
    "47%, 96%": { opacity: "0.22" },
    "97%, 100%": { opacity: "1" },
  },
});

const syntaxTheme = syntaxHighlighting(
  HighlightStyle.define([
    { tag: t.keyword, color: "#ff7ab2" },
    { tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName], color: "#5ac8fa" },
    { tag: [t.function(t.variableName), t.function(t.propertyName)], color: "#d2a8ff" },
    { tag: t.comment, color: "#666666", fontStyle: "italic" },
    { tag: t.string, color: "#34c759" },
    { tag: t.number, color: "#ff9500" },
    { tag: t.variableName, color: fg },
  ])
);

export function createEditorTheme(smoothMode: boolean) {
  return smoothMode
    ? [baseTheme, smoothTheme, syntaxTheme]
    : [baseTheme, syntaxTheme];
}
