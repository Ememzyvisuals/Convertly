// Convertly Studio's own landing page: a dashboard, not another tool tab. Opening Studio
// lands here first (a catalog of surfaces and templates), the editor itself is a separate
// screen reached from a tile or a template, matching the Canva/Figma pattern of "see your
// options, then go create" rather than dropping straight into a blank canvas.
import { el } from "../ui/dom";
import { STUDIO_TEMPLATES, PRESET_DIMENSIONS, type StudioTemplate } from "../lib/studioTemplates";
import type { StudioElement } from "../tools/studioTool";

// The templates grid renders a genuine scaled-down copy of each template's real layout (true
// colors, true text, true proportions), not a placeholder gradient, so what a person sees on
// the dashboard is what they actually get when they open it. It's built in plain positioned
// HTML rather than Konva/canvas, so the dashboard never has to load the editor's canvas engine
// just to show a preview. Font files are the one real cost of that accuracy: the browser only
// fetches a given weight once some visible text actually uses it, so this pulls in whichever
// of the Studio's fonts these templates use, a bit earlier than opening the editor would.
import "@fontsource/inter/400.css";
import "@fontsource/inter/700.css";
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/700.css";
import "@fontsource/playfair-display/400.css";
import "@fontsource/bebas-neue/400.css";
import "@fontsource/caveat/700.css";
import "@fontsource/anton/400.css";

const FONT_STACKS: Record<string, string> = {
  Inter: "Inter, sans-serif",
  Poppins: "Poppins, sans-serif",
  "Playfair Display": "\"Playfair Display\", serif",
  "Bebas Neue": "\"Bebas Neue\", sans-serif",
  Caveat: "Caveat, cursive",
  Anton: "Anton, sans-serif",
};

function buildTemplatePreview(tpl: StudioTemplate): HTMLElement {
  const dims = PRESET_DIMENSIONS[tpl.presetId];
  const thumb = el("div", {
    class: "studio-template-thumb",
    style: `aspect-ratio:${dims.width}/${dims.height};`,
  });

  for (const layer of tpl.elements) {
    const leftPct = (layer.kind === "circle" ? layer.x - layer.width / 2 : layer.x) / dims.width * 100;
    const topPct = (layer.kind === "circle" ? layer.y - layer.height / 2 : layer.y) / dims.height * 100;
    const widthPct = layer.width / dims.width * 100;
    const heightPct = layer.height / dims.height * 100;

    const node = el("div", {
      class: "studio-preview-node",
      style: `left:${leftPct}%; top:${topPct}%; width:${widthPct}%; height:${heightPct}%;`,
    });

    if (layer.kind === "rect") {
      node.style.background = layer.fill;
      node.style.borderRadius = "8%";
    } else if (layer.kind === "circle") {
      node.style.background = layer.fill;
      node.style.borderRadius = "50%";
    } else if (layer.kind === "image") {
      node.style.background = layer.fill || "#333";
      node.style.borderRadius = "6%";
    } else if (layer.kind === "text") {
      node.textContent = layer.text ?? "";
      node.style.color = layer.fill;
      node.style.fontFamily = FONT_STACKS[layer.fontFamily ?? "Inter"] ?? "Inter, sans-serif";
      node.style.fontWeight = layer.bold ? "700" : "400";
      node.style.fontStyle = layer.italic ? "italic" : "normal";
      node.style.textAlign = layer.align ?? "left";
      node.style.fontSize = `${((layer.fontSize ?? 32) / dims.width) * 100}cqw`;
      node.style.lineHeight = "1.05";
      node.style.whiteSpace = "pre-line";
      node.style.overflow = "hidden";
    }
    thumb.appendChild(node);
  }

  return thumb;
}

export interface StudioHomeOptions {
  onStartFromScratch: () => void;
  onOpenTemplate: (elements: StudioElement[], presetId: string) => void;
  onOpenVideoEditor: () => void;
  onOpenAudioEditor: () => void;
  onStartTour: () => void;
}

