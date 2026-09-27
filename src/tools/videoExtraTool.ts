import { el, clear } from "../ui/dom";
import { createUploader } from "../ui/upload";
import { rangeControl } from "../ui/controls";
import { createProcessPanel } from "../ui/processPanel";
import { renderResultPanel } from "../ui/resultPanel";
import { trimVideo, videoToGif, extractAudioFromVideo, replaceVideoAudio, getVideoDuration } from "../lib/videoTools";
import { formatDuration } from "../lib/format";
import type { DetectedKind } from "../lib/validate";
import { getUsageStatus, recordCompletedOperation } from "../lib/usageLimit";
import { createUsageStrip, usageLimitReachedPanel } from "../ui/usageBadge";

const ACCEPT: DetectedKind[] = ["mp4", "webm", "mov", "mkv", "avi"];
const INPUT_ACCEPT = "video/mp4,video/webm,video/quicktime,video/x-matroska,video/x-msvideo";
const AUDIO_OR_VIDEO_ACCEPT: DetectedKind[] = ["mp3", "wav", "ogg", "flac", "m4a", "mp4", "webm", "mov", "mkv", "avi"];
const AUDIO_OR_VIDEO_INPUT_ACCEPT =
  "audio/mpeg,audio/wav,audio/ogg,audio/flac,audio/mp4,audio/x-m4a,video/mp4,video/webm,video/quicktime,video/x-matroska,video/x-msvideo";

function engineNoteEl(): HTMLElement {
  return el("div", { class: "control-hint", style: "margin-bottom:18px" }, [
    "Runs the same real FFmpeg WebAssembly build used for video compression, entirely in this tab.",
  ]);
}

function errorBox(message: string): HTMLElement {
  return el("div", { class: "validation-error" }, [el("strong", {}, ["Something went wrong. "]), message]);
}

// ---------------- Trim ----------------

