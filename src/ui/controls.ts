import { el } from "./dom";

export function segmentedControl<T extends string>(
  labelText: string,
  options: { value: T; label: string }[],
  initial: T,
  onChange: (value: T) => void,
  hint?: string
): { root: HTMLElement; setValue: (v: T) => void } {
  const wrap = el("div", { class: "control" });
  const label = el("label", {}, [labelText]);
  const seg = el("div", { class: "segmented" });

  const buttons = options.map((opt) => {
    const b = el("button", { type: "button", "aria-pressed": String(opt.value === initial) }, [opt.label]);
    b.addEventListener("click", () => {
      buttons.forEach((bb, i) => bb.setAttribute("aria-pressed", String(options[i].value === opt.value)));
      onChange(opt.value);
    });
    seg.appendChild(b);
    return b;
  });

  wrap.append(label, seg);
  if (hint) wrap.appendChild(el("div", { class: "control-hint" }, [hint]));

  return {
    root: wrap,
    setValue: (v: T) => {
      buttons.forEach((bb, i) => bb.setAttribute("aria-pressed", String(options[i].value === v)));
    },
  };
}

export function rangeControl(
  labelText: string,
  min: number,
  max: number,
  step: number,
  initial: number,
  onInput: (value: number) => void,
  formatValue: (v: number) => string = (v) => String(v),
  hint?: string
): { root: HTMLElement; getValue: () => number; setValue: (v: number) => void } {
  const wrap = el("div", { class: "control" });
  const label = el("label", {}, [labelText]);
  const input = el("input", {
    type: "range",
    min: String(min),
    max: String(max),
    step: String(step),
    value: String(initial),
  }) as HTMLInputElement;
  const valueEl = el("div", { class: "range-value" }, [formatValue(initial)]);

  input.addEventListener("input", () => {
    const v = Number(input.value);
    valueEl.textContent = formatValue(v);
    onInput(v);
  });

  const row = el("div", { class: "range-row" }, [input, valueEl]);
  wrap.append(label, row);
  if (hint) wrap.appendChild(el("div", { class: "control-hint" }, [hint]));

  return {
    root: wrap,
    getValue: () => Number(input.value),
    setValue: (v: number) => {
      input.value = String(v);
      valueEl.textContent = formatValue(v);
    },
  };
}

export function selectControl<T extends string>(
  labelText: string,
  options: { value: T; label: string }[],
  initial: T,
  onChange: (value: T) => void,
  hint?: string
): { root: HTMLElement } {
  const wrap = el("div", { class: "control" });
  const label = el("label", {}, [labelText]);
  const select = el("select", {}) as HTMLSelectElement;
  for (const opt of options) {
    const o = el("option", { value: opt.value }, [opt.label]) as HTMLOptionElement;
    if (opt.value === initial) o.selected = true;
    select.appendChild(o);
  }
  select.addEventListener("change", () => onChange(select.value as T));
  wrap.append(label, select);
  if (hint) wrap.appendChild(el("div", { class: "control-hint" }, [hint]));
  return { root: wrap };
}

export function checkboxControl(
  labelText: string,
  initial: boolean,
  onChange: (checked: boolean) => void
): { root: HTMLElement } {
  const input = el("input", { type: "checkbox" }) as HTMLInputElement;
  input.checked = initial;
  input.addEventListener("change", () => onChange(input.checked));
  const id = "cb-" + Math.random().toString(36).slice(2);
  input.id = id;
  const label = el("label", { for: id }, [labelText]);
  const row = el("div", { class: "checkbox-row" }, [input, label]);
  return { root: row };
}

export function estimateStrip(items: { label: string; value: string; muted?: boolean }[], note?: string): HTMLElement {
  const strip = el("div", { class: "estimate-strip" });
  for (const item of items) {
    strip.appendChild(
      el("div", {}, [
        el("div", { class: "stat-label" }, [item.label]),
        el("div", { class: `stat-value${item.muted ? " muted" : ""} mono` }, [item.value]),
      ])
    );
  }
  if (note) strip.appendChild(el("div", { class: "estimate-note" }, [note]));
  return strip;
}
