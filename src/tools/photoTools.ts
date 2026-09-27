import { el, clear } from "../ui/dom";
import { createUploader } from "../ui/upload";
import { checkboxControl, segmentedControl, rangeControl, estimateStrip } from "../ui/controls";
import { createProcessPanel } from "../ui/processPanel";
import { renderResultPanel } from "../ui/resultPanel";
import { decodeImageFile, canvasToBlob } from "../lib/convert";
import { stripExtension } from "../lib/format";
import { getUsageStatus, recordCompletedOperation } from "../lib/usageLimit";
import { createUsageStrip, usageLimitReachedPanel } from "../ui/usageBadge";

// Every tool here draws the source image onto an in-memory canvas, edits the pixels, and
// re-encodes to a blob in the same format the source came in (falling back to PNG for formats
// canvas can't re-encode, like GIF or BMP), the same "same format in, same format out" default
// convertTool.ts uses for anything that isn't an explicit format conversion.

function outputMime(sourceType: string): string {
  if (sourceType === "image/jpeg" || sourceType === "image/webp" || sourceType === "image/png") return sourceType;
  return "image/png";
}

function extFor(mime: string): string {
  return mime === "image/jpeg" ? "jpg" : mime === "image/webp" ? "webp" : "png";
}

function tick(): Promise<void> {
  return new Promise((r) => setTimeout(r, 60));
}

function errorPanel(err: unknown): HTMLElement {
  const message = err instanceof Error ? err.message : "Something went wrong while processing this file.";
  return el("div", { class: "validation-error" }, [el("strong", {}, ["Processing failed. "]), message]);
}

const IMAGE_UPLOADER_OPTS = {
  accept: ["png", "jpeg", "webp", "gif", "bmp"] as const,
  acceptLabel: "PNG · JPEG · WebP · GIF · BMP",
  inputAccept: "image/png,image/jpeg,image/webp,image/gif,image/bmp",
};

// ---------------- Resize ----------------

export function buildResizeImageTool(): HTMLElement {
  const root = el("div", { class: "tool-panel active" });
  const usage = createUsageStrip();
  const uploaderHost = el("div");
  const bodyHost = el("div");
  const processArea = el("div");

  let file: File | null = null;
  let origW = 0;
  let origH = 0;
  let width = 0;
  let height = 0;
  let lockRatio = true;

  function makeUploader() {
    clear(uploaderHost);
    const uploader = createUploader({
      ...IMAGE_UPLOADER_OPTS,
      accept: [...IMAGE_UPLOADER_OPTS.accept],
      onFileReady: async (f) => {
        file = f;
        const bitmap = await createImageBitmap(f);
        origW = width = bitmap.width;
        origH = height = bitmap.height;
        bitmap.close();
        renderBody();
      },
      onCleared: () => {
        file = null;
        clear(bodyHost);
        clear(processArea);
      },
    });
    uploaderHost.appendChild(uploader.root);
  }

  function renderBody() {
    clear(bodyHost);
    const widthInput = el("input", { type: "number", min: "1", value: String(width) }) as HTMLInputElement;
    const heightInput = el("input", { type: "number", min: "1", value: String(height) }) as HTMLInputElement;

    widthInput.addEventListener("input", () => {
      width = Math.max(1, Math.round(Number(widthInput.value) || 1));
      if (lockRatio && origW > 0) {
        height = Math.max(1, Math.round((width * origH) / origW));
        heightInput.value = String(height);
      }
    });
    heightInput.addEventListener("input", () => {
      height = Math.max(1, Math.round(Number(heightInput.value) || 1));
      if (lockRatio && origH > 0) {
        width = Math.max(1, Math.round((height * origW) / origH));
        widthInput.value = String(width);
      }
    });

    const lockCtrl = checkboxControl("Lock aspect ratio", lockRatio, (v) => (lockRatio = v));

    const dimensionsRow = el("div", { class: "controls-grid" }, [
      el("div", { class: "control" }, [el("label", {}, ["Width (px)"]), widthInput]),
      el("div", { class: "control" }, [el("label", {}, ["Height (px)"]), heightInput]),
    ]);

    const presetRow = el("div", { class: "result-actions" });
    for (const pct of [25, 50, 75, 150, 200]) {
      const b = el("button", { type: "button", class: "secondary-btn" }, [`${pct}%`]);
      b.addEventListener("click", () => {
        width = Math.max(1, Math.round((origW * pct) / 100));
        height = Math.max(1, Math.round((origH * pct) / 100));
        widthInput.value = String(width);
        heightInput.value = String(height);
      });
      presetRow.appendChild(b);
    }

    const runBtn = el("button", { type: "button", class: "run-btn" }, ["Resize image"]);
    runBtn.addEventListener("click", runResize);

    bodyHost.append(
      estimateStrip([{ label: "Original size", value: `${origW} x ${origH} px` }]),
      dimensionsRow,
      lockCtrl.root,
      presetRow,
      el("div", { style: "height:16px" }),
      runBtn
    );
  }

  async function runResize() {
    if (!file) return;
    if (getUsageStatus().atLimit) {
      replaceProcess(usageLimitReachedPanel());
      return;
    }
    const startedAt = performance.now();
    const panel = createProcessPanel(["Reading file", "Resizing", "Ready"]);
    replaceProcess(panel.root);
    panel.setStep("Reading file");
    await tick();
    panel.setStep("Resizing");

    try {
      const { bitmap } = await decodeImageFile(file);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      const mime = outputMime(file.type);
      if (mime === "image/jpeg") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
      }
      ctx.drawImage(bitmap, 0, 0, width, height);
      bitmap.close();
      const blob = await canvasToBlob(canvas, mime, mime === "image/png" ? undefined : 0.9);
      panel.setStep("Ready");
      recordCompletedOperation();
      usage.refresh();
      const ms = performance.now() - startedAt;
      replaceProcess(
        renderResultPanel({
          originalPreviewUrl: URL.createObjectURL(file),
          previewUrl: URL.createObjectURL(blob),
          outputName: `${stripExtension(file.name)}-resized.${extFor(mime)}`,
          outputFormatLabel: `${mime} · ${width}x${height}`,
          originalBytes: file.size,
          outputBytes: blob.size,
          processingMs: ms,
          blob,
          honestyNote:
            "This changes pixel dimensions only, it's not a smart upscaler. Enlarging a small image will look soft, not sharper.",
          onRunAnother: () => {
            makeUploader();
            clear(bodyHost);
          },
        })
      );
    } catch (err) {
      replaceProcess(errorPanel(err));
    }
  }

  function replaceProcess(node: HTMLElement) {
    clear(processArea);
    processArea.appendChild(node);
  }

  makeUploader();
  root.append(uploaderHost, bodyHost, processArea, usage.root);
  return root;
}

