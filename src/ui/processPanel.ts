import { el, clear } from "./dom";

export interface ProcessPanel {
  root: HTMLElement;
  setStep: (stepLabel: string) => void;
  setProgress: (ratio: number | null) => void;
  setCaption: (text: string) => void;
  destroy: () => void;
}

export function createProcessPanel(steps: string[]): ProcessPanel {
  const root = el("div", { class: "process-panel", role: "status", "aria-live": "polite" });
  const stepsRow = el("div", { class: "process-steps" });
  const track = el("div", { class: "progress-track" });
  const fill = el("div", { class: "progress-fill" });
  const caption = el("div", { class: "process-caption" }, ["Starting…"]);

  track.appendChild(fill);

  const stepEls = steps.map((label) => {
    const e = el("span", { class: "process-step" }, [label]);
    stepsRow.appendChild(e);
    return { label, e };
  });

  root.append(stepsRow, track, caption);

  function setStep(stepLabel: string) {
    let matched = false;
    for (const { label, e } of stepEls) {
      if (matched) {
        e.className = "process-step";
      } else if (label.toLowerCase() === stepLabel.toLowerCase()) {
        e.className = "process-step active";
        matched = true;
      } else {
        e.className = "process-step done";
      }
    }
    if (!matched) {
      // Custom phase text not in the fixed step list (e.g. "Loading video engine"), show as caption only.
    }
    caption.textContent = stepLabel;
  }

  function setProgress(ratio: number | null) {
    if (ratio === null) {
      fill.style.width = "0%";
      track.style.opacity = "0.4";
    } else {
      track.style.opacity = "1";
      fill.style.width = `${Math.round(Math.max(0, Math.min(1, ratio)) * 100)}%`;
    }
  }

  function setCaption(text: string) {
    caption.textContent = text;
  }

  return {
    root,
    setStep,
    setProgress,
    setCaption,
    destroy: () => clear(root),
  };
}
