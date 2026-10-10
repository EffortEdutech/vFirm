// CE-S8 (ADR-107): governed drafting into BizKick masters -- pure functions only.
//
// A worker prepares a NEW working file from a BizKick controlled master. This module knows, for each master,
// which cells are inputs (the template manifest), checks a draft's values, and fills a COPY of the master:
//
//   * only the manifest's input cells are written; every formula, style, merge, validation and image of the
//     master is kept (the zip is edited part by part, untouched parts are copied byte-for-byte);
//   * a manifest cell that holds a formula is refused (except the date cell, which is a TODAY() on purpose);
//   * the document number comes from the Number Authority (CE-S4) and goes in the master's number cell;
//   * the master itself is never changed: callers receive new bytes and a new file name.
//
// Money in the masters is MYR only ("RM" number formats), so a draft is in MYR. Percent cells hold fractions
// (6% is 0.06). Workbooks are marked "recalculate on open" so Excel refreshes every formula on opening; the
// numbers that vFirm already knows are also written as the formulas' cached values.
//
// Nothing here touches storage, the clock or the network.

import { createHash } from "node:crypto";
import { MASTERS_B64, MASTER_SOURCE } from "./edcs-template-masters.mjs";
import { XlsxError, entryBytes, readZip, withContent, writeZip } from "./xlsx-package.mjs";

export const UNITS = ["unit", "pcs", "set", "lot", "box", "pack", "license", "month", "hour", "day", "service"];
export const DRAFT_STATES = ["PENDING_APPROVAL", "APPROVED", "DELIVERED", "REJECTED", "CANCELLED"];
export const MAX_DRAFT_BYTES = 2 * 1024 * 1024;

const T = (key, label, cell, extra = {}) => ({ key, label, cell, kind: "text", max: 200, ...extra });

// The Quotation and the Invoice share one grid; the Purchase Order has its own Setup cells and rows.
const SALES_SETUP = { legal_name: "B4", registration_no: "B5", tax_id: "B6", address: "B7", telephone: "B8", email: "B9", bank_name: "B10", bank_account_name: "B11", bank_account_no: "B12", tax_rate: "B15", payment_days: "B16" };
const SALES_PARTY = [
  T("counterparty_name", "Customer / company", "B9", { required: true }),
  T("attention", "Attention", "B10"),
  T("address", "Address", "B11", { max: 400 }),
  T("counterparty_tin", "Customer TIN", "I9", { max: 40 }),
  T("counterparty_reg_no", "Registration / ID", "I10", { max: 40 }),
  T("counterparty_email", "Email", "I11", { max: 120 }),
  T("counterparty_phone", "Phone", "I12", { max: 40 })
];

