// CE-S5 (ADR-099, 2026-10-06): the Connected EDCS Delegation of Authority service.
//
// Imports BK-SYS-003's Approval Limits + Responsibility Matrix as a versioned approval policy, records
// which tier an EDCS-linked draft needs, and refuses APPROVED_FOR_CLIENT_DRAFT to a reviewer who does not
// hold that tier. The pure rules live in packages/core-domain/src/edcs-delegation.mjs; this module reads the
// uploaded workbook, stores versions through the EDCS repository, and writes the audit ledger.
//
// Authority: reading the policy is open to any verified firm member; importing a version needs the firm
// owner. Enforcement sits in the route layer (server.mjs) before the review is recorded, because the review
// itself is a store.mjs function. Class A approval is a separate, earlier gate and still applies on top.
// Work that did not come from an EDCS transaction is never touched.

import { appendEventAndAudit, newUuid, now, readStore, withStore } from "./store.mjs";
import { edcsRepository as repo } from "./edcs-repository.mjs";
import { isFirmOwner } from "./edcs-owner.mjs";
import { TabularReadError } from "../../../packages/core-domain/src/tabular-file-reader.mjs";
import {
  approverLabels, authorizeApproval, buildPolicyContent, describeRequirement, diffPolicies, readDelegationWorkbook,
  requirementFor, suggestDocumentTypes, suggestLabelMap, summarizePolicy, validateConfirmation
} from "../../../packages/core-domain/src/edcs-delegation.mjs";

function httpError(status, code, message, extra = {}) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  if (Object.keys(extra).length) error.details = extra;
  return error;
}

function requireOwner(actor, action) {
  if (!isFirmOwner(actor)) throw httpError(403, "EDCS_OWNER_REQUIRED", `${action} requires the firm owner.`);
}

const scopeOf = (source) => ({ tenant_id: source.tenant_id, firm_id: source.firm_id });
const MAX_STORED_CHANGES = 200;

async function recordAudit(scope, actor, events) {
  if (!events.length) return;
  await withStore((store) => {
    for (const event of events) appendEventAndAudit(store, { actor, tenant_id: scope.tenant_id, firm_id: scope.firm_id, ...event });
  }, { tenantId: scope.tenant_id, ledger: false }); // CE-H1: append-only, so no whole-database or ledger load
}

async function readWorkbook(scope, body, readFileBytes) {
  const store = await readStore(scope.tenant_id, { ledger: false });
  const file = (store.file_objects ?? []).find((item) => item.id === body.file_id && item.tenant_id === scope.tenant_id && item.firm_id === scope.firm_id);
  if (!file) throw httpError(404, "NOT_FOUND", `file_objects record not found: ${body.file_id}`);
  const buffer = await readFileBytes(file);
  let parsed;
  try {
    parsed = readDelegationWorkbook({ filename: file.filename, mime_type: file.mime_type, buffer });
  } catch (error) {
    if (!(error instanceof TabularReadError)) throw error;
    parsed = { ok: false, reason: "FILE_UNREADABLE", detail: error.message };
  }
  return { file, parsed };
}

const rejectWhole = (parsed) => httpError(422, "DELEGATION_FILE_REJECTED", parsed.detail, { reason: parsed.reason, sheet: parsed.sheet ?? null, column: parsed.column ?? null, expected: parsed.expected ?? null, found: parsed.found ?? null });

// ---------------- reading ----------------

export async function readDelegation(scope, { version = null } = {}) {
  const policies = await repo.listPolicies(scope);
  const active = policies.find((policy) => policy.status === "ACTIVE") ?? null;
  const selected = version ? policies.find((policy) => policy.version === Number(version)) ?? null : active;
  if (version && !selected) throw httpError(404, "NOT_FOUND", `approval_policies version not found: ${version}`);
  return { active: active ? summarizePolicy(active) : null, selected, versions: policies.map(summarizePolicy) };
}

// ---------------- preview (nothing is saved) ----------------

export async function previewDelegation({ body, actor, readFileBytes }) {
  requireOwner(actor, "Reading a Master Control Workbook for import");
  const scope = scopeOf(body);
  const { file, parsed } = await readWorkbook(scope, body, readFileBytes);
  if (!parsed.ok) throw rejectWhole(parsed);
  const active = await repo.getActivePolicy(scope);
  const limits = parsed.limits.accepted;
  const labels = approverLabels(limits);
  const suggestedLabels = suggestLabelMap(labels);
  const suggestedTypes = suggestDocumentTypes(limits);
  const previousLabels = active?.label_map ?? {};
  const previousTypes = active?.document_types ?? {};
  const labelRows = labels.map((entry) => ({
    key: entry.key, label: entry.label, used_in: entry.used_in,
    previous: previousLabels[entry.key] ? { owner: previousLabels[entry.key].owner, roles: previousLabels[entry.key].roles } : null,
    suggested: { owner: previousLabels[entry.key] ? previousLabels[entry.key].owner : suggestedLabels[entry.key].owner, roles: previousLabels[entry.key]?.roles ?? [] }
  }));
  const typeNames = new Set(limits.filter((row) => row.kind === "MONEY").map((row) => row.transaction_type));
  const documentRows = Object.keys({ ...suggestedTypes, ...previousTypes }).sort().map((code) => ({
    document_type: code,
    suggested: previousTypes[code] && typeNames.has(previousTypes[code]) ? previousTypes[code] : suggestedTypes[code] ?? null
  }));
  return {
    file: { id: file.id, filename: file.filename, sha256: file.sha256 },
    active_version: active?.version ?? null,
    limits: { accepted: limits, rejected: parsed.limits.rejected },
    responsibilities: { accepted: parsed.matrix.accepted, rejected: parsed.matrix.rejected },
    approver_labels: labelRows,
    document_types: documentRows,
    // money rows the owner may map a document type to
    mappable_transaction_types: limits.filter((row) => row.kind === "MONEY").map((row) => row.transaction_type)
  };
}