export function buildTrimVideoTool(): HTMLElement {
  const wrap = el("div");
  let currentFile: File | null = null;
  let duration = 0;
  let start = 0;
  let end = 0;

  const bodyHost = el("div");
  const processArea = el("div");
  const usage = createUsageStrip();

  const uploader = createUploader({
    accept: ACCEPT,
    acceptLabel: "MP4 · WebM · MOV · MKV · AVI",
    inputAccept: INPUT_ACCEPT,
    onFileReady: async (file) => {
      currentFile = file;
      duration = await getVideoDuration(file).catch(() => 0);
      start = 0;
      end = duration;
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

    // Some browsers or unusual containers can't report duration up front even though FFmpeg
    // can still process the file just fine, so fall back to a generous range rather than
    // blocking the tool entirely.
    const known = duration > 0;
    const rangeMax = known ? duration : 3600;
    if (!known) {
      bodyHost.appendChild(
        el("div", { class: "control-hint" }, [
          "Couldn't detect this video's exact length, so the sliders below go up to 60 minutes. Set an end time past the real end and it's simply clamped to it.",
        ])
      );
    }
    if (end === 0) end = rangeMax;

    const startCtrl = rangeControl("Start", 0, rangeMax, 0.1, start, (v) => (start = Math.min(v, end)), (v) => formatDuration(v * 1000));
    const endCtrl = rangeControl("End", 0, rangeMax, 0.1, end, (v) => (end = Math.max(v, start)), (v) => formatDuration(v * 1000));

    const runBtn = el("button", { type: "button", class: "run-btn" }, ["Trim video"]);
    runBtn.addEventListener("click", () => run(file, start, end));

    bodyHost.append(startCtrl.root, endCtrl.root, runBtn);
  }

  async function run(file: File, s: number, e: number) {
    if (getUsageStatus().atLimit) {
      clear(processArea);
      processArea.appendChild(usageLimitReachedPanel());
      return;
    }
    const startedAt = performance.now();
    const panel = createProcessPanel(["Loading engine", "Reading file", "Trimming", "Finalizing", "Ready"]);
    clear(processArea);
    processArea.appendChild(panel.root);
    panel.setStep("Loading engine");
    try {
      const result = await trimVideo(file, s, e, ({ phase, ratio }) => {
        panel.setStep(phase);
        panel.setProgress(ratio ?? null);
      });
      const ms = performance.now() - startedAt;
      recordCompletedOperation();
      usage.refresh();
      clear(processArea);
      const previewUrl = URL.createObjectURL(result.blob);
      processArea.appendChild(
        renderResultPanel({
          previewUrl,
          previewIsVideo: true,
          outputName: result.outputName,
          outputFormatLabel: "video/mp4",
          originalBytes: file.size,
          outputBytes: result.blob.size,
          processingMs: ms,
          blob: result.blob,
          honestyNote: "Re-encoded to land exactly on the times you chose. Quality is close to source, not bit-identical.",
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
      processArea.appendChild(errorBox(err instanceof Error ? err.message : "Could not trim this video."));
    }
  }

  wrap.append(engineNoteEl(), uploader.root, bodyHost, processArea, usage.root);
  return wrap;
}

// ---------------- Video to GIF ----------------

export function buildVideoToGifTool(): HTMLElement {
  const wrap = el("div");
  let currentFile: File | null = null;
  let duration = 0;
  let start = 0;
  let clipDuration = 3;
  let fps = 12;
  let width = 480;

  const bodyHost = el("div");
  const processArea = el("div");
  const usage = createUsageStrip();

  const uploader = createUploader({
    accept: ACCEPT,
    acceptLabel: "MP4 · WebM · MOV · MKV · AVI",
    inputAccept: INPUT_ACCEPT,
    onFileReady: async (file) => {
      currentFile = file;
      duration = await getVideoDuration(file).catch(() => 0);
      start = 0;
      clipDuration = Math.min(3, duration || 3);
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

    const grid = el("div", { class: "controls-grid" });
    const known = duration > 0;

    if (!known) {
      bodyHost.appendChild(
        el("div", { class: "control-hint" }, [
          "Couldn't detect this video's exact length, so clip start goes up to 60 minutes. Set a start past the real end and it's simply clamped to it.",
        ])
      );
    }

    const startCtrl = rangeControl(
      "Clip start",
      0,
      known ? Math.max(0, duration - 0.5) : 3600,
      0.1,
      start,
      (v) => (start = v),
      (v) => formatDuration(v * 1000)
    );
    grid.appendChild(startCtrl.root);

    const durCtrl = rangeControl(
      "Clip length",
      0.5,
      known ? Math.min(10, duration) : 10,
      0.5,
      clipDuration,
      (v) => (clipDuration = v),
      (v) => `${v.toFixed(1)}s`,
      "Kept short on purpose, long GIFs get huge fast."
    );
    grid.appendChild(durCtrl.root);

    const fpsCtrl = rangeControl("Frame rate", 5, 24, 1, fps, (v) => (fps = v), (v) => `${v} fps`);
    grid.appendChild(fpsCtrl.root);

    const widthCtrl = rangeControl("Width (px)", 160, 720, 20, width, (v) => (width = v), (v) => `${v}px`);
    grid.appendChild(widthCtrl.root);

    const runBtn = el("button", { type: "button", class: "run-btn" }, ["Convert to GIF"]);
    runBtn.addEventListener("click", () => run(file));

    bodyHost.append(grid, runBtn);
  }

  async function run(file: File) {
    if (getUsageStatus().atLimit) {
      clear(processArea);
      processArea.appendChild(usageLimitReachedPanel());
      return;
    }
    const startedAt = performance.now();
    const panel = createProcessPanel(["Loading engine", "Reading file", "Building palette", "Encoding", "Finalizing", "Ready"]);
    clear(processArea);
    processArea.appendChild(panel.root);
    panel.setStep("Loading engine");
    try {
      const result = await videoToGif(
        file,
        { fps, widthPx: width, startSec: start, durationSec: clipDuration },
        ({ phase, ratio }) => {
          panel.setStep(phase);
          panel.setProgress(ratio ?? null);
        }
      );
      const ms = performance.now() - startedAt;
      recordCompletedOperation();
      usage.refresh();
      clear(processArea);
      const previewUrl = URL.createObjectURL(result.blob);
      processArea.appendChild(
        renderResultPanel({
          previewUrl,
          outputName: result.outputName,
          outputFormatLabel: "image/gif",
          originalBytes: file.size,
          outputBytes: result.blob.size,
          processingMs: ms,
          blob: result.blob,
          honestyNote:
            "Real two-pass palette generation, not a lossy shortcut. GIFs are still big for how they look, that's the format, not this tool.",
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
      processArea.appendChild(errorBox(err instanceof Error ? err.message : "Could not build a GIF from this video."));
    }
  }

  wrap.append(engineNoteEl(), uploader.root, bodyHost, processArea, usage.root);
  return wrap;
}

// ---------------- Extract audio ----------------

export function buildExtractAudioTool(): HTMLElement {
  const wrap = el("div");
  const processArea = el("div");
  const usage = createUsageStrip();

  const uploader = createUploader({
    accept: ACCEPT,
    acceptLabel: "MP4 · WebM · MOV · MKV · AVI",
    inputAccept: INPUT_ACCEPT,
    onFileReady: (file) => run(file),
    onCleared: () => clear(processArea),
  });

  async function run(file: File) {
    if (getUsageStatus().atLimit) {
      clear(processArea);
      processArea.appendChild(usageLimitReachedPanel());
      return;
    }
    const startedAt = performance.now();
    const panel = createProcessPanel(["Loading engine", "Reading file", "Extracting", "Finalizing", "Ready"]);
    clear(processArea);
    processArea.appendChild(panel.root);
    panel.setStep("Loading engine");
    try {
      const result = await extractAudioFromVideo(file, ({ phase, ratio }) => {
        panel.setStep(phase);
        panel.setProgress(ratio ?? null);
      });
      const ms = performance.now() - startedAt;
      recordCompletedOperation();
      usage.refresh();
      clear(processArea);
      const previewUrl = URL.createObjectURL(result.blob);
      processArea.appendChild(
        renderResultPanel({
          previewUrl,
          previewIsAudio: true,
          outputName: result.outputName,
          outputFormatLabel: "audio/mp3, 192 kbps",
          originalBytes: file.size,
          outputBytes: result.blob.size,
          processingMs: ms,
          blob: result.blob,
          honestyNote: "The video's audio track, re-encoded to MP3 at 192 kbps, video dropped.",
        })
      );
    } catch (err) {
      clear(processArea);
      processArea.appendChild(errorBox(err instanceof Error ? err.message : "Could not extract audio from this video."));
    }
  }

  wrap.append(engineNoteEl(), uploader.root, processArea, usage.root);
  return wrap;
}

// ---------------- Replace audio ----------------

export function buildReplaceAudioTool(): HTMLElement {
  const wrap = el("div");
  let videoFile: File | null = null;
  let audioFile: File | null = null;

  const bodyHost = el("div");
  const processArea = el("div");
  const usage = createUsageStrip();

  const videoLabel = el("div", { class: "control-hint" }, ["1. The video whose sound you want to change"]);
  const videoUploader = createUploader({
    accept: ACCEPT,
    acceptLabel: "MP4 · WebM · MOV · MKV · AVI",
    inputAccept: INPUT_ACCEPT,
    onFileReady: (file) => {
      videoFile = file;
      renderBody();
    },
    onCleared: () => {
      videoFile = null;
      renderBody();
    },
  });

  const audioLabel = el("div", { class: "control-hint", style: "margin-top:22px" }, [
    "2. The new sound, an audio file or another video (its audio is used, its picture is ignored)",
  ]);
  const audioUploader = createUploader({
    accept: AUDIO_OR_VIDEO_ACCEPT,
    acceptLabel: "MP3 · WAV · OGG · FLAC · M4A, or a video for its audio track",
    inputAccept: AUDIO_OR_VIDEO_INPUT_ACCEPT,
    onFileReady: (file) => {
      audioFile = file;
      renderBody();
    },
    onCleared: () => {
      audioFile = null;
      renderBody();
    },
  });

  function renderBody() {
    clear(bodyHost);
    if (!videoFile || !audioFile) return;
    const v = videoFile;
    const a = audioFile;
    const runBtn = el("button", { type: "button", class: "run-btn" }, ["Replace audio"]);
    runBtn.addEventListener("click", () => run(v, a));
    bodyHost.appendChild(runBtn);
  }

  async function run(video: File, audio: File) {
    if (getUsageStatus().atLimit) {
      clear(processArea);
      processArea.appendChild(usageLimitReachedPanel());
      return;
    }
    const startedAt = performance.now();
    const panel = createProcessPanel(["Loading engine", "Reading files", "Muxing", "Finalizing", "Ready"]);
    clear(processArea);
    processArea.appendChild(panel.root);
    panel.setStep("Loading engine");
    try {
      const result = await replaceVideoAudio(video, audio, ({ phase, ratio }) => {
        panel.setStep(phase);
        panel.setProgress(ratio ?? null);
      });
      const ms = performance.now() - startedAt;
      recordCompletedOperation();
      usage.refresh();
      clear(processArea);
      const previewUrl = URL.createObjectURL(result.blob);
      processArea.appendChild(
        renderResultPanel({
          previewUrl,
          previewIsVideo: true,
          outputName: result.outputName,
          outputFormatLabel: "video, new audio track",
          originalBytes: video.size,
          outputBytes: result.blob.size,
          processingMs: ms,
          blob: result.blob,
          honestyNote:
            "The original picture, muxed with the new audio. The video's own sound is dropped entirely, and the result runs as long as whichever of the two inputs is shorter.",
          onRunAnother: () => {
            videoFile = null;
            audioFile = null;
            videoUploader.reset();
            audioUploader.reset();
            clear(bodyHost);
            clear(processArea);
          },
        })
      );
    } catch (err) {
      clear(processArea);
      processArea.appendChild(errorBox(err instanceof Error ? err.message : "Could not replace this video's audio."));
    }
  }

  wrap.append(engineNoteEl(), videoLabel, videoUploader.root, audioLabel, audioUploader.root, bodyHost, processArea, usage.root);
  return wrap;
}
