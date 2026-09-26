// Decodes a real waveform from actual audio samples (Web Audio API), used to draw the
// Studio Audio editor's waveform. Not a fake or generated shape, every bar reflects the
// loudest sample in that slice of the real file.
export async function decodeWaveformPeaks(file: File, buckets: number): Promise<Float32Array> {
  const arrayBuffer = await file.arrayBuffer();
  const AudioCtxCtor = (window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext) as typeof AudioContext;
  const ctx = new AudioCtxCtor();
  try {
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    const length = audioBuffer.length;
    const ch0 = audioBuffer.getChannelData(0);
    const ch1 = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : null;
    const peaks = new Float32Array(buckets);
    const bucketSize = Math.max(1, Math.floor(length / buckets));
    for (let b = 0; b < buckets; b++) {
      let max = 0;
      const start = b * bucketSize;
      const end = Math.min(length, start + bucketSize);
      for (let i = start; i < end; i++) {
        const v0 = ch0[i] < 0 ? -ch0[i] : ch0[i];
        const v1 = ch1 ? (ch1[i] < 0 ? -ch1[i] : ch1[i]) : v0;
        const v = v0 > v1 ? v0 : v1;
        if (v > max) max = v;
      }
      peaks[b] = max;
    }
    return peaks;
  } finally {
    await ctx.close().catch(() => {});
  }
}
