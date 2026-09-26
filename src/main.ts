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
import { buildDesignFormatPicker } from "./pages/designFormatPicker";
import { xLogoSVG, tiktokLogoSVG, githubLogoSVG, portfolioGlyphSVG } from "./ui/socialIcons";
import { createThemeToggle } from "./ui/themeToggle";
import { workspaceAvatarSVG } from "./ui/illustrations";

const YEAR = new Date().getFullYear();

type View = "landing" | "workspace" | "studio-home" | "studio-new-design" | "studio-editor" | "studio-video" | "studio-audio";

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
    studioLink.setAttribute(
      "aria-current",
      view === "studio-home" || view === "studio-editor" || view === "studio-video" || view === "studio-audio" ? "page" : "false"
    );
  }

  return { root, setView };
}

function heroChip(dotClass: string, title: string, body: string, position: "top" | "bottom"): HTMLElement {
  return el("div", { class: `hero-chip hero-chip-${position}` }, [
    el("span", { class: `hero-chip-dot ${dotClass}` }),
    el("div", {}, [el("strong", {}, [title]), el("span", {}, [body])]),
  ]);
}

function buildHero(onGetStarted: () => void, onDemo: () => void): HTMLElement {
  const character = el("div", { class: "hero-character", "aria-hidden": "true" });
  character.innerHTML = `
    <picture>
      <source srcset="/brand/mascot-hero.webp" type="image/webp" />
      <img src="/brand/mascot-hero.png" alt="" width="380" height="570" />
    </picture>`;

  const visual = el("div", { class: "hero-visual-wrap" }, [
    character,
    heroChip("good", "Nothing uploaded", "runs 100% in your browser", "top"),
    heroChip("accent", "Real engines", "FFmpeg, canvas, a real tracer", "bottom"),
  ]);

  const getStartedBtn = el("button", { type: "button", class: "run-btn hero-cta" }, ["Get started"]);
  getStartedBtn.addEventListener("click", onGetStarted);
  const demoBtn = el("button", { type: "button", class: "secondary-btn hero-cta", "data-tour": "landing-demo-entry" }, ["Watch the demo"]);
  demoBtn.addEventListener("click", onDemo);

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
        el("div", { class: "hero-cta-row" }, [getStartedBtn, demoBtn]),
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

const REPO_URL = "https://github.com/Ememzyvisuals/Convertly";
const SUPPORT_URL = "https://x.com/Ememzyvisuals";

function footerIconSVG(name: "star" | "fork" | "heart" | "external" | "issue"): string {
  switch (name) {
    case "star":
      return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 3.5l2.6 5.3 5.9.9-4.25 4.1 1 5.9L12 16.9l-5.25 2.8 1-5.9L3.5 9.7l5.9-.9L12 3.5Z"/></svg>`;
    case "fork":
      return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="7" cy="6" r="2.2"/><circle cx="17" cy="6" r="2.2"/><circle cx="12" cy="18" r="2.2"/><path d="M7 8.2v2c0 2 1.8 3 4.8 3M17 8.2v2c0 2-1.8 3-4.8 3v2.8"/></svg>`;
    case "heart":
      return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 20.5s-7.5-4.6-9.8-9.3C.6 7.8 2.4 4.5 5.9 4c2.2-.3 4.2 1 6.1 3 1.9-2 3.9-3.3 6.1-3 3.5.5 5.3 3.8 3.7 7.2C19.5 15.9 12 20.5 12 20.5Z"/></svg>`;
    case "issue":
      return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M12 7.5v6"/><circle cx="12" cy="16.5" r="0.6" fill="currentColor" stroke="none"/></svg>`;
    case "external":
    default:
      return `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3M13 5h6v6M19 5l-9 9"/></svg>`;
  }
}

function footerRepoLink(href: string, iconName: "star" | "fork" | "heart" | "issue", label: string, primary?: boolean): HTMLElement {
  const a = el(
    "a",
    { href, target: "_blank", rel: "noopener noreferrer", class: `footer-repo-btn${primary ? " primary" : ""}` },
    [
      (() => {
        const icon = el("span", { class: "footer-repo-btn-icon" });
        icon.innerHTML = footerIconSVG(iconName);
        return icon;
      })(),
      el("span", {}, [label]),
    ]
  );
  return a;
}

function footerLinkList(title: string, links: { label: string; onClick: () => void }[] | { label: string; href: string }[]): HTMLElement {
  const items = links.map((link) => {
    if ("href" in link) {
      return el("li", {}, [
        el("a", { href: link.href, target: "_blank", rel: "noopener noreferrer" }, [
          link.label,
          (() => {
            const ext = el("span", { class: "footer-external-icon" });
            ext.innerHTML = footerIconSVG("external");
            return ext;
          })(),
        ]),
      ]);
    }
    const btn = el("button", { type: "button", class: "footer-text-link" }, [link.label]);
    btn.addEventListener("click", link.onClick);
    return el("li", {}, [btn]);
  });
  return el("div", { class: "footer-col" }, [el("h4", {}, [title]), el("ul", { class: "footer-col-list" }, items)]);
}

function buildFooter(onNavigate: (view: View) => void): HTMLElement {
  const brandMark = el("span", { class: "footer-brand-mark" });
  brandMark.innerHTML = brandMarkSVG();

  const aboutCol = el("div", { class: "footer-col footer-col-about" }, [
    el("div", { class: "footer-credit" }, [
      brandMark,
      el("span", {}, [el("strong", {}, ["Convertly"]), ", built by Ememzyvisuals"]),
    ]),
    el("p", { class: "footer-about-text" }, [
      "A browser-based file toolkit and a real design/video/audio studio. Nothing you work on is uploaded to a server, every conversion, trace, and render runs on your own device.",
    ]),
    el("div", { class: "footer-badges" }, [
      el("span", { class: "footer-badge" }, ["Open source"]),
      el("span", { class: "footer-badge" }, ["MIT license"]),
      el("span", { class: "footer-badge" }, ["No account needed"]),
    ]),
  ]);

  const productCol = footerLinkList("What Convertly can do", [
    { label: "Convert, vectorize, compress", onClick: () => onNavigate("workspace") },
    { label: "Studio: Design editor", onClick: () => onNavigate("studio-editor") },
    { label: "Studio: Video editor", onClick: () => onNavigate("studio-video") },
    { label: "Studio: Audio editor", onClick: () => onNavigate("studio-audio") },
  ] as { label: string; onClick: () => void }[]);

  const openSourceCol = el("div", { class: "footer-col" }, [
    el("h4", {}, ["Open source"]),
    el("p", { class: "footer-col-desc" }, ["Convertly is free and open source. Read the code, file an issue, or send a pull request."]),
    el("div", { class: "footer-repo-btns" }, [
      footerRepoLink(REPO_URL, "star", "Star this repo", true),
      footerRepoLink(REPO_URL, "fork", "Fork it"),
      footerRepoLink(`${REPO_URL}/issues`, "issue", "Report an issue"),
    ]),
  ]);

  const supportCol = el("div", { class: "footer-col" }, [
    el("h4", {}, ["Support the project"]),
    el("p", { class: "footer-col-desc" }, ["If Convertly saves you time, reach out and say so, that's what keeps it going."]),
    el("div", { class: "footer-repo-btns" }, [footerRepoLink(SUPPORT_URL, "heart", "Support on X", true)]),
    el("h4", { class: "footer-col-subhead" }, ["Developer"]),
    el("nav", { class: "footer-socials", "aria-label": "Ememzyvisuals on the web" }, [
      socialLink("https://ememzyvisuals.vercel.app", portfolioGlyphSVG(), "Portfolio"),
      socialLink("https://x.com/Ememzyvisuals", xLogoSVG(), "X"),
      socialLink("https://github.com/Ememzyvisuals", githubLogoSVG(), "GitHub"),
      socialLink("https://www.tiktok.com/@Ememzyvisuals", tiktokLogoSVG(), "TikTok"),
    ]),
  ]);

  return el("footer", { class: "site-footer" }, [
    el("div", { class: "shell footer-columns" }, [aboutCol, productCol, openSourceCol, supportCol]),
    el("div", { class: "shell footer-bottom-bar" }, [
      el("span", {}, [`(c) ${YEAR} Convertly. Built by Ememzyvisuals.`]),
      el("a", { href: `${REPO_URL}/blob/main/LICENSE`, target: "_blank", rel: "noopener noreferrer" }, ["MIT License"]),
    ]),
  ]);
}

// ---------------- App shell with a landing view and a separate workspace view ----------------

const app = document.getElementById("app")!;

const landingHost = el("div", { class: "view view-landing" });
const workspaceHost = el("div", { class: "view view-workspace" });
const studioHomeHost = el("div", { class: "view view-studio-home" });
const studioNewDesignHost = el("div", { class: "view view-studio-new-design" });
const studioEditorHost = el("div", { class: "view view-studio-editor" });
const studioVideoHost = el("div", { class: "view view-studio-video" });
const studioAudioHost = el("div", { class: "view view-studio-audio" });

const HASH_BY_VIEW: Record<View, string> = {
  landing: "",
  workspace: "#/app",
  "studio-home": "#/studio",
  "studio-new-design": "#/studio/new",
  "studio-editor": "#/studio/edit",
  "studio-video": "#/studio/video",
  "studio-audio": "#/studio/audio",
};

function showOnly(view: View) {
  landingHost.style.display = view === "landing" ? "" : "none";
  workspaceHost.style.display = view === "workspace" ? "block" : "none";
  studioHomeHost.style.display = view === "studio-home" ? "block" : "none";
  studioNewDesignHost.style.display = view === "studio-new-design" ? "block" : "none";
  studioEditorHost.style.display = view === "studio-editor" ? "block" : "none";
  studioVideoHost.style.display = view === "studio-video" ? "block" : "none";
  studioAudioHost.style.display = view === "studio-audio" ? "block" : "none";
  // The Studio editor is a full-screen, immersive app (like Photoroom/Canva/CapCut), not a
  // page section, so the site's own header and footer have no business showing up around
  // or below it while it's open. The "Create a design" format picker gets the same immersive
  // treatment, since it is the first step of that same full-screen workflow, not a page section.
  const isEditor =
    view === "studio-editor" || view === "studio-video" || view === "studio-audio" || view === "studio-new-design";
  header.root.style.display = isEditor ? "none" : "";
  footer.style.display = isEditor ? "none" : "";
  document.body.style.overflow = isEditor ? "hidden" : "";
  header.setView(view);
  window.scrollTo(0, 0);
}

function goTo(view: View) {
  if (view === "studio-new-design") {
    openDesignFormatPicker();
    return;
  }
  if (view === "studio-editor") {
    openStudioEditor();
    return;
  }
  if (view === "studio-video") {
    openStudioVideoEditor();
    return;
  }
  if (view === "studio-audio") {
    openStudioAudioEditor();
    return;
  }
  showOnly(view);
  window.location.hash = HASH_BY_VIEW[view];
}

/** The "Create a design" step: a real format-selection screen before the editor opens, rather
 * than dropping straight into one fixed blank canvas (see designFormatPicker.ts). */
function openDesignFormatPicker() {
  showOnly("studio-new-design");
  window.location.hash = HASH_BY_VIEW["studio-new-design"];
  clear(studioNewDesignHost);
  studioNewDesignHost.appendChild(
    buildDesignFormatPicker({
      onChoose: async (fmt) => {
        if (fmt.presetId && fmt.presetId.startsWith("logo-")) {
          const { buildLogoStarterElements } = await import("./tools/studioTool");
          openStudioEditor(buildLogoStarterElements(fmt.width, fmt.height), fmt.presetId);
        } else if (fmt.presetId) {
          openStudioEditor(undefined, fmt.presetId);
        } else {
          openStudioEditor(undefined, undefined, fmt.width, fmt.height);
        }
      },
      onClose: () => goTo("studio-home"),
    })
  );
}

/** Opens the Studio editor, optionally pre-loaded from a template, or from a chosen preset id,
 * or from a genuine custom pixel size, as its own on-demand chunk. */
async function openStudioEditor(
  initialElements?: import("./tools/studioTool").StudioElement[],
  presetId?: string,
  width?: number,
  height?: number
) {
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
      initialWidth: width,
      initialHeight: height,
      onBack: () => goTo("studio-home"),
    })
  );
}

