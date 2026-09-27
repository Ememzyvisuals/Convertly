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
import { xLogoSVG, tiktokLogoSVG, githubLogoSVG, portfolioGlyphSVG } from "./ui/socialIcons";
import { createThemeToggle } from "./ui/themeToggle";
import { workspaceAvatarSVG } from "./ui/illustrations";

const YEAR = new Date().getFullYear();

type View = "landing" | "workspace";

function brandMarkSVG(): string {
  return `<svg viewBox="0 0 20 20" width="20" height="20"><path d="M4 15 4 6 11 6 15 10 15 15 Z" fill="none" stroke="#e86f00" stroke-width="1.4"/><path d="M4 15 10 15 15 8" fill="none" stroke="#ffb066" stroke-width="1.4"/></svg>`;
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

  const root = el("header", { class: "site-header" }, [
    el("div", { class: "shell" }, [
      brand,
      el("div", { class: "header-right" }, [
        el("nav", { class: "header-links" }, [homeLink, toolsLink]),
        createThemeToggle(),
      ]),
    ]),
  ]);

  function setView(view: View) {
    homeLink.setAttribute("aria-current", view === "landing" ? "page" : "false");
    toolsLink.setAttribute("aria-current", view === "workspace" ? "page" : "false");
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
        el("div", { class: "hero-cta-row" }, [getStartedBtn]),
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
      const placeholder = el("div", { class: "tool-panel", id: `panel-${tab.id}` }, [
        el("div", { class: "control-hint" }, ["Loading..."]),
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
      "A browser-based file toolkit. Nothing you work on is uploaded to a server, every conversion, trace, and compression runs on your own device.",
    ]),
    el("div", { class: "footer-badges" }, [
      el("span", { class: "footer-badge" }, ["Open source"]),
      el("span", { class: "footer-badge" }, ["MIT license"]),
      el("span", { class: "footer-badge" }, ["No account needed"]),
    ]),
  ]);

  const productCol = footerLinkList("What Convertly can do", [
    { label: "Convert image formats", onClick: () => onNavigate("workspace") },
    { label: "Vectorize (raster to SVG)", onClick: () => onNavigate("workspace") },
    { label: "Compress images and video", onClick: () => onNavigate("workspace") },
    { label: "PDF, audio and archive tools", onClick: () => onNavigate("workspace") },
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

const HASH_BY_VIEW: Record<View, string> = {
  landing: "",
  workspace: "#/app",
};

function showOnly(view: View) {
  landingHost.style.display = view === "landing" ? "" : "none";
  workspaceHost.style.display = view === "workspace" ? "block" : "none";
  header.setView(view);
  window.scrollTo(0, 0);
}

function goTo(view: View) {
  showOnly(view);
  window.location.hash = HASH_BY_VIEW[view];
}

const header = buildHeader(goTo);
const hero = buildHero(() => goTo("workspace"));
const trust = buildTrustSection();
const workspace = buildWorkspace();
const footer = buildFooter(goTo);

landingHost.append(hero, trust);
workspaceHost.append(workspace);

app.append(header.root, landingHost, workspaceHost, footer);

const hash = window.location.hash;
if (hash.startsWith("#/app")) {
  goTo("workspace");
} else {
  goTo("landing");
}
