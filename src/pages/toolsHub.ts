// The Tools hub: a typography-led index of every module, grouped by category, each on its
// own card. Replaces the old single workspace page's tab-inside-tab navigation (category
// pills + tool tabs all sharing one screen) with the more conventional "browse, then land on
// a dedicated page" pattern the rest of the redesign follows.
import { el } from "../ui/dom";
import { toolIconSVG, type ToolIconName } from "../ui/toolIcons";

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
  const card = el("button", { type: "button", class: "hub-card" }, [
    iconBubble,
    el("span", { class: "hub-card-label" }, [tool.label]),
    el("span", { class: "hub-card-desc" }, [tool.desc]),
  ]);
  card.addEventListener("click", tool.onClick);
  return card;
}

export function buildToolsHub(categories: HubCategory[]): HTMLElement {
  const root = el("div", { class: "tools-hub" });

  const header = el("div", { class: "tools-hub-header" }, [
    el("h1", {}, ["Open tools"]),
    el("p", {}, ["Every module lives on its own page. Pick one below."]),
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
