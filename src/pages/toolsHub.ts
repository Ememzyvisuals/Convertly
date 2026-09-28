// The Tools hub: a typography-led index of every module, grouped by category, each on its
// own card. Replaces the old single workspace page's tab-inside-tab navigation (category
// pills + tool tabs all sharing one screen) with the more conventional "browse, then land on
// a dedicated page" pattern the rest of the redesign follows.
import { el } from "../ui/dom";
import { toolIconSVG, type ToolIconName } from "../ui/toolIcons";
import { t } from "../i18n";

export interface HubTool {
  id: string;
  label: string;
  desc: string;
  icon: ToolIconName;
  onClick: () => void;
  /** Cards without a real dedicated page yet fall back to the legacy tabbed workspace;
   * marked with a small "legacy" hint so it's clear which ones are the new design. */
  legacy?: boolean;
}

export interface HubCategory {
  title: string;
  tools: HubTool[];
}

function buildCard(tool: HubTool): HTMLElement {
  const iconBubble = el("span", { class: "hub-card-icon" });
  iconBubble.innerHTML = toolIconSVG(tool.icon);
  // A real anchor with a real href, not a bare button, so a crawler (or a person) can discover
  // and open each tool page as its own link rather than one that only works via a click handler.
  // The click is still intercepted to go through the existing in-app navigation (no full reload).
  const card = el("a", { href: `/tools/${tool.id}`, class: "hub-card" }, [
    iconBubble,
    el("span", { class: "hub-card-label" }, [tool.label]),
    el("span", { class: "hub-card-desc" }, [tool.desc]),
  ]);
  card.addEventListener("click", (e) => {
    e.preventDefault();
    tool.onClick();
  });
  return card;
}

export function buildToolsHub(categories: HubCategory[]): HTMLElement {
  const root = el("div", { class: "tools-hub" });

  const header = el("div", { class: "tools-hub-header" }, [
    el("h1", {}, [t("hub.title")]),
    el("p", {}, [t("hub.subtitle")]),
  ]);
  root.appendChild(header);

  for (const cat of categories) {
    const grid = el("div", { class: "hub-grid" }, cat.tools.map(buildCard));
    root.appendChild(
      el("section", { class: "hub-category" }, [el("h2", { class: "hub-category-title" }, [cat.title]), grid])
    );
  }

  return root;
}
