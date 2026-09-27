import { el, clear } from "../ui/dom";
import { dropzoneMascot } from "../ui/upload";
import { formatBytes, triggerDownload } from "../lib/format";
import { sniffFileType } from "../lib/validate";
import { parseMp4Metadata, parseId3Tags, parseWavMetadata } from "../lib/deepMediaMeta";

interface Row {
  label: string;
  value: string;
}

interface Block {
  title: string;
  rows: Row[];
}

export function buildMetadataTool(): HTMLElement {
  const root = el("div", { class: "tool-panel active" });
  const uploaderHost = el("div");
  const resultHost = el("div");

  function renderDropzone() {
    clear(uploaderHost);
    const button = el("button", { type: "button", class: "file-picker-btn" }, ["choose a file"]);
    const zone = el("div", { class: "dropzone", role: "group", "aria-label": "Inspect a file" }, [
      dropzoneMascot(),
      el("p", {}, ["Drag and drop any file here, or ", button, "."]),
      el("div", { class: "dropzone-meta" }, [el("span", {}, ["Images, video, and audio get the deepest reading"])]),
    ]);
    const input = el("input", { type: "file", class: "sr-only" }) as HTMLInputElement;
    button.addEventListener("click", () => input.click());
    input.addEventListener("change", () => {
      const f = input.files?.[0];
      if (f) void inspect(f);
      input.value = "";
    });
    zone.appendChild(input);

    let dragCounter = 0;
    zone.addEventListener("dragenter", (e) => {
      e.preventDefault();
      dragCounter++;
      zone.classList.add("drag-over");
    });
    zone.addEventListener("dragover", (e) => e.preventDefault());
    zone.addEventListener("dragleave", (e) => {
      e.preventDefault();
      dragCounter = Math.max(0, dragCounter - 1);
      if (dragCounter === 0) zone.classList.remove("drag-over");
    });
    zone.addEventListener("drop", (e) => {
      e.preventDefault();
      dragCounter = 0;
      zone.classList.remove("drag-over");
      const f = e.dataTransfer?.files?.[0];
      if (f) void inspect(f);
    });

    uploaderHost.appendChild(zone);
  }

  async function inspect(file: File) {
    clear(resultHost);
    resultHost.appendChild(el("div", { class: "control-hint" }, ["Reading metadata..."]));

    const fileRows: Row[] = [
      { label: "File name", value: file.name },
      { label: "File size", value: formatBytes(file.size) },
      { label: "MIME type", value: file.type || "Unknown (not reported by the browser)" },
      { label: "Last modified", value: new Date(file.lastModified).toLocaleString() },
    ];

    let detailRows: Row[] = [];
    let detailTitle = "";
    let blocks: Block[] = [];
    let thumbnail: { url: string; blob: Blob } | null = null;
    const notes: string[] = [];

    const isPng = file.type === "image/png" || (await sniffFileType(file)) === "png";

    if (file.type.startsWith("image/")) {
      detailTitle = "Image details";
      const info = await inspectImage(file, isPng);
      detailRows = info.rows;
      blocks = info.blocks;
      thumbnail = info.thumbnail;
      notes.push(...info.notes);
    } else if (file.type.startsWith("video/")) {
      detailTitle = "Video details";
      detailRows = await inspectVideo(file);
      if (!detailRows.length) {
        notes.push("Couldn't read this video's duration or resolution, the file's size and type above are still accurate. This can happen if the file uses a codec this browser can't decode.");
      }
      const isMp4 = file.type === "video/mp4" || file.type === "video/quicktime" || (await sniffFileType(file)) === "mp4" || (await sniffFileType(file)) === "mov";
      if (isMp4) {
        try {
          const mp4Rows = await parseMp4Metadata(file);
          if (mp4Rows.length) blocks.push({ title: "Container metadata (MP4/MOV)", rows: mp4Rows });
        } catch {
          /* not fatal; still have the basic duration/resolution above */
        }
      }
    } else if (file.type.startsWith("audio/")) {
      detailTitle = "Audio details";
      detailRows = await inspectAudio(file);
      if (!detailRows.length) {
        notes.push("Couldn't read this audio file's technical details, the file's size and type above are still accurate. This can happen if the file uses a codec this browser can't decode.");
      }
      const detected = await sniffFileType(file);
      if (file.type === "audio/mpeg" || file.type === "audio/mp3" || detected === "mp3") {
        try {
          const id3Rows = await parseId3Tags(file);
          if (id3Rows.length) blocks.push({ title: "ID3 tags", rows: id3Rows });
        } catch {
          /* not fatal */
        }
      }
      if (file.type === "audio/wav" || file.type === "audio/x-wav" || detected === "wav") {
        try {
          const wavRows = await parseWavMetadata(file);
          if (wavRows.length) blocks.push({ title: "WAV format & tags", rows: wavRows });
        } catch {
          /* not fatal */
        }
      }
    } else {
      notes.push("No deeper metadata is available for this file type in the browser, only the basic file info above.");
    }

    clear(resultHost);
    resultHost.append(metadataTable("File", fileRows));
    if (detailRows.length) resultHost.append(metadataTable(detailTitle, detailRows));
    if (thumbnail) {
      const dlBtn = el("button", { type: "button", class: "secondary-btn" }, ["Download embedded thumbnail"]);
      dlBtn.addEventListener("click", () => triggerDownload(thumbnail!.blob, "embedded-thumbnail.jpg"));
      resultHost.append(
        el("div", { class: "metadata-block" }, [
          el("h3", { class: "metadata-block-title" }, ["Embedded thumbnail"]),
          el("div", { class: "control-hint" }, [
            "Many cameras and editors store a small preview image inside the file, separate from the full picture. Extracted below.",
          ]),
          el("div", { class: "qr-preview" }, [el("img", { src: thumbnail.url, alt: "Embedded thumbnail" })]),
          dlBtn,
        ])
      );
    }
    for (const b of blocks) resultHost.append(metadataTable(b.title, b.rows));
    for (const n of notes) resultHost.append(el("div", { class: "control-hint" }, [n]));

    const another = el("button", { type: "button", class: "secondary-btn", style: "margin-top:14px" }, ["Inspect another file"]);
    another.addEventListener("click", () => {
      renderDropzone();
      clear(resultHost);
    });
    resultHost.append(another);
  }

  renderDropzone();
  root.append(uploaderHost, resultHost);
  return root;
}

