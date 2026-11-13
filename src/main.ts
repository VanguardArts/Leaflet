// Leaflet — application controller.
// Orchestrates state, persistence, and UI events. Rendering primitives live in
// render.ts; the Netscape codec lives in parser.ts; the tree model in model.ts.

import { open as openDialog, save as saveDialog } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import type { Node } from "./model";
import {
  cloneForest,
  containsNode,
  countNodes,
  findById,
  isFolder,
  makeBookmark,
  makeFolder,
  removeNode,
} from "./model";
import { parseNetscape, serializeNetscape } from "./parser";
import { buildTree, ICON_LEAF, type ViewState } from "./render";
import defaultBookmarksHtml from "./assets/default-bookmarks.html?raw";
import "./styles.css";

const STORAGE_KEY = "leaflet.bookmarks.html";
const THEME_KEY = "leaflet.theme";
const UNDO_LIMIT = 100;

type Theme = "light" | "dark";
type DropPosition = "before" | "inside" | "after";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let forest: Node[] = [];
let expanded = new Set<string>();
let selectedId: string | null = null;
let query = "";
let matches = new Set<string>();
let theme: Theme = loadTheme();
let undoStack: Node[][] = [];
let dirty = false;
let currentFile: string | null = null;
let draggedId: string | null = null;
let dropIndicatorEl: HTMLElement | null = null;

// ---------------------------------------------------------------------------
// Tauri helpers
// ---------------------------------------------------------------------------

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function loadTheme(): Theme {
  const saved = localStorage.getItem(THEME_KEY);
  return saved === "light" || saved === "dark" ? saved : "dark";
}

function applyTheme(): void {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
  const btn = document.querySelector<HTMLButtonElement>("#btn-theme .icon");
  if (btn) btn.textContent = theme === "dark" ? "☾" : "☀";
}

function toggleTheme(): void {
  theme = theme === "dark" ? "light" : "dark";
  applyTheme();
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

const treeEl = () => document.querySelector<HTMLElement>("#tree")!;

function computeMatches(): void {
  matches = new Set();
  const q = query.trim().toLowerCase();
  if (!q) return;
  const walk = (nodes: Node[]) => {
    for (const n of nodes) {
      if (n.title.toLowerCase().includes(q) || (n.url && n.url.toLowerCase().includes(q))) {
        matches.add(n.id);
      }
      if (n.type === "folder") walk(n.children);
    }
  };
  walk(forest);
}

function viewState(): ViewState {
  return { expanded, selectedId, query, matches };
}

function render(): void {
  computeMatches();
  const el = treeEl();
  el.replaceChildren(buildTree(forest, viewState()));
  renderInspector();
  renderStats();
  renderEmptyState();
  persistAutosave();
}

function renderEmptyState(): void {
  const el = treeEl();
  if (forest.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML = `
      <div class="empty-icon">${ICON_LEAF}</div>
      <p>No bookmarks yet.</p>
      <button id="btn-empty-import" class="btn primary">Import bookmarks</button>
    `;
    el.appendChild(empty);
    el.querySelector("#btn-empty-import")?.addEventListener("click", (e) => {
      e.stopPropagation();
      openFromDisk();
    });
  }
}

function renderStats(): void {
  const { folders, bookmarks } = countNodes(forest);
  const statsEl = document.querySelector<HTMLElement>("#stats");
  if (statsEl) {
    statsEl.textContent = `${bookmarks.toLocaleString()} bookmarks · ${folders.toLocaleString()} folders`;
  }
  const dirtyEl = document.querySelector<HTMLElement>("#dirty");
  if (dirtyEl) dirtyEl.textContent = dirty ? "● Unsaved" : "Saved";
  dirtyEl?.classList.toggle("dirty", dirty);
}

// ---------------------------------------------------------------------------
// Inspector
// ---------------------------------------------------------------------------

function renderInspector(): void {
  const panel = document.querySelector<HTMLElement>("#inspector");
  if (!panel) return;
  const found = selectedId ? findById(forest, selectedId) : null;
  panel.replaceChildren();

  if (!found) {
    const hint = document.createElement("div");
    hint.className = "inspector-empty";
    hint.innerHTML = `
      <div class="empty-icon">${ICON_LEAF}</div>
      <p>Select an item to see its details and edit it here.</p>
    `;
    panel.appendChild(hint);
    return;
  }

  const { node } = found;
  const heading = document.createElement("h2");
  heading.textContent = node.type === "folder" ? "Folder" : "Bookmark";
  panel.appendChild(heading);

  const form = document.createElement("form");
  form.className = "inspector-form";

  const titleField = field("Title", input("title", node.title));
  form.appendChild(titleField);

  if (node.type === "bookmark") {
    const urlField = field("URL", input("url", node.url, "url"));
    form.appendChild(urlField);
  } else {
    const note = document.createElement("p");
    note.className = "muted";
    note.textContent = `${node.children.length} item${node.children.length === 1 ? "" : "s"} inside.`;
    form.appendChild(note);
  }

  panel.appendChild(form);

  const actions = document.createElement("div");
  actions.className = "inspector-actions";

  if (node.type === "folder") {
    actions.append(
      actionBtn("New subfolder", () => addFolder(node.id)),
      actionBtn("Add bookmark", () => addBookmark(node.id)),
    );
  } else {
    actions.append(actionBtn("Open link", () => openExternal(node)));
  }

  actions.append(
    actionBtn("Rename", () => beginInlineRename(node.id), "secondary"),
    actionBtn("Delete", () => deleteSelected(), "danger"),
  );
  panel.appendChild(actions);

  // Bind input changes to model.
  const titleInput = form.querySelector<HTMLInputElement>('input[name="title"]')!;
  titleInput.addEventListener("change", () => {
    setTitle(node.id, titleInput.value.trim() || node.title);
  });
  const urlInput = form.querySelector<HTMLInputElement>('input[name="url"]');
  if (urlInput) {
    urlInput.addEventListener("change", () => {
      setUrl(node.id, urlInput.value.trim());
    });
  }
}

function input(name: string, value: string, type = "text"): HTMLInputElement {
  const el = document.createElement("input");
  el.name = name;
  el.type = type;
  el.value = value;
  el.spellcheck = false;
  return el;
}

function field(label: string, control: HTMLElement): HTMLElement {
  const wrap = document.createElement("label");
  wrap.className = "field";
  const span = document.createElement("span");
  span.className = "field-label";
  span.textContent = label;
  wrap.append(span, control);
  return wrap;
}

function actionBtn(
  label: string,
  onClick: () => void,
  kind: "primary" | "secondary" | "danger" = "primary",
): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = label;
  btn.className = `btn ${kind}`;
  btn.addEventListener("click", () => onClick());
  return btn;
}

