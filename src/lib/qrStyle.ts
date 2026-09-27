// Renders a QR code's raw module matrix (from qrcode's create()) as a styled, brandable code
// instead of the library's own plain black-and-white square-per-module drawing. Two renderers
// (canvas and SVG) share the same geometry rules so the PNG and SVG downloads always match.
import type { QrModules } from "qrcode/lib/browser.js";

export type QrDotStyle = "square" | "rounded" | "dots";

export interface QrStyleOptions {
  style: QrDotStyle;
  fg: string;
  bg: string;
  /** Quiet-zone width, in modules, around the code. */
  margin: number;
  /** Logo drawn over the center once the code is otherwise complete. */
  logo?: { image: CanvasImageSource; naturalWidth: number; naturalHeight: number; dataUrl: string } | null;
}

// The three 7x7 position-detection ("finder eye") blocks are always in the same spot for every
// QR version, so instead of drawing them module-by-module (which looks fine for "square" but
// turns into a messy cluster of dots/rounded squares for the other styles), they're skipped in
// the main grid loop and redrawn as one clean ring-in-a-ring shape per corner.
function isInFinderZone(row: number, col: number, size: number): boolean {
  return (row < 7 && col < 7) || (row < 7 && col >= size - 7) || (row >= size - 7 && col < 7);
}

function radiusFor(style: QrDotStyle, cell: number, factor: number): number {
  if (style === "square") return 0;
  if (style === "dots") return cell / 2;
  return cell * factor;
}

// The logo sits on top of the code, so it needs a solid patch of background color behind it
// (otherwise it just blends into whatever modules happen to be under it) and a generous enough
// size cap that the surrounding modules stay decodable, which is why the QR tool forces error
// correction level H whenever a logo is attached.
const LOGO_BOX_RATIO = 0.18;
const LOGO_PAD_RATIO = 1.15;

export function renderStyledQrCanvas(canvas: HTMLCanvasElement, data: { modules: QrModules }, opts: QrStyleOptions, pixelScale: number): void {
  const size = data.modules.size;
  const total = size + opts.margin * 2;
  canvas.width = total * pixelScale;
  canvas.height = total * pixelScale;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = opts.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (isInFinderZone(row, col, size)) continue;
      if (!data.modules.get(row, col)) continue;
      const x = (col + opts.margin) * pixelScale;
      const y = (row + opts.margin) * pixelScale;
      drawModuleCanvas(ctx, x, y, pixelScale, opts.style, opts.fg);
    }
  }

  drawEyeCanvas(ctx, (opts.margin) * pixelScale, (opts.margin) * pixelScale, pixelScale, opts.style, opts.fg, opts.bg);
  drawEyeCanvas(ctx, (size - 7 + opts.margin) * pixelScale, (opts.margin) * pixelScale, pixelScale, opts.style, opts.fg, opts.bg);
  drawEyeCanvas(ctx, (opts.margin) * pixelScale, (size - 7 + opts.margin) * pixelScale, pixelScale, opts.style, opts.fg, opts.bg);

  if (opts.logo) {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const logoBox = canvas.width * LOGO_BOX_RATIO;
    const padSize = logoBox * LOGO_PAD_RATIO;
    ctx.fillStyle = opts.bg;
    roundedRectPath(ctx, cx - padSize / 2, cy - padSize / 2, padSize, padSize, padSize * 0.22);
    ctx.fill();

    const fit = Math.min(logoBox / opts.logo.naturalWidth, logoBox / opts.logo.naturalHeight);
    const lw = opts.logo.naturalWidth * fit;
    const lh = opts.logo.naturalHeight * fit;
    ctx.drawImage(opts.logo.image, cx - lw / 2, cy - lh / 2, lw, lh);
  }
}

