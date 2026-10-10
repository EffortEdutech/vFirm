// CE-S8 (ADR-107, 2026-10-10): Connected EDCS governed drafting.
//
// A person prepares a NEW BizKick working file from a controlled master (Quotation, Invoice, Purchase Order).
// vFirm reserves the document number (CE-S4), fills a copy of the master (packages/core-domain/src/edcs-templates.mjs),
// and holds the file as PENDING_APPROVAL. Nobody can download or deliver it until an approver releases it:
//
//   PENDING_APPROVAL --approve--> APPROVED --download or outbox--> DELIVERED
//          |--reject / cancel--> REJECTED / CANCELLED   (the reserved number is voided; it is never reused)
//
// Approval follows the Delegation of Authority (CE-S5): the amount is the document's grand total, the tier
// comes from the active approval policy, and the firm owner may always approve. Where no limit applies the
// firm owner is still required (a draft never goes out on nobody's say-so). A mapped-role approver cannot
// approve their own draft.
//
// The BizKick master and every existing file are never touched. The only write toward a BizKick folder is
// the connector's contained `_vFirm_Outbox`, and only for APPROVED drafts. The user then moves the file into
// BizKick, registers the row, and the next sync links it (the reservation turns REGISTERED on import).

import { appendEventAndAudit, newUuid, now, systemActor, withStore } from "./store.mjs";
import { edcsRepository as repo } from "./edcs-repository.mjs";
import { isFirmOwner } from "./edcs-owner.mjs";
import { authorizeApproval, describeRequirement, requirementFor } from "../../../packages/core-domain/src/edcs-delegation.mjs";
import { buildReservation } from "../../../packages/core-domain/src/edcs-numbers.mjs";
import {
  COMPANY_FIELDS, TEMPLATES, draftFilename, fillTemplate, listTemplates, masterSha256, validateCompanyProfile, validateDraftInput
} from "../../../packages/core-domain/src/edcs-templates.mjs";
import { sha256Hex } from "./file-storage.mjs";

export const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const OUTBOX_BATCH = 5;

function httpError(status, code, message, extra = {}) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  if (Object.keys(extra).length) error.details = extra;
  return error;
}

const scopeOf = (source) => ({ tenant_id: source.tenant_id, firm_id: source.firm_id });
const todayUtc = () => new Date().toISOString().slice(0, 10);

function requireOwner(actor, action) {
  if (!isFirmOwner(actor)) throw httpError(403, "EDCS_OWNER_REQUIRED", `${action} requires the firm owner.`);
}

function requireHuman(actor, action) {
  if (actor?.actor_type !== "HUMAN") throw httpError(403, "EDCS_HUMAN_REQUIRED", `${action} needs a signed-in person.`);
}

async function recordAudit(scope, actor, events) {
  if (!events.length) return;
  await withStore((store) => {
    for (const event of events) appendEventAndAudit(store, { actor, tenant_id: scope.tenant_id, firm_id: scope.firm_id, ...event });
  }, { tenantId: scope.tenant_id, ledger: false });
}

// What the console and the API return: never the file bytes.
function publicDraft(record, reservation = null) {
  if (!record) return null;
  const { file_b64, ...rest } = record;
  return { ...rest, has_file: Boolean(file_b64), registered: reservation ? reservation.status === "REGISTERED" : false, reservation_status: reservation?.status ?? null };
}

// ---------------- company details ----------------

export async function readCompany({ scope }) {
  const company = await repo.getCompanyProfile(scope);
  return { company, fields: COMPANY_FIELDS.map(([key, label, max, required]) => ({ key, label, max, required })), templates: listTemplates() };
}

export async function saveCompany({ body, actor }) {
  requireOwner(actor, "Saving company details");
  const scope = scopeOf(body);
  const checked = validateCompanyProfile(body);
  if (!checked.ok) throw httpError(400, "VALIDATION_ERROR", checked.errors.join(" "));
  const existing = await repo.getCompanyProfile(scope);
  const at = now();
  const record = { id: existing?.id ?? newUuid(), tenant_id: scope.tenant_id, firm_id: scope.firm_id, ...checked.value, created_at: existing?.created_at ?? at, updated_at: at, updated_by: actor.actor_id ?? null };
  await repo.commit(scope, { edcs_company_profiles: [record] });
  await recordAudit(scope, actor, [{
    event_type: "edcs.company_profile_saved", aggregate_type: "EdcsCompanyProfile", aggregate_id: record.id,
    payload: { legal_name: record.legal_name, changed: existing ? COMPANY_FIELDS.map(([key]) => key).filter((key) => (existing[key] ?? null) !== (record[key] ?? null)) : "new" },
    summary: `Company details ${existing ? "updated" : "saved"} for ${record.legal_name}.`
  }]);
  return { company: record };
}

