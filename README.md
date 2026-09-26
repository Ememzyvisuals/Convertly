<p align="center">
  <img src="public/logo-banner.png" alt="Convertly, local, browser-based file tools" width="480">
</p>

# Convertly

A file conversion, vectorization, and compression tool that runs entirely inside your
browser tab. No file you process is ever uploaded to a server, no account is required,
and nothing about that is a marketing claim, you can open your browser's network tab
while converting a file and see for yourself that no upload request is made.

Live: [convertly0.vercel.app](https://convertly0.vercel.app) (custom domain in progress,
see [Project status](#project-status) below)
Source: this repository, [github.com/Ememzyvisuals/Convertly](https://github.com/Ememzyvisuals/Convertly)

Built by **Ememzyvisuals**, [portfolio](https://ememzyvisuals.vercel.app) ·
[X](https://x.com/Ememzyvisuals) · [GitHub](https://github.com/Ememzyvisuals) ·
[TikTok](https://www.tiktok.com/@Ememzyvisuals)

Visual design system (near-black palette, orange accent, pill-shaped buttons, system
font stack) is adapted from [Amicro](https://amicro.vercel.app) by Syed Subhan
([@Subhan-code](https://github.com/Subhan-code/Amicro--Micro-transitions-)).

---

## Table of contents

- [Why this exists](#why-this-exists)
- [What's actually built right now](#whats-actually-built-right-now)
- [Roadmap, what's planned next](#roadmap-whats-planned-next)
- [Project status](#project-status)
- [Quick start for users](#quick-start-for-users)
- [Deploying your own copy](#deploying-your-own-copy)
- [Local development](#local-development)
- [Project structure](#project-structure)
- [How a tool is built, for contributors](#how-a-tool-is-built-for-contributors)
- [Design system and conventions](#design-system-and-conventions)
- [Known limitations, by design](#known-limitations-by-design)
- [Contributing](#contributing)
- [License](#license)

---

## Why this exists

Most online file converters, CloudConvert, Zamzar, Convertio, iLovePDF, Smallpdf, work
the same way underneath: your file gets uploaded to their server, converted there, and
sent back. That's true even for the ones that advertise encryption in transit, the file
still passes through a machine you don't control, however briefly.

Convertly does the conversion differently: every tool runs as real code inside your own
browser, using the Canvas API, WebAssembly builds of real encoders (FFmpeg), and real
in-browser libraries (a genuine vector tracer, a real segmentation model), not a thin
client that quietly ships your file elsewhere. That matters most for exactly the files
people are most protective of, contracts, IDs, financial statements, anything they'd
rather not hand to a stranger's server even for a few seconds.

The second thing Convertly does differently: it doesn't gate real functionality behind
an account or a subscription. There's a soft, local, per-browser daily counter to
discourage abuse (see [Known limitations](#known-limitations-by-design)), not a paywall.

## What's actually built right now

Two separate things live in this one app. **Open tools** is the workspace: quick,
single-purpose converters organized into categories (Images & video, PDF, Audio,
Archives), no signup, drop a file and get a result. **Convertly Studio** is a
different, much bigger module: a real visual editor, reached from its own "Studio"
link in the header, with its own landing page rather than being another tab in the
workspace. Every one of them below is real and working today, not a mockup.

### Convertly Studio

Opening Studio lands on a dashboard first (recent-work style catalog, a "start from
scratch" action, and a templates row), the same pattern Canva or Figma use before
dropping you into an actual editor, not a bare canvas.

- **Design & image editing (live today)**: a real, direct-manipulation canvas, not a
  configure-then-run tool. Drag elements to move them, use the transformer's corner
  handles to resize or rotate, double-click text to edit it in place. Built on
  [`Konva`](https://konvajs.org/), an actual 2D canvas scene graph.
  - **Elements**: text (six bundled Google Fonts, weight/style toggles, size, color),
    rectangles, circles, and uploaded images, all draggable and resizable.
  - **Background removal on any uploaded image**, right inside the editor, using the
    same real segmentation model as the Convert tool's background removal.
  - **Layers panel**: reorder, delete, or duplicate any element.
  - **Undo/redo**, four canvas size presets (square post, story, landscape, poster),
    and PNG/JPEG export at the canvas's real design resolution, not the on-screen
    display size.
  - **Templates**: a handful of original starter layouts (a sale announcement, a
    quote card, a story promo, an event poster), pre-loaded onto the canvas and fully
    editable, more (including real open-licensed sets) planned.
  - Loads as its own chunk on demand, so visitors who never open Studio never
    download Konva or its fonts.
- **Video editing**: not built yet. Planned as a real timeline (drag to trim, live
  scrubbing preview, overlay graphics on the clip) using WebCodecs for the
  interactive part and the existing FFmpeg WebAssembly build for final export, see
  the roadmap.
- **Audio editing**: not built yet, planned on the same FFmpeg engine already
  powering the Audio tools.

**Images & video**
- **Convert**: PNG, JPEG, WebP, and AVIF (when the visitor's browser supports encoding
  it), via the Canvas API. Lossless for PNG, quality-adjustable for the rest.
- **Remove background**: a real in-browser segmentation model
  ([`@imgly/background-removal`](https://github.com/imgly/background-removal-js)). The
  model (roughly 15 to 40 MB depending on variant) is fetched from IMG.LY's CDN the
  first time this specific feature is used, this is the one part of the app that isn't
  fully self-contained, and the UI says so before it downloads anything.
- **Vectorize**: real raster-to-vector tracing via
  [`imagetracerjs`](https://github.com/jankovicsandras/imagetracerjs), with a single
  "Detail level" control (Simple, Balanced, Detailed) rather than a wall of sliders.
- **Compress (images)**: canvas re-encode with a quality slider and optional resize.
- **Compress (video)**: a genuine FFmpeg build compiled to WebAssembly
  ([`@ffmpeg/ffmpeg`](https://github.com/ffmpegwasm/ffmpeg.wasm)), running entirely in
  the tab. Codec (H.264/VP9), CRF quality, resolution cap, encode speed preset, and
  audio bitrate are all real controls, not decoration.
- **Video tools**: trim to an exact start/end, convert a clip to a real palette-based
  GIF (two-pass `palettegen`/`paletteuse`, not the muddy default FFmpeg GIF), extract a
  video's audio track as a standalone MP3, and replace a video's audio track entirely
  with another audio file or another video's audio (its own sound is dropped, the
  result runs as long as the shorter of the two). Same FFmpeg engine as Compress.

**PDF**
- **Images to PDF**: combine any number of PNG/JPEG/WebP/BMP images into one PDF, either
  centered on A4 pages or one page per image's native size.
- **PDF to images**: render every page of a PDF to a real PNG (via
  [`pdf.js`](https://github.com/mozilla/pdf.js)) at a quality multiplier you choose, a
  single page downloads directly, multiple pages are packed into a ZIP.
- **Merge PDFs**: combine two or more PDFs, reordered by you, into one file.
- **Split PDF**: break a PDF into one single-page PDF per page, zipped together.
- All of this via [`pdf-lib`](https://github.com/Hopding/pdf-lib) for building/merging
  and `pdf.js` for rendering, both running locally with a self-hosted worker (no CDN).

**Audio**
- **Convert**: MP3, WAV, FLAC, OGG, and M4A, with real bitrate, sample rate, and
  mono/stereo channel controls.
- **Trim**: cut to a start/end range read from the file's real duration.
- **Normalize**: EBU R128 loudness normalization (`loudnorm`, -16 LUFS), a real filter,
  not a volume slider pretending to be one.
- Same shared FFmpeg WebAssembly engine as video, so it only loads once per tab even if
  you use both.

**Archives**
- **Create a zip**: any number of files, any type, DEFLATE-compressed, via
  [`JSZip`](https://github.com/Stuk/jszip).
- **Extract a zip**: reads the real contents and lets you download each file
  individually.

**Across every tool**
- **Before/after previews**: the original file and the processed result are shown side
  by side (or, for audio, a real playable result), with the download action directly
  under the result.
- **Multi-file uploads where the tool needs them** (PDF merge, images to PDF, zip
  creation), with an ordered list you can reorder or trim before running anything.
- **Local daily usage counter**: a soft, per-browser limit (100 runs per day, shown
  under each tool's Run button), stored in `localStorage`. This is the client-side
  equivalent of "how a site knows you're logged in", not real server-side abuse
  prevention (clearing site data or a private window resets it), and the UI is upfront
  about that rather than pretending otherwise.
- **Light and dark mode**, dark by default, remembered per browser.
- **Landing page and a separate workspace page**: the home page is the pitch, a "Get
  started" button (and "Open tools" in the header) takes you to a dedicated workspace
  with the tools. The URL updates too (`#/app`), so the workspace is linkable and
  survives a refresh.

Every result screen shows the **actual** output size and processing time, not a
pre-scripted number. On some inputs (already-compressed images, tiny or noisy test
files) the "compressed" output can come out *larger* than the source, and the UI shows
that honestly in amber rather than hiding it.

## Roadmap, what's planned next

The Studio's next milestone is a **CapCut-style video timeline**: real clips on a
timeline you drag and trim by hand (not sliders in a form), a scrubbable playhead with
live preview, and audio track editing (volume, fades, swapping in another track). The
plan is to use the browser's [`WebCodecs`](https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API)
API for the interactive part, fast, frame-accurate decoding for scrubbing and preview,
without re-invoking FFmpeg for every frame, while final export still goes through the
same FFmpeg WebAssembly build already proven in this app (it already does real
trims and audio replacement; a client-side WebCodecs-only encode/mux pipeline is a much
bigger, less battle-tested undertaking, and browser support for it is still uneven).
This is a genuinely larger build than anything shipped so far and hasn't been started
yet. Also planned for the Studio: reusable templates, image-to-sticker and
video-to-sticker export, and a curated set of starter layouts.

Beyond the Studio, the next step is a **Universal Converter** and a **Universal
Compress** workspace, a single "drop a file, we detect the format, you pick the output"
flow that sits in front of every tool above, rather than making people find the right
category first.

Beyond that:
- PDF: reorder, rotate, extract specific pages, and PDF compression (recompressing the
  images embedded inside a PDF).
- Document conversion with an honesty caveat attached in the UI: DOCX to PDF and
  Markdown, RTF, and ODT conversions via a real client-side pipeline (Pandoc compiled to
  WebAssembly feeding into Typst, also WebAssembly, for the actual PDF render). Fidelity
  is good for ordinary formatting, tables, and images, and is explicitly not promised to
  be pixel-perfect for complex original layouts. PDF to text and PDF to a basic, editable
  DOCX (text-focused, not a layout clone) are in the same tier.

**Explicitly not planned for now, and why:**
- True DOC/DOCX/PPT/XLS/ODT conversion at full visual fidelity (original fonts, tables,
  embedded objects preserved exactly) would need a real Office rendering engine like
  LibreOffice. The only WebAssembly build of that which exists today is roughly 80 MB
  gzipped, takes several seconds to cold-load, is described by its own maintainers as
  unstable, and doesn't even export to PDF yet. Shipping that would break the "fast,
  lightweight, fully local" experience for a half-working feature, so it's parked until
  a genuinely viable client-side option exists, or until there's a deliberate,
  explicitly-communicated decision to add a small server endpoint just for that one
  narrow feature.
- A public conversion API is a real architectural fork, not a small addition, it would
  mean files processed on an actual server for API users, which is a legitimate product
  to offer alongside the free browser tool, but it needs its own hosting, rate limiting,
  and auth story, and is being treated as a separate decision rather than folded in
  quietly.

## Project status

The project is actively being extended. A few things worth knowing if you're reading
this to decide whether to fork, deploy, or contribute:

- The canonical hosted copy is on Vercel at `convertly0.vercel.app` (the project name
  `convertly` was already taken, hence the `0`).
- A pull request is open against [js-org/js.org](https://github.com/js-org/js.org) to
  register `convertly.js.org` as a friendlier custom domain, pointing at the Vercel
  deployment. Once merged, that becomes the primary link.
- PDF, audio, and archive tools are implemented and live (see
  [What's actually built right now](#whats-actually-built-right-now)). Only the
  Universal Converter/Compress front door and document conversion, listed under
  [Roadmap](#roadmap-whats-planned-next), are still ahead.

## Quick start for users

Just want to use it? Open the live link above, click **Get started**, drop a file into
whichever tool you need, and download the result. No sign-up screen, no email capture.

## Deploying your own copy

### Option A: Netlify, drag and drop, zero configuration

The `dist/` folder in this repo, if present, is a pre-built, ready-to-deploy copy. If
you're working from a fresh clone instead (no `dist/` yet), run `npm install && npm run
build` first, that produces it.

1. Go to [app.netlify.com/drop](https://app.netlify.com/drop)
2. Drag the **`dist`** folder itself (not the whole repo, not a zip) onto the page
3. Netlify gives you a live `*.netlify.app` link immediately

No environment variables, no functions, no database, no build command required for this
path.

### Option B: Netlify, connected to Git

- Build command: `npm run build`
- Publish directory: `dist`
- Node version: 18 or newer (Netlify sets this automatically in most cases; add a
  `NODE_VERSION=18` environment variable if it doesn't)

### Option C: Vercel

```bash
npm install -g vercel
cd convertly
vercel --prod
```

Vercel auto-detects the Vite setup. If it asks explicitly: build command `npm run
build`, output directory `dist`.

### Option D: any static host

Since the build output is a plain static site (HTML, JS, CSS, and a couple of
WebAssembly/model assets fetched lazily), it will run on literally any static file
host, GitHub Pages, Cloudflare Pages, S3 plus CloudFront, a plain nginx box, and so on.
There is no server-side code anywhere in this project to configure.

## Local development

```bash
git clone https://github.com/Ememzyvisuals/Convertly.git
cd Convertly
npm install
npm run dev      # local dev server with hot reload, usually http://localhost:5173
npm run build    # type-checks with tsc, then produces dist/
npm run preview  # serves the built dist/ locally, good for a final sanity check
```

Requirements: Node.js 18 or newer, and npm. No other services, databases, or API keys
are needed to run this locally, that's the point.

> **A note if you're on Android/Termux or another environment with restricted or
> non-POSIX shared storage:** `npm install` needs to create symlinks for
> `node_modules/.bin`, which fails with an `EACCES`/`symlink` error on filesystems that
> don't support symlinks (Android's shared storage over FUSE, notably). Clone or copy
> the project into the tool's own native home directory first (for example, Termux's
> `~/`, not `~/storage/downloads/...`), then run `npm install` from there.

## Project structure

```
convertly/
├── dist/                 pre-built output, present after `npm run build`; this is
│                          the folder you deploy as-is
├── public/
│   ├── ffmpeg/            FFmpeg WASM core, served as static files, loaded lazily
│   └── favicon.svg
├── src/
│   ├── lib/               the actual conversion / vectorization / compression engines,
│   │                       framework-agnostic, no DOM code
│   │   ├── convert.ts       image format conversion (Canvas API)
│   │   ├── vectorize.ts     raster-to-SVG tracing
│   │   ├── compressImage.ts image re-encode/resize
│   │   ├── compressVideo.ts FFmpeg-based video compression
│   │   ├── videoTools.ts    trim, video-to-GIF, extract/replace audio (FFmpeg)
│   │   ├── audioTools.ts    audio format/bitrate/trim/normalize conversion (FFmpeg)
│   │   ├── ffmpegEngine.ts  shared FFmpeg WASM loader, one instance for the whole tab
│   │   ├── pdfTools.ts      images-to-PDF, PDF-to-images, merge, split (pdf-lib + pdf.js)
│   │   ├── archiveTools.ts  ZIP create/extract (JSZip)
│   │   ├── bgRemoval.ts     background removal model wrapper
│   │   ├── studioTemplates.ts starter templates for Studio's canvas editor (data only)
│   │   ├── usageLimit.ts    the local daily usage counter
│   │   ├── validate.ts      magic-byte file type sniffing (never trusts extensions)
│   │   └── format.ts        byte/duration/reduction formatting helpers
│   ├── ui/                reusable DOM components, no business logic
│   │   ├── upload.ts        drag-and-drop + file-picker uploader, single- and multi-file
│   │   ├── controls.ts      segmented controls, range sliders, estimate strips
│   │   ├── resultPanel.ts   the before/after result + download UI, shared by every tool
│   │   ├── processPanel.ts  the step-by-step "processing" UI
│   │   ├── usageBadge.ts    the "N of 100 runs used today" strip and limit-reached panel
│   │   ├── themeToggle.ts   light/dark mode switch
│   │   ├── socialIcons.ts   inline SVG brand marks for the footer
│   │   ├── illustrations.ts original vector avatar illustrations (hero + workspace)
│   │   └── dom.ts           tiny `el(...)` helper for building DOM nodes without a
│   │                         framework
│   ├── tools/              one file per tool panel, wires a `lib/` engine to the
│   │   │                    shared `ui/` components
│   │   ├── convertTool.ts
│   │   ├── vectorizeTool.ts
│   │   ├── compressTool.ts
│   │   ├── videoExtraTool.ts   trim, video-to-GIF, extract/replace audio panel
│   │   ├── pdfTool.ts          images-to-PDF, PDF-to-images, merge, split panel
│   │   ├── audioTool.ts        audio conversion panel
│   │   ├── archiveTool.ts      ZIP create/extract panel
│   │   └── studioTool.ts       Studio's canvas editor: text/shapes/images, layers,
│   │                            undo/redo, PNG/JPEG export (Konva); its own lazy-loaded
│   │                            chunk, opened from the Studio dashboard, not a tab
│   ├── pages/
│   │   └── studioHome.ts   Convertly Studio's own landing page/dashboard (surface
│   │                        tiles, templates), separate from the Open Tools workspace
│   ├── style.css           the entire design token system (colors, spacing, radii,
│   │                        light/dark theme overrides) and every component's styles
│   └── main.ts             app shell: header/nav, hero, workspace tab switching,
│                            Studio's own routing, footer, and the hash-based view
│                            routing (landing / workspace / studio-home / studio-editor)
├── index.html              app entry point, also has the inline no-flash theme script
├── netlify.toml
└── package.json
```

There is deliberately no framework (no React, Vue, or similar) and no client-side
router library. The workspace/landing "routing" is a small `goTo(view)` function in
`main.ts` that toggles two view containers and updates `window.location.hash`. This is
intentional, the app is simple enough that a framework would add build complexity
without adding much.

## How a tool is built, for contributors

Every existing tool follows the same shape, and any new tool (see the
[Roadmap](#roadmap-whats-planned-next)) should follow it too:

1. **The engine lives in `src/lib/`, with no DOM code in it.** It takes a `File` (or
   similar) and options, does real work (not a placeholder), and returns a real result
   (a `Blob`, dimensions, whatever's relevant). This makes the engine testable and
   reusable outside the UI layer.
2. **The tool panel lives in `src/tools/`.** It builds the controls for that specific
   tool (using the shared components in `src/ui/controls.ts`), wires them to the
   engine, and on completion calls `renderResultPanel(...)` from `src/ui/resultPanel.ts`
   with the real before/after data, never a mocked number.
3. **Every tool checks `getUsageStatus()` before running**, and shows
   `usageLimitReachedPanel()` if the local daily limit has been hit (see
   `src/lib/usageLimit.ts` and `src/ui/usageBadge.ts`).
4. **Every tool includes an honest, plain-language note about what the operation
   actually does and doesn't guarantee** (see the `honestyNote` field passed into
   `renderResultPanel`). If a new tool has a real limitation (a document conversion
   that isn't pixel-perfect, say), that limitation belongs in the UI copy, not just in
   this README.
5. **New tools get registered in the `categories` array inside `buildWorkspace()` in
   `src/main.ts`**, either as a new entry in an existing category's `tools` list, or as
   a new category if the tool doesn't fit any existing one.

## Design system and conventions

- **Colors, spacing, and shape are all CSS custom properties**, defined once in
  `:root` in `src/style.css`, with a `:root[data-theme="light"]` override block for
  light mode. Don't hardcode a hex color or a pixel radius in a component, use the
  existing token (`var(--accent)`, `var(--radius-pill)`, and so on) so both themes stay
  correct automatically.
- **Buttons are pill-shaped (`--radius-pill`), cards use `--radius-md`.** This isn't
  arbitrary, it's carried over from the Amicro design system this project's visual
  language is based on.
- **Borders and muted text use alpha-based `rgba()` values**, not solid grays, again
  following the same source design system.
- **Font is self-hosted** via `@fontsource/outfit` and `@fontsource/jetbrains-mono`
  (imported directly in `main.ts`), not loaded from Google Fonts' CDN. This was a
  deliberate fix, an external font CDN dependency previously caused fonts to silently
  fail to render in constrained/offline test environments.
- **No em dashes anywhere**, in code comments, UI copy, or this README. Use a period or
  a comma instead. This is a standing style rule for the project, not a one-off request.
- **No fake data, ever.** Every number shown in the UI (file size, processing time,
  percentage change) must come from a real measurement of a real operation. If a
  feature can't be implemented for real yet, it doesn't ship a placeholder version that
  pretends to work.

## Known limitations, by design

- **No server-side or IP-based usage enforcement.** What ships instead is a local,
  per-browser daily counter, a genuine nudge, not real abuse prevention. Real
  server-side enforcement would need a persistent backend, which conflicts with the
  "drag a static folder, zero configuration" deployment this project prioritizes.
- **AVIF encoding** depends on the visitor's browser supporting
  `canvas.toBlob('image/avif')`. Convertly feature-detects this and hides the AVIF
  option where it isn't supported, rather than offering it and failing.
- **Very large videos** on memory-constrained devices (older phones especially) can run
  out of memory inside the WebAssembly sandbox. The result is an honest error, not a
  fake result, raising this ceiling for real would need a server-side transcoding
  pipeline, which is out of scope for a backend-free build.
- **Background removal** is the one feature that calls out to a third party (IMG.LY's
  CDN, for the model weights only, never for a user's files). Everything else is fully
  local.

## Contributing

Issues and pull requests are welcome. A few practical notes before opening one:

- Read [How a tool is built, for contributors](#how-a-tool-is-built-for-contributors)
  first if you're adding a new conversion tool, the existing three tools are the
  reference implementation to follow.
- Keep the "no server" principle intact for any new feature. If something genuinely
  can't be done client-side (see the Roadmap's "explicitly not planned" section), open
  an issue to discuss it before building it, rather than quietly adding a server call.
- Match the existing design tokens and the no-em-dash rule (see
  [Design system and conventions](#design-system-and-conventions)) rather than
  introducing new one-off styles or colors.
- Run `npm run build` before opening a PR, it runs a full TypeScript check as part of
  the build and will catch type errors that `npm run dev` alone won't.

## License

No license file has been added to this repository yet. Until one is, the default is
full copyright, all rights reserved, meaning reuse beyond reading the code isn't
formally granted. If you're planning to fork this for your own deployment or build on
top of it, reach out first, or watch this repo for a license file being added.
