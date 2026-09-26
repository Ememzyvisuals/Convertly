import "@fontsource/outfit/400.css";
import "@fontsource/outfit/500.css";
import "@fontsource/outfit/600.css";
import "@fontsource/outfit/700.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/jetbrains-mono/600.css";
import "./style.css";
import { el, clear } from "./ui/dom";
import { buildConvertTool } from "./tools/convertTool";
import { buildVectorizeTool } from "./tools/vectorizeTool";
import { buildCompressTool } from "./tools/compressTool";
import { buildPdfTool } from "./tools/pdfTool";
import { buildArchiveTool } from "./tools/archiveTool";
import { buildAudioTool } from "./tools/audioTool";
import { buildVideoExtraTool } from "./tools/videoExtraTool";
import { buildStudioHome } from "./pages/studioHome";
import { xLogoSVG, tiktokLogoSVG, githubLogoSVG, portfolioGlyphSVG } from "./ui/socialIcons";
import { createThemeToggle } from "./ui/themeToggle";
import { heroCharacterSVG, workspaceAvatarSVG } from "./ui/illustrations";

const YEAR = new Date().getFullYear();

type View = "landing" | "workspace" | "studio-home" | "studio-editor";

function brandMarkSVG(): string {
  return `<svg viewBox="0 0 20 20" width="20" height="20"><path d="M4 15 4 6 11 6 15 10 15 15 Z" fill="none" stroke="#e86f00" stroke-width="1.4"/><path d="M4 15 10 15 15 8" fill="none" stroke="#a5b4fc" stroke-width="1.4"/></svg>`;
}

function buildHeader(onNavigate: (view: View) => void): { root: HTMLElement; setView: (view: View) => void } {
  const mark = el("span", { class: "brand-mark" });
  mark.innerHTML = brandMarkSVG();

  const brand = el("button", { type: "button", class: "brand", "aria-label": "Convertly, go to home" }, [
    mark,
    "Convertly",
    el("span", { class: "brand-tag" }, ["local, browser-based file tools"]),
  ]);
  brand.addEventListener("click", () => onNavigate("landing"));

  const homeLink = el("button", { type: "button", class: "header-nav-btn" }, ["Home"]);
  homeLink.addEventListener("click", () => onNavigate("landing"));

  const toolsLink = el("button", { type: "button", class: "header-nav-btn" }, ["Open tools"]);
  toolsLink.addEventListener("click", () => onNavigate("workspace"));

  const studioLink = el("button", { type: "button", class: "header-nav-btn header-nav-studio" }, ["Studio"]);
  studioLink.addEventListener("click", () => onNavigate("studio-home"));

  const root = el("header", { class: "site-header" }, [
    el("div", { class: "shell" }, [
      brand,
      el("div", { class: "header-right" }, [
        el("nav", { class: "header-links" }, [homeLink, toolsLink, studioLink]),
        createThemeToggle(),
      ]),
    ]),
  ]);

  function setView(view: View) {
    homeLink.setAttribute("aria-current", view === "landing" ? "page" : "false");
    toolsLink.setAttribute("aria-current", view === "workspace" ? "page" : "false");
    studioLink.setAttribute("aria-current", view === "studio-home" || view === "studio-editor" ? "page" : "false");
  }

  return { root, setView };
}

function heroChip(dotClass: string, title: string, body: string, position: "top" | "bottom"): HTMLElement {
  return el("div", { class: `hero-chip hero-chip-${position}` }, [
    el("span", { class: `hero-chip-dot ${dotClass}` }),
    el("div", {}, [el("strong", {}, [title]), el("span", {}, [body])]),
  ]);
}

