export type DetectedKind =
  | "png" | "jpeg" | "webp" | "gif" | "bmp" | "avif" | "heic"
  | "svg" | "mp4" | "webm" | "mov" | "mkv" | "avi"
  | "pdf" | "zip"
  | "mp3" | "wav" | "ogg" | "flac" | "m4a"
  | "unknown";

export interface ValidationResult {
  ok: boolean;
  detected: DetectedKind;
  reason?: string;
}

const MAX_IMAGE_BYTES = 200 * 1024 * 1024; // 200 MB
const MAX_VIDEO_BYTES = 6 * 1024 * 1024 * 1024; // 6 GB (soft ceiling; real limit is device memory)
const MAX_DOCUMENT_BYTES = 500 * 1024 * 1024; // 500 MB (PDFs, archives)
const MAX_AUDIO_BYTES = 1 * 1024 * 1024 * 1024; // 1 GB

/** Reads the first N bytes of a file so we can sniff its real type instead of trusting the extension. */
async function readHeader(file: File, length = 32): Promise<Uint8Array> {
  const slice = file.slice(0, length);
  const buf = await slice.arrayBuffer();
  return new Uint8Array(buf);
}

function matches(bytes: Uint8Array, offset: number, sig: number[]): boolean {
  if (bytes.length < offset + sig.length) return false;
  for (let i = 0; i < sig.length; i++) {
    if (bytes[offset + i] !== sig[i]) return false;
  }
  return true;
}

function asciiAt(bytes: Uint8Array, offset: number, len: number): string {
  return Array.from(bytes.slice(offset, offset + len))
    .map((b) => String.fromCharCode(b))
    .join("");
}

