// A small, real starter set for the Studio's templates tab. Most are text/rectangle/circle
// only, so they open instantly with no async asset loading; the meme templates are the one
// exception, carrying a real placeholder image element (see placeholderImage.ts) that swaps
// out for the person's own photo through the same "Replace image" control any photo layer has.
// More templates, including ones sourced from real open-licensed design sets, remain a future
// step (see the honest note on that in the README); these are original layouts so the tab
// isn't empty while that catalog is built.
import type { StudioElement } from "../tools/studioTool";
import { PLACEHOLDER_IMAGE_SRC } from "./placeholderImage";

export interface StudioTemplate {
  id: string;
  name: string;
  presetId: "square" | "story" | "landscape" | "poster";
  accent: string; // used as a background fallback if a thumbnail preview ever fails to build
  elements: StudioElement[];
  /** Marks a template whose elements carry entrance animations (see studioAnim.ts), so the
   * dashboard can badge it and the editor opens with a real, already-choreographed motion piece
   * rather than the person having to add animation to a static layout by hand. */
  isMotion?: boolean;
}

// Kept in sync with the Studio editor's own canvas presets (studioTool.ts), duplicated here
// rather than imported so the dashboard's template previews never have to pull the editor's
// Konva-based module (and its own chunk) into the eagerly-loaded dashboard bundle.
export const PRESET_DIMENSIONS: Record<StudioTemplate["presetId"], { width: number; height: number }> = {
  square: { width: 1080, height: 1080 },
  story: { width: 1080, height: 1920 },
  landscape: { width: 1920, height: 1080 },
  poster: { width: 1500, height: 2100 },
};

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
  {
    id: "youtube-thumbnail",
    name: "YouTube thumbnail",
    presetId: "landscape",
    accent: "#ef4444",
    elements: [
      { id: "t5-bg", kind: "rect", x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, width: 1920, height: 1080, fill: "#0d0d0d" },
      { id: "t5-band", kind: "rect", x: 0, y: 780, rotation: 0, scaleX: 1, scaleY: 1, width: 1920, height: 300, fill: "#ef4444" },
      {
        id: "t5-title", kind: "text", x: 90, y: 260, rotation: 0, scaleX: 1, scaleY: 1, width: 1400, height: 420,
        fill: "#ffffff", text: "I TRIED THIS\nFOR 30 DAYS", fontFamily: "Anton", fontSize: 130, align: "left",
      },
      {
        id: "t5-sub", kind: "text", x: 94, y: 850, rotation: 0, scaleX: 1, scaleY: 1, width: 1200, height: 100,
        fill: "#ffffff", text: "Here's what actually happened", fontFamily: "Poppins", fontSize: 46, align: "left", bold: true,
      },
      { id: "t5-circle", kind: "circle", x: 1720, y: 180, rotation: 0, scaleX: 1, scaleY: 1, width: 260, height: 260, fill: "#ef4444" },
    ],
  },
  {
    id: "minimal-promo",
    name: "Minimal promo",
    presetId: "square",
    accent: "#2dd4bf",
    elements: [
      { id: "t6-bg", kind: "rect", x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, width: 1080, height: 1080, fill: "#f4faf9" },
      { id: "t6-badge", kind: "circle", x: 170, y: 170, rotation: 0, scaleX: 1, scaleY: 1, width: 160, height: 160, fill: "#2dd4bf" },
      {
        id: "t6-badge-text", kind: "text", x: 110, y: 150, rotation: 0, scaleX: 1, scaleY: 1, width: 120, height: 40,
        fill: "#0d1b17", text: "NEW", fontFamily: "Poppins", fontSize: 26, align: "center", bold: true,
      },
      {
        id: "t6-title", kind: "text", x: 90, y: 420, rotation: 0, scaleX: 1, scaleY: 1, width: 900, height: 220,
        fill: "#0d1b17", text: "Simple, honest\npricing", fontFamily: "Poppins", fontSize: 76, align: "left", bold: true,
      },
      {
        id: "t6-sub", kind: "text", x: 92, y: 660, rotation: 0, scaleX: 1, scaleY: 1, width: 760, height: 100,
        fill: "#4b5f5a", text: "No hidden fees, cancel anytime", fontFamily: "Inter", fontSize: 36, align: "left",
      },
      { id: "t6-rule", kind: "rect", x: 92, y: 400, rotation: 0, scaleX: 1, scaleY: 1, width: 100, height: 6, fill: "#2dd4bf" },
    ],
  },
  {
    id: "birthday-card",
    name: "Birthday card",
    presetId: "square",
    accent: "#f472b6",
    elements: [
      { id: "t7-bg", kind: "rect", x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, width: 1080, height: 1080, fill: "#2a1a3a" },
      { id: "t7-c1", kind: "circle", x: 150, y: 150, rotation: 0, scaleX: 1, scaleY: 1, width: 90, height: 90, fill: "#f472b6" },
      { id: "t7-c2", kind: "circle", x: 920, y: 220, rotation: 0, scaleX: 1, scaleY: 1, width: 60, height: 60, fill: "#facc15" },
      { id: "t7-c3", kind: "circle", x: 860, y: 900, rotation: 0, scaleX: 1, scaleY: 1, width: 110, height: 110, fill: "#38bdf8" },
      { id: "t7-c4", kind: "circle", x: 180, y: 940, rotation: 0, scaleX: 1, scaleY: 1, width: 70, height: 70, fill: "#f472b6" },
      {
        id: "t7-title", kind: "text", x: 60, y: 440, rotation: 0, scaleX: 1, scaleY: 1, width: 960, height: 160,
        fill: "#ffffff", text: "Happy Birthday!", fontFamily: "Caveat", fontSize: 120, align: "center",
      },
      {
        id: "t7-sub", kind: "text", x: 160, y: 640, rotation: 0, scaleX: 1, scaleY: 1, width: 760, height: 80,
        fill: "#e9d5ff", text: "Wishing you the best day", fontFamily: "Inter", fontSize: 36, align: "center",
      },
    ],
  },
  {
    id: "hiring-flyer",
    name: "Now hiring",
    presetId: "poster",
    accent: "#22c55e",
    elements: [
      { id: "t8-bg", kind: "rect", x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, width: 1500, height: 2100, fill: "#0d0d0d" },
      { id: "t8-band", kind: "rect", x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, width: 1500, height: 24, fill: "#22c55e" },
      {
        id: "t8-eyebrow", kind: "text", x: 90, y: 140, rotation: 0, scaleX: 1, scaleY: 1, width: 800, height: 70,
        fill: "#22c55e", text: "WE'RE HIRING", fontFamily: "Poppins", fontSize: 42, align: "left", bold: true,
      },
      {
        id: "t8-title", kind: "text", x: 88, y: 260, rotation: 0, scaleX: 1, scaleY: 1, width: 1340, height: 560,
        fill: "#ffffff", text: "Product\nDesigner", fontFamily: "Anton", fontSize: 150, align: "left",
      },
      {
        id: "t8-details", kind: "text", x: 92, y: 900, rotation: 0, scaleX: 1, scaleY: 1, width: 1100, height: 260,
        fill: "#c7c7c7", text: "Full-time, remote friendly\nApply at careers.example.com", fontFamily: "Inter", fontSize: 44, align: "left",
      },
      {
        id: "t8-cta", kind: "rect", x: 92, y: 1220, rotation: 0, scaleX: 1, scaleY: 1, width: 420, height: 100, fill: "#22c55e",
      },
      {
        id: "t8-cta-text", kind: "text", x: 130, y: 1250, rotation: 0, scaleX: 1, scaleY: 1, width: 340, height: 50,
        fill: "#0d0d0d", text: "Apply now", fontFamily: "Poppins", fontSize: 38, align: "left", bold: true,
      },
    ],
  },
  {
    id: "minimal-quote-landscape",
    name: "Wide quote",
    presetId: "landscape",
    accent: "#facc15",
    elements: [
      { id: "t9-bg", kind: "rect", x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, width: 1920, height: 1080, fill: "#111111" },
      { id: "t9-rule", kind: "rect", x: 160, y: 300, rotation: 0, scaleX: 1, scaleY: 1, width: 140, height: 8, fill: "#facc15" },
      {
        id: "t9-quote", kind: "text", x: 158, y: 360, rotation: 0, scaleX: 1, scaleY: 1, width: 1600, height: 340,
        fill: "#ffffff", text: "Good design is honest\nabout what it can do.", fontFamily: "Playfair Display", fontSize: 78, align: "left",
      },
      {
        id: "t9-attrib", kind: "text", x: 160, y: 760, rotation: 0, scaleX: 1, scaleY: 1, width: 700, height: 60,
        fill: "#facc15", text: "Add your name here", fontFamily: "Inter", fontSize: 34, align: "left",
      },
    ],
  },
  {
    id: "meme-classic",
    name: "Meme (top and bottom text)",
    presetId: "square",
    accent: "#facc15",
    elements: [
      { id: "t10-bg", kind: "rect", x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, width: 1080, height: 1080, fill: "#000000" },
      {
        id: "t10-photo", kind: "image", x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, width: 1080, height: 1080,
        fill: "#d8d8d8", imageSrc: PLACEHOLDER_IMAGE_SRC, placeholderImage: true,
      },
      {
        id: "t10-top", kind: "text", x: 40, y: 40, rotation: 0, scaleX: 1, scaleY: 1, width: 1000, height: 160,
        fill: "#ffffff", text: "TOP TEXT", fontFamily: "Anton", fontSize: 90, align: "center",
        textStroke: "#000000", textStrokeWidth: 10,
      },
      {
        id: "t10-bottom", kind: "text", x: 40, y: 880, rotation: 0, scaleX: 1, scaleY: 1, width: 1000, height: 160,
        fill: "#ffffff", text: "BOTTOM TEXT", fontFamily: "Anton", fontSize: 90, align: "center",
        textStroke: "#000000", textStrokeWidth: 10,
      },
    ],
  },
  {
    id: "meme-reaction",
    name: "Reaction meme",
    presetId: "landscape",
    accent: "#f97316",
    elements: [
      { id: "t11-bg", kind: "rect", x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, width: 1920, height: 1080, fill: "#000000" },
      {
        id: "t11-photo", kind: "image", x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, width: 1920, height: 1080,
        fill: "#d8d8d8", imageSrc: PLACEHOLDER_IMAGE_SRC, placeholderImage: true,
      },
      {
        id: "t11-caption", kind: "text", x: 60, y: 900, rotation: 0, scaleX: 1, scaleY: 1, width: 1800, height: 150,
        fill: "#ffffff", text: "when the deploy actually works first try", fontFamily: "Anton", fontSize: 70, align: "center",
        textStroke: "#000000", textStrokeWidth: 9,
      },
    ],
  },
  {
    id: "meme-two-panel",
    name: "Two-panel comparison meme",
    presetId: "square",
    accent: "#22d3ee",
    elements: [
      { id: "t12-bg", kind: "rect", x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, width: 1080, height: 1080, fill: "#111111" },
      {
        id: "t12-photo-a", kind: "image", x: 20, y: 110, rotation: 0, scaleX: 1, scaleY: 1, width: 1040, height: 420,
        fill: "#d8d8d8", imageSrc: PLACEHOLDER_IMAGE_SRC, placeholderImage: true,
      },
      {
        id: "t12-photo-b", kind: "image", x: 20, y: 630, rotation: 0, scaleX: 1, scaleY: 1, width: 1040, height: 420,
        fill: "#d8d8d8", imageSrc: PLACEHOLDER_IMAGE_SRC, placeholderImage: true,
      },
      {
        id: "t12-label-a", kind: "text", x: 40, y: 30, rotation: 0, scaleX: 1, scaleY: 1, width: 1000, height: 70,
        fill: "#22d3ee", text: "Option A", fontFamily: "Anton", fontSize: 60, align: "left",
      },
      {
        id: "t12-label-b", kind: "text", x: 40, y: 550, rotation: 0, scaleX: 1, scaleY: 1, width: 1000, height: 70,
        fill: "#f97316", text: "Option B", fontFamily: "Anton", fontSize: 60, align: "left",
      },
    ],
  },
  {
    id: "podcast-cover",
    name: "Podcast cover",
    presetId: "square",
    accent: "#8b5cf6",
    elements: [
      { id: "t13-bg", kind: "rect", x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, width: 1080, height: 1080, fill: "#1a1030" },
      { id: "t13-circle", kind: "circle", x: 540, y: 380, rotation: 0, scaleX: 1, scaleY: 1, width: 480, height: 480, fill: "#8b5cf6" },
      {
        id: "t13-title", kind: "text", x: 90, y: 720, rotation: 0, scaleX: 1, scaleY: 1, width: 900, height: 140,
        fill: "#ffffff", text: "The Build Log", fontFamily: "Poppins", fontSize: 70, align: "center", bold: true,
      },
      {
        id: "t13-sub", kind: "text", x: 140, y: 830, rotation: 0, scaleX: 1, scaleY: 1, width: 800, height: 60,
        fill: "#c4b5fd", text: "Episode 12, new every Friday", fontFamily: "Inter", fontSize: 34, align: "center",
      },
    ],
  },
  {
    id: "testimonial-card",
    name: "Testimonial",
    presetId: "square",
    accent: "#34d399",
    elements: [
      { id: "t14-bg", kind: "rect", x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, width: 1080, height: 1080, fill: "#ffffff" },
      {
        id: "t14-photo", kind: "image", x: 440, y: 120, rotation: 0, scaleX: 1, scaleY: 1, width: 200, height: 200,
        fill: "#d8d8d8", imageSrc: PLACEHOLDER_IMAGE_SRC, placeholderImage: true,
      },
      {
        id: "t14-quote", kind: "text", x: 120, y: 400, rotation: 0, scaleX: 1, scaleY: 1, width: 840, height: 280,
        fill: "#1a1a1a", text: "“This saved our team a full day every week.”", fontFamily: "Playfair Display", fontSize: 54, align: "center",
      },
      {
        id: "t14-name", kind: "text", x: 200, y: 700, rotation: 0, scaleX: 1, scaleY: 1, width: 680, height: 50,
        fill: "#34d399", text: "Add name and title", fontFamily: "Inter", fontSize: 32, align: "center", bold: true,
      },
    ],
  },
  {
    id: "countdown-sale",
    name: "Countdown sale",
    presetId: "square",
    accent: "#dc2626",
    elements: [
      { id: "t15-bg", kind: "rect", x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, width: 1080, height: 1080, fill: "#dc2626" },
      {
        id: "t15-badge", kind: "circle", x: 540, y: 300, rotation: 0, scaleX: 1, scaleY: 1, width: 360, height: 360, fill: "#ffffff",
      },
      {
        id: "t15-percent", kind: "text", x: 340, y: 210, rotation: 0, scaleX: 1, scaleY: 1, width: 400, height: 180,
        fill: "#dc2626", text: "70%", fontFamily: "Anton", fontSize: 130, align: "center",
      },
      {
        id: "t15-off", kind: "text", x: 340, y: 340, rotation: 0, scaleX: 1, scaleY: 1, width: 400, height: 60,
        fill: "#dc2626", text: "OFF", fontFamily: "Poppins", fontSize: 40, align: "center", bold: true,
      },
      {
        id: "t15-title", kind: "text", x: 90, y: 580, rotation: 0, scaleX: 1, scaleY: 1, width: 900, height: 100,
        fill: "#ffffff", text: "24 hours only", fontFamily: "Anton", fontSize: 70, align: "center",
      },
      {
        id: "t15-sub", kind: "text", x: 140, y: 700, rotation: 0, scaleX: 1, scaleY: 1, width: 800, height: 60,
        fill: "#fecaca", text: "Ends tonight at midnight", fontFamily: "Inter", fontSize: 34, align: "center",
      },
    ],
  },
  {
    id: "product-launch",
    name: "Product launch",
    presetId: "landscape",
    accent: "#0ea5e9",
    elements: [
      { id: "t16-bg", kind: "rect", x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, width: 1920, height: 1080, fill: "#0d1b2a" },
      {
        id: "t16-photo", kind: "image", x: 1060, y: 140, rotation: 0, scaleX: 1, scaleY: 1, width: 760, height: 800,
        fill: "#d8d8d8", imageSrc: PLACEHOLDER_IMAGE_SRC, placeholderImage: true,
      },
      {
        id: "t16-eyebrow", kind: "text", x: 100, y: 300, rotation: 0, scaleX: 1, scaleY: 1, width: 800, height: 60,
        fill: "#0ea5e9", text: "NOW AVAILABLE", fontFamily: "Poppins", fontSize: 36, align: "left", bold: true,
      },
      {
        id: "t16-title", kind: "text", x: 96, y: 380, rotation: 0, scaleX: 1, scaleY: 1, width: 900, height: 260,
        fill: "#ffffff", text: "Meet the\nnew model", fontFamily: "Anton", fontSize: 90, align: "left",
      },
      {
        id: "t16-cta", kind: "rect", x: 100, y: 700, rotation: 0, scaleX: 1, scaleY: 1, width: 300, height: 90, fill: "#0ea5e9",
      },
      {
        id: "t16-cta-text", kind: "text", x: 130, y: 725, rotation: 0, scaleX: 1, scaleY: 1, width: 260, height: 50,
        fill: "#0d1b2a", text: "Shop now", fontFamily: "Poppins", fontSize: 34, align: "left", bold: true,
      },
    ],
  },
  {
    id: "monday-motivation",
    name: "Monday motivation",
    presetId: "square",
    accent: "#f59e0b",
    elements: [
      { id: "t17-bg", kind: "rect", x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, width: 1080, height: 1080, fill: "#fff7ed" },
      { id: "t17-band", kind: "rect", x: 0, y: 900, rotation: 0, scaleX: 1, scaleY: 1, width: 1080, height: 180, fill: "#f59e0b" },
      {
        id: "t17-title", kind: "text", x: 90, y: 340, rotation: 0, scaleX: 1, scaleY: 1, width: 900, height: 320,
        fill: "#1a1a1a", text: "Small steps\nstill count", fontFamily: "Poppins", fontSize: 90, align: "left", bold: true,
      },
      {
        id: "t17-sub", kind: "text", x: 92, y: 940, rotation: 0, scaleX: 1, scaleY: 1, width: 900, height: 100,
        fill: "#1a1a1a", text: "Monday motivation", fontFamily: "Inter", fontSize: 40, align: "left", bold: true,
      },
    ],
  },
  {
    id: "menu-special",
    name: "Menu special",
    presetId: "poster",
    accent: "#65a30d",
    elements: [
      { id: "t18-bg", kind: "rect", x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, width: 1500, height: 2100, fill: "#0f1a0b" },
      {
        id: "t18-photo", kind: "image", x: 150, y: 150, rotation: 0, scaleX: 1, scaleY: 1, width: 1200, height: 900,
        fill: "#d8d8d8", imageSrc: PLACEHOLDER_IMAGE_SRC, placeholderImage: true,
      },
      {
        id: "t18-eyebrow", kind: "text", x: 150, y: 1100, rotation: 0, scaleX: 1, scaleY: 1, width: 900, height: 70,
        fill: "#65a30d", text: "TODAY'S SPECIAL", fontFamily: "Poppins", fontSize: 42, align: "left", bold: true,
      },
      {
        id: "t18-title", kind: "text", x: 148, y: 1180, rotation: 0, scaleX: 1, scaleY: 1, width: 1240, height: 260,
        fill: "#ffffff", text: "Grilled Herb\nChicken Bowl", fontFamily: "Anton", fontSize: 100, align: "left",
      },
      {
        id: "t18-price", kind: "text", x: 150, y: 1480, rotation: 0, scaleX: 1, scaleY: 1, width: 400, height: 100,
        fill: "#65a30d", text: "$14.50", fontFamily: "Anton", fontSize: 80, align: "left",
      },
    ],
  },
  {
    id: "save-the-date",
    name: "Save the date",
    presetId: "square",
    accent: "#be185d",
    elements: [
      { id: "t19-bg", kind: "rect", x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, width: 1080, height: 1080, fill: "#fdf2f8" },
      { id: "t19-rule-top", kind: "rect", x: 340, y: 260, rotation: 0, scaleX: 1, scaleY: 1, width: 400, height: 4, fill: "#be185d" },
      {
        id: "t19-eyebrow", kind: "text", x: 140, y: 300, rotation: 0, scaleX: 1, scaleY: 1, width: 800, height: 60,
        fill: "#be185d", text: "SAVE THE DATE", fontFamily: "Poppins", fontSize: 34, align: "center", bold: true,
      },
      {
        id: "t19-names", kind: "text", x: 90, y: 420, rotation: 0, scaleX: 1, scaleY: 1, width: 900, height: 220,
        fill: "#1a1a1a", text: "Ada & Tunde", fontFamily: "Playfair Display", fontSize: 100, align: "center",
      },
      {
        id: "t19-date", kind: "text", x: 190, y: 660, rotation: 0, scaleX: 1, scaleY: 1, width: 700, height: 60,
        fill: "#831843", text: "December 12, 2026", fontFamily: "Inter", fontSize: 38, align: "center",
      },
      { id: "t19-rule-bottom", kind: "rect", x: 340, y: 760, rotation: 0, scaleX: 1, scaleY: 1, width: 400, height: 4, fill: "#be185d" },
    ],
  },
  {
    id: "webinar-signup",
    name: "Webinar sign-up",
    presetId: "landscape",
    accent: "#4f46e5",
    elements: [
      { id: "t20-bg", kind: "rect", x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, width: 1920, height: 1080, fill: "#eef2ff" },
      { id: "t20-band", kind: "rect", x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, width: 640, height: 1080, fill: "#4f46e5" },
      {
        id: "t20-eyebrow", kind: "text", x: 90, y: 380, rotation: 0, scaleX: 1, scaleY: 1, width: 460, height: 60,
        fill: "#c7d2fe", text: "FREE WEBINAR", fontFamily: "Poppins", fontSize: 32, align: "left", bold: true,
      },
      {
        id: "t20-title", kind: "text", x: 88, y: 460, rotation: 0, scaleX: 1, scaleY: 1, width: 480, height: 260,
        fill: "#ffffff", text: "Scale your\nfirst 1,000 users", fontFamily: "Anton", fontSize: 62, align: "left",
      },
      {
        id: "t20-details", kind: "text", x: 700, y: 420, rotation: 0, scaleX: 1, scaleY: 1, width: 1100, height: 200,
        fill: "#312e81", text: "Thursday, 4:00 PM\nLive with Q&A, replay available", fontFamily: "Inter", fontSize: 46, align: "left",
      },
      {
        id: "t20-cta", kind: "rect", x: 700, y: 660, rotation: 0, scaleX: 1, scaleY: 1, width: 340, height: 100, fill: "#4f46e5",
      },
      {
        id: "t20-cta-text", kind: "text", x: 740, y: 690, rotation: 0, scaleX: 1, scaleY: 1, width: 260, height: 50,
        fill: "#ffffff", text: "Reserve seat", fontFamily: "Poppins", fontSize: 34, align: "left", bold: true,
      },
    ],
  },

  // ---------------- Motion-design templates ----------------
  // Same flat StudioElement layouts as above, except each element also carries an `anim`
  // (see studioAnim.ts): a real entrance animation with its own duration/delay, so opening one
  // of these in the editor and hitting Preview (or Export GIF) plays an actual, already
  // staggered choreography rather than a static poster the person has to animate by hand.
  {
    id: "motion-sale-burst",
    name: "Motion: Sale burst",
    presetId: "square",
    accent: "#e86f00",
    isMotion: true,
    elements: [
      { id: "t21-bg", kind: "rect", x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, width: 1080, height: 1080, fill: "#111111" },
      {
        id: "t21-circle", kind: "circle", x: 860, y: 180, rotation: 0, scaleX: 1, scaleY: 1, width: 420, height: 420, fill: "#e86f00",
        anim: { type: "scale-in", durationMs: 550, delayMs: 0 },
      },
      {
        id: "t21-headline", kind: "text", x: 90, y: 380, rotation: 0, scaleX: 1, scaleY: 1, width: 700, height: 220,
        fill: "#ffffff", text: "BIG SALE", fontFamily: "Anton", fontSize: 140, align: "left",
        anim: { type: "slide-in-left", durationMs: 600, delayMs: 250 },
      },
      {
        id: "t21-sub", kind: "text", x: 92, y: 560, rotation: 0, scaleX: 1, scaleY: 1, width: 700, height: 100,
        fill: "#e86f00", text: "Up to 50% off, this week only", fontFamily: "Inter", fontSize: 44, align: "left",
        anim: { type: "fade-in", durationMs: 500, delayMs: 550 },
      },
      {
        id: "t21-cta", kind: "rect", x: 92, y: 700, rotation: 0, scaleX: 1, scaleY: 1, width: 320, height: 90,
        fill: "#e86f00", anim: { type: "bounce-in", durationMs: 650, delayMs: 800 },
      },
      {
        id: "t21-cta-text", kind: "text", x: 130, y: 725, rotation: 0, scaleX: 1, scaleY: 1, width: 260, height: 50,
        fill: "#111111", text: "Shop now", fontFamily: "Poppins", fontSize: 34, align: "left", bold: true,
        anim: { type: "fade-in", durationMs: 400, delayMs: 950 },
      },
    ],
  },
  {
    id: "motion-story-countdown",
    name: "Motion: Story countdown",
    presetId: "story",
    accent: "#38bdf8",
    isMotion: true,
    elements: [
      { id: "t22-bg", kind: "rect", x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, width: 1080, height: 1920, fill: "#0d1b2a" },
      {
        id: "t22-circle", kind: "circle", x: 540, y: 560, rotation: 0, scaleX: 1, scaleY: 1, width: 560, height: 560, fill: "#38bdf8",
        anim: { type: "fade-in", durationMs: 500, delayMs: 0 },
      },
      {
        id: "t22-number", kind: "text", x: 340, y: 340, rotation: 0, scaleX: 1, scaleY: 1, width: 400, height: 440,
        fill: "#0d1b2a", text: "3", fontFamily: "Anton", fontSize: 320, align: "center",
        anim: { type: "bounce-in", durationMs: 700, delayMs: 250 },
      },
      {
        id: "t22-title", kind: "text", x: 100, y: 1000, rotation: 0, scaleX: 1, scaleY: 1, width: 880, height: 240,
        fill: "#ffffff", text: "Days to launch", fontFamily: "Bebas Neue", fontSize: 128, align: "center",
        anim: { type: "slide-in-bottom", durationMs: 550, delayMs: 700 },
      },
      {
        id: "t22-sub", kind: "text", x: 130, y: 1180, rotation: 0, scaleX: 1, scaleY: 1, width: 820, height: 100,
        fill: "#9fd8f5", text: "Set a reminder", fontFamily: "Inter", fontSize: 40, align: "center",
        anim: { type: "fade-in", durationMs: 450, delayMs: 1050 },
      },
    ],
  },
  {
    id: "motion-product-reveal",
    name: "Motion: Product reveal",
    presetId: "landscape",
    accent: "#4f46e5",
    isMotion: true,
    elements: [
      { id: "t23-bg", kind: "rect", x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, width: 1920, height: 1080, fill: "#eef2ff" },
      {
        id: "t23-band", kind: "rect", x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, width: 640, height: 1080, fill: "#4f46e5",
        anim: { type: "slide-in-left", durationMs: 550, delayMs: 0 },
      },
      {
        id: "t23-eyebrow", kind: "text", x: 90, y: 380, rotation: 0, scaleX: 1, scaleY: 1, width: 460, height: 60,
        fill: "#c7d2fe", text: "NOW AVAILABLE", fontFamily: "Poppins", fontSize: 32, align: "left", bold: true,
        anim: { type: "fade-in", durationMs: 400, delayMs: 450 },
      },
      {
        id: "t23-title", kind: "text", x: 88, y: 460, rotation: 0, scaleX: 1, scaleY: 1, width: 480, height: 260,
        fill: "#ffffff", text: "Meet the\nnew release", fontFamily: "Anton", fontSize: 62, align: "left",
        anim: { type: "bounce-in", durationMs: 650, delayMs: 600 },
      },
      {
        id: "t23-details", kind: "text", x: 700, y: 460, rotation: 0, scaleX: 1, scaleY: 1, width: 1100, height: 200,
        fill: "#312e81", text: "Faster, lighter, and built\nfrom real customer feedback", fontFamily: "Inter", fontSize: 46, align: "left",
        anim: { type: "slide-in-right", durationMs: 550, delayMs: 900 },
      },
    ],
  },
  {
    id: "motion-quote-reveal",
    name: "Motion: Quote reveal",
    presetId: "square",
    accent: "#a5b4fc",
    isMotion: true,
    elements: [
      { id: "t24-bg", kind: "rect", x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, width: 1080, height: 1080, fill: "#faf7f2" },
      {
        id: "t24-rule", kind: "rect", x: 112, y: 320, rotation: 0, scaleX: 1, scaleY: 1, width: 120, height: 8, fill: "#e86f00",
        anim: { type: "slide-in-left", durationMs: 450, delayMs: 0 },
      },
      {
        id: "t24-quote", kind: "text", x: 110, y: 360, rotation: 0, scaleX: 1, scaleY: 1, width: 860, height: 320,
        fill: "#1a1a1a", text: "“Do the work. Let the work speak.”", fontFamily: "Playfair Display", fontSize: 68, align: "left",
        anim: { type: "fade-in", durationMs: 650, delayMs: 300 },
      },
      {
        id: "t24-attrib", kind: "text", x: 112, y: 640, rotation: 0, scaleX: 1, scaleY: 1, width: 600, height: 60,
        fill: "#7a7a7a", text: "Add your name here", fontFamily: "Inter", fontSize: 32, align: "left",
        anim: { type: "fade-in", durationMs: 450, delayMs: 800 },
      },
    ],
  },
  {
    id: "motion-event-poster",
    name: "Motion: Event announcement",
    presetId: "poster",
    accent: "#f472b6",
    isMotion: true,
    elements: [
      { id: "t25-bg", kind: "rect", x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, width: 1500, height: 2100, fill: "#ffffff" },
      {
        id: "t25-band", kind: "rect", x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, width: 1500, height: 260, fill: "#f472b6",
        anim: { type: "slide-in-top", durationMs: 500, delayMs: 0 },
      },
      {
        id: "t25-eyebrow", kind: "text", x: 90, y: 90, rotation: 0, scaleX: 1, scaleY: 1, width: 800, height: 80,
        fill: "#ffffff", text: "YOU'RE INVITED", fontFamily: "Poppins", fontSize: 40, align: "left", bold: true,
        anim: { type: "fade-in", durationMs: 400, delayMs: 350 },
      },
      {
        id: "t25-title", kind: "text", x: 90, y: 420, rotation: 0, scaleX: 1, scaleY: 1, width: 1300, height: 420,
        fill: "#111111", text: "Community\nMeetup 2026", fontFamily: "Anton", fontSize: 120, align: "left",
        anim: { type: "bounce-in", durationMs: 700, delayMs: 550 },
      },
      {
        id: "t25-details", kind: "text", x: 92, y: 900, rotation: 0, scaleX: 1, scaleY: 1, width: 1000, height: 200,
        fill: "#4a4a4a", text: "Saturday, October 3rd\nDoors open at 5 PM", fontFamily: "Inter", fontSize: 48, align: "left",
        anim: { type: "slide-in-bottom", durationMs: 550, delayMs: 950 },
      },
    ],
  },
];