function buildHero(onGetStarted: () => void): HTMLElement {
  const character = el("div", { class: "hero-character", "aria-hidden": "true" });
  character.innerHTML = heroCharacterSVG();

  const visual = el("div", { class: "hero-visual-wrap" }, [
    character,
    heroChip("good", "Nothing uploaded", "runs 100% in your browser", "top"),
    heroChip("accent", "Real engines", "FFmpeg, canvas, a real tracer", "bottom"),
  ]);

  const getStartedBtn = el("button", { type: "button", class: "run-btn hero-cta" }, ["Get started"]);
  getStartedBtn.addEventListener("click", onGetStarted);

  return el("section", { class: "hero" }, [
    el("div", { class: "shell hero-inner" }, [
      el("div", { class: "hero-copy" }, [
        el("h1", {}, ["Make your files lighter, cleaner, ready."]),
        el("p", { class: "lede" }, [
          "Convert image formats, turn raster art into clean SVG, and compress images and video. Processed on your device, not uploaded to a server.",
        ]),
        el("div", { class: "hero-facts" }, [
          el("div", { class: "hero-fact" }, [el("strong", {}, ["No account"]), "Nothing to sign up for, nothing to pay for."]),
          el("div", { class: "hero-fact" }, [el("strong", {}, ["Runs locally"]), "Files are processed in your browser and never leave your device."]),
          el("div", { class: "hero-fact" }, [el("strong", {}, ["Real engines"]), "FFmpeg, canvas codecs, and a real tracing engine. No faked results."]),
        ]),
        getStartedBtn,
      ]),
      visual,
    ]),
  ]);
}

type ToolId = "convert" | "vectorize" | "compress" | "video-extra" | "pdf" | "archive" | "audio";
type CategoryId = "images-video" | "pdf-docs" | "audio" | "archives";

type ToolBuild = () => HTMLElement | Promise<HTMLElement>;

interface Category {
  id: CategoryId;
  label: string;
  desc: string;
  tools: { id: ToolId; label: string; desc: string; build: ToolBuild }[];
}

function buildToolGroup(tabs: { id: ToolId; label: string; desc: string; build: ToolBuild }[]): HTMLElement {
  const panels: Partial<Record<ToolId, HTMLElement>> = {};
  for (const tab of tabs) {
    const result = tab.build();
    if (result instanceof Promise) {
      // A heavier tool (its own bundle chunk, e.g. the Studio's canvas engine) loads on
      // demand rather than shipping to every visitor up front.
      const placeholder = el("div", { class: "tool-panel", id: `panel-${tab.id}` }, [
        el("div", { class: "control-hint" }, ["Loading the Studio..."]),
      ]);
      panels[tab.id] = placeholder;
      result.then((real) => {
        real.id = `panel-${tab.id}`;
        real.classList.toggle("active", placeholder.classList.contains("active"));
        placeholder.replaceWith(real);
        panels[tab.id] = real;
      });
    } else {
      panels[tab.id] = result;
    }
  }

  const tabList = el("div", { class: "tool-tabs", role: "tablist", "aria-label": "Tools in this category" });
  const indicator = el("div", { class: "tab-indicator" });
  const tabButtons: Partial<Record<ToolId, HTMLElement>> = {};

  for (const tab of tabs) {
    const btn = el(
      "button",
      {
        class: "tool-tab",
        role: "tab",
        id: `tab-${tab.id}`,
        "aria-controls": `panel-${tab.id}`,
        "aria-selected": String(tab.id === tabs[0].id),
      },
      [tab.label, el("span", { class: "tool-tab-desc" }, [tab.desc])]
    );
    btn.addEventListener("click", () => selectTab(tab.id));
    tabList.appendChild(btn);
    tabButtons[tab.id] = btn;
  }
  tabList.appendChild(indicator);

  function moveIndicatorTo(id: ToolId) {
    const btn = tabButtons[id]!;
    indicator.style.width = `${btn.offsetWidth}px`;
    indicator.style.transform = `translateX(${btn.offsetLeft}px)`;
  }

  function selectTab(id: ToolId) {
    for (const tab of tabs) {
      tabButtons[tab.id]!.setAttribute("aria-selected", String(tab.id === id));
      panels[tab.id]!.classList.toggle("active", tab.id === id);
    }
    moveIndicatorTo(id);
  }

  panels[tabs[0].id]!.classList.add("active");
  const group = el("div", { class: "tool-group" }, [tabList, el("div", {}, tabs.map((t) => panels[t.id]!))]);

  requestAnimationFrame(() => moveIndicatorTo(tabs[0].id));
  window.addEventListener("resize", () => {
    const active = tabs.find((t) => tabButtons[t.id]!.getAttribute("aria-selected") === "true")!;
    moveIndicatorTo(active.id);
  });

  return group;
}

