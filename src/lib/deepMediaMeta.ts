// Manual binary readers for metadata that lives outside what the browser's own <video>/<audio>
// elements or Web Audio API expose: MP4/MOV "box" tags (title, creation date, per-track info,
// iTunes-style and QuickTime "keys" metadata), ID3v2/ID3v1 tags in MP3s, and WAV's RIFF INFO
// chunk. Same idea as the PNG text-chunk reader in metadataTool.ts: walk the file's own chunk
// structure instead of relying on a curated list of expected fields.

export interface Row {
  label: string;
  value: string;
}

const MAX_VALUE_CHARS = 500;

function clip(s: string): string {
  return s.length > MAX_VALUE_CHARS ? s.slice(0, MAX_VALUE_CHARS) + "... (truncated)" : s;
}

function humanizeKey(key: string): string {
  return key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").trim();
}

// ---------------------------------------------------------------------------------------------
// MP4 / MOV box walker
// ---------------------------------------------------------------------------------------------

interface Box {
  type: string;
  start: number; // offset of this box's payload (after the header)
  end: number; // exclusive end of this box's payload
}

function readBoxes(buf: Uint8Array, start: number, end: number): Box[] {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const boxes: Box[] = [];
  let offset = start;
  while (offset + 8 <= end) {
    let size = view.getUint32(offset);
    const type = String.fromCharCode(buf[offset + 4], buf[offset + 5], buf[offset + 6], buf[offset + 7]);
    let headerSize = 8;
    if (size === 1) {
      // 64-bit size follows immediately after the type
      if (offset + 16 > end) break;
      const hi = view.getUint32(offset + 8);
      const lo = view.getUint32(offset + 12);
      size = hi * 2 ** 32 + lo;
      headerSize = 16;
    } else if (size === 0) {
      size = end - offset; // box extends to the end of its parent
    }
    if (size < headerSize || offset + size > end) break;
    boxes.push({ type, start: offset + headerSize, end: offset + size });
    offset += size;
  }
  return boxes;
}

function findBox(boxes: Box[], type: string): Box | undefined {
  return boxes.find((b) => b.type === type);
}

function fourccFromUint32(view: DataView, offset: number): string {
  return String.fromCharCode(view.getUint8(offset), view.getUint8(offset + 1), view.getUint8(offset + 2), view.getUint8(offset + 3));
}

// The classic MP4/QuickTime epoch is 1904-01-01, not the Unix 1970 epoch.
const MP4_EPOCH_OFFSET_SECONDS = 2082844800;

function mp4DateToIso(seconds: number): string | null {
  if (!seconds) return null;
  const ms = (seconds - MP4_EPOCH_OFFSET_SECONDS) * 1000;
  const d = new Date(ms);
  return Number.isFinite(d.getTime()) && d.getFullYear() > 1970 ? d.toLocaleString() : null;
}

// iTunes-style tag atoms store their payload inside a nested "data" box, prefixed by an 8-byte
// type/locale header.
function readDataAtomText(buf: Uint8Array, box: Box): string | null {
  const inner = readBoxes(buf, box.start, box.end);
  const dataBox = findBox(inner, "data");
  if (!dataBox) return null;
  const payloadStart = dataBox.start + 8; // skip type(4) + locale(4)
  if (payloadStart > dataBox.end) return null;
  return new TextDecoder("utf-8", { fatal: false }).decode(buf.subarray(payloadStart, dataBox.end));
}

const ITUNES_TAG_LABELS: Record<string, string> = {
  "©nam": "Title",
  "©ART": "Artist",
  "©alb": "Album",
  "©day": "Year",
  "©cmt": "Comment",
  "©too": "Encoder",
  "©gen": "Genre",
  "©wrt": "Composer",
  desc: "Description",
  ldes: "Long description",
};