/** Opens the Studio's Video editing surface as its own on-demand chunk. */
async function openStudioVideoEditor() {
  showOnly("studio-video");
  window.location.hash = HASH_BY_VIEW["studio-video"];
  clear(studioVideoHost);
  studioVideoHost.appendChild(
    el("div", { class: "control-hint", style: "padding:60px 20px; text-align:center" }, ["Loading the video editor..."])
  );
  const { buildStudioVideoTool } = await import("./tools/studioVideoTool");
  clear(studioVideoHost);
  studioVideoHost.appendChild(buildStudioVideoTool({ onBack: () => goTo("studio-home") }));
}

/** Opens the Studio's Audio editing surface as its own on-demand chunk. */
async function openStudioAudioEditor() {
  showOnly("studio-audio");
  window.location.hash = HASH_BY_VIEW["studio-audio"];
  clear(studioAudioHost);
  studioAudioHost.appendChild(
    el("div", { class: "control-hint", style: "padding:60px 20px; text-align:center" }, ["Loading the audio editor..."])
  );
  const { buildStudioAudioTool } = await import("./tools/studioAudioTool");
  clear(studioAudioHost);
  studioAudioHost.appendChild(buildStudioAudioTool({ onBack: () => goTo("studio-home") }));
}

// ---------------- Guided tour: opens the Design/Video editors pre-loaded with a small bundled
// demo image/clip, so the tour has real content to point at without asking a first-time
// visitor to supply their own file first. Each "ensure" only opens its editor once even if
// several tour steps in a row live in the same view, so it never re-fetches or re-triggers a
// fresh upload mid-tour. ----------------

