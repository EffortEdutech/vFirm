// CE-S8 (ADR-107): a minimal .xlsx (zip) reader/writer with no dependencies.
//
// Why not a library: the repo ships with four runtime dependencies on purpose, and the template filler only
// needs to change a few XML parts of a workbook. Every part it does not touch is copied byte-for-byte (the
// compressed bytes, CRC and sizes are carried over), so styles, merged cells, validations, theme, images and
// anything else in the BizKick master survive exactly. Only the parts the filler edits are re-compressed.

import { crc32 as zlibCrc32, deflateRawSync, inflateRawSync } from "node:zlib";

const SIG_LOCAL = 0x04034b50;
const SIG_CENTRAL = 0x02014b50;
const SIG_END = 0x06054b50;

let crcTable = null;
function crc32(buffer) {
  if (typeof zlibCrc32 === "function") return zlibCrc32(buffer) >>> 0; // Node 22+
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n += 1) {
      let c = n;
      for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) crc = crcTable[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

export class XlsxError extends Error {}

// Read a zip. Returns an ordered array of entries:
//   { name, method, crc, compressedSize, size, raw (compressed bytes), flags, time, date }
export function readZip(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 22) throw new XlsxError("Not a zip file.");
  let end = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65557); i -= 1) {
    if (buffer.readUInt32LE(i) === SIG_END) { end = i; break; }
  }
  if (end < 0) throw new XlsxError("Not a zip file (no end record).");
  const count = buffer.readUInt16LE(end + 10);
  let pos = buffer.readUInt32LE(end + 16);
  const entries = [];
  for (let n = 0; n < count; n += 1) {
    if (buffer.readUInt32LE(pos) !== SIG_CENTRAL) throw new XlsxError("Broken zip directory.");
    const flags = buffer.readUInt16LE(pos + 8);
    const method = buffer.readUInt16LE(pos + 10);
    const time = buffer.readUInt16LE(pos + 12);
    const date = buffer.readUInt16LE(pos + 14);
    const crc = buffer.readUInt32LE(pos + 16);
    const compressedSize = buffer.readUInt32LE(pos + 20);
    const size = buffer.readUInt32LE(pos + 24);
    const nameLength = buffer.readUInt16LE(pos + 28);
    const extraLength = buffer.readUInt16LE(pos + 30);
    const commentLength = buffer.readUInt16LE(pos + 32);
    const localOffset = buffer.readUInt32LE(pos + 42);
    const name = buffer.toString("utf8", pos + 46, pos + 46 + nameLength);
    pos += 46 + nameLength + extraLength + commentLength;
    if (buffer.readUInt32LE(localOffset) !== SIG_LOCAL) throw new XlsxError("Broken zip entry.");
    const localName = buffer.readUInt16LE(localOffset + 26);
    const localExtra = buffer.readUInt16LE(localOffset + 28);
    const start = localOffset + 30 + localName + localExtra;
    if (method !== 0 && method !== 8) throw new XlsxError(`Unsupported zip compression (${method}).`);
    entries.push({ name, method, crc, compressedSize, size, flags: flags & ~0x08, time, date, raw: buffer.subarray(start, start + compressedSize) });
  }
  return entries;
}

export function entryBytes(entry) {
  const bytes = entry.method === 0 ? Buffer.from(entry.raw) : inflateRawSync(entry.raw);
  if (bytes.length !== entry.size) throw new XlsxError(`Zip entry ${entry.name} has the wrong size.`);
  return bytes;
}

// Replace an entry's content (re-compressed); returns a new entry. Other entries are never touched.
export function withContent(entry, content) {
  const data = Buffer.isBuffer(content) ? content : Buffer.from(content, "utf8");
  const raw = deflateRawSync(data, { level: 9 });
  return { ...entry, method: 8, crc: crc32(data), compressedSize: raw.length, size: data.length, raw };
}

export function writeZip(entries) {
  const chunks = [];
  const central = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name, "utf8");
    const local = Buffer.alloc(30);
    local.writeUInt32LE(SIG_LOCAL, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(entry.flags | 0x0800, 6);
    local.writeUInt16LE(entry.method, 8);
    local.writeUInt16LE(entry.time, 10);
    local.writeUInt16LE(entry.date, 12);
    local.writeUInt32LE(entry.crc, 14);
    local.writeUInt32LE(entry.compressedSize, 18);
    local.writeUInt32LE(entry.size, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    chunks.push(local, name, entry.raw);
    const head = Buffer.alloc(46);
    head.writeUInt32LE(SIG_CENTRAL, 0);
    head.writeUInt16LE(20, 4);
    head.writeUInt16LE(20, 6);
    head.writeUInt16LE(entry.flags | 0x0800, 8);
    head.writeUInt16LE(entry.method, 10);
    head.writeUInt16LE(entry.time, 12);
    head.writeUInt16LE(entry.date, 14);
    head.writeUInt32LE(entry.crc, 16);
    head.writeUInt32LE(entry.compressedSize, 20);
    head.writeUInt32LE(entry.size, 24);
    head.writeUInt16LE(name.length, 28);
    head.writeUInt32LE(offset, 42);
    central.push(head, name);
    offset += 30 + name.length + entry.raw.length;
  }
  const directory = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(SIG_END, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...chunks, directory, end]);
}