// ---------------- drafts ----------------

export async function listDrafts({ scope, params }) {
  const status = params?.get?.("status") || null;
  const reservations = new Map((await repo.listReservations(scope)).map((item) => [item.id, item]));
  const drafts = (await repo.listDrafts(scope)).filter((record) => !status || record.status === status).map((record) => publicDraft(record, reservations.get(record.reservation_id)));
  const counts = {};
  for (const record of drafts) counts[record.status] = (counts[record.status] ?? 0) + 1;
  return { drafts, counts };
}

export async function readDraft({ scope, draftId }) {
  const record = await repo.getDraft(scope, draftId);
  if (!record) throw httpError(404, "NOT_FOUND", `edcs_template_drafts record not found: ${draftId}`);
  const reservation = (await repo.listReservations(scope)).find((item) => item.id === record.reservation_id) ?? null;
  return { draft: publicDraft(record, reservation) };
}

async function voidReservationFor(scope, draft, reason, actor) {
  const reservation = (await repo.listReservations(scope)).find((item) => item.id === draft.reservation_id);
  if (!reservation || reservation.status !== "RESERVED") return null;
  const voided = { ...reservation, status: "VOID", void_at: now(), void_by: actor?.actor_id ?? null, void_reason: reason };
  await repo.commit(scope, { edcs_number_reservations: [voided] });
  return voided;
}