function metadataTable(title: string, rows: Row[]): HTMLElement {
  return el("div", { class: "metadata-block" }, [
    el("h3", { class: "metadata-block-title" }, [title]),
    el(
      "div",
      { class: "metadata-table" },
      rows.map((r) =>
        el("div", { class: "metadata-row" }, [
          el("span", { class: "metadata-key" }, [r.label]),
          /^https?:\/\//.test(r.value)
            ? el("a", { class: "metadata-value mono", href: r.value, target: "_blank", rel: "noopener noreferrer" }, [r.value])
            : el("span", { class: "metadata-value mono" }, [r.value]),
        ])
      )
    ),
  ]);
}

// Every EXIF/TIFF sub-block exifr can extract, dumped in full rather than a curated shortlist,
// so nothing stamped on the file is left out just because it wasn't anticipated ahead of time.
const DEEP_EXIF_OPTIONS = {
  tiff: true,
  ifd1: true,
  exif: true,
  gps: true,
  interop: true,
  makerNote: true,
  userComment: true,
  xmp: true,
  icc: true,
  iptc: true,
  jfif: true,
  ihdr: true,
  sanitize: false,
  mergeOutput: false,
  translateKeys: true,
  translateValues: true,
  reviveValues: true,
  firstChunkSize: 128 * 1024,
  chunkSize: 128 * 1024,
  chunkLimit: 20,
} as const;

const SEGMENT_TITLES: [string, string][] = [
  ["ifd0", "Main image tags (IFD0)"],
  ["exif", "Exposure & lens (EXIF sub-IFD)"],
  ["gps", "GPS / location"],
  ["interop", "Interoperability"],
  ["ifd1", "Embedded thumbnail tags (IFD1)"],
  ["iptc", "IPTC (captions, credit, keywords)"],
  ["xmp", "XMP"],
  ["icc", "ICC color profile"],
  ["jfif", "JFIF"],
  ["ihdr", "PNG header (IHDR)"],
];

