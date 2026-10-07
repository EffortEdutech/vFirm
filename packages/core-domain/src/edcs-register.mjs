// CE-S1 (ADR-095, 2026-10-05): the Connected EDCS register engine.
//
// Pure functions only -- no storage, no network, no store. Given the bytes of a BizKick
// "BK-SYS-005 Smart Transaction Register" workbook (or a CSV export of its TRANSACTION REGISTER
// sheet), the firm's connection (company code) and the transactions vFirm already holds, this module
// decides, row by row, what each row means: CREATED, UPDATED, REVISED, UNCHANGED, REJECTED, CONFLICT
// or (for IDs that vanished from the file) ROW_MISSING. The rules are the executable form of
// docs/10_post_freeze_technical_design/CONNECTED_EDCS_INTEGRATION_CONTRACT_v1.0.md; the fixtures in
// scripts/fixtures/bizkick/ (expected_outcomes.json) prove them.
//
// Golden rule: BizKick is the source, the Bridge is the contract, vFirm is the governed record.
// Nothing here writes to a BizKick file; it only reads one.

import { createHash } from "node:crypto";
import { readSheetRows } from "./tabular-file-reader.mjs";

export const REGISTER_SHEET = "TRANSACTION REGISTER";
export const REGISTER_HEADER_ROW = 6;
export const REGISTER_FIRST_DATA_ROW = 7;

// Contract section 3.1: the 24 columns, A..X, in order. Header match is exact (trimmed, case-sensitive).
export const REGISTER_COLUMNS = [
  { col: "A", header: "Company Code", field: "company_code" },
  { col: "B", header: "Document Type", field: "document_type" },
  { col: "C", header: "Year", field: "year" },
  { col: "D", header: "Sequence", field: "sequence" },
  { col: "E", header: "Transaction ID", field: "transaction_id" },
  { col: "F", header: "Revision", field: "revision" },
  { col: "G", header: "Date Reserved", field: "date_reserved" },
  { col: "H", header: "Date Issued", field: "date_issued" },
  { col: "I", header: "Counterparty Type", field: "counterparty_type" },
  { col: "J", header: "Counterparty Name", field: "counterparty_name" },
  { col: "K", header: "Subject / Description", field: "subject" },
  { col: "L", header: "Amount", field: "amount" },
  { col: "M", header: "Currency", field: "currency" },
  { col: "N", header: "Status", field: "status" },
  { col: "O", header: "Owner", field: "owner" },
  { col: "P", header: "Expiry / Due Date", field: "due_date" },
  { col: "Q", header: "Days to Expiry", field: null },
  { col: "R", header: "Alert", field: null },
  { col: "S", header: "Related Transaction ID", field: "related_transaction_id" },
  { col: "T", header: "Original External Ref", field: "external_ref" },
  { col: "U", header: "File Link / Path", field: "file_link" },
  { col: "V", header: "Last Updated", field: "last_updated" },
  { col: "W", header: "Remarks", field: "remarks" },
  { col: "X", header: "Duplicate Check", field: null }
];

// Field classes (contract section 6).
export const COMMERCIAL_FIELDS = ["date_reserved", "counterparty_type", "counterparty_name", "subject", "amount", "currency", "external_ref"];
export const TRACKING_FIELDS = ["date_issued", "status", "owner", "due_date", "related_transaction_id", "file_link", "last_updated", "remarks"];
const FINGERPRINT_FIELDS = ["company_code", "document_type", "year", "sequence", "transaction_id", "revision", ...COMMERCIAL_FIELDS, ...TRACKING_FIELDS];

