import { el, clear } from "../ui/dom";
import { dropzoneMascot } from "../ui/upload";
import { formatBytes } from "../lib/format";

interface Row {
  label: string;
  value: string;
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
    const notes: string[] = [];

    if (file.type.startsWith("image/")) {
      detailTitle = "Image details";
      const info = await inspectImage(file);
      detailRows = info.rows;
      notes.push(...info.notes);
    } else if (file.type.startsWith("video/")) {
      detailTitle = "Video details";
      detailRows = await inspectVideo(file);
      if (!detailRows.length) {
        notes.push("Couldn't read this video's duration or resolution, the file's size and type above are still accurate. This can happen if the file uses a codec this browser can't decode.");
      }
    } else if (file.type.startsWith("audio/")) {
      detailTitle = "Audio details";
      detailRows = await inspectAudio(file);
      if (!detailRows.length) {
        notes.push("Couldn't read this audio file's technical details, the file's size and type above are still accurate. This can happen if the file uses a codec this browser can't decode.");
      }
    } else {
      notes.push("No deeper metadata is available for this file type in the browser, only the basic file info above.");
    }

    clear(resultHost);
    resultHost.append(metadataTable("File", fileRows));
    if (detailRows.length) resultHost.append(metadataTable(detailTitle, detailRows));
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
          el("span", { class: "metadata-value mono" }, [r.value]),
        ])
      )
    ),
  ]);
}

async function inspectImage(file: File): Promise<{ rows: Row[]; notes: string[] }> {
  const rows: Row[] = [];
  const notes: string[] = [];

  try {
    const dims = await getImageDims(file);
    rows.push({ label: "Dimensions", value: `${dims.width} x ${dims.height} px` });
    rows.push({ label: "Megapixels", value: `${((dims.width * dims.height) / 1_000_000).toFixed(2)} MP` });
  } catch {
    /* dimensions are a nice-to-have, not essential */
  }

  try {
    const exifr = await import("exifr");
    const tags = await exifr.parse(file, { gps: true, tiff: true, exif: true, iptc: true, xmp: true });
    const before = rows.length;
    if (tags) {
      const wanted: [string, string][] = [
        ["Make", "Camera make"],
        ["Model", "Camera model"],
        ["LensModel", "Lens"],
        ["DateTimeOriginal", "Date taken"],
        ["ISO", "ISO"],
        ["FNumber", "Aperture"],
        ["ExposureTime", "Shutter speed"],
        ["FocalLength", "Focal length"],
        ["Software", "Software"],
        ["Orientation", "Orientation"],
      ];
      for (const [key, label] of wanted) {
        const v = tags[key];
        if (v !== undefined && v !== null) rows.push({ label, value: formatExifValue(key, v) });
      }
      if (typeof tags.latitude === "number" && typeof tags.longitude === "number") {
        rows.push({ label: "GPS location", value: `${tags.latitude.toFixed(6)}, ${tags.longitude.toFixed(6)}` });
      }
    }
    if (rows.length === before) notes.push("No camera or EXIF metadata was found in this image, it may have been stripped, or it wasn't from a camera.");
  } catch {
    notes.push("Couldn't read EXIF metadata from this file.");
  }

  return { rows, notes };
}

function formatExifValue(key: string, v: unknown): string {
  if (key === "DateTimeOriginal" && v instanceof Date) return v.toLocaleString();
  if (key === "ExposureTime" && typeof v === "number") return v < 1 ? `1/${Math.round(1 / v)} s` : `${v} s`;
  if (key === "FNumber") return `f/${v}`;
  if (key === "FocalLength") return `${v} mm`;
  return String(v);
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
