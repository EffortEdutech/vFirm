// CE-S5 (ADR-099, 2026-10-06): the Connected EDCS Delegation of Authority -- pure functions only.
//
// A BizKick client keeps its own approval limits in the Master Control Workbook (BK-SYS-003): the sheet
// "Approval Limits" says who may approve what up to which amount, and "Responsibility Matrix" says who
// prepares, reviews and approves each process. vFirm imports both so the client's own limits decide who may
// approve an EDCS-linked draft. Nothing here touches storage; the service supplies the file bytes and the
// repository keeps the versions.
//
// Rules the code below enforces (they are the contract, section 11):
//   - Limits arrive as numbers or text ("5000", "RM 10,000", "5%"). Anything that cannot be read is rejected
//     with a reason. A bare number below 1 is ambiguous (a percent cell is stored as 0.05) and is rejected
//     too: vFirm never guesses.
//   - A row is only usable when both tiers use the same kind of limit and Tier 2 is above Tier 1.
//   - The owner confirms two mappings on every import: each approver label -> the firm's roles (or the
//     owner), and each EDCS document type -> an Approval Limits row. Nothing is enforced that was not confirmed.
//   - Only money limits can be enforced (the register amount is money). A percentage row is kept for the
//     record but cannot be mapped to a document type.
//   - A transaction in another currency cannot be compared with RM limits, so the top tier applies.
//   - Approval is allowed to the firm owner, or to a role mapped to the required tier's approver or to any
//     higher tier's approver. Single-owner firms are never blocked: the owner always passes.

import { createHash } from "node:crypto";
import { parseAmount, readSheetRows } from "./tabular-file-reader.mjs";
import { EDCS_DOCUMENT_TYPES } from "./edcs-register.mjs";

export const DELEGATION_SHEETS = { limits: "Approval Limits", matrix: "Responsibility Matrix" };
export const DELEGATION_HEADER_ROW = 3;
export const DELEGATION_FIRST_DATA_ROW = 4;
export const LIMIT_COLUMNS = ["Transaction Type", "Tier 1 Limit", "Tier 1 Approver", "Tier 2 Limit", "Tier 2 Approver", "Above Tier 2"];
export const MATRIX_COLUMNS = ["Process", "Document", "Prepare", "Review", "Approve", "Record Custodian"];
export const POLICY_CURRENCY = "MYR";
export const MAX_ROLES_PER_LABEL = 8;
const COLUMN_LETTERS = ["A", "B", "C", "D", "E", "F"];
const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const clean = (value) => String(value ?? "").trim().replace(/\s+/g, " ");
export const normalizeKey = (value) => clean(value).toLowerCase();
// "Finance Manager", "finance-manager" and "FINANCE_MANAGER" are the same role.
export const normalizeRole = (value) => clean(value).toLowerCase().replace(/[\s-]+/g, "_");
const fail = (code, detail) => ({ ok: false, code, detail });

export function formatMoney(value) {
  const number = Number(value);
  return `RM ${number.toLocaleString("en-US", { minimumFractionDigits: Number.isInteger(number) ? 0 : 2, maximumFractionDigits: 2 })}`;
}
const formatLimit = (kind, value) => (kind === "PERCENT" ? `${value}%` : formatMoney(value));

// ---------------- reading the limit cells ----------------

export function parseLimitValue(raw) {
  const text = clean(raw);
  if (!text) return fail("MISSING_LIMIT", "no limit was given");
  const percent = text.match(/^(\d+(?:\.\d+)?)\s*%$/);
  if (percent) {
    const value = Number(percent[1]);
    if (!(value > 0 && value <= 100)) return fail("INVALID_LIMIT", `"${text}" is not a percentage between 0 and 100`);
    return { ok: true, kind: "PERCENT", value };
  }
  if (text.includes("%")) return fail("UNREADABLE_LIMIT", `"${text}" is not a percentage such as 5%`);
  if (/^\d+(?:\.\d+)?$/.test(text)) {
    const number = Number(text);
    if (number === 0) return fail("INVALID_LIMIT", `"${text}" must be more than zero`);
    // A percent-formatted Excel cell is stored as a fraction (5% -> 0.05), which looks like an amount.
    if (number < 1) return fail("AMBIGUOUS_LIMIT", `"${text}" could be a percentage or an amount; type it as text, for example 5% or RM 0.50`);
  }
  const money = parseAmount(text);
  if (money === null) return fail("UNREADABLE_LIMIT", `"${text}" is not an amount such as 5000 or RM 10,000, or a percentage such as 5%`);
  if (money <= 0) return fail("INVALID_LIMIT", `"${text}" must be more than zero`);
  return { ok: true, kind: "MONEY", value: money };
}

