// CE-S6 (ADR-101, 2026-10-06): the Connected EDCS connector service -- the identity, health and delivery
// endpoints behind apps/edcs-connector.
//
// Golden rule: BizKick is the source, the Bridge is the contract, vFirm is the governed record. The connector
// only ever READS BizKick folders; this module is what it talks to.
//
// Identity: a firm owner registers a connector and is shown its token ONCE. Only the SHA-256 of the token is
// stored (edcs_connectors, migration 0054). The owner can rotate the token (the old one stops working at once)
// or revoke the connector (every later call is refused and counted, and the console shows it as revoked).
// Every sync a connector delivers is attributed to the connector's id in the sync run and the audit trail.
//
// Delivery: the connector parses the register locally with the shared reader and sends only the rows that
// changed (a DELTA) plus the identities of the whole file. The rows are judged by the same engine as an
// uploaded register (applyRegisterRun in edcs-service.mjs), so the outcomes are exactly CE-S1's. A delivery
// carries an idempotency key; delivering the same key again returns the first result and changes nothing, which
// is what makes the connector's offline queue safe to retry.

import { createHash, randomBytes } from "node:crypto";
import { appendEventAndAudit, newUuid, now, systemActor, withStore } from "./store.mjs";
import { edcsRepository as repo } from "./edcs-repository.mjs";
import { applyRegisterRun, linkEdcsFile } from "./edcs-service.mjs";
import { EDCS_DOCUMENT_TYPES, REGISTER_COLUMNS, REGISTER_FIRST_DATA_ROW, effectiveContentPolicy } from "../../../packages/core-domain/src/edcs-register.mjs";
import { isFirmOwner } from "./edcs-owner.mjs";

export const CONNECTOR_TOKEN_PREFIX = "vfc_";
const MAX_ACTIVE_CONNECTORS = 10;
const MAX_DELTA_ROWS = 5000;
const MAX_PRESENT_ROWS = 20000;
const DEFAULT_STALE_SECONDS = 600;

function httpError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function requireOwner(actor, action) {
  if (!isFirmOwner(actor)) throw httpError(403, "EDCS_OWNER_REQUIRED", `${action} requires the firm owner.`);
}

const scopeOf = (source) => ({ tenant_id: source.tenant_id, firm_id: source.firm_id });
const hashToken = (token) => createHash("sha256").update(token).digest("hex");
const newToken = () => `${CONNECTOR_TOKEN_PREFIX}${randomBytes(24).toString("base64url")}`;
const clip = (value, max) => (typeof value === "string" ? value.slice(0, max) : null);
const wholeNumber = (value, min, max, fallback = 0) => (Number.isInteger(value) && value >= min && value <= max ? value : fallback);

async function recordAudit(scope, actor, events) {
  if (!events.length) return;
  await withStore((store) => {
    for (const event of events) appendEventAndAudit(store, { actor, tenant_id: scope.tenant_id, firm_id: scope.firm_id, ...event });
  }, { tenantId: scope.tenant_id, ledger: false });
}

// ---------------- the console's view of a connector ----------------

export function connectorHealth(record, asOf = Date.now()) {
  if (record.status === "REVOKED") return "REVOKED";
  if (!record.last_seen_at) return "NEVER_SEEN";
  const staleAfter = Math.max(DEFAULT_STALE_SECONDS, 3 * (record.heartbeat_interval_seconds ?? 60)) * 1000;
  if (asOf - Date.parse(record.last_seen_at) > staleAfter) return "STALE";
  if (record.last_error) return "ERRORS";
  return "OK";
}

function publicView(record, asOf) {
  const { token_hash, ...rest } = record;
  return { ...rest, health: connectorHealth(record, asOf) };
}

export async function listConnectors({ scope }) {
  const asOf = Date.now();
  return { connectors: (await repo.listConnectors(scope)).map((record) => publicView(record, asOf)) };
}

// ---------------- owner: issue / rotate / revoke ----------------

