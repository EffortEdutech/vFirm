// CE-S7 (ADR-106, 2026-10-08): Connected EDCS over Microsoft 365 -- the cloud adapter (Topology B).
//
// Golden rule: BizKick is the source, the Bridge is the contract, vFirm is the governed record. When the
// BizKick folders live in OneDrive / SharePoint, vFirm reads them from Microsoft Graph instead of through a
// connector program on a PC. It READS only, it never edits a BizKick file, and what it reads goes through the
// same engine as an uploaded register (applyRegisterRun) and the same file filing (linkEdcsFile), so the
// outcomes are exactly CE-S1's and CE-S2's.
//
// Least privilege, in three layers:
//   1. Microsoft: the firm's admin gives the app ONLY the Sites.Selected permission and grants it read access
//      to one site.
//   2. vFirm: the owner names one document library (drive) and ONE folder in it. Every change Microsoft
//      reports is checked against that folder; anything outside it is ignored and never downloaded.
//   3. Only saved versions exist for Graph; Office lock files and temporary files are skipped.
//
// The app secret is stored AES-256-GCM encrypted (secret-box.mjs). If Microsoft stops accepting the app
// (consent withdrawn, secret expired), the connection moves to ACCESS_LOST, polling stops, and the console
// says so. Disconnecting wipes the encrypted secret. Short-lived access tokens are never stored.

import { appendEventAndAudit, newUuid, now, systemActor, withStore } from "./store.mjs";
import { edcsRepository as repo } from "./edcs-repository.mjs";
import { applyRegisterRun, linkEdcsFile } from "./edcs-service.mjs";
import { isFirmOwner } from "./edcs-owner.mjs";
import { effectiveContentPolicy, readRegisterFile } from "../../../packages/core-domain/src/edcs-register.mjs";
import { extractTransactionId } from "../../../packages/core-domain/src/edcs-chains.mjs";
import { TabularReadError } from "../../../packages/core-domain/src/tabular-file-reader.mjs";
import { sha256Hex, resolveAllowedMimeType, sanitizeFilename } from "./file-storage.mjs";
import { decryptSecret, encryptSecret, secretKeyConfigured } from "./secret-box.mjs";
import { GraphError, createGraphClient, isGuid, isMicrosoftTenant, isSafeId } from "./graph-client.mjs";

const MAX_REGISTER_BYTES = 12 * 1024 * 1024;
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const LEASE_SECONDS = 300;
const MAX_CONTROLLED = 12;

function httpError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}
const requireOwner = (actor, action) => { if (!isFirmOwner(actor)) throw httpError(403, "EDCS_OWNER_REQUIRED", `${action} requires the firm owner.`); };
const scopeOf = (source) => ({ tenant_id: source.tenant_id, firm_id: source.firm_id });
const clip = (value, max) => String(value ?? "").trim().slice(0, max);

async function recordAudit(scope, actor, events) {
  if (!events.length) return;
  await withStore((store) => {
    for (const event of events) appendEventAndAudit(store, { actor, tenant_id: scope.tenant_id, firm_id: scope.firm_id, ...event });
  }, { tenantId: scope.tenant_id, ledger: false });
}

const STATUS_TEXT = { ACTIVE: "Connected", ACCESS_LOST: "Microsoft stopped the access", DISCONNECTED: "Disconnected" };

export function publicGraphView(record) {
  if (!record) return null;
  const { secret_enc, ...rest } = record;
  return { ...rest, has_secret: Boolean(secret_enc), status_text: STATUS_TEXT[record.status] ?? record.status };
}

export async function readGraphConnection({ scope }) {
  return { graph: publicGraphView(await repo.getGraphConnection(scope)), secret_key_configured: secretKeyConfigured() };
}

// ---------------- path helpers ----------------

