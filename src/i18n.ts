// A minimal, dependency-free i18n layer: two flat dictionaries and a lookup function. This
// covers the site's shared chrome (header, footer), the landing page, the tools hub, and
// every tool page's title/description, rather than every control label inside each tool's
// body, which is a much larger surface and lower priority for a first bilingual pass.
//
// Switching language does a full page reload (see ui/langToggle.ts) rather than an in-place
// re-render, since the app builds its DOM once at startup with no reactive layer; a reload is
// simple, never leaves stale cached tool-page text behind, and matches how the saved
// preference is already read once at boot, the same pattern the theme script uses.

export type Lang = "en" | "zh";

const STORAGE_KEY = "convertly:lang";

export function getLang(): Lang {
  try {
    return localStorage.getItem(STORAGE_KEY) === "zh" ? "zh" : "en";
  } catch {
    return "en";
  }
}

export function setLang(lang: Lang): void {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Ignore; the choice just will not persist across reloads.
  }
}

type Dict = Record<string, string>;

const en: Dict = {
  "brand.ariaLabel": "Convertly, go to home",
  "nav.home": "Home",
  "nav.tools": "Open tools",
  "nav.mainLabel": "Main",
  "nav.openMenu": "Open menu",
  "nav.closeMenu": "Close menu",
  "nav.menuLabel": "Menu",
  "nav.appearance": "Appearance",
  "nav.language": "Language",

  "hero.title": "Make your files lighter, cleaner, ready.",
  "hero.lede":
    "Convert image formats, turn raster art into clean SVG, compress images and video, and zip any file type down to a smaller archive. Processed on your device, not uploaded to a server.",
  "hero.getStarted": "Get started",
  "hero.fact.noAccount.title": "No account",
  "hero.fact.noAccount.body": "Nothing to sign up for, nothing to pay for.",
  "hero.fact.runsLocally.title": "Runs locally",
  "hero.fact.runsLocally.body": "Files are processed in your browser and never leave your device.",
  "hero.fact.realEngines.title": "Real engines",
  "hero.fact.realEngines.body": "FFmpeg, canvas codecs, and a real tracing engine. No faked results.",

  "trust.card1.title": "Nothing is uploaded",
  "trust.card1.body":
    "Convert, Vectorize and image Compress run entirely in canvas and WebAssembly, inside this tab. Video compression uses a real FFmpeg build compiled to WebAssembly, also local. Files are never sent to a server.",
  "trust.card2.title": "Estimates are estimates",
  "trust.card2.body":
    "Before you process a file, size predictions are labelled as estimates because real output depends on the file's content. After processing, you see the actual output size and the actual change.",
  "trust.card3.title": "Honest about limits",
  "trust.card3.body":
    "Large videos need real memory and time. This is engineering-limited, not a marketing promise. If your device can't handle a file, you'll get a clear error instead of a fake result.",

  "hub.title": "Open tools",
  "hub.subtitle": "Every module lives on its own page. Pick one below.",
  "category.imagesVideo": "Images & video",
  "category.pdf": "PDF",
  "category.audio": "Audio",
  "category.archives": "Archives",
  "category.utilities": "Utilities",

  "card.convert.label": "Convert",
  "card.convert.desc": "Change image format: PNG, JPEG, WebP, AVIF.",
  "card.remove-bg.label": "Remove background",
  "card.remove-bg.desc": "Cut out the background of any image.",
  "card.vectorize.label": "Vectorize",
  "card.vectorize.desc": "Turn a raster image into a clean SVG.",
  "card.compress-image.label": "Compress image",
  "card.compress-image.desc": "Shrink a PNG or JPEG's file size.",
  "card.compress-video.label": "Compress video",
  "card.compress-video.desc": "Real FFmpeg re-encode, smaller file.",
  "card.trim.label": "Trim video",
  "card.trim.desc": "Cut a clip to an exact start and end.",
  "card.gif.label": "Video to GIF",
  "card.gif.desc": "Palette-optimized, not the muddy default.",
  "card.extract-audio.label": "Extract audio",
  "card.extract-audio.desc": "Pull a video's audio track out as MP3.",
  "card.replace-audio.label": "Replace audio",
  "card.replace-audio.desc": "Swap a video's sound for another track.",
  "card.images-to-pdf.label": "Images to PDF",
  "card.images-to-pdf.desc": "Combine images into one PDF.",
  "card.pdf-to-images.label": "PDF to images",
  "card.pdf-to-images.desc": "Render every page as a real PNG.",
  "card.merge-pdf.label": "Merge PDFs",
  "card.merge-pdf.desc": "Combine two or more PDFs into one.",
  "card.split-pdf.label": "Split PDF",
  "card.split-pdf.desc": "Break a PDF into one file per page.",
  "card.audio.label": "Audio tools",
  "card.audio.desc": "Convert, trim, and normalize loudness.",
  "card.zip-create.label": "Create a zip",
  "card.zip-create.desc": "Compress any file type by bundling it into an archive.",
  "card.zip-extract.label": "Extract a zip",
  "card.zip-extract.desc": "Pull files back out of an archive.",

  "card.qr-code.label": "QR code generator",
  "card.qr-code.desc": "Turn text, a link, an email, or a phone number into a scannable code.",
  "card.steganography.label": "Hide data in an image",
  "card.steganography.desc": "Hide a secret message or file inside a picture, then reveal it later.",
  "card.metadata.label": "Metadata viewer",
  "card.metadata.desc": "See what's really inside an image, video, or audio file.",
  "card.card-creator.label": "Card creator",
  "card.card-creator.desc": "Design a birthday, Valentine, thank-you, or love letter card from a template.",

  "card.resize-image.label": "Resize image",
  "card.resize-image.desc": "Change an image's pixel dimensions, by exact size or by percentage.",
  "card.watermark-image.label": "Watermark image",
  "card.watermark-image.desc": "Stamp your name, handle, or a copyright line onto a photo.",
  "card.crop-image.label": "Crop image",
  "card.crop-image.desc": "Drag a box over the part of the image you want to keep.",
  "card.filter-image.label": "Photo filters",
  "card.filter-image.desc": "Grayscale, sepia, blur, and more, applied at full resolution.",

  "page.convert.title": "Convert Image Format (PNG, JPG, WebP, AVIF)",
  "page.convert.desc": "Convert PNG to JPG, JPEG to WebP, or any image to AVIF for free. No upload, no account, no watermark, runs entirely in your browser.",
  "page.remove-bg.title": "Remove Background from Image",
  "page.remove-bg.desc": "Remove the background from a photo online for free using a real AI segmentation model, right in your browser. Get a transparent PNG in seconds.",
  "page.vectorize.title": "Convert Image to Vector (SVG)",
  "page.vectorize.desc": "Convert a PNG or JPG into a clean, scalable SVG vector graphic online for free, using a real tracing engine, right in your browser.",
  "page.compress-image.title": "Compress Image Online (PNG/JPEG)",
  "page.compress-image.desc": "Compress a PNG or JPEG to reduce its file size without losing quality. Free online image compressor, runs entirely in your browser.",
  "page.compress-video.title": "Compress Video Online Free",
  "page.compress-video.desc": "Shrink a video's file size with a real FFmpeg re-encode, free and right in your browser. No upload to a server.",
  "page.trim.title": "Trim / Cut Video Online",
  "page.trim.desc": "Cut a video clip down to an exact start and end time online for free, right in your browser. No watermark.",
  "page.gif.title": "Convert Video to GIF",
  "page.gif.desc": "Turn a video into a smooth, palette-optimized GIF online for free, right in your browser.",
  "page.extract-audio.title": "Extract Audio from Video (MP3)",
  "page.extract-audio.desc": "Pull the audio track out of any video as an MP3 file, free, right in your browser.",
  "page.replace-audio.title": "Replace Audio in a Video",
  "page.replace-audio.desc": "Swap out a video's soundtrack for a different audio file online for free, right in your browser.",
  "page.images-to-pdf.title": "Convert Images to PDF",
  "page.images-to-pdf.desc": "Convert JPG or PNG images to PDF for free. Combine one or more photos into a single PDF file, right in your browser.",
  "page.pdf-to-images.title": "Convert PDF to Images (PNG)",
  "page.pdf-to-images.desc": "Convert every page of a PDF into a real PNG image online for free, right in your browser.",
  "page.merge-pdf.title": "Merge PDF Files Online",
  "page.merge-pdf.desc": "Combine two or more PDF files into one, in the order you choose, free and right in your browser.",
  "page.split-pdf.title": "Split PDF into Pages",
  "page.split-pdf.desc": "Split a PDF apart into one file per page online for free, right in your browser.",
  "page.audio.title": "Audio Converter & Editor",
  "page.audio.desc": "Convert audio format, adjust bitrate, trim, and normalize loudness online for free, right in your browser.",
  "page.zip-create.title": "Create a ZIP File Online",
  "page.zip-create.desc": "Compress any file type into a ZIP archive for free, right in your browser. Works on any file type.",
  "page.zip-extract.title": "Extract Files from a ZIP",
  "page.zip-extract.desc": "Unzip a ZIP archive and pull the files back out online for free, right in your browser.",

  "page.qr-code.title": "Custom QR Code Generator with Logo",
  "page.qr-code.desc": "Create a QR code for a link, payment page, or account number. Choose a color with a color picker, pick a pattern style, and add your own logo, free.",
  "page.steganography.title": "Hide a Secret Message or File in an Image",
  "page.steganography.desc": "Hide a secret message, password, or an entire file inside an ordinary picture, then reveal it later with the same tool. Free steganography online.",
  "page.metadata.title": "Image, Video & Audio Metadata Viewer",
  "page.metadata.desc": "See the EXIF data, GPS location, camera settings, and time a photo, video, or audio file was created, deep and exhaustive, free online.",
  "page.card-creator.title": "Free Online Greeting Card Maker",
  "page.card-creator.desc": "Pick an occasion, add your message, and download a ready-made greeting card, free, right in your browser.",

  "page.resize-image.title": "Resize Image Online",
  "page.resize-image.desc": "Resize a photo to an exact pixel size or a quick percentage, free online, right in your browser.",
  "page.watermark-image.title": "Add Watermark to Photo",
  "page.watermark-image.desc": "Stamp your name, handle, or a copyright line onto a photo, positioned and styled the way you want, free online.",
  "page.crop-image.title": "Crop Image Online",
  "page.crop-image.desc": "Drag a box over the part of a photo you want to keep, then crop it at full resolution, free online.",
  "page.filter-image.title": "Photo Filters Online (Grayscale, Sepia, Blur)",
  "page.filter-image.desc": "Apply grayscale, sepia, invert, brightness, contrast, saturation, or blur to a photo at full resolution, free online.",

  "toolPage.allTools": "All tools",
  "toolPage.loading": "Loading tool...",

  "footer.builtBy": ", built by Ememzyvisuals",
  "footer.about":
    "A browser-based file toolkit. Nothing you work on is uploaded to a server, every conversion, trace, and compression runs on your own device.",
  "footer.badge.openSource": "Open source",
  "footer.badge.mit": "MIT license",
  "footer.badge.noAccount": "No account needed",
  "footer.product.title": "What Convertly can do",
  "footer.product.convert": "Convert image formats",
  "footer.product.vectorize": "Vectorize (raster to SVG)",
  "footer.product.compress": "Compress images and video",
  "footer.product.pdfAudioArchive": "PDF, audio and archive tools",
  "footer.openSource.title": "Open source",
  "footer.openSource.desc": "Convertly is free and open source. Read the code, file an issue, or send a pull request.",
  "footer.starRepo": "Star this repo",
  "footer.forkIt": "Fork it",
  "footer.reportIssue": "Report an issue",
  "footer.support.title": "Support the project",
  "footer.support.desc": "If Convertly saves you time, reach out and say so, that's what keeps it going.",
  "footer.supportOnX": "Support on X",
  "footer.developer": "Developer",
  "footer.developerSocialsLabel": "Ememzyvisuals on the web",
  "footer.bottomBar": "(c) {year} Convertly. Built by Ememzyvisuals.",
  "footer.license": "MIT License",
};

