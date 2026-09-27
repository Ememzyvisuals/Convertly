import { el, clear } from "../ui/dom";
import { segmentedControl } from "../ui/controls";
import { getUsageStatus, recordCompletedOperation } from "../lib/usageLimit";
import { createUsageStrip, usageLimitReachedPanel } from "../ui/usageBadge";
import { triggerDownload } from "../lib/format";

type QrType = "text" | "url" | "email" | "phone";
type EcLevel = "L" | "M" | "Q" | "H";

const PLACEHOLDERS: Record<QrType, string> = {
  text: "Anything: a word, a number, a sentence, a Wi-Fi password...",
  url: "example.com or https://example.com/page",
  email: "someone@example.com",
  phone: "+2348012345678",
};

export function buildQrCodeTool(): HTMLElement {
  const root = el("div", { class: "tool-panel active" });
  const usage = createUsageStrip();

  let type: QrType = "text";
  let ecLevel: EcLevel = "M";

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
    const canvas = document.createElement("canvas");
    try {
      await QRCode.toCanvas(canvas, value, { errorCorrectionLevel: ecLevel, margin: 2, width: 320 });
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

    const svgString = await QRCode.toString(value, { errorCorrectionLevel: ecLevel, margin: 2, type: "svg" });
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
        el("div", { class: "qr-preview" }, [el("img", { src: previewUrl, alt: "Generated QR code", width: "220", height: "220" })]),
        el("div", { class: "result-actions" }, [downloadPngBtn, downloadSvgBtn])
      );
    }, "image/png");
  }

  root.append(
    el("div", { class: "controls-grid" }, [typeCtrl.root, ecCtrl.root]),
    textarea,
    el("div", { style: "height:16px" }),
    runBtn,
    resultHost,
    usage.root
  );
  return root;
}
