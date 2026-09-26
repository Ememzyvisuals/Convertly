import { el } from "./dom";
import { formatBytes, formatDuration, formatReduction, triggerDownload } from "../lib/format";

export interface ResultPanelInput {
  originalPreviewUrl?: string;
  originalIsVideo?: boolean;
  previewUrl?: string;
  previewIsVideo?: boolean;
  previewIsAudio?: boolean;
  outputName: string;
  outputFormatLabel: string;
  originalBytes: number;
  outputBytes: number;
  processingMs: number;
  blob: Blob;
  /** e.g. "Lossy re-encode, visually similar quality, not pixel-identical." */
  honestyNote: string;
  onRunAnother?: () => void;
}

function previewBox(url: string | undefined, isVideo: boolean | undefined, alt: string, isAudio?: boolean): HTMLElement {
  const box = el("div", { class: `result-preview${isAudio ? " result-preview-audio" : ""}` });
  if (url) {
    if (isAudio) {
      const a = el("audio", { src: url, controls: "" }) as HTMLAudioElement;
      box.appendChild(a);
    } else if (isVideo) {
      const v = el("video", { src: url, controls: "", muted: "", playsinline: "" }) as HTMLVideoElement;
      box.appendChild(v);
    } else {
      const img = el("img", { src: url, alt });
      box.appendChild(img);
    }
  }
  return box;
}

export function renderResultPanel(input: ResultPanelInput): HTMLElement {
  const root = el("div", { class: "result-panel" });

  const downloadBtn = el("a", { class: "download-btn", href: "#" }, ["Download"]);
  downloadBtn.addEventListener("click", (e) => {
    e.preventDefault();
    triggerDownload(input.blob, input.outputName);
  });

  const resultBlock = el("div", { class: "preview-block" }, [
    el("div", { class: "preview-label" }, ["Result"]),
    previewBox(input.previewUrl, input.previewIsVideo, "Result preview", input.previewIsAudio),
    downloadBtn,
  ]);

  const compare = el("div", { class: "result-compare" });
  if (input.originalPreviewUrl) {
    const originalBlock = el("div", { class: "preview-block" }, [
      el("div", { class: "preview-label" }, ["Original"]),
      previewBox(input.originalPreviewUrl, input.originalIsVideo, "Original file preview", input.previewIsAudio),
    ]);
    compare.append(originalBlock, resultBlock);
  } else {
    compare.append(resultBlock);
  }

  const reduction = formatReduction(input.originalBytes, input.outputBytes);
  const isSmaller = input.outputBytes <= input.originalBytes;

  const stats = el("div", { class: "result-stats" }, [
    statBlock("Output file", input.outputName),
    statBlock("Format", input.outputFormatLabel),
    statBlock("Original size", formatBytes(input.originalBytes)),
    statBlock("Output size", formatBytes(input.outputBytes)),
    statBlock("Change", reduction, isSmaller ? "good" : "warn"),
    statBlock("Processing time", formatDuration(input.processingMs)),
  ]);

  const actions = el("div", { class: "result-actions" });
  if (input.onRunAnother) {
    const another = el("button", { type: "button", class: "secondary-btn" }, ["Process another file"]);
    another.addEventListener("click", input.onRunAnother);
    actions.appendChild(another);
  }

  const note = el("div", { class: "result-honesty-note" }, [input.honestyNote]);

  root.append(compare, stats, actions, note);
  return root;
}

function statBlock(label: string, value: string, tone?: "good" | "warn"): HTMLElement {
  const wrap = el("div", { class: "stat" });
  wrap.append(el("div", { class: "stat-label" }, [label]), el("div", { class: `stat-value${tone ? " " + tone : ""}` }, [value]));
  return wrap;
}
