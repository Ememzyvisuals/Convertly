import { getExtension, stripExtension } from "./format";
import { getFFmpeg, isFFmpegLoaded, type ProgressCallback } from "./ffmpegEngine";

export type VideoCodec = "h264" | "vp9";
export type VideoPreset = "fast" | "balanced" | "small";
export type { ProgressCallback };

export interface VideoCompressOptions {
  codec: VideoCodec;
  /** CRF: lower = higher quality/larger file. h264 sane range 18–32, vp9 20–40. */
  crf: number;
  /** Cap the longest edge in pixels; undefined keeps source resolution. */
  maxHeight?: number;
  /** Undefined = source frame rate. */
  fps?: number;
  audioKbps: number;
  preset: VideoPreset;
}

export interface VideoCompressResult {
  blob: Blob;
  outputName: string;
}

function codecArgs(codec: VideoCodec, crf: number, preset: VideoPreset): string[] {
  if (codec === "vp9") {
    const speed = preset === "fast" ? "4" : preset === "small" ? "0" : "2";
    return ["-c:v", "libvpx-vp9", "-crf", String(crf), "-b:v", "0", "-deadline", preset === "fast" ? "realtime" : "good", "-cpu-used", speed];
  }
  const x264Preset = preset === "fast" ? "veryfast" : preset === "small" ? "slower" : "medium";
  return ["-c:v", "libx264", "-crf", String(crf), "-preset", x264Preset];
}

export async function compressVideo(
  file: File,
  opts: VideoCompressOptions,
  onProgress: ProgressCallback
): Promise<VideoCompressResult> {
  const ffmpeg = await getFFmpeg(onProgress);

  const progressHandler = ({ progress }: { progress: number }) => {
    if (Number.isFinite(progress) && progress >= 0 && progress <= 1) {
      onProgress({ phase: "Encoding", ratio: progress });
    }
  };
  ffmpeg.on("progress", progressHandler);

  const inExt = getExtension(file.name) || "mp4";
  const inputName = `input.${inExt}`;
  const outExt = opts.codec === "vp9" ? "webm" : "mp4";
  const outputName = `${stripExtension(file.name)}-compressed.${outExt}`;

  try {
    onProgress({ phase: "Reading file" });
    const { fetchFile } = await import("@ffmpeg/util");
    await ffmpeg.writeFile(inputName, await fetchFile(file));

    onProgress({ phase: "Preparing" });
    const args = ["-i", inputName, ...codecArgs(opts.codec, opts.crf, opts.preset)];

    const vf: string[] = [];
    if (opts.maxHeight) {
      // Scale to the requested height, preserve aspect ratio, keep even dimensions (required by most codecs).
      vf.push(`scale=-2:'min(${opts.maxHeight},ih)'`);
    }
    if (opts.fps) vf.push(`fps=${opts.fps}`);
    if (vf.length) args.push("-vf", vf.join(","));

    args.push("-c:a", opts.codec === "vp9" ? "libopus" : "aac", "-b:a", `${opts.audioKbps}k`);
    args.push("-movflags", "+faststart");
    args.push(outputName);

    await ffmpeg.exec(args);

    onProgress({ phase: "Finalizing" });
    const data = await ffmpeg.readFile(outputName);
    const blob = new Blob([data.buffer ?? data], { type: outExt === "webm" ? "video/webm" : "video/mp4" });

    // Clean up the virtual filesystem so repeated jobs don't leak memory.
    await ffmpeg.deleteFile(inputName).catch(() => {});
    await ffmpeg.deleteFile(outputName).catch(() => {});

    onProgress({ phase: "Ready", ratio: 1 });
    return { blob, outputName };
  } finally {
    ffmpeg.off("progress", progressHandler);
  }
}

/** Rough estimate only, actual output depends heavily on source content. Always labelled as an estimate in the UI. */
export function estimateVideoOutputBytes(originalBytes: number, crf: number, codec: VideoCodec): number {
  // Very rough CRF→size heuristic anchored at crf 23 (h264 default) ≈ no change, each +6 crf ≈ half size.
  const baseline = codec === "vp9" ? 31 : 23;
  const stops = (crf - baseline) / 6;
  const factor = Math.pow(0.5, stops);
  return Math.max(originalBytes * factor, originalBytes * 0.02);
}

export { isFFmpegLoaded };
