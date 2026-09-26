// Convertly Studio's own landing page: a dashboard, not another tool tab. Opening Studio
// lands here first (a catalog of surfaces and templates), the editor itself is a separate
// screen reached from a tile or a template, matching the Canva/Figma pattern of "see your
// options, then go create" rather than dropping straight into a blank canvas.
import { el } from "../ui/dom";
import { STUDIO_TEMPLATES } from "../lib/studioTemplates";
import type { StudioElement } from "../tools/studioTool";

export interface StudioHomeOptions {
  onStartFromScratch: () => void;
  onOpenTemplate: (elements: StudioElement[], presetId: string) => void;
}

function surfaceTile(opts: {
  title: string;
  desc: string;
  icon: string;
  status: "live" | "soon";
  onOpen?: () => void;
}): HTMLElement {
  const tile = el("div", { class: `studio-surface-tile${opts.status === "soon" ? " soon" : ""}` });
  const iconBox = el("div", { class: "studio-surface-icon" });
  iconBox.innerHTML = opts.icon;
  const badge =
    opts.status === "soon"
      ? el("span", { class: "studio-surface-badge" }, ["Coming soon"])
      : el("span", { class: "studio-surface-badge live" }, ["Open"]);
  tile.append(iconBox, el("h3", {}, [opts.title]), el("p", {}, [opts.desc]), badge);
  if (opts.status === "live" && opts.onOpen) {
    tile.setAttribute("role", "button");
    tile.setAttribute("tabindex", "0");
    tile.addEventListener("click", opts.onOpen);
    tile.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        opts.onOpen!();
      }
    });
  }
  return tile;
}

const ICONS = {
  design: `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="10" r="2.2"/><path d="M4 17l5-5 3 3 4-5 4 5"/></svg>`,
  video: `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2.5" y="5.5" width="14" height="13" rx="2.5"/><path d="M17 9.5 21.5 6.5v11L17 14.5"/></svg>`,
  audio: `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 13v-2a8 8 0 0 1 16 0v2"/><rect x="2.5" y="12.5" width="4" height="6" rx="1.5"/><rect x="17.5" y="12.5" width="4" height="6" rx="1.5"/></svg>`,
};

export function buildStudioHome(opts: StudioHomeOptions): HTMLElement {
  const root = el("div", { class: "studio-home" });

  const hero = el("div", { class: "studio-home-hero" }, [
    el("h1", {}, ["Convertly Studio"]),
    el("p", {}, [
      "A real visual editor, not a settings form: design canvas, image editing, video editing and audio editing, all live in the browser.",
    ]),
  ]);

  const startBtn = el("button", { type: "button", class: "run-btn" }, ["+ Start from scratch"]);
  startBtn.addEventListener("click", () => opts.onStartFromScratch());
  hero.appendChild(startBtn);

  const surfacesGrid = el("div", { class: "studio-surfaces-grid" }, [
    surfaceTile({
      title: "Design & image editing",
      desc: "Text, shapes, images, layers, background removal, real drag and resize.",
      icon: ICONS.design,
      status: "live",
      onOpen: () => opts.onStartFromScratch(),
    }),
    surfaceTile({
      title: "Video editing",
      desc: "A real timeline: drag to trim, scrub for a live preview, overlay text and graphics on your clip.",
      icon: ICONS.video,
      status: "soon",
    }),
    surfaceTile({
      title: "Audio editing",
      desc: "Volume, fades, and swapping in a different track, built on the same engine as Convertly's audio tools.",
      icon: ICONS.audio,
      status: "soon",
    }),
  ]);

  const templatesHeader = el("div", { class: "studio-section-header" }, [
    el("h2", {}, ["Templates"]),
    el("p", {}, ["Start from a real layout and make it yours."]),
  ]);

  const templatesGrid = el("div", { class: "studio-templates-grid" });
  for (const tpl of STUDIO_TEMPLATES) {
    const card = el("button", { type: "button", class: "studio-template-card" });
    const thumb = el("div", { class: "studio-template-thumb" });
    thumb.style.background = `linear-gradient(135deg, ${tpl.accent}33, ${tpl.accent}bb)`;
    card.append(thumb, el("span", {}, [tpl.name]));
    card.addEventListener("click", () => opts.onOpenTemplate(tpl.elements, tpl.presetId));
    templatesGrid.appendChild(card);
  }

  root.append(hero, surfacesGrid, templatesHeader, templatesGrid);
  return root;
}
