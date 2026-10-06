// CE-S1 (ADR-095, 2026-10-05): the Connected EDCS service -- connection setup, register import,
// sync ledger, conflicts and counterparty links.
//
// Golden rule: BizKick is the source, the Bridge is the contract, vFirm is the governed record.
// This module never writes to a BizKick file; it reads an uploaded register (a firm file already
// stored with its SHA-256), decides every row with the pure engine in
// packages/core-domain/src/edcs-register.mjs, and writes the result to the EDCS repository and the
// audit ledger. The route layer (server.mjs) authenticates the caller and passes `actor`.
//
// Authority: reading is open to any verified member of the firm; every write (connection, import,
// conflict resolution, counterparty link) needs the firm owner (a human principal). A caller can
// only ever reach its own tenant/firm -- every repository call is scoped.

import { appendEventAndAudit, findEdcsDocumentState, newFileId, newUuid, now, readStore, registerEdcsFileRevisionRecord, withStore } from "./store.mjs";
import { sha256Hex } from "./file-storage.mjs";
import { edcsRepository as repo, EDCS_COLLECTIONS } from "./edcs-repository.mjs";
import {
  EDCS_DOCUMENT_TYPES, EDCS_STATUSES, EDCS_OUTCOMES, computeEdcsAlert, daysToDue, describeChanges, effectiveContentPolicy,
  processRegisterRows, readRegisterFile, rowFingerprint
} from "../../../packages/core-domain/src/edcs-register.mjs";
import { buildTransactionChains, chainForTransaction, extractTransactionId, revisionLabelFromFilename } from "../../../packages/core-domain/src/edcs-chains.mjs";
import { TabularReadError } from "../../../packages/core-domain/src/tabular-file-reader.mjs";
import { DEFAULT_STALE_DAYS, buildReservation, crossCheckRows, sequenceHeads, staleReservations, validateReserveRequest } from "../../../packages/core-domain/src/edcs-numbers.mjs";

const OWNER_ROLES = ["principal", "PILOT_PRINCIPAL", "FIRM_PRINCIPAL", "ADMIN"];

function httpError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function requireOwner(actor, action) {
  if (actor?.actor_type !== "HUMAN" || !OWNER_ROLES.includes(actor?.role ?? "principal")) {
    throw httpError(403, "EDCS_OWNER_REQUIRED", `${action} requires the firm owner.`);
  }
}

const scopeOf = (source) => ({ tenant_id: source.tenant_id, firm_id: source.firm_id });
const todayUtc = () => new Date().toISOString().slice(0, 10);
const cloneRecord = (record) => JSON.parse(JSON.stringify(record));

async function recordAudit(scope, actor, events) {
  if (!events.length) return;
  await withStore((store) => {
    for (const event of events) appendEventAndAudit(store, { actor, tenant_id: scope.tenant_id, firm_id: scope.firm_id, ...event });
  });
}

// ---------------- connection ----------------

function modulePolicies(connection) {
  const seen = new Map();
  for (const [code, type] of Object.entries(EDCS_DOCUMENT_TYPES)) {
    const first = type.module.split(" / ")[0];
    if (!seen.has(first)) seen.set(first, effectiveContentPolicy(code, connection));
  }
  return [...seen.entries()].map(([module, policy]) => ({ module, policy }));
}

export async function readConnection(scope) {
  const connection = await repo.getConnection(scope);
  return { connection, module_policies: modulePolicies(connection) };
}

export async function saveConnection({ body, actor }) {
  requireOwner(actor, "Setting up the BizKick connection");
  const scope = scopeOf(body);
  const companyCode = String(body.company_code ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9]{2,8}$/.test(companyCode)) throw httpError(400, "VALIDATION_ERROR", "Company code must be 2 to 8 letters or digits, exactly as BizKick shows it (for example NEX).");
  const existing = await repo.getConnection(scope);
  if (existing && existing.company_code !== companyCode && (await repo.listTransactions(scope)).length > 0) {
    throw httpError(409, "EDCS_COMPANY_CODE_LOCKED", `Transactions are already imported under company code ${existing.company_code}. Their IDs carry it, so it cannot change.`);
  }
  const timestamp = now();
  const policyBefore = existing?.content_policy ?? { hr_content_opt_in: false, legal_content_opt_in: false };
  const policy = {
    hr_content_opt_in: body.hr_content_opt_in === undefined ? policyBefore.hr_content_opt_in === true : body.hr_content_opt_in === true,
    legal_content_opt_in: body.legal_content_opt_in === undefined ? policyBefore.legal_content_opt_in === true : body.legal_content_opt_in === true
  };
  const connection = {
    id: existing?.id ?? newUuid(),
    tenant_id: scope.tenant_id,
    firm_id: scope.firm_id,
    company_code: companyCode,
    bizkick_version: body.bizkick_version === undefined ? existing?.bizkick_version ?? null : String(body.bizkick_version).trim() || null,
    topology: "UPLOAD",
    status: "ACTIVE",
    content_policy: policy,
    created_at: existing?.created_at ?? timestamp,
    updated_at: timestamp,
    updated_by_actor_id: actor.actor_id ?? null
  };
  await repo.commit(scope, { edcs_connections: [connection] });
  await recordAudit(scope, actor, [{
    event_type: existing ? "edcs.connection_updated" : "edcs.connection_created",
    aggregate_type: "EdcsConnection",
    aggregate_id: connection.id,
    payload: { company_code: companyCode, bizkick_version: connection.bizkick_version, topology: connection.topology, content_policy_before: existing ? policyBefore : null, content_policy_after: policy },
    summary: existing ? "BizKick connection updated." : "BizKick connection created."
  }]);
  return { connection, module_policies: modulePolicies(connection) };
}

