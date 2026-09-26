// Auto-captioning: real speech-to-text run entirely in the browser via transformers.js's
// WASM build of Whisper (tiny, multilingual), not a server call, matching this app's own
// "nothing leaves your browser" promise. The only network fetch this feature makes is the
// model's own weights from the Hugging Face Hub the first time someone uses it (same category
// of one-time download as the app's own FFmpeg WASM engine), never the person's audio or video.
import { extractAudioFromVideo } from "./videoTools";

export interface CaptionWord {
  text: string;
  startSec: number;
  endSec: number;
}

export interface CaptionChunk {
  text: string;
  startSec: number;
  endSec: number;
  /** Per-word timing within this chunk, used to drive word-highlight/typewriter caption
   * templates. Whisper-tiny's chunk timestamps don't carry real word-level timing, so these
   * are an even split of the chunk's own duration across its words, a standard approximation
   * used by caption tools when true word timestamps aren't available; it is accurate enough to
   * look right for typical speech pacing, though not word-perfect. */
  words: CaptionWord[];
}

function splitIntoWords(text: string, startSec: number, endSec: number): CaptionWord[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const span = Math.max(0.05, endSec - startSec);
  const per = span / words.length;
  return words.map((w, i) => ({
    text: w,
    startSec: startSec + i * per,
    endSec: startSec + (i + 1) * per,
  }));
}

export type CaptionPhase = "Loading speech model" | "Decoding audio" | "Transcribing" | "Ready";

export interface CaptionProgress {
  phase: CaptionPhase;
  ratio?: number | null;
}

type AsrPipeline = (input: Float32Array, options: Record<string, unknown>) => Promise<{ chunks?: RawChunk[]; text?: string }>;
interface RawChunk {
  text?: string;
  timestamp?: [number, number | null];
}

let asrPipelinePromise: Promise<AsrPipeline> | null = null;

async function getAsrPipeline(onProgress: (p: CaptionProgress) => void): Promise<AsrPipeline> {
  if (!asrPipelinePromise) {
    asrPipelinePromise = (async () => {
      // @ts-ignore, transformers.js ships its own types but the package resolves fine at runtime
      const { pipeline } = await import("@xenova/transformers");
      const asr = await pipeline("automatic-speech-recognition", "Xenova/whisper-tiny", {
        progress_callback: (p: { status?: string; progress?: number }) => {
          if (p?.status === "progress" && typeof p.progress === "number") {
            onProgress({ phase: "Loading speech model", ratio: Math.max(0, Math.min(1, p.progress / 100)) });
          }
        },
      });
      return asr as unknown as AsrPipeline;
    })();
  }
  return asrPipelinePromise;
}

/** Decodes an audio blob into the mono, 16kHz Float32 samples Whisper expects, entirely with
 * the browser's own Web Audio API: decode at the file's real sample rate first, then resample
 * with an OfflineAudioContext (the standard way to resample audio in a browser without a
 * separate resampling library). */
async function decodeTo16kMono(blob: Blob): Promise<Float32Array> {
  const arrayBuffer = await blob.arrayBuffer();
  const AudioCtxCtor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const decodeCtx = new AudioCtxCtor();
  let decoded: AudioBuffer;
  try {
    decoded = await decodeCtx.decodeAudioData(arrayBuffer.slice(0));
  } finally {
    await decodeCtx.close().catch(() => {});
  }
  const targetRate = 16000;
  const offline = new OfflineAudioContext(1, Math.max(1, Math.ceil(decoded.duration * targetRate)), targetRate);
  const source = offline.createBufferSource();
  source.buffer = decoded;
  // Connecting a multi-channel buffer into a single-channel destination mixes it down to mono
  // automatically, no manual channel-averaging needed.
  source.connect(offline.destination);
  source.start(0);
  const rendered = await offline.startRendering();
  return rendered.getChannelData(0);
}

/** Whisper's own chunk boundaries are often a whole sentence or more, too long to read
 * comfortably as one on-screen caption line. This regroups the flat word stream into shorter,
 * natural-feeling caption phrases (a handful of words, a few seconds each), the same kind of
 * grouping modern social caption tools use, while keeping every word's own timing intact. */
function regroupIntoPhrases(chunks: CaptionChunk[], maxWords = 6, maxSecSpan = 3.2): CaptionChunk[] {
  const allWords = chunks.flatMap((c) => c.words);
  if (allWords.length === 0) return chunks;
  const groups: CaptionWord[][] = [];
  let current: CaptionWord[] = [];
  for (const w of allWords) {
    const spanIfAdded = current.length > 0 ? w.endSec - current[0].startSec : 0;
    if (current.length >= maxWords || (current.length > 0 && spanIfAdded > maxSecSpan)) {
      groups.push(current);
      current = [];
    }
    current.push(w);
  }
  if (current.length > 0) groups.push(current);
  return groups.map((g) => ({
    text: g.map((w) => w.text).join(" "),
    startSec: g[0].startSec,
    endSec: g[g.length - 1].endSec,
    words: g,
  }));
}

/** Extracts the clip's audio (the same real FFmpeg engine used elsewhere in this app), decodes
 * it to the format Whisper expects, and transcribes it into timestamped chunks ready to become
 * caption overlays. The model itself downloads once per browser (cached by the browser after
 * that); everything else runs locally. */
export async function transcribeVideoToCaptions(file: File, onProgress: (p: CaptionProgress) => void): Promise<CaptionChunk[]> {
  onProgress({ phase: "Loading speech model", ratio: 0 });
  const asr = await getAsrPipeline(onProgress);

  onProgress({ phase: "Decoding audio" });
  const { blob } = await extractAudioFromVideo(file, () => {});
  const samples = await decodeTo16kMono(blob);

  onProgress({ phase: "Transcribing" });
  const result = await asr(samples, {
    chunk_length_s: 30,
    stride_length_s: 5,
    return_timestamps: true,
  });

  onProgress({ phase: "Ready", ratio: 1 });
  const rawChunks: RawChunk[] = Array.isArray(result?.chunks) ? result.chunks! : [];
  const chunks: CaptionChunk[] = rawChunks
    .map((c) => {
      const start = Array.isArray(c.timestamp) ? Number(c.timestamp[0]) || 0 : 0;
      const rawEnd = Array.isArray(c.timestamp) ? c.timestamp[1] : null;
      const end = typeof rawEnd === "number" ? rawEnd : start + 2.5;
      const text = String(c.text ?? "").trim();
      const endSec = Math.max(start + 0.3, end);
      return { text, startSec: start, endSec, words: splitIntoWords(text, start, endSec) };
    })
    .filter((c) => c.text.length > 0);
  return regroupIntoPhrases(chunks);
}
