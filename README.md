<p align="center">
  <img src="src-tauri/icons/icon.png" width="128" alt="Leaflet logo" />
</p>

<h1 align="center">Leaflet</h1>
<p align="center"><em>Your little corner of the internet.</em></p>

<p align="center">
  <strong>A free and open-source bookmark manager — native, fast, and yours.</strong>
</p>

<p align="center">
  <a href="https://github.com/VanguardArts/Leaflet/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-GPL--3.0--or--later-blue.svg" alt="License: GPL-3.0-or-later"></a>
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

> Built by **[Vanguard Arts Software](https://github.com/VanguardArts)**.

---

## 📦 Install

Prebuilt installers for **Windows, macOS, and Linux** are published on the
[**Releases**](https://github.com/VanguardArts/Leaflet/releases) page.

### 🪟 Windows
Download the **`.msi`** installer (or **`-setup.exe`**), then run it. Windows
SmartScreen may warn because Leaflet is unsigned — click **More info → Run
anyway**.

### 🍎 macOS
Download the **`.dmg`** for your chip — **Apple Silicon** (M1/M2/M3/M4) or
**Intel** — open it and drag Leaflet into Applications. Gatekeeper may warn
because Leaflet is unsigned — right-click → **Open** (or allow it under System
Settings → Privacy & Security).

### 🐧 Linux
- **AppImage** — works on any modern distro. Download, make it executable, run:

  ```bash
  chmod +x Leaflet_*_amd64.AppImage
  ./Leaflet_*_amd64.AppImage
  ```

- **Debian / Ubuntu / Mint** (`.deb`):

  ```bash
  sudo apt install ./Leaflet_*_amd64.deb
  ```

- **Fedora / RHEL / openSUSE** (`.rpm`):

  ```bash
  sudo dnf install ./Leaflet-*.x86_64.rpm
  ```

Prefer to build it yourself? See [Getting started](#-getting-started).

---

## ✨ Features

- **Clean first run + guided tour** — Leaflet opens to an *empty* library (your
  links, nothing else — no seed or dummy data). A short, skippable tutorial
  teaches the essentials and can optionally load a few sample bookmarks to
  practice with.
- **Three-zone UI** — a collapsible, draggable tree on the left, a live
  inspector on the right, and a search-and-actions toolbar on top.
- **Drag & drop** — press and drag **anywhere on a row** (or use the grip
  handle) to reorder and nest folders and bookmarks, with visual drop
  indicators (before / inside / after).
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
- **Dark & light themes + 7 accent palettes** — Leaf (green), Ocean, Berry,
  Ember, Rose, Cyan, and Slate — with matching tinted surfaces and
  color-aware link colors, easy on the eyes in both modes.
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

## 🖱 Using the tree

- **Select** — click a row; its details open in the inspector on the right.
- **Open a bookmark** — double-click it, or select it and press <kbd>Enter</kbd>.
- **Expand / collapse a folder** — click the chevron, or double-click the folder.
- **Reorder / nest** — press and hold on a row and drag it (or use the 6-dot
  grip on the right). A line shows where it will land: **above**, **below**, or
  **inside** a folder.
- **Rename** — select a row and press <kbd>F2</kbd> (or double-click it), then
  type the new name and press <kbd>Enter</kbd>.
- **Undo** — <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>Z</kbd> steps back through your
  changes (up to 100 steps).

---

## 🖼 Screenshots

*Coming soon.* Leaflet opens to a clean, empty library — your links, nothing
else. An optional first-run tour shows you the ropes and can load a few sample
bookmarks to practice with.

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
  (Windows, macOS, Linux)
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

[GPL-3.0-or-later](LICENSE) © [Vanguard Arts Software](https://github.com/VanguardArts).

Leaflet is free software: you can redistribute and/or modify it under the terms
of the GNU General Public License as published by the Free Software Foundation,
either version 3 of the License, or (at your option) any later version.
Derivative works must remain open under the same license.
