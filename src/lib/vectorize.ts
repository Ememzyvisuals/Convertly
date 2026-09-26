// @ts-ignore, imagetracerjs ships no types; it's a small, stable, synchronous tracing engine.
import ImageTracer from "imagetracerjs";
import { decodeImageFile } from "./convert";

export interface VectorizeOptions {
  /** Higher = more colors preserved, larger/more detailed SVG. */
  colorCount: number;
  /** Higher = smoother curves, less faithful to sharp pixel edges. */
  smoothing: number; // maps to ltres/qtres, 0.1–10
  /** Drops speckle paths shorter than this many points. Higher = less noise, may lose fine detail. */
  noiseReduction: number; // maps to pathomit, 0–40
  /** Corner detection strength; higher preserves right angles (good for icons/UI). */
  preserveCorners: boolean;
}

export interface VectorizeResult {
  svg: string;
  width: number;
  height: number;
}

export async function vectorizeImage(file: File, opts: VectorizeOptions): Promise<VectorizeResult> {
  const { bitmap, width, height } = await decodeImageFile(file);
  let imageData: ImageData;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context is unavailable in this browser.");
    ctx.drawImage(bitmap, 0, 0);
    imageData = ctx.getImageData(0, 0, width, height);
  } finally {
    bitmap.close();
  }

  const options = {
    numberofcolors: Math.max(2, Math.min(64, Math.round(opts.colorCount))),
    colorsampling: 2,
    colorquantcycles: 3,
    ltres: opts.smoothing,
    qtres: opts.smoothing,
    pathomit: opts.noiseReduction,
    rightangleenhance: opts.preserveCorners,
    roundcoords: 1,
    scale: 1,
    viewbox: true,
    desc: false,
  };

  // imagetracerjs is synchronous and CPU-bound; yield to the event loop first so the UI can
  // paint the "Encoding" state before the main thread blocks on tracing.
  await new Promise((r) => setTimeout(r, 0));
  const svg: string = (ImageTracer as any).imagedataToSVG(imageData, options);

  return { svg, width, height };
}