/** Sniffs magic bytes to determine the real file type. Never trust the extension alone. */
export async function sniffFileType(file: File): Promise<DetectedKind> {
  // SVG is text-based; magic-byte sniffing doesn't apply the same way.
  if (file.type === "image/svg+xml" || /\.svg$/i.test(file.name)) {
    const text = await file.slice(0, 2000).text();
    if (/<svg[\s>]/i.test(text)) return "svg";
  }

  const bytes = await readHeader(file, 64);

  if (matches(bytes, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (matches(bytes, 0, [0xff, 0xd8, 0xff])) return "jpeg";
  if (matches(bytes, 0, [0x47, 0x49, 0x46, 0x38])) return "gif";
  if (matches(bytes, 0, [0x42, 0x4d])) return "bmp";
  if (asciiAt(bytes, 0, 4) === "RIFF" && asciiAt(bytes, 8, 4) === "WEBP") return "webp";
  if (asciiAt(bytes, 4, 4) === "ftyp") {
    const brand = asciiAt(bytes, 8, 4).trim().toLowerCase();
    if (brand.startsWith("avif") || brand.startsWith("avis")) return "avif";
    if (brand.startsWith("heic") || brand.startsWith("heix") || brand.startsWith("mif1")) return "heic";
    if (brand.startsWith("qt")) return "mov";
    return "mp4";
  }
  if (matches(bytes, 0, [0x1a, 0x45, 0xdf, 0xa3])) {
    // EBML container: WebM or MKV. WebM declares a "webm" doctype shortly after the header.
    const text = asciiAt(bytes, 0, 64);
    return text.includes("webm") ? "webm" : "mkv";
  }
  if (matches(bytes, 0, [0x52, 0x49, 0x46, 0x46]) && asciiAt(bytes, 8, 4) === "AVI ") return "avi";

  if (matches(bytes, 0, [0x25, 0x50, 0x44, 0x46])) return "pdf";
  if (
    matches(bytes, 0, [0x50, 0x4b, 0x03, 0x04]) ||
    matches(bytes, 0, [0x50, 0x4b, 0x05, 0x06]) ||
    matches(bytes, 0, [0x50, 0x4b, 0x07, 0x08])
  ) {
    return "zip";
  }

  if (asciiAt(bytes, 0, 4) === "RIFF" && asciiAt(bytes, 8, 4) === "WAVE") return "wav";
  if (asciiAt(bytes, 0, 4) === "OggS") return "ogg";
  if (asciiAt(bytes, 0, 4) === "fLaC") return "flac";
  if (matches(bytes, 0, [0x49, 0x44, 0x33])) return "mp3"; // "ID3" tag
  if (matches(bytes, 0, [0xff, 0xfb]) || matches(bytes, 0, [0xff, 0xf3]) || matches(bytes, 0, [0xff, 0xf2])) return "mp3";
  if (asciiAt(bytes, 4, 4) === "ftyp" && asciiAt(bytes, 8, 4).trim().toUpperCase() === "M4A") return "m4a";

  return "unknown";
}

const IMAGE_KINDS: DetectedKind[] = ["png", "jpeg", "webp", "gif", "bmp", "avif", "svg"];
const VIDEO_KINDS: DetectedKind[] = ["mp4", "webm", "mov", "mkv", "avi"];
const AUDIO_KINDS: DetectedKind[] = ["mp3", "wav", "ogg", "flac", "m4a"];

export function isImageKind(kind: DetectedKind): boolean {
  return IMAGE_KINDS.includes(kind);
}
export function isVideoKind(kind: DetectedKind): boolean {
  return VIDEO_KINDS.includes(kind);
}
export function isAudioKind(kind: DetectedKind): boolean {
  return AUDIO_KINDS.includes(kind);
}

export interface ValidateOptions {
  /** Kinds accepted for this operation. */
  accept: DetectedKind[];
  /** Custom max byte size; defaults to a sane ceiling by media type. */
  maxBytes?: number;
}

export async function validateFile(file: File, opts: ValidateOptions): Promise<ValidationResult> {
  if (file.size === 0) {
    return { ok: false, detected: "unknown", reason: "This file is empty." };
  }

  let detected: DetectedKind;
  try {
    detected = await sniffFileType(file);
  } catch {
    return { ok: false, detected: "unknown", reason: "The file could not be read. It may be corrupt." };
  }

  if (detected === "unknown") {
    return {
      ok: false,
      detected,
      reason: "Unrecognized file format. The file's contents don't match a supported image or video type.",
    };
  }

  if (detected === "heic") {
    return {
      ok: false,
      detected,
      reason: "HEIC isn't supported by browser decoders yet. Convert it to JPEG or PNG first.",
    };
  }

  if (!opts.accept.includes(detected)) {
    return {
      ok: false,
      detected,
      reason: `This file was detected as ${detected.toUpperCase()}, which isn't accepted here, even though the filename may say otherwise.`,
    };
  }

  const ceiling =
    opts.maxBytes ??
    (isVideoKind(detected)
      ? MAX_VIDEO_BYTES
      : isAudioKind(detected)
      ? MAX_AUDIO_BYTES
      : detected === "pdf" || detected === "zip"
      ? MAX_DOCUMENT_BYTES
      : MAX_IMAGE_BYTES);
  if (file.size > ceiling) {
    return {
      ok: false,
      detected,
      reason: `This file is ${(file.size / (1024 * 1024)).toFixed(0)} MB, above the ${(ceiling / (1024 * 1024)).toFixed(0)} MB limit for this tool.`,
    };
  }

  return { ok: true, detected };
}

export function canDecodeAvif(): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.width > 0);
    img.onerror = () => resolve(false);
    img.src =
      "data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQAMAAAAABNjb2xybmNseAACAAIABoAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgABogQEDQgMgkQAAAAB8dSLfI=";
  });
}

export function canEncode(mime: string): Promise<boolean> {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    canvas.width = 2;
    canvas.height = 2;
    canvas.toBlob((blob) => resolve(!!blob && blob.type === mime), mime, 0.8);
  });
}
