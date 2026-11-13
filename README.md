<p align="center">
  <img src="src-tauri/icons/icon.png" width="128" alt="Leaflet logo" />
</p>

<h1 align="center">Leaflet</h1>
<p align="center"><em>Your little corner of the internet.</em></p>

<p align="center">
  <strong>A free and open-source bookmark manager — native, fast, and yours.</strong>
</p>

<p align="center">
  <a href="https://github.com/vanguard-arts/leaflet/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-GPL--3.0--or--later-blue.svg" alt="License: GPL-3.0-or-later"></a>
  <a href="#-support"><img src="https://img.shields.io/badge/sponsor-❤-ea4aaa.svg" alt="Sponsor"></a>
</p>

---

**Leaflet** is a desktop bookmark manager in the spirit of Raindrop — but native,
private, and fully open source. Your bookmarks live in a single human-readable
[Netscape bookmarks file](#file-format) that you can inspect, edit by hand, back up,
or sync with any browser.

The name is deliberate: a *leaflet* is both a small leaf and a small printed
publication — and it lends itself to a tree. Everything you save is a little
leaf on your own tree of the internet.

> Built by **[Vanguard Arts Software](https://github.com/vanguard-arts)**.

---

## ✨ Features

- **Three-zone UI** — a collapsible, draggable tree on the left, a live
  inspector on the right, and a search-and-actions toolbar on top.
- **Drag & drop** — reorder, nest, and move folders and bookmarks with visual
  drop indicators (before / inside / after).
- **Instant search** — filter the whole tree, auto-expanding matching folders
  and highlighting hits.
- **Full editing** — add, rename, delete, and re-URL bookmarks and folders;
  inline rename with <kbd>F2</kbd> or a double-click.
- **Netscape HTML import/export** — round-trips the standard bookmark format
  shared by Firefox, Chrome, and most other browsers. Verified lossless on a
  library of thousands of bookmarks.
- **Native file dialogs** — open and save bookmark files through the OS picker
  (Tauri build), with a browser fallback for local development.
- **Auto-save + undo** — never lose a change, and step back through history
  (<kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>Z</kbd>).
- **Dark & light themes** — a calm, leaf-green design system that is easy on
  the eyes.
- **Keyboard shortcuts** — search, save, open, undo, rename, delete, open-link.

### Keyboard shortcuts

| Action | Shortcut |
| --- | --- |
| Search | <kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>F</kbd> |
| Save / Export | <kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>S</kbd> |
| Open / Import | <kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>O</kbd> |
| Undo | <kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>Z</kbd> |
| Rename | <kbd>F2</kbd> |
| Delete | <kbd>Delete</kbd> |
| Open link | <kbd>Enter</kbd> (bookmark selected) |

---

## 🖼 Screenshots

*Coming soon.* Leaflet ships with a bundled seed library so it opens to a living
tree, not a blank pane.

---

## 🚀 Getting started

### Prerequisites

- [Node.js](https://nodejs.org) 18+
- [Rust](https://rustup.rs) (stable) — for the native build
- Tauri's Linux system deps: `webkit2gtk-4.1`, `gtk3`, and friends
  (see the [Tauri prerequisites](https://tauri.app/start/prerequisites/))

### Run the UI in the browser (fastest)

```bash
npm install
npm run dev
```

This opens the app at `http://localhost:1420` in your browser, where import works
via a file picker and export via download.

### Run the native desktop app

```bash
npm run tauri dev
```

### Build a release binary

```bash
npm run tauri build
```

Installers/bundles for your platform are written to `src-tauri/target/release/bundle/`.

---

## 🧱 Tech stack

- **[Tauri 2](https://tauri.app)** — small, secure Rust desktop shell
- **TypeScript** (strict) + **Vite** — frontend tooling
- **Hand-built CSS design system** — no UI framework; a small, auditable,
  dependency-light codebase
- **No telemetry, no network calls, no accounts.** Your data never leaves your
  machine.

---

## 📁 File format

Leaflet reads and writes the **Netscape Bookmark File** format:

```html
<!DOCTYPE NETSCAPE-Bookmark-file-1>
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks Menu</H1>
<DL><p>
    <DT><H3 ADD_DATE="…" LAST_MODIFIED="…">My Folder</H3>
    <DL><p>
        <DT><A HREF="https://example.com" ADD_DATE="…">Example</A>
    </DL><p>
</DL><p>
```

This is the same format your browser already uses, so you can import Leaflet's
output anywhere — and vice versa. Because it is plain text, you can also **edit
it by hand** if that's your thing.

---

## 🗺 Roadmap

- **v0.1** (current): tree editor, search, drag-and-drop, import/export, undo,
  themes, keyboard shortcuts.
- **v0.2** (planned): tags & labels, duplicate detection, favicon fetching,
  direct import from a running browser's bookmark store.

---

## 🤝 Contributing

Contributions are welcome. Please open an issue to discuss larger changes before
opening a pull request.

---

## ❤️ Support

Leaflet is free software and will always be. If it's useful to you, consider
supporting its development:

- **GitHub Sponsors** — see [`.github/FUNDING.yml`](.github/FUNDING.yml)

Every bit helps keep a small independent studio making friendly, open tools.

---

## 📄 License

[GPL-3.0-or-later](LICENSE) © [Vanguard Arts Software](https://github.com/vanguard-arts).

Leaflet is free software: you can redistribute and/or modify it under the terms
of the GNU General Public License as published by the Free Software Foundation,
either version 3 of the License, or (at your option) any later version.
Derivative works must remain open under the same license.