export const TEMPLATES = {
  "BK-SAL-001": {
    id: "BK-SAL-001", name: "Quotation", document_type: "QT", sheet: "Quotation", setup_sheet: "Setup",
    setup: { ...SALES_SETUP, valid_days: "B17" }, prefix_cell: "B18", number_cell: "J3", date_cell: "J4", status_cell: "I38", notes_cell: "A32",
    fields: [...SALES_PARTY, T("reference", "Customer RFQ / ref.", "B15", { max: 120 }), T("prepared_by", "Prepared by", "F15", { max: 120 })],
    overrides: ["tax_rate", "payment_days", "valid_days"],
    items: { first: 18, last: 29, description: "B", qty: "C", unit: "D", price: "E", discount: "F" },
    totals: { other: "J33", discount: "J34", subtotal: "J31", tax: "J32", grand: "J35", lines: { subtotal: "G", tax: "I", total: "J" } }
  },
  "BK-SAL-004": {
    id: "BK-SAL-004", name: "Invoice", document_type: "INV", sheet: "Invoice", setup_sheet: "Setup",
    setup: { ...SALES_SETUP }, prefix_cell: "B18", number_cell: "J3", date_cell: "J4", status_cell: "I41", notes_cell: "A32",
    fields: [...SALES_PARTY, T("reference", "Customer PO / ref.", "B15", { max: 120 }), T("related_reference", "Related quotation / DO", "F15", { max: 120 })],
    overrides: ["tax_rate", "payment_days"],
    items: { first: 18, last: 29, description: "B", qty: "C", unit: "D", price: "E", discount: "F" },
    totals: { other: "J33", discount: "J34", subtotal: "J31", tax: "J32", grand: "J35", lines: { subtotal: "G", tax: "I", total: "J" } }
  },
  "BK-PRO-004": {
    id: "BK-PRO-004", name: "Purchase Order", document_type: "PO", sheet: "Purchase Order", setup_sheet: "Setup",
    setup: { legal_name: "B4", registration_no: "B5", tax_id: "B6", address: "B7", telephone: "B8", email: "B9", tax_rate: "B11", payment_days: "B12", delivery_days: "B14" },
    prefix_cell: "B17", number_cell: "J3", date_cell: "J4", status_cell: "H16", notes_cell: "A36",
    fields: [
      T("counterparty_name", "Supplier / company", "B9", { required: true }),
      T("attention", "Attention", "B10"),
      T("address", "Address", "B11", { max: 400 }),
      T("counterparty_reg_no", "Supplier registration no.", "I9", { max: 40 }),
      T("counterparty_tin", "Supplier TIN", "I10", { max: 40 }),
      T("counterparty_email", "Email", "I11", { max: 120 }),
      T("counterparty_phone", "Phone", "I12", { max: 40 }),
      T("reference", "Supplier quotation ref.", "B15", { max: 120 }),
      T("related_reference", "RFQ / comparison ref.", "F15", { max: 120 }),
      T("delivery_location", "Delivery location", "B16", { max: 300 }),
      T("warranty", "Warranty / support", "I43", { max: 120 })
    ],
    overrides: ["tax_rate", "payment_days", "delivery_days"],
    items: { first: 19, last: 33, description: "B", qty: "C", unit: "D", price: "E", discount: "F" },
    totals: { other: "J37", discount: "J38", subtotal: "J35", tax: "J36", grand: "J39", lines: { subtotal: "G", tax: "I", total: "J" } }
  }
};

export const templateIdForType = (document_type) => Object.values(TEMPLATES).find((item) => item.document_type === document_type)?.id ?? null;

// What the console needs to draw the form (no cell addresses).
export function listTemplates() {
  return Object.values(TEMPLATES).map((item) => ({
    id: item.id, name: item.name, document_type: item.document_type,
    fields: item.fields.map(({ key, label, required, max }) => ({ key, label, required: Boolean(required), max })),
    max_items: item.items.last - item.items.first + 1, units: UNITS, overrides: item.overrides, master_source: MASTER_SOURCE
  }));
}

export function masterBytes(templateId) {
  const entry = MASTERS_B64[templateId];
  if (!entry) throw new XlsxError(`No master is embedded for ${templateId}.`);
  return Buffer.from(entry.b64, "base64");
}

export const masterSha256 = (templateId) => createHash("sha256").update(masterBytes(templateId)).digest("hex");

// ---------------- the company details (typed once, reused) ----------------

export const COMPANY_FIELDS = [
  ["legal_name", "Registered business name", 160, true], ["registration_no", "Registration no.", 40, false], ["tax_id", "LHDN TIN", 40, false],
  ["address", "Business address", 400, false], ["telephone", "Business telephone", 40, false], ["email", "Business email", 120, false],
  ["bank_name", "Bank name", 80, false], ["bank_account_name", "Bank account name", 120, false], ["bank_account_no", "Bank account no.", 40, false]
];

