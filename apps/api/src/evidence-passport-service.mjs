// VI-S3 (ADR-111): Evidence Passport service.
//
// The owner picks documents and/or BizKick transactions, previews exactly what would go in (and what is left out and
// why), then builds a sealed zip: the files, manifest.json (SHA-256 of every file, revisions, approvals, BizKick
// sync events), an audit extract, a cover page and an offline verify.html. The zip is stored as a file object, the
// passport record keeps the seal, and every build and download is audited. A download re-verifies the stored bundle.
//
// Rules: owner-only; one firm only (a document or transaction of another firm is "not found"); restricted
// classifications (HR_RESTRICTED, FINANCE_RESTRICTED) are left out unless the owner ticks each one, and every such
// inclusion is audited and printed on the cover; a build must present the digest of the preview the owner saw, so a
// change in between is refused rather than silently included; nothing existing is changed or deleted.

import { appendEventAndAudit, newUuid, now, readStore, registerFileObjectRecord, withStore } from "./store.mjs";
import { edcsRepository as repo } from "./edcs-repository.mjs";
import { isFirmOwner } from "./edcs-owner.mjs";
import { sha256Hex, storageKeyFor } from "./file-storage.mjs";
import { zipRead } from "./passport-zip.mjs";
import {
  MAX_PASSPORT_BYTES, RESTRICTED_CLASSIFICATIONS, buildPassportFiles, planPassport, validateSelection, verifyBundleEntries
} from "../../../packages/core-domain/src/edcs-passport.mjs";

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
const mine = (scope) => (record) => record.tenant_id === scope.tenant_id && record.firm_id === scope.firm_id;

async function audit(scope, actor, events) {
  await withStore((store) => {
    for (const event of events) appendEventAndAudit(store, { actor, tenant_id: scope.tenant_id, firm_id: scope.firm_id, ...event });
  }, { tenantId: scope.tenant_id, ledger: false });
}

// One firm's records, as the planner and the bundle need them.
async function loadFirm(scope) {
  const store = await readStore(scope.tenant_id);
  const own = mine(scope);
  return {
    store,
    entries: (store.document_register_entries ?? []).filter(own),
    revisions: (store.document_revision_records ?? []).filter(own),
    files: (store.file_objects ?? []).filter(own),
    transactions: await repo.listTransactions(scope)
  };
}

function planFor(firm, selection) {
  const plan = planPassport({ selection, entries: firm.entries, revisions: firm.revisions, files: firm.files, transactions: firm.transactions });
  if (plan.unknown.documents.length || plan.unknown.transactions.length) {
    throw httpError(404, "NOT_FOUND", `Not found in this firm: ${[...plan.unknown.documents, ...plan.unknown.transactions].join(", ")}`);
  }
  if (plan.not_candidate_restricted.length) {
    throw httpError(400, "VALIDATION_ERROR", `A restricted item was ticked that is not part of the selection: ${plan.not_candidate_restricted.join(", ")}`);
  }
  return plan;
}

const publicPlan = (plan) => ({ items: plan.items, transactions: plan.transactions, orphan_transactions: plan.orphan_transactions, totals: plan.totals, digest: plan.digest, max_bytes: MAX_PASSPORT_BYTES });

function parse(body) {
  const checked = validateSelection(body);
  if (!checked.ok) throw httpError(400, "VALIDATION_ERROR", checked.errors.join(" "));
  return checked;
}

// POST /passports/preview: nothing is built or saved.
export async function previewPassport({ body, actor }) {
  requireOwner(actor, "Previewing an Evidence Passport");
  const scope = scopeOf(body);
  const { selection } = parse(body);
  const plan = planFor(await loadFirm(scope), selection);
  return { ...publicPlan(plan), too_large: plan.totals.bytes > MAX_PASSPORT_BYTES };
}

const names = (store, scope) => {
  const byId = new Map((store.actors ?? []).map((actor) => [actor.id ?? actor.actor_id, actor.display_name]));
  return (id) => (id ? byId.get(id) ?? null : null);
};

