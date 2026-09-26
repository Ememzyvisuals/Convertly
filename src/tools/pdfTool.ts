import { el, clear } from "../ui/dom";
import { createUploader, createMultiUploader } from "../ui/upload";
import { segmentedControl, rangeControl } from "../ui/controls";
import { createProcessPanel } from "../ui/processPanel";
import { formatBytes, stripExtension, triggerDownload } from "../lib/format";
import type { DetectedKind } from "../lib/validate";
import { getUsageStatus, recordCompletedOperation } from "../lib/usageLimit";
import { createUsageStrip, usageLimitReachedPanel } from "../ui/usageBadge";
import { imagesToPdf, pdfToImages, mergePdfs, splitPdf, getPdfPageCount } from "../lib/pdfTools";
import { filesToZip } from "../lib/archiveTools";

type SubMode = "img2pdf" | "pdf2img" | "merge" | "split";

export function buildPdfTool(): HTMLElement {
  const root = el("div", { class: "tool-panel", id: "panel-pdf" });

  let mode: SubMode = "img2pdf";
  const modeSwitch = segmentedControl<SubMode>(
    "What do you want to do",
    [
      { value: "img2pdf", label: "Images to PDF" },
      { value: "pdf2img", label: "PDF to images" },
      { value: "merge", label: "Merge PDFs" },
      { value: "split", label: "Split PDF" },
    ],
    mode,
    (v) => {
      mode = v;
      renderSub();
    }
  );

  const subHost = el("div");

  function renderSub() {
    modeSwitch.setValue(mode);
    clear(subHost);
    if (mode === "img2pdf") subHost.appendChild(buildImagesToPdf());
    else if (mode === "pdf2img") subHost.appendChild(buildPdfToImages());
    else if (mode === "merge") subHost.appendChild(buildMergePdfs());
    else subHost.appendChild(buildSplitPdf());
  }

  root.append(modeSwitch.root, subHost);
  renderSub();
  return root;
}

function errorBox(message: string): HTMLElement {
  return el("div", { class: "validation-error" }, [el("strong", {}, ["Something went wrong. "]), message]);
}

// ---------------- Images to PDF ----------------

function buildImagesToPdf(): HTMLElement {
  const wrap = el("div");
  let files: File[] = [];
  let pageMode: "fit" | "native" = "fit";

  const processArea = el("div");
  const usage = createUsageStrip();

  const uploader = createMultiUploader({
    accept: ["png", "jpeg", "webp", "bmp", "gif"] as DetectedKind[],
    acceptLabel: "PNG · JPEG · WebP · BMP, add as many as you like",
    inputAccept: "image/png,image/jpeg,image/webp,image/bmp,image/gif",
    onChange: (f) => {
      files = f;
      renderBody();
    },
  });

  const modeCtrl = segmentedControl<"fit" | "native">(
    "Page sizing",
    [
      { value: "fit", label: "A4 pages, centered" },
      { value: "native", label: "One page per image size" },
    ],
    pageMode,
    (v) => (pageMode = v)
  );

  const bodyHost = el("div");
  function renderBody() {
    clear(bodyHost);
    if (files.length === 0) return;
    const runBtn = el("button", { type: "button", class: "run-btn" }, [
      `Combine ${files.length} image${files.length === 1 ? "" : "s"} into a PDF`,
    ]);
    runBtn.addEventListener("click", () => run());
    bodyHost.append(modeCtrl.root, runBtn);
  }

  async function run() {
    if (getUsageStatus().atLimit) {
      clear(processArea);
      processArea.appendChild(usageLimitReachedPanel());
      return;
    }
    const panel = createProcessPanel(["Reading images", "Building PDF", "Ready"]);
    clear(processArea);
    processArea.appendChild(panel.root);
    panel.setStep("Reading images");
    try {
      panel.setStep("Building PDF");
      const blob = await imagesToPdf(files, { pageMode });
      panel.setStep("Ready");
      recordCompletedOperation();
      usage.refresh();
      clear(processArea);
      const name = `${stripExtension(files[0].name) || "images"}-combined.pdf`;
      processArea.append(
        el("div", { class: "result-stats" }, [
          statBlock("Pages", String(files.length)),
          statBlock("Output size", formatBytes(blob.size)),
        ]),
        downloadRow(blob, name),
        el("div", { class: "result-honesty-note" }, [
          "Images are placed as-is at the quality they were uploaded at. This doesn't re-compress or re-encode the images.",
        ])
      );
    } catch (err) {
      clear(processArea);
      processArea.appendChild(errorBox(err instanceof Error ? err.message : "Could not build the PDF."));
    }
  }

  wrap.append(uploader.root, bodyHost, processArea, usage.root);
  return wrap;
}