// ---------------- register import ----------------

function newTransactionRecord(scope, fields, fingerprint, runId, timestamp) {
  const type = EDCS_DOCUMENT_TYPES[fields.document_type];
  return {
    id: newUuid(),
    tenant_id: scope.tenant_id,
    firm_id: scope.firm_id,
    ...fields,
    state: EDCS_STATUSES[fields.status].state,
    module: type.module,
    vfirm_object: type.object,
    classification: type.classification,
    default_position: type.position,
    row_fingerprint: fingerprint,
    revision_count: 1,
    flags: { duplicate: false, row_missing: false },
    held_conflict: null,
    conflict_history: [],
    counterparty_link: null,
    first_seen_at: timestamp,
    last_synced_at: timestamp,
    first_run_id: runId,
    last_run_id: runId,
    created_at: timestamp,
    updated_at: timestamp
  };
}

function applyFields(record, fields, fingerprint, runId, timestamp) {
  Object.assign(record, fields);
  record.state = EDCS_STATUSES[fields.status].state;
  record.row_fingerprint = fingerprint;
  record.last_synced_at = timestamp;
  record.last_run_id = runId;
  record.updated_at = timestamp;
}

const compactRow = (row) => ({ row_number: row.row_number ?? null, transaction_id: row.transaction_id ?? null, outcome: row.outcome, reasons: row.reasons ?? [], reason_details: row.reason_details ?? [], warnings: row.warnings ?? [], changed_fields: row.changed_fields ?? [] });