async function inspectImage(file: File, isPng: boolean): Promise<{ rows: Row[]; blocks: Block[]; notes: string[]; thumbnail: { url: string; blob: Blob } | null }> {
  const rows: Row[] = [];
  const blocks: Block[] = [];
  const notes: string[] = [];
  let thumbnail: { url: string; blob: Blob } | null = null;

  try {
    const dims = await getImageDims(file);
    rows.push({ label: "Dimensions", value: `${dims.width} x ${dims.height} px` });
    rows.push({ label: "Megapixels", value: `${((dims.width * dims.height) / 1_000_000).toFixed(2)} MP` });
  } catch {
    /* dimensions are a nice-to-have, not essential */
  }

  try {
    const exifr = await import("exifr");
    const output = await exifr.parse(file, DEEP_EXIF_OPTIONS);

    if (output) {
      for (const [key, title] of SEGMENT_TITLES) {
        const seg = (output as Record<string, unknown>)[key];
        if (seg && typeof seg === "object") {
          const segRows = objectToRows(seg as Record<string, unknown>);
          if (segRows.length) blocks.push({ title, rows: segRows });
        }
      }

      try {
        const resolved = await exifr.gps(file);
        if (resolved) {
          const mapUrl = `https://www.google.com/maps?q=${resolved.latitude},${resolved.longitude}`;
          const gpsBlock = blocks.find((b) => b.title === "GPS / location");
          const summaryRows: Row[] = [
            { label: "Decimal coordinates", value: `${resolved.latitude.toFixed(6)}, ${resolved.longitude.toFixed(6)}` },
            { label: "View on map", value: mapUrl },
          ];
          if (gpsBlock) gpsBlock.rows.unshift(...summaryRows);
          else blocks.unshift({ title: "GPS / location", rows: summaryRows });
        }
      } catch {
        /* no GPS block, or coordinates couldn't be resolved; the raw gps segment (if any) still shows above */
      }
    }

    if (!blocks.length) {
      notes.push(
        "No embedded metadata tags (EXIF, IPTC, XMP, or ICC) were found in this image. It may have been stripped by an app or social platform, or it never had any."
      );
    }
  } catch {
    notes.push("Couldn't read embedded metadata from this file.");
  }

  if (isPng) {
    try {
      const textRows = await readPngTextChunks(file);
      if (textRows.length) blocks.push({ title: "PNG text chunks (tEXt / iTXt)", rows: textRows });
    } catch {
      /* not fatal; PNG text chunks are a bonus source, not the primary one */
    }
  }

  try {
    const exifr = await import("exifr");
    const thumbBytes = await exifr.thumbnail(file);
    if (thumbBytes) {
      const blob = new Blob([thumbBytes as BlobPart], { type: "image/jpeg" });
      thumbnail = { url: URL.createObjectURL(blob), blob };
    }
  } catch {
    /* not every file has an embedded thumbnail */
  }

  return { rows, blocks, notes, thumbnail };
}

// Turns one exifr segment (a plain object of tag -> value) into display rows, formatting
// whatever comes back rather than assuming a fixed, known set of keys ahead of time.
// Pure structural byte offsets into the file's own TIFF tree. They point at the very sub-IFDs
// this tool already renders as their own separate blocks, so surfacing the raw pointer value
// alongside is noise rather than information.
const STRUCTURAL_POINTER_KEYS = new Set(["ExifIFD", "GPSIFD", "InteropIFD", "InteroperabilityIFD"]);

function objectToRows(seg: Record<string, unknown>): Row[] {
  const rows: Row[] = [];
  for (const [key, value] of Object.entries(seg)) {
    if (value === undefined || value === null) continue;
    if (STRUCTURAL_POINTER_KEYS.has(key)) continue;
    rows.push({ label: humanizeKey(key), value: formatAnyValue(value) });
  }
  return rows;
}

function humanizeKey(key: string): string {
  return key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").trim();
}

const MAX_VALUE_CHARS = 500;

function formatAnyValue(v: unknown): string {
  if (v instanceof Date) return v.toLocaleString();
  if (v instanceof Uint8Array || v instanceof ArrayBuffer) {
    const len = v instanceof Uint8Array ? v.length : v.byteLength;
    return `<binary data, ${formatBytes(len)}>`;
  }
  if (Array.isArray(v)) {
    if (v.length > 24) return `<${v.length} values>`;
    return v.join(", ");
  }
  if (typeof v === "object") {
    const json = JSON.stringify(v);
    return json.length > MAX_VALUE_CHARS ? json.slice(0, MAX_VALUE_CHARS) + "... (truncated)" : json;
  }
  const s = String(v);
  return s.length > MAX_VALUE_CHARS ? s.slice(0, MAX_VALUE_CHARS) + "... (truncated)" : s;
}