// ---------------- reading the two sheets ----------------

export function checkHeader(rows, columns, sheetName) {
  const header = rows.get(DELEGATION_HEADER_ROW) ?? [];
  for (let i = 0; i < columns.length; i += 1) {
    if (normalizeKey(header[i]) !== normalizeKey(columns[i])) {
      return { ok: false, reason: "STRUCTURE_CHANGED", sheet: sheetName, column: COLUMN_LETTERS[i], expected: columns[i], found: clean(header[i]), detail: `${sheetName}: column ${COLUMN_LETTERS[i]} should be "${columns[i]}"` };
    }
  }
  return { ok: true };
}

const dataRows = (rows) => [...rows.entries()].filter(([rowNumber]) => rowNumber >= DELEGATION_FIRST_DATA_ROW).sort((a, b) => a[0] - b[0]);
const rejection = (row_number, name, raw, problems) => ({ row_number, name: name || null, reasons: problems.map((p) => p.code), reason_details: problems.map((p) => p.detail), raw });

// rows: Map<rowNumber, string[]> from readSheetRows.
export function parseApprovalLimits(rows) {
  const accepted = [];
  const rejected = [];
  const seen = new Map();
  let ignored = 0;
  for (const [row_number, cells] of dataRows(rows)) {
    const c = LIMIT_COLUMNS.map((_, i) => clean(cells[i]));
    if (c.every((value) => value === "")) { ignored += 1; continue; }
    const problems = [];
    const add = (code, detail) => problems.push({ code, detail });
    const transaction_type = c[0];
    if (!transaction_type) add("MISSING_TRANSACTION_TYPE", "the Transaction Type is blank");
    const tier1 = parseLimitValue(c[1]);
    const tier2 = parseLimitValue(c[3]);
    if (!tier1.ok) add(tier1.code, `Tier 1 Limit: ${tier1.detail}`);
    if (!tier2.ok) add(tier2.code, `Tier 2 Limit: ${tier2.detail}`);
    if (!c[2]) add("MISSING_APPROVER", "Tier 1 Approver is blank");
    if (!c[4]) add("MISSING_APPROVER", "Tier 2 Approver is blank");
    if (!c[5]) add("MISSING_APPROVER", "Above Tier 2 is blank");
    if (tier1.ok && tier2.ok) {
      if (tier1.kind !== tier2.kind) add("MIXED_LIMIT_KINDS", `Tier 1 is ${tier1.kind === "PERCENT" ? "a percentage" : "an amount"} but Tier 2 is ${tier2.kind === "PERCENT" ? "a percentage" : "an amount"}`);
      else if (tier2.value <= tier1.value) add("LIMITS_NOT_ASCENDING", `Tier 2 (${formatLimit(tier2.kind, tier2.value)}) must be above Tier 1 (${formatLimit(tier1.kind, tier1.value)})`);
    }
    const key = normalizeKey(transaction_type);
    if (key && seen.has(key)) add("DUPLICATE_TRANSACTION_TYPE", `"${transaction_type}" is already on row ${seen.get(key)}`);
    if (problems.length) { rejected.push(rejection(row_number, transaction_type, c, problems)); continue; }
    seen.set(key, row_number);
    accepted.push({
      row_number, transaction_type, key, kind: tier1.kind,
      tier1: { limit: tier1.value, approver: c[2] },
      tier2: { limit: tier2.value, approver: c[4] },
      above_approver: c[5]
    });
  }
  return { accepted, rejected, ignored };
}

