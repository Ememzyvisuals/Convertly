import { el, clear } from "../ui/dom";
import { createUploader } from "../ui/upload";
import { segmentedControl, rangeControl, selectControl, estimateStrip } from "../ui/controls";
import { createProcessPanel } from "../ui/processPanel";
import { renderResultPanel } from "../ui/resultPanel";
import { compressImage, estimateImageOutputBytes } from "../lib/compressImage";
import { compressVideo, estimateVideoOutputBytes, type VideoCodec, type VideoPreset } from "../lib/compressVideo";
import { formatBytes, stripExtension } from "../lib/format";
import type { DetectedKind } from "../lib/validate";
import { getUsageStatus, recordCompletedOperation } from "../lib/usageLimit";
import { createUsageStrip, usageLimitReachedPanel } from "../ui/usageBadge";

// ---------------- Image compression ----------------

export function buildCompressImageTool(): HTMLElement {
  const wrap = el("div");
  const otherFilesNote = el("div", { class: "control-hint", style: "margin-bottom:22px" }, [
    "This tool re-encodes images specifically. For any other file type, use Create a zip in Archives, zipping shrinks most files and works on anything.",
  ]);
  wrap.appendChild(otherFilesNote);
  let currentFile: File | null = null;
  let format: "jpeg" | "webp" | "png" = "jpeg";
  let quality = 0.75;
  let resizeEnabled = false;
  let maxDimension = 1920;

  const bodyHost = el("div");
  const processArea = el("div");

  const uploader = createUploader({
    accept: ["png", "jpeg", "webp", "bmp", "gif"] as DetectedKind[],
    acceptLabel: "PNG · JPEG · WebP · BMP",
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

  function resetImageTool() {
    currentFile = null;
    uploader.reset();
    clear(bodyHost);
    clear(processArea);
  }

  function renderBody() {
    clear(bodyHost);
    if (!currentFile) return;
    const file = currentFile;

    const formatCtrl = segmentedControl<"jpeg" | "webp" | "png">(
      "Output format",
      [
        { value: "jpeg", label: "JPEG" },
        { value: "webp", label: "WebP" },
        { value: "png", label: "PNG" },
      ],
      format,
      (v) => {
        format = v;
        renderBody();
      },
      format === "png" ? "PNG is lossless, quality re-encoding won't shrink most photos much." : undefined
    );

    const grid = el("div", { class: "controls-grid" }, [formatCtrl.root]);

    if (format !== "png") {
      const qualityCtrl = rangeControl("Quality", 0.3, 0.95, 0.05, quality, (v) => {
        quality = v;
        updateEstimate();
      }, (v) => v.toFixed(2));
      grid.appendChild(qualityCtrl.root);
    }

    const resizeToggleWrap = el("div", { class: "control" });
    const resizeCtrl = segmentedControl<"keep" | "resize">(
      "Dimensions",
      [
        { value: "keep", label: "Keep original" },
        { value: "resize", label: "Cap longest edge" },
      ],
      resizeEnabled ? "resize" : "keep",
      (v) => {
        resizeEnabled = v === "resize";
        renderBody();
      }
    );
    resizeToggleWrap.appendChild(resizeCtrl.root);
    grid.appendChild(resizeToggleWrap);

    if (resizeEnabled) {
      const dimCtrl = rangeControl(
        "Longest edge (px)",
        320,
        4096,
        16,
        maxDimension,
        (v) => {
          maxDimension = v;
          updateEstimate();
        },
        (v) => String(Math.round(v))
      );
      grid.appendChild(dimCtrl.root);
    }

    const estimateHost = el("div");
    function updateEstimate() {
      clear(estimateHost);
      const est = estimateImageOutputBytes(file.size, format, quality);
      estimateHost.appendChild(
        estimateStrip(
          [
            { label: "Original size", value: formatBytes(file.size) },
            { label: "Estimated output", value: `≈ ${formatBytes(est)}`, muted: true },
            { label: "Estimated change", value: est <= file.size ? `≈ -${(100 - (est / file.size) * 100).toFixed(0)}%` : "≈ larger" },
          ],
          "Estimate only, before processing. Actual results depend on image content."
        )
      );
    }
    updateEstimate();

    const runBtn = el("button", { type: "button", class: "run-btn" }, ["Compress image"]);
    runBtn.addEventListener("click", () =>
      runImageCompress(file, format, quality, resizeEnabled ? maxDimension : undefined, processArea, resetImageTool, usage.refresh)
    );

    bodyHost.append(grid, estimateHost, runBtn);
  }

  const usage = createUsageStrip();
  wrap.append(uploader.root, bodyHost, processArea, usage.root);
  return wrap;
}

async function runImageCompress(
  file: File,
  format: "jpeg" | "webp" | "png",
  quality: number,
  maxDimension: number | undefined,
  processArea: HTMLElement,
  onRunAnother: () => void,
  onUsageChange: () => void
) {
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

  try {
    const result = await compressImage(file, { format, quality, maxDimension });
    panel.setStep("Ready");
    recordCompletedOperation();
    onUsageChange();
    const ms = performance.now() - startedAt;
    const ext = format === "jpeg" ? "jpg" : format;
    const outputName = `${stripExtension(file.name)}-compressed.${ext}`;
    const previewUrl = URL.createObjectURL(result.blob);
    const originalPreviewUrl = URL.createObjectURL(file);

    clear(processArea);
    processArea.appendChild(
      renderResultPanel({
        originalPreviewUrl,
        previewUrl,
        outputName,
        outputFormatLabel: `image/${format}, ${result.width}x${result.height}`,
        originalBytes: file.size,
        outputBytes: result.blob.size,
        processingMs: ms,
        blob: result.blob,
        honestyNote:
          format === "png"
            ? "Unchanged pixels. PNG re-encoding is lossless, so this can end up larger, not smaller, on some images."
            : "Lossy compression at the quality you chose, visually close to the source but not pixel-identical, and result size depends heavily on the image.",
        onRunAnother,
      })
    );
  } catch (err) {
    clear(processArea);
    const message = err instanceof Error ? err.message : "Compression failed on this image.";
    processArea.appendChild(el("div", { class: "validation-error" }, [el("strong", {}, ["Compression failed. "]), message]));
  }
}

// ---------------- Video compression ----------------

export function buildCompressVideoTool(): HTMLElement {
  const wrap = el("div");
  let currentFile: File | null = null;
  let codec: VideoCodec = "h264";
  let crf = 26;
  let preset: VideoPreset = "balanced";
  let resolutionCap: "source" | "1080" | "720" | "480" = "source";
  let audioKbps = 128;

  const bodyHost = el("div");
  const processArea = el("div");

  const otherFilesNote = el("div", { class: "control-hint", style: "margin-bottom:18px" }, [
    "This tool re-encodes video specifically. For any other file type, use Create a zip in Archives, zipping shrinks most files and works on anything.",
  ]);

  const engineNote = el("div", { class: "control-hint", style: "margin-bottom:18px" }, [
    "Runs a real FFmpeg build compiled to WebAssembly, entirely in this tab. The engine (~30 MB) loads once you press Compress. Large files need real time and enough device memory. Very large videos on low-memory phones may fail, and you'll get an honest error rather than a fake result.",
  ]);

  const uploader = createUploader({
    accept: ["mp4", "webm", "mov", "mkv", "avi"] as DetectedKind[],
    acceptLabel: "MP4 · WebM · MOV · MKV · AVI",
    inputAccept: "video/mp4,video/webm,video/quicktime,video/x-matroska,video/x-msvideo",
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

  function renderBody() {
    clear(bodyHost);
    if (!currentFile) return;
    const file = currentFile;

    const codecCtrl = segmentedControl<VideoCodec>(
      "Codec",
      [
        { value: "h264", label: "H.264 (widely compatible)" },
        { value: "vp9", label: "VP9 (smaller, slower)" },
      ],
      codec,
      (v) => {
        codec = v;
        crf = v === "vp9" ? 34 : 26;
        renderBody();
      }
    );

    const crfCtrl = rangeControl(
      "Quality (CRF)",
      codec === "vp9" ? 20 : 18,
      codec === "vp9" ? 45 : 32,
      1,
      crf,
      (v) => {
        crf = v;
        updateEstimate();
      },
      (v) => String(Math.round(v)),
      "Lower = higher quality and larger file. Higher = smaller file, more compression artifacts."
    );

    const resCtrl = selectControl<"source" | "1080" | "720" | "480">(
      "Resolution cap",
      [
        { value: "source", label: "Keep source resolution" },
        { value: "1080", label: "1080p max" },
        { value: "720", label: "720p max" },
        { value: "480", label: "480p max" },
      ],
      resolutionCap,
      (v) => (resolutionCap = v)
    );

    const presetCtrl = segmentedControl<VideoPreset>(
      "Speed vs. compression",
      [
        { value: "fast", label: "Fast" },
        { value: "balanced", label: "Balanced" },
        { value: "small", label: "Smallest" },
      ],
      preset,
      (v) => (preset = v),
      "Smallest takes noticeably longer to encode for a given quality level."
    );

    const audioCtrl = selectControl<string>(
      "Audio bitrate",
      [
        { value: "64", label: "64 kbps" },
        { value: "96", label: "96 kbps" },
        { value: "128", label: "128 kbps" },
        { value: "192", label: "192 kbps" },
      ],
      String(audioKbps),
      (v) => (audioKbps = Number(v))
    );

    const grid = el("div", { class: "controls-grid" }, [codecCtrl.root, crfCtrl.root, resCtrl.root, presetCtrl.root, audioCtrl.root]);

    const estimateHost = el("div");
    function updateEstimate() {
      clear(estimateHost);
      const est = estimateVideoOutputBytes(file.size, crf, codec);
      estimateHost.appendChild(
        estimateStrip(
          [
            { label: "Original size", value: formatBytes(file.size) },
            { label: "Estimated output", value: `≈ ${formatBytes(est)}`, muted: true },
          ],
          "Rough estimate before encoding. Video compression results vary a lot with content (motion, detail, existing bitrate). Not a guarantee."
        )
      );
    }
    updateEstimate();

    const runBtn = el("button", { type: "button", class: "run-btn" }, ["Compress video"]);
    const maxHeight = resolutionCap === "source" ? undefined : Number(resolutionCap);
    runBtn.addEventListener("click", () =>
      runVideoCompress(file, { codec, crf, preset, audioKbps, maxHeight }, processArea, resetVideoTool, usage.refresh)
    );

    bodyHost.append(grid, estimateHost, runBtn);
  }

  function resetVideoTool() {
    currentFile = null;
    uploader.reset();
    clear(bodyHost);
    clear(processArea);
  }

  const usage = createUsageStrip();
  wrap.append(otherFilesNote, engineNote, uploader.root, bodyHost, processArea, usage.root);
  return wrap;
}

async function runVideoCompress(
  file: File,
  opts: { codec: VideoCodec; crf: number; preset: VideoPreset; audioKbps: number; maxHeight?: number },
  processArea: HTMLElement,
  onRunAnother: () => void,
  onUsageChange: () => void
) {
  if (getUsageStatus().atLimit) {
    clear(processArea);
    processArea.appendChild(usageLimitReachedPanel());
    return;
  }
  const startedAt = performance.now();
  const panel = createProcessPanel(["Loading video engine", "Reading file", "Preparing", "Encoding", "Finalizing", "Ready"]);
  clear(processArea);
  processArea.appendChild(panel.root);
  panel.setStep("Loading video engine");
  panel.setProgress(null);

  try {
    const result = await compressVideo(file, opts, ({ phase, ratio }) => {
      panel.setStep(phase);
      if (phase === "Encoding" && ratio !== undefined) {
        panel.setProgress(ratio);
        panel.setCaption(`Encoding, ${Math.round(ratio * 100)}%`);
      } else {
        panel.setProgress(null);
      }
    });

    const ms = performance.now() - startedAt;
    const previewUrl = URL.createObjectURL(result.blob);
    const originalPreviewUrl = URL.createObjectURL(file);
    recordCompletedOperation();
    onUsageChange();

    clear(processArea);
    processArea.appendChild(
      renderResultPanel({
        originalPreviewUrl,
        originalIsVideo: true,
        previewUrl,
        previewIsVideo: true,
        outputName: result.outputName,
        outputFormatLabel: `${opts.codec === "vp9" ? "video/webm (VP9)" : "video/mp4 (H.264)"}, CRF ${opts.crf}`,
        originalBytes: file.size,
        outputBytes: result.blob.size,
        processingMs: ms,
        blob: result.blob,
        honestyNote:
          "Lossy re-encode at the quality setting you chose, smaller file, visually close to the source rather than identical.",
        onRunAnother,
      })
    );
  } catch (err) {
    clear(processArea);
    const message =
      err instanceof Error
        ? `${err.message} Large videos need a lot of memory. Try a lower resolution cap, a shorter clip, or more device memory.`
        : "Video compression failed.";
    processArea.appendChild(el("div", { class: "validation-error" }, [el("strong", {}, ["Compression failed. "]), message]));
  }
}

function tick(): Promise<void> {
  return new Promise((r) => setTimeout(r, 60));
}
