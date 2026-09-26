// A small, real starter set for the Studio's templates tab. Kept to text/rectangle/circle
// elements only (no images), so a template opens instantly with no async asset loading.
// More templates, including ones sourced from real open-licensed design sets, come later;
// these are original layouts so the tab isn't empty while that catalog is built.
import type { StudioElement } from "../tools/studioTool";

export interface StudioTemplate {
  id: string;
  name: string;
  presetId: "square" | "story" | "landscape" | "poster";
  accent: string; // used for the dashboard thumbnail card
  elements: StudioElement[];
}

export const STUDIO_TEMPLATES: StudioTemplate[] = [
  {
    id: "sale-announcement",
    name: "Sale announcement",
    presetId: "square",
    accent: "#e86f00",
    elements: [
      { id: "t1-bg", kind: "rect", x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, width: 1080, height: 1080, fill: "#111111" },
      { id: "t1-circle", kind: "circle", x: 860, y: 180, rotation: 0, scaleX: 1, scaleY: 1, width: 420, height: 420, fill: "#e86f00" },
      {
        id: "t1-headline", kind: "text", x: 90, y: 380, rotation: 0, scaleX: 1, scaleY: 1, width: 700, height: 220,
        fill: "#ffffff", text: "BIG SALE", fontFamily: "Anton", fontSize: 140, align: "left",
      },
      {
        id: "t1-sub", kind: "text", x: 92, y: 560, rotation: 0, scaleX: 1, scaleY: 1, width: 700, height: 100,
        fill: "#e86f00", text: "Up to 50% off, this week only", fontFamily: "Inter", fontSize: 44, align: "left",
      },
      {
        id: "t1-cta", kind: "rect", x: 92, y: 700, rotation: 0, scaleX: 1, scaleY: 1, width: 320, height: 90,
        fill: "#e86f00",
      },
      {
        id: "t1-cta-text", kind: "text", x: 130, y: 725, rotation: 0, scaleX: 1, scaleY: 1, width: 260, height: 50,
        fill: "#111111", text: "Shop now", fontFamily: "Poppins", fontSize: 34, align: "left", bold: true,
      },
    ],
  },
  {
    id: "quote-card",
    name: "Quote card",
    presetId: "square",
    accent: "#a5b4fc",
    elements: [
      { id: "t2-bg", kind: "rect", x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, width: 1080, height: 1080, fill: "#faf7f2" },
      {
        id: "t2-quote", kind: "text", x: 110, y: 360, rotation: 0, scaleX: 1, scaleY: 1, width: 860, height: 320,
        fill: "#1a1a1a", text: "“Do the work. Let the work speak.”", fontFamily: "Playfair Display", fontSize: 68, align: "left",
      },
      {
        id: "t2-attrib", kind: "text", x: 112, y: 640, rotation: 0, scaleX: 1, scaleY: 1, width: 600, height: 60,
        fill: "#7a7a7a", text: "Add your name here", fontFamily: "Inter", fontSize: 32, align: "left",
      },
      { id: "t2-rule", kind: "rect", x: 112, y: 320, rotation: 0, scaleX: 1, scaleY: 1, width: 120, height: 8, fill: "#e86f00" },
    ],
  },
  {
    id: "story-promo",
    name: "Story promo",
    presetId: "story",
    accent: "#38bdf8",
    elements: [
      { id: "t3-bg", kind: "rect", x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, width: 1080, height: 1920, fill: "#0d1b2a" },
      { id: "t3-circle", kind: "circle", x: 540, y: 560, rotation: 0, scaleX: 1, scaleY: 1, width: 560, height: 560, fill: "#38bdf8" },
      {
        id: "t3-title", kind: "text", x: 100, y: 1000, rotation: 0, scaleX: 1, scaleY: 1, width: 880, height: 240,
        fill: "#ffffff", text: "New drop", fontFamily: "Bebas Neue", fontSize: 128, align: "center",
      },
      {
        id: "t3-sub", kind: "text", x: 130, y: 1180, rotation: 0, scaleX: 1, scaleY: 1, width: 820, height: 100,
        fill: "#9fd8f5", text: "Swipe up to see more", fontFamily: "Inter", fontSize: 40, align: "center",
      },
    ],
  },
  {
    id: "simple-poster",
    name: "Event poster",
    presetId: "poster",
    accent: "#f472b6",
    elements: [
      { id: "t4-bg", kind: "rect", x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, width: 1500, height: 2100, fill: "#ffffff" },
      { id: "t4-band", kind: "rect", x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, width: 1500, height: 260, fill: "#f472b6" },
      {
        id: "t4-eyebrow", kind: "text", x: 90, y: 90, rotation: 0, scaleX: 1, scaleY: 1, width: 800, height: 80,
        fill: "#ffffff", text: "YOU'RE INVITED", fontFamily: "Poppins", fontSize: 40, align: "left", bold: true,
      },
      {
        id: "t4-title", kind: "text", x: 90, y: 420, rotation: 0, scaleX: 1, scaleY: 1, width: 1300, height: 420,
        fill: "#1a1a1a", text: "Community Meetup", fontFamily: "Anton", fontSize: 130, align: "left",
      },
      {
        id: "t4-details", kind: "text", x: 92, y: 900, rotation: 0, scaleX: 1, scaleY: 1, width: 1000, height: 200,
        fill: "#444444", text: "Saturday, 6:00 PM\nCommunity Hall, Main Street", fontFamily: "Inter", fontSize: 44, align: "left",
      },
    ],
  },
];
