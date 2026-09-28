// The blog index: a plain, crawlable list of every post, each linking to its own real URL
// (/blog/<slug>), same reasoning as toolsHub.ts's cards, so both a visitor and a search engine
// can discover and open any post directly, not just through in-app navigation.
import { el } from "../ui/dom";
import { BLOG_POSTS, type BlogPost } from "../content/blog";

function buildPostCard(post: BlogPost, onOpen: (slug: string) => void): HTMLElement {
  const card = el("a", { href: `/blog/${post.slug}`, class: "blog-card" }, [
    el("span", { class: "blog-card-meta" }, [`${post.datePublished} - ${post.readMinutes} min read`]),
    el("span", { class: "blog-card-title" }, [post.title]),
    el("span", { class: "blog-card-desc" }, [post.description]),
  ]);
  card.addEventListener("click", (e) => {
    e.preventDefault();
    onOpen(post.slug);
  });
  return card;
}

export function buildBlogHub(onOpen: (slug: string) => void): HTMLElement {
  const header = el("div", { class: "blog-hub-header" }, [
    el("h1", {}, ["Blog"]),
    el("p", {}, [
      "Guides on file privacy, how each Convertly tool works, and why running everything locally in your browser matters.",
    ]),
  ]);
  const grid = el(
    "div",
    { class: "blog-grid" },
    BLOG_POSTS.map((p) => buildPostCard(p, onOpen))
  );
  return el("div", { class: "blog-hub" }, [header, grid]);
}