const ICONS = {
  design: `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="10" r="2.2"/><path d="M4 17l5-5 3 3 4-5 4 5"/></svg>`,
  video: `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="2.5" y="5.5" width="14" height="13" rx="2.5"/><path d="M17 9.5 21.5 6.5v11L17 14.5"/></svg>`,
  audio: `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 13v-2a8 8 0 0 1 16 0v2"/><rect x="2.5" y="12.5" width="4" height="6" rx="1.5"/><rect x="17.5" y="12.5" width="4" height="6" rx="1.5"/></svg>`,
  templates: `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/><rect x="13" y="13" width="8" height="8" rx="2"/></svg>`,
  search: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>`,
};

/** A colorful circular quick-action, the same pattern as Canva's home hub row (Docs,
 * Whiteboards, Presentations...): a tinted round icon plus a label underneath, not a bordered
 * rectangular card like the rest of the dashboard's tiles. */
function quickAction(colorVar: string, label: string, icon: string, onClick: () => void): HTMLElement {
  const btn = el("button", { type: "button", class: "studio-quick-action", style: `--qa-color: ${colorVar};` });
  const bubble = el("span", { class: "studio-quick-action-bubble" });
  bubble.innerHTML = icon;
  btn.append(bubble, el("span", { class: "studio-quick-action-label" }, [label]));
  btn.addEventListener("click", onClick);
  return btn;
}

export function buildStudioHome(opts: StudioHomeOptions): HTMLElement {
  const root = el("div", { class: "studio-home" });

  // The original hero: mascot, title, description, "Start from scratch" - unchanged from
  // before, restored exactly as it was.
  const heroCopy = el("div", { class: "studio-home-hero-copy" }, [
    el("h1", {}, ["Convertly Studio"]),
    el("p", {}, [
      "A real visual editor, not a settings form: design canvas, image editing, video editing and audio editing, all live in the browser.",
    ]),
  ]);
  const startBtn = el("button", { type: "button", class: "run-btn" }, ["+ Start from scratch"]);
  startBtn.addEventListener("click", () => opts.onStartFromScratch());
  const tourBtn = el("button", { type: "button", class: "secondary-btn", "data-tour": "studio-tour-entry" }, ["Guided tour"]);
  tourBtn.addEventListener("click", () => opts.onStartTour());
  heroCopy.append(startBtn, tourBtn);

  const heroVisual = el("div", { class: "studio-home-hero-visual" });
  heroVisual.innerHTML = `
    <picture>
      <source srcset="/brand/mascot-studio.webp" type="image/webp" />
      <img src="/brand/mascot-studio.png" alt="" width="627" height="627" />
    </picture>`;

  const hero = el("div", { class: "studio-home-hero", "data-tour": "studio-welcome" }, [heroCopy, heroVisual]);

  // The quick-access card: same search-and-icons format as before, now recolored to Convertly's
  // own orange/dark palette (no purple, no blue) and placed where the three plain surface tiles
  // used to be, since this card already covers getting into each editor.
  const searchInput = el("input", {
    type: "text",
    class: "studio-home-search-input",
    placeholder: "Search templates, or jump into an editor",
  }) as HTMLInputElement;
  const searchWrap = el("div", { class: "studio-home-search" }, [
    el("span", { class: "studio-home-search-icon" }, []),
    searchInput,
  ]);
  (searchWrap.querySelector(".studio-home-search-icon") as HTMLElement).innerHTML = ICONS.search;

  const quickActions = el("div", { class: "studio-home-quick-actions", "data-tour": "studio-open-tools" }, [
    quickAction("var(--accent)", "Design", ICONS.design, () => opts.onStartFromScratch()),
    quickAction("#ff8f3f", "Video", ICONS.video, () => opts.onOpenVideoEditor()),
    quickAction("#c25400", "Audio", ICONS.audio, () => opts.onOpenAudioEditor()),
    quickAction("#ffb066", "Templates", ICONS.templates, () => {
      document.getElementById("studio-templates-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }),
  ]);

  const quickAccessCard = el("div", { class: "studio-quick-access-card" }, [
    el("h2", {}, ["What will you make today?"]),
    el("p", {}, ["Jump straight into an editor, or search the templates below."]),
    searchWrap,
    quickActions,
  ]);

  searchInput.addEventListener("input", () => {
    const q = searchInput.value.trim().toLowerCase();
    for (const card of templatesGrid.children) {
      // ":scope > span" (a direct child of the card), not "span" (any descendant) - the
      // motion badge is also a <span>, nested inside the thumbnail, and sorts first in
      // document order, so a bare descendant selector would match the badge's text instead
      // of the template's actual name for every motion-badged card.
      const name = (card.querySelector(":scope > span")?.textContent ?? "").toLowerCase();
      (card as HTMLElement).style.display = !q || name.includes(q) ? "" : "none";
    }
  });

  const templatesHeader = el("div", { class: "studio-section-header", id: "studio-templates-section" }, [
    el("h2", {}, ["Templates"]),
    el("p", {}, ["Start from a real layout and make it yours."]),
  ]);

  const templatesGrid = el("div", { class: "studio-templates-grid" });
  for (const tpl of STUDIO_TEMPLATES) {
    const card = el("button", { type: "button", class: "studio-template-card" });
    const thumb = buildTemplatePreview(tpl);
    if (tpl.isMotion) thumb.appendChild(el("span", { class: "studio-template-motion-badge" }, ["▶ Motion"]));
    card.append(thumb, el("span", {}, [tpl.name]));
    card.addEventListener("click", () => opts.onOpenTemplate(tpl.elements, tpl.presetId));
    templatesGrid.appendChild(card);
  }

  root.append(hero, quickAccessCard, templatesHeader, templatesGrid);
  return root;
}