export function parseResponsibilityMatrix(rows) {
  const accepted = [];
  const rejected = [];
  const seen = new Map();
  let ignored = 0;
  for (const [row_number, cells] of dataRows(rows)) {
    const c = MATRIX_COLUMNS.map((_, i) => clean(cells[i]));
    if (c.every((value) => value === "")) { ignored += 1; continue; }
    const problems = [];
    if (!c[0]) problems.push({ code: "MISSING_PROCESS", detail: "the Process is blank" });
    const key = normalizeKey(c[0]);
    if (key && seen.has(key)) problems.push({ code: "DUPLICATE_PROCESS", detail: `"${c[0]}" is already on row ${seen.get(key)}` });
    if (problems.length) { rejected.push(rejection(row_number, c[0], c, problems)); continue; }
    seen.set(key, row_number);
    accepted.push({ row_number, process: c[0], key, document: c[1], prepare: c[2], review: c[3], approve: c[4], custodian: c[5], per_approval_limit: /per approval limit/i.test(c[4]) });
  }
  return { accepted, rejected, ignored };
}

// The whole workbook. Returns { ok:true, limits, matrix } (each { accepted, rejected, ignored }) or a
// whole-file rejection { ok:false, reason, ... }. The caller turns TabularReadError into FILE_UNREADABLE.
export function readDelegationWorkbook({ filename = "", mime_type = "", buffer }) {
  if (!(/\.xlsx$/i.test(filename) || mime_type === XLSX_MIME)) {
    return { ok: false, reason: "WORKBOOK_REQUIRED", detail: "Upload the BK-SYS-003 Master Control Workbook (.xlsx). vFirm reads two of its sheets: Approval Limits and Responsibility Matrix." };
  }
  const sheets = {};
  for (const [key, sheetName] of Object.entries(DELEGATION_SHEETS)) {
    const sheet = readSheetRows({ filename, mime_type, buffer, sheetName });
    if (!sheet.sheet_found) return { ok: false, reason: "SHEET_MISSING", sheet: sheetName, found: sheet.sheet_names, detail: `Sheet "${sheetName}" was not found in this workbook` };
    const header = checkHeader(sheet.rows, key === "limits" ? LIMIT_COLUMNS : MATRIX_COLUMNS, sheetName);
    if (!header.ok) return header;
    sheets[key] = sheet.rows;
  }
  return { ok: true, limits: parseApprovalLimits(sheets.limits), matrix: parseResponsibilityMatrix(sheets.matrix) };
}

// ---------------- what the owner confirms ----------------

// Every distinct approver label the usable limit rows name, with where it is used.
export function approverLabels(limitRows) {
  const found = new Map();
  for (const row of limitRows) {
    for (const [tier, label] of [[1, row.tier1.approver], [2, row.tier2.approver], [3, row.above_approver]]) {
      const key = normalizeKey(label);
      if (!found.has(key)) found.set(key, { key, label, used_in: [] });
      found.get(key).used_in.push({ transaction_type: row.transaction_type, tier });
    }
  }
  return [...found.values()];
}

// A starting point only: labels that name the owner or the board. The owner still confirms.
export function suggestLabelMap(labels) {
  return Object.fromEntries(labels.map((entry) => [entry.key, { label: entry.label, owner: /\b(owner|board)\b/i.test(entry.label), roles: [] }]));
}

const DOCUMENT_HINTS = [
  { match: /^purchase/i, documents: ["PO"] },
  { match: /^payment/i, documents: ["PV", "PCV"] },
  { match: /^expense/i, documents: ["EC"] },
  { match: /^stock adjustment/i, documents: ["SA"] }
];

// EDCS document type -> Approval Limits row, where the name makes it plain. Only money rows; the owner confirms.
export function suggestDocumentTypes(limitRows) {
  const suggestion = {};
  for (const row of limitRows) {
    if (row.kind !== "MONEY") continue;
    for (const hint of DOCUMENT_HINTS) {
      if (!hint.match.test(row.transaction_type)) continue;
      for (const documentType of hint.documents) if (EDCS_DOCUMENT_TYPES[documentType] && !suggestion[documentType]) suggestion[documentType] = row.transaction_type;
    }
  }
  return suggestion;
}

