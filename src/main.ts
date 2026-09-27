import "@fontsource/outfit/400.css";
import "@fontsource/outfit/500.css";
import "@fontsource/outfit/600.css";
import "@fontsource/outfit/700.css";
import "@fontsource/fredoka/400.css";
import "@fontsource/fredoka/500.css";
import "@fontsource/fredoka/600.css";
import "@fontsource/fredoka/700.css";
import "./style.css";
import { el, clear } from "./ui/dom";
import { buildConvertFormatTool, buildRemoveBgTool } from "./tools/convertTool";
import { buildVectorizeTool } from "./tools/vectorizeTool";
import { buildCompressImageTool, buildCompressVideoTool } from "./tools/compressTool";
import { buildImagesToPdf, buildPdfToImages, buildMergePdfs, buildSplitPdf } from "./tools/pdfTool";
import { buildCreateZip, buildExtractZip } from "./tools/archiveTool";
import { buildAudioTool } from "./tools/audioTool";
import { buildTrimVideoTool, buildVideoToGifTool, buildExtractAudioTool, buildReplaceAudioTool } from "./tools/videoExtraTool";
import { xLogoSVG, tiktokLogoSVG, githubLogoSVG, portfolioGlyphSVG } from "./ui/socialIcons";
import { createThemeToggle } from "./ui/themeToggle";
import { buildToolsHub, type HubCategory } from "./pages/toolsHub";
import { buildToolPage } from "./pages/toolPage";
import type { ToolIconName } from "./ui/toolIcons";

const YEAR = new Date().getFullYear();

type View = "landing" | "tools-hub" | "tool";

// A single bold glyph meant to sit inside a solid-colored badge (see .brand-badge), not a
// loose two-tone line icon floating next to the wordmark. Solid fill in currentColor so it
// reads clearly at small sizes against the accent background.
function brandMarkSVG(): string {
  return `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M4 9h11.2l-3-3 1.4-1.4L19 10l-5.4 5.4-1.4-1.4 3-3H4Z"/><path d="M20 15H8.8l3 3-1.4 1.4L4 14l5.4-5.4L10.8 10l-3 3H20Z"/></svg>`;
}

function hamburgerIconSVG(): string {
  return `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>`;
}

