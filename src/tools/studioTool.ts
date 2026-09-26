// The Studio: a real, direct-manipulation visual editor (Canva-style canvas), not a
// configure-and-run converter. Everything here is drag, click, resize and type, live on
// a canvas, powered by Konva (an actual 2D canvas scene graph library, not a facade over
// a still-form-based flow).
import Konva from "konva";
import { el, clear } from "../ui/dom";
import { triggerDownload } from "../lib/format";
import { searchStudioIcons } from "../lib/studioIcons";
import { createAutosaveScheduler, loadStudioAutosave, clearStudioAutosave, formatSavedAt } from "../lib/workSaver";
import { ANIM_OPTIONS, EXIT_OPTIONS, EMPHASIS_OPTIONS, computeAnimPose, sceneMaxEndMs, type AnimType, type ExitType, type EmphasisType, type ElementAnim } from "../lib/studioAnim";
import { STICKER_CATEGORIES, STICKER_CATEGORY_LABELS, stickersByCategory, stickerToPngDataUrl, type StickerCategory } from "../lib/stickerLibrary";
import { DESIGN_FORMATS, DESIGN_FORMAT_CATEGORIES, DESIGN_FORMAT_CATEGORY_LABELS } from "../lib/designFormats";
import { ASSET_PROVIDERS, type ExternalAsset } from "../lib/assetProviders";
import { getRecentAssets, recordRecentAsset, getFavoriteAssets, isFavoriteAsset, toggleFavoriteAsset } from "../lib/externalAssetLocal";

type ElementKind = "text" | "rect" | "circle" | "image";

export interface StudioElement {
  id: string;
  kind: ElementKind;
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  width: number;
  height: number;
  fill: string;
  opacity?: number;
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  align?: "left" | "center" | "right";
  textStroke?: string; // outline color, text elements only (the classic meme-caption look)
  textStrokeWidth?: number; // text elements only
  letterSpacing?: number; // text elements only, px
  lineHeight?: number; // text elements only, multiplier of font size, defaults to 1.2
  textShadow?: boolean; // text elements only
  textShadowColor?: string;
  textShadowBlur?: number;
  placeholderImage?: boolean; // marks an image element meant to be swapped, e.g. meme/GIF templates
  imageSrc?: string; // data URL, image elements only
  iconRawSvg?: string; // original stroke-based SVG source, icon elements only (enables recoloring)
  iconColor?: string; // current recolor applied to iconRawSvg, icon elements only
  iconRenderPx?: number; // pixel size the current imageSrc was rasterized at, icon elements only
  brightness?: number; // -1..1, photo image elements only
  contrast?: number; // -100..100, photo image elements only
  saturation?: number; // -2..2, photo image elements only
  anim?: ElementAnim; // entrance animation; the element's x/y/opacity/scale above are always its end pose
  name?: string; // custom layer name set from the Layers panel; falls back to a kind-based label
  locked?: boolean; // locked elements stay visible and selectable but cannot be dragged/transformed
  hidden?: boolean; // hidden elements are skipped on canvas/export but stay in the layer list
  stroke?: string; // border color, rect/circle only
  strokeWidth?: number; // border width, rect/circle only
  cornerRadius?: number; // rect only, defaults to 12
  /** Present only on images pulled in from an external asset provider (see assetProviders/),
   * so licensing/creator information travels with the element rather than being lost the
   * moment it lands on the canvas. */
  sourceAttribution?: {
    provider: string;
    title?: string;
    creator?: string;
    creatorUrl?: string;
    source?: string;
    license?: string;
    licenseVersion?: string;
    licenseUrl?: string;
    foreignLandingUrl?: string;
  };
}

interface StudioFont {
  id: string;
  label: string;
  family: string;
}

// Line icons for layer-row/property actions (lock, visibility), drawn in the same stroke-based
// style as the rest of Studio's UI chrome (see RAIL_ICONS below), never emoji glyphs: an emoji
// is a sticker, and a sticker is content the person places on their design, not a piece of the
// editor's own interface.
const LOCK_CLOSED_SVG = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="5" y="11" width="14" height="9" rx="1.5"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>`;
const LOCK_OPEN_SVG = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="5" y="11" width="14" height="9" rx="1.5"/><path d="M8 11V7a4 4 0 0 1 7.5-1.9"/></svg>`;
const EYE_OPEN_SVG = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`;
const EYE_OFF_SVG = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 3l18 18M10.6 10.6a3 3 0 0 0 4.24 4.24M9.4 5.3A10.4 10.4 0 0 1 12 5c6.5 0 10 7 10 7a15.6 15.6 0 0 1-3.4 4.3M6.5 6.9C4.1 8.6 2 12 2 12s3.5 7 10 7c1.2 0 2.3-.2 3.3-.6"/></svg>`;

const FONTS: StudioFont[] = [
  { id: "inter", label: "Inter", family: "Inter" },
  { id: "poppins", label: "Poppins", family: "Poppins" },
  { id: "playfair", label: "Playfair Display (serif)", family: "Playfair Display" },
  { id: "bebas", label: "Bebas Neue (display)", family: "Bebas Neue" },
  { id: "caveat", label: "Caveat (handwriting)", family: "Caveat" },
  { id: "anton", label: "Anton (bold display)", family: "Anton" },
];

// One explicit import() per font/weight so Vite can statically analyze and bundle each as
// its own chunk. A templated specifier (e.g. `@fontsource/${id}/${w}.css`) looks convenient
// but a bare package path built at runtime can't be resolved in a production build, only
// in dev, so it would silently break every deployed build.
const FONT_LOADERS: Record<string, () => Promise<unknown>> = {
  inter: () => Promise.all([import("@fontsource/inter/400.css"), import("@fontsource/inter/700.css")]),
  poppins: () => Promise.all([import("@fontsource/poppins/400.css"), import("@fontsource/poppins/700.css")]),
  playfair: () =>
    Promise.all([import("@fontsource/playfair-display/400.css"), import("@fontsource/playfair-display/700.css")]),
  bebas: () => import("@fontsource/bebas-neue/400.css"),
  caveat: () => Promise.all([import("@fontsource/caveat/400.css"), import("@fontsource/caveat/700.css")]),
  anton: () => import("@fontsource/anton/400.css"),
};

const fontLoadState = new Map<string, Promise<void>>();

async function ensureFontLoaded(fontId: string): Promise<void> {
  const font = FONTS.find((f) => f.id === fontId) ?? FONTS[0];
  const cached = fontLoadState.get(font.id);
  if (cached) return cached;
  const loader = FONT_LOADERS[font.id] ?? FONT_LOADERS.inter;
  const promise = loader().then(() => {
    // Force the browser to actually resolve the webfont before it's used on canvas text,
    // otherwise the first draw can silently fall back to a system font.
    return (document as any).fonts?.load(`16px "${font.family}"`).catch(() => {});
  });
  fontLoadState.set(font.id, promise);
  return promise;
}

// Templates, restored autosaves, and duplicated elements carry a font family string directly
// (not a font id), since that's what gets drawn on the Konva node. Loading by id is how the
// webfont CSS chunk actually gets fetched, so this bridges the two.
async function ensureFontLoadedByFamily(family: string | undefined): Promise<void> {
  if (!family) return;
  const font = FONTS.find((f) => f.family === family);
  if (font) await ensureFontLoaded(font.id);
}

async function ensureFontsLoadedForElements(list: StudioElement[]): Promise<void> {
  const families = new Set(list.filter((e) => e.kind === "text" && e.fontFamily).map((e) => e.fontFamily as string));
  await Promise.all([...families].map((f) => ensureFontLoadedByFamily(f).catch(() => {})));
}

interface CanvasPreset {
  id: string;
  label: string;
  width: number;
  height: number;
}
// These four ids are what Studio's templates were authored against (see studioTemplates.ts's
// presetId field), so they stay exactly as they are; the much larger real-world format catalog
// (YouTube Thumbnail, Instagram Story, Business Card, and so on) lives in designFormats.ts and
// is merged into the same dropdown below, so a template's own canvas size never breaks even as
// the format list grows.
const PRESETS: CanvasPreset[] = [
  { id: "square", label: "Square post (1080x1080)", width: 1080, height: 1080 },
  { id: "story", label: "Story (1080x1920)", width: 1080, height: 1920 },
  { id: "landscape", label: "Landscape (1920x1080)", width: 1920, height: 1080 },
  { id: "poster", label: "Poster (1500x2100)", width: 1500, height: 2100 },
];

const DESIGN_FORMAT_PRESETS: CanvasPreset[] = DESIGN_FORMATS.map((f) => ({
  id: f.id,
  label: `${f.name} (${f.width}x${f.height})`,
  width: f.width,
  height: f.height,
}));

function findPreset(id: string | undefined): CanvasPreset | undefined {
  if (!id) return undefined;
  return PRESETS.find((p) => p.id === id) ?? DESIGN_FORMAT_PRESETS.find((p) => p.id === id);
}

let idCounter = 0;
function newId(prefix: string): string {
  idCounter += 1;
  return `${prefix}${idCounter}`;
}

/** A starting layout for the logo-focused canvas sizes (see designFormats.ts's "logo" category):
 * a simple mark plus brand name, already using the Logo style text settings, so a logo design
 * opens with something to react to and adjust rather than a blank page. Wide/wordmark formats
 * get a side-by-side mark+name layout; square/icon formats get the mark stacked above the name
 * (or just the mark alone for the smallest icon-only size, where a name would be unreadable). */
export function buildLogoStarterElements(width: number, height: number): StudioElement[] {
  const isWide = width / height >= 1.8;
  const markOnly = Math.min(width, height) <= 512 && !isWide;
  const markSize = Math.round(Math.min(width, height) * (markOnly ? 0.5 : isWide ? 0.55 : 0.32));

  const mark: StudioElement = {
    id: "logostarter-mark",
    kind: "circle",
    // Konva.Circle treats x/y as the shape's own center, not a top-left corner (unlike rect and
    // text below), so these are plain center coordinates rather than offset by half the size.
    x: isWide ? Math.round(width * 0.18) : Math.round(width / 2),
    y: markOnly ? Math.round(height / 2) : isWide ? Math.round(height / 2) : Math.round(height * 0.34),
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    width: markSize,
    height: markSize,
    fill: "#e86f00",
  };
  if (markOnly) return [mark];

  const text: StudioElement = {
    id: "logostarter-text",
    kind: "text",
    x: isWide ? Math.round(width * 0.4) : Math.round(width * 0.12),
    y: isWide ? Math.round(height / 2 - markSize * 0.22) : Math.round(height * 0.62),
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    width: isWide ? Math.round(width * 0.5) : Math.round(width * 0.86),
    height: Math.round(markSize * 0.5),
    fill: "#1a1a1a",
    text: "Your Brand",
    fontFamily: "Poppins",
    // The stacked (non-wide) layout gives the name a much wider box relative to the mark than
    // the side-by-side layout does, so it needs its own, smaller multiplier of markSize to stay
    // on one line instead of wrapping and running past the bottom of the canvas.
    fontSize: Math.max(24, Math.round(markSize * (isWide ? 0.42 : 0.22))),
    bold: true,
    align: isWide ? "left" : "center",
    letterSpacing: 2,
    textShadow: false,
  };
  return [mark, text];
}

export interface BuildStudioToolOptions {
  /** Pre-populates the canvas, used when opening from a template. */
  initialElements?: StudioElement[];
  /** Canvas size preset id to start on (see PRESETS), defaults to the first preset. */
  initialPresetId?: string;
  /** Shown as a "Back to Studio" control; Studio's dashboard is a separate page, not a tab. */
  onBack?: () => void;
  /** The design's name, editable in the topbar; defaults to "Untitled design". */
  initialTitle?: string;
  /** A genuine custom canvas size in real pixels (from the "Create a design" custom-size
   * form), taking priority over initialPresetId when both are somehow present. */
  initialWidth?: number;
  initialHeight?: number;
  /** Used only by the guided tour: fetches this URL and adds it to the canvas as a real image
   * element the moment the editor is ready, through the exact same addImage() path a real
   * upload takes, so the tour has real content to point at without asking a first-time visitor
   * to supply their own file. */
  autoLoadImageUrl?: string;
}