export async function parseMp4Metadata(file: File): Promise<Row[]> {
  const buf = new Uint8Array(await file.arrayBuffer());
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const rows: Row[] = [];

  const top = readBoxes(buf, 0, buf.length);

  const ftyp = findBox(top, "ftyp");
  if (ftyp && ftyp.end - ftyp.start >= 8) {
    const majorBrand = fourccFromUint32(view, ftyp.start);
    const minorVersion = view.getUint32(ftyp.start + 4);
    const compatible: string[] = [];
    for (let p = ftyp.start + 8; p + 4 <= ftyp.end; p += 4) compatible.push(fourccFromUint32(view, p));
    rows.push({ label: "Container brand", value: majorBrand });
    rows.push({ label: "Minor version", value: String(minorVersion) });
    if (compatible.length) rows.push({ label: "Compatible brands", value: compatible.join(", ") });
  }

  const moov = findBox(top, "moov");
  if (!moov) return rows;
  const moovBoxes = readBoxes(buf, moov.start, moov.end);

  const mvhd = findBox(moovBoxes, "mvhd");
  if (mvhd) {
    const version = view.getUint8(mvhd.start);
    const base = mvhd.start + (version === 1 ? 1 + 3 + 8 + 8 : 1 + 3 + 4 + 4);
    try {
      const creation = version === 1 ? Number(view.getBigUint64(mvhd.start + 4)) : view.getUint32(mvhd.start + 4);
      const modification = version === 1 ? Number(view.getBigUint64(mvhd.start + 12)) : view.getUint32(mvhd.start + 8);
      const timescale = view.getUint32(base);
      const duration = version === 1 ? Number(view.getBigUint64(base + 4)) : view.getUint32(base + 4);
      const createdIso = mp4DateToIso(creation);
      const modifiedIso = mp4DateToIso(modification);
      if (createdIso) rows.push({ label: "Created (container)", value: createdIso });
      if (modifiedIso) rows.push({ label: "Modified (container)", value: modifiedIso });
      if (timescale > 0) rows.push({ label: "Duration (container)", value: `${(duration / timescale).toFixed(2)} s` });
    } catch {
      /* malformed mvhd; skip rather than guess */
    }
  }

  const tracks = moovBoxes.filter((b) => b.type === "trak");
  tracks.forEach((trak, i) => {
    const trakBoxes = readBoxes(buf, trak.start, trak.end);
    const tkhd = findBox(trakBoxes, "tkhd");
    const mdia = findBox(trakBoxes, "mdia");
    let kind = "unknown";
    if (mdia) {
      const mdiaBoxes = readBoxes(buf, mdia.start, mdia.end);
      const hdlr = findBox(mdiaBoxes, "hdlr");
      if (hdlr && hdlr.end - hdlr.start >= 12) {
        const handler = fourccFromUint32(view, hdlr.start + 8);
        kind = handler === "vide" ? "video" : handler === "soun" ? "audio" : handler === "text" || handler === "sbtl" ? "subtitle" : handler;
      }
    }
    if (tkhd && tkhd.end - tkhd.start >= 4) {
      const version = view.getUint8(tkhd.start);
      const widthOffset = version === 1 ? tkhd.start + 96 : tkhd.start + 84;
      if (widthOffset + 8 <= tkhd.end) {
        const width = view.getUint32(widthOffset) / 65536;
        const height = view.getUint32(widthOffset + 4) / 65536;
        if (width > 0 && height > 0) rows.push({ label: `Track ${i + 1} (${kind})`, value: `${Math.round(width)} x ${Math.round(height)} px` });
        else rows.push({ label: `Track ${i + 1}`, value: kind });
      } else {
        rows.push({ label: `Track ${i + 1}`, value: kind });
      }
    }
  });

  const udta = findBox(moovBoxes, "udta");
  if (udta) {
    const udtaBoxes = readBoxes(buf, udta.start, udta.end);
    const meta = findBox(udtaBoxes, "meta");
    if (meta) {
      // A "meta" box has a 4-byte version/flags header before its own child boxes.
      const metaBoxes = readBoxes(buf, meta.start + 4, meta.end);
      const ilst = findBox(metaBoxes, "ilst");
      if (ilst) {
        const tagBoxes = readBoxes(buf, ilst.start, ilst.end);
        for (const tagBox of tagBoxes) {
          const label = ITUNES_TAG_LABELS[tagBox.type] ?? tagBox.type;
          const text = readDataAtomText(buf, tagBox);
          if (text) rows.push({ label, value: clip(text) });
        }
      }
    }
  } else {
    // QuickTime's alternate "keys" + "ilst" scheme (common on iPhone-recorded video), where
    // moov/meta sits directly under moov rather than under udta, and tag names are indexed
    // through a separate "keys" atom instead of being 4-char codes.
    const meta = findBox(moovBoxes, "meta");
    if (meta) {
      const metaBoxes = readBoxes(buf, meta.start + 4, meta.end);
      const keysBox = findBox(metaBoxes, "keys");
      const ilst = findBox(metaBoxes, "ilst");
      if (keysBox && ilst) {
        const keyNames: string[] = [];
        if (keysBox.end - keysBox.start >= 8) {
          const count = view.getUint32(keysBox.start + 4);
          let p = keysBox.start + 8;
          for (let k = 0; k < count && p + 8 <= keysBox.end; k++) {
            const entrySize = view.getUint32(p);
            const keyName = new TextDecoder().decode(buf.subarray(p + 8, p + entrySize));
            keyNames.push(keyName);
            p += entrySize;
          }
        }
        const items = readBoxes(buf, ilst.start, ilst.end);
        for (const item of items) {
          // Each item's "type" here isn't a real fourcc, it's a big-endian 1-based index into
          // the keys atom above, just packed into the same 4 header bytes readBoxes() decoded
          // as characters, so it's recovered from those same char codes.
          const index = (item.type.charCodeAt(0) << 24) | (item.type.charCodeAt(1) << 16) | (item.type.charCodeAt(2) << 8) | item.type.charCodeAt(3);
          const keyName = keyNames[index - 1];
          const text = readDataAtomText(buf, item);
          if (text) rows.push({ label: keyName ? humanizeKey(keyName.replace(/^com\.apple\.quicktime\./, "")) : `Tag ${index}`, value: clip(text) });
        }
      }
    }
  }

  return rows;
}