const clean = (value) => String(value ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").replace(/\r\n?/g, "\n").trim();

export function validateCompanyProfile(body) {
  const errors = [];
  const value = {};
  for (const [key, label, max, required] of COMPANY_FIELDS) {
    const text = clean(body?.[key]);
    if (required && !text) errors.push(`${label} is required.`);
    if (text.length > max) errors.push(`${label} is too long (${max} characters at most).`);
    value[key] = text || null;
  }
  const rate = body?.default_tax_rate === undefined || body?.default_tax_rate === null || body?.default_tax_rate === "" ? 0 : Number(body.default_tax_rate);
  if (!Number.isFinite(rate) || rate < 0 || rate > 100) errors.push("Default tax rate must be a percent between 0 and 100.");
  const days = (raw, fallback, label) => {
    const number = raw === undefined || raw === null || raw === "" ? fallback : Number(raw);
    if (!Number.isInteger(number) || number < 0 || number > 365) errors.push(`${label} must be a whole number of days from 0 to 365.`);
    return number;
  };
  value.default_tax_rate = rate;
  value.default_payment_days = days(body?.default_payment_days, 30, "Default payment terms");
  value.default_validity_days = days(body?.default_validity_days, 30, "Default quotation validity");
  value.default_delivery_days = days(body?.default_delivery_days, 14, "Default PO delivery period");
  return errors.length ? { ok: false, errors } : { ok: true, value };
}

// ---------------- the draft input ----------------

const isoDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value ?? "")) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
export const excelSerial = (iso) => Math.round(Date.parse(`${iso}T00:00:00Z`) / 86400000) + 25569;

export function validateDraftInput(templateId, body, { today }) {
  const template = TEMPLATES[templateId];
  if (!template) return { ok: false, errors: [`Unknown template: ${templateId || "(none)"}.`] };
  const errors = [];
  const value = { template_id: templateId, fields: {}, items: [] };
  for (const field of template.fields) {
    const text = clean(body?.fields?.[field.key] ?? body?.[field.key]);
    if (field.required && !text) errors.push(`${field.label} is required.`);
    if (text.length > field.max) errors.push(`${field.label} is too long (${field.max} characters at most).`);
    value.fields[field.key] = text || null;
  }
  const issue = body?.issue_date === undefined || body?.issue_date === null || body?.issue_date === "" ? today : String(body.issue_date);
  if (!isoDate(issue)) errors.push("Issue date must look like 2026-10-05.");
  value.issue_date = issue;
  const notes = clean(body?.notes);
  if (notes.length > 600) errors.push("Notes are too long (600 characters at most).");
  value.notes = notes || null;

  const maxItems = template.items.last - template.items.first + 1;
  const rows = Array.isArray(body?.items) ? body.items : [];
  if (rows.length === 0) errors.push("Add at least one item line.");
  if (rows.length > maxItems) errors.push(`This template holds ${maxItems} item lines at most.`);
  rows.slice(0, maxItems).forEach((row, index) => {
    const label = `Line ${index + 1}`;
    const description = clean(row?.description);
    const qty = Number(row?.qty);
    const price = Number(row?.unit_price ?? row?.price);
    const discountRaw = row?.discount_percent === undefined || row?.discount_percent === null || row?.discount_percent === "" ? 0 : Number(row.discount_percent);
    const unit = clean(row?.unit) || "unit";
    if (!description) errors.push(`${label}: description is required.`);
    if (description.length > 300) errors.push(`${label}: description is too long (300 characters at most).`);
    if (!Number.isFinite(qty) || qty <= 0 || qty > 1e9) errors.push(`${label}: quantity must be more than 0.`);
    if (!Number.isFinite(price) || price < 0 || price > 1e12) errors.push(`${label}: unit price must be 0 or more.`);
    if (!Number.isFinite(discountRaw) || discountRaw < 0 || discountRaw > 100) errors.push(`${label}: discount must be a percent from 0 to 100.`);
    if (!UNITS.includes(unit)) errors.push(`${label}: unit must be one of ${UNITS.join(", ")}.`);
    value.items.push({ description, qty, unit_price: price, discount_percent: discountRaw, unit });
  });

  const money = (raw, label) => {
    const number = raw === undefined || raw === null || raw === "" ? 0 : Number(raw);
    if (!Number.isFinite(number) || number < 0 || number > 1e12) errors.push(`${label} must be 0 or more.`);
    return number;
  };
  value.other_charges = money(body?.other_charges, "Other charges");
  value.additional_discount = money(body?.additional_discount, "Additional discount");

  value.overrides = {};
  for (const key of template.overrides) {
    const raw = body?.overrides?.[key] ?? body?.[key];
    if (raw === undefined || raw === null || raw === "") continue;
    const number = Number(raw);
    const bad = key === "tax_rate" ? number < 0 || number > 100 : !Number.isInteger(number) || number < 0 || number > 365;
    if (!Number.isFinite(number) || bad) errors.push(key === "tax_rate" ? "Tax rate must be a percent between 0 and 100." : `${key.replace("_", " ")} must be a whole number of days from 0 to 365.`);
    value.overrides[key] = number;
  }
  return errors.length ? { ok: false, errors } : { ok: true, value };
}

