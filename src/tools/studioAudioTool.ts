// Convertly Studio's Audio editing surface: a real waveform decoded from the actual audio
// samples (not a fake shape), a real <audio> element driving playback and scrubbing, drag
// handles on the waveform itself for the fade in/out points, a gain control, a way to swap
// in a different track entirely, and export through the same FFmpeg WebAssembly engine every
// other audio/video tool in this app uses. Volume and fades are applied by ffmpeg's own
// filters at export time, not a client-side gain node that would only change playback here.
import { el, clear } from "../ui/dom";
import { createUploader } from "../ui/upload";
import { createProcessPanel } from "../ui/processPanel";
import { renderResultPanel } from "../ui/resultPanel";
import { exportStudioAudio } from "../lib/audioTools";
import { decodeWaveformPeaks } from "../lib/waveform";
import { SFX_LIBRARY, renderSfxBuffer, audioBufferToWavBlob, previewSfx, type SfxDef } from "../lib/sfxLibrary";
import type { DetectedKind } from "../lib/validate";
import { getUsageStatus, recordCompletedOperation } from "../lib/usageLimit";
import { usageLimitReachedPanel } from "../ui/usageBadge";

const ACCEPT: DetectedKind[] = ["mp3", "wav", "ogg", "flac", "m4a"];
const INPUT_ACCEPT = "audio/mpeg,audio/wav,audio/ogg,audio/flac,audio/mp4,audio/x-m4a";
const WAVEFORM_BUCKETS = 400;

function formatTime(sec: number): string {
  const s = Number.isFinite(sec) && sec > 0 ? sec : 0;
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${r.toString().padStart(2, "0")}`;
}

const PLAY_ICON = `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
const PAUSE_ICON = `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>`;
const SFX_PREVIEW_ICON = `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
const SFX_ADD_ICON = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>`;
const SFX_SEARCH_ICON = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>`;

// A small glyph per sound-effect category, so the library reads like a real browsable
// catalog (icon plus name plus length) rather than a flat list of identical rows.
const SFX_CATEGORY_ICONS: Record<string, string> = {
  whoosh: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M3 8c4 0 7 1.5 9 4M3 12c5.5 0 9.5 2 13 5.5M3 16c6 0 11 1.5 15 3.5"/></svg>`,
  impact: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 3l2 5 5 .8-3.6 3.5.9 5.2L12 15l-4.3 2.5.9-5.2L5 8.8 10 8z"/></svg>`,
  chime: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 3v3M7 6l1.5 2.5M17 6l-1.5 2.5"/><circle cx="12" cy="14" r="6"/></svg>`,
  click: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/></svg>`,
  riser: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 18L20 6M20 6h-6M20 6v6"/></svg>`,
  transition: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="6" width="7" height="12" rx="1.5"/><path d="M13 8l6 4-6 4"/></svg>`,
  ui: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3.5" y="5" width="17" height="14" rx="2.5"/><path d="M8 10h8M8 14h5"/></svg>`,
};
const SFX_CATEGORY_LABELS: Record<string, string> = {
  whoosh: "Whoosh",
  impact: "Impact",
  chime: "Chime",
  click: "Click",
  riser: "Riser",
  transition: "Transition",
  ui: "UI",
};

export interface StudioAudioToolOptions {
  onBack?: () => void;
}