async function openStudioEditorForTour() {
  showOnly("studio-editor");
  window.location.hash = HASH_BY_VIEW["studio-editor"];
  clear(studioEditorHost);
  const { buildStudioTool } = await import("./tools/studioTool");
  clear(studioEditorHost);
  studioEditorHost.appendChild(
    buildStudioTool({ onBack: () => goTo("studio-home"), autoLoadImageUrl: "/demo/sample-image.png" })
  );
}

async function openStudioVideoEditorForTour() {
  showOnly("studio-video");
  window.location.hash = HASH_BY_VIEW["studio-video"];
  clear(studioVideoHost);
  const { buildStudioVideoTool } = await import("./tools/studioVideoTool");
  clear(studioVideoHost);
  studioVideoHost.appendChild(
    buildStudioVideoTool({ onBack: () => goTo("studio-home"), autoLoadVideoUrl: "/demo/sample-clip.mp4", seedDemoCaptions: true })
  );
}

async function startDemoTour() {
  const { startGuidedTour } = await import("./ui/guidedTour");
  let atStudioHome = false;
  let designOpened = false;
  let videoOpened = false;
  const ensureStudioHome = async () => {
    if (atStudioHome) return;
    atStudioHome = true;
    designOpened = false;
    videoOpened = false;
    showOnly("studio-home");
    window.location.hash = HASH_BY_VIEW["studio-home"];
  };
  const ensureDesign = async () => {
    if (designOpened) return;
    designOpened = true;
    atStudioHome = false;
    await openStudioEditorForTour();
  };
  const ensureVideo = async () => {
    if (videoOpened) return;
    videoOpened = true;
    atStudioHome = false;
    await openStudioVideoEditorForTour();
  };
  const click = (selector: string) => (document.querySelector(selector) as HTMLElement | null)?.click();

  startGuidedTour({
    onExit: () => goTo("studio-home"),
    steps: [
      {
        id: "welcome",
        title: "Welcome to Convertly Studio",
        body: "A real visual editor for design, video and audio, all live in your browser. This short tour shows you where everything is.",
        goTo: ensureStudioHome,
        selector: '[data-tour="studio-welcome"]',
        placement: "bottom",
      },
      {
        id: "open-tools",
        title: "Opening an editor",
        body: "Design, Video and Audio are the three editors inside Studio. Click one to jump straight in, or use Templates to start from a real layout.",
        goTo: ensureStudioHome,
        selector: '[data-tour="studio-open-tools"]',
        placement: "top",
      },
      {
        id: "import",
        title: "Import / Upload",
        body: "The Uploads button is where you bring in your own images. We've already dropped in a small demo image so you can see the rest of the tour in action.",
        goTo: ensureDesign,
        selector: '[data-tour="rail-uploads"]',
        placement: "right",
      },
      {
        id: "library",
        title: "Media / Project Library",
        body: "Once something is uploaded, it shows up here, ready to drag onto the canvas as many times as you like.",
        goTo: ensureDesign,
        selector: '[data-tour="uploads-panel"]',
        beforeWaitClick: '[data-tour="rail-uploads"]',
        placement: "right",
      },
      {
        id: "canvas",
        title: "Main Canvas / Preview",
        body: "This is your real, live workspace. Everything here (text, shapes, uploaded images) is drawn on a genuine canvas, not a preview screenshot.",
        goTo: ensureDesign,
        selector: '[data-tour="design-canvas"]',
        placement: "left",
      },
      {
        id: "layers",
        title: "Layers / Assets",
        body: "Every element on your canvas gets its own layer here. Click one to select it, drag to reorder, or lock/hide it.",
        goTo: ensureDesign,
        selector: '[data-tour="design-layers"]',
        placement: "left",
      },
      {
        id: "image-editing",
        title: "Image Editing",
        body: "Select an image and switch to the Design tab to remove its background or clean up its size and effects, all processed on your own device.",
        goTo: ensureDesign,
        selector: '[data-tour="design-properties"]',
        beforeWaitClick: '[data-tour="layer-row-main"]',
        reveal: () => click('[data-tour="design-tab-btn"]'),
        placement: "left",
      },
      {
        id: "vectorize",
        title: "Vectorize",
        body: "Turn any raster image into a clean, scalable vector with one click. Watch for the progress screen while it traces the shape.",
        goTo: ensureDesign,
        selector: '[data-tour="vectorize-btn"]',
        placement: "left",
      },
      {
        id: "video-timeline",
        title: "Timeline",
        body: "The Video editor's timeline: drag the two handles to trim, and every overlay you add gets its own track underneath, right where it plays.",
        goTo: ensureVideo,
        selector: '[data-tour="video-timeline"]',
        placement: "top",
      },
      {
        id: "video-editing",
        title: "Video Editing",
        body: "Trim, text, captions, image overlays, stickers, filters and audio, all along this one toolbar. Each opens its own set of controls without leaving the clip.",
        goTo: ensureVideo,
        selector: '[data-tour="video-toolbar"]',
        placement: "top",
      },
      {
        id: "captions",
        title: "Captions",
        body: "This is where your subtitles live: auto-generate them, pick a style, or fix up the transcript by hand.",
        goTo: ensureVideo,
        selector: '[data-tour="comp-toolbar-captions"]',
        beforeWaitClick: '[data-tour="comp-toolbar-captions"]',
        placement: "top",
      },
      {
        id: "auto-caption",
        title: "Auto Caption",
        body: "One click transcribes your clip's own audio, right in the browser, into short, natural caption phrases with real timing. We've seeded a couple here so you can see the result.",
        goTo: ensureVideo,
        selector: '.studio-caption-subtab-btn',
        placement: "bottom",
      },
      {
        id: "caption-library",
        title: "Caption Library",
        body: "Pick a caption look from the library, each with its own animation, then apply it to one caption or every caption at once.",
        goTo: ensureVideo,
        selector: '.studio-caption-template-grid',
        beforeWaitClick: '.studio-caption-subtab-btn:nth-child(3)',
        placement: "right",
      },
      {
        id: "transcript",
        title: "Transcript",
        body: "Every caption, in order, as plain editable text. Fix a mistake here and it updates the caption on your clip automatically.",
        goTo: ensureVideo,
        selector: '.studio-transcript-list',
        beforeWaitClick: '.studio-caption-subtab-btn:nth-child(4)',
        placement: "right",
      },
      {
        id: "inspector",
        title: "Inspector / Properties",
        body: "With anything selected, its font, color, size, timing and animation all live in this panel.",
        goTo: ensureVideo,
        selector: '.studio-video-overlay-props',
        beforeWaitClick: ['.studio-caption-subtab-btn:nth-child(2)', '.studio-video-overlay-item'],
        placement: "left",
      },
      {
        id: "positioning",
        title: "Positioning",
        body: "Drag any caption or overlay directly on the video to reposition it, or use its own handles on the timeline to change when it starts and how long it lasts.",
        goTo: ensureVideo,
        selector: '.studio-video-overlay-box.selected',
        reveal: () => {
          const v = document.querySelector(".studio-video-el") as HTMLVideoElement | null;
          if (v) {
            v.currentTime = 0.5;
            v.dispatchEvent(new Event("timeupdate"));
          }
        },
        placement: "bottom",
      },
      {
        id: "export",
        title: "Export / Share",
        body: "When you're happy with it, export renders your real file, trims, overlays, captions and all, right here in the browser.",
        goTo: ensureVideo,
        selector: '[data-tour="video-export"]',
        placement: "bottom",
      },
      {
        id: "finish",
        title: "You're ready",
        body: "That's the whole Studio. Explore freely, everything you just saw is the real interface, not a demo copy.",
        goTo: ensureStudioHome,
      },
    ],
  });
}