// "Finance/EDCS" style, no leading/trailing slash, no "..", no empty parts, no odd characters.
export function cleanFolderPath(value, { allowEmpty = false } = {}) {
  const parts = String(value ?? "").replace(/\\/g, "/").split("/").map((part) => part.trim()).filter(Boolean);
  if (!parts.length) return allowEmpty ? "" : null;
  if (parts.some((part) => part === "." || part === ".." || /[<>:"|?*\u0000-\u001f]/.test(part))) return null;
  return parts.join("/");
}
const lower = (value) => String(value).toLowerCase();
const isUnder = (path, folder) => lower(path).startsWith(`${lower(folder)}/`);

// parentReference.path looks like "/drives/<id>/root:/Folder/Sub" (or "/drive/root:/Folder"); the part after
// "root:" is the folder path. Returns "" for the library root, null if unknown.
function parentPathOf(item) {
  const raw = item?.parentReference?.path;
  if (typeof raw !== "string") return null;
  const marker = raw.indexOf("root:");
  if (marker < 0) return null;
  return raw.slice(marker + 5).replace(/^\/+/, "");
}

// ---------------- connect / disconnect ----------------

function validateConnect(body) {
  const problems = [];
  const msTenant = clip(body.ms_tenant_id, 100);
  const clientId = clip(body.client_id, 40);
  const driveId = clip(body.drive_id, 256);
  const folder = cleanFolderPath(body.folder_path);
  if (!isMicrosoftTenant(msTenant)) problems.push("ms_tenant_id (the Directory (tenant) ID, a GUID or your domain)");
  if (!isGuid(clientId)) problems.push("client_id (the Application (client) ID, a GUID)");
  if (!isSafeId(driveId)) problems.push("drive_id (the document library ID)");
  if (!folder) problems.push("folder_path (the one folder vFirm may read, for example BizKick)");
  const register = cleanFolderPath(body.register_path);
  if (!register) problems.push("register_path (the register file inside that folder, for example EDCS/register.xlsx)");
  const controlledInput = Array.isArray(body.controlled_folders) ? body.controlled_folders : [];
  if (controlledInput.length > MAX_CONTROLLED) problems.push(`controlled_folders (at most ${MAX_CONTROLLED})`);
  const controlled = [];
  for (const entry of controlledInput.slice(0, MAX_CONTROLLED)) {
    const path = cleanFolderPath(typeof entry === "string" ? entry : entry?.path);
    const role = typeof entry === "object" && entry?.role === "SUPPORTING" ? "SUPPORTING" : "PRIMARY";
    if (!path) { problems.push("controlled_folders[] must be folder paths inside the BizKick folder"); break; }
    controlled.push({ path, role });
  }
  if (problems.length) throw httpError(400, "VALIDATION_ERROR", `Invalid Microsoft 365 connection: ${problems.join("; ")}.`);
  return { msTenant, clientId, driveId, folder, register, controlled };
}

export async function connectGraph({ body, actor, graph = createGraphClient() }) {
  requireOwner(actor, "Connecting Microsoft 365");
  const scope = scopeOf(body);
  const connection = await repo.getConnection(scope);
  if (!connection) throw httpError(409, "EDCS_NOT_CONNECTED", "Set up the BizKick connection (company code) before connecting Microsoft 365.");
  const v = validateConnect(body);
  const existing = await repo.getGraphConnection(scope);

  // Secret: given now, or kept from the previous connection of the same app.
  let secretEnc;
  let plainSecret;
  const given = typeof body.client_secret === "string" ? body.client_secret.trim() : "";
  if (given) {
    if (given.length < 8 || given.length > 400) throw httpError(400, "VALIDATION_ERROR", "client_secret must be the secret VALUE from Entra (8 to 400 characters).");
    plainSecret = given;
    secretEnc = encryptSecret(given); // fails with 503 if the server key is not set
  } else if (existing?.secret_enc && existing.ms_tenant_id === v.msTenant && existing.client_id === v.clientId) {
    plainSecret = decryptSecret(existing.secret_enc);
    secretEnc = existing.secret_enc;
  } else {
    throw httpError(400, "VALIDATION_ERROR", "client_secret is required.");
  }

  // Prove it works before saving anything: sign in, then open exactly the named folder.
  let token;
  try {
    token = await graph.getToken({ msTenantId: v.msTenant, clientId: v.clientId, clientSecret: plainSecret });
    await graph.getFolder(token, v.driveId, v.folder);
  } catch (error) {
    if (!(error instanceof GraphError)) throw error;
    const map = { AUTH_FAILED: [400, "GRAPH_AUTH_FAILED"], ACCESS_DENIED: [403, "GRAPH_ACCESS_DENIED"], NOT_FOUND: [404, "GRAPH_FOLDER_NOT_FOUND"], NETWORK: [502, "GRAPH_UNREACHABLE"] };
    const [status, code] = map[error.kind] ?? [502, "GRAPH_ERROR"];
    throw httpError(status, code, error.message);
  }

  const timestamp = now();
  const sameTarget = existing && existing.drive_id === v.driveId && lower(existing.folder_path) === lower(v.folder);
  const record = {
    id: existing?.id ?? newUuid(), tenant_id: scope.tenant_id, firm_id: scope.firm_id, status: "ACTIVE",
    ms_tenant_id: v.msTenant, client_id: v.clientId, secret_enc: secretEnc, secret_hint: plainSecret.slice(0, 3) + "…",
    drive_id: v.driveId, folder_path: v.folder, register_path: v.register, controlled_folders: v.controlled,
    delta_link: sameTarget ? existing.delta_link ?? null : null, register_sha256: sameTarget ? existing.register_sha256 ?? null : null,
    created_at: existing?.created_at ?? timestamp, connected_at: timestamp, connected_by: actor.actor_id ?? null,
    disconnected_at: null, access_lost_at: null, last_sync_at: null, last_sync_status: null, last_error: null, last_error_at: null,
    error_count: 0, last_counts: null, last_run_id: null, last_run_number: null, sync_started_at: null, updated_at: timestamp,
    ...(sameTarget ? { last_sync_at: existing.last_sync_at ?? null, last_sync_status: existing.last_sync_status ?? null, last_counts: existing.last_counts ?? null, last_run_id: existing.last_run_id ?? null, last_run_number: existing.last_run_number ?? null } : {})
  };
  await repo.commit(scope, { edcs_graph_connections: [record] });
  await recordAudit(scope, actor, [{
    event_type: "edcs.graph_connected", aggregate_type: "EdcsGraphConnection", aggregate_id: record.id,
    payload: { ms_tenant_id: record.ms_tenant_id, client_id: record.client_id, drive_id: record.drive_id, folder_path: record.folder_path, register_path: record.register_path, controlled_folders: record.controlled_folders },
    summary: `Microsoft 365 connected: library folder "${record.folder_path}" (read-only).`
  }]);
  return { graph: publicGraphView(record) };
}

export async function disconnectGraph({ body, actor }) {
  requireOwner(actor, "Disconnecting Microsoft 365");
  const scope = scopeOf(body);
  const existing = await repo.getGraphConnection(scope);
  if (!existing) throw httpError(404, "NOT_FOUND", "There is no Microsoft 365 connection to disconnect.");
  if (existing.status === "DISCONNECTED") return { graph: publicGraphView(existing) };
  const timestamp = now();
  const record = { ...existing, status: "DISCONNECTED", secret_enc: null, secret_hint: null, delta_link: null, disconnected_at: timestamp, sync_started_at: null, updated_at: timestamp };
  await repo.commit(scope, { edcs_graph_connections: [record] });
  await recordAudit(scope, actor, [{
    event_type: "edcs.graph_disconnected", aggregate_type: "EdcsGraphConnection", aggregate_id: record.id,
    payload: { drive_id: record.drive_id, folder_path: record.folder_path },
    summary: "Microsoft 365 disconnected; the stored app secret was erased. Also remove the app's access in Microsoft Entra."
  }]);
  return { graph: publicGraphView(record) };
}

// ---------------- the sync ----------------

const cloudConnector = (record) => ({ id: record.id, name: "Microsoft 365", kind: "CLOUD" });

function safeMime(filename) {
  try { return resolveAllowedMimeType(filename, ""); } catch { return null; }
}

async function patchGraph(scope, record, patch) {
  const next = { ...record, ...patch, updated_at: now() };
  await repo.commit(scope, { edcs_graph_connections: [next] });
  return next;
}

// Reads the changes Microsoft reports for the BizKick library since the last time and feeds the register and the
// controlled-folder files through the normal paths. `deps` carries what only the server can provide:
// storeBytesFor(scope) (file storage) and afterRegister / afterFile (automation rules after a change).
export async function syncGraph({ scope: scopeInput, deps = {}, actor = null, graph = createGraphClient(), trigger = "SCHEDULE" }) {
  const scope = scopeOf(scopeInput);
  let record = await repo.getGraphConnection(scope);
  if (!record) throw httpError(404, "NOT_FOUND", "There is no Microsoft 365 connection.");
  if (record.status !== "ACTIVE") return { skipped: true, reason: record.status, graph: publicGraphView(record) };
  if (record.sync_started_at && Date.now() - Date.parse(record.sync_started_at) < LEASE_SECONDS * 1000) return { skipped: true, reason: "ALREADY_RUNNING", graph: publicGraphView(record) };
  const connection = await repo.getConnection(scope);
  if (!connection) throw httpError(409, "EDCS_NOT_CONNECTED", "The firm has no BizKick connection.");

  record = await patchGraph(scope, record, { sync_started_at: now() });
  const summary = { trigger, register: "NOT_CHANGED", register_run_number: null, files: { seen: 0, linked: 0, revised: 0, unchanged: 0, unmatched: 0, skipped_outside_folder: 0, skipped_other: 0 }, deltas: 0 };
  const systemAct = systemActor(scope.tenant_id, scope.firm_id);
  const connector = cloudConnector(record);
  let deltaLink = record.delta_link;

  try {
    const token = await graph.getToken({ msTenantId: record.ms_tenant_id, clientId: record.client_id, clientSecret: decryptSecret(record.secret_enc) });
    let changes;
    try {
      changes = await graph.delta(token, record.drive_id, deltaLink);
    } catch (error) {
      if (!(error instanceof GraphError) || error.kind !== "GONE") throw error;
      deltaLink = null; // the change token expired: start again from a full listing (files already filed stay UNCHANGED)
      changes = await graph.delta(token, record.drive_id, null);
    }
    summary.deltas = changes.items.length;

    // Resolve every changed file to a path, keep only what is inside the consented folder.
    const candidates = [];
    for (const item of changes.items) {
      if (item.deleted || !item.file || !item.name || !item.id) continue;
      if (item.name.startsWith("~$") || item.name.startsWith(".") || /\.(tmp|lnk)$/i.test(item.name)) { summary.files.skipped_other += 1; continue; }
      let parent = parentPathOf(item);
      if (parent === null) {
        try { parent = parentPathOf(await graph.getItem(token, record.drive_id, item.id)); } catch (error) { if (error instanceof GraphError && error.kind === "NOT_FOUND") continue; throw error; }
      }
      if (parent === null) continue;
      const full = parent ? `${parent}/${item.name}` : item.name;
      if (!isUnder(full, record.folder_path)) { summary.files.skipped_outside_folder += 1; continue; }
      candidates.push({ item, relative: full.slice(record.folder_path.length + 1) });
    }

    // 1. The register, if it changed.
    const registerItem = candidates.filter((c) => lower(c.relative) === lower(record.register_path)).pop();
    if (registerItem) {
      const buffer = await graph.download(token, record.drive_id, registerItem.item.id, MAX_REGISTER_BYTES);
      const sha = sha256Hex(buffer);
      if (sha === record.register_sha256) {
        summary.register = "UNCHANGED";
      } else {
        const version = await graph.latestVersion(token, record.drive_id, registerItem.item.id);
        let parsed;
        try {
          parsed = readRegisterFile({ filename: sanitizeFilename(registerItem.item.name), mime_type: "", buffer });
        } catch (error) {
          if (!(error instanceof TabularReadError)) throw error;
          parsed = { ok: false, reason: "FILE_UNREADABLE", detail: error.message };
        }
        const result = await applyRegisterRun({
          scope, connection, actor: systemAct, parsed, connector,
          source: { file_id: null, filename: registerItem.item.name, sha256: sha, size_bytes: buffer.length, ref: { item_id: registerItem.item.id, e_tag: registerItem.item.eTag ?? null, version_id: version?.id ?? null, version_modified: version?.modified ?? registerItem.item.lastModifiedDateTime ?? null, path: `${record.folder_path}/${record.register_path}` } }
        });
        record = await patchGraph(scope, record, { register_sha256: sha });
        summary.register = result.run.status;
        summary.register_run_number = result.run.run_number;
        summary.register_counts = result.run.counts;
        record = await patchGraph(scope, record, { last_run_id: result.run.id, last_run_number: result.run.run_number, last_counts: result.run.counts });
        if (result.run.status === "COMPLETED" && deps.afterRegister) await deps.afterRegister(scope).catch(() => {});
      }
    }

    // 2. Files in the controlled folders.
    for (const { item, relative } of candidates) {
      if (lower(relative) === lower(record.register_path)) continue;
      const folder = record.controlled_folders.find((entry) => isUnder(relative, entry.path));
      if (!folder) { summary.files.skipped_outside_folder += 1; continue; }
      summary.files.seen += 1;
      const filename = sanitizeFilename(item.name);
      const mime = safeMime(filename);
      if (!mime) { summary.files.skipped_other += 1; continue; }
      const found = extractTransactionId(filename, connection.company_code);
      const policy = found.status === "FOUND" ? effectiveContentPolicy(found.document_type, connection) : "METADATA_ONLY";
      let buffer = null;
      let meta = null;
      const declaredSha = item.file?.hashes?.sha256Hash && /^[0-9a-fA-F]{64}$/.test(item.file.hashes.sha256Hash) ? item.file.hashes.sha256Hash.toLowerCase() : null;
      if (policy === "CONTENT" || !declaredSha) {
        const bytes = await graph.download(token, record.drive_id, item.id, MAX_FILE_BYTES).catch((error) => { if (error instanceof GraphError && error.kind === "TOO_LARGE") return null; throw error; });
        if (!bytes) { summary.files.skipped_other += 1; continue; }
        if (policy === "CONTENT") buffer = bytes;
        else meta = { sha256: sha256Hex(bytes), size_bytes: bytes.length }; // transient: fingerprinted in memory, never stored
      } else {
        meta = { sha256: declaredSha, size_bytes: Number(item.size) || 0 };
      }
      const version = await graph.latestVersion(token, record.drive_id, item.id);
      const outcome = await linkEdcsFile({
        scope, actor: systemAct, connector, filename, mime_type: mime, buffer, meta, role: folder.role, storeBytes: deps.storeBytesFor?.(scope),
        evidence: `Microsoft 365 ${record.folder_path}/${relative}${version?.id ? `, saved version ${version.id}` : ""}`
      });
      const key = { LINKED: "linked", REVISED: "revised", ATTACHED: "linked", UNCHANGED: "unchanged" }[outcome.outcome] ?? "unmatched";
      summary.files[key] += 1;
      if (["LINKED", "REVISED", "ATTACHED"].includes(outcome.outcome) && deps.afterFile) await deps.afterFile(scope).catch(() => {});
    }

    const fresh = (await repo.getGraphConnection(scope)) ?? record;
    record = await patchGraph(scope, fresh, { delta_link: changes.deltaLink, last_sync_at: now(), last_sync_status: "OK", last_error: null, last_error_at: null, sync_started_at: null });
    const changed = summary.register === "COMPLETED" || summary.register === "REJECTED" || summary.files.linked + summary.files.revised > 0;
    if (changed) {
      await recordAudit(scope, systemAct, [{
        event_type: "edcs.graph_synced", aggregate_type: "EdcsGraphConnection", aggregate_id: record.id,
        payload: { trigger, register: summary.register, register_run_number: summary.register_run_number, files: summary.files },
        summary: `Microsoft 365 read: register ${summary.register.toLowerCase().replace(/_/g, " ")}, ${summary.files.linked + summary.files.revised} file(s) filed.`
      }]);
    }
    return { skipped: false, summary, graph: publicGraphView(record) };
  } catch (error) {
    const fresh = (await repo.getGraphConnection(scope)) ?? record;
    if (error instanceof GraphError && (error.kind === "AUTH_FAILED" || error.kind === "ACCESS_DENIED")) {
      const timestamp = now();
      const lost = await patchGraph(scope, fresh, { status: "ACCESS_LOST", access_lost_at: timestamp, last_sync_status: "ACCESS_LOST", last_error: error.message.slice(0, 500), last_error_at: timestamp, error_count: (fresh.error_count ?? 0) + 1, sync_started_at: null });
      await recordAudit(scope, systemAct, [{
        event_type: "edcs.graph_access_lost", aggregate_type: "EdcsGraphConnection", aggregate_id: lost.id,
        payload: { reason: error.kind, detail: error.message.slice(0, 300) },
        summary: "Microsoft no longer accepts vFirm's access to the BizKick folder. Syncing has stopped."
      }]);
      return { skipped: false, access_lost: true, summary, graph: publicGraphView(lost) };
    }
    const timestamp = now();
    const message = error instanceof Error ? error.message : String(error);
    const failed = await patchGraph(scope, fresh, { last_sync_status: "ERROR", last_error: message.slice(0, 500), last_error_at: timestamp, error_count: (fresh.error_count ?? 0) + 1, sync_started_at: null });
    if (error?.status && error.code) throw error; // a vFirm error (for example a missing secret key) is reported to the caller
    return { skipped: false, failed: true, error: message, summary, graph: publicGraphView(failed) };
  }
}

// The scheduled poll: every firm with an ACTIVE connection, one at a time, within a time budget.
export async function pollGraphConnections({ deps = {}, scope = null, budgetMs = 40000, graph = createGraphClient() } = {}) {
  const started = Date.now();
  const scopes = scope ? [scope] : await repo.graphScopes();
  const out = { polled: 0, skipped: 0, failed: 0, access_lost: 0, deferred: 0 };
  for (const target of scopes) {
    if (Date.now() - started > budgetMs) { out.deferred += 1; continue; }
    try {
      const result = await syncGraph({ scope: target, deps, graph, trigger: "SCHEDULE" });
      if (result.skipped) out.skipped += 1;
      else if (result.access_lost) out.access_lost += 1;
      else if (result.failed) out.failed += 1;
      else out.polled += 1;
    } catch {
      out.failed += 1;
    }
  }
  return out;
}

// Owner: "Read now".
export async function syncGraphNow({ body, actor, deps, graph }) {
  requireOwner(actor, "Reading Microsoft 365 now");
  return syncGraph({ scope: scopeOf(body), deps, actor, graph, trigger: "MANUAL" });
}
