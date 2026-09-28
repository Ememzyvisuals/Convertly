// A homepage FAQ section built from FAQ_ITEMS (see content/faq.ts), rendered as plain,
// always-visible <details>/<summary> pairs (not a JS-only accordion) so the full question and
// answer text sits in the page's real HTML from the start, and a matching FAQPage JSON-LD
// block so search engines can show these as an FAQ rich result directly in search listings.
import { el } from "../ui/dom";
import { FAQ_ITEMS } from "../content/faq";

const FAQ_SCHEMA_ID = "faq-page-schema";

function ensureFaqSchema() {
  if (document.getElementById(FAQ_SCHEMA_ID)) return;
  const script = document.createElement("script");
  script.id = FAQ_SCHEMA_ID;
  script.type = "application/ld+json";
  script.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  });
  document.head.appendChild(script);
}

function buildFaqRow(item: (typeof FAQ_ITEMS)[number]): HTMLElement {
  const details = el("details", { class: "faq-row" });
  const summary = el("summary", { class: "faq-question" }, [item.question]);
  const answer = el("p", { class: "faq-answer" }, [item.answer]);
  details.append(summary, answer);
  return details;
}

export function buildFaqSection(): HTMLElement {
  ensureFaqSchema();
  const header = el("div", { class: "faq-header" }, [
    el("h2", {}, ["Frequently asked questions"]),
    el("p", {}, [
      "Straight answers about what Convertly is, what it does with your files, and why nothing you open here ever leaves your device.",
    ]),
  ]);
  const list = el("div", { class: "faq-list" }, FAQ_ITEMS.map(buildFaqRow));
  return el("section", { class: "faq-section", id: "faq" }, [
    el("div", { class: "shell" }, [header, list]),
  ]);
}
