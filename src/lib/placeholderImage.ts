// A dependency-free constant, deliberately kept out of studioTool.ts so anything that needs
// it (a template's static data, the editor itself) can import it without pulling Konva into a
// bundle that shouldn't have it. Used for meme/GIF-style templates: a real, visible "tap to
// add a photo" slot rather than a blank invisible layer, until the person picks their own image.
const PLACEHOLDER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
  <rect width="600" height="600" fill="#d8d8d8"/>
  <rect x="6" y="6" width="588" height="588" fill="none" stroke="#9a9a9a" stroke-width="6" stroke-dasharray="18 14"/>
  <g stroke="#8a8a8a" stroke-width="10" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <rect x="180" y="220" width="240" height="180" rx="16"/>
    <path d="M240 220 l24 -36 h72 l24 36"/>
    <circle cx="300" cy="310" r="46"/>
  </g>
  <text x="300" y="470" font-family="Arial, sans-serif" font-size="30" fill="#7a7a7a" text-anchor="middle">Tap to add a photo</text>
</svg>`;

export const PLACEHOLDER_IMAGE_SRC = `data:image/svg+xml;utf8,${encodeURIComponent(PLACEHOLDER_SVG)}`;