// Contract section 4.1: the 32 document types. `content` is the D7 default (owner-confirmed for
// Inventory = content and Legal = metadata only). `position` is the proposed owner role, mapped to the
// live position catalogue in CE-S3.
const T = (name, module, object, classification, position, content = "CONTENT") => ({ name, module, object, classification, position, content });
export const EDCS_DOCUMENT_TYPES = {
  QT: T("Quotation", "Sales", "Sales document", "Confidential", "Sales Coordinator"),
  SO: T("Sales Order", "Sales", "Sales document", "Confidential", "Sales Coordinator"),
  DO: T("Delivery Order", "Sales", "Sales document", "Confidential", "Sales Coordinator"),
  INV: T("Invoice", "Sales / Finance", "Finance document", "Confidential", "Accounts Officer"),
  RC: T("Receipt", "Sales / Finance", "Finance document", "Confidential", "Accounts Officer"),
  CN: T("Credit Note", "Sales / Finance", "Finance document", "Confidential", "Accounts Officer"),
  CMP: T("Customer Complaint", "Sales", "Sales document", "Confidential", "Sales Coordinator"),
  PR: T("Purchase Requisition", "Procurement", "Procurement document", "Confidential", "Procurement Officer"),
  RFQ: T("Request for Quotation", "Procurement", "Procurement document", "Confidential", "Procurement Officer"),
  QC: T("Quotation Comparison", "Procurement", "Procurement document", "Confidential", "Procurement Officer"),
  PO: T("Purchase Order", "Procurement", "Procurement document", "Confidential", "Procurement Officer"),
  GRN: T("Goods Received Note", "Procurement / Inventory", "Procurement document", "Confidential", "Procurement Officer"),
  SE: T("Supplier Evaluation", "Procurement", "Procurement document", "Confidential", "Procurement Officer"),
  PV: T("Payment Voucher", "Finance", "Finance document", "Confidential", "Accounts Officer"),
  EC: T("Expense Claim", "Finance", "Finance document", "Confidential", "Accounts Officer"),
  PCV: T("Petty Cash Voucher", "Finance", "Finance document", "Confidential", "Accounts Officer"),
  BR: T("Bank Reconciliation", "Finance", "Finance document", "Confidential", "Accounts Officer"),
  JV: T("Journal Voucher", "Finance", "Finance document", "Confidential", "Accounts Officer"),
  EMP: T("Employee Record", "HR", "HR record", "Restricted", "HR Officer", "METADATA_ONLY"),
  LV: T("Leave Application", "HR", "HR record", "Restricted", "HR Officer", "METADATA_ONLY"),
  TS: T("Timesheet", "HR", "HR record", "Restricted", "HR Officer", "METADATA_ONLY"),
  OT: T("Overtime Request", "HR", "HR record", "Restricted", "HR Officer", "METADATA_ONLY"),
  EXIT: T("Exit Checklist", "HR", "HR record", "Restricted", "HR Officer", "METADATA_ONLY"),
  SI: T("Stock Issue", "Inventory", "Inventory document", "Internal", "Inventory Clerk"),
  ST: T("Stock Transfer", "Inventory", "Inventory document", "Internal", "Inventory Clerk"),
  SA: T("Stock Adjustment", "Inventory", "Inventory document", "Internal", "Inventory Clerk"),
  SCV: T("Stock Count Variance", "Inventory", "Inventory document", "Internal", "Inventory Clerk"),
  NDA: T("Non-Disclosure Agreement", "Legal", "Legal record", "Confidential", "Contracts Officer", "METADATA_ONLY"),
  AGR: T("Service Agreement", "Legal", "Legal record", "Confidential", "Contracts Officer", "METADATA_ONLY"),
  MIN: T("Meeting Minutes", "Management", "Management record", "Internal", "Operations Manager"),
  DEC: T("Decision Record", "Management", "Management record", "Internal", "Operations Manager"),
  INC: T("Incident Report", "Management", "Management record", "Confidential", "Operations Manager")
};

