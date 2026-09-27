import { el, clear } from "../ui/dom";
import { segmentedControl } from "../ui/controls";
import { canvasToBlob } from "../lib/convert";
import { triggerDownload } from "../lib/format";
import { getUsageStatus, recordCompletedOperation } from "../lib/usageLimit";
import { createUsageStrip, usageLimitReachedPanel } from "../ui/usageBadge";

// A template-driven greeting card generator: pick an occasion, fill in a recipient, a message,
// and a signature, and it renders a full-resolution card on a canvas, hand-drawn stroke-style
// decorations to match the rest of the app's icon set (no emoji, no photo assets), ready to
// download as a PNG. Every template shares the same layout engine, they only differ in colors
// and which decoration function draws over the background.

type CardType = "love-letter" | "valentine" | "birthday" | "thank-you";

interface CardTemplate {
  id: CardType;
  label: string;
  heading: string;
  bgFrom: string;
  bgTo: string;
  accent: string;
  ink: string;
  defaultMessage: string;
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number, accent: string) => void;
}

const CARD_W = 1000;
const CARD_H = 1400;

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function heartPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  const s = size;
  ctx.beginPath();
  ctx.moveTo(cx, cy + s * 0.3);
  ctx.bezierCurveTo(cx - s, cy - s * 0.6, cx - s * 0.5, cy - s * 1.3, cx, cy - s * 0.6);
  ctx.bezierCurveTo(cx + s * 0.5, cy - s * 1.3, cx + s, cy - s * 0.6, cx, cy + s * 0.3);
  ctx.closePath();
  ctx.stroke();
}

function drawLoveLetter(ctx: CanvasRenderingContext2D, w: number, h: number, accent: string) {
  ctx.save();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.55;
  // A simple envelope, top left corner.
  const ex = 70;
  const ey = 70;
  const ew = 170;
  const eh = 115;
  ctx.strokeRect(ex, ey, ew, eh);
  ctx.beginPath();
  ctx.moveTo(ex, ey);
  ctx.lineTo(ex + ew / 2, ey + eh * 0.6);
  ctx.lineTo(ex + ew, ey);
  ctx.stroke();
  heartPath(ctx, w - 130, 130, 34);
  // Corner flourish, bottom right.
  ctx.beginPath();
  ctx.moveTo(w - 220, h - 60);
  ctx.quadraticCurveTo(w - 140, h - 140, w - 60, h - 60);
  ctx.stroke();
  ctx.restore();
}

function drawValentine(ctx: CanvasRenderingContext2D, w: number, h: number, accent: string) {
  ctx.save();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  const rand = seededRandom(42);
  const positions = [
    [110, 120, 34],
    [w - 120, 100, 26],
    [90, h - 140, 22],
    [w - 100, h - 160, 40],
    [w / 2, 90, 20],
    [70, h / 2, 18],
    [w - 70, h / 2 + 40, 24],
  ];
  for (const [x, y, size] of positions) {
    ctx.globalAlpha = 0.35 + rand() * 0.3;
    heartPath(ctx, x, y, size);
  }
  ctx.restore();
}

function drawBirthday(ctx: CanvasRenderingContext2D, w: number, h: number, accent: string) {
  ctx.save();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.5;
  const balloons: [number, number, number][] = [
    [110, 150, 46],
    [190, 100, 34],
    [w - 120, 140, 42],
    [w - 190, 95, 30],
  ];
  for (const [x, y, r] of balloons) {
    ctx.beginPath();
    ctx.ellipse(x, y, r * 0.8, r, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y + r);
    ctx.quadraticCurveTo(x - 10, y + r + 40, x, y + r + 90);
    ctx.stroke();
  }
  const rand = seededRandom(7);
  for (let i = 0; i < 18; i++) {
    const x = rand() * w;
    const y = h - rand() * 160;
    ctx.beginPath();
    ctx.globalAlpha = 0.3 + rand() * 0.3;
    ctx.rect(x, y, 8, 8);
    ctx.stroke();
  }
  ctx.restore();
}