function closeIconSVG(): string {
  return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>`;
}

function buildHeader(onNavigate: (view: "landing" | "tools-hub") => void): { root: HTMLElement; setView: (view: View) => void } {
  const mark = el("span", { class: "brand-mark brand-badge" });
  mark.innerHTML = brandMarkSVG();

  const brand = el("button", { type: "button", class: "brand", "aria-label": "Convertly, go to home" }, [
    mark,
    el("span", { class: "brand-word" }, ["Convertly"]),
  ]);
  brand.addEventListener("click", () => onNavigate("landing"));

  // Desktop: a pill track with a sliding highlight.
  const homeLink = el("button", { type: "button", class: "header-nav-btn" }, ["Home"]);
  const toolsLink = el("button", { type: "button", class: "header-nav-btn" }, ["Open tools"]);
  const navIndicator = el("div", { class: "header-nav-indicator", "aria-hidden": "true" });
  const navTrack = el("nav", { class: "header-links", "aria-label": "Main" }, [homeLink, toolsLink, navIndicator]);

  // Mobile: a hamburger button that opens a slide-in drawer, the standard mobile pattern,
  // rather than squeezing the desktop pill nav into a second wrapped row.
  const hamburgerBtn = el("button", {
    type: "button",
    class: "mobile-nav-toggle",
    "aria-label": "Open menu",
    "aria-expanded": "false",
  });
  hamburgerBtn.innerHTML = hamburgerIconSVG();

  const drawerMark = el("span", { class: "brand-mark brand-badge" });
  drawerMark.innerHTML = brandMarkSVG();
  const closeBtn = el("button", { type: "button", class: "mobile-nav-close", "aria-label": "Close menu" });
  closeBtn.innerHTML = closeIconSVG();

  const mobileHomeLink = el("button", { type: "button", class: "mobile-nav-link" }, ["Home"]);
  const mobileToolsLink = el("button", { type: "button", class: "mobile-nav-link" }, ["Open tools"]);

  const drawer = el("aside", { class: "mobile-nav-drawer", role: "dialog", "aria-label": "Menu", "aria-modal": "true" }, [
    el("div", { class: "mobile-nav-drawer-head" }, [
      el("div", { class: "brand", style: "cursor:default" }, [
        drawerMark,
        el("span", { class: "brand-word" }, ["Convertly"]),
      ]),
      closeBtn,
    ]),
    el("nav", { class: "mobile-nav-links", "aria-label": "Main" }, [mobileHomeLink, mobileToolsLink]),
    el("div", { class: "mobile-nav-drawer-foot" }, [
      el("span", {}, ["Appearance"]),
      createThemeToggle(),
    ]),
  ]);

  const overlay = el("div", { class: "mobile-nav-overlay", "aria-hidden": "true" });

  let drawerOpen = false;
  function setDrawerOpen(next: boolean) {
    drawerOpen = next;
    overlay.classList.toggle("open", next);
    drawer.classList.toggle("open", next);
    hamburgerBtn.setAttribute("aria-expanded", String(next));
    document.body.style.overflow = next ? "hidden" : "";
  }

  hamburgerBtn.addEventListener("click", () => setDrawerOpen(!drawerOpen));
  overlay.addEventListener("click", () => setDrawerOpen(false));
  closeBtn.addEventListener("click", () => setDrawerOpen(false));
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && drawerOpen) setDrawerOpen(false);
  });

  homeLink.addEventListener("click", () => onNavigate("landing"));
  toolsLink.addEventListener("click", () => onNavigate("tools-hub"));
  mobileHomeLink.addEventListener("click", () => {
    setDrawerOpen(false);
    onNavigate("landing");
  });
  mobileToolsLink.addEventListener("click", () => {
    setDrawerOpen(false);
    onNavigate("tools-hub");
  });

  const root = el("header", { class: "site-header" }, [
    el("div", { class: "shell" }, [
      brand,
      el("div", { class: "header-right" }, [navTrack, createThemeToggle()]),
      hamburgerBtn,
    ]),
    overlay,
    drawer,
  ]);

  function moveIndicatorTo(btn: HTMLElement) {
    navIndicator.style.width = `${btn.offsetWidth}px`;
    navIndicator.style.transform = `translateX(${btn.offsetLeft}px)`;
  }

  function setView(view: View) {
    const homeActive = view === "landing";
    const toolsActive = view === "tools-hub" || view === "tool";
    homeLink.setAttribute("aria-current", homeActive ? "page" : "false");
    toolsLink.setAttribute("aria-current", toolsActive ? "page" : "false");
    mobileHomeLink.setAttribute("aria-current", homeActive ? "page" : "false");
    mobileToolsLink.setAttribute("aria-current", toolsActive ? "page" : "false");
    requestAnimationFrame(() => moveIndicatorTo(homeActive ? homeLink : toolsLink));
  }

  window.addEventListener("resize", () => {
    const active = homeLink.getAttribute("aria-current") === "page" ? homeLink : toolsLink;
    moveIndicatorTo(active);
    if (window.innerWidth > 760 && drawerOpen) setDrawerOpen(false);
  });

  return { root, setView };
}

function heroFactIconSVG(name: "no-account" | "runs-locally" | "real-engines"): string {
  const common = 'viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"';
  switch (name) {
    case "no-account":
      return `<svg ${common}><rect x="5" y="11" width="14" height="9" rx="2.4"/><path d="M8 11V7.5a4 4 0 0 1 7.5-2"/></svg>`;
    case "runs-locally":
      return `<svg ${common}><rect x="3" y="5" width="18" height="14" rx="2.2"/><path d="M3 9.5h18"/><circle cx="6.3" cy="7.2" r="0.6" fill="currentColor" stroke="none"/></svg>`;
    case "real-engines":
    default:
      return `<svg ${common}><circle cx="12" cy="12" r="3.2"/><path d="M12 3.5v2.6M12 17.9v2.6M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M3.5 12h2.6M17.9 12h2.6M4.6 19.4l1.8-1.8M17.6 6.4l1.8-1.8"/></svg>`;
  }
}

function heroFact(icon: "no-account" | "runs-locally" | "real-engines", title: string, body: string): HTMLElement {
  const iconBubble = el("span", { class: "hero-fact-icon" });
  iconBubble.innerHTML = heroFactIconSVG(icon);
  return el("div", { class: "hero-fact" }, [
    iconBubble,
    el("div", {}, [el("strong", {}, [title]), el("span", {}, [body])]),
  ]);
}

function buildHero(onGetStarted: () => void): HTMLElement {
  const bgWord = el("div", { class: "hero-bg-word", "aria-hidden": "true" }, ["LIGHTER"]);

  const character = el("div", { class: "hero-character", "aria-hidden": "true" });
  character.innerHTML = `
    <picture>
      <source srcset="/brand/mascot-hero.webp" type="image/webp" />
      <img src="/brand/mascot-hero.png" alt="" width="380" height="570" />
    </picture>`;

  const visual = el("div", { class: "hero-visual-wrap" }, [bgWord, character]);

  const getStartedBtn = el("button", { type: "button", class: "run-btn hero-cta" }, ["Get started"]);
  getStartedBtn.addEventListener("click", onGetStarted);

  return el("section", { class: "hero" }, [
    el("div", { class: "shell hero-inner" }, [
      el("div", { class: "hero-copy" }, [
        el("h1", {}, ["Make your files lighter, cleaner, ready."]),
        el("p", { class: "lede" }, [
          "Convert image formats, turn raster art into clean SVG, compress images and video, and zip any file type down to a smaller archive. Processed on your device, not uploaded to a server.",
        ]),
        el("div", { class: "hero-cta-row" }, [getStartedBtn]),
        el("div", { class: "hero-facts" }, [
          heroFact("no-account", "No account", "Nothing to sign up for, nothing to pay for."),
          heroFact("runs-locally", "Runs locally", "Files are processed in your browser and never leave your device."),
          heroFact("real-engines", "Real engines", "FFmpeg, canvas codecs, and a real tracing engine. No faked results."),
        ]),
      ]),
      visual,
    ]),
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

function buildFooter(onGoToTool: (id: string) => void): HTMLElement {
  const brandMark = el("span", { class: "footer-brand-mark brand-badge" });
  brandMark.innerHTML = brandMarkSVG();

  const aboutCol = el("div", { class: "footer-col footer-col-about" }, [
    el("div", { class: "footer-credit" }, [
      brandMark,
      el("span", {}, [el("strong", { class: "footer-brand-word" }, ["Convertly"]), ", built by Ememzyvisuals"]),
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
    { label: "Convert image formats", onClick: () => onGoToTool("convert") },
    { label: "Vectorize (raster to SVG)", onClick: () => onGoToTool("vectorize") },
    { label: "Compress images and video", onClick: () => onGoToTool("compress-image") },
    { label: "PDF, audio and archive tools", onClick: () => onGoToTool("images-to-pdf") },
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

// ---------------- App shell: a landing view, a tools hub, and one generic tool-page view
// that renders whichever module a hub card (or a #/tools/<id> hash) points at. Every module
// gets its own dedicated page through this single host, so adding a tool is a registry entry,
// not a new View value, a new host div, and a new hash route. ----------------

interface ToolPageDef {
  title: string;
  description: string;
  icon: ToolIconName;
  build: () => HTMLElement;
}

const TOOL_PAGES: Record<string, ToolPageDef> = {
  convert: {
    title: "Convert",
    description: "Change an image's format: PNG, JPEG, WebP, or AVIF. Runs entirely in this tab.",
    icon: "convert",
    build: buildConvertFormatTool,
  },
  "remove-bg": {
    title: "Remove background",
    description: "Cut the background out of any image with a real segmentation model, right in this tab.",
    icon: "remove-bg",
    build: buildRemoveBgTool,
  },
  vectorize: {
    title: "Vectorize",
    description: "Turn a raster image into a clean, scalable SVG using a real tracing engine.",
    icon: "vectorize",
    build: buildVectorizeTool,
  },
  "compress-image": {
    title: "Compress image",
    description: "Shrink a PNG or JPEG's file size with a real re-encode, not a fake progress bar.",
    icon: "compress-image",
    build: buildCompressImageTool,
  },
  "compress-video": {
    title: "Compress video",
    description: "A real FFmpeg re-encode, entirely in this tab, for a genuinely smaller file.",
    icon: "compress-video",
    build: buildCompressVideoTool,
  },
  trim: {
    title: "Trim video",
    description: "Cut a clip down to an exact start and end time.",
    icon: "trim",
    build: buildTrimVideoTool,
  },
  gif: {
    title: "Video to GIF",
    description: "Palette-optimized GIF conversion, not the muddy default most converters produce.",
    icon: "gif",
    build: buildVideoToGifTool,
  },
  "extract-audio": {
    title: "Extract audio",
    description: "Pull a video's audio track out as its own MP3 file.",
    icon: "extract-audio",
    build: buildExtractAudioTool,
  },
  "replace-audio": {
    title: "Replace audio",
    description: "Swap a video's sound for another audio track.",
    icon: "replace-audio",
    build: buildReplaceAudioTool,
  },
  "images-to-pdf": {
    title: "Images to PDF",
    description: "Combine one or more images into a single PDF.",
    icon: "images-to-pdf",
    build: buildImagesToPdf,
  },
  "pdf-to-images": {
    title: "PDF to images",
    description: "Render every page of a PDF as a real PNG.",
    icon: "pdf-to-images",
    build: buildPdfToImages,
  },
  "merge-pdf": {
    title: "Merge PDFs",
    description: "Combine two or more PDFs into a single file, in the order you add them.",
    icon: "merge-pdf",
    build: buildMergePdfs,
  },
  "split-pdf": {
    title: "Split PDF",
    description: "Break a PDF apart into one file per page.",
    icon: "split-pdf",
    build: buildSplitPdf,
  },
  audio: {
    title: "Audio tools",
    description: "Convert format, adjust bitrate, trim, and normalize loudness.",
    icon: "audio",
    build: buildAudioTool,
  },
  "zip-create": {
    title: "Create a zip",
    description: "Compress any file type by bundling it into an archive. Works on anything.",
    icon: "zip-create",
    build: buildCreateZip,
  },
  "zip-extract": {
    title: "Extract a zip",
    description: "Pull the files back out of a zip archive.",
    icon: "zip-extract",
    build: buildExtractZip,
  },
};

const app = document.getElementById("app")!;

const landingHost = el("div", { class: "view view-landing" });
const toolsHubHost = el("div", { class: "view view-tools-hub" });
const toolPageHost = el("div", { class: "view view-tool-page" });

function showOnly(view: View) {
  landingHost.style.display = view === "landing" ? "" : "none";
  toolsHubHost.style.display = view === "tools-hub" ? "block" : "none";
  toolPageHost.style.display = view === "tool" ? "block" : "none";
  header.setView(view);
  window.scrollTo(0, 0);
}

function goTo(view: "landing" | "tools-hub") {
  showOnly(view);
  window.location.hash = view === "landing" ? "" : "#/tools";
}

const toolPageCache: Partial<Record<string, HTMLElement>> = {};

function renderToolPage(id: string): boolean {
  const def = TOOL_PAGES[id];
  if (!def) return false;
  clear(toolPageHost);
  if (!toolPageCache[id]) {
    toolPageCache[id] = buildToolPage({
      title: def.title,
      description: def.description,
      onBack: () => goTo("tools-hub"),
      body: def.build(),
    });
  }
  toolPageHost.appendChild(toolPageCache[id]!);
  return true;
}

function goToTool(id: string) {
  if (!renderToolPage(id)) {
    goTo("tools-hub");
    return;
  }
  showOnly("tool");
  window.location.hash = `#/tools/${id}`;
}