// ---------------- Filter ----------------

type FilterKind = "none" | "grayscale" | "sepia" | "invert" | "brightness" | "contrast" | "saturate" | "blur";

const FILTER_DEFAULTS: Record<FilterKind, number> = {
  none: 0,
  grayscale: 100,
  sepia: 100,
  invert: 100,
  brightness: 130,
  contrast: 130,
  saturate: 160,
  blur: 3,
};

function cssFilterFor(kind: FilterKind, amount: number): string {
  switch (kind) {
    case "grayscale":
      return `grayscale(${amount}%)`;
    case "sepia":
      return `sepia(${amount}%)`;
    case "invert":
      return `invert(${amount}%)`;
    case "brightness":
      return `brightness(${amount}%)`;
    case "contrast":
      return `contrast(${amount}%)`;
    case "saturate":
      return `saturate(${amount}%)`;
    case "blur":
      return `blur(${amount}px)`;
    default:
      return "none";
  }
}

export function buildFilterImageTool(): HTMLElement {
  const root = el("div", { class: "tool-panel active" });
  const usage = createUsageStrip();
  const uploaderHost = el("div");
  const bodyHost = el("div");
  const processArea = el("div");

  let file: File | null = null;
  let bitmap: ImageBitmap | null = null;
  let kind: FilterKind = "grayscale";
  let amount = FILTER_DEFAULTS.grayscale;
  const previewCanvas = el("canvas") as HTMLCanvasElement;

  function makeUploader() {
    clear(uploaderHost);
    const uploader = createUploader({
      ...IMAGE_UPLOADER_OPTS,
      accept: [...IMAGE_UPLOADER_OPTS.accept],
      onFileReady: async (f) => {
        file = f;
        bitmap = await createImageBitmap(f);
        renderBody();
      },
      onCleared: () => {
        file = null;
        bitmap?.close();
        bitmap = null;
        clear(bodyHost);
        clear(processArea);
      },
    });
    uploaderHost.appendChild(uploader.root);
  }

  function drawPreview() {
    if (!bitmap) return;
    const maxDim = 480;
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    previewCanvas.width = Math.round(bitmap.width * scale);
    previewCanvas.height = Math.round(bitmap.height * scale);
    const ctx = previewCanvas.getContext("2d")!;
    ctx.filter = cssFilterFor(kind, amount);
    ctx.drawImage(bitmap, 0, 0, previewCanvas.width, previewCanvas.height);
    ctx.filter = "none";
  }

  function renderBody() {
    clear(bodyHost);

    const filterCtrl = segmentedControl<FilterKind>(
      "Filter",
      [
        { value: "grayscale", label: "Grayscale" },
        { value: "sepia", label: "Sepia" },
        { value: "invert", label: "Invert" },
        { value: "brightness", label: "Brightness" },
        { value: "contrast", label: "Contrast" },
        { value: "saturate", label: "Saturation" },
        { value: "blur", label: "Blur" },
      ],
      kind,
      (v) => {
        kind = v;
        amount = FILTER_DEFAULTS[v];
        rangeHost.replaceChildren(buildRangeCtrl().root);
        drawPreview();
      }
    );

    function buildRangeCtrl() {
      const isBlur = kind === "blur";
      return rangeControl(
        isBlur ? "Blur (px)" : "Intensity",
        isBlur ? 0 : kind === "brightness" || kind === "contrast" || kind === "saturate" ? 50 : 0,
        isBlur ? 20 : kind === "brightness" || kind === "contrast" || kind === "saturate" ? 250 : 100,
        1,
        amount,
        (v) => {
          amount = v;
          drawPreview();
        },
        (v) => (isBlur ? `${v}px` : `${v}%`)
      );
    }

    const rangeHost = el("div");
    rangeHost.appendChild(buildRangeCtrl().root);

    const runBtn = el("button", { type: "button", class: "run-btn" }, ["Apply filter"]);
    runBtn.addEventListener("click", runFilter);

    drawPreview();

    bodyHost.append(
      el("div", { class: "controls-grid" }, [filterCtrl.root, rangeHost]),
      el("div", { class: "qr-preview" }, [previewCanvas]),
      el("div", { style: "height:16px" }),
      runBtn
    );
  }

  async function runFilter() {
    if (!file || !bitmap) return;
    if (getUsageStatus().atLimit) {
      replaceProcess(usageLimitReachedPanel());
      return;
    }
    const startedAt = performance.now();
    try {
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext("2d")!;
      const mime = outputMime(file.type);
      if (mime === "image/jpeg") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.filter = cssFilterFor(kind, amount);
      ctx.drawImage(bitmap, 0, 0);
      ctx.filter = "none";
      const blob = await canvasToBlob(canvas, mime, mime === "image/png" ? undefined : 0.9);
      recordCompletedOperation();
      usage.refresh();
      const ms = performance.now() - startedAt;
      replaceProcess(
        renderResultPanel({
          originalPreviewUrl: URL.createObjectURL(file),
          previewUrl: URL.createObjectURL(blob),
          outputName: `${stripExtension(file.name)}-${kind}.${extFor(mime)}`,
          outputFormatLabel: `${mime} · ${canvas.width}x${canvas.height}`,
          originalBytes: file.size,
          outputBytes: blob.size,
          processingMs: ms,
          blob,
          honestyNote: "A full-resolution re-render of the filtered pixels, not a preview screenshot.",
          onRunAnother: () => {
            makeUploader();
            clear(bodyHost);
          },
        })
      );
    } catch (err) {
      replaceProcess(errorPanel(err));
    }
  }

  function replaceProcess(node: HTMLElement) {
    clear(processArea);
    processArea.appendChild(node);
  }

  makeUploader();
  root.append(uploaderHost, bodyHost, processArea, usage.root);
  return root;
}

