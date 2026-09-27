// LSB (least-significant-bit) steganography: hides an arbitrary text message or file's bytes
// inside a PNG's pixel data by overwriting the lowest bit of each pixel's R, G, and B channel
// (the alpha channel is left alone so transparency is untouched). Each changed channel value
// shifts by at most 1 out of 255, invisible to the eye, but any step that re-compresses pixels
// (JPEG re-encoding, a chat app's automatic image compression) destroys the hidden bits, so the
// carrier has to stay an unmodified PNG all the way from encode to decode.

export interface SteganographyPayload {
  /** Empty string means "this is a plain text message", not a file. */
  filename: string;
  data: Uint8Array;
}

// Sanity-check value written first so decode can immediately tell a normal photo (whose pixel
// data is not this) from one actually produced by embed(), instead of reading garbage lengths
// out of ordinary noise and trying to allocate huge buffers.
const MAGIC = 0x43564c59; // ASCII "CVLY"

/** How many payload bytes a cover image of this size can hold: 3 usable bits per pixel. */
export function capacityBytes(width: number, height: number): number {
  return Math.floor((width * height * 3) / 8);
}

function headerBytesFor(filenameLen: number): number {
  return 4 + 2 + filenameLen + 4; // magic + filenameLen + filename + dataLen
}

export function canFit(width: number, height: number, payload: SteganographyPayload): boolean {
  const filenameLen = new TextEncoder().encode(payload.filename).length;
  const total = headerBytesFor(filenameLen) + payload.data.length;
  return total <= capacityBytes(width, height);
}

function packPayload(payload: SteganographyPayload): Uint8Array {
  const filenameBytes = new TextEncoder().encode(payload.filename);
  const total = headerBytesFor(filenameBytes.length) + payload.data.length;
  const buf = new Uint8Array(total);
  const view = new DataView(buf.buffer);
  let offset = 0;
  view.setUint32(offset, MAGIC);
  offset += 4;
  view.setUint16(offset, filenameBytes.length);
  offset += 2;
  buf.set(filenameBytes, offset);
  offset += filenameBytes.length;
  view.setUint32(offset, payload.data.length);
  offset += 4;
  buf.set(payload.data, offset);
  return buf;
}

function bytesToBits(bytes: Uint8Array): number[] {
  const bits: number[] = new Array(bytes.length * 8);
  let i = 0;
  for (const byte of bytes) {
    for (let b = 7; b >= 0; b--) bits[i++] = (byte >> b) & 1;
  }
  return bits;
}

/** Writes the payload into imageData's pixel data in place. Caller must have already checked canFit. */
export function embed(imageData: ImageData, payload: SteganographyPayload): void {
  const bits = bytesToBits(packPayload(payload));
  const data = imageData.data;
  let bitIndex = 0;
  for (let i = 0; i < data.length && bitIndex < bits.length; i += 4) {
    for (let c = 0; c < 3 && bitIndex < bits.length; c++) {
      data[i + c] = (data[i + c] & 0xfe) | bits[bitIndex];
      bitIndex++;
    }
  }
}

// Reads one bit at a time from the same R,G,B sequence embed() wrote to, in the same order.
class BitReader {
  private data: Uint8ClampedArray;
  private pos = 0; // index into `data` (start of the current RGBA group)
  private channel = 0; // 0, 1, or 2 within the current pixel's R/G/B

  constructor(imageData: ImageData) {
    this.data = imageData.data;
  }

  private nextBit(): number | null {
    if (this.pos >= this.data.length) return null;
    const bit = this.data[this.pos + this.channel] & 1;
    this.channel++;
    if (this.channel === 3) {
      this.channel = 0;
      this.pos += 4;
    }
    return bit;
  }

  readBytes(n: number): Uint8Array | null {
    const out = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      let byte = 0;
      for (let b = 0; b < 8; b++) {
        const bit = this.nextBit();
        if (bit === null) return null;
        byte = (byte << 1) | bit;
      }
      out[i] = byte;
    }
    return out;
  }

  readUint32(): number | null {
    const b = this.readBytes(4);
    return b ? new DataView(b.buffer).getUint32(0) : null;
  }

  readUint16(): number | null {
    const b = this.readBytes(2);
    return b ? new DataView(b.buffer).getUint16(0) : null;
  }
}

/** Returns the hidden payload, or null if this image has none (or it was corrupted by re-compression). */
export function extract(imageData: ImageData): SteganographyPayload | null {
  const totalCapacity = capacityBytes(imageData.width, imageData.height);
  const reader = new BitReader(imageData);

  const magic = reader.readUint32();
  if (magic !== MAGIC) return null;

  const filenameLen = reader.readUint16();
  if (filenameLen === null || headerBytesFor(filenameLen) > totalCapacity) return null;

  const filenameBytes = reader.readBytes(filenameLen);
  if (!filenameBytes) return null;

  const dataLen = reader.readUint32();
  if (dataLen === null || headerBytesFor(filenameLen) + dataLen > totalCapacity) return null;

  const data = reader.readBytes(dataLen);
  if (!data) return null;

  return { filename: new TextDecoder().decode(filenameBytes), data };
}