export async function importRegister({ body, actor, readFileBytes }) {
  requireOwner(actor, "Importing a BizKick register");
  const scope = scopeOf(body);
  const connection = await repo.getConnection(scope);
  if (!connection) throw httpError(409, "EDCS_NOT_CONNECTED", "Set up the BizKick connection (company code) before importing a register.");

  const store = await readStore(scope.tenant_id);
  const file = (store.file_objects ?? []).find((item) => item.id === body.file_id && item.tenant_id === scope.tenant_id && item.firm_id === scope.firm_id);
  if (!file) throw httpError(404, "NOT_FOUND", `file_objects record not found: ${body.file_id}`);
  const buffer = await readFileBytes(file);

  const startedAt = now();
  const runs = await repo.listRuns(scope);
  const runId = newUuid();
  const runNumber = (runs[0]?.run_number ?? 0) + 1;
  const run = {
    id: runId, tenant_id: scope.tenant_id, firm_id: scope.firm_id, run_number: runNumber, status: "COMPLETED",
    source_file_id: file.id, source_filename: file.filename, source_sha256: file.sha256, source_size_bytes: file.size_bytes,
    actor_id: actor.actor_id ?? null, started_at: startedAt, finished_at: null,
    counts: Object.fromEntries(EDCS_OUTCOMES.map((outcome) => [outcome, 0])), rows_total: 0, rows_ignored: 0, warnings_count: 0, file_outcome: null
  };
  const batch = { edcs_transactions: [], edcs_transaction_revisions: [], edcs_sync_events: [], edcs_sync_runs: [] };
  const audits = [];
  const eventFor = (row, extra = {}) => ({
    id: newUuid(), tenant_id: scope.tenant_id, firm_id: scope.firm_id, run_id: runId, run_number: runNumber,
    row_number: row.row_number ?? null, transaction_id: row.transaction_id ?? null, outcome: row.outcome,
    reasons: row.reasons ?? [], reason_details: row.reason_details ?? [], warnings: row.warnings ?? [], changed_fields: row.changed_fields ?? [],
    changes: {}, before_fingerprint: row.before_fingerprint ?? null, after_fingerprint: row.after_fingerprint ?? null, raw: row.raw ?? null, at: startedAt, ...extra
  });

  let parsed;
  try {
    parsed = readRegisterFile({ filename: file.filename, mime_type: file.mime_type, buffer });
  } catch (error) {
    if (!(error instanceof TabularReadError)) throw error;
    parsed = { ok: false, reason: "FILE_UNREADABLE", detail: error.message };
  }

  let rows = [];
  let missing = [];
  if (!parsed.ok) {
    // Only STRUCTURE_CHANGED / an unreadable file rejects the whole file: zero rows processed.
    run.status = "REJECTED";
    run.file_outcome = { reason: parsed.reason, detail: parsed.detail, expected: parsed.expected ?? null, found: parsed.found ?? null, column: parsed.column ?? null };
    batch.edcs_sync_events.push(eventFor({ row_number: null, transaction_id: null, outcome: "REJECTED", reasons: [parsed.reason], reason_details: [parsed.detail] }));
  } else {
    const existingList = await repo.listTransactions(scope);
    const existing = new Map(existingList.map((record) => [record.transaction_id, record]));
    const engine = processRegisterRows({ rows: parsed.rows, connection, existing });
    run.counts = engine.counts;
    run.rows_total = engine.results.length;
    run.rows_ignored = engine.ignored_rows;
    // CE-S4: once the firm uses the Number Desk, rows whose ID was never reserved get an UNRESERVED warning
    // (never a rejection), and reserved IDs that turn up are marked REGISTERED in the same commit.
    const numberCheck = crossCheckRows({ rows: engine.results, reservations: await repo.listReservations(scope) });
    if (numberCheck.active) for (const row of engine.results) row.warnings.push(...(numberCheck.warnings.get(row.row_number) ?? []));
    run.warnings_count = engine.results.reduce((sum, row) => sum + row.warnings.length, 0);
    missing = engine.missing;
    const touched = new Map();
    const work = (id) => {
      if (!touched.has(id)) touched.set(id, cloneRecord(existing.get(id)));
      return touched.get(id);
    };
    const flagChange = (record, flag, value, timestamp) => {
      if ((record.flags?.[flag] ?? false) === value) return false;
      record.flags = { ...(record.flags ?? {}), [flag]: value };
      record.updated_at = timestamp;
      audits.push({ event_type: "edcs.transaction_flag_changed", aggregate_type: "EdcsTransaction", aggregate_id: record.id, payload: { transaction_id: record.transaction_id, flag, value, run_id: runId }, summary: `Transaction ${record.transaction_id}: ${flag.replace("_", " ")} ${value ? "flagged" : "cleared"}.` });
      return true;
    };
    const clearHeldConflict = (record, resolution, timestamp) => {
      if (!record.held_conflict) return;
      record.conflict_history = [...(record.conflict_history ?? []), { held_run_id: record.held_conflict.run_id, reasons: record.held_conflict.reasons, resolution, resolved_at: timestamp, resolved_by: "import", run_id: runId }];
      audits.push({ event_type: "edcs.conflict_resolved", aggregate_type: "EdcsTransaction", aggregate_id: record.id, payload: { transaction_id: record.transaction_id, resolution, reasons: record.held_conflict.reasons, run_id: runId }, summary: `Held conflict on ${record.transaction_id} closed by the register itself (${resolution}).` });
      record.held_conflict = null;
    };

    for (const row of engine.results) {
      const event = eventFor(row);
      batch.edcs_sync_events.push(event);
      const id = row.transaction_id;
      if (row.outcome === "CREATED") {
        const record = newTransactionRecord(scope, row.fields, row.after_fingerprint, runId, startedAt);
        touched.set(id, record);
        batch.edcs_transaction_revisions.push({ id: newUuid(), tenant_id: scope.tenant_id, firm_id: scope.firm_id, transaction_id: id, seq: 1, revision: row.fields.revision, kind: "CREATED", row_fingerprint: row.after_fingerprint, snapshot: row.fields, run_id: runId, row_number: row.row_number, created_at: startedAt });
        audits.push({ event_type: "edcs.transaction_created", aggregate_type: "EdcsTransaction", aggregate_id: record.id, payload: { transaction_id: id, document_type: row.fields.document_type, revision: row.fields.revision, status: row.fields.status, run_id: runId, row_number: row.row_number }, summary: `Transaction ${id} created from the BizKick register.` });
      } else if (row.outcome === "UPDATED" || row.outcome === "REVISED" || row.outcome === "UNCHANGED") {
        const record = work(id);
        const before = cloneRecord(record);
        applyFields(record, row.fields, row.after_fingerprint, runId, startedAt);
        flagChange(record, "duplicate", false, startedAt);
        flagChange(record, "row_missing", false, startedAt);
        if (row.outcome !== "UNCHANGED") event.changes = describeChanges(before, row.fields, row.changed_fields);
        if (row.outcome === "REVISED") {
          record.revision_count = (before.revision_count ?? 1) + 1;
          batch.edcs_transaction_revisions.push({ id: newUuid(), tenant_id: scope.tenant_id, firm_id: scope.firm_id, transaction_id: id, seq: record.revision_count, revision: row.fields.revision, kind: "REVISED", row_fingerprint: row.after_fingerprint, snapshot: row.fields, run_id: runId, row_number: row.row_number, created_at: startedAt });
          audits.push({ event_type: "edcs.transaction_revised", aggregate_type: "EdcsTransaction", aggregate_id: record.id, payload: { transaction_id: id, from_revision: before.revision, to_revision: row.fields.revision, changed_fields: row.changed_fields, run_id: runId }, summary: `Transaction ${id} revised ${before.revision} to ${row.fields.revision}; the earlier revision is kept in history.` });
        } else if (row.outcome === "UPDATED") {
          audits.push({ event_type: "edcs.transaction_updated", aggregate_type: "EdcsTransaction", aggregate_id: record.id, payload: { transaction_id: id, changed_fields: row.changed_fields, changes: event.changes, run_id: runId }, summary: `Transaction ${id} updated (${row.changed_fields.join(", ")}).` });
        }
        clearHeldConflict(record, row.outcome === "UNCHANGED" ? "SOURCE_CORRECTED" : "SUPERSEDED_BY_IMPORT", startedAt);
      } else if (row.outcome === "CONFLICT") {
        const record = work(id);
        const sameHold = record.held_conflict?.incoming_fingerprint === row.after_fingerprint && JSON.stringify(record.held_conflict?.reasons) === JSON.stringify(row.reasons);
        flagChange(record, "duplicate", false, startedAt);
        flagChange(record, "row_missing", false, startedAt);
        if (!sameHold) {
          record.held_conflict = { run_id: runId, run_number: runNumber, row_number: row.row_number, reasons: row.reasons, reason_details: row.reason_details, changed_fields: row.changed_fields, incoming: row.fields, incoming_fingerprint: row.after_fingerprint, held_at: startedAt };
          record.updated_at = startedAt;
          audits.push({ event_type: "edcs.conflict_held", aggregate_type: "EdcsTransaction", aggregate_id: record.id, payload: { transaction_id: id, reasons: row.reasons, reason_details: row.reason_details, run_id: runId, row_number: row.row_number }, summary: `Conflict held on ${id} (${row.reasons.join(", ")}); not applied.` });
        }
      } else if (row.outcome === "REJECTED" && row.had_existing) {
        const record = work(id);
        if (row.duplicate) flagChange(record, "duplicate", true, startedAt);
        flagChange(record, "row_missing", false, startedAt);
      }
    }
    for (const id of missing) {
      const record = work(id);
      batch.edcs_sync_events.push(eventFor({ row_number: null, transaction_id: id, outcome: "ROW_MISSING", reasons: ["ROW_NOT_IN_SOURCE"], reason_details: [], before_fingerprint: record.row_fingerprint }));
      if (flagChange(record, "row_missing", true, startedAt)) record.row_missing_since_run_id = runId;
    }
    for (const { reservation, row_number } of numberCheck.register) {
      batch.edcs_number_reservations ??= [];
      if (batch.edcs_number_reservations.some((item) => item.id === reservation.id)) continue;
      batch.edcs_number_reservations.push({ ...reservation, status: "REGISTERED", registered_at: startedAt, registered_run_id: runId, registered_row_number: row_number });
      audits.push({ event_type: "edcs.number_registered", aggregate_type: "EdcsNumberReservation", aggregate_id: reservation.id, payload: { transaction_id: reservation.transaction_id, run_id: runId, row_number }, summary: `Reserved number ${reservation.transaction_id} found in the register (import #${runNumber}).` });
    }
    // Only records whose content actually changed go back to the repository.
    for (const [id, record] of touched) {
      const original = existing.get(id);
      if (!original || JSON.stringify(original) !== JSON.stringify(record)) batch.edcs_transactions.push(record);
    }
    rows = engine.results;
  }

  run.finished_at = now();
  batch.edcs_sync_runs.push(run);
  await repo.commit(scope, batch);
  audits.unshift({
    event_type: "edcs.register_imported", aggregate_type: "EdcsSyncRun", aggregate_id: run.id,
    payload: { run_number: runNumber, status: run.status, file_id: file.id, filename: file.filename, source_sha256: file.sha256, counts: run.counts, rows_total: run.rows_total, file_outcome: run.file_outcome },
    summary: run.status === "REJECTED" ? `Register ${file.filename} rejected (${run.file_outcome.reason}); no rows processed.` : `Register ${file.filename} imported: ${run.counts.CREATED} created, ${run.counts.UPDATED} updated, ${run.counts.REVISED} revised, ${run.counts.UNCHANGED} unchanged, ${run.counts.REJECTED} rejected, ${run.counts.CONFLICT} conflicts, ${run.counts.ROW_MISSING} missing.`
  });
  await recordAudit(scope, actor, audits);
  return {
    run,
    rows: [...rows.map(compactRow), ...missing.map((id) => compactRow({ transaction_id: id, outcome: "ROW_MISSING", reasons: ["ROW_NOT_IN_SOURCE"] }))],
    file_outcome: run.file_outcome
  };
}