// ---------------- Watermark ----------------

type Anchor = "tl" | "tc" | "tr" | "cl" | "cc" | "cr" | "bl" | "bc" | "br";

function anchorPosition(anchor: Anchor, canvasW: number, canvasH: number, textW: number, textH: number, margin: number) {
  const xs: Record<string, number> = { l: margin, c: (canvasW - textW) / 2, r: canvasW - textW - margin };
  const ys: Record<string, number> = { t: margin + textH, c: (canvasH + textH) / 2, b: canvasH - margin };
  const col = anchor[1] as "l" | "c" | "r";
  const row = anchor[0] as "t" | "c" | "b";
  return { x: xs[col], y: ys[row] };
}

export function buildWatermarkImageTool(): HTMLElement {
  const root = el("div", { class: "tool-panel active" });
  const usage = createUsageStrip();
  const uploaderHost = el("div");
  const bodyHost = el("div");
  const processArea = el("div");

  let file: File | null = null;
  let bitmap: ImageBitmap | null = null;
  let text = "";
  let anchor: Anchor = "br";
  let opacity = 0.6;
  let sizePct = 4; // font size as a percentage of the image's smaller dimension
  let color = "#ffffff";
  const previewCanvas = el("canvas") as HTMLCanvasElement;

  function makeUploader() {
    clear(uploaderHost);
    const uploader = createUploader({
      ...IMAGE_UPLOADER_OPTS,
      accept: [...IMAGE_UPLOADER_OPTS.accept],
      onFileReady: async (f) => {
        file = f;
        bitmap = await createImageBitmap(f);
        renderBody();
      },
      onCleared: () => {
        file = null;
        bitmap?.close();
        bitmap = null;
        clear(bodyHost);
        clear(processArea);
      },
    });
    uploaderHost.appendChild(uploader.root);
  }

  function drawWatermark(ctx: CanvasRenderingContext2D, w: number, h: number) {
    if (!text.trim()) return;
    const fontSize = Math.max(10, Math.round((Math.min(w, h) * sizePct) / 100));
    ctx.font = `600 ${fontSize}px var(--font-body, sans-serif)`;
    ctx.font = `600 ${fontSize}px Outfit, sans-serif`;
    ctx.globalAlpha = opacity;
    ctx.fillStyle = color;
    ctx.textBaseline = "alphabetic";
    const metrics = ctx.measureText(text);
    const margin = Math.round(Math.min(w, h) * 0.04) + 8;
    const { x, y } = anchorPosition(anchor, w, h, metrics.width, fontSize, margin);
    ctx.fillText(text, x, y);
    ctx.globalAlpha = 1;
  }

  function drawPreview() {
    if (!bitmap) return;
    const maxDim = 480;
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    previewCanvas.width = Math.round(bitmap.width * scale);
    previewCanvas.height = Math.round(bitmap.height * scale);
    const ctx = previewCanvas.getContext("2d")!;
    ctx.drawImage(bitmap, 0, 0, previewCanvas.width, previewCanvas.height);
    drawWatermark(ctx, previewCanvas.width, previewCanvas.height);
  }

  const anchorLabels: { value: Anchor; label: string }[] = [
    { value: "tl", label: "Top left" },
    { value: "tc", label: "Top center" },
    { value: "tr", label: "Top right" },
    { value: "cl", label: "Middle left" },
    { value: "cc", label: "Center" },
    { value: "cr", label: "Middle right" },
    { value: "bl", label: "Bottom left" },
    { value: "bc", label: "Bottom center" },
    { value: "br", label: "Bottom right" },
  ];

  function renderBody() {
    clear(bodyHost);

    const textInput = el("input", { type: "text", value: text, placeholder: "@yourname or (c) Your Name" }) as HTMLInputElement;
    textInput.addEventListener("input", () => {
      text = textInput.value;
      drawPreview();
    });

    const anchorSelect = el("select", {}) as HTMLSelectElement;
    for (const a of anchorLabels) {
      const o = el("option", { value: a.value }, [a.label]) as HTMLOptionElement;
      if (a.value === anchor) o.selected = true;
      anchorSelect.appendChild(o);
    }
    anchorSelect.addEventListener("change", () => {
      anchor = anchorSelect.value as Anchor;
      drawPreview();
    });

    const colorInput = el("input", { type: "color", value: color }) as HTMLInputElement;
    colorInput.addEventListener("input", () => {
      color = colorInput.value;
      drawPreview();
    });

    const opacityCtrl = rangeControl(
      "Opacity",
      0.1,
      1,
      0.05,
      opacity,
      (v) => {
        opacity = v;
        drawPreview();
      },
      (v) => `${Math.round(v * 100)}%`
    );
    const sizeCtrl = rangeControl(
      "Text size",
      1,
      10,
      0.5,
      sizePct,
      (v) => {
        sizePct = v;
        drawPreview();
      },
      (v) => `${v}%`
    );

    const runBtn = el("button", { type: "button", class: "run-btn" }, ["Add watermark"]);
    runBtn.addEventListener("click", runWatermark);

    drawPreview();

    bodyHost.append(
      el("div", { class: "controls-grid" }, [
        el("div", { class: "control" }, [el("label", {}, ["Watermark text"]), textInput]),
        el("div", { class: "control" }, [el("label", {}, ["Position"]), anchorSelect]),
        el("div", { class: "control" }, [el("label", {}, ["Color"]), colorInput]),
        opacityCtrl.root,
        sizeCtrl.root,
      ]),
      el("div", { class: "qr-preview" }, [previewCanvas]),
      el("div", { style: "height:16px" }),
      runBtn
    );
  }

  async function runWatermark() {
    if (!file || !bitmap) return;
    if (!text.trim()) {
      replaceProcess(el("div", { class: "validation-error" }, [el("strong", {}, ["Nothing to add. "]), "Type some watermark text first."]));
      return;
    }
    if (getUsageStatus().atLimit) {
      replaceProcess(usageLimitReachedPanel());
      return;
    }
    const startedAt = performance.now();
    try {
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext("2d")!;
      const mime = outputMime(file.type);
      if (mime === "image/jpeg") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.drawImage(bitmap, 0, 0);
      drawWatermark(ctx, canvas.width, canvas.height);
      const blob = await canvasToBlob(canvas, mime, mime === "image/png" ? undefined : 0.9);
      recordCompletedOperation();
      usage.refresh();
      const ms = performance.now() - startedAt;
      replaceProcess(
        renderResultPanel({
          originalPreviewUrl: URL.createObjectURL(file),
          previewUrl: URL.createObjectURL(blob),
          outputName: `${stripExtension(file.name)}-watermarked.${extFor(mime)}`,
          outputFormatLabel: `${mime} · ${canvas.width}x${canvas.height}`,
          originalBytes: file.size,
          outputBytes: blob.size,
          processingMs: ms,
          blob,
          honestyNote: "The watermark is baked into the pixels at full resolution, cropping the image doesn't automatically remove it.",
          onRunAnother: () => {
            makeUploader();
            clear(bodyHost);
          },
        })
      );
    } catch (err) {
      replaceProcess(errorPanel(err));
    }
  }

  function replaceProcess(node: HTMLElement) {
    clear(processArea);
    processArea.appendChild(node);
  }

  makeUploader();
  root.append(uploaderHost, bodyHost, processArea, usage.root);
  return root;
}

