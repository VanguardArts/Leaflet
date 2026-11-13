// Leaflet — core data model and pure tree helpers.
// A bookmark collection is a forest of folders and bookmarks (the root is an
// array of nodes). Bookmarks have a URL; folders have children. Both share a
// stable string id so the UI can reference nodes independently of their
// position in the tree.

export type NodeType = "bookmark" | "folder";

export interface Node {
  id: string;
  type: NodeType;
  title: string;
  /** Bookmark URL. Empty string for folders. */
  url: string;
  /** Netscape ADD_DATE, in seconds since epoch. Optional. */
  addDate?: number;
  /** Netscape LAST_MODIFIED, seconds since epoch. Optional (folders only). */
  lastModified?: number;
  /** Optional favicon data URI (v0.2 — reserved). */
  icon?: string;
  /** Children. Empty array for bookmarks. */
  children: Node[];
}

let idCounter = 0;

/** Generate a reasonably-unique node id that survives within a session. */
export function makeId(): string {
  idCounter += 1;
  const rand = Math.random().toString(36).slice(2, 8);
  const t = Date.now().toString(36);
  return `n_${t}_${idCounter.toString(36)}_${rand}`;
}

export function makeFolder(title: string): Node {
  return { id: makeId(), type: "folder", title, url: "", children: [] };
}

export function makeBookmark(title: string, url: string): Node {
  return { id: makeId(), type: "bookmark", title, url, children: [] };
}

export function isFolder(node: Node): boolean {
  return node.type === "folder";
}

/** Deep clone a forest (used by the undo history). */
export function cloneForest(nodes: Node[]): Node[] {
  return nodes.map((n) => ({ ...n, children: cloneForest(n.children) }));
}

/** Count nodes recursively. */
export function countNodes(nodes: Node[]): { folders: number; bookmarks: number } {
  let folders = 0;
  let bookmarks = 0;
  for (const n of nodes) {
    if (n.type === "folder") {
      folders += 1;
      const inner = countNodes(n.children);
      folders += inner.folders;
      bookmarks += inner.bookmarks;
    } else {
      bookmarks += 1;
    }
  }
  return { folders, bookmarks };
}

export interface FindResult {
  node: Node;
  /** The array that directly contains `node` (null if it is in the root). */
  parent: Node[] | null;
  /** Index of `node` within `parent`. */
  index: number;
}

/** Find a node by id, returning its node, parent array, and index. */
export function findById(nodes: Node[], id: string): FindResult | null {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (node.id === id) {
      return { node, parent: nodes, index: i };
    }
    if (node.type === "folder") {
      const found = findById(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

/** Remove a node by id and return it (or null). Mutates the forest in place. */
export function removeNode(nodes: Node[], id: string): Node | null {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (node.id === id) {
      return nodes.splice(i, 1)[0];
    }
    if (node.type === "folder") {
      const removed = removeNode(node.children, id);
      if (removed) return removed;
    }
  }
  return null;
}

/** True if `ancestor` is a (possibly indirect) parent of `maybeDescendant`. */
export function containsNode(ancestor: Node, maybeDescendantId: string): boolean {
  for (const child of ancestor.children) {
    if (child.id === maybeDescendantId) return true;
    if (child.type === "folder" && containsNode(child, maybeDescendantId)) return true;
  }
  return false;
}