export async function createDraft({ body, actor }) {
  requireHuman(actor, "Drafting a document");
  const scope = scopeOf(body);
  const connection = await repo.getConnection(scope);
  if (!connection) throw httpError(409, "EDCS_NOT_CONNECTED", "Set up the BizKick connection (company code) before drafting documents.");
  const company = await repo.getCompanyProfile(scope);
  if (!company?.legal_name) throw httpError(409, "COMPANY_DETAILS_REQUIRED", "Save the company details (registered business name at least) before drafting documents.");
  const template = TEMPLATES[String(body.template_id ?? "")];
  if (!template) throw httpError(400, "VALIDATION_ERROR", `Unknown template: ${body.template_id || "(none)"}.`);
  const checked = validateDraftInput(template.id, body, { today: todayUtc() });
  if (!checked.ok) throw httpError(400, "VALIDATION_ERROR", checked.errors.join(" "));
  const value = checked.value;
  const year = Number(value.issue_date.slice(0, 4));
  const counterparty = value.fields.counterparty_name;
  const at = now();

  // 1. The number comes from the Number Authority (atomic, never reused).
  const reservation = await repo.reserveNumber(scope, { company_code: connection.company_code, document_type: template.document_type, year }, ({ sequence }) =>
    buildReservation({
      id: newUuid(), tenant_id: scope.tenant_id, firm_id: scope.firm_id, company_code: connection.company_code,
      value: { document_type: template.document_type, year, purpose: `${template.name} draft for ${counterparty}`.slice(0, 200), counterparty, subject: value.items[0]?.description?.slice(0, 300) ?? null },
      sequence, actor_id: actor.actor_id ?? null, at
    }));
  if (!reservation) throw httpError(409, "NUMBER_RANGE_EXHAUSTED", `All 9999 ${template.document_type} numbers for ${year} are used.`);

  // 2. Fill a copy of the master. If that fails the number is voided, so nothing is left reserved for nothing.
  let filled;
  try {
    filled = fillTemplate({ templateId: template.id, company, value, transaction_id: reservation.transaction_id, company_code: connection.company_code });
  } catch (error) {
    await repo.commit(scope, { edcs_number_reservations: [{ ...reservation, status: "VOID", void_at: now(), void_by: actor.actor_id ?? null, void_reason: "Drafting failed before a file was made." }] });
    throw httpError(422, "DRAFT_BUILD_FAILED", error?.message ?? "The document could not be built.");
  }

  // 3. The approval tier this document needs (shown to the reviewer before they decide).
  const policy = await repo.getActivePolicy(scope);
  const requirement = requirementFor({ policy, transaction: { document_type: template.document_type, amount: filled.totals.grand, currency: "MYR", transaction_id: reservation.transaction_id } });

  const draft = {
    id: newUuid(), tenant_id: scope.tenant_id, firm_id: scope.firm_id,
    template_id: template.id, template_name: template.name, document_type: template.document_type,
    transaction_id: reservation.transaction_id, reservation_id: reservation.id, company_code: connection.company_code,
    counterparty, filename: draftFilename({ transaction_id: reservation.transaction_id, counterparty, templateName: template.name }),
    status: "PENDING_APPROVAL", issue_date: value.issue_date,
    input: { fields: value.fields, items: value.items, notes: value.notes, other_charges: value.other_charges, additional_discount: value.additional_discount, overrides: value.overrides },
    totals: { subtotal: filled.totals.subtotal, tax: filled.totals.tax, grand: filled.totals.grand, currency: "MYR" },
    approval_requirement: requirement, approval_summary: describeRequirement(requirement), policy_version: policy?.version ?? null,
    master_sha256: masterSha256(template.id), file_sha256: filled.sha256, file_size: filled.bytes.length, file_b64: filled.bytes.toString("base64"),
    warnings: filled.warnings,
    created_by: actor.actor_id ?? null, created_by_role: actor.role ?? null, created_at: at, updated_at: at,
    approved_by: null, approved_at: null, decided_by: null, decided_at: null, decision_reason: null,
    downloaded_at: null, downloaded_by: null, outbox_written_at: null, outbox_connector_id: null, delivered_at: null
  };
  const marked = { ...reservation, draft_id: draft.id };
  await repo.commit(scope, { edcs_template_drafts: [draft], edcs_number_reservations: [marked] });
  await recordAudit(scope, actor, [
    { event_type: "edcs.number_reserved", aggregate_type: "EdcsNumberReservation", aggregate_id: reservation.id, payload: { transaction_id: reservation.transaction_id, purpose: reservation.purpose, counterparty, via: "TEMPLATE_DRAFT" }, summary: `Number ${reservation.transaction_id} reserved: ${reservation.purpose}.` },
    { event_type: "edcs.draft_created", aggregate_type: "EdcsTemplateDraft", aggregate_id: draft.id, payload: { transaction_id: draft.transaction_id, template_id: template.id, filename: draft.filename, file_sha256: draft.file_sha256, master_sha256: draft.master_sha256, grand_total: draft.totals.grand, tier: requirement.governed ? requirement.tier : null }, summary: `${template.name} ${draft.transaction_id} drafted for ${counterparty} (RM ${draft.totals.grand.toFixed(2)}); waiting for approval.` }
  ]);
  return { draft: publicDraft(draft, marked), requirement };
}

// Who may approve this draft? Returns the DoA verdict (never throws).
async function verdictFor(scope, actor, draft) {
  const policy = await repo.getActivePolicy(scope);
  const requirement = requirementFor({ policy, transaction: { document_type: draft.document_type, amount: draft.totals.grand, currency: "MYR", transaction_id: draft.transaction_id } });
  const owner = isFirmOwner(actor);
  const verdict = authorizeApproval({ requirement, policy, actor_role: actor?.role ?? "principal", is_owner: owner });
  return { policy, requirement, owner, verdict };
}

// Read-only: could the caller approve this draft?
export async function checkDraft({ scope, actor, draftId }) {
  const draft = await repo.getDraft(scope, draftId);
  if (!draft) throw httpError(404, "NOT_FOUND", `edcs_template_drafts record not found: ${draftId}`);
  const { requirement, owner, verdict } = await verdictFor(scope, actor, draft);
  const selfApproval = !owner && draft.created_by && draft.created_by === (actor?.actor_id ?? null);
  const allowed = draft.status === "PENDING_APPROVAL" && (owner || (verdict.decision === "ALLOW" && verdict.via === "ROLE")) && !selfApproval;
  return { draft_id: draft.id, requirement, summary: describeRequirement(requirement), would_allow: allowed, via: owner ? "OWNER" : verdict.via, message: selfApproval ? "You prepared this draft, so another approver must release it." : verdict.message };
}