// ---------------- PDF to images ----------------

function buildPdfToImages(): HTMLElement {
  const wrap = el("div");
  let currentFile: File | null = null;
  let scale = 2;

  const processArea = el("div");
  const usage = createUsageStrip();
  const bodyHost = el("div");

  const uploader = createUploader({
    accept: ["pdf"] as DetectedKind[],
    acceptLabel: "PDF",
    inputAccept: "application/pdf",
    onFileReady: (file) => {
      currentFile = file;
      renderBody();
    },
    onCleared: () => {
      currentFile = null;
      clear(bodyHost);
      clear(processArea);
    },
  });

  function renderBody() {
    clear(bodyHost);
    if (!currentFile) return;
    const file = currentFile;

    const scaleCtrl = rangeControl(
      "Image quality",
      1,
      4,
      0.5,
      scale,
      (v) => (scale = v),
      (v) => `${v}x`,
      "Higher renders sharper images at a larger file size per page."
    );

    const runBtn = el("button", { type: "button", class: "run-btn" }, ["Convert pages to images"]);
    runBtn.addEventListener("click", () => run(file));

    bodyHost.append(scaleCtrl.root, runBtn);
  }

  async function run(file: File) {
    if (getUsageStatus().atLimit) {
      clear(processArea);
      processArea.appendChild(usageLimitReachedPanel());
      return;
    }
    const panel = createProcessPanel(["Reading PDF", "Rendering pages", "Packaging", "Ready"]);
    clear(processArea);
    processArea.appendChild(panel.root);
    panel.setStep("Reading PDF");
    try {
      panel.setStep("Rendering pages");
      const { pages } = await pdfToImages(file, scale, (done, total) => {
        panel.setProgress(done / total);
        panel.setCaption(`Rendering page ${done} of ${total}`);
      });
      panel.setStep("Packaging");
      const base = stripExtension(file.name) || "pdf";
      recordCompletedOperation();
      usage.refresh();
      panel.setStep("Ready");
      clear(processArea);

      if (pages.length === 1) {
        processArea.append(
          el("div", { class: "result-stats" }, [
            statBlock("Pages", "1"),
            statBlock("Output size", formatBytes(pages[0].size)),
          ]),
          downloadRow(pages[0], `${base}-page-1.png`),
          el("div", { class: "result-honesty-note" }, ["Rendered from the actual page content, not a placeholder."])
        );
      } else {
        const zipBlob = await filesToZip(
          pages.map((b, i) => new File([b], `${base}-page-${i + 1}.png`, { type: "image/png" }))
        );
        processArea.append(
          el("div", { class: "result-stats" }, [
            statBlock("Pages", String(pages.length)),
            statBlock("Zip size", formatBytes(zipBlob.size)),
          ]),
          downloadRow(zipBlob, `${base}-pages.zip`),
          el("div", { class: "result-honesty-note" }, [
            `All ${pages.length} pages rendered from the actual PDF content and packed into one zip.`,
          ])
        );
      }
    } catch (err) {
      clear(processArea);
      processArea.appendChild(errorBox(err instanceof Error ? err.message : "Could not read this PDF."));
    }
  }

  wrap.append(uploader.root, bodyHost, processArea, usage.root);
  return wrap;
}

// ---------------- Merge PDFs ----------------