export function buildStudioTool(opts: BuildStudioToolOptions = {}): HTMLElement {
  const root = el("div", { class: "studio-panel", id: "panel-studio" });

  let preset: CanvasPreset =
    opts.initialWidth && opts.initialHeight
      ? { id: "custom", label: `Custom (${opts.initialWidth}x${opts.initialHeight})`, width: opts.initialWidth, height: opts.initialHeight }
      : findPreset(opts.initialPresetId) ?? PRESETS[0];
  let designTitle = opts.initialTitle && opts.initialTitle.trim() ? opts.initialTitle : "Untitled design";
  let elements: StudioElement[] = opts.initialElements ? opts.initialElements.map((e) => ({ ...e })) : [];
  let selectedId: string | null = null;
  // Extra elements included in the current selection via Shift+click, on top of selectedId
  // (the "primary" one). Empty for an ordinary single selection; group operations (align to
  // each other, distribute, move/duplicate/delete together) act on selectedId plus this set.
  let multiIds = new Set<string>();
  function allSelectedIds(): string[] {
    return selectedId ? [selectedId, ...multiIds] : [...multiIds];
  }
  let history: StudioElement[][] = [elements.map((e) => ({ ...e }))];
  let historyIndex = 0;

  const imageCache = new Map<string, HTMLImageElement>(); // element id -> loaded image

  function cloneElements(list: StudioElement[]): StudioElement[] {
    return list.map((e) => ({ ...e }));
  }

  function pushHistory() {
    history = history.slice(0, historyIndex + 1);
    history.push(cloneElements(elements));
    historyIndex = history.length - 1;
    updateHistoryButtons();
    autosave.schedule();
  }

  function undo() {
    if (historyIndex <= 0) return;
    historyIndex -= 1;
    elements = cloneElements(history[historyIndex]);
    render();
    updateHistoryButtons();
    autosave.schedule();
  }

  function redo() {
    if (historyIndex >= history.length - 1) return;
    historyIndex += 1;
    elements = cloneElements(history[historyIndex]);
    render();
    updateHistoryButtons();
    autosave.schedule();
  }

  const autosave = createAutosaveScheduler(() => ({
    presetId: preset.id,
    backgroundFill: (bg.fill() as string) || "#ffffff",
    elements: cloneElements(elements),
    title: designTitle,
    presetWidth: preset.width,
    presetHeight: preset.height,
  }));

  // ---------------- Header controls ----------------

  // The canvas-size dropdown merges the four quick presets templates are authored against with
  // the full real-world format catalog (grouped by category), plus, when the design was opened
  // with a genuine custom size, a one-off entry for it so the dropdown reflects reality instead
  // of silently jumping to the first preset.
  const presetChoices: CanvasPreset[] = [...PRESETS, ...DESIGN_FORMAT_PRESETS];
  if (preset.id === "custom") presetChoices.unshift(preset);

  const presetSelect = el("select", { class: "studio-select" }) as HTMLSelectElement;
  if (preset.id === "custom") presetSelect.appendChild(el("option", { value: "custom" }, [preset.label]));
  const quickGroup = el("optgroup", { label: "Quick presets" });
  for (const p of PRESETS) quickGroup.appendChild(el("option", { value: p.id }, [p.label]));
  presetSelect.appendChild(quickGroup);
  for (const cat of DESIGN_FORMAT_CATEGORIES) {
    const group = el("optgroup", { label: DESIGN_FORMAT_CATEGORY_LABELS[cat] });
    for (const f of DESIGN_FORMATS.filter((f) => f.category === cat)) {
      group.appendChild(el("option", { value: f.id }, [`${f.name} (${f.width}x${f.height})`]));
    }
    presetSelect.appendChild(group);
  }
  presetSelect.value = preset.id;
  presetSelect.addEventListener("change", () => {
    preset = presetChoices.find((p) => p.id === presetSelect.value) ?? presetChoices[0];
    resizeStage();
    autosave.schedule();
  });

  const undoBtn = el("button", { type: "button", class: "studio-icon-btn", title: "Undo (Ctrl+Z)" }, ["Undo"]);
  const redoBtn = el("button", { type: "button", class: "studio-icon-btn", title: "Redo (Ctrl+Shift+Z)" }, ["Redo"]);
  undoBtn.addEventListener("click", undo);
  redoBtn.addEventListener("click", redo);
  function updateHistoryButtons() {
    (undoBtn as HTMLButtonElement).disabled = historyIndex <= 0;
    (redoBtn as HTMLButtonElement).disabled = historyIndex >= history.length - 1;
  }

  const exportFormatSelect = el("select", { class: "studio-select" }, [
    el("option", { value: "png" }, ["PNG"]),
    el("option", { value: "jpeg" }, ["JPEG"]),
  ]) as HTMLSelectElement;

  const downloadBtn = el("button", { type: "button", class: "run-btn" }, ["Download"]);
  downloadBtn.addEventListener("click", () => {
    deselect();
    const format = exportFormatSelect.value === "jpeg" ? "jpeg" : "png";
    const mimeType = format === "jpeg" ? "image/jpeg" : "image/png";
    // On screen the stage is scaled down to fit the panel (resizeStage), so exporting at
    // that scale would ship a blurry, display-resolution image. Reset to the real design
    // resolution just for the export, then restore whatever the screen was showing.
    const displayScale = stage.scaleX();
    stage.scale({ x: 1, y: 1 });
    stage.width(preset.width);
    stage.height(preset.height);
    if (format === "jpeg") bg.visible(true); // JPEG has no alpha channel, keep the white backing visible
    layer.batchDraw();
    const dataUrl = stage.toDataURL({ pixelRatio: 1, mimeType, quality: 0.92 });
    stage.scale({ x: displayScale, y: displayScale });
    stage.width(preset.width * displayScale);
    stage.height(preset.height * displayScale);
    layer.batchDraw();
    fetch(dataUrl)
      .then((r) => r.blob())
      .then((blob) => triggerDownload(blob, `studio-design.${format === "jpeg" ? "jpg" : "png"}`));
  });

  const previewBtn = el("button", { type: "button", class: "studio-icon-btn", title: "Preview entrance animations" }, ["▶ Preview"]);
  previewBtn.addEventListener("click", () => playPreview());

  const gifExportBtn = el("button", { type: "button", class: "studio-icon-btn" }, ["Export GIF"]);
  gifExportBtn.addEventListener("click", () => { void exportAnimatedGif(); });

  const closeBtn = el("button", { type: "button", class: "studio-close-btn", "aria-label": "Close editor" });
  closeBtn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18"/></svg>`;
  closeBtn.addEventListener("click", () => {
    autosave.flushNow();
    autosave.dispose();
    if (opts.onBack) opts.onBack();
  });

  const titleInput = el("input", {
    type: "text",
    class: "studio-editor-title-input",
    value: designTitle,
    "aria-label": "Design title",
    spellcheck: "false",
  }) as HTMLInputElement;
  // A hidden measuring node in the same font, used to size the title field to its actual text
  // width (a plain "ch" guess is unreliable across the brand's font metrics).
  const titleMeasure = el("span", {
    style: "position:absolute;visibility:hidden;white-space:pre;pointer-events:none;top:-9999px;left:-9999px;",
  });
  function resizeTitleInput() {
    // Sizes the field to the text it holds so it reads like a label, not a form field, while
    // still being clickable and editable anywhere on the title.
    const cs = getComputedStyle(titleInput);
    titleMeasure.style.font = cs.font;
    titleMeasure.textContent = titleInput.value || "Untitled design";
    const paddingH =
      parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight) + parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth);
    const width = Math.max(60, Math.min(320, titleMeasure.offsetWidth + paddingH + 6));
    titleInput.style.width = `${width}px`;
  }
  titleInput.addEventListener("input", () => {
    resizeTitleInput();
  });
  function commitTitle() {
    const next = titleInput.value.trim();
    designTitle = next || "Untitled design";
    titleInput.value = designTitle;
    resizeTitleInput();
    autosave.schedule();
  }
  titleInput.addEventListener("change", commitTitle);
  titleInput.addEventListener("blur", commitTitle);
  titleInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") titleInput.blur();
  });

  const topBar = el("div", { class: "studio-editor-topbar" }, [
    ...(opts.onBack ? [closeBtn] : []),
    titleInput,
    el("label", { class: "studio-field studio-field-inline" }, [presetSelect]),
    el("div", { class: "studio-topbar-spacer" }),
    previewBtn,
    undoBtn,
    redoBtn,
    exportFormatSelect,
    downloadBtn,
    gifExportBtn,
  ]);

  // ---------------- Left icon rail + flyout panels ----------------

  const imageInput = el("input", { type: "file", accept: "image/png,image/jpeg,image/webp", class: "sr-only" }) as HTMLInputElement;
  imageInput.addEventListener("change", () => {
    const file = imageInput.files?.[0];
    if (file) addImage(file);
    imageInput.value = "";
  });

  const replaceImageInput = el("input", { type: "file", accept: "image/png,image/jpeg,image/webp", class: "sr-only" }) as HTMLInputElement;
  let replaceImageTargetId: string | null = null;
  replaceImageInput.addEventListener("change", () => {
    const file = replaceImageInput.files?.[0];
    const target = replaceImageTargetId ? findElement(replaceImageTargetId) : undefined;
    if (file && target) replaceImage(target, file);
    replaceImageInput.value = "";
    replaceImageTargetId = null;
  });

  const RAIL_ICONS = {
    text: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5 6h14M12 6v13"/></svg>`,
    shapes: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="10" width="9" height="9" rx="1.5"/><circle cx="16" cy="7.5" r="4.5"/></svg>`,
    uploads: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="4.5" width="18" height="15" rx="2"/><path d="M3 15l5-5 4 4 3-3 6 6"/><circle cx="8" cy="9" r="1.4"/></svg>`,
    background: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 3c-4 4-7 7.5-7 11a7 7 0 0 0 14 0c0-3.5-3-7-7-11Z"/></svg>`,
  };

  const flyoutHost = el("div", { class: "studio-flyout" });
  let activeRailKey: string | null = null;

  function railButton(key: string, label: string, icon: string, onOpen: () => HTMLElement): HTMLElement {
    const btn = el("button", { type: "button", class: "studio-rail-btn", title: label });
    btn.innerHTML = `${icon}<span>${label}</span>`;
    btn.addEventListener("click", () => {
      if (activeRailKey === key) {
        activeRailKey = null;
        clear(flyoutHost);
        flyoutHost.classList.remove("open");
        updateRailActive();
        return;
      }
      activeRailKey = key;
      clear(flyoutHost);
      flyoutHost.appendChild(onOpen());
      flyoutHost.classList.add("open");
      updateRailActive();
    });
    return btn;
  }

  const railButtons: Record<string, HTMLElement> = {};
  function updateRailActive() {
    for (const [key, btn] of Object.entries(railButtons)) btn.classList.toggle("active", key === activeRailKey);
  }

  function closeFlyout() {
    activeRailKey = null;
    clear(flyoutHost);
    flyoutHost.classList.remove("open");
    updateRailActive();
  }

  railButtons.text = railButton("text", "Text", RAIL_ICONS.text, () => {
    const panel = el("div", { class: "studio-flyout-panel" }, [el("h4", {}, ["Text"])]);
    const addBtn = el("button", { type: "button", class: "studio-flyout-item" }, ["+ Add a text box"]);
    addBtn.addEventListener("click", () => {
      addText();
      closeFlyout();
    });
    panel.appendChild(addBtn);
    return panel;
  });

  railButtons.shapes = railButton("shapes", "Elements", RAIL_ICONS.shapes, () => {
    const panel = el("div", { class: "studio-flyout-panel studio-elements-panel" }, [el("h4", {}, ["Elements"])]);

    const shapesTabBtn = el("button", { type: "button", class: "studio-subtab active" }, ["Shapes"]);
    const iconsTabBtn = el("button", { type: "button", class: "studio-subtab" }, ["Icons"]);
    const stickersTabBtn = el("button", { type: "button", class: "studio-subtab" }, ["Stickers"]);
    const externalTabBtn = el("button", { type: "button", class: "studio-subtab" }, ["External"]);
    const subtabs = el("div", { class: "studio-subtabs" }, [shapesTabBtn, iconsTabBtn, stickersTabBtn, externalTabBtn]);

    const shapesPane = el("div", { class: "studio-elements-pane" });
    const rectBtn = el("button", { type: "button", class: "studio-flyout-item studio-shape-swatch" }, [
      el("span", { class: "swatch-rect" }), "Rectangle",
    ]);
    const circleBtn = el("button", { type: "button", class: "studio-flyout-item studio-shape-swatch" }, [
      el("span", { class: "swatch-circle" }), "Circle",
    ]);
    rectBtn.addEventListener("click", () => {
      addRect();
      closeFlyout();
    });
    circleBtn.addEventListener("click", () => {
      addCircle();
      closeFlyout();
    });
    shapesPane.append(rectBtn, circleBtn);

    const iconsPane = el("div", { class: "studio-elements-pane", style: "display:none" });
    const searchInput = el("input", { type: "search", placeholder: "Search icons", class: "studio-icon-search" }) as HTMLInputElement;
    const iconGrid = el("div", { class: "studio-icon-grid" });
    function renderIconGrid(query: string) {
      clear(iconGrid);
      for (const icon of searchStudioIcons(query)) {
        const btn = el("button", { type: "button", class: "studio-icon-tile", title: icon.name });
        const img = el("img", { src: icon.file, alt: icon.name, loading: "lazy" });
        btn.appendChild(img);
        btn.addEventListener("click", () => {
          addIcon(icon.name).catch(() => {});
          closeFlyout();
        });
        iconGrid.appendChild(btn);
      }
      if (iconGrid.children.length === 0) {
        iconGrid.appendChild(el("div", { class: "control-hint" }, ["No icons match that search."]));
      }
    }
    searchInput.addEventListener("input", () => renderIconGrid(searchInput.value));
    renderIconGrid("");
    iconsPane.append(searchInput, iconGrid);

    // Stickers: a real categorized library (faces, reactions, love, hands, celebration,
    // music, nature, animals, food, story/speech, symbols), searchable, not a bare handful
    // of placeholder glyphs.
    const stickersPane = el("div", { class: "studio-elements-pane studio-sticker-pane", style: "display:none" });
    let stickerCategory: StickerCategory | "all" = "all";
    let stickerQuery = "";
    const stickerSearchInput = el("input", { type: "search", placeholder: "Search stickers", class: "studio-icon-search" }) as HTMLInputElement;
    const stickerCatBar = el("div", { class: "studio-sfx-categories studio-sticker-categories" });
    const stickerGrid = el("div", { class: "studio-sticker-grid studio-sticker-grid-design" });
    function renderStickerCatBar() {
      clear(stickerCatBar);
      const pills: { id: StickerCategory | "all"; label: string }[] = [
        { id: "all", label: "All" },
        ...STICKER_CATEGORIES.map((c) => ({ id: c, label: STICKER_CATEGORY_LABELS[c] })),
      ];
      for (const p of pills) {
        const pill = el("button", { type: "button", class: `studio-sfx-cat-pill${p.id === stickerCategory ? " active" : ""}` }, [p.label]);
        pill.addEventListener("click", () => {
          stickerCategory = p.id;
          renderStickerCatBar();
          renderStickerGrid();
        });
        stickerCatBar.appendChild(pill);
      }
    }
    function renderStickerGrid() {
      clear(stickerGrid);
      const q = stickerQuery.trim().toLowerCase();
      const base = stickersByCategory(stickerCategory);
      const list = q ? base.filter((s) => s.label.toLowerCase().includes(q)) : base;
      if (list.length === 0) {
        stickerGrid.appendChild(el("div", { class: "control-hint" }, ["No stickers match that search."]));
        return;
      }
      for (const s of list) {
        const btn = el("button", { type: "button", class: "studio-sticker-btn", title: s.label }, [s.glyph]);
        btn.addEventListener("click", () => {
          addStickerGlyph(s.glyph);
          closeFlyout();
        });
        stickerGrid.appendChild(btn);
      }
    }
    stickerSearchInput.addEventListener("input", () => {
      stickerQuery = stickerSearchInput.value;
      renderStickerGrid();
    });
    renderStickerCatBar();
    renderStickerGrid();
    stickersPane.append(stickerSearchInput, stickerCatBar, stickerGrid);

    // External assets: a real, provider-backed search library (Openverse today; more providers
    // can register in assetProviders/index.ts without touching this UI), not a handful of
    // hardcoded sample images. Search is debounced, thumbnails are lazy-loaded, results page
    // with a "Load more" button rather than fetching everything at once, and picking a result
    // shows a preview plus its creator/source/license before it lands on the canvas.
    const externalPane = el("div", { class: "studio-elements-pane studio-external-pane", style: "display:none" });
    const extQuickCategories = ["Cars", "People", "Animals", "Food", "Vehicles", "Business", "Education", "Illustrations"];
    const extSearchInput = el("input", { type: "search", placeholder: "Search cars, people, animals...", class: "studio-icon-search" }) as HTMLInputElement;
    const extChipsBar = el("div", { class: "studio-sfx-categories" });
    for (const term of extQuickCategories) {
      const chip = el("button", { type: "button", class: "studio-sfx-cat-pill" }, [term]);
      chip.addEventListener("click", () => {
        extSearchInput.value = term;
        extQuery = term;
        extDetail = null;
        void runExtSearch(term, 1, false);
      });
      extChipsBar.appendChild(chip);
    }
    const extDisclosure = el("p", { class: "control-hint studio-external-disclosure" }, [ASSET_PROVIDERS.map((p) => p.disclosure).join(" ")]);
    const extBody = el("div", { class: "studio-external-body" });
    externalPane.append(extSearchInput, extChipsBar, extDisclosure, extBody);

    let extQuery = "";
    let extPage = 1;
    let extResults: ExternalAsset[] = [];
    let extHasMore = false;
    let extLoading = false;
    let extError: string | null = null;
    let extDetail: ExternalAsset | null = null;
    let extDebounceTimer: number | null = null;

    function assetCard(asset: ExternalAsset): HTMLElement {
      const card = el("button", { type: "button", class: "studio-external-card", title: asset.title });
      const img = el("img", { src: asset.thumbnailUrl, alt: asset.title, loading: "lazy" });
      card.append(img, el("span", { class: "studio-external-card-label" }, [asset.title]));
      card.addEventListener("click", () => {
        extDetail = asset;
        renderExternalPane();
      });
      return card;
    }

    function renderExternalDetail(asset: ExternalAsset): HTMLElement {
      const backBtn = el("button", { type: "button", class: "studio-icon-btn" }, ["← Back to results"]);
      backBtn.addEventListener("click", () => {
        extDetail = null;
        renderExternalPane();
      });

      const bigImg = el("img", { src: asset.thumbnailUrl, alt: asset.title, class: "studio-external-preview-img" });
      const metaLines: HTMLElement[] = [
        el("span", { class: "studio-attribution-line" }, [asset.title]),
      ];
      if (asset.creator) {
        metaLines.push(el("span", { class: "studio-attribution-line" }, [`By ${asset.creator}`]));
      }
      if (asset.source) {
        metaLines.push(el("span", { class: "studio-attribution-line" }, [`Source: ${asset.source} (via ${asset.providerLabel})`]));
      }
      metaLines.push(
        el("span", { class: "studio-attribution-line" }, [
          `License: ${asset.license ? `${asset.license}${asset.licenseVersion ? ` ${asset.licenseVersion}` : ""}` : "unknown, check before commercial use"}`,
        ])
      );
      if (asset.foreignLandingUrl) {
        metaLines.push(
          el("a", { href: asset.foreignLandingUrl, target: "_blank", rel: "noopener noreferrer", class: "studio-attribution-link" }, ["View original source"])
        );
      }

      const favBtn = el("button", { type: "button", class: "studio-icon-btn" }, [isFavoriteAsset(asset) ? "★ Favorited" : "☆ Add to favorites"]);
      favBtn.addEventListener("click", () => {
        const nowFav = toggleFavoriteAsset(asset);
        favBtn.textContent = nowFav ? "★ Favorited" : "☆ Add to favorites";
      });

      const addBtn = el("button", { type: "button", class: "run-btn" }, ["Add to canvas"]);
      addBtn.addEventListener("click", async () => {
        addBtn.textContent = "Adding...";
        (addBtn as HTMLButtonElement).disabled = true;
        try {
          await addExternalAsset(asset);
          closeFlyout();
        } catch (err) {
          addBtn.textContent = err instanceof Error ? err.message : "Could not add that asset, try again";
          (addBtn as HTMLButtonElement).disabled = false;
        }
      });

      return el("div", { class: "studio-external-detail" }, [
        backBtn,
        bigImg,
        el("div", { class: "studio-attribution" }, metaLines),
        el("div", { class: "studio-field-row" }, [addBtn, favBtn]),
      ]);
    }

    function renderExternalPane() {
      clear(extBody);
      if (extDetail) {
        extBody.appendChild(renderExternalDetail(extDetail));
        return;
      }
      if (!extQuery.trim()) {
        const recent = getRecentAssets();
        const favorites = getFavoriteAssets();
        if (recent.length === 0 && favorites.length === 0) {
          extBody.appendChild(el("div", { class: "control-hint" }, ["Search for anything, cars, people, animals, food, and more, or tap a category above."]));
          return;
        }
        if (favorites.length > 0) {
          const grid = el("div", { class: "studio-external-grid" });
          for (const a of favorites) grid.appendChild(assetCard(a));
          extBody.append(el("h4", {}, ["Favorites"]), grid);
        }
        if (recent.length > 0) {
          const grid = el("div", { class: "studio-external-grid" });
          for (const a of recent) grid.appendChild(assetCard(a));
          extBody.append(el("h4", {}, ["Recently used"]), grid);
        }
        return;
      }
      if (extError) {
        const retryBtn = el("button", { type: "button", class: "studio-icon-btn" }, ["Try again"]);
        retryBtn.addEventListener("click", () => void runExtSearch(extQuery, 1, false));
        extBody.append(el("div", { class: "control-hint" }, [extError]), retryBtn);
        return;
      }
      if (extResults.length === 0 && extLoading) {
        extBody.appendChild(el("div", { class: "control-hint" }, ["Searching..."]));
        return;
      }
      if (extResults.length === 0) {
        extBody.appendChild(el("div", { class: "control-hint" }, ["No results for that search. Try a different word."]));
        return;
      }
      const grid = el("div", { class: "studio-external-grid" });
      for (const a of extResults) grid.appendChild(assetCard(a));
      extBody.appendChild(grid);
      if (extHasMore) {
        const loadMoreBtn = el("button", { type: "button", class: "studio-icon-btn" }, [extLoading ? "Loading..." : "Load more"]);
        (loadMoreBtn as HTMLButtonElement).disabled = extLoading;
        loadMoreBtn.addEventListener("click", () => void runExtSearch(extQuery, extPage + 1, true));
        extBody.appendChild(loadMoreBtn);
      } else if (extLoading) {
        extBody.appendChild(el("div", { class: "control-hint" }, ["Loading..."]));
      }
    }

    async function runExtSearch(query: string, page: number, append: boolean) {
      extLoading = true;
      extError = null;
      renderExternalPane();
      try {
        const perProvider = await Promise.all(ASSET_PROVIDERS.map((p) => p.search(query, page)));
        const items = perProvider.flatMap((r) => r.items);
        extResults = append ? [...extResults, ...items] : items;
        extHasMore = perProvider.some((r) => r.hasMore);
        extPage = page;
      } catch (err) {
        extError = err instanceof Error ? err.message : "Something went wrong while searching.";
      } finally {
        extLoading = false;
        renderExternalPane();
      }
    }

    extSearchInput.addEventListener("input", () => {
      extQuery = extSearchInput.value;
      extDetail = null;
      if (extDebounceTimer !== null) window.clearTimeout(extDebounceTimer);
      if (!extQuery.trim()) {
        extResults = [];
        extHasMore = false;
        extError = null;
        renderExternalPane();
        return;
      }
      extDebounceTimer = window.setTimeout(() => {
        void runExtSearch(extQuery, 1, false);
      }, 400);
    });
    renderExternalPane();

    function showPane(which: "shapes" | "icons" | "stickers" | "external") {
      shapesTabBtn.classList.toggle("active", which === "shapes");
      iconsTabBtn.classList.toggle("active", which === "icons");
      stickersTabBtn.classList.toggle("active", which === "stickers");
      externalTabBtn.classList.toggle("active", which === "external");
      shapesPane.style.display = which === "shapes" ? "" : "none";
      iconsPane.style.display = which === "icons" ? "" : "none";
      stickersPane.style.display = which === "stickers" ? "" : "none";
      externalPane.style.display = which === "external" ? "" : "none";
    }
    shapesTabBtn.addEventListener("click", () => showPane("shapes"));
    iconsTabBtn.addEventListener("click", () => showPane("icons"));
    stickersTabBtn.addEventListener("click", () => showPane("stickers"));
    externalTabBtn.addEventListener("click", () => showPane("external"));

    panel.append(subtabs, shapesPane, iconsPane, stickersPane, externalPane);
    return panel;
  });

  railButtons.uploads = railButton("uploads", "Uploads", RAIL_ICONS.uploads, () => {
    const panel = el("div", { class: "studio-flyout-panel", "data-tour": "uploads-panel" }, [el("h4", {}, ["Uploads"])]);
    const uploadBtn = el("button", { type: "button", class: "studio-flyout-item" }, ["+ Upload an image"]);
    uploadBtn.addEventListener("click", () => imageInput.click());
    panel.append(uploadBtn, imageInput, el("p", { class: "control-hint" }, ["Add it to the canvas, then drag, resize, or remove its background from the Design tab."]));
    return panel;
  });

  railButtons.background = railButton("background", "Background", RAIL_ICONS.background, () => {
    const panel = el("div", { class: "studio-flyout-panel" }, [el("h4", {}, ["Canvas background"])]);
    const swatches = ["#ffffff", "#0d0d0d", "#faf7f2", "#0d1b2a", "#e86f00", "#a5b4fc"];
    const row = el("div", { class: "studio-bg-swatches" });
    for (const color of swatches) {
      const swBtn = el("button", { type: "button", class: "studio-bg-swatch" });
      swBtn.style.background = color;
      swBtn.addEventListener("click", () => {
        bg.fill(color);
        layer.batchDraw();
        autosave.schedule();
      });
      row.appendChild(swBtn);
    }
    panel.appendChild(row);
    return panel;
  });

  railButtons.uploads.setAttribute("data-tour", "rail-uploads");
  const rail = el("div", { class: "studio-rail" }, [railButtons.text, railButtons.shapes, railButtons.uploads, railButtons.background]);

  // ---------------- Canvas + right panel (Layers / Design tabs) ----------------

  const canvasHost = el("div", { class: "studio-canvas-host" });
  const recoveryBanner = el("div", { class: "studio-recovery-banner", style: "display:none" });
  const canvasArea = el("div", { class: "studio-canvas-area", "data-tour": "design-canvas" }, [recoveryBanner, canvasHost]);

  const layersList = el("div", { class: "studio-layers-list" });
  const propertiesHost = el("div", { class: "studio-properties" });

  const layersTabBtn = el("button", { type: "button", class: "studio-rp-tab active" }, ["Layers"]);
  const designTabBtn = el("button", { type: "button", class: "studio-rp-tab", "data-tour": "design-tab-btn" }, ["Design"]);
  const layersPane = el("div", { class: "studio-rp-pane" }, [layersList]);
  const designPane = el("div", { class: "studio-rp-pane", style: "display:none" }, [propertiesHost]);
  layersTabBtn.addEventListener("click", () => {
    layersTabBtn.classList.add("active");
    designTabBtn.classList.remove("active");
    layersPane.style.display = "";
    designPane.style.display = "none";
  });
  designTabBtn.addEventListener("click", () => {
    designTabBtn.classList.add("active");
    layersTabBtn.classList.remove("active");
    designPane.style.display = "";
    layersPane.style.display = "none";
    // The panel's numeric inputs are a snapshot from whenever they were last built (selection,
    // or a keyboard nudge while already on this tab); refresh on every switch back to this tab
    // so it never shows a stale X/Y/W/H after the element moved while Layers was showing.
    renderProperties();
  });

  layersPane.setAttribute("data-tour", "design-layers");
  designPane.setAttribute("data-tour", "design-properties");
  const rightPanel = el("div", { class: "studio-right-panel" }, [
    el("div", { class: "studio-rp-tabs" }, [layersTabBtn, designTabBtn]),
    layersPane,
    designPane,
  ]);

  // On a phone the rail + canvas + a permanently-docked right panel simply doesn't fit
  // (Canva's own mobile pattern collapses the side panel behind a toggle), so this button
  // only renders visibly under the mobile breakpoint (see CSS) and slides the panel over
  // the canvas as an overlay instead of splitting the screen three ways at once.
  const panelToggleBtn = el("button", { type: "button", class: "studio-panel-toggle" }, ["Layers"]);
  const panelScrim = el("div", { class: "studio-panel-scrim" });
  panelToggleBtn.addEventListener("click", () => {
    rightPanel.classList.toggle("open");
    panelScrim.classList.toggle("open");
  });
  panelScrim.addEventListener("click", () => {
    rightPanel.classList.remove("open");
    panelScrim.classList.remove("open");
  });

  const body = el("div", { class: "studio-editor-body" }, [rail, flyoutHost, canvasArea, panelScrim, rightPanel]);

  root.append(topBar, panelToggleBtn, body, replaceImageInput, titleMeasure);

  // ---------------- Konva scene ----------------

  const stage = new Konva.Stage({ container: canvasHost, width: preset.width, height: preset.height });
  const layer = new Konva.Layer();
  stage.add(layer);
  const bg = new Konva.Rect({ x: 0, y: 0, width: preset.width, height: preset.height, fill: "#ffffff", listening: false });
  layer.add(bg);
  const transformer = new Konva.Transformer({
    rotateAnchorOffset: 24,
    boundBoxFunc: (_oldBox, newBox) => (newBox.width < 12 || newBox.height < 12 ? _oldBox : newBox),
  });
  layer.add(transformer);

  let editingTextarea: HTMLTextAreaElement | null = null;

  function resizeStage() {
    bg.width(preset.width);
    bg.height(preset.height);
    // The canvas area is a fixed region of the (now full-viewport) editor, in both width and
    // height, so the design has to fit inside whichever dimension is tighter, not just width.
    const areaEl = canvasHost.parentElement;
    const padding = 48;
    const availWidth = (areaEl?.clientWidth || window.innerWidth) - padding;
    const availHeight = (areaEl?.clientHeight || window.innerHeight - 160) - padding;
    const scale = Math.min(availWidth / preset.width, availHeight / preset.height, 1) || 1;
    stage.width(preset.width * scale);
    stage.height(preset.height * scale);
    stage.scale({ x: scale, y: scale });
    layer.batchDraw();
  }
  window.addEventListener("resize", resizeStage);
  // The panel can still be a detached DOM tree (mid dynamic-import swap-in) the moment this
  // tool builds, so a one-off width read at construction time can come back as 0. A
  // ResizeObserver re-fires once it's actually laid out, and again on every real resize.
  if (typeof ResizeObserver !== "undefined") {
    const ro = new ResizeObserver(() => resizeStage());
    ro.observe(canvasHost.parentElement ?? canvasHost);
  }

  stage.on("click tap", (e) => {
    if (e.target === stage || e.target === bg) {
      deselect();
    }
  });

  // Selecting a layer only needs to move which row shows as "active"; rebuilding the whole
  // layers list here (as renderLayersList() does) would destroy and recreate every row's DOM
  // node, including mid-double-click on a layer name, which breaks the browser's native
  // dblclick detection (it requires the same element across both clicks). A full rebuild is
  // still correct, and used, whenever the element set itself changes (add/delete/reorder).
  function syncLayerActiveStates() {
    const ids = allSelectedIds();
    layersList.querySelectorAll(".studio-layer-row").forEach((r) => {
      r.classList.toggle("active", ids.includes(r.getAttribute("data-el-id") ?? ""));
    });
  }

  function deselect() {
    selectedId = null;
    multiIds.clear();
    transformer.nodes([]);
    layer.batchDraw();
    syncLayerActiveStates();
    renderProperties();
  }

  function findElement(id: string): StudioElement | undefined {
    return elements.find((e) => e.id === id);
  }

  function selectElement(id: string) {
    selectedId = id;
    multiIds.clear();
    const node = layer.findOne(`#${id}`);
    const elData = findElement(id);
    transformer.nodes(node && !elData?.locked ? [node] : []);
    layer.batchDraw();
    syncLayerActiveStates();
    renderProperties();
  }

  // Shift+click on a node: adds it to (or removes it from) the current selection instead of
  // replacing it, the standard multi-select gesture every design tool uses.
  function toggleMultiSelect(id: string) {
    if (id === selectedId) {
      // Clicking the primary selection again with Shift held drops it, promoting the next
      // multi-selected element (if any) to primary so the selection never silently empties out
      // while other objects are still picked.
      selectedId = multiIds.size ? multiIds.values().next().value! : null;
      if (selectedId) multiIds.delete(selectedId);
    } else if (multiIds.has(id)) {
      multiIds.delete(id);
    } else if (selectedId === null) {
      selectedId = id;
    } else {
      multiIds.add(id);
    }
    syncMultiSelectionVisuals();
  }

  // Re-applies the current selectedId/multiIds state to the transformer and refreshes the
  // panel; called after every shift-click and after any group operation that changes what's
  // selected without changing WHICH ids are selected (so it doesn't touch history or geometry).
  function syncMultiSelectionVisuals() {
    const ids = allSelectedIds();
    const nodes = ids
      .map((id) => ({ node: layer.findOne(`#${id}`), elData: findElement(id) }))
      .filter((n) => n.node && !n.elData?.locked)
      .map((n) => n.node!);
    transformer.nodes(nodes);
    layer.batchDraw();
    syncLayerActiveStates();
    renderProperties();
  }

  // Effective on-canvas box for an element, in canvas pixels, used by the numeric transform
  // inspector and align-to-canvas actions. Rect/text/image store x/y as their top-left corner;
  // circle stores x/y as its center, so the two kinds need different left/top math. Rotation is
  // ignored here (aligning against the unrotated box), a deliberate simplification shared by
  // most lightweight design tools.
  function effectiveBox(elData: StudioElement): { left: number; top: number; width: number; height: number } {
    // Flip (see Flip H/V below) is represented as a negative scaleX/scaleY, so the raw product
    // can be negative; the displayed/aligned box size is always the magnitude, the sign stays
    // implicit in the element's own scale.
    const width = Math.abs(elData.width * elData.scaleX);
    const height = Math.abs(elData.height * elData.scaleY);
    if (elData.kind === "circle") {
      return { left: elData.x - width / 2, top: elData.y - height / 2, width, height };
    }
    return { left: elData.x, top: elData.y, width, height };
  }

  function applyGeometryToNode(elData: StudioElement) {
    const node = layer.findOne(`#${elData.id}`) as Konva.Node | null;
    if (!node) return;
    node.position({ x: elData.x, y: elData.y });
    node.rotation(elData.rotation);
    node.scale({ x: elData.scaleX, y: elData.scaleY });
    layer.batchDraw();
  }

  // Writes a node's live Konva transform back into its element data, without pushing history:
  // used when several elements move together in one gesture, so the whole group lands in a
  // single undo step rather than one per element.
  function writeNodeGeometry(node: Konva.Node, elId: string) {
    const elData = findElement(elId);
    if (!elData) return;
    elData.x = node.x();
    elData.y = node.y();
    elData.rotation = node.rotation();
    elData.scaleX = node.scaleX();
    elData.scaleY = node.scaleY();
    refreshIconResolutionIfNeeded(elData);
  }

  function commitNodeGeometry(node: Konva.Node, elId: string) {
    writeNodeGeometry(node, elId);
    pushHistory();
  }

  function attachCommonHandlers(shapeNode: Konva.Shape | Konva.Text | Konva.Image, elData: StudioElement) {
    const node = shapeNode as unknown as Konva.Node;
    node.id(elData.id);
    node.draggable(!elData.locked);
    node.visible(!elData.hidden);
    node.on("click tap", (evt) => {
      evt.cancelBubble = true;
      const nativeEvt = evt.evt as MouseEvent;
      if (nativeEvt?.shiftKey) toggleMultiSelect(elData.id);
      else selectElement(elData.id);
    });
    // When several nodes are selected, Konva's Transformer moves them all together on its own
    // drag, but a plain drag started directly on one of the shape nodes (not through the
    // transformer's handles) only moves that one node. Mirroring the same delta onto every other
    // selected element is what makes "drag any selected object" move the whole group, matching
    // Figma/Canva rather than only the object under the cursor.
    let dragStart: { x: number; y: number } | null = null;
    node.on("dragstart", () => {
      dragStart = { x: node.x(), y: node.y() };
    });
    node.on("dragmove", () => {
      if (!dragStart) return;
      const others = allSelectedIds().filter((id) => id !== elData.id);
      if (others.length === 0) return;
      const dx = node.x() - dragStart.x;
      const dy = node.y() - dragStart.y;
      for (const id of others) {
        const otherNode = layer.findOne(`#${id}`);
        const otherData = findElement(id);
        if (!otherNode || !otherData || otherData.locked) continue;
        otherNode.position({ x: otherData.x + dx, y: otherData.y + dy });
      }
      layer.batchDraw();
    });
    node.on("dragend", () => {
      writeNodeGeometry(node, elData.id);
      if (multiIds.size > 0) {
        for (const id of allSelectedIds()) {
          if (id === elData.id) continue;
          const otherNode = layer.findOne(`#${id}`);
          if (otherNode) writeNodeGeometry(otherNode, id);
        }
      }
      pushHistory();
      dragStart = null;
    });
    node.on("transformend", () => commitNodeGeometry(node, elData.id));
    if (elData.kind === "text") {
      node.on("dblclick dbltap", () => beginTextEdit(shapeNode as Konva.Text, elData));
    }
  }

  function applyPhotoFilters(node: Konva.Image, elData: StudioElement) {
    const hasAdjustment = (elData.brightness ?? 0) !== 0 || (elData.contrast ?? 0) !== 0 || (elData.saturation ?? 0) !== 0;
    if (!hasAdjustment) return;
    node.filters([Konva.Filters.Brighten, Konva.Filters.Contrast, Konva.Filters.HSL]);
    node.brightness(elData.brightness ?? 0);
    node.contrast(elData.contrast ?? 0);
    node.saturation(elData.saturation ?? 0);
    node.cache();
  }

  function buildKonvaNode(elData: StudioElement): Konva.Shape | Konva.Text | Konva.Image {
    const opacity = elData.opacity ?? 1;
    if (elData.kind === "rect") {
      return new Konva.Rect({
        x: elData.x, y: elData.y, rotation: elData.rotation, scaleX: elData.scaleX, scaleY: elData.scaleY,
        width: elData.width, height: elData.height, fill: elData.fill, cornerRadius: elData.cornerRadius ?? 12, opacity,
        stroke: elData.stroke, strokeWidth: elData.stroke ? elData.strokeWidth ?? 4 : 0,
      });
    }
    if (elData.kind === "circle") {
      return new Konva.Circle({
        x: elData.x, y: elData.y, rotation: elData.rotation, scaleX: elData.scaleX, scaleY: elData.scaleY,
        radius: elData.width / 2, fill: elData.fill, opacity,
        stroke: elData.stroke, strokeWidth: elData.stroke ? elData.strokeWidth ?? 4 : 0,
      });
    }
    if (elData.kind === "image") {
      const img = imageCache.get(elData.id);
      const node = new Konva.Image({
        x: elData.x, y: elData.y, rotation: elData.rotation, scaleX: elData.scaleX, scaleY: elData.scaleY,
        width: elData.width, height: elData.height, image: img, opacity,
      });
      if (!elData.iconRawSvg) applyPhotoFilters(node, elData);
      return node;
    }
    const fontStyleParts: string[] = [];
    if (elData.bold) fontStyleParts.push("bold");
    if (elData.italic) fontStyleParts.push("italic");
    return new Konva.Text({
      x: elData.x, y: elData.y, rotation: elData.rotation, scaleX: elData.scaleX, scaleY: elData.scaleY,
      text: elData.text ?? "Double-click to edit",
      fontFamily: elData.fontFamily ?? "Inter",
      fontSize: elData.fontSize ?? 64,
      fontStyle: fontStyleParts.length ? fontStyleParts.join(" ") : "normal",
      align: elData.align ?? "left",
      fill: elData.fill,
      width: elData.width,
      opacity,
      stroke: elData.textStroke,
      strokeWidth: elData.textStroke ? elData.textStrokeWidth ?? 8 : 0,
      fillAfterStrokeEnabled: true,
      letterSpacing: elData.letterSpacing ?? 0,
      lineHeight: elData.lineHeight ?? 1.2,
      shadowColor: elData.textShadow ? elData.textShadowColor ?? "#000000" : undefined,
      shadowBlur: elData.textShadow ? elData.textShadowBlur ?? 8 : 0,
      shadowOpacity: elData.textShadow ? 0.6 : 0,
      shadowOffset: elData.textShadow ? { x: 3, y: 3 } : { x: 0, y: 0 },
    });
  }

  function render() {
    layer.find(".studio-node").forEach((n) => n.destroy());
    for (const elData of elements) {
      const node = buildKonvaNode(elData);
      node.name("studio-node");
      attachCommonHandlers(node, elData);
      layer.add(node);
    }
    transformer.moveToTop();
    if (selectedId && findElement(selectedId)) {
      const node = layer.findOne(`#${selectedId}`);
      const elData = findElement(selectedId);
      transformer.nodes(node && !elData?.locked ? [node] : []);
    } else {
      selectedId = null;
      transformer.nodes([]);
    }
    layer.batchDraw();
    renderLayersList();
    renderProperties();
  }

  // ---------------- Entrance-animation preview & GIF export ----------------
  // The element's saved x/y/opacity/scale is always its animation's *end* pose (what render()
  // above draws normally); computeAnimPose derives the in-between poses from that, so preview
  // playback and the deterministic GIF frame capture below share exactly the same math.

  let previewAnim: Konva.Animation | null = null;

  function stopPreview(rerender = true) {
    if (previewAnim) {
      previewAnim.stop();
      previewAnim = null;
    }
    previewBtn.textContent = "▶ Preview";
    previewBtn.classList.remove("active");
    stage.listening(true);
    if (rerender) render();
  }

  function playPreview() {
    if (previewAnim) {
      stopPreview();
      return;
    }
    if (!elements.some((e) => e.anim && (e.anim.type !== "none" || (e.anim.exitType && e.anim.exitType !== "none") || (e.anim.emphasisType && e.anim.emphasisType !== "none")))) {
      alert("Give at least one element an entrance animation first: select it, then choose one under Animation in the right panel.");
      return;
    }
    deselect();
    stage.listening(false);
    const totalMs = Math.max(1200, sceneMaxEndMs(elements.map((e) => e.anim)) + 500);
    previewBtn.textContent = "■ Stop";
    previewBtn.classList.add("active");
    previewAnim = new Konva.Animation((frame) => {
      const t = frame?.time ?? 0;
      for (const elData of elements) {
        const node = layer.findOne(`#${elData.id}`);
        if (!node) continue;
        const pose = computeAnimPose(
          { x: elData.x, y: elData.y, opacity: elData.opacity ?? 1, scaleX: elData.scaleX, scaleY: elData.scaleY },
          elData.anim,
          t,
          preset.width,
          preset.height
        );
        node.position({ x: pose.x, y: pose.y });
        node.opacity(pose.opacity);
        node.scale({ x: pose.scaleX, y: pose.scaleY });
        node.rotation(elData.rotation + pose.rotationDeg);
      }
      if (t >= totalMs) stopPreview();
    }, layer);
    previewAnim.start();
  }

  async function exportAnimatedGif() {
    if (!elements.some((e) => e.anim && (e.anim.type !== "none" || (e.anim.exitType && e.anim.exitType !== "none") || (e.anim.emphasisType && e.anim.emphasisType !== "none")))) {
      alert("Give at least one element an entrance animation first: select it, then choose one under Animation in the right panel.");
      return;
    }
    stopPreview(false);
    deselect();
    stage.listening(false);

    const originalLabel = gifExportBtn.textContent;
    (gifExportBtn as HTMLButtonElement).disabled = true;
    (downloadBtn as HTMLButtonElement).disabled = true;

    const fps = 12;
    const totalMs = Math.max(1200, sceneMaxEndMs(elements.map((e) => e.anim)) + 500);
    const frameCount = Math.max(1, Math.round((totalMs / 1000) * fps));
    // Exported at a fixed, meme/share-friendly width rather than the design's full resolution,
    // since a multi-second animated GIF at 1080p would be enormous and slow to encode.
    const exportWidth = 640;
    const scaleFactor = exportWidth / preset.width;
    const exportHeight = Math.round(preset.height * scaleFactor);

    const displayScale = stage.scaleX();
    stage.scale({ x: scaleFactor, y: scaleFactor });
    stage.width(exportWidth);
    stage.height(exportHeight);
    bg.visible(true); // GIF has no alpha channel worth relying on here either

    const frames: Blob[] = [];
    try {
      for (let i = 0; i < frameCount; i++) {
        const t = (i / fps) * 1000;
        gifExportBtn.textContent = `Rendering ${i + 1}/${frameCount}...`;
        for (const elData of elements) {
          const node = layer.findOne(`#${elData.id}`);
          if (!node) continue;
          const pose = computeAnimPose(
            { x: elData.x, y: elData.y, opacity: elData.opacity ?? 1, scaleX: elData.scaleX, scaleY: elData.scaleY },
            elData.anim,
            t,
            preset.width,
            preset.height
          );
          node.position({ x: pose.x, y: pose.y });
          node.opacity(pose.opacity);
          node.scale({ x: pose.scaleX, y: pose.scaleY });
          node.rotation(elData.rotation + pose.rotationDeg);
        }
        layer.draw(); // synchronous, unlike batchDraw, so toDataURL below captures this exact frame
        const dataUrl = stage.toDataURL({ pixelRatio: 1, mimeType: "image/png" });
        frames.push(await fetch(dataUrl).then((r) => r.blob()));
        await new Promise((resolve) => setTimeout(resolve, 0)); // yield so the tab stays responsive
      }

      gifExportBtn.textContent = "Encoding GIF...";
      const { framesToGif } = await import("../lib/framesToGif");
      const result = await framesToGif(frames, fps, "studio-design.gif", (info) => {
        gifExportBtn.textContent = info.ratio !== undefined ? `${info.phase} ${Math.round(info.ratio * 100)}%` : info.phase;
      });
      triggerDownload(result.blob, result.outputName);
    } catch (err) {
      console.error("Studio GIF export failed:", err);
      alert(err instanceof Error ? err.message : "Could not export the animated GIF.");
    } finally {
      stage.scale({ x: displayScale, y: displayScale });
      stage.width(preset.width * displayScale);
      stage.height(preset.height * displayScale);
      stage.listening(true);
      render();
      (gifExportBtn as HTMLButtonElement).disabled = false;
      (downloadBtn as HTMLButtonElement).disabled = false;
      gifExportBtn.textContent = originalLabel;
    }
  }

  function beginTextEdit(node: Konva.Text, elData: StudioElement) {
    node.hide();
    transformer.nodes([]);
    layer.batchDraw();

    const stageBox = stage.container().getBoundingClientRect();
    const scale = stage.scaleX();
    const textarea = el("textarea", { class: "studio-text-editor" }) as HTMLTextAreaElement;
    textarea.value = elData.text ?? "";
    textarea.style.position = "absolute";
    textarea.style.top = `${stageBox.top + window.scrollY + node.y() * scale}px`;
    textarea.style.left = `${stageBox.left + window.scrollX + node.x() * scale}px`;
    textarea.style.width = `${Math.max(node.width(), 60) * scale}px`;
    textarea.style.fontSize = `${(elData.fontSize ?? 64) * scale}px`;
    textarea.style.fontFamily = elData.fontFamily ?? "Inter";
    textarea.style.color = elData.fill;
    textarea.style.transform = `rotate(${node.rotation()}deg)`;
    textarea.style.transformOrigin = "left top";
    document.body.appendChild(textarea);
    editingTextarea = textarea;
    textarea.focus();
    textarea.select();

    function commit() {
      elData.text = textarea.value || "Text";
      textarea.remove();
      editingTextarea = null;
      node.show();
      render();
      selectElement(elData.id);
      pushHistory();
    }
    textarea.addEventListener("blur", commit);
    textarea.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape") commit();
    });
  }

  // ---------------- Add-element actions ----------------

  function addText() {
    const elData: StudioElement = {
      id: newId("text"), kind: "text", x: preset.width / 2 - 160, y: preset.height / 2 - 40,
      rotation: 0, scaleX: 1, scaleY: 1, width: 320, height: 80, fill: "#1a1a1a",
      text: "Your text here", fontFamily: "Inter", fontSize: 64, align: "left",
    };
    ensureFontLoaded("inter")
      .catch(() => {})
      .then(() => {
        elements.push(elData);
        render();
        selectElement(elData.id);
        pushHistory();
      });
  }

  function addRect() {
    const elData: StudioElement = {
      id: newId("rect"), kind: "rect", x: preset.width / 2 - 150, y: preset.height / 2 - 100,
      rotation: 0, scaleX: 1, scaleY: 1, width: 300, height: 200, fill: "#e86f00",
    };
    elements.push(elData);
    render();
    selectElement(elData.id);
    pushHistory();
  }

  function addCircle() {
    const elData: StudioElement = {
      id: newId("circle"), kind: "circle", x: preset.width / 2, y: preset.height / 2,
      rotation: 0, scaleX: 1, scaleY: 1, width: 220, height: 220, fill: "#a5b4fc",
    };
    elements.push(elData);
    render();
    selectElement(elData.id);
    pushHistory();
  }

  function addImage(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result);
      const img = new Image();
      img.onload = () => {
        // The very first thing placed on an otherwise-blank canvas is treated as defining the
        // design: rather than shrinking the photo to fit a generic preset, the canvas itself
        // resizes to the imported media's own dimensions and the photo fills it edge to edge,
        // exactly like opening that photo to edit it.
        if (elements.length === 0) {
          adoptCanvasSizeFromMedia(img.width, img.height);
          const elData: StudioElement = {
            id: newId("image"), kind: "image", x: 0, y: 0,
            rotation: 0, scaleX: 1, scaleY: 1, width: preset.width, height: preset.height, fill: "#000000", imageSrc: src,
          };
          imageCache.set(elData.id, img);
          elements.push(elData);
          render();
          selectElement(elData.id);
          pushHistory();
          return;
        }
        const maxDim = preset.width * 0.6;
        const scaleFactor = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = img.width * scaleFactor;
        const h = img.height * scaleFactor;
        const elData: StudioElement = {
          id: newId("image"), kind: "image", x: preset.width / 2 - w / 2, y: preset.height / 2 - h / 2,
          rotation: 0, scaleX: 1, scaleY: 1, width: w, height: h, fill: "#000000", imageSrc: src,
        };
        imageCache.set(elData.id, img);
        elements.push(elData);
        render();
        selectElement(elData.id);
        pushHistory();
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  }

  // Swaps the working canvas size to match imported media (a photo, typically) instead of the
  // generic preset the design started on. Clamped so a huge source photo doesn't produce an
  // unworkably large canvas and a tiny one doesn't produce an unusably small one.
  function adoptCanvasSizeFromMedia(naturalWidth: number, naturalHeight: number) {
    const MAX_DIM = 4000;
    const MIN_DIM = 80;
    const scaleDown = Math.min(1, MAX_DIM / Math.max(naturalWidth, naturalHeight));
    const scaleUp = Math.max(1, MIN_DIM / Math.min(naturalWidth, naturalHeight));
    const factor = naturalWidth < MIN_DIM || naturalHeight < MIN_DIM ? scaleUp : scaleDown;
    const w = Math.max(1, Math.round(naturalWidth * factor));
    const h = Math.max(1, Math.round(naturalHeight * factor));
    preset = { id: "custom", label: `Custom (${w}x${h})`, width: w, height: h };
    if (!presetChoices.some((p) => p.id === "custom")) presetChoices.unshift(preset);
    else presetChoices[0] = preset;
    if (!presetSelect.querySelector('option[value="custom"]')) {
      presetSelect.insertBefore(el("option", { value: "custom" }, [preset.label]), presetSelect.firstChild);
    } else {
      const opt = presetSelect.querySelector('option[value="custom"]') as HTMLOptionElement;
      opt.textContent = preset.label;
    }
    presetSelect.value = "custom";
    resizeStage();
    autosave.schedule();
  }

  // Duplicates any element (shape, text, image, icon, sticker): a plain copy offset slightly so
  // it's visibly a new object, not stacked exactly on top of the original. Shared by the
  // Duplicate button in the Design panel and the Ctrl/Cmd+D keyboard shortcut.
  function duplicateElement(id: string) {
    const elData = findElement(id);
    if (!elData) return;
    const copy: StudioElement = { ...elData, id: newId(elData.kind), x: elData.x + 24, y: elData.y + 24 };
    if (elData.kind === "image") imageCache.set(copy.id, imageCache.get(elData.id)!);
    elements.push(copy);
    render();
    selectElement(copy.id);
    pushHistory();
  }

  // A brief full-canvas loading state for operations that genuinely take a moment on the main
  // thread (vectorizing an image traces every path synchronously). Shows a spinner plus a status
  // line that can be updated mid-operation so the person sees real progress, not a frozen screen.
  let progressOverlayEl: HTMLElement | null = null;
  let progressLabelEl: HTMLElement | null = null;
  function showCanvasProgress(label: string, sublabel?: string) {
    if (!progressOverlayEl) {
      progressLabelEl = el("div", { class: "studio-progress-label" }, [label]);
      progressOverlayEl = el("div", { class: "studio-progress-overlay" }, [
        el("div", { class: "studio-progress-ring" }),
        progressLabelEl,
        ...(sublabel ? [el("div", { class: "studio-progress-sublabel" }, [sublabel])] : []),
      ]);
      canvasArea.appendChild(progressOverlayEl);
    } else if (progressLabelEl) {
      progressLabelEl.textContent = label;
    }
  }
  function hideCanvasProgress() {
    if (progressOverlayEl) {
      progressOverlayEl.remove();
      progressOverlayEl = null;
      progressLabelEl = null;
    }
  }

  // Traces an image element's current picture into an SVG (the same tracing engine as the
  // standalone Vectorize tool) and swaps it in, in place, the same way replaceImage does. Shows
  // the canvas progress overlay throughout since tracing runs synchronously on the main thread
  // and can take a visible moment on a larger photo.
  async function vectorizeElementImage(elData: StudioElement, statusBtn?: HTMLElement) {
    if (elData.kind !== "image" || !elData.imageSrc || elData.iconRawSvg) return;
    const btn = statusBtn as HTMLButtonElement | undefined;
    const originalLabel = btn?.textContent ?? "Vectorize";
    if (btn) {
      btn.textContent = "Vectorizing...";
      btn.disabled = true;
    }
    showCanvasProgress("Tracing image into vector paths...", "This can take a few seconds on larger photos.");
    try {
      const { vectorizeImage } = await import("../lib/vectorize");
      const srcBlob = await fetch(elData.imageSrc).then((r) => r.blob());
      const file = new File([srcBlob], "image.png", { type: srcBlob.type || "image/png" });
      const result = await vectorizeImage(file, {
        colorCount: 16,
        smoothing: 1,
        noiseReduction: 4,
        preserveCorners: true,
      });
      showCanvasProgress("Finishing up...");
      const svgDataUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(result.svg)))}`;
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Could not load the vectorized image."));
        img.src = svgDataUrl;
      });
      elData.imageSrc = svgDataUrl;
      imageCache.set(elData.id, img);
      render();
      selectElement(elData.id);
      pushHistory();
    } catch {
      if (btn) btn.textContent = "Couldn't vectorize, try again";
    } finally {
      hideCanvasProgress();
      if (btn) {
        btn.disabled = false;
        if (btn.textContent === "Vectorizing...") btn.textContent = originalLabel;
      }
    }
  }

  // Runs background removal on an image element in place, swapping its picture the same way
  // replaceImage does. Shared by the Remove background button and the Ctrl/Cmd+Shift+B shortcut;
  // statusBtn is optional so the keyboard shortcut can drive the same button's own label/disabled
  // state when the element is currently showing its properties panel.
  async function removeBackgroundForElement(elData: StudioElement, statusBtn?: HTMLElement) {
    if (elData.kind !== "image" || !elData.imageSrc) return;
    const btn = statusBtn as HTMLButtonElement | undefined;
    const originalLabel = btn?.textContent ?? "Remove background";
    if (btn) {
      btn.textContent = "Removing background...";
      btn.disabled = true;
    }
    try {
      const src = elData.imageSrc;
      const srcBlob = await fetch(src).then((r) => r.blob());
      const file = new File([srcBlob], "image.png", { type: srcBlob.type || "image/png" });
      const { removeBackground } = await import("../lib/bgRemoval");
      const resultBlob = await removeBackground(file, () => {});
      const newSrc: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(resultBlob);
      });
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Could not load the processed image."));
        img.src = newSrc;
      });
      elData.imageSrc = newSrc;
      imageCache.set(elData.id, img);
      render();
      selectElement(elData.id);
      pushHistory();
    } catch {
      if (btn) btn.textContent = "Couldn't remove background, try again";
    } finally {
      if (btn) {
        btn.disabled = false;
        if (btn.textContent === "Removing background...") btn.textContent = originalLabel;
      }
    }
  }

  // Swaps the picture inside an existing image element without touching its position, size,
  // rotation, or any filters already applied. This is what makes a meme or GIF template real:
  // the layout stays put, only the photo underneath it changes.
  function replaceImage(elData: StudioElement, file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result);
      const img = new Image();
      img.onload = () => {
        imageCache.set(elData.id, img);
        elData.imageSrc = src;
        elData.placeholderImage = false;
        render();
        selectElement(elData.id);
        pushHistory();
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  }

  // Icons ship as real vector SVG source (see public/studio-icons/*.svg), each declaring a
  // fixed width="24" height="24". Handing that straight to an <img> decodes it as a 24x24
  // raster bitmap, which is fine on-canvas at its original size but blurs the moment someone
  // scales it up, exactly the "unnecessarily rasterized" outcome the icon system should avoid.
  // Overriding those attributes before rasterizing re-renders the same vector source at
  // whatever pixel size the element is actually shown at, so it stays sharp at any scale
  // instead of stretching one small fixed bitmap.
  function coloredIconDataUrl(rawSvg: string, color: string, px: number): string {
    // Lucide icons draw their outline with stroke="currentColor"; swap it for a real color
    // (and drop any lingering fill="none" override) so the icon renders as a plain image.
    const colored = rawSvg
      .replace(/stroke="currentColor"/g, `stroke="${color}"`)
      .replace(/\swidth="[0-9.]+"/, ` width="${px}"`)
      .replace(/\sheight="[0-9.]+"/, ` height="${px}"`);
    return `data:image/svg+xml;utf8,${encodeURIComponent(colored)}`;
  }

  // Clamped so a tiny icon doesn't rasterize at a wasteful resolution and a huge one doesn't
  // ask the browser to rasterize an SVG at an absurd pixel size.
  function iconRenderSizeFor(displayPx: number): number {
    const dpr = window.devicePixelRatio || 1;
    return Math.max(64, Math.min(1024, Math.round(displayPx * dpr * 1.5)));
  }

  async function addIcon(name: string) {
    const res = await fetch(`/studio-icons/${name}.svg`);
    const rawSvg = await res.text();
    const color = "#1a1a1a";
    const size = Math.min(preset.width, preset.height) * 0.22;
    const renderPx = iconRenderSizeFor(size);
    const src = coloredIconDataUrl(rawSvg, color, renderPx);
    await new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => {
        const elData: StudioElement = {
          id: newId("icon"), kind: "image", x: preset.width / 2 - size / 2, y: preset.height / 2 - size / 2,
          rotation: 0, scaleX: 1, scaleY: 1, width: size, height: size, fill: color,
          imageSrc: src, iconRawSvg: rawSvg, iconColor: color, iconRenderPx: renderPx,
        };
        imageCache.set(elData.id, img);
        elements.push(elData);
        render();
        selectElement(elData.id);
        pushHistory();
        resolve();
      };
      img.src = src;
    });
  }

  /** Called after any drag/resize/transform on an icon element: if it has grown enough since
   * its image was last rasterized that the difference would actually show, re-renders the same
   * vector source at the new, larger size instead of leaving a small bitmap stretched blurry.
   * A 20% growth threshold avoids re-rasterizing on every pixel of a slow drag. */
  function refreshIconResolutionIfNeeded(elData: StudioElement) {
    if (!elData.iconRawSvg) return;
    const displayPx = Math.max(elData.width * Math.abs(elData.scaleX), elData.height * Math.abs(elData.scaleY));
    const targetPx = iconRenderSizeFor(displayPx);
    if (targetPx <= (elData.iconRenderPx ?? 0) * 1.2) return;
    const src = coloredIconDataUrl(elData.iconRawSvg, elData.iconColor || "#1a1a1a", targetPx);
    const img = new Image();
    img.onload = () => {
      imageCache.set(elData.id, img);
      elData.imageSrc = src;
      elData.iconRenderPx = targetPx;
      const node = layer.findOne(`#${elData.id}`) as Konva.Image | null;
      node?.image(img);
      layer.batchDraw();
    };
    img.src = src;
  }

  // A sticker is rasterized once to a real PNG (see stickerLibrary.ts) and then dropped in
  // through the exact same image-element pipeline as an uploaded photo or a library icon, so
  // it gets real resize/rotate/layering/export for free rather than a second bespoke system.
  function addStickerGlyph(glyph: string) {
    const src = stickerToPngDataUrl(glyph, 256);
    if (!src) return;
    const img = new Image();
    img.onload = () => {
      const size = Math.min(preset.width, preset.height) * 0.24;
      const elData: StudioElement = {
        id: newId("sticker"), kind: "image", x: preset.width / 2 - size / 2, y: preset.height / 2 - size / 2,
        rotation: 0, scaleX: 1, scaleY: 1, width: size, height: size, fill: "#000000", imageSrc: src,
      };
      imageCache.set(elData.id, img);
      elements.push(elData);
      render();
      selectElement(elData.id);
      pushHistory();
    };
    img.src = src;
  }

  /** Inserts an external asset (Openverse today) as a normal, fully editable image element.
   * The full-resolution file is fetched once here (never for the whole search grid, which only
   * ever loads thumbnails) and converted to a data URL rather than kept as a live remote URL or
   * an object URL, for two reasons: a data URL is what the rest of this editor's image pipeline
   * (upload, stickers, background removal) already expects and serializes into autosave/export
   * correctly, and fetching the bytes ourselves rather than pointing an <img> at the remote URL
   * avoids the canvas "tainted" problem a cross-origin image would otherwise cause on export. */
  async function addExternalAsset(asset: ExternalAsset): Promise<void> {
    const res = await fetch(asset.fullUrl);
    if (!res.ok) throw new Error("Could not download that asset.");
    const blob = await res.blob();
    const src: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Could not read that asset."));
      reader.readAsDataURL(blob);
    });
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Could not load that asset."));
      img.src = src;
    });
    const maxDim = preset.width * 0.6;
    const scaleFactor = Math.min(1, maxDim / Math.max(img.width, img.height));
    const w = img.width * scaleFactor;
    const h = img.height * scaleFactor;
    const elData: StudioElement = {
      id: newId("external"), kind: "image", x: preset.width / 2 - w / 2, y: preset.height / 2 - h / 2,
      rotation: 0, scaleX: 1, scaleY: 1, width: w, height: h, fill: "#000000", imageSrc: src,
      sourceAttribution: {
        provider: asset.providerLabel,
        title: asset.title,
        creator: asset.creator,
        creatorUrl: asset.creatorUrl,
        source: asset.source,
        license: asset.license,
        licenseVersion: asset.licenseVersion,
        licenseUrl: asset.licenseUrl,
        foreignLandingUrl: asset.foreignLandingUrl,
      },
    };
    imageCache.set(elData.id, img);
    elements.push(elData);
    render();
    selectElement(elData.id);
    pushHistory();
    recordRecentAsset(asset);
  }

  function recolorIcon(elData: StudioElement, color: string) {
    if (!elData.iconRawSvg) return;
    const px = elData.iconRenderPx ?? iconRenderSizeFor(elData.width * Math.abs(elData.scaleX));
    const src = coloredIconDataUrl(elData.iconRawSvg, color, px);
    const img = new Image();
    img.onload = () => {
      imageCache.set(elData.id, img);
      elData.imageSrc = src;
      elData.iconColor = color;
      elData.iconRenderPx = px;
      const node = layer.findOne(`#${elData.id}`) as Konva.Image | null;
      node?.image(img);
      layer.batchDraw();
    };
    img.src = src;
  }

  // ---------------- Layers panel ----------------

  function renderLayersList() {
    clear(layersList);
    if (elements.length === 0) {
      layersList.appendChild(el("div", { class: "control-hint" }, ["No layers yet, add text, a shape or an image from the left rail."]));
      return;
    }
    for (let i = elements.length - 1; i >= 0; i -= 1) {
      const elData = elements[i];
      const row = el("div", {
        class: `studio-layer-row${elData.id === selectedId ? " active" : ""}${elData.hidden ? " studio-layer-hidden" : ""}`,
        "data-el-id": elData.id,
      });

      // A real thumbnail rendered straight from the live Konva node, not a placeholder icon.
      const thumb = el("div", { class: "studio-layer-thumb" });
      const node = layer.findOne(`#${elData.id}`);
      try {
        const dataUrl = node?.toDataURL({ width: 64, height: 64 });
        if (dataUrl) thumb.style.backgroundImage = `url(${dataUrl})`;
      } catch {
        // Thumbnail is a nicety, never worth failing the layer row over.
      }
      if (!thumb.style.backgroundImage) thumb.style.background = elData.fill;

      const defaultName = () => (elData.kind === "text" ? (elData.text ?? "Text").slice(0, 20) : elData.kind[0].toUpperCase() + elData.kind.slice(1));
      const nameSpan = el("span", { class: "studio-layer-name" }, [elData.name?.trim() || defaultName()]);
      nameSpan.addEventListener("dblclick", (evt) => {
        evt.stopPropagation();
        const input = el("input", { type: "text", class: "studio-layer-name-input", value: elData.name?.trim() || defaultName() }) as HTMLInputElement;
        nameSpan.replaceWith(input);
        input.focus();
        input.select();
        function commit() {
          const next = input.value.trim();
          elData.name = next && next !== defaultName() ? next : undefined;
          renderLayersList();
          autosave.schedule();
        }
        input.addEventListener("blur", commit);
        input.addEventListener("keydown", (ev) => {
          if (ev.key === "Enter") input.blur();
          if (ev.key === "Escape") { input.value = elData.name?.trim() || defaultName(); input.blur(); }
        });
      });
      const clickTarget = el("div", { class: "studio-layer-main", "data-tour": "layer-row-main" }, [thumb, nameSpan]);
      clickTarget.addEventListener("click", () => selectElement(elData.id));

      const lockBtn = el("button", { type: "button", class: `studio-icon-btn${elData.locked ? " active" : ""}`, title: elData.locked ? "Unlock" : "Lock" });
      lockBtn.innerHTML = elData.locked ? LOCK_CLOSED_SVG : LOCK_OPEN_SVG;
      lockBtn.addEventListener("click", (evt) => {
        evt.stopPropagation();
        elData.locked = !elData.locked;
        if (elData.locked && selectedId === elData.id) transformer.nodes([]);
        const n = layer.findOne(`#${elData.id}`);
        n?.draggable(!elData.locked);
        layer.batchDraw();
        renderLayersList();
        renderProperties();
        autosave.schedule();
      });

      const hideBtn = el("button", { type: "button", class: `studio-icon-btn${elData.hidden ? " active" : ""}`, title: elData.hidden ? "Show" : "Hide" });
      hideBtn.innerHTML = elData.hidden ? EYE_OFF_SVG : EYE_OPEN_SVG;
      hideBtn.addEventListener("click", (evt) => {
        evt.stopPropagation();
        elData.hidden = !elData.hidden;
        const n = layer.findOne(`#${elData.id}`);
        n?.visible(!elData.hidden);
        if (elData.hidden && selectedId === elData.id) transformer.nodes([]);
        layer.batchDraw();
        renderLayersList();
        autosave.schedule();
      });

      const upBtn = el("button", { type: "button", class: "studio-icon-btn", title: "Bring forward" }, ["↑"]);
      const downBtn = el("button", { type: "button", class: "studio-icon-btn", title: "Send backward" }, ["↓"]);
      const delBtn = el("button", { type: "button", class: "studio-icon-btn", title: "Delete" }, ["✕"]);
      upBtn.addEventListener("click", () => moveLayer(elData.id, 1));
      downBtn.addEventListener("click", () => moveLayer(elData.id, -1));
      delBtn.addEventListener("click", () => deleteLayer(elData.id));
      row.append(clickTarget, lockBtn, hideBtn, upBtn, downBtn, delBtn);
      layersList.appendChild(row);
    }
  }

  function moveLayer(id: string, dir: 1 | -1) {
    const idx = elements.findIndex((e) => e.id === id);
    if (idx < 0) return;
    const swapWith = idx + dir;
    if (swapWith < 0 || swapWith >= elements.length) return;
    [elements[idx], elements[swapWith]] = [elements[swapWith], elements[idx]];
    render();
    pushHistory();
  }

  function deleteLayer(id: string) {
    elements = elements.filter((e) => e.id !== id);
    imageCache.delete(id);
    if (selectedId === id) selectedId = null;
    render();
    pushHistory();
  }

  // ---------------- Properties panel ----------------

  // The panel shown instead of the single-element inspector whenever more than one object is
  // selected (Shift+click): align/distribute act on the group's own combined bounding box rather
  // than the canvas, since "align to each other" is what every design tool means by this once
  // more than one object is picked.
  function renderMultiProperties() {
    const ids = allSelectedIds();
    const datas = ids.map((id) => findElement(id)).filter((d): d is StudioElement => !!d);
    if (datas.length < 2) return;

    const rows: HTMLElement[] = [];
    rows.push(el("div", { class: "studio-field-label" }, [`${datas.length} objects selected`]));

    function groupBox() {
      const boxes = datas.map(effectiveBox);
      const left = Math.min(...boxes.map((b) => b.left));
      const top = Math.min(...boxes.map((b) => b.top));
      const right = Math.max(...boxes.map((b) => b.left + b.width));
      const bottom = Math.max(...boxes.map((b) => b.top + b.height));
      return { left, top, right, bottom, width: right - left, height: bottom - top };
    }

    function setLeft(elData: StudioElement, left: number) {
      const b = effectiveBox(elData);
      elData.x = elData.kind === "circle" ? left + b.width / 2 : left;
    }
    function setTop(elData: StudioElement, top: number) {
      const b = effectiveBox(elData);
      elData.y = elData.kind === "circle" ? top + b.height / 2 : top;
    }

    function alignGroup(where: "left" | "centerH" | "right" | "top" | "centerV" | "bottom") {
      const g = groupBox();
      for (const elData of datas) {
        const b = effectiveBox(elData);
        if (where === "left") setLeft(elData, g.left);
        if (where === "centerH") setLeft(elData, g.left + (g.width - b.width) / 2);
        if (where === "right") setLeft(elData, g.right - b.width);
        if (where === "top") setTop(elData, g.top);
        if (where === "centerV") setTop(elData, g.top + (g.height - b.height) / 2);
        if (where === "bottom") setTop(elData, g.bottom - b.height);
        applyGeometryToNode(elData);
      }
      pushHistory();
    }

    // Evens out the gaps between objects along one axis, keeping the first and last object (by
    // that axis's position) fixed in place, exactly like Figma/Canva's distribute.
    function distributeGroup(axis: "x" | "y") {
      if (datas.length < 3) return;
      const withBox = datas.map((d) => ({ d, b: effectiveBox(d) }));
      withBox.sort((a, b) => (axis === "x" ? a.b.left - b.b.left : a.b.top - b.b.top));
      const first = withBox[0];
      const last = withBox[withBox.length - 1];
      const span =
        axis === "x"
          ? last.b.left - (first.b.left + first.b.width)
          : last.b.top - (first.b.top + first.b.height);
      const totalMiddleSize = withBox.slice(1, -1).reduce((sum, w) => sum + (axis === "x" ? w.b.width : w.b.height), 0);
      const gapCount = withBox.length - 1;
      const gap = (span - totalMiddleSize) / gapCount;
      let cursor = axis === "x" ? first.b.left + first.b.width : first.b.top + first.b.height;
      for (let i = 1; i < withBox.length - 1; i++) {
        cursor += gap;
        if (axis === "x") setLeft(withBox[i].d, cursor);
        else setTop(withBox[i].d, cursor);
        applyGeometryToNode(withBox[i].d);
        cursor += axis === "x" ? withBox[i].b.width : withBox[i].b.height;
      }
      pushHistory();
    }

    const alignRow1 = el("div", { class: "studio-field-row" }, [
      alignBtn("⟸", "Align lefts", () => alignGroup("left")),
      alignBtn("◫", "Align centers (horizontal)", () => alignGroup("centerH")),
      alignBtn("⟹", "Align rights", () => alignGroup("right")),
    ]);
    const alignRow2 = el("div", { class: "studio-field-row" }, [
      alignBtn("⤒", "Align tops", () => alignGroup("top")),
      alignBtn("⊟", "Align middles (vertical)", () => alignGroup("centerV")),
      alignBtn("⤓", "Align bottoms", () => alignGroup("bottom")),
    ]);
    function alignBtn(glyph: string, title: string, onClick: () => void): HTMLElement {
      const btn = el("button", { type: "button", class: "studio-icon-btn", title }, [glyph]);
      btn.addEventListener("click", onClick);
      return btn;
    }
    rows.push(el("div", { class: "studio-field-label" }, ["Align to each other"]), alignRow1, alignRow2);

    if (datas.length >= 3) {
      const distRow = el("div", { class: "studio-field-row" }, [
        el("button", { type: "button", class: "studio-icon-btn" }, ["Distribute horizontally"]),
        el("button", { type: "button", class: "studio-icon-btn" }, ["Distribute vertically"]),
      ]);
      (distRow.children[0] as HTMLButtonElement).addEventListener("click", () => distributeGroup("x"));
      (distRow.children[1] as HTMLButtonElement).addEventListener("click", () => distributeGroup("y"));
      rows.push(distRow);
    }

    const dupAllBtn = el("button", { type: "button", class: "studio-icon-btn" }, [`Duplicate all (Ctrl+D)`]);
    dupAllBtn.addEventListener("click", () => duplicateSelection());
    const delAllBtn = el("button", { type: "button", class: "studio-icon-btn" }, [`Delete all (Delete)`]);
    delAllBtn.addEventListener("click", () => deleteSelection());
    rows.push(dupAllBtn, delAllBtn);

    propertiesHost.append(...rows);
  }

  // Deletes every currently-selected element (a single Delete/Backspace covers the whole group
  // when more than one object is selected, not just the primary one).
  function deleteSelection() {
    const ids = allSelectedIds();
    if (ids.length > 1) {
      elements = elements.filter((e) => !ids.includes(e.id));
      deselect();
      render();
      pushHistory();
    } else if (ids.length === 1) {
      deleteLayer(ids[0]);
    }
  }

  // Duplicates every currently-selected element as one group, offset together and left selected
  // as the new group, so Ctrl+D on a multi-selection behaves like copy-pasting the whole set.
  function duplicateSelection() {
    const ids = allSelectedIds();
    if (ids.length <= 1) {
      if (ids[0]) duplicateElement(ids[0]);
      return;
    }
    const copies: StudioElement[] = [];
    for (const id of ids) {
      const src = findElement(id);
      if (!src) continue;
      const copy: StudioElement = { ...src, id: newId(src.kind), x: src.x + 24, y: src.y + 24 };
      if (src.kind === "image") imageCache.set(copy.id, imageCache.get(src.id)!);
      copies.push(copy);
    }
    elements.push(...copies);
    render();
    if (copies.length) {
      selectedId = copies[0].id;
      multiIds = new Set(copies.slice(1).map((c) => c.id));
      syncMultiSelectionVisuals();
    }
    pushHistory();
  }

  function renderProperties() {
    clear(propertiesHost);
    if (multiIds.size > 0) {
      renderMultiProperties();
      return;
    }
    const elData = selectedId ? findElement(selectedId) : undefined;
    if (!elData) {
      propertiesHost.appendChild(el("div", { class: "control-hint" }, ["Select something on the canvas to edit it."]));
      return;
    }

    const rows: HTMLElement[] = [];

    // ---- Numeric transform inspector: X/Y/W/H/Rotation, two-way bound to the canvas ----
    const box = effectiveBox(elData);
    const xInput = el("input", { type: "number", step: "1", value: String(Math.round(box.left)) }) as HTMLInputElement;
    const yInput = el("input", { type: "number", step: "1", value: String(Math.round(box.top)) }) as HTMLInputElement;
    const wInput = el("input", { type: "number", step: "1", min: "1", value: String(Math.round(box.width)) }) as HTMLInputElement;
    const hInput = el("input", { type: "number", step: "1", min: "1", value: String(Math.round(box.height)) }) as HTMLInputElement;
    const rotInput = el("input", { type: "number", step: "1", value: String(Math.round(elData.rotation)) }) as HTMLInputElement;

    function commitPositionFromInputs() {
      const newLeft = Number(xInput.value) || 0;
      const newTop = Number(yInput.value) || 0;
      if (elData!.kind === "circle") {
        const b = effectiveBox(elData!);
        elData!.x = newLeft + b.width / 2;
        elData!.y = newTop + b.height / 2;
      } else {
        elData!.x = newLeft;
        elData!.y = newTop;
      }
      applyGeometryToNode(elData!);
      pushHistory();
    }
    xInput.addEventListener("change", commitPositionFromInputs);
    yInput.addEventListener("change", commitPositionFromInputs);

    function commitSizeFromInputs() {
      const newW = Math.max(1, Number(wInput.value) || elData!.width);
      const newH = Math.max(1, Number(hInput.value) || elData!.height);
      const oldBox = effectiveBox(elData!);
      const signX = elData!.scaleX < 0 ? -1 : 1;
      const signY = elData!.scaleY < 0 ? -1 : 1;
      elData!.scaleX = (signX * newW) / elData!.width;
      elData!.scaleY = (signY * newH) / elData!.height;
      // Keep the box's top-left corner fixed while resizing from numeric fields, matching how
      // a resize handle on the top-left anchor would behave, rather than growing from center.
      if (elData!.kind === "circle") {
        elData!.x = oldBox.left + newW / 2;
        elData!.y = oldBox.top + newH / 2;
      }
      applyGeometryToNode(elData!);
      refreshIconResolutionIfNeeded(elData!);
      pushHistory();
    }
    wInput.addEventListener("change", commitSizeFromInputs);
    hInput.addEventListener("change", commitSizeFromInputs);

    rotInput.addEventListener("change", () => {
      elData!.rotation = Number(rotInput.value) || 0;
      applyGeometryToNode(elData!);
      pushHistory();
    });

    rows.push(
      el("div", { class: "studio-field-label" }, ["Position & size"]),
      el("div", { class: "studio-transform-grid" }, [
        el("label", { class: "studio-field" }, ["X", xInput]),
        el("label", { class: "studio-field" }, ["Y", yInput]),
        el("label", { class: "studio-field" }, ["W", wInput]),
        el("label", { class: "studio-field" }, ["H", hInput]),
        el("label", { class: "studio-field" }, ["Rotation", rotInput]),
      ])
    );

    // ---- Align to canvas ----
    function alignTo(where: "left" | "centerH" | "right" | "top" | "centerV" | "bottom") {
      const b = effectiveBox(elData!);
      let left = b.left;
      let top = b.top;
      if (where === "left") left = 0;
      if (where === "centerH") left = (preset.width - b.width) / 2;
      if (where === "right") left = preset.width - b.width;
      if (where === "top") top = 0;
      if (where === "centerV") top = (preset.height - b.height) / 2;
      if (where === "bottom") top = preset.height - b.height;
      if (elData!.kind === "circle") {
        elData!.x = left + b.width / 2;
        elData!.y = top + b.height / 2;
      } else {
        elData!.x = left;
        elData!.y = top;
      }
      applyGeometryToNode(elData!);
      renderProperties();
      pushHistory();
    }
    const alignRow1 = el("div", { class: "studio-field-row" }, [
      el("button", { type: "button", class: "studio-icon-btn", title: "Align left" }, ["⟸"]),
      el("button", { type: "button", class: "studio-icon-btn", title: "Center horizontally" }, ["◫"]),
      el("button", { type: "button", class: "studio-icon-btn", title: "Align right" }, ["⟹"]),
    ]);
    const alignRow2 = el("div", { class: "studio-field-row" }, [
      el("button", { type: "button", class: "studio-icon-btn", title: "Align top" }, ["⟰"]),
      el("button", { type: "button", class: "studio-icon-btn", title: "Center vertically" }, ["⊟"]),
      el("button", { type: "button", class: "studio-icon-btn", title: "Align bottom" }, ["⟱"]),
    ]);
    const alignKeys: Array<"left" | "centerH" | "right"> = ["left", "centerH", "right"];
    alignRow1.querySelectorAll("button").forEach((btn, idx) => btn.addEventListener("click", () => alignTo(alignKeys[idx])));
    const alignKeys2: Array<"top" | "centerV" | "bottom"> = ["top", "centerV", "bottom"];
    alignRow2.querySelectorAll("button").forEach((btn, idx) => btn.addEventListener("click", () => alignTo(alignKeys2[idx])));
    rows.push(el("div", { class: "studio-field-label" }, ["Align to canvas"]), alignRow1, alignRow2);

    // ---- Flip ----
    const flipHBtn = el("button", { type: "button", class: "studio-icon-btn", title: "Flip horizontal" }, ["Flip H"]);
    const flipVBtn = el("button", { type: "button", class: "studio-icon-btn", title: "Flip vertical" }, ["Flip V"]);
    flipHBtn.addEventListener("click", () => {
      elData!.scaleX = -elData!.scaleX;
      applyGeometryToNode(elData!);
      pushHistory();
    });
    flipVBtn.addEventListener("click", () => {
      elData!.scaleY = -elData!.scaleY;
      applyGeometryToNode(elData!);
      pushHistory();
    });
    rows.push(el("div", { class: "studio-field-row" }, [flipHBtn, flipVBtn]));

    // ---- Lock / hide, mirrored here from the Layers panel for convenience ----
    const lockToggleBtn = el("button", { type: "button", class: `studio-icon-btn studio-icon-btn-labeled${elData.locked ? " active" : ""}` });
    lockToggleBtn.innerHTML = `${elData.locked ? LOCK_CLOSED_SVG : LOCK_OPEN_SVG}<span>${elData.locked ? "Locked" : "Lock"}</span>`;
    lockToggleBtn.addEventListener("click", () => {
      elData!.locked = !elData!.locked;
      if (elData!.locked) transformer.nodes([]);
      const n = layer.findOne(`#${elData!.id}`);
      n?.draggable(!elData!.locked);
      layer.batchDraw();
      renderLayersList();
      renderProperties();
      autosave.schedule();
    });
    rows.push(lockToggleBtn);
    rows.push(el("div", { class: "studio-divider" }));

    const opacityInput = el("input", {
      type: "range", min: "0", max: "100", value: String(Math.round((elData.opacity ?? 1) * 100)),
    }) as HTMLInputElement;
    opacityInput.addEventListener("input", () => {
      elData.opacity = Number(opacityInput.value) / 100;
      (layer.findOne(`#${elData.id}`) as Konva.Node | null)?.opacity(elData.opacity);
      layer.batchDraw();
    });
    opacityInput.addEventListener("change", pushHistory);
    rows.push(el("label", { class: "studio-field" }, ["Opacity", opacityInput]));

    if (elData.kind !== "image") {
      const fillInput = el("input", { type: "color", value: elData.fill }) as HTMLInputElement;
      fillInput.addEventListener("input", () => {
        elData.fill = fillInput.value;
        const node = layer.findOne(`#${elData.id}`) as Konva.Shape | Konva.Text | null;
        node?.fill?.(fillInput.value);
        layer.batchDraw();
      });
      fillInput.addEventListener("change", pushHistory);
      rows.push(el("label", { class: "studio-field" }, ["Color", fillInput]));
    }

    if (elData.kind === "rect" || elData.kind === "circle") {
      const strokeToggle = el("button", { type: "button", class: `studio-toggle-btn${elData.stroke ? " active" : ""}` }, ["Border"]);
      const strokeColorInput = el("input", { type: "color", value: elData.stroke || "#000000" }) as HTMLInputElement;
      const strokeWidthInput = el("input", {
        type: "range", min: "1", max: "40", value: String(elData.strokeWidth ?? 4),
      }) as HTMLInputElement;
      strokeColorInput.style.display = elData.stroke ? "" : "none";
      strokeWidthInput.style.display = elData.stroke ? "" : "none";
      const shapeElId = elData.id;
      const applyStroke = () => {
        const node = layer.findOne(`#${shapeElId}`) as Konva.Shape | null;
        node?.stroke(elData.stroke ?? "");
        node?.strokeWidth(elData.stroke ? elData.strokeWidth ?? 4 : 0);
        layer.batchDraw();
      };
      strokeToggle.addEventListener("click", () => {
        elData.stroke = elData.stroke ? undefined : strokeColorInput.value;
        elData.strokeWidth = elData.strokeWidth ?? 4;
        strokeToggle.classList.toggle("active", !!elData.stroke);
        strokeColorInput.style.display = elData.stroke ? "" : "none";
        strokeWidthInput.style.display = elData.stroke ? "" : "none";
        applyStroke();
        pushHistory();
      });
      strokeColorInput.addEventListener("input", () => { elData.stroke = strokeColorInput.value; applyStroke(); });
      strokeColorInput.addEventListener("change", pushHistory);
      strokeWidthInput.addEventListener("input", () => { elData.strokeWidth = Number(strokeWidthInput.value); applyStroke(); });
      strokeWidthInput.addEventListener("change", pushHistory);
      rows.push(el("div", { class: "studio-field-row" }, [strokeToggle, strokeColorInput, strokeWidthInput]));
    }

    if (elData.kind === "rect") {
      const radiusInput = el("input", {
        type: "range", min: "0", max: "120", value: String(elData.cornerRadius ?? 12),
      }) as HTMLInputElement;
      radiusInput.addEventListener("input", () => {
        elData.cornerRadius = Number(radiusInput.value);
        (layer.findOne(`#${elData.id}`) as Konva.Rect | null)?.cornerRadius(elData.cornerRadius);
        layer.batchDraw();
      });
      radiusInput.addEventListener("change", pushHistory);
      rows.push(el("label", { class: "studio-field" }, ["Corner radius", radiusInput]));
    }

    if (elData.kind === "text") {
      const fontSelect = el("select", { class: "studio-select" }) as HTMLSelectElement;
      for (const f of FONTS) fontSelect.appendChild(el("option", { value: f.id }, [f.label]));
      fontSelect.value = FONTS.find((f) => f.family === elData.fontFamily)?.id ?? FONTS[0].id;
      fontSelect.addEventListener("change", async () => {
        await ensureFontLoaded(fontSelect.value).catch(() => {});
        const font = FONTS.find((f) => f.id === fontSelect.value)!;
        elData.fontFamily = font.family;
        (layer.findOne(`#${elData.id}`) as Konva.Text | null)?.fontFamily(font.family);
        layer.batchDraw();
        pushHistory();
      });

      const sizeInput = el("input", { type: "number", min: "8", max: "400", value: String(elData.fontSize ?? 64) }) as HTMLInputElement;
      sizeInput.addEventListener("change", () => {
        elData.fontSize = Number(sizeInput.value) || 64;
        (layer.findOne(`#${elData.id}`) as Konva.Text | null)?.fontSize(elData.fontSize);
        layer.batchDraw();
        pushHistory();
      });

      const boldBtn = el("button", { type: "button", class: `studio-toggle-btn${elData.bold ? " active" : ""}` }, ["B"]);
      const italicBtn = el("button", { type: "button", class: `studio-toggle-btn${elData.italic ? " active" : ""}` }, ["I"]);
      function applyStyle() {
        const parts: string[] = [];
        if (elData!.bold) parts.push("bold");
        if (elData!.italic) parts.push("italic");
        (layer.findOne(`#${elData!.id}`) as Konva.Text | null)?.fontStyle(parts.length ? parts.join(" ") : "normal");
        layer.batchDraw();
      }
      boldBtn.addEventListener("click", () => {
        elData.bold = !elData.bold;
        boldBtn.classList.toggle("active", elData.bold);
        applyStyle();
        pushHistory();
      });
      italicBtn.addEventListener("click", () => {
        elData.italic = !elData.italic;
        italicBtn.classList.toggle("active", elData.italic);
        applyStyle();
        pushHistory();
      });

      const outlineToggle = el("button", { type: "button", class: `studio-toggle-btn${elData.textStroke ? " active" : ""}` }, ["Outline"]);
      const outlineColorInput = el("input", { type: "color", value: elData.textStroke || "#000000" }) as HTMLInputElement;
      outlineColorInput.style.display = elData.textStroke ? "" : "none";
      const textElId = elData.id;
      const applyOutline = () => {
        const node = layer.findOne(`#${textElId}`) as Konva.Text | null;
        node?.stroke(elData.textStroke ?? "");
        node?.strokeWidth(elData.textStroke ? elData.textStrokeWidth ?? 8 : 0);
        layer.batchDraw();
      };
      outlineToggle.addEventListener("click", () => {
        elData.textStroke = elData.textStroke ? undefined : outlineColorInput.value;
        elData.textStrokeWidth = elData.textStrokeWidth ?? 8;
        outlineToggle.classList.toggle("active", !!elData.textStroke);
        outlineColorInput.style.display = elData.textStroke ? "" : "none";
        applyOutline();
        pushHistory();
      });
      outlineColorInput.addEventListener("input", () => {
        elData.textStroke = outlineColorInput.value;
        applyOutline();
      });
      outlineColorInput.addEventListener("change", pushHistory);

      // ---- Alignment ----
      const alignLeftBtn = el("button", { type: "button", class: `studio-toggle-btn${(elData.align ?? "left") === "left" ? " active" : ""}`, title: "Align left" }, ["⟸"]);
      const alignCenterBtn = el("button", { type: "button", class: `studio-toggle-btn${elData.align === "center" ? " active" : ""}`, title: "Align center" }, ["◫"]);
      const alignRightBtn = el("button", { type: "button", class: `studio-toggle-btn${elData.align === "right" ? " active" : ""}`, title: "Align right" }, ["⟹"]);
      function setTextAlign(a: "left" | "center" | "right") {
        elData!.align = a;
        alignLeftBtn.classList.toggle("active", a === "left");
        alignCenterBtn.classList.toggle("active", a === "center");
        alignRightBtn.classList.toggle("active", a === "right");
        (layer.findOne(`#${elData!.id}`) as Konva.Text | null)?.align(a);
        layer.batchDraw();
        pushHistory();
      }
      alignLeftBtn.addEventListener("click", () => setTextAlign("left"));
      alignCenterBtn.addEventListener("click", () => setTextAlign("center"));
      alignRightBtn.addEventListener("click", () => setTextAlign("right"));

      // ---- Letter spacing / line height ----
      const letterSpacingInput = el("input", { type: "range", min: "-4", max: "40", value: String(elData.letterSpacing ?? 0) }) as HTMLInputElement;
      letterSpacingInput.addEventListener("input", () => {
        elData!.letterSpacing = Number(letterSpacingInput.value);
        (layer.findOne(`#${elData!.id}`) as Konva.Text | null)?.letterSpacing(elData!.letterSpacing);
        layer.batchDraw();
      });
      letterSpacingInput.addEventListener("change", pushHistory);

      const lineHeightInput = el("input", { type: "range", min: "80", max: "250", value: String(Math.round((elData.lineHeight ?? 1.2) * 100)) }) as HTMLInputElement;
      lineHeightInput.addEventListener("input", () => {
        elData!.lineHeight = Number(lineHeightInput.value) / 100;
        (layer.findOne(`#${elData!.id}`) as Konva.Text | null)?.lineHeight(elData!.lineHeight);
        layer.batchDraw();
      });
      lineHeightInput.addEventListener("change", pushHistory);

      // ---- Shadow ----
      const shadowToggle = el("button", { type: "button", class: `studio-toggle-btn${elData.textShadow ? " active" : ""}` }, ["Shadow"]);
      const shadowColorInput = el("input", { type: "color", value: elData.textShadowColor || "#000000" }) as HTMLInputElement;
      const shadowBlurInput = el("input", { type: "range", min: "0", max: "40", value: String(elData.textShadowBlur ?? 8) }) as HTMLInputElement;
      shadowColorInput.style.display = elData.textShadow ? "" : "none";
      shadowBlurInput.style.display = elData.textShadow ? "" : "none";
      const applyShadow = () => {
        const node = layer.findOne(`#${elData!.id}`) as Konva.Text | null;
        node?.shadowColor(elData!.textShadow ? elData!.textShadowColor ?? "#000000" : "");
        node?.shadowBlur(elData!.textShadow ? elData!.textShadowBlur ?? 8 : 0);
        node?.shadowOpacity(elData!.textShadow ? 0.6 : 0);
        node?.shadowOffset(elData!.textShadow ? { x: 3, y: 3 } : { x: 0, y: 0 });
        layer.batchDraw();
      };
      shadowToggle.addEventListener("click", () => {
        elData!.textShadow = !elData!.textShadow;
        shadowToggle.classList.toggle("active", !!elData!.textShadow);
        shadowColorInput.style.display = elData!.textShadow ? "" : "none";
        shadowBlurInput.style.display = elData!.textShadow ? "" : "none";
        applyShadow();
        pushHistory();
      });
      shadowColorInput.addEventListener("input", () => { elData!.textShadowColor = shadowColorInput.value; applyShadow(); });
      shadowColorInput.addEventListener("change", pushHistory);
      shadowBlurInput.addEventListener("input", () => { elData!.textShadowBlur = Number(shadowBlurInput.value); applyShadow(); });
      shadowBlurInput.addEventListener("change", pushHistory);

      // ---- Text presets: one-click style combos, not a separate system from the controls
      // above, just convenient starting points a person can still tweak afterward. ----
      const TEXT_PRESETS: { label: string; fontSize: number; bold: boolean; align: "left" | "center" | "right" }[] = [
        { label: "Heading", fontSize: 96, bold: true, align: "center" },
        { label: "Subheading", fontSize: 56, bold: true, align: "center" },
        { label: "Body", fontSize: 40, bold: false, align: "left" },
        { label: "Logo style", fontSize: 72, bold: true, align: "center" },
      ];
      const presetButtons = TEXT_PRESETS.map((p) => {
        const btn = el("button", { type: "button", class: "studio-icon-btn" }, [p.label]);
        btn.addEventListener("click", () => {
          elData!.fontSize = p.fontSize;
          elData!.bold = p.bold;
          elData!.align = p.align;
          if (p.label === "Logo style") {
            elData!.letterSpacing = 2;
            elData!.textShadow = false;
          }
          render();
          selectElement(elData!.id);
          pushHistory();
        });
        return btn;
      });

      rows.push(
        el("label", { class: "studio-field" }, ["Font", fontSelect]),
        el("label", { class: "studio-field" }, ["Size", sizeInput]),
        el("div", { class: "studio-field-row" }, [boldBtn, italicBtn]),
        el("div", { class: "studio-field-row" }, [alignLeftBtn, alignCenterBtn, alignRightBtn]),
        el("label", { class: "studio-field" }, ["Letter spacing", letterSpacingInput]),
        el("label", { class: "studio-field" }, ["Line height", lineHeightInput]),
        el("div", { class: "studio-field-row" }, [outlineToggle, outlineColorInput]),
        el("div", { class: "studio-field-row" }, [shadowToggle, shadowColorInput, shadowBlurInput]),
        el("div", { class: "studio-field-label" }, ["Text presets"]),
        el("div", { class: "studio-field-row studio-field-row-wrap" }, presetButtons)
      );
    }

    if (elData.kind === "image" && elData.iconRawSvg) {
      const colorInput = el("input", { type: "color", value: elData.iconColor || "#1a1a1a" }) as HTMLInputElement;
      colorInput.addEventListener("input", () => recolorIcon(elData, colorInput.value));
      colorInput.addEventListener("change", pushHistory);
      rows.push(el("label", { class: "studio-field" }, ["Icon color", colorInput]));
    }

    if (elData.kind === "image" && !elData.iconRawSvg) {
      const replaceBtn = el("button", { type: "button", class: "studio-icon-btn" }, [
        elData.placeholderImage ? "Choose photo" : "Replace image",
      ]);
      replaceBtn.addEventListener("click", () => {
        replaceImageTargetId = elData.id;
        replaceImageInput.click();
      });
      rows.push(replaceBtn);

      const photoElId = elData.id;
      const ensureFiltersReady = (): Konva.Image | null => {
        const node = layer.findOne(`#${photoElId}`) as Konva.Image | null;
        if (!node) return null;
        if (!node.filters() || node.filters().length === 0) {
          node.filters([Konva.Filters.Brighten, Konva.Filters.Contrast, Konva.Filters.HSL]);
          node.cache();
        }
        return node;
      };

      const brightnessInput = el("input", {
        type: "range", min: "-100", max: "100", value: String(Math.round((elData.brightness ?? 0) * 100)),
      }) as HTMLInputElement;
      brightnessInput.addEventListener("input", () => {
        elData.brightness = Number(brightnessInput.value) / 100;
        const node = ensureFiltersReady();
        node?.brightness(elData.brightness);
        layer.batchDraw();
      });
      brightnessInput.addEventListener("change", pushHistory);

      const contrastInput = el("input", {
        type: "range", min: "-100", max: "100", value: String(Math.round(elData.contrast ?? 0)),
      }) as HTMLInputElement;
      contrastInput.addEventListener("input", () => {
        elData.contrast = Number(contrastInput.value);
        const node = ensureFiltersReady();
        node?.contrast(elData.contrast);
        layer.batchDraw();
      });
      contrastInput.addEventListener("change", pushHistory);

      const saturationInput = el("input", {
        type: "range", min: "-100", max: "100", value: String(Math.round((elData.saturation ?? 0) * 50)),
      }) as HTMLInputElement;
      saturationInput.addEventListener("input", () => {
        elData.saturation = Number(saturationInput.value) / 50;
        const node = ensureFiltersReady();
        node?.saturation(elData.saturation);
        layer.batchDraw();
      });
      saturationInput.addEventListener("change", pushHistory);

      rows.push(
        el("label", { class: "studio-field" }, ["Brightness", brightnessInput]),
        el("label", { class: "studio-field" }, ["Contrast", contrastInput]),
        el("label", { class: "studio-field" }, ["Saturation", saturationInput])
      );

      const bgBtn = el("button", { type: "button", class: "studio-icon-btn", "data-tour": "remove-bg-btn" }, ["Remove background (Ctrl+Shift+B)"]);
      bgBtn.addEventListener("click", () => removeBackgroundForElement(elData, bgBtn));
      rows.push(bgBtn);

      const vectorizeBtn = el("button", { type: "button", class: "studio-icon-btn", "data-tour": "vectorize-btn" }, ["Vectorize"]);
      vectorizeBtn.addEventListener("click", () => vectorizeElementImage(elData, vectorizeBtn));
      rows.push(vectorizeBtn);

      if (elData.sourceAttribution) {
        const attr = elData.sourceAttribution;
        const parts: string[] = [];
        if (attr.creator) parts.push(`by ${attr.creator}`);
        if (attr.source) parts.push(`via ${attr.source}`);
        const licenseText = attr.license ? `${attr.license}${attr.licenseVersion ? ` ${attr.licenseVersion}` : ""}` : "unknown license";
        const attrNode = el("div", { class: "studio-attribution" }, [
          el("span", { class: "studio-attribution-line" }, [`${attr.title ? `"${attr.title}" ` : ""}${parts.join(" ")}`.trim() || "External asset"]),
          el("span", { class: "studio-attribution-line" }, [`License: ${licenseText}`]),
        ]);
        if (attr.foreignLandingUrl) {
          const link = el("a", { href: attr.foreignLandingUrl, target: "_blank", rel: "noopener noreferrer", class: "studio-attribution-link" }, ["View source"]);
          attrNode.appendChild(link);
        }
        rows.push(attrNode);
      }
    }

    rows.push(el("div", { class: "studio-divider" }));
    rows.push(el("div", { class: "studio-field-label" }, ["Animation"]));

    const animTypeSelect = el("select", { class: "studio-select" }) as HTMLSelectElement;
    for (const opt of ANIM_OPTIONS) animTypeSelect.appendChild(el("option", { value: opt.id }, [opt.label]));
    animTypeSelect.value = elData.anim?.type ?? "none";

    const durationInput = el("input", {
      type: "number", min: "150", max: "5000", step: "50", value: String(elData.anim?.durationMs ?? 600),
    }) as HTMLInputElement;
    const delayInput = el("input", {
      type: "number", min: "0", max: "5000", step: "50", value: String(elData.anim?.delayMs ?? 0),
    }) as HTMLInputElement;
    const durationRow = el("label", { class: "studio-field" }, ["Duration (ms)", durationInput]);
    const delayRow = el("label", { class: "studio-field" }, ["Delay (ms)", delayInput]);

    // ---- Emphasis: a one-time in-place attention beat (pulse/shake/wiggle) after the
    // entrance settles, an animation preset that doesn't move the resting position. ----
    const entranceEndMs = (Number(delayInput.value) || 0) + (Number(durationInput.value) || 600);
    const emphasisSelect = el("select", { class: "studio-select" }) as HTMLSelectElement;
    for (const opt of EMPHASIS_OPTIONS) emphasisSelect.appendChild(el("option", { value: opt.id }, [opt.label]));
    emphasisSelect.value = elData.anim?.emphasisType ?? "none";
    const emphasisDurationInput = el("input", {
      type: "number", min: "150", max: "3000", step: "50", value: String(elData.anim?.emphasisDurationMs ?? 600),
    }) as HTMLInputElement;
    const emphasisDelayInput = el("input", {
      type: "number", min: "0", max: "20000", step: "50", value: String(elData.anim?.emphasisDelayMs ?? entranceEndMs),
    }) as HTMLInputElement;
    const emphasisDurationRow = el("label", { class: "studio-field" }, ["Emphasis duration (ms)", emphasisDurationInput]);
    const emphasisDelayRow = el("label", { class: "studio-field" }, ["Emphasis starts at (ms)", emphasisDelayInput]);

    // ---- Exit: mirrors the entrance outward, plays once, and the element then stays hidden
    // for the rest of the scene. ----
    const exitSelect = el("select", { class: "studio-select" }) as HTMLSelectElement;
    for (const opt of EXIT_OPTIONS) exitSelect.appendChild(el("option", { value: opt.id }, [opt.label]));
    exitSelect.value = elData.anim?.exitType ?? "none";
    const exitDurationInput = el("input", {
      type: "number", min: "150", max: "3000", step: "50", value: String(elData.anim?.exitDurationMs ?? 500),
    }) as HTMLInputElement;
    const exitDelayInput = el("input", {
      type: "number", min: "0", max: "20000", step: "50", value: String(elData.anim?.exitDelayMs ?? entranceEndMs),
    }) as HTMLInputElement;
    const exitDurationRow = el("label", { class: "studio-field" }, ["Exit duration (ms)", exitDurationInput]);
    const exitDelayRow = el("label", { class: "studio-field" }, ["Exit starts at (ms)", exitDelayInput]);

    function syncAnimRowVisibility() {
      const on = animTypeSelect.value !== "none";
      durationRow.style.display = on ? "" : "none";
      delayRow.style.display = on ? "" : "none";
      const emOn = emphasisSelect.value !== "none";
      emphasisDurationRow.style.display = emOn ? "" : "none";
      emphasisDelayRow.style.display = emOn ? "" : "none";
      const exOn = exitSelect.value !== "none";
      exitDurationRow.style.display = exOn ? "" : "none";
      exitDelayRow.style.display = exOn ? "" : "none";
    }

    function commitAnim() {
      const type = animTypeSelect.value as AnimType;
      const exitType = exitSelect.value as ExitType;
      const emphasisType = emphasisSelect.value as EmphasisType;
      if (type === "none" && exitType === "none" && emphasisType === "none") {
        elData!.anim = undefined;
      } else {
        elData!.anim = {
          type,
          durationMs: Math.max(150, Number(durationInput.value) || 600),
          delayMs: Math.max(0, Number(delayInput.value) || 0),
          exitType: exitType !== "none" ? exitType : undefined,
          exitDurationMs: exitType !== "none" ? Math.max(150, Number(exitDurationInput.value) || 500) : undefined,
          exitDelayMs: exitType !== "none" ? Math.max(0, Number(exitDelayInput.value) || 0) : undefined,
          emphasisType: emphasisType !== "none" ? emphasisType : undefined,
          emphasisDurationMs: emphasisType !== "none" ? Math.max(150, Number(emphasisDurationInput.value) || 600) : undefined,
          emphasisDelayMs: emphasisType !== "none" ? Math.max(0, Number(emphasisDelayInput.value) || 0) : undefined,
        };
      }
      syncAnimRowVisibility();
    }

    animTypeSelect.addEventListener("change", () => { commitAnim(); pushHistory(); });
    durationInput.addEventListener("change", () => { commitAnim(); pushHistory(); });
    delayInput.addEventListener("change", () => { commitAnim(); pushHistory(); });
    emphasisSelect.addEventListener("change", () => { commitAnim(); pushHistory(); });
    emphasisDurationInput.addEventListener("change", () => { commitAnim(); pushHistory(); });
    emphasisDelayInput.addEventListener("change", () => { commitAnim(); pushHistory(); });
    exitSelect.addEventListener("change", () => { commitAnim(); pushHistory(); });
    exitDurationInput.addEventListener("change", () => { commitAnim(); pushHistory(); });
    exitDelayInput.addEventListener("change", () => { commitAnim(); pushHistory(); });

    syncAnimRowVisibility();
    rows.push(
      el("label", { class: "studio-field" }, ["Entrance", animTypeSelect]), durationRow, delayRow,
      el("label", { class: "studio-field" }, ["Emphasis", emphasisSelect]), emphasisDurationRow, emphasisDelayRow,
      el("label", { class: "studio-field" }, ["Exit", exitSelect]), exitDurationRow, exitDelayRow
    );

    const dupBtn = el("button", { type: "button", class: "studio-icon-btn" }, ["Duplicate (Ctrl+D)"]);
    dupBtn.addEventListener("click", () => duplicateElement(elData.id));
    rows.push(dupBtn);

    propertiesHost.append(...rows);
  }

  presetSelect.value = preset.id;
  resizeStage();
  render();
  updateHistoryButtons();

  // A template (or a restored autosave, below) can carry non-default fonts. The first render
  // above draws immediately with whatever font is already loaded, so text isn't blocked on
  // network; once the real webfont resolves, re-render so wrapping and metrics are correct.
  if (elements.some((e) => e.kind === "text" && e.fontFamily && e.fontFamily !== "Inter")) {
    ensureFontsLoadedForElements(elements).then(() => render());
  }

  // A template can also carry image elements (a meme layout's placeholder photo slot), which
  // arrive as bare data referencing an imageSrc but no loaded bitmap yet, since imageCache
  // starts empty for a freshly opened editor.
  if (elements.some((e) => e.kind === "image" && e.imageSrc && !imageCache.has(e.id))) {
    loadImageElementsInto(elements).then(() => render());
  }

  // ---------------- Crash / accidental-close recovery ----------------

  async function loadImageElementsInto(list: StudioElement[]): Promise<void> {
    await Promise.all(
      list
        .filter((elData) => elData.kind === "image" && elData.imageSrc)
        .map(
          (elData) =>
            new Promise<void>((resolve) => {
              const img = new Image();
              img.onload = () => {
                imageCache.set(elData.id, img);
                resolve();
              };
              img.onerror = () => resolve(); // a broken layer shouldn't block restoring the rest
              img.src = elData.imageSrc!;
            })
        )
    );
  }

  function hideRecoveryBanner() {
    recoveryBanner.style.display = "none";
    clear(recoveryBanner);
  }

  (async () => {
    const saved = await loadStudioAutosave();
    if (!saved || !Array.isArray(saved.elements) || saved.elements.length === 0) return;

    const restoreBtn = el("button", { type: "button", class: "studio-recovery-btn studio-recovery-restore" }, ["Restore it"]);
    const discardBtn = el("button", { type: "button", class: "studio-recovery-btn studio-recovery-discard" }, ["Discard"]);
    recoveryBanner.appendChild(
      el("div", { class: "studio-recovery-text" }, [
        el("strong", {}, ["Unsaved work found"]),
        el("span", {}, [`From ${formatSavedAt(saved.savedAt)}, in case your browser closed or crashed.`]),
      ])
    );
    recoveryBanner.append(restoreBtn, discardBtn);
    recoveryBanner.style.display = "flex";

    restoreBtn.addEventListener("click", async () => {
      restoreBtn.textContent = "Restoring...";
      (restoreBtn as HTMLButtonElement).disabled = true;
      const restored = (saved.elements as StudioElement[]).map((e) => ({ ...e }));
      await Promise.all([loadImageElementsInto(restored), ensureFontsLoadedForElements(restored)]);
      elements = restored;
      const restoredPreset =
        findPreset(saved.presetId) ??
        (saved.presetWidth && saved.presetHeight
          ? { id: saved.presetId || "custom", label: `Custom (${saved.presetWidth}x${saved.presetHeight})`, width: saved.presetWidth, height: saved.presetHeight }
          : undefined);
      if (restoredPreset) {
        preset = restoredPreset;
        if (!presetSelect.querySelector(`option[value="${preset.id}"]`)) {
          presetSelect.insertBefore(el("option", { value: preset.id }, [preset.label]), presetSelect.firstChild);
        }
      }
      presetSelect.value = preset.id;
      bg.fill(saved.backgroundFill || "#ffffff");
      if (saved.title && saved.title.trim()) {
        designTitle = saved.title;
        titleInput.value = designTitle;
        resizeTitleInput();
      }
      selectedId = null;
      history = [cloneElements(elements)];
      historyIndex = 0;
      resizeStage();
      render();
      updateHistoryButtons();
      hideRecoveryBanner();
    });

    discardBtn.addEventListener("click", () => {
      void clearStudioAutosave();
      hideRecoveryBanner();
    });
  })();

  // Canvas keyboard shortcuts should fire whenever the person isn't actively typing somewhere,
  // not only when literally nothing on the page has focus. Requiring exactly document.body meant
  // that clicking any button first (a rail icon, a Layers/Design tab, a swatch) silently disabled
  // every shortcut until the canvas or empty page was clicked again, which is a trap for a
  // keyboard-and-mouse person switching between the panel and the canvas.
  function isTypingTarget(): boolean {
    const a = document.activeElement;
    if (!a) return false;
    const tag = a.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (a as HTMLElement).isContentEditable;
  }

  document.addEventListener("keydown", function keyHandler(ev) {
    if (!document.body.contains(root)) {
      document.removeEventListener("keydown", keyHandler);
      return;
    }
    if (editingTextarea || isTypingTarget()) return;
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "z") {
      ev.preventDefault();
      if (ev.shiftKey) redo();
      else undo();
    }
    if (ev.key === "Delete" || ev.key === "Backspace") {
      if (selectedId || multiIds.size > 0) {
        ev.preventDefault();
        deleteSelection();
      }
    }
    // Desktop power-editing shortcuts: a mouse-and-keyboard person expects to duplicate, remove
    // a background, and nudge a selected object without reaching for the panel every time (the
    // touch/mobile side of this same tradeoff is the panel itself, sized and laid out for a
    // finger, per the responsive pass elsewhere in this file and in style.css). Each also covers
    // a multi-selection (Shift+click several objects) as a group, not just the primary one.
    if (selectedId || multiIds.size > 0) {
      const el = selectedId ? findElement(selectedId) : undefined;
      if ((ev.ctrlKey || ev.metaKey) && !ev.shiftKey && ev.key.toLowerCase() === "d") {
        ev.preventDefault();
        duplicateSelection();
      } else if ((ev.ctrlKey || ev.metaKey) && ev.shiftKey && ev.key.toLowerCase() === "b") {
        ev.preventDefault();
        if (el && multiIds.size === 0) void removeBackgroundForElement(el);
      } else if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(ev.key)) {
        ev.preventDefault();
        const step = ev.shiftKey ? 10 : 1;
        let dx = 0, dy = 0;
        if (ev.key === "ArrowUp") dy = -step;
        if (ev.key === "ArrowDown") dy = step;
        if (ev.key === "ArrowLeft") dx = -step;
        if (ev.key === "ArrowRight") dx = step;
        for (const id of allSelectedIds()) {
          const target = findElement(id);
          if (!target || target.locked) continue;
          target.x += dx;
          target.y += dy;
          applyGeometryToNode(target);
        }
        layer.batchDraw();
        autosave.schedule();
      }
    }
  });
  document.addEventListener("keyup", (ev) => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(ev.key) && (selectedId || multiIds.size > 0) && !isTypingTarget()) {
      pushHistory();
      // The numeric transform inspector, if it's currently the visible tab, was built once at
      // selection time and doesn't otherwise learn about a keyboard nudge, so it would keep
      // showing the pre-nudge X/Y until the element was reselected. Refresh it in place.
      if (designPane.style.display !== "none") renderProperties();
    }
  });

  requestAnimationFrame(() => resizeTitleInput());

  if (opts.autoLoadImageUrl) {
    fetch(opts.autoLoadImageUrl)
      .then((r) => r.blob())
      .then((blob) => addImage(new File([blob], "demo-image.png", { type: blob.type || "image/png" })))
      .catch(() => {
        // The guided tour degrades gracefully to an empty canvas if this fetch ever fails; it's
        // never the only way to use the editor.
      });
  }

  return root;
}