async function decide({ body, actor, outcome }) {
  requireHuman(actor, outcome === "APPROVED" ? "Approving a draft" : "Deciding on a draft");
  const scope = scopeOf(body);
  const draft = await repo.getDraft(scope, body.draft_id);
  if (!draft) throw httpError(404, "NOT_FOUND", `edcs_template_drafts record not found: ${body.draft_id}`);
  if (draft.status !== "PENDING_APPROVAL") throw httpError(409, "DRAFT_NOT_PENDING", `${draft.transaction_id} is ${draft.status}; only a draft waiting for approval can be ${outcome === "APPROVED" ? "approved" : "closed"}.`);
  const reason = String(body.reason ?? "").trim();
  const { policy, requirement, owner, verdict } = await verdictFor(scope, actor, draft);
  const creator = Boolean(draft.created_by) && draft.created_by === (actor?.actor_id ?? null);

  if (outcome === "CANCELLED") {
    if (!owner && !creator) throw httpError(403, "EDCS_OWNER_REQUIRED", "Only the person who prepared the draft, or the firm owner, can cancel it.");
  } else {
    // Approving or rejecting is the approver's call: DoA decides who qualifies; with no limit, the owner does.
    const qualified = owner || (verdict.decision === "ALLOW" && verdict.via === "ROLE");
    if (!qualified) {
      const message = verdict.message ?? `${draft.transaction_id} needs the firm owner to decide (no approval limit maps a role to it).`;
      await recordAudit(scope, actor, [{ event_type: "edcs.delegation_denied", aggregate_type: "EdcsTemplateDraft", aggregate_id: draft.id, payload: { transaction_id: draft.transaction_id, grand_total: draft.totals.grand, tier: requirement.governed ? requirement.tier : null, required_approver: requirement.governed ? requirement.approver_label : "firm owner", actor_role: actor?.role ?? null, kind: "TEMPLATE_DRAFT" }, summary: `Decision refused on ${draft.transaction_id}: ${requirement.governed ? `needs ${requirement.approver_label} (Tier ${requirement.tier})` : "needs the firm owner"}.` }]);
      throw httpError(409, "DELEGATION_APPROVER_REQUIRED", message, { requirement });
    }
    if (!owner && creator) throw httpError(409, "SELF_APPROVAL_REFUSED", "You prepared this draft, so another approver must decide on it.");
  }
  if (outcome !== "APPROVED" && reason.length < 3) throw httpError(400, "VALIDATION_ERROR", `Say why the draft is ${outcome === "REJECTED" ? "rejected" : "cancelled"} (reason).`);

  const at = now();
  const next = outcome === "APPROVED"
    ? { ...draft, status: "APPROVED", approved_by: actor.actor_id ?? null, approved_at: at, decided_by: actor.actor_id ?? null, decided_at: at, decision_reason: reason || null, updated_at: at }
    : { ...draft, status: outcome, decided_by: actor.actor_id ?? null, decided_at: at, decision_reason: reason, updated_at: at };
  await repo.commit(scope, { edcs_template_drafts: [next] });
  const events = [];
  if (outcome === "APPROVED") {
    events.push({ event_type: "edcs.draft_approved", aggregate_type: "EdcsTemplateDraft", aggregate_id: draft.id, payload: { transaction_id: draft.transaction_id, file_sha256: draft.file_sha256, grand_total: draft.totals.grand, tier: requirement.governed ? requirement.tier : null, via: owner ? "OWNER" : verdict.via, policy_version: policy?.version ?? null }, summary: `${draft.template_name} ${draft.transaction_id} approved for delivery.` });
  } else {
    const voided = await voidReservationFor(scope, draft, `Draft ${outcome === "REJECTED" ? "rejected" : "cancelled"}: ${reason}`, actor);
    events.push({ event_type: outcome === "REJECTED" ? "edcs.draft_rejected" : "edcs.draft_cancelled", aggregate_type: "EdcsTemplateDraft", aggregate_id: draft.id, payload: { transaction_id: draft.transaction_id, reason, number_voided: Boolean(voided) }, summary: `${draft.template_name} ${draft.transaction_id} ${outcome === "REJECTED" ? "rejected" : "cancelled"}: ${reason}. The number is voided and will not be issued again.` });
    if (voided) events.push({ event_type: "edcs.number_voided", aggregate_type: "EdcsNumberReservation", aggregate_id: voided.id, payload: { transaction_id: voided.transaction_id, reason: voided.void_reason }, summary: `Number ${voided.transaction_id} voided: ${voided.void_reason}. It will not be issued again.` });
  }
  await recordAudit(scope, actor, events);
  return { draft: publicDraft(next) };
}