// ---------------- number authority (CE-S4) ----------------

// Reserve the next Transaction ID. Any verified human member of the firm may reserve (that is the point:
// several people, one authority); voiding is the owner's. The number comes from the repository's atomic
// reserve (advisory lock + unique index in Postgres, the store lock in JSON).
export async function reserveNumber({ body, actor }) {
  if (actor?.actor_type !== "HUMAN") throw httpError(403, "EDCS_HUMAN_REQUIRED", "Reserving a transaction number needs a signed-in person.");
  const scope = scopeOf(body);
  const connection = await repo.getConnection(scope);
  if (!connection) throw httpError(409, "EDCS_NOT_CONNECTED", "Set up the BizKick connection (company code) before reserving numbers.");
  const checked = validateReserveRequest(body, { currentYear: new Date().getUTCFullYear() });
  if (!checked.ok) throw httpError(400, "VALIDATION_ERROR", checked.errors.join(" "));
  const value = checked.value;
  const at = now();
  const reservation = await repo.reserveNumber(scope, { company_code: connection.company_code, document_type: value.document_type, year: value.year }, ({ sequence }) =>
    buildReservation({ id: newUuid(), tenant_id: scope.tenant_id, firm_id: scope.firm_id, company_code: connection.company_code, value, sequence, actor_id: actor.actor_id ?? null, at }));
  if (!reservation) throw httpError(409, "NUMBER_RANGE_EXHAUSTED", `All 9999 ${value.document_type} numbers for ${value.year} are used.`);
  await recordAudit(scope, actor, [{ event_type: "edcs.number_reserved", aggregate_type: "EdcsNumberReservation", aggregate_id: reservation.id, payload: { transaction_id: reservation.transaction_id, purpose: reservation.purpose, counterparty: reservation.counterparty }, summary: `Number ${reservation.transaction_id} reserved: ${reservation.purpose}.` }]);
  return { reservation };
}

