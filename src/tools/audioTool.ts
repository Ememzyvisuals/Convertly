import { el, clear } from "../ui/dom";
import { createUploader } from "../ui/upload";
import { segmentedControl, rangeControl, selectControl, checkboxControl } from "../ui/controls";
import { createProcessPanel } from "../ui/processPanel";
import { renderResultPanel } from "../ui/resultPanel";
import { convertAudio, getAudioDuration, type AudioFormat } from "../lib/audioTools";
import { formatDuration } from "../lib/format";
import type { DetectedKind } from "../lib/validate";
import { getUsageStatus, recordCompletedOperation } from "../lib/usageLimit";
import { createUsageStrip, usageLimitReachedPanel } from "../ui/usageBadge";

export function buildAudioTool(): HTMLElement {
  const root = el("div");

  let currentFile: File | null = null;
  let sourceDuration = 0;
  let format: AudioFormat = "mp3";
  let bitrateKbps = 192;
  let sampleRate: "source" | "44100" | "48000" | "22050" = "source";
  let channels: "source" | "1" | "2" = "source";
  let normalize = false;
  let trimEnabled = false;
  let trimStart = 0;
  let trimEnd = 0;

  const engineNote = el("div", { class: "control-hint", style: "margin-bottom:18px" }, [
    "Uses the same FFmpeg WebAssembly build as video compression, entirely in this tab. The engine (~30 MB) loads once, on your first run in this session.",
  ]);

  const bodyHost = el("div");
  const processArea = el("div");

  const uploader = createUploader({
    accept: ["mp3", "wav", "ogg", "flac", "m4a"] as DetectedKind[],
    acceptLabel: "MP3 · WAV · OGG · FLAC · M4A",
    inputAccept: "audio/mpeg,audio/wav,audio/ogg,audio/flac,audio/mp4,audio/x-m4a",
    onFileReady: async (file) => {
      currentFile = file;
      sourceDuration = await getAudioDuration(file).catch(() => 0);
      trimStart = 0;
      trimEnd = sourceDuration;
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

    const formatCtrl = segmentedControl<AudioFormat>(
      "Output format",
      [
        { value: "mp3", label: "MP3" },
        { value: "wav", label: "WAV" },
        { value: "flac", label: "FLAC" },
        { value: "ogg", label: "OGG" },
        { value: "m4a", label: "M4A" },
      ],
      format,
      (v) => {
        format = v;
        renderBody();
      },
      format === "wav" || format === "flac" ? "Lossless, output size depends on duration and channels, not a bitrate slider." : undefined
    );

    const grid = el("div", { class: "controls-grid" }, [formatCtrl.root]);

    if (format !== "wav" && format !== "flac") {
      const bitrateCtrl = selectControl<string>(
        "Bitrate",
        [
          { value: "96", label: "96 kbps" },
          { value: "128", label: "128 kbps" },
          { value: "192", label: "192 kbps" },
          { value: "256", label: "256 kbps" },
          { value: "320", label: "320 kbps" },
        ],
        String(bitrateKbps),
        (v) => (bitrateKbps = Number(v))
      );
      grid.appendChild(bitrateCtrl.root);
    }

    const sampleCtrl = selectControl<"source" | "44100" | "48000" | "22050">(
      "Sample rate",
      [
        { value: "source", label: "Keep source" },
        { value: "44100", label: "44.1 kHz" },
        { value: "48000", label: "48 kHz" },
        { value: "22050", label: "22.05 kHz (smaller, phone-call quality)" },
      ],
      sampleRate,
      (v) => (sampleRate = v)
    );
    grid.appendChild(sampleCtrl.root);

    const channelCtrl = selectControl<"source" | "1" | "2">(
      "Channels",
      [
        { value: "source", label: "Keep source" },
        { value: "2", label: "Stereo" },
        { value: "1", label: "Mono (smaller file)" },
      ],
      channels,
      (v) => (channels = v)
    );
    grid.appendChild(channelCtrl.root);

    const normalizeCtrl = checkboxControl("Normalize loudness (EBU R128, -16 LUFS)", normalize, (v) => (normalize = v));
    grid.appendChild(normalizeCtrl.root);

    bodyHost.appendChild(grid);

    if (sourceDuration > 0) {
      const trimToggle = checkboxControl("Trim to a range", trimEnabled, (v) => {
        trimEnabled = v;
        renderBody();
      });
      bodyHost.appendChild(trimToggle.root);

      if (trimEnabled) {
        const startCtrl = rangeControl(
          "Start",
          0,
          sourceDuration,
          0.5,
          trimStart,
          (v) => {
            trimStart = Math.min(v, trimEnd);
          },
          (v) => formatDuration(v * 1000)
        );
        const endCtrl = rangeControl(
          "End",
          0,
          sourceDuration,
          0.5,
          trimEnd,
          (v) => {
            trimEnd = Math.max(v, trimStart);
          },
          (v) => formatDuration(v * 1000)
        );
        bodyHost.append(startCtrl.root, endCtrl.root);
      }
    }

    const runBtn = el("button", { type: "button", class: "run-btn" }, ["Convert audio"]);
    runBtn.addEventListener("click", () =>
      run(
        file,
        {
          format,
          bitrateKbps,
          sampleRate: sampleRate === "source" ? undefined : Number(sampleRate),
          channels: channels === "source" ? undefined : (Number(channels) as 1 | 2),
          normalize,
          trimStart: trimEnabled ? trimStart : undefined,
          trimEnd: trimEnabled ? trimEnd : undefined,
        },
        usage.refresh
      )
    );
    bodyHost.appendChild(runBtn);
  }

  async function run(
    file: File,
    opts: Parameters<typeof convertAudio>[1],
    onUsageChange: () => void
  ) {
    if (getUsageStatus().atLimit) {
      clear(processArea);
      processArea.appendChild(usageLimitReachedPanel());
      return;
    }
    const startedAt = performance.now();
    const panel = createProcessPanel(["Loading engine", "Reading file", "Preparing", "Encoding", "Finalizing", "Ready"]);
    clear(processArea);
    processArea.appendChild(panel.root);
    panel.setStep("Loading engine");
    panel.setProgress(null);

    try {
      const result = await convertAudio(file, opts, ({ phase, ratio }) => {
        panel.setStep(phase);
        if (phase === "Encoding" && ratio !== undefined) {
          panel.setProgress(ratio);
          panel.setCaption(`Encoding, ${Math.round(ratio * 100)}%`);
        } else {
          panel.setProgress(null);
        }
      });

      const ms = performance.now() - startedAt;
      recordCompletedOperation();
      onUsageChange();
      clear(processArea);
      const previewUrl = URL.createObjectURL(result.blob);
      processArea.appendChild(
        renderResultPanel({
          previewUrl,
          previewIsAudio: true,
          outputName: result.outputName,
          outputFormatLabel: `audio/${opts.format}`,
          originalBytes: file.size,
          outputBytes: result.blob.size,
          processingMs: ms,
          blob: result.blob,
          honestyNote:
            opts.format === "wav" || opts.format === "flac"
              ? "Lossless re-encode. Size mainly reflects duration, sample rate and channel count, not compression."
              : "Lossy re-encode at the bitrate you chose, result size depends on the source content and length.",
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
      const message =
        err instanceof Error
          ? `${err.message} Very long audio files need real memory and time to process.`
          : "Audio conversion failed.";
      processArea.appendChild(el("div", { class: "validation-error" }, [el("strong", {}, ["Conversion failed. "]), message]));
    }
  }

  const usage = createUsageStrip();
  root.append(engineNote, uploader.root, bodyHost, processArea, usage.root);
  return root;
}
