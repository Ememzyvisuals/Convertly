// The Studio: a real, direct-manipulation visual editor (Canva-style canvas), not a
// configure-and-run converter. Everything here is drag, click, resize and type, live on
// a canvas, powered by Konva (an actual 2D canvas scene graph library, not a facade over
// a still-form-based flow).
import Konva from "konva";
import { el, clear } from "../ui/dom";
import { triggerDownload } from "../lib/format";

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
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  align?: "left" | "center" | "right";
  imageSrc?: string; // data URL, image elements only
}

interface StudioFont {
  id: string;
  label: string;
  family: string;
}

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

interface CanvasPreset {
  id: string;
  label: string;
  width: number;
  height: number;
}
const PRESETS: CanvasPreset[] = [
  { id: "square", label: "Square post (1080x1080)", width: 1080, height: 1080 },
  { id: "story", label: "Story (1080x1920)", width: 1080, height: 1920 },
  { id: "landscape", label: "Landscape (1920x1080)", width: 1920, height: 1080 },
  { id: "poster", label: "Poster (1500x2100)", width: 1500, height: 2100 },
];

let idCounter = 0;
function newId(prefix: string): string {
  idCounter += 1;
  return `${prefix}${idCounter}`;
}

export interface BuildStudioToolOptions {
  /** Pre-populates the canvas, used when opening from a template. */
  initialElements?: StudioElement[];
  /** Canvas size preset id to start on (see PRESETS), defaults to the first preset. */
  initialPresetId?: string;
  /** Shown as a "Back to Studio" control; Studio's dashboard is a separate page, not a tab. */
  onBack?: () => void;
}

