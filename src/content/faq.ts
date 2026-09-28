// The homepage FAQ: real questions people actually type into a search bar, each answered in
// full sentences so both a person skimming the page and a search engine's FAQ rich-result can
// use the answer as-is. See faqSection.ts for how this renders and gets its FAQPage schema.
export interface FaqItem {
  question: string;
  answer: string;
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    question: "What is Convertly?",
    answer:
      "Convertly is a free, open-source toolbox for converting, vectorizing, compressing, and editing images, video, audio, and PDF files, entirely inside your own browser tab. There is no account, no upload, and no backend server involved in any tool. Everything from converting a PNG to a PDF to hiding a message inside a picture happens on your own device using the browser's own canvas, WebAssembly, and Web Audio APIs.",
  },
  {
    question: "Is Convertly really free?",
    answer:
      "Yes. Convertly is completely free to use and the source code is open. It was not built to be sold as a subscription or to quietly monetize your files, which is why it does not need a backend at all: every tool runs locally, so there is nothing on a server to charge you for.",
  },
  {
    question: "Do you upload my files to a server?",
    answer:
      "No. Nothing you open in Convertly ever leaves your device. Every tool, from image conversion to background removal to PDF merging, processes your file locally using your browser's own engine (canvas, WebAssembly, or Web Audio). There is no upload step, because there is no backend to upload to.",
  },
  {
    question: "Is it safe to convert a sensitive document, like an ID card or a passport photo, with Convertly?",
    answer:
      "Yes, and this is one of the main reasons Convertly exists. A lot of \"free\" online converters ask you to upload your file to their server to do the conversion, which means a copy of your ID card, passport, bank statement, or other private document sits on a company's server, sometimes indefinitely, with no clear guarantee of what happens to it next. Convertly never uploads anything. If you convert an ID card image to a PDF here, that conversion happens in memory, in your own browser tab, and the file never crosses the network. Nobody but you ever has a copy of it.",
  },
  {
    question: "Why do some free online tools ask me to upload my file, and why is that risky?",
    answer:
      "Most online converters run the actual conversion work on their own servers, since that used to be the only practical way to do it. That means your file, however private, is copied onto a server you do not control. Some of these \"free\" tools cover their costs by quietly retaining uploaded files, using them to train AI models, or selling aggregated data, often buried in a terms-of-service page nobody reads. You may never know it happened. Convertly avoids this entirely by doing all processing on your own device.",
  },
  {
    question: "Does Convertly store or remember my files after I close the tab?",
    answer:
      "No. Convertly does not use a database and does not persist your files anywhere. Once a file has been processed and you download the result (or refresh or close the page), the original and any in-progress data are gone, cleared from your browser's memory along with everything else that tab was holding. There is nothing left behind for anyone, including us, to find later.",
  },
  {
    question: "Do I need to create an account to use Convertly?",
    answer: "No account, no sign-up, no email address. Open a tool page and start using it immediately.",
  },
  {
    question: "What file types can Convertly convert?",
    answer:
      "Convertly handles image format conversion (PNG, JPEG, WebP, AVIF), background removal, image-to-vector (SVG) conversion, image and video compression, video trimming and GIF conversion, audio extraction and replacement, images-to-PDF and PDF-to-images conversion, PDF merging and splitting, ZIP creation and extraction, and a growing set of image editing tools (resize, crop, watermark, filters). See the full list on the tools page.",
  },
  {
    question: "Can Convertly convert an image to a PDF?",
    answer:
      "Yes. The Images to PDF tool combines one or more photos or scans into a single PDF file, entirely in your browser, which is useful when a form, application, or portal specifically requires a PDF instead of a photo. Since nothing is uploaded, this is a safe way to convert something private, like an ID document, into the PDF format someone is asking for.",
  },
  {
    question: "What is steganography, and why would I hide a message inside an image?",
    answer:
      "Steganography is the practice of hiding a secret message, password, or an entire file inside an ordinary-looking picture, so that anyone glancing at the image sees nothing unusual. Convertly's steganography tool encodes your hidden data directly into the image's pixel data using least-significant-bit encoding, then lets you (or whoever you send the picture to) reveal it again with the same tool. It runs entirely in your browser, so the secret never touches a server either.",
  },
  {
    question: "Can I customize the QR code Convertly generates?",
    answer:
      "Yes. Beyond the basic black-and-white square QR code, Convertly's QR code generator lets you choose a pattern style (square, rounded, or dots), pick your own foreground and background colors with a color picker, and upload a logo to sit in the center of the code. Error correction is automatically raised whenever a logo is added, so the code stays scannable.",
  },
  {
    question: "What does the metadata viewer actually show me?",
    answer:
      "Convertly's metadata viewer reads every metadata field it can find in an image, video, or audio file: full EXIF data (camera, lens, exposure settings), GPS coordinates with a map link, the exact date and time a photo was taken, IPTC captions and credit info, XMP data, embedded thumbnails, PNG text chunks (including AI-generation prompts some tools embed), and for video and audio files, container metadata like MP4/MOV tags, ID3 tags, and WAV format info. It is meant to show you everything a file is quietly carrying, not a curated shortlist.",
  },
  {
    question: "Why does this matter for privacy?",
    answer:
      "Photos and videos often carry far more information than people realize, including the exact GPS location and timestamp of when they were taken, sometimes even the camera or phone model. If you have ever wondered what a photo you are about to share online reveals about you, Convertly's metadata viewer lets you check it yourself, for free, without uploading the file anywhere to find out.",
  },
];
