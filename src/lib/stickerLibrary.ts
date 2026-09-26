// A real, categorized sticker library shared by the Design and Video editors (and, later,
// any other surface that wants to drop a sticker onto a canvas). These are real Unicode emoji
// glyphs, not placeholder squares: modern platforms render them from scalable vector emoji
// fonts, so they stay crisp at any size, need no license (Unicode's emoji glyphs are free to
// use), and cover the range a person actually reaches for: faces, reactions, love, gestures,
// celebration, music, nature, animals, food, speech/story marks, and symbols/badges.
export interface StickerDef {
  id: string;
  glyph: string;
  label: string;
  category: StickerCategory;
}

export type StickerCategory =
  | "faces"
  | "reactions"
  | "love"
  | "hands"
  | "celebration"
  | "music"
  | "nature"
  | "animals"
  | "food"
  | "story"
  | "symbols";

export const STICKER_CATEGORY_LABELS: Record<StickerCategory, string> = {
  faces: "Faces",
  reactions: "Reactions",
  love: "Love",
  hands: "Hands",
  celebration: "Celebration",
  music: "Music",
  nature: "Nature",
  animals: "Animals",
  food: "Food",
  story: "Story & speech",
  symbols: "Symbols & badges",
};

function group(category: StickerCategory, entries: [string, string][]): StickerDef[] {
  return entries.map(([glyph, label]) => ({ id: `${category}-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, glyph, label, category }));
}

export const STICKER_LIBRARY: StickerDef[] = [
  ...group("faces", [
    ["😂", "Laughing"], ["🤣", "Rolling laughing"], ["😍", "Heart eyes"],
    ["😎", "Cool"], ["🤔", "Thinking"], ["😏", "Smirk"],
    ["😢", "Crying"], ["😱", "Screaming"], ["😌", "Relieved"],
    ["🥳", "Party face"], ["😜", "Wink tongue"], ["😅", "Sweat smile"],
    ["🙄", "Eye roll"], ["🤯", "Mind blown"], ["😴", "Sleeping"],
  ]),
  ...group("reactions", [
    ["👍", "Thumbs up"], ["👎", "Thumbs down"], ["👏", "Clap"],
    ["🔥", "Fire"], ["💩", "Facepalm mood"], ["💀", "Dead (skull)"],
    ["💤", "Sleepy"], ["💢", "Anger"], ["💦", "Sweat drops"],
    ["💯", "100"], ["❗", "Exclaim"], ["❓", "Question"],
    ["⚡", "Lightning"], ["💡", "Idea"], ["👀", "Eyes"],
  ]),
  ...group("love", [
    ["❤️", "Red heart"], ["💛", "Yellow heart"], ["💚", "Green heart"],
    ["💙", "Blue heart"], ["💜", "Purple heart"], ["🤍", "White heart"],
    ["💔", "Broken heart"], ["💝", "Heart ribbon"], ["💖", "Sparkling heart"],
    ["💘", "Heart arrow"], ["💕", "Two hearts"], ["💞", "Heart beat"],
  ]),
  ...group("hands", [
    ["👋", "Wave"], ["✌️", "Peace"], ["🤞", "Fingers crossed"],
    ["🤌", "Pinch"], ["👌", "OK"], ["👊", "Fist bump"],
    ["🙌", "Raised hands"], ["🙏", "Pray"], ["👈", "Point left"],
    ["👉", "Point right"], ["☝️", "Point up"], ["🤟", "Love hand"],
  ]),
  ...group("celebration", [
    ["🎉", "Party popper"], ["🎊", "Confetti"], ["🎂", "Cake"],
    ["🎁", "Gift"], ["🎆", "Fireworks"], ["✨", "Sparkles"],
    ["🏆", "Trophy"], ["🥇", "Gold medal"], ["🎋", "Ribbon"],
    ["🎌", "Streamer"], ["🎍", "Bow"], ["🎈", "Balloon"],
  ]),
  ...group("music", [
    ["🎵", "Music note"], ["🎶", "Music notes"], ["🎤", "Microphone"],
    ["🎧", "Headphones"], ["🎸", "Guitar"], ["🎹", "Piano"],
    ["🥁", "Drum"], ["🎺", "Trumpet"], ["🎻", "Violin"],
    ["💿", "Disc"], ["🎧", "Beats"], ["🎶", "Notes wave"],
  ]),
  ...group("nature", [
    ["☀️", "Sun"], ["🌙", "Moon"], ["⭐", "Star"],
    ["🌈", "Rainbow"], ["☁️", "Cloud"], ["⛈️", "Storm"],
    ["❄️", "Snowflake"], ["🌿", "Leaf"], ["🌸", "Blossom"],
    ["🌺", "Hibiscus"], ["🍀", "Clover"], ["🌊", "Wave"],
  ]),
  ...group("animals", [
    ["🐶", "Dog"], ["🐱", "Cat"], ["🦊", "Fox"],
    ["🐻", "Bear"], ["🐰", "Rabbit"], ["🐸", "Frog"],
    ["🦁", "Lion"], ["🐧", "Penguin"], ["🦄", "Unicorn"],
    ["🐍", "Snake"], ["🐙", "Octopus"], ["🦋", "Butterfly"],
  ]),
  ...group("food", [
    ["🍕", "Pizza"], ["🍔", "Burger"], ["🍟", "Fries"],
    ["🍦", "Ice cream"], ["🍩", "Donut"], ["☕", "Coffee"],
    ["🍰", "Cake slice"], ["🍇", "Grapes"], ["🍉", "Watermelon"],
    ["🍫", "Chocolate"], ["🍿", "Popcorn"], ["🧁", "Cupcake"],
  ]),
  ...group("story", [
    ["💬", "Speech bubble"], ["💭", "Thought bubble"], ["📖", "Open book"],
    ["📝", "Memo"], ["✉️", "Letter"], ["📰", "Newspaper"],
    ["🔖", "Bookmark"], ["📖", "Story pages"], ["🎬", "Clapperboard"],
    ["🎞️", "Film"], ["📷", "Camera"], ["📹", "Video camera"],
  ]),
  ...group("symbols", [
    ["🔥", "Fire badge"], ["💯", "100 badge"], ["⭐", "Star badge"],
    ["🏷️", "Price tag"], ["🚨", "Alert"], ["✅", "Check"],
    ["❌", "Cross"], ["🔒", "Lock"], ["🔓", "Unlock"],
    ["🏵️", "Rosette"], ["🆕", "New badge"], ["📊", "Chart"],
  ]),
];

export function stickersByCategory(category: StickerCategory | "all"): StickerDef[] {
  return category === "all" ? STICKER_LIBRARY : STICKER_LIBRARY.filter((s) => s.category === category);
}

export const STICKER_CATEGORIES = Object.keys(STICKER_CATEGORY_LABELS) as StickerCategory[];

/** Rasterizes an emoji glyph onto a square canvas and returns a PNG data URL, so it can be
 * inserted through the same real image-element pipeline every other picture in the Design
 * editor already goes through (resize, rotate, layering, and export all just work). */
export function stickerToPngDataUrl(glyph: string, sizePx = 256): string {
  const canvas = document.createElement("canvas");
  canvas.width = sizePx;
  canvas.height = sizePx;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.clearRect(0, 0, sizePx, sizePx);
  ctx.font = `${Math.round(sizePx * 0.82)}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(glyph, sizePx / 2, sizePx / 2 + sizePx * 0.05);
  return canvas.toDataURL("image/png");
}
