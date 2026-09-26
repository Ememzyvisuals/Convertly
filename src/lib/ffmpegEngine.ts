// Shared FFmpeg WASM loader. One instance for the whole tab, reused by video and audio
// tools alike, so switching between them doesn't reload the ~30 MB engine twice.

export type ProgressCallback = (info: { phase: string; ratio?: number }) => void;

let ffmpegSingleton: any = null;
let loadPromise: Promise<any> | null = null;

export async function getFFmpeg(onProgress: ProgressCallback) {
  if (ffmpegSingleton) return ffmpegSingleton;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    onProgress({ phase: "Loading engine" });
    const { FFmpeg } = await import("@ffmpeg/ffmpeg");
    const { toBlobURL } = await import("@ffmpeg/util");

    const ffmpeg = new FFmpeg();
    ffmpeg.on("log", () => {});

    const base = `${window.location.origin}/ffmpeg`;
    const coreURL = await toBlobURL(`${base}/ffmpeg-core.js`, "text/javascript");
    const wasmURL = await toBlobURL(`${base}/ffmpeg-core.wasm`, "application/wasm");

    await ffmpeg.load({ coreURL, wasmURL });
    ffmpegSingleton = ffmpeg;
    return ffmpeg;
  })();

  return loadPromise;
}

export function isFFmpegLoaded(): boolean {
  return !!ffmpegSingleton;
}