// The sums the masters' own formulas produce (the DoA amount is the grand total).
export function computeTotals(value, taxRatePercent) {
  const rate = (Number(taxRatePercent) || 0) / 100;
  const lines = value.items.map((item) => {
    const subtotal = item.qty * item.unit_price * (1 - item.discount_percent / 100);
    const tax = subtotal * rate;
    return { subtotal, tax, total: subtotal + tax };
  });
  const subtotal = lines.reduce((sum, line) => sum + line.subtotal, 0);
  const tax = lines.reduce((sum, line) => sum + line.tax, 0);
  const grand = subtotal + tax + value.other_charges - value.additional_discount;
  return { lines, subtotal, tax, grand, currency: "MYR" };
}

// BK-SYS-006: the file name carries the Transaction ID. Letters, digits and hyphens only.
export function draftFilename({ transaction_id, counterparty, templateName }) {
  const slug = (text, max) => String(text ?? "").normalize("NFKD").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, max);
  return [transaction_id, slug(counterparty, 40), slug(templateName, 30)].filter(Boolean).join("_") + ".xlsx";
}

// ---------------- the filler ----------------

const escapeXml = (text) => String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const cellPattern = (ref) => new RegExp(`<((?:[A-Za-z0-9]+:)?)c r="${ref}"([^>]*?)(/>|>[\\s\\S]*?</\\1c>)`);

function setCell(xml, ref, value, { allowFormula = false } = {}) {
  const match = cellPattern(ref).exec(xml);
  if (!match) throw new XlsxError(`The master has no cell ${ref} (the template manifest is out of date).`);
  const [whole, prefix, attrs, rest] = match;
  if (!allowFormula && new RegExp(`<${prefix}f[ >/]`).test(rest)) throw new XlsxError(`Refused: cell ${ref} holds a formula in the master.`);
  const style = /\ss="(\d+)"/.exec(attrs)?.[1];
  const head = `<${prefix}c r="${ref}"${style ? ` s="${style}"` : ""}`;
  const next = typeof value === "number"
    ? `${head} t="n"><${prefix}v>${Number.isInteger(value) ? value : Number(value.toPrecision(15))}</${prefix}v></${prefix}c>`
    : `${head} t="str"><${prefix}v>${escapeXml(value)}</${prefix}v></${prefix}c>`;
  return xml.slice(0, match.index) + next + xml.slice(match.index + whole.length);
}

// A formula cell keeps its formula; its stored result is replaced (or dropped when vFirm does not know it).
function setFormulaResult(xml, ref, number) {
  const match = cellPattern(ref).exec(xml);
  if (!match) return xml;
  const [whole, prefix, attrs, rest] = match;
  if (!new RegExp(`<${prefix}f[ >/]`).test(rest)) return xml;
  const stripped = rest.replace(new RegExp(`<${prefix}v>[\\s\\S]*?</${prefix}v>|<${prefix}v\\s*/>`, "g"), "");
  const body = number === null || number === undefined ? stripped : stripped.replace(new RegExp(`</${prefix}c>$`), `<${prefix}v>${Number(Number(number).toPrecision(15))}</${prefix}v></${prefix}c>`);
  const withType = number === null || number === undefined ? attrs : attrs.replace(/\st="[^"]*"/, "") + ' t="n"';
  return xml.slice(0, match.index) + `<${prefix}c r="${ref}"${withType}${body}` + xml.slice(match.index + whole.length);
}

