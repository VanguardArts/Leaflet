# Contributing to Leaflet

Thanks for your interest in improving Leaflet! This document explains how to
report problems, propose changes, and get the app running for development.

## Ways to contribute

- **Report bugs** — open an issue with steps to reproduce, what you expected,
  and what actually happened. Include your distro and Leaflet version.
- **Request features** — open an issue describing the problem you want solved
  (not just the feature), so we can find the best shape for it together.
- **Improve docs** — README, this file, comments; all fixes welcome.
- **Write code** — see the workflow below.

For larger changes, please open an issue to discuss the approach *before*
opening a pull request. It saves everyone time.

## Development setup

### Prerequisites

- [Node.js](https://nodejs.org) 18+
- [Rust](https://rustup.rs) (stable toolchain) — only needed for the native build
- On Linux, Tauri's system dependencies:
  `webkit2gtk-4.1`, `gtk-3`, `libayatana-appindicator3`, `librsvg2`, `patchelf`.
  See the [Tauri prerequisites](https://tauri.app/start/prerequisites/) guide for
  your distro.

### Run the frontend in a browser (fastest for UI work)

```bash
npm install
npm run dev
```

Opens at `http://localhost:1420`. In the browser, import uses a file picker and
export triggers a download. No Rust needed.

### Run the native desktop app

```bash
npm run tauri dev
```

### Build release bundles

```bash
npm run tauri build
```

Bundles are written to `src-tauri/target/release/bundle/`.

## Code layout

```
src/
  model.ts    — tree data types + helpers (immutable-friendly)
  parser.ts   — Netscape bookmarks-file parse/serialize (round-trips losslessly)
  render.ts   — "dumb" DOM builder for the tree (no event handling here)
  main.ts     — app controller: state, undo, events, import/export, themes
  styles.css  — the whole design system (no UI framework)
src-tauri/
  src/lib.rs  — registers the Tauri plugins (dialog, fs, opener)
```

## Style and conventions

- **TypeScript is strict.** `npm run build` (which runs `tsc`) must pass.
- **No UI framework** by design — keep the frontend small and auditable.
- Keep diffs focused; one change per pull request where possible.
- Rendering stays "dumb" (build DOM, emit `data-*`), event handling stays in the
  controller (delegated listeners). Please keep that separation.
- Match the existing formatting (see `.editorconfig`).

## Pull requests

1. Fork the repo and create a branch (e.g. `feature/your-thing`).
2. Make your change and make sure `npm run build` passes.
3. If it changes user-visible behavior, update the README and add a
   `CHANGELOG.md` entry under an "Unreleased" heading.
4. Open the PR with a clear description of what and why.

## License

By contributing, you agree that your contributions are licensed under
[GPL-3.0-or-later](LICENSE), the same license as the project.

## Support

Leaflet is free software. If you'd like to support its development, see
[`.github/FUNDING.yml`](.github/FUNDING.yml) or
[GitHub Sponsors](https://github.com/sponsors/VanguardArts).