// Owner cancels a RESERVED number. The row stays (status VOID), so the number is never issued again.
export async function voidNumber({ body, actor }) {
  requireOwner(actor, "Voiding a transaction number");
  const scope = scopeOf(body);
  const reason = String(body.reason ?? "").trim();
  if (reason.length < 3) throw httpError(400, "VALIDATION_ERROR", "Say why the number is being voided (reason).");
  const reservations = await repo.listReservations(scope);
  const current = reservations.find((item) => (body.transaction_id && item.transaction_id === body.transaction_id) || (body.reservation_id && item.id === body.reservation_id));
  if (!current) throw httpError(404, "NOT_FOUND", `edcs_number_reservations record not found: ${body.transaction_id ?? body.reservation_id}`);
  if (current.status !== "RESERVED") throw httpError(409, "NUMBER_NOT_VOIDABLE", `${current.transaction_id} is ${current.status}; only a RESERVED number can be voided.`);
  const timestamp = now();
  const updated = { ...current, status: "VOID", void_at: timestamp, void_by: actor.actor_id ?? null, void_reason: reason };
  await repo.commit(scope, { edcs_number_reservations: [updated] });
  await recordAudit(scope, actor, [{ event_type: "edcs.number_voided", aggregate_type: "EdcsNumberReservation", aggregate_id: updated.id, payload: { transaction_id: updated.transaction_id, reason }, summary: `Number ${updated.transaction_id} voided: ${reason}. It will not be issued again.` }]);
  return { reservation: updated };
}

// The Number Desk: reservations (filters: status, type, year), the "reserved but not registered" list, and the
// next number per type/year.
const numberTypes = () => Object.entries(EDCS_DOCUMENT_TYPES).map(([code, type]) => ({ code, name: type.name }));

export async function listNumbers({ scope, params }) {
  const connection = await repo.getConnection(scope);
  if (!connection) return { connected: false, types: numberTypes(), company_code: null, reservations: [], stale: [], heads: [], counts: { RESERVED: 0, REGISTERED: 0, VOID: 0 }, stale_days: DEFAULT_STALE_DAYS, as_of: validAsOf(params?.get?.("as_of")) };
  const all = await repo.listReservations(scope);
  const transactions = await repo.listTransactions(scope);
  const asOf = validAsOf(params?.get?.("as_of"));
  const staleDaysParam = params?.get?.("stale_days");
  const staleDaysRaw = staleDaysParam === null || staleDaysParam === undefined || staleDaysParam === "" ? NaN : Number(staleDaysParam);
  const staleDays = Number.isInteger(staleDaysRaw) && staleDaysRaw >= 0 && staleDaysRaw <= 365 ? staleDaysRaw : DEFAULT_STALE_DAYS;
  const status = params?.get?.("status") || null;
  const type = params?.get?.("type") || null;
  const year = params?.get?.("year") ? Number(params.get("year")) : null;
  const reservations = all.filter((item) => (!status || item.status === status) && (!type || item.document_type === type) && (!year || item.year === year));
  const counts = { RESERVED: 0, REGISTERED: 0, VOID: 0 };
  for (const item of all) counts[item.status] = (counts[item.status] ?? 0) + 1;
  return {
    connected: true, types: numberTypes(), company_code: connection.company_code, reservations,
    stale: staleReservations(all, asOf, staleDays), stale_days: staleDays, as_of: asOf,
    heads: sequenceHeads({ reservations: all, transactions, company_code: connection.company_code }), counts
  };
}

// ---------------- reads ----------------

function decorate(record, asOf) {
  return { ...record, alert: computeEdcsAlert(record, asOf), days_to_due: daysToDue(record, asOf), content_policy_default: EDCS_DOCUMENT_TYPES[record.document_type]?.content ?? null };
}

function validAsOf(value) {
  if (value === undefined || value === null || value === "") return todayUtc();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value)) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) throw httpError(400, "VALIDATION_ERROR", "as_of must be a date like 2026-10-05.");
  return String(value);
}

export async function listTransactions({ scope, params }) {
  const asOf = validAsOf(params.get("as_of"));
  const all = (await repo.listTransactions(scope)).map((record) => decorate(record, asOf));
  const type = params.get("type");
  const status = params.get("status");
  const alert = params.get("alert");
  const flag = params.get("flag");
  const search = String(params.get("search") ?? "").trim().toLowerCase();
  const transactions = all.filter((record) => {
    if (type && record.document_type !== type) return false;
    if (status && record.status !== status) return false;
    if (alert && record.alert.toLowerCase() !== alert.toLowerCase()) return false;
    if (flag === "conflict" && !record.held_conflict) return false;
    if (flag === "row_missing" && !record.flags?.row_missing) return false;
    if (flag === "duplicate" && !record.flags?.duplicate) return false;
    if (search && ![record.transaction_id, record.counterparty_name, record.subject, record.external_ref, record.owner].some((value) => String(value ?? "").toLowerCase().includes(search))) return false;
    return true;
  }).sort((a, b) => a.transaction_id.localeCompare(b.transaction_id));
  const countBy = (list, key) => list.reduce((acc, record) => { acc[record[key]] = (acc[record[key]] ?? 0) + 1; return acc; }, {});
  return {
    as_of: asOf,
    total_all: all.length,
    total: transactions.length,
    summary: { by_alert: countBy(all, "alert"), by_status: countBy(all, "status"), conflicts: all.filter((r) => r.held_conflict).length, row_missing: all.filter((r) => r.flags?.row_missing).length },
    transactions
  };
}

const normalizeName = (value) => String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