function buildMergePdfs(): HTMLElement {
  const wrap = el("div");
  let files: File[] = [];
  const processArea = el("div");
  const usage = createUsageStrip();
  const bodyHost = el("div");

  const uploader = createMultiUploader({
    accept: ["pdf"] as DetectedKind[],
    acceptLabel: "PDF, add two or more, in the order you want them merged",
    inputAccept: "application/pdf",
    onChange: (f) => {
      files = f;
      renderBody();
    },
  });

  function renderBody() {
    clear(bodyHost);
    if (files.length < 2) {
      if (files.length === 1) bodyHost.appendChild(el("div", { class: "control-hint" }, ["Add at least one more PDF to merge."]));
      return;
    }
    const runBtn = el("button", { type: "button", class: "run-btn" }, [`Merge ${files.length} PDFs`]);
    runBtn.addEventListener("click", () => run());
    bodyHost.appendChild(runBtn);
  }

  async function run() {
    if (getUsageStatus().atLimit) {
      clear(processArea);
      processArea.appendChild(usageLimitReachedPanel());
      return;
    }
    const panel = createProcessPanel(["Reading PDFs", "Merging", "Ready"]);
    clear(processArea);
    processArea.appendChild(panel.root);
    panel.setStep("Reading PDFs");
    try {
      panel.setStep("Merging");
      const blob = await mergePdfs(files);
      panel.setStep("Ready");
      recordCompletedOperation();
      usage.refresh();
      clear(processArea);
      processArea.append(
        el("div", { class: "result-stats" }, [
          statBlock("Files merged", String(files.length)),
          statBlock("Output size", formatBytes(blob.size)),
        ]),
        downloadRow(blob, "merged.pdf"),
        el("div", { class: "result-honesty-note" }, ["Pages are copied in the order shown above, unchanged."])
      );
    } catch (err) {
      clear(processArea);
      processArea.appendChild(errorBox(err instanceof Error ? err.message : "Could not merge these PDFs."));
    }
  }

  wrap.append(uploader.root, bodyHost, processArea, usage.root);
  return wrap;
}

// ---------------- Split PDF ----------------

function buildSplitPdf(): HTMLElement {
  const wrap = el("div");
  const processArea = el("div");
  const usage = createUsageStrip();
  const bodyHost = el("div");

  const uploader = createUploader({
    accept: ["pdf"] as DetectedKind[],
    acceptLabel: "PDF",
    inputAccept: "application/pdf",
    onFileReady: (file) => {
      renderBody(file);
    },
    onCleared: () => {
      clear(bodyHost);
      clear(processArea);
    },
  });

  async function renderBody(file: File) {
    clear(bodyHost);
    let count = "?";
    try {
      count = String(await getPdfPageCount(file));
    } catch {
      /* shown as ? if it can't be read yet, run will surface the real error */
    }
    const runBtn = el("button", { type: "button", class: "run-btn" }, [`Split into ${count} single-page PDFs`]);
    runBtn.addEventListener("click", () => run(file));
    bodyHost.appendChild(runBtn);
  }

  async function run(file: File) {
    if (getUsageStatus().atLimit) {
      clear(processArea);
      processArea.appendChild(usageLimitReachedPanel());
      return;
    }
    const panel = createProcessPanel(["Reading PDF", "Splitting", "Packaging", "Ready"]);
    clear(processArea);
    processArea.appendChild(panel.root);
    panel.setStep("Reading PDF");
    try {
      panel.setStep("Splitting");
      const { pages } = await splitPdf(file);
      panel.setStep("Packaging");
      const base = stripExtension(file.name) || "pdf";
      const zipBlob = await filesToZip(
        pages.map((b, i) => new File([b], `${base}-page-${i + 1}.pdf`, { type: "application/pdf" }))
      );
      recordCompletedOperation();
      usage.refresh();
      panel.setStep("Ready");
      clear(processArea);
      processArea.append(
        el("div", { class: "result-stats" }, [
          statBlock("Pages", String(pages.length)),
          statBlock("Zip size", formatBytes(zipBlob.size)),
        ]),
        downloadRow(zipBlob, `${base}-split.zip`),
        el("div", { class: "result-honesty-note" }, ["Each page becomes its own single-page PDF, zipped together."])
      );
    } catch (err) {
      clear(processArea);
      processArea.appendChild(errorBox(err instanceof Error ? err.message : "Could not split this PDF."));
    }
  }

  wrap.append(uploader.root, bodyHost, processArea, usage.root);
  return wrap;
}

// ---------------- shared bits ----------------

function statBlock(label: string, value: string): HTMLElement {
  const wrap = el("div", { class: "stat" });
  wrap.append(el("div", { class: "stat-label" }, [label]), el("div", { class: "stat-value" }, [value]));
  return wrap;
}

function downloadRow(blob: Blob, filename: string): HTMLElement {
  const btn = el("a", { class: "download-btn", href: "#" }, ["Download"]);
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    triggerDownload(blob, filename);
  });
  return el("div", { class: "preview-block" }, [btn]);
}