export function buildStudioAudioTool(opts: StudioAudioToolOptions): HTMLElement {
  const root = el("div", { class: "studio-video-tool" });

  const closeBtn = el("button", { type: "button", class: "studio-close-btn", "aria-label": "Back to Studio" });
  closeBtn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18"/></svg>`;
  closeBtn.addEventListener("click", () => opts.onBack?.());

  const titleEl = el("span", { class: "studio-editor-title" }, ["Audio editor"]);
  const topBarSpacer = el("div", { class: "studio-topbar-spacer" });
  const exportBtn = el("button", { type: "button", class: "run-btn", style: "display:none" }, ["Export audio"]);

  const topBar = el("div", { class: "studio-editor-topbar" }, [
    ...(opts.onBack ? [closeBtn] : []),
    titleEl,
    topBarSpacer,
    exportBtn,
  ]);

  const bodyHost = el("div", { class: "studio-video-body" });
  root.append(topBar, bodyHost);

  function renderUpload() {
    clear(bodyHost);
    const wrap = el("div", { class: "studio-video-upload" }, [
      el("h2", {}, ["Upload a track to edit"]),
      el("p", { class: "control-hint" }, [
        "Adjust volume, drag the fade in/out points right on the waveform, or swap in a different track, then export, all rendered by a real FFmpeg engine in this tab.",
      ]),
    ]);
    const uploader = createUploader({
      accept: ACCEPT,
      acceptLabel: "MP3, WAV, OGG, FLAC, or M4A",
      inputAccept: INPUT_ACCEPT,
      onFileReady: (file) => openEditor(file),
    });
    wrap.appendChild(uploader.root);
    bodyHost.appendChild(wrap);
    exportBtn.style.display = "none";
  }

  function openEditor(initialFile: File) {
    exportBtn.style.display = "";
    clear(bodyHost);

    let file = initialFile;
    let duration = 0;
    let gainDb = 0;
    let fadeInSec = 0;
    let fadeOutSec = 0;
    let peaks: Float32Array | null = null;
    const sfxOverlays: { sfxId: string; atSec: number }[] = [];

    const audioUrl = () => URL.createObjectURL(file);
    const audioEl = el("audio", { src: audioUrl(), class: "sr-only" }) as HTMLAudioElement;
    const fileNameEl = el("div", { class: "studio-audio-filename" }, [file.name]);

    const canvas = el("canvas", { class: "studio-audio-waveform" }) as HTMLCanvasElement;
    const waveformLoading = el("div", { class: "studio-audio-waveform-loading" }, ["Decoding waveform..."]);
    const fadeInShade = el("div", { class: "studio-audio-fade-shade left" });
    const fadeOutShade = el("div", { class: "studio-audio-fade-shade right" });
    const fadeInHandle = el("div", { class: "studio-audio-fade-handle start", "aria-label": "Fade in point" }, [
      el("span", { class: "studio-audio-fade-tag" }, ["Fade in"]),
    ]);
    const fadeOutHandle = el("div", { class: "studio-audio-fade-handle end", "aria-label": "Fade out point" }, [
      el("span", { class: "studio-audio-fade-tag" }, ["Fade out"]),
    ]);
    const playhead = el("div", { class: "studio-audio-playhead" });
    // The clipped, rounded-corner layer holds only the canvas/shading/loading indicator.
    // The fade handles live outside it: at 0%/100% they sit centered on the wrap's own edges
    // via translateX(-50%), so half of each would render past this layer's bounds, and a
    // clipped parent made that half unclickable (the same bug hit and fixed in the Video
    // editor's trim handles).
    const waveformClip = el("div", { class: "studio-audio-waveform-clip" }, [canvas, fadeInShade, fadeOutShade, playhead, waveformLoading]);
    const waveformWrap = el("div", { class: "studio-audio-waveform-wrap" }, [waveformClip, fadeInHandle, fadeOutHandle]);

    const playBtn = el("button", { type: "button", class: "studio-audio-play-btn", "aria-label": "Play" });
    playBtn.innerHTML = PLAY_ICON;
    const timeReadout = el("span", { class: "studio-audio-time" }, ["0:00 / 0:00"]);
    const transport = el("div", { class: "studio-audio-transport" }, [playBtn, timeReadout]);

    const stage = el("div", { class: "studio-audio-stage" }, [fileNameEl, waveformWrap, transport, audioEl]);

    const swapInput = el("input", { type: "file", accept: INPUT_ACCEPT, class: "sr-only" }) as HTMLInputElement;
    const swapBtn = el("button", { type: "button", class: "studio-icon-btn" }, ["Swap track"]);
    swapBtn.addEventListener("click", () => swapInput.click());
    swapInput.addEventListener("change", () => {
      const f = swapInput.files?.[0];
      swapInput.value = "";
      if (!f) return;
      file = f;
      fileNameEl.textContent = file.name;
      audioEl.src = audioUrl();
      peaks = null;
      void loadWaveform();
    });

    const gainInput = el("input", { type: "range", min: "-20", max: "20", step: "1", value: "0" }) as HTMLInputElement;
    const gainReadout = el("span", { class: "studio-audio-readout" }, ["0 dB"]);
    gainInput.addEventListener("input", () => {
      gainDb = Number(gainInput.value);
      gainReadout.textContent = `${gainDb > 0 ? "+" : ""}${gainDb} dB`;
    });

    const fadeInReadout = el("span", { class: "studio-audio-readout" }, ["0.0s"]);
    const fadeOutReadout = el("span", { class: "studio-audio-readout" }, ["0.0s"]);

    const durationLabel = el("span", { class: "control-hint" }, ["Loading duration..."]);

    // ---------------- Sound effects (real, synthesized library; see sfxLibrary.ts) ----------------
    // Presented as an actual browsable library, not a bare button list: each sound gets a
    // category glyph, its real name, and its length, and the set can be filtered by name or
    // by category, the same shape as a stock-audio panel in a real editor.

    let sfxQuery = "";
    let sfxCategory: SfxDef["category"] | "all" = "all";
    const sfxCategories = Array.from(new Set(SFX_LIBRARY.map((s) => s.category))) as SfxDef["category"][];

    const sfxSearchInput = el("input", {
      type: "text",
      class: "studio-sfx-search-input",
      placeholder: "Search sounds",
    }) as HTMLInputElement;
    const sfxSearchIcon = el("span", { class: "studio-sfx-search-icon" }, []);
    sfxSearchIcon.innerHTML = SFX_SEARCH_ICON;
    const sfxSearchWrap = el("div", { class: "studio-sfx-search" }, [sfxSearchIcon, sfxSearchInput]);

    const sfxCategoryBar = el("div", { class: "studio-sfx-categories" });
    function buildCategoryPill(value: SfxDef["category"] | "all", label: string): HTMLElement {
      const pill = el("button", { type: "button", class: "studio-sfx-cat-pill" }, [label]);
      pill.addEventListener("click", () => {
        sfxCategory = value;
        renderSfxList();
      });
      return pill;
    }
    sfxCategoryBar.append(
      buildCategoryPill("all", "All"),
      ...sfxCategories.map((c) => buildCategoryPill(c, SFX_CATEGORY_LABELS[c] ?? c))
    );

    const sfxListEl = el("div", { class: "studio-sfx-library-list" });
    function renderSfxList() {
      clear(sfxListEl);
      for (const pill of Array.from(sfxCategoryBar.children)) {
        const isActive =
          (sfxCategory === "all" && pill.textContent === "All") ||
          pill.textContent === (SFX_CATEGORY_LABELS[sfxCategory as string] ?? sfxCategory);
        pill.classList.toggle("active", isActive);
      }
      const q = sfxQuery.trim().toLowerCase();
      const matches = SFX_LIBRARY.filter(
        (def) =>
          (sfxCategory === "all" || def.category === sfxCategory) &&
          (!q || def.label.toLowerCase().includes(q))
      );
      if (matches.length === 0) {
        sfxListEl.appendChild(el("p", { class: "control-hint" }, ["No sounds match."]));
        return;
      }
      for (const def of matches) {
        const card = el("div", { class: "studio-sfx-card" });
        const iconBox = el("div", { class: "studio-sfx-card-icon" }, []);
        iconBox.innerHTML = SFX_CATEGORY_ICONS[def.category] ?? "";
        const meta = el("div", { class: "studio-sfx-card-meta" }, [
          el("span", { class: "studio-sfx-card-name" }, [def.label]),
          el("span", { class: "studio-sfx-card-len" }, [`${def.durationSec.toFixed(1)}s · ${SFX_CATEGORY_LABELS[def.category] ?? def.category}`]),
        ]);
        const previewBtn = el("button", { type: "button", class: "studio-sfx-card-btn", title: "Preview", "aria-label": `Preview ${def.label}` }, []);
        previewBtn.innerHTML = SFX_PREVIEW_ICON;
        previewBtn.addEventListener("click", () => { void previewSfx(def.id).catch(() => {}); });
        const addBtn = el("button", { type: "button", class: "studio-sfx-card-btn add", title: "Add at playhead", "aria-label": `Add ${def.label} at playhead` }, []);
        addBtn.innerHTML = SFX_ADD_ICON;
        addBtn.addEventListener("click", () => {
          const atSec = Math.max(0, audioEl.currentTime || 0);
          sfxOverlays.push({ sfxId: def.id, atSec });
          renderSfxChips();
        });
        card.append(iconBox, meta, previewBtn, addBtn);
        sfxListEl.appendChild(card);
      }
    }
    sfxSearchInput.addEventListener("input", () => {
      sfxQuery = sfxSearchInput.value;
      renderSfxList();
    });
    renderSfxList();

    const sfxChipsEl = el("div", { class: "studio-sfx-chips" });
    function renderSfxChips() {
      clear(sfxChipsEl);
      if (sfxOverlays.length === 0) {
        sfxChipsEl.appendChild(el("p", { class: "control-hint" }, ["No sound effects added yet."]));
        return;
      }
      sfxOverlays.forEach((ov, i) => {
        const def = SFX_LIBRARY.find((s) => s.id === ov.sfxId)!;
        const removeBtn = el("button", { type: "button", class: "studio-sfx-chip-remove", "aria-label": "Remove" }, ["✕"]);
        removeBtn.addEventListener("click", () => {
          sfxOverlays.splice(i, 1);
          renderSfxChips();
        });
        sfxChipsEl.appendChild(
          el("span", { class: "studio-sfx-chip" }, [`${def.label} @ ${formatTime(ov.atSec)}`, removeBtn])
        );
      });
    }
    renderSfxChips();

    const panel = el("div", { class: "studio-video-panel" }, [
      el("h4", {}, ["Track"]),
      swapBtn,
      durationLabel,
      el("h4", {}, ["Volume"]),
      el("label", { class: "studio-field" }, [el("span", {}, ["Gain"]), gainInput, gainReadout]),
      el("h4", {}, ["Fades"]),
      el("p", { class: "control-hint" }, ["Drag the handles on the waveform, or read the current values here."]),
      el("label", { class: "studio-field" }, [el("span", {}, ["Fade in"]), fadeInReadout]),
      el("label", { class: "studio-field" }, [el("span", {}, ["Fade out"]), fadeOutReadout]),
      el("h4", {}, ["On this track"]),
      el("p", { class: "control-hint" }, ["Pick a sound effect from the library on the right, added at the current playhead position."]),
      sfxChipsEl,
    ]);

    // The sound effects library (search + category pills + card grid) is its own detail panel
    // on the right, so the big browsable grid gets real room instead of crowding the track's
    // own controls on the left.
    const detailPanel = el("div", { class: "studio-video-panel studio-video-detail-panel" }, [
      el("h4", {}, ["Sound effect library"]),
      el("p", { class: "control-hint" }, ["Synthesized in the browser, not pulled from a stock library. Preview one, then add it at the current playhead position."]),
      el("div", { class: "studio-sfx-library" }, [sfxSearchWrap, sfxCategoryBar, sfxListEl]),
    ]);

    const layout = el("div", { class: "studio-video-editor-layout" }, [
      panel,
      el("div", { class: "studio-video-main" }, [stage]),
      detailPanel,
    ]);

    const resultHost = el("div");
    bodyHost.append(layout, resultHost, swapInput);

    // ---------------- Transport (custom play/pause, click-to-seek, live playhead) ----------------

    playBtn.addEventListener("click", () => {
      if (audioEl.paused) void audioEl.play().catch(() => {});
      else audioEl.pause();
    });
    audioEl.addEventListener("play", () => {
      playBtn.innerHTML = PAUSE_ICON;
      playBtn.setAttribute("aria-label", "Pause");
    });
    audioEl.addEventListener("pause", () => {
      playBtn.innerHTML = PLAY_ICON;
      playBtn.setAttribute("aria-label", "Play");
    });
    audioEl.addEventListener("timeupdate", () => {
      timeReadout.textContent = `${formatTime(audioEl.currentTime)} / ${formatTime(duration)}`;
      if (duration > 0) playhead.style.left = `${(audioEl.currentTime / duration) * 100}%`;
    });
    audioEl.addEventListener("loadedmetadata", () => {
      duration = audioEl.duration || 0;
      durationLabel.textContent = `Track length: ${formatTime(duration)}`;
      timeReadout.textContent = `0:00 / ${formatTime(duration)}`;
      renderFadeVisuals();
    });

    waveformWrap.addEventListener("pointerdown", (e) => {
      if (e.target === fadeInHandle || e.target === fadeOutHandle || fadeInHandle.contains(e.target as Node) || fadeOutHandle.contains(e.target as Node)) {
        return; // handled by the handles' own listeners
      }
      if (duration <= 0) return;
      const rect = waveformWrap.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      audioEl.currentTime = pct * duration;
    });

    // ---------------- Waveform ----------------

    function drawWaveform() {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width * dpr));
      const h = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (!peaks || peaks.length === 0) return;

      const n = peaks.length;
      const barSlot = canvas.width / n;
      const barWidth = Math.max(1, barSlot * 0.72);
      const midY = canvas.height / 2;
      ctx.fillStyle = "#38b6ff";
      for (let i = 0; i < n; i++) {
        const amp = Math.max(0.03, peaks[i]);
        const barHeight = Math.max(2, amp * canvas.height * 0.92);
        const x = i * barSlot;
        ctx.fillRect(x, midY - barHeight / 2, barWidth, barHeight);
      }
    }

    async function loadWaveform() {
      waveformLoading.style.display = "flex";
      try {
        peaks = await decodeWaveformPeaks(file, WAVEFORM_BUCKETS);
      } catch {
        peaks = null; // Some formats/browsers can fail to decode, the waveform just stays blank rather than blocking editing.
      }
      waveformLoading.style.display = "none";
      drawWaveform();
    }

    window.addEventListener("resize", drawWaveform);

    // ---------------- Fade handles (drag right on the waveform) ----------------

    function renderFadeVisuals() {
      if (duration <= 0) return;
      const inPct = Math.max(0, Math.min(100, (fadeInSec / duration) * 100));
      const outPct = Math.max(0, Math.min(100, 100 - (fadeOutSec / duration) * 100));
      fadeInHandle.style.left = `${inPct}%`;
      fadeOutHandle.style.left = `${outPct}%`;
      fadeInShade.style.width = `${inPct}%`;
      fadeOutShade.style.width = `${100 - outPct}%`;
      fadeInReadout.textContent = `${fadeInSec.toFixed(1)}s`;
      fadeOutReadout.textContent = `${fadeOutSec.toFixed(1)}s`;
    }

    function bindFadeHandleDrag(handle: HTMLElement, which: "in" | "out") {
      handle.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        handle.setPointerCapture(e.pointerId);
        const onMove = (ev: PointerEvent) => {
          if (duration <= 0) return;
          const rect = waveformWrap.getBoundingClientRect();
          const pct = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
          const time = pct * duration;
          const MIN_GAP = 0.2;
          if (which === "in") {
            fadeInSec = Math.max(0, Math.min(time, duration - fadeOutSec - MIN_GAP));
          } else {
            fadeOutSec = Math.max(0, Math.min(duration - time, duration - fadeInSec - MIN_GAP));
          }
          renderFadeVisuals();
        };
        const onUp = () => {
          window.removeEventListener("pointermove", onMove);
          window.removeEventListener("pointerup", onUp);
        };
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
      });
    }
    bindFadeHandleDrag(fadeInHandle, "in");
    bindFadeHandleDrag(fadeOutHandle, "out");

    void loadWaveform();

    // ---------------- Export ----------------

    exportBtn.onclick = async () => {
      if (getUsageStatus().atLimit) {
        clear(resultHost);
        resultHost.appendChild(usageLimitReachedPanel());
        return;
      }
      clear(resultHost);
      const process = createProcessPanel(["Reading file", "Rendering", "Finalizing"]);
      resultHost.appendChild(process.root);
      const startedAt = performance.now();
      try {
        process.setStep("Rendering sound effects");
        const renderedOverlays = await Promise.all(
          sfxOverlays.map(async (ov) => ({
            blob: audioBufferToWavBlob(await renderSfxBuffer(ov.sfxId)),
            atSec: ov.atSec,
          }))
        );
        const result = await exportStudioAudio(
          file,
          { gainDb, fadeInSec, fadeOutSec, durationSec: duration, sfxOverlays: renderedOverlays },
          ({ phase, ratio }) => {
            process.setStep(phase);
            process.setProgress(ratio ?? null);
          }
        );
        recordCompletedOperation();
        const previewUrl = URL.createObjectURL(result.blob);
        clear(resultHost);
        resultHost.appendChild(
          renderResultPanel({
            previewUrl,
            previewIsAudio: true,
            outputName: result.outputName,
            outputFormatLabel: "MP3 (192 kbps)",
            originalBytes: file.size,
            outputBytes: result.blob.size,
            processingMs: performance.now() - startedAt,
            blob: result.blob,
            honestyNote: "Re-encoded to MP3 at 192 kbps so the gain change and fades are actually baked in, not a lossless stream copy.",
            onRunAnother: () => renderUpload(),
          })
        );
      } catch (err) {
        clear(resultHost);
        resultHost.appendChild(
          el("div", { class: "validation-error" }, [
            el("strong", {}, ["Something went wrong. "]),
            err instanceof Error ? err.message : String(err),
          ])
        );
      }
    };
  }

  renderUpload();
  return root;
}