// PNG stores free-form text as its own chunk types outside of EXIF entirely, which is where
// tools like Stable Diffusion stash the full generation prompt, seed, and model under a
// "parameters" keyword, and where editors sometimes leave a plain "Comment" or "Software" tag.
// zTXt and compressed iTXt chunks are noted but not inflated, since that needs a zlib library
// this app doesn't otherwise carry.
async function readPngTextChunks(file: File): Promise<Row[]> {
  const buf = new Uint8Array(await file.arrayBuffer());
  const rows: Row[] = [];
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < sig.length; i++) if (buf[i] !== sig[i]) return rows;

  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let offset = 8;
  const decoder = new TextDecoder("utf-8");
  const latin1 = new TextDecoder("latin1");

  while (offset + 8 <= buf.length) {
    const length = view.getUint32(offset);
    const type = latin1.decode(buf.subarray(offset + 4, offset + 8));
    const dataStart = offset + 8;
    if (dataStart + length > buf.length) break;
    const data = buf.subarray(dataStart, dataStart + length);

    if (type === "tEXt") {
      const nul = data.indexOf(0);
      if (nul > -1) {
        const keyword = latin1.decode(data.subarray(0, nul));
        const text = latin1.decode(data.subarray(nul + 1));
        rows.push({ label: keyword, value: text.length > MAX_VALUE_CHARS ? text.slice(0, MAX_VALUE_CHARS) + "... (truncated)" : text });
      }
    } else if (type === "iTXt") {
      const nul1 = data.indexOf(0);
      if (nul1 > -1) {
        const keyword = latin1.decode(data.subarray(0, nul1));
        const compressed = data[nul1 + 1] === 1;
        if (compressed) {
          rows.push({ label: keyword, value: "<compressed iTXt chunk, not decompressed>" });
        } else {
          // skip: compression method byte, language tag (nul-terminated), translated keyword (nul-terminated)
          let p = nul1 + 3;
          const nul2 = data.indexOf(0, p);
          p = nul2 > -1 ? nul2 + 1 : p;
          const nul3 = data.indexOf(0, p);
          p = nul3 > -1 ? nul3 + 1 : p;
          const text = decoder.decode(data.subarray(p));
          rows.push({ label: keyword, value: text.length > MAX_VALUE_CHARS ? text.slice(0, MAX_VALUE_CHARS) + "... (truncated)" : text });
        }
      }
    } else if (type === "zTXt") {
      const nul = data.indexOf(0);
      const keyword = nul > -1 ? latin1.decode(data.subarray(0, nul)) : "(zTXt)";
      rows.push({ label: keyword, value: "<compressed zTXt chunk, not decompressed>" });
    }

    offset = dataStart + length + 4; // + 4 for the CRC
    if (type === "IEND") break;
  }

  return rows;
}

function inspectVideo(file: File): Promise<Row[]> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      const rows: Row[] = [
        { label: "Duration", value: formatSeconds(v.duration) },
        { label: "Resolution", value: `${v.videoWidth} x ${v.videoHeight} px` },
      ];
      URL.revokeObjectURL(url);
      resolve(rows);
    };
    v.onerror = () => {
      URL.revokeObjectURL(url);
      resolve([]);
    };
    v.src = url;
  });
}

async function inspectAudio(file: File): Promise<Row[]> {
  const rows: Row[] = [];

  await new Promise<void>((resolve) => {
    const url = URL.createObjectURL(file);
    const a = document.createElement("audio");
    a.preload = "metadata";
    a.onloadedmetadata = () => {
      rows.push({ label: "Duration", value: formatSeconds(a.duration) });
      URL.revokeObjectURL(url);
      resolve();
    };
    a.onerror = () => {
      URL.revokeObjectURL(url);
      resolve();
    };
    a.src = url;
  });

  try {
    const buf = await file.arrayBuffer();
    const AudioCtxCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtxCtor();
    const decoded = await ctx.decodeAudioData(buf.slice(0));
    rows.push({ label: "Sample rate", value: `${decoded.sampleRate} Hz` });
    rows.push({ label: "Channels", value: String(decoded.numberOfChannels) });
    const bitrate = Math.round((file.size * 8) / decoded.duration / 1000);
    rows.push({ label: "Estimated bitrate", value: `${bitrate} kbps` });
    await ctx.close();
  } catch {
    /* some codecs fail to fully decode this way; the duration above still stands */
  }

  return rows;
}

function formatSeconds(s: number): string {
  if (!Number.isFinite(s)) return "-";
  const m = Math.floor(s / 60);
  const rem = Math.round(s % 60);
  return `${m}:${String(rem).padStart(2, "0")}`;
}

function getImageDims(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = reject;
    img.src = url;
  });
}
