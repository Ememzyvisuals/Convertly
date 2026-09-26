// Convertly Studio's guided tour: a real, interactive walkthrough of the actual Studio
// interface, not a slideshow of screenshots and not a separate mock editor. It drives the
// same navigation functions and the same DOM the app itself uses, auto-loading a small bundled
// demo image/clip so every step has genuine content to point at, then spotlights one real
// element at a time with a dimmed backdrop, a curved animated arrow, and a short explanation.
import { el } from "./dom";

export interface TourStep {
  id: string;
  title: string;
  body: string;
  /** Navigates to the view this step lives in. Only called when actually changing view (see
   * runStep), so a step doesn't re-trigger a fresh upload/reload if the previous step already
   * left the tour on the same screen. */
  goTo: () => void | Promise<void>;
  /** CSS selector for the real element this step spotlights. Polled for up to a few seconds
   * after goTo, since some views mount their content asynchronously (an on-demand chunk, an
   * uploaded file being processed). Omit for a plain centered step (Welcome/Finish). */
  selector?: string;
  /** A selector to click right after goTo, before polling for `selector`: for opening a
   * flyout, switching a subtab, or selecting an element that the step's real target only
   * exists or becomes visible after. Best-effort: silently skipped if not found. */
  beforeWaitClick?: string | string[];
  /** Runs once the target selector resolves, before the spotlight is measured and placed:
   * opening a flyout, switching a subtab, selecting an element, so the thing being explained is
   * actually visible and not just present in the DOM. */
  reveal?: (target: Element) => void | Promise<void>;
  /** Where the tooltip card sits relative to the spotlighted element. */
  placement?: "top" | "bottom" | "left" | "right" | "center";
}

export interface GuidedTourOptions {
  steps: TourStep[];
  onExit: () => void;
}

const POLL_INTERVAL_MS = 120;
const POLL_TIMEOUT_MS = 6000;

function waitForSelector(selector: string): Promise<Element | null> {
  return new Promise((resolve) => {
    const started = performance.now();
    const tick = () => {
      const found = document.querySelector(selector);
      if (found) {
        resolve(found);
        return;
      }
      if (performance.now() - started > POLL_TIMEOUT_MS) {
        resolve(null);
        return;
      }
      setTimeout(tick, POLL_INTERVAL_MS);
    };
    tick();
  });
}

