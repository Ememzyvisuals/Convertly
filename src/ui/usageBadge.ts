import { el } from "./dom";
import { getUsageStatus, DAILY_LIMIT } from "../lib/usageLimit";

export interface UsageStrip {
  root: HTMLElement;
  refresh: () => void;
}

export function createUsageStrip(): UsageStrip {
  const root = el("div", { class: "usage-strip" });

  function refresh() {
    const status = getUsageStatus();
    root.textContent = "";
    root.appendChild(
      el("span", { class: status.atLimit ? "usage-text at-limit" : "usage-text" }, [
        `${status.used} of ${DAILY_LIMIT} free runs used today on this device`,
      ])
    );
  }

  refresh();
  return { root, refresh };
}

export function usageLimitReachedPanel(): HTMLElement {
  return el("div", { class: "validation-error" }, [
    el("strong", {}, ["Daily limit reached on this device. "]),
    `You've used all ${DAILY_LIMIT} free runs for today. This is a local counter stored in your browser, it resets at midnight your time, or immediately in a private/incognito window.`,
  ]);
}
