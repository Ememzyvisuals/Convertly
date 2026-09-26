// A small library of ready-made caption looks, the same idea as the "with subtitles" style
// tutorial this feature is modeled on: pick a template and every new caption gets its font,
// color, position, and entrance animation in one click, then can still be tweaked overlay by
// overlay like anything else in this editor. Every animation named here is genuinely burned
// into the exported file (see buildOverlayPngs/exportStudioVideo in the video tool and its
// export path), never a live-preview-only trick.
export type CaptionAnimation = "none" | "fade" | "pop" | "bounce" | "slide-up";
// A second, independent axis: how the words *within* one caption line reveal themselves over
// that caption's own time window, on top of whichever CaptionAnimation brings the line in.
export type CaptionWordMode = "none" | "type-on" | "word-highlight";

export interface CaptionTemplate {
  id: string;
  label: string;
  desc: string;
  animation: CaptionAnimation;
  wordMode: CaptionWordMode;
  fontId: string;
  bold: boolean;
  uppercase: boolean;
  color: string;
  highlightColor?: string; // word-highlight only: the color of the word currently being spoken
  bgColor?: string; // "" or omitted = no background pill behind the text
  sizePct: number;
  yPct: number;
  align: "center" | "left" | "right";
  layout: "one-line" | "two-line";
}

export const CAPTION_TEMPLATES: CaptionTemplate[] = [
  {
    id: "clean-fade",
    label: "Clean Fade",
    desc: "Simple, bold, fades in. Works with anything.",
    animation: "fade",
    wordMode: "none",
    fontId: "anton",
    bold: true,
    uppercase: true,
    color: "#ffffff",
    sizePct: 4.5,
    yPct: 88,
    align: "center",
    layout: "one-line",
  },
  {
    id: "karaoke-highlight",
    label: "Karaoke Highlight",
    desc: "Every word lights up as it's spoken, TikTok style.",
    animation: "fade",
    wordMode: "word-highlight",
    fontId: "anton",
    bold: true,
    uppercase: true,
    color: "#e6e6e6",
    highlightColor: "#e86f00",
    sizePct: 5,
    yPct: 82,
    align: "center",
    layout: "two-line",
  },
  {
    id: "bold-pop",
    label: "Bold Pop",
    desc: "Punches in with a quick scale bounce.",
    animation: "pop",
    wordMode: "none",
    fontId: "anton",
    bold: true,
    uppercase: true,
    color: "#ffe45c",
    sizePct: 5,
    yPct: 85,
    align: "center",
    layout: "one-line",
  },
  {
    id: "bouncy-box",
    label: "Bouncy Box",
    desc: "A soft pill background with a springy entrance.",
    animation: "bounce",
    wordMode: "none",
    fontId: "poppins",
    bold: true,
    uppercase: false,
    color: "#ffffff",
    bgColor: "rgba(20,20,20,0.82)",
    sizePct: 4,
    yPct: 86,
    align: "center",
    layout: "one-line",
  },
  {
    id: "slide-caption",
    label: "Slide In Lower Third",
    desc: "Slides up from below, sits low and left.",
    animation: "slide-up",
    wordMode: "none",
    fontId: "inter",
    bold: true,
    uppercase: false,
    color: "#ffffff",
    bgColor: "rgba(10,10,10,0.55)",
    sizePct: 3.4,
    yPct: 90,
    align: "left",
    layout: "two-line",
  },
  {
    id: "type-writer",
    label: "Typewriter",
    desc: "Builds up word by word as it's said.",
    animation: "none",
    wordMode: "type-on",
    fontId: "bebas",
    bold: false,
    uppercase: true,
    color: "#ffffff",
    sizePct: 4.6,
    yPct: 88,
    align: "center",
    layout: "one-line",
  },
  {
    id: "shadow-pop",
    label: "Shadow Pop",
    desc: "Heavy drop shadow so it reads over any footage.",
    animation: "pop",
    wordMode: "none",
    fontId: "poppins",
    bold: true,
    uppercase: false,
    color: "#ffffff",
    sizePct: 4.2,
    yPct: 87,
    align: "center",
    layout: "one-line",
  },
  {
    id: "minimal",
    label: "Minimal",
    desc: "Small, quiet, out of the way of the shot.",
    animation: "none",
    wordMode: "none",
    fontId: "inter",
    bold: false,
    uppercase: false,
    color: "#ffffff",
    sizePct: 2.8,
    yPct: 93,
    align: "center",
    layout: "one-line",
  },
];

export function captionTemplateById(id: string | undefined): CaptionTemplate {
  return CAPTION_TEMPLATES.find((t) => t.id === id) ?? CAPTION_TEMPLATES[0];
}
