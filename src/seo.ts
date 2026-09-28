// Updates the document's title, meta description, canonical link, and social-preview tags to
// match whichever view is currently showing. index.html carries good static defaults for the
// landing page (what a crawler or link-unfurl sees before any JS runs), and this keeps them in
// sync once someone (or a crawler that executes JS) navigates to the tools hub or a specific
// tool page, so each one can be indexed and shared with its own distinct title and description
// instead of every page looking identical in search results and link previews.
const SITE_URL = "https://convertly.is-cool.dev";

function setMeta(attr: "name" | "property", key: string, content: string) {
  let tag = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

function setCanonical(href: string) {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "canonical";
    document.head.appendChild(link);
  }
  link.href = href;
}

export interface RouteSEO {
  /** Full page title, without the site name suffix (added here). */
  title: string;
  description: string;
  /** Path after the origin, e.g. "/" or "/tools/convert". */
  path: string;
}

export function updateSEO(route: RouteSEO) {
  const fullTitle = route.path === "/" ? route.title : `${route.title} - Convertly`;
  const url = `${SITE_URL}${route.path}`;
  document.title = fullTitle;
  setMeta("name", "description", route.description);
  setCanonical(url);
  setMeta("property", "og:title", fullTitle);
  setMeta("property", "og:description", route.description);
  setMeta("property", "og:url", url);
  setMeta("name", "twitter:title", fullTitle);
  setMeta("name", "twitter:description", route.description);
}
