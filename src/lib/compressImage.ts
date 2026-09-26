import { decodeImageFile } from "./convert";

export interface ImageCompressOptions {
  /** 0–1 encoder quality. Ignored for PNG (lossless), which instead relies on `maxDimension`/palette. */
  quality: number;
  /** Output container. PNG re-encoding rarely shrinks photos, the UI should nudge users toward JPEG/WebP. */
  format: "jpeg" | "webp" | "png";
  /** Longest-edge cap in pixels. Undefined = keep original dimensions. */
  maxDimension?: number;
}

export interface ImageCompressResult {
  blob: Blob;
  width: number;
  height: number;
}

export async function compressImage(file: File, opts: ImageCompressOptions): Promise<ImageCompressResult> {
  const { bitmap, width, height } = await decodeImageFile(file);
  try {
    let targetW = width;
    let targetH = height;
    if (opts.maxDimension && Math.max(width, height) > opts.maxDimension) {
      const scale = opts.maxDimension / Math.max(width, height);
      targetW = Math.round(width * scale);
      targetH = Math.round(height * scale);
    }

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context is unavailable in this browser.");

    if (opts.format === "jpeg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, targetW, targetH);
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, targetW, targetH);

    const mime = opts.format === "jpeg" ? "image/jpeg" : opts.format === "webp" ? "image/webp" : "image/png";
    const quality = opts.format === "png" ? undefined : opts.quality;

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Encoding failed."))), mime, quality);
    });

    return { blob, width: targetW, height: targetH };
  } finally {
    bitmap.close();
  }
}

/** Rough pre-processing size estimate shown before the user commits to running the job. */
export function estimateImageOutputBytes(
  originalBytes: number,
  format: "jpeg" | "webp" | "png",
  quality: number
): number {
  if (format === "png") return originalBytes * 0.9;
  // Empirical rough curve: quality 1.0 ≈ little savings, quality 0.5 ≈ ~75% smaller than an uncompressed baseline.
  const base = format === "webp" ? 0.55 : 0.7;
  const factor = base * quality + (1 - base) * quality * quality;
  return Math.max(originalBytes * factor * 0.6, originalBytes * 0.03);
}
