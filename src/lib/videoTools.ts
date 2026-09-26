// Extra real video operations beyond straight compression, same shared FFmpeg WASM engine.
import { getExtension, stripExtension } from "./format";
import { getFFmpeg, type ProgressCallback } from "./ffmpegEngine";

export interface TrimResult {
  blob: Blob;
  outputName: string;
}

export async function trimVideo(file: File, startSec: number, endSec: number, onProgress: ProgressCallback): Promise<TrimResult> {
  const ffmpeg = await getFFmpeg(onProgress);
  const progressHandler = ({ progress }: { progress: number }) => {
    if (Number.isFinite(progress) && progress >= 0 && progress <= 1) onProgress({ phase: "Trimming", ratio: progress });
  };
  ffmpeg.on("progress", progressHandler);

  const inExt = getExtension(file.name) || "mp4";
  const inputName = `input.${inExt}`;
  const outputName = `${stripExtension(file.name)}-trimmed.${inExt}`;

  try {
    onProgress({ phase: "Reading file" });
    const { fetchFile } = await import("@ffmpeg/util");
    await ffmpeg.writeFile(inputName, await fetchFile(file));

    onProgress({ phase: "Trimming" });
    // Re-encode (rather than stream-copy) so the cut lands exactly on the requested times,
    // stream-copy trims can only cut on keyframes and would drift from what the user picked.
    await ffmpeg.exec([
      "-i", inputName,
      "-ss", String(startSec),
      "-to", String(endSec),
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
      "-c:a", "aac", "-b:a", "160k",
      outputName,
    ]);

    onProgress({ phase: "Finalizing" });
    const data = await ffmpeg.readFile(outputName);
    const blob = new Blob([data.buffer ?? data], { type: "video/mp4" });

    await ffmpeg.deleteFile(inputName).catch(() => {});
    await ffmpeg.deleteFile(outputName).catch(() => {});

    onProgress({ phase: "Ready", ratio: 1 });
    return { blob, outputName };
  } finally {
    ffmpeg.off("progress", progressHandler);
  }
}

export interface GifResult {
  blob: Blob;
  outputName: string;
}

export async function videoToGif(
  file: File,
  opts: { fps: number; widthPx: number; startSec?: number; durationSec?: number },
  onProgress: ProgressCallback
): Promise<GifResult> {
  const ffmpeg = await getFFmpeg(onProgress);
  const progressHandler = ({ progress }: { progress: number }) => {
    if (Number.isFinite(progress) && progress >= 0 && progress <= 1) onProgress({ phase: "Encoding", ratio: progress });
  };
  ffmpeg.on("progress", progressHandler);

  const inExt = getExtension(file.name) || "mp4";
  const inputName = `input.${inExt}`;
  const paletteName = "palette.png";
  const outputName = `${stripExtension(file.name)}.gif`;

  try {
    onProgress({ phase: "Reading file" });
    const { fetchFile } = await import("@ffmpeg/util");
    await ffmpeg.writeFile(inputName, await fetchFile(file));

    const seekArgs: string[] = [];
    if (opts.startSec !== undefined) seekArgs.push("-ss", String(opts.startSec));
    if (opts.durationSec !== undefined) seekArgs.push("-t", String(opts.durationSec));

    const filter = `fps=${opts.fps},scale=${opts.widthPx}:-1:flags=lanczos`;

    // Two-pass palette generation, this is the standard technique for a real, clean GIF
    // rather than the muddy default ffmpeg produces when converting straight to GIF.
    onProgress({ phase: "Building palette" });
    await ffmpeg.exec([...seekArgs, "-i", inputName, "-vf", `${filter},palettegen`, paletteName]);

    onProgress({ phase: "Encoding" });
    await ffmpeg.exec([
      ...seekArgs,
      "-i", inputName,
      "-i", paletteName,
      "-lavfi", `${filter}[x];[x][1:v]paletteuse`,
      outputName,
    ]);

    onProgress({ phase: "Finalizing" });
    const data = await ffmpeg.readFile(outputName);
    const blob = new Blob([data.buffer ?? data], { type: "image/gif" });

    await ffmpeg.deleteFile(inputName).catch(() => {});
    await ffmpeg.deleteFile(paletteName).catch(() => {});
    await ffmpeg.deleteFile(outputName).catch(() => {});

    onProgress({ phase: "Ready", ratio: 1 });
    return { blob, outputName };
  } finally {
    ffmpeg.off("progress", progressHandler);
  }
}

export interface ExtractAudioResult {
  blob: Blob;
  outputName: string;
}