// Contract section 5: the 12 BizKick statuses -> vFirm lifecycle state; terminal flag.
export const EDCS_STATUSES = {
  "Reserved": { state: "reserved", terminal: false },
  "Draft": { state: "draft", terminal: false },
  "Under Review": { state: "in_review", terminal: false },
  "Approved": { state: "approved", terminal: false },
  "Issued": { state: "issued", terminal: false },
  "Accepted": { state: "accepted", terminal: false },
  "Rejected": { state: "rejected", terminal: false },
  "Expired": { state: "expired", terminal: false },
  "Completed": { state: "completed", terminal: false },
  "Cancelled": { state: "cancelled", terminal: true },
  "Superseded": { state: "superseded", terminal: true },
  "On Hold": { state: "on_hold", terminal: false }
};
export const EDCS_COUNTERPARTY_TYPES = ["Customer", "Supplier", "Employee", "Bank", "Government", "Internal", "External Party", "Other"];
export const EDCS_CURRENCIES = ["MYR", "USD", "SGD", "EUR", "GBP", "AUD", "JPY", "CNY"];
export const EDCS_OUTCOMES = ["CREATED", "UPDATED", "REVISED", "UNCHANGED", "REJECTED", "CONFLICT", "ROW_MISSING"];
// Statuses the workbook's own Alert formula shows as "Closed".
const ALERT_CLOSED_STATUSES = ["Completed", "Cancelled", "Rejected", "Superseded"];

export const isTerminalStatus = (status) => EDCS_STATUSES[status]?.terminal === true;

// D7: HR and Legal are metadata-only unless the owner opts in for the firm; everything else follows
// the type's default. `connection.content_policy` carries { hr_content_opt_in, legal_content_opt_in }.
export function effectiveContentPolicy(documentType, connection) {
  const type = EDCS_DOCUMENT_TYPES[documentType];
  if (!type) return "METADATA_ONLY";
  if (type.content === "CONTENT") return "CONTENT";
  if (type.module === "HR" && connection?.content_policy?.hr_content_opt_in === true) return "CONTENT";
  if (type.module === "Legal" && connection?.content_policy?.legal_content_opt_in === true) return "CONTENT";
  return "METADATA_ONLY";
}

// ---- value helpers ----

const clean = (value) => String(value ?? "").trim();
const blankToNull = (value) => (clean(value) === "" ? null : clean(value));

// Accepted date spellings (ADR-105):
//   - Excel serial (days since 1899-12-30)
//   - ISO text YYYY-MM-DD (also YYYY/MM/DD)
//   - day-month-year: DD-MM-YYYY, DD/MM/YYYY, DD.MM.YYYY and the two-digit-year forms DD-MM-YY, DD/MM/YY, DD.MM.YY
// Day-month-year is always read DAY FIRST (Malaysian convention): 01-09-26 is 1 September 2026, never 9 January.
// A two-digit year means 20YY. The date must be a real calendar date (31-02-26 is invalid).
// Anything else is invalid. Returns { ok, value } where value is an ISO date string or null (blank).
function isoIfRealDate(year, month, day) {
  const iso = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const date = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === iso ? iso : null;
}

export function normalizeRegisterDate(raw) {
  const text = clean(raw);
  if (text === "") return { ok: true, value: null };
  if (/^\d{1,7}(\.\d+)?$/.test(text)) {
    const serial = Math.floor(Number(text));
    if (serial >= 1 && serial <= 2958465) return { ok: true, value: new Date(Date.UTC(1899, 11, 30) + serial * 86400000).toISOString().slice(0, 10) };
    return { ok: false, value: null };
  }
  const iso = text.match(/^(\d{4})[-/](\d{2})[-/](\d{2})$/);
  if (iso) {
    const value = isoIfRealDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
    return value ? { ok: true, value } : { ok: false, value: null };
  }
  const dmy = text.match(/^(\d{1,2})([-/.])(\d{1,2})\2(\d{2}|\d{4})$/);
  if (dmy) {
    const year = dmy[4].length === 2 ? 2000 + Number(dmy[4]) : Number(dmy[4]);
    const value = isoIfRealDate(year, Number(dmy[3]), Number(dmy[1]));
    return value ? { ok: true, value } : { ok: false, value: null };
  }
  return { ok: false, value: null };
}

