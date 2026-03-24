# NovaTeX

NovaTeX is a minimalist LaTeX editor for macOS built with Tauri, React, and CodeMirror.

It provides a clean writing experience with local LaTeX compilation and integrated PDF preview.

## Download and install (macOS)

The easiest way to install NovaTeX is from the DMG file in GitHub Releases:

- [Download the latest DMG](https://github.com/Ajshadbolt/NovaTEX/releases/latest)

Open the DMG, drag `NovaTeX.app` into `Applications`, then open it.

If macOS shows an unsigned app warning, right-click the app, choose **Open**, then confirm.

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
- `src-tauri/target/release/bundle/dmg/NovaTeX_0.1.0_aarch64.dmg`

## License

This project is licensed under the MIT License. See `LICENSE`.