async function counterpartySuggestions(scope, record) {
  if (!record.counterparty_name || record.counterparty_link) return [];
  const store = await readStore(scope.tenant_id);
  const wanted = normalizeName(record.counterparty_name);
  const matches = [];
  for (const client of store.clients ?? []) {
    if (client.tenant_id !== scope.tenant_id || client.firm_id !== scope.firm_id) continue;
    const name = normalizeName(client.name);
    if (!name || !wanted) continue;
    if (name === wanted) matches.push({ link_type: "CLIENT", client_id: client.id, name: client.name, match: "EXACT" });
    else if (name.includes(wanted) || wanted.includes(name)) matches.push({ link_type: "CLIENT", client_id: client.id, name: client.name, match: "PARTIAL" });
  }
  return matches.sort((a, b) => (a.match === b.match ? 0 : a.match === "EXACT" ? -1 : 1)).slice(0, 5);
}

export async function readTransaction({ scope, transactionId, params }) {
  const asOf = validAsOf(params?.get("as_of"));
  const record = await repo.getTransaction(scope, transactionId);
  if (!record) throw httpError(404, "NOT_FOUND", `edcs_transactions record not found: ${transactionId}`);
  const documents = await documentHistory(scope, transactionId);
  const chain = chainForTransaction(await repo.listTransactions(scope), transactionId);
  return {
    as_of: asOf,
    transaction: decorate(record, asOf),
    documents,
    chain,
    revisions: await repo.listRevisions(scope, transactionId),
    events: await repo.listEvents(scope, { transaction_id: transactionId }),
    counterparty_suggestions: await counterpartySuggestions(scope, record)
  };
}

export async function listSyncRuns({ scope }) {
  return { runs: await repo.listRuns(scope) };
}

export async function readSyncRun({ scope, runId }) {
  const run = await repo.getRun(scope, runId);
  if (!run) throw httpError(404, "NOT_FOUND", `edcs_sync_runs record not found: ${runId}`);
  return { run, events: await repo.listEvents(scope, { run_id: runId }) };
}

export async function listConflicts({ scope }) {
  const asOf = todayUtc();
  const conflicts = (await repo.listTransactions(scope)).filter((record) => record.held_conflict).map((record) => decorate(record, asOf));
  return { conflicts };
}

// ---------------- owner decisions ----------------

export async function resolveConflict({ body, actor }) {
  requireOwner(actor, "Resolving a BizKick conflict");
  const scope = scopeOf(body);
  const choose = body.choose;
  if (!["KEEP_CURRENT", "ACCEPT_INCOMING"].includes(choose)) throw httpError(400, "VALIDATION_ERROR", "choose must be KEEP_CURRENT or ACCEPT_INCOMING.");
  const note = String(body.note ?? "").trim();
  if (!note) throw httpError(400, "VALIDATION_ERROR", "A note explaining the decision is required.");
  const current = await repo.getTransaction(scope, body.transaction_id);
  if (!current) throw httpError(404, "NOT_FOUND", `edcs_transactions record not found: ${body.transaction_id}`);
  if (!current.held_conflict) throw httpError(409, "EDCS_NO_HELD_CONFLICT", `Transaction ${current.transaction_id} has no held conflict to resolve.`);
  const timestamp = now();
  const held = current.held_conflict;
  const record = cloneRecord(current);
  const batch = { edcs_transactions: [record], edcs_transaction_revisions: [], edcs_sync_events: [] };
  let changes = {};
  if (choose === "ACCEPT_INCOMING") {
    const fields = held.incoming;
    const fingerprint = rowFingerprint(fields);
    const changed = Object.keys(fields).filter((name) => (record[name] ?? null) !== (fields[name] ?? null));
    changes = describeChanges(current, fields, changed);
    Object.assign(record, fields);
    record.state = EDCS_STATUSES[fields.status].state;
    record.row_fingerprint = fingerprint;
    record.revision_count = (current.revision_count ?? 1) + 1;
    batch.edcs_transaction_revisions.push({ id: newUuid(), tenant_id: scope.tenant_id, firm_id: scope.firm_id, transaction_id: record.transaction_id, seq: record.revision_count, revision: fields.revision, kind: "CONFLICT_ACCEPTED", row_fingerprint: fingerprint, snapshot: fields, run_id: held.run_id, row_number: held.row_number, resolution_note: note, created_at: timestamp });
  }
  record.conflict_history = [...(record.conflict_history ?? []), { held_run_id: held.run_id, reasons: held.reasons, resolution: choose, note, resolved_at: timestamp, resolved_by: actor.actor_id ?? null }];
  record.held_conflict = null;
  record.updated_at = timestamp;
  batch.edcs_sync_events.push({
    id: newUuid(), tenant_id: scope.tenant_id, firm_id: scope.firm_id, run_id: null, run_number: 0, row_number: null, transaction_id: record.transaction_id,
    outcome: choose === "KEEP_CURRENT" ? "CONFLICT_KEPT_CURRENT" : "CONFLICT_ACCEPTED_INCOMING", reasons: held.reasons, reason_details: held.reason_details ?? [], warnings: [], changed_fields: Object.keys(changes),
    changes, before_fingerprint: current.row_fingerprint, after_fingerprint: record.row_fingerprint, raw: null, note, at: timestamp
  });
  await repo.commit(scope, batch);
  await recordAudit(scope, actor, [{
    event_type: "edcs.conflict_resolved", aggregate_type: "EdcsTransaction", aggregate_id: record.id,
    payload: { transaction_id: record.transaction_id, choose, note, reasons: held.reasons, held_run_id: held.run_id, changes },
    summary: `Owner resolved the conflict on ${record.transaction_id}: ${choose === "KEEP_CURRENT" ? "kept the vFirm record" : "accepted the incoming BizKick row"}.`
  }]);
  return { transaction: decorate(record, todayUtc()) };
}

