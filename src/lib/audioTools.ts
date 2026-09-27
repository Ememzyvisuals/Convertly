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
