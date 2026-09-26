// Turns a sequence of already-rendered PNG frames (e.g. a design's animation, captured frame
// by frame from a Konva stage) into a real animated GIF, using the same shared FFmpeg WASM
// engine and the same two-pass palette technique as videoToGif in videoTools.ts.
import { getFFmpeg, type ProgressCallback } from "./ffmpegEngine";

export interface FramesGifResult {
  blob: Blob;
  outputName: string;
}

export async function framesToGif(
  frames: Blob[],
  fps: number,
  outputName: string,
  onProgress: ProgressCallback
): Promise<FramesGifResult> {
  if (frames.length === 0) throw new Error("There are no animation frames to encode.");

  const ffmpeg = await getFFmpeg(onProgress);
  const progressHandler = ({ progress }: { progress: number }) => {
    if (Number.isFinite(progress) && progress >= 0 && progress <= 1) onProgress({ phase: "Encoding", ratio: progress });
  };
  ffmpeg.on("progress", progressHandler);

  const { fetchFile } = await import("@ffmpeg/util");
  const paletteName = "gif-palette.png";
  const framePattern = "gif-frame-%04d.png";
  const frameName = (i: number) => `gif-frame-${String(i).padStart(4, "0")}.png`;

  try {
    onProgress({ phase: "Writing frames" });
    for (let i = 0; i < frames.length; i++) {
      await ffmpeg.writeFile(frameName(i), await fetchFile(frames[i]));
    }

    onProgress({ phase: "Building palette" });
    let code = await ffmpeg.exec(["-framerate", String(fps), "-i", framePattern, "-vf", "palettegen", paletteName]);
    if (code !== 0) throw new Error("Could not build the GIF color palette from the animation frames.");

    onProgress({ phase: "Encoding" });
    code = await ffmpeg.exec([
      "-framerate", String(fps),
      "-i", framePattern,
      "-i", paletteName,
      "-lavfi", "paletteuse",
      outputName,
    ]);
    if (code !== 0) throw new Error("Could not encode the animation into a GIF.");

    onProgress({ phase: "Finalizing" });
    const data = await ffmpeg.readFile(outputName);
    const blob = new Blob([data.buffer ?? data], { type: "image/gif" });

    for (let i = 0; i < frames.length; i++) await ffmpeg.deleteFile(frameName(i)).catch(() => {});
    await ffmpeg.deleteFile(paletteName).catch(() => {});
    await ffmpeg.deleteFile(outputName).catch(() => {});

    onProgress({ phase: "Ready", ratio: 1 });
    return { blob, outputName };
  } finally {
    ffmpeg.off("progress", progressHandler);
  }
}
