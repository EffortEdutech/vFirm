// CE-S4 (ADR-098, 2026-10-05): the Connected EDCS Number Authority -- pure functions only.
//
// BizKick's own NUMBER DESK reserves the next ID from a workbook, which two people can do at the same
// time and collide (BizKick QA finding BK-QA-002). For a Connected firm vFirm becomes the single place
// numbers are handed out: one reservation = one (company code, type, year, sequence) that no one else
// can ever receive. The sequence rule is deliberately simple and has no stored counter to drift:
//
//     next sequence = 1 + the highest sequence among
//                         (a) every reservation for that company/type/year, whatever its state
//                         (b) every imported register row for that company/type/year
//
// (a) includes VOID reservations, so a voided number is never issued twice. (b) is the "seeding": a firm
// that already has QT-2026-0007 in its register starts reserving at 0008 without any set-up step.
//
// States: RESERVED -> REGISTERED (an imported register row carries the ID) or VOID (owner cancels).
// REGISTERED and VOID are final.
//
// Nothing here touches storage; the repository supplies the rows and the service applies the result.

import { EDCS_DOCUMENT_TYPES, composeTransactionId } from "./edcs-register.mjs";

export const NUMBER_STATES = ["RESERVED", "REGISTERED", "VOID"];
export const MAX_SEQUENCE = 9999; // the Transaction ID carries four digits
export const DEFAULT_STALE_DAYS = 7;

// The natural key of a reservation inside one firm; the database unique index mirrors it.
export function reservationKey({ company_code, document_type, year, sequence }) {
  return `${company_code}|${document_type}|${year}|${sequence}`;
}

const clean = (value) => String(value ?? "").trim().replace(/\s+/g, " ");
export const normalizeName = (value) => clean(value).toLowerCase();

// Highest sequence already used for this company/type/year, from reservations and imported rows.
export function highestSequence({ reservations = [], transactions = [], company_code, document_type, year }) {
  let highest = 0;
  for (const record of [...reservations, ...transactions]) {
    if (record.company_code === company_code && record.document_type === document_type && Number(record.year) === Number(year)) highest = Math.max(highest, Number(record.sequence) || 0);
  }
  return highest;
}

export const nextSequence = (input) => highestSequence(input) + 1;

// Check the request body. `currentYear` is injected so the check stays pure.
export function validateReserveRequest(body, { currentYear }) {
  const errors = [];
  const document_type = clean(body?.document_type ?? body?.type).toUpperCase();
  if (!EDCS_DOCUMENT_TYPES[document_type]) errors.push(`Unknown document type: ${document_type || "(none)"}.`);
  const yearRaw = body?.year === undefined || body?.year === null || body?.year === "" ? currentYear : body.year;
  const year = Number(yearRaw);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) errors.push("Year must be a four-digit year such as 2026.");
  const purpose = clean(body?.purpose);
  if (purpose.length < 3) errors.push("Say what the number is for (purpose).");
  if (purpose.length > 200) errors.push("Purpose is too long (200 characters at most).");
  const counterparty = clean(body?.counterparty) || null;
  const subject = clean(body?.subject) || null;
  if (counterparty && counterparty.length > 200) errors.push("Counterparty is too long (200 characters at most).");
  if (subject && subject.length > 300) errors.push("Subject is too long (300 characters at most).");
  return errors.length ? { ok: false, errors } : { ok: true, value: { document_type, year, purpose, counterparty, subject } };
}

// Build the reservation record for the next free sequence. Returns null when the year's numbers are used up.
export function buildReservation({ id, tenant_id, firm_id, company_code, value, sequence, actor_id, at }) {
  if (sequence > MAX_SEQUENCE) return null;
  const record = {
    id, tenant_id, firm_id, company_code, document_type: value.document_type, year: value.year, sequence,
    transaction_id: composeTransactionId(company_code, value.document_type, value.year, sequence),
    purpose: value.purpose, counterparty: value.counterparty, subject: value.subject,
    status: "RESERVED", reserved_by: actor_id ?? null, reserved_at: at,
    registered_at: null, registered_run_id: null, void_at: null, void_by: null, void_reason: null
  };
  record.key = reservationKey(record);
  return record;
}

// The import cross-check. `rows` are the register engine's per-row results; `reservations` is every
// reservation the firm holds. Only active once the firm has reserved at least one number (gradual adoption:
// a firm that never uses the Number Desk is never warned).
//
// Returns:
//   active     whether the cross-check ran
//   warnings   Map<row_number, string[]> -- UNRESERVED / VOIDED_NUMBER_USED / RESERVED_FOR_DIFFERENT_COUNTERPARTY:<name>
//   register   reservations to mark REGISTERED (matched rows), each { reservation, row_number }
export function crossCheckRows({ rows, reservations }) {
  const result = { active: reservations.length > 0, warnings: new Map(), register: [] };
  if (!result.active) return result;
  const byId = new Map(reservations.map((record) => [record.transaction_id, record]));
  const add = (row, text) => result.warnings.set(row.row_number, [...(result.warnings.get(row.row_number) ?? []), text]);
  for (const row of rows) {
    if (!row.transaction_id || !["CREATED", "UPDATED", "REVISED", "UNCHANGED", "CONFLICT"].includes(row.outcome)) continue;
    const reservation = byId.get(row.transaction_id);
    if (!reservation) {
      // Only the first sighting of an ID is worth a warning; later imports of the same row stay quiet.
      if (row.outcome === "CREATED") add(row, "UNRESERVED");
      continue;
    }
    if (reservation.status === "VOID") { add(row, "VOIDED_NUMBER_USED"); continue; }
    const incoming = row.fields?.counterparty_name ?? null;
    if (reservation.counterparty && incoming && normalizeName(reservation.counterparty) !== normalizeName(incoming)) {
      add(row, `RESERVED_FOR_DIFFERENT_COUNTERPARTY:${reservation.counterparty}`);
    }
    if (reservation.status === "RESERVED" && row.outcome !== "CONFLICT") result.register.push({ reservation, row_number: row.row_number });
  }
  return result;
}

// RESERVED numbers that have waited longer than `days` without turning up in a register.
export function staleReservations(reservations, asOf, days = DEFAULT_STALE_DAYS) {
  const cutoff = Date.parse(`${asOf}T23:59:59Z`) - days * 86400000;
  return reservations.filter((record) => record.status === "RESERVED" && Date.parse(record.reserved_at) < cutoff);
}

// The last and next number for each (type, year) the firm has used, for the Number Desk header.
export function sequenceHeads({ reservations = [], transactions = [], company_code }) {
  const seen = new Map();
  for (const record of [...reservations, ...transactions]) {
    if (record.company_code !== company_code) continue;
    seen.set(`${record.document_type}|${record.year}`, { document_type: record.document_type, year: Number(record.year) });
  }
  return [...seen.values()]
    .map((entry) => ({ ...entry, last: highestSequence({ reservations, transactions, company_code, ...entry }) }))
    .map((entry) => ({ ...entry, next: entry.last + 1 <= MAX_SEQUENCE ? composeTransactionId(company_code, entry.document_type, entry.year, entry.last + 1) : null }))
    .sort((a, b) => a.document_type.localeCompare(b.document_type) || b.year - a.year);
}