// Approvals per revision (work outputs) and per transaction (BizKick drafts), from the records themselves.
function collectApprovals(firm, scope, plan) {
  const nameOf = names(firm.store, scope);
  const own = mine(scope);
  const drafts = (firm.store.awia_staff_output_drafts ?? []).filter(own);
  const reviews = (firm.store.awia_staff_output_reviews ?? []).filter(own);
  const approvals = new Map();
  for (const item of plan.items.filter((i) => i.included)) {
    for (const rev of item.revisions.filter((r) => r.included && r.output_draft_id)) {
      const list = [];
      for (const review of reviews.filter((r) => r.output_draft_id === rev.output_draft_id).sort((a, b) => String(a.reviewed_at).localeCompare(String(b.reviewed_at)))) {
        list.push({ kind: "OUTPUT_REVIEW", decision: review.review_decision, by_actor_id: review.reviewed_by_actor_id ?? null, by_name: nameOf(review.reviewed_by_actor_id), at: review.reviewed_at, notes: review.review_notes ?? null });
      }
      const draft = drafts.find((d) => d.id === rev.output_draft_id);
      if (draft?.class_a_approval_decided_at) list.push({ kind: "CLASS_A_APPROVAL", decision: draft.class_a_approval_status, by_actor_id: draft.class_a_approval_decided_by_actor_id ?? null, by_name: nameOf(draft.class_a_approval_decided_by_actor_id), at: draft.class_a_approval_decided_at, notes: null });
      approvals.set(rev.revision_id, list);
    }
  }
  return approvals;
}

async function collectTransactions(firm, scope, plan) {
  const nameOf = names(firm.store, scope);
  const drafts = await repo.listDrafts(scope);
  const out = [];
  const approvals = new Map();
  for (const id of plan.transactions) {
    const tx = firm.transactions.find((record) => record.transaction_id === id);
    if (!tx) continue;
    const revisions = (await repo.listRevisions(scope, id)).map((rev) => ({ seq: rev.seq, revision: rev.revision, kind: rev.kind, row_fingerprint: rev.row_fingerprint, at: rev.created_at, note: rev.resolution_note ?? null }));
    const events = (await repo.listEvents(scope, { transaction_id: id })).map((event) => ({ run_number: event.run_number ?? null, row_number: event.row_number ?? null, outcome: event.outcome, reasons: event.reasons ?? [], changed_fields: event.changed_fields ?? [], at: event.at }));
    out.push({
      transaction_id: tx.transaction_id, document_type: tx.document_type, status: tx.status, revision: tx.revision ?? null, counterparty_name: tx.counterparty_name ?? null, subject: tx.subject ?? null,
      amount: tx.amount ?? null, currency: tx.currency ?? null, date_issued: tx.date_issued ?? null, due_date: tx.due_date ?? null, related_transaction_id: tx.related_transaction_id ?? null,
      first_seen_at: tx.first_seen_at, last_synced_at: tx.last_synced_at, row_fingerprint: tx.row_fingerprint, flags: tx.flags ?? {}, held_conflict: Boolean(tx.held_conflict),
      revisions, sync_events: events
    });
    const list = [];
    for (const draft of drafts.filter((d) => d.transaction_id === id && (d.approved_at || d.decided_at))) {
      list.push({ kind: "BIZKICK_DRAFT", decision: draft.status === "REJECTED" ? "REJECTED" : "APPROVED", by_actor_id: draft.decided_by ?? draft.approved_by ?? null, by_name: nameOf(draft.decided_by ?? draft.approved_by), at: draft.decided_at ?? draft.approved_at, notes: draft.decision_reason ?? null, requirement: draft.approval_summary ?? null, policy_version: draft.policy_version ?? null, file_sha256: draft.file_sha256 });
    }
    approvals.set(`tx:${id}`, list);
  }
  return { transactions: out, approvals };
}

function collectAudit(firm, scope, plan, extraIds) {
  const ids = new Set(extraIds);
  for (const item of plan.items.filter((i) => i.included)) {
    ids.add(item.entry_id); ids.add(item.document_number);
    for (const rev of item.revisions.filter((r) => r.included)) { ids.add(rev.revision_id); if (rev.file_id) ids.add(rev.file_id); if (rev.output_draft_id) ids.add(rev.output_draft_id); }
  }
  for (const id of plan.transactions) ids.add(id);
  const own = mine(scope);
  return (firm.store.audit_events ?? []).filter(own).filter((event) => ids.has(event.resource_id))
    .sort((a, b) => String(a.occurred_at).localeCompare(String(b.occurred_at)) || String(a.id).localeCompare(String(b.id)))
    .map((event) => ({ occurred_at: event.occurred_at, action: event.action, resource_type: event.resource_type, resource_id: event.resource_id, actor_id: event.actor_id ?? null, summary: event.summary ?? null }));
}

const highestClass = (items) => {
  const classes = items.filter((i) => i.included).map((i) => i.classification);
  return classes.find((c) => c === "FINANCE_RESTRICTED") ?? classes.find((c) => c === "HR_RESTRICTED") ?? "CLIENT_CONFIDENTIAL";
};

const publicRecord = (record) => record;