// Amount must be a plain non-negative number; blank is allowed. "RM 1,200" is deliberately invalid.
export function normalizeRegisterAmount(raw) {
  const text = clean(raw);
  if (text === "") return { ok: true, value: null };
  if (!/^\d+(\.\d+)?([eE][+-]?\d+)?$/.test(text)) return { ok: false, value: null };
  const number = Number(text);
  if (!Number.isFinite(number) || number < 0) return { ok: false, value: null };
  return { ok: true, value: Math.round(number * 100) / 100 };
}

function wholeNumberText(raw) {
  const text = clean(raw);
  return /^\d+(\.0+)?$/.test(text) ? text.replace(/\.0+$/, "") : null;
}

export function composeTransactionId(companyCode, documentType, year, sequence) {
  return `${companyCode}-${documentType}-${year}-${String(sequence).padStart(4, "0")}`;
}

export function parseRevision(raw) {
  const text = clean(raw) === "" ? "R0" : clean(raw);
  const match = text.match(/^R(\d+)$/);
  return match ? { ok: true, label: `R${Number(match[1])}`, number: Number(match[1]) } : { ok: false };
}

const sameValue = (a, b) => (a ?? null) === (b ?? null);

export function rowFingerprint(fields) {
  const material = FINGERPRINT_FIELDS.map((name) => [name, fields[name] ?? null]);
  return createHash("sha256").update(JSON.stringify(material)).digest("hex");
}

// ---- alerts (contract section 8): recomputed by vFirm, never trusted from the workbook ----

const dayNumber = (isoDate) => Math.floor(Date.parse(`${isoDate}T00:00:00Z`) / 86400000);

export function daysToDue(record, asOf) {
  if (!record?.due_date) return null;
  return dayNumber(record.due_date) - dayNumber(asOf);
}

export function computeEdcsAlert(record, asOf) {
  if (record?.flags?.duplicate) return "STOP — DUPLICATE";
  if (ALERT_CLOSED_STATUSES.includes(record?.status)) return "Closed";
  if (!record?.due_date) return "No due date";
  const days = daysToDue(record, asOf);
  if (days < 0) return "OVERDUE";
  if (days <= 7) return "DUE SOON";
  return "Open";
}

// ---- reading the file ----

// Returns { ok:false, reason, detail } for a structural failure (whole file rejected, zero rows
// processed), else { ok:true, rows:[{ row_number, cells }] } for every data row from row 7 down.
export function readRegisterFile({ filename = "", mime_type = "", buffer }) {
  const sheet = readSheetRows({ filename, mime_type, buffer, sheetName: REGISTER_SHEET });
  if (!sheet.sheet_found) return { ok: false, reason: "STRUCTURE_CHANGED", detail: `Sheet "${REGISTER_SHEET}" not found`, expected: REGISTER_SHEET, found: sheet.sheet_names };
  const header = sheet.rows.get(REGISTER_HEADER_ROW) ?? [];
  for (let i = 0; i < REGISTER_COLUMNS.length; i += 1) {
    const expected = REGISTER_COLUMNS[i].header;
    const found = clean(header[i]);
    if (found !== expected) {
      return { ok: false, reason: "STRUCTURE_CHANGED", detail: expected, expected, found, column: REGISTER_COLUMNS[i].col };
    }
  }
  const rows = [...sheet.rows.entries()]
    .filter(([rowNumber]) => rowNumber >= REGISTER_FIRST_DATA_ROW)
    .sort((a, b) => a[0] - b[0])
    .map(([row_number, cells]) => ({ row_number, cells }));
  return { ok: true, rows };
}

const toRaw = (cells) => Object.fromEntries(REGISTER_COLUMNS.map((c, i) => [c.col, clean(cells[i])]));

