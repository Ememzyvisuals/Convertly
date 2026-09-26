// A data-driven catalog of real-world design formats, used by the "Create a design" format
// picker and by the in-editor canvas-size dropdown. New formats are added here, as data, not
// by touching the picker UI or the editor's layout code (see the project's requirement that
// the preset system stay extensible rather than hardcoded into the interface).
export type DesignFormatCategory = "social" | "video" | "print" | "presentation" | "logo";

export interface DesignFormat {
  id: string;
  name: string;
  category: DesignFormatCategory;
  width: number;
  height: number;
}

export const DESIGN_FORMAT_CATEGORY_LABELS: Record<DesignFormatCategory, string> = {
  social: "Social media",
  video: "Video and thumbnails",
  print: "Print and marketing",
  presentation: "Presentations",
  logo: "Logo design",
};

export const DESIGN_FORMAT_CATEGORIES: DesignFormatCategory[] = ["logo", "social", "video", "print", "presentation"];

export const DESIGN_FORMATS: DesignFormat[] = [
  { id: "logo-square", name: "Logo (Square)", category: "logo", width: 800, height: 800 },
  { id: "logo-icon", name: "App Icon / Mark", category: "logo", width: 512, height: 512 },
  { id: "logo-wide", name: "Logo (Wordmark / Wide)", category: "logo", width: 1200, height: 400 },
  { id: "logo-social-avatar", name: "Logo (Social Avatar)", category: "logo", width: 500, height: 500 },

  { id: "yt-thumbnail", name: "YouTube Thumbnail", category: "video", width: 1280, height: 720 },
  { id: "yt-video", name: "YouTube Video", category: "video", width: 1920, height: 1080 },
  { id: "yt-shorts", name: "YouTube Shorts", category: "video", width: 1080, height: 1920 },
  { id: "tiktok-video", name: "TikTok Video", category: "video", width: 1080, height: 1920 },
  { id: "tiktok-cover", name: "TikTok Cover", category: "video", width: 1080, height: 1440 },

  { id: "ig-post", name: "Instagram Post", category: "social", width: 1080, height: 1080 },
  { id: "ig-portrait", name: "Instagram Portrait Post", category: "social", width: 1080, height: 1350 },
  { id: "ig-story", name: "Instagram Story", category: "social", width: 1080, height: 1920 },
  { id: "ig-reel", name: "Instagram Reel", category: "social", width: 1080, height: 1920 },
  { id: "fb-post", name: "Facebook Post", category: "social", width: 1200, height: 630 },
  { id: "fb-cover", name: "Facebook Cover", category: "social", width: 820, height: 312 },
  { id: "x-post", name: "X (Twitter) Post", category: "social", width: 1200, height: 675 },
  { id: "linkedin-post", name: "LinkedIn Post", category: "social", width: 1200, height: 1200 },
  { id: "linkedin-banner", name: "LinkedIn Banner", category: "social", width: 1584, height: 396 },

  { id: "flyer", name: "Flyer", category: "print", width: 1275, height: 1650 },
  { id: "poster-print", name: "Poster", category: "print", width: 1500, height: 2100 },
  { id: "business-card", name: "Business Card", category: "print", width: 1050, height: 600 },
  { id: "web-banner", name: "Web Banner", category: "print", width: 1200, height: 300 },

  { id: "presentation-16-9", name: "Presentation (16:9)", category: "presentation", width: 1920, height: 1080 },
  { id: "presentation-4-3", name: "Presentation (4:3)", category: "presentation", width: 1600, height: 1200 },
];

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/** A readable aspect-ratio label ("16:9", "9:16", "1:1") for showing next to a format's raw
 * pixel dimensions, so the picker communicates shape at a glance, not just numbers. */
export function aspectRatioLabel(width: number, height: number): string {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  const d = gcd(w, h) || 1;
  return `${w / d}:${h / d}`;
}

export function formatsByCategory(category: DesignFormatCategory | "all"): DesignFormat[] {
  return category === "all" ? DESIGN_FORMATS : DESIGN_FORMATS.filter((f) => f.category === category);
}

export function designFormatById(id: string): DesignFormat | undefined {
  return DESIGN_FORMATS.find((f) => f.id === id);
}

// Real-world units are only meaningful once converted to pixels, since every canvas engine in
// this app (Konva for Design, the video/image pipelines) works in pixels. Print work
// conventionally targets 300dpi and on-screen work 96dpi; this app's canvases are already
// screen/export surfaces rather than physical print files, so 300dpi (a safe, print-quality
// choice that still looks sharp on screen) is used for every non-pixel unit, giving predictable,
// documented conversions instead of a silently wrong canvas size.
export const UNIT_TO_PX: Record<"px" | "in" | "cm" | "mm", number> = {
  px: 1,
  in: 300,
  cm: 300 / 2.54,
  mm: 300 / 25.4,
};

export type SizeUnit = keyof typeof UNIT_TO_PX;

export function toPixels(value: number, unit: SizeUnit): number {
  return Math.max(1, Math.round(value * UNIT_TO_PX[unit]));
}