export function startGuidedTour(opts: GuidedTourOptions): void {
  const { steps } = opts;
  let index = 0;
  let destroyed = false;

  const root = el("div", { class: "tour-root" });
  const dim = el("div", { class: "tour-dim" });
  const ring = el("div", { class: "tour-ring" });
  const arrowSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  arrowSvg.setAttribute("class", "tour-arrow");
  arrowSvg.setAttribute("viewBox", "0 0 200 200");
  const arrowPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
  arrowPath.setAttribute("class", "tour-arrow-path");
  const arrowHead = document.createElementNS("http://www.w3.org/2000/svg", "path");
  arrowHead.setAttribute("class", "tour-arrow-head");
  arrowSvg.append(arrowPath, arrowHead);

  const stepBadge = el("span", { class: "tour-step-badge" }, []);
  const titleEl = el("h3", { class: "tour-title" }, []);
  const bodyEl = el("p", { class: "tour-body" }, []);
  const backBtn = el("button", { type: "button", class: "tour-btn tour-btn-ghost" }, ["Back"]);
  const skipBtn = el("button", { type: "button", class: "tour-btn tour-btn-ghost" }, ["Skip tour"]);
  const nextBtn = el("button", { type: "button", class: "tour-btn tour-btn-primary" }, ["Next"]);
  const controls = el("div", { class: "tour-controls" }, [skipBtn, el("div", { class: "tour-controls-spacer" }), backBtn, nextBtn]);
  const card = el("div", { class: "tour-card" }, [stepBadge, titleEl, bodyEl, controls]);

  root.append(dim, ring, arrowSvg, card);
  document.body.appendChild(root);
  document.body.classList.add("tour-active");

  backBtn.addEventListener("click", () => void goToStep(index - 1));
  nextBtn.addEventListener("click", () => void goToStep(index + 1));
  skipBtn.addEventListener("click", destroy);

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    document.body.classList.remove("tour-active");
    root.remove();
    opts.onExit();
  }

  function placeCardAndArrow(rect: DOMRect | null, placement: TourStep["placement"]) {
    if (!rect) {
      card.classList.add("tour-card-center");
      card.style.left = "50%";
      card.style.top = "50%";
      card.style.transform = "translate(-50%, -50%)";
      ring.style.opacity = "0";
      arrowSvg.style.opacity = "0";
      return;
    }
    card.classList.remove("tour-card-center");
    ring.style.opacity = "1";
    const pad = 10;
    ring.style.left = `${rect.left - pad}px`;
    ring.style.top = `${rect.top - pad}px`;
    ring.style.width = `${rect.width + pad * 2}px`;
    ring.style.height = `${rect.height + pad * 2}px`;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cardW = 320;
    const cardH = card.offsetHeight || 180;
    const gap = 26;
    let effectivePlacement = placement ?? "bottom";
    // Fall back automatically when the preferred side would run off-screen, rather than ever
    // clipping the card the tour itself is supposed to make easy to read.
    if (effectivePlacement === "bottom" && rect.bottom + gap + cardH > vh) effectivePlacement = "top";
    if (effectivePlacement === "top" && rect.top - gap - cardH < 0) effectivePlacement = "bottom";
    if (effectivePlacement === "right" && rect.right + gap + cardW > vw) effectivePlacement = "left";
    if (effectivePlacement === "left" && rect.left - gap - cardW < 0) effectivePlacement = "right";

    let cx: number, cy: number;
    if (effectivePlacement === "top") {
      cx = Math.min(vw - cardW - 16, Math.max(16, rect.left + rect.width / 2 - cardW / 2));
      cy = Math.max(16, rect.top - gap - cardH);
    } else if (effectivePlacement === "left") {
      cx = Math.max(16, rect.left - gap - cardW);
      cy = Math.min(vh - cardH - 16, Math.max(16, rect.top + rect.height / 2 - cardH / 2));
    } else if (effectivePlacement === "right") {
      cx = Math.min(vw - cardW - 16, rect.right + gap);
      cy = Math.min(vh - cardH - 16, Math.max(16, rect.top + rect.height / 2 - cardH / 2));
    } else {
      cx = Math.min(vw - cardW - 16, Math.max(16, rect.left + rect.width / 2 - cardW / 2));
      cy = Math.min(vh - cardH - 16, rect.bottom + gap);
    }
    card.style.transform = "none";
    card.style.left = `${cx}px`;
    card.style.top = `${cy}px`;

    // A gently curved path from the card's near edge to the spotlighted element's near edge,
    // redrawn on every step so the arrow always visibly points from "here's the explanation" to
    // "here's the real thing it's talking about", the same idea as a hand-drawn product tour.
    const cardCenterX = cx + cardW / 2;
    const cardCenterY = cy + (effectivePlacement === "top" ? cardH : effectivePlacement === "bottom" ? 0 : cardH / 2);
    const targetX = rect.left + rect.width / 2;
    const targetY = rect.top + rect.height / 2;
    arrowSvg.style.opacity = "1";
    arrowSvg.setAttribute("viewBox", `0 0 ${vw} ${vh}`);
    const midX = (cardCenterX + targetX) / 2 + (targetY - cardCenterY) * 0.18;
    const midY = (cardCenterY + targetY) / 2 - (targetX - cardCenterX) * 0.18;
    arrowPath.setAttribute("d", `M ${cardCenterX} ${cardCenterY} Q ${midX} ${midY} ${targetX} ${targetY}`);
    const angle = Math.atan2(targetY - midY, targetX - midX);
    const headLen = 9;
    const hx1 = targetX - headLen * Math.cos(angle - Math.PI / 7);
    const hy1 = targetY - headLen * Math.sin(angle - Math.PI / 7);
    const hx2 = targetX - headLen * Math.cos(angle + Math.PI / 7);
    const hy2 = targetY - headLen * Math.sin(angle + Math.PI / 7);
    arrowHead.setAttribute("d", `M ${targetX} ${targetY} L ${hx1} ${hy1} L ${hx2} ${hy2} Z`);
  }

  async function runStep(i: number) {
    const step = steps[i];
    stepBadge.textContent = `Step ${i + 1} of ${steps.length}`;
    titleEl.textContent = step.title;
    bodyEl.textContent = step.body;
    backBtn.style.visibility = i === 0 ? "hidden" : "visible";
    nextBtn.textContent = i === steps.length - 1 ? "Finish" : "Next";

    card.classList.add("tour-loading");
    await step.goTo();
    if (destroyed) return;

    if (step.beforeWaitClick) {
      // Best-effort: a step that needs a flyout/subtab opened (or several, in sequence) first
      // still degrades to just spotlighting whatever selector eventually resolves (or the
      // plain "not found" fallback) rather than throwing if a click target isn't there yet.
      const clicks = Array.isArray(step.beforeWaitClick) ? step.beforeWaitClick : [step.beforeWaitClick];
      for (const sel of clicks) {
        await new Promise((r) => setTimeout(r, 60));
        (document.querySelector(sel) as HTMLElement | null)?.click();
      }
    }
    if (destroyed) return;

    let target: Element | null = null;
    if (step.selector) {
      target = await waitForSelector(step.selector);
      if (destroyed) return;
      if (target && step.reveal) await step.reveal(target);
      if (destroyed) return;
    }
    card.classList.remove("tour-loading");

    const place = () => {
      if (destroyed) return;
      const rect = target ? target.getBoundingClientRect() : null;
      placeCardAndArrow(rect, step.placement);
    };
    // One extra frame so layout from `reveal` (opening a flyout, switching a tab) has settled
    // before measuring, and a resize listener keeps the spotlight glued to its target for as
    // long as this step is showing (a dynamically-sized panel, a mobile viewport).
    requestAnimationFrame(() => requestAnimationFrame(place));
    window.addEventListener("resize", place);
    currentCleanup = () => window.removeEventListener("resize", place);
  }

  let currentCleanup: (() => void) | null = null;

  async function goToStep(next: number) {
    if (destroyed) return;
    if (next < 0) return;
    if (next >= steps.length) {
      destroy();
      return;
    }
    currentCleanup?.();
    currentCleanup = null;
    index = next;
    await runStep(index);
  }

  void goToStep(0);
}
