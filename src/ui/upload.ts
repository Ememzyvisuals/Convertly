import { el, clear } from "./dom";
import { type DetectedKind, validateFile } from "../lib/validate";
import { formatBytes, getExtension } from "../lib/format";

export interface UploaderOptions {
  accept: DetectedKind[];
  acceptLabel: string;
  inputAccept: string; // for the native <input accept="">
  maxBytes?: number;
  onFileReady: (file: File, detected: DetectedKind) => void;
  onCleared?: () => void;
}

export interface Uploader {
  root: HTMLElement;
  reset: () => void;
}

// The dropzone's centerpiece is a small crop of Convertly's own mascot (the same character
// from the landing page hero, not a generic upload glyph), so the upload step still feels
// like part of the same product rather than a borrowed form control.
function dropzoneMascot(): HTMLElement {
  const wrap = el("div", { class: "dropzone-icon" });
  wrap.innerHTML = `
    <picture>
      <source srcset="/brand/mascot-bust.webp" type="image/webp" />
      <img src="/brand/mascot-bust.png" alt="" width="130" height="115" />
    </picture>`;
  return wrap;
}

export function createUploader(opts: UploaderOptions): Uploader {
  const root = el("div", { class: "uploader" });
  let dragCounter = 0;

  function renderDropzone() {
    clear(root);
    const button = el("button", { type: "button", class: "file-picker-btn" }, ["choose a file"]);
    const zone = el("div", { class: "dropzone", role: "group", "aria-label": "Upload a file" }, [
      dropzoneMascot(),
      el("p", {}, ["Drag and drop a file here, or ", button, "."]),
      el("div", { class: "dropzone-meta" }, [
        el("span", {}, ["Accepted: ", opts.acceptLabel]),
        opts.maxBytes ? el("span", {}, [`Max size: ${formatBytes(opts.maxBytes)}`]) : null,
      ].filter(Boolean) as HTMLElement[]),
    ]);

    const input = el("input", {
      type: "file",
      accept: opts.inputAccept,
      class: "sr-only",
      id: "file-input-" + Math.random().toString(36).slice(2),
    }) as HTMLInputElement;

    button.addEventListener("click", () => input.click());

    input.addEventListener("change", () => {
      const f = input.files?.[0];
      if (f) void handleFile(f);
      input.value = "";
    });

    zone.appendChild(input);
    root.appendChild(zone);

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
      if (f) void handleFile(f);
    });
  }

  function renderError(message: string, detected: DetectedKind) {
    clear(root);
    root.appendChild(
      el("div", { class: "validation-error" }, [
        (() => {
          const s = el("strong", {}, ["Can't use this file. "]);
          return s;
        })(),
        message + (detected !== "unknown" ? ` (detected: ${detected.toUpperCase()})` : ""),
      ])
    );
    const retry = el("button", { type: "button", class: "secondary-btn", style: "margin-top:14px" }, ["Try another file"]);
    retry.addEventListener("click", () => renderDropzone());
    root.appendChild(retry);
  }

  async function renderFileCard(file: File) {
    clear(root);
    const card = el("div", { class: "file-card" });

    const ext = getExtension(file.name).toUpperCase() || "FILE";
    let thumb: HTMLElement;
    if (file.type.startsWith("image/")) {
      const img = el("img", { class: "file-thumb", alt: "" }) as HTMLImageElement;
      img.src = URL.createObjectURL(file);
      thumb = img;
    } else {
      thumb = el("div", { class: "file-thumb-fallback" }, [ext.slice(0, 4)]);
    }

    const meta = el("div", { class: "file-meta" }, [
      el("div", { class: "file-name" }, [file.name]),
      el("div", { class: "file-sub" }, [
        el("span", { class: "mono" }, [`${formatBytes(file.size)} · ${ext}`]),
        el("span", { class: "file-status" }, ["Ready"]),
      ]),
    ]);

    const remove = el("button", { type: "button", class: "file-remove", "aria-label": "Remove file" }, ["×"]);
    remove.addEventListener("click", () => {
      opts.onCleared?.();
      renderDropzone();
    });

    card.append(thumb, meta, remove);
    root.appendChild(card);
  }

  async function handleFile(file: File) {
    const result = await validateFile(file, { accept: opts.accept, maxBytes: opts.maxBytes });
    if (!result.ok) {
      renderError(result.reason ?? "This file can't be used here.", result.detected);
      return;
    }
    await renderFileCard(file);
    opts.onFileReady(file, result.detected);
  }

  renderDropzone();

  return {
    root,
    reset: () => {
      renderDropzone();
    },
  };
}