// ---------------------------------------------------------------------------
// Mutations (each pushes undo before changing state)
// ---------------------------------------------------------------------------

function pushUndo(): void {
  undoStack.push(cloneForest(forest));
  if (undoStack.length > UNDO_LIMIT) undoStack.shift();
}

function markDirty(): void {
  dirty = true;
}

function setTitle(id: string, title: string): void {
  const found = findById(forest, id);
  if (!found || found.node.title === title) return;
  pushUndo();
  found.node.title = title;
  found.node.lastModified = now();
  markDirty();
  render();
}

function setUrl(id: string, url: string): void {
  const found = findById(forest, id);
  if (!found || found.node.type !== "bookmark" || found.node.url === url) return;
  pushUndo();
  found.node.url = url;
  markDirty();
  render();
}

function addFolder(parentId: string | null): void {
  pushUndo();
  const folder = makeFolder("New folder");
  if (parentId) {
    const parent = findById(forest, parentId);
    if (parent && parent.node.type === "folder") {
      parent.node.children.push(folder);
      expanded.add(parentId);
    } else {
      forest.push(folder);
    }
  } else {
    forest.push(folder);
  }
  selectedId = folder.id;
  markDirty();
  render();
  beginInlineRename(folder.id);
}

function addBookmark(parentId: string | null): void {
  pushUndo();
  const bookmark = makeBookmark("New bookmark", "https://");
  if (parentId) {
    const parent = findById(forest, parentId);
    if (parent && parent.node.type === "folder") {
      parent.node.children.push(bookmark);
      expanded.add(parentId);
    } else {
      forest.push(bookmark);
    }
  } else {
    forest.push(bookmark);
  }
  selectedId = bookmark.id;
  markDirty();
  render();
  beginInlineRename(bookmark.id);
}

function deleteSelected(): void {
  if (!selectedId) return;
  pushUndo();
  removeNode(forest, selectedId);
  selectedId = null;
  markDirty();
  render();
}