function buildWorkspace(): HTMLElement {
  const categories: Category[] = [
    {
      id: "images-video",
      label: "Images & video",
      desc: "convert, vectorize, compress",
      tools: [
        { id: "convert", label: "Convert", desc: "image formats", build: buildConvertTool },
        { id: "vectorize", label: "Vectorize", desc: "raster to SVG", build: buildVectorizeTool },
        { id: "compress", label: "Compress", desc: "images and video", build: buildCompressTool },
        { id: "video-extra", label: "Video tools", desc: "trim, GIF, extract audio", build: buildVideoExtraTool },
      ],
    },
    {
      id: "pdf-docs",
      label: "PDF",
      desc: "combine, split, render",
      tools: [{ id: "pdf", label: "PDF tools", desc: "images to PDF, merge, split, render", build: buildPdfTool }],
    },
    {
      id: "audio",
      label: "Audio",
      desc: "convert, trim, normalize",
      tools: [{ id: "audio", label: "Audio tools", desc: "format, bitrate, trim, normalize", build: buildAudioTool }],
    },
    {
      id: "archives",
      label: "Archives",
      desc: "zip and unzip",
      tools: [{ id: "archive", label: "Archive tools", desc: "create and extract zips", build: buildArchiveTool }],
    },
  ];

  let activeCategory: CategoryId = "images-video";
  const groupHost = el("div");
  const groupCache: Partial<Record<CategoryId, HTMLElement>> = {};

  const catRow = el("div", { class: "category-row", role: "tablist", "aria-label": "Tool categories" });
  const catButtons: Partial<Record<CategoryId, HTMLElement>> = {};

  for (const cat of categories) {
    const btn = el(
      "button",
      { type: "button", class: "category-pill", "aria-pressed": String(cat.id === activeCategory) },
      [el("strong", {}, [cat.label]), el("span", {}, [cat.desc])]
    );
    btn.addEventListener("click", () => selectCategory(cat.id));
    catRow.appendChild(btn);
    catButtons[cat.id] = btn;
  }

  function selectCategory(id: CategoryId) {
    activeCategory = id;
    for (const cat of categories) catButtons[cat.id]!.setAttribute("aria-pressed", String(cat.id === id));
    clear(groupHost);
    if (!groupCache[id]) {
      const cat = categories.find((c) => c.id === id)!;
      groupCache[id] = buildToolGroup(cat.tools);
    }
    groupHost.appendChild(groupCache[id]!);
  }

  selectCategory(activeCategory);

  const toolCard = el("div", { class: "tool-card" }, [catRow, groupHost]);

  const sideAvatar = el("div", { class: "workspace-avatar", "aria-hidden": "true" });
  sideAvatar.innerHTML = workspaceAvatarSVG();

  const side = el("aside", { class: "workspace-side" }, [
    sideAvatar,
    el("div", { class: "workspace-side-copy" }, [
      el("strong", {}, ["Nothing leaves this tab"]),
      el("p", {}, ["Every file here is read, processed and dropped by your browser. No upload, no waiting on a server."]),
    ]),
  ]);

  const shell = el("div", { class: "workspace-shell" }, [toolCard, side]);

  return el("section", { class: "workspace", id: "workspace" }, [
    el("div", { class: "shell" }, [shell]),
  ]);
}

function buildTrustSection(): HTMLElement {
  const cards = [
    {
      title: "Nothing is uploaded",
      body: "Convert, Vectorize and image Compress run entirely in canvas and WebAssembly, inside this tab. Video compression uses a real FFmpeg build compiled to WebAssembly, also local. Files are never sent to a server.",
    },
    {
      title: "Estimates are estimates",
      body: "Before you process a file, size predictions are labelled as estimates because real output depends on the file's content. After processing, you see the actual output size and the actual change.",
    },
    {
      title: "Honest about limits",
      body: "Large videos need real memory and time. This is engineering-limited, not a marketing promise. If your device can't handle a file, you'll get a clear error instead of a fake result.",
    },
  ];

  const cardEls = cards.map((c) =>
    el("div", { class: "trust-card" }, [el("h3", {}, [c.title]), el("p", {}, [c.body])])
  );

  const grid = el("div", { class: "shell trust-grid" }, cardEls);
  const section = el("section", { class: "trust-section", id: "how-it-works" }, [grid]);

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, i) => {
          if (entry.isIntersecting) {
            const target = entry.target as HTMLElement;
            target.style.transitionDelay = `${i * 90}ms`;
            target.classList.add("in-view");
            observer.unobserve(target);
          }
        });
      },
      { threshold: 0.2 }
    );
    cardEls.forEach((c) => observer.observe(c));
  } else {
    cardEls.forEach((c) => c.classList.add("in-view"));
  }

  return section;
}

