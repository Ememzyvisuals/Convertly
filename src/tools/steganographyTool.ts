import { el, clear } from "../ui/dom";
import { createUploader } from "../ui/upload";
import { segmentedControl } from "../ui/controls";
import { formatBytes, stripExtension, triggerDownload } from "../lib/format";
import { capacityBytes, canFit, embed, extract, type SteganographyPayload } from "../lib/steganography";
import { getUsageStatus, recordCompletedOperation } from "../lib/usageLimit";
import { createUsageStrip, usageLimitReachedPanel } from "../ui/usageBadge";

type Mode = "encode" | "decode";
type SecretKind = "message" | "file";

export function buildSteganographyTool(): HTMLElement {
  const root = el("div", { class: "tool-panel active" });
  const usage = createUsageStrip();
  let mode: Mode = "encode";
  const bodyHost = el("div");

  const modeCtrl = segmentedControl<Mode>(
    "Mode",
    [
      { value: "encode", label: "Hide data" },
      { value: "decode", label: "Reveal data" },
    ],
    mode,
    (v) => {
      mode = v;
      render();
    }
  );

  function render() {
    clear(bodyHost);
    bodyHost.appendChild(mode === "encode" ? buildEncodePanel(() => usage.refresh()) : buildDecodePanel(() => usage.refresh()));
  }

  root.append(
    modeCtrl.root,
    el("div", { class: "control-hint" }, [
      "Hides a text message or a whole file inside an ordinary-looking picture, using the lowest bit of each pixel, a change too small to see. The picture must stay an unmodified PNG all the way through, since re-compressing it (a JPEG conversion, or some chat apps re-encoding photos automatically) destroys the hidden data.",
    ]),
    bodyHost,
    usage.root
  );
  render();
  return root;
}

function buildEncodePanel(onUsed: () => void): HTMLElement {
  const panel = el("div");
  let coverFile: File | null = null;
  let coverDims: { width: number; height: number } | null = null;
  let secretKind: SecretKind = "message";
  let secretFile: File | null = null;

  const secretHost = el("div");
  const capacityHost = el("div", { class: "estimate-strip" });
  const actionHost = el("div");
  const resultHost = el("div");

  const uploader = createUploader({
    accept: ["png", "jpeg", "webp", "gif", "bmp"],
    acceptLabel: "PNG · JPEG · WebP · GIF · BMP (the output is always a PNG)",
    inputAccept: "image/png,image/jpeg,image/webp,image/gif,image/bmp",
    onFileReady: async (file) => {
      coverFile = file;
      coverDims = await getImageDims(file);
      renderSecretArea();
    },
    onCleared: () => {
      coverFile = null;
      coverDims = null;
      clear(secretHost);
      clear(capacityHost);
      clear(actionHost);
      clear(resultHost);
    },
  });

  const secretKindCtrl = segmentedControl<SecretKind>(
    "What do you want to hide",
    [
      { value: "message", label: "A text message" },
      { value: "file", label: "A file" },
    ],
    secretKind,
    (v) => {
      secretKind = v;
      renderSecretArea();
    }
  );

  const messageInput = el("textarea", {
    class: "tool-textarea",
    rows: "4",
    placeholder: "Type the secret message to hide inside the image...",
  }) as HTMLTextAreaElement;
  messageInput.addEventListener("input", renderCapacity);

  const secretFileInput = el("input", { type: "file", class: "sr-only" }) as HTMLInputElement;
  const secretFileZoneHost = el("div");
  secretFileInput.addEventListener("change", () => {
    const f = secretFileInput.files?.[0];
    if (f) {
      secretFile = f;
      renderSecretFileZone();
      renderCapacity();
    }
    secretFileInput.value = "";
  });

  function renderSecretFileZone() {
    clear(secretFileZoneHost);
    if (!secretFile) {
      const zone = el("div", { class: "secret-file-zone", role: "group", "aria-label": "Choose a file to hide" });
      const pickBtn = el("button", { type: "button", class: "secret-file-zone-btn" }, [
        el("span", { class: "secret-file-zone-icon", "aria-hidden": "true" }, [
          (() => {
            const s = el("span");
            s.innerHTML = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7 11l5 5 5-5"/><path d="M4 16v2.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V16"/></svg>`;
            return s;
          })(),
        ]),
        el("span", {}, ["Choose a file to hide"]),
      ]);
      pickBtn.addEventListener("click", () => secretFileInput.click());
      zone.append(pickBtn, el("div", { class: "secret-file-zone-hint" }, ["Any file type, its name is hidden along with it."]));
      secretFileZoneHost.append(zone, secretFileInput);
    } else {
      const ext = secretFile.name.includes(".") ? secretFile.name.split(".").pop()!.toUpperCase() : "FILE";
      const card = el("div", { class: "file-card" }, [
        el("div", { class: "file-thumb-fallback" }, [ext.slice(0, 4)]),
        el("div", { class: "file-meta" }, [
          el("div", { class: "file-name" }, [secretFile.name]),
          el("div", { class: "file-sub" }, [el("span", { class: "mono" }, [formatBytes(secretFile.size)]), el("span", { class: "file-status" }, ["Ready"])]),
        ]),
        (() => {
          const rm = el("button", { type: "button", class: "file-remove", "aria-label": "Remove file" }, ["×"]);
          rm.addEventListener("click", () => {
            secretFile = null;
            renderSecretFileZone();
            renderCapacity();
          });
          return rm;
        })(),
      ]);
      secretFileZoneHost.append(card, secretFileInput);
    }
  }

  function renderSecretArea() {
    clear(secretHost);
    secretHost.append(secretKindCtrl.root);
    if (secretKind === "message") {
      secretHost.append(messageInput);
    } else {
      renderSecretFileZone();
      secretHost.append(secretFileZoneHost);
    }
    renderCapacity();
    renderAction();
  }

  function currentSecretBytes(): number {
    if (secretKind === "message") return new TextEncoder().encode(messageInput.value).length;
    return secretFile?.size ?? 0;
  }

  function renderCapacity() {
    clear(capacityHost);
    if (!coverDims) return;
    const cap = capacityBytes(coverDims.width, coverDims.height);
    const secretBytes = currentSecretBytes();
    capacityHost.append(
      el("div", {}, [
        el("div", { class: "stat-label" }, ["Cover image capacity"]),
        el("div", { class: "stat-value mono" }, [formatBytes(cap)]),
      ]),
      el("div", {}, [
        el("div", { class: "stat-label" }, ["Secret size"]),
        el("div", { class: `stat-value mono${secretBytes > cap ? " warn" : ""}` }, [formatBytes(secretBytes)]),
      ])
    );
  }

  function renderAction() {
    clear(actionHost);
    const btn = el("button", { type: "button", class: "run-btn" }, ["Hide it in the image"]);
    btn.addEventListener("click", runEncode);
    actionHost.appendChild(btn);
  }

  async function runEncode() {
    if (!coverFile) return;
    if (getUsageStatus().atLimit) {
      clear(resultHost);
      resultHost.appendChild(usageLimitReachedPanel());
      return;
    }

    const payload: SteganographyPayload | null =
      secretKind === "message"
        ? { filename: "", data: new TextEncoder().encode(messageInput.value) }
        : secretFile
        ? { filename: secretFile.name, data: new Uint8Array(await secretFile.arrayBuffer()) }
        : null;

    if (!payload || payload.data.length === 0) {
      clear(resultHost);
      resultHost.appendChild(
        el("div", { class: "validation-error" }, [el("strong", {}, ["Nothing to hide. "]), "Type a message or choose a file first."])
      );
      return;
    }

    const img = await loadImage(coverFile);
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    if (!canFit(canvas.width, canvas.height, payload)) {
      clear(resultHost);
      resultHost.appendChild(
        el("div", { class: "validation-error" }, [
          el("strong", {}, ["Too big to fit. "]),
          `This image can hide up to ${formatBytes(capacityBytes(canvas.width, canvas.height))}. Use a larger cover image or a smaller secret.`,
        ])
      );
      return;
    }

    embed(imageData, payload);
    ctx.putImageData(imageData, 0, 0);

    canvas.toBlob((blob) => {
      if (!blob) return;
      recordCompletedOperation();
      onUsed();
      clear(resultHost);
      const previewUrl = URL.createObjectURL(blob);
      const downloadBtn = el("button", { type: "button", class: "run-btn" }, ["Download image"]);
      downloadBtn.addEventListener("click", () => triggerDownload(blob, `${stripExtension(coverFile!.name)}-hidden.png`));

      resultHost.append(
        el("div", { class: "qr-preview" }, [el("img", { src: previewUrl, alt: "Image with hidden data" })]),
        el("div", { class: "control-hint" }, [
          "This looks identical to the original to the human eye. Save or share it exactly as downloaded, PNG, not re-saved as JPEG and not sent through an app that re-compresses photos automatically, or the hidden data won't survive.",
        ]),
        downloadBtn
      );
    }, "image/png");
  }

  panel.append(uploader.root, secretHost, capacityHost, actionHost, resultHost);
  return panel;
}

