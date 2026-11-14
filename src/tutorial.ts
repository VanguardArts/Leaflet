// Leaflet — first-run onboarding & tutorial wizard.
//
// Leaflet launches with an EMPTY library — no seed or dummy data. This overlay
// teaches the core gestures and, on the final step, *optionally* loads a small
// set of generic sample bookmarks so the user can practice. The sample is
// always opt-in and undoable; nothing is loaded unless the user asks for it.

import {
  ICON_LEAF,
  ICON_FOLDER,
  ICON_FOLDER_OPEN,
  ICON_LINK,
  ICON_CHEVRON,
  ICON_DRAG,
} from "./render";

const ONBOARDED_KEY = "leaflet.onboarded";

export interface TutorialHooks {
  /** True when the library currently has no bookmarks. */
  isEmpty(): boolean;
  /** Load the generic sample set (must be undoable). */
  loadSample(): void;
  /** Ensure the library is empty (must be undoable if it changes anything). */
  startEmpty(): void;
}

/** Show the wizard automatically on first run only. */
export function shouldShowOnboarding(): boolean {
  try {
    return localStorage.getItem(ONBOARDED_KEY) !== "1";
  } catch {
    return true;
  }
}

function markOnboarded(): void {
  try {
    localStorage.setItem(ONBOARDED_KEY, "1");
  } catch {
    // localStorage unavailable — non-fatal; the tour simply may show again.
  }
}

/**
 * Mark onboarding as seen WITHOUT showing the wizard. Used for returning users
 * who already have a populated library — they don't need a "start fresh" tour.
 */
export function markOnboardingSeen(): void {
  markOnboarded();
}

// ---------------------------------------------------------------------------
// Small inline SVG icon helpers (stroke style, matches the toolbar icons)
// ---------------------------------------------------------------------------

const S = (inner: string): string =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;

const ICON_ORG = S(
  `<rect x="9" y="3" width="6" height="4" rx="1"/><rect x="3" y="17" width="6" height="4" rx="1"/><rect x="15" y="17" width="6" height="4" rx="1"/><path d="M12 7v4M6 17v-2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2"/>`,
);
const ICON_PENCIL = S(
  `<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>`,
);
const ICON_SEARCH = S(`<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>`);
const ICON_SAVE = S(
  `<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/>`,
);
const ICON_SPARKLE = S(
  `<path d="M12 3l1.8 4.6L18.5 9l-4.7 1.4L12 15l-1.8-4.6L5.5 9l4.7-1.4Z"/><path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9Z"/>`,
);

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

interface Step {
  icon: string;
  title: string;
  html: string;
  /** Render the interactive "choose your start" cards (final step). */
  choice?: boolean;
}

const STEPS: Step[] = [
  {
    icon: ICON_LEAF,
    title: "Welcome to Leaflet",
    html: `
      <p class="lead">Your little corner of the internet.</p>
      <p>Leaflet is a calm, free &amp; open-source home for your bookmarks.
      It starts empty — <strong>your</strong> links, nothing else. This quick
      tour shows the essentials in about a minute.</p>
    `,
  },
  {
    icon: ICON_ORG,
    title: "Meet your tree",
    html: `
      <p>Bookmarks live in folders. <strong>Click</strong> to select, click a
      folder's chevron to expand it, and <strong>double-click</strong> a
      bookmark to open it.</p>
      <div class="demo-tree" aria-hidden="true"></div>
    `,
  },
  {
    icon: ICON_DRAG,
    title: "Add &amp; arrange",
    html: `
      <ul class="tips">
        <li><strong>＋ Folder</strong> / <strong>＋ Bookmark</strong> create items
          (inside the selected folder).</li>
        <li><strong>Drag any row</strong> to reorder — drop onto a folder to
          nest inside it.</li>
        <li><strong>⤢ / ⊟</strong> expand or collapse everything at once.</li>
      </ul>
    `,
  },
  {
    icon: ICON_PENCIL,
    title: "Edit &amp; undo",
    html: `
      <ul class="tips">
        <li>Select anything to edit its <strong>title &amp; URL</strong> in the
          Inspector.</li>
        <li><kbd>F2</kbd> renames, <kbd>Del</kbd> deletes.</li>
        <li><kbd>Ctrl</kbd>+<kbd>Z</kbd> undoes — Leaflet remembers your last
          100 steps and autosaves as you go.</li>
      </ul>
    `,
  },
  {
    icon: ICON_SEARCH,
    title: "Find fast, make it yours",
    html: `
      <ul class="tips">
        <li><kbd>Ctrl</kbd>+<kbd>F</kbd> searches titles and URLs live.</li>
        <li>Toggle <strong>light / dark</strong> with the ☾ button.</li>
        <li>Pick an <strong>accent color</strong> from the ● swatch — the whole
          app follows.</li>
      </ul>
    `,
  },
  {
    icon: ICON_SAVE,
    title: "Bring your bookmarks",
    html: `
      <ul class="tips">
        <li><kbd>Ctrl</kbd>+<kbd>O</kbd> imports a browser
          <strong>bookmarks.html</strong> file.</li>
        <li><kbd>Ctrl</kbd>+<kbd>S</kbd> saves back to the same universal
          format, ready for any browser.</li>
      </ul>
    `,
    choice: true,
  },
];

