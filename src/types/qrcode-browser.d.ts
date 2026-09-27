// The "qrcode" package's published types cover its Node-oriented root entry point, which pulls
// in server-side canvas code that doesn't exist in a browser. The actual browser build lives at
// this deep import instead, so it needs its own (minimal, just what this app calls) declaration.
declare module "qrcode/lib/browser.js" {
  export interface QRCodeOptions {
    errorCorrectionLevel?: "L" | "M" | "Q" | "H";
    margin?: number;
    width?: number;
    color?: { dark?: string; light?: string };
    type?: "svg";
  }

  const QRCode: {
    toCanvas(canvas: HTMLCanvasElement, text: string, options?: QRCodeOptions): Promise<void>;
    toDataURL(text: string, options?: QRCodeOptions): Promise<string>;
    toString(text: string, options?: QRCodeOptions): Promise<string>;
  };

  export default QRCode;
}
