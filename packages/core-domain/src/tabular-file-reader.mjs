// ADR-092 W3 (B4, 2026-10-01): reads the owner's uploaded spreadsheets (CSV or XLSX) into plain
// rows so the deterministic skill modules can work on real inputs (e.g. FAO-11's bank statement
// and book entries). No third-party dependency: CSV is parsed per RFC 4180 (comma, semicolon or
// tab, auto-detected); XLSX is read straight from its zip container with node:zlib (first
// worksheet, shared strings, inline strings, numbers, booleans). Formulas are read as their
// cached values. Legacy binary .xls is not supported -- the caller gets a clear "save as .xlsx
// or .csv" error instead of a silent misread.
//
// Pure functions over a Buffer; nothing here touches storage, the network or the store.

import { inflateRawSync } from "node:zlib";

export class TabularReadError extends Error {
  constructor(message) {
    super(message);
    this.code = "TABULAR_READ_ERROR";
  }
}

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export function isTabularFile(file) {
  const name = String(file?.filename ?? "").toLowerCase();
  return name.endsWith(".csv") || name.endsWith(".xlsx") || name.endsWith(".xls") || file?.mime_type === "text/csv" || file?.mime_type === XLSX_MIME;
}

// Returns { headers: string[], rows: object[] (keyed by normalized header), raw_row_count }.
export function readTabularFile({ filename = "", mime_type = "", buffer }) {
  if (!Buffer.isBuffer(buffer)) throw new TabularReadError(`${filename || "File"} has no content.`);
  const name = String(filename).toLowerCase();
  let matrix;
  if (name.endsWith(".xlsx") || mime_type === XLSX_MIME) matrix = readXlsxMatrix(buffer, filename);
  else if (name.endsWith(".xls")) throw new TabularReadError(`${filename} is an old-format Excel file (.xls). Save it as .xlsx or .csv and upload it again.`);
  else matrix = parseCsv(stripBom(buffer.toString("utf8")));
  return matrixToRows(matrix, filename);
}

export function normalizeHeader(value) {
  return String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function stripBom(text) {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function matrixToRows(matrix, filename) {
  const nonEmpty = matrix.filter((row) => row.some((cell) => String(cell ?? "").trim() !== ""));
  if (!nonEmpty.length) throw new TabularReadError(`${filename || "The file"} is empty.`);
  // Header = first row with at least two non-empty cells (skips a title line such as "Bank statement Sep 2026").
  const headerIndex = Math.max(0, nonEmpty.findIndex((row) => row.filter((cell) => String(cell ?? "").trim() !== "").length >= 2));
  const headers = nonEmpty[headerIndex].map((cell, index) => normalizeHeader(cell) || `column_${index + 1}`);
  const rows = nonEmpty.slice(headerIndex + 1).map((row, index) => {
    const record = { __row: index + 1 };
    headers.forEach((header, column) => { record[header] = row[column] ?? ""; });
    return record;
  });
  return { headers, rows, raw_row_count: rows.length };
}

// ---- CSV (RFC 4180) ----
export function parseCsv(text) {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = [",", ";", "\t"].map((d) => [d, firstLine.split(d).length]).sort((a, b) => b[1] - a[1])[0][0];
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i += 1; }
      else if (ch === '"') quoted = false;
      else cell += ch;
      continue;
    }
    if (ch === '"' && cell === "") quoted = true;
    else if (ch === delimiter) { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i += 1;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += ch;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

// ---- XLSX (zip + SpreadsheetML) ----
function readZipEntries(buffer, filename) {
  // End of central directory record: signature 0x06054b50 within the last 64 KB + 22 bytes.
  let eocd = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65557); i -= 1) {
    if (buffer.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new TabularReadError(`${filename} is not a valid .xlsx file.`);
  const count = buffer.readUInt16LE(eocd + 10);
  let offset = buffer.readUInt32LE(eocd + 16);
  const entries = new Map();
  for (let n = 0; n < count; n += 1) {
    if (offset + 46 > buffer.length || buffer.readUInt32LE(offset) !== 0x02014b50) throw new TabularReadError(`${filename} has a damaged zip directory.`);
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.toString("utf8", offset + 46, offset + 46 + nameLength);
    entries.set(name, { method, compressedSize, localOffset });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return {
    text(name) {
      const entry = entries.get(name);
      if (!entry) return null;
      const local = entry.localOffset;
      if (buffer.readUInt32LE(local) !== 0x04034b50) throw new TabularReadError(`${filename} has a damaged zip entry.`);
      const start = local + 30 + buffer.readUInt16LE(local + 26) + buffer.readUInt16LE(local + 28);
      const data = buffer.subarray(start, start + entry.compressedSize);
      if (entry.method === 0) return data.toString("utf8");
      if (entry.method === 8) return inflateRawSync(data, { maxOutputLength: 200 * 1024 * 1024 }).toString("utf8");
      throw new TabularReadError(`${filename} uses an unsupported zip compression method.`);
    }
  };
}

function decodeXml(text) {
  return String(text ?? "")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&amp;/g, "&");
}

function textRuns(xml) {
  return [...String(xml).matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => decodeXml(m[1])).join("");
}

function columnIndex(ref) {
  const letters = String(ref).match(/^[A-Z]+/i)?.[0]?.toUpperCase() ?? "A";
  let index = 0;
  for (const ch of letters) index = index * 26 + (ch.charCodeAt(0) - 64);
  return index - 1;
}

function readXlsxMatrix(buffer, filename) {
  const zip = readZipEntries(buffer, filename);
  const shared = [];
  const sst = zip.text("xl/sharedStrings.xml");
  if (sst) for (const m of sst.matchAll(/<si>([\s\S]*?)<\/si>/g)) shared.push(textRuns(m[1]));
  // First sheet in workbook order, resolved through the workbook relationships.
  let sheetPath = "xl/worksheets/sheet1.xml";
  const workbook = zip.text("xl/workbook.xml");
  const rels = zip.text("xl/_rels/workbook.xml.rels");
  const firstSheetRel = workbook?.match(/<sheet\b[^>]*\br:id="([^"]+)"/)?.[1];
  if (firstSheetRel && rels) {
    const target = [...rels.matchAll(/<Relationship\b([^>]*)\/?>/g)].map((m) => m[1]).find((attrs) => attrs.includes(`Id="${firstSheetRel}"`))?.match(/Target="([^"]+)"/)?.[1];
    if (target) sheetPath = target.startsWith("/") ? target.slice(1) : `xl/${target.replace(/^\.\//, "")}`;
  }
  const sheet = zip.text(sheetPath);
  if (!sheet) throw new TabularReadError(`${filename} has no readable worksheet.`);
  const matrix = [];
  for (const rowMatch of sheet.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const row = [];
    for (const cellMatch of rowMatch[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = cellMatch[1];
      const inner = cellMatch[2] ?? "";
      const ref = attrs.match(/\br="([A-Z]+\d+)"/i)?.[1];
      const type = attrs.match(/\bt="([^"]+)"/)?.[1] ?? "n";
      const rawValue = inner.match(/<v>([\s\S]*?)<\/v>/)?.[1];
      let value = "";
      if (type === "s") value = shared[Number(rawValue)] ?? "";
      else if (type === "inlineStr") value = textRuns(inner);
      else if (type === "b") value = rawValue === "1" ? "TRUE" : "FALSE";
      else if (rawValue !== undefined) value = decodeXml(rawValue);
      const index = ref ? columnIndex(ref) : row.length;
      while (row.length < index) row.push("");
      row[index] = value;
    }
    matrix.push(row);
  }
  return matrix;
}

