export type OutputFormat = "png" | "jpeg" | "webp" | "avif";

export const FORMAT_MIME: Record<OutputFormat, string> = {
  png: "image/png",
  jpeg: "image/jpeg",
  webp: "image/webp",
  avif: "image/avif",
};

export interface ConvertOptions {
  format: OutputFormat;
  /** 0–1, ignored for png (always lossless) */
  quality?: number;
}

export interface DecodedImage {
  bitmap: ImageBitmap;
  width: number;
  height: number;
}

export async function decodeImageFile(file: File): Promise<DecodedImage> {
  const bitmap = await createImageBitmap(file);
  return { bitmap, width: bitmap.width, height: bitmap.height };
}

function drawToCanvas(bitmap: ImageBitmap, width: number, height: number, fillWhite: boolean): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context is unavailable in this browser.");
  if (fillWhite) {
    // JPEG has no alpha channel, flatten transparency onto white rather than let it turn black.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  return canvas;
}

function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error(`This browser can't encode ${mime}.`))),
      mime,
      quality
    );
  });
}

export interface ConvertResult {
  blob: Blob;
  width: number;
  height: number;
}

export async function convertImage(file: File, opts: ConvertOptions): Promise<ConvertResult> {
  const { bitmap, width, height } = await decodeImageFile(file);
  try {
    const mime = FORMAT_MIME[opts.format];
    const needsFlatten = opts.format === "jpeg";
    const canvas = drawToCanvas(bitmap, width, height, needsFlatten);
    const quality = opts.format === "png" ? undefined : opts.quality ?? 0.85;
    const blob = await canvasToBlob(canvas, mime, quality);
    return { blob, width, height };
  } finally {
    bitmap.close();
  }
}
