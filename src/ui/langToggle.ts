import { el } from "./dom";
import { getLang, setLang, type Lang } from "../i18n";

// Mirrors themeToggle.ts's shape, but a language switch changes text content everywhere
// rather than CSS custom properties, and this app has no reactive re-render layer, so the
// simplest correct move is a full reload with the new preference already saved: every t()
// call across the whole boot sequence then reads the new language from the start, with no
// stale cached tool-page title/description left over from the old one.
export function createLangToggle(): HTMLElement {
  const button = el("button", {
    type: "button",
    class: "lang-toggle",
  });

  function render() {
    const lang = getLang();
    // Label shows the language you would switch TO, same convention most bilingual sites use.
    button.textContent = lang === "en" ? "中文" : "EN";
    button.setAttribute("aria-label", lang === "en" ? "Switch to Chinese" : "切换为英文");
  }

  button.addEventListener("click", () => {
    const next: Lang = getLang() === "en" ? "zh" : "en";
    setLang(next);
    window.location.reload();
  });

  render();
  return button;
}