export const approveDraft = (input) => decide({ ...input, outcome: "APPROVED" });
export const rejectDraft = (input) => decide({ ...input, outcome: "REJECTED" });
export const cancelDraft = (input) => decide({ ...input, outcome: "CANCELLED" });

// ---------------- delivery ----------------

async function loadApproved(scope, draftId) {
  const draft = await repo.getDraft(scope, draftId);
  if (!draft) throw httpError(404, "NOT_FOUND", `edcs_template_drafts record not found: ${draftId}`);
  if (draft.status !== "APPROVED" && draft.status !== "DELIVERED") throw httpError(409, "DRAFT_NOT_APPROVED", `${draft.transaction_id} is ${draft.status}. A draft can only be delivered after it is approved.`);
  const buffer = Buffer.from(draft.file_b64 ?? "", "base64");
  if (sha256Hex(buffer) !== draft.file_sha256) throw httpError(500, "FILE_INTEGRITY_ERROR", "The stored draft failed its integrity check (SHA-256 mismatch).");
  return { draft, buffer };
}

// Download in the console. Delivery #1: the person gets the file; the draft becomes DELIVERED.
export async function downloadDraft({ scope, actor, draftId }) {
  requireHuman(actor, "Downloading a draft");
  const { draft, buffer } = await loadApproved(scope, draftId);
  const at = now();
  const first = draft.status === "APPROVED";
  const next = { ...draft, status: "DELIVERED", downloaded_at: draft.downloaded_at ?? at, downloaded_by: draft.downloaded_by ?? actor.actor_id ?? null, delivered_at: draft.delivered_at ?? at, updated_at: at };
  await repo.commit(scope, { edcs_template_drafts: [next] });
  await recordAudit(scope, actor, [{ event_type: "edcs.draft_delivered", aggregate_type: "EdcsTemplateDraft", aggregate_id: draft.id, payload: { transaction_id: draft.transaction_id, channel: "DOWNLOAD", file_sha256: draft.file_sha256, first_delivery: first }, summary: `${draft.template_name} ${draft.transaction_id} downloaded${first ? " (first delivery)" : ""}.` }]);
  return { filename: draft.filename, buffer, sha256: draft.file_sha256, mime_type: XLSX_MIME };
}

// Connector: approved drafts not yet written to the outbox. The connector writes only to _vFirm_Outbox.
export async function outboxPending({ connector }) {
  const scope = scopeOf(connector);
  const drafts = (await repo.listDrafts(scope)).filter((record) => record.status === "APPROVED" || record.status === "DELIVERED").filter((record) => !record.outbox_written_at).slice(0, OUTBOX_BATCH);
  return {
    items: drafts.map((draft) => ({ draft_id: draft.id, transaction_id: draft.transaction_id, filename: draft.filename, sha256: draft.file_sha256, size: draft.file_size, content_base64: draft.file_b64 }))
  };
}

export async function outboxAcknowledge({ connector, body }) {
  const scope = scopeOf(connector);
  const draft = await repo.getDraft(scope, String(body?.draft_id ?? ""));
  if (!draft) throw httpError(404, "NOT_FOUND", `edcs_template_drafts record not found: ${body?.draft_id}`);
  if (draft.status !== "APPROVED" && draft.status !== "DELIVERED") throw httpError(409, "DRAFT_NOT_APPROVED", `${draft.transaction_id} is ${draft.status}; it was never released for delivery.`);
  if (String(body?.sha256 ?? "") !== draft.file_sha256) throw httpError(400, "VALIDATION_ERROR", "The acknowledged file hash does not match the approved draft.");
  const at = now();
  const next = { ...draft, status: "DELIVERED", outbox_written_at: draft.outbox_written_at ?? at, outbox_connector_id: connector.id, delivered_at: draft.delivered_at ?? at, updated_at: at };
  await repo.commit(scope, { edcs_template_drafts: [next] });
  await recordAudit(scope, systemActor(scope.tenant_id, scope.firm_id), [{ event_type: "edcs.draft_delivered", aggregate_type: "EdcsTemplateDraft", aggregate_id: draft.id, payload: { transaction_id: draft.transaction_id, channel: "OUTBOX", connector_id: connector.id, connector_name: connector.name, file_sha256: draft.file_sha256 }, summary: `${draft.template_name} ${draft.transaction_id} written to the BizKick outbox by connector "${connector.name}".` }]);
  return { acknowledged: true, draft_id: draft.id };
}
