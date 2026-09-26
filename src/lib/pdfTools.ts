// Real PDF engines: pdf-lib for building/merging PDFs, pdfjs-dist for rendering pages to
// images. Both run entirely in this tab, no server round trip, same philosophy as the rest
// of Convertly's engines.
import { PDFDocument, degrees } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
// Self-host the worker (Vite's new URL(...) pattern) so there's no external CDN dependency,
// consistent with the self-hosted-fonts approach used elsewhere in the project.
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

/** pdf-lib returns a Uint8Array typed against ArrayBufferLike, which the DOM Blob typings don't accept directly. */
function toBlob(bytes: Uint8Array, type: string): Blob {
  return new Blob([bytes as unknown as BlobPart], { type });
}

export interface ImagesToPdfOptions {
  /** "fit" scales each image to fit an A4-ish page with a margin; "native" uses the image's own size as the page size. */
  pageMode: "fit" | "native";
}

export async function imagesToPdf(files: File[], opts: ImagesToPdfOptions): Promise<Blob> {
  const doc = await PDFDocument.create();

  for (const file of files) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const isPng = file.type === "image/png" || /\.png$/i.test(file.name);
    const image = isPng ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);

    if (opts.pageMode === "native") {
      const page = doc.addPage([image.width, image.height]);
      page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
    } else {
      const pageWidth = 595.28; // A4 at 72dpi
      const pageHeight = 841.89;
      const margin = 32;
      const maxW = pageWidth - margin * 2;
      const maxH = pageHeight - margin * 2;
      const scale = Math.min(maxW / image.width, maxH / image.height, 1);
      const w = image.width * scale;
      const h = image.height * scale;
      const page = doc.addPage([pageWidth, pageHeight]);
      page.drawImage(image, {
        x: (pageWidth - w) / 2,
        y: (pageHeight - h) / 2,
        width: w,
        height: h,
      });
    }
  }

  const bytes = await doc.save();
  return toBlob(bytes, "application/pdf");
}

export interface PdfToImagesResult {
  /** One PNG blob per page, in order. */
  pages: Blob[];
}

export async function pdfToImages(
  file: File,
  scale: number,
  onProgress?: (done: number, total: number) => void
): Promise<PdfToImagesResult> {
  const data = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjsLib.getDocument({ data });
  const doc = await loadingTask.promise;
  const pages: Blob[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;

    const blob: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not encode page as an image."))), "image/png");
    });
    pages.push(blob);
    onProgress?.(i, doc.numPages);
  }

  return { pages };
}

export async function mergePdfs(files: File[]): Promise<Blob> {
  const out = await PDFDocument.create();
  for (const file of files) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const src = await PDFDocument.load(bytes);
    const copiedPages = await out.copyPages(src, src.getPageIndices());
    copiedPages.forEach((p) => out.addPage(p));
  }
  const bytes = await out.save();
  return toBlob(bytes, "application/pdf");
}

export interface SplitPdfResult {
  /** One single-page PDF blob per page, in order. */
  pages: Blob[];
}

export async function splitPdf(file: File): Promise<SplitPdfResult> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const src = await PDFDocument.load(bytes);
  const pages: Blob[] = [];
  for (let i = 0; i < src.getPageCount(); i++) {
    const out = await PDFDocument.create();
    const [copied] = await out.copyPages(src, [i]);
    out.addPage(copied);
    const outBytes = await out.save();
    pages.push(toBlob(outBytes, "application/pdf"));
  }
  return { pages };
}

export async function getPdfPageCount(file: File): Promise<number> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const doc = await PDFDocument.load(bytes);
  return doc.getPageCount();
}

export async function rotatePdf(file: File, byDegrees: 90 | 180 | 270): Promise<Blob> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const doc = await PDFDocument.load(bytes);
  for (const page of doc.getPages()) {
    const current = page.getRotation().angle;
    page.setRotation(degrees((current + byDegrees) % 360));
  }
  const outBytes = await doc.save();
  return toBlob(outBytes, "application/pdf");
}
