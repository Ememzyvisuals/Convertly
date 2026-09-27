// Hand-drawn, stroke-based icons for the Tools hub cards. Same visual language as the
// footer's icons (currentColor strokes, no fills, no emoji, no icon library), just a
// different set: one per tool module rather than one per social/repo action.
export type ToolIconName =
  | "convert"
  | "remove-bg"
  | "vectorize"
  | "compress-image"
  | "compress-video"
  | "trim"
  | "gif"
  | "extract-audio"
  | "replace-audio"
  | "images-to-pdf"
  | "pdf-to-images"
  | "merge-pdf"
  | "split-pdf"
  | "audio"
  | "zip-create"
  | "zip-extract"
  | "qr-code"
  | "steganography"
  | "metadata"
  | "resize-image"
  | "watermark-image"
  | "crop-image"
  | "filter-image"
  | "card-creator";

export function toolIconSVG(name: ToolIconName): string {
  const common = 'viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"';
  switch (name) {
    case "convert":
      return `<svg ${common}><path d="M4 8h13M17 8l-3.5-3.5M17 8l-3.5 3.5"/><path d="M20 16H7M7 16l3.5-3.5M7 16l3.5 3.5"/></svg>`;
    case "remove-bg":
      return `<svg ${common}><rect x="3.5" y="3.5" width="17" height="17" rx="3" stroke-dasharray="3 3"/><circle cx="12" cy="12" r="4.5"/></svg>`;
    case "vectorize":
      return `<svg ${common}><path d="M4 18 10 6l4 8 3-4 3 8"/><circle cx="10" cy="6" r="1.3" fill="currentColor" stroke="none"/><circle cx="14" cy="14" r="1.3" fill="currentColor" stroke="none"/><circle cx="17" cy="10" r="1.3" fill="currentColor" stroke="none"/></svg>`;
    case "compress-image":
      return `<svg ${common}><rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M9 20v-4h6v4M9 4v4h6V4"/></svg>`;
    case "compress-video":
      return `<svg ${common}><rect x="2.5" y="6" width="14" height="12" rx="2"/><path d="M16.5 10 21 7v10l-4.5-3"/><path d="M6 3.5v3M12 3.5v3"/></svg>`;
    case "trim":
      return `<svg ${common}><path d="M4 8h9M4 16h9"/><circle cx="18" cy="8" r="2.2"/><circle cx="18" cy="16" r="2.2"/><path d="M16 9.5 8 15.5M16 14.5 8 8.5"/></svg>`;
    case "gif":
      return `<svg ${common}><rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M7 9v6M12.5 9v6M12.5 12h1.6M17.6 9h-2.4a1.2 1.2 0 0 0-1.2 1.2v3.6a1.2 1.2 0 0 0 1.2 1.2h2.4"/></svg>`;
    case "extract-audio":
      return `<svg ${common}><rect x="2.5" y="6" width="12" height="12" rx="2"/><path d="M14.5 10 19 7v10l-4.5-3"/><path d="M6.5 15v-3.5M9 15V9.5M11.5 15v-2"/></svg>`;
    case "replace-audio":
      return `<svg ${common}><path d="M5 8h9M14 8l-2.5-2.5M14 8l-2.5 2.5"/><path d="M19 16h-9M10 16l2.5-2.5M10 16l2.5 2.5"/></svg>`;
    case "images-to-pdf":
      return `<svg ${common}><rect x="2.5" y="3.5" width="12" height="15" rx="1.6"/><circle cx="6.5" cy="8" r="1.1" fill="currentColor" stroke="none"/><path d="M3.5 15l3-3 2 2 3.5-3.5 2.5 2.5"/><path d="M17.5 8h4M19.5 6v4"/></svg>`;
    case "pdf-to-images":
      return `<svg ${common}><rect x="9.5" y="3.5" width="12" height="15" rx="1.6"/><circle cx="13.5" cy="8" r="1.1" fill="currentColor" stroke="none"/><path d="M10.5 15l3-3 2 2 3.5-3.5 2.5 2.5"/><path d="M2 8H1.5M4.5 6v4"/></svg>`;
    case "merge-pdf":
      return `<svg ${common}><rect x="2.5" y="4" width="9" height="12" rx="1.6"/><rect x="12.5" y="4" width="9" height="12" rx="1.6"/><path d="M12 8v8M9 20h6"/></svg>`;
    case "split-pdf":
      return `<svg ${common}><rect x="2.5" y="4" width="9" height="12" rx="1.6"/><rect x="12.5" y="4" width="9" height="12" rx="1.6"/><path d="M12 4v12" stroke-dasharray="2.5 2.5"/></svg>`;
    case "audio":
      return `<svg ${common}><path d="M4 13v-2a8 8 0 0 1 16 0v2"/><rect x="2.5" y="12.5" width="4" height="6" rx="1.5"/><rect x="17.5" y="12.5" width="4" height="6" rx="1.5"/></svg>`;
    case "zip-create":
      return `<svg ${common}><rect x="3.5" y="6" width="17" height="14" rx="2"/><path d="M12 6V3.5M12 9v2M12 13v2M4 6h16"/></svg>`;
    case "zip-extract":
      return `<svg ${common}><rect x="3.5" y="6" width="17" height="14" rx="2"/><path d="M12 6V3.5M4 6h16"/><path d="M9 13l3 3 3-3M12 10v6"/></svg>`;
    case "qr-code":
      return `<svg ${common}><rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="3" width="6" height="6" rx="1"/><rect x="3" y="15" width="6" height="6" rx="1"/><path d="M15.5 15.5h2M19.5 15.5h1.5M15.5 19.5h1.5M19.5 18v2.5"/></svg>`;
    case "steganography":
      return `<svg ${common}><rect x="2.5" y="4.5" width="19" height="14" rx="2"/><path d="M6.5 15l3.5-4.5 3 3 2-2.5 2.5 4" /><rect x="10.5" y="8.5" width="3" height="3" rx="0.6" stroke-dasharray="1.6 1.6"/></svg>`;
    case "metadata":
      return `<svg ${common}><rect x="4" y="3" width="13" height="17" rx="1.6"/><path d="M7.5 8h6M7.5 11.5h6M7.5 15h3.5"/><circle cx="17.5" cy="17.5" r="3"/><path d="M19.7 19.7 21.5 21.5"/></svg>`;
    case "resize-image":
      return `<svg ${common}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M14 10 20 4M20 4h-4M20 4v4"/><path d="M10 14 4 20M4 20h4M4 20v-4"/></svg>`;
    case "watermark-image":
      return `<svg ${common}><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="10" r="1.6"/><path d="M4.5 18l5-5 3 3 3-4 4.5 4.5" stroke-dasharray="2.2 2.2"/></svg>`;
    case "crop-image":
      return `<svg ${common}><path d="M7 2v14a2 2 0 0 0 2 2h12"/><path d="M17 22V8a2 2 0 0 0-2-2H2"/></svg>`;
    case "filter-image":
      return `<svg ${common}><circle cx="9" cy="9" r="6.5"/><circle cx="15" cy="15" r="6.5"/></svg>`;
    case "card-creator":
    default:
      return `<svg ${common}><rect x="3" y="4.5" width="18" height="14" rx="2"/><path d="M3 8.5h18" stroke-dasharray="1 3"/><path d="M8 13.5c1-1.4 2-1.4 3 0s2 1.4 3 0 2-1.4 3 0"/></svg>`;
  }
}
