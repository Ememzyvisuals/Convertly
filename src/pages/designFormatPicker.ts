// The "Create a design" screen, shown before the editor opens: a proper project-setup step
// (predefined real-world formats, grouped and searchable, plus a genuine custom-size form),
// not an immediate drop into one fixed blank canvas. Selecting a format is what decides the
// canvas's real dimensions and aspect ratio going forward.
import { el, clear } from "../ui/dom";
import {
  DESIGN_FORMATS,
  DESIGN_FORMAT_CATEGORIES,
  DESIGN_FORMAT_CATEGORY_LABELS,
  aspectRatioLabel,
  toPixels,
  type DesignFormat,
  type DesignFormatCategory,
  type SizeUnit,
} from "../lib/designFormats";

export interface ChosenFormat {
  presetId?: string;
  width: number;
  height: number;
}

export interface FormatPickerOptions {
  onChoose: (format: ChosenFormat) => void;
  onClose: () => void;
}

/** A small rectangle scaled to the format's real aspect ratio, so a person can see the shape
 * of the canvas rather than just read two numbers. */
function ratioSwatch(width: number, height: number): HTMLElement {
  const box = el("div", { class: "format-card-swatch" });
  const inner = el("div", { class: "format-card-swatch-inner" });
  const isPortrait = height >= width;
  if (isPortrait) {
    inner.style.height = "100%";
    inner.style.width = `${(width / height) * 100}%`;
  } else {
    inner.style.width = "100%";
    inner.style.height = `${(height / width) * 100}%`;
  }
  box.appendChild(inner);
  return box;
}

function formatCard(fmt: DesignFormat, onPick: () => void): HTMLElement {
  const card = el("button", { type: "button", class: "format-card" });
  card.append(
    ratioSwatch(fmt.width, fmt.height),
    el("span", { class: "format-card-name" }, [fmt.name]),
    el("span", { class: "format-card-dims" }, [`${fmt.width} × ${fmt.height} px · ${aspectRatioLabel(fmt.width, fmt.height)}`])
  );
  card.addEventListener("click", onPick);
  return card;
}