// CE-S6 (ADR-101): what the connector needs to send a delta instead of a whole file.
// A row's digest is a fingerprint of its cleaned cells in the columns the engine reads (every column that maps
// to a field). The BizKick-computed columns -- Days to Expiry, Alert, Duplicate Check -- are left out: they
// change with the calendar, not with the transaction, and would make every row look changed every day. The
// connector keeps the last digest it sent per row and sends a row only when its digest changes. (vFirm's own
// row_fingerprint, over the governed fields, is still computed server-side by the same engine.)
export function registerRowDigest(cells) {
  return createHash("sha256").update(JSON.stringify(REGISTER_COLUMNS.map((c, i) => (c.field ? clean(cells[i]) : null)))).digest("hex");
}

// The Transaction ID a row stands for, exactly as the engine's identity stage composes it, or null when the
// row's identity is unusable (it will be rejected). `ignored` marks a blank row (B, C and D all empty).
export function registerRowIdentity(cells, companyCode) {
  const raw = toRaw(cells);
  if (raw.B === "" && raw.C === "" && raw.D === "") return { ignored: true, transaction_id: null };
  const year = wholeNumberText(raw.C);
  const sequence = wholeNumberText(raw.D);
  const yearOk = year !== null && /^\d{4}$/.test(year);
  const sequenceOk = sequence !== null && sequence.length >= 1 && sequence.length <= 4;
  if (raw.A !== companyCode || !EDCS_DOCUMENT_TYPES[raw.B] || !yearOk || !sequenceOk) return { ignored: false, transaction_id: null };
  const id = composeTransactionId(raw.A, raw.B, year, sequence);
  if (raw.E !== "" && !raw.E.startsWith("#") && raw.E !== id) return { ignored: false, transaction_id: null };
  return { ignored: false, transaction_id: id };
}

function rawSnapshot(raw) {
  return Object.fromEntries(REGISTER_COLUMNS.filter((c) => c.field).map((c) => [c.field, raw[c.col] === "" ? null : raw[c.col]]));
}

// ---- the row engine ----

