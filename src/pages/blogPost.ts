// Renders a single blog post's body blocks, plus a BlogPosting JSON-LD block for rich results
// and, at the end, a direct call-to-action into the one Convertly tool the post is actually
// about, so a visitor who arrived from a search result has one obvious next step.
import { el } from "../ui/dom";
import type { BlogPost } from "../content/blog";

const SITE_URL = "https://convertly.is-cool.dev";

function ensurePostSchema(post: BlogPost) {
  const id = "blog-post-schema";
  const existing = document.getElementById(id);
  if (existing) existing.remove();
  const script = document.createElement("script");
  script.id = id;
  script.type = "application/ld+json";
  script.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.datePublished,
    dateModified: post.datePublished,
    author: { "@type": "Person", name: "Emmanuel Ariyo" },
    publisher: { "@type": "Organization", name: "Convertly" },
    mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
  });
  document.head.appendChild(script);
}

function buildBlock(block: BlogPost["body"][number]): HTMLElement {
  if (block.type === "h2") return el("h2", {}, [block.text]);
  if (block.type === "ul") return el("ul", {}, block.items.map((item) => el("li", {}, [item])));
  return el("p", {}, [block.text]);
}

export function buildBlogPost(post: BlogPost, onOpenTool: (id: string) => void): HTMLElement {
  ensurePostSchema(post);

  const cta = el("button", { type: "button", class: "run-btn blog-post-cta" }, [post.relatedToolLabel]);
  cta.addEventListener("click", () => onOpenTool(post.relatedTool));

  return el("article", { class: "blog-post" }, [
    el("header", { class: "blog-post-header" }, [
      el("p", { class: "blog-post-meta" }, [`${post.datePublished} - ${post.readMinutes} min read`]),
      el("h1", {}, [post.title]),
    ]),
    el("div", { class: "blog-post-body" }, post.body.map(buildBlock)),
    el("div", { class: "blog-post-cta-card" }, [
      el("p", {}, ["Every Convertly tool runs entirely in your browser. Nothing you open is ever uploaded."]),
      cta,
    ]),
  ]);
}