function moveNode(dragId: string, targetId: string, position: DropPosition): void {
  if (dragId === targetId) return;
  const source = findById(forest, dragId);
  if (!source) return;
  // Refuse to drop a folder into its own descendant.
  if (source.node.type === "folder" && containsNode(source.node, targetId)) return;

  pushUndo();
  const node = removeNode(forest, dragId)!;

  const target = findById(forest, targetId);
  if (!target) {
    forest.push(node);
  } else if (position === "inside" && target.node.type === "folder") {
    target.node.children.push(node);
    expanded.add(target.node.id);
  } else {
    const arr = target.parent ?? forest;
    const index = position === "before" ? target.index : target.index + 1;
    arr.splice(index, 0, node);
  }
  markDirty();
  render();
}

// ---------------------------------------------------------------------------
// Selection / expansion
// ---------------------------------------------------------------------------

function select(id: string | null): void {
  selectedId = id;
  render();
}

function toggleFolder(id: string): void {
  if (expanded.has(id)) expanded.delete(id);
  else expanded.add(id);
  render();
}

// ---------------------------------------------------------------------------
// Inline rename
// ---------------------------------------------------------------------------

function beginInlineRename(id: string): void {
  const row = document.querySelector<HTMLElement>(`.row[data-id="${CSS.escape(id)}"]`);
  if (!row) return;
  const titleSpan = row.querySelector<HTMLElement>(".title");
  if (!titleSpan) return;
  const current = findById(forest, id)?.node.title ?? "";
  const input = document.createElement("input");
  input.className = "inline-input";
  input.value = current;
  input.spellcheck = false;
  titleSpan.replaceWith(input);
  input.focus();
  input.select();

  const commit = () => {
    const value = input.value.trim();
    if (value && value !== current) {
      const found = findById(forest, id);
      if (found) {
        pushUndo();
        found.node.title = value;
        found.node.lastModified = now();
        markDirty();
      }
    }
    render();
  };
  input.addEventListener("blur", commit);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      input.blur();
    } else if (e.key === "Escape") {
      input.removeEventListener("blur", commit);
      render();
    }
  });
}

// ---------------------------------------------------------------------------
// External open
// ---------------------------------------------------------------------------

function openExternal(node: Node): void {
  if (node.type !== "bookmark" || !node.url) return;
  window.open(node.url, "_blank", "noopener,noreferrer");
}

// ---------------------------------------------------------------------------
// Import / export
// ---------------------------------------------------------------------------

function importHtml(html: string): void {
  const parsed = parseNetscape(html);
  if (parsed.length === 0) {
    alert("No bookmarks found in that file.");
    return;
  }
  pushUndo();
  forest = parsed;
  expanded.clear();
  selectedId = null;
  markDirty();
  render();
}

async function openFromDisk(): Promise<void> {
  if (isTauri()) {
    const selected = await openDialog({
      multiple: false,
      filters: [{ name: "Bookmarks (HTML)", extensions: ["html", "htm"] }],
    });
    if (!selected) return;
    const path = Array.isArray(selected) ? selected[0] : selected;
    if (!path) return;
    const text = await readTextFile(path);
    currentFile = path;
    importHtml(text);
    return;
  }
  // Browser fallback.
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".html,.htm";
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    importHtml(await file.text());
  };
  input.click();
}