// ---------------------------------------------------------------------------
// DOM helpers
// ---------------------------------------------------------------------------

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

/** Build a static, non-interactive sample tree to illustrate the UI. */
function buildDemoTree(): HTMLElement {
  const box = el("div", "demo-tree-inner");

  const row = (
    depth: number,
    kind: "folder" | "bookmark",
    title: string,
    opts: { open?: boolean; count?: number; href?: string } = {},
  ): HTMLElement => {
    const r = el("div", `row ${kind}`);
    r.style.paddingLeft = `calc(${depth} * var(--indent))`;
    const twisty =
      kind === "folder"
        ? `<span class="twisty">${ICON_CHEVRON}</span>`
        : `<span class="twisty"></span>`;
    const icon =
      kind === "folder" ? (opts.open ? ICON_FOLDER_OPEN : ICON_FOLDER) : ICON_LINK;
    const count =
      kind === "folder" && opts.count != null
        ? `<span class="count">${opts.count}</span>`
        : "";
    const href = opts.href ? `<span class="href">${opts.href}</span>` : "";
    r.innerHTML = `${twisty}<span class="icon">${icon}</span><span class="title">${title}</span>${href}${count}`;
    if (opts.open) r.setAttribute("aria-expanded", "true");
    return r;
  };

  box.appendChild(row(0, "folder", "Dev", { open: true, count: 2 }));
  box.appendChild(row(1, "bookmark", "MDN Web Docs", { href: "developer.mozilla.org" }));
  box.appendChild(row(1, "bookmark", "Stack Overflow", { href: "stackoverflow.com" }));
  box.appendChild(row(0, "folder", "Inspiration", { count: 3 }));
  return box;
}

// ---------------------------------------------------------------------------
// Wizard
// ---------------------------------------------------------------------------

/**
 * Show the tutorial overlay. Safe to call any time — it no-ops if one is
 * already open. Choice cards on the final step only appear when the library is
 * empty, so relaunching the tour never risks existing data.
 */
