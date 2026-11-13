// Leaflet — DOM rendering for the bookmark tree.
//
// This module is intentionally "dumb": it builds DOM from a forest + view
// state, and emits rich `data-*` attributes so that the controller (main.ts)
// can attach a single set of delegated event listeners. No event handling
// lives here.

import type { Node } from "./model";

export interface ViewState {
  /** Expanded folder ids. */
  expanded: Set<string>;
  selectedId: string | null;
  /** Active search query ("" when idle). */
  query: string;
  /** Ids that directly match the current query (text or URL). */
  matches: Set<string>;
}

// ---------------------------------------------------------------------------
// Icons (inline SVG for crisp scaling and full offline use)
// ---------------------------------------------------------------------------

export const ICON_LEAF = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 4c-8 0-14 5-14 12 0 1 .5 1.5 1 1s1.5-3 3-5.5S16 11 20 4z"/><path d="M20 4c-2.5 1-4 2.5-5 5" stroke="currentColor" fill="none" stroke-width="1.6" stroke-linecap="round"/></svg>`;

export const ICON_FOLDER = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/></svg>`;

export const ICON_FOLDER_OPEN = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v1H5l1.3 7.2A2 2 0 0 0 8.3 19H19a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2H5a2 2 0 0 1-2-2z"/></svg>`;

export const ICON_LINK = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1.5 1.5"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.5-1.5"/></svg>`;

export const ICON_CHEVRON = `<svg class="chevron" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>`;

export const ICON_DRAG = `<svg class="grip" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>`;

// ---------------------------------------------------------------------------
// Building
// ---------------------------------------------------------------------------

/** Escape text so it can be injected as textContent-like markup. */
function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function highlight(text: string, query: string): string {
  if (!query) return esc(text);
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  let result = "";
  let i = 0;
  while (true) {
    const idx = lower.indexOf(q, i);
    if (idx === -1) {
      result += esc(text.slice(i));
      break;
    }
    result += esc(text.slice(i, idx));
    result += `<mark>${esc(text.slice(idx, idx + q.length))}</mark>`;
    i = idx + q.length;
  }
  return result;
}

interface BuildResult {
  el: HTMLElement | null;
  /** True if this subtree contains at least one rendered descendant. */
  hasVisible: boolean;
}

/**
 * Build a single row (and, for folders, its children container). Returns null
 * when a search is active and this node (and nothing beneath it) matches.
 */
function buildNode(node: Node, depth: number, state: ViewState): BuildResult {
  const searching = state.query.trim().length > 0;
  const directMatch = state.matches.has(node.id);

  if (node.type === "folder") {
    const isExpanded = searching ? true : state.expanded.has(node.id);
    const childrenBox = document.createElement("div");
    childrenBox.className = "children";

    if (isExpanded || searching) {
      for (const child of node.children) {
        const built = buildNode(child, depth + 1, state);
        if (built.el) childrenBox.appendChild(built.el);
      }
    }

    const hasVisibleChild = childrenBox.childElementCount > 0;
    if (searching && !directMatch && !hasVisibleChild) {
      return { el: null, hasVisible: false };
    }

    const row = document.createElement("div");
    row.className = "row folder";
    row.dataset.id = node.id;
    row.dataset.type = "folder";
    row.setAttribute("role", "treeitem");
    row.setAttribute("aria-expanded", String(isExpanded));
    row.style.paddingLeft = `calc(${depth} * var(--indent))`;
    if (state.selectedId === node.id) row.classList.add("selected");
    if (directMatch) row.classList.add("match");

    const isExplicitOpen = searching ? childrenBox.childElementCount > 0 : isExpanded;

    row.innerHTML = `
      <span class="twisty">${ICON_CHEVRON}</span>
      <span class="icon">${isExplicitOpen ? ICON_FOLDER_OPEN : ICON_FOLDER}</span>
      <span class="title">${highlight(node.title, searching ? state.query : "")}</span>
      <span class="count">${node.children.length}</span>
      <span class="drag-handle" draggable="true">${ICON_DRAG}</span>
    `;
    if (searching) row.classList.add("auto-open");

    // Wrap the row and its children in a block container so children nest
    // *vertically* beneath the row (not as a flex item beside it).
    const wrapper = document.createElement("div");
    wrapper.className = "node";
    wrapper.appendChild(row);
    if (childrenBox.childElementCount > 0) {
      wrapper.appendChild(childrenBox);
    }

    return { el: wrapper, hasVisible: directMatch || childrenBox.childElementCount > 0 };
  }

  // Bookmark
  if (searching && !directMatch) {
    return { el: null, hasVisible: false };
  }

  const row = document.createElement("div");
  row.className = "row bookmark";
  row.dataset.id = node.id;
  row.dataset.type = "bookmark";
  row.dataset.href = node.url;
  row.setAttribute("role", "treeitem");
  row.style.paddingLeft = `calc(${depth} * var(--indent))`;
  if (state.selectedId === node.id) row.classList.add("selected");
  if (directMatch) row.classList.add("match");

  row.innerHTML = `
    <span class="twisty"></span>
    <span class="icon">${(node.icon && node.icon.startsWith("data:")) ? `<img class="favicon" src="${esc(node.icon)}" alt="" />` : ICON_LINK}</span>
    <span class="title">${highlight(node.title, searching ? state.query : "")}</span>
    <span class="href">${esc(node.url)}</span>
    <span class="drag-handle" draggable="true">${ICON_DRAG}</span>
  `;

  return { el: row, hasVisible: true };
}

/**
 * Build the full tree for a forest. Returns a document fragment suitable for
 * appending to the tree container.
 */
export function buildTree(forest: Node[], state: ViewState): DocumentFragment {
  const frag = document.createDocumentFragment();
  for (const node of forest) {
    const built = buildNode(node, 0, state);
    if (built.el) frag.appendChild(built.el);
  }
  return frag;
}