// ---- value helpers shared by the skill runner ----

// Accepts the common Malaysian/English forms: currency prefix/suffix (RM, MYR, USD, SGD, $),
// thousands commas, and parentheses, a leading "-", a trailing "-" or "DR" for negatives.
export function parseAmount(value) {
  if (typeof value === "number") return Number.isFinite(value) ? Math.round(value * 100) / 100 : null;
  let text = String(value ?? "").trim();
  if (!text) return null;
  let negative = false;
  if (/^\(.*\)$/.test(text)) { negative = true; text = text.slice(1, -1).trim(); }
  if (/\s*(dr|-)$/i.test(text)) { negative = !negative; text = text.replace(/\s*(dr|-)$/i, ""); }
  text = text.replace(/\s*cr$/i, "").replace(/^(rm|myr|usd|sgd|\$)\s*/i, "").replace(/\s*(rm|myr)$/i, "").replace(/,/g, "").trim();
  if (text.startsWith("-")) { negative = !negative; text = text.slice(1).trim(); }
  if (!/^\d+(\.\d+)?$/.test(text)) return null;
  const number = Number(text);
  return Math.round((negative ? -number : number) * 100) / 100;
}

// Excel serial date (e.g. 46266) -> ISO date; anything else passes through as trimmed text.
export function normalizeDateCell(value) {
  const text = String(value ?? "").trim();
  if (/^\d{5}(\.\d+)?$/.test(text)) {
    const serial = Number(text);
    if (serial > 20000 && serial < 80000) return new Date(Date.UTC(1899, 11, 30) + Math.floor(serial) * 86400000).toISOString().slice(0, 10);
  }
  return text;
}

// Exact header match first, then "contains" (e.g. "transaction_date" for "date").
export function pickColumn(headers, candidates) {
  for (const candidate of candidates) {
    if (headers.includes(candidate)) return candidate;
  }
  for (const candidate of candidates) {
    const found = headers.find((header) => header.includes(candidate));
    if (found) return found;
  }
  return null;
}

// CSV writer for generated outputs: UTF-8 BOM so Excel opens non-Latin text correctly. Cells that
// start with = + - @ are prefixed with ' so a crafted input can never become a live formula.
export function toCsv(rows) {
  const escape = (value) => {
    let text = value === null || value === undefined ? "" : String(value);
    if (/^[=+\-@\t\r]/.test(text) && !/^-?\d+(\.\d+)?$/.test(text)) text = `'${text}`;
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return "﻿" + rows.map((row) => row.map(escape).join(",")).join("\r\n") + "\r\n";
}
