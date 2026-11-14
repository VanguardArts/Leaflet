# Changelog

All notable changes to Leaflet are documented here. This project follows
[Semantic Versioning](https://semver.org) and the spirit of
[Keep a Changelog](https://keepachangelog.com).

## [0.1.2] - 2026-11-14

### Fixed
- **Drag-and-drop reordering now works reliably on Linux.** Two issues combined
  to break it entirely:
  - The drag handle was collapsed to **zero width** by an incorrect
    `flex: 0 0 0`, so there was nothing to grab.
  - Reordering now uses **mouse events + hit-testing** instead of the native
    HTML5 drag-and-drop API, which is unreliable in the WebKitGTK webview.
- **You can now press and drag anywhere on a row** (not just the grip handle).
  A small movement threshold keeps click-to-select and double-click-to-open
  working as before. The 6-dot grip remains as a visual affordance.
- **Double-click to open / expand now works.** The native `dblclick` event does
  not fire reliably in WebKitGTK after a re-render, so double-clicks are now
  detected manually from consecutive clicks.
- **"Open link"** opens the URL in the system default browser via the Tauri
  opener plugin (previously a blocked `window.open` call).

### Changed
- The drag grip is now always faintly visible (full opacity on hover).
- The empty expand/collapse spacer on bookmark rows is no longer interactive,
  so it no longer reads as a stray "checkbox."

## [0.1.1] - 2026-11-13

### Fixed
- Added the Tauri **opener** plugin so bookmark links open in the system
  browser. (`window.open` is blocked inside the Tauri webview.)

## [0.1.0] - 2026-11-13

### Added
- Initial release of **Leaflet**.
- Bookmark tree editor with a three-zone layout (tree / inspector / toolbar).
- Nested folders with expand/collapse and live child counts.
- Instant search with auto-expanding matches and highlighted hits.
- Add, rename, delete, and re-URL bookmarks and folders; inline rename.
- Netscape bookmarks-file import and export (browser-compatible).
- Auto-save to local storage and a 100-step undo history.
- Dark and light themes with 7 accent palettes (Leaf, Ocean, Berry, Ember,
  Rose, Cyan, Slate) and color-aware link colors.
- Keyboard shortcuts for search, save, open, undo, rename, delete, and
  open-link.
- Netscape parser verified to round-trip losslessly.
