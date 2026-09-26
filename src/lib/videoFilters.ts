// A small library of ready-made visual-effect presets shared by the Design, Video and (later)
// image-editing surfaces: a real ffmpeg filter-graph fragment for the export, plus a CSS
// approximation for the live preview so the on-screen look and the rendered file agree closely
// without needing a second WASM render just to preview a filter choice. The vignette preset is
// the one deliberate exception: ffmpeg's own vignette filter has no exact CSS equivalent, so the
// preview approximates it with a radial-gradient overlay layer instead of the `filter` property.
export interface VideoFilterPreset {
  id: string;
  label: string;
  /** ffmpeg video filter-graph fragment (no leading/trailing commas), applied at export time. */
  ffmpegFilter: string;
  /** CSS `filter` value for the live <video>/<canvas> preview. Empty string means "none". */
  cssFilter: string;
  /** true only for the vignette preset, whose preview needs an extra overlay div, not just CSS filter. */
  needsVignetteOverlay?: boolean;
}

export const VIDEO_FILTER_PRESETS: VideoFilterPreset[] = [
  { id: "none", label: "None", ffmpegFilter: "", cssFilter: "" },
  { id: "bw", label: "Black & white", ffmpegFilter: "hue=s=0", cssFilter: "grayscale(1)" },
  {
    id: "sepia",
    label: "Sepia",
    ffmpegFilter: "colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131:0",
    cssFilter: "sepia(0.8)",
  },
  {
    id: "vintage",
    label: "Vintage",
    ffmpegFilter: "curves=preset=vintage,eq=saturation=1.15",
    cssFilter: "sepia(0.35) contrast(0.92) brightness(1.05) saturate(1.2)",
  },
  {
    id: "soft",
    label: "Soft glow",
    ffmpegFilter: "gblur=sigma=1.1,eq=brightness=0.03:contrast=0.96",
    cssFilter: "brightness(1.06) contrast(0.94) blur(0.4px)",
  },
  {
    id: "vignette",
    label: "Vignette",
    ffmpegFilter: "vignette",
    cssFilter: "",
    needsVignetteOverlay: true,
  },
  {
    id: "contrast",
    label: "High contrast",
    ffmpegFilter: "eq=contrast=1.4:saturation=1.1",
    cssFilter: "contrast(1.35) saturate(1.15)",
  },
  {
    id: "warm",
    label: "Warm",
    ffmpegFilter: "eq=saturation=1.25,colorbalance=rs=.12:gs=.02",
    cssFilter: "sepia(0.15) saturate(1.3) hue-rotate(-8deg)",
  },
  {
    id: "cool",
    label: "Cool",
    ffmpegFilter: "eq=saturation=1.1,colorbalance=bs=.12",
    cssFilter: "saturate(1.1) hue-rotate(8deg)",
  },
  {
    id: "mono-soft",
    label: "Mono soft",
    ffmpegFilter: "hue=s=0,eq=contrast=0.92:brightness=0.04,gblur=sigma=0.6",
    cssFilter: "grayscale(1) contrast(0.9) brightness(1.05) blur(0.3px)",
  },
];

export function videoFilterById(id: string): VideoFilterPreset {
  return VIDEO_FILTER_PRESETS.find((f) => f.id === id) ?? VIDEO_FILTER_PRESETS[0];
}