function entriesOf(input) {
  if (Array.isArray(input)) return input.map((entry) => ({ label: clean(entry?.label), owner: entry?.owner === true, roles: entry?.roles }));
  if (input && typeof input === "object") return Object.entries(input).map(([label, entry]) => ({ label: clean(label), owner: entry?.owner === true, roles: entry?.roles }));
  return [];
}

function rolesOf(value) {
  const list = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
  const seen = new Map();
  for (const item of list) {
    const text = clean(item);
    if (text && !seen.has(normalizeRole(text))) seen.set(normalizeRole(text), text);
  }
  return [...seen.values()];
}

// Check the owner's confirmation against the usable limit rows. Returns { ok, errors, label_map, document_types }.
export function validateConfirmation({ limits, label_map: labelInput, document_types: documentInput }) {
  const errors = [];
  const provided = new Map(entriesOf(labelInput).map((entry) => [normalizeKey(entry.label), entry]));
  const label_map = {};
  for (const required of approverLabels(limits)) {
    const entry = provided.get(required.key);
    const roles = rolesOf(entry?.roles);
    if (!entry || (!entry.owner && roles.length === 0)) { errors.push({ code: "MAPPING_INCOMPLETE", label: required.label, detail: `"${required.label}" needs the owner or at least one role` }); continue; }
    if (roles.length > MAX_ROLES_PER_LABEL) { errors.push({ code: "TOO_MANY_ROLES", label: required.label, detail: `"${required.label}" can map to at most ${MAX_ROLES_PER_LABEL} roles` }); continue; }
    if (roles.some((role) => role.length > 60)) { errors.push({ code: "ROLE_TOO_LONG", label: required.label, detail: `A role for "${required.label}" is longer than 60 characters` }); continue; }
    label_map[required.key] = { label: required.label, owner: entry.owner, roles };
  }
  const document_types = {};
  const byType = new Map(limits.map((row) => [row.key, row]));
  if (documentInput && typeof documentInput === "object" && !Array.isArray(documentInput)) {
    for (const [rawCode, rawName] of Object.entries(documentInput)) {
      const name = clean(rawName);
      if (!name) continue;
      const code = clean(rawCode).toUpperCase();
      if (!EDCS_DOCUMENT_TYPES[code]) { errors.push({ code: "UNKNOWN_DOCUMENT_TYPE", detail: `"${rawCode}" is not a BizKick document type` }); continue; }
      const row = byType.get(normalizeKey(name));
      if (!row) { errors.push({ code: "UNKNOWN_TRANSACTION_TYPE", detail: `${code} is mapped to "${name}", which is not a usable row in Approval Limits` }); continue; }
      if (row.kind !== "MONEY") { errors.push({ code: "PERCENT_NOT_ENFORCEABLE", detail: `${code} is mapped to "${row.transaction_type}", which uses percentage limits. A register amount is money, so it cannot be checked against a percentage; leave ${code} unmapped.` }); continue; }
      document_types[code] = row.transaction_type;
    }
  }
  return { ok: errors.length === 0, errors, label_map, document_types };
}

// ---------------- the policy content and its versions ----------------

const byKey = (a, b) => a.key.localeCompare(b.key);

// The canonical content of a version. `content_hash` covers exactly what enforcement uses (limits, the
// responsibility matrix, both confirmed mappings), so re-importing the same file with the same mappings
// is recognised as no change, and any real change is a new version.
export function buildPolicyContent({ limits, matrix, label_map, document_types, rejected_limits = [], rejected_matrix = [] }) {
  const canonical = {
    currency: POLICY_CURRENCY,
    limits: [...limits].sort(byKey).map(({ transaction_type, key, kind, tier1, tier2, above_approver }) => ({ transaction_type, key, kind, tier1, tier2, above_approver })),
    responsibilities: [...matrix].sort(byKey).map(({ process, key, document, prepare, review, approve, custodian, per_approval_limit }) => ({ process, key, document, prepare, review, approve, custodian, per_approval_limit })),
    label_map: Object.fromEntries(Object.keys(label_map).sort().map((key) => [key, { label: label_map[key].label, owner: label_map[key].owner === true, roles: [...label_map[key].roles].sort((a, b) => normalizeRole(a).localeCompare(normalizeRole(b))) }])),
    document_types: Object.fromEntries(Object.keys(document_types).sort().map((code) => [code, document_types[code]]))
  };
  const content_hash = createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
  return { ...canonical, content_hash, rejected_limits, rejected_matrix };
}

