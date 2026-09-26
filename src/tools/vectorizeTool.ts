import { el, clear } from "../ui/dom";
import { createUploader } from "../ui/upload";
import { segmentedControl, estimateStrip } from "../ui/controls";
import { createProcessPanel } from "../ui/processPanel";
import { renderResultPanel } from "../ui/resultPanel";
import { vectorizeImage } from "../lib/vectorize";
import { formatBytes, stripExtension } from "../lib/format";
import { getUsageStatus, recordCompletedOperation } from "../lib/usageLimit";
import { createUsageStrip, usageLimitReachedPanel } from "../ui/usageBadge";

type Detail = "simple" | "balanced" | "detailed";

const PRESETS: Record<Detail, { colorCount: number; smoothing: number; noiseReduction: number; preserveCorners: boolean }> = {
  simple: { colorCount: 6, smoothing: 2.5, noiseReduction: 16, preserveCorners: true },
  balanced: { colorCount: 16, smoothing: 1, noiseReduction: 8, preserveCorners: true },
  detailed: { colorCount: 32, smoothing: 0.4, noiseReduction: 2, preserveCorners: false },
};

export function buildVectorizeTool(): HTMLElement {
  const root = el("div", { class: "tool-panel", id: "panel-vectorize" });

  let currentFile: File | null = null;
  let detail: Detail = "balanced";

  const uploaderHost = el("div");
  const bodyHost = el("div");
  const processArea = el("div");

  const uploader = createUploader({
    accept: ["png", "jpeg", "webp", "bmp", "gif"],
    acceptLabel: "PNG, JPEG, WebP, BMP. Best on logos, icons and flat-color art",
    inputAccept: "image/png,image/jpeg,image/webp,image/bmp,image/gif",
    onFileReady: (file) => {
      currentFile = file;
      renderBody();
    },
    onCleared: () => {
      currentFile = null;
      clear(bodyHost);
      clear(processArea);
    },
  });
  uploaderHost.appendChild(uploader.root);

  function renderBody() {
    clear(bodyHost);
    if (!currentFile) return;
    const file = currentFile;

    const detailCtrl = segmentedControl<Detail>(
      "Detail level",
      [
        { value: "simple", label: "Simple" },
        { value: "balanced", label: "Balanced" },
        { value: "detailed", label: "Detailed" },
      ],
      detail,
      (v) => (detail = v),
      "Simple gives flat, poster-like shapes. Detailed keeps more color and fine edges."
    );

    bodyHost.append(
      el("div", { class: "controls-grid" }, [detailCtrl.root]),
      estimateStrip(
        [{ label: "Original size", value: formatBytes(file.size) }],
        "Photographs will not become clean editable vectors. This works best on logos, icons and flat illustrations."
      )
    );

    const runBtn = el("button", { type: "button", class: "run-btn" }, ["Vectorize"]);
    runBtn.addEventListener("click", () => runVectorize(file));
    bodyHost.appendChild(runBtn);
  }

  async function runVectorize(file: File) {
    if (getUsageStatus().atLimit) {
      clear(processArea);
      processArea.appendChild(usageLimitReachedPanel());
      return;
    }
    const startedAt = performance.now();
    const panel = createProcessPanel(["Reading file", "Preparing", "Encoding", "Ready"]);
    clear(processArea);
    processArea.appendChild(panel.root);
    panel.setStep("Reading file");
    await tick();
    panel.setStep("Preparing");
    await tick();
    panel.setStep("Encoding");
    panel.setCaption("Tracing paths. This can take a moment on detailed images.");

    try {
      const { svg, width, height } = await vectorizeImage(file, PRESETS[detail]);
      panel.setStep("Ready");
      recordCompletedOperation();
      usage.refresh();

      const ms = performance.now() - startedAt;
      const blob = new Blob([svg], { type: "image/svg+xml" });
      const outputName = `${stripExtension(file.name)}.svg`;
      const previewUrl = URL.createObjectURL(blob);
      const originalPreviewUrl = URL.createObjectURL(file);

      clear(processArea);
      processArea.appendChild(
        renderResultPanel({
          originalPreviewUrl,
          previewUrl,
          outputName,
          outputFormatLabel: `image/svg+xml, ${width}x${height} source`,
          originalBytes: file.size,
          outputBytes: blob.size,
          processingMs: ms,
          blob,
          honestyNote:
            "Traced automatically. Check paths before using this as a production vector asset, especially for text or fine detail.",
          onRunAnother: () => {
            currentFile = null;
            uploader.reset();
            clear(bodyHost);
            clear(processArea);
          },
        })
      );
    } catch (err) {
      clear(processArea);
      const message = err instanceof Error ? err.message : "Tracing failed on this image.";
      processArea.appendChild(el("div", { class: "validation-error" }, [el("strong", {}, ["Vectorizing failed. "]), message]));
    }
  }

  const usage = createUsageStrip();
  root.append(uploaderHost, bodyHost, processArea, usage.root);
  return root;
}

function tick(): Promise<void> {
  return new Promise((r) => setTimeout(r, 60));
}