// ---------------- import (owner confirms the mappings) ----------------

export async function importDelegation({ body, actor, readFileBytes }) {
  requireOwner(actor, "Importing the Delegation of Authority");
  const scope = scopeOf(body);
  const { file, parsed } = await readWorkbook(scope, body, readFileBytes);
  if (!parsed.ok) throw rejectWhole(parsed);
  const limits = parsed.limits.accepted;
  if (limits.length === 0) throw httpError(422, "DELEGATION_FILE_REJECTED", "No usable row was found on the Approval Limits sheet, so there is nothing to import.", { reason: "NO_USABLE_LIMITS" });
  const confirmation = validateConfirmation({ limits, label_map: body.label_map, document_types: body.document_types });
  if (!confirmation.ok) throw httpError(422, "DELEGATION_MAPPING_INVALID", "The mapping needs fixing before it can be imported.", { errors: confirmation.errors });

  const content = buildPolicyContent({
    limits, matrix: parsed.matrix.accepted, label_map: confirmation.label_map, document_types: confirmation.document_types,
    rejected_limits: parsed.limits.rejected, rejected_matrix: parsed.matrix.rejected
  });
  const active = await repo.getActivePolicy(scope);
  const diff = diffPolicies(active, content);
  if (diff.identical) {
    return { outcome: "NO_CHANGE", policy: summarizePolicy(active), message: `Approval policy v${active.version} already matches this workbook and these mappings. Nothing was changed.` };
  }

  const timestamp = now();
  const result = await repo.savePolicyVersion(scope, active?.version ?? 0, (previous, version) => ({
    superseded: previous ? { ...previous, status: "SUPERSEDED", superseded_at: timestamp, superseded_by_version: version } : null,
    record: {
      id: newUuid(), tenant_id: scope.tenant_id, firm_id: scope.firm_id, version, status: "ACTIVE", imported_at: timestamp,
      imported_by_actor_id: actor.actor_id ?? null, source_file_id: file.id, source_filename: file.filename, source_sha256: file.sha256,
      ...content, superseded_at: null, superseded_by_version: null,
      change_summary: { counts: diff.counts, changes: diff.changes.slice(0, MAX_STORED_CHANGES), truncated: diff.changes.length > MAX_STORED_CHANGES }
    }
  }));
  if (result.conflict) throw httpError(409, "DELEGATION_VERSION_CONFLICT", "Another import finished first. Reload the Delegation page and import again.");
  const policy = result.record;
  await recordAudit(scope, actor, [{
    event_type: "edcs.delegation_imported",
    aggregate_type: "ApprovalPolicy",
    aggregate_id: policy.id,
    payload: { version: policy.version, previous_version: active?.version ?? null, source_file_id: file.id, source_filename: file.filename, counts: diff.counts, limits: policy.limits.length, document_types: Object.keys(policy.document_types), rejected_rows: policy.rejected_limits.length + policy.rejected_matrix.length, content_hash: policy.content_hash },
    summary: `Approval policy v${policy.version} imported from ${file.filename}${active ? ` (replaces v${active.version})` : ""}.`
  }]);
  return { outcome: active ? "NEW_VERSION" : "FIRST_VERSION", policy: summarizePolicy(policy), changes: diff.changes, counts: diff.counts };
}

// ---------------- what a transaction needs ----------------

// output draft -> workdesk item -> work request -> source BIZKICK_RULE -> transaction. null when the draft is
// not EDCS-linked (which is the whole of the non-EDCS case: nothing to govern).
async function linkedTransaction(scope, outputDraft, store) {
  const item = (store.awia_staff_workdesk_items ?? []).find((record) => record.id === outputDraft.workdesk_item_id && record.tenant_id === scope.tenant_id && record.firm_id === scope.firm_id);
  const request = item?.work_request_id ? (store.work_requests ?? []).find((record) => record.id === item.work_request_id && record.tenant_id === scope.tenant_id && record.firm_id === scope.firm_id) : null;
  if (request?.source?.type !== "BIZKICK_RULE" || !request.source.transaction_id) return null;
  return repo.getTransaction(scope, request.source.transaction_id);
}