export function showTutorial(hooks: TutorialHooks): void {
  if (document.querySelector(".tutorial-backdrop")) return;

  const lastIndex = STEPS.length - 1;
  let index = 0;
  let choice: "empty" | "sample" = "empty";

  const backdrop = el("div", "tutorial-backdrop");
  backdrop.setAttribute("role", "dialog");
  backdrop.setAttribute("aria-modal", "true");
  backdrop.setAttribute("aria-label", "Leaflet tutorial");

  const card = el("div", "tutorial-card");
  backdrop.appendChild(card);

  // Header: brand + skip.
  const header = el("div", "tutorial-header");
  const brand = el("div", "tutorial-brand");
  brand.innerHTML = `<span class="brand-icon">${ICON_LEAF}</span><span class="tutorial-brand-name">Leaflet tour</span>`;
  const skipBtn = el("button", "btn secondary tutorial-skip");
  skipBtn.type = "button";
  skipBtn.textContent = "Skip tour";
  header.append(brand, skipBtn);

  // Body (step content).
  const body = el("div", "tutorial-body");

  // Footer: dots + nav.
  const footer = el("div", "tutorial-footer");
  const dots = el("div", "tutorial-dots");
  const nav = el("div", "tutorial-nav");
  const backBtn = el("button", "btn secondary");
  backBtn.type = "button";
  backBtn.textContent = "Back";
  const nextBtn = el("button", "btn primary");
  nextBtn.type = "button";
  nextBtn.textContent = "Next";
  nav.append(backBtn, nextBtn);
  footer.append(dots, nav);

  card.append(header, body, footer);

  function close(): void {
    document.removeEventListener("keydown", onKey, true);
    backdrop.remove();
  }

  function dismiss(): void {
    markOnboarded();
    close();
  }

  function finish(): void {
    // Only mutate the library when it's empty — never overwrite user data.
    if (hooks.isEmpty()) {
      if (choice === "sample") hooks.loadSample();
      else hooks.startEmpty();
    }
    markOnboarded();
    close();
  }

  function renderDots(): void {
    dots.replaceChildren();
    for (let i = 0; i < STEPS.length; i++) {
      const d = el("button", "dot");
      d.type = "button";
      d.setAttribute("aria-label", `Step ${i + 1} of ${STEPS.length}`);
      if (i === index) d.classList.add("active");
      if (i < index) d.classList.add("done");
      d.addEventListener("click", () => {
        index = i;
        renderStep();
      });
      dots.appendChild(d);
    }
  }

  function renderChoice(): void {
    const wrap = el("div", "choice-cards");

    const makeCard = (
      id: "empty" | "sample",
      icon: string,
      title: string,
      desc: string,
      badge?: string,
    ): HTMLButtonElement => {
      const c = el("button", "choice-card");
      c.type = "button";
      c.dataset.choice = id;
      c.innerHTML = `
        <span class="choice-icon">${icon}</span>
        <span class="choice-text">
          <span class="choice-title">${title}${badge ? `<span class="choice-badge">${badge}</span>` : ""}</span>
          <span class="choice-desc">${desc}</span>
        </span>
      `;
      c.addEventListener("click", () => {
        choice = id;
        wrap.querySelectorAll(".choice-card").forEach((n) => n.classList.remove("active"));
        c.classList.add("active");
        nextBtn.textContent = "Start using Leaflet";
      });
      return c;
    };

    const emptyCard = makeCard(
      "empty",
      ICON_LEAF,
      "Start with a clean slate",
      "An empty library, ready for your own bookmarks.",
      "Recommended",
    );
    const sampleCard = makeCard(
      "sample",
      ICON_SPARKLE,
      "Explore sample bookmarks",
      "A few example folders & links to practice with — delete them anytime.",
    );

    wrap.append(emptyCard, sampleCard);
    body.appendChild(wrap);

    // Default selection: clean slate.
    emptyCard.classList.add("active");
  }

  function renderStep(): void {
    const step = STEPS[index];
    body.replaceChildren();

    const head = el("div", "tutorial-step-head");
    head.innerHTML = `<span class="tutorial-step-icon">${step.icon}</span><h2 class="tutorial-step-title">${step.title}</h2>`;
    body.appendChild(head);

    const content = el("div", "tutorial-step-content");
    content.innerHTML = step.html;
    body.appendChild(content);

    // Inject the static demo tree where referenced.
    const demoHost = content.querySelector(".demo-tree");
    if (demoHost) demoHost.appendChild(buildDemoTree());

    // Final step: interactive choice cards, but only when the library is empty
    // (so relaunching the tour on a populated library is purely informational).
    if (step.choice) {
      if (hooks.isEmpty()) {
        renderChoice();
      } else {
        const done = el("p", "tutorial-allset");
        done.innerHTML = `You're all set — your library is already underway. Happy organizing! 🌿`;
        body.appendChild(done);
      }
    }

    // Nav state.
    backBtn.disabled = index === 0;
    backBtn.style.visibility = index === 0 ? "hidden" : "visible";
    nextBtn.textContent =
      index === lastIndex ? (hooks.isEmpty() ? "Start using Leaflet" : "Done") : "Next";

    renderDots();

    // Keep the primary action reachable via keyboard.
    nextBtn.focus({ preventScroll: true });
  }

  function onKey(e: KeyboardEvent): void {
    if (e.key === "Escape") {
      e.preventDefault();
      dismiss();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      if (index < lastIndex) {
        index++;
        renderStep();
      }
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      if (index > 0) {
        index--;
        renderStep();
      }
    } else if (e.key === "Enter") {
      const t = e.target as HTMLElement;
      if (t.closest(".choice-card") || t.closest(".dot")) return; // let those handle it
      e.preventDefault();
      if (index === lastIndex) finish();
      else {
        index++;
        renderStep();
      }
    }
  }

  skipBtn.addEventListener("click", dismiss);
  backBtn.addEventListener("click", () => {
    if (index > 0) {
      index--;
      renderStep();
    }
  });
  nextBtn.addEventListener("click", () => {
    if (index === lastIndex) finish();
    else {
      index++;
      renderStep();
    }
  });

  // Click on the dimmed backdrop (outside the card) dismisses the tour.
  backdrop.addEventListener("mousedown", (e) => {
    if (e.target === backdrop) dismiss();
  });

  document.addEventListener("keydown", onKey, true);
  document.body.appendChild(backdrop);
  renderStep();
}