const header = buildHeader(goTo);
const hero = buildHero(() => goTo("workspace"), () => void startDemoTour());
const trust = buildTrustSection();
const workspace = buildWorkspace();
const studioHome = buildStudioHome({
  onStartFromScratch: () => goTo("studio-new-design"),
  onOpenTemplate: (elements, presetId) => openStudioEditor(elements, presetId),
  onOpenVideoEditor: () => openStudioVideoEditor(),
  onOpenAudioEditor: () => openStudioAudioEditor(),
  onStartTour: () => void startDemoTour(),
});
const footer = buildFooter(goTo);

landingHost.append(hero, trust);
workspaceHost.append(workspace);
studioHomeHost.append(studioHome);

app.append(
  header.root,
  landingHost,
  workspaceHost,
  studioHomeHost,
  studioNewDesignHost,
  studioEditorHost,
  studioVideoHost,
  studioAudioHost,
  footer
);

const hash = window.location.hash;
if (hash.startsWith("#/studio/audio")) {
  openStudioAudioEditor();
} else if (hash.startsWith("#/studio/video")) {
  openStudioVideoEditor();
} else if (hash.startsWith("#/studio/new")) {
  openDesignFormatPicker();
} else if (hash.startsWith("#/studio/edit")) {
  openStudioEditor();
} else if (hash.startsWith("#/studio")) {
  goTo("studio-home");
} else if (hash.startsWith("#/app")) {
  goTo("workspace");
} else {
  goTo("landing");
}
