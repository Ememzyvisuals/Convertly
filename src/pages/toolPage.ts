// The shell every individual tool module page is built from: a back link to the hub, a big
// typographic title + one-line description, then the tool's own body (upload zone, options,
// run button, result). One tool, one page, no shared tabs.
import { el, clear } from "../ui/dom";
import { t } from "../i18n";

export interface ToolPageOptions {
  title: string;
  description: string;
  onBack: () => void;
  body: HTMLElement;
}

export interface ToolPageHandle {
  /** The full page element (back link, title, description, body card). */
  root: HTMLElement;
  /** Swaps the body card's contents, used once a lazily-loaded tool finishes loading. */
  setBody: (body: HTMLElement) => void;
}

export function buildToolPage(opts: ToolPageOptions): ToolPageHandle {
  const backBtn = el("button", { type: "button", class: "tool-page-back" }, [
    (() => {
      const icon = el("span", { class: "tool-page-back-icon" });
      icon.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5 8 12l7 7"/></svg>`;
      return icon;
    })(),
    t("toolPage.allTools"),
  ]);
  backBtn.addEventListener("click", opts.onBack);

  const bodyCard = el("div", { class: "tool-card tool-page-card" }, [opts.body]);

  const root = el("section", { class: "tool-page" }, [
    el("div", { class: "shell tool-page-inner" }, [
      backBtn,
      el("div", { class: "tool-page-header" }, [el("h1", {}, [opts.title]), el("p", {}, [opts.description])]),
      bodyCard,
    ]),
  ]);

  return {
    root,
    setBody: (body: HTMLElement) => {
      clear(bodyCard);
      bodyCard.appendChild(body);
    },
  };
}