const zh: Dict = {
  "brand.ariaLabel": "Convertly，返回首页",
  "nav.home": "首页",
  "nav.tools": "打开工具",
  "nav.mainLabel": "主导航",
  "nav.openMenu": "打开菜单",
  "nav.closeMenu": "关闭菜单",
  "nav.menuLabel": "菜单",
  "nav.appearance": "外观",
  "nav.language": "语言",

  "hero.title": "让你的文件更轻、更干净、随时可用。",
  "hero.lede":
    "转换图片格式，将位图转换为清晰的 SVG 矢量图，压缩图片和视频，并将任意文件类型打包成更小的压缩包。全部在你的设备上处理，不会上传到服务器。",
  "hero.getStarted": "立即开始",
  "hero.fact.noAccount.title": "无需注册",
  "hero.fact.noAccount.body": "无需注册账号，也不用付费。",
  "hero.fact.runsLocally.title": "本地运行",
  "hero.fact.runsLocally.body": "文件在你的浏览器中处理，绝不会离开你的设备。",
  "hero.fact.realEngines.title": "真实引擎",
  "hero.fact.realEngines.body": "使用 FFmpeg、canvas 编解码器和真实的矢量描摹引擎，结果绝不造假。",

  "trust.card1.title": "不上传任何内容",
  "trust.card1.body":
    "转换、矢量化和图片压缩完全在本标签页内通过 canvas 和 WebAssembly 运行。视频压缩使用编译为 WebAssembly 的真实 FFmpeg，同样在本地运行。文件绝不会发送到服务器。",
  "trust.card2.title": "预估仅供参考",
  "trust.card2.body":
    "在处理文件之前，体积预测都标注为“预估”，因为实际结果取决于文件内容本身。处理完成后，你会看到真实的输出体积和实际变化。",
  "trust.card3.title": "诚实面对限制",
  "trust.card3.body":
    "大视频需要真实的内存和时间，这是工程上的客观限制，不是营销承诺。如果你的设备无法处理某个文件，你会收到明确的错误提示，而不是一个虚假的结果。",

  "hub.title": "打开工具",
  "hub.subtitle": "每个功能模块都在独立的页面中，请从下方选择一个。",
  "category.imagesVideo": "图片与视频",
  "category.pdf": "PDF",
  "category.audio": "音频",
  "category.archives": "压缩包",
  "category.utilities": "实用工具",

  "card.convert.label": "格式转换",
  "card.convert.desc": "转换图片格式：PNG、JPEG、WebP、AVIF。",
  "card.remove-bg.label": "去除背景",
  "card.remove-bg.desc": "去除任意图片的背景。",
  "card.vectorize.label": "矢量化",
  "card.vectorize.desc": "将位图转换为清晰的 SVG。",
  "card.compress-image.label": "压缩图片",
  "card.compress-image.desc": "缩小 PNG 或 JPEG 的文件体积。",
  "card.compress-video.label": "压缩视频",
  "card.compress-video.desc": "使用真实 FFmpeg 重新编码，体积更小。",
  "card.trim.label": "剪辑视频",
  "card.trim.desc": "精确裁剪视频的起止时间。",
  "card.gif.label": "视频转 GIF",
  "card.gif.desc": "调色板优化，画质不再浑浊。",
  "card.extract-audio.label": "提取音频",
  "card.extract-audio.desc": "将视频中的音轨提取为 MP3。",
  "card.replace-audio.label": "替换音频",
  "card.replace-audio.desc": "将视频的声音替换为另一段音轨。",
  "card.images-to-pdf.label": "图片转 PDF",
  "card.images-to-pdf.desc": "将多张图片合并为一个 PDF。",
  "card.pdf-to-images.label": "PDF 转图片",
  "card.pdf-to-images.desc": "将每一页渲染为真实的 PNG 图片。",
  "card.merge-pdf.label": "合并 PDF",
  "card.merge-pdf.desc": "将两个或多个 PDF 合并为一个。",
  "card.split-pdf.label": "拆分 PDF",
  "card.split-pdf.desc": "将 PDF 拆分为每页一个文件。",
  "card.audio.label": "音频工具",
  "card.audio.desc": "转换格式、裁剪并调整响度。",
  "card.zip-create.label": "创建压缩包",
  "card.zip-create.desc": "将任意类型的文件打包压缩。",
  "card.zip-extract.label": "解压压缩包",
  "card.zip-extract.desc": "从压缩包中提取文件。",

  "card.qr-code.label": "二维码生成器",
  "card.qr-code.desc": "将文字、链接、邮箱或电话号码生成可扫描的二维码。",
  "card.steganography.label": "图片藏密",
  "card.steganography.desc": "把一条秘密信息或一个文件藏进图片里，之后再取出来。",
  "card.metadata.label": "元数据查看器",
  "card.metadata.desc": "查看图片、视频或音频文件里真实的技术信息。",
  "card.card-creator.label": "贺卡制作",
  "card.card-creator.desc": "从模板设计生日、情人节、感谢或情书贺卡。",

  "card.resize-image.label": "调整图片尺寸",
  "card.resize-image.desc": "按精确数值或百分比修改图片的像素尺寸。",
  "card.watermark-image.label": "图片水印",
  "card.watermark-image.desc": "在照片上盖上你的名字、账号或版权信息。",
  "card.crop-image.label": "裁剪图片",
  "card.crop-image.desc": "拖动一个方框，选取要保留的图片区域。",
  "card.filter-image.label": "照片滤镜",
  "card.filter-image.desc": "黑白、复古、模糊等滤镜，全部按原始分辨率应用。",

  "page.convert.title": "格式转换",
  "page.convert.desc": "转换图片格式：PNG、JPEG、WebP 或 AVIF，全部在本标签页内完成。",
  "page.remove-bg.title": "去除背景",
  "page.remove-bg.desc": "使用真实的分割模型，在本标签页内去除任意图片的背景。",
  "page.vectorize.title": "矢量化",
  "page.vectorize.desc": "使用真实的矢量描摹引擎，将位图转换为清晰、可缩放的 SVG。",
  "page.compress-image.title": "压缩图片",
  "page.compress-image.desc": "通过真实的重新编码缩小 PNG 或 JPEG 的体积，而不是一个假的进度条。",
  "page.compress-video.title": "压缩视频",
  "page.compress-video.desc": "在本标签页内使用真实的 FFmpeg 重新编码，获得真正更小的文件。",
  "page.trim.title": "剪辑视频",
  "page.trim.desc": "将视频精确裁剪到指定的起止时间。",
  "page.gif.title": "视频转 GIF",
  "page.gif.desc": "调色板优化的 GIF 转换，而不是大多数转换工具那种浑浊的默认效果。",
  "page.extract-audio.title": "提取音频",
  "page.extract-audio.desc": "将视频的音轨提取为独立的 MP3 文件。",
  "page.replace-audio.title": "替换音频",
  "page.replace-audio.desc": "将视频的声音替换为另一段音轨。",
  "page.images-to-pdf.title": "图片转 PDF",
  "page.images-to-pdf.desc": "将一张或多张图片合并为一个 PDF。",
  "page.pdf-to-images.title": "PDF 转图片",
  "page.pdf-to-images.desc": "将 PDF 的每一页渲染为真实的 PNG 图片。",
  "page.merge-pdf.title": "合并 PDF",
  "page.merge-pdf.desc": "按添加顺序将两个或多个 PDF 合并为一个文件。",
  "page.split-pdf.title": "拆分 PDF",
  "page.split-pdf.desc": "将 PDF 拆分为每页一个文件。",
  "page.audio.title": "音频工具",
  "page.audio.desc": "转换格式、调整比特率、裁剪并调整响度。",
  "page.zip-create.title": "创建压缩包",
  "page.zip-create.desc": "将任意类型的文件打包压缩，适用于任何文件。",
  "page.zip-extract.title": "解压压缩包",
  "page.zip-extract.desc": "从 zip 压缩包中提取文件。",

  "page.qr-code.title": "二维码生成器",
  "page.qr-code.desc": "将文字、链接、邮箱地址或电话号码编码为二维码，全部在此标签页内完成。",
  "page.steganography.title": "图片藏密",
  "page.steganography.desc": "把一条秘密信息或一整个文件藏进一张看似普通的图片里，之后再取出来。",
  "page.metadata.title": "元数据查看器",
  "page.metadata.desc": "查看图片、视频或音频文件真实的技术信息和 EXIF 元数据。",
  "page.card-creator.title": "贺卡制作",
  "page.card-creator.desc": "选择一个场合，填写你的留言，即可获得一张可直接下载的贺卡。",

  "page.resize-image.title": "调整图片尺寸",
  "page.resize-image.desc": "按精确数值或快捷百分比修改图片的像素尺寸。",
  "page.watermark-image.title": "图片水印",
  "page.watermark-image.desc": "在照片上盖上你的名字、账号或版权信息，可自由调整位置和样式。",
  "page.crop-image.title": "裁剪图片",
  "page.crop-image.desc": "拖动一个方框，选取要保留的区域，并按原始分辨率完成裁剪。",
  "page.filter-image.title": "照片滤镜",
  "page.filter-image.desc": "黑白、复古、反色、亮度、对比度、饱和度或模糊，全部按原始分辨率应用。",

  "toolPage.allTools": "全部工具",
  "toolPage.loading": "正在加载工具...",

  "footer.builtBy": "，由 Ememzyvisuals 开发",
  "footer.about": "一款基于浏览器的文件工具箱。你处理的内容不会上传到任何服务器，所有转换、描摹和压缩都在你自己的设备上完成。",
  "footer.badge.openSource": "开源",
  "footer.badge.mit": "MIT 许可证",
  "footer.badge.noAccount": "无需注册",
  "footer.product.title": "Convertly 能做什么",
  "footer.product.convert": "转换图片格式",
  "footer.product.vectorize": "矢量化（位图转 SVG）",
  "footer.product.compress": "压缩图片和视频",
  "footer.product.pdfAudioArchive": "PDF、音频和压缩包工具",
  "footer.openSource.title": "开源项目",
  "footer.openSource.desc": "Convertly 完全免费且开源，欢迎阅读代码、提交 issue 或发起 pull request。",
  "footer.starRepo": "点亮 Star",
  "footer.forkIt": "Fork 一份",
  "footer.reportIssue": "反馈问题",
  "footer.support.title": "支持这个项目",
  "footer.support.desc": "如果 Convertly 帮你节省了时间，欢迎联系我聊聊，这正是它持续更新的动力。",
  "footer.supportOnX": "在 X 上支持",
  "footer.developer": "开发者",
  "footer.developerSocialsLabel": "Ememzyvisuals 的社交主页",
  "footer.bottomBar": "(c) {year} Convertly。由 Ememzyvisuals 开发。",
  "footer.license": "MIT 许可证",
};

const dictionaries: Record<Lang, Dict> = { en, zh };

/** Looks up `key` in the current language, falling back to English, then the raw key itself
 * (so a missing translation shows up as an obviously-wrong string during development instead
 * of silently rendering blank). `vars` fills in `{placeholders}` like `{year}`. */
export function t(key: string, vars?: Record<string, string | number>): string {
  const lang = getLang();
  let value = dictionaries[lang][key] ?? dictionaries.en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      value = value.replace(`{${k}}`, String(v));
    }
  }
  return value;
}