export async function issueConnector({ body, actor }) {
  requireOwner(actor, "Registering a connector");
  const scope = scopeOf(body);
  const connection = await repo.getConnection(scope);
  if (!connection) throw httpError(409, "EDCS_NOT_CONNECTED", "Set up the BizKick connection (company code) before registering a connector.");
  const name = String(body.name ?? "").trim();
  if (!name || name.length > 80) throw httpError(400, "VALIDATION_ERROR", "A connector needs a name of 1 to 80 characters.");
  const topology = body.topology === undefined || body.topology === null || body.topology === "" ? (connection.topology ?? "A") : String(body.topology).toUpperCase();
  if (!["A", "C"].includes(topology)) throw httpError(400, "VALIDATION_ERROR", "topology must be A (BizKick on the connector's own PC) or C (a shared folder reached by UNC path).");
  const existing = await repo.listConnectors(scope);
  if (existing.filter((record) => record.status === "ACTIVE").length >= MAX_ACTIVE_CONNECTORS) throw httpError(409, "EDCS_CONNECTOR_LIMIT", `A firm can have at most ${MAX_ACTIVE_CONNECTORS} active connectors. Revoke one first.`);
  const token = newToken();
  const timestamp = now();
  const record = {
    id: newUuid(), tenant_id: scope.tenant_id, firm_id: scope.firm_id, name, topology,
    status: "ACTIVE", token_hash: hashToken(token), token_prefix: token.slice(0, 12),
    created_at: timestamp, created_by: actor.actor_id ?? null, rotated_at: null, revoked_at: null, revoked_by: null,
    last_seen_at: null, last_sync_at: null, last_file_at: null, last_run_id: null, last_run_number: null, last_run_status: null, last_counts: null,
    heartbeat_interval_seconds: 60, queue_length: 0, error_count: 0, last_error: null, last_error_at: null,
    refused_count: 0, last_refused_at: null, agent_version: null, host: null, updated_at: timestamp
  };
  await repo.commit(scope, { edcs_connectors: [record] });
  await recordAudit(scope, actor, [{
    event_type: "edcs.connector_issued", aggregate_type: "EdcsConnector", aggregate_id: record.id,
    payload: { connector_id: record.id, name, topology, token_prefix: record.token_prefix },
    summary: `Connector "${name}" registered (topology ${topology}).`
  }]);
  return { connector: publicView(record), token, token_notice: "Copy this token now. It is shown once and cannot be recovered; rotate the connector if it is lost." };
}

async function ownedConnector(body) {
  const scope = scopeOf(body);
  const record = await repo.getConnector(scope, String(body.connector_id ?? ""));
  if (!record) throw httpError(404, "NOT_FOUND", `edcs_connectors record not found: ${body.connector_id}`);
  return { scope, record };
}

export async function rotateConnector({ body, actor }) {
  requireOwner(actor, "Rotating a connector token");
  const { scope, record } = await ownedConnector(body);
  if (record.status === "REVOKED") throw httpError(409, "EDCS_CONNECTOR_REVOKED", "A revoked connector cannot be rotated. Register a new one.");
  const token = newToken();
  const next = { ...record, token_hash: hashToken(token), token_prefix: token.slice(0, 12), rotated_at: now(), updated_at: now() };
  await repo.commit(scope, { edcs_connectors: [next] });
  await recordAudit(scope, actor, [{
    event_type: "edcs.connector_rotated", aggregate_type: "EdcsConnector", aggregate_id: record.id,
    payload: { connector_id: record.id, name: record.name, token_prefix: next.token_prefix },
    summary: `Connector "${record.name}" token rotated; the previous token no longer works.`
  }]);
  return { connector: publicView(next), token, token_notice: "Copy this token now. It is shown once and the previous token has stopped working." };
}

