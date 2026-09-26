export type BgProgressCallback = (info: { phase: string; ratio?: number }) => void;

/**
 * Removes the background from an image using IMG.LY's browser-side ONNX segmentation model.
 * The model itself (tens of MB) is fetched from IMG.LY's CDN on first use and cached by the
 * browser afterward, it is not bundled into this site, and this is the only feature that
 * calls out to a third-party host rather than staying fully local.
 */
export async function removeBackground(file: File, onProgress: BgProgressCallback): Promise<Blob> {
  onProgress({ phase: "Loading background-removal model" });
  const { removeBackground: imglyRemoveBackground } = await import("@imgly/background-removal");

  const blob: Blob = await imglyRemoveBackground(file, {
    model: "isnet_quint8", // smallest/fastest variant, a fair default for a free web tool
    progress: (key: string, current: number, total: number) => {
      if (total > 0) {
        onProgress({ phase: key.includes("fetch") ? "Downloading model" : "Processing", ratio: current / total });
      }
    },
  });

  onProgress({ phase: "Ready", ratio: 1 });
  return blob;
}