export interface MultiUploaderOptions {
  accept: DetectedKind[];
  acceptLabel: string;
  inputAccept: string;
  maxBytes?: number;
  maxFiles?: number;
  /** Called whenever the ordered file list changes (add, remove, or reorder). */
  onChange: (files: File[]) => void;
}

export interface MultiUploader {
  root: HTMLElement;
  reset: () => void;
}

/**
 * A multi-file uploader with an ordered list (up/down to reorder, since PDF merge and
 * images-to-PDF both care about order, and drag-reorder is fiddly to get right on touch).
 */
export function createMultiUploader(opts: MultiUploaderOptions): MultiUploader {
  const root = el("div", { class: "uploader multi-uploader" });
  const listHost = el("div", { class: "multi-file-list" });
  let files: File[] = [];
  let dragCounter = 0;

  const input = el("input", {
    type: "file",
    multiple: "",
    accept: opts.inputAccept,
    class: "sr-only",
  }) as HTMLInputElement;
  const button = el("button", { type: "button", class: "file-picker-btn" }, ["choose files"]);
  button.addEventListener("click", () => input.click());

  const zone = el("div", { class: "dropzone", role: "group", "aria-label": "Add files" }, [
    dropzoneMascot(),
    el("p", {}, ["Drag and drop files here, or ", button, "."]),
    el("div", { class: "dropzone-meta" }, [
      el("span", {}, ["Accepted: ", opts.acceptLabel]),
      opts.maxBytes ? el("span", {}, [`Max size: ${formatBytes(opts.maxBytes)}`]) : null,
    ].filter(Boolean) as HTMLElement[]),
  ]);

  input.addEventListener("change", () => {
    if (input.files) void addFiles(Array.from(input.files));
    input.value = "";
  });

  zone.appendChild(input);

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
    if (e.dataTransfer?.files) void addFiles(Array.from(e.dataTransfer.files));
  });

  async function addFiles(candidates: File[]) {
    for (const file of candidates) {
      if (opts.maxFiles && files.length >= opts.maxFiles) break;
      const result = await validateFile(file, { accept: opts.accept, maxBytes: opts.maxBytes });
      if (!result.ok) continue; // multi-uploader skips invalid files quietly rather than blocking the whole batch
      files.push(file);
    }
    renderList();
  }

  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= files.length) return;
    [files[index], files[target]] = [files[target], files[index]];
    renderList();
  }

  function removeAt(index: number) {
    files.splice(index, 1);
    renderList();
  }

  function renderList() {
    clear(listHost);
    files.forEach((file, i) => {
      const ext = getExtension(file.name).toUpperCase() || "FILE";
      const row = el("div", { class: "multi-file-row" }, [
        el("span", { class: "multi-file-index mono" }, [String(i + 1)]),
        el("div", { class: "multi-file-meta" }, [
          el("div", { class: "file-name" }, [file.name]),
          el("div", { class: "file-sub" }, [
            el("span", { class: "mono" }, [`${formatBytes(file.size)} · ${ext}`]),
            el("span", { class: "file-status" }, ["Ready"]),
          ]),
        ]),
        el("div", { class: "multi-file-actions" }, [
          (() => {
            const up = el("button", { type: "button", class: "file-remove", "aria-label": "Move up" }, ["↑"]);
            up.addEventListener("click", () => move(i, -1));
            if (i === 0) up.setAttribute("disabled", "");
            return up;
          })(),
          (() => {
            const down = el("button", { type: "button", class: "file-remove", "aria-label": "Move down" }, ["↓"]);
            down.addEventListener("click", () => move(i, 1));
            if (i === files.length - 1) down.setAttribute("disabled", "");
            return down;
          })(),
          (() => {
            const rm = el("button", { type: "button", class: "file-remove", "aria-label": "Remove" }, ["×"]);
            rm.addEventListener("click", () => removeAt(i));
            return rm;
          })(),
        ]),
      ]);
      listHost.appendChild(row);
    });
    opts.onChange(files);
  }

  root.append(zone, listHost);

  return {
    root,
    reset: () => {
      files = [];
      renderList();
    },
  };
}