export async function revokeConnector({ body, actor }) {
  requireOwner(actor, "Revoking a connector");
  const { scope, record } = await ownedConnector(body);
  if (record.status === "REVOKED") return { connector: publicView(record) };
  const next = { ...record, status: "REVOKED", revoked_at: now(), revoked_by: actor.actor_id ?? null, updated_at: now() };
  await repo.commit(scope, { edcs_connectors: [next] });
  await recordAudit(scope, actor, [{
    event_type: "edcs.connector_revoked", aggregate_type: "EdcsConnector", aggregate_id: record.id,
    payload: { connector_id: record.id, name: record.name },
    summary: `Connector "${record.name}" revoked; its token is refused from now on.`
  }]);
  return { connector: publicView(next) };
}

// ---------------- connector: authenticate, heartbeat ----------------

// The route layer calls this with the raw token from the x-vfirm-connector-token header. It either returns the
// ACTIVE connector record (with its firm scope) or throws 401.
export async function authenticateConnector(token) {
  const raw = typeof token === "string" ? token.trim() : "";
  if (!raw.startsWith(CONNECTOR_TOKEN_PREFIX) || raw.length < 20 || raw.length > 200) throw httpError(401, "CONNECTOR_TOKEN_INVALID", "A valid connector token is required.");
  const record = await repo.findConnectorByTokenHash(hashToken(raw));
  if (!record) throw httpError(401, "CONNECTOR_TOKEN_INVALID", "A valid connector token is required.");
  if (record.status === "REVOKED") {
    // Count the refused attempt so the console can show that a revoked connector is still knocking.
    const current = await repo.getConnector(scopeOf(record), record.id);
    if (current) await repo.commit(scopeOf(record), { edcs_connectors: [{ ...current, refused_count: (current.refused_count ?? 0) + 1, last_refused_at: now(), updated_at: now() }] });
    throw httpError(401, "CONNECTOR_REVOKED", "This connector has been revoked by the firm owner.");
  }
  return record;
}

async function updateConnector(connector, patch) {
  const scope = scopeOf(connector);
  const current = (await repo.getConnector(scope, connector.id)) ?? connector;
  const next = { ...current, ...patch, updated_at: now() };
  await repo.commit(scope, { edcs_connectors: [next] });
  return next;
}

export async function recordHeartbeat({ connector, body }) {
  const scope = scopeOf(connector);
  const next = await updateConnector(connector, {
    last_seen_at: now(),
    agent_version: clip(body.agent_version, 40),
    host: clip(body.host, 120),
    heartbeat_interval_seconds: wholeNumber(body.heartbeat_interval_seconds, 5, 3600, 60),
    queue_length: wholeNumber(body.queue_length, 0, 1000000, 0),
    error_count: wholeNumber(body.error_count, 0, 1000000, 0),
    last_error: clip(body.last_error, 500),
    last_error_at: body.last_error ? (clip(body.last_error_at, 40) ?? now()) : null
  });
  const connection = await repo.getConnection(scope);
  const contentPolicy = connection ? Object.fromEntries(Object.keys(EDCS_DOCUMENT_TYPES).map((code) => [code, effectiveContentPolicy(code, connection)])) : null;
  return {
    server_time: now(), connector_id: next.id, name: next.name, status: next.status, health: connectorHealth(next),
    connection: connection ? { company_code: connection.company_code, topology: connection.topology ?? null, content_policy: contentPolicy } : null
  };
}

// ---------------- connector: deliver register rows and files ----------------