export function buildStudioTool(opts: BuildStudioToolOptions = {}): HTMLElement {
  const root = el("div", { class: "studio-panel", id: "panel-studio" });

  let preset: CanvasPreset = PRESETS.find((p) => p.id === opts.initialPresetId) ?? PRESETS[0];
  let elements: StudioElement[] = opts.initialElements ? opts.initialElements.map((e) => ({ ...e })) : [];
  let selectedId: string | null = null;
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
  }

  function undo() {
    if (historyIndex <= 0) return;
    historyIndex -= 1;
    elements = cloneElements(history[historyIndex]);
    render();
    updateHistoryButtons();
  }

  function redo() {
    if (historyIndex >= history.length - 1) return;
    historyIndex += 1;
    elements = cloneElements(history[historyIndex]);
    render();
    updateHistoryButtons();
  }

  // ---------------- Header controls ----------------

  const presetSelect = el("select", { class: "studio-select" }) as HTMLSelectElement;
  for (const p of PRESETS) presetSelect.appendChild(el("option", { value: p.id }, [p.label]));
  presetSelect.addEventListener("change", () => {
    preset = PRESETS.find((p) => p.id === presetSelect.value) ?? PRESETS[0];
    resizeStage();
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

  const topBar = el("div", { class: "studio-topbar" }, [
    ...(opts.onBack
      ? [
          (() => {
            const backBtn = el("button", { type: "button", class: "studio-icon-btn studio-back-btn" }, [
              "← Back to Studio",
            ]);
            backBtn.addEventListener("click", () => opts.onBack!());
            return backBtn;
          })(),
        ]
      : []),
    el("label", { class: "studio-field" }, ["Canvas", presetSelect]),
    el("div", { class: "studio-topbar-spacer" }),
    undoBtn,
    redoBtn,
    exportFormatSelect,
    downloadBtn,
  ]);

  // ---------------- Add-element toolbar ----------------

  const addTextBtn = el("button", { type: "button", class: "studio-tool-btn" }, ["+ Text"]);
  const addRectBtn = el("button", { type: "button", class: "studio-tool-btn" }, ["+ Rectangle"]);
  const addCircleBtn = el("button", { type: "button", class: "studio-tool-btn" }, ["+ Circle"]);
  const addImageBtn = el("button", { type: "button", class: "studio-tool-btn" }, ["+ Image"]);
  const imageInput = el("input", { type: "file", accept: "image/png,image/jpeg,image/webp", class: "sr-only" }) as HTMLInputElement;
  addImageBtn.addEventListener("click", () => imageInput.click());
  imageInput.addEventListener("change", () => {
    const file = imageInput.files?.[0];
    if (file) addImage(file);
    imageInput.value = "";
  });

  addTextBtn.addEventListener("click", () => addText());
  addRectBtn.addEventListener("click", () => addRect());
  addCircleBtn.addEventListener("click", () => addCircle());

  const toolRow = el("div", { class: "studio-tool-row" }, [addTextBtn, addRectBtn, addCircleBtn, addImageBtn, imageInput]);

  // ---------------- Canvas + layers layout ----------------

  const canvasHost = el("div", { class: "studio-canvas-host" });
  const layersList = el("div", { class: "studio-layers-list" });
  const propertiesHost = el("div", { class: "studio-properties" });

  const sideCol = el("div", { class: "studio-side" }, [
    el("div", { class: "studio-side-section" }, [el("h4", {}, ["Layers"]), layersList]),
    el("div", { class: "studio-side-section" }, [el("h4", {}, ["Properties"]), propertiesHost]),
  ]);

  const workArea = el("div", { class: "studio-work-area" }, [canvasHost, sideCol]);

  root.append(
    el("div", { class: "control-hint" }, [
      "A real visual canvas: drag elements to move them, use the corner handles to resize or rotate, double-click text to edit it. Nothing here is a settings form.",
    ]),
    topBar,
    toolRow,
    workArea
  );

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
    const available = canvasHost.parentElement?.clientWidth || canvasHost.clientWidth || 0;
    const hostWidth = available > 0 ? Math.min(available, 640) : 640;
    const scale = Math.min(hostWidth / preset.width, 640 / preset.width, 1) || 1;
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

  function deselect() {
    selectedId = null;
    transformer.nodes([]);
    layer.batchDraw();
    renderLayersList();
    renderProperties();
  }

  function findElement(id: string): StudioElement | undefined {
    return elements.find((e) => e.id === id);
  }

  function selectElement(id: string) {
    selectedId = id;
    const node = layer.findOne(`#${id}`);
    if (node) transformer.nodes([node]);
    layer.batchDraw();
    renderLayersList();
    renderProperties();
  }

  function commitNodeGeometry(node: Konva.Node, elId: string) {
    const elData = findElement(elId);
    if (!elData) return;
    elData.x = node.x();
    elData.y = node.y();
    elData.rotation = node.rotation();
    elData.scaleX = node.scaleX();
    elData.scaleY = node.scaleY();
    pushHistory();
  }

  function attachCommonHandlers(shapeNode: Konva.Shape | Konva.Text | Konva.Image, elData: StudioElement) {
    const node = shapeNode as unknown as Konva.Node;
    node.id(elData.id);
    node.draggable(true);
    node.on("click tap", (evt) => {
      evt.cancelBubble = true;
      selectElement(elData.id);
    });
    node.on("dragend", () => commitNodeGeometry(node, elData.id));
    node.on("transformend", () => commitNodeGeometry(node, elData.id));
    if (elData.kind === "text") {
      node.on("dblclick dbltap", () => beginTextEdit(shapeNode as Konva.Text, elData));
    }
  }

  function buildKonvaNode(elData: StudioElement): Konva.Shape | Konva.Text | Konva.Image {
    if (elData.kind === "rect") {
      return new Konva.Rect({
        x: elData.x, y: elData.y, rotation: elData.rotation, scaleX: elData.scaleX, scaleY: elData.scaleY,
        width: elData.width, height: elData.height, fill: elData.fill, cornerRadius: 12,
      });
    }
    if (elData.kind === "circle") {
      return new Konva.Circle({
        x: elData.x, y: elData.y, rotation: elData.rotation, scaleX: elData.scaleX, scaleY: elData.scaleY,
        radius: elData.width / 2, fill: elData.fill,
      });
    }
    if (elData.kind === "image") {
      const img = imageCache.get(elData.id);
      const node = new Konva.Image({
        x: elData.x, y: elData.y, rotation: elData.rotation, scaleX: elData.scaleX, scaleY: elData.scaleY,
        width: elData.width, height: elData.height, image: img,
      });
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
      transformer.nodes(node ? [node] : []);
    } else {
      selectedId = null;
      transformer.nodes([]);
    }
    layer.batchDraw();
    renderLayersList();
    renderProperties();
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

  // ---------------- Layers panel ----------------

  function renderLayersList() {
    clear(layersList);
    if (elements.length === 0) {
      layersList.appendChild(el("div", { class: "control-hint" }, ["No layers yet, add text, a shape or an image above."]));
      return;
    }
    for (let i = elements.length - 1; i >= 0; i -= 1) {
      const elData = elements[i];
      const row = el("div", { class: `studio-layer-row${elData.id === selectedId ? " active" : ""}` });
      const nameSpan = el("span", { class: "studio-layer-name" }, [
        elData.kind === "text" ? `"${(elData.text ?? "").slice(0, 18)}"` : elData.kind[0].toUpperCase() + elData.kind.slice(1),
      ]);
      nameSpan.addEventListener("click", () => selectElement(elData.id));
      const upBtn = el("button", { type: "button", class: "studio-icon-btn", title: "Bring forward" }, ["↑"]);
      const downBtn = el("button", { type: "button", class: "studio-icon-btn", title: "Send backward" }, ["↓"]);
      const delBtn = el("button", { type: "button", class: "studio-icon-btn", title: "Delete" }, ["✕"]);
      upBtn.addEventListener("click", () => moveLayer(elData.id, 1));
      downBtn.addEventListener("click", () => moveLayer(elData.id, -1));
      delBtn.addEventListener("click", () => deleteLayer(elData.id));
      row.append(nameSpan, upBtn, downBtn, delBtn);
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

  function renderProperties() {
    clear(propertiesHost);
    const elData = selectedId ? findElement(selectedId) : undefined;
    if (!elData) {
      propertiesHost.appendChild(el("div", { class: "control-hint" }, ["Select something on the canvas to edit it."]));
      return;
    }

    const rows: HTMLElement[] = [];
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

      rows.push(
        el("label", { class: "studio-field" }, ["Font", fontSelect]),
        el("label", { class: "studio-field" }, ["Size", sizeInput]),
        el("div", { class: "studio-field-row" }, [boldBtn, italicBtn])
      );
    }

    if (elData.kind === "image") {
      const bgBtn = el("button", { type: "button", class: "studio-icon-btn" }, ["Remove background"]);
      bgBtn.addEventListener("click", async () => {
        bgBtn.textContent = "Removing background...";
        (bgBtn as HTMLButtonElement).disabled = true;
        try {
          const src = elData.imageSrc!;
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
          bgBtn.textContent = "Couldn't remove background, try again";
        } finally {
          (bgBtn as HTMLButtonElement).disabled = false;
          if (bgBtn.textContent === "Removing background...") bgBtn.textContent = "Remove background";
        }
      });
      rows.push(bgBtn);
    }

    const dupBtn = el("button", { type: "button", class: "studio-icon-btn" }, ["Duplicate"]);
    dupBtn.addEventListener("click", () => {
      const copy: StudioElement = { ...elData, id: newId(elData.kind), x: elData.x + 24, y: elData.y + 24 };
      if (elData.kind === "image") imageCache.set(copy.id, imageCache.get(elData.id)!);
      elements.push(copy);
      render();
      selectElement(copy.id);
      pushHistory();
    });
    rows.push(dupBtn);

    propertiesHost.append(...rows);
  }

  presetSelect.value = preset.id;
  resizeStage();
  render();
  updateHistoryButtons();

  document.addEventListener("keydown", function keyHandler(ev) {
    if (!document.body.contains(root)) {
      document.removeEventListener("keydown", keyHandler);
      return;
    }
    if (editingTextarea) return;
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "z") {
      ev.preventDefault();
      if (ev.shiftKey) redo();
      else undo();
    }
    if (ev.key === "Delete" || ev.key === "Backspace") {
      if (selectedId && document.activeElement === document.body) {
        ev.preventDefault();
        deleteLayer(selectedId);
      }
    }
  });

  return root;
}