async function requirementForDraft(scope, outputDraft, store) {
  const transaction = await linkedTransaction(scope, outputDraft, store);
  if (!transaction) return { linked: false, requirement: { governed: false, reason: "NOT_EDCS_LINKED" }, policy: null };
  const policy = await repo.getActivePolicy(scope);
  return { linked: true, transaction, policy, requirement: requirementFor({ policy, transaction }) };
}

const findDraft = (store, scope, id) => (store.awia_staff_output_drafts ?? []).find((record) => record.id === id && record.tenant_id === scope.tenant_id && record.firm_id === scope.firm_id) ?? null;

// Read-only: what would approving this draft need, and would the caller pass?
export async function checkDraftApproval({ scope, actor, output_draft_id }) {
  const store = await readStore(scope.tenant_id, { ledger: false });
  const draft = findDraft(store, scope, output_draft_id);
  if (!draft) throw httpError(404, "NOT_FOUND", `awia_staff_output_drafts record not found: ${output_draft_id}`);
  const { linked, transaction, policy, requirement } = await requirementForDraft(scope, draft, store);
  const verdict = authorizeApproval({ requirement, policy, actor_role: actor?.role ?? "principal", is_owner: isFirmOwner(actor) });
  return {
    output_draft_id, edcs_linked: linked, transaction_id: transaction?.transaction_id ?? null, requirement,
    summary: describeRequirement(requirement), would_allow: verdict.decision === "ALLOW", via: verdict.via, message: verdict.message
  };
}

// Called by the route before a review is recorded. Throws 409 DELEGATION_APPROVER_REQUIRED on a refusal.
// Both outcomes are audited when a limit applied; ungoverned and non-EDCS work leaves no trace here.
export async function enforceDraftApproval({ scope, actor, output_draft_id, review_decision }) {
  if (review_decision !== "APPROVED_FOR_CLIENT_DRAFT") return { enforced: false };
  const store = await readStore(scope.tenant_id, { ledger: false });
  const draft = findDraft(store, scope, output_draft_id);
  if (!draft) return { enforced: false }; // the review itself reports the missing draft
  const { transaction, policy, requirement } = await requirementForDraft(scope, draft, store);
  if (!requirement.governed) return { enforced: false, requirement };
  const verdict = authorizeApproval({ requirement, policy, actor_role: actor?.role ?? "principal", is_owner: isFirmOwner(actor) });
  const payload = {
    output_draft_id, transaction_id: transaction.transaction_id, document_type: requirement.document_type, amount: requirement.amount, currency: requirement.currency,
    tier: requirement.tier, required_approver: requirement.approver_label, policy_version: policy.version, actor_role: actor?.role ?? "principal", via: verdict.via
  };
  if (verdict.decision === "DENY") {
    await recordAudit(scope, actor, [{ event_type: "edcs.delegation_denied", aggregate_type: "AwiaStaffOutputDraft", aggregate_id: output_draft_id, payload, summary: `Approval refused: ${transaction.transaction_id} needs ${requirement.approver_label} (Tier ${requirement.tier}).` }]);
    throw httpError(409, "DELEGATION_APPROVER_REQUIRED", verdict.message, { requirement });
  }
  await recordAudit(scope, actor, [{ event_type: "edcs.delegation_allowed", aggregate_type: "AwiaStaffOutputDraft", aggregate_id: output_draft_id, payload, summary: `Approval within authority: ${transaction.transaction_id} Tier ${requirement.tier} (${verdict.via === "OWNER" ? "firm owner" : "mapped role"}).` }]);
  return { enforced: true, requirement, via: verdict.via };
}

// Called after a draft is produced: record the tier on the draft so the reviewer sees it before deciding.
export async function annotateDraftRequirement({ scope, actor, output_draft_id }) {
  const store = await readStore(scope.tenant_id, { ledger: false });
  const draft = findDraft(store, scope, output_draft_id);
  if (!draft) return null;
  const { requirement } = await requirementForDraft(scope, draft, store);
  if (!requirement.governed) return null;
  const note = { ...requirement, recorded_at: now() };
  await withStore((live) => {
    const target = (live.awia_staff_output_drafts ?? []).find((record) => record.id === output_draft_id && record.tenant_id === scope.tenant_id && record.firm_id === scope.firm_id);
    if (!target) return;
    target.delegation_requirement = note;
    appendEventAndAudit(live, { actor, tenant_id: scope.tenant_id, firm_id: scope.firm_id, event_type: "edcs.delegation_requirement_recorded", aggregate_type: "AwiaStaffOutputDraft", aggregate_id: output_draft_id, payload: { output_draft_id, transaction_id: requirement.transaction_id, tier: requirement.tier, required_approver: requirement.approver_label, policy_version: requirement.policy_version }, summary: `Approval tier recorded on the draft: Tier ${requirement.tier}, needs ${requirement.approver_label}.` });
  }, { tenantId: scope.tenant_id, ledger: false });
  return note;
}