function drawThankYou(ctx: CanvasRenderingContext2D, w: number, h: number, accent: string) {
  ctx.save();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.5;
  // A simple bow, top center.
  const cx = w / 2;
  const cy = 110;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.quadraticCurveTo(cx - 70, cy - 50, cx - 90, cy + 10);
  ctx.quadraticCurveTo(cx - 40, cy + 20, cx, cy);
  ctx.quadraticCurveTo(cx + 40, cy + 20, cx + 90, cy + 10);
  ctx.quadraticCurveTo(cx + 70, cy - 50, cx, cy);
  ctx.stroke();
  // Leaf sprigs, bottom corners.
  for (const side of [-1, 1] as const) {
    const bx = side < 0 ? 90 : w - 90;
    ctx.beginPath();
    ctx.moveTo(bx, h - 60);
    ctx.quadraticCurveTo(bx + side * 40, h - 130, bx, h - 190);
    ctx.stroke();
    for (const t of [0.35, 0.65]) {
      const lx = bx + side * 8;
      const ly = h - 60 - t * 120;
      ctx.beginPath();
      ctx.ellipse(lx + side * 20, ly, 22, 10, side * 0.6, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.restore();
}

const TEMPLATES: CardTemplate[] = [
  {
    id: "love-letter",
    label: "Love letter",
    heading: "A Love Letter",
    bgFrom: "#2b1a1f",
    bgTo: "#4a2530",
    accent: "#e8a0ad",
    ink: "#fdf1f0",
    defaultMessage:
      "From the first time we spoke, I knew something about you would stay with me. Every day with you feels like a page I don't want to end.",
    draw: drawLoveLetter,
  },
  {
    id: "valentine",
    label: "Valentine",
    heading: "Happy Valentine's Day",
    bgFrom: "#3a1224",
    bgTo: "#6b1d3a",
    accent: "#ff8fab",
    ink: "#fff1f4",
    defaultMessage: "Roses, chocolates, and everything sweet, none of it compares to having you in my life.",
    draw: drawValentine,
  },
  {
    id: "birthday",
    label: "Birthday",
    heading: "Happy Birthday!",
    bgFrom: "#1b2a3a",
    bgTo: "#123a4a",
    accent: "#ffb35c",
    ink: "#fdf6ee",
    defaultMessage: "Wishing you a year ahead filled with good health, good laughs, and everything you've been working toward.",
    draw: drawBirthday,
  },
  {
    id: "thank-you",
    label: "Thank you",
    heading: "Thank You",
    bgFrom: "#16281f",
    bgTo: "#1f4331",
    accent: "#a3d9b1",
    ink: "#f2fbf4",
    defaultMessage: "I wanted to take a moment to say how much your kindness meant to me. Thank you for everything.",
    draw: drawThankYou,
  },
];

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let line = "";
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    lines.push(line);
  }
  return lines;
}

function renderCard(canvas: HTMLCanvasElement, template: CardTemplate, recipient: string, message: string, sender: string) {
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext("2d")!;

  const grad = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
  grad.addColorStop(0, template.bgFrom);
  grad.addColorStop(1, template.bgTo);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // A slightly inset border card-within-a-card frame.
  ctx.strokeStyle = template.accent;
  ctx.globalAlpha = 0.4;
  ctx.lineWidth = 2;
  ctx.strokeRect(40, 40, CARD_W - 80, CARD_H - 80);
  ctx.globalAlpha = 1;

  template.draw(ctx, CARD_W, CARD_H, template.accent);

  ctx.fillStyle = template.ink;
  ctx.textAlign = "center";
  ctx.font = "700 64px Fredoka, sans-serif";
  wrapCentered(ctx, template.heading, CARD_W / 2, 330, CARD_W - 220, 70);

  ctx.textAlign = "left";
  ctx.font = "500 30px Outfit, sans-serif";
  ctx.fillStyle = template.accent;
  if (recipient.trim()) ctx.fillText(`Dear ${recipient.trim()},`, 120, 470);

  ctx.font = "400 32px Outfit, sans-serif";
  ctx.fillStyle = template.ink;
  const lines = wrapText(ctx, message || template.defaultMessage, CARD_W - 240);
  let y = 560;
  for (const line of lines.slice(0, 12)) {
    ctx.fillText(line, 120, y);
    y += 46;
  }

  if (sender.trim()) {
    ctx.textAlign = "right";
    ctx.font = "italic 500 34px Outfit, sans-serif";
    ctx.fillStyle = template.accent;
    ctx.fillText(`- ${sender.trim()}`, CARD_W - 120, CARD_H - 100);
  }
}

function wrapCentered(ctx: CanvasRenderingContext2D, text: string, cx: number, startY: number, maxWidth: number, lineHeight: number) {
  const lines = wrapText(ctx, text, maxWidth);
  let y = startY;
  for (const line of lines) {
    ctx.fillText(line, cx, y);
    y += lineHeight;
  }
}

export function buildCardCreatorTool(): HTMLElement {
  const root = el("div", { class: "tool-panel active" });
  const usage = createUsageStrip();

  let templateId: CardType = "love-letter";
  let recipient = "";
  let message = TEMPLATES[0].defaultMessage;
  let sender = "";
  let messageEdited = false;

  const canvas = el("canvas", { class: "card-canvas" }) as HTMLCanvasElement;
  const resultHost = el("div");

  function currentTemplate(): CardTemplate {
    return TEMPLATES.find((t) => t.id === templateId)!;
  }

  function redraw() {
    renderCard(canvas, currentTemplate(), recipient, message, sender);
  }

  const typeCtrl = segmentedControl<CardType>(
    "Occasion",
    TEMPLATES.map((t) => ({ value: t.id, label: t.label })),
    templateId,
    (v) => {
      templateId = v;
      if (!messageEdited) {
        message = currentTemplate().defaultMessage;
        messageInput.value = message;
      }
      redraw();
    }
  );

  const recipientInput = el("input", { type: "text", placeholder: "Recipient's name" }) as HTMLInputElement;
  recipientInput.addEventListener("input", () => {
    recipient = recipientInput.value;
    redraw();
  });

  const messageInput = el("textarea", { class: "tool-textarea", rows: "5" }) as HTMLTextAreaElement;
  messageInput.value = message;
  messageInput.addEventListener("input", () => {
    message = messageInput.value;
    messageEdited = true;
    redraw();
  });

  const senderInput = el("input", { type: "text", placeholder: "Your name (signature)" }) as HTMLInputElement;
  senderInput.addEventListener("input", () => {
    sender = senderInput.value;
    redraw();
  });

  const downloadBtn = el("button", { type: "button", class: "run-btn" }, ["Download card"]);
  downloadBtn.addEventListener("click", runDownload);

  async function runDownload() {
    if (getUsageStatus().atLimit) {
      clear(resultHost);
      resultHost.appendChild(usageLimitReachedPanel());
      return;
    }
    const blob = await canvasToBlob(canvas, "image/png");
    recordCompletedOperation();
    usage.refresh();
    triggerDownload(blob, `${currentTemplate().label.toLowerCase().replace(/\s+/g, "-")}-card.png`);
  }

  redraw();

  root.append(
    typeCtrl.root,
    el("div", { class: "controls-grid" }, [
      el("div", { class: "control" }, [el("label", {}, ["Recipient"]), recipientInput]),
      el("div", { class: "control" }, [el("label", {}, ["Signature"]), senderInput]),
    ]),
    el("div", { class: "control" }, [el("label", {}, ["Message"]), messageInput]),
    el("div", { class: "card-preview" }, [canvas]),
    el("div", { style: "height:16px" }),
    downloadBtn,
    resultHost,
    usage.root
  );
  return root;
}
