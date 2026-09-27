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
import { xLogoSVG, tiktokLogoSVG, githubLogoSVG, portfolioGlyphSVG } from "./ui/socialIcons";
import { createThemeToggle } from "./ui/themeToggle";
import { createLangToggle } from "./ui/langToggle";
import { buildToolsHub, type HubCategory } from "./pages/toolsHub";
import { buildToolPage } from "./pages/toolPage";
import type { ToolIconName } from "./ui/toolIcons";
import { t } from "./i18n";

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

  const brand = el("button", { type: "button", class: "brand", "aria-label": t("brand.ariaLabel") }, [
    mark,
    el("span", { class: "brand-word" }, ["Convertly"]),
  ]);
  brand.addEventListener("click", () => onNavigate("landing"));

  // Desktop: a pill track with a sliding highlight.
  const homeLink = el("button", { type: "button", class: "header-nav-btn" }, [t("nav.home")]);
  const toolsLink = el("button", { type: "button", class: "header-nav-btn" }, [t("nav.tools")]);
  const navIndicator = el("div", { class: "header-nav-indicator", "aria-hidden": "true" });
  const navTrack = el("nav", { class: "header-links", "aria-label": t("nav.mainLabel") }, [homeLink, toolsLink, navIndicator]);

  // Mobile: a hamburger button that opens a slide-in drawer, the standard mobile pattern,
  // rather than squeezing the desktop pill nav into a second wrapped row.
  const hamburgerBtn = el("button", {
    type: "button",
    class: "mobile-nav-toggle",
    "aria-label": t("nav.openMenu"),
    "aria-expanded": "false",
  });
  hamburgerBtn.innerHTML = hamburgerIconSVG();

  const drawerMark = el("span", { class: "brand-mark brand-badge" });
  drawerMark.innerHTML = brandMarkSVG();
  const closeBtn = el("button", { type: "button", class: "mobile-nav-close", "aria-label": t("nav.closeMenu") });
  closeBtn.innerHTML = closeIconSVG();

  const mobileHomeLink = el("button", { type: "button", class: "mobile-nav-link" }, [t("nav.home")]);
  const mobileToolsLink = el("button", { type: "button", class: "mobile-nav-link" }, [t("nav.tools")]);

  const drawer = el("aside", { class: "mobile-nav-drawer", role: "dialog", "aria-label": t("nav.menuLabel"), "aria-modal": "true" }, [
    el("div", { class: "mobile-nav-drawer-head" }, [
      el("div", { class: "brand", style: "cursor:default" }, [
        drawerMark,
        el("span", { class: "brand-word" }, ["Convertly"]),
      ]),
      closeBtn,
    ]),
    el("nav", { class: "mobile-nav-links", "aria-label": t("nav.mainLabel") }, [mobileHomeLink, mobileToolsLink]),
    el("div", { class: "mobile-nav-drawer-foot" }, [
      el("div", { class: "mobile-nav-drawer-foot-row" }, [el("span", {}, [t("nav.appearance")]), createThemeToggle()]),
      el("div", { class: "mobile-nav-drawer-foot-row" }, [el("span", {}, [t("nav.language")]), createLangToggle()]),
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
      el("div", { class: "header-right" }, [navTrack, createLangToggle(), createThemeToggle()]),
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

function heroFact(icon: "no-account" | "runs-locally" | "real-engines", titleKey: string, bodyKey: string): HTMLElement {
  const iconBubble = el("span", { class: "hero-fact-icon" });
  iconBubble.innerHTML = heroFactIconSVG(icon);
  return el("div", { class: "hero-fact" }, [
    iconBubble,
    el("div", {}, [el("strong", {}, [t(titleKey)]), el("span", {}, [t(bodyKey)])]),
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

  const getStartedBtn = el("button", { type: "button", class: "run-btn hero-cta" }, [t("hero.getStarted")]);
  getStartedBtn.addEventListener("click", onGetStarted);

  return el("section", { class: "hero" }, [
    el("div", { class: "shell hero-inner" }, [
      el("div", { class: "hero-copy" }, [
        el("h1", {}, [t("hero.title")]),
        el("p", { class: "lede" }, [t("hero.lede")]),
        el("div", { class: "hero-cta-row" }, [getStartedBtn]),
        el("div", { class: "hero-facts" }, [
          heroFact("no-account", "hero.fact.noAccount.title", "hero.fact.noAccount.body"),
          heroFact("runs-locally", "hero.fact.runsLocally.title", "hero.fact.runsLocally.body"),
          heroFact("real-engines", "hero.fact.realEngines.title", "hero.fact.realEngines.body"),
        ]),
      ]),
      visual,
    ]),
  ]);
}

function buildTrustSection(): HTMLElement {
  const cards = [
    { titleKey: "trust.card1.title", bodyKey: "trust.card1.body" },
    { titleKey: "trust.card2.title", bodyKey: "trust.card2.body" },
    { titleKey: "trust.card3.title", bodyKey: "trust.card3.body" },
  ];

  const cardEls = cards.map((c) =>
    el("div", { class: "trust-card" }, [el("h3", {}, [t(c.titleKey)]), el("p", {}, [t(c.bodyKey)])])
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
      el("span", {}, [el("strong", { class: "footer-brand-word" }, ["Convertly"]), t("footer.builtBy")]),
    ]),
    el("p", { class: "footer-about-text" }, [t("footer.about")]),
    el("div", { class: "footer-badges" }, [
      el("span", { class: "footer-badge" }, [t("footer.badge.openSource")]),
      el("span", { class: "footer-badge" }, [t("footer.badge.mit")]),
      el("span", { class: "footer-badge" }, [t("footer.badge.noAccount")]),
    ]),
  ]);

  const productCol = footerLinkList(t("footer.product.title"), [
    { label: t("footer.product.convert"), onClick: () => onGoToTool("convert") },
    { label: t("footer.product.vectorize"), onClick: () => onGoToTool("vectorize") },
    { label: t("footer.product.compress"), onClick: () => onGoToTool("compress-image") },
    { label: t("footer.product.pdfAudioArchive"), onClick: () => onGoToTool("images-to-pdf") },
  ] as { label: string; onClick: () => void }[]);

  const openSourceCol = el("div", { class: "footer-col" }, [
    el("h4", {}, [t("footer.openSource.title")]),
    el("p", { class: "footer-col-desc" }, [t("footer.openSource.desc")]),
    el("div", { class: "footer-repo-btns" }, [
      footerRepoLink(REPO_URL, "star", t("footer.starRepo"), true),
      footerRepoLink(REPO_URL, "fork", t("footer.forkIt")),
      footerRepoLink(`${REPO_URL}/issues`, "issue", t("footer.reportIssue")),
    ]),
  ]);

  const supportCol = el("div", { class: "footer-col" }, [
    el("h4", {}, [t("footer.support.title")]),
    el("p", { class: "footer-col-desc" }, [t("footer.support.desc")]),
    el("div", { class: "footer-repo-btns" }, [footerRepoLink(SUPPORT_URL, "heart", t("footer.supportOnX"), true)]),
    el("h4", { class: "footer-col-subhead" }, [t("footer.developer")]),
    el("nav", { class: "footer-socials", "aria-label": t("footer.developerSocialsLabel") }, [
      socialLink("https://ememzyvisuals.vercel.app", portfolioGlyphSVG(), "Portfolio"),
      socialLink("https://x.com/Ememzyvisuals", xLogoSVG(), "X"),
      socialLink("https://github.com/Ememzyvisuals", githubLogoSVG(), "GitHub"),
      socialLink("https://www.tiktok.com/@Ememzyvisuals", tiktokLogoSVG(), "TikTok"),
    ]),
  ]);

  return el("footer", { class: "site-footer" }, [
    el("div", { class: "shell footer-columns" }, [aboutCol, productCol, openSourceCol, supportCol]),
    el("div", { class: "shell footer-bottom-bar" }, [
      el("span", {}, [t("footer.bottomBar", { year: YEAR })]),
      el("a", { href: `${REPO_URL}/blob/main/LICENSE`, target: "_blank", rel: "noopener noreferrer" }, [t("footer.license")]),
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
  // A dynamic import, not a direct function reference: each tool's code (and its heavy
  // transitive deps, like pdf-lib, JSZip, the FFmpeg wrapper, or the vectorizer/background
  // removal libs) is only fetched and parsed once that tool's page is actually opened, instead
  // of every tool being bundled into the one script the landing page has to load first.
  build: () => Promise<HTMLElement>;
}

const TOOL_PAGES: Record<string, ToolPageDef> = {
  convert: {
    title: t("page.convert.title"),
    description: t("page.convert.desc"),
    icon: "convert",
    build: () => import("./tools/convertTool").then((m) => m.buildConvertFormatTool()),
  },
  "remove-bg": {
    title: t("page.remove-bg.title"),
    description: t("page.remove-bg.desc"),
    icon: "remove-bg",
    build: () => import("./tools/convertTool").then((m) => m.buildRemoveBgTool()),
  },
  vectorize: {
    title: t("page.vectorize.title"),
    description: t("page.vectorize.desc"),
    icon: "vectorize",
    build: () => import("./tools/vectorizeTool").then((m) => m.buildVectorizeTool()),
  },
  "compress-image": {
    title: t("page.compress-image.title"),
    description: t("page.compress-image.desc"),
    icon: "compress-image",
    build: () => import("./tools/compressTool").then((m) => m.buildCompressImageTool()),
  },
  "compress-video": {
    title: t("page.compress-video.title"),
    description: t("page.compress-video.desc"),
    icon: "compress-video",
    build: () => import("./tools/compressTool").then((m) => m.buildCompressVideoTool()),
  },
  trim: {
    title: t("page.trim.title"),
    description: t("page.trim.desc"),
    icon: "trim",
    build: () => import("./tools/videoExtraTool").then((m) => m.buildTrimVideoTool()),
  },
  gif: {
    title: t("page.gif.title"),
    description: t("page.gif.desc"),
    icon: "gif",
    build: () => import("./tools/videoExtraTool").then((m) => m.buildVideoToGifTool()),
  },
  "extract-audio": {
    title: t("page.extract-audio.title"),
    description: t("page.extract-audio.desc"),
    icon: "extract-audio",
    build: () => import("./tools/videoExtraTool").then((m) => m.buildExtractAudioTool()),
  },
  "replace-audio": {
    title: t("page.replace-audio.title"),
    description: t("page.replace-audio.desc"),
    icon: "replace-audio",
    build: () => import("./tools/videoExtraTool").then((m) => m.buildReplaceAudioTool()),
  },
  "images-to-pdf": {
    title: t("page.images-to-pdf.title"),
    description: t("page.images-to-pdf.desc"),
    icon: "images-to-pdf",
    build: () => import("./tools/pdfTool").then((m) => m.buildImagesToPdf()),
  },
  "pdf-to-images": {
    title: t("page.pdf-to-images.title"),
    description: t("page.pdf-to-images.desc"),
    icon: "pdf-to-images",
    build: () => import("./tools/pdfTool").then((m) => m.buildPdfToImages()),
  },
  "merge-pdf": {
    title: t("page.merge-pdf.title"),
    description: t("page.merge-pdf.desc"),
    icon: "merge-pdf",
    build: () => import("./tools/pdfTool").then((m) => m.buildMergePdfs()),
  },
  "split-pdf": {
    title: t("page.split-pdf.title"),
    description: t("page.split-pdf.desc"),
    icon: "split-pdf",
    build: () => import("./tools/pdfTool").then((m) => m.buildSplitPdf()),
  },
  audio: {
    title: t("page.audio.title"),
    description: t("page.audio.desc"),
    icon: "audio",
    build: () => import("./tools/audioTool").then((m) => m.buildAudioTool()),
  },
  "zip-create": {
    title: t("page.zip-create.title"),
    description: t("page.zip-create.desc"),
    icon: "zip-create",
    build: () => import("./tools/archiveTool").then((m) => m.buildCreateZip()),
  },
  "zip-extract": {
    title: t("page.zip-extract.title"),
    description: t("page.zip-extract.desc"),
    icon: "zip-extract",
    build: () => import("./tools/archiveTool").then((m) => m.buildExtractZip()),
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

// A small spinner shown in the tool-page body the instant its page opens, while its dynamic
// import (and any heavy library it pulls in, such as pdf-lib or the FFmpeg wrapper) downloads
// and parses. Same idea as upload.ts's renderReading: a visible response beats a blank card.
function buildToolLoadingBody(): HTMLElement {
  return el("div", { class: "tool-loading" }, [
    el("span", { class: "tool-loading-spinner", "aria-hidden": "true" }),
    el("span", {}, [t("toolPage.loading")]),
  ]);
}

type ToolPageEntry = { handle: ReturnType<typeof buildToolPage>; loaded: boolean };
const toolPageCache: Partial<Record<string, ToolPageEntry>> = {};

function renderToolPage(id: string): boolean {
  const def = TOOL_PAGES[id];
  if (!def) return false;
  clear(toolPageHost);
  let entry = toolPageCache[id];
  if (!entry) {
    const handle = buildToolPage({
      title: def.title,
      description: def.description,
      onBack: () => goTo("tools-hub"),
      body: buildToolLoadingBody(),
    });
    entry = { handle, loaded: false };
    toolPageCache[id] = entry;
    def.build().then((body) => {
      entry!.loaded = true;
      entry!.handle.setBody(body);
    });
  }
  toolPageHost.appendChild(entry.handle.root);
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
    title: t("category.imagesVideo"),
    tools: [
      { id: "convert", label: t("card.convert.label"), desc: t("card.convert.desc"), icon: "convert", onClick: () => goToTool("convert") },
      { id: "remove-bg", label: t("card.remove-bg.label"), desc: t("card.remove-bg.desc"), icon: "remove-bg", onClick: () => goToTool("remove-bg") },
      { id: "vectorize", label: t("card.vectorize.label"), desc: t("card.vectorize.desc"), icon: "vectorize", onClick: () => goToTool("vectorize") },
      { id: "compress-image", label: t("card.compress-image.label"), desc: t("card.compress-image.desc"), icon: "compress-image", onClick: () => goToTool("compress-image") },
      { id: "compress-video", label: t("card.compress-video.label"), desc: t("card.compress-video.desc"), icon: "compress-video", onClick: () => goToTool("compress-video") },
      { id: "trim", label: t("card.trim.label"), desc: t("card.trim.desc"), icon: "trim", onClick: () => goToTool("trim") },
      { id: "gif", label: t("card.gif.label"), desc: t("card.gif.desc"), icon: "gif", onClick: () => goToTool("gif") },
      { id: "extract-audio", label: t("card.extract-audio.label"), desc: t("card.extract-audio.desc"), icon: "extract-audio", onClick: () => goToTool("extract-audio") },
      { id: "replace-audio", label: t("card.replace-audio.label"), desc: t("card.replace-audio.desc"), icon: "replace-audio", onClick: () => goToTool("replace-audio") },
    ],
  },
  {
    title: t("category.pdf"),
    tools: [
      { id: "images-to-pdf", label: t("card.images-to-pdf.label"), desc: t("card.images-to-pdf.desc"), icon: "images-to-pdf", onClick: () => goToTool("images-to-pdf") },
      { id: "pdf-to-images", label: t("card.pdf-to-images.label"), desc: t("card.pdf-to-images.desc"), icon: "pdf-to-images", onClick: () => goToTool("pdf-to-images") },
      { id: "merge-pdf", label: t("card.merge-pdf.label"), desc: t("card.merge-pdf.desc"), icon: "merge-pdf", onClick: () => goToTool("merge-pdf") },
      { id: "split-pdf", label: t("card.split-pdf.label"), desc: t("card.split-pdf.desc"), icon: "split-pdf", onClick: () => goToTool("split-pdf") },
    ],
  },
  {
    title: t("category.audio"),
    tools: [
      { id: "audio", label: t("card.audio.label"), desc: t("card.audio.desc"), icon: "audio", onClick: () => goToTool("audio") },
    ],
  },
  {
    title: t("category.archives"),
    tools: [
      { id: "zip-create", label: t("card.zip-create.label"), desc: t("card.zip-create.desc"), icon: "zip-create", onClick: () => goToTool("zip-create") },
      { id: "zip-extract", label: t("card.zip-extract.label"), desc: t("card.zip-extract.desc"), icon: "zip-extract", onClick: () => goToTool("zip-extract") },
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
