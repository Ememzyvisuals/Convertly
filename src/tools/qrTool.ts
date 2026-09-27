import { el, clear } from "../ui/dom";
import { segmentedControl } from "../ui/controls";
import { createUploader } from "../ui/upload";
import { getUsageStatus, recordCompletedOperation } from "../lib/usageLimit";
import { createUsageStrip, usageLimitReachedPanel } from "../ui/usageBadge";
import { triggerDownload, formatBytes } from "../lib/format";
import { renderStyledQrCanvas, buildStyledQrSvg, type QrDotStyle } from "../lib/qrStyle";

type QrType = "text" | "url" | "email" | "phone";
type EcLevel = "L" | "M" | "Q" | "H";

const PLACEHOLDERS: Record<QrType, string> = {
  text: "Anything: a word, a number, a sentence, a Wi-Fi password...",
  url: "example.com or https://example.com/page",
  email: "someone@example.com",
  phone: "+2348012345678",
};

const PIXEL_SCALE = 12; // px per module, before the browser scales the preview down to fit
const QUIET_ZONE = 2; // modules of margin around the code

interface LogoState {
  file: File;
  image: HTMLImageElement;
  dataUrl: string;
}

export function buildQrCodeTool(): HTMLElement {
  const root = el("div", { class: "tool-panel active" });
  const usage = createUsageStrip();

  let type: QrType = "text";
  let ecLevel: EcLevel = "M";
  let style: QrDotStyle = "square";
  let fgColor = "#000000";
  let bgColor = "#ffffff";
  let logo: LogoState | null = null;

  const textarea = el("textarea", {
    class: "tool-textarea",
    rows: "3",
    placeholder: PLACEHOLDERS[type],
  }) as HTMLTextAreaElement;

  const typeCtrl = segmentedControl<QrType>(
    "What are you encoding",
    [
      { value: "text", label: "Text" },
      { value: "url", label: "Link" },
      { value: "email", label: "Email" },
      { value: "phone", label: "Phone" },
    ],
    type,
    (v) => {
      type = v;
      textarea.placeholder = PLACEHOLDERS[type];
    }
  );

  const ecCtrl = segmentedControl<EcLevel>(
    "Error correction",
    [
      { value: "L", label: "L" },
      { value: "M", label: "M" },
      { value: "Q", label: "Q" },
      { value: "H", label: "H" },
    ],
    ecLevel,
    (v) => (ecLevel = v),
    "Higher levels keep the code scannable even if part of it is scratched, printed small, or has a logo placed over the middle, at the cost of a denser pattern."
  );

  const styleCtrl = segmentedControl<QrDotStyle>(
    "Pattern style",
    [
      { value: "square", label: "Square" },
      { value: "rounded", label: "Rounded" },
      { value: "dots", label: "Dots" },
    ],
    style,
    (v) => {
      style = v;
    },
    "Changes the shape of each module and the three corner markers. Doesn't affect how well it scans."
  );

  const fgInput = el("input", { type: "color", class: "color-input", value: fgColor }) as HTMLInputElement;
  fgInput.addEventListener("input", () => (fgColor = fgInput.value));
  const bgInput = el("input", { type: "color", class: "color-input", value: bgColor }) as HTMLInputElement;
  bgInput.addEventListener("input", () => (bgColor = bgInput.value));

  const ecHintHost = el("div");
  function renderEcHint() {
    clear(ecHintHost);
    if (logo) {
      ecHintHost.appendChild(
        el("div", { class: "control-hint" }, [
          "Error correction is locked to the highest level (H) while a logo is added, so enough of the pattern survives underneath it to still scan.",
        ])
      );
    }
  }

  const logoHost = el("div");
  function renderLogoArea() {
    clear(logoHost);
    if (!logo) {
      const uploader = createUploader({
        accept: ["png", "jpeg", "webp"],
        acceptLabel: "PNG · JPEG · WebP",
        inputAccept: "image/png,image/jpeg,image/webp",
        maxBytes: 8 * 1024 * 1024,
        onFileReady: async (file) => {
          const dataUrl = await fileToDataUrl(file);
          const image = await loadImage(dataUrl);
          logo = { file, image, dataUrl };
          ecLevel = "H";
          ecCtrl.setValue("H");
          renderEcHint();
          renderLogoArea();
        },
      });
      logoHost.appendChild(uploader.root);
    } else {
      const card = el("div", { class: "file-card" }, [
        el("img", { class: "file-thumb", src: logo.dataUrl, alt: "" }),
        el("div", { class: "file-meta" }, [
          el("div", { class: "file-name" }, [logo.file.name]),
          el("div", { class: "file-sub" }, [el("span", { class: "mono" }, [formatBytes(logo.file.size)]), el("span", { class: "file-status" }, ["Ready"])]),
        ]),
        (() => {
          const rm = el("button", { type: "button", class: "file-remove", "aria-label": "Remove logo" }, ["×"]);
          rm.addEventListener("click", () => {
            logo = null;
            renderEcHint();
            renderLogoArea();
          });
          return rm;
        })(),
      ]);
      logoHost.append(
        card,
        el("div", { class: "control-hint" }, ["This sits in the middle of the code. Keep it simple; a busy logo can hurt scanning."])
      );
    }
  }
  renderLogoArea();

  const resultHost = el("div");

  const runBtn = el("button", { type: "button", class: "run-btn" }, ["Generate QR code"]);
  runBtn.addEventListener("click", runGenerate);

  function valueToEncode(): string {
    const raw = textarea.value.trim();
    if (!raw) return "";
    switch (type) {
      case "url":
        return /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
      case "email":
        return raw.toLowerCase().startsWith("mailto:") ? raw : `mailto:${raw}`;
      case "phone":
        return raw.startsWith("tel:") ? raw : `tel:${raw.replace(/[^0-9+]/g, "")}`;
      default:
        return raw;
    }
  }

  async function runGenerate() {
    const value = valueToEncode();
    if (!value) {
      clear(resultHost);
      resultHost.appendChild(
        el("div", { class: "validation-error" }, [el("strong", {}, ["Nothing to encode. "]), "Type something first."])
      );
      return;
    }
    if (getUsageStatus().atLimit) {
      clear(resultHost);
      resultHost.appendChild(usageLimitReachedPanel());
      return;
    }

    const QRCode = (await import("qrcode/lib/browser.js")).default;
    const effectiveEc: EcLevel = logo ? "H" : ecLevel;
    let data: ReturnType<typeof QRCode.create>;
    try {
      data = QRCode.create(value, { errorCorrectionLevel: effectiveEc });
    } catch (err) {
      clear(resultHost);
      resultHost.appendChild(
        el("div", { class: "validation-error" }, [
          el("strong", {}, ["Couldn't generate a code. "]),
          err instanceof Error ? err.message : "That text may be too long for a QR code even at the lowest error-correction level.",
        ])
      );
      return;
    }

    const styleOpts = {
      style,
      fg: fgColor,
      bg: bgColor,
      margin: QUIET_ZONE,
      logo: logo ? { image: logo.image, naturalWidth: logo.image.naturalWidth, naturalHeight: logo.image.naturalHeight, dataUrl: logo.dataUrl } : null,
    };

    const canvas = document.createElement("canvas");
    renderStyledQrCanvas(canvas, data, styleOpts, PIXEL_SCALE);
    const svgString = buildStyledQrSvg(data, styleOpts, PIXEL_SCALE);

    recordCompletedOperation();
    usage.refresh();

    canvas.toBlob((pngBlob) => {
      if (!pngBlob) return;
      clear(resultHost);

      const previewUrl = URL.createObjectURL(pngBlob);
      const svgBlob = new Blob([svgString], { type: "image/svg+xml" });

      const downloadPngBtn = el("button", { type: "button", class: "run-btn" }, ["Download PNG"]);
      downloadPngBtn.addEventListener("click", () => triggerDownload(pngBlob, "qr-code.png"));
      const downloadSvgBtn = el("button", { type: "button", class: "secondary-btn" }, ["Download SVG"]);
      downloadSvgBtn.addEventListener("click", () => triggerDownload(svgBlob, "qr-code.svg"));

      resultHost.append(
        el("div", { class: "qr-preview", style: `background:${bgColor}` }, [el("img", { src: previewUrl, alt: "Generated QR code", width: "220", height: "220" })]),
        el("div", { class: "result-actions" }, [downloadPngBtn, downloadSvgBtn])
      );
    }, "image/png");
  }

  root.append(
    el("div", { class: "controls-grid" }, [typeCtrl.root, ecCtrl.root]),
    textarea,
    el("div", { style: "height:16px" }),
    styleCtrl.root,
    el("div", { class: "controls-grid" }, [
      el("div", { class: "control" }, [el("label", {}, ["QR color"]), fgInput]),
      el("div", { class: "control" }, [el("label", {}, ["Background color"]), bgInput]),
    ]),
    ecHintHost,
    el("div", { class: "control" }, [el("label", {}, ["Logo (optional)"]), logoHost]),
    el("div", { style: "height:8px" }),
    runBtn,
    resultHost,
    usage.root
  );
  return root;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