function downloadBlob(html: string, filename: string): void {
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function saveToDisk(): Promise<void> {
  const html = serializeNetscape(forest);
  if (isTauri()) {
    let path = currentFile;
    if (!path) {
      const chosen = await saveDialog({
        defaultPath: "bookmarks.html",
        filters: [{ name: "Bookmarks (HTML)", extensions: ["html"] }],
      });
      if (!chosen) return;
      path = chosen;
    }
    await writeTextFile(path, html);
    currentFile = path;
    dirty = false;
    renderStats();
    return;
  }
  downloadBlob(html, "bookmarks.html");
  dirty = false;
  renderStats();
}

function persistAutosave(): void {
  if (!dirty) return;
  // Autosave to localStorage so the browser/Tauri webview never loses work.
  try {
    localStorage.setItem(STORAGE_KEY, serializeNetscape(forest));
  } catch {
    // localStorage may be unavailable or too small for very large libraries.
  }
}

// ---------------------------------------------------------------------------
// Undo
// ---------------------------------------------------------------------------

function undo(): void {
  const prev = undoStack.pop();
  if (!prev) return;
  forest = prev;
  selectedId = null;
  markDirty();
  render();
}

// ---------------------------------------------------------------------------
// Drag & drop (native HTML5 DnD)
// ---------------------------------------------------------------------------

function nodeIdFromEvent(el: EventTarget | null): string | null {
  if (!(el instanceof HTMLElement)) return null;
  const row = el.closest<HTMLElement>(".row[data-id]");
  return row?.dataset.id ?? null;
}

function dropPositionFor(row: HTMLElement, clientY: number): DropPosition {
  const rect = row.getBoundingClientRect();
  const rel = (clientY - rect.top) / rect.height;
  if (row.dataset.type === "folder") {
    if (rel < 0.25) return "before";
    if (rel > 0.75) return "after";
    return "inside";
  }
  return rel < 0.5 ? "before" : "after";
}

function clearDropIndicator(): void {
  if (dropIndicatorEl) {
    dropIndicatorEl.classList.remove("drop-before", "drop-inside", "drop-after");
    dropIndicatorEl = null;
  }
}

// ---------------------------------------------------------------------------
// Event wiring
// ---------------------------------------------------------------------------

function bindTreeEvents(): void {
  const container = treeEl();

  container.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    const row = target.closest<HTMLElement>(".row[data-id]");
    if (!row) return;
    const id = row.dataset.id!;
    // Clicking the twisty (or folder icon) toggles expansion.
    if (target.closest(".twisty")) {
      if (row.dataset.type === "folder") {
        e.stopPropagation();
        toggleFolder(id);
        return;
      }
    }
    select(id);
  });

  container.addEventListener("dblclick", (e) => {
    const target = e.target as HTMLElement;
    const row = target.closest<HTMLElement>(".row[data-id]");
    if (!row) return;
    const id = row.dataset.id!;
    const node = findById(forest, id)?.node;
    if (!node) return;
    if (node.type === "folder") {
      toggleFolder(id);
    } else {
      openExternal(node);
    }
  });

  container.addEventListener("dragstart", (e) => {
    const id = nodeIdFromEvent(e.target);
    if (!id) return;
    const row = e.target instanceof HTMLElement ? e.target.closest<HTMLElement>(".row") : null;
    draggedId = id;
    row?.classList.add("dragging");
    e.dataTransfer?.setData("text/plain", id);
    if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
  });

  container.addEventListener("dragover", (e) => {
    const row = (e.target as HTMLElement).closest?.<HTMLElement>(".row[data-id]") ?? null;
    if (!row || !draggedId) {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
      return;
    }
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
    const pos = dropPositionFor(row, e.clientY);
    if (dropIndicatorEl && dropIndicatorEl !== row) {
      dropIndicatorEl.classList.remove("drop-before", "drop-inside", "drop-after");
    }
    row.classList.remove("drop-before", "drop-inside", "drop-after");
    row.classList.add(`drop-${pos}`);
    dropIndicatorEl = row;
  });

  container.addEventListener("dragleave", (e) => {
    const row = (e.target as HTMLElement).closest?.<HTMLElement>(".row[data-id]") ?? null;
    if (row && row === dropIndicatorEl) {
      row.classList.remove("drop-before", "drop-inside", "drop-after");
      dropIndicatorEl = null;
    }
  });

  container.addEventListener("drop", (e) => {
    e.preventDefault();
    const row = (e.target as HTMLElement).closest?.<HTMLElement>(".row[data-id]") ?? null;
    clearDropIndicator();
    const id = draggedId;
    draggedId = null;
    document.querySelectorAll(".row.dragging").forEach((r) => r.classList.remove("dragging"));
    if (!id) return;
    if (!row) {
      // Dropped on empty space → move to root.
      pushUndo();
      const node = removeNode(forest, id);
      if (node) {
        forest.push(node);
        markDirty();
        render();
      }
      return;
    }
    const pos = dropPositionFor(row, e.clientY);
    moveNode(id, row.dataset.id!, pos);
  });

  container.addEventListener("dragend", () => {
    clearDropIndicator();
    document.querySelectorAll(".row.dragging").forEach((r) => r.classList.remove("dragging"));
    draggedId = null;
  });
}

function bindToolbarEvents(): void {
  const search = document.querySelector<HTMLInputElement>("#search");
  search?.addEventListener("input", () => {
    query = search.value;
    render();
  });

  const bind = (id: string, fn: () => void) =>
    document.querySelector<HTMLElement>(id)?.addEventListener("click", fn);

  bind("#btn-add-folder", () => addFolder(selectedFolderId()));
  bind("#btn-add-bookmark", () => addBookmark(selectedFolderId()));
  bind("#btn-import", () => openFromDisk());
  bind("#btn-export", () => saveToDisk());
  bind("#btn-undo", () => undo());
  bind("#btn-theme", () => toggleTheme());
  bind("#btn-collapse", () => {
    expanded.clear();
    render();
  });
}

