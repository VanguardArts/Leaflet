// Leaflet — Netscape Bookmark HTML parser and serializer.
//
// The reference dialect (as produced by Firefox and by the existing bookmark
// workflow) looks like this on disk:
//
//   <!DOCTYPE NETSCAPE-Bookmark-file-1>
//   <TITLE>Bookmarks</TITLE>
//   <H1>Bookmarks Menu</H1>
//   <DL><p>
//       <DT><H3 ADD_DATE="123" LAST_MODIFIED="123">Folder</H3>
//       <DL><p>
//           <DT><A HREF="https://..." ADD_DATE="123">Title</A>
//       </DL><p>
//   </DL><p>
//
// Important: although the markup *looks* like the nested `<DL>` is a sibling
// of the `<DT>`, an HTML parser actually nests the `<DL>` inside the `<DT>`
// (because `<DT>` is implicitly closed only when the following `<DL>` begins).
// So the parsed DOM shape is:
//
//   DT (folder)
//     H3  "Folder"
//     DL  (children)
//       DT (bookmark)
//         A   "https://..."
//
// The parser below walks `dl.children` looking for direct `<DT>` elements and,
// for folders, reads the direct-child `<DL>`.

import type { Node } from "./model";
import { makeBookmark, makeFolder } from "./model";

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

function parseSeconds(value: string | null): number | undefined {
  if (!value) return undefined;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : undefined;
}

/** Return the first element child of `el` with the given tag name (or null). */
function directChild(el: Element, tag: string): Element | null {
  for (const child of Array.from(el.children)) {
    if (child.tagName === tag) return child;
  }
  return null;
}

function parseDL(dl: Element): Node[] {
  const nodes: Node[] = [];
  for (const dt of Array.from(dl.children)) {
    if (dt.tagName !== "DT") continue;

    const h3 = directChild(dt, "H3");
    const a = directChild(dt, "A");

    if (h3) {
      const folder = makeFolder((h3.textContent ?? "").trim());
      folder.addDate = parseSeconds(h3.getAttribute("ADD_DATE"));
      folder.lastModified = parseSeconds(h3.getAttribute("LAST_MODIFIED"));
      const subDl = directChild(dt, "DL");
      folder.children = subDl ? parseDL(subDl) : [];
      nodes.push(folder);
    } else if (a) {
      const href = a.getAttribute("HREF") ?? "";
      const titleAttr = a.getAttribute("title");
      const text = (a.textContent ?? "").trim();
      const title = text || titleAttr || href || "(untitled)";
      const bookmark = makeBookmark(title, href);
      bookmark.addDate = parseSeconds(a.getAttribute("ADD_DATE"));
      const iconAttr = a.getAttribute("ICON_URI") ?? a.getAttribute("ICON");
      if (iconAttr) bookmark.icon = iconAttr;
      nodes.push(bookmark);
    }
  }
  return nodes;
}

/**
 * Parse a full Netscape bookmarks HTML document into a forest of nodes.
 * Accepts inputs whose bookmark lists are direct children of <body> (the
 * common case) and gracefully handles a single nested root <DL>.
 */
export function parseNetscape(html: string): Node[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const dls = Array.from(doc.body.querySelectorAll("dl"));

  // Prefer <DL> elements that sit directly under <body> (a document may list
  // several top-level lists). Otherwise fall back to the first <DL> found.
  let roots = dls.filter((dl) => dl.parentElement === doc.body);
  if (roots.length === 0) roots = dls.slice(0, 1);

  const nodes: Node[] = [];
  for (const dl of roots) {
    nodes.push(...parseDL(dl));
  }
  return nodes;
}

// ---------------------------------------------------------------------------
// Serializing
// ---------------------------------------------------------------------------

function escapeText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(value: string): string {
  return escapeText(value).replace(/"/g, "&quot;");
}

const now = () => Math.floor(Date.now() / 1000);

function serializeNode(node: Node, indent: number, out: string[]): void {
  const pad = "    ".repeat(indent);
  if (node.type === "folder") {
    const addDate = node.addDate ?? now();
    const lastModified = node.lastModified ?? now();
    out.push(
      `${pad}<DT><H3 ADD_DATE="${addDate}" LAST_MODIFIED="${lastModified}">${escapeText(
        node.title,
      )}</H3>`,
    );
    out.push(`${pad}<DL><p>`);
    for (const child of node.children) {
      serializeNode(child, indent + 1, out);
    }
    out.push(`${pad}</DL><p>`);
  } else {
    const addDate = node.addDate ?? now();
    const href = node.url;
    out.push(
      `${pad}<DT><A HREF="${escapeAttr(href)}" ADD_DATE="${addDate}">${escapeText(
        node.title,
      )}</A>`,
    );
  }
}

/** Serialize a forest of nodes to a Netscape bookmarks HTML document. */
export function serializeNetscape(nodes: Node[]): string {
  const out: string[] = [];
  out.push("<!DOCTYPE NETSCAPE-Bookmark-file-1>");
  out.push("<!-- This is an automatically generated file.");
  out.push("     It will be read and overwritten.");
  out.push("     DO NOT EDIT! -->");
  out.push('<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">');
  out.push("<TITLE>Bookmarks</TITLE>");
  out.push("<H1>Bookmarks Menu</H1>");
  out.push("");
  out.push("<DL><p>");
  for (const node of nodes) {
    serializeNode(node, 1, out);
  }
  out.push("</DL><p>");
  return out.join("\n") + "\n";
}
