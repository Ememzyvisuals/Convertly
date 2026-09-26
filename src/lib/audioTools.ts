// Real audio engine using the same FFmpeg WASM build already used for video, run entirely
// in this tab.
import { getExtension, stripExtension } from "./format";
import { getFFmpeg, type ProgressCallback } from "./ffmpegEngine";

export type AudioFormat = "mp3" | "wav" | "flac" | "ogg" | "m4a";

const MIME_BY_FORMAT: Record<AudioFormat, string> = {
  mp3: "audio/mpeg",
  wav: "audio/wav",
  flac: "audio/flac",
  ogg: "audio/ogg",
  m4a: "audio/mp4",
};

const CODEC_ARGS_BY_FORMAT: Record<AudioFormat, string[]> = {
  mp3: ["-c:a", "libmp3lame"],
  wav: ["-c:a", "pcm_s16le"],
  flac: ["-c:a", "flac"],
  ogg: ["-c:a", "libvorbis"],
  m4a: ["-c:a", "aac"],
};

export interface AudioConvertOptions {
  format: AudioFormat;
  /** kbps, ignored for the lossless formats (wav, flac). */
  bitrateKbps?: number;
  /** Undefined keeps source sample rate. */
  sampleRate?: number;
  channels?: 1 | 2;
  /** Trim window in seconds, both optional. */
  trimStart?: number;
  trimEnd?: number;
  /** Loudness-normalize with ffmpeg's loudnorm filter. */
  normalize?: boolean;
}

export interface AudioResult {
  blob: Blob;
  outputName: string;
}

export async function convertAudio(file: File, opts: AudioConvertOptions, onProgress: ProgressCallback): Promise<AudioResult> {
  const ffmpeg = await getFFmpeg(onProgress);

  const progressHandler = ({ progress }: { progress: number }) => {
    if (Number.isFinite(progress) && progress >= 0 && progress <= 1) {
      onProgress({ phase: "Encoding", ratio: progress });
    }
  };
  ffmpeg.on("progress", progressHandler);

  const inExt = getExtension(file.name) || "audio";
  const inputName = `input.${inExt}`;
  const outputName = `${stripExtension(file.name)}-converted.${opts.format}`;

  try {
    onProgress({ phase: "Reading file" });
    const { fetchFile } = await import("@ffmpeg/util");
    await ffmpeg.writeFile(inputName, await fetchFile(file));

    onProgress({ phase: "Preparing" });
    const args = ["-i", inputName];

    if (opts.trimStart !== undefined) args.push("-ss", String(opts.trimStart));
    if (opts.trimEnd !== undefined && opts.trimStart !== undefined) {
      args.push("-t", String(Math.max(0, opts.trimEnd - opts.trimStart)));
    } else if (opts.trimEnd !== undefined) {
      args.push("-to", String(opts.trimEnd));
    }

    args.push(...CODEC_ARGS_BY_FORMAT[opts.format]);
    if (opts.bitrateKbps && opts.format !== "wav" && opts.format !== "flac") {
      args.push("-b:a", `${opts.bitrateKbps}k`);
    }
    if (opts.sampleRate) args.push("-ar", String(opts.sampleRate));
    if (opts.channels) args.push("-ac", String(opts.channels));
    if (opts.normalize) args.push("-af", "loudnorm=I=-16:TP=-1.5:LRA=11");

    args.push(outputName);

    onProgress({ phase: "Encoding" });
    await ffmpeg.exec(args);

    onProgress({ phase: "Finalizing" });
    const data = await ffmpeg.readFile(outputName);
    const blob = new Blob([data.buffer ?? data], { type: MIME_BY_FORMAT[opts.format] });

    await ffmpeg.deleteFile(inputName).catch(() => {});
    await ffmpeg.deleteFile(outputName).catch(() => {});

    onProgress({ phase: "Ready", ratio: 1 });
    return { blob, outputName };
  } finally {
    ffmpeg.off("progress", progressHandler);
  }
}

export interface StudioAudioExportResult {
  blob: Blob;
  outputName: string;
}

/**
 * Convertly Studio's Audio editing surface: a real gain change and real fade in/out, applied
 * by ffmpeg's own volume and afade filters (not a client-side <audio> gain node that would
 * only affect playback, not the exported file). Skips the filter chain entirely when nothing
 * was actually changed, so an unedited export is a plain re-encode.
 *
 * `sfxOverlays` mixes in real sound-effect clips (rendered client-side by sfxLibrary.ts and
 * passed here as WAV blobs) at chosen timestamps, via ffmpeg's own adelay + amix filters, so
 * a sound effect actually ends up baked into the exported file rather than only playing back
 * in the browser.
 */