const header = buildHeader(goTo);
const hero = buildHero(() => goTo("tools-hub"));
const trust = buildTrustSection();
const footer = buildFooter(goToTool);

const hubCategories: HubCategory[] = [
  {
    title: "Images & video",
    tools: [
      { id: "convert", label: "Convert", desc: "Change image format: PNG, JPEG, WebP, AVIF.", icon: "convert", onClick: () => goToTool("convert") },
      { id: "remove-bg", label: "Remove background", desc: "Cut out the background of any image.", icon: "remove-bg", onClick: () => goToTool("remove-bg") },
      { id: "vectorize", label: "Vectorize", desc: "Turn a raster image into a clean SVG.", icon: "vectorize", onClick: () => goToTool("vectorize") },
      { id: "compress-image", label: "Compress image", desc: "Shrink a PNG or JPEG's file size.", icon: "compress-image", onClick: () => goToTool("compress-image") },
      { id: "compress-video", label: "Compress video", desc: "Real FFmpeg re-encode, smaller file.", icon: "compress-video", onClick: () => goToTool("compress-video") },
      { id: "trim", label: "Trim video", desc: "Cut a clip to an exact start and end.", icon: "trim", onClick: () => goToTool("trim") },
      { id: "gif", label: "Video to GIF", desc: "Palette-optimized, not the muddy default.", icon: "gif", onClick: () => goToTool("gif") },
      { id: "extract-audio", label: "Extract audio", desc: "Pull a video's audio track out as MP3.", icon: "extract-audio", onClick: () => goToTool("extract-audio") },
      { id: "replace-audio", label: "Replace audio", desc: "Swap a video's sound for another track.", icon: "replace-audio", onClick: () => goToTool("replace-audio") },
    ],
  },
  {
    title: "PDF",
    tools: [
      { id: "images-to-pdf", label: "Images to PDF", desc: "Combine images into one PDF.", icon: "images-to-pdf", onClick: () => goToTool("images-to-pdf") },
      { id: "pdf-to-images", label: "PDF to images", desc: "Render every page as a real PNG.", icon: "pdf-to-images", onClick: () => goToTool("pdf-to-images") },
      { id: "merge-pdf", label: "Merge PDFs", desc: "Combine two or more PDFs into one.", icon: "merge-pdf", onClick: () => goToTool("merge-pdf") },
      { id: "split-pdf", label: "Split PDF", desc: "Break a PDF into one file per page.", icon: "split-pdf", onClick: () => goToTool("split-pdf") },
    ],
  },
  {
    title: "Audio",
    tools: [
      { id: "audio", label: "Audio tools", desc: "Convert, trim, and normalize loudness.", icon: "audio", onClick: () => goToTool("audio") },
    ],
  },
  {
    title: "Archives",
    tools: [
      { id: "zip-create", label: "Create a zip", desc: "Compress any file type by bundling it into an archive.", icon: "zip-create", onClick: () => goToTool("zip-create") },
      { id: "zip-extract", label: "Extract a zip", desc: "Pull files back out of an archive.", icon: "zip-extract", onClick: () => goToTool("zip-extract") },
    ],
  },
];

const toolsHub = buildToolsHub(hubCategories);

landingHost.append(hero, trust);
toolsHubHost.append(toolsHub);

app.append(header.root, landingHost, toolsHubHost, toolPageHost, footer);

// Reads the current hash and shows the matching view. Used at startup and again on every
// hashchange, so the browser's back/forward buttons and hand-typed #/tools/<id> links work,
// not just the in-app card and nav clicks (which already call goTo/goToTool directly).
function applyHash() {
  const hash = window.location.hash;
  const toolMatch = /^#\/tools\/([\w-]+)/.exec(hash);
  if (toolMatch && renderToolPage(toolMatch[1])) {
    showOnly("tool");
  } else if (hash.startsWith("#/tools")) {
    showOnly("tools-hub");
  } else {
    showOnly("landing");
  }
}

window.addEventListener("hashchange", applyHash);
applyHash();
