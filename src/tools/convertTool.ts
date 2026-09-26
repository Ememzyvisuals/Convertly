import { el, clear } from "../ui/dom";
import { createUploader } from "../ui/upload";
import { segmentedControl, rangeControl, estimateStrip } from "../ui/controls";
import { createProcessPanel } from "../ui/processPanel";
import { renderResultPanel } from "../ui/resultPanel";
import { convertImage, type OutputFormat, FORMAT_MIME } from "../lib/convert";
import { canEncode } from "../lib/validate";
import { formatBytes, stripExtension } from "../lib/format";
import { removeBackground } from "../lib/bgRemoval";
import { getUsageStatus, recordCompletedOperation } from "../lib/usageLimit";
import { createUsageStrip, usageLimitReachedPanel } from "../ui/usageBadge";

type Mode = "convert" | "remove-bg";

export function buildConvertTool(): HTMLElement {
  const root = el("div", { class: "tool-panel active", id: "panel-convert" });

  let mode: Mode = "convert";
  let format: OutputFormat = "png";
  let quality = 0.85;
  let currentFile: File | null = null;
  let avifSupported = false;

  canEncode("image/avif").then((supported) => {
    avifSupported = supported;
    if (!supported && format === "avif") format = "png";
    render();
  });

  const modeSwitch = segmentedControl<Mode>(
    "What do you want to do",
    [
      { value: "convert", label: "Convert format" },
      { value: "remove-bg", label: "Remove background" },
    ],
    mode,
    (v) => {
      mode = v;
      render();
    }
  );

  const uploaderHost = el("div");
  const bodyHost = el("div");

  function makeUploader() {
    clear(uploaderHost);
    const uploader = createUploader({
      accept: ["png", "jpeg", "webp", "gif", "bmp", "avif"],
      acceptLabel: "PNG · JPEG · WebP · AVIF · GIF · BMP",
      inputAccept: "image/png,image/jpeg,image/webp,image/avif,image/gif,image/bmp",
      onFileReady: (file) => {
        currentFile = file;
        renderBody();
      },
      onCleared: () => {
        currentFile = null;
        renderBody();
      },
    });
    uploaderHost.appendChild(uploader.root);
  }

  function renderBody() {
    clear(bodyHost);
    if (!currentFile) return;

    if (mode === "convert") {
      renderConvertBody(currentFile);
    } else {
      renderBgRemovalBody(currentFile);
    }
  }

  function renderConvertBody(file: File) {
    clear(bodyHost);
    const formatOptions: { value: OutputFormat; label: string }[] = [
      { value: "png", label: "PNG" },
      { value: "jpeg", label: "JPEG" },
      { value: "webp", label: "WebP" },
      ...(avifSupported ? [{ value: "avif" as OutputFormat, label: "AVIF" }] : []),
    ];

    const formatCtrl = segmentedControl<OutputFormat>(
      "Output format",
      formatOptions,
      format,
      (v) => {
        format = v;
        renderConvertBody(file);
      },
      format === "jpeg" ? "Transparency will be flattened onto white. JPEG has no alpha channel." : undefined
    );

    const grid = el("div", { class: "controls-grid" }, [formatCtrl.root]);

    if (format !== "png") {
      const qualityCtrl = rangeControl(
        "Quality",
        0.4,
        1,
        0.05,
        quality,
        (v) => (quality = v),
        (v) => v.toFixed(2)
      );
      grid.appendChild(qualityCtrl.root);
    }

    const runBtn = el("button", { type: "button", class: "run-btn" }, ["Convert file"]);
    runBtn.addEventListener("click", () => runConvert(file));

    bodyHost.append(
      grid,
      estimateStrip(
        [
          { label: "Original size", value: formatBytes(file.size) },
          { label: "Output format", value: format.toUpperCase() },
        ],
        format === "png"
          ? "PNG is lossless, so size depends on image content rather than a quality setting. It can end up larger than a compressed source."
          : "Actual output size depends on image content. A small or already-compressed source can sometimes come out larger, not smaller."
      ),
      runBtn
    );
  }

  async function runConvert(file: File) {
    if (getUsageStatus().atLimit) {
      replaceProcessArea(usageLimitReachedPanel());
      return;
    }
    const startedAt = performance.now();
    const panel = createProcessPanel(["Reading file", "Preparing", "Encoding", "Ready"]);
    replaceProcessArea(panel.root);
    panel.setStep("Reading file");
    await tick();
    panel.setStep("Preparing");
    await tick();
    panel.setStep("Encoding");

    try {
      const result = await convertImage(file, { format, quality });
      panel.setStep("Ready");
      recordCompletedOperation();
      usage.refresh();
      const ms = performance.now() - startedAt;
      const outputName = `${stripExtension(file.name)}.${format === "jpeg" ? "jpg" : format}`;
      const previewUrl = URL.createObjectURL(result.blob);
      const originalPreviewUrl = URL.createObjectURL(file);

      replaceProcessArea(
        renderResultPanel({
          originalPreviewUrl,
          previewUrl,
          outputName,
          outputFormatLabel: `${FORMAT_MIME[format]} · ${result.width}×${result.height}`,
          originalBytes: file.size,
          outputBytes: result.blob.size,
          processingMs: ms,
          blob: result.blob,
          honestyNote:
            format === "png"
              ? "PNG conversion is lossless, pixels are unchanged."
              : "Lossy re-encode at the quality you chose, visually close to the original but not pixel-identical.",
          onRunAnother: () => {
            currentFile = null;
            makeUploader();
            clear(bodyHost);
          },
        })
      );
    } catch (err) {
      replaceProcessArea(errorPanel(err));
    }
  }

  function renderBgRemovalBody(file: File) {
    const note = el("div", { class: "control-hint" }, [
      "Uses a real segmentation model that runs in your browser. On first use it downloads the model (about 15 to 20 MB) from IMG.LY's CDN. Everything after that runs locally.",
    ]);
    const runBtn = el("button", { type: "button", class: "run-btn" }, ["Remove background"]);
    runBtn.addEventListener("click", () => runBgRemoval(file));

    bodyHost.append(
      estimateStrip([
        { label: "Original size", value: formatBytes(file.size) },
        { label: "Output", value: "Transparent PNG" },
      ]),
      note,
      el("div", { style: "height:16px" }),
      runBtn
    );
  }

  async function runBgRemoval(file: File) {
    if (getUsageStatus().atLimit) {
      replaceProcessArea(usageLimitReachedPanel());
      return;
    }
    const startedAt = performance.now();
    const panel = createProcessPanel(["Loading model", "Processing", "Ready"]);
    replaceProcessArea(panel.root);

    try {
      const blob = await removeBackground(file, ({ phase, ratio }) => {
        const mapped = phase.toLowerCase().includes("download") || phase.toLowerCase().includes("loading")
          ? "Loading model"
          : phase === "Ready"
          ? "Ready"
          : "Processing";
        panel.setStep(mapped);
        panel.setProgress(ratio ?? null);
        if (ratio !== undefined) panel.setCaption(`${phase}, ${Math.round(ratio * 100)}%`);
      });

      const ms = performance.now() - startedAt;
      const outputName = `${stripExtension(file.name)}-no-bg.png`;
      const previewUrl = URL.createObjectURL(blob);
      const originalPreviewUrl = URL.createObjectURL(file);
      recordCompletedOperation();
      usage.refresh();

      replaceProcessArea(
        renderResultPanel({
          originalPreviewUrl,
          previewUrl,
          outputName,
          outputFormatLabel: "image/png (transparent)",
          originalBytes: file.size,
          outputBytes: blob.size,
          processingMs: ms,
          blob,
          honestyNote:
            "Background removal is model-based and can make mistakes around fine detail (hair, fur, glass). Check the edges before using the result.",
          onRunAnother: () => {
            currentFile = null;
            makeUploader();
            clear(bodyHost);
          },
        })
      );
    } catch (err) {
      replaceProcessArea(errorPanel(err));
    }
  }

  const processArea = el("div");
  function replaceProcessArea(node: HTMLElement) {
    clear(processArea);
    processArea.appendChild(node);
  }

  const usage = createUsageStrip();

  function render() {
    clear(root);
    modeSwitch.setValue(mode);
    root.append(modeSwitch.root, uploaderHost, bodyHost, processArea, usage.root);
    if (!uploaderHost.hasChildNodes()) makeUploader();
  }

  render();
  return root;
}

function tick(): Promise<void> {
  return new Promise((r) => setTimeout(r, 60));
}

function errorPanel(err: unknown): HTMLElement {
  const message = err instanceof Error ? err.message : "Something went wrong while processing this file.";
  return el("div", { class: "validation-error" }, [el("strong", {}, ["Processing failed. "]), message]);
}
