// Real ZIP engine using JSZip, running entirely in this tab.
import JSZip from "jszip";

export async function filesToZip(files: File[], onProgress?: (pct: number) => void): Promise<Blob> {
  const zip = new JSZip();
  for (const file of files) {
    zip.file(file.name, file);
  }
  return zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } }, (meta) => {
    onProgress?.(meta.percent);
  });
}

export interface ExtractedEntry {
  name: string;
  blob: Blob;
  size: number;
}

export async function extractZip(file: File): Promise<ExtractedEntry[]> {
  const zip = await JSZip.loadAsync(file);
  const entries: ExtractedEntry[] = [];
  const names = Object.keys(zip.files).filter((n) => !zip.files[n].dir);
  for (const name of names) {
    const entry = zip.files[name];
    const blob = await entry.async("blob");
    entries.push({ name, blob, size: blob.size });
  }
  return entries;
}
