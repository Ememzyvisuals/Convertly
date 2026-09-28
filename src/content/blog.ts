// Blog posts, written directly as structured content blocks instead of parsed Markdown, since
// the app has no Markdown dependency and these posts are short enough that a small array of
// typed blocks is simpler than adding one. Each post targets a real search phrase (see its
// `description`) and ends by pointing at the one Convertly tool it is actually about, so a
// visitor who arrived from a search engine lands on useful writing and one clear next step,
// not just a wall of keywords.
export type BlogBlock = { type: "p"; text: string } | { type: "h2"; text: string } | { type: "ul"; items: string[] };

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  datePublished: string;
  readMinutes: number;
  /** id into TOOL_PAGES, for the "try it" call to action at the end of the post. */
  relatedTool: string;
  relatedToolLabel: string;
  body: BlogBlock[];
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "convert-id-card-image-to-pdf-without-uploading",
    title: "How to Convert an ID Card or Document Image to PDF Without Uploading It Anywhere",
    description:
      "A form asks for a PDF but your ID, passport, or document is a photo. Here is how to convert it safely, without uploading it to a server you do not control.",
    datePublished: "2026-09-28",
    readMinutes: 4,
    relatedTool: "images-to-pdf",
    relatedToolLabel: "Convert your images to PDF now",
    body: [
      {
        type: "p",
        text: "It is a common, mildly stressful situation. Some form, portal, or application asks you to submit your identity card, passport photo page, or a signed document as a PDF, but all you have is a photo of it on your phone. So you search for \"convert image to PDF\" and land on one of dozens of free online converters.",
      },
      {
        type: "p",
        text: "Before you upload anything private to one of those sites, it is worth understanding what actually happens when you click \"convert\" on most of them.",
      },
      { type: "h2", text: "What happens when you upload your ID to a random converter" },
      {
        type: "p",
        text: "Most online file converters do their work on a server, not in your browser. That means the instant you upload your file, a copy of your ID card, passport, or document leaves your device and lands on a computer owned by a company you have probably never heard of. Some of these sites are entirely legitimate and delete files quickly. Others are not so careful, or say almost nothing about what happens to your file afterward, or bury a line in their terms of service reserving the right to use uploaded content to \"improve services\", which can mean feeding it into a dataset used to train an AI model, or reselling anonymized (or not so anonymized) data to other companies.",
      },
      {
        type: "p",
        text: "The problem is you usually cannot tell which kind of site you are dealing with just by looking at it. A polished interface and a free price tag do not tell you anything about what is happening on the backend.",
      },
      { type: "h2", text: "A safer way: convert it on your own device" },
      {
        type: "p",
        text: "Convertly's Images to PDF tool does the exact same job, combining one or more images into a single PDF, but it never uploads anything. The conversion happens entirely inside your browser tab using the Canvas API and a PDF-building library that runs locally. Your ID card image never touches a network request. There is no server on the other end waiting to receive it, because there is no backend at all.",
      },
      {
        type: "ul",
        items: [
          "Open the Images to PDF tool.",
          "Choose the photo or scan of your document (front and back, if needed).",
          "Reorder pages if you added more than one image.",
          "Download the finished PDF, generated entirely on your device.",
        ],
      },
      {
        type: "p",
        text: "Once you close the tab or refresh the page, nothing about that file remains anywhere. Not on a server, not in a database, because there was never a server involved in the first place.",
      },
    ],
  },
  {
    slug: "what-is-convertly",
    title: "What Is Convertly, and Why Did We Build a File Converter With No Backend?",
    description:
      "Convertly is a free, open-source toolbox for converting, compressing, and editing files entirely in your browser, with no upload and no account. Here is why that matters.",
    datePublished: "2026-09-28",
    readMinutes: 5,
    relatedTool: "convert",
    relatedToolLabel: "Try the format converter",
    body: [
      {
        type: "p",
        text: "Convertly is a free, open-source toolbox of file tools: image format conversion, background removal, vectorizing, compression, video trimming and GIF conversion, PDF merging and splitting, a QR code generator with logo branding, steganography, a deep metadata viewer, and more. What makes it different from most tools that do the same jobs is not any single feature. It is the fact that none of it happens on a server.",
      },
      { type: "h2", text: "The internet's \"free\" tools are rarely free of a catch" },
      {
        type: "p",
        text: "We are living through a period where personal data has quietly become one of the most valuable things a company can collect, and where AI models are hungry for exactly the kind of raw material people upload every day: photos, documents, scans, audio recordings. A lot of \"free\" online converters, background removers, and PDF tools cover their hosting and AI-inference costs in one of two ways: showing you ads, or using (and sometimes reselling) the files people upload. Often both. The terms of service that would tell you this are long, written in dense legal language, and almost nobody reads them before clicking \"I agree\".",
      },
      {
        type: "p",
        text: "None of this makes those tools evil. It makes them a trade you may not have realized you were making: convenience, in exchange for a company having a copy of your file and some latitude over what it can do with it.",
      },
      { type: "h2", text: "Why Convertly works differently" },
      {
        type: "p",
        text: "Every tool on Convertly runs entirely inside your own browser tab, using the browser's own canvas rendering, WebAssembly, and Web Audio APIs. There is no backend server receiving your files, because there is no backend at all. When you convert a PNG to a JPEG, remove the background from a photo, or merge two PDFs, that work is done by code running locally on your device, the same way a program installed on your computer would run.",
      },
      {
        type: "ul",
        items: [
          "No account or sign-up, for any tool.",
          "No file is ever uploaded to a server.",
          "Nothing is stored: once you close or refresh the tab, the file and any in-progress data are gone from memory.",
          "Free, and the source code is open, so anyone can check that this is actually true rather than taking our word for it.",
        ],
      },
      {
        type: "p",
        text: "This matters most for the files people are usually most careful with: an ID card, a signed contract, a medical document, a private photo. Convertly was built so you never have to choose between getting the file format you need and trusting a stranger's server with something sensitive.",
      },
    ],
  },
  {
    slug: "how-to-hide-secret-message-in-image-steganography",
    title: "How to Hide a Secret Message or File Inside an Image (Steganography, Explained Simply)",
    description:
      "A plain-language guide to image steganography: how it works, what it is actually useful for, and how to hide and reveal a hidden message or file in a picture for free.",
    datePublished: "2026-09-28",
    readMinutes: 5,
    relatedTool: "steganography",
    relatedToolLabel: "Try the steganography tool",
    body: [
      {
        type: "p",
        text: "Steganography is the practice of hiding information inside something that does not look like it is hiding anything. Where encryption scrambles a message so it is unreadable but obviously a coded message, steganography hides the fact that a message exists at all. An ordinary-looking photo of a sunset can carry a hidden note, a password, or an entire file inside it, and to anyone else it is just a photo of a sunset.",
      },
      { type: "h2", text: "How image steganography actually works" },
      {
        type: "p",
        text: "Every pixel in a digital image is made of numbers (its red, green, and blue color values). Changing the very last bit of one of those numbers shifts the color by an amount so small the human eye cannot perceive it, one shade out of 256 possible shades. Steganography tools use that unused precision to smuggle in a message, one bit at a time, across thousands of pixels. This is called least-significant-bit (LSB) encoding, and it is exactly how Convertly's steganography tool works.",
      },
      { type: "h2", text: "What people actually use it for" },
      {
        type: "ul",
        items: [
          "Sending a password, recovery phrase, or private note to someone through an ordinary-looking image, instead of plain text.",
          "Watermarking your own images with an invisible marker only you can reveal, to prove authorship later.",
          "A fun, low-stakes way to send a hidden message to a friend, a proposal, or a puzzle for a birthday.",
          "Embedding an entire small file (not just text) inside a picture, then extracting it again later.",
        ],
      },
      { type: "h2", text: "How to hide and reveal a message with Convertly" },
      {
        type: "ul",
        items: [
          "Open the steganography tool and choose a cover image (any ordinary PNG works well).",
          "Type a secret message, or attach a whole file to hide inside the image instead.",
          "Download the resulting image. It looks identical to the original to anyone viewing it normally.",
          "To read it back later, open the same tool, choose \"reveal\", and upload that image. The hidden message or file is extracted right there in your browser.",
        ],
      },
      {
        type: "p",
        text: "Because this runs entirely locally, neither your cover image nor your secret message or file is ever uploaded anywhere while you are hiding or revealing it.",
      },
    ],
  },
  {
    slug: "custom-qr-code-with-logo-and-colors",
    title: "How to Make a Custom QR Code With Your Own Colors and Logo",
    description:
      "A plain black-and-white QR code works, but a branded one gets scanned more. Here is how to customize a QR code's pattern, colors, and add a logo, for free.",
    datePublished: "2026-09-28",
    readMinutes: 4,
    relatedTool: "qr-code",
    relatedToolLabel: "Try the QR code generator",
    body: [
      {
        type: "p",
        text: "A QR code does not have to be a plain black-and-white grid. For a business card, a \"scan to pay\" sign, a \"scan to review us\" table tent, or a product package, a QR code that matches your brand's colors and carries your logo looks intentional and trustworthy, rather than generic.",
      },
      { type: "h2", text: "What you can customize" },
      {
        type: "ul",
        items: [
          "Pattern style: classic square modules, softly rounded modules, or a dot-matrix look.",
          "Foreground and background color, picked with a real color picker rather than a fixed palette.",
          "A logo placed in the center of the code, uploaded from your own device.",
        ],
      },
      { type: "h2", text: "Why scannability does not have to suffer" },
      {
        type: "p",
        text: "A common worry with styled QR codes is whether a scanner can still read them. QR codes have built-in error correction, meaning they are designed to still decode correctly even if part of the code is damaged, covered, or altered, up to a point. Convertly's QR generator automatically raises the error correction level to its highest setting the moment you add a logo, and every style and logo combination is tested against a real QR decoder before being considered finished, not just checked by eye.",
      },
      { type: "h2", text: "What to encode in it" },
      {
        type: "p",
        text: "A QR code can carry more than a website link. People commonly encode a payment page, an account number, a WhatsApp or contact link, a Wi-Fi network's credentials, or a plain text note like \"Thank you for your order\". Type or paste whatever text or link you want encoded, then style it.",
      },
      {
        type: "p",
        text: "Like every Convertly tool, this runs entirely in your browser: your logo and your chosen text never leave your device on their way to becoming a QR code.",
      },
    ],
  },
  {
    slug: "image-metadata-exif-privacy-guide",
    title: "What Your Photos Are Really Telling People: A Guide to Image Metadata and EXIF Privacy",
    description:
      "A photo can quietly reveal the exact GPS location and time it was taken, and what camera or phone shot it. Here is how to check, and what metadata actually contains.",
    datePublished: "2026-09-28",
    readMinutes: 6,
    relatedTool: "metadata",
    relatedToolLabel: "Check a file's metadata now",
    body: [
      {
        type: "p",
        text: "Every photo your phone or camera takes usually carries far more information than the image itself. This hidden data is called metadata, and depending on your camera's settings, it can include the exact GPS coordinates of where the photo was taken, the precise date and time down to the second, the camera or phone model, the lens used, and dozens of other technical details.",
      },
      { type: "h2", text: "So yes, a photo can reveal where and when it was taken" },
      {
        type: "p",
        text: "If GPS tagging was on when the photo was shot (which is the default on most smartphones), the image file contains latitude and longitude coordinates accurate enough to pinpoint a specific building or room. Combined with the exact timestamp, a photo posted online, even one that looks perfectly ordinary, can reveal precisely where someone was and at what moment. This is a real, well-documented privacy consideration for anyone sharing photos publicly, especially of their home, their children, or their daily routine.",
      },
      { type: "h2", text: "What Convertly's metadata viewer actually shows" },
      {
        type: "p",
        text: "Rather than a curated shortlist of a few common tags, Convertly's metadata viewer reads every metadata segment it can extract from a file:",
      },
      {
        type: "ul",
        items: [
          "Full EXIF data: camera make and model, lens, exposure, ISO, focal length, and more.",
          "GPS coordinates, resolved into a decimal latitude and longitude with a direct map link.",
          "The exact date and time the photo was taken (often different from the file's last-modified date).",
          "IPTC captions, credit, and keyword fields, and XMP data (including AI-image-generation prompts some tools embed).",
          "Any embedded thumbnail image stored inside the file.",
          "For video files (MP4/MOV): creation and modification dates, device make and model tags, and duration.",
          "For audio files: ID3 tags on MP3s, and format and INFO chunks on WAV files.",
        ],
      },
      { type: "h2", text: "How to check what a photo is revealing" },
      {
        type: "p",
        text: "Open the metadata viewer, choose the image, video, or audio file, and every field the file contains is displayed immediately, organized by category. Nothing is uploaded to check this: the entire file is read and parsed locally in your browser, which matters here more than almost anywhere else, since the whole point is checking a private file's private data without handing a copy of it to yet another server.",
      },
    ],
  },
  {
    slug: "remove-background-from-photo-free-no-upload",
    title: "How to Remove the Background From a Photo for Free, Without Uploading It Anywhere",
    description:
      "Remove the background from any photo using a real AI segmentation model, entirely in your browser. No upload, no account, no watermark.",
    datePublished: "2026-09-28",
    readMinutes: 3,
    relatedTool: "remove-bg",
    relatedToolLabel: "Try background removal",
    body: [
      {
        type: "p",
        text: "Whether it is a product photo for a store listing, a profile picture, or an image you want to place onto a new background, removing the background from a photo used to mean either careful manual work in an image editor or handing the photo over to an online tool that processes it on a remote server.",
      },
      {
        type: "p",
        text: "Convertly's background removal tool runs a real image segmentation model, but it runs that model locally, inside your browser, using WebAssembly. The photo is never uploaded to a server to be processed. You get a clean, transparent-background PNG back in seconds, and the original photo never left your device.",
      },
      { type: "h2", text: "How to do it" },
      {
        type: "ul",
        items: [
          "Open the Remove Background tool.",
          "Choose your photo.",
          "Wait a few seconds while the model runs locally.",
          "Download the result as a transparent PNG.",
        ],
      },
      {
        type: "p",
        text: "This is especially worth doing locally for photos of people, since many free background-removal sites process (and sometimes retain) the faces uploaded to them.",
      },
    ],
  },
  {
    slug: "png-vs-jpeg-vs-webp-vs-avif",
    title: "PNG vs JPEG vs WebP vs AVIF: Which Image Format Should You Actually Use?",
    description:
      "A plain-language comparison of PNG, JPEG, WebP, and AVIF, so you know which format to convert to and why, then convert between any of them for free.",
    datePublished: "2026-09-28",
    readMinutes: 5,
    relatedTool: "convert",
    relatedToolLabel: "Convert between image formats",
    body: [
      {
        type: "p",
        text: "Image formats are not interchangeable. Each one makes different trade-offs between file size, quality, and what kind of image it handles well. Here is the short version.",
      },
      { type: "h2", text: "PNG" },
      {
        type: "p",
        text: "Lossless, meaning no image quality is ever thrown away, and it supports transparency. Best for screenshots, logos, illustrations with flat colors and sharp edges, and any image you plan to edit further. The trade-off is file size: PNGs are usually much larger than a JPEG or WebP of the same photo.",
      },
      { type: "h2", text: "JPEG" },
      {
        type: "p",
        text: "Lossy (it discards some detail to shrink the file) and does not support transparency, but it is extremely well supported everywhere and produces small files for photographs. Best for photos where a small amount of quality loss is not noticeable, especially for web use.",
      },
      { type: "h2", text: "WebP" },
      {
        type: "p",
        text: "A more modern format that supports both lossy and lossless compression, plus transparency, usually producing smaller files than an equivalent-quality JPEG or PNG. Supported by essentially every current browser. A strong default choice for web images today.",
      },
      { type: "h2", text: "AVIF" },
      {
        type: "p",
        text: "The newest of the four, typically producing the smallest file size of all for a given quality level, also with transparency support. Support is now widespread in modern browsers, though a little less universal than WebP. Best when file size matters most and you can confirm your audience's browsers support it.",
      },
      { type: "h2", text: "Converting between them" },
      {
        type: "p",
        text: "Convertly's format converter switches an image between PNG, JPEG, WebP, and AVIF, free, right in your browser, so you can pick whichever format actually fits what you are using the image for.",
      },
    ],
  },
  {
    slug: "free-online-converters-selling-your-data",
    title: "Why So Many \"Free\" Online File Converters Are Quietly Selling Your Data",
    description:
      "If a tool is free and does real, server-side processing, something else usually pays for it. Here is how that often works, and how a browser-only tool avoids it.",
    datePublished: "2026-09-28",
    readMinutes: 5,
    relatedTool: "compress-image",
    relatedToolLabel: "See every tool that runs locally",
    body: [
      {
        type: "p",
        text: "Running a server that resizes images, compresses videos, or converts files for millions of visitors is not free. Storage, compute, and bandwidth all cost real money. So when a tool does that work for you at no charge, it is worth asking a simple question: who is actually paying for this, and how?",
      },
      { type: "h2", text: "The usual answers" },
      {
        type: "ul",
        items: [
          "Advertising, which is the most visible and least concerning of the bunch.",
          "Retaining uploaded files to build a training dataset for an AI model, since machine learning models need enormous amounts of real-world images, documents, and audio.",
          "Reselling anonymized (or thinly anonymized) usage data or file characteristics to data brokers or ad networks.",
          "A \"freemium\" upsell, where the free tier exists mainly to get you comfortable enough to upload something you would rather not lose access to.",
        ],
      },
      {
        type: "p",
        text: "None of this is universal. Plenty of online tools are careful, transparent, and delete uploads promptly. But as a visitor, you usually cannot tell which is which just by looking at a clean interface, and the honest answer is that most people never read the terms of service that would tell them.",
      },
      { type: "h2", text: "A structural fix, not a promise" },
      {
        type: "p",
        text: "Convertly's answer to this is not a privacy policy asking you to trust us. It is architectural: there is no backend server at all. Every tool, image conversion, compression, background removal, PDF merging, QR generation, runs entirely inside your browser using canvas, WebAssembly, and Web Audio. There is nowhere for your file to be uploaded to, retained, or resold, because the piece of infrastructure that would do any of that does not exist. The project is also open source, so this is checkable, not just claimed.",
      },
    ],
  },
];