export function buildDesignFormatPicker(opts: FormatPickerOptions): HTMLElement {
  const root = el("div", { class: "format-picker" });

  const closeBtn = el("button", { type: "button", class: "studio-close-btn", "aria-label": "Close" });
  closeBtn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18"/></svg>`;
  closeBtn.addEventListener("click", () => opts.onClose());

  const header = el("div", { class: "format-picker-header" }, [
    el("div", {}, [
      el("h1", {}, ["Create a design"]),
      el("p", {}, ["Choose what you're making, or set up a custom canvas. You can still change the size later."]),
    ]),
    closeBtn,
  ]);

  const searchInput = el("input", {
    type: "search",
    class: "studio-icon-search format-picker-search",
    placeholder: "Search formats (e.g. Instagram, thumbnail, poster)",
  }) as HTMLInputElement;

  const catBar = el("div", { class: "studio-sfx-categories" });
  const grid = el("div", { class: "format-picker-grid" });

  let category: DesignFormatCategory | "all" = "all";
  let query = "";

  function renderCatBar() {
    clear(catBar);
    const pills: { id: DesignFormatCategory | "all"; label: string }[] = [
      { id: "all", label: "All formats" },
      ...DESIGN_FORMAT_CATEGORIES.map((c) => ({ id: c, label: DESIGN_FORMAT_CATEGORY_LABELS[c] })),
    ];
    for (const p of pills) {
      const pill = el("button", { type: "button", class: `studio-sfx-cat-pill${p.id === category ? " active" : ""}` }, [p.label]);
      pill.addEventListener("click", () => {
        category = p.id;
        renderCatBar();
        renderGrid();
      });
      catBar.appendChild(pill);
    }
  }

  function renderGrid() {
    clear(grid);
    const q = query.trim().toLowerCase();
    const base = category === "all" ? DESIGN_FORMATS : DESIGN_FORMATS.filter((f) => f.category === category);
    const list = q ? base.filter((f) => f.name.toLowerCase().includes(q)) : base;
    if (list.length === 0) {
      grid.appendChild(el("div", { class: "control-hint" }, ["No formats match that search."]));
      return;
    }
    for (const fmt of list) {
      grid.appendChild(formatCard(fmt, () => opts.onChoose({ presetId: fmt.id, width: fmt.width, height: fmt.height })));
    }
  }

  searchInput.addEventListener("input", () => {
    query = searchInput.value;
    renderGrid();
  });
  renderCatBar();
  renderGrid();

  // ---------------- Custom size ----------------

  let unit: SizeUnit = "px";
  let orientation: "portrait" | "landscape" | "square" = "landscape";
  let customWidth = 1920;
  let customHeight = 1080;

  const widthInput = el("input", { type: "number", min: "1", class: "studio-select format-size-input", value: String(customWidth) }) as HTMLInputElement;
  const heightInput = el("input", { type: "number", min: "1", class: "studio-select format-size-input", value: String(customHeight) }) as HTMLInputElement;
  const unitSelect = el("select", { class: "studio-select" }) as HTMLSelectElement;
  for (const u of ["px", "in", "cm", "mm"] as SizeUnit[]) unitSelect.appendChild(el("option", { value: u }, [u]));
  const ratioReadout = el("span", { class: "format-ratio-readout" }, [aspectRatioLabel(customWidth, customHeight)]);
  const customSwatchHost = el("div", { class: "format-custom-swatch-host" });

  function renderCustomSwatch() {
    clear(customSwatchHost);
    customSwatchHost.appendChild(ratioSwatch(customWidth, customHeight));
  }

  function refreshRatio() {
    ratioReadout.textContent = aspectRatioLabel(customWidth, customHeight);
    renderCustomSwatch();
  }

  function setOrientationButtons() {
    portraitBtn.classList.toggle("active", orientation === "portrait");
    landscapeBtn.classList.toggle("active", orientation === "landscape");
    squareBtn.classList.toggle("active", orientation === "square");
  }

  const portraitBtn = el("button", { type: "button", class: "studio-comp-toolbar-btn" }, ["Portrait"]);
  const landscapeBtn = el("button", { type: "button", class: "studio-comp-toolbar-btn active" }, ["Landscape"]);
  const squareBtn = el("button", { type: "button", class: "studio-comp-toolbar-btn" }, ["Square"]);
  const orientationRow = el("div", { class: "format-orientation-row" }, [portraitBtn, landscapeBtn, squareBtn]);

  function applyOrientation() {
    if (orientation === "square") {
      const size = Math.max(customWidth, customHeight);
      customWidth = size;
      customHeight = size;
    } else if (orientation === "portrait" && customWidth > customHeight) {
      [customWidth, customHeight] = [customHeight, customWidth];
    } else if (orientation === "landscape" && customHeight > customWidth) {
      [customWidth, customHeight] = [customHeight, customWidth];
    }
    widthInput.value = String(customWidth);
    heightInput.value = String(customHeight);
    refreshRatio();
  }

  portraitBtn.addEventListener("click", () => { orientation = "portrait"; setOrientationButtons(); applyOrientation(); });
  landscapeBtn.addEventListener("click", () => { orientation = "landscape"; setOrientationButtons(); applyOrientation(); });
  squareBtn.addEventListener("click", () => { orientation = "square"; setOrientationButtons(); applyOrientation(); });

  widthInput.addEventListener("input", () => {
    customWidth = Math.max(1, Math.round(Number(widthInput.value) || 1));
    orientation = customWidth === customHeight ? "square" : customWidth > customHeight ? "landscape" : "portrait";
    setOrientationButtons();
    refreshRatio();
  });
  heightInput.addEventListener("input", () => {
    customHeight = Math.max(1, Math.round(Number(heightInput.value) || 1));
    orientation = customWidth === customHeight ? "square" : customWidth > customHeight ? "landscape" : "portrait";
    setOrientationButtons();
    refreshRatio();
  });
  unitSelect.addEventListener("change", () => {
    unit = unitSelect.value as SizeUnit;
  });

  const createCustomBtn = el("button", { type: "button", class: "run-btn" }, ["Create custom canvas"]);
  createCustomBtn.addEventListener("click", () => {
    const wPx = toPixels(customWidth, unit);
    const hPx = toPixels(customHeight, unit);
    opts.onChoose({ width: wPx, height: hPx });
  });

  refreshRatio();
  setOrientationButtons();

  const customPanel = el("div", { class: "format-custom-panel" }, [
    el("h3", {}, ["Custom size"]),
    el("p", { class: "control-hint" }, ["Set your own width, height and unit. The aspect ratio updates as you type."]),
    orientationRow,
    el("div", { class: "format-size-row" }, [
      el("label", { class: "studio-field" }, [el("span", {}, ["Width"]), widthInput]),
      el("span", { class: "format-size-x" }, ["×"]),
      el("label", { class: "studio-field" }, [el("span", {}, ["Height"]), heightInput]),
      el("label", { class: "studio-field" }, [el("span", {}, ["Unit"]), unitSelect]),
    ]),
    el("div", { class: "format-custom-preview" }, [customSwatchHost, el("span", { class: "format-ratio-label" }, ["Ratio: ", ratioReadout])]),
    createCustomBtn,
  ]);

  root.append(
    header,
    el("div", { class: "format-picker-body" }, [
      el("div", { class: "format-picker-main" }, [searchInput, catBar, grid]),
      customPanel,
    ])
  );

  return root;
}