function drawModuleCanvas(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, style: QrDotStyle, fg: string): void {
  ctx.fillStyle = fg;
  if (style === "square") {
    ctx.fillRect(x, y, s, s);
  } else if (style === "rounded") {
    roundedRectPath(ctx, x, y, s, s, s * 0.3);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(x + s / 2, y + s / 2, s * 0.48, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawEyeCanvas(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, style: QrDotStyle, fg: string, bg: string): void {
  const outer = 7 * s;
  ctx.fillStyle = fg;
  roundedRectPath(ctx, x, y, outer, outer, radiusFor(style, outer, 0.22));
  ctx.fill();

  const bgInset = s;
  const bgSize = 5 * s;
  ctx.fillStyle = bg;
  roundedRectPath(ctx, x + bgInset, y + bgInset, bgSize, bgSize, radiusFor(style, bgSize, 0.22));
  ctx.fill();

  const coreInset = 2 * s;
  const coreSize = 3 * s;
  ctx.fillStyle = fg;
  roundedRectPath(ctx, x + coreInset, y + coreInset, coreSize, coreSize, radiusFor(style, coreSize, 0.3));
  ctx.fill();
}

function roundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rad = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.arcTo(x + w, y, x + w, y + rad, rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.arcTo(x + w, y + h, x + w - rad, y + h, rad);
  ctx.lineTo(x + rad, y + h);
  ctx.arcTo(x, y + h, x, y + h - rad, rad);
  ctx.lineTo(x, y + rad);
  ctx.arcTo(x, y, x + rad, y, rad);
  ctx.closePath();
}

export function buildStyledQrSvg(data: { modules: QrModules }, opts: QrStyleOptions, pixelScale: number): string {
  const size = data.modules.size;
  const total = size + opts.margin * 2;
  const px = total * pixelScale;
  const parts: string[] = [];
  parts.push(`<rect x="0" y="0" width="${px}" height="${px}" fill="${opts.bg}"/>`);

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (isInFinderZone(row, col, size)) continue;
      if (!data.modules.get(row, col)) continue;
      const x = (col + opts.margin) * pixelScale;
      const y = (row + opts.margin) * pixelScale;
      parts.push(svgModule(x, y, pixelScale, opts.style, opts.fg));
    }
  }

  parts.push(svgEye(opts.margin * pixelScale, opts.margin * pixelScale, pixelScale, opts.style, opts.fg, opts.bg));
  parts.push(svgEye((size - 7 + opts.margin) * pixelScale, opts.margin * pixelScale, pixelScale, opts.style, opts.fg, opts.bg));
  parts.push(svgEye(opts.margin * pixelScale, (size - 7 + opts.margin) * pixelScale, pixelScale, opts.style, opts.fg, opts.bg));

  if (opts.logo) {
    const cx = px / 2;
    const cy = px / 2;
    const logoBox = px * LOGO_BOX_RATIO;
    const padSize = logoBox * LOGO_PAD_RATIO;
    const fit = Math.min(logoBox / opts.logo.naturalWidth, logoBox / opts.logo.naturalHeight);
    const lw = opts.logo.naturalWidth * fit;
    const lh = opts.logo.naturalHeight * fit;
    parts.push(svgRoundedRect(cx - padSize / 2, cy - padSize / 2, padSize, padSize, padSize * 0.22, opts.bg));
    parts.push(
      `<image href="${opts.logo.dataUrl}" x="${cx - lw / 2}" y="${cy - lh / 2}" width="${lw}" height="${lh}" preserveAspectRatio="xMidYMid meet"/>`
    );
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${px} ${px}" width="${px}" height="${px}">${parts.join("")}</svg>`;
}

function svgModule(x: number, y: number, s: number, style: QrDotStyle, fg: string): string {
  if (style === "dots") return svgCircle(x + s / 2, y + s / 2, s * 0.48, fg);
  return svgRoundedRect(x, y, s, s, radiusFor(style, s, 0.3), fg);
}

function svgEye(x: number, y: number, s: number, style: QrDotStyle, fg: string, bg: string): string {
  const outer = 7 * s;
  const bgSize = 5 * s;
  const coreSize = 3 * s;
  return [
    svgRoundedRect(x, y, outer, outer, radiusFor(style, outer, 0.22), fg),
    svgRoundedRect(x + s, y + s, bgSize, bgSize, radiusFor(style, bgSize, 0.22), bg),
    svgRoundedRect(x + 2 * s, y + 2 * s, coreSize, coreSize, radiusFor(style, coreSize, 0.3), fg),
  ].join("");
}

function svgRoundedRect(x: number, y: number, w: number, h: number, r: number, fill: string): string {
  const rad = Math.max(0, Math.min(r, w / 2, h / 2));
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rad}" ry="${rad}" fill="${fill}"/>`;
}

function svgCircle(cx: number, cy: number, r: number, fill: string): string {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>`;
}