function selectedFolderId(): string | null {
  if (!selectedId) return null;
  const node = findById(forest, selectedId)?.node;
  return node?.type === "folder" ? node.id : null;
}

function bindGlobalShortcuts(): void {
  document.addEventListener("keydown", (e) => {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === "s") {
      e.preventDefault();
      void saveToDisk();
    } else if (mod && e.key.toLowerCase() === "o") {
      e.preventDefault();
      void openFromDisk();
    } else if (mod && e.key.toLowerCase() === "z" && !e.shiftKey) {
      e.preventDefault();
      undo();
    } else if (mod && e.key.toLowerCase() === "f") {
      e.preventDefault();
      document.querySelector<HTMLInputElement>("#search")?.focus();
    } else if (e.key === "Delete" || e.key === "Backspace") {
      if (selectedId && !isEditableTarget(e.target)) {
        e.preventDefault();
        deleteSelected();
      }
    } else if (e.key === "F2" && selectedId) {
      e.preventDefault();
      beginInlineRename(selectedId);
    } else if (e.key === "Enter" && selectedId) {
      const node = findById(forest, selectedId)?.node;
      if (node && node.type === "bookmark" && !isEditableTarget(e.target)) {
        openExternal(node);
      }
    }
  });
}

function isEditableTarget(el: EventTarget | null): boolean {
  return (
    el instanceof HTMLElement &&
    (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)
  );
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

function now(): number {
  return Math.floor(Date.now() / 1000);
}

function buildShell(): void {
  const app = document.querySelector<HTMLElement>("#app")!;
  app.innerHTML = `
    <header class="toolbar">
      <div class="brand">
        <span class="brand-icon">${ICON_LEAF}</span>
        <span class="brand-name">Leaflet</span>
        <span class="brand-tagline">Your little corner of the internet</span>
      </div>
      <div class="search">
        <span class="search-icon">⌕</span>
        <input id="search" type="text" placeholder="Search bookmarks…" autocomplete="off" spellcheck="false" />
      </div>
      <div class="toolbar-actions">
        <button id="btn-add-folder" class="btn" title="New folder (in selected folder)">＋ Folder</button>
        <button id="btn-add-bookmark" class="btn" title="New bookmark">＋ Bookmark</button>
        <span class="sep"></span>
        <button id="btn-import" class="btn icon-btn" title="Import (Ctrl+O)">⤓ Import</button>
        <button id="btn-export" class="btn icon-btn" title="Save / Export (Ctrl+S)">⇧ Save</button>
        <button id="btn-undo" class="btn icon-btn" title="Undo (Ctrl+Z)">↶ Undo</button>
        <button id="btn-collapse" class="btn icon-btn" title="Collapse all">⊟ Collapse</button>
        <button id="btn-theme" class="btn icon-btn" title="Toggle theme"><span class="icon">☾</span></button>
      </div>
    </header>

    <main class="content">
      <section class="tree-pane">
        <div class="pane-header">
          <span>Bookmarks</span>
          <span class="muted">drag to reorder · dbl-click to open</span>
        </div>
        <div id="tree" class="tree" role="tree"></div>
      </section>
      <aside class="inspector-pane">
        <div class="pane-header"><span>Inspector</span></div>
        <div id="inspector" class="inspector"></div>
      </aside>
    </main>

    <footer class="statusbar">
      <span class="brand-mark">Vanguard Arts Software</span>
      <span id="stats"></span>
      <span id="dirty" class="dirty-indicator"></span>
    </footer>
  `;
}

function loadInitialData(): void {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    const parsed = parseNetscape(saved);
    if (parsed.length > 0) {
      forest = parsed;
      return;
    }
  }
  if (defaultBookmarksHtml) {
    const parsed = parseNetscape(defaultBookmarksHtml);
    if (parsed.length > 0) {
      forest = parsed;
      return;
    }
  }
  forest = [];
}

function init(): void {
  buildShell();
  loadInitialData();
  applyTheme();
  bindTreeEvents();
  bindToolbarEvents();
  bindGlobalShortcuts();

  // Auto-expand the first level so the tree isn't a wall of collapsed folders.
  for (const node of forest) {
    if (isFolder(node)) expanded.add(node.id);
  }

  render();
}

if (typeof document !== "undefined") {
  init();
}