export async function linkCounterparty({ body, actor }) {
  requireOwner(actor, "Linking a counterparty");
  const scope = scopeOf(body);
  const record = await repo.getTransaction(scope, body.transaction_id);
  if (!record) throw httpError(404, "NOT_FOUND", `edcs_transactions record not found: ${body.transaction_id}`);
  const linkType = body.link_type;
  if (!["CLIENT", "SUPPLIER", "NONE"].includes(linkType)) throw httpError(400, "VALIDATION_ERROR", "link_type must be CLIENT, SUPPLIER or NONE.");
  const timestamp = now();
  let link = null;
  if (linkType === "CLIENT") {
    const store = await readStore(scope.tenant_id);
    const client = (store.clients ?? []).find((item) => item.id === body.client_id && item.tenant_id === scope.tenant_id && item.firm_id === scope.firm_id);
    if (!client) throw httpError(404, "NOT_FOUND", `clients record not found: ${body.client_id}`);
    link = { link_type: "CLIENT", client_id: client.id, name: client.name };
  } else if (linkType === "SUPPLIER") {
    const name = String(body.supplier_name ?? "").trim();
    if (!name) throw httpError(400, "VALIDATION_ERROR", "supplier_name is required to confirm a supplier link (vFirm has no supplier master yet, so the confirmed name is recorded as the link).");
    link = { link_type: "SUPPLIER", client_id: null, name };
  }
  const updated = cloneRecord(record);
  const previous = record.counterparty_link;
  updated.counterparty_link = link ? { ...link, confirmed_by_actor_id: actor.actor_id ?? null, confirmed_at: timestamp, note: String(body.note ?? "").trim() || null } : null;
  updated.updated_at = timestamp;
  await repo.commit(scope, { edcs_transactions: [updated] });
  await recordAudit(scope, actor, [{
    event_type: link ? "edcs.counterparty_linked" : "edcs.counterparty_unlinked", aggregate_type: "EdcsTransaction", aggregate_id: updated.id,
    payload: { transaction_id: updated.transaction_id, counterparty_name: updated.counterparty_name, link: link ? { link_type: link.link_type, client_id: link.client_id, name: link.name } : null, previous: previous ? { link_type: previous.link_type, client_id: previous.client_id, name: previous.name } : null },
    summary: link ? `Owner confirmed ${updated.transaction_id}'s counterparty as ${link.link_type.toLowerCase()} ${link.name}.` : `Owner removed the counterparty link on ${updated.transaction_id}.`
  }]);
  return { transaction: decorate(updated, todayUtc()) };
}


// ---------------- file linking and document history (CE-S2) ----------------

function fileClassificationFor(documentType) {
  const type = EDCS_DOCUMENT_TYPES[documentType];
  if (!type) return "CLIENT_CONFIDENTIAL";
  if (type.module === "HR" || type.classification === "Restricted") return "HR_RESTRICTED";
  if (type.module === "Finance") return "FINANCE_RESTRICTED";
  if (type.classification === "Internal") return "FIRM_INTERNAL";
  return "CLIENT_CONFIDENTIAL";
}

// The revision history of the file(s) filed under a transaction, newest first, from the firm's
// document register. Download availability follows the content policy actually applied.
async function documentHistory(scope, transactionId) {
  const { entry, revisions, files } = await findEdcsDocumentState(scope, transactionId);
  if (!entry) return { linked: false, document: null, revisions: [], attachments: [], current_revision: null };
  const fileById = new Map(files.map((file) => [file.id, file]));
  const describe = (revision) => {
    const file = fileById.get(revision.metadata?.file_id) ?? null;
    return {
      revision_id: revision.id, revision: revision.revision, status: revision.status, role: revision.metadata?.role ?? "PRIMARY",
      supersedes_revision_id: revision.supersedes_revision_id ?? null,
      content_hash: revision.content_hash, filed_at: revision.created_at, method: revision.metadata?.method ?? null, note: revision.metadata?.note ?? null,
      file_id: file?.id ?? null, filename: file?.filename ?? revision.metadata?.filename ?? null, size_bytes: file?.size_bytes ?? null,
      content_stored: file ? file.status === "STORED" : false, downloadable: file ? file.status === "STORED" : false
    };
  };
  const all = revisions.map(describe);
  const list = all.filter((item) => item.role !== "SUPPORTING").reverse();
  const attachments = all.filter((item) => item.role === "SUPPORTING").reverse();
  return {
    linked: true,
    document: { id: entry.id, document_number: entry.document_number, title: entry.title, classification: entry.classification, content_policy: entry.metadata?.content_policy ?? null },
    revisions: list,
    attachments,
    current_revision: list.find((item) => item.revision_id === entry.current_revision_id) ?? null
  };
}

const documentsSummary = (history) => history.linked ? {
  linked: true, document_entry_id: history.document.id, attachment_count: history.attachments?.length ?? 0, current_revision: history.current_revision?.revision ?? null, revision_count: history.revisions.length,
  content_stored: history.current_revision?.content_stored ?? false, filename: history.current_revision?.filename ?? null, sha256: history.current_revision?.content_hash ?? null,
  last_filed_at: history.current_revision?.filed_at ?? null
} : { linked: false };