// POST /passports: build, store, record, audit.
export async function createPassport({ body, actor, deps }) {
  requireOwner(actor, "Creating an Evidence Passport");
  const scope = scopeOf(body);
  const { selection, purpose, recipient } = parse(body);
  if (!body.plan_digest) throw httpError(400, "VALIDATION_ERROR", "Preview the passport first, then create it with the preview's digest (plan_digest).");
  const firm = await loadFirm(scope);
  const plan = planFor(firm, selection);
  if (plan.digest !== body.plan_digest) throw httpError(409, "PASSPORT_PLAN_CHANGED", "The documents changed since you previewed. Preview again to see what would go in now.");
  if (plan.totals.documents === 0 && plan.transactions.length === 0) throw httpError(400, "VALIDATION_ERROR", "Nothing would go into this passport. Check the selection and what was left out.");
  if (plan.totals.bytes > MAX_PASSPORT_BYTES) throw httpError(413, "PASSPORT_TOO_LARGE", `This passport would be ${Math.round(plan.totals.bytes / 1048576)} MB; the limit is ${Math.round(MAX_PASSPORT_BYTES / 1048576)} MB. Split it into two passports.`);

  // Read the bytes and prove each one is what the register recorded, before anything is bundled.
  const contents = new Map();
  for (const item of plan.items.filter((i) => i.included)) {
    for (const rev of item.revisions.filter((r) => r.included && r.content === "INCLUDED")) {
      const file = firm.files.find((record) => record.id === rev.file_id);
      const bytes = await deps.fileStorage.get(file.storage_key);
      if (sha256Hex(bytes) !== file.sha256) throw httpError(500, "FILE_INTEGRITY_ERROR", `${file.filename} failed its integrity check (SHA-256 mismatch); it was not put in the passport.`);
      contents.set(rev.revision_id, bytes);
    }
  }

  const id = newUuid();
  const issuedAt = now();
  const number = `EP-${issuedAt.slice(0, 4)}-${id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
  const nameOf = names(firm.store, scope);
  const firmRecord = (firm.store.firms ?? []).find((record) => record.id === scope.firm_id);
  const { transactions, approvals: txApprovals } = await collectTransactions(firm, scope, plan);
  const approvals = new Map([...collectApprovals(firm, scope, plan), ...txApprovals]);
  const auditEvents = collectAudit(firm, scope, plan, []);
  const built = buildPassportFiles({
    passport: {
      id, number, issued_at: issuedAt, purpose, recipient: recipient || null,
      issued_by: { actor_id: actor.actor_id ?? null, name: nameOf(actor.actor_id) ?? actor.display_name ?? null },
      firm: { id: scope.firm_id, name: firmRecord?.name ?? null },
      selection
    },
    plan, contents, approvals, transactions, audit: auditEvents
  });

  const fileId = newUuid();
  const filename = `EvidencePassport_${number}.zip`;
  const storageKey = storageKeyFor({ tenant_id: scope.tenant_id, firm_id: scope.firm_id, file_id: fileId });
  await deps.fileStorage.put(storageKey, built.zip, "application/zip");
  const restrictedIncluded = plan.items.filter((i) => i.included && i.restricted);
  await registerFileObjectRecord({
    tenant_id: scope.tenant_id, firm_id: scope.firm_id, file_id: fileId, filename, mime_type: "application/zip", size_bytes: built.zip.length, sha256: sha256Hex(built.zip),
    storage_backend: deps.fileStorage.backend, storage_key: storageKey, classification: highestClass(plan.items), purpose: "EVIDENCE_PASSPORT", linked_to: `passport:${id}`
  }, actor);

  const record = {
    id, tenant_id: scope.tenant_id, firm_id: scope.firm_id, number, status: "ISSUED", purpose, recipient: recipient || null, selection,
    seal: built.seal, verifier_sha256: built.verifier_sha256,
    bundle_file_id: fileId, bundle_filename: filename, bundle_sha256: sha256Hex(built.zip), bundle_size: built.zip.length,
    totals: plan.totals, plan_digest: plan.digest,
    restricted_included: restrictedIncluded.map((i) => ({ entry_id: i.entry_id, document_number: i.document_number, title: i.title, classification: i.classification })),
    excluded: plan.items.filter((i) => !i.included).map((i) => ({ document_number: i.document_number, title: i.title, reason: i.reason })),
    created_by: actor.actor_id ?? null, created_by_name: nameOf(actor.actor_id) ?? actor.display_name ?? null, created_at: issuedAt, downloads: 0, last_downloaded_at: null
  };
  await repo.commit(scope, { evidence_passports: [record] });
  const events = [{ event_type: "passport.created", aggregate_type: "EvidencePassport", aggregate_id: id, payload: { number, purpose, seal: built.seal, documents: plan.totals.documents, files: plan.totals.files_with_content, metadata_only: plan.totals.metadata_only, transactions: plan.totals.transactions, excluded: record.excluded.length, bundle_sha256: record.bundle_sha256 }, summary: `Evidence Passport ${number} created for "${purpose}".` }];
  for (const item of restrictedIncluded) {
    events.push({ event_type: "passport.restricted_included", aggregate_type: "EvidencePassport", aggregate_id: id, payload: { number, document_number: item.document_number, classification: item.classification, document_entry_id: item.entry_id }, summary: `Restricted document ${item.document_number} (${item.classification}) was included in Evidence Passport ${number} by the owner.` });
  }
  await audit(scope, actor, events);
  return { passport: publicRecord(record), plan: publicPlan(plan) };
}

export async function listPassports({ scope, actor }) {
  requireOwner(actor, "Listing Evidence Passports");
  return { passports: (await repo.listPassports(scope)).map(publicRecord) };
}

export async function readPassport({ scope, actor, id }) {
  requireOwner(actor, "Reading an Evidence Passport");
  const record = await repo.getPassport(scope, id);
  if (!record) throw httpError(404, "NOT_FOUND", `evidence_passports record not found: ${id}`);
  return { passport: publicRecord(record) };
}

async function loadBundle(scope, record, deps) {
  const file = (await readStore(scope.tenant_id, { ledger: false })).file_objects?.find((f) => f.id === record.bundle_file_id && f.tenant_id === scope.tenant_id && f.firm_id === scope.firm_id);
  if (!file) throw httpError(404, "NOT_FOUND", `file_objects record not found: ${record.bundle_file_id}`);
  const buffer = await deps.fileStorage.get(file.storage_key);
  return buffer;
}

// Re-verify the stored bundle: the bytes against the recorded hash, then the bundle against its own manifest and seal.
export async function verifyStoredPassport({ scope, actor, id, deps }) {
  requireOwner(actor, "Verifying an Evidence Passport");
  const record = await repo.getPassport(scope, id);
  if (!record) throw httpError(404, "NOT_FOUND", `evidence_passports record not found: ${id}`);
  const buffer = await loadBundle(scope, record, deps);
  const checks = [];
  const bytesOk = sha256Hex(buffer) === record.bundle_sha256;
  checks.push({ name: "stored bundle matches the hash recorded at issue", ok: bytesOk, detail: bytesOk ? "" : "The stored bundle was changed after it was issued." });
  let inner = null;
  if (bytesOk) {
    inner = await verifyBundleEntries(zipRead(buffer), record.seal);
    checks.push(...inner.checks);
  }
  return { id: record.id, number: record.number, ok: checks.every((c) => c.ok), seal: record.seal, checks, files_verified: inner?.verified ?? 0, files_listed: inner?.listed ?? 0 };
}

// GET /passports/<id>/download: refuses a bundle that no longer verifies.
export async function downloadPassport({ scope, actor, id, deps }) {
  requireOwner(actor, "Downloading an Evidence Passport");
  const record = await repo.getPassport(scope, id);
  if (!record) throw httpError(404, "NOT_FOUND", `evidence_passports record not found: ${id}`);
  const buffer = await loadBundle(scope, record, deps);
  if (sha256Hex(buffer) !== record.bundle_sha256) throw httpError(500, "PASSPORT_INTEGRITY_ERROR", "The stored bundle failed its integrity check (SHA-256 mismatch). It was not released.");
  const inner = await verifyBundleEntries(zipRead(buffer), record.seal);
  if (!inner.ok) throw httpError(500, "PASSPORT_INTEGRITY_ERROR", "The stored bundle no longer verifies against its own manifest and seal. It was not released.");
  const at = now();
  await repo.commit(scope, { evidence_passports: [{ ...record, downloads: (record.downloads ?? 0) + 1, last_downloaded_at: at }] });
  await audit(scope, actor, [{ event_type: "passport.downloaded", aggregate_type: "EvidencePassport", aggregate_id: record.id, payload: { number: record.number, bundle_sha256: record.bundle_sha256, seal: record.seal }, summary: `Evidence Passport ${record.number} downloaded (re-verified: ${inner.verified} file(s)).` }]);
  return { filename: record.bundle_filename, buffer, sha256: record.bundle_sha256, seal: record.seal, mime_type: "application/zip" };
}

export { RESTRICTED_CLASSIFICATIONS };
