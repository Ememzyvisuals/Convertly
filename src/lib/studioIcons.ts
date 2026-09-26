// A curated subset of the Lucide icon set (ISC licensed, see node_modules/lucide-static/LICENSE)
// served as static files from public/studio-icons/. Each entry is a single-color, stroke-based
// SVG, so the Studio can recolor it live before adding it to the canvas as an image element.
export interface StudioIcon {
  name: string;
  file: string;
  category: string;
}

interface IconCategory {
  label: string;
  icons: string[];
}

const CATEGORIES: Record<string, IconCategory> = {
  arrows: {
    label: "Arrows & UI",
    icons: [
      "arrow-right", "arrow-left", "arrow-up", "arrow-down",
      "chevron-right", "chevron-left", "chevron-down", "chevron-up",
      "plus", "minus", "check", "x", "search", "filter", "settings",
      "sliders-horizontal", "download", "upload", "link-2", "external-link",
      "eye", "eye-off", "lock", "unlock", "key",
    ],
  },
  shapes: {
    label: "Shapes",
    icons: ["star", "heart", "circle", "square", "triangle", "hexagon"],
  },
  social: {
    label: "Social",
    icons: ["share-2", "thumbs-up", "message-circle", "bell", "mail", "phone", "user", "users", "smile"],
  },
  business: {
    label: "Business",
    icons: ["briefcase", "dollar-sign", "trending-up", "bar-chart-3", "pie-chart", "target", "trophy"],
  },
  nature: {
    label: "Nature & weather",
    icons: ["sun", "moon", "cloud", "cloud-rain", "snowflake", "leaf", "trees", "flower-2", "droplet", "feather"],
  },
  travel: {
    label: "Travel",
    icons: ["plane", "car", "map-pin", "map", "compass", "globe", "bike", "anchor", "tent", "rocket"],
  },
  food: {
    label: "Food & drink",
    icons: ["coffee", "pizza", "apple", "cake"],
  },
  tech: {
    label: "Tech",
    icons: ["smartphone", "laptop", "wifi", "camera", "video", "music-4", "image", "film", "gamepad-2"],
  },
  decorative: {
    label: "Decorative",
    icons: [
      "sparkles", "gift", "flag", "crown", "gem", "zap", "flame", "award", "medal",
      "badge-check", "lightbulb", "clock", "calendar", "shopping-cart", "shopping-bag",
      "tag", "ticket", "palette", "scissors", "pencil", "paintbrush", "book-open",
      "graduation-cap", "building-2", "home", "umbrella", "shield", "shield-check",
    ],
  },
};

export const STUDIO_ICONS: StudioIcon[] = Object.entries(CATEGORIES).flatMap(([key, cat]) =>
  cat.icons.map((name) => ({ name, file: `/studio-icons/${name}.svg`, category: key }))
);

export const STUDIO_ICON_CATEGORIES = Object.entries(CATEGORIES).map(([key, cat]) => ({
  key,
  label: cat.label,
}));

export function searchStudioIcons(query: string): StudioIcon[] {
  const q = query.trim().toLowerCase();
  if (!q) return STUDIO_ICONS;
  return STUDIO_ICONS.filter((icon) => icon.name.replace(/-/g, " ").includes(q));
}