// ---------------------------------------------------------------------------------------------
// ID3 (MP3) reader
// ---------------------------------------------------------------------------------------------

const ID3_FRAME_LABELS: Record<string, string> = {
  TIT2: "Title",
  TPE1: "Artist",
  TPE2: "Album artist",
  TALB: "Album",
  TYER: "Year",
  TDRC: "Recording date",
  TCON: "Genre",
  TRCK: "Track number",
  TPOS: "Disc number",
  TCOM: "Composer",
  TENC: "Encoded by",
  TSSE: "Encoder settings",
  TBPM: "Tempo (BPM)",
  TCOP: "Copyright",
  TPUB: "Publisher",
  COMM: "Comment",
  TXXX: "User text",
  APIC: "Attached picture",
};

function readSynchsafeOrPlain(view: DataView, offset: number, synchsafe: boolean): number {
  if (!synchsafe) return view.getUint32(offset);
  const b0 = view.getUint8(offset) & 0x7f;
  const b1 = view.getUint8(offset + 1) & 0x7f;
  const b2 = view.getUint8(offset + 2) & 0x7f;
  const b3 = view.getUint8(offset + 3) & 0x7f;
  return (b0 << 21) | (b1 << 14) | (b2 << 7) | b3;
}

function decodeId3Text(bytes: Uint8Array): string {
  if (bytes.length === 0) return "";
  const encByte = bytes[0];
  const rest = bytes.subarray(1);
  try {
    if (encByte === 0) return new TextDecoder("iso-8859-1").decode(rest).replace(/\0+$/, "");
    if (encByte === 1) return new TextDecoder("utf-16").decode(rest).replace(/\0+$/, "");
    if (encByte === 2) return new TextDecoder("utf-16be").decode(rest).replace(/\0+$/, "");
    return new TextDecoder("utf-8").decode(rest).replace(/\0+$/, "");
  } catch {
    return new TextDecoder("iso-8859-1").decode(rest).replace(/\0+$/, "");
  }
}

export async function parseId3Tags(file: File): Promise<Row[]> {
  const rows: Row[] = [];
  const head = new Uint8Array(await file.slice(0, 10).arrayBuffer());
  const isId3 = head[0] === 0x49 && head[1] === 0x44 && head[2] === 0x33; // "ID3"

  if (isId3) {
    const majorVersion = head[3];
    const view10 = new DataView(head.buffer);
    const tagSize = readSynchsafeOrPlain(view10, 6, true) + 10;
    const body = new Uint8Array(await file.slice(0, tagSize).arrayBuffer());
    const view = new DataView(body.buffer);
    let offset = 10;
    const synchsafeSize = majorVersion >= 4;

    while (offset + 10 <= body.length) {
      const id = String.fromCharCode(body[offset], body[offset + 1], body[offset + 2], body[offset + 3]);
      if (id === "\0\0\0\0" || !/^[A-Z0-9]{4}$/.test(id)) break;
      const size = readSynchsafeOrPlain(view, offset + 4, synchsafeSize);
      const frameStart = offset + 10;
      if (size <= 0 || frameStart + size > body.length) break;
      const frameData = body.subarray(frameStart, frameStart + size);
      const label = ID3_FRAME_LABELS[id] ?? id;

      if (id === "APIC") {
        rows.push({ label, value: `<embedded image, ${frameData.length} bytes>` });
      } else if (id.startsWith("T")) {
        rows.push({ label, value: clip(decodeId3Text(frameData)) });
      } else if (id === "COMM" && frameData.length > 4) {
        const encByte = frameData[0];
        const rest = frameData.subarray(4); // skip encoding + 3-byte language code
        rows.push({ label, value: clip(decodeId3Text(new Uint8Array([encByte, ...rest]))) });
      }

      offset = frameStart + size;
    }
  }

  // ID3v1 fallback: a fixed 128-byte block at the very end of the file, starting with "TAG".
  if (file.size >= 128) {
    const tail = new Uint8Array(await file.slice(file.size - 128, file.size).arrayBuffer());
    if (tail[0] === 0x54 && tail[1] === 0x41 && tail[2] === 0x47) {
      const dec = (start: number, len: number) =>
        new TextDecoder("iso-8859-1")
          .decode(tail.subarray(start, start + len))
          .replace(/\0+$/, "")
          .trim();
      const title = dec(3, 30);
      const artist = dec(33, 30);
      const album = dec(63, 30);
      const year = dec(93, 4);
      if (!rows.length) {
        if (title) rows.push({ label: "Title (ID3v1)", value: title });
        if (artist) rows.push({ label: "Artist (ID3v1)", value: artist });
        if (album) rows.push({ label: "Album (ID3v1)", value: album });
        if (year) rows.push({ label: "Year (ID3v1)", value: year });
      }
    }
  }

  return rows;
}