export async function extractAudioFromVideo(file: File, onProgress: ProgressCallback): Promise<ExtractAudioResult> {
  const ffmpeg = await getFFmpeg(onProgress);
  const progressHandler = ({ progress }: { progress: number }) => {
    if (Number.isFinite(progress) && progress >= 0 && progress <= 1) onProgress({ phase: "Extracting", ratio: progress });
  };
  ffmpeg.on("progress", progressHandler);

  const inExt = getExtension(file.name) || "mp4";
  const inputName = `input.${inExt}`;
  const outputName = `${stripExtension(file.name)}-audio.mp3`;

  try {
    onProgress({ phase: "Reading file" });
    const { fetchFile } = await import("@ffmpeg/util");
    await ffmpeg.writeFile(inputName, await fetchFile(file));

    onProgress({ phase: "Extracting" });
    await ffmpeg.exec(["-i", inputName, "-vn", "-c:a", "libmp3lame", "-b:a", "192k", outputName]);

    onProgress({ phase: "Finalizing" });
    const data = await ffmpeg.readFile(outputName);
    const blob = new Blob([data.buffer ?? data], { type: "audio/mpeg" });

    await ffmpeg.deleteFile(inputName).catch(() => {});
    await ffmpeg.deleteFile(outputName).catch(() => {});

    onProgress({ phase: "Ready", ratio: 1 });
    return { blob, outputName };
  } finally {
    ffmpeg.off("progress", progressHandler);
  }
}

export interface ReplaceAudioResult {
  blob: Blob;
  outputName: string;
}

/**
 * Replaces a video's audio track with another file's audio, whether that source is a
 * standalone audio file or another video (its own audio track is pulled out and used,
 * its video is ignored). The output runs as long as the shorter of the two inputs.
 */
export async function replaceVideoAudio(
  videoFile: File,
  audioSource: File,
  onProgress: ProgressCallback
): Promise<ReplaceAudioResult> {
  const ffmpeg = await getFFmpeg(onProgress);
  const progressHandler = ({ progress }: { progress: number }) => {
    if (Number.isFinite(progress) && progress >= 0 && progress <= 1) onProgress({ phase: "Muxing", ratio: progress });
  };
  ffmpeg.on("progress", progressHandler);

  const videoExt = getExtension(videoFile.name) || "mp4";
  const audioExt = getExtension(audioSource.name) || "mp3";
  const videoInputName = `input-video.${videoExt}`;
  const audioInputName = `input-audio.${audioExt}`;
  // Keep the source's own container so the video stream can be copied as-is (its codec,
  // e.g. VP9 in a WebM, only makes sense in a matching container).
  const outputExt = videoExt === "mov" ? "mp4" : videoExt;
  const outputName = `${stripExtension(videoFile.name)}-new-audio.${outputExt}`;

  try {
    onProgress({ phase: "Reading files" });
    const { fetchFile } = await import("@ffmpeg/util");
    await ffmpeg.writeFile(videoInputName, await fetchFile(videoFile));
    await ffmpeg.writeFile(audioInputName, await fetchFile(audioSource));

    onProgress({ phase: "Muxing" });
    // -map picks the video stream from the first input and the audio stream from the
    // second, whatever the second file actually is; -shortest stops at whichever of the
    // two runs out first, rather than freezing on a black frame or looping silently.
    // Audio codec has to match what the output container can hold (WebM can't carry AAC).
    const audioCodecArgs = outputExt === "webm" ? ["-c:a", "libopus", "-b:a", "160k"] : ["-c:a", "aac", "-b:a", "192k"];
    await ffmpeg.exec([
      "-i", videoInputName,
      "-i", audioInputName,
      "-map", "0:v:0",
      "-map", "1:a:0",
      "-c:v", "copy",
      ...audioCodecArgs,
      "-shortest",
      outputName,
    ]);

    onProgress({ phase: "Finalizing" });
    const data = await ffmpeg.readFile(outputName);
    const mime = outputExt === "webm" ? "video/webm" : outputExt === "mkv" ? "video/x-matroska" : outputExt === "avi" ? "video/x-msvideo" : "video/mp4";
    const blob = new Blob([data.buffer ?? data], { type: mime });

    await ffmpeg.deleteFile(videoInputName).catch(() => {});
    await ffmpeg.deleteFile(audioInputName).catch(() => {});
    await ffmpeg.deleteFile(outputName).catch(() => {});

    onProgress({ phase: "Ready", ratio: 1 });
    return { blob, outputName };
  } finally {
    ffmpeg.off("progress", progressHandler);
  }
}

export interface StudioVideoExportResult {
  blob: Blob;
  outputName: string;
}

