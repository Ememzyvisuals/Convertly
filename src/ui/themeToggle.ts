import { el } from "./dom";

const STORAGE_KEY = "convertly:theme";
type Theme = "dark" | "light";

function getCurrentTheme(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

function applyTheme(theme: Theme): void {
  if (theme === "light") {
    document.documentElement.dataset.theme = "light";
  } else {
    delete document.documentElement.dataset.theme;
  }
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Ignore, theme still applies for this page view even if it can't persist.
  }
}

const SUN_ICON = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.4M12 19.1v2.4M4.5 12H2.1M21.9 12h-2.4M5.8 5.8l1.7 1.7M16.5 16.5l1.7 1.7M18.2 5.8l-1.7 1.7M7.5 16.5l-1.7 1.7"/></svg>`;
const MOON_ICON = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5Z"/></svg>`;

export function createThemeToggle(): HTMLElement {
  const button = el("button", {
    type: "button",
    class: "theme-toggle",
    "aria-label": "Switch to light mode",
  });

  function render() {
    const theme = getCurrentTheme();
    button.innerHTML = theme === "dark" ? SUN_ICON : MOON_ICON;
    button.setAttribute("aria-label", theme === "dark" ? "Switch to light mode" : "Switch to dark mode");
    button.setAttribute("aria-pressed", String(theme === "light"));
  }

  button.addEventListener("click", () => {
    const next: Theme = getCurrentTheme() === "dark" ? "light" : "dark";
    applyTheme(next);
    render();
  });

  render();
  return button;
}