// One uploaded file. `storeBytes` is supplied by the route layer ({file_id, filename, mime_type, buffer} ->
// {storage_backend, storage_key}) so this module stays storage-agnostic. Outcomes:
//   LINKED / REVISED / UNCHANGED   filed in the register (the owner's own register entry for this ID)
//   UNMATCHED                      no Transaction ID in the file name (nothing stored; owner can link by hand)
//   ORPHAN                         ID found but the transaction is not in the imported register (nothing stored)
//   WRONG_COMPANY / UNKNOWN_TYPE   well-formed ID that does not belong to this firm's connection
export async function linkEdcsFile({ scope: scopeInput, actor, filename, mime_type, buffer, transaction_id, role = "PRIMARY", storeBytes }) {
  requireOwner(actor, "Linking a file to a BizKick transaction");
  const scope = scopeOf(scopeInput);
  const connection = await repo.getConnection(scope);
  if (!connection) throw httpError(409, "EDCS_NOT_CONNECTED", "Set up the BizKick connection (company code) before linking files.");
  if (!["PRIMARY", "SUPPORTING"].includes(role)) throw httpError(400, "VALIDATION_ERROR", "role must be PRIMARY or SUPPORTING.");
  const sha256 = sha256Hex(buffer);
  const base = { filename, size_bytes: buffer.length, sha256 };
  let method = "FILENAME";
  let revisionHint = null;
  let id = null;
  const manual = String(transaction_id ?? "").trim();
  if (manual) {
    method = "MANUAL";
    id = manual.toUpperCase();
    revisionHint = revisionLabelFromFilename(filename);
    const parsed = extractTransactionId(id, connection.company_code);
    if (parsed.status !== "FOUND" || parsed.transaction_id !== id) return { ...base, outcome: "UNMATCHED", reason: "TRANSACTION_ID_INVALID", detail: `${manual} is not a Transaction ID for company ${connection.company_code}.` };
  } else {
    const found = extractTransactionId(filename, connection.company_code);
    if (found.status === "NONE") return { ...base, outcome: "UNMATCHED", reason: "NO_TRANSACTION_ID", detail: "No Transaction ID in the file name." };
    if (found.status === "WRONG_COMPANY") return { ...base, outcome: "WRONG_COMPANY", reason: "WRONG_COMPANY", detail: `The ID carries company code ${found.company_code}, but this firm's connection is ${connection.company_code}.` };
    if (found.status === "UNKNOWN_TYPE") return { ...base, outcome: "UNKNOWN_TYPE", reason: "UNKNOWN_TYPE", detail: `${found.document_type} is not one of the contract document types.` };
    id = found.transaction_id;
    revisionHint = revisionLabelFromFilename(found.remainder);
  }
  const record = await repo.getTransaction(scope, id);
  if (!record) return { ...base, outcome: "ORPHAN", transaction_id: id, reason: "TRANSACTION_NOT_IN_REGISTER", detail: `${id} is not in the imported register. Import the register first, or check the file name.` };

  const policy = effectiveContentPolicy(record.document_type, connection);
  const contentStored = policy === "CONTENT";
  const fileId = newFileId();
  let stored = { storage_backend: "NONE", storage_key: null };
  const state = await findEdcsDocumentState(scope, id);
  const current = state.entry ? state.revisions.find((revision) => revision.id === state.entry.current_revision_id) : null;
  const identical = role === "SUPPORTING"
    ? state.revisions.some((revision) => revision.metadata?.role === "SUPPORTING" && revision.content_hash === sha256)
    : current && current.content_hash === sha256;
  if (contentStored && !identical) stored = await storeBytes({ file_id: fileId, filename, mime_type, buffer });
  const result = await registerEdcsFileRevisionRecord({
    tenant_id: scope.tenant_id, firm_id: scope.firm_id,
    transaction: { transaction_id: id, document_type: record.document_type, title: `${EDCS_DOCUMENT_TYPES[record.document_type].name} ${id}${record.subject ? ` - ${record.subject}` : ""}` },
    file: { file_id: fileId, filename, mime_type, size_bytes: buffer.length, sha256, storage_backend: stored.storage_backend, storage_key: stored.storage_key, classification: fileClassificationFor(record.document_type) },
    content_stored: contentStored, revision_label: revisionHint ?? record.revision ?? null, method, note: null, role
  }, actor);

  const history = await documentHistory(scope, id);
  if (result.outcome !== "UNCHANGED") {
    const updated = cloneRecord(record);
    updated.documents = documentsSummary(history);
    updated.updated_at = now();
    await repo.commit(scope, { edcs_transactions: [updated] });
  }
  return {
    ...base, outcome: result.outcome, transaction_id: id, document_type: record.document_type, method, role,
    revision: result.revision?.revision ?? null, superseded_revision: result.previous_revision?.revision ?? null,
    content_policy: policy, content_stored: contentStored, file_id: result.file?.id ?? null, document_entry_id: result.document?.id ?? null
  };
}

export async function listEdcsChains({ scope }) {
  const transactions = await repo.listTransactions(scope);
  const { chains, flags } = buildTransactionChains(transactions);
  return { total_transactions: transactions.length, chains: chains.filter((chain) => !chain.trivial), flags, standalone: chains.filter((chain) => chain.trivial).length };
}

export async function readEdcsDocuments({ scope, transactionId }) {
  return documentHistory(scope, transactionId);
}

// ---------------- tenant export ----------------

export async function readEdcsExportCollections(scope) {
  return repo.exportCollections(scope);
}

export { EDCS_COLLECTIONS };