/** One text/sticker overlay's own pre-rendered PNG (transparent everywhere except that one
 * overlay, at the source video's native resolution) plus the time window, in the *original*
 * source video's timeline, during which it should be visible. Each overlay gets its own layer
 * and its own ffmpeg `enable='between(t,...)'` window rather than one flattened image shown for
 * the whole export, so an overlay someone dragged to only cover part of the clip in the timeline
 * really does only appear for that part of the exported file. */
export interface TimedOverlayLayer {
  png: Blob;
  startSec: number;
  endSec: number;
  /** How this overlay's own PNG animates in at the start of its time window, applied for real
   * on every rendered frame by the ffmpeg filter graph below (not just a live-preview effect):
   * "fade" ramps the layer's own alpha channel in over entranceDurationSec, "slide-up" moves
   * the whole layer up into place over the same window. Omitted or "none" shows the layer at
   * full strength immediately, matching the previous, unanimated behavior. */
  entrance?: "none" | "fade" | "slide-up";
  entranceDurationSec?: number;
}

/**
 * Renders a Studio video edit for real: trims to the chosen range and, when text overlays
 * were added, burns each one's own pre-rendered PNG (built at the source video's native
 * resolution) onto every frame of that overlay's own time window via ffmpeg's overlay filter,
 * chained one per overlay. One ffmpeg pass produces the final file, there is no separate
 * "preview only" render path that could drift from the export.
 */
