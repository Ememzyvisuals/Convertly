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

  export interface QrModules {
    size: number;
    get(row: number, col: number): number;
  }

  export interface QrCreateResult {
    modules: QrModules;
    version: number;
    errorCorrectionLevel: { bit: number };
    maskPattern: number;
    segments: unknown[];
  }

  const QRCode: {
    toCanvas(canvas: HTMLCanvasElement, text: string, options?: QRCodeOptions): Promise<void>;
    toDataURL(text: string, options?: QRCodeOptions): Promise<string>;
    toString(text: string, options?: QRCodeOptions): Promise<string>;
    create(text: string, options?: QRCodeOptions): QrCreateResult;
  };

  export default QRCode;
}