// ---------------------------------------------------------------------------------------------
// WAV (RIFF) reader: the fmt chunk gives exact encoding parameters instead of the estimates
// decodeAudioData produces, and the LIST/INFO chunk carries any tags an editor left behind.
// ---------------------------------------------------------------------------------------------

const WAV_INFO_LABELS: Record<string, string> = {
  INAM: "Title",
  IART: "Artist",
  IPRD: "Product / album",
  ICMT: "Comment",
  ICRD: "Creation date",
  ISFT: "Software",
  IGNR: "Genre",
  ICOP: "Copyright",
  IENG: "Engineer",
};

const WAV_FORMAT_TAGS: Record<number, string> = {
  1: "PCM (uncompressed)",
  3: "IEEE float",
  6: "A-law",
  7: "mu-law",
  0xfffe: "Extensible",
};

export async function parseWavMetadata(file: File): Promise<Row[]> {
  const buf = new Uint8Array(await file.arrayBuffer());
  const rows: Row[] = [];
  if (buf.length < 12 || String.fromCharCode(...buf.subarray(0, 4)) !== "RIFF" || String.fromCharCode(...buf.subarray(8, 12)) !== "WAVE") return rows;

  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let offset = 12;
  while (offset + 8 <= buf.length) {
    const id = String.fromCharCode(buf[offset], buf[offset + 1], buf[offset + 2], buf[offset + 3]);
    const size = view.getUint32(offset + 4, true);
    const dataStart = offset + 8;
    if (dataStart + size > buf.length) break;

    if (id === "fmt ") {
      const formatTag = view.getUint16(dataStart, true);
      const channels = view.getUint16(dataStart + 2, true);
      const sampleRate = view.getUint32(dataStart + 4, true);
      const byteRate = view.getUint32(dataStart + 8, true);
      const bitsPerSample = view.getUint16(dataStart + 14, true);
      rows.push({ label: "Format", value: WAV_FORMAT_TAGS[formatTag] ?? `Unknown (0x${formatTag.toString(16)})` });
      rows.push({ label: "Channels", value: String(channels) });
      rows.push({ label: "Sample rate", value: `${sampleRate} Hz` });
      rows.push({ label: "Bits per sample", value: String(bitsPerSample) });
      rows.push({ label: "Exact bitrate", value: `${Math.round((byteRate * 8) / 1000)} kbps` });
    } else if (id === "LIST" && String.fromCharCode(...buf.subarray(dataStart, dataStart + 4)) === "INFO") {
      let p = dataStart + 4;
      while (p + 8 <= dataStart + size) {
        const subId = String.fromCharCode(buf[p], buf[p + 1], buf[p + 2], buf[p + 3]);
        const subSize = view.getUint32(p + 4, true);
        const subStart = p + 8;
        if (subStart + subSize > buf.length) break;
        const text = new TextDecoder("utf-8", { fatal: false })
          .decode(buf.subarray(subStart, subStart + subSize))
          .replace(/\0+$/, "");
        if (text) rows.push({ label: WAV_INFO_LABELS[subId] ?? subId, value: clip(text) });
        p += subSize + (subSize % 2); // chunks are padded to an even size
      }
    }

    offset = dataStart + size + (size % 2);
  }

  return rows;
}