export async function exportStudioVideo(
  file: File,
  opts: { startSec: number; endSec: number; overlays?: TimedOverlayLayer[]; filterPreset?: string; audioGainDb?: number },
  onProgress: ProgressCallback
): Promise<StudioVideoExportResult> {
  const ffmpeg = await getFFmpeg(onProgress);
  const progressHandler = ({ progress }: { progress: number }) => {
    if (Number.isFinite(progress) && progress >= 0 && progress <= 1) onProgress({ phase: "Rendering", ratio: progress });
  };
  ffmpeg.on("progress", progressHandler);
  // The shared engine silences ffmpeg's own log lines everywhere (they're noise for a normal
  // run), so capture the recent ones here too, they're the only real clue when a filter graph
  // or stream mapping fails, and print them to the console (not the UI) if the export throws.
  const recentLogs: string[] = [];
  const logHandler = ({ message }: { message: string }) => {
    recentLogs.push(message);
    if (recentLogs.length > 40) recentLogs.shift();
  };
  ffmpeg.on("log", logHandler);

  const inExt = getExtension(file.name) || "mp4";
  const inputName = `input.${inExt}`;
  const outputName = `${stripExtension(file.name)}-edited.mp4`;
  const clipLenSec = Math.max(0, opts.endSec - opts.startSec);
  // Each overlay's own window is given relative to the ORIGINAL source video; ffmpeg's `t` in
  // an overlay filter counts from the start of the trimmed *output*, so it has to be re-based
  // by subtracting the trim's own start and clamped into the output's own [0, clipLenSec]
  // range. An overlay entirely outside the trimmed range contributes nothing and is dropped
  // rather than emitting a filter that could never turn on.
  const overlayLayers = (opts.overlays ?? [])
    .map((o) => ({
      png: o.png,
      relStart: Math.max(0, o.startSec - opts.startSec),
      relEnd: Math.min(clipLenSec, o.endSec - opts.startSec),
      entrance: o.entrance ?? "none",
      entranceDurationSec: o.entranceDurationSec ?? 0.35,
    }))
    .filter((o) => o.relEnd > o.relStart);
  const hasOverlay = overlayLayers.length > 0;

  try {
    onProgress({ phase: "Reading file" });
    const { fetchFile } = await import("@ffmpeg/util");
    await ffmpeg.writeFile(inputName, await fetchFile(file));
    const overlayNames = overlayLayers.map((_, i) => `overlay${i}.png`);
    for (let i = 0; i < overlayLayers.length; i++) {
      await ffmpeg.writeFile(overlayNames[i], await fetchFile(overlayLayers[i].png));
    }

    const inputArgs = [
      "-i", inputName,
      ...overlayNames.flatMap((name) => ["-loop", "1", "-i", name]),
    ];
    // The color-grading preset (black & white, sepia, vignette, and so on) is applied right
    // after the trim, on the raw source pixels, and before any text overlay is composited on
    // top, so a preset like grayscale never dulls the overlay text drawn over it.
    const presetChain = opts.filterPreset ? `,${opts.filterPreset}` : "";
    // The trim stage's own output pad is [vout] directly when there's nothing else to chain,
    // and [v0] (an intermediate label the first overlay stage then consumes) when there is at
    // least one overlay layer; each subsequent overlay chains off the previous stage's own
    // intermediate label, ending on [vout].
    const trimOutLabel = hasOverlay ? "v0" : "vout";
    const trimmed = `[0:v]trim=start=${opts.startSec}:end=${opts.endSec},setpts=PTS-STARTPTS${presetChain}[${trimOutLabel}]`;
    let videoFilter = trimmed;
    overlayLayers.forEach((o, i) => {
      const srcLabel = i === 0 ? "v0" : `vo${i - 1}`;
      const dstLabel = i === overlayLayers.length - 1 ? "vout" : `vo${i}`;
      const imgLabel = `${i + 1}:v`;
      const preppedLabel = `ovimg${i}`;
      const durSec = Math.max(0.05, Math.min(o.relEnd - o.relStart, o.entranceDurationSec));
      // Each overlay's own image is preprocessed on its own stream first (an entrance effect
      // touches only that one layer, never the layers under or after it), then composited with
      // the same overlay+enable window as before. format=rgba first guarantees fade has a real
      // alpha channel to ramp regardless of the source PNG's own encoding.
      if (o.entrance === "fade") {
        videoFilter += `;[${imgLabel}]format=rgba,fade=t=in:st=${o.relStart}:d=${durSec}:alpha=1[${preppedLabel}]`;
      } else {
        videoFilter += `;[${imgLabel}]format=rgba[${preppedLabel}]`;
      }
      // "slide-up" moves the whole overlay layer up into its resting position (y=0) over the
      // entrance window, using main_h (the background video's real output height) so the travel
      // distance scales with the actual export resolution rather than a guessed pixel count.
      const yExpr =
        o.entrance === "slide-up"
          ? `'(1-min(1,max(0,(t-${o.relStart})/${durSec})))*(main_h*0.06)'`
          : "0";
      // shortest=1 matters here beyond its old single-overlay role: each overlay PNG is a
      // `-loop 1` image input, which never signals its own end of stream, so without shortest=1
      // bounding this stage's output to the (finite) trimmed video input, ffmpeg would try to
      // keep encoding the looped image forever instead of stopping at the real clip length.
      videoFilter += `;[${srcLabel}][${preppedLabel}]overlay=0:${yExpr}:enable='between(t,${o.relStart},${o.relEnd})':shortest=1[${dstLabel}]`;
    });

    onProgress({ phase: "Rendering" });
    // ffmpeg.exec() resolves with an exit code rather than throwing on failure (unlike a
    // normal async API), so a failed run has to be detected by checking that code, not by
    // wrapping it in try/catch.
    const gainDb = opts.audioGainDb ?? 0;
    const gainChain = gainDb !== 0 ? `,volume=${gainDb}dB` : "";
    const run = (withAudio: boolean): Promise<number> => {
      const audioFilter = withAudio
        ? `;[0:a]atrim=start=${opts.startSec}:end=${opts.endSec},asetpts=PTS-STARTPTS${gainChain}[aout]`
        : "";
      return ffmpeg.exec([
        ...inputArgs,
        "-filter_complex", `${videoFilter}${audioFilter}`,
        "-map", "[vout]",
        ...(withAudio ? ["-map", "[aout]"] : []),
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
        ...(withAudio ? ["-c:a", "aac", "-b:a", "160k"] : []),
        outputName,
      ]);
    };

    let code = await run(true);
    if (code !== 0) {
      // The source likely has no usable audio track, retry video-only rather than failing
      // the whole export over a track that was never there.
      recentLogs.length = 0;
      code = await run(false);
      if (code !== 0) {
        console.error("ffmpeg export failed, recent log lines:", recentLogs.join("\n"));
        throw new Error("The video engine could not render this file (unsupported codec or corrupt source).");
      }
    }

    onProgress({ phase: "Finalizing" });
    const data = await ffmpeg.readFile(outputName);
    const blob = new Blob([data.buffer ?? data], { type: "video/mp4" });

    await ffmpeg.deleteFile(inputName).catch(() => {});
    for (const name of overlayNames) await ffmpeg.deleteFile(name).catch(() => {});
    await ffmpeg.deleteFile(outputName).catch(() => {});

    onProgress({ phase: "Ready", ratio: 1 });
    return { blob, outputName };
  } finally {
    ffmpeg.off("progress", progressHandler);
    ffmpeg.off("log", logHandler);
  }
}

/** Reads real duration via a <video> element, used to bound trim/GIF range controls. */
export function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const duration = video.duration;
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(duration) ? duration : 0);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read this video's duration."));
    };
    video.src = url;
  });
}