export async function exportStudioAudio(
  file: File,
  opts: {
    gainDb: number;
    fadeInSec: number;
    fadeOutSec: number;
    durationSec: number;
    sfxOverlays?: { blob: Blob; atSec: number }[];
  },
  onProgress: ProgressCallback
): Promise<StudioAudioExportResult> {
  const ffmpeg = await getFFmpeg(onProgress);
  const progressHandler = ({ progress }: { progress: number }) => {
    if (Number.isFinite(progress) && progress >= 0 && progress <= 1) onProgress({ phase: "Rendering", ratio: progress });
  };
  ffmpeg.on("progress", progressHandler);

  const inExt = getExtension(file.name) || "mp3";
  const inputName = `input.${inExt}`;
  const outputName = `${stripExtension(file.name)}-edited.mp3`;
  const overlays = opts.sfxOverlays ?? [];
  const sfxNames = overlays.map((_, i) => `sfx-${i}.wav`);

  try {
    onProgress({ phase: "Reading file" });
    const { fetchFile } = await import("@ffmpeg/util");
    await ffmpeg.writeFile(inputName, await fetchFile(file));
    for (let i = 0; i < overlays.length; i++) await ffmpeg.writeFile(sfxNames[i], await fetchFile(overlays[i].blob));

    const mainFilters: string[] = [];
    if (opts.gainDb !== 0) mainFilters.push(`volume=${opts.gainDb}dB`);
    if (opts.fadeInSec > 0) mainFilters.push(`afade=t=in:st=0:d=${opts.fadeInSec}`);
    if (opts.fadeOutSec > 0) {
      const startAt = Math.max(0, opts.durationSec - opts.fadeOutSec);
      mainFilters.push(`afade=t=out:st=${startAt}:d=${opts.fadeOutSec}`);
    }

    onProgress({ phase: "Rendering" });
    const inputArgs = ["-i", inputName, ...sfxNames.flatMap((name) => ["-i", name])];

    let code: number;
    if (overlays.length === 0) {
      code = await ffmpeg.exec([
        ...inputArgs,
        ...(mainFilters.length ? ["-af", mainFilters.join(",")] : []),
        "-c:a", "libmp3lame", "-b:a", "192k",
        outputName,
      ]);
    } else {
      // Each sound effect is its own ffmpeg input, delayed to its chosen timestamp and format
      // matched to the main track, then amix'd together. amix quietens every input by 1/N to
      // avoid clipping, so multiplying back up by the input count after mixing restores the
      // main track's intended loudness (the standard ffmpeg workaround for that).
      const mainChain = mainFilters.length ? `${mainFilters.join(",")},` : "";
      const filterParts = [
        `[0:a]${mainChain}aformat=sample_rates=44100:channel_layouts=stereo[main]`,
        ...overlays.map((o, i) => {
          const delayMs = Math.max(0, Math.round(o.atSec * 1000));
          return `[${i + 1}:a]adelay=${delayMs}|${delayMs},aformat=sample_rates=44100:channel_layouts=stereo[sfx${i}]`;
        }),
        `[main]${overlays.map((_, i) => `[sfx${i}]`).join("")}amix=inputs=${overlays.length + 1}:duration=first:dropout_transition=0,volume=${overlays.length + 1}[aout]`,
      ];
      code = await ffmpeg.exec([
        ...inputArgs,
        "-filter_complex", filterParts.join(";"),
        "-map", "[aout]",
        "-c:a", "libmp3lame", "-b:a", "192k",
        outputName,
      ]);
    }
    if (code !== 0) throw new Error("The audio engine could not render this file (unsupported codec or corrupt source).");

    onProgress({ phase: "Finalizing" });
    const data = await ffmpeg.readFile(outputName);
    const blob = new Blob([data.buffer ?? data], { type: "audio/mpeg" });

    await ffmpeg.deleteFile(inputName).catch(() => {});
    for (const name of sfxNames) await ffmpeg.deleteFile(name).catch(() => {});
    await ffmpeg.deleteFile(outputName).catch(() => {});

    onProgress({ phase: "Ready", ratio: 1 });
    return { blob, outputName };
  } finally {
    ffmpeg.off("progress", progressHandler);
  }
}

/** Reads real duration via an <audio> element, used to bound trim controls before processing. */
export function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      const duration = audio.duration;
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(duration) ? duration : 0);
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read this audio file's duration."));
    };
    audio.src = url;
  });
}