function stripAllFormulaResults(xml) {
  return xml.replace(/<((?:[A-Za-z0-9]+:)?)c ([^>]*?)>((?:(?!<\/\1c>)[\s\S])*?<\1f[ >/][\s\S]*?)<\/\1c>/g, (whole, prefix, attrs, inner) => {
    const without = inner.replace(new RegExp(`<${prefix}v>[\\s\\S]*?</${prefix}v>|<${prefix}v\\s*/>`, "g"), "");
    return `<${prefix}c ${attrs}>${without}</${prefix}c>`;
  });
}

function sheetParts(entries) {
  const get = (name) => entryBytes(entries.find((entry) => entry.name === name) ?? (() => { throw new XlsxError(`The master is missing ${name}.`); })()).toString("utf8");
  const workbook = get("xl/workbook.xml");
  const rels = get("xl/_rels/workbook.xml.rels").replace(/^﻿/, "");
  const attr = (tag, name) => new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1] ?? null;
  const targets = new Map([...rels.matchAll(/<Relationship\b[^>]*>/g)].map((m) => [attr(m[0], "Id"), attr(m[0], "Target")]));
  const parts = new Map();
  for (const m of workbook.matchAll(/<(?:[A-Za-z0-9]+:)?sheet\b[^>]*>/g)) {
    const target = targets.get(attr(m[0], "r:id"));
    if (target) parts.set(attr(m[0], "name"), target.replace(/^\//, "").replace(/^(?!xl\/)/, "xl/"));
  }
  return parts;
}

// Fill a copy of the master. Returns { bytes, sha256, totals, warnings }.
export function fillTemplate({ templateId, company, value, transaction_id, company_code }) {
  const template = TEMPLATES[templateId];
  if (!template) throw new XlsxError(`Unknown template: ${templateId}.`);
  const entries = readZip(masterBytes(templateId));
  const parts = sheetParts(entries);
  const docPart = parts.get(template.sheet);
  const setupPart = parts.get(template.setup_sheet);
  if (!docPart || !setupPart) throw new XlsxError(`The master ${templateId} does not have the expected sheets.`);
  const read = (name) => entryBytes(entries.find((entry) => entry.name === name)).toString("utf8");
  let doc = read(docPart);
  let setup = read(setupPart);
  const warnings = [];

  // Setup sheet: company details typed in vFirm, defaults, and the document prefix.
  const profile = company ?? {};
  const taxRate = value.overrides.tax_rate ?? Number(profile.default_tax_rate ?? 0);
  const putSetup = (key, text) => { if (template.setup[key] && text !== null && text !== undefined && text !== "") setup = setCell(setup, template.setup[key], text); };
  for (const [key] of COMPANY_FIELDS) putSetup(key, profile[key]);
  if (template.setup.tax_rate) setup = setCell(setup, template.setup.tax_rate, taxRate / 100);
  if (template.setup.payment_days) setup = setCell(setup, template.setup.payment_days, value.overrides.payment_days ?? Number(profile.default_payment_days ?? 30));
  if (template.setup.valid_days) setup = setCell(setup, template.setup.valid_days, value.overrides.valid_days ?? Number(profile.default_validity_days ?? 30));
  if (template.setup.delivery_days) setup = setCell(setup, template.setup.delivery_days, value.overrides.delivery_days ?? Number(profile.default_delivery_days ?? 14));
  setup = setCell(setup, template.prefix_cell, `${company_code}-${template.document_type}`);

  // Document sheet.
  doc = setCell(doc, template.number_cell, transaction_id);
  doc = setCell(doc, template.date_cell, excelSerial(value.issue_date), { allowFormula: true });
  doc = setCell(doc, template.status_cell, "Draft");
  for (const field of template.fields) if (value.fields[field.key]) doc = setCell(doc, field.cell, value.fields[field.key]);
  if (value.notes) doc = setCell(doc, template.notes_cell, value.notes);
  const { items, totals } = template;
  const numbers = computeTotals(value, taxRate);
  value.items.forEach((item, index) => {
    const row = items.first + index;
    doc = setCell(doc, `${items.description}${row}`, item.description);
    doc = setCell(doc, `${items.qty}${row}`, item.qty);
    doc = setCell(doc, `${items.unit}${row}`, item.unit);
    doc = setCell(doc, `${items.price}${row}`, item.unit_price);
    doc = setCell(doc, `${items.discount}${row}`, item.discount_percent / 100);
  });
  doc = setCell(doc, totals.other, value.other_charges);
  doc = setCell(doc, totals.discount, value.additional_discount);

  // Free-text cells (sheet titles, notes, terms) carry the same placeholders as the Setup values.
  const placeholders = { COMPANY_CODE: company_code, COMPANY_LEGAL_NAME: profile.legal_name, REGISTRATION_NO: profile.registration_no, TAX_ID: profile.tax_id, COMPANY_ADDRESS: profile.address, COMPANY_TELEPHONE: profile.telephone, COMPANY_EMAIL: profile.email };
  const fillPlaceholders = (xml) => xml.replace(/\{\{([A-Z_]+)\}\}/g, (whole, name) => (placeholders[name] ? escapeXml(placeholders[name]) : whole));
  doc = fillPlaceholders(doc);
  setup = fillPlaceholders(setup);

  // Stored results: drop every stale one, then write back the ones vFirm knows.
  doc = stripAllFormulaResults(doc);
  setup = stripAllFormulaResults(setup);
  numbers.lines.forEach((line, index) => {
    const row = items.first + index;
    doc = setFormulaResult(doc, `${totals.lines.subtotal}${row}`, line.subtotal);
    doc = setFormulaResult(doc, `${totals.lines.tax}${row}`, line.tax);
    doc = setFormulaResult(doc, `${totals.lines.total}${row}`, line.total);
  });
  doc = setFormulaResult(doc, totals.subtotal, numbers.subtotal);
  doc = setFormulaResult(doc, totals.tax, numbers.tax);
  doc = setFormulaResult(doc, totals.grand, numbers.grand);

  // Anything still shaped like a placeholder or a to-do after filling is reported, never hidden.
  const text = `${doc}${setup}`;
  const left = new Set([...text.matchAll(/\{\{[A-Z_]+\}\}/g)].map((m) => m[0]));
  for (const item of left) warnings.push(`The file still contains the placeholder ${item}.`);
  if (/\[TO BE ADDED\]/.test(setup)) warnings.push("Bank details are still [TO BE ADDED] on the Setup sheet (add them in Company details).");
  if (!profile.registration_no || !profile.tax_id) warnings.push("Registration no. or TIN is missing from Company details.");

  // Recalculate every formula when the file is opened.
  let workbook = read("xl/workbook.xml");
  if (!/calcPr\b/.test(workbook)) {
    const prefix = /<((?:[A-Za-z0-9]+:)?)workbook\b/.exec(workbook)?.[1] ?? "";
    const calc = `<${prefix}calcPr calcId="191029" fullCalcOnLoad="1" />`;
    workbook = new RegExp(`</${prefix}definedNames>`).test(workbook)
      ? workbook.replace(`</${prefix}definedNames>`, `</${prefix}definedNames>${calc}`)
      : workbook.replace(`</${prefix}sheets>`, `</${prefix}sheets>${calc}`);
  }

  const replaced = new Map([[docPart, doc], [setupPart, setup], ["xl/workbook.xml", workbook]]);
  const out = entries.map((entry) => (replaced.has(entry.name) ? withContent(entry, replaced.get(entry.name)) : entry));
  const bytes = writeZip(out);
  if (bytes.length > MAX_DRAFT_BYTES) throw new XlsxError("The generated file is larger than the draft limit.");
  return { bytes, sha256: createHash("sha256").update(bytes).digest("hex"), totals: numbers, warnings };
}
