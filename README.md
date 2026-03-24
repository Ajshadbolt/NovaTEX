# NovaTeX

NovaTeX is a minimalist LaTeX editor for macOS built with Tauri, React, and CodeMirror.

It provides a clean writing experience with local LaTeX compilation and integrated PDF preview.

## Download and use

You can download the built macOS app bundle from:

- `src-tauri/target/release/bundle/macos/NovaTeX.app`

If you clone this repository, you can open that app directly on macOS.

## Features

- Two-pane editor and PDF preview layout
- Local/offline LaTeX compilation with `pdflatex`
- Slash command snippets for fast LaTeX blocks
- Dark-mode focused UI for distraction-free editing

## Prerequisites (for building from source)

- macOS
- Node.js 20+
- Rust toolchain
- A LaTeX distribution with `pdflatex` on your `PATH` (MacTeX/BasicTeX)

## Run locally

```bash
npm install
npm run tauri dev
```

## Build from source

```bash
npm run tauri build
```

Build outputs are generated in:

- `dist/`
- `src-tauri/target/release/bundle/macos/NovaTeX.app`

## License

This project is licensed under the MIT License. See `LICENSE`.