// ---------------- Crop ----------------

interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function buildCropImageTool(): HTMLElement {
  const root = el("div", { class: "tool-panel active" });
  const usage = createUsageStrip();
  const uploaderHost = el("div");
  const bodyHost = el("div");
  const processArea = el("div");

  let file: File | null = null;
  let bitmap: ImageBitmap | null = null;

  function makeUploader() {
    clear(uploaderHost);
    const uploader = createUploader({
      ...IMAGE_UPLOADER_OPTS,
      accept: [...IMAGE_UPLOADER_OPTS.accept],
      onFileReady: async (f) => {
        file = f;
        bitmap = await createImageBitmap(f);
        renderBody();
      },
      onCleared: () => {
        file = null;
        bitmap?.close();
        bitmap = null;
        clear(bodyHost);
        clear(processArea);
      },
    });
    uploaderHost.appendChild(uploader.root);
  }

  function renderBody() {
    clear(bodyHost);
    if (!bitmap) return;

    const maxDim = 520;
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const dispW = Math.round(bitmap.width * scale);
    const dispH = Math.round(bitmap.height * scale);

    const stage = el("div", {
      class: "crop-stage",
      style: `width:${dispW}px;height:${dispH}px;`,
    });
    const img = el("img", { src: URL.createObjectURL(file!), class: "crop-stage-img", draggable: "false" });
    stage.appendChild(img);

    // Start with a centered box covering 70% of the image, in display pixels.
    let box: CropRect = { x: dispW * 0.15, y: dispH * 0.15, w: dispW * 0.7, h: dispH * 0.7 };

    const boxEl = el("div", { class: "crop-box" });
    const handles: Record<string, HTMLElement> = {};
    for (const h of ["nw", "ne", "sw", "se"]) {
      const handle = el("div", { class: `crop-handle crop-handle-${h}` });
      handles[h] = handle;
      boxEl.appendChild(handle);
    }
    stage.appendChild(boxEl);

    function syncBoxStyle() {
      boxEl.style.left = `${box.x}px`;
      boxEl.style.top = `${box.y}px`;
      boxEl.style.width = `${box.w}px`;
      boxEl.style.height = `${box.h}px`;
    }
    syncBoxStyle();

    function clampBox() {
      box.w = Math.max(20, Math.min(box.w, dispW));
      box.h = Math.max(20, Math.min(box.h, dispH));
      box.x = Math.max(0, Math.min(box.x, dispW - box.w));
      box.y = Math.max(0, Math.min(box.y, dispH - box.h));
    }

    boxEl.addEventListener(
      "pointerdown",
      (e) => {
        if ((e.target as HTMLElement).classList.contains("crop-handle")) return;
        const startX = e.clientX;
        const startY = e.clientY;
        const startBox = { ...box };
        e.preventDefault();
        const move = (ev: PointerEvent) => {
          box.x = startBox.x + (ev.clientX - startX);
          box.y = startBox.y + (ev.clientY - startY);
          clampBox();
          syncBoxStyle();
        };
        const up = () => {
          window.removeEventListener("pointermove", move);
          window.removeEventListener("pointerup", up);
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
      },
      { passive: false }
    );

    function bindHandle(name: "nw" | "ne" | "sw" | "se") {
      handles[name].addEventListener(
        "pointerdown",
        (e) => {
          e.preventDefault();
          e.stopPropagation();
          const startX = e.clientX;
          const startY = e.clientY;
          const startBox = { ...box };
          const move = (ev: PointerEvent) => {
            const dx = ev.clientX - startX;
            const dy = ev.clientY - startY;
            if (name === "nw") {
              box.x = startBox.x + dx;
              box.y = startBox.y + dy;
              box.w = startBox.w - dx;
              box.h = startBox.h - dy;
            } else if (name === "ne") {
              box.y = startBox.y + dy;
              box.w = startBox.w + dx;
              box.h = startBox.h - dy;
            } else if (name === "sw") {
              box.x = startBox.x + dx;
              box.w = startBox.w - dx;
              box.h = startBox.h + dy;
            } else {
              box.w = startBox.w + dx;
              box.h = startBox.h + dy;
            }
            clampBox();
            syncBoxStyle();
          };
          const up = () => {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", up);
          };
          window.addEventListener("pointermove", move);
          window.addEventListener("pointerup", up);
        },
        { passive: false }
      );
    }
    bindHandle("nw");
    bindHandle("ne");
    bindHandle("sw");
    bindHandle("se");

    const runBtn = el("button", { type: "button", class: "run-btn" }, ["Crop image"]);
    runBtn.addEventListener("click", () => runCrop(box, scale));

    bodyHost.append(
      el("div", { class: "control-hint" }, ["Drag the box to move it, drag a corner to resize it, then crop."]),
      stage,
      el("div", { style: "height:16px" }),
      runBtn
    );
  }

  async function runCrop(box: CropRect, scale: number) {
    if (!file || !bitmap) return;
    if (getUsageStatus().atLimit) {
      replaceProcess(usageLimitReachedPanel());
      return;
    }
    const startedAt = performance.now();
    try {
      // Display coordinates back to the original image's real pixel grid.
      const sx = Math.round(box.x / scale);
      const sy = Math.round(box.y / scale);
      const sw = Math.round(box.w / scale);
      const sh = Math.round(box.h / scale);
      const canvas = document.createElement("canvas");
      canvas.width = sw;
      canvas.height = sh;
      const ctx = canvas.getContext("2d")!;
      const mime = outputMime(file.type);
      if (mime === "image/jpeg") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, sw, sh);
      }
      ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, sw, sh);
      const blob = await canvasToBlob(canvas, mime, mime === "image/png" ? undefined : 0.9);
      recordCompletedOperation();
      usage.refresh();
      const ms = performance.now() - startedAt;
      replaceProcess(
        renderResultPanel({
          originalPreviewUrl: URL.createObjectURL(file),
          previewUrl: URL.createObjectURL(blob),
          outputName: `${stripExtension(file.name)}-cropped.${extFor(mime)}`,
          outputFormatLabel: `${mime} · ${sw}x${sh}`,
          originalBytes: file.size,
          outputBytes: blob.size,
          processingMs: ms,
          blob,
          honestyNote: "Cropped at full resolution from the original file, not from the smaller on-screen preview.",
          onRunAnother: () => {
            makeUploader();
            clear(bodyHost);
          },
        })
      );
    } catch (err) {
      replaceProcess(errorPanel(err));
    }
  }

  function replaceProcess(node: HTMLElement) {
    clear(processArea);
    processArea.appendChild(node);
  }

  makeUploader();
  root.append(uploaderHost, bodyHost, processArea, usage.root);
  return root;
}