export function describeLimitRow(row) {
  return `Tier 1 up to ${formatLimit(row.kind, row.tier1.limit)} (${row.tier1.approver}); Tier 2 up to ${formatLimit(row.kind, row.tier2.limit)} (${row.tier2.approver}); above: ${row.above_approver}`;
}

function diffKeyed(area, before, after, keyOf, nameOf, describe) {
  const changes = [];
  const was = new Map(before.map((item) => [keyOf(item), item]));
  const now = new Map(after.map((item) => [keyOf(item), item]));
  for (const [key, item] of now) {
    if (!was.has(key)) changes.push({ area, key, name: nameOf(item), change: "ADDED", after: describe(item) });
    else if (JSON.stringify(was.get(key)) !== JSON.stringify(item)) changes.push({ area, key, name: nameOf(item), change: "CHANGED", before: describe(was.get(key)), after: describe(item) });
  }
  for (const [key, item] of was) if (!now.has(key)) changes.push({ area, key, name: nameOf(item), change: "REMOVED", before: describe(item) });
  return changes;
}

const describeMapping = (entry) => [entry.owner ? "owner" : null, ...entry.roles].filter(Boolean).join(", ") || "(none)";

// What a new import changes against the active version (or against nothing, for the first import).
export function diffPolicies(previous, next) {
  const before = previous ?? { limits: [], responsibilities: [], label_map: {}, document_types: {} };
  const changes = [
    ...diffKeyed("LIMIT", before.limits, next.limits, (row) => row.key, (row) => row.transaction_type, describeLimitRow),
    ...diffKeyed("RESPONSIBILITY", before.responsibilities, next.responsibilities, (row) => row.key, (row) => row.process, (row) => `Prepare ${row.prepare || "-"}; Review ${row.review || "-"}; Approve ${row.approve || "-"}`),
    ...diffKeyed("APPROVER_ROLE", Object.entries(before.label_map).map(([key, value]) => ({ key, ...value })), Object.entries(next.label_map).map(([key, value]) => ({ key, ...value })), (entry) => entry.key, (entry) => entry.label, describeMapping),
    ...diffKeyed("DOCUMENT_TYPE", Object.entries(before.document_types).map(([key, value]) => ({ key, value })), Object.entries(next.document_types).map(([key, value]) => ({ key, value })), (entry) => entry.key, (entry) => entry.key, (entry) => entry.value)
  ];
  const counts = { added: 0, removed: 0, changed: 0 };
  for (const change of changes) counts[change.change.toLowerCase()] += 1;
  return { identical: Boolean(previous) && previous.content_hash === next.content_hash, changes, counts };
}

export function summarizePolicy(policy) {
  return {
    version: policy.version, status: policy.status, imported_at: policy.imported_at, imported_by_actor_id: policy.imported_by_actor_id ?? null,
    source_filename: policy.source_filename ?? null, source_file_id: policy.source_file_id ?? null, content_hash: policy.content_hash,
    superseded_at: policy.superseded_at ?? null, superseded_by_version: policy.superseded_by_version ?? null,
    counts: { limits: policy.limits.length, responsibilities: policy.responsibilities.length, document_types: Object.keys(policy.document_types).length, rejected_rows: (policy.rejected_limits?.length ?? 0) + (policy.rejected_matrix?.length ?? 0) },
    change_summary: policy.change_summary ?? null
  };
}

// ---------------- deciding ----------------

const approverFor = (row, tier) => (tier === 1 ? row.tier1.approver : tier === 2 ? row.tier2.approver : row.above_approver);
const labelsFrom = (row, tier) => [1, 2, 3].filter((t) => t >= tier).map((t) => approverFor(row, t));

function bandText(row, tier) {
  if (tier === 1) return `up to ${formatMoney(row.tier1.limit)}`;
  if (tier === 2) return `${formatMoney(row.tier1.limit)} to ${formatMoney(row.tier2.limit)}`;
  return `above ${formatMoney(row.tier2.limit)}`;
}

