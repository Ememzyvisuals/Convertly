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