function buildDecodePanel(onUsed: () => void): HTMLElement {
  const panel = el("div");
  const resultHost = el("div");

  const uploader = createUploader({
    accept: ["png"],
    acceptLabel: "PNG (only an unmodified PNG produced by the Hide step can contain data)",
    inputAccept: "image/png",
    onFileReady: async (file) => {
      if (getUsageStatus().atLimit) {
        clear(resultHost);
        resultHost.appendChild(usageLimitReachedPanel());
        return;
      }
      clear(resultHost);
      resultHost.appendChild(el("div", { class: "control-hint" }, ["Looking for hidden data..."]));

      const img = await loadImage(file);
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const payload = extract(imageData);

      clear(resultHost);
      if (!payload) {
        resultHost.appendChild(
          el("div", { class: "validation-error" }, [
            el("strong", {}, ["No hidden data found. "]),
            "Either this image doesn't have anything hidden in it, or it went through a re-compression step (like being shared through a chat app) that destroyed it.",
          ])
        );
        return;
      }

      recordCompletedOperation();
      onUsed();

      if (!payload.filename) {
        const text = new TextDecoder().decode(payload.data);
        const textarea = el("textarea", { class: "tool-textarea", rows: "6" }) as HTMLTextAreaElement;
        textarea.value = text;
        textarea.readOnly = true;
        const copyBtn = el("button", { type: "button", class: "secondary-btn" }, ["Copy text"]);
        copyBtn.addEventListener("click", () => navigator.clipboard.writeText(text));
        resultHost.append(el("div", { class: "control-hint" }, ["Hidden message found:"]), textarea, copyBtn);
      } else {
        const blob = new Blob([payload.data as BlobPart]);
        const dlBtn = el("button", { type: "button", class: "run-btn" }, [`Download ${payload.filename}`]);
        dlBtn.addEventListener("click", () => triggerDownload(blob, payload.filename));
        resultHost.append(
          el("div", { class: "control-hint" }, [`Hidden file found: ${payload.filename} (${formatBytes(payload.data.length)})`]),
          dlBtn
        );
      }
    },
    onCleared: () => clear(resultHost),
  });

  panel.append(uploader.root, resultHost);
  return panel;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function getImageDims(file: File): Promise<{ width: number; height: number }> {
  return loadImage(file).then((img) => ({ width: img.naturalWidth, height: img.naturalHeight }));
}