function validateDelivery(body) {
  const problems = [];
  const filename = clip(body.filename, 255);
  if (!filename) problems.push("filename");
  if (!/^[0-9a-f]{64}$/.test(String(body.sha256 ?? ""))) problems.push("sha256");
  if (!Number.isInteger(body.size_bytes) || body.size_bytes < 0) problems.push("size_bytes");
  const key = clip(body.idempotency_key, 200);
  if (!key || key.length < 8) problems.push("idempotency_key");
  let parsed;
  let present = null;
  if (body.structure_error && typeof body.structure_error === "object") {
    const reason = String(body.structure_error.reason ?? "");
    if (!["STRUCTURE_CHANGED", "FILE_UNREADABLE"].includes(reason)) problems.push("structure_error.reason");
    parsed = { ok: false, reason, detail: clip(body.structure_error.detail, 500) ?? "", expected: body.structure_error.expected ?? null, found: body.structure_error.found ?? null, column: clip(body.structure_error.column, 4) };
  } else {
    if (!Array.isArray(body.rows) || body.rows.length > MAX_DELTA_ROWS) problems.push(`rows (an array of at most ${MAX_DELTA_ROWS})`);
    if (!Array.isArray(body.present) || body.present.length > MAX_PRESENT_ROWS) problems.push(`present (an array of at most ${MAX_PRESENT_ROWS})`);
    if (!problems.length) {
      const rows = [];
      for (const row of body.rows) {
        if (!Number.isInteger(row?.row_number) || row.row_number < REGISTER_FIRST_DATA_ROW || !Array.isArray(row?.cells) || row.cells.length !== REGISTER_COLUMNS.length) { problems.push("rows[] must be { row_number >= 7, cells: 24 values }"); break; }
        rows.push({ row_number: row.row_number, cells: row.cells.map((cell) => (cell === null || cell === undefined ? "" : String(cell))) });
      }
      present = [];
      for (const entry of body.present) {
        if (!Array.isArray(entry) || typeof entry[0] !== "string" || !Number.isInteger(entry[1])) { problems.push("present[] must be [transaction_id, row_number]"); break; }
        present.push([entry[0], entry[1]]);
      }
      parsed = { ok: true, rows };
    }
  }
  if (problems.length) throw httpError(400, "VALIDATION_ERROR", `Invalid sync delivery: ${problems.join("; ")}.`);
  return { filename, key, source: { file_id: null, filename, sha256: body.sha256, size_bytes: body.size_bytes }, parsed, present };
}

export async function syncRegister({ connector, body }) {
  const scope = scopeOf(connector);
  const delivery = validateDelivery(body ?? {});
  const connection = await repo.getConnection(scope);
  if (!connection) throw httpError(409, "EDCS_NOT_CONNECTED", "The firm has no BizKick connection; the owner must set up the company code first.");

  // Idempotency: the same delivery key never produces a second run.
  const prior = (await repo.listRuns(scope)).find((run) => run.idempotency_key === delivery.key);
  if (prior) return { duplicate_delivery: true, run: prior, rows: [], file_outcome: prior.file_outcome };

  const result = await applyRegisterRun({
    scope, connection, actor: systemActor(scope.tenant_id, scope.firm_id), parsed: delivery.parsed, source: delivery.source,
    context: delivery.parsed.ok ? { present: delivery.present } : null, connector, idempotencyKey: delivery.key
  });
  await updateConnector(connector, {
    last_sync_at: now(), last_run_id: result.run.id, last_run_number: result.run.run_number, last_run_status: result.run.status, last_counts: result.run.counts
  });
  return { duplicate_delivery: false, ...result };
}

// A file the connector found in a controlled folder. `content_base64` is present only if the connector decided
// (from the content policy in its last heartbeat) that the bytes may be sent; the server decides again.
export async function syncFile({ connector, body, storeBytes }) {
  const scope = scopeOf(connector);
  const filename = clip(body?.filename, 255);
  if (!filename) throw httpError(400, "VALIDATION_ERROR", "filename is required.");
  const buffer = typeof body.content_base64 === "string" && body.content_base64 ? Buffer.from(body.content_base64, "base64") : null;
  const outcome = await linkEdcsFile({
    scope, actor: systemActor(scope.tenant_id, scope.firm_id), connector, filename, mime_type: clip(body.mime_type, 120) ?? "application/octet-stream",
    buffer, meta: buffer ? null : { sha256: body.sha256, size_bytes: body.size_bytes },
    transaction_id: body.transaction_id ?? null, role: body.role ?? "PRIMARY", storeBytes
  });
  await updateConnector(connector, { last_file_at: now() });
  return outcome;
}