// existing: Map<transaction_id, record> of what vFirm already holds for this firm.
// context (CE-S6, optional): { present: [[transaction_id, row_number], ...] } -- every identity-valid row of the
// whole file. When given, `rows` is only the DELTA (the rows that changed); duplicates, related-ID warnings and
// ROW_MISSING are judged against the whole file, and IDs already flagged missing are not re-reported.
// Returns { results, missing, counts, ignored_rows }.
export function processRegisterRows({ rows, connection, existing = new Map(), context = null }) {
  const companyCode = connection.company_code;
  const staged = [];
  const ignored = [];

  // Stage 1 + 2: identity and value validity, row by row.
  for (const { row_number, cells } of rows) {
    const raw = toRaw(cells);
    if (raw.B === "" && raw.C === "" && raw.D === "") { ignored.push(row_number); continue; }
    const entry = { row_number, raw, outcome: null, reasons: [], reason_details: [], warnings: [], transaction_id: null, fields: null, identity_ok: false };
    staged.push(entry);

    const type = raw.B;
    const year = wholeNumberText(raw.C);
    const sequence = wholeNumberText(raw.D);
    const yearOk = year !== null && /^\d{4}$/.test(year);
    const sequenceOk = sequence !== null && sequence.length >= 1 && sequence.length <= 4;
    if (EDCS_DOCUMENT_TYPES[type] && yearOk && sequenceOk) entry.transaction_id = composeTransactionId(raw.A, type, year, sequence);

    if (raw.A !== companyCode) { entry.outcome = "REJECTED"; entry.reasons.push("COMPANY_CODE_MISMATCH"); entry.reason_details.push(`expected ${companyCode}, found ${raw.A || "(blank)"}`); continue; }
    if (!EDCS_DOCUMENT_TYPES[type]) { entry.outcome = "REJECTED"; entry.reasons.push("UNKNOWN_DOCUMENT_TYPE"); entry.reason_details.push(type || "(blank)"); continue; }
    if (!yearOk || !sequenceOk) { entry.outcome = "REJECTED"; entry.reasons.push("INCOMPLETE_ID"); entry.reason_details.push(!yearOk ? "year" : "sequence"); continue; }
    const cached = raw.E;
    if (cached !== "" && !cached.startsWith("#") && cached !== entry.transaction_id) {
      entry.outcome = "REJECTED"; entry.reasons.push("ID_MISMATCH_CACHED_VS_PARTS"); entry.reason_details.push(`cached ${cached}, parts give ${entry.transaction_id}`); continue;
    }
    entry.identity_ok = true;

    const fields = {
      company_code: raw.A, document_type: type, year: Number(year), sequence: Number(sequence), transaction_id: entry.transaction_id,
      counterparty_name: blankToNull(raw.J), subject: blankToNull(raw.K), owner: blankToNull(raw.O),
      related_transaction_id: blankToNull(raw.S), external_ref: blankToNull(raw.T), file_link: blankToNull(raw.U), remarks: blankToNull(raw.W)
    };
    const bad = (reason, detail) => { if (!entry.reasons.includes(reason)) entry.reasons.push(reason); entry.reason_details.push(detail); };
    const revision = parseRevision(raw.F);
    if (revision.ok) { fields.revision = revision.label; fields.revision_number = revision.number; } else bad("INVALID_REVISION", raw.F);
    if (EDCS_STATUSES[raw.N]) fields.status = raw.N; else bad("INVALID_STATUS", raw.N || "(blank)");
    if (raw.I === "" || EDCS_COUNTERPARTY_TYPES.includes(raw.I)) fields.counterparty_type = blankToNull(raw.I); else bad("INVALID_COUNTERPARTY_TYPE", raw.I);
    const amount = normalizeRegisterAmount(raw.L);
    if (amount.ok) fields.amount = amount.value; else bad("INVALID_AMOUNT", raw.L);
    if (raw.M === "" || EDCS_CURRENCIES.includes(raw.M)) fields.currency = blankToNull(raw.M); else bad("INVALID_CURRENCY", raw.M);
    for (const [col, field] of [["G", "date_reserved"], ["H", "date_issued"], ["P", "due_date"], ["V", "last_updated"]]) {
      const date = normalizeRegisterDate(raw[col]);
      if (date.ok) fields[field] = date.value; else bad("INVALID_DATE", `${field}: ${raw[col]}`);
    }
    entry.fields = fields;
    if (entry.reasons.length) entry.outcome = "REJECTED";
  }

  // Stage 3: duplicates -- the same composed ID on more than one identity-valid row.
  const idRows = new Map();
  if (context?.present) for (const [id, row_number] of context.present) idRows.set(id, [...(idRows.get(id) ?? []), { row_number }]);
  else for (const entry of staged) if (entry.identity_ok) idRows.set(entry.transaction_id, [...(idRows.get(entry.transaction_id) ?? []), entry]);
  const duplicateIds = new Set([...idRows.entries()].filter(([, list]) => list.length > 1).map(([id]) => id));
  for (const entry of staged) {
    if (entry.identity_ok && duplicateIds.has(entry.transaction_id)) {
      entry.duplicate = true;
      if (!entry.outcome) { entry.outcome = "REJECTED"; entry.reasons.push("DUPLICATE_ID_IN_FILE"); entry.reason_details.push(`also on rows ${idRows.get(entry.transaction_id).filter((e) => e.row_number !== entry.row_number).map((e) => e.row_number).join(", ")}`); }
    }
  }

  // Stage 4: compare accepted rows with the governed record.
  const presentIds = context?.present ? new Set(context.present.map(([id]) => id)) : new Set(staged.filter((entry) => entry.identity_ok).map((entry) => entry.transaction_id));
  for (const entry of staged) {
    const record = entry.identity_ok ? existing.get(entry.transaction_id) : null;
    entry.had_existing = Boolean(record);
    if (entry.outcome === "REJECTED") continue;
    const fields = entry.fields;
    entry.fingerprint = rowFingerprint(fields);
    entry.before_fingerprint = record?.row_fingerprint ?? null;
    // Warnings (advice only; never change the outcome).
    if (fields.related_transaction_id && !presentIds.has(fields.related_transaction_id) && !existing.has(fields.related_transaction_id)) entry.warnings.push(`RELATED_NOT_FOUND:${fields.related_transaction_id}`);
    if (fields.document_type === "GRN" && !(fields.related_transaction_id && /^[^-]+-PO-\d{4}-\d{4}$/.test(fields.related_transaction_id))) entry.warnings.push("CHAIN_MISSING_PREDECESSOR:PO");

    if (!record) { entry.outcome = "CREATED"; entry.changed_fields = []; continue; }
    if (record.company_code !== fields.company_code || record.document_type !== fields.document_type) {
      entry.outcome = "REJECTED"; entry.reasons.push("IDENTITY_CHANGED"); continue;
    }
    const differing = (list) => list.filter((name) => !sameValue(record[name], fields[name]));
    const commercial = differing(COMMERCIAL_FIELDS);
    const tracking = differing(TRACKING_FIELDS);
    const incomingRev = fields.revision_number;
    const currentRev = record.revision_number ?? 0;
    entry.changed_fields = [];
    if (incomingRev < currentRev) { entry.outcome = "CONFLICT"; entry.reasons.push("REVISION_BACKWARDS"); entry.reason_details.push(`${fields.revision} < ${record.revision}`); continue; }
    if (isTerminalStatus(record.status) && fields.status !== record.status) { entry.outcome = "CONFLICT"; entry.reasons.push("TERMINAL_STATUS_REOPENED"); entry.reason_details.push(`${record.status} -> ${fields.status}`); continue; }
    if (incomingRev > currentRev) { entry.outcome = "REVISED"; entry.changed_fields = ["revision", ...commercial, ...tracking]; continue; }
    if (commercial.length) { entry.outcome = "CONFLICT"; entry.reasons.push("SAME_REVISION_COMMERCIAL_CHANGE"); entry.reason_details.push(...commercial); entry.changed_fields = commercial; continue; }
    if (tracking.length) { entry.outcome = "UPDATED"; entry.changed_fields = tracking; continue; }
    entry.outcome = "UNCHANGED";
  }

  // Stage 5: IDs held by vFirm that this file no longer carries.
  const missing = [...existing.keys()].filter((id) => !presentIds.has(id) && !(context && existing.get(id)?.flags?.row_missing)).sort();

  const results = staged.map((entry) => ({
    row_number: entry.row_number,
    transaction_id: entry.transaction_id,
    outcome: entry.outcome,
    reasons: entry.reasons,
    reason_details: entry.reason_details,
    warnings: entry.warnings,
    changed_fields: entry.changed_fields ?? [],
    duplicate: entry.duplicate === true,
    had_existing: entry.had_existing === true,
    before_fingerprint: entry.before_fingerprint ?? null,
    after_fingerprint: entry.outcome === "REJECTED" ? null : entry.fingerprint ?? null,
    fields: entry.outcome === "REJECTED" ? null : entry.fields,
    raw: entry.outcome === "REJECTED" || entry.outcome === "CONFLICT" ? rawSnapshot(entry.raw) : null
  }));
  const counts = Object.fromEntries(EDCS_OUTCOMES.map((outcome) => [outcome, 0]));
  for (const result of results) counts[result.outcome] += 1;
  counts.ROW_MISSING = missing.length;
  return { results, missing, counts, ignored_rows: ignored.length };
}

// Describes the changed fields of an accepted row as { field: { from, to } } for the ledger.
export function describeChanges(record, fields, changedFields) {
  return Object.fromEntries(changedFields.map((name) => [name, { from: record?.[name] ?? null, to: fields?.[name] ?? null }]));
}