// What approving this transaction needs. { governed:false, reason } when no limit applies:
// NO_POLICY, DOCUMENT_TYPE_NOT_GOVERNED, LIMIT_NOT_ENFORCEABLE, NO_AMOUNT.
export function requirementFor({ policy, transaction }) {
  if (!policy) return { governed: false, reason: "NO_POLICY" };
  const document_type = transaction?.document_type ?? null;
  const typeName = policy.document_types?.[document_type];
  if (!typeName) return { governed: false, reason: "DOCUMENT_TYPE_NOT_GOVERNED", document_type };
  const row = policy.limits.find((item) => item.key === normalizeKey(typeName));
  if (!row || row.kind !== "MONEY") return { governed: false, reason: "LIMIT_NOT_ENFORCEABLE", document_type };
  const raw = transaction.amount;
  if (raw === null || raw === undefined || raw === "" || !Number.isFinite(Number(raw))) return { governed: false, reason: "NO_AMOUNT", document_type };
  const amount = Number(raw);
  const currency = transaction.currency || POLICY_CURRENCY;
  const foreign_currency = currency !== POLICY_CURRENCY;
  const size = Math.abs(amount);
  // An amount in another currency cannot be compared with RM limits, and vFirm does not convert: top tier.
  const tier = foreign_currency ? 3 : size <= row.tier1.limit ? 1 : size <= row.tier2.limit ? 2 : 3;
  return {
    governed: true, policy_version: policy.version, transaction_id: transaction.transaction_id ?? null, document_type,
    transaction_type: row.transaction_type, amount, currency, foreign_currency, tier, approver_label: approverFor(row, tier),
    band: foreign_currency ? `${currency} cannot be compared with the RM limits, so the top tier applies` : bandText(row, tier),
    limits: { tier1: row.tier1.limit, tier2: row.tier2.limit }
  };
}

export const describeRequirement = (requirement) => (requirement.governed
  ? `${requirement.document_type} ${requirement.currency} ${requirement.amount.toLocaleString("en-US")}: Tier ${requirement.tier} (${requirement.band}), needs ${requirement.approver_label}`
  : `No approval limit applies (${requirement.reason}).`);

function holdersOf(policy, label) {
  const mapping = policy.label_map?.[normalizeKey(label)];
  if (!mapping) return [];
  return [mapping.owner ? "the firm owner" : null, ...mapping.roles].filter(Boolean);
}

// `is_owner` is decided by the caller (it knows the role vocabulary); `actor_role` is the caller's role code.
export function authorizeApproval({ requirement, policy, actor_role, is_owner }) {
  if (!requirement?.governed) return { decision: "ALLOW", via: "NOT_GOVERNED", message: null };
  if (is_owner) return { decision: "ALLOW", via: "OWNER", message: null };
  const row = policy.limits.find((item) => item.key === normalizeKey(requirement.transaction_type));
  const role = normalizeRole(actor_role);
  if (role) {
    for (const label of labelsFrom(row, requirement.tier)) {
      const mapping = policy.label_map?.[normalizeKey(label)];
      if (mapping?.roles?.some((candidate) => normalizeRole(candidate) === role)) return { decision: "ALLOW", via: "ROLE", label, message: null };
    }
  }
  const holders = holdersOf(policy, requirement.approver_label);
  const needs = `${requirement.approver_label}${holders.length ? ` (${holders.join(" or ")})` : ""}${requirement.tier < 3 ? ", or a higher approver" : ""}`;
  const message = `Approval limit: ${requirement.document_type} ${requirement.currency} ${requirement.amount.toLocaleString("en-US")} is Tier ${requirement.tier} (${requirement.band}) under approval policy v${policy.version}. It needs ${needs}. Your role is ${clean(actor_role) || "not set"}.`;
  return { decision: "DENY", via: null, message };
}

// The role codes that count as the firm owner (compared after normalizeRole).
export const OWNER_ROLE_KEYS = ["principal", "pilot_principal", "firm_principal", "admin", "owner"];
export const isOwnerRole = (role) => OWNER_ROLE_KEYS.includes(normalizeRole(role ?? "principal"));
