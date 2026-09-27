import { el, clear } from "../ui/dom";
import { createUploader, createMultiUploader } from "../ui/upload";
import { createProcessPanel } from "../ui/processPanel";
import { formatBytes, triggerDownload } from "../lib/format";
import type { DetectedKind } from "../lib/validate";
import { getUsageStatus, recordCompletedOperation } from "../lib/usageLimit";
import { createUsageStrip, usageLimitReachedPanel } from "../ui/usageBadge";
import { filesToZip, extractZip, type ExtractedEntry } from "../lib/archiveTools";

function errorBox(message: string): HTMLElement {
  return el("div", { class: "validation-error" }, [el("strong", {}, ["Something went wrong. "]), message]);
}

function statBlock(label: string, value: string): HTMLElement {
  const wrap = el("div", { class: "stat" });
  wrap.append(el("div", { class: "stat-label" }, [label]), el("div", { class: "stat-value" }, [value]));
  return wrap;
}

function downloadRow(blob: Blob, filename: string, label = "Download"): HTMLElement {
  const btn = el("a", { class: "download-btn", href: "#" }, [label]);
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    triggerDownload(blob, filename);
  });
  return el("div", { class: "preview-block" }, [btn]);
}

// ---------------- Create zip ----------------

const ANY_KIND: DetectedKind[] = [
  "png", "jpeg", "webp", "gif", "bmp", "avif", "svg",
  "mp4", "webm", "mov", "mkv", "avi",
  "pdf", "zip",
  "mp3", "wav", "ogg", "flac", "m4a",
];

export function buildCreateZip(): HTMLElement {
  const wrap = el("div");
  let files: File[] = [];
  const processArea = el("div");
  const usage = createUsageStrip();
  const bodyHost = el("div");

  const note = el("div", { class: "control-hint", style: "margin-bottom:18px" }, [
    "Add any files. They're zipped together in your browser and never uploaded anywhere.",
  ]);

  const uploader = createMultiUploader({
    accept: ANY_KIND,
    acceptLabel: "Any supported file type, add as many as you like",
    inputAccept: "*",
    maxBytes: 2 * 1024 * 1024 * 1024,
    onChange: (f) => {
      files = f;
      renderBody();
    },
  });

  function renderBody() {
    clear(bodyHost);
    if (files.length === 0) return;
    const runBtn = el("button", { type: "button", class: "run-btn" }, [
      `Zip ${files.length} file${files.length === 1 ? "" : "s"}`,
    ]);
    runBtn.addEventListener("click", () => run());
    bodyHost.appendChild(runBtn);
  }

  async function run() {
    if (getUsageStatus().atLimit) {
      clear(processArea);
      processArea.appendChild(usageLimitReachedPanel());
      return;
    }
    const panel = createProcessPanel(["Reading files", "Compressing", "Ready"]);
    clear(processArea);
    processArea.appendChild(panel.root);
    panel.setStep("Reading files");
    try {
      panel.setStep("Compressing");
      const totalIn = files.reduce((s, f) => s + f.size, 0);
      const blob = await filesToZip(files, (pct) => {
        panel.setProgress(pct / 100);
        panel.setCaption(`Compressing, ${Math.round(pct)}%`);
      });
      panel.setStep("Ready");
      recordCompletedOperation();
      usage.refresh();
      clear(processArea);
      processArea.append(
        el("div", { class: "result-stats" }, [
          statBlock("Files", String(files.length)),
          statBlock("Original size", formatBytes(totalIn)),
          statBlock("Zip size", formatBytes(blob.size)),
        ]),
        downloadRow(blob, "archive.zip"),
        el("div", { class: "result-honesty-note" }, [
          "Standard DEFLATE compression. Already-compressed files (JPEGs, MP4s, other zips) won't shrink much further, that's how compression works, not a limitation of this tool.",
        ])
      );
    } catch (err) {
      clear(processArea);
      processArea.appendChild(errorBox(err instanceof Error ? err.message : "Could not build the zip."));
    }
  }

  wrap.append(note, uploader.root, bodyHost, processArea, usage.root);
  return wrap;
}

// ---------------- Extract zip ----------------

export function buildExtractZip(): HTMLElement {
  const wrap = el("div");
  const processArea = el("div");
  const usage = createUsageStrip();

  const uploader = createUploader({
    accept: ["zip"] as DetectedKind[],
    acceptLabel: "ZIP",
    inputAccept: "application/zip",
    onFileReady: (file) => run(file),
    onCleared: () => clear(processArea),
  });

  async function run(file: File) {
    if (getUsageStatus().atLimit) {
      clear(processArea);
      processArea.appendChild(usageLimitReachedPanel());
      return;
    }
    const panel = createProcessPanel(["Reading zip", "Extracting", "Ready"]);
    clear(processArea);
    processArea.appendChild(panel.root);
    panel.setStep("Reading zip");
    try {
      panel.setStep("Extracting");
      const entries = await extractZip(file);
      panel.setStep("Ready");
      recordCompletedOperation();
      usage.refresh();
      clear(processArea);

      if (entries.length === 0) {
        processArea.appendChild(errorBox("This zip doesn't contain any files."));
        return;
      }

      const list = el("div", { class: "multi-file-list" });
      entries.forEach((entry: ExtractedEntry) => {
        const row = el("div", { class: "multi-file-row" }, [
          el("div", { class: "multi-file-meta" }, [
            el("div", { class: "file-name" }, [entry.name]),
            el("div", { class: "file-sub mono" }, [formatBytes(entry.size)]),
          ]),
        ]);
        const dl = el("a", { class: "secondary-btn", href: "#" }, ["Download"]);
        dl.addEventListener("click", (e) => {
          e.preventDefault();
          triggerDownload(entry.blob, entry.name);
        });
        row.appendChild(dl);
        list.appendChild(row);
      });

      processArea.append(
        el("div", { class: "result-stats" }, [statBlock("Files found", String(entries.length))]),
        list,
        el("div", { class: "result-honesty-note" }, [
          `${entries.length} file${entries.length === 1 ? "" : "s"} read from the actual zip contents. Download each one individually.`,
        ])
      );
    } catch (err) {
      clear(processArea);
      processArea.appendChild(errorBox(err instanceof Error ? err.message : "Could not read this zip. It may be corrupt or password-protected."));
    }
  }

  wrap.append(uploader.root, processArea, usage.root);
  return wrap;
}
