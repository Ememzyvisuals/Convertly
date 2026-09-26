export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | undefined> = {},
  children: (Node | string)[] = []
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined) continue;
    if (k === "class") node.className = v;
    else if (k.startsWith("on") ) continue;
    else node.setAttribute(k, v);
  }
  for (const child of children) {
    node.append(typeof child === "string" ? document.createTextNode(child) : child);
  }
  return node;
}

export function clear(node: HTMLElement): void {
  node.innerHTML = "";
}

export function announce(regionId: string, message: string): void {
  let region = document.getElementById(regionId);
  if (!region) {
    region = el("div", { id: regionId, class: "sr-only", role: "status", "aria-live": "polite" });
    document.body.appendChild(region);
  }
  region.textContent = message;
}