function socialLink(href: string, iconSVG: string, label: string): HTMLElement {
  const a = el("a", { href, target: "_blank", rel: "noopener noreferrer", class: "social-link", "aria-label": label, title: label }, [
    (() => {
      const icon = el("span", { class: "social-icon" });
      icon.innerHTML = iconSVG;
      return icon;
    })(),
  ]);
  return a;
}

function buildFooter(): HTMLElement {
  const brandMark = el("span", { class: "footer-brand-mark" });
  brandMark.innerHTML = brandMarkSVG();

  return el("footer", { class: "site-footer" }, [
    el("div", { class: "shell footer-grid" }, [
      el("div", { class: "footer-credit" }, [
        brandMark,
        el("span", {}, [el("strong", {}, ["Convertly"]), ", built by Ememzyvisuals"]),
      ]),
      el("nav", { class: "footer-socials", "aria-label": "Ememzyvisuals on the web" }, [
        socialLink("https://ememzyvisuals.vercel.app", portfolioGlyphSVG(), "Portfolio"),
        socialLink("https://x.com/Ememzyvisuals", xLogoSVG(), "X"),
        socialLink("https://github.com/Ememzyvisuals", githubLogoSVG(), "GitHub"),
        socialLink("https://www.tiktok.com/@Ememzyvisuals", tiktokLogoSVG(), "TikTok"),
      ]),
      el("div", { class: "footer-copyright" }, [`(c) ${YEAR} Convertly. Built by Ememzyvisuals.`]),
    ]),
  ]);
}

// ---------------- App shell with a landing view and a separate workspace view ----------------

const app = document.getElementById("app")!;

const landingHost = el("div", { class: "view view-landing" });
const workspaceHost = el("div", { class: "view view-workspace" });
const studioHomeHost = el("div", { class: "view view-studio-home" });
const studioEditorHost = el("div", { class: "view view-studio-editor" });

const HASH_BY_VIEW: Record<View, string> = {
  landing: "",
  workspace: "#/app",
  "studio-home": "#/studio",
  "studio-editor": "#/studio/edit",
};

function showOnly(view: View) {
  landingHost.style.display = view === "landing" ? "" : "none";
  workspaceHost.style.display = view === "workspace" ? "block" : "none";
  studioHomeHost.style.display = view === "studio-home" ? "block" : "none";
  studioEditorHost.style.display = view === "studio-editor" ? "block" : "none";
  header.setView(view);
  window.scrollTo(0, 0);
}

function goTo(view: View) {
  if (view === "studio-editor") {
    openStudioEditor();
    return;
  }
  showOnly(view);
  window.location.hash = HASH_BY_VIEW[view];
}

/** Opens the Studio editor, optionally pre-loaded from a template, as its own on-demand chunk. */
async function openStudioEditor(initialElements?: import("./tools/studioTool").StudioElement[], presetId?: string) {
  showOnly("studio-editor");
  window.location.hash = HASH_BY_VIEW["studio-editor"];
  clear(studioEditorHost);
  studioEditorHost.appendChild(
    el("div", { class: "control-hint", style: "padding:60px 20px; text-align:center" }, ["Loading the Studio editor..."])
  );
  const { buildStudioTool } = await import("./tools/studioTool");
  clear(studioEditorHost);
  studioEditorHost.appendChild(
    buildStudioTool({
      initialElements,
      initialPresetId: presetId,
      onBack: () => goTo("studio-home"),
    })
  );
}

const header = buildHeader(goTo);
const hero = buildHero(() => goTo("workspace"));
const trust = buildTrustSection();
const workspace = buildWorkspace();
const studioHome = buildStudioHome({
  onStartFromScratch: () => openStudioEditor(),
  onOpenTemplate: (elements, presetId) => openStudioEditor(elements, presetId),
});
const footer = buildFooter();

landingHost.append(hero, trust);
workspaceHost.append(workspace);
studioHomeHost.append(studioHome);

app.append(header.root, landingHost, workspaceHost, studioHomeHost, studioEditorHost, footer);

const hash = window.location.hash;
if (hash.startsWith("#/studio/edit")) {
  openStudioEditor();
} else if (hash.startsWith("#/studio")) {
  goTo("studio-home");
} else if (hash.startsWith("#/app")) {
  goTo("workspace");
} else {
  goTo("landing");
}
