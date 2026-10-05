import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { randomUUID, createHash } from "node:crypto";
import pg from "pg";
import { validateFactoryBlueprintBundle } from "../../../packages/core-domain/src/factory-blueprints.mjs";
import { evaluatePackBindingCertification } from "../../../packages/core-domain/src/pack-certification.mjs";
import { awiaVirtualStaffPackageRegistry } from "../../../packages/core-domain/src/awia-virtual-staff-registry.mjs";
import { provisionPilotVirtualStaff, validateVirtualStaffProvisioningRun, staffLifecycleStates } from "../../../packages/core-domain/src/awia-virtual-staff-provisioning.mjs";
import { createRuntimeActionRequest, evaluateVirtualStaffRuntimeAction } from "../../../packages/core-domain/src/awia-virtual-staff-authority-gate.mjs";
import { resolveAwiaVirtualStaffPosition } from "../../../packages/core-domain/src/awia-virtual-staff-position-catalogue.mjs";
import { resolveClassAApprovalRequirement, evaluateClassAApprovalGate } from "../../../packages/core-domain/src/awia-virtual-staff-class-a-approval-routing.mjs";
import { buildAwiaVirtualStaffEvidencePack } from "../../../packages/core-domain/src/awia-virtual-staff-evidence-gate.mjs";
import { buildStaffMemoryEntry, buildConversationThread, buildConversationMessage } from "../../../packages/core-domain/src/awia-virtual-staff-memory.mjs";
import { evaluateSeatBillingTransition } from "../../../packages/core-domain/src/awia-virtual-staff-payroll.mjs";
import { resolveAwiaStaffTemplate, listAwiaStaffTemplates } from "../../../packages/core-domain/src/awia-virtual-staff-templates.mjs";
import { resolveAwiaFirmPackage, evaluateAwiaFirmPackageSeatGate, listAwiaFirmPackages } from "../../../packages/core-domain/src/awia-firm-package-catalogue.mjs";
// ADR-090 W2: owner work requests (request-type menu + deterministic ARO-01 triage suggestion).
import { resolveWorkRequestType, workerFitsRequestType, positionForTriageQueue } from "../../../packages/core-domain/src/awia-work-request-types.mjs";
import { isRunnableSkill, sanitizeSkillFormInputs, sanitizeFileRoles } from "../../../packages/core-domain/src/awia-skill-runner.mjs";
import { triageAdministrativeRequest } from "../../../packages/core-domain/src/awia-virtual-staff-aro01-request-triage.mjs";
// HM-S7 Phase 4b (2026-09-28): first slice of the repositories/ layer wired into a real handler --
// see createApproval()'s call sites below in approveProposalRecord/reviewDeliverableRecord.
import { createApproval } from "./repositories/approvals.repo.mjs";
// HM-S7 Phase 4c (2026-09-28): second proof-of-pattern slice -- Directory & Firm Setup's
// tenant/firm-bootstrap path (createTenantRecord/createFirmRecord below).
import { createTenant, createPerson, createActor, updateActor, createFirm, createFirmMembership, createProfessionalProfile, createProfessionalAuthority } from "./repositories/directory-firm-setup.repo.mjs";
import { setTenantContext } from "./repositories/shared/db.mjs";
// HM-S7 Phase 4c (2026-09-28): third proof-of-pattern slice -- Sales & Intake's client
// bootstrap path (createClientRecord below). clients/firm_client_relationships were chosen
// because buildClientFrontdoor() already returns fully-normalized objects (uuidOrNull/??
// defaults already applied), unlike event_log/audit_events/policy_decisions (deferred --
// see the Phase 4c doc note on why those three need more than the plain insertRow pattern).
import { createClient, createFirmClientRelationship } from "./repositories/sales-intake.repo.mjs";
// HM-S7 Phase 4c (2026-09-28): fourth proof-of-pattern slice -- Client Engagements &
// Projects' acceptProposalRecord (engagements) and openProjectDeliveryRecord
// (projects/work_packages/tasks) below. All four tables are written from a single
// pre-normalized builder object (buildEngagement/buildDeliveryPackage) inside one existing
// transaction, the same safe shape as every slice so far -- unlike this domain's other 5
// tables (technical_skill_bindings, drawing_review_records, calculation_input_sets,
// technical_qa_findings, delivery_package_records, pilot_handoff_records), which are written
// by the bulk upsert-sync loop in withStore() and are out of scope for this slice.
import { createEngagement, createProject, createWorkPackage, createTask } from "./repositories/client-engagements-projects.repo.mjs";
// HM-S7 Phase 4c (2026-09-28): fifth proof-of-pattern slice -- Documents & Correspondence's
// createDeliverableDraftRecord (documents/document_versions) and createEvidenceBundleRecord
// (evidence_bundles) below, all built from pre-normalized builder objects
// (buildDeliverableDraft/buildEvidenceBundle) inside one existing transaction each. This
// domain's other 6 tables (document_register_entries, document_revision_records,
// correspondence_records, administrative_deadlines, transmittal_drafts,
// administration_skill_bindings) are written by the bulk upsert-sync loop in withStore() and
// are out of scope for this slice, same as the excluded tables in the second and third
// slices.
import { createDocument, createDocumentVersion, createEvidenceBundle } from "./repositories/documents-correspondence.repo.mjs";
import { createInvoice, createPaymentProviderConfig, createSubscriptionPackage, createCommercialLaunchControl, createBillingReadinessReview, createTenantUsageEvent } from "./repositories/finance-commercial.repo.mjs";
import { createMarketplaceListing as repoCreateMarketplaceListing, createDirectoryReviewBoardDecision, createDirectoryPrivateEnquiry, createQualificationRenewalReview, createCapacityOffer, createNetworkProfessionalProfile, createNetworkFirmProfile, createNetworkCapability, createNetworkCredential, createNetworkTrustSignal, createNetworkConflictCheck, createNetworkQualificationGate, createSpecialistInvitation, createCollaborationWorkspace, createCollaborationWorkspaceParticipant, createCollaborationWorkspaceEvidence, createResponsibilityMatrix, createObservatorySnapshot as repoCreateObservatorySnapshot } from "./repositories/network-marketplace.repo.mjs";
import { createPilotUser, createSupportCase, createPilotIncident, createPilotFeedback, createPilotAcceptanceReview, createPilotImprovementItem, createPilotReportPack, createStakeholderReviewBoard, createStakeholderReviewDecision, updateStakeholderReviewBoard, createPilotExpansionCohort, createTenantOnboardingPlan, createReleaseCandidateGate, createTenantPilotControl } from "./repositories/pilot-observatory.repo.mjs";
import { createWorkerInstance, createTaskOutput, createToolInvocation } from "./repositories/my-team-hr.repo.mjs";
import { createPolicyDecision } from "./repositories/audit-ledger-platform.repo.mjs";
import { createLead, createIntakeSession, createProposal, createPriceBuildUp } from "./repositories/sales-intake.repo.mjs";
import { createPaymentStatus, updateInvoice } from "./repositories/finance-commercial.repo.mjs";

const { Pool } = pg;
const root = process.cwd();
const storePath = process.env.VFIRM_STORE_PATH ?? join(root, "data/dev-store.json");

await loadLocalEnv(join(root, ".env.local"));

const databaseUrl = process.env.DATABASE_URL;
const requestedBackend = process.env.VFIRM_STORE_BACKEND;
const storeBackend = selectStoreBackend();
let pool;

const initialStore = () => ({
  tenants: [],
  service_packs: [],
  service_skus: [],
  worker_templates: [],
  worker_instances: [],
  awia_firm_package_assignments: [],
  awia_virtual_staff_provisioning_runs: [],
  awia_virtual_staff_seats: [],
  awia_virtual_staff_members: [],
  awia_staff_role_assignments: [],
  awia_staff_package_bindings: [],
  awia_staff_lifecycle_events: [],
  awia_staff_authority_decisions: [],
  awia_staff_evidence_packs: [],
  awia_staff_task_readiness_records: [],
  awia_staff_workdesk_items: [],
  awia_staff_output_drafts: [],
  awia_staff_output_reviews: [],
  awia_client_delivery_drafts: [],
  awia_staff_memory_entries: [],
  awia_staff_conversation_threads: [],
  awia_staff_conversation_messages: [],
  awia_staff_seat_billing_events: [],
  task_outputs: [],
  tool_invocations: [],
  marketplace_listings: [],
  directory_review_board_decisions: [],
  directory_private_enquiries: [],
  qualification_renewal_reviews: [],
  capacity_offers: [],
  collaboration_requests: [],
  network_professional_profiles: [],
  network_firm_profiles: [],
  network_capabilities: [],
  network_credentials: [],
  network_trust_signals: [],
  network_conflict_checks: [],
  network_qualification_gates: [],
  specialist_invitations: [],
  collaboration_workspaces: [],
  collaboration_workspace_participants: [],
  collaboration_workspace_evidence: [],
  responsibility_matrices: [],
  specialist_assignments: [],
  observatory_snapshots: [],
  pilot_users: [],
  support_cases: [],
  pilot_incidents: [],
  pilot_feedback: [],
  pilot_acceptance_reviews: [],
  pilot_improvement_items: [],
  pilot_report_packs: [],
  stakeholder_review_boards: [],
  stakeholder_review_decisions: [],
  pilot_expansion_cohorts: [],
  tenant_onboarding_plans: [],
  release_candidate_gates: [],
  tenant_pilot_controls: [],
  tenant_usage_events: [],
  billing_readiness_reviews: [],
  payment_provider_configs: [],
  subscription_packages: [],
  commercial_launch_controls: [],
  factory_firm_blueprints: [],
  factory_provisioning_runs: [],
  provisioned_firm_instances: [],
  factory_worker_bindings: [],
  pack_compatibility_checks: [],
  pack_binding_certifications: [],
  service_activation_records: [],
  firm_memberships: [],
  front_desk_enquiries: [],
  client_communication_drafts: [],
  professional_profiles: [],
  administration_skill_bindings: [],
  correspondence_records: [],
  document_register_entries: [],
  document_revision_records: [],
  administrative_deadlines: [],
  transmittal_drafts: [],
  commercial_skill_bindings: [],
  sales_pipeline_records: [],
  proposal_dispatch_records: [],
  expense_records: [],
  receivable_follow_ups: [],
  technical_skill_bindings: [],
  drawing_review_records: [],
  calculation_input_sets: [],
  technical_qa_findings: [],
  delivery_package_records: [],
  pilot_handoff_records: [],
  quotation_cases: [],
  boq_extraction_aids: [],
  quotation_draft_packs: [],
  quotation_issue_records: [],
  quotation_receivable_preparations: [],
  // ADR-089 W1 (B1, 2026-09-30): uploaded-file metadata (bytes live in Supabase Storage or on
  // local disk -- see apps/api/src/file-storage.mjs). Own relational table, migration 0048.
  file_objects: [],
  // ADR-090 W2 (B2): owner work requests -- the firm's front door. Migration 0049.
  work_requests: [],
  // CE-S1 (ADR-095): Connected EDCS collections. Postgres reads/writes its own tables directly
  // (edcs-repository.mjs, migration 0050); these empty arrays exist so the JSON dev/test backend,
  // whose normalizeStore() drops unknown keys, keeps them across saves.
  edcs_connections: [],
  edcs_transactions: [],
  edcs_transaction_revisions: [],
  edcs_sync_runs: [],
  edcs_sync_events: [],
  automation_rules: [],
  automation_rule_runs: [],
  professional_authorities: [],
  actors: [],
  persons: [],
  firms: [],
  clients: [],
  firm_client_relationships: [],
  leads: [],
  intake_sessions: [],
  price_build_ups: [],
  proposals: [],
  approvals: [],
  engagements: [],
  projects: [],
  work_packages: [],
  tasks: [],
  documents: [],
  document_versions: [],
  evidence_bundles: [],
  invoices: [],
  payment_statuses: [],
  policy_decisions: [],
  event_log: [],
  audit_events: []
});

export function newId(prefix) {
  return `${prefix}_${randomUUID()}`;
}

export function newUuid() {
  return randomUUID();
}

// Phase B (TD-009): stable, collision-resistant UUID derived from a deterministic natural-key
// string (e.g. "agent-<firm_id>-cfo-001"). Used only for the Postgres-relational surrogate id and
// for audit/event aggregate_id values, where the column type is `uuid` -- it never replaces the
// application-level natural key, which the rest of the codebase (lookups, frontend, smoke tests)
// continues to use unchanged on both backends.
export function deterministicUuid(seed) {
  const hash = createHash("sha256").update(String(seed)).digest("hex");
  const bytes = hash.slice(0, 32).split("");
  bytes[12] = "5";
  bytes[16] = "89ab"[parseInt(bytes[16], 16) % 4];
  const hex = bytes.join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

export function now() {
  return new Date().toISOString();
}

export function isPostgresStore() {
  return storeBackend === "postgres";
}

export function getStoreInfo() {
  return {
    backend: storeBackend,
    persistence: storeBackend === "postgres" ? "postgres-relational-ledger" : "local-json",
    relational_foundation: storeBackend === "postgres",
    relational_frontdoor: storeBackend === "postgres",
    relational_commercial: storeBackend === "postgres",
    relational_delivery: storeBackend === "postgres",
    relational_ledger: storeBackend === "postgres",
    database_url_configured: Boolean(databaseUrl),
    store_path: storeBackend === "json" ? storePath : null
  };
}

async function loadStore(tenantId = null) {
  // tenantId only ever does anything on the postgres backend (see loadPostgresStore's comment).
  // The JSON backend is dev/test-only -- confirmed in the Phase 2 audit that production only ever
  // runs postgres -- so there's no equivalent scoped-read path for it, and none is needed.
  if (storeBackend === "postgres") return loadPostgresStore(tenantId);
  return loadJsonStore();
}

async function saveStore(store, ledgerBaseline, recordBaseline) {
  if (storeBackend === "postgres") return savePostgresStore(store, ledgerBaseline, recordBaseline);
  return saveJsonStore(store);
}

async function loadJsonStore() {
  try {
    return normalizeStore(JSON.parse((await readFile(storePath, "utf8")).replace(/^\uFEFF/, "")));
  } catch (error) {
    if (error?.code === "ENOENT") return normalizeStore(initialStore());
    throw error;
  }
}

async function saveJsonStore(store) {
  await mkdir(dirname(storePath), { recursive: true });
  await writeFile(storePath, JSON.stringify(normalizeStore(store), null, 2), "utf8");
}

// HM-S7 Phase 4f, slice 2 (2026-09-29): loadPostgresStore() previously ran ~90+ unscoped
// "select * from <table>" queries one after another on a single held connection -- every one of
// them a full-table scan, in serial, with a full client<->server round trip paid before the next
// query was even sent. That per-request cost (not the small amount of JSON left in app_state,
// which turned out to be just 3 collections -- see the doc for the read-side audit) is the direct
// cause of the app's reported slowness. None of these ~90+ selects depend on each other or share
// a transaction (loadPostgresStore never wraps them in begin/commit, so there was never a
// consistent-snapshot guarantee to preserve), so firing them concurrently across the connection
// pool changes nothing about correctness -- only how long the wait takes. The one connection this
// function still checks out directly is released as soon as the small app_state row is read,
// before the concurrent relational reads start, so it doesn't sit idle holding a pool slot.
// HM-S7 Phase 4f follow-on (2026-09-30): tenantId is optional and additive -- every existing
// caller (loadStore(), withStore(), withAppState(), readStore(), all ~230 call sites) keeps
// calling this with no argument and gets today's exact unscoped behavior, unchanged. A caller
// that DOES pass a tenantId gets every relational table's read filtered to `where tenant_id =
// $1` (the ~4 genuinely global catalog tables -- service_packs, service_skus, worker_templates
// -- and `tenants` itself, which identifies a tenant rather than belonging to one, are never
// filtered, by design). This is the mechanism only: readStore(tenantId) is now safe to call
// directly wherever a handler genuinely just needs one tenant's data. Threading this into the
// ~230 existing withStore/withAppState/readStore call sites (most of which mix reads with a
// same-request mutation, so each needs its own per-handler audit before it's safe to scope) is
// deliberately NOT done in this pass -- see the architecture review doc for why, and the planned
// slice-by-slice approach for doing it, the same way Phase 4c/4d rolled out their own patterns.
async function loadPostgresStore(tenantId = null) {
  const client = await getPool().connect();
  let store;
  try {
    await ensureAppStateTable(client);
    const appStateResult = await client.query("select data from app_state where id = $1", ["mvp-store"]);
    store = appStateResult.rowCount === 0 ? initialStore() : normalizeStore(appStateResult.rows[0].data);
  } finally {
    client.release();
  }
  const [relational, awiaRelational, firmFactoryRelational, quotationAwiaRelational, workIntakeRelational] = await Promise.all([
    readRelationalStore(tenantId),
    readAwiaVirtualStaffRelational(tenantId),
    readFirmFactoryRelational(tenantId),
    readQuotationAwiaRelational(tenantId),
    readWorkIntakeRelational(tenantId)
  ]);
  return { ...store, ...relational, ...awiaRelational, ...firmFactoryRelational, ...quotationAwiaRelational, ...workIntakeRelational };
}

async function savePostgresStore(store, ledgerBaseline, recordBaseline) {
  const client = await getPool().connect();
  try {
    await ensureAppStateTable(client);
    // HM-S7 Phase 4a (2026-09-28): this sequence of 8 persist*FromStore calls plus the
    // app_state upsert previously ran with no begin/commit -- a genuine partial-write gap
    // (finding C.2 in the architecture review): if any call threw partway through, earlier
    // calls in the sequence were already committed (Postgres autocommit) and later ones
    // weren't, with no rollback. This affects every caller that reaches savePostgresStore,
    // both the bulk withStore() mutator path (e.g. hireAwiaFirmWorkerRecord's full
    // seat/member/role-assignment/package-binding/lifecycle-event/provisioning-run/
    // evidence-pack/event-audit write set) and withAppState()'s post-transactional
    // event/audit-append sweep. Wrapping the existing sequence in begin/commit/rollback is a
    // zero-call-site-change fix: on success nothing observable changes; on failure, every
    // table this function touches now rolls back together instead of leaving a partially
    // written store.
    await client.query("begin");
    await persistLedgerFromStore(client, store, ledgerBaseline);
    await persistAwiaVirtualStaffFromStore(client, store, recordBaseline);
    await persistFirmFactoryFromStore(client, store, recordBaseline);
    await persistQuotationAwiaFromStore(client, store, recordBaseline);
    await persistWorkIntakeFromStore(client, store, recordBaseline);
    await persistFrontDeskFromStore(client, store, recordBaseline);
    await persistAdministrationFromStore(client, store, recordBaseline);
    await persistCommercialOperationsFromStore(client, store, recordBaseline);
    await persistTechnicalDeliveryFromStore(client, store, recordBaseline);
    await client.query(
      `insert into app_state (id, data, updated_at)
       values ($1, $2::jsonb, now())
       on conflict (id) do update set data = excluded.data, updated_at = now()`,
      ["mvp-store", JSON.stringify(stripRelationalCollections(normalizeStore(store)))]
    );
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
async function persistLedgerFromStore(client, store, ledgerBaseline = {}) {
  await ensureSystemActor(client);
  const decisions = store.policy_decisions ?? [];
  for (const decision of decisions.slice(ledgerBaseline.policy_decisions ?? 0)) await upsertPolicyDecision(client, decision);
  const audits = store.audit_events ?? [];
  for (const audit of audits.slice(ledgerBaseline.audit_events ?? 0)) await upsertAuditEvent(client, audit);
  const events = store.event_log ?? [];
  for (const event of events.slice(ledgerBaseline.event_log ?? 0)) await upsertEventLog(client, event);
}

// HM-S7 Phase 4f, slice 3 (2026-09-29): first of the 7 remaining persist*FromStore domains to get
// the dedup treatment (see captureRecordBaseline's comment for why this is content-diff based,
// not baseline-array-length like the ledger). Audit: front_desk_enquiries rows are created by
// createFrontDeskEnquiryRecord (store.front_desk_enquiries.push(...)) and later mutated in place
// by handOffQualifiedEnquiry (Object.assign(current, {status: "HANDED_OFF", ...})) -- exactly the
// in-place-mutation case the ledger's technique can't handle, which changedRecords()'s
// content-diff approach does handle correctly. client_communication_drafts rows are only ever
// created (store.client_communication_drafts.push(...)), never mutated in place -- still safe to
// include since changedRecords() treats create-only collections the same as append-only ones.
async function persistFrontDeskFromStore(client, store, recordBaseline) {
  for (const item of changedRecords(store, "front_desk_enquiries", recordBaseline)) {
    if (!uuidOrNull(item.id)) continue;
    await client.query(`insert into front_desk_enquiries (id, tenant_id, firm_id, source_channel, contact_name, organization_name, contact_email, contact_phone, enquiry_summary, requested_service_hint, urgency, status, qualification_reason, consent_or_legal_basis_ref, conflict_check_status, conflict_check_ref, assigned_actor_id, client_id, relationship_id, lead_id, intake_session_id, created_at, updated_at, metadata) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24::jsonb) on conflict (id) do update set status=excluded.status, qualification_reason=excluded.qualification_reason, consent_or_legal_basis_ref=excluded.consent_or_legal_basis_ref, conflict_check_status=excluded.conflict_check_status, conflict_check_ref=excluded.conflict_check_ref, client_id=excluded.client_id, relationship_id=excluded.relationship_id, lead_id=excluded.lead_id, intake_session_id=excluded.intake_session_id, updated_at=excluded.updated_at, metadata=excluded.metadata`, [item.id,item.tenant_id,item.firm_id,item.source_channel,item.contact_name,item.organization_name,item.contact_email,item.contact_phone,item.enquiry_summary,item.requested_service_hint,item.urgency,item.status,item.qualification_reason,item.consent_or_legal_basis_ref,item.conflict_check_status,item.conflict_check_ref,uuidOrNull(item.assigned_actor_id),uuidOrNull(item.client_id),uuidOrNull(item.relationship_id),uuidOrNull(item.lead_id),uuidOrNull(item.intake_session_id),item.created_at,item.updated_at,JSON.stringify(item.metadata ?? {})]);
  }
  for (const item of changedRecords(store, "client_communication_drafts", recordBaseline)) {
    if (!uuidOrNull(item.id)) continue;
    await client.query(`insert into client_communication_drafts (id, tenant_id, firm_id, enquiry_id, channel, subject, body, status, requires_human_review, prepared_by_actor_id, approved_by_actor_id, sent_at, created_at, updated_at, metadata) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb) on conflict (id) do update set subject=excluded.subject, body=excluded.body, status=excluded.status, approved_by_actor_id=excluded.approved_by_actor_id, updated_at=excluded.updated_at, metadata=excluded.metadata`, [item.id,item.tenant_id,item.firm_id,item.enquiry_id,item.channel,item.subject,item.body,item.status,true,uuidOrNull(item.prepared_by_actor_id),uuidOrNull(item.approved_by_actor_id),item.sent_at,item.created_at,item.updated_at,JSON.stringify(item.metadata ?? {})]);
  }
}

async function ensureSystemActor(client) {
  await client.query(
    `insert into actors (id, actor_type, system_id, display_name, status, created_at, metadata)
     values ($1, 'SYSTEM', 'vfirm-system', 'vFirm System', 'ACTIVE', now(), '{}'::jsonb)
     on conflict (id) do nothing`,
    ["00000000-0000-0000-0000-000000000000"]
  );
}

// Phase B (TD-009): the 17 awia_* collections now have real Postgres tables (migration
// 0024_awia_virtual_staff_persistence.sql). All 17 share one shape (id uuid pk, natural_key text,
// tenant_id uuid, firm_id uuid, record jsonb, created_at/updated_at) so one generic persist/read
// pair covers every table instead of 17 bespoke column-by-column statements. The `record` column
// holds the exact JS object the rest of the codebase already reads and writes (including its own
// `id`/`agent_id`/`staff_seat_id`/... natural key, unchanged) -- reading it back is therefore exact,
// with zero field-mapping risk. Six of the seventeen collections (provisioning runs, seats, members,
// role assignments, package bindings, lifecycle events) carry deterministic natural-key ids such as
// `agent-<firm_id>-cfo-001` by design (see packages/core-domain/src/awia-virtual-staff-provisioning.mjs)
// so that re-provisioning the same firm/staff_code stays idempotent -- those ids are never converted
// to random UUIDs, on either backend. Since the Postgres `id` column is `uuid`, such rows get a
// stable surrogate key derived from their natural key with deterministicUuid(); the eleven runtime
// collections (workdesk items, output drafts/reviews, client delivery drafts, memory entries,
// conversation threads/messages, seat billing events, task-readiness/authority-decision records) use
// genuinely random ids that are already backend-aware (storeBackend === "postgres" ? newUuid() : ...,
// wired in above), so for those the surrogate key and the natural key are simply the same value.
// Phase 5, slice 5a (2026-09-30): server-owned equivalent of apps/web-console/public/js/
// pages-owner.js's classifyWorkdeskItem() + workdeskStatusLabel() (read directly from that
// file, cases mirrored exactly). Purely additive: attached as `display_status` (bucket) and
// `display_status_label` (raw label incl. Class A override) only on the GET /mvp/store
// response (see server.mjs's /mvp/store handler) -- nothing here is persisted, and no
// existing caller of readStore()/loadStore()/withStore()/withAppState() is touched or
// affected. The frontend keeps using its own classifyWorkdeskItem() until slice 5b
// explicitly cuts it over to read this field instead.
// ADR-089 W1 (B1, 2026-09-30): uploaded file metadata. The bytes themselves are written by
// apps/api/src/file-storage.mjs BEFORE this record is created (so a record never points at
// missing bytes); this function only records the already-stored object and its SHA-256.
export async function registerFileObjectRecord(body, actor) {
  return withStore((store) => {
    store.file_objects ??= [];
    const timestamp = now();
    const record = {
      id: body.file_id,
      tenant_id: body.tenant_id,
      firm_id: body.firm_id,
      filename: body.filename,
      mime_type: body.mime_type,
      size_bytes: body.size_bytes,
      sha256: body.sha256,
      storage_backend: body.storage_backend,
      storage_key: body.storage_key,
      classification: body.classification ?? "CLIENT_CONFIDENTIAL",
      purpose: body.purpose ?? "WORK_INPUT",
      linked_to: body.linked_to ?? null,
      scan_status: "NOT_SCANNED",
      status: "STORED",
      uploaded_by_actor_id: actor.actor_id ?? actor.id ?? null,
      created_at: timestamp,
      updated_at: timestamp
    };
    store.file_objects.push(record);
    appendEventAndAudit(store, { event_type: "file.uploaded", actor, tenant_id: body.tenant_id, firm_id: body.firm_id, aggregate_type: "FileObject", aggregate_id: record.id, payload: { filename: record.filename, mime_type: record.mime_type, size_bytes: record.size_bytes, sha256: record.sha256, purpose: record.purpose, storage_backend: record.storage_backend }, summary: "File uploaded to firm storage." });
    return record;
  });
}

export async function recordFileDownloadRecord(body, actor) {
  return withStore((store) => {
    const record = (store.file_objects ?? []).find((item) => item.id === body.file_id && item.tenant_id === body.tenant_id && item.firm_id === body.firm_id);
    if (!record) throwNotFound("file_objects", body.file_id);
    // CE-S2: a METADATA_ONLY record (content policy kept the bytes out) has nothing to download.
    if (record.status === "METADATA_ONLY" || !record.storage_key) {
      const error = new Error("This file is recorded as metadata and fingerprint only; its content is not stored in vFirm.");
      error.status = 409;
      error.code = "FILE_METADATA_ONLY";
      throw error;
    }
    appendEventAndAudit(store, { event_type: "file.downloaded", actor, tenant_id: body.tenant_id, firm_id: body.firm_id, aggregate_type: "FileObject", aggregate_id: record.id, payload: { filename: record.filename, sha256: record.sha256 }, summary: "File downloaded from firm storage." });
    return record;
  });
}

// Resolves every "file:<id>" ref in `refs` against store.file_objects, requiring each to belong
// to scope.tenant_id/scope.firm_id. Non-file refs are ignored (free-text evidence refs still work
// exactly as before). Returns the matched file records.
export function assertScopedFileRefs(store, refs, scope) {
  const matched = [];
  for (const ref of Array.isArray(refs) ? refs : []) {
    if (typeof ref !== "string" || !ref.startsWith("file:")) continue;
    const id = ref.slice("file:".length);
    const record = (store.file_objects ?? []).find((item) => item.id === id);
    if (!record || record.tenant_id !== scope.tenant_id || record.firm_id !== scope.firm_id) throwNotFound("file_objects", id);
    matched.push(record);
  }
  return matched;
}

// ---------------------------------------------------------------------------------------------
// ADR-090 W2 (B2, 2026-10-01): owner work requests -- the firm's front door.
// A work request is the owner's brief (title, instructions, input files, optional client/project,
// priority, due date, request type). It sits in the Workdesk Inbox until the owner assigns it
// (or is assigned immediately -- decision D3). Assigning creates an ad-hoc task (no proposal or
// project needed) and hands it to the EXISTING governed path, assignAwiaVirtualStaffTaskRecord,
// so the authority gate, position/skill scope and Class A rules apply unchanged. Requests with no
// client are INTERNAL firm work (decision D2) and can never be prepared for a client.
// ---------------------------------------------------------------------------------------------
const WORK_REQUEST_PRIORITIES = new Set(["LOW", "NORMAL", "HIGH"]);

function scopedFind(store, collection, id, scope) {
  return (store[collection] ?? []).find((record) => record.id === id && record.tenant_id === scope.tenant_id && record.firm_id === scope.firm_id);
}

// ---------------------------------------------------------------------------------------------
// ADR-093 W4 (B6, 2026-10-01): one conversation thread per workdesk item -- the item's timeline
// between the owner and the worker (assigned, needs info, owner replies/files, draft ready, review
// decisions, filed). Uses the existing awia_staff_conversation_threads/messages collections and
// their boundary checks (buildConversationThread/buildConversationMessage: participant roles,
// classification, bounded length, no reasoning traces). Only ever called in a withStore() AFTER the
// item itself was persisted (thread -> workdesk item FK on Postgres).
// ---------------------------------------------------------------------------------------------
const WITH_WORKER_STATUSES = new Set(["ASSIGNED", "REWORK", "NEEDS_INFO"]);

// The status an item returns to once the owner answers a NEEDS_INFO question.
function effectiveWorkdeskStatus(item) {
  return item.workdesk_status === "NEEDS_INFO" ? (item.needs_info_return_status ?? "ASSIGNED") : item.workdesk_status;
}

function ensureItemThread(store, item, actor) {
  store.awia_staff_conversation_threads ??= [];
  let thread = store.awia_staff_conversation_threads.find((record) => record.workdesk_item_id === item.id && record.tenant_id === item.tenant_id && record.firm_id === item.firm_id);
  if (thread) return thread;
  thread = buildConversationThread({
    thread_id: storeBackend === "postgres" ? newUuid() : newId("awia_staff_conversation_thread"),
    tenant_id: item.tenant_id,
    firm_id: item.firm_id,
    staff_code: item.staff_code,
    workdesk_item_id: item.id,
    task_id: item.task_id ?? null,
    opened_by_actor_id: actor?.actor_id ?? null,
    created_at: now()
  });
  store.awia_staff_conversation_threads.push(thread);
  item.thread_id = thread.id;
  return thread;
}

function postItemThreadMessage(store, item, actor, { role, kind, content, file_ids = [] }) {
  const thread = ensureItemThread(store, item, actor);
  store.awia_staff_conversation_messages ??= [];
  const built = buildConversationMessage({
    message_id: storeBackend === "postgres" ? newUuid() : newId("awia_staff_conversation_message"),
    thread_id: thread.id,
    tenant_id: item.tenant_id,
    firm_id: item.firm_id,
    staff_code: item.staff_code,
    participant_role: role,
    classification: "INTERNAL_OPERATIONAL_CONTEXT",
    content: String(content ?? "").slice(0, 4000),
    authored_by_actor_id: actor?.actor_id ?? null,
    created_at: now()
  });
  if (!built.accepted) invalidState(`Message rejected: ${built.findings.join(", ")}`);
  const message = { ...built.message, kind, workdesk_item_id: item.id, file_ids };
  store.awia_staff_conversation_messages.push(message);
  return message;
}

// The owner answered a NEEDS_INFO question (reply, files or corrected inputs): back to the worker.
function resumeFromNeedsInfo(item) {
  if (item.workdesk_status !== "NEEDS_INFO") return false;
  item.workdesk_status = item.needs_info_return_status ?? "ASSIGNED";
  item.needs_info_return_status = null;
  item.last_run_error = null;
  item.updated_at = now();
  return true;
}

// ADR-093 W4 (B7): files an approved output into the firm's document register when the work is
// closed (marked sent, or internal work completed). One register entry per workdesk item; a later
// filing of the same item adds a revision. Only real output files are filed (storage_ref
// "file:<id>", content_hash = the file's SHA-256) -- no placeholders.
function fileWorkdeskOutputToRegister(store, item, outputDraft, actor) {
  if (!outputDraft?.output_file_id) return null;
  const file = (store.file_objects ?? []).find((record) => record.id === outputDraft.output_file_id && record.tenant_id === item.tenant_id && record.firm_id === item.firm_id);
  if (!file) return null;
  store.document_register_entries ??= [];
  store.document_revision_records ??= [];
  const scope = { tenant_id: item.tenant_id, firm_id: item.firm_id };
  const request = item.work_request_id ? scopedFind(store, "work_requests", item.work_request_id, scope) : null;
  const project = item.project_id ? scopedFind(store, "projects", item.project_id, scope) : null;
  const timestamp = now();
  let entry = store.document_register_entries.find((record) => record.tenant_id === item.tenant_id && record.firm_id === item.firm_id && record.metadata?.workdesk_item_id === item.id);
  let revisionLabel = "R1";
  let previous = null;
  if (!entry) {
    const firmEntries = store.document_register_entries.filter((record) => record.tenant_id === item.tenant_id && record.firm_id === item.firm_id);
    const base = request?.request_number ? `${request.request_number}-OUT` : `OUT-${String(firmEntries.length + 1).padStart(4, "0")}`;
    let number = base;
    for (let n = 2; firmEntries.some((record) => record.document_number === number); n += 1) number = `${base}-${n}`;
    entry = { id: sf3Id("document_register"), tenant_id: item.tenant_id, firm_id: item.firm_id, relationship_id: project?.relationship_id ?? null, project_id: project?.id ?? null, document_number: number, title: outputDraft.output_title ?? file.filename, document_type: "WORK_OUTPUT", discipline: null, classification: file.classification ?? "CLIENT_CONFIDENTIAL", status: "ACTIVE", current_revision_id: null, owner_actor_id: actor?.actor_id ?? null, created_at: timestamp, updated_at: timestamp, metadata: { source: "workdesk", workdesk_item_id: item.id, work_request_id: item.work_request_id ?? null, staff_code: item.staff_code, risk_class: item.risk_class ?? null } };
    store.document_register_entries.push(entry);
  } else {
    previous = store.document_revision_records.find((record) => record.id === entry.current_revision_id) ?? null;
    if (previous?.metadata?.file_id === file.id) return entry; // already filed
    const count = store.document_revision_records.filter((record) => record.document_register_entry_id === entry.id).length;
    revisionLabel = `R${count + 1}`;
    if (previous) previous.status = "SUPERSEDED";
  }
  const revision = { id: sf3Id("document_revision"), tenant_id: item.tenant_id, firm_id: item.firm_id, document_register_entry_id: entry.id, revision: revisionLabel, version_label: revisionLabel, storage_ref: `file:${file.id}`, content_hash: file.sha256, status: "CURRENT", supersedes_revision_id: previous?.id ?? null, created_by_actor_id: actor?.actor_id ?? null, created_at: timestamp, metadata: { file_id: file.id, filename: file.filename, output_draft_id: outputDraft.id, output_revision_number: outputDraft.revision_number ?? 1 } };
  store.document_revision_records.push(revision);
  entry.current_revision_id = revision.id;
  entry.updated_at = timestamp;
  item.filed_document_id = entry.id;
  appendEventAndAudit(store, { event_type: "document.work_output_filed", actor, tenant_id: item.tenant_id, firm_id: item.firm_id, aggregate_type: "DocumentRegisterEntry", aggregate_id: entry.id, payload: { document_number: entry.document_number, revision: revisionLabel, workdesk_item_id: item.id, file_id: file.id, sha256: file.sha256 }, summary: "Approved work output filed in the document register." });
  return entry;
}

export async function createWorkRequestRecord(body, actor) {
  return withStore((store) => {
    store.work_requests ??= [];
    const { found, type } = resolveWorkRequestType(body.request_type_id);
    if (!found) invalidState(`Unknown request type: ${body.request_type_id}`);
    const title = String(body.title ?? "").trim();
    if (!title) invalidState("A work request needs a title.");
    const priority = String(body.priority ?? "NORMAL").toUpperCase();
    if (!WORK_REQUEST_PRIORITIES.has(priority)) invalidState(`Unknown priority: ${body.priority}`);
    // Client/project must belong to this firm; a project implies its own client.
    let clientId = body.client_id ?? null;
    let projectId = body.project_id ?? null;
    if (projectId) {
      const project = scopedFind(store, "projects", projectId, body);
      if (!project) throwNotFound("projects", projectId);
      const relationship = scopedFind(store, "firm_client_relationships", project.relationship_id, body);
      const projectClientId = relationship?.client_id ?? null;
      if (clientId && projectClientId && clientId !== projectClientId) invalidState("The selected project belongs to a different client.");
      clientId = clientId ?? projectClientId;
    }
    if (clientId) {
      const client = scopedFind(store, "clients", clientId, body);
      const relationship = (store.firm_client_relationships ?? []).find((record) => record.client_id === clientId && record.tenant_id === body.tenant_id && record.firm_id === body.firm_id);
      if (!client && !relationship) throwNotFound("clients", clientId);
    }
    // The authority gate scopes all non-INTERNAL work to a client AND a project (TASK_SCOPE_REQUIRED,
    // unchanged by D2). Say so up front instead of failing later at assignment. Pre-sales work on a
    // prospect (e.g. scoring a lead) is the firm's own work: leave the client empty.
    if (clientId && !projectId) invalidState("Client work must be linked to one of the client's projects. For the firm's own work (including pre-sales on a prospect), leave the client empty.");
    const fileIds = Array.isArray(body.file_ids) ? [...new Set(body.file_ids)] : [];
    assertScopedFileRefs(store, fileIds.map((id) => `file:${id}`), body);
    const references = (Array.isArray(body.references) ? body.references : []).map((ref) => String(ref).trim()).filter(Boolean).slice(0, 10);
    // Deterministic ARO-01 triage over the brief -- a suggestion only, never an assignment.
    const triage = triageAdministrativeRequest({ request_subject: title, request_body: body.instructions ?? "" });
    const firmRequests = store.work_requests.filter((record) => record.tenant_id === body.tenant_id && record.firm_id === body.firm_id);
    const timestamp = now();
    const request = {
      id: storeBackend === "postgres" ? newUuid() : newId("work_request"),
      tenant_id: body.tenant_id,
      firm_id: body.firm_id,
      request_number: `WR-${String(firmRequests.length + 1).padStart(4, "0")}`,
      title,
      instructions: String(body.instructions ?? "").trim() || null,
      request_type_id: type.id,
      request_type_label: type.label,
      position_id: type.position_id ?? null,
      role_code: type.role_code,
      tool: type.tool,
      skill_id: type.skill_id ?? null,
      class_a: type.class_a === true,
      client_id: clientId,
      project_id: projectId,
      risk_class: clientId ? "CONTROLLED" : "INTERNAL",
      priority,
      due_at: body.due_at || null,
      file_ids: fileIds,
      // ADR-092 W3: the skill's own inputs (form fields + which file is which), sanitized against
      // the runner's definitions -- unknown keys are dropped.
      form_inputs: sanitizeSkillFormInputs(type.skill_id, body.form_inputs),
      file_roles: sanitizeFileRoles(type.skill_id, body.file_roles, fileIds),
      references,
      // CE-S3: where the request came from when a BizKick rule raised it (shown as "From BizKick: <id>").
      source: body.source && typeof body.source === "object" && body.source.type === "BIZKICK_RULE"
        ? { type: "BIZKICK_RULE", transaction_id: String(body.source.transaction_id ?? "").slice(0, 60), rule_id: String(body.source.rule_id ?? "").slice(0, 60), rule_name: String(body.source.rule_name ?? "").slice(0, 120), reason: String(body.source.reason ?? "").slice(0, 80) }
        : null,
      triage_suggestion: { category: triage.category, priority: triage.priority, routed_to: triage.routed_to, suggested_position_id: positionForTriageQueue[triage.routed_to] ?? null, rationale: triage.rationale, boundary: triage.boundary },
      status: "SUBMITTED",
      task_id: null,
      workdesk_item_id: null,
      assigned_staff_code: null,
      last_assignment_error: null,
      created_by_actor_id: actor.actor_id ?? actor.id ?? null,
      created_at: timestamp,
      updated_at: timestamp
    };
    store.work_requests.push(request);
    appendEventAndAudit(store, { event_type: "work_request.submitted", actor, tenant_id: body.tenant_id, firm_id: body.firm_id, aggregate_type: "WorkRequest", aggregate_id: request.id, payload: { request_number: request.request_number, request_type_id: request.request_type_id, risk_class: request.risk_class, file_count: fileIds.length, priority }, summary: "Owner submitted a work request to the firm." });
    return request;
  });
}

// Checks the chosen worker can take this request, then makes sure the request has its ad-hoc task
// (created once; a retried assignment after a refusal reuses it). Returns what the caller needs to
// run the governed assignment.
export async function prepareWorkRequestAssignment(body) {
  const store = await loadStore();
  const request = scopedFind(store, "work_requests", body.work_request_id, body);
  if (!request) throwNotFound("work_requests", body.work_request_id);
  if (request.status !== "SUBMITTED") invalidState(`Only a SUBMITTED work request can be assigned (this one is ${request.status}).`);
  const member = (store.awia_virtual_staff_members ?? []).find((record) => record.organization_id === body.tenant_id && record.firm_id === body.firm_id && record.agent_code === body.staff_code);
  if (!member) throwNotFound("awia_virtual_staff_members", body.staff_code);
  if (member.lifecycle_status !== "ACTIVE") invalidState(`${member.display_name ?? body.staff_code} is ${member.lifecycle_status}, not ACTIVE.`);
  const role = (store.awia_staff_role_assignments ?? []).find((record) => record.staff_code === body.staff_code && (record.firm_id ?? body.firm_id) === body.firm_id);
  const { type } = resolveWorkRequestType(request.request_type_id);
  if (!workerFitsRequestType(member, role, type)) invalidState(`${member.display_name ?? body.staff_code} cannot take "${type.label}" requests -- choose a worker in that position.`);
  let taskId = request.task_id;
  if (!taskId || !(store.tasks ?? []).some((task) => task.id === taskId)) {
    const task = {
      id: storeBackend === "postgres" ? newUuid() : newId("task"),
      tenant_id: body.tenant_id,
      firm_id: body.firm_id,
      project_id: request.project_id ?? null,
      work_package_id: null,
      task_type: request.request_type_id,
      input_ref: `work-request:${request.id}`,
      output_ref: null,
      assigned_actor_or_worker_ref: null,
      state: "CREATED",
      risk_class: request.risk_class,
      due_at: request.due_at ?? null,
      created_at: now(),
      updated_at: now()
    };
    if (storeBackend === "postgres") {
      const clientConn = await getPool().connect();
      try {
        await clientConn.query("begin");
        await setTenantContext(clientConn, body.tenant_id);
        await createTask(task, clientConn);
        await clientConn.query("commit");
      } catch (error) {
        await clientConn.query("rollback");
        throw error;
      } finally {
        clientConn.release();
      }
      await withStore((next) => {
        const wr = scopedFind(next, "work_requests", request.id, body);
        if (wr) { wr.task_id = task.id; wr.updated_at = now(); }
        return wr;
      });
    } else {
      await withStore((next) => {
        next.tasks.push(task);
        const wr = scopedFind(next, "work_requests", request.id, body);
        if (wr) { wr.task_id = task.id; wr.updated_at = now(); }
        return wr;
      });
    }
    taskId = task.id;
  }
  // Skill scope needs the worker's position; a pre-position worker runs without it.
  const skillId = member.position_id && request.skill_id ? request.skill_id : undefined;
  return {
    request,
    assignment: {
      tenant_id: body.tenant_id,
      firm_id: body.firm_id,
      staff_code: body.staff_code,
      task_id: taskId,
      tool: request.tool,
      action: request.tool,
      skill_id: skillId,
      client_id: request.client_id ?? null,
      project_id: request.project_id ?? null,
      risk_class: request.risk_class,
      evidence_refs: [...request.file_ids.map((id) => `file:${id}`), ...request.references, `work-request:${request.id}`],
      assignment_summary: request.title,
      instructions: request.instructions,
      due_at: request.due_at,
      work_request_id: request.id
    }
  };
}

export async function recordWorkRequestAssignmentRecord(body, actor, outcome) {
  return withStore((store) => {
    const request = scopedFind(store, "work_requests", body.work_request_id, body);
    if (!request) throwNotFound("work_requests", body.work_request_id);
    if (outcome.error) {
      request.last_assignment_error = outcome.error;
      request.updated_at = now();
      appendEventAndAudit(store, { event_type: "work_request.assignment_refused", actor, tenant_id: body.tenant_id, firm_id: body.firm_id, aggregate_type: "WorkRequest", aggregate_id: request.id, payload: { staff_code: body.staff_code, error: outcome.error }, summary: "Work request assignment refused by the governed path; request stays in the Inbox." });
      return request;
    }
    request.status = "ASSIGNED";
    request.assigned_staff_code = body.staff_code;
    request.workdesk_item_id = outcome.workdesk_item_id;
    request.assigned_by_actor_id = actor.actor_id ?? actor.id ?? null;
    request.assigned_at = now();
    request.last_assignment_error = null;
    request.updated_at = now();
    // ADR-093 W4 (B6): the item's thread starts with the hand-over.
    const assignedItem = scopedFind(store, "awia_staff_workdesk_items", outcome.workdesk_item_id, body);
    if (assignedItem) {
      const fileCount = (request.file_ids ?? []).length;
      postItemThreadMessage(store, assignedItem, actor, { role: "VIRTUAL_STAFF", kind: "ASSIGNED", content: `Received ${request.request_number}: "${request.title}" with ${fileCount} input file${fileCount === 1 ? "" : "s"}.${isRunnableSkill(request.skill_id) ? " I can work this out from the inputs as soon as you press the button." : " I can't produce this kind of work automatically yet: attach the finished file when it's done."}` });
    }
    appendEventAndAudit(store, { event_type: "work_request.assigned", actor, tenant_id: body.tenant_id, firm_id: body.firm_id, aggregate_type: "WorkRequest", aggregate_id: request.id, payload: { staff_code: body.staff_code, workdesk_item_id: outcome.workdesk_item_id, task_id: request.task_id }, summary: "Work request assigned to a team member." });
    return request;
  });
}

export async function cancelWorkRequestRecord(body, actor) {
  return withStore((store) => {
    const request = scopedFind(store, "work_requests", body.work_request_id, body);
    if (!request) throwNotFound("work_requests", body.work_request_id);
    if (request.status !== "SUBMITTED") invalidState("Only a work request still in the Inbox can be cancelled.");
    request.status = "CANCELLED";
    request.cancelled_reason = String(body.reason ?? "").trim() || "cancelled_by_owner";
    request.cancelled_by_actor_id = actor.actor_id ?? actor.id ?? null;
    request.cancelled_at = now();
    request.updated_at = now();
    appendEventAndAudit(store, { event_type: "work_request.cancelled", actor, tenant_id: body.tenant_id, firm_id: body.firm_id, aggregate_type: "WorkRequest", aggregate_id: request.id, payload: { reason: request.cancelled_reason }, summary: "Owner cancelled a work request." });
    return request;
  });
}

// Adds input files to a request. If it has already been assigned and the worker has not produced
// a draft yet (ASSIGNED / REWORK), the files are also added to the workdesk item's evidence.
export async function addWorkRequestFilesRecord(body, actor) {
  return withStore((store) => {
    const request = scopedFind(store, "work_requests", body.work_request_id, body);
    if (!request) throwNotFound("work_requests", body.work_request_id);
    if (request.status === "CANCELLED") invalidState("Cannot add files to a cancelled work request.");
    const fileIds = Array.isArray(body.file_ids) ? body.file_ids : [];
    if (!fileIds.length) invalidState("No files to add.");
    assertScopedFileRefs(store, fileIds.map((id) => `file:${id}`), body);
    const item = request.workdesk_item_id ? scopedFind(store, "awia_staff_workdesk_items", request.workdesk_item_id, body) : null;
    if (item && !WITH_WORKER_STATUSES.has(item.workdesk_status)) invalidState("Files can only be added before the worker's draft is in review.");
    request.file_ids = [...new Set([...(request.file_ids ?? []), ...fileIds])];
    // ADR-092 W3: optional slot for the added files (e.g. a corrected bank statement replaces the
    // one in the "bank_statement" slot -- the newest file in a slot is the one the skill reads).
    const roleMap = body.file_role ? Object.fromEntries(fileIds.map((id) => [id, body.file_role])) : (body.file_roles ?? {});
    const addedRoles = sanitizeFileRoles(request.skill_id, roleMap, fileIds);
    if (Object.keys(addedRoles).length) {
      const replacedRoles = new Set(Object.values(addedRoles));
      request.file_roles = { ...Object.fromEntries(Object.entries(request.file_roles ?? {}).filter(([, role]) => !replacedRoles.has(role))), ...addedRoles };
    }
    request.updated_at = now();
    if (item) {
      item.evidence_refs = [...new Set([...(item.evidence_refs ?? []), ...fileIds.map((id) => `file:${id}`)])];
      item.updated_at = now();
      // ADR-093 W4: adding files answers a "needs info" question and shows on the item's timeline.
      resumeFromNeedsInfo(item);
      const names = fileIds.map((id) => (store.file_objects ?? []).find((f) => f.id === id)?.filename).filter(Boolean);
      postItemThreadMessage(store, item, actor, { role: "HUMAN_SUPERVISOR", kind: "FILES_ADDED", content: `Added ${names.length} file${names.length === 1 ? "" : "s"}: ${names.join(", ")}.`, file_ids: fileIds });
    }
    appendEventAndAudit(store, { event_type: "work_request.files_added", actor, tenant_id: body.tenant_id, firm_id: body.firm_id, aggregate_type: "WorkRequest", aggregate_id: request.id, payload: { file_ids: fileIds, workdesk_item_id: item?.id ?? null }, summary: "Owner added input files to a work request." });
    return { work_request: request, workdesk_item: item ?? null };
  });
}

// ADR-092 W3: the owner corrects the skill's form inputs (e.g. after "Fill in: start date"). Allowed
// while the request is in the Inbox or the worker has not produced a draft yet (ASSIGNED / REWORK).
export async function updateWorkRequestInputsRecord(body, actor) {
  return withStore((store) => {
    const request = scopedFind(store, "work_requests", body.work_request_id, body);
    if (!request) throwNotFound("work_requests", body.work_request_id);
    if (request.status === "CANCELLED") invalidState("Cannot change a cancelled work request.");
    const item = request.workdesk_item_id ? scopedFind(store, "awia_staff_workdesk_items", request.workdesk_item_id, body) : null;
    if (item && !WITH_WORKER_STATUSES.has(item.workdesk_status)) invalidState("Inputs can only be changed before the worker's draft is in review.");
    request.form_inputs = sanitizeSkillFormInputs(request.skill_id, body.form_inputs);
    if (body.file_roles) request.file_roles = sanitizeFileRoles(request.skill_id, body.file_roles, request.file_ids ?? []);
    request.updated_at = now();
    if (item) {
      resumeFromNeedsInfo(item);
      postItemThreadMessage(store, item, actor, { role: "HUMAN_SUPERVISOR", kind: "INPUTS_UPDATED", content: "Updated the request's inputs." });
    }
    appendEventAndAudit(store, { event_type: "work_request.inputs_updated", actor, tenant_id: body.tenant_id, firm_id: body.firm_id, aggregate_type: "WorkRequest", aggregate_id: request.id, payload: { fields: Object.keys(request.form_inputs), workdesk_item_id: item?.id ?? null }, summary: "Owner updated a work request's inputs." });
    return request;
  });
}

// ADR-092 W3 (B4): read-only preparation for a skill run (the API then fetches the file bytes from
// storage and calls runSkill()). Checks the item can still produce a draft, the worker is active,
// the request type has a deterministic module, and every input file belongs to this tenant/firm.
export async function prepareAwiaSkillRunRecord(body) {
  const store = await loadStore();
  const item = scopedFind(store, "awia_staff_workdesk_items", body.workdesk_item_id, body);
  if (!item) throwNotFound("awia_staff_workdesk_items", body.workdesk_item_id);
  if (!WITH_WORKER_STATUSES.has(item.workdesk_status)) invalidState("The worker can only run this while it is with them (Pending).");
  const member = (store.awia_virtual_staff_members ?? []).find((record) => record.id === item.staff_member_id && record.lifecycle_status === "ACTIVE");
  if (!member) invalidState(`${item.staff_code} is not ACTIVE -- reactivate them in My Team first.`);
  const request = item.work_request_id ? scopedFind(store, "work_requests", item.work_request_id, body) : null;
  if (!request) invalidState("Only work given through a request can be run automatically; attach the finished output file instead.");
  if (!isRunnableSkill(request.skill_id)) invalidState(`"${request.request_type_label}" cannot be run automatically yet -- attach the finished output file instead.`);
  const files = assertScopedFileRefs(store, (request.file_ids ?? []).map((id) => `file:${id}`), body);
  return { item, request, member, files, skill_id: request.skill_id };
}

// ADR-092 W3: records why a run could not start (missing inputs) on the item, so the Workdesk shows
// it; the item stays Pending.
export async function recordAwiaSkillRunIssueRecord(body, actor, message) {
  return withStore((store) => {
    const item = scopedFind(store, "awia_staff_workdesk_items", body.workdesk_item_id, body);
    if (!item) return null;
    item.last_run_error = message;
    // ADR-093 W4 (B6): the worker is now waiting on the owner -- NEEDS_INFO (Inbox), remembering
    // where to return once answered (ASSIGNED, or REWORK during a revision).
    if (item.workdesk_status !== "NEEDS_INFO") {
      item.needs_info_return_status = item.workdesk_status;
      item.workdesk_status = "NEEDS_INFO";
    }
    item.updated_at = now();
    postItemThreadMessage(store, item, actor, { role: "VIRTUAL_STAFF", kind: "NEEDS_INFO", content: `I need more from you before I can do this. ${message}` });
    appendEventAndAudit(store, { event_type: "awia.virtual_staff.skill_run_needs_input", actor, tenant_id: body.tenant_id, firm_id: body.firm_id, aggregate_type: "AwiaStaffWorkdeskItem", aggregate_id: item.id, payload: { skill_id: item.skill_id ?? null, message }, summary: "Skill run needs more input from the owner." });
    return item;
  });
}

// Files approved INTERNAL work (decision D2): REVIEWED_FOR_CLIENT_DRAFT -> ARCHIVED_COMPLETED.
// Requires the same human approval as client work; only the client-delivery step is replaced.
export async function completeAwiaInternalWorkdeskItemRecord(body, actor) {
  return withStore((store) => {
    const item = scopedFind(store, "awia_staff_workdesk_items", body.workdesk_item_id, body);
    if (!item) throwNotFound("awia_staff_workdesk_items", body.workdesk_item_id);
    if (item.risk_class !== "INTERNAL") invalidState("Only INTERNAL firm work can be completed without client delivery.");
    if (item.workdesk_status !== "REVIEWED_FOR_CLIENT_DRAFT") invalidState("Internal work must be approved by you before it can be completed.");
    item.workdesk_status = "ARCHIVED_COMPLETED";
    item.archived_at = now();
    item.archived_by_actor_id = actor.actor_id;
    item.archived_reason = "internal_work_completed";
    item.updated_at = now();
    const task = store.tasks.find((record) => record.id === item.task_id);
    if (task) { task.state = "COMPLETED"; task.updated_at = now(); }
    // ADR-093 W4 (B7): file the approved output in the document register.
    const filed = fileWorkdeskOutputToRegister(store, item, store.awia_staff_output_drafts.find((record) => record.id === item.output_draft_id), actor);
    if (item.work_request_id) postItemThreadMessage(store, item, actor, { role: "HUMAN_SUPERVISOR", kind: "CLOSED", content: `Marked complete.${filed ? ` Filed in Documents as ${filed.document_number}.` : ""}` });
    appendEventAndAudit(store, { event_type: "awia.virtual_staff.internal_work_completed", actor, tenant_id: body.tenant_id, firm_id: body.firm_id, aggregate_type: "AwiaStaffWorkdeskItem", aggregate_id: item.id, payload: { output_draft_id: item.output_draft_id, work_request_id: item.work_request_id ?? null }, summary: "Owner filed approved internal work as complete." });
    return { workdesk_item: item, filed_document: filed };
  });
}

// ADR-093 W4 (B6): the owner writes on an item's thread -- a note, an answer to the worker's
// question, optionally with files (added to the request and the item's evidence while the work is
// still with the worker). Answering a NEEDS_INFO item sends it back to the worker.
export async function postWorkdeskItemMessageRecord(body, actor) {
  return withStore((store) => {
    const item = scopedFind(store, "awia_staff_workdesk_items", body.workdesk_item_id, body);
    if (!item) throwNotFound("awia_staff_workdesk_items", body.workdesk_item_id);
    const content = String(body.content ?? "").trim();
    const fileIds = Array.isArray(body.file_ids) ? [...new Set(body.file_ids)] : [];
    if (!content && !fileIds.length) invalidState("Write a message or attach a file.");
    if (fileIds.length) {
      if (!WITH_WORKER_STATUSES.has(item.workdesk_status)) invalidState("Files can only be added while the work is with the worker.");
      assertScopedFileRefs(store, fileIds.map((id) => `file:${id}`), body);
      item.evidence_refs = [...new Set([...(item.evidence_refs ?? []), ...fileIds.map((id) => `file:${id}`)])];
      const request = item.work_request_id ? scopedFind(store, "work_requests", item.work_request_id, body) : null;
      if (request) { request.file_ids = [...new Set([...(request.file_ids ?? []), ...fileIds])]; request.updated_at = now(); }
    }
    const resumed = resumeFromNeedsInfo(item);
    item.updated_at = now();
    const message = postItemThreadMessage(store, item, actor, { role: "HUMAN_SUPERVISOR", kind: resumed ? "ANSWER" : "NOTE", content: content || `Attached ${fileIds.length} file${fileIds.length === 1 ? "" : "s"}.`, file_ids: fileIds });
    appendEventAndAudit(store, { event_type: "awia.virtual_staff.workdesk_item_message_posted", actor, tenant_id: body.tenant_id, firm_id: body.firm_id, aggregate_type: "AwiaStaffWorkdeskItem", aggregate_id: item.id, payload: { message_id: message.id, file_count: fileIds.length, resumed_from_needs_info: resumed }, summary: resumed ? "Owner answered the worker's question; work is back with the worker." : "Owner posted a note on a workdesk item." });
    return { message, workdesk_item: item };
  });
}

// ADR-093 W4 (F3): the owner files a document straight into the firm's register from an uploaded
// file (storage_ref "file:<id>", content_hash = its SHA-256 -- no hand-typed hashes). Numbered
// DOC-0001... unless the owner gives a number; optional project (its client follows).
export async function registerFileDocumentRecord(body, actor) {
  return withStore((store) => {
    store.document_register_entries ??= [];
    store.document_revision_records ??= [];
    if (!body.file_id) invalidState("Choose a file to register.");
    const [file] = assertScopedFileRefs(store, [`file:${body.file_id}`], body);
    const title = String(body.title ?? "").trim() || file.filename;
    const project = body.project_id ? scopedFind(store, "projects", body.project_id, body) : null;
    if (body.project_id && !project) throwNotFound("projects", body.project_id);
    const firmEntries = store.document_register_entries.filter((record) => record.tenant_id === body.tenant_id && record.firm_id === body.firm_id);
    let number = String(body.document_number ?? "").trim().slice(0, 60);
    if (number) {
      if (firmEntries.some((record) => record.document_number === number)) invalidState(`Document number ${number} already exists in this firm.`);
    } else {
      let n = firmEntries.filter((record) => /^DOC-\d+$/.test(record.document_number)).length + 1;
      do { number = `DOC-${String(n).padStart(4, "0")}`; n += 1; } while (firmEntries.some((record) => record.document_number === number));
    }
    const timestamp = now();
    const documentType = String(body.document_type ?? "GENERAL").toUpperCase().replace(/[^A-Z_]/g, "_").slice(0, 40) || "GENERAL";
    const entry = { id: sf3Id("document_register"), tenant_id: body.tenant_id, firm_id: body.firm_id, relationship_id: project?.relationship_id ?? null, project_id: project?.id ?? null, document_number: number, title: title.slice(0, 200), document_type: documentType, discipline: null, classification: file.classification ?? "CLIENT_CONFIDENTIAL", status: "ACTIVE", current_revision_id: null, owner_actor_id: actor.actor_id ?? null, created_at: timestamp, updated_at: timestamp, metadata: { source: "owner_upload" } };
    const revision = { id: sf3Id("document_revision"), tenant_id: body.tenant_id, firm_id: body.firm_id, document_register_entry_id: entry.id, revision: "R1", version_label: "R1", storage_ref: `file:${file.id}`, content_hash: file.sha256, status: "CURRENT", supersedes_revision_id: null, created_by_actor_id: actor.actor_id ?? null, created_at: timestamp, metadata: { file_id: file.id, filename: file.filename, note: String(body.note ?? "").trim().slice(0, 500) || null } };
    entry.current_revision_id = revision.id;
    store.document_register_entries.push(entry);
    store.document_revision_records.push(revision);
    appendEventAndAudit(store, { event_type: "administration.document_registered", actor, tenant_id: body.tenant_id, firm_id: body.firm_id, aggregate_type: "DocumentRegisterEntry", aggregate_id: entry.id, payload: { document_number: entry.document_number, revision: "R1", file_id: file.id, sha256: file.sha256 }, summary: "Document registered from an uploaded file." });
    return { document: entry, revision };
  });
}

export async function reviseFileDocumentRecord(body, actor) {
  return withStore((store) => {
    const entry = scopedFind(store, "document_register_entries", body.document_register_entry_id, body);
    if (!entry) throwNotFound("document_register_entries", body.document_register_entry_id);
    if (!body.file_id) invalidState("Choose a file for the new revision.");
    const [file] = assertScopedFileRefs(store, [`file:${body.file_id}`], body);
    const revisions = (store.document_revision_records ?? []).filter((record) => record.document_register_entry_id === entry.id);
    const previous = revisions.find((record) => record.id === entry.current_revision_id) ?? null;
    if (previous?.content_hash === file.sha256) invalidState("This file is identical to the current revision.");
    let n = revisions.length + 1;
    while (revisions.some((record) => record.revision === `R${n}`)) n += 1;
    const label = `R${n}`;
    if (previous) previous.status = "SUPERSEDED";
    const timestamp = now();
    const revision = { id: sf3Id("document_revision"), tenant_id: body.tenant_id, firm_id: body.firm_id, document_register_entry_id: entry.id, revision: label, version_label: label, storage_ref: `file:${file.id}`, content_hash: file.sha256, status: "CURRENT", supersedes_revision_id: previous?.id ?? null, created_by_actor_id: actor.actor_id ?? null, created_at: timestamp, metadata: { file_id: file.id, filename: file.filename, note: String(body.note ?? "").trim().slice(0, 500) || null } };
    store.document_revision_records.push(revision);
    entry.current_revision_id = revision.id;
    entry.updated_at = timestamp;
    appendEventAndAudit(store, { event_type: "administration.document_revision_registered", actor, tenant_id: body.tenant_id, firm_id: body.firm_id, aggregate_type: "DocumentRegisterEntry", aggregate_id: entry.id, payload: { revision_id: revision.id, revision: label, supersedes_revision_id: previous?.id ?? null, sha256: file.sha256 }, summary: "New document revision registered from an uploaded file; prior revision superseded." });
    return { document: entry, revision, previous_revision: previous };
  });
}

// CE-S2 (ADR-096, 2026-10-05): file a BizKick transaction's file in the firm's document register.
// One withStore call = one transaction: the file_objects record, the document register entry
// (numbered with the Transaction ID), the revision and the audit event commit together or not at all.
// The same SHA-256 as the current revision changes nothing (UNCHANGED); a different one is a new
// revision and the prior is SUPERSEDED. `body.content_stored` false means the content policy (D7)
// keeps metadata + fingerprint only: the file record exists with no storage key and cannot be
// downloaded. Callers: apps/api/src/edcs-service.mjs (linkEdcsFile).
export function newFileId() { return storeBackend === "postgres" ? newUuid() : newId("file"); }

export async function findEdcsDocumentState(scope, transactionId) {
  const store = await readStore(scope.tenant_id);
  const inScope = (record) => record.tenant_id === scope.tenant_id && record.firm_id === scope.firm_id;
  const entry = (store.document_register_entries ?? []).find((record) => inScope(record) && record.document_number === transactionId) ?? null;
  const revisions = entry ? (store.document_revision_records ?? []).filter((record) => inScope(record) && record.document_register_entry_id === entry.id).sort((a, b) => String(a.created_at).localeCompare(String(b.created_at))) : [];
  const files = (store.file_objects ?? []).filter((record) => inScope(record) && revisions.some((revision) => revision.metadata?.file_id === record.id));
  return { entry, revisions, files };
}

export async function registerEdcsFileRevisionRecord(body, actor) {
  return withStore((store) => {
    store.file_objects ??= [];
    store.document_register_entries ??= [];
    store.document_revision_records ??= [];
    const scope = { tenant_id: body.tenant_id, firm_id: body.firm_id };
    const inScope = (record) => record.tenant_id === scope.tenant_id && record.firm_id === scope.firm_id;
    const tx = body.transaction;
    let entry = store.document_register_entries.find((record) => inScope(record) && record.document_number === tx.transaction_id) ?? null;
    const revisions = entry ? store.document_revision_records.filter((record) => inScope(record) && record.document_register_entry_id === entry.id) : [];
    // CE-S3 (decision: supporting files): role SUPPORTING files a supporting document (for example a bank
    // statement under a bank reconciliation) as an attachment. It never becomes, replaces or supersedes
    // the transaction's primary document revision.
    const supporting = body.role === "SUPPORTING";
    const primaryRevisions = revisions.filter((record) => record.metadata?.role !== "SUPPORTING");
    const attachmentRevisions = revisions.filter((record) => record.metadata?.role === "SUPPORTING");
    const previous = !supporting && entry ? primaryRevisions.find((record) => record.id === entry.current_revision_id) ?? null : null;
    const sameAttachment = supporting ? attachmentRevisions.find((record) => record.content_hash === body.file.sha256) ?? null : null;
    if (sameAttachment) {
      const existingFile = store.file_objects.find((record) => inScope(record) && record.id === sameAttachment.metadata?.file_id) ?? null;
      return { outcome: "UNCHANGED", document: entry, revision: sameAttachment, previous_revision: null, file: existingFile };
    }
    if (previous && previous.content_hash === body.file.sha256) {
      const existingFile = store.file_objects.find((record) => inScope(record) && record.id === previous.metadata?.file_id) ?? null;
      return { outcome: "UNCHANGED", document: entry, revision: previous, previous_revision: null, file: existingFile };
    }
    const timestamp = now();
    const file = {
      id: body.file.file_id, tenant_id: scope.tenant_id, firm_id: scope.firm_id, filename: body.file.filename, mime_type: body.file.mime_type,
      size_bytes: body.file.size_bytes, sha256: body.file.sha256, storage_backend: body.content_stored ? body.file.storage_backend : "NONE",
      storage_key: body.content_stored ? body.file.storage_key : null, classification: body.file.classification, purpose: "EDCS_LINK",
      linked_to: `edcs:${tx.transaction_id}`, scan_status: "NOT_SCANNED", status: body.content_stored ? "STORED" : "METADATA_ONLY",
      uploaded_by_actor_id: actor.actor_id ?? actor.id ?? null, created_at: timestamp, updated_at: timestamp
    };
    store.file_objects.push(file);
    const created = !entry;
    if (!entry) {
      entry = {
        id: sf3Id("document_register"), tenant_id: scope.tenant_id, firm_id: scope.firm_id, relationship_id: null, project_id: null,
        document_number: tx.transaction_id, title: String(tx.title ?? tx.transaction_id).slice(0, 200), document_type: tx.document_type, discipline: null,
        classification: body.file.classification, status: "ACTIVE", current_revision_id: null, owner_actor_id: actor.actor_id ?? null,
        created_at: timestamp, updated_at: timestamp, metadata: { source: "bizkick_edcs", transaction_id: tx.transaction_id, content_policy: body.content_stored ? "CONTENT" : "METADATA_ONLY" }
      };
      store.document_register_entries.push(entry);
    }
    const used = new Set(revisions.map((record) => record.revision));
    let label = !supporting && body.revision_label && !used.has(body.revision_label) ? body.revision_label : null;
    if (supporting) label = `A${attachmentRevisions.length + 1}`;
    if (!label) {
      let n = primaryRevisions.reduce((max, record) => { const m = /^R(\d+)$/.exec(record.revision ?? ""); return m ? Math.max(max, Number(m[1])) : max; }, -1) + 1;
      while (used.has(`R${n}`)) n += 1;
      label = `R${n}`;
    }
    if (previous) previous.status = "SUPERSEDED";
    const revision = {
      id: sf3Id("document_revision"), tenant_id: scope.tenant_id, firm_id: scope.firm_id, document_register_entry_id: entry.id, revision: label, version_label: label,
      storage_ref: `file:${file.id}`, content_hash: file.sha256, status: supporting ? "ATTACHMENT" : "CURRENT", supersedes_revision_id: previous?.id ?? null, created_by_actor_id: actor.actor_id ?? null,
      created_at: timestamp, metadata: { file_id: file.id, filename: file.filename, transaction_id: tx.transaction_id, method: body.method, content_stored: body.content_stored === true, note: body.note ?? null, role: supporting ? "SUPPORTING" : "PRIMARY" }
    };
    store.document_revision_records.push(revision);
    if (!supporting) entry.current_revision_id = revision.id;
    entry.updated_at = timestamp;
    appendEventAndAudit(store, {
      event_type: supporting ? "edcs.file_attached" : created ? "edcs.file_linked" : "edcs.file_revised", actor, tenant_id: scope.tenant_id, firm_id: scope.firm_id, aggregate_type: "DocumentRegisterEntry", aggregate_id: entry.id,
      payload: { transaction_id: tx.transaction_id, document_number: entry.document_number, revision: label, supersedes_revision_id: previous?.id ?? null, file_id: file.id, sha256: file.sha256, content_stored: body.content_stored === true, method: body.method },
      summary: supporting ? `${tx.transaction_id}: supporting file filed as ${label}${body.content_stored ? "" : " (metadata and fingerprint only, per content policy)"}.` : created
        ? `${tx.transaction_id}: file linked as ${label}${body.content_stored ? "" : " (metadata and fingerprint only, per content policy)"}.`
        : `${tx.transaction_id}: new file filed as ${label}; ${previous?.revision ?? "prior revision"} superseded.`
    });
    return { outcome: supporting ? "ATTACHED" : created ? "LINKED" : "REVISED", document: entry, revision, previous_revision: previous, file };
  });
}

export function computeWorkdeskItemStatus(item, drafts = [], deliveries = []) {
  if (item.workdesk_status !== undefined) {
    switch (item.workdesk_status) {
      case "ASSIGNED": return "pending";
      // ADR-089 W1 (B3): owner requested a revision -- back with the worker.
      case "REWORK": return "pending";
      // ADR-093 W4 (B6): the worker is waiting on the owner -- shown in the Inbox.
      case "NEEDS_INFO": return "inbox";
      case "OUTPUT_DRAFTED": return "approval";
      case "REVIEW_ACTION_REQUIRED": return "approval";
      case "REVIEWED_FOR_CLIENT_DRAFT": return "outbox";
      case "CLIENT_DELIVERY_DRAFT_PREPARED": return "outbox";
      case "ARCHIVED_SENT": return "archived";
      case "ARCHIVED_DISMISSED": return "archived";
      // ADR-090 W2: approved INTERNAL work, filed by the owner (never sent to a client).
      case "ARCHIVED_COMPLETED": return "archived";
      default: return "inbox";
    }
  }
  const draft = drafts.find((d) => d.workdesk_item_id === item.id || d.task_id === item.id);
  const delivery = deliveries.find((d) => d.workdesk_item_id === item.id || d.task_id === item.id);
  if (item.archived || item.status === "archived") return "archived";
  if (delivery) return delivery.status === "sent" ? "archived" : "outbox";
  if (draft) {
    if (draft.status === "stuck" || draft.status === "rejected") return "approval";
    if (draft.status === "awaiting_review" || draft.status === "pending_review") return "approval";
    return "pending";
  }
  if (item.status === "assigned" || item.assignee_id) return "pending";
  return "inbox";
}

export function computeWorkdeskItemStatusLabel(item, drafts = []) {
  const draft = drafts.find((d) => d.workdesk_item_id === item.id);
  if (draft?.class_a_approval_required && draft.class_a_approval_status === "PENDING") {
    return "CLASS_A_APPROVAL_PENDING";
  }
  return item.workdesk_status ?? "unknown";
}

const AWIA_RELATIONAL_TABLES = [
  "awia_virtual_staff_provisioning_runs",
  "awia_virtual_staff_seats",
  "awia_virtual_staff_members",
  "awia_staff_role_assignments",
  "awia_staff_package_bindings",
  "awia_staff_lifecycle_events",
  "awia_staff_authority_decisions",
  "awia_staff_evidence_packs",
  "awia_staff_task_readiness_records",
  "awia_staff_workdesk_items",
  "awia_staff_output_drafts",
  "awia_staff_output_reviews",
  "awia_client_delivery_drafts",
  "awia_staff_memory_entries",
  "awia_staff_conversation_threads",
  "awia_staff_conversation_messages",
  "awia_staff_seat_billing_events"
];

// HM-S7 Phase 4f, slice 4 (2026-09-29): see RECORD_DEDUP_COLLECTIONS's comment for the audit of
// all 17 tables here. changedRecords() replaces the raw store[collection] loop so only rows that
// actually changed since load get upserted.
async function persistAwiaVirtualStaffFromStore(client, store, recordBaseline) {
  for (const collection of AWIA_RELATIONAL_TABLES) {
    for (const record of changedRecords(store, collection, recordBaseline)) {
      const naturalKey = record?.id;
      const tenantIdRaw = record?.tenant_id ?? record?.organization_id;
      const firmIdRaw = record?.firm_id;
      const tenantId = uuidOrNull(tenantIdRaw);
      const firmId = uuidOrNull(firmIdRaw);
      if (!naturalKey || !tenantId || !firmId) continue;
      // Hiring-bug fix (2026-10-01, ADR-091): the surrogate id used to be deterministicUuid(naturalKey)
      // for every non-uuid natural key, so seat-cfo-001 (etc.) got the SAME primary key in every firm
      // and "on conflict (id)" silently overwrote the first firm's row with the second firm's record
      // (or, for seats, broke fk_awia_virtual_staff_members_seat and failed the hire). New rows now
      // get a firm-scoped surrogate unless the natural key already embeds the firm id (members,
      // provisioning runs -- their ids are unchanged), and the upsert targets the existing unique
      // index (tenant_id, firm_id, natural_key), so rows already stored under the old formula are
      // still matched and updated in place -- no data migration needed.
      const naturalKeyText = String(naturalKey);
      const pgId = uuidOrNull(naturalKey) ?? deterministicUuid(naturalKeyText.includes(String(firmIdRaw)) ? naturalKeyText : `${firmIdRaw}:${naturalKeyText}`);
      await client.query(
        `insert into ${collection} (id, natural_key, tenant_id, firm_id, record, created_at, updated_at)
         values ($1, $2, $3, $4, $5::jsonb, coalesce($6, now()), now())
         on conflict (tenant_id, firm_id, natural_key) do update set record = excluded.record, updated_at = now()`,
        [pgId, naturalKeyText, tenantId, firmId, JSON.stringify(record), record?.created_at ?? null]
      );
    }
  }
}

// HM-S7 Phase 4f, slice 2 (2026-09-29): was a sequential loop of 17 awaited queries on one
// connection -- now fires all 17 concurrently via the pool (see loadPostgresStore's comment for
// the full rationale) and waits for them together.
async function readAwiaVirtualStaffRelational(tenantId = null) {
  const pool = getPool();
  const tenantWhere = tenantId ? " where tenant_id = $1" : "";
  const tenantParams = tenantId ? [tenantId] : [];
  const results = await Promise.all(
    AWIA_RELATIONAL_TABLES.map((collection) => pool.query(`select record from ${collection}${tenantWhere} order by created_at, id`, tenantParams))
  );
  const result = {};
  AWIA_RELATIONAL_TABLES.forEach((collection, i) => {
    result[collection] = results[i].rows.map((row) => row.record);
  });
  return result;
}

// HM-S6 (2026-09-22): the 7 Firm Factory / Provisioning collections previously round-tripped only
// through the JSONB app_state blob (working correctly, not a data-loss bug -- corrected after an
// earlier wrong report). Given real Postgres tables here for consistency with the rest of the
// repository layer, following the exact same generic pattern as AWIA_RELATIONAL_TABLES above: all
// 7 already use genuinely random ids, so the surrogate key and natural key are the same value.
const FIRM_FACTORY_RELATIONAL_TABLES = [
  "factory_firm_blueprints",
  "factory_provisioning_runs",
  "provisioned_firm_instances",
  "factory_worker_bindings",
  "pack_compatibility_checks",
  "pack_binding_certifications",
  "service_activation_records"
];

async function persistFirmFactoryFromStore(client, store, recordBaseline) {
  for (const collection of FIRM_FACTORY_RELATIONAL_TABLES) {
    for (const record of changedRecords(store, collection, recordBaseline)) {
      const naturalKey = record?.id;
      const tenantId = uuidOrNull(record?.tenant_id);
      const firmId = uuidOrNull(record?.firm_id);
      // slice 5 (2026-09-29): factory_firm_blueprints legitimately has firm_id === null before
      // provisioning (see migration 0047) -- the other 6 collections always have a real firm_id
      // by the time they're created, so they keep requiring one.
      const firmIdRequired = collection !== "factory_firm_blueprints";
      if (!naturalKey || !tenantId || (firmIdRequired && !firmId)) continue;
      const pgId = uuidOrNull(naturalKey) ?? deterministicUuid(naturalKey);
      await client.query(
        `insert into ${collection} (id, natural_key, tenant_id, firm_id, record, created_at, updated_at)
         values ($1, $2, $3, $4, $5::jsonb, coalesce($6, now()), now())
         on conflict (id) do update set record = excluded.record, updated_at = now()`,
        [pgId, String(naturalKey), tenantId, firmId, JSON.stringify(record), record?.created_at ?? null]
      );
    }
  }
}

// HM-S7 Phase 4f, slice 2 (2026-09-29): same fix as readAwiaVirtualStaffRelational above -- fires
// all 7 queries concurrently via the pool instead of one after another on one connection.
async function readFirmFactoryRelational(tenantId = null) {
  const pool = getPool();
  const tenantWhere = tenantId ? " where tenant_id = $1" : "";
  const tenantParams = tenantId ? [tenantId] : [];
  const results = await Promise.all(
    FIRM_FACTORY_RELATIONAL_TABLES.map((collection) => pool.query(`select record from ${collection}${tenantWhere} order by created_at, id`, tenantParams))
  );
  const result = {};
  FIRM_FACTORY_RELATIONAL_TABLES.forEach((collection, i) => {
    result[collection] = results[i].rows.map((row) => row.record);
  });
  return result;
}

// HM-S6 item 3 (2026-09-23): while scaffolding the repository layer, these 6 collections turned out
// to have no Postgres table anywhere either -- the same round-tripping-through-the-blob-only
// situation Firm Factory was in before FIRM_FACTORY_RELATIONAL_TABLES above, just never on
// readRelationalStore()'s expected table list to begin with, so neither the HM-S6 item 1 audit nor
// the 0026 migration-coverage fix caught it. Product owner authorized Option A (2026-09-23): real
// Postgres tables now (migration 0027_quotation_and_awia_package_persistence.sql), same generic
// shape as AWIA_RELATIONAL_TABLES/FIRM_FACTORY_RELATIONAL_TABLES above. All 6 already use genuinely
// random (or postgres-uuid) ids at the application level, so the surrogate key and natural key are
// the same value.
const QUOTATION_AWIA_RELATIONAL_TABLES = [
  "quotation_cases",
  "boq_extraction_aids",
  "quotation_draft_packs",
  "quotation_issue_records",
  "quotation_receivable_preparations",
  "awia_firm_package_assignments"
];

async function persistQuotationAwiaFromStore(client, store, recordBaseline) {
  for (const collection of QUOTATION_AWIA_RELATIONAL_TABLES) {
    for (const record of changedRecords(store, collection, recordBaseline)) {
      const naturalKey = record?.id;
      const tenantId = uuidOrNull(record?.tenant_id);
      const firmId = uuidOrNull(record?.firm_id);
      if (!naturalKey || !tenantId || !firmId) continue;
      const pgId = uuidOrNull(naturalKey) ?? deterministicUuid(naturalKey);
      await client.query(
        `insert into ${collection} (id, natural_key, tenant_id, firm_id, record, created_at, updated_at)
         values ($1, $2, $3, $4, $5::jsonb, coalesce($6, now()), now())
         on conflict (id) do update set record = excluded.record, updated_at = now()`,
        [pgId, String(naturalKey), tenantId, firmId, JSON.stringify(record), record?.created_at ?? null]
      );
    }
  }
}

// HM-S7 Phase 4f, slice 2 (2026-09-29): same fix as readAwiaVirtualStaffRelational above -- fires
// all 6 queries concurrently via the pool instead of one after another on one connection.
async function readQuotationAwiaRelational(tenantId = null) {
  const pool = getPool();
  const tenantWhere = tenantId ? " where tenant_id = $1" : "";
  const tenantParams = tenantId ? [tenantId] : [];
  const results = await Promise.all(
    QUOTATION_AWIA_RELATIONAL_TABLES.map((collection) => pool.query(`select record from ${collection}${tenantWhere} order by created_at, id`, tenantParams))
  );
  const result = {};
  QUOTATION_AWIA_RELATIONAL_TABLES.forEach((collection, i) => {
    result[collection] = results[i].rows.map((row) => row.record);
  });
  return result;
}

// ADR-089 W1 (B1, 2026-09-30): Firm operating workflow tables. Same generic
// (id, natural_key, tenant_id, firm_id, record jsonb) shape as QUOTATION_AWIA_RELATIONAL_TABLES,
// created by migration 0048_work_intake_file_objects.sql. W2 will add work_requests here.
const WORK_INTAKE_RELATIONAL_TABLES = ["file_objects", "work_requests"];

async function persistWorkIntakeFromStore(client, store, recordBaseline) {
  for (const collection of WORK_INTAKE_RELATIONAL_TABLES) {
    for (const record of changedRecords(store, collection, recordBaseline)) {
      const naturalKey = record?.id;
      const tenantId = uuidOrNull(record?.tenant_id);
      const firmId = uuidOrNull(record?.firm_id);
      if (!naturalKey || !tenantId || !firmId) continue;
      const pgId = uuidOrNull(naturalKey) ?? deterministicUuid(naturalKey);
      await client.query(
        `insert into ${collection} (id, natural_key, tenant_id, firm_id, record, created_at, updated_at)
         values ($1, $2, $3, $4, $5::jsonb, coalesce($6, now()), now())
         on conflict (id) do update set record = excluded.record, updated_at = now()`,
        [pgId, String(naturalKey), tenantId, firmId, JSON.stringify(record), record?.created_at ?? null]
      );
    }
  }
}

async function readWorkIntakeRelational(tenantId = null) {
  const pool = getPool();
  const tenantWhere = tenantId ? " where tenant_id = $1" : "";
  const tenantParams = tenantId ? [tenantId] : [];
  const results = await Promise.all(
    WORK_INTAKE_RELATIONAL_TABLES.map((collection) => pool.query(`select record from ${collection}${tenantWhere} order by created_at, id`, tenantParams))
  );
  const result = {};
  WORK_INTAKE_RELATIONAL_TABLES.forEach((collection, i) => {
    result[collection] = results[i].rows.map((row) => row.record);
  });
  return result;
}

async function persistAdministrationFromStore(client, store, recordBaseline) {
  // HM-S7 Phase 4d, slice 6 (2026-09-29): same reasoning as persistTechnicalDeliveryFromStore
  // (slice 4) -- each collection can hold rows from many tenants in the same shared
  // savePostgresStore() transaction, so setTenantContext() is called fresh before every single
  // upsert/update to scope that one row's RLS check to its own tenant.
  // HM-S7 Phase 4f, slice 7 (2026-09-29): every store.X ?? [] loop below now iterates
  // changedRecords(store, "X", recordBaseline) instead -- same content-diff dedup as the other
  // persist*FromStore functions, just applied to this one's hand-rolled per-column insert
  // statements instead of a generic record-jsonb loop. administration_skill_bindings,
  // administrative_deadlines and transmittal_drafts are create-only (push, never mutated
  // afterward); correspondence_records is mutated in place elsewhere (e.g.
  // issueQuotationDraftPackRecord's `correspondence.status = "ISSUED_BY_HUMAN"`);
  // document_register_entries and document_revision_records are both mutated in place by
  // addDocumentRevisionRecord (`entry.current_revision_id = revision.id`,
  // `previous.status = "SUPERSEDED"`). All handled correctly by the same content-diff mechanism.
  for(const x of changedRecords(store,"administration_skill_bindings",recordBaseline)) if(uuidOrNull(x.id)){await setTenantContext(client,x.tenant_id);await client.query(`insert into administration_skill_bindings (id,tenant_id,firm_id,worker_template_code,role_skill_ref,worker_skill_ref,input_schema_ref,output_schema_ref,supervisor_actor_id,permissions,forbidden_actions,status,version,created_at,metadata) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::jsonb,$12,$13,$14,$15::jsonb) on conflict(id) do update set status=excluded.status,metadata=excluded.metadata`,[x.id,x.tenant_id,x.firm_id,x.worker_template_code,x.role_skill_ref,x.worker_skill_ref,x.input_schema_ref,x.output_schema_ref,x.supervisor_actor_id,JSON.stringify(x.permissions),JSON.stringify(x.forbidden_actions),x.status,x.version,x.created_at,JSON.stringify(x.metadata??{})]);}
  for(const x of changedRecords(store,"correspondence_records",recordBaseline)) if(uuidOrNull(x.id)){await setTenantContext(client,x.tenant_id);await client.query(`insert into correspondence_records (id,tenant_id,firm_id,relationship_id,project_id,direction,channel,subject,correspondent,received_or_drafted_at,status,owner_actor_id,response_due_at,source_ref,created_at,updated_at,metadata) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17::jsonb) on conflict(id) do update set status=excluded.status,response_due_at=excluded.response_due_at,updated_at=excluded.updated_at,metadata=excluded.metadata`,[x.id,x.tenant_id,x.firm_id,uuidOrNull(x.relationship_id),uuidOrNull(x.project_id),x.direction,x.channel,x.subject,x.correspondent,x.received_or_drafted_at,x.status,uuidOrNull(x.owner_actor_id),x.response_due_at,x.source_ref,x.created_at,x.updated_at,JSON.stringify(x.metadata??{})]);}
  for(const x of changedRecords(store,"document_register_entries",recordBaseline)) if(uuidOrNull(x.id)){await setTenantContext(client,x.tenant_id);await client.query(`insert into document_register_entries (id,tenant_id,firm_id,relationship_id,project_id,document_number,title,document_type,discipline,classification,status,current_revision_id,owner_actor_id,created_at,updated_at,metadata) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,null,$12,$13,$14,$15::jsonb) on conflict(id) do update set status=excluded.status,updated_at=excluded.updated_at,metadata=excluded.metadata`,[x.id,x.tenant_id,x.firm_id,uuidOrNull(x.relationship_id),uuidOrNull(x.project_id),x.document_number,x.title,x.document_type,x.discipline,x.classification,x.status,uuidOrNull(x.owner_actor_id),x.created_at,x.updated_at,JSON.stringify(x.metadata??{})]);}
  for(const x of changedRecords(store,"document_revision_records",recordBaseline)) if(uuidOrNull(x.id)){await setTenantContext(client,x.tenant_id);await client.query(`insert into document_revision_records (id,tenant_id,firm_id,document_register_entry_id,revision,version_label,storage_ref,content_hash,status,supersedes_revision_id,created_by_actor_id,created_at,metadata) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb) on conflict(id) do update set status=excluded.status,metadata=excluded.metadata`,[x.id,x.tenant_id,x.firm_id,x.document_register_entry_id,x.revision,x.version_label,x.storage_ref,x.content_hash,x.status,uuidOrNull(x.supersedes_revision_id),uuidOrNull(x.created_by_actor_id),x.created_at,JSON.stringify(x.metadata??{})]);}
  for(const x of changedRecords(store,"document_register_entries",recordBaseline)) if(uuidOrNull(x.id)&&uuidOrNull(x.current_revision_id)){await setTenantContext(client,x.tenant_id);await client.query("update document_register_entries set current_revision_id=$1, updated_at=$2 where id=$3",[x.current_revision_id,x.updated_at,x.id]);}
  for(const x of changedRecords(store,"administrative_deadlines",recordBaseline)) if(uuidOrNull(x.id)){await setTenantContext(client,x.tenant_id);await client.query(`insert into administrative_deadlines (id,tenant_id,firm_id,project_id,relationship_id,title,due_at,priority,status,assigned_actor_or_worker_ref,source_ref,created_at,updated_at,completed_at,metadata) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb) on conflict(id) do update set status=excluded.status,updated_at=excluded.updated_at,completed_at=excluded.completed_at,metadata=excluded.metadata`,[x.id,x.tenant_id,x.firm_id,uuidOrNull(x.project_id),uuidOrNull(x.relationship_id),x.title,x.due_at,x.priority,x.status,uuidOrNull(x.assigned_actor_or_worker_ref),x.source_ref,x.created_at,x.updated_at,x.completed_at,JSON.stringify(x.metadata??{})]);}
  for(const x of changedRecords(store,"transmittal_drafts",recordBaseline)) if(uuidOrNull(x.id)){await setTenantContext(client,x.tenant_id);await client.query(`insert into transmittal_drafts (id,tenant_id,firm_id,project_id,relationship_id,recipient,subject,document_revision_refs,message_body,status,requires_principal_approval,prepared_by_actor_id,approved_by_actor_id,issued_at,created_at,updated_at,metadata) values($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,true,$11,$12,$13,$14,$15,$16::jsonb) on conflict(id) do update set subject=excluded.subject,message_body=excluded.message_body,status=excluded.status,updated_at=excluded.updated_at,metadata=excluded.metadata`,[x.id,x.tenant_id,x.firm_id,uuidOrNull(x.project_id),uuidOrNull(x.relationship_id),x.recipient,x.subject,JSON.stringify(x.document_revision_refs),x.message_body,x.status,uuidOrNull(x.prepared_by_actor_id),uuidOrNull(x.approved_by_actor_id),x.issued_at,x.created_at,x.updated_at,JSON.stringify(x.metadata??{})]);}
}


async function persistCommercialOperationsFromStore(client,store,recordBaseline){
  // HM-S7 Phase 4d, slice 7 (2026-09-29): same reasoning as persistTechnicalDeliveryFromStore
  // (slice 4) / persistAdministrationFromStore (slice 6) -- setTenantContext() called fresh
  // before every row's statement, since each collection can hold rows from many tenants in
  // savePostgresStore()'s one shared transaction. The `update proposals` statement also gets
  // setTenantContext even though `proposals` itself has no RLS policy yet (Sales & Intake is a
  // separate, not-yet-done domain) -- harmless now, and keeps this call site already correct
  // for whenever that domain's own RLS slice lands.
  // HM-S7 Phase 4f, slice 8 (2026-09-29): every store.X ?? [] loop below now iterates
  // changedRecords(store, "X", recordBaseline) instead. commercial_skill_bindings,
  // proposal_dispatch_records (on conflict do nothing -- create-only by construction) and
  // receivable_follow_ups are create-only; sales_pipeline_records and expense_records are
  // mutated in place elsewhere (dispatchProposalRecord's `opportunity.stage = "PROPOSAL_SENT"`,
  // approveExpenseRecord's `item.status = "APPROVED"`). The `update proposals` loop below is
  // keyed off proposal_dispatch_records too: since that collection is create-only, once a
  // dispatch record's initial write has landed, changedRecords() correctly stops re-running this
  // UPDATE against `proposals` on every subsequent, unrelated save -- previously it ran once per
  // historical dispatch record on every single write anywhere in the app.
  for(const x of changedRecords(store,"commercial_skill_bindings",recordBaseline))if(uuidOrNull(x.id)){await setTenantContext(client,x.tenant_id);await client.query(`insert into commercial_skill_bindings(id,tenant_id,firm_id,worker_template_code,role_skill_ref,worker_skill_ref,input_schema_ref,output_schema_ref,supervisor_actor_id,permissions,forbidden_actions,status,version,created_at,metadata) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::jsonb,$12,$13,$14,$15::jsonb) on conflict(id) do update set status=excluded.status,metadata=excluded.metadata`,[x.id,x.tenant_id,x.firm_id,x.worker_template_code,x.role_skill_ref,x.worker_skill_ref,x.input_schema_ref,x.output_schema_ref,x.supervisor_actor_id,JSON.stringify(x.permissions),JSON.stringify(x.forbidden_actions),x.status,x.version,x.created_at,JSON.stringify(x.metadata??{})]);}
  for(const x of changedRecords(store,"sales_pipeline_records",recordBaseline))if(uuidOrNull(x.id)){await setTenantContext(client,x.tenant_id);await client.query(`insert into sales_pipeline_records(id,tenant_id,firm_id,enquiry_id,relationship_id,intake_session_id,proposal_id,opportunity_name,stage,estimated_value,currency,probability_percent,owner_actor_id,next_action,next_action_due_at,lost_reason,created_at,updated_at,metadata) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19::jsonb) on conflict(id) do update set proposal_id=excluded.proposal_id,stage=excluded.stage,estimated_value=excluded.estimated_value,probability_percent=excluded.probability_percent,next_action=excluded.next_action,next_action_due_at=excluded.next_action_due_at,lost_reason=excluded.lost_reason,updated_at=excluded.updated_at,metadata=excluded.metadata`,[x.id,x.tenant_id,x.firm_id,uuidOrNull(x.enquiry_id),uuidOrNull(x.relationship_id),uuidOrNull(x.intake_session_id),uuidOrNull(x.proposal_id),x.opportunity_name,x.stage,x.estimated_value,x.currency,x.probability_percent,uuidOrNull(x.owner_actor_id),x.next_action,x.next_action_due_at,x.lost_reason,x.created_at,x.updated_at,JSON.stringify(x.metadata??{})]);}
  for(const x of changedRecords(store,"proposal_dispatch_records",recordBaseline))if(uuidOrNull(x.id)){await setTenantContext(client,x.tenant_id);await client.query(`insert into proposal_dispatch_records(id,tenant_id,firm_id,proposal_id,recipient,channel,dispatch_status,dispatched_by_actor_id,commercial_approval_id,document_ref,dispatched_at,created_at,metadata) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb) on conflict(id) do nothing`,[x.id,x.tenant_id,x.firm_id,x.proposal_id,x.recipient,x.channel,x.dispatch_status,x.dispatched_by_actor_id,x.commercial_approval_id,x.document_ref,x.dispatched_at,x.created_at,JSON.stringify(x.metadata??{})]);}
  for(const x of changedRecords(store,"proposal_dispatch_records",recordBaseline)){await setTenantContext(client,x.tenant_id);await client.query("update proposals set proposal_status='SENT',issued_document_ref=$1,updated_at=$2 where id=$3 and commercial_approval_id=$4",[x.document_ref,x.dispatched_at,x.proposal_id,x.commercial_approval_id]);}
  for(const x of changedRecords(store,"expense_records",recordBaseline))if(uuidOrNull(x.id)){await setTenantContext(client,x.tenant_id);await client.query(`insert into expense_records(id,tenant_id,firm_id,project_id,supplier,description,category,amount,currency,expense_date,receipt_ref,status,prepared_by_actor_id,approved_by_actor_id,approved_at,payment_instruction_ref,created_at,updated_at,metadata) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19::jsonb) on conflict(id) do update set status=excluded.status,approved_by_actor_id=excluded.approved_by_actor_id,approved_at=excluded.approved_at,updated_at=excluded.updated_at,metadata=excluded.metadata`,[x.id,x.tenant_id,x.firm_id,uuidOrNull(x.project_id),x.supplier,x.description,x.category,x.amount,x.currency,x.expense_date,x.receipt_ref,x.status,uuidOrNull(x.prepared_by_actor_id),uuidOrNull(x.approved_by_actor_id),x.approved_at,null,x.created_at,x.updated_at,JSON.stringify(x.metadata??{})]);}
  for(const x of changedRecords(store,"receivable_follow_ups",recordBaseline))if(uuidOrNull(x.id)){await setTenantContext(client,x.tenant_id);await client.query(`insert into receivable_follow_ups(id,tenant_id,firm_id,invoice_id,channel,subject,message_body,status,requires_human_review,prepared_by_actor_id,approved_by_actor_id,sent_at,created_at,updated_at,metadata) values($1,$2,$3,$4,$5,$6,$7,$8,true,$9,$10,$11,$12,$13,$14::jsonb) on conflict(id) do update set subject=excluded.subject,message_body=excluded.message_body,status=excluded.status,updated_at=excluded.updated_at,metadata=excluded.metadata`,[x.id,x.tenant_id,x.firm_id,x.invoice_id,x.channel,x.subject,x.message_body,x.status,uuidOrNull(x.prepared_by_actor_id),uuidOrNull(x.approved_by_actor_id),x.sent_at,x.created_at,x.updated_at,JSON.stringify(x.metadata??{})]);}
}
async function persistPilotHandoffFromStore(client,store){
  for(const x of store.pilot_handoff_records??[])if(uuidOrNull(x.id))await client.query(`insert into pilot_handoff_records(id,tenant_id,firm_id,accepted_by_actor_id,rehearsal_ref,handoff_status,checklist,evidence_refs,decision_summary,accepted_at,created_at,metadata) values($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9,$10,$11,$12::jsonb) on conflict(id) do update set handoff_status=excluded.handoff_status,checklist=excluded.checklist,evidence_refs=excluded.evidence_refs,decision_summary=excluded.decision_summary,metadata=excluded.metadata`,[x.id,x.tenant_id,x.firm_id,uuidOrNull(x.accepted_by_actor_id),x.rehearsal_ref,x.handoff_status,JSON.stringify(x.checklist??[]),JSON.stringify(x.evidence_refs??[]),x.decision_summary,x.accepted_at,x.created_at,JSON.stringify(x.metadata??{})]);
}

async function persistTechnicalDeliveryFromStore(client,store,recordBaseline){
  // HM-S7 Phase 4d, slice 4 (2026-09-29): each of these 5 collections can hold rows from many
  // different tenants in the same in-memory store, and this whole function runs inside one
  // shared, multi-tenant transaction (savePostgresStore's). setTenantContext() is called fresh
  // before every single upsert, scoping the RLS insert/update check to that one row's own
  // tenant -- set_config(..., true) is transaction-local but can be changed as many times as
  // needed within one transaction, so this is safe to do per-row rather than once per call.
  // HM-S7 Phase 4f, slice 9 (2026-09-29): every store.X ?? [] loop below now iterates
  // changedRecords(store, "X", recordBaseline) instead. Audit found all 5 collections here are
  // create-only -- no in-place mutation after creation was found anywhere in the file for
  // technical_skill_bindings, drawing_review_records, calculation_input_sets,
  // technical_qa_findings or delivery_package_records (no resolve/approve/close function exists
  // for any of them yet). changedRecords() still applies correctly (a create-only collection is
  // the simplest case: only genuinely new rows differ from their -- nonexistent -- baseline).
  for(const x of changedRecords(store,"technical_skill_bindings",recordBaseline))if(uuidOrNull(x.id)){await setTenantContext(client,x.tenant_id);await client.query(`insert into technical_skill_bindings(id,tenant_id,firm_id,worker_template_code,role_skill_ref,worker_skill_ref,input_schema_ref,output_schema_ref,supervisor_actor_id,permissions,forbidden_actions,status,version,created_at,metadata) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::jsonb,$12,$13,$14,$15::jsonb) on conflict(id) do update set status=excluded.status,metadata=excluded.metadata`,[x.id,x.tenant_id,x.firm_id,x.worker_template_code,x.role_skill_ref,x.worker_skill_ref,x.input_schema_ref,x.output_schema_ref,uuidOrNull(x.supervisor_actor_id),JSON.stringify(x.permissions??[]),JSON.stringify(x.forbidden_actions??[]),x.status,x.version,x.created_at,JSON.stringify(x.metadata??{})]);}
  for(const x of changedRecords(store,"drawing_review_records",recordBaseline))if(uuidOrNull(x.id)){await setTenantContext(client,x.tenant_id);await client.query(`insert into drawing_review_records(id,tenant_id,firm_id,project_id,document_register_entry_id,base_revision_id,compared_revision_id,check_results,status,prepared_by_actor_id,requires_professional_review,created_at,metadata) values($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,true,$11,$12::jsonb) on conflict(id) do update set check_results=excluded.check_results,status=excluded.status,metadata=excluded.metadata`,[x.id,x.tenant_id,x.firm_id,x.project_id,x.document_register_entry_id,x.base_revision_id,x.compared_revision_id,JSON.stringify(x.check_results??[]),x.status,uuidOrNull(x.prepared_by_actor_id),x.created_at,JSON.stringify(x.metadata??{})]);}
  for(const x of changedRecords(store,"calculation_input_sets",recordBaseline))if(uuidOrNull(x.id)){await setTenantContext(client,x.tenant_id);await client.query(`insert into calculation_input_sets(id,tenant_id,firm_id,project_id,intake_session_id,source_revision_refs,input_values,unit_system,validation_results,validation_status,deterministic_engine_ref,prepared_by_actor_id,created_at,updated_at,metadata) values($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8,$9::jsonb,$10,$11,$12,$13,$14,$15::jsonb) on conflict(id) do update set input_values=excluded.input_values,validation_results=excluded.validation_results,validation_status=excluded.validation_status,updated_at=excluded.updated_at,metadata=excluded.metadata`,[x.id,x.tenant_id,x.firm_id,x.project_id,uuidOrNull(x.intake_session_id),JSON.stringify(x.source_revision_refs??[]),JSON.stringify(x.input_values??{}),x.unit_system,x.validation_results?JSON.stringify(x.validation_results):"[]",x.validation_status,x.deterministic_engine_ref,uuidOrNull(x.prepared_by_actor_id),x.created_at,x.updated_at,JSON.stringify(x.metadata??{})]);}
  for(const x of changedRecords(store,"technical_qa_findings",recordBaseline))if(uuidOrNull(x.id)){await setTenantContext(client,x.tenant_id);await client.query(`insert into technical_qa_findings(id,tenant_id,firm_id,project_id,subject_type,subject_id,finding_code,severity,description,status,raised_by_actor_id,resolved_by_actor_id,resolution_summary,created_at,updated_at,resolved_at,metadata) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17::jsonb) on conflict(id) do update set status=excluded.status,resolved_by_actor_id=excluded.resolved_by_actor_id,resolution_summary=excluded.resolution_summary,updated_at=excluded.updated_at,resolved_at=excluded.resolved_at,metadata=excluded.metadata`,[x.id,x.tenant_id,x.firm_id,x.project_id,x.subject_type,x.subject_id,x.finding_code,x.severity,x.description,x.status,uuidOrNull(x.raised_by_actor_id),uuidOrNull(x.resolved_by_actor_id),x.resolution_summary,x.created_at,x.updated_at,x.resolved_at,JSON.stringify(x.metadata??{})]);}
  for(const x of changedRecords(store,"delivery_package_records",recordBaseline))if(uuidOrNull(x.id)){await setTenantContext(client,x.tenant_id);await client.query(`insert into delivery_package_records(id,tenant_id,firm_id,project_id,drawing_revision_refs,calculation_input_set_id,qa_finding_refs,evidence_refs,readiness_checks,package_status,requires_professional_review,prepared_by_actor_id,professional_approval_id,issued_document_version_id,created_at,updated_at,metadata) values($1,$2,$3,$4,$5::jsonb,$6,$7::jsonb,$8::jsonb,$9::jsonb,$10,true,$11,$12,$13,$14,$15,$16::jsonb) on conflict(id) do update set qa_finding_refs=excluded.qa_finding_refs,readiness_checks=excluded.readiness_checks,package_status=excluded.package_status,updated_at=excluded.updated_at,metadata=excluded.metadata`,[x.id,x.tenant_id,x.firm_id,x.project_id,JSON.stringify(x.drawing_revision_refs??[]),x.calculation_input_set_id,JSON.stringify(x.qa_finding_refs??[]),JSON.stringify(x.evidence_refs??[]),JSON.stringify(x.readiness_checks??[]),x.package_status,uuidOrNull(x.prepared_by_actor_id),uuidOrNull(x.professional_approval_id),uuidOrNull(x.issued_document_version_id),x.created_at,x.updated_at,JSON.stringify(x.metadata??{})]);}
}

async function upsertPolicyDecision(client, decision) {
  if (!decision?.id || !uuidOrNull(decision.id) || !uuidOrNull(decision.tenant_id) || !uuidOrNull(decision.actor_id) || !uuidOrNull(decision.resource_id)) return;
  await client.query(
    `insert into policy_decisions (id, tenant_id, firm_id, policy_id, policy_version, actor_id, action, resource_type, resource_id, context_ref, result, reasons, created_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13)
     on conflict (id) do nothing`,
    [decision.id, decision.tenant_id, uuidOrNull(decision.firm_id), decision.policy_id ?? "VF-POLICY-MVP", decision.policy_version ?? "1.0", decision.actor_id, decision.action, decision.resource_type, decision.resource_id, decision.context_ref ?? null, decision.result, JSON.stringify(decision.reasons ?? []), decision.created_at ?? now()]
  );
}

async function upsertAuditEvent(client, audit) {
  if (!audit?.id || !uuidOrNull(audit.id) || !uuidOrNull(audit.tenant_id) || !uuidOrNull(audit.actor_id) || !uuidOrNull(audit.resource_id)) return;
  await client.query(
    `insert into audit_events (id, tenant_id, firm_id, actor_id, action, resource_type, resource_id, resource_version, policy_decision_id, correlation_id, causation_id, occurred_at, summary, evidence_ref)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
     on conflict (id) do nothing`,
    [audit.id, audit.tenant_id, uuidOrNull(audit.firm_id), audit.actor_id, audit.action, audit.resource_type, audit.resource_id, audit.resource_version ?? 1, uuidOrNull(audit.policy_decision_id), uuidOrNull(audit.correlation_id) ?? newUuid(), uuidOrNull(audit.causation_id), audit.occurred_at ?? now(), audit.summary, audit.evidence_ref ?? null]
  );
}

async function upsertEventLog(client, event) {
  if (!event?.id || !uuidOrNull(event.id) || !uuidOrNull(event.tenant_id) || !uuidOrNull(event.actor_id) || !uuidOrNull(event.aggregate_id)) return;
  await client.query(
    `insert into event_log (id, event_type, event_version, occurred_at, recorded_at, actor_id, actor_type, tenant_id, firm_id, aggregate_type, aggregate_id, aggregate_version, correlation_id, causation_id, idempotency_key, payload, payload_ref, payload_summary, policy_decision_id, audit_event_id, provenance)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16::jsonb, $17, $18, $19, $20, $21::jsonb)
     on conflict (id) do nothing`,
    [event.id, event.event_type, event.event_version ?? "1.0", event.occurred_at ?? now(), event.recorded_at ?? now(), event.actor_id, event.actor_type, event.tenant_id, uuidOrNull(event.firm_id), event.aggregate_type, event.aggregate_id, event.aggregate_version ?? 1, uuidOrNull(event.correlation_id) ?? newUuid(), uuidOrNull(event.causation_id), event.idempotency_key ?? null, JSON.stringify(event.payload ?? {}), event.payload_ref ?? null, event.payload_summary, uuidOrNull(event.policy_decision_id), uuidOrNull(event.audit_event_id), JSON.stringify(event.provenance ?? {})]
  );
}
async function ensureAppStateTable(client) {
  await client.query(`create table if not exists app_state (
    id text primary key,
    data jsonb not null default '{}',
    updated_at timestamptz not null default now()
  )`);
}


async function seedWorkerTemplates(client) {
  const templates = [
    { id: "33333333-3333-4333-8333-333333333333", code: "formwork-intake-agent", name: "Formwork Intake Agent", version: "1.0", default_tools: ["formwork.input.extract", "document.read"], default_budget: { max_runtime_minutes: 10, max_cost: 5, currency: "MYR" }, risk_envelope: { max_risk_class: "CONTROLLED", requires_human_review: true } },
    { id: "55555555-5555-4555-8555-555555555555", code: "front-desk-coordinator", name: "Front Desk Coordinator", version: "1.0", default_tools: ["client.enquiry.capture", "client.communication.draft", "calendar.request"], default_budget: { max_runtime_minutes: 10, max_cost: 4, currency: "MYR" }, risk_envelope: { max_risk_class: "STANDARD", requires_human_review: true, forbidden_actions: ["technical_advice", "commercial_commitment"] } },
    { id: "66666666-6666-4666-8666-666666666666", code: "administration-clerk", name: "Administration Clerk", version: "1.0", default_tools: ["document.register.update", "correspondence.draft", "task.follow_up"], default_budget: { max_runtime_minutes: 15, max_cost: 5, currency: "MYR" }, risk_envelope: { max_risk_class: "CONTROLLED", requires_human_review: true, forbidden_actions: ["document_approval"] } },
    { id: "77777777-7777-4777-8777-777777777777", code: "accounts-clerk", name: "Accounts Clerk", version: "1.0", default_tools: ["invoice.draft", "receivable.monitor", "expense.classify"], default_budget: { max_runtime_minutes: 15, max_cost: 5, currency: "MYR" }, risk_envelope: { max_risk_class: "CONTROLLED", requires_human_review: true, forbidden_actions: ["payment_approval", "bank_instruction"] } },
    { id: "88888888-8888-4888-8888-888888888888", code: "marketing-sales-coordinator", name: "Marketing & Sales Coordinator", version: "1.0", default_tools: ["lead.qualify", "proposal.draft", "pipeline.summarize"], default_budget: { max_runtime_minutes: 15, max_cost: 6, currency: "MYR" }, risk_envelope: { max_risk_class: "STANDARD", requires_human_review: true, forbidden_actions: ["proposal_send", "pricing_commitment"] } },
    { id: "99999999-9999-4999-8999-999999999999", code: "technical-drawing-assistant", name: "Technical Drawing Assistant", version: "1.0", default_tools: ["document.read", "drawing.register.check", "drawing.revision.compare", "formwork.input.extract"], default_budget: { max_runtime_minutes: 20, max_cost: 8, currency: "MYR" }, risk_envelope: { max_risk_class: "CONTROLLED", requires_human_review: true, forbidden_actions: ["engineering_approval", "drawing_issue", "professional_certification"] } },
    { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", code: "project-coordination-assistant", name: "Project Coordination Assistant", version: "1.0", default_tools: ["task.follow_up", "document.register.update", "project.status.summarize"], default_budget: { max_runtime_minutes: 15, max_cost: 6, currency: "MYR" }, risk_envelope: { max_risk_class: "CONTROLLED", requires_human_review: true, forbidden_actions: ["scope_change_approval", "professional_instruction"] } },
    { id: "44444444-4444-4444-8444-444444444444", code: "formwork-qa-agent", name: "Formwork QA Agent", version: "1.0", default_tools: ["formwork.qa.check", "document.read"], default_budget: { max_runtime_minutes: 15, max_cost: 8, currency: "MYR" }, risk_envelope: { max_risk_class: "CONTROLLED", requires_human_review: true } }
  ];
  for (const template of templates) {
    await client.query(`insert into worker_templates (id, code, name, version, default_tools, default_budget, risk_envelope, status)
      values ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7::jsonb,'ACTIVE') on conflict (code) do nothing`, [template.id, template.code, template.name, template.version, JSON.stringify(template.default_tools), JSON.stringify(template.default_budget), JSON.stringify(template.risk_envelope)]);
  }
}
// HM-S7 Phase 4f, slice 2 (2026-09-29): no longer takes a `client` param -- see loadPostgresStore's
// comment above for why (this now fires its queries across the pool, not one held connection).
// seedWorkerTemplates() runs through the pool too; it's an idempotent (on conflict do nothing)
// one-time upsert, so it doesn't need a dedicated connection or transaction.
async function readRelationalStore(tenantId = null) {
  const pool = getPool();
  const scope = tenantId ? { where: " where tenant_id = $1", params: [tenantId] } : { where: "", params: [] };
  const servicePacks$p = pool.query(`select id::text, code, name, discipline, status, version, description, configuration, created_at, updated_at from service_packs order by created_at, id`);
  const serviceSkus$p = pool.query(`select id::text, service_pack_id::text, code, name, status, pricing_model, created_at, updated_at from service_skus order by created_at, id`);
  await seedWorkerTemplates(pool);
  const workerTemplates$p = pool.query(`select id::text, code, name, version, default_tools, default_budget, risk_envelope, status, created_at, updated_at from worker_templates order by created_at, id`);
  const workerInstances$p = pool.query(`select id::text, tenant_id::text, firm_id::text, worker_template_id::text, actor_id::text, name, assigned_services, tool_allowlist, budget_envelope, risk_limits, runtime_status, created_at, updated_at from worker_instances${scope.where} order by created_at, id`, scope.params);
  const taskOutputs$p = pool.query(`select id::text, tenant_id::text, firm_id::text, project_id::text, task_id::text, worker_instance_id::text, output_ref, output_schema_ref, evidence_refs, quality_flags, requires_human_review, status, created_at from task_outputs${scope.where} order by created_at, id`, scope.params);
  const toolInvocations$p = pool.query(`select id::text, tenant_id::text, firm_id::text, worker_instance_id::text, task_id::text, tool_name, invocation_status, input_summary, output_ref, cost_estimate, created_at, completed_at from tool_invocations${scope.where} order by created_at, id`, scope.params);
  const memberships$p = pool.query(`select id::text, tenant_id::text, firm_id::text, actor_id::text, person_id::text, role, permissions, status, created_at, updated_at from firm_memberships${scope.where} order by created_at, id`, scope.params);
  const professionalProfiles$p = pool.query(`select id::text, tenant_id::text, person_id::text, disciplines, specializations, jurisdictions, credential_refs, professional_status, created_at, updated_at from professional_profiles${scope.where} order by created_at, id`, scope.params);
  const professionalAuthorities$p = pool.query(`select id::text, tenant_id::text, firm_id::text, professional_id::text, practice_id::text, service_scope, jurisdiction_id::text, permitted_actions, risk_limits, credential_refs, valid_from, valid_to, status, policy_basis_ref, created_at, updated_at from professional_authorities${scope.where} order by created_at, id`, scope.params);
  const tenants$p = pool.query(`select id::text, name, status, isolation_policy_id::text, default_region, data_residency_policy, billing_account_ref, created_at, metadata from tenants order by created_at, id`);
  const persons$p = pool.query(`select id::text, tenant_id::text, identity_provider_subject, legal_name, preferred_name, contact_refs, status, created_at, updated_at, metadata from persons${scope.where} order by created_at, id`, scope.params);
  const actors$p = pool.query(`select id::text, id::text as actor_id, actor_type, person_id::text, worker_instance_id::text, system_id, external_service_id, tenant_id::text, firm_id::text, display_name, status, created_at, metadata from actors${scope.where} order by created_at, id`, scope.params);
  const firms$p = pool.query(`select id::text, tenant_id::text, name, brand_id::text, business_entity_id::text, primary_principal_assignment_id::text, lifecycle_state, lifecycle_state_reason, active_practices, configuration_version, status, version, created_at, created_by_actor_id::text, updated_at, updated_by_actor_id::text, data_classification, provenance, metadata from firms${scope.where} order by created_at, id`, scope.params);
  const clients$p = pool.query(`select id::text, tenant_id::text, firm_id::text, client_type, name, primary_contact_id::text, confidentiality_class, status, version, created_at, updated_at, metadata from clients${scope.where} order by created_at, id`, scope.params);
  const relationships$p = pool.query(`select id::text, tenant_id::text, firm_id::text, client_id::text, relationship_type, status, origin, responsible_owner_actor_id::text, contracting_business_entity_id::text, consent_or_legal_basis_ref, conflict_check_ref, created_at, updated_at from firm_client_relationships${scope.where} order by created_at, id`, scope.params);
  const leads$p = pool.query(`select id::text, tenant_id::text, firm_id::text, relationship_id::text, source_channel, requested_service_hint, urgency, qualification_status, assigned_actor_id::text, created_from_conversation_ref, created_at, metadata from leads${scope.where} order by created_at, id`, scope.params);
  const intakeSessions$p = pool.query(`select id::text, tenant_id::text, firm_id::text, lead_id::text, service_id::text, required_inputs, provided_inputs, missing_information_items, intake_status, created_at, updated_at from intake_sessions${scope.where} order by created_at, id`, scope.params);
  const prices$p = pool.query(`select id::text, tenant_id::text, firm_id::text, service_sku_id::text, scope_inputs, human_effort_estimate, ai_runtime_estimate, specialist_cost_estimate, tool_cost_estimate, risk_contingency, platform_fee, margin_target, final_price, approval_required, created_at from price_build_ups${scope.where} order by created_at, id`, scope.params);
  const proposals$p = pool.query(`select id::text, tenant_id::text, firm_id::text, relationship_id::text, service_id::text, scope_summary, price_build_up_id::text, commercial_approval_id::text, proposal_status, valid_until, issued_document_ref, version, created_at, updated_at from proposals${scope.where} order by created_at, id`, scope.params);
  const approvals$p = pool.query(`select id::text, tenant_id::text, firm_id::text, subject_type, subject_id::text, subject_version_or_hash, requested_by_actor_id::text, approver_actor_id::text, approver_professional_id::text, authority_id::text, decision, conditions, evidence_bundle_id::text, authentication_strength, decided_at, audit_event_id::text, created_at from approvals${scope.where} order by created_at, id`, scope.params);
  const engagements$p = pool.query(`select id::text, tenant_id::text, firm_id::text, relationship_id::text, proposal_id::text, contract_ref, scope_ref, commercial_terms_ref, acceptance_criteria_ref, status, created_at, updated_at from engagements${scope.where} order by created_at, id`, scope.params);
  const projects$p = pool.query(`select id::text, tenant_id::text, firm_id::text, relationship_id::text, engagement_id::text, service_id::text, project_name, project_state, risk_class, responsible_professional_id::text, created_at, updated_at from projects${scope.where} order by created_at, id`, scope.params);
  const workPackages$p = pool.query(`select id::text, tenant_id::text, firm_id::text, project_id::text, service_step, assigned_worker_instance_id::text, assigned_human_actor_id::text, state, required_evidence, approval_requirement_id::text, created_at, updated_at from work_packages${scope.where} order by created_at, id`, scope.params);
  const frontDeskEnquiries$p = pool.query(`select id::text, tenant_id::text, firm_id::text, source_channel, contact_name, organization_name, contact_email, contact_phone, enquiry_summary, requested_service_hint, urgency, status, qualification_reason, consent_or_legal_basis_ref, conflict_check_status, conflict_check_ref, assigned_actor_id::text, client_id::text, relationship_id::text, lead_id::text, intake_session_id::text, created_at, updated_at, metadata from front_desk_enquiries${scope.where} order by created_at, id`, scope.params);
  const communicationDrafts$p = pool.query(`select id::text, tenant_id::text, firm_id::text, enquiry_id::text, channel, subject, body, status, requires_human_review, prepared_by_actor_id::text, approved_by_actor_id::text, sent_at, created_at, updated_at, metadata from client_communication_drafts${scope.where} order by created_at, id`, scope.params);
  const tasks$p = pool.query(`select id::text, tenant_id::text, firm_id::text, project_id::text, work_package_id::text, task_type, input_ref, output_ref, assigned_actor_or_worker_ref::text, state, risk_class, due_at, created_at, updated_at from tasks${scope.where} order by created_at, id`, scope.params);
  const documents$p = pool.query(`select id::text, tenant_id::text, firm_id::text, project_id::text, relationship_id::text, document_type, title, current_version_id::text, status, classification, created_at from documents${scope.where} order by created_at, id`, scope.params);
  const documentVersions$p = pool.query(`select id::text, tenant_id::text, firm_id::text, document_id::text, version_label, revision, storage_ref, hash, created_by_actor_id::text, approved_by_approval_id::text, supersedes_version_id::text, status, created_at from document_versions${scope.where} order by created_at, id`, scope.params);
  const administrationSkillBindings$p = pool.query(`select id::text,tenant_id::text,firm_id::text,worker_template_code,role_skill_ref,worker_skill_ref,input_schema_ref,output_schema_ref,supervisor_actor_id::text,permissions,forbidden_actions,status,version,created_at,metadata from administration_skill_bindings${scope.where} order by created_at,id`, scope.params);
  const correspondenceRecords$p = pool.query(`select id::text,tenant_id::text,firm_id::text,relationship_id::text,project_id::text,direction,channel,subject,correspondent,received_or_drafted_at,status,owner_actor_id::text,response_due_at,source_ref,created_at,updated_at,metadata from correspondence_records${scope.where} order by created_at,id`, scope.params);
  const documentRegisterEntries$p = pool.query(`select id::text,tenant_id::text,firm_id::text,relationship_id::text,project_id::text,document_number,title,document_type,discipline,classification,status,current_revision_id::text,owner_actor_id::text,created_at,updated_at,metadata from document_register_entries${scope.where} order by created_at,id`, scope.params);
  const documentRevisionRecords$p = pool.query(`select id::text,tenant_id::text,firm_id::text,document_register_entry_id::text,revision,version_label,storage_ref,content_hash,status,supersedes_revision_id::text,created_by_actor_id::text,created_at,metadata from document_revision_records${scope.where} order by created_at,id`, scope.params);
  const administrativeDeadlines$p = pool.query(`select id::text,tenant_id::text,firm_id::text,project_id::text,relationship_id::text,title,due_at,priority,status,assigned_actor_or_worker_ref::text,source_ref,created_at,updated_at,completed_at,metadata from administrative_deadlines${scope.where} order by due_at,id`, scope.params);
  const transmittalDrafts$p = pool.query(`select id::text,tenant_id::text,firm_id::text,project_id::text,relationship_id::text,recipient,subject,document_revision_refs,message_body,status,requires_principal_approval,prepared_by_actor_id::text,approved_by_actor_id::text,issued_at,created_at,updated_at,metadata from transmittal_drafts${scope.where} order by created_at,id`, scope.params);
  const evidence$p = pool.query(`select id::text, tenant_id::text, firm_id::text, project_id::text, subject_type, subject_id::text, source_document_refs, input_refs, calculation_refs, qa_check_refs, policy_check_refs, review_notes_ref, final_output_ref, bundle_hash, status, created_at from evidence_bundles${scope.where} order by created_at, id`, scope.params);
  const invoices$p = pool.query(`select id::text, tenant_id::text, firm_id::text, relationship_id::text, engagement_id::text, project_id::text, invoice_number, currency, line_items, tax_summary, status, due_at, created_at, updated_at from invoices${scope.where} order by created_at, id`, scope.params);
  const paymentStatuses$p = pool.query(`select id::text, tenant_id::text, firm_id::text, invoice_id::text, amount, currency, provider_ref, payment_status, received_at, created_at, updated_at from payment_statuses${scope.where} order by created_at, id`, scope.params);
  const marketplaceListings$p = pool.query(`select id::text, tenant_id::text, firm_id::text, service_pack_id::text, listing_scope, title, description, qualification_requirements, commercial_model, visibility, status, created_at, updated_at from marketplace_listings${scope.where} order by created_at, id`, scope.params);
  const capacityOffers$p = pool.query(`select id::text, tenant_id::text, firm_id::text, service_pack_id::text, capacity_type, pce_units, available_from, available_until, jurisdiction_refs, constraints, status, created_at, updated_at from capacity_offers${scope.where} order by created_at, id`, scope.params);
  const collaborationRequests$p = pool.query(`select id::text, tenant_id::text, requesting_firm_id::text, provider_firm_id::text, service_pack_id::text, project_id::text, capacity_offer_id::text, request_summary, data_room_policy, status, created_at, updated_at, metadata from collaboration_requests${scope.where} order by created_at, id`, scope.params);
  const directoryReviewBoardDecisions$p = pool.query(`select id::text, tenant_id::text, provider_firm_id::text, listing_id::text, qualification_gate_id::text, board_ref, decision, decision_summary, evidence_refs, decided_by_actor_id::text, decided_at, created_at, metadata from directory_review_board_decisions${scope.where} order by created_at, id`, scope.params);
  const directoryPrivateEnquiries$p = pool.query(`select id::text, tenant_id::text, requesting_firm_id::text, provider_firm_id::text, listing_id::text, enquiry_summary, status, matching_mode, no_live_matching, no_ranking, no_award, created_by_actor_id::text, created_at, updated_at, metadata from directory_private_enquiries${scope.where} order by created_at, id`, scope.params);
  const qualificationRenewalReviews$p = pool.query(`select id::text, tenant_id::text, provider_firm_id::text, qualification_gate_id::text, listing_id::text, credential_id::text, jurisdiction_ref, review_status, expires_at, next_review_due_at, evidence_refs, reviewed_by_actor_id::text, reviewed_at, created_at, metadata from qualification_renewal_reviews${scope.where} order by created_at, id`, scope.params);
  const networkProfessionalProfiles$p = pool.query(`select id::text, tenant_id::text, firm_id::text, person_id::text, professional_profile_id::text, display_name, profile_scope, network_status, authority_grant, jurisdiction_refs, credential_refs, capability_refs, created_by_actor_id::text, created_at, updated_at, metadata from network_professional_profiles${scope.where} order by created_at, id`, scope.params);
  const networkFirmProfiles$p = pool.query(`select id::text, tenant_id::text, firm_id::text, display_name, profile_scope, network_status, jurisdiction_refs, capability_refs, created_by_actor_id::text, created_at, updated_at, metadata from network_firm_profiles${scope.where} order by created_at, id`, scope.params);
  const networkCapabilities$p = pool.query(`select id::text, tenant_id::text, firm_id::text, professional_network_profile_id::text, firm_network_profile_id::text, capability_code, service_pack_ref, jurisdiction_refs, visibility, qualification_required, status, created_by_actor_id::text, created_at, updated_at, metadata from network_capabilities${scope.where} order by created_at, id`, scope.params);
  const networkCredentials$p = pool.query(`select id::text, tenant_id::text, firm_id::text, professional_network_profile_id::text, credential_type, credential_name, issuer, jurisdiction_refs, verification_status, verified_by_actor_id::text, verified_at, valid_from, valid_until, evidence_refs, authority_grant, created_by_actor_id::text, created_at, updated_at, metadata from network_credentials${scope.where} order by created_at, id`, scope.params);
  const networkTrustSignals$p = pool.query(`select id::text, tenant_id::text, firm_id::text, subject_type, subject_id::text, signal_type, signal_summary, evidence_refs, trust_weight, substitutes_for_credential, status, created_by_actor_id::text, created_at, updated_at, metadata from network_trust_signals${scope.where} order by created_at, id`, scope.params);
  const networkConflictChecks$p = pool.query(`select id::text, tenant_id::text, requesting_firm_id::text, provider_firm_id::text, subject_profile_id::text, check_status, conflict_summary, evidence_refs, checked_by_actor_id::text, created_at, metadata from network_conflict_checks${scope.where} order by created_at, id`, scope.params);
  const networkQualificationGates$p = pool.query(`select id::text, tenant_id::text, requesting_firm_id::text, provider_firm_id::text, professional_network_profile_id::text, firm_network_profile_id::text, capability_id::text, credential_id::text, conflict_check_id::text, jurisdiction_ref, credential_status, jurisdiction_status, insurance_status, conflict_status, capacity_status, policy_status, gate_status, denial_reasons, created_by_actor_id::text, created_at, updated_at, metadata from network_qualification_gates${scope.where} order by created_at, id`, scope.params);
  const specialistInvitations$p = pool.query(`select id::text, tenant_id::text, requesting_firm_id::text, provider_firm_id::text, qualification_gate_id::text, capability_id::text, invitation_status, denial_reasons, invited_by_actor_id::text, created_at, updated_at, metadata from specialist_invitations${scope.where} order by created_at, id`, scope.params);
  const collaborationWorkspaces$p = pool.query(`select id::text, tenant_id::text, requesting_firm_id::text, provider_firm_id::text, specialist_invitation_id::text, qualification_gate_id::text, workspace_status, data_room_policy, permitted_evidence_refs, created_by_actor_id::text, created_at, updated_at, metadata from collaboration_workspaces${scope.where} order by created_at, id`, scope.params);
  const collaborationWorkspaceParticipants$p = pool.query(`select id::text, tenant_id::text, workspace_id::text, firm_id::text, actor_id::text, participant_role, access_status, permissions, granted_by_actor_id::text, granted_at, revoked_by_actor_id::text, revoked_at, metadata from collaboration_workspace_participants${scope.where} order by granted_at, id`, scope.params);
  const collaborationWorkspaceEvidence$p = pool.query(`select id::text, tenant_id::text, workspace_id::text, participant_id::text, evidence_ref, evidence_type, access_scope, added_by_actor_id::text, added_at, metadata from collaboration_workspace_evidence${scope.where} order by added_at, id`, scope.params);
  const responsibilityMatrices$p = pool.query(`select id::text, tenant_id::text, workspace_id::text, requesting_firm_id::text, provider_firm_id::text, accountable_firm_id::text, responsible_professional_actor_id::text, reviewer_actor_id::text, approver_actor_id::text, permitted_worker_actions, regulated_scope, approval_required, matrix_status, created_by_actor_id::text, created_at, updated_at, metadata from responsibility_matrices${scope.where} order by created_at, id`, scope.params);
  const specialistAssignments$p = pool.query(`select id::text, tenant_id::text, workspace_id::text, responsibility_matrix_id::text, requesting_firm_id::text, provider_firm_id::text, assignment_title, assignment_scope, assignment_status, requested_by_actor_id::text, accepted_by_actor_id::text, started_by_actor_id::text, delivered_by_actor_id::text, reviewed_by_actor_id::text, approved_by_actor_id::text, closed_by_actor_id::text, evidence_refs, review_summary, approval_summary, requested_at, accepted_at, started_at, delivered_at, reviewed_at, approved_at, closed_at, updated_at, metadata from specialist_assignments${scope.where} order by requested_at, id`, scope.params);
  const observatorySnapshots$p = pool.query(`select id::text, tenant_id::text, firm_id::text, snapshot_scope, metrics, privacy_class, generated_at from observatory_snapshots${scope.where} order by generated_at, id`, scope.params);
  const pilotUsers$p = pool.query(`select id::text, tenant_id::text, firm_id::text, person_id::text, actor_id::text, email, display_name, pilot_role, invite_status, auth_provider, external_subject, invited_at, activated_at, revoked_at, metadata from pilot_users${scope.where} order by invited_at, id`, scope.params);
  const commercialSkillBindings$p = pool.query(`select id::text,tenant_id::text,firm_id::text,worker_template_code,role_skill_ref,worker_skill_ref,input_schema_ref,output_schema_ref,supervisor_actor_id::text,permissions,forbidden_actions,status,version,created_at,metadata from commercial_skill_bindings${scope.where} order by created_at,id`, scope.params);
  const salesPipelineRecords$p = pool.query(`select id::text,tenant_id::text,firm_id::text,enquiry_id::text,relationship_id::text,intake_session_id::text,proposal_id::text,opportunity_name,stage,estimated_value,currency,probability_percent,owner_actor_id::text,next_action,next_action_due_at,lost_reason,created_at,updated_at,metadata from sales_pipeline_records${scope.where} order by created_at,id`, scope.params);
  const proposalDispatchRecords$p = pool.query(`select id::text,tenant_id::text,firm_id::text,proposal_id::text,recipient,channel,dispatch_status,dispatched_by_actor_id::text,commercial_approval_id::text,document_ref,dispatched_at,created_at,metadata from proposal_dispatch_records${scope.where} order by created_at,id`, scope.params);
  const expenseRecords$p = pool.query(`select id::text,tenant_id::text,firm_id::text,project_id::text,supplier,description,category,amount,currency,expense_date,receipt_ref,status,prepared_by_actor_id::text,approved_by_actor_id::text,approved_at,payment_instruction_ref,created_at,updated_at,metadata from expense_records${scope.where} order by expense_date,id`, scope.params);
  const receivableFollowUps$p = pool.query(`select id::text,tenant_id::text,firm_id::text,invoice_id::text,channel,subject,message_body,status,requires_human_review,prepared_by_actor_id::text,approved_by_actor_id::text,sent_at,created_at,updated_at,metadata from receivable_follow_ups${scope.where} order by created_at,id`, scope.params);
  const supportCases$p = pool.query(`select id::text, tenant_id::text, firm_id::text, opened_by_actor_id::text, related_pilot_user_id::text, case_type, severity, status, subject, description, resolution_summary, created_at, updated_at, closed_at, metadata from support_cases${scope.where} order by created_at, id`, scope.params);
  const technicalSkillBindings$p = pool.query(`select id::text,tenant_id::text,firm_id::text,worker_template_code,role_skill_ref,worker_skill_ref,input_schema_ref,output_schema_ref,supervisor_actor_id::text,permissions,forbidden_actions,status,version,created_at,metadata from technical_skill_bindings${scope.where} order by created_at,id`, scope.params);
  const drawingReviewRecords$p = pool.query(`select id::text,tenant_id::text,firm_id::text,project_id::text,document_register_entry_id::text,base_revision_id::text,compared_revision_id::text,check_results,status,prepared_by_actor_id::text,requires_professional_review,created_at,metadata from drawing_review_records${scope.where} order by created_at,id`, scope.params);
  const calculationInputSets$p = pool.query(`select id::text,tenant_id::text,firm_id::text,project_id::text,intake_session_id::text,source_revision_refs,input_values,unit_system,validation_results,validation_status,deterministic_engine_ref,prepared_by_actor_id::text,created_at,updated_at,metadata from calculation_input_sets${scope.where} order by created_at,id`, scope.params);
  const technicalQaFindings$p = pool.query(`select id::text,tenant_id::text,firm_id::text,project_id::text,subject_type,subject_id::text,finding_code,severity,description,status,raised_by_actor_id::text,resolved_by_actor_id::text,resolution_summary,created_at,updated_at,resolved_at,metadata from technical_qa_findings${scope.where} order by created_at,id`, scope.params);
  const deliveryPackageRecords$p = pool.query(`select id::text,tenant_id::text,firm_id::text,project_id::text,drawing_revision_refs,calculation_input_set_id::text,qa_finding_refs,evidence_refs,readiness_checks,package_status,requires_professional_review,prepared_by_actor_id::text,professional_approval_id::text,issued_document_version_id::text,created_at,updated_at,metadata from delivery_package_records${scope.where} order by created_at,id`, scope.params);
  const pilotIncidents$p = pool.query(`select id::text, tenant_id::text, firm_id::text, support_case_id::text, project_id::text, opened_by_actor_id::text, incident_type, severity, status, title, description, detection_source, impact_summary, mitigation_summary, root_cause_summary, created_at, updated_at, resolved_at, metadata from pilot_incidents${scope.where} order by created_at, id`, scope.params);
  const pilotFeedback$p = pool.query(`select id::text, tenant_id::text, firm_id::text, pilot_user_id::text, project_id::text, submitted_by_actor_id::text, feedback_type, sentiment, rating, subject, feedback_text, created_at, metadata from pilot_feedback${scope.where} order by created_at, id`, scope.params);
  const acceptanceReviews$p = pool.query(`select id::text, tenant_id::text, firm_id::text, reviewed_by_actor_id::text, review_scope, criteria, decision, evidence_refs, notes, created_at, updated_at, metadata from pilot_acceptance_reviews${scope.where} order by created_at, id`, scope.params);
  const improvementItems$p = pool.query(`select id::text, tenant_id::text, firm_id::text, feedback_id::text, acceptance_review_id::text, owner_actor_id::text, item_type, priority, status, title, description, target_stage, created_at, updated_at, closed_at, metadata from pilot_improvement_items${scope.where} order by created_at, id`, scope.params);
  const reportPacks$p = pool.query(`select id::text, tenant_id::text, firm_id::text, generated_by_actor_id::text, report_scope, report_status, summary, export_manifest, created_at, metadata from pilot_report_packs${scope.where} order by created_at, id`, scope.params);
  const reviewBoards$p = pool.query(`select id::text, tenant_id::text, firm_id::text, report_pack_id::text, chaired_by_actor_id::text, board_name, review_status, agenda, attendees, scheduled_at, created_at, updated_at, closed_at, metadata from stakeholder_review_boards${scope.where} order by created_at, id`, scope.params);
  const reviewDecisions$p = pool.query(`select id::text, tenant_id::text, firm_id::text, board_id::text, decided_by_actor_id::text, decision, decision_summary, conditions, next_stage, decided_at, metadata from stakeholder_review_decisions${scope.where} order by decided_at, id`, scope.params);
  const expansionCohorts$p = pool.query(`select id::text, tenant_id::text, firm_id::text, stakeholder_decision_id::text, created_by_actor_id::text, cohort_name, expansion_status, max_tenants, max_pilot_users, entry_criteria, risk_controls, created_at, updated_at, metadata from pilot_expansion_cohorts${scope.where} order by created_at, id`, scope.params);
  const onboardingPlans$p = pool.query(`select id::text, tenant_id::text, firm_id::text, expansion_cohort_id::text, assigned_operator_actor_id::text, onboarding_status, onboarding_steps, readiness_checks, target_start_at, created_at, updated_at, completed_at, metadata from tenant_onboarding_plans${scope.where} order by created_at, id`, scope.params);
  const rcGates$p = pool.query(`select id::text, tenant_id::text, firm_id::text, expansion_cohort_id::text, reviewed_by_actor_id::text, release_candidate, gate_status, required_checks, evidence_refs, decision_summary, created_at, decided_at, metadata from release_candidate_gates${scope.where} order by created_at, id`, scope.params);
  const pilotControls$p = pool.query(`select id::text, tenant_id::text, firm_id::text, created_by_actor_id::text, control_status, plan_code, limits, billing_readiness, created_at, updated_at, metadata from tenant_pilot_controls${scope.where} order by created_at, id`, scope.params);
  const usageEvents$p = pool.query(`select id::text, tenant_id::text, firm_id::text, actor_id::text, usage_type, quantity, unit, source_ref, recorded_at, metadata from tenant_usage_events${scope.where} order by recorded_at, id`, scope.params);
  const billingReviews$p = pool.query(`select id::text, tenant_id::text, firm_id::text, reviewed_by_actor_id::text, readiness_status, pricing_model, checks, decision_summary, created_at, metadata from billing_readiness_reviews${scope.where} order by created_at, id`, scope.params);
  const paymentProviderConfigs$p = pool.query(`select id::text, tenant_id::text, firm_id::text, configured_by_actor_id::text, provider_name, provider_mode, config_status, capabilities, required_env, created_at, updated_at, metadata from payment_provider_configs${scope.where} order by created_at, id`, scope.params);
  const subscriptionPackages$p = pool.query(`select id::text, tenant_id::text, firm_id::text, created_by_actor_id::text, package_code, package_name, package_status, pricing_model, base_price, currency, usage_limits, features, created_at, updated_at, metadata from subscription_packages${scope.where} order by created_at, id`, scope.params);
  const commercialLaunchControls$p = pool.query(`select id::text, tenant_id::text, firm_id::text, payment_provider_config_id::text, subscription_package_id::text, reviewed_by_actor_id::text, launch_status, required_controls, decision_summary, created_at, decided_at, metadata from commercial_launch_controls${scope.where} order by created_at, id`, scope.params);
  const pilotHandoffRecords$p = pool.query(`select id::text, tenant_id::text, firm_id::text, accepted_by_actor_id::text, rehearsal_ref, handoff_status, checklist, evidence_refs, decision_summary, accepted_at, created_at, metadata from pilot_handoff_records${scope.where} order by created_at, id`, scope.params);
  const policyDecisions$p = pool.query(`select id::text, tenant_id::text, firm_id::text, policy_id, policy_version, actor_id::text, action, resource_type, resource_id::text, context_ref, result, reasons, created_at from policy_decisions${scope.where} order by created_at, id`, scope.params);
  const events$p = pool.query(`select id::text, event_type, event_version, occurred_at, recorded_at, actor_id::text, actor_type, tenant_id::text, firm_id::text, aggregate_type, aggregate_id::text, aggregate_version, correlation_id::text, causation_id::text, idempotency_key, payload, payload_ref, payload_summary, policy_decision_id::text, audit_event_id::text, provenance from event_log${scope.where} order by occurred_at, id`, scope.params);
  const audits$p = pool.query(`select id::text, tenant_id::text, firm_id::text, actor_id::text, action, resource_type, resource_id::text, resource_version, policy_decision_id::text, correlation_id::text, causation_id::text, occurred_at, summary, evidence_ref from audit_events${scope.where} order by occurred_at, id`, scope.params);

  const [servicePacks, serviceSkus, workerTemplates, workerInstances, taskOutputs, toolInvocations, memberships, professionalProfiles, professionalAuthorities, tenants, persons, actors, firms, clients, relationships, leads, intakeSessions, prices, proposals, approvals, engagements, projects, workPackages, frontDeskEnquiries, communicationDrafts, tasks, documents, documentVersions, administrationSkillBindings, correspondenceRecords, documentRegisterEntries, documentRevisionRecords, administrativeDeadlines, transmittalDrafts, evidence, invoices, paymentStatuses, marketplaceListings, capacityOffers, collaborationRequests, directoryReviewBoardDecisions, directoryPrivateEnquiries, qualificationRenewalReviews, networkProfessionalProfiles, networkFirmProfiles, networkCapabilities, networkCredentials, networkTrustSignals, networkConflictChecks, networkQualificationGates, specialistInvitations, collaborationWorkspaces, collaborationWorkspaceParticipants, collaborationWorkspaceEvidence, responsibilityMatrices, specialistAssignments, observatorySnapshots, pilotUsers, commercialSkillBindings, salesPipelineRecords, proposalDispatchRecords, expenseRecords, receivableFollowUps, supportCases, technicalSkillBindings, drawingReviewRecords, calculationInputSets, technicalQaFindings, deliveryPackageRecords, pilotIncidents, pilotFeedback, acceptanceReviews, improvementItems, reportPacks, reviewBoards, reviewDecisions, expansionCohorts, onboardingPlans, rcGates, pilotControls, usageEvents, billingReviews, paymentProviderConfigs, subscriptionPackages, commercialLaunchControls, pilotHandoffRecords, policyDecisions, events, audits] = await Promise.all([servicePacks$p, serviceSkus$p, workerTemplates$p, workerInstances$p, taskOutputs$p, toolInvocations$p, memberships$p, professionalProfiles$p, professionalAuthorities$p, tenants$p, persons$p, actors$p, firms$p, clients$p, relationships$p, leads$p, intakeSessions$p, prices$p, proposals$p, approvals$p, engagements$p, projects$p, workPackages$p, frontDeskEnquiries$p, communicationDrafts$p, tasks$p, documents$p, documentVersions$p, administrationSkillBindings$p, correspondenceRecords$p, documentRegisterEntries$p, documentRevisionRecords$p, administrativeDeadlines$p, transmittalDrafts$p, evidence$p, invoices$p, paymentStatuses$p, marketplaceListings$p, capacityOffers$p, collaborationRequests$p, directoryReviewBoardDecisions$p, directoryPrivateEnquiries$p, qualificationRenewalReviews$p, networkProfessionalProfiles$p, networkFirmProfiles$p, networkCapabilities$p, networkCredentials$p, networkTrustSignals$p, networkConflictChecks$p, networkQualificationGates$p, specialistInvitations$p, collaborationWorkspaces$p, collaborationWorkspaceParticipants$p, collaborationWorkspaceEvidence$p, responsibilityMatrices$p, specialistAssignments$p, observatorySnapshots$p, pilotUsers$p, commercialSkillBindings$p, salesPipelineRecords$p, proposalDispatchRecords$p, expenseRecords$p, receivableFollowUps$p, supportCases$p, technicalSkillBindings$p, drawingReviewRecords$p, calculationInputSets$p, technicalQaFindings$p, deliveryPackageRecords$p, pilotIncidents$p, pilotFeedback$p, acceptanceReviews$p, improvementItems$p, reportPacks$p, reviewBoards$p, reviewDecisions$p, expansionCohorts$p, onboardingPlans$p, rcGates$p, pilotControls$p, usageEvents$p, billingReviews$p, paymentProviderConfigs$p, subscriptionPackages$p, commercialLaunchControls$p, pilotHandoffRecords$p, policyDecisions$p, events$p, audits$p]);
  return {
    tenants: tenants.rows.map(mapDbDates),
    service_packs: servicePacks.rows.map(mapDbDates),
    service_skus: serviceSkus.rows.map(mapDbDates),
    worker_templates: workerTemplates.rows.map(mapDbDates),
    worker_instances: workerInstances.rows.map(mapDbDates),
    task_outputs: taskOutputs.rows.map(mapDbDates),
    tool_invocations: toolInvocations.rows.map(mapDbDates),
    firm_memberships: memberships.rows.map(mapDbDates),
    professional_profiles: professionalProfiles.rows.map(mapDbDates),
    professional_authorities: professionalAuthorities.rows.map(mapDbDates),
    persons: persons.rows.map(mapDbDates),
    actors: actors.rows.map(mapDbDates),
    firms: firms.rows.map(mapDbDates),
    clients: clients.rows.map(mapDbDates),
    firm_client_relationships: relationships.rows.map(mapDbDates),
    leads: leads.rows.map(mapDbDates),
    intake_sessions: intakeSessions.rows.map(mapDbDates),
    price_build_ups: prices.rows.map(mapDbDates),
    proposals: proposals.rows.map(mapDbDates),
    approvals: approvals.rows.map(mapDbDates),
    engagements: engagements.rows.map(mapDbDates),
    projects: projects.rows.map(mapDbDates),
    work_packages: workPackages.rows.map(mapDbDates),
    tasks: tasks.rows.map(mapDbDates),
    documents: documents.rows.map(mapDbDates),
    document_versions: documentVersions.rows.map(mapDbDates),
    evidence_bundles: evidence.rows.map(mapDbDates),
    invoices: invoices.rows.map(mapDbDates),
    payment_statuses: paymentStatuses.rows.map(mapDbDates),
    marketplace_listings: marketplaceListings.rows.map(mapDbDates),
    directory_review_board_decisions: directoryReviewBoardDecisions.rows.map(mapDbDates),
    directory_private_enquiries: directoryPrivateEnquiries.rows.map(mapDbDates),
    qualification_renewal_reviews: qualificationRenewalReviews.rows.map(mapDbDates),
    capacity_offers: capacityOffers.rows.map(mapDbDates),
    collaboration_requests: collaborationRequests.rows.map(mapDbDates),
    network_professional_profiles: networkProfessionalProfiles.rows.map(mapDbDates),
    network_firm_profiles: networkFirmProfiles.rows.map(mapDbDates),
    network_capabilities: networkCapabilities.rows.map(mapDbDates),
    network_credentials: networkCredentials.rows.map(mapDbDates),
    network_trust_signals: networkTrustSignals.rows.map(mapDbDates),
    network_conflict_checks: networkConflictChecks.rows.map(mapDbDates),
    network_qualification_gates: networkQualificationGates.rows.map(mapDbDates),
    specialist_invitations: specialistInvitations.rows.map(mapDbDates),
    collaboration_workspaces: collaborationWorkspaces.rows.map(mapDbDates),
    collaboration_workspace_participants: collaborationWorkspaceParticipants.rows.map(mapDbDates),
    collaboration_workspace_evidence: collaborationWorkspaceEvidence.rows.map(mapDbDates),
    responsibility_matrices: responsibilityMatrices.rows.map(mapDbDates),
    specialist_assignments: specialistAssignments.rows.map(mapDbDates),
    front_desk_enquiries: frontDeskEnquiries.rows.map(mapDbDates),
    client_communication_drafts: communicationDrafts.rows.map(mapDbDates),
    observatory_snapshots: observatorySnapshots.rows.map(mapDbDates),
    pilot_users: pilotUsers.rows.map(mapDbDates),
    support_cases: supportCases.rows.map(mapDbDates),
    pilot_incidents: pilotIncidents.rows.map(mapDbDates),
    administration_skill_bindings: administrationSkillBindings.rows.map(mapDbDates),
    correspondence_records: correspondenceRecords.rows.map(mapDbDates),
    document_register_entries: documentRegisterEntries.rows.map(mapDbDates),
    document_revision_records: documentRevisionRecords.rows.map(mapDbDates),
    administrative_deadlines: administrativeDeadlines.rows.map(mapDbDates),
    transmittal_drafts: transmittalDrafts.rows.map(mapDbDates),
    pilot_feedback: pilotFeedback.rows.map(mapDbDates),
    pilot_acceptance_reviews: acceptanceReviews.rows.map(mapDbDates),
    pilot_improvement_items: improvementItems.rows.map(mapDbDates),
    pilot_report_packs: reportPacks.rows.map(mapDbDates),
    stakeholder_review_boards: reviewBoards.rows.map(mapDbDates),
    stakeholder_review_decisions: reviewDecisions.rows.map(mapDbDates),
    pilot_expansion_cohorts: expansionCohorts.rows.map(mapDbDates),
    tenant_onboarding_plans: onboardingPlans.rows.map(mapDbDates),
    commercial_skill_bindings: commercialSkillBindings.rows.map(mapDbDates),
    sales_pipeline_records: salesPipelineRecords.rows.map(mapDbDates),
    proposal_dispatch_records: proposalDispatchRecords.rows.map(mapDbDates),
    expense_records: expenseRecords.rows.map(mapDbDates),
    receivable_follow_ups: receivableFollowUps.rows.map(mapDbDates),
    release_candidate_gates: rcGates.rows.map(mapDbDates),
    tenant_pilot_controls: pilotControls.rows.map(mapDbDates),
    technical_skill_bindings: technicalSkillBindings.rows.map(mapDbDates),
    drawing_review_records: drawingReviewRecords.rows.map(mapDbDates),
    calculation_input_sets: calculationInputSets.rows.map(mapDbDates),
    technical_qa_findings: technicalQaFindings.rows.map(mapDbDates),
    delivery_package_records: deliveryPackageRecords.rows.map(mapDbDates),
    tenant_usage_events: usageEvents.rows.map(mapDbDates),
    billing_readiness_reviews: billingReviews.rows.map(mapDbDates),
    payment_provider_configs: paymentProviderConfigs.rows.map(mapDbDates),
    subscription_packages: subscriptionPackages.rows.map(mapDbDates),
    commercial_launch_controls: commercialLaunchControls.rows.map(mapDbDates),
    pilot_handoff_records: pilotHandoffRecords.rows.map(mapDbDates),
    policy_decisions: policyDecisions.rows.map(mapDbDates),
    event_log: events.rows.map(mapDbDates),
    audit_events: audits.rows.map(mapDbDates)
  };
}


export async function createPolicyDecisionRecord(input, decision) {
  const actor = input?.actor ?? {};
  const resource = input?.resource ?? {};
  const record = {
    id: newUuid(),
    tenant_id: resource.tenant_id ?? actor.tenant_id ?? input?.tenant_id,
    firm_id: resource.firm_id ?? actor.firm_id ?? input?.firm_id ?? null,
    policy_id: input?.policy_id ?? "VF-POLICY-MVP",
    policy_version: input?.policy_version ?? "1.0",
    actor_id: actor.actor_id,
    action: input?.action,
    resource_type: resource.resource_type,
    resource_id: resource.resource_id,
    context_ref: input?.context_ref ?? null,
    result: decision?.result,
    reasons: decision?.reasons ?? [],
    created_at: now()
  };

  if (storeBackend !== "postgres") {
    return withStore((store) => {
      store.policy_decisions.push(record);
      return record;
    });
  }

  if (!uuidOrNull(record.tenant_id) || !uuidOrNull(record.actor_id) || !uuidOrNull(record.resource_id) || !record.action || !record.resource_type || !record.result) return null;
  const client = await getPool().connect();
  try {
    await client.query("begin");
    await setTenantContext(client, record.tenant_id);
    await ensureSystemActor(client);
    await createPolicyDecision({ ...record, firm_id: uuidOrNull(record.firm_id) }, client);
    await client.query("commit");
    return record;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
export async function createTenantRecord(body) {
  if (storeBackend !== "postgres") {
    return withStore((store) => {
      const tenant = buildTenant(body);
      store.tenants.push(tenant);
      appendEventAndAudit(store, { event_type: "tenant.created", actor: systemActor(tenant.id), tenant_id: tenant.id, aggregate_type: "Tenant", aggregate_id: tenant.id, payload: tenant, summary: "Tenant created." });
      return tenant;
    });
  }

  const client = await getPool().connect();
  try {
    await client.query("begin");
    const timestamp = now();
    const tenant = buildTenant(body, { id: newUuid(), isolation_policy_id: body.isolation_policy_id ?? newUuid(), created_at: timestamp });
    // HM-S7 Phase 4c (2026-09-28): repositories/directory-firm-setup.repo.mjs's createTenant()
    // replaces the hand-written insert, running on this same client so it still participates
    // in this handler's existing begin/commit transaction.
    const savedRow = await createTenant(tenant, client);
    await client.query("commit");
    const savedTenant = mapDbDates(savedRow);
    await withAppState((store) => {
      appendEventAndAudit(store, { event_type: "tenant.created", actor: systemActor(savedTenant.id), tenant_id: savedTenant.id, aggregate_type: "Tenant", aggregate_id: savedTenant.id, payload: savedTenant, summary: "Tenant created." });
      return savedTenant;
    });
    return savedTenant;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function createFirmRecord(body) {
  if (storeBackend !== "postgres") {
    return withStore((store) => {
      const existingTenant = store.tenants.find((record) => record.id === body.tenant_id);
      if (!existingTenant) throwNotFound("tenants", body.tenant_id);
      const { person, actor, firm } = buildFirmFoundation(body);
      store.persons.push(person);
      store.actors.push(actor);
      store.firms.push(firm);
      const { membership, professionalProfile, professionalAuthority } = buildPrincipalGovernance(body, person, actor, firm);
      store.firm_memberships.push(membership);
      store.professional_profiles.push(professionalProfile);
      store.professional_authorities.push(professionalAuthority);
      appendEventAndAudit(store, { event_type: "firm.activated", actor, tenant_id: firm.tenant_id, firm_id: firm.id, aggregate_type: "Firm", aggregate_id: firm.id, payload: firm, summary: "Firm created and activated for MVP." });
      return { firm, principal_actor: actor, principal_person: person, membership, professional_profile: professionalProfile, professional_authority: professionalAuthority };
    });
  }

  const client = await getPool().connect();
  try {
    await client.query("begin");
    await setTenantContext(client, body.tenant_id);
    const tenantResult = await client.query("select id from tenants where id = $1", [body.tenant_id]);
    if (tenantResult.rowCount === 0) throwNotFound("tenants", body.tenant_id);

    const { person, actor, firm } = buildFirmFoundation(body, { ids: "uuid" });
    // HM-S7 Phase 4c (2026-09-28): repositories/directory-firm-setup.repo.mjs's createPerson/
    // createActor/updateActor/createFirm/createFirmMembership/createProfessionalProfile/
    // createProfessionalAuthority replace the hand-written inserts below, all running on this
    // same `client` so they still participate in this handler's existing begin/commit
    // transaction (see shared/db.mjs's optional trailing `client` parameter, added in 4b).
    await createPerson(person, client);
    // buildFirmFoundation() already mutated actor.firm_id to the real firm id before returning
    // (see the end of that function), but firms.created_by_actor_id references actors(id) and
    // actors.firm_id references firms(id) -- a circular FK. The original hand-written insert
    // resolved this by hardcoding a literal `null` for firm_id in the SQL text regardless of
    // the object's value; this insertRow-based call has to do the same explicitly (a shallow
    // copy, not mutating `actor`, since its real firm_id is still needed for the update below
    // and for the return payload).
    await createActor({ ...actor, firm_id: null }, client);
    await createFirm(firm, client);
    await updateActor(actor.id, { firm_id: firm.id }, client);
    const { membership, professionalProfile, professionalAuthority } = buildPrincipalGovernance(body, person, { ...actor, firm_id: firm.id }, firm, { ids: "uuid" });
    await createFirmMembership(membership, client);
    await createProfessionalProfile(professionalProfile, client);
    await createProfessionalAuthority(professionalAuthority, client);
    await client.query("commit");

    actor.firm_id = firm.id;
    await withAppState((store) => {
      appendEventAndAudit(store, { event_type: "firm.activated", actor, tenant_id: firm.tenant_id, firm_id: firm.id, aggregate_type: "Firm", aggregate_id: firm.id, payload: firm, summary: "Firm created and activated for MVP." });
      return firm;
    });
    return { firm, principal_actor: actor, principal_person: person, membership, professional_profile: professionalProfile, professional_authority: professionalAuthority };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

// HM-S3 item 5 support (2026-09-18). Deletes a firm ONLY if it was created by
// the automated clean-onboarding smoke test. Refuses to run against any firm
// whose name does not start with TEST_FIRM_NAME_PREFIX, so this can never be
// pointed at a real firm even if called with the wrong ids -- name check is
// enforced here (in the store), not just at the route, as defense in depth.
// Scoped to exactly the tables createTenantRecord / createFirmRecord /
// invitePilotUserRecord / activatePilotUserRecord write to for a brand-new
// signup; nothing else. Not a general-purpose tenant/firm deletion capability.
const TEST_FIRM_NAME_PREFIX = "HM-S3 Smoke Test Firm";

function assertPurgeableTestFirmName(name) {
  if (!name || !name.startsWith(TEST_FIRM_NAME_PREFIX)) {
    const error = new Error(`Refusing to purge firm "${name ?? ""}": only firms named with the "${TEST_FIRM_NAME_PREFIX}" prefix (created by the HM-S3 clean-onboarding smoke test) can be purged.`);
    error.status = 403;
    error.code = "TEST_FIRM_PURGE_NAME_MISMATCH";
    throw error;
  }
}

export async function purgeTestFirmRecord(body) {
  requireFields(body, ["tenant_id", "firm_id"]);
  const tenantId = body.tenant_id;
  const firmId = body.firm_id;

  if (storeBackend !== "postgres") {
    return withStore((store) => {
      const firm = store.firms.find((item) => item.id === firmId && item.tenant_id === tenantId);
      if (!firm) throwNotFound("firms", firmId);
      assertPurgeableTestFirmName(firm.name);
      store.pilot_users = store.pilot_users.filter((item) => item.tenant_id !== tenantId);
      store.professional_authorities = store.professional_authorities.filter((item) => item.tenant_id !== tenantId);
      store.professional_profiles = store.professional_profiles.filter((item) => item.tenant_id !== tenantId);
      store.firm_memberships = store.firm_memberships.filter((item) => item.firm_id !== firmId);
      store.firms = store.firms.filter((item) => item.id !== firmId);
      store.actors = store.actors.filter((item) => item.tenant_id !== tenantId);
      store.persons = store.persons.filter((item) => item.tenant_id !== tenantId);
      store.event_log = (store.event_log ?? []).filter((item) => item.tenant_id !== tenantId);
      store.audit_events = (store.audit_events ?? []).filter((item) => item.tenant_id !== tenantId);
      store.tenants = store.tenants.filter((item) => item.id !== tenantId);
      return { purged: true, tenant_id: tenantId, firm_id: firmId };
    });
  }

  const client = await getPool().connect();
  try {
    await client.query("begin");
    const firmResult = await client.query("select name from firms where id = $1 and tenant_id = $2", [firmId, tenantId]);
    if (firmResult.rowCount === 0) throwNotFound("firms", firmId);
    assertPurgeableTestFirmName(firmResult.rows[0].name);
    // Fixed (2026-09-30): the old version hand-listed every table to delete from, curated once during
    // HM-S3 (2026-09-20). Every domain added since (Front Desk, Administration, Commercial Operations,
    // Technical Delivery, Client Engagements & Projects, Documents & Correspondence, Network &
    // Marketplace, Pilot & Observatory, Finance & Commercial, Firm Factory, Quotation, AWIA Tier 2, ...)
    // was never added to that list, so purging a test firm that had touched any of those domains failed
    // outright with a foreign-key violation (confirmed live while verifying this session's auth-check
    // fix on this same function). Replaced the hand-maintained list with a dynamic one: find every table
    // with a `tenant_id` column (this function's existing dominant pattern -- almost every original
    // delete was already tenant-wide, on the assumption a purgeable test tenant has exactly one firm)
    // and delete that tenant's rows from all of them, plus `set local session_replication_role =
    // replica` to bypass FK-ordering entirely for the duration of this one transaction -- safe here
    // specifically because this whole path only runs when VFIRM_ALLOW_TEST_FIRM_PURGE=true, the actor
    // check just added above passed, and the target firm's name matches the fixed test-firm prefix. This
    // can no longer silently rot as new domains/tables are added.
    await client.query("set local session_replication_role = replica");
    const tenantScopedTables = await client.query(
      `select table_name from information_schema.columns
       where table_schema = 'public' and column_name = 'tenant_id' and table_name <> 'tenants'`
    );
    for (const { table_name: tableName } of tenantScopedTables.rows) {
      await client.query(`delete from "${tableName}" where tenant_id = $1`, [tenantId]);
    }
    await client.query("delete from tenants where id = $1", [tenantId]);
    await client.query("commit");
    return { purged: true, tenant_id: tenantId, firm_id: firmId };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

// Adds a teammate (person + actor + firm_membership) to an EXISTING, already
// -provisioned firm. createFirmRecord only ever creates a firm together with
// its first principal; nothing before this covered growing that firm's team
// after the fact, which real (multi-user) authentication now requires. JSON
// store only for now -- Postgres parity is a follow-on, same as everywhere
// else in this file that is JSON-only.
export async function addFirmMemberRecord(body) {
  if (storeBackend === "postgres") {
    const error = new Error("addFirmMemberRecord is not yet implemented for the Postgres backend.");
    error.status = 501;
    error.code = "NOT_IMPLEMENTED";
    throw error;
  }
  return withStore((store) => {
    const firm = store.firms.find((item) => item.id === body.firm_id && item.tenant_id === body.tenant_id);
    if (!firm) throwNotFound("firms", body.firm_id);
    const timestamp = now();
    const person = {
      id: newId("person"),
      tenant_id: body.tenant_id,
      identity_provider_subject: body.identity_provider_subject ?? null,
      legal_name: body.display_name,
      preferred_name: body.display_name,
      contact_refs: [],
      status: "ACTIVE",
      created_at: timestamp,
      updated_at: timestamp,
      metadata: {}
    };
    const actor = {
      id: newId("actor"),
      actor_id: null,
      actor_type: "HUMAN",
      person_id: person.id,
      worker_instance_id: null,
      system_id: null,
      external_service_id: null,
      tenant_id: body.tenant_id,
      firm_id: body.firm_id,
      display_name: body.display_name,
      status: "ACTIVE",
      created_at: timestamp,
      metadata: {}
    };
    actor.actor_id = actor.id;
    const membership = {
      id: newId("firm_membership"),
      tenant_id: body.tenant_id,
      firm_id: body.firm_id,
      actor_id: actor.id,
      person_id: person.id,
      role: body.role ?? "MEMBER",
      permissions: body.permissions ?? ["tenant.read", "client.manage", "project.manage"],
      status: "ACTIVE",
      created_at: timestamp,
      updated_at: timestamp
    };
    store.persons.push(person);
    store.actors.push(actor);
    store.firm_memberships.push(membership);
    appendEventAndAudit(store, { event_type: "firm_member.added", actor: body.actor ?? systemActor(body.tenant_id, body.firm_id), tenant_id: body.tenant_id, firm_id: body.firm_id, aggregate_type: "Actor", aggregate_id: actor.id, payload: actor, summary: "Firm team member added." });
    return { person, actor, membership };
  });
}

export async function createClientRecord(body) {
  if (storeBackend !== "postgres") {
    return withStore((store) => {
      const firm = store.firms.find((record) => record.id === body.firm_id);
      if (!firm) throwNotFound("firms", body.firm_id);
      const actor = body.actor ?? systemActor(body.tenant_id, body.firm_id);
      const { client, relationship } = buildClientFrontdoor(body, actor);
      store.clients.push(client);
      store.firm_client_relationships.push(relationship);
      appendEventAndAudit(store, { event_type: "client.created", actor, tenant_id: client.tenant_id, firm_id: client.firm_id, aggregate_type: "Client", aggregate_id: client.id, payload: { client_id: client.id, relationship_id: relationship.id }, summary: "Client and firm relationship created." });
      return { client, relationship };
    });
  }

  const clientConn = await getPool().connect();
  try {
    await clientConn.query("begin");
    await setTenantContext(clientConn, body.tenant_id);
    const firmResult = await clientConn.query("select id from firms where id = $1 and tenant_id = $2", [body.firm_id, body.tenant_id]);
    if (firmResult.rowCount === 0) throwNotFound("firms", body.firm_id);
    const actor = body.actor ?? systemActor(body.tenant_id, body.firm_id);
    const { client, relationship } = buildClientFrontdoor(body, actor, { ids: "uuid" });
    // HM-S7 Phase 4c (2026-09-28): repositories/sales-intake.repo.mjs's createClient()/
    // createFirmClientRelationship() replace the hand-written inserts, running on this same
    // clientConn so they still participate in this handler's existing begin/commit transaction.
    await createClient(client, clientConn);
    await createFirmClientRelationship(relationship, clientConn);
    await clientConn.query("commit");
    await withAppState((store) => {
      appendEventAndAudit(store, { event_type: "client.created", actor, tenant_id: client.tenant_id, firm_id: client.firm_id, aggregate_type: "Client", aggregate_id: client.id, payload: { client_id: client.id, relationship_id: relationship.id }, summary: "Client and firm relationship created." });
      return client;
    });
    return { client, relationship };
  } catch (error) {
    await clientConn.query("rollback");
    throw error;
  } finally {
    clientConn.release();
  }
}

export async function createFrontDeskEnquiryRecord(body) {
  return withStore((store) => {
    const firm = store.firms.find((item) => item.id === body.firm_id && item.tenant_id === body.tenant_id);
    if (!firm) throwNotFound("firms", body.firm_id);
    const actor = body.actor ?? systemActor(body.tenant_id, body.firm_id), timestamp = now();
    const enquiry = { id: storeBackend === "postgres" ? newUuid() : newId("enquiry"), tenant_id: body.tenant_id, firm_id: body.firm_id, source_channel: body.source_channel ?? "WEB", contact_name: body.contact_name, organization_name: body.organization_name ?? null, contact_email: body.contact_email ?? null, contact_phone: body.contact_phone ?? null, enquiry_summary: body.enquiry_summary, requested_service_hint: body.requested_service_hint ?? null, urgency: body.urgency ?? "STANDARD", status: "NEW", qualification_reason: null, consent_or_legal_basis_ref: null, conflict_check_status: "NOT_CHECKED", conflict_check_ref: null, assigned_actor_id: actor.actor_id, client_id: null, relationship_id: null, lead_id: null, intake_session_id: null, created_at: timestamp, updated_at: timestamp, metadata: body.metadata ?? {} };
    store.front_desk_enquiries.push(enquiry);
    appendEventAndAudit(store, { event_type: "front_desk.enquiry_captured", actor, tenant_id: body.tenant_id, firm_id: body.firm_id, aggregate_type: "FrontDeskEnquiry", aggregate_id: enquiry.id, payload: { enquiry_id: enquiry.id }, summary: "Front Desk enquiry captured." });
    return enquiry;
  });
}
export async function qualifyFrontDeskEnquiryRecord(body) {
  return withStore((store) => {
    const enquiry = store.front_desk_enquiries.find((item) => item.id === body.enquiry_id && item.tenant_id === body.tenant_id && item.firm_id === body.firm_id);
    if (!enquiry) throwNotFound("front_desk_enquiries", body.enquiry_id);
    const actor = body.actor ?? systemActor(body.tenant_id, body.firm_id), decision = String(body.decision).toUpperCase();
    if (!["QUALIFIED", "NEEDS_INFORMATION", "NOT_A_FIT", "CLOSED"].includes(decision) || ["HANDED_OFF", "CLOSED"].includes(enquiry.status)) invalidState("Qualification transition is not allowed.");
    enquiry.consent_or_legal_basis_ref = body.consent_or_legal_basis_ref ?? enquiry.consent_or_legal_basis_ref;
    enquiry.conflict_check_status = body.conflict_check_status ?? enquiry.conflict_check_status; enquiry.conflict_check_ref = body.conflict_check_ref ?? enquiry.conflict_check_ref;
    if (decision === "QUALIFIED" && (!enquiry.consent_or_legal_basis_ref || enquiry.conflict_check_status !== "CLEARED")) invalidState("Qualification requires consent/legal basis and a CLEARED conflict prompt.");
    enquiry.status = decision; enquiry.qualification_reason = body.qualification_reason ?? null; enquiry.updated_at = now();
    appendEventAndAudit(store, { event_type: `front_desk.enquiry_${decision.toLowerCase()}`, actor, tenant_id: body.tenant_id, firm_id: body.firm_id, aggregate_type: "FrontDeskEnquiry", aggregate_id: enquiry.id, payload: { decision }, summary: `Front Desk enquiry marked ${decision}.` });
    return enquiry;
  });
}
export async function createClientCommunicationDraftRecord(body) {
  return withStore((store) => {
    const enquiry = store.front_desk_enquiries.find((item) => item.id === body.enquiry_id && item.tenant_id === body.tenant_id && item.firm_id === body.firm_id);
    if (!enquiry) throwNotFound("front_desk_enquiries", body.enquiry_id);
    const actor = body.actor ?? systemActor(body.tenant_id, body.firm_id), timestamp = now();
    const draft = { id: storeBackend === "postgres" ? newUuid() : newId("communication"), tenant_id: body.tenant_id, firm_id: body.firm_id, enquiry_id: enquiry.id, channel: body.channel ?? enquiry.source_channel, subject: body.subject ?? "Enquiry acknowledgement", body: body.message_body, status: "DRAFT_REVIEW_REQUIRED", requires_human_review: true, prepared_by_actor_id: actor.actor_id, approved_by_actor_id: null, sent_at: null, created_at: timestamp, updated_at: timestamp };
    store.client_communication_drafts.push(draft);
    appendEventAndAudit(store, { event_type: "front_desk.communication_drafted", actor, tenant_id: body.tenant_id, firm_id: body.firm_id, aggregate_type: "ClientCommunicationDraft", aggregate_id: draft.id, payload: { enquiry_id: enquiry.id, requires_human_review: true }, summary: "Communication drafted for human review; no message sent." });
    return draft;
  });
}
export async function handoffFrontDeskEnquiryRecord(body) {
  const store = await readStore(), enquiry = store.front_desk_enquiries.find((item) => item.id === body.enquiry_id && item.tenant_id === body.tenant_id && item.firm_id === body.firm_id);
  if (!enquiry) throwNotFound("front_desk_enquiries", body.enquiry_id);
  if (enquiry.status !== "QUALIFIED" || !enquiry.consent_or_legal_basis_ref || enquiry.conflict_check_status !== "CLEARED") invalidState("Only a qualified enquiry with consent/legal basis and cleared conflict prompt can be handed off.");
  const actor = body.actor ?? systemActor(body.tenant_id, body.firm_id);
  const clientResult = await createClientRecord({ ...body, name: body.client_name ?? enquiry.organization_name ?? enquiry.contact_name, client_type: body.client_type ?? (enquiry.organization_name ? "ORGANIZATION" : "PERSON"), origin: "front_desk_enquiry", consent_or_legal_basis_ref: enquiry.consent_or_legal_basis_ref, conflict_check_ref: enquiry.conflict_check_ref, metadata: { source_enquiry_id: enquiry.id, contact_email: enquiry.contact_email }, actor });
  const intakeResult = await createIntakeSessionRecord({ ...body, relationship_id: clientResult.relationship.id, source_channel: enquiry.source_channel, requested_service_hint: enquiry.requested_service_hint, urgency: enquiry.urgency, created_from_conversation_ref: enquiry.id, lead_metadata: { source_enquiry_id: enquiry.id }, actor });
  const updated = await withStore((next) => { const current = next.front_desk_enquiries.find((item) => item.id === enquiry.id); Object.assign(current, { status: "HANDED_OFF", client_id: clientResult.client.id, relationship_id: clientResult.relationship.id, lead_id: intakeResult.lead.id, intake_session_id: intakeResult.intake.id, updated_at: now() }); appendEventAndAudit(next, { event_type: "front_desk.enquiry_handed_off", actor, tenant_id: body.tenant_id, firm_id: body.firm_id, aggregate_type: "FrontDeskEnquiry", aggregate_id: current.id, payload: { intake_session_id: current.intake_session_id }, summary: "Qualified enquiry handed off to client intake." }); return { ...current }; });
  return { enquiry: updated, ...clientResult, ...intakeResult };
}

function sf3Id(prefix) { return storeBackend === "postgres" ? newUuid() : newId(prefix); }
function assertScopedReference(store, collection, id, body) {
  if (!id) return null;
  const record = (store[collection] ?? []).find((item) => item.id === id && item.tenant_id === body.tenant_id && item.firm_id === body.firm_id);
  if (!record) throwNotFound(collection, id);
  return record;
}
export async function bindAdministrationSkillsRecord(body) {
  return withStore((store) => {
    const firm = store.firms.find((item) => item.id === body.firm_id && item.tenant_id === body.tenant_id);
    if (!firm) throwNotFound("firms", body.firm_id);
    const actor = body.actor ?? systemActor(body.tenant_id, body.firm_id);
    const existing = store.administration_skill_bindings.find((item) => item.firm_id === body.firm_id && item.status === "ACTIVE");
    if (existing) return existing;
    const binding = { id: sf3Id("skill_binding"), tenant_id: body.tenant_id, firm_id: body.firm_id, worker_template_code: "administration-clerk", role_skill_ref: body.role_skill_ref, worker_skill_ref: body.worker_skill_ref, input_schema_ref: body.input_schema_ref ?? "vfirm://schemas/administration-task-input/v1", output_schema_ref: body.output_schema_ref ?? "vfirm://schemas/administration-task-output/v1", supervisor_actor_id: actor.actor_id, permissions: ["correspondence.capture","document.register","revision.register","deadline.manage","transmittal.draft"], forbidden_actions: ["document.approve","formal_instruction.issue","transmittal.issue","professional_conclusion.change"], status: "ACTIVE", version: body.version ?? "1.0", created_at: now(), metadata: body.metadata ?? {} };
    store.administration_skill_bindings.push(binding);
    appendEventAndAudit(store,{event_type:"administration.skill_binding_activated",actor,tenant_id:body.tenant_id,firm_id:body.firm_id,aggregate_type:"SkillBinding",aggregate_id:binding.id,payload:{worker_template_code:binding.worker_template_code,version:binding.version},summary:"Administration Clerk skill binding activated within bounded authority."});
    return binding;
  });
}
export async function createCorrespondenceRecord(body) {
  return withStore((store) => {
    assertScopedReference(store,"firm_client_relationships",body.relationship_id,body); assertScopedReference(store,"projects",body.project_id,body);
    const actor=body.actor??systemActor(body.tenant_id,body.firm_id), timestamp=now();
    const item={id:sf3Id("correspondence"),tenant_id:body.tenant_id,firm_id:body.firm_id,relationship_id:body.relationship_id??null,project_id:body.project_id??null,direction:body.direction??"INCOMING",channel:body.channel??"EMAIL",subject:body.subject,correspondent:body.correspondent,received_or_drafted_at:body.received_or_drafted_at??timestamp,status:(body.direction??"INCOMING")==="INCOMING"?"RECEIVED":"DRAFT_REVIEW_REQUIRED",owner_actor_id:actor.actor_id,response_due_at:body.response_due_at??null,source_ref:body.source_ref??null,created_at:timestamp,updated_at:timestamp,metadata:body.metadata??{}};
    store.correspondence_records.push(item); appendEventAndAudit(store,{event_type:"administration.correspondence_registered",actor,tenant_id:body.tenant_id,firm_id:body.firm_id,aggregate_type:"CorrespondenceRecord",aggregate_id:item.id,payload:{direction:item.direction,status:item.status},summary:"Correspondence registered."}); return item;
  });
}
export async function registerDocumentRecord(body) {
  return withStore((store) => {
    assertScopedReference(store,"firm_client_relationships",body.relationship_id,body); assertScopedReference(store,"projects",body.project_id,body);
    if(store.document_register_entries.some((item)=>item.tenant_id===body.tenant_id&&item.firm_id===body.firm_id&&item.document_number===body.document_number)) invalidState("Document number already exists in this firm.");
    const actor=body.actor??systemActor(body.tenant_id,body.firm_id),timestamp=now();
    const entry={id:sf3Id("document_register"),tenant_id:body.tenant_id,firm_id:body.firm_id,relationship_id:body.relationship_id??null,project_id:body.project_id??null,document_number:body.document_number,title:body.title,document_type:body.document_type,discipline:body.discipline??null,classification:body.classification??"CLIENT_CONFIDENTIAL",status:"ACTIVE",current_revision_id:null,owner_actor_id:actor.actor_id,created_at:timestamp,updated_at:timestamp,metadata:body.metadata??{}};
    const revision={id:sf3Id("document_revision"),tenant_id:body.tenant_id,firm_id:body.firm_id,document_register_entry_id:entry.id,revision:body.revision,version_label:body.version_label??body.revision,storage_ref:body.storage_ref,content_hash:body.content_hash,status:"CURRENT",supersedes_revision_id:null,created_by_actor_id:actor.actor_id,created_at:timestamp,metadata:body.revision_metadata??{}};
    entry.current_revision_id=revision.id; store.document_register_entries.push(entry); store.document_revision_records.push(revision);
    appendEventAndAudit(store,{event_type:"administration.document_registered",actor,tenant_id:body.tenant_id,firm_id:body.firm_id,aggregate_type:"DocumentRegisterEntry",aggregate_id:entry.id,payload:{document_number:entry.document_number,revision:revision.revision},summary:"Document and initial revision registered."}); return {document:entry,revision};
  });
}
export async function addDocumentRevisionRecord(body) {
  return withStore((store) => {
    const entry=assertScopedReference(store,"document_register_entries",body.document_register_entry_id,body);
    if(store.document_revision_records.some((item)=>item.document_register_entry_id===entry.id&&item.revision===body.revision)) invalidState("Revision already exists for this document.");
    const actor=body.actor??systemActor(body.tenant_id,body.firm_id),timestamp=now(),previous=store.document_revision_records.find((item)=>item.id===entry.current_revision_id);
    if(previous) previous.status="SUPERSEDED";
    const revision={id:sf3Id("document_revision"),tenant_id:body.tenant_id,firm_id:body.firm_id,document_register_entry_id:entry.id,revision:body.revision,version_label:body.version_label??body.revision,storage_ref:body.storage_ref,content_hash:body.content_hash,status:"CURRENT",supersedes_revision_id:previous?.id??null,created_by_actor_id:actor.actor_id,created_at:timestamp,metadata:body.metadata??{}};
    store.document_revision_records.push(revision); entry.current_revision_id=revision.id; entry.updated_at=timestamp;
    appendEventAndAudit(store,{event_type:"administration.document_revision_registered",actor,tenant_id:body.tenant_id,firm_id:body.firm_id,aggregate_type:"DocumentRegisterEntry",aggregate_id:entry.id,payload:{revision_id:revision.id,supersedes_revision_id:revision.supersedes_revision_id},summary:"New document revision registered; prior current revision superseded."}); return {document:entry,revision,previous_revision:previous??null};
  });
}
export async function createAdministrativeDeadlineRecord(body) {
  return withStore((store)=>{assertScopedReference(store,"projects",body.project_id,body);assertScopedReference(store,"firm_client_relationships",body.relationship_id,body);const actor=body.actor??systemActor(body.tenant_id,body.firm_id),timestamp=now();const item={id:sf3Id("deadline"),tenant_id:body.tenant_id,firm_id:body.firm_id,project_id:body.project_id??null,relationship_id:body.relationship_id??null,title:body.title,due_at:body.due_at,priority:body.priority??"NORMAL",status:"OPEN",assigned_actor_or_worker_ref:body.assigned_actor_or_worker_ref??actor.actor_id,source_ref:body.source_ref??null,created_at:timestamp,updated_at:timestamp,completed_at:null,metadata:body.metadata??{}};store.administrative_deadlines.push(item);appendEventAndAudit(store,{event_type:"administration.deadline_created",actor,tenant_id:body.tenant_id,firm_id:body.firm_id,aggregate_type:"AdministrativeDeadline",aggregate_id:item.id,payload:{due_at:item.due_at,priority:item.priority},summary:"Administrative deadline created."});return item;});
}
export async function completeAdministrativeDeadlineRecord(body) {
  return withStore((store)=>{const item=assertScopedReference(store,"administrative_deadlines",body.deadline_id,body);if(item.status!=="OPEN")invalidState("Only an OPEN deadline can be completed.");const actor=body.actor??systemActor(body.tenant_id,body.firm_id);item.status="COMPLETED";item.completed_at=now();item.updated_at=item.completed_at;appendEventAndAudit(store,{event_type:"administration.deadline_completed",actor,tenant_id:body.tenant_id,firm_id:body.firm_id,aggregate_type:"AdministrativeDeadline",aggregate_id:item.id,payload:{status:item.status},summary:"Administrative deadline completed."});return item;});
}
export async function createTransmittalDraftRecord(body) {
  return withStore((store)=>{assertScopedReference(store,"projects",body.project_id,body);assertScopedReference(store,"firm_client_relationships",body.relationship_id,body);for(const id of body.document_revision_refs??[])assertScopedReference(store,"document_revision_records",id,body);const actor=body.actor??systemActor(body.tenant_id,body.firm_id),timestamp=now();const item={id:sf3Id("transmittal"),tenant_id:body.tenant_id,firm_id:body.firm_id,project_id:body.project_id??null,relationship_id:body.relationship_id??null,recipient:body.recipient,subject:body.subject,document_revision_refs:body.document_revision_refs??[],message_body:body.message_body,status:"DRAFT_REVIEW_REQUIRED",requires_principal_approval:true,prepared_by_actor_id:actor.actor_id,approved_by_actor_id:null,issued_at:null,created_at:timestamp,updated_at:timestamp,metadata:body.metadata??{}};store.transmittal_drafts.push(item);appendEventAndAudit(store,{event_type:"administration.transmittal_drafted",actor,tenant_id:body.tenant_id,firm_id:body.firm_id,aggregate_type:"TransmittalDraft",aggregate_id:item.id,payload:{document_revision_refs:item.document_revision_refs,requires_principal_approval:true},summary:"Transmittal drafted for principal review; not issued."});return item;});
}


function requireHumanPrincipalActor(actor, action) {
  if(actor?.actor_type!=="HUMAN" || !["principal","PILOT_PRINCIPAL","FIRM_PRINCIPAL","ADMIN"].includes(actor?.role??"principal")) invalidState(`${action} requires an authenticated human principal.`);
}
export async function bindCommercialSkillsRecord(body) {
  return withStore(store=>{const firm=store.firms.find(x=>x.id===body.firm_id&&x.tenant_id===body.tenant_id);if(!firm)throwNotFound("firms",body.firm_id);const actor=body.actor??systemActor(body.tenant_id,body.firm_id);if(!["marketing-sales-coordinator","accounts-clerk"].includes(body.worker_template_code))invalidState("Unsupported commercial worker template.");const existing=store.commercial_skill_bindings.find(x=>x.firm_id===body.firm_id&&x.worker_template_code===body.worker_template_code&&x.status==="ACTIVE");if(existing)return existing;const sales=body.worker_template_code==="marketing-sales-coordinator";const item={id:sf3Id("commercial_binding"),tenant_id:body.tenant_id,firm_id:body.firm_id,worker_template_code:body.worker_template_code,role_skill_ref:body.role_skill_ref,worker_skill_ref:body.worker_skill_ref,input_schema_ref:body.input_schema_ref??`vfirm://schemas/${body.worker_template_code}-input/v1`,output_schema_ref:body.output_schema_ref??`vfirm://schemas/${body.worker_template_code}-output/v1`,supervisor_actor_id:actor.actor_id,permissions:sales?["pipeline.manage","proposal.prepare","sales.summary"]:["expense.prepare","receivable.monitor","cash.snapshot"],forbidden_actions:sales?["price.commit","scope.commit","proposal.dispatch"]:["expense.approve","payment.approve","bank.instruct","invoice.issue"],status:"ACTIVE",version:body.version??"1.0",created_at:now(),metadata:body.metadata??{}};store.commercial_skill_bindings.push(item);appendEventAndAudit(store,{event_type:"commercial.skill_binding_activated",actor,tenant_id:body.tenant_id,firm_id:body.firm_id,aggregate_type:"SkillBinding",aggregate_id:item.id,payload:{worker_template_code:item.worker_template_code,version:item.version},summary:"Commercial worker skill binding activated within bounded authority."});return item;});
}
export async function createSalesPipelineRecord(body) {
  return withStore(store=>{assertScopedReference(store,"front_desk_enquiries",body.enquiry_id,body);assertScopedReference(store,"firm_client_relationships",body.relationship_id,body);assertScopedReference(store,"intake_sessions",body.intake_session_id,body);const actor=body.actor??systemActor(body.tenant_id,body.firm_id),timestamp=now();const item={id:sf3Id("opportunity"),tenant_id:body.tenant_id,firm_id:body.firm_id,enquiry_id:body.enquiry_id??null,relationship_id:body.relationship_id??null,intake_session_id:body.intake_session_id??null,proposal_id:null,opportunity_name:body.opportunity_name,stage:"NEW",estimated_value:Number(body.estimated_value??0),currency:body.currency??"MYR",probability_percent:Number(body.probability_percent??10),owner_actor_id:actor.actor_id,next_action:body.next_action??null,next_action_due_at:body.next_action_due_at??null,lost_reason:null,created_at:timestamp,updated_at:timestamp,metadata:body.metadata??{}};if(item.estimated_value<0||item.probability_percent<0||item.probability_percent>100)invalidState("Opportunity value/probability is invalid.");store.sales_pipeline_records.push(item);appendEventAndAudit(store,{event_type:"sales.opportunity_created",actor,tenant_id:body.tenant_id,firm_id:body.firm_id,aggregate_type:"SalesOpportunity",aggregate_id:item.id,payload:{stage:item.stage,estimated_value:item.estimated_value},summary:"Sales opportunity created."});return item;});
}
export async function updateSalesPipelineRecord(body) {
  return withStore(store=>{const item=assertScopedReference(store,"sales_pipeline_records",body.opportunity_id,body),actor=body.actor??systemActor(body.tenant_id,body.firm_id);const allowed={NEW:["QUALIFIED","LOST"],QUALIFIED:["PROPOSAL_DRAFT","LOST"],PROPOSAL_DRAFT:["PROPOSAL_APPROVED","LOST"],PROPOSAL_APPROVED:["PROPOSAL_SENT","LOST"],PROPOSAL_SENT:["WON","LOST"],WON:[],LOST:[]};const stage=String(body.stage??item.stage).toUpperCase();if(stage!==item.stage&&!allowed[item.stage]?.includes(stage))invalidState(`Opportunity cannot move from ${item.stage} to ${stage}.`);if(body.proposal_id)assertScopedReference(store,"proposals",body.proposal_id,body);if(stage==="LOST"&&!body.lost_reason)invalidState("Lost reason is required.");Object.assign(item,{stage,proposal_id:body.proposal_id??item.proposal_id,next_action:body.next_action??item.next_action,next_action_due_at:body.next_action_due_at??item.next_action_due_at,lost_reason:stage==="LOST"?body.lost_reason:null,probability_percent:body.probability_percent??item.probability_percent,updated_at:now()});appendEventAndAudit(store,{event_type:"sales.opportunity_stage_changed",actor,tenant_id:body.tenant_id,firm_id:body.firm_id,aggregate_type:"SalesOpportunity",aggregate_id:item.id,payload:{stage:item.stage,proposal_id:item.proposal_id},summary:`Sales opportunity moved to ${item.stage}.`});return item;});
}
export async function dispatchProposalRecord(body, actor) {
  requireHumanPrincipalActor(actor,"Proposal dispatch");
  return withStore(store=>{const proposal=assertScopedReference(store,"proposals",body.proposal_id,body);if(proposal.proposal_status!=="APPROVED"||!proposal.commercial_approval_id)invalidState("Proposal requires explicit approval before dispatch.");if(store.proposal_dispatch_records.some(x=>x.proposal_id===proposal.id))invalidState("Proposal has already been dispatched.");const timestamp=now(),item={id:sf3Id("proposal_dispatch"),tenant_id:body.tenant_id,firm_id:body.firm_id,proposal_id:proposal.id,recipient:body.recipient,channel:body.channel??"EMAIL",dispatch_status:"SENT",dispatched_by_actor_id:actor.actor_id,commercial_approval_id:proposal.commercial_approval_id,document_ref:body.document_ref,dispatched_at:timestamp,created_at:timestamp,metadata:body.metadata??{}};proposal.proposal_status="SENT";proposal.issued_document_ref=item.document_ref;proposal.updated_at=timestamp;store.proposal_dispatch_records.push(item);for(const opportunity of store.sales_pipeline_records.filter(x=>x.proposal_id===proposal.id&&x.stage==="PROPOSAL_APPROVED")){opportunity.stage="PROPOSAL_SENT";opportunity.updated_at=timestamp;}appendEventAndAudit(store,{event_type:"proposal.dispatched",actor,tenant_id:body.tenant_id,firm_id:body.firm_id,aggregate_type:"Proposal",aggregate_id:proposal.id,payload:{dispatch_id:item.id,approval_id:item.commercial_approval_id,document_ref:item.document_ref},summary:"Approved proposal dispatched by human principal."});return {proposal,dispatch:item};});
}
export async function createExpenseRecord(body) {
  return withStore(store=>{assertScopedReference(store,"projects",body.project_id,body);const actor=body.actor??systemActor(body.tenant_id,body.firm_id),timestamp=now(),amount=Number(body.amount);if(!Number.isFinite(amount)||amount<0)invalidState("Expense amount must be non-negative.");const item={id:sf3Id("expense"),tenant_id:body.tenant_id,firm_id:body.firm_id,project_id:body.project_id??null,supplier:body.supplier,description:body.description,category:body.category??"GENERAL",amount,currency:body.currency??"MYR",expense_date:body.expense_date??timestamp.slice(0,10),receipt_ref:body.receipt_ref??null,status:"DRAFT_REVIEW_REQUIRED",prepared_by_actor_id:actor.actor_id,approved_by_actor_id:null,approved_at:null,payment_instruction_ref:null,created_at:timestamp,updated_at:timestamp,metadata:body.metadata??{}};store.expense_records.push(item);appendEventAndAudit(store,{event_type:"accounts.expense_prepared",actor,tenant_id:body.tenant_id,firm_id:body.firm_id,aggregate_type:"ExpenseRecord",aggregate_id:item.id,payload:{amount:item.amount,currency:item.currency},summary:"Expense prepared for human review; no payment instruction created."});return item;});
}
export async function approveExpenseRecord(body, actor) {
  requireHumanPrincipalActor(actor,"Expense approval");
  return withStore(store=>{const item=assertScopedReference(store,"expense_records",body.expense_id,body);if(item.status!=="DRAFT_REVIEW_REQUIRED")invalidState("Only a review-required expense can be approved.");item.status="APPROVED";item.approved_by_actor_id=actor.actor_id;item.approved_at=now();item.updated_at=item.approved_at;appendEventAndAudit(store,{event_type:"accounts.expense_approved",actor,tenant_id:body.tenant_id,firm_id:body.firm_id,aggregate_type:"ExpenseRecord",aggregate_id:item.id,payload:{status:item.status,payment_instruction_ref:null},summary:"Expense approved by human principal; no payment instruction created."});return item;});
}
export async function createReceivableFollowUpRecord(body) {
  return withStore(store=>{const invoice=assertScopedReference(store,"invoices",body.invoice_id,body);if(!["ISSUED","OVERDUE"].includes(invoice.status))invalidState("Receivable follow-up requires an issued or overdue invoice.");const actor=body.actor??systemActor(body.tenant_id,body.firm_id),timestamp=now(),item={id:sf3Id("receivable_follow_up"),tenant_id:body.tenant_id,firm_id:body.firm_id,invoice_id:invoice.id,channel:body.channel??"EMAIL",subject:body.subject,message_body:body.message_body,status:"DRAFT_REVIEW_REQUIRED",requires_human_review:true,prepared_by_actor_id:actor.actor_id,approved_by_actor_id:null,sent_at:null,created_at:timestamp,updated_at:timestamp,metadata:body.metadata??{}};store.receivable_follow_ups.push(item);appendEventAndAudit(store,{event_type:"accounts.receivable_follow_up_drafted",actor,tenant_id:body.tenant_id,firm_id:body.firm_id,aggregate_type:"ReceivableFollowUp",aggregate_id:item.id,payload:{invoice_id:invoice.id,requires_human_review:true},summary:"Receivable follow-up drafted for human review; not sent."});return item;});
}

export async function bindTechnicalSkillsRecord(body){
  return withStore(store=>{const firm=store.firms.find(x=>x.id===body.firm_id&&x.tenant_id===body.tenant_id);if(!firm)throwNotFound("firms",body.firm_id);if(!["technical-drawing-assistant","formwork-qa-agent"].includes(body.worker_template_code))invalidState("Unsupported technical worker template.");const actor=body.actor??systemActor(body.tenant_id,body.firm_id),existing=store.technical_skill_bindings.find(x=>x.firm_id===body.firm_id&&x.worker_template_code===body.worker_template_code&&x.status==="ACTIVE");if(existing)return existing;const item={id:sf3Id("technical_binding"),tenant_id:body.tenant_id,firm_id:body.firm_id,worker_template_code:body.worker_template_code,role_skill_ref:body.role_skill_ref,worker_skill_ref:body.worker_skill_ref,input_schema_ref:body.input_schema_ref??"vfirm://schemas/technical-support-input/v1",output_schema_ref:body.output_schema_ref??"vfirm://schemas/technical-support-output/v1",supervisor_actor_id:actor.actor_id,permissions:["drawing.revision.check","formwork.inputs.prepare","qa.finding.raise","delivery.package.prepare"],forbidden_actions:["engineering.conclusion","drawing.approve","calculation.approve","professional.certify","deliverable.issue"],status:"ACTIVE",version:body.version??"1.0",created_at:now(),metadata:body.metadata??{}};store.technical_skill_bindings.push(item);appendEventAndAudit(store,{event_type:"technical.skill_binding_activated",actor,tenant_id:body.tenant_id,firm_id:body.firm_id,aggregate_type:"SkillBinding",aggregate_id:item.id,payload:{worker_template_code:item.worker_template_code},summary:"Technical support skill binding activated within non-authoritative envelope."});return item;});
}
export async function createDrawingReviewRecord(body){
  return withStore(store=>{const project=assertScopedReference(store,"projects",body.project_id,body),entry=assertScopedReference(store,"document_register_entries",body.document_register_entry_id,body),base=assertScopedReference(store,"document_revision_records",body.base_revision_id,body),compared=assertScopedReference(store,"document_revision_records",body.compared_revision_id,body);if(entry.project_id&&entry.project_id!==project.id)invalidState("Document is not filed to the selected project.");if(base.document_register_entry_id!==entry.id||compared.document_register_entry_id!==entry.id)invalidState("Drawing revisions must belong to the same register entry.");if(base.id===compared.id)invalidState("Drawing comparison requires two different revisions.");const actor=body.actor??systemActor(body.tenant_id,body.firm_id),checks=[{code:"same_document",result:"PASS"},{code:"revision_order",result:compared.supersedes_revision_id===base.id?"PASS":"REVIEW"},{code:"content_hash_changed",result:base.content_hash!==compared.content_hash?"PASS":"REVIEW"},{code:"compared_revision_current",result:entry.current_revision_id===compared.id?"PASS":"REVIEW"}],item={id:sf3Id("drawing_review"),tenant_id:body.tenant_id,firm_id:body.firm_id,project_id:project.id,document_register_entry_id:entry.id,base_revision_id:base.id,compared_revision_id:compared.id,check_results:checks,status:"CHECKED_REVIEW_REQUIRED",prepared_by_actor_id:actor.actor_id,requires_professional_review:true,created_at:now(),metadata:body.metadata??{}};store.drawing_review_records.push(item);appendEventAndAudit(store,{event_type:"technical.drawing_revisions_checked",actor,tenant_id:body.tenant_id,firm_id:body.firm_id,aggregate_type:"DrawingReview",aggregate_id:item.id,payload:{check_results:checks},summary:"Drawing revision metadata checked; professional review remains required."});return item;});
}
function validateFormworkInputs(values,sourceCount,unitSystem){
  const required=["project_name","site_location","structure_type","formwork_element_type","height","length_or_area","concrete_grade","available_drawings"],results=required.map(field=>({code:`required.${field}`,result:values[field]===undefined||values[field]===null||values[field]===""||(Array.isArray(values[field])&&!values[field].length)?"FAIL":"PASS"}));results.push({code:"geometry.height_positive",result:Number.isFinite(Number(values.height))&&Number(values.height)>0?"PASS":"FAIL"},{code:"geometry.length_or_area_positive",result:Number.isFinite(Number(values.length_or_area))&&Number(values.length_or_area)>0?"PASS":"FAIL"},{code:"units.si_declared",result:unitSystem==="SI"?"PASS":"FAIL"},{code:"source_revision_present",result:sourceCount>0?"PASS":"FAIL"});return results;
}
export async function createCalculationInputSetRecord(body){
  return withStore(store=>{const project=assertScopedReference(store,"projects",body.project_id,body);assertScopedReference(store,"intake_sessions",body.intake_session_id,body);for(const id of body.source_revision_refs??[]){const rev=assertScopedReference(store,"document_revision_records",id,body),entry=assertScopedReference(store,"document_register_entries",rev.document_register_entry_id,body);if(entry.project_id&&entry.project_id!==project.id)invalidState("Source drawing is not filed to the selected project.");}const actor=body.actor??systemActor(body.tenant_id,body.firm_id),unit=body.unit_system??"SI",checks=validateFormworkInputs(body.input_values??{},(body.source_revision_refs??[]).length,unit),timestamp=now(),item={id:sf3Id("calculation_inputs"),tenant_id:body.tenant_id,firm_id:body.firm_id,project_id:project.id,intake_session_id:body.intake_session_id??null,source_revision_refs:body.source_revision_refs??[],input_values:body.input_values??{},unit_system:unit,validation_results:checks,validation_status:checks.some(x=>x.result==="FAIL")?"INVALID":"VALID",deterministic_engine_ref:"vfirm://validators/formwork-input-schema/v1",prepared_by_actor_id:actor.actor_id,created_at:timestamp,updated_at:timestamp,metadata:body.metadata??{}};store.calculation_input_sets.push(item);appendEventAndAudit(store,{event_type:item.validation_status==="VALID"?"technical.calculation_inputs_validated":"technical.calculation_inputs_invalid",actor,tenant_id:body.tenant_id,firm_id:body.firm_id,aggregate_type:"CalculationInputSet",aggregate_id:item.id,payload:{validation_status:item.validation_status,validation_results:checks},summary:`Formwork calculation inputs marked ${item.validation_status}; no engineering result produced.`});return item;});
}
export async function createTechnicalQaFindingRecord(body){
  return withStore(store=>{assertScopedReference(store,"projects",body.project_id,body);if(!["LOW","MEDIUM","HIGH","CRITICAL"].includes(body.severity))invalidState("Unsupported QA severity.");const actor=body.actor??systemActor(body.tenant_id,body.firm_id),timestamp=now(),item={id:sf3Id("qa_finding"),tenant_id:body.tenant_id,firm_id:body.firm_id,project_id:body.project_id,subject_type:body.subject_type,subject_id:body.subject_id,finding_code:body.finding_code,severity:body.severity,description:body.description,status:"OPEN",raised_by_actor_id:actor.actor_id,resolved_by_actor_id:null,resolution_summary:null,created_at:timestamp,updated_at:timestamp,resolved_at:null,metadata:body.metadata??{}};store.technical_qa_findings.push(item);appendEventAndAudit(store,{event_type:"technical.qa_finding_raised",actor,tenant_id:body.tenant_id,firm_id:body.firm_id,aggregate_type:"TechnicalQaFinding",aggregate_id:item.id,payload:{severity:item.severity,finding_code:item.finding_code},summary:"Technical QA finding raised."});return item;});
}
export async function resolveTechnicalQaFindingRecord(body,actor){
  requireHumanPrincipalActor(actor,"QA finding resolution");
  return withStore(store=>{const item=assertScopedReference(store,"technical_qa_findings",body.finding_id,body);if(item.status!=="OPEN")invalidState("Only an OPEN finding can be resolved.");item.status="RESOLVED";item.resolved_by_actor_id=actor.actor_id;item.resolution_summary=body.resolution_summary;item.resolved_at=now();item.updated_at=item.resolved_at;appendEventAndAudit(store,{event_type:"technical.qa_finding_resolved",actor,tenant_id:body.tenant_id,firm_id:body.firm_id,aggregate_type:"TechnicalQaFinding",aggregate_id:item.id,payload:{resolution_summary:item.resolution_summary},summary:"Technical QA finding resolved by human principal."});return item;});
}
export async function createDeliveryPackageRecord(body){
  return withStore(store=>{const project=assertScopedReference(store,"projects",body.project_id,body),calc=assertScopedReference(store,"calculation_input_sets",body.calculation_input_set_id,body);if(calc.project_id!==project.id)invalidState("Calculation input set belongs to another project.");const drawingChecks=[];for(const id of body.drawing_revision_refs??[]){const rev=assertScopedReference(store,"document_revision_records",id,body),entry=assertScopedReference(store,"document_register_entries",rev.document_register_entry_id,body);drawingChecks.push(entry.current_revision_id===rev.id);}const findings=(store.technical_qa_findings??[]).filter(x=>x.project_id===project.id&&x.status==="OPEN"),blocking=findings.filter(x=>["HIGH","CRITICAL"].includes(x.severity)),checks=[{code:"calculation_inputs_valid",result:calc.validation_status==="VALID"?"PASS":"FAIL"},{code:"drawing_revisions_current",result:drawingChecks.length>0&&drawingChecks.every(Boolean)?"PASS":"FAIL"},{code:"evidence_present",result:(body.evidence_refs??[]).length>0?"PASS":"FAIL"},{code:"no_open_high_critical_findings",result:blocking.length===0?"PASS":"FAIL"}],timestamp=now(),actor=body.actor??systemActor(body.tenant_id,body.firm_id),status=checks.some(x=>x.result==="FAIL")?"BLOCKED":"READY_FOR_PRINCIPAL_REVIEW",item={id:sf3Id("delivery_package"),tenant_id:body.tenant_id,firm_id:body.firm_id,project_id:project.id,drawing_revision_refs:body.drawing_revision_refs??[],calculation_input_set_id:calc.id,qa_finding_refs:findings.map(x=>x.id),evidence_refs:body.evidence_refs??[],readiness_checks:checks,package_status:status,requires_professional_review:true,prepared_by_actor_id:actor.actor_id,professional_approval_id:null,issued_document_version_id:null,created_at:timestamp,updated_at:timestamp,metadata:body.metadata??{}};store.delivery_package_records.push(item);appendEventAndAudit(store,{event_type:status==="BLOCKED"?"technical.delivery_package_blocked":"technical.delivery_package_ready_for_principal_review",actor,tenant_id:body.tenant_id,firm_id:body.firm_id,aggregate_type:"DeliveryPackage",aggregate_id:item.id,payload:{readiness_checks:checks,requires_professional_review:true},summary:status==="BLOCKED"?"Delivery package blocked by deterministic readiness checks.":"Delivery package prepared for principal review; not approved or issued."});return item;});
}
function scopedRecords(store, collection, tenant_id, firm_id = null) {
  return (store[collection] ?? []).filter((item) => (!tenant_id || item.tenant_id === tenant_id) && (!firm_id || item.firm_id === firm_id));
}

function isClosedStatus(value) {
  return ["COMPLETE", "COMPLETED", "DONE", "CLOSED", "RESOLVED", "ISSUED", "PAID", "HANDED_OFF", "ACCEPTED"].includes(String(value ?? "").toUpperCase());
}

function dueBucket(records, dateField = "due_at") {
  const today = Date.now();
  const sevenDays = today + 7 * 86400000;
  const dated = records.filter((item) => item?.[dateField]);
  return {
    overdue: dated.filter((item) => Date.parse(item[dateField]) < today).length,
    due_soon: dated.filter((item) => Date.parse(item[dateField]) >= today && Date.parse(item[dateField]) <= sevenDays).length
  };
}

function buildDailyOperationsSummary(store, tenant_id, firm_id) {
  const scope = (collection) => scopedRecords(store, collection, tenant_id, firm_id);
  const enquiries = scope("front_desk_enquiries");
  const drafts = scope("client_communication_drafts");
  const deadlines = scope("administrative_deadlines");
  const proposals = scope("proposals");
  const projects = scope("projects");
  const tasks = scope("tasks");
  const packages = scope("delivery_package_records");
  const findings = scope("technical_qa_findings");
  const invoices = scope("invoices");
  const payments = scope("payment_statuses");
  const expenses = scope("expense_records");
  const transmittals = scope("transmittal_drafts");
  const receivableFollowUps = scope("receivable_follow_ups");
  const incidents = scope("pilot_incidents");
  const support = scope("support_cases");
  const cashInvoiced = invoices.reduce((sum, invoice) => sum + (invoice.line_items ?? []).reduce((lineSum, item) => lineSum + Number(item.amount ?? 0), 0), 0);
  const cashReceived = payments.filter((item) => item.payment_status === "PAID").reduce((sum, item) => sum + Number(item.amount_received ?? 0), 0);
  const cashExpenses = expenses.filter((item) => ["APPROVED", "PAID", "PAYMENT_PREPARED"].includes(item.status)).reduce((sum, item) => sum + Number(item.amount ?? 0), 0);
  const deadlineBuckets = dueBucket(deadlines.filter((item) => item.status === "OPEN"));
  const proposalDueBuckets = dueBucket(proposals.filter((item) => !["ACCEPTED", "REJECTED", "SUPERSEDED"].includes(item.proposal_status)), "valid_until");
  const openHighFindings = findings.filter((item) => ["HIGH", "CRITICAL"].includes(item.severity) && item.status !== "RESOLVED");
  const exceptions = [];
  if (deadlineBuckets.overdue) exceptions.push({ key: "overdue_deadlines", severity: "HIGH", detail: `${deadlineBuckets.overdue} administrative deadline(s) overdue.` });
  if (proposalDueBuckets.overdue) exceptions.push({ key: "expired_proposals", severity: "MEDIUM", detail: `${proposalDueBuckets.overdue} proposal(s) past validity date.` });
  if (packages.some((item) => item.package_status === "BLOCKED")) exceptions.push({ key: "blocked_delivery_packages", severity: "HIGH", detail: "At least one delivery package is blocked." });
  if (openHighFindings.length) exceptions.push({ key: "open_high_qa_findings", severity: "HIGH", detail: `${openHighFindings.length} HIGH/CRITICAL QA finding(s) remain open.` });
  if (incidents.some((item) => !["RESOLVED", "CLOSED"].includes(item.status))) exceptions.push({ key: "active_pilot_incidents", severity: "MEDIUM", detail: "Pilot incident queue has active items." });
  if (support.some((item) => item.status !== "CLOSED" && item.severity === "CRITICAL")) exceptions.push({ key: "critical_support_case", severity: "CRITICAL", detail: "Critical support case is open." });
  const approvals = [
    ...proposals.filter((item) => ["DRAFT", "PREPARED", "PENDING_APPROVAL"].includes(item.proposal_status)).map((item) => ({ type: "proposal", id: item.id, status: item.proposal_status })),
    ...packages.filter((item) => item.package_status === "READY_FOR_PRINCIPAL_REVIEW").map((item) => ({ type: "technical_delivery_package", id: item.id, status: item.package_status })),
    ...expenses.filter((item) => ["PREPARED", "REVIEW_REQUIRED", "DRAFT_REVIEW_REQUIRED"].includes(item.status)).map((item) => ({ type: "expense", id: item.id, status: item.status })),
    ...drafts.filter((item) => item.requires_human_review && !isClosedStatus(item.status)).map((item) => ({ type: "client_communication_draft", id: item.id, status: item.status })),
    ...transmittals.filter((item) => item.requires_principal_approval && !isClosedStatus(item.status)).map((item) => ({ type: "transmittal_draft", id: item.id, status: item.status })),
    ...receivableFollowUps.filter((item) => item.requires_human_review && !isClosedStatus(item.status)).map((item) => ({ type: "receivable_follow_up", id: item.id, status: item.status }))
  ];
  const rehearsalChecks = [
    { key: "front_desk", status: enquiries.length ? "PASS" : "WAITING", detail: "Enquiry activity is visible." },
    { key: "administration", status: deadlines.length || transmittals.length || scope("document_register_entries").length ? "PASS" : "WAITING", detail: "Administrative control activity is visible." },
    { key: "commercial", status: proposals.length || invoices.length ? "PASS" : "WAITING", detail: "Proposal, invoice, or account activity is visible." },
    { key: "technical_delivery", status: packages.length || scope("drawing_review_records").length ? "PASS" : "WAITING", detail: "Technical delivery preparation is visible." },
    { key: "audit", status: scope("event_log").length && scope("audit_events").length ? "PASS" : "WAITING", detail: "Events and audit records are available." },
    { key: "authority_boundary", status: packages.every((item) => !item.professional_approval_id && !item.issued_document_version_id) ? "PASS" : "REVIEW", detail: "SF-S5 packages remain pre-approval in this surface." }
  ];
  const handoffReady = rehearsalChecks.every((item) => item.status === "PASS") && !exceptions.some((item) => ["CRITICAL", "HIGH"].includes(item.severity));
  return {
    generated_at: now(),
    tenant_id,
    firm_id,
    status: handoffReady ? "READY_FOR_HANDOFF_ACCEPTANCE" : exceptions.length ? "OPERATOR_ATTENTION_REQUIRED" : "REHEARSAL_IN_PROGRESS",
    counts: {
      open_enquiries: enquiries.filter((item) => !isClosedStatus(item.status)).length,
      open_deadlines: deadlines.filter((item) => item.status === "OPEN").length,
      pending_approvals: approvals.length,
      open_projects: projects.filter((item) => !isClosedStatus(item.project_state)).length,
      open_tasks: tasks.filter((item) => !isClosedStatus(item.state)).length,
      ready_delivery_packages: packages.filter((item) => item.package_status === "READY_FOR_PRINCIPAL_REVIEW").length,
      blocked_delivery_packages: packages.filter((item) => item.package_status === "BLOCKED").length,
      open_high_qa_findings: openHighFindings.length,
      open_incidents: incidents.filter((item) => !["RESOLVED", "CLOSED"].includes(item.status)).length,
      audit_events: scope("audit_events").length
    },
    deadlines: { ...deadlineBuckets, proposal_validity: proposalDueBuckets },
    approvals,
    exceptions,
    workload: {
      active_workers: scope("worker_instances").filter((item) => item.runtime_status === "ACTIVE").length,
      unassigned_tasks: tasks.filter((item) => !item.assigned_actor_or_worker_ref && !isClosedStatus(item.state)).length,
      by_state: tasks.reduce((acc, item) => ({ ...acc, [item.state ?? "UNKNOWN"]: (acc[item.state ?? "UNKNOWN"] ?? 0) + 1 }), {})
    },
    pipeline: {
      open_opportunities: scope("sales_pipeline_records").filter((item) => !["WON", "LOST", "CLOSED"].includes(item.stage)).length,
      proposals_draft: proposals.filter((item) => ["DRAFT", "PREPARED", "PENDING_APPROVAL"].includes(item.proposal_status)).length,
      proposals_approved_or_sent: proposals.filter((item) => ["APPROVED", "SENT"].includes(item.proposal_status)).length
    },
    cash: {
      currency: invoices[0]?.currency ?? expenses[0]?.currency ?? "MYR",
      invoiced: cashInvoiced,
      received: cashReceived,
      approved_expenses: cashExpenses,
      projected_net: cashReceived - cashExpenses,
      outstanding: cashInvoiced - cashReceived
    },
    rehearsal_checks: rehearsalChecks,
    recent_activity: scope("event_log").slice(-10).reverse()
  };
}

export async function readDailyOperationsSummary(tenant_id, firm_id) {
  const store = await readStore();
  return buildDailyOperationsSummary(store, tenant_id, firm_id);
}

export async function createPilotHandoffRecord(body, actor = systemActor(body.tenant_id, body.firm_id)) {
  if (actor.actor_type !== "HUMAN") invalidState("Pilot handoff acceptance requires a human principal actor.");
  const store = await readStore();
  const summary = buildDailyOperationsSummary(store, body.tenant_id, body.firm_id);
  const required = body.checklist ?? summary.rehearsal_checks;
  const hasFailed = required.some((item) => !["PASS", "ACCEPTED"].includes(item.status));
  const highException = summary.exceptions.some((item) => ["CRITICAL", "HIGH"].includes(item.severity));
  const timestamp = now();
  const record = {
    id: storeBackend === "postgres" ? newUuid() : newId("pilot_handoff"),
    tenant_id: body.tenant_id,
    firm_id: body.firm_id,
    accepted_by_actor_id: actor.actor_id ?? actor.id,
    rehearsal_ref: body.rehearsal_ref ?? "SF-S6-WORKING-WEEK-LOCAL",
    handoff_status: hasFailed || highException ? "CONDITIONAL_ACCEPTANCE" : "ACCEPTED_FOR_CONTROLLED_LOCAL_PILOT",
    checklist: required,
    evidence_refs: body.evidence_refs ?? [],
    decision_summary: body.decision_summary ?? "SF-S6 daily operations and pilot handoff accepted for controlled local pilot use.",
    accepted_at: timestamp,
    created_at: timestamp,
    metadata: { operations_status: summary.status, exception_count: summary.exceptions.length, ...(body.metadata ?? {}) }
  };
  if (storeBackend !== "postgres") return withStore((nextStore) => { nextStore.pilot_handoff_records.push(record); appendEventAndAudit(nextStore, { event_type: "pilot_handoff.accepted", actor, tenant_id: record.tenant_id, firm_id: record.firm_id, aggregate_type: "PilotHandoffRecord", aggregate_id: record.id, payload: record, summary: "SF-S6 pilot handoff acceptance recorded." }); return record; });
  const clientConn = await getPool().connect();
  try {
    await clientConn.query("begin");
    await setTenantContext(clientConn, record.tenant_id);
    await clientConn.query("insert into pilot_handoff_records(id,tenant_id,firm_id,accepted_by_actor_id,rehearsal_ref,handoff_status,checklist,evidence_refs,decision_summary,accepted_at,created_at,metadata) values($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9,$10,$11,$12::jsonb)", [record.id, record.tenant_id, record.firm_id, uuidOrNull(record.accepted_by_actor_id), record.rehearsal_ref, record.handoff_status, JSON.stringify(record.checklist), JSON.stringify(record.evidence_refs), record.decision_summary, record.accepted_at, record.created_at, JSON.stringify(record.metadata)]);
    await clientConn.query("commit");
    await withAppState((nextStore) => { appendEventAndAudit(nextStore, { event_type: "pilot_handoff.accepted", actor, tenant_id: record.tenant_id, firm_id: record.firm_id, aggregate_type: "PilotHandoffRecord", aggregate_id: record.id, payload: record, summary: "SF-S6 pilot handoff acceptance recorded." }); return record; });
    return record;
  } catch (error) {
    await clientConn.query("rollback");
    throw error;
  } finally {
    clientConn.release();
  }
}
export async function readCashSnapshot(tenant_id,firm_id) {
  const store=await readStore(),scope=x=>x.tenant_id===tenant_id&&(!firm_id||x.firm_id===firm_id),invoices=(store.invoices??[]).filter(scope),payments=(store.payment_statuses??[]).filter(scope),expenses=(store.expense_records??[]).filter(scope);

  const invoiceTotal=invoices.filter(x=>["ISSUED","PAID","OVERDUE"].includes(x.status)).reduce((s,x)=>s+(x.line_items??[]).reduce((a,l)=>a+Number(l.amount??0),0),0);
  const received=payments.filter(x=>["RECEIVED","PAID","CAPTURED"].includes(x.payment_status)).reduce((s,x)=>s+Number(x.amount??0),0);
  const approvedExpenses=expenses.filter(x=>x.status==="APPROVED").reduce((s,x)=>s+Number(x.amount??0),0);
  return {tenant_id,firm_id,currency:"MYR",invoice_total:invoiceTotal,cash_received:received,receivables_outstanding:Math.max(0,invoiceTotal-received),approved_expenses:approvedExpenses,projected_net_cash:received-approvedExpenses,counts:{opportunities:(store.sales_pipeline_records??[]).filter(scope).length,invoices:invoices.length,expenses:expenses.length,receivable_drafts:(store.receivable_follow_ups??[]).filter(scope).length},generated_at:now(),calculation_basis:"deterministic_record_projection_no_bank_balance"};
}
export async function createIntakeSessionRecord(body) {
  if (storeBackend !== "postgres") {
    return withStore((store) => {
      const relationship = store.firm_client_relationships.find((record) => record.id === body.relationship_id);
      if (!relationship) throwNotFound("firm_client_relationships", body.relationship_id);
      const actor = body.actor ?? systemActor(body.tenant_id, body.firm_id);
      const { lead, intake, missing } = buildIntakeFrontdoor(body, actor);
      store.leads.push(lead);
      store.intake_sessions.push(intake);
      appendEventAndAudit(store, { event_type: missing.length > 0 ? "intake.missing_information_detected" : "intake.completed", actor, tenant_id: body.tenant_id, firm_id: body.firm_id, aggregate_type: "IntakeSession", aggregate_id: intake.id, payload: { intake_id: intake.id, missing_information_items: missing }, summary: missing.length > 0 ? "Intake created with missing information." : "Intake completed." });
      return { lead, intake };
    });
  }


  const clientConn = await getPool().connect();
  try {
    await clientConn.query("begin");
    const relationshipResult = await clientConn.query("select id from firm_client_relationships where id = $1 and tenant_id = $2 and firm_id = $3", [body.relationship_id, body.tenant_id, body.firm_id]);
    if (relationshipResult.rowCount === 0) throwNotFound("firm_client_relationships", body.relationship_id);
    const actor = body.actor ?? systemActor(body.tenant_id, body.firm_id);
    const { lead, intake, missing } = buildIntakeFrontdoor(body, actor, { ids: "uuid" });
    await createLead({ ...lead, relationship_id: uuidOrNull(lead.relationship_id), assigned_actor_id: uuidOrNull(lead.assigned_actor_id), created_from_conversation_ref: lead.created_from_conversation_ref ?? null }, clientConn);
    await createIntakeSession({ ...intake, lead_id: uuidOrNull(intake.lead_id), service_id: uuidOrNull(intake.service_id) }, clientConn);
    await clientConn.query("commit");
    await withAppState((store) => {
      appendEventAndAudit(store, { event_type: missing.length > 0 ? "intake.missing_information_detected" : "intake.completed", actor, tenant_id: body.tenant_id, firm_id: body.firm_id, aggregate_type: "IntakeSession", aggregate_id: intake.id, payload: { intake_id: intake.id, missing_information_items: missing }, summary: missing.length > 0 ? "Intake created with missing information." : "Intake completed." });
      return intake;
    });
    return { lead, intake: { ...intake, service_id: uuidOrNull(intake.service_id) } };
  } catch (error) {
    await clientConn.query("rollback");
    throw error;
  } finally {
    clientConn.release();
  }
}

export async function createProposalRecord(body) {
  if (storeBackend !== "postgres") {
    return withStore((store) => {
      const intake = store.intake_sessions.find((record) => record.id === body.intake_session_id);
      if (!intake) throwNotFound("intake_sessions", body.intake_session_id);
      const actor = body.actor ?? systemActor(body.tenant_id, body.firm_id);
      const { price, proposal } = buildCommercialProposal(body);
      store.price_build_ups.push(price);
      store.proposals.push(proposal);
      appendEventAndAudit(store, { event_type: "proposal.created", actor, tenant_id: body.tenant_id, firm_id: body.firm_id, aggregate_type: "Proposal", aggregate_id: proposal.id, payload: { proposal_id: proposal.id, price_build_up_id: price.id }, summary: "Proposal created." });
      return { price, proposal };
    });
  }

  const clientConn = await getPool().connect();
  try {
    await clientConn.query("begin");
    const intakeResult = await clientConn.query("select id from intake_sessions where id = $1 and tenant_id = $2 and firm_id = $3", [body.intake_session_id, body.tenant_id, body.firm_id]);
    if (intakeResult.rowCount === 0) throwNotFound("intake_sessions", body.intake_session_id);
    const relationshipResult = await clientConn.query("select id from firm_client_relationships where id = $1 and tenant_id = $2 and firm_id = $3", [body.relationship_id, body.tenant_id, body.firm_id]);
    if (relationshipResult.rowCount === 0) throwNotFound("firm_client_relationships", body.relationship_id);
    const actor = body.actor ?? systemActor(body.tenant_id, body.firm_id);
    const { price, proposal } = buildCommercialProposal(body, { ids: "uuid" });
    await createPriceBuildUp({ ...price, service_sku_id: uuidOrNull(price.service_sku_id) }, clientConn);
    await createProposal({ ...proposal, relationship_id: uuidOrNull(proposal.relationship_id), service_id: uuidOrNull(proposal.service_id), price_build_up_id: uuidOrNull(proposal.price_build_up_id), commercial_approval_id: null, issued_document_ref: proposal.issued_document_ref ?? null }, clientConn);
    await clientConn.query("commit");
    await withAppState((store) => {
      appendEventAndAudit(store, { event_type: "proposal.created", actor, tenant_id: body.tenant_id, firm_id: body.firm_id, aggregate_type: "Proposal", aggregate_id: proposal.id, payload: { proposal_id: proposal.id, price_build_up_id: price.id }, summary: "Proposal created." });
      return proposal;
    });
    return { price: { ...price, service_sku_id: uuidOrNull(price.service_sku_id) }, proposal };
  } catch (error) {
    await clientConn.query("rollback");
    throw error;
  } finally {
    clientConn.release();
  }
}

function buildQuotationCase(body, actor = {}) {
  const timestamp = now();
  return {
    id: storeBackend === "postgres" ? newUuid() : newId("quotation_case"),
    tenant_id: body.tenant_id,
    firm_id: body.firm_id,
    relationship_id: body.relationship_id,
    intake_session_id: body.intake_session_id ?? null,
    case_number: body.case_number ?? `QT-${timestamp.slice(0, 10).replaceAll("-", "")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    title: body.title,
    quotation_type: body.quotation_type ?? "BOQ_IMAGE_QUOTATION",
    service_lines: body.service_lines ?? [],
    client_request_summary: body.client_request_summary,
    intake_evidence_refs: body.intake_evidence_refs ?? [],
    document_register_entry_ids: body.document_register_entry_ids ?? [],
    proposal_id: body.proposal_id ?? null,
    approval_id: null,
    issued_document_ref: null,
    submitted_evidence_ref: null,
    status: "INTAKE_REGISTERED",
    requires_human_approval: true,
    prepared_by_actor_id: actor.actor_id ?? actor.id ?? null,
    approved_by_actor_id: null,
    issued_by_actor_id: null,
    created_at: timestamp,
    updated_at: timestamp,
    metadata: body.metadata ?? {}
  };
}

function assertQuotationCaseReferences(store, body) {
  const relationship = store.firm_client_relationships.find((record) => record.id === body.relationship_id && record.tenant_id === body.tenant_id && record.firm_id === body.firm_id);
  if (!relationship) throwNotFound("firm_client_relationships", body.relationship_id);
  if (body.intake_session_id) {
    const intake = store.intake_sessions.find((record) => record.id === body.intake_session_id && record.tenant_id === body.tenant_id && record.firm_id === body.firm_id);
    if (!intake) throwNotFound("intake_sessions", body.intake_session_id);
  }
  for (const documentId of body.document_register_entry_ids ?? []) {
    const document = store.document_register_entries.find((record) => record.id === documentId && record.tenant_id === body.tenant_id && record.firm_id === body.firm_id);
    if (!document) throwNotFound("document_register_entries", documentId);
  }
  if (body.proposal_id) {
    const proposal = store.proposals.find((record) => record.id === body.proposal_id && record.tenant_id === body.tenant_id && record.firm_id === body.firm_id);
    if (!proposal) throwNotFound("proposals", body.proposal_id);
  }
}

export async function createQuotationCaseRecord(body, actor = systemActor(body.tenant_id, body.firm_id)) {
  return withStore((store) => {
    store.quotation_cases ??= [];
    assertQuotationCaseReferences(store, body);
    const item = buildQuotationCase(body, actor);
    store.quotation_cases.push(item);
    appendEventAndAudit(store, { event_type: "quotation_case.intake_registered", actor, tenant_id: item.tenant_id, firm_id: item.firm_id, aggregate_type: "QuotationCase", aggregate_id: item.id, payload: { case_number: item.case_number, intake_evidence_refs: item.intake_evidence_refs, document_register_entry_ids: item.document_register_entry_ids }, summary: "Quotation case created from controlled client intake evidence." });
    return item;
  });
}

export async function linkQuotationCaseProposalRecord(body, actor = systemActor(body.tenant_id, body.firm_id)) {
  return withStore((store) => {
    store.quotation_cases ??= [];
    const item = store.quotation_cases.find((record) => record.id === body.quotation_case_id && record.tenant_id === body.tenant_id && record.firm_id === body.firm_id);
    if (!item) throwNotFound("quotation_cases", body.quotation_case_id);
    const proposal = store.proposals.find((record) => record.id === body.proposal_id && record.tenant_id === body.tenant_id && record.firm_id === body.firm_id);
    if (!proposal) throwNotFound("proposals", body.proposal_id);
    if (item.proposal_id && item.proposal_id !== proposal.id) invalidState("Quotation case already has a linked proposal.");
    item.proposal_id = proposal.id;
    item.status = proposal.proposal_status === "APPROVED" ? "APPROVAL_RECORDED" : "PROPOSAL_DRAFTED";
    item.updated_at = now();
    appendEventAndAudit(store, { event_type: "quotation_case.proposal_linked", actor, tenant_id: item.tenant_id, firm_id: item.firm_id, aggregate_type: "QuotationCase", aggregate_id: item.id, payload: { proposal_id: proposal.id, proposal_status: proposal.proposal_status }, summary: "Quotation case linked to proposal draft." });
    return item;
  });
}

export async function approveQuotationCaseRecord(body, actor = systemActor(body.tenant_id, body.firm_id)) {
  return withStore((store) => {
    store.quotation_cases ??= [];
    const item = store.quotation_cases.find((record) => record.id === body.quotation_case_id && record.tenant_id === body.tenant_id && record.firm_id === body.firm_id);
    if (!item) throwNotFound("quotation_cases", body.quotation_case_id);
    if (!item.proposal_id) invalidState("Quotation case requires a linked proposal before approval.");
    const proposal = store.proposals.find((record) => record.id === item.proposal_id && record.tenant_id === body.tenant_id && record.firm_id === body.firm_id);
    if (!proposal) throwNotFound("proposals", item.proposal_id);
    if (proposal.proposal_status !== "APPROVED") invalidState("Linked proposal must be approved before quotation case approval is recorded.");
    item.approval_id = proposal.commercial_approval_id ?? body.approval_id ?? null;
    item.approved_by_actor_id = actor.actor_id ?? actor.id ?? null;
    item.status = "APPROVAL_RECORDED";
    item.updated_at = now();
    appendEventAndAudit(store, { event_type: "quotation_case.approval_recorded", actor, tenant_id: item.tenant_id, firm_id: item.firm_id, aggregate_type: "QuotationCase", aggregate_id: item.id, payload: { proposal_id: proposal.id, approval_id: item.approval_id }, summary: "Human quotation approval recorded before issue." });
    return item;
  });
}

export async function issueQuotationCaseRecord(body, actor = systemActor(body.tenant_id, body.firm_id)) {
  return withStore((store) => {
    store.quotation_cases ??= [];
    const item = store.quotation_cases.find((record) => record.id === body.quotation_case_id && record.tenant_id === body.tenant_id && record.firm_id === body.firm_id);
    if (!item) throwNotFound("quotation_cases", body.quotation_case_id);
    if (item.status !== "APPROVAL_RECORDED" || !item.approval_id) invalidState("Quotation case must have explicit human approval before issue.");
    requireFields(body, ["issued_document_ref", "submitted_evidence_ref"]);
    item.issued_document_ref = body.issued_document_ref;
    item.submitted_evidence_ref = body.submitted_evidence_ref;
    item.issued_by_actor_id = actor.actor_id ?? actor.id ?? null;
    item.status = "ISSUED_TO_CLIENT";
    item.updated_at = now();
    appendEventAndAudit(store, { event_type: "quotation_case.issued_to_client", actor, tenant_id: item.tenant_id, firm_id: item.firm_id, aggregate_type: "QuotationCase", aggregate_id: item.id, payload: { issued_document_ref: item.issued_document_ref, submitted_evidence_ref: item.submitted_evidence_ref }, summary: "Approved quotation case issued to client and registered as outgoing evidence." });
    return item;
  });
}

function buildBoqExtractionAid(body, quotationCase, documents, actor = {}) {
  const timestamp = now();
  const sourceEvidenceRefs = body.source_evidence_refs ?? quotationCase.intake_evidence_refs ?? [];
  const extractedItems = body.extracted_items ?? [];
  return {
    id: storeBackend === "postgres" ? newUuid() : newId("boq_extraction_aid"),
    tenant_id: body.tenant_id,
    firm_id: body.firm_id,
    quotation_case_id: quotationCase.id,
    source_document_ids: body.source_document_ids ?? documents.map((document) => document.id),
    source_evidence_refs: sourceEvidenceRefs,
    extraction_method: body.extraction_method ?? "HUMAN_ASSISTED_REVIEW_WORKSHEET",
    extraction_status: "DRAFT_REVIEW_REQUIRED",
    extracted_items: extractedItems,
    assumptions: body.assumptions ?? ["Source is client-supplied and must be checked by the human principal before quotation use."],
    exclusions: body.exclusions ?? ["No autonomous measurement, pricing, technical certification, or client commitment."],
    confidence_level: body.confidence_level ?? "LOW_UNVERIFIED",
    requires_human_review: true,
    authoritative: false,
    reviewed_by_actor_id: null,
    reviewed_at: null,
    review_notes: null,
    prepared_by_actor_id: actor.actor_id ?? actor.id ?? null,
    created_at: timestamp,
    updated_at: timestamp,
    metadata: body.metadata ?? {}
  };
}

export async function createBoqExtractionAidRecord(body, actor = systemActor(body.tenant_id, body.firm_id)) {
  return withStore((store) => {
    store.boq_extraction_aids ??= [];
    const quotationCase = (store.quotation_cases ?? []).find((record) => record.id === body.quotation_case_id && record.tenant_id === body.tenant_id && record.firm_id === body.firm_id);
    if (!quotationCase) throwNotFound("quotation_cases", body.quotation_case_id);
    if (!quotationCase.document_register_entry_ids?.length && !(body.source_document_ids ?? []).length) invalidState("BOQ extraction aid requires registered source documents.");
    const sourceIds = body.source_document_ids?.length ? body.source_document_ids : quotationCase.document_register_entry_ids;
    const documents = sourceIds.map((id) => assertScopedReference(store, "document_register_entries", id, body));
    const item = buildBoqExtractionAid(body, quotationCase, documents, actor);
    store.boq_extraction_aids.push(item);
    appendEventAndAudit(store, { event_type: "boq_extraction_aid.prepared", actor, tenant_id: item.tenant_id, firm_id: item.firm_id, aggregate_type: "BoqExtractionAid", aggregate_id: item.id, payload: { quotation_case_id: item.quotation_case_id, source_document_ids: item.source_document_ids, extracted_items: item.extracted_items.length, authoritative: false }, summary: "BOQ extraction review aid prepared; human review required before quotation use." });
    return item;
  });
}

export async function reviewBoqExtractionAidRecord(body, actor = systemActor(body.tenant_id, body.firm_id)) {
  requireHumanPrincipalActor(actor, "BOQ extraction aid review");
  return withStore((store) => {
    store.boq_extraction_aids ??= [];
    const item = (store.boq_extraction_aids ?? []).find((record) => record.id === body.boq_extraction_aid_id && record.tenant_id === body.tenant_id && record.firm_id === body.firm_id);
    if (!item) throwNotFound("boq_extraction_aids", body.boq_extraction_aid_id);
    if (item.extraction_status !== "DRAFT_REVIEW_REQUIRED") invalidState("Only draft BOQ extraction aids can be reviewed.");
    item.extraction_status = body.review_decision === "REJECT" ? "REJECTED" : "HUMAN_REVIEWED";
    item.reviewed_by_actor_id = actor.actor_id;
    item.reviewed_at = now();
    item.review_notes = body.review_notes ?? "Human principal reviewed BOQ extraction aid for quotation support.";
    item.updated_at = item.reviewed_at;
    appendEventAndAudit(store, { event_type: item.extraction_status === "REJECTED" ? "boq_extraction_aid.rejected" : "boq_extraction_aid.human_reviewed", actor, tenant_id: item.tenant_id, firm_id: item.firm_id, aggregate_type: "BoqExtractionAid", aggregate_id: item.id, payload: { extraction_status: item.extraction_status, quotation_case_id: item.quotation_case_id, authoritative: false }, summary: item.extraction_status === "REJECTED" ? "BOQ extraction aid rejected by human principal." : "BOQ extraction aid reviewed by human principal for quotation support; it remains non-authoritative." });
    return item;
  });
}

function buildQuotationDraftPack(body, quotationCase, extractionAid, proposal, actor = {}) {
  const timestamp = now();
  return {
    id: storeBackend === "postgres" ? newUuid() : newId("quotation_draft_pack"),
    tenant_id: body.tenant_id,
    firm_id: body.firm_id,
    quotation_case_id: quotationCase.id,
    boq_extraction_aid_id: extractionAid.id,
    proposal_id: proposal?.id ?? quotationCase.proposal_id ?? null,
    draft_number: body.draft_number ?? `${quotationCase.case_number}-DRAFT-01`,
    draft_status: "DRAFT_REVIEW_REQUIRED",
    client_correspondence_status: "NOT_PREPARED",
    correspondence_record_id: null,
    source_document_ids: extractionAid.source_document_ids ?? quotationCase.document_register_entry_ids ?? [],
    source_evidence_refs: [...new Set([...(quotationCase.intake_evidence_refs ?? []), ...(extractionAid.source_evidence_refs ?? [])])],
    line_items: body.line_items ?? extractionAid.extracted_items ?? [],
    commercial_summary: body.commercial_summary ?? proposal?.scope_summary ?? quotationCase.client_request_summary,
    amount_summary: body.amount_summary ?? "Pending human commercial confirmation before client-facing issue.",
    assumptions: body.assumptions ?? extractionAid.assumptions ?? [],
    exclusions: body.exclusions ?? extractionAid.exclusions ?? [],
    validity_terms: body.validity_terms ?? "Validity, price, and commercial terms require explicit human principal confirmation before sending.",
    client_correspondence_subject: body.client_correspondence_subject ?? `Draft quotation for ${quotationCase.case_number}`,
    client_correspondence_body: body.client_correspondence_body ?? "Draft quotation correspondence prepared for human principal review. No message has been sent.",
    requires_human_approval: true,
    client_facing: false,
    authoritative: false,
    prepared_by_actor_id: actor.actor_id ?? actor.id ?? null,
    reviewed_by_actor_id: null,
    reviewed_at: null,
    review_notes: null,
    created_at: timestamp,
    updated_at: timestamp,
    metadata: body.metadata ?? {}
  };
}

export async function createQuotationDraftPackRecord(body, actor = systemActor(body.tenant_id, body.firm_id)) {
  return withStore((store) => {
    store.quotation_draft_packs ??= [];
    const quotationCase = (store.quotation_cases ?? []).find((record) => record.id === body.quotation_case_id && record.tenant_id === body.tenant_id && record.firm_id === body.firm_id);
    if (!quotationCase) throwNotFound("quotation_cases", body.quotation_case_id);
    const extractionAid = (store.boq_extraction_aids ?? []).find((record) => record.id === body.boq_extraction_aid_id && record.tenant_id === body.tenant_id && record.firm_id === body.firm_id);
    if (!extractionAid) throwNotFound("boq_extraction_aids", body.boq_extraction_aid_id);
    if (extractionAid.quotation_case_id !== quotationCase.id) invalidState("BOQ extraction aid must belong to the quotation case.");
    if (extractionAid.extraction_status !== "HUMAN_REVIEWED") invalidState("Quotation draft pack requires a human-reviewed BOQ extraction aid.");
    const proposalId = body.proposal_id ?? quotationCase.proposal_id ?? null;
    const proposal = proposalId ? assertScopedReference(store, "proposals", proposalId, body) : null;
    const duplicate = store.quotation_draft_packs.find((record) => record.quotation_case_id === quotationCase.id && record.draft_status !== "REJECTED");
    if (duplicate) invalidState("Quotation case already has an active quotation draft pack.");
    const item = buildQuotationDraftPack(body, quotationCase, extractionAid, proposal, actor);
    store.quotation_draft_packs.push(item);
    appendEventAndAudit(store, { event_type: "quotation_draft_pack.prepared", actor, tenant_id: item.tenant_id, firm_id: item.firm_id, aggregate_type: "QuotationDraftPack", aggregate_id: item.id, payload: { quotation_case_id: item.quotation_case_id, boq_extraction_aid_id: item.boq_extraction_aid_id, line_items: item.line_items.length, requires_human_approval: true }, summary: "Quotation draft pack assembled for human review; no client correspondence sent." });
    return item;
  });
}

export async function reviewQuotationDraftPackRecord(body, actor = systemActor(body.tenant_id, body.firm_id)) {
  requireHumanPrincipalActor(actor, "Quotation draft pack review");
  return withStore((store) => {
    store.quotation_draft_packs ??= [];
    const item = store.quotation_draft_packs.find((record) => record.id === body.quotation_draft_pack_id && record.tenant_id === body.tenant_id && record.firm_id === body.firm_id);
    if (!item) throwNotFound("quotation_draft_packs", body.quotation_draft_pack_id);
    if (item.draft_status !== "DRAFT_REVIEW_REQUIRED") invalidState("Only draft quotation packs can be reviewed.");
    item.draft_status = body.review_decision === "REJECT" ? "REJECTED" : "HUMAN_REVIEWED";
    item.reviewed_by_actor_id = actor.actor_id;
    item.reviewed_at = now();
    item.review_notes = body.review_notes ?? "Human principal reviewed quotation draft pack for controlled client correspondence preparation.";
    item.updated_at = item.reviewed_at;
    appendEventAndAudit(store, { event_type: item.draft_status === "REJECTED" ? "quotation_draft_pack.rejected" : "quotation_draft_pack.human_reviewed", actor, tenant_id: item.tenant_id, firm_id: item.firm_id, aggregate_type: "QuotationDraftPack", aggregate_id: item.id, payload: { draft_status: item.draft_status, client_facing: false, authoritative: false }, summary: item.draft_status === "REJECTED" ? "Quotation draft pack rejected by human principal." : "Quotation draft pack reviewed by human principal; client correspondence may be prepared as draft only." });
    return item;
  });
}

export async function prepareQuotationClientCorrespondenceRecord(body, actor = systemActor(body.tenant_id, body.firm_id)) {
  return withStore((store) => {
    store.quotation_draft_packs ??= [];
    const item = store.quotation_draft_packs.find((record) => record.id === body.quotation_draft_pack_id && record.tenant_id === body.tenant_id && record.firm_id === body.firm_id);
    if (!item) throwNotFound("quotation_draft_packs", body.quotation_draft_pack_id);
    if (item.draft_status !== "HUMAN_REVIEWED") invalidState("Client correspondence draft requires a human-reviewed quotation draft pack.");
    if (item.correspondence_record_id) invalidState("Client correspondence draft already prepared for this quotation draft pack.");
    const quotationCase = assertScopedReference(store, "quotation_cases", item.quotation_case_id, body);
    const relationship = quotationCase.relationship_id ? assertScopedReference(store, "firm_client_relationships", quotationCase.relationship_id, body) : null;
    const timestamp = now();
    const correspondence = {
      id: sf3Id("correspondence"),
      tenant_id: body.tenant_id,
      firm_id: body.firm_id,
      relationship_id: relationship?.id ?? null,
      project_id: body.project_id ?? null,
      direction: "OUTGOING",
      channel: body.channel ?? "EMAIL",
      subject: body.subject ?? item.client_correspondence_subject,
      correspondent: body.correspondent ?? "Client",
      received_or_drafted_at: timestamp,
      status: "DRAFT_REVIEW_REQUIRED",
      owner_actor_id: actor.actor_id,
      response_due_at: null,
      source_ref: `quotation_draft_pack://${item.id}`,
      created_at: timestamp,
      updated_at: timestamp,
      metadata: { ...(body.metadata ?? {}), quotation_case_id: item.quotation_case_id, quotation_draft_pack_id: item.id, client_facing_issue_blocked: true }
    };
    store.correspondence_records.push(correspondence);
    item.client_correspondence_status = "DRAFT_PREPARED_REVIEW_REQUIRED";
    item.correspondence_record_id = correspondence.id;
    item.updated_at = timestamp;
    appendEventAndAudit(store, { event_type: "quotation_draft_pack.client_correspondence_prepared", actor, tenant_id: item.tenant_id, firm_id: item.firm_id, aggregate_type: "QuotationDraftPack", aggregate_id: item.id, payload: { correspondence_record_id: correspondence.id, correspondence_status: correspondence.status, no_external_send: true }, summary: "Client quotation correspondence prepared as a draft only; no external message sent." });
    return { quotation_draft_pack: item, correspondence };
  });
}

function buildQuotationIssueRecord(body, quotationCase, draftPack, correspondence, actor = {}) {
  const timestamp = now();
  return {
    id: storeBackend === "postgres" ? newUuid() : newId("quotation_issue_record"),
    tenant_id: body.tenant_id,
    firm_id: body.firm_id,
    quotation_case_id: quotationCase.id,
    quotation_draft_pack_id: draftPack.id,
    correspondence_record_id: correspondence.id,
    relationship_id: quotationCase.relationship_id ?? null,
    issue_status: "ISSUED_TO_CLIENT_BY_HUMAN",
    issue_channel: body.issue_channel ?? correspondence.channel ?? "EMAIL",
    issued_to: body.issued_to ?? correspondence.correspondent ?? "Client",
    issued_document_ref: body.issued_document_ref,
    submitted_evidence_ref: body.submitted_evidence_ref,
    line_items: draftPack.line_items ?? [],
    amount_summary: body.amount_summary ?? draftPack.commercial_summary ?? null,
    validity_terms: body.validity_terms ?? draftPack.validity_terms ?? null,
    assumptions: draftPack.assumptions ?? [],
    exclusions: draftPack.exclusions ?? [],
    issued_by_actor_id: actor.actor_id,
    issued_at: timestamp,
    human_authorized: true,
    client_facing: true,
    ai_issued: false,
    payment_action_taken: false,
    professional_certification: false,
    created_at: timestamp,
    updated_at: timestamp,
    metadata: body.metadata ?? {}
  };
}

export async function issueQuotationDraftPackRecord(body, actor = systemActor(body.tenant_id, body.firm_id)) {
  requireHumanPrincipalActor(actor, "Controlled quotation issue");
  return withStore((store) => {
    store.quotation_issue_records ??= [];
    store.quotation_draft_packs ??= [];
    store.correspondence_records ??= [];
    const draftPack = store.quotation_draft_packs.find((record) => record.id === body.quotation_draft_pack_id && record.tenant_id === body.tenant_id && record.firm_id === body.firm_id);
    if (!draftPack) throwNotFound("quotation_draft_packs", body.quotation_draft_pack_id);
    if (draftPack.draft_status !== "HUMAN_REVIEWED") invalidState("Controlled quotation issue requires a human-reviewed quotation draft pack.");
    if (!draftPack.correspondence_record_id) invalidState("Controlled quotation issue requires prepared client correspondence.");
    const quotationCase = assertScopedReference(store, "quotation_cases", draftPack.quotation_case_id, body);
    const correspondence = store.correspondence_records.find((record) => record.id === draftPack.correspondence_record_id && record.tenant_id === body.tenant_id && record.firm_id === body.firm_id);
    if (!correspondence) throwNotFound("correspondence_records", draftPack.correspondence_record_id);
    if (correspondence.status !== "DRAFT_REVIEW_REQUIRED") invalidState("Controlled quotation issue requires correspondence in draft review state.");
    const duplicate = store.quotation_issue_records.find((record) => record.quotation_draft_pack_id === draftPack.id && record.issue_status === "ISSUED_TO_CLIENT_BY_HUMAN");
    if (duplicate) invalidState("Quotation draft pack has already been issued to the client by a human.");
    const item = buildQuotationIssueRecord(body, quotationCase, draftPack, correspondence, actor);
    store.quotation_issue_records.push(item);
    draftPack.draft_status = "ISSUED_TO_CLIENT_BY_HUMAN";
    draftPack.client_correspondence_status = "ISSUED_BY_HUMAN";
    draftPack.client_facing = true;
    draftPack.issued_document_ref = item.issued_document_ref;
    draftPack.submitted_evidence_ref = item.submitted_evidence_ref;
    draftPack.issued_by_actor_id = actor.actor_id;
    draftPack.issued_at = item.issued_at;
    draftPack.updated_at = item.updated_at;
    correspondence.status = "ISSUED_BY_HUMAN";
    correspondence.metadata = { ...(correspondence.metadata ?? {}), quotation_issue_record_id: item.id, client_facing_issue_blocked: false, issued_document_ref: item.issued_document_ref, submitted_evidence_ref: item.submitted_evidence_ref };
    correspondence.updated_at = item.updated_at;
    quotationCase.status = "ISSUED_TO_CLIENT";
    quotationCase.issued_document_ref = item.issued_document_ref;
    quotationCase.submitted_evidence_ref = item.submitted_evidence_ref;
    quotationCase.issued_by_actor_id = actor.actor_id;
    quotationCase.issued_at = item.issued_at;
    quotationCase.updated_at = item.updated_at;
    appendEventAndAudit(store, { event_type: "quotation_issue.controlled_issue_recorded", actor, tenant_id: item.tenant_id, firm_id: item.firm_id, aggregate_type: "QuotationIssueRecord", aggregate_id: item.id, payload: { quotation_case_id: item.quotation_case_id, quotation_draft_pack_id: item.quotation_draft_pack_id, correspondence_record_id: item.correspondence_record_id, human_authorized: true, payment_action_taken: false }, summary: "Quotation issue recorded by human principal with issued document and submitted evidence references." });
    return { quotation_issue_record: item, quotation_draft_pack: draftPack, quotation_case: quotationCase, correspondence };
  });
}

export async function prepareQuotationReceivableRecord(body, actor = systemActor(body.tenant_id, body.firm_id)) {
  return withStore((store) => {
    store.quotation_issue_records ??= [];
    store.quotation_receivable_preparations ??= [];
    const issue = store.quotation_issue_records.find((record) => record.id === body.quotation_issue_record_id && record.tenant_id === body.tenant_id && record.firm_id === body.firm_id);
    if (!issue) throwNotFound("quotation_issue_records", body.quotation_issue_record_id);
    if (issue.issue_status !== "ISSUED_TO_CLIENT_BY_HUMAN") invalidState("Receivable preparation requires a human-issued quotation record.");
    const duplicate = store.quotation_receivable_preparations.find((record) => record.quotation_issue_record_id === issue.id);
    if (duplicate) invalidState("Receivable preparation already exists for this quotation issue record.");
    const timestamp = now();
    const item = {
      id: storeBackend === "postgres" ? newUuid() : newId("quotation_receivable_preparation"),
      tenant_id: body.tenant_id,
      firm_id: body.firm_id,
      quotation_issue_record_id: issue.id,
      quotation_case_id: issue.quotation_case_id,
      quotation_draft_pack_id: issue.quotation_draft_pack_id,
      relationship_id: issue.relationship_id ?? null,
      receivable_status: "RECEIVABLE_PREPARED_REVIEW_REQUIRED",
      amount_summary: body.amount_summary ?? issue.amount_summary ?? null,
      invoice_draft_ref: body.invoice_draft_ref ?? null,
      payment_boundary: "NO_LIVE_PAYMENT_MOVEMENT",
      payment_action_taken: false,
      bank_instruction_ref: null,
      prepared_by_actor_id: actor.actor_id,
      created_at: timestamp,
      updated_at: timestamp,
      metadata: body.metadata ?? {}
    };
    store.quotation_receivable_preparations.push(item);
    appendEventAndAudit(store, { event_type: "quotation_receivable.prepared", actor, tenant_id: item.tenant_id, firm_id: item.firm_id, aggregate_type: "QuotationReceivablePreparation", aggregate_id: item.id, payload: { quotation_issue_record_id: item.quotation_issue_record_id, receivable_status: item.receivable_status, payment_action_taken: false, payment_boundary: item.payment_boundary }, summary: "Quotation receivable preparation recorded for review; no live payment action or bank instruction was created." });
    return item;
  });
}
export async function approveProposalRecord(body, actor, decision) {
  if (storeBackend !== "postgres") {
    return withStore((store) => {
      const proposal = store.proposals.find((record) => record.id === body.proposal_id);
      if (!proposal) throwNotFound("proposals", body.proposal_id);
      const approval = buildApproval(body, actor, proposal);
      proposal.proposal_status = "APPROVED";
      proposal.commercial_approval_id = approval.id;
      proposal.updated_at = now();
      store.approvals.push(approval);
      appendEventAndAudit(store, { event_type: "approval.granted", actor, tenant_id: body.tenant_id, firm_id: body.firm_id, aggregate_type: "Approval", aggregate_id: approval.id, payload: { approval_id: approval.id, proposal_id: proposal.id }, summary: "Proposal approval granted.", policy_decision_id: decision?.id ?? null });
      return { approval, proposal };
    });
  }

  const clientConn = await getPool().connect();
  try {
    await clientConn.query("begin");
    const proposalResult = await clientConn.query("select id::text, tenant_id::text, firm_id::text, relationship_id::text, service_id::text, scope_summary, price_build_up_id::text, commercial_approval_id::text, proposal_status, valid_until, issued_document_ref, version, created_at, updated_at from proposals where id = $1 and tenant_id = $2 and firm_id = $3", [body.proposal_id, body.tenant_id, body.firm_id]);
    if (proposalResult.rowCount === 0) throwNotFound("proposals", body.proposal_id);
    const proposal = mapDbDates(proposalResult.rows[0]);
    const approval = buildApproval(body, actor, proposal, { ids: "uuid" });
    // HM-S7 Phase 4b (2026-09-28): repositories/approvals.repo.mjs's createApproval() replaces the
    // hand-written insert here, running on this same clientConn so it still participates in this
    // handler's existing begin/commit transaction.
    await createApproval(approval, clientConn);
    await clientConn.query("update proposals set proposal_status = 'APPROVED', commercial_approval_id = $1, updated_at = $2 where id = $3", [approval.id, now(), proposal.id]);
    await clientConn.query("commit");
    const updatedProposal = { ...proposal, proposal_status: "APPROVED", commercial_approval_id: approval.id, updated_at: now() };
    await withAppState((store) => {
      appendEventAndAudit(store, { event_type: "approval.granted", actor, tenant_id: body.tenant_id, firm_id: body.firm_id, aggregate_type: "Approval", aggregate_id: approval.id, payload: { approval_id: approval.id, proposal_id: proposal.id }, summary: "Proposal approval granted.", policy_decision_id: decision?.id ?? null });
      return approval;
    });
    return { approval, proposal: updatedProposal };
  } catch (error) {
    await clientConn.query("rollback");
    throw error;
  } finally {
    clientConn.release();
  }
}

export async function acceptProposalRecord(body, actor) {
  if (storeBackend !== "postgres") {
    return withStore((store) => {
      const proposal = store.proposals.find((record) => record.id === body.proposal_id);
      if (!proposal) throwNotFound("proposals", body.proposal_id);
      if (!["APPROVED","SENT"].includes(proposal.proposal_status)) invalidState("Proposal must be approved or sent before acceptance.");
      const { engagement } = buildEngagement(body, proposal);
      proposal.proposal_status = "ACCEPTED";
      proposal.updated_at = now();
      store.engagements.push(engagement);
      appendEventAndAudit(store, { event_type: "proposal.accepted", actor, tenant_id: body.tenant_id, firm_id: body.firm_id, aggregate_type: "Proposal", aggregate_id: proposal.id, payload: { proposal_id: proposal.id }, summary: "Proposal accepted." });
      return { proposal, engagement };
    });
  }

  const clientConn = await getPool().connect();
  try {
    await clientConn.query("begin");
    await setTenantContext(clientConn, body.tenant_id);
    const proposalResult = await clientConn.query("select id::text, tenant_id::text, firm_id::text, relationship_id::text, service_id::text, scope_summary, price_build_up_id::text, commercial_approval_id::text, proposal_status, valid_until, issued_document_ref, version, created_at, updated_at from proposals where id = $1 and tenant_id = $2 and firm_id = $3", [body.proposal_id, body.tenant_id, body.firm_id]);
    if (proposalResult.rowCount === 0) throwNotFound("proposals", body.proposal_id);
    const proposal = mapDbDates(proposalResult.rows[0]);
    if (!["APPROVED","SENT"].includes(proposal.proposal_status)) invalidState("Proposal must be approved or sent before acceptance.");
    const { engagement } = buildEngagement(body, proposal, { ids: "uuid" });
    const timestamp = now();
    await clientConn.query("update proposals set proposal_status = 'ACCEPTED', updated_at = $1 where id = $2", [timestamp, proposal.id]);
    await createEngagement(engagement, clientConn);
    await clientConn.query("commit");
    const updatedProposal = { ...proposal, proposal_status: "ACCEPTED", updated_at: timestamp };
    await withAppState((store) => {
      appendEventAndAudit(store, { event_type: "proposal.accepted", actor, tenant_id: body.tenant_id, firm_id: body.firm_id, aggregate_type: "Proposal", aggregate_id: proposal.id, payload: { proposal_id: proposal.id }, summary: "Proposal accepted." });
      return engagement;
    });
    return { proposal: updatedProposal, engagement };
  } catch (error) {
    await clientConn.query("rollback");
    throw error;
  } finally {
    clientConn.release();
  }
}

export async function openProjectDeliveryRecord(body, actor, requiredEvidence = []) {
  if (storeBackend !== "postgres") {
    return withStore((store) => {
      const { project, workPackage, task } = buildDeliveryPackage(body, actor, body.engagement, requiredEvidence);
      store.projects.push(project);
      store.work_packages.push(workPackage);
      store.tasks.push(task);
      appendEventAndAudit(store, { event_type: "project.opened", actor, tenant_id: body.tenant_id, firm_id: body.firm_id, aggregate_type: "Project", aggregate_id: project.id, payload: { project_id: project.id, engagement_id: body.engagement.id }, summary: "Project opened from accepted proposal." });
      return { project, workPackage, task };
    });
  }

  const clientConn = await getPool().connect();
  try {
    await clientConn.query("begin");
    await setTenantContext(clientConn, body.tenant_id);
    const engagementResult = await clientConn.query("select id::text, tenant_id::text, firm_id::text, relationship_id::text, proposal_id::text from engagements where id = $1 and tenant_id = $2 and firm_id = $3", [body.engagement.id, body.tenant_id, body.firm_id]);
    if (engagementResult.rowCount === 0) throwNotFound("engagements", body.engagement.id);
    const { project, workPackage, task } = buildDeliveryPackage(body, actor, body.engagement, requiredEvidence, { ids: "uuid" });
    await createProject(project, clientConn);
    await createWorkPackage(workPackage, clientConn);
    await createTask(task, clientConn);
    await clientConn.query("commit");
    await withAppState((store) => {
      appendEventAndAudit(store, { event_type: "project.opened", actor, tenant_id: body.tenant_id, firm_id: body.firm_id, aggregate_type: "Project", aggregate_id: project.id, payload: { project_id: project.id, engagement_id: body.engagement.id }, summary: "Project opened from accepted proposal." });
      return project;
    });
    return { project, workPackage, task };
  } catch (error) {
    await clientConn.query("rollback");
    throw error;
  } finally {
    clientConn.release();
  }
}

export async function createEvidenceBundleRecord(body) {
  if (storeBackend !== "postgres") {
    return withStore((store) => {
      const project = store.projects.find((record) => record.id === body.project_id);
      if (!project) throwNotFound("projects", body.project_id);
      const actor = body.actor ?? systemActor(body.tenant_id, body.firm_id);
      const evidence = buildEvidenceBundle(body);
      store.evidence_bundles.push(evidence);
      appendEventAndAudit(store, { event_type: "evidence_bundle.created", actor, tenant_id: body.tenant_id, firm_id: body.firm_id, aggregate_type: "EvidenceBundle", aggregate_id: evidence.id, payload: { evidence_bundle_id: evidence.id }, summary: "Evidence bundle created." });
      return evidence;
    });
  }

  const clientConn = await getPool().connect();
  try {
    await clientConn.query("begin");
    await setTenantContext(clientConn, body.tenant_id);
    const projectResult = await clientConn.query("select id from projects where id = $1 and tenant_id = $2 and firm_id = $3", [body.project_id, body.tenant_id, body.firm_id]);
    if (projectResult.rowCount === 0) throwNotFound("projects", body.project_id);
    const actor = body.actor ?? systemActor(body.tenant_id, body.firm_id);
    const evidence = buildEvidenceBundle(body, { ids: "uuid" });
    await createEvidenceBundle(evidence, clientConn);
    await clientConn.query("commit");
    await withAppState((store) => {
      appendEventAndAudit(store, { event_type: "evidence_bundle.created", actor, tenant_id: body.tenant_id, firm_id: body.firm_id, aggregate_type: "EvidenceBundle", aggregate_id: evidence.id, payload: { evidence_bundle_id: evidence.id }, summary: "Evidence bundle created." });
      return evidence;
    });
    return evidence;
  } catch (error) {
    await clientConn.query("rollback");
    throw error;
  } finally {
    clientConn.release();
  }
}


export async function startTaskRecord(body) {
  if (storeBackend !== "postgres") {
    return withStore((store) => {
      const task = store.tasks.find((record) => record.id === body.task_id && record.tenant_id === body.tenant_id && record.firm_id === body.firm_id);
      if (!task) throwNotFound("tasks", body.task_id);
      if (!["CREATED", "READY"].includes(task.state)) invalidState("Task must be CREATED or READY before start.");
      const actor = body.actor ?? systemActor(body.tenant_id, body.firm_id);
      task.state = "IN_PROGRESS";
      task.updated_at = now();
      appendEventAndAudit(store, { event_type: "task.started", actor, tenant_id: body.tenant_id, firm_id: body.firm_id, aggregate_type: "Task", aggregate_id: task.id, payload: { task_id: task.id }, summary: "Delivery task started." });
      return task;
    });
  }
  const clientConn = await getPool().connect();
  try {
    await clientConn.query("begin");
    await setTenantContext(clientConn, body.tenant_id);
    const timestamp = now();
    const result = await clientConn.query("update tasks set state = 'IN_PROGRESS', updated_at = $1 where id = $2 and tenant_id = $3 and firm_id = $4 and state in ('CREATED','READY') returning id::text, tenant_id::text, firm_id::text, project_id::text, work_package_id::text, task_type, input_ref, output_ref, assigned_actor_or_worker_ref::text, state, risk_class, due_at, created_at, updated_at", [timestamp, body.task_id, body.tenant_id, body.firm_id]);
    if (result.rowCount === 0) throwNotFound("tasks", body.task_id);
    await clientConn.query("commit");
    const task = mapDbDates(result.rows[0]);
    await withAppState((store) => { appendEventAndAudit(store, { event_type: "task.started", actor: body.actor ?? systemActor(body.tenant_id, body.firm_id), tenant_id: body.tenant_id, firm_id: body.firm_id, aggregate_type: "Task", aggregate_id: task.id, payload: { task_id: task.id }, summary: "Delivery task started." }); return task; });
    return task;
  } catch (error) {
    await clientConn.query("rollback");
    throw error;
  } finally {
    clientConn.release();
  }
}

export async function completeTaskRecord(body) {
  if (storeBackend !== "postgres") {
    return withStore((store) => {
      const task = store.tasks.find((record) => record.id === body.task_id && record.tenant_id === body.tenant_id && record.firm_id === body.firm_id);
      if (!task) throwNotFound("tasks", body.task_id);
      if (!["IN_PROGRESS", "CREATED", "READY"].includes(task.state)) invalidState("Task must be active before completion.");
      const actor = body.actor ?? systemActor(body.tenant_id, body.firm_id);
      task.state = "COMPLETE";
      task.output_ref = body.output_ref ?? task.output_ref ?? `task-output:${task.id}`;
      task.updated_at = now();
      appendEventAndAudit(store, { event_type: "task.completed", actor, tenant_id: body.tenant_id, firm_id: body.firm_id, aggregate_type: "Task", aggregate_id: task.id, payload: { task_id: task.id, output_ref: task.output_ref }, summary: "Delivery task completed." });
      return task;
    });
  }
  const clientConn = await getPool().connect();
  try {
    await clientConn.query("begin");
    await setTenantContext(clientConn, body.tenant_id);
    const timestamp = now();
    const outputRef = body.output_ref ?? `task-output:${body.task_id}`;
    const result = await clientConn.query("update tasks set state = 'COMPLETE', output_ref = $1, updated_at = $2 where id = $3 and tenant_id = $4 and firm_id = $5 and state in ('IN_PROGRESS','CREATED','READY') returning id::text, tenant_id::text, firm_id::text, project_id::text, work_package_id::text, task_type, input_ref, output_ref, assigned_actor_or_worker_ref::text, state, risk_class, due_at, created_at, updated_at", [outputRef, timestamp, body.task_id, body.tenant_id, body.firm_id]);
    if (result.rowCount === 0) throwNotFound("tasks", body.task_id);
    await clientConn.query("commit");
    const task = mapDbDates(result.rows[0]);
    await withAppState((store) => { appendEventAndAudit(store, { event_type: "task.completed", actor: body.actor ?? systemActor(body.tenant_id, body.firm_id), tenant_id: body.tenant_id, firm_id: body.firm_id, aggregate_type: "Task", aggregate_id: task.id, payload: { task_id: task.id, output_ref: task.output_ref }, summary: "Delivery task completed." }); return task; });
    return task;
  } catch (error) {
    await clientConn.query("rollback");
    throw error;
  } finally {
    clientConn.release();
  }
}

function evidenceCompleteness(evidence, requiredEvidence = []) {
  const refs = new Set([...(evidence.input_refs ?? []), ...(evidence.source_document_refs ?? []), ...(evidence.calculation_refs ?? []), ...(evidence.qa_check_refs ?? []), ...(evidence.policy_check_refs ?? []), evidence.review_notes_ref, evidence.final_output_ref].filter(Boolean).map(String));
  const missing = requiredEvidence.filter((item) => !refs.has(item));
  return { complete: missing.length === 0, missing };
}

function buildDeliverableDraft(body, actor, options = {}) {
  const relational = options.ids === "uuid";
  const timestamp = now();
  const document = {
    id: relational ? newUuid() : newId("document"),
    tenant_id: body.tenant_id,
    firm_id: body.firm_id,
    project_id: body.project_id,
    relationship_id: body.relationship_id ?? null,
    document_type: body.document_type ?? "FORMWORK_PRELIMINARY_REPORT",
    title: body.title ?? "Formwork Preliminary Support Report",
    current_version_id: null,
    status: "DRAFT",
    classification: body.classification ?? "CLIENT_CONFIDENTIAL",
    created_at: timestamp
  };
  const version = {
    id: relational ? newUuid() : newId("document_version"),
    tenant_id: body.tenant_id,
    firm_id: body.firm_id,
    document_id: document.id,
    version_label: body.version_label ?? "v0.1",
    revision: body.revision ?? "A",
    storage_ref: body.storage_ref ?? `local-dev://deliverables/${document.id}/rev-${body.revision ?? "A"}`,
    hash: body.hash ?? (relational ? newUuid() : newId("hash")),
    created_by_actor_id: relational ? uuidOrNull(actor.actor_id) : actor.actor_id,
    approved_by_approval_id: null,
    supersedes_version_id: body.supersedes_version_id ?? null,
    status: "DRAFT",
    created_at: timestamp
  };
  document.current_version_id = version.id;
  return { document, document_version: version };
}

export async function createDeliverableDraftRecord(body, actor) {
  if (storeBackend !== "postgres") {
    return withStore((store) => {
      const project = store.projects.find((record) => record.id === body.project_id && record.tenant_id === body.tenant_id && record.firm_id === body.firm_id);
      if (!project) throwNotFound("projects", body.project_id);
      const records = buildDeliverableDraft(body, actor);
      store.documents.push(records.document);
      store.document_versions.push(records.document_version);
      appendEventAndAudit(store, { event_type: "document.version_created", actor, tenant_id: body.tenant_id, firm_id: body.firm_id, aggregate_type: "DocumentVersion", aggregate_id: records.document_version.id, payload: { document_id: records.document.id, document_version_id: records.document_version.id }, summary: "Deliverable draft version created." });
      return records;
    });
  }
  const clientConn = await getPool().connect();
  try {
    await clientConn.query("begin");
    await setTenantContext(clientConn, body.tenant_id);
    const projectResult = await clientConn.query("select id from projects where id = $1 and tenant_id = $2 and firm_id = $3", [body.project_id, body.tenant_id, body.firm_id]);
    if (projectResult.rowCount === 0) throwNotFound("projects", body.project_id);
    const records = buildDeliverableDraft(body, actor, { ids: "uuid" });
    await createDocument({ ...records.document, relationship_id: uuidOrNull(records.document.relationship_id) }, clientConn);
    await createDocumentVersion(records.document_version, clientConn);
    await clientConn.query("commit");
    await withAppState((store) => { appendEventAndAudit(store, { event_type: "document.version_created", actor, tenant_id: body.tenant_id, firm_id: body.firm_id, aggregate_type: "DocumentVersion", aggregate_id: records.document_version.id, payload: { document_id: records.document.id, document_version_id: records.document_version.id }, summary: "Deliverable draft version created." }); return records; });
    return records;
  } catch (error) {
    await clientConn.query("rollback");
    throw error;
  } finally {
    clientConn.release();
  }
}

export async function reviewDeliverableRecord(body, actor, authorityCheck, decision) {
  if (storeBackend !== "postgres") {
    return withStore((store) => {
      const version = store.document_versions.find((record) => record.id === body.document_version_id && record.tenant_id === body.tenant_id && record.firm_id === body.firm_id);
      if (!version) throwNotFound("document_versions", body.document_version_id);
      const evidence = store.evidence_bundles.find((record) => record.id === body.evidence_bundle_id && record.project_id === body.project_id);
      if (!evidence) throwNotFound("evidence_bundles", body.evidence_bundle_id);
      const workPackage = store.work_packages.find((record) => record.project_id === body.project_id);
      const completeness = evidenceCompleteness(evidence, workPackage?.required_evidence ?? []);
      if (!completeness.complete) invalidState(`Evidence bundle is incomplete. Missing: ${completeness.missing.join(", ")}`);
      const approval = buildApproval({ ...body, proposal_id: version.id, authority_id: authorityCheck.professional_authority?.id, approver_professional_id: authorityCheck.professional_profile?.id, evidence_bundle_id: evidence.id }, actor, { id: version.id, version: version.hash }, { subject_type: "DocumentVersion" });
      store.approvals.push(approval);
      version.status = "APPROVED";
      version.approved_by_approval_id = approval.id;
      evidence.status = "APPROVED";
      evidence.final_output_ref = version.id;
      appendEventAndAudit(store, { event_type: "deliverable.review_approved", actor, tenant_id: body.tenant_id, firm_id: body.firm_id, aggregate_type: "DocumentVersion", aggregate_id: version.id, payload: { approval_id: approval.id, evidence_bundle_id: evidence.id }, summary: "Deliverable reviewed and approved.", policy_decision_id: decision?.id ?? null });
      return { approval, document_version: version, evidence_bundle: evidence };
    });
  }
  const clientConn = await getPool().connect();
  try {
    await clientConn.query("begin");
    await setTenantContext(clientConn, body.tenant_id);
    const versionResult = await clientConn.query("select id::text, tenant_id::text, firm_id::text, document_id::text, version_label, revision, storage_ref, hash, created_by_actor_id::text, approved_by_approval_id::text, supersedes_version_id::text, status, created_at from document_versions where id = $1 and tenant_id = $2 and firm_id = $3", [body.document_version_id, body.tenant_id, body.firm_id]);
    if (versionResult.rowCount === 0) throwNotFound("document_versions", body.document_version_id);
    const evidenceResult = await clientConn.query("select id::text, tenant_id::text, firm_id::text, project_id::text, subject_type, subject_id::text, source_document_refs, input_refs, calculation_refs, qa_check_refs, policy_check_refs, review_notes_ref, final_output_ref, bundle_hash, status, created_at from evidence_bundles where id = $1 and tenant_id = $2 and firm_id = $3 and project_id = $4", [body.evidence_bundle_id, body.tenant_id, body.firm_id, body.project_id]);
    if (evidenceResult.rowCount === 0) throwNotFound("evidence_bundles", body.evidence_bundle_id);
    const workPackageResult = await clientConn.query("select required_evidence from work_packages where project_id = $1 and tenant_id = $2 and firm_id = $3 limit 1", [body.project_id, body.tenant_id, body.firm_id]);
    const evidence = mapDbDates(evidenceResult.rows[0]);
    const completeness = evidenceCompleteness(evidence, workPackageResult.rows[0]?.required_evidence ?? []);
    if (!completeness.complete) invalidState(`Evidence bundle is incomplete. Missing: ${completeness.missing.join(", ")}`);
    const version = mapDbDates(versionResult.rows[0]);
    const approval = buildApproval({ ...body, proposal_id: version.id, authority_id: authorityCheck.professional_authority?.id, approver_professional_id: authorityCheck.professional_profile?.id, evidence_bundle_id: evidence.id }, actor, { id: version.id, version: version.hash }, { ids: "uuid", subject_type: "DocumentVersion" });
    // HM-S7 Phase 4b (2026-09-28): same createApproval() swap as approveProposalRecord above.
    await createApproval(approval, clientConn);
    await clientConn.query("update document_versions set status = 'APPROVED', approved_by_approval_id = $1 where id = $2", [approval.id, version.id]);
    await clientConn.query("update evidence_bundles set status = 'APPROVED', final_output_ref = $1 where id = $2", [version.id, evidence.id]);
    await clientConn.query("commit");
    const updatedVersion = { ...version, status: "APPROVED", approved_by_approval_id: approval.id };
    const updatedEvidence = { ...evidence, status: "APPROVED", final_output_ref: version.id };
    await withAppState((store) => { appendEventAndAudit(store, { event_type: "deliverable.review_approved", actor, tenant_id: body.tenant_id, firm_id: body.firm_id, aggregate_type: "DocumentVersion", aggregate_id: version.id, payload: { approval_id: approval.id, evidence_bundle_id: evidence.id }, summary: "Deliverable reviewed and approved.", policy_decision_id: decision?.id ?? null }); return approval; });
    return { approval, document_version: updatedVersion, evidence_bundle: updatedEvidence };
  } catch (error) {
    await clientConn.query("rollback");
    throw error;
  } finally {
    clientConn.release();
  }
}

export async function issueDeliverableRecord(body, actor, policyDecision) {
  if (storeBackend !== "postgres") {
    return withStore((store) => {
      const version = store.document_versions.find((record) => record.id === body.document_version_id && record.tenant_id === body.tenant_id && record.firm_id === body.firm_id);
      if (!version) throwNotFound("document_versions", body.document_version_id);
      const document = store.documents.find((record) => record.id === version.document_id);
      if (!document) throwNotFound("documents", version.document_id);
      const approval = store.approvals.find((record) => record.id === body.approval_id && record.subject_id === version.id && record.decision === "APPROVED");
      if (!approval) invalidState("Approved deliverable review is required before issue.");
      version.status = "ISSUED";
      document.status = "ISSUED";
      document.current_version_id = version.id;
      const project = store.projects.find((record) => record.id === body.project_id);
      if (project) { project.project_state = "DELIVERABLE_ISSUED"; project.updated_at = now(); }
      appendEventAndAudit(store, { event_type: "deliverable.issued", actor, tenant_id: body.tenant_id, firm_id: body.firm_id, aggregate_type: "DocumentVersion", aggregate_id: version.id, payload: { document_id: document.id, document_version_id: version.id }, summary: "Deliverable issued after evidence and professional review.", policy_decision_id: policyDecision?.id ?? null });
      return { document, document_version: version, project };
    });
  }
  const clientConn = await getPool().connect();
  try {
    await clientConn.query("begin");
    const versionResult = await clientConn.query("select id::text, tenant_id::text, firm_id::text, document_id::text, version_label, revision, storage_ref, hash, created_by_actor_id::text, approved_by_approval_id::text, supersedes_version_id::text, status, created_at from document_versions where id = $1 and tenant_id = $2 and firm_id = $3", [body.document_version_id, body.tenant_id, body.firm_id]);
    if (versionResult.rowCount === 0) throwNotFound("document_versions", body.document_version_id);
    const version = mapDbDates(versionResult.rows[0]);
    const approvalResult = await clientConn.query("select id::text from approvals where id = $1 and subject_id = $2 and decision = 'APPROVED'", [body.approval_id, version.id]);
    if (approvalResult.rowCount === 0) invalidState("Approved deliverable review is required before issue.");
    await setTenantContext(clientConn, body.tenant_id);
    await clientConn.query("update document_versions set status = 'ISSUED' where id = $1", [version.id]);
    const documentResult = await clientConn.query("update documents set status = 'ISSUED', current_version_id = $1 where id = $2 returning id::text, tenant_id::text, firm_id::text, project_id::text, relationship_id::text, document_type, title, current_version_id::text, status, classification, created_at", [version.id, version.document_id]);
    const projectResult = await clientConn.query("update projects set project_state = 'DELIVERABLE_ISSUED', updated_at = $1 where id = $2 returning id::text, tenant_id::text, firm_id::text, relationship_id::text, engagement_id::text, service_id::text, project_name, project_state, risk_class, responsible_professional_id::text, created_at, updated_at", [now(), body.project_id]);
    await clientConn.query("commit");
    const document = mapDbDates(documentResult.rows[0]);
    const updatedVersion = { ...version, status: "ISSUED" };
    const project = projectResult.rowCount ? mapDbDates(projectResult.rows[0]) : null;
    await withAppState((store) => { appendEventAndAudit(store, { event_type: "deliverable.issued", actor, tenant_id: body.tenant_id, firm_id: body.firm_id, aggregate_type: "DocumentVersion", aggregate_id: version.id, payload: { document_id: document.id, document_version_id: version.id }, summary: "Deliverable issued after evidence and professional review.", policy_decision_id: policyDecision?.id ?? null }); return document; });
    return { document, document_version: updatedVersion, project };
  } catch (error) {
    await clientConn.query("rollback");
    throw error;
  } finally {
    clientConn.release();
  }
}
export async function createInvoiceRecord(body) {
  if (storeBackend !== "postgres") {
    return withStore((store) => {
      const actor = body.actor ?? systemActor(body.tenant_id, body.firm_id);
      const invoice = buildInvoice(body, store.invoices.length + 1);
      store.invoices.push(invoice);
      appendEventAndAudit(store, { event_type: "invoice.created", actor, tenant_id: body.tenant_id, firm_id: body.firm_id, aggregate_type: "Invoice", aggregate_id: invoice.id, payload: { invoice_id: invoice.id }, summary: "Invoice created." });
      return invoice;
    });
  }

  const clientConn = await getPool().connect();
  try {
    await clientConn.query("begin");
    await setTenantContext(clientConn, body.tenant_id);
    const relationshipResult = await clientConn.query("select id from firm_client_relationships where id = $1 and tenant_id = $2 and firm_id = $3", [body.relationship_id, body.tenant_id, body.firm_id]);
    if (relationshipResult.rowCount === 0) throwNotFound("firm_client_relationships", body.relationship_id);
    const countResult = await clientConn.query("select count(*)::int as count from invoices where tenant_id = $1 and firm_id = $2", [body.tenant_id, body.firm_id]);
    const actor = body.actor ?? systemActor(body.tenant_id, body.firm_id);
    const invoice = buildInvoice(body, Number(countResult.rows[0].count) + 1, { ids: "uuid" });
    await createInvoice(invoice, clientConn);
    await clientConn.query("commit");
    await withAppState((store) => {
      appendEventAndAudit(store, { event_type: "invoice.created", actor, tenant_id: body.tenant_id, firm_id: body.firm_id, aggregate_type: "Invoice", aggregate_id: invoice.id, payload: { invoice_id: invoice.id }, summary: "Invoice created." });
      return invoice;
    });
    return invoice;
  } catch (error) {
    await clientConn.query("rollback");
    throw error;
  } finally {
    clientConn.release();
  }
}





function buildPilotFeedback(body, actor = {}) {
  const relational = storeBackend === "postgres";
  return { id: relational ? newUuid() : newId("pilot_feedback"), tenant_id: body.tenant_id, firm_id: body.firm_id ?? actor.firm_id ?? null, pilot_user_id: body.pilot_user_id ?? null, project_id: body.project_id ?? null, submitted_by_actor_id: actor.actor_id ?? actor.id ?? null, feedback_type: body.feedback_type ?? "GENERAL", sentiment: body.sentiment ?? "NEUTRAL", rating: body.rating === undefined ? null : Number(body.rating), subject: body.subject, feedback_text: body.feedback_text ?? null, created_at: now(), metadata: body.metadata ?? {} };
}

function buildAcceptanceReview(body, actor = {}) {
  const relational = storeBackend === "postgres";
  const timestamp = now();
  return { id: relational ? newUuid() : newId("acceptance_review"), tenant_id: body.tenant_id, firm_id: body.firm_id ?? actor.firm_id ?? null, reviewed_by_actor_id: actor.actor_id ?? actor.id ?? null, review_scope: body.review_scope ?? "FORMWORK_PILOT", criteria: body.criteria ?? [], decision: body.decision ?? "PENDING", evidence_refs: body.evidence_refs ?? [], notes: body.notes ?? null, created_at: timestamp, updated_at: timestamp, metadata: body.metadata ?? {} };
}

function buildImprovementItem(body, actor = {}) {
  const relational = storeBackend === "postgres";
  const timestamp = now();
  return { id: relational ? newUuid() : newId("improvement_item"), tenant_id: body.tenant_id, firm_id: body.firm_id ?? actor.firm_id ?? null, feedback_id: body.feedback_id ?? null, acceptance_review_id: body.acceptance_review_id ?? null, owner_actor_id: body.owner_actor_id ?? actor.actor_id ?? actor.id ?? null, item_type: body.item_type ?? "PRODUCT_IMPROVEMENT", priority: body.priority ?? "P2", status: body.status ?? "OPEN", title: body.title, description: body.description ?? null, target_stage: body.target_stage ?? null, created_at: timestamp, updated_at: timestamp, closed_at: null, metadata: body.metadata ?? {} };
}

export async function createPilotFeedbackRecord(body, actor = systemActor(body.tenant_id, body.firm_id)) {
  const feedback = buildPilotFeedback(body, actor);
  if (storeBackend !== "postgres") return withStore((store)=>{ store.pilot_feedback.push(feedback); appendEventAndAudit(store,{event_type:"pilot_feedback.submitted",actor,tenant_id:feedback.tenant_id,firm_id:feedback.firm_id,aggregate_type:"PilotFeedback",aggregate_id:feedback.id,payload:feedback,summary:"Pilot feedback submitted."}); return feedback; });
  const clientConn = await getPool().connect();
  try { await clientConn.query("begin"); await setTenantContext(clientConn, feedback.tenant_id); await createPilotFeedback({ ...feedback, firm_id: uuidOrNull(feedback.firm_id), pilot_user_id: uuidOrNull(feedback.pilot_user_id), project_id: uuidOrNull(feedback.project_id), submitted_by_actor_id: uuidOrNull(feedback.submitted_by_actor_id) }, clientConn); await clientConn.query("commit"); await withAppState((store)=>{appendEventAndAudit(store,{event_type:"pilot_feedback.submitted",actor,tenant_id:feedback.tenant_id,firm_id:feedback.firm_id,aggregate_type:"PilotFeedback",aggregate_id:feedback.id,payload:feedback,summary:"Pilot feedback submitted."}); return feedback;}); return feedback; } catch (error) { await clientConn.query("rollback"); throw error; } finally { clientConn.release(); }
}

export async function createPilotAcceptanceReviewRecord(body, actor = systemActor(body.tenant_id, body.firm_id)) {
  const review = buildAcceptanceReview(body, actor);
  if (storeBackend !== "postgres") return withStore((store)=>{ store.pilot_acceptance_reviews.push(review); appendEventAndAudit(store,{event_type:"pilot_acceptance.reviewed",actor,tenant_id:review.tenant_id,firm_id:review.firm_id,aggregate_type:"PilotAcceptanceReview",aggregate_id:review.id,payload:review,summary:"Pilot acceptance reviewed."}); return review; });
  const clientConn = await getPool().connect();
  try { await clientConn.query("begin"); await setTenantContext(clientConn, review.tenant_id); await createPilotAcceptanceReview({ ...review, firm_id: uuidOrNull(review.firm_id), reviewed_by_actor_id: uuidOrNull(review.reviewed_by_actor_id) }, clientConn); await clientConn.query("commit"); await withAppState((store)=>{appendEventAndAudit(store,{event_type:"pilot_acceptance.reviewed",actor,tenant_id:review.tenant_id,firm_id:review.firm_id,aggregate_type:"PilotAcceptanceReview",aggregate_id:review.id,payload:review,summary:"Pilot acceptance reviewed."}); return review;}); return review; } catch (error) { await clientConn.query("rollback"); throw error; } finally { clientConn.release(); }
}

export async function createPilotImprovementItemRecord(body, actor = systemActor(body.tenant_id, body.firm_id)) {
  const item = buildImprovementItem(body, actor);
  if (storeBackend !== "postgres") return withStore((store)=>{ store.pilot_improvement_items.push(item); appendEventAndAudit(store,{event_type:"pilot_improvement.created",actor,tenant_id:item.tenant_id,firm_id:item.firm_id,aggregate_type:"PilotImprovementItem",aggregate_id:item.id,payload:item,summary:"Pilot improvement item created."}); return item; });
  const clientConn = await getPool().connect();
  try { await clientConn.query("begin"); await setTenantContext(clientConn, item.tenant_id); await createPilotImprovementItem({ ...item, firm_id: uuidOrNull(item.firm_id), feedback_id: uuidOrNull(item.feedback_id), acceptance_review_id: uuidOrNull(item.acceptance_review_id), owner_actor_id: uuidOrNull(item.owner_actor_id) }, clientConn); await clientConn.query("commit"); await withAppState((store)=>{appendEventAndAudit(store,{event_type:"pilot_improvement.created",actor,tenant_id:item.tenant_id,firm_id:item.firm_id,aggregate_type:"PilotImprovementItem",aggregate_id:item.id,payload:item,summary:"Pilot improvement item created."}); return item;}); return item; } catch (error) { await clientConn.query("rollback"); throw error; } finally { clientConn.release(); }
}

export async function updatePilotImprovementItemRecord(body, actor = systemActor(body.tenant_id, body.firm_id)) {
  const timestamp = now();
  if (storeBackend !== "postgres") return withStore((store)=>{ const item=store.pilot_improvement_items.find((record)=>record.id===body.improvement_item_id && record.tenant_id===body.tenant_id); if(!item) throwNotFound("pilot_improvement_items", body.improvement_item_id); item.status=body.status ?? item.status; item.priority=body.priority ?? item.priority; item.updated_at=timestamp; item.closed_at=["DONE","CLOSED"].includes(body.status) ? timestamp : item.closed_at; appendEventAndAudit(store,{event_type:"pilot_improvement.updated",actor,tenant_id:item.tenant_id,firm_id:item.firm_id,aggregate_type:"PilotImprovementItem",aggregate_id:item.id,payload:item,summary:"Pilot improvement item updated."}); return item; });
  const clientConn = await getPool().connect();
  try { await clientConn.query("begin"); await setTenantContext(clientConn, body.tenant_id); const result=await clientConn.query("update pilot_improvement_items set status=coalesce($1,status), priority=coalesce($2,priority), updated_at=$3, closed_at=case when $1 in ('DONE','CLOSED') then $3 else closed_at end where id=$4 and tenant_id=$5 returning id::text, tenant_id::text, firm_id::text, feedback_id::text, acceptance_review_id::text, owner_actor_id::text, item_type, priority, status, title, description, target_stage, created_at, updated_at, closed_at, metadata",[body.status??null,body.priority??null,timestamp,body.improvement_item_id,body.tenant_id]); if(result.rowCount===0) throwNotFound("pilot_improvement_items", body.improvement_item_id); const item=mapDbDates(result.rows[0]); await clientConn.query("commit"); await withAppState((store)=>{appendEventAndAudit(store,{event_type:"pilot_improvement.updated",actor,tenant_id:item.tenant_id,firm_id:item.firm_id,aggregate_type:"PilotImprovementItem",aggregate_id:item.id,payload:item,summary:"Pilot improvement item updated."}); return item;}); return item; } catch (error) { await clientConn.query("rollback"); throw error; } finally { clientConn.release(); }
}




function buildPaymentProviderConfig(body, actor = {}) {
  const relational = storeBackend === "postgres";
  const timestamp = now();
  return { id: relational ? newUuid() : newId("payment_provider"), tenant_id: body.tenant_id, firm_id: body.firm_id ?? actor.firm_id ?? null, configured_by_actor_id: actor.actor_id ?? actor.id ?? null, provider_name: body.provider_name ?? "stripe", provider_mode: body.provider_mode ?? "test", config_status: body.config_status ?? "DRAFT", capabilities: body.capabilities ?? ["subscriptions", "usage_metering", "invoices"], required_env: body.required_env ?? ["PAYMENT_PROVIDER_SECRET_KEY", "PAYMENT_WEBHOOK_SECRET"], created_at: timestamp, updated_at: timestamp, metadata: body.metadata ?? {} };
}

function buildSubscriptionPackage(body, actor = {}) {
  const relational = storeBackend === "postgres";
  const timestamp = now();
  return { id: relational ? newUuid() : newId("subscription_package"), tenant_id: body.tenant_id, firm_id: body.firm_id ?? actor.firm_id ?? null, created_by_actor_id: actor.actor_id ?? actor.id ?? null, package_code: body.package_code ?? "VF-PILOT-PRO", package_name: body.package_name ?? "vFirm Pilot Pro", package_status: body.package_status ?? "DRAFT", pricing_model: body.pricing_model ?? "SUBSCRIPTION_PLUS_USAGE", base_price: Number(body.base_price ?? 0), currency: body.currency ?? "MYR", usage_limits: body.usage_limits ?? { pilot_users: 5, projects: 3, ai_tool_invocations: 50 }, features: body.features ?? ["Formwork pilot workspace", "AI workforce assistive runtime", "audit trail", "support desk"], created_at: timestamp, updated_at: timestamp, metadata: body.metadata ?? {} };
}

function buildCommercialLaunchControl(body, actor = {}) {
  const relational = storeBackend === "postgres";
  const timestamp = now();
  const launchStatus = body.launch_status ?? "BLOCKED";
  return { id: relational ? newUuid() : newId("commercial_launch"), tenant_id: body.tenant_id, firm_id: body.firm_id ?? actor.firm_id ?? null, payment_provider_config_id: body.payment_provider_config_id ?? null, subscription_package_id: body.subscription_package_id ?? null, reviewed_by_actor_id: actor.actor_id ?? actor.id ?? null, launch_status: launchStatus, required_controls: body.required_controls ?? ["billing readiness reviewed", "payment provider configured", "subscription package approved", "tax/legal review pending before live capture"], decision_summary: body.decision_summary ?? null, created_at: timestamp, decided_at: ["APPROVED_TEST_MODE","APPROVED_LIVE_PREP","BLOCKED"].includes(launchStatus) ? timestamp : null, metadata: body.metadata ?? {} };
}

export async function createPaymentProviderConfigRecord(body, actor = systemActor(body.tenant_id, body.firm_id)) {
  const config = buildPaymentProviderConfig(body, actor);
  if (storeBackend !== "postgres") return withStore((store)=>{ store.payment_provider_configs.push(config); appendEventAndAudit(store,{event_type:"payment_provider.config_created",actor,tenant_id:config.tenant_id,firm_id:config.firm_id,aggregate_type:"PaymentProviderConfig",aggregate_id:config.id,payload:config,summary:"Payment provider configuration prepared."}); return config; });
  const c=await getPool().connect(); try{ await c.query("begin"); await setTenantContext(c, config.tenant_id); await createPaymentProviderConfig({ ...config, firm_id: uuidOrNull(config.firm_id), configured_by_actor_id: uuidOrNull(config.configured_by_actor_id) }, c); await c.query("commit"); await withAppState((store)=>{appendEventAndAudit(store,{event_type:"payment_provider.config_created",actor,tenant_id:config.tenant_id,firm_id:config.firm_id,aggregate_type:"PaymentProviderConfig",aggregate_id:config.id,payload:config,summary:"Payment provider configuration prepared."}); return config;}); return config;} catch (error) { await c.query("rollback"); throw error; } finally{c.release();}
}

export async function createSubscriptionPackageRecord(body, actor = systemActor(body.tenant_id, body.firm_id)) {
  const pack = buildSubscriptionPackage(body, actor);
  if (storeBackend !== "postgres") return withStore((store)=>{ store.subscription_packages.push(pack); appendEventAndAudit(store,{event_type:"subscription_package.created",actor,tenant_id:pack.tenant_id,firm_id:pack.firm_id,aggregate_type:"SubscriptionPackage",aggregate_id:pack.id,payload:pack,summary:"Subscription package created."}); return pack; });
  const c=await getPool().connect(); try{ await c.query("begin"); await setTenantContext(c, pack.tenant_id); await createSubscriptionPackage({ ...pack, firm_id: uuidOrNull(pack.firm_id), created_by_actor_id: uuidOrNull(pack.created_by_actor_id) }, c); await c.query("commit"); await withAppState((store)=>{appendEventAndAudit(store,{event_type:"subscription_package.created",actor,tenant_id:pack.tenant_id,firm_id:pack.firm_id,aggregate_type:"SubscriptionPackage",aggregate_id:pack.id,payload:pack,summary:"Subscription package created."}); return pack;}); return pack;} catch (error) { await c.query("rollback"); throw error; } finally{c.release();}
}

export async function createCommercialLaunchControlRecord(body, actor = systemActor(body.tenant_id, body.firm_id)) {
  const control = buildCommercialLaunchControl(body, actor);
  if (storeBackend !== "postgres") return withStore((store)=>{ store.commercial_launch_controls.push(control); appendEventAndAudit(store,{event_type:"commercial_launch.control_recorded",actor,tenant_id:control.tenant_id,firm_id:control.firm_id,aggregate_type:"CommercialLaunchControl",aggregate_id:control.id,payload:control,summary:"Commercial launch control recorded."}); return control; });
  const c=await getPool().connect(); try{ await c.query("begin"); await setTenantContext(c, control.tenant_id); await createCommercialLaunchControl({ ...control, firm_id: uuidOrNull(control.firm_id), payment_provider_config_id: uuidOrNull(control.payment_provider_config_id), subscription_package_id: uuidOrNull(control.subscription_package_id), reviewed_by_actor_id: uuidOrNull(control.reviewed_by_actor_id) }, c); await c.query("commit"); await withAppState((store)=>{appendEventAndAudit(store,{event_type:"commercial_launch.control_recorded",actor,tenant_id:control.tenant_id,firm_id:control.firm_id,aggregate_type:"CommercialLaunchControl",aggregate_id:control.id,payload:control,summary:"Commercial launch control recorded."}); return control;}); return control;} catch (error) { await c.query("rollback"); throw error; } finally{c.release();}
}
function buildTenantPilotControl(body, actor = {}) {
  const relational = storeBackend === "postgres";
  const timestamp = now();
  return { id: relational ? newUuid() : newId("tenant_control"), tenant_id: body.tenant_id, firm_id: body.firm_id ?? actor.firm_id ?? null, created_by_actor_id: actor.actor_id ?? actor.id ?? null, control_status: body.control_status ?? "ACTIVE", plan_code: body.plan_code ?? "PILOT_FREE_CONTROLLED", limits: body.limits ?? { pilot_users: 5, projects: 3, ai_tool_invocations: 50, storage_mb: 500 }, billing_readiness: body.billing_readiness ?? "NOT_READY", created_at: timestamp, updated_at: timestamp, metadata: body.metadata ?? {} };
}

function buildTenantUsageEvent(body, actor = {}) {
  const relational = storeBackend === "postgres";
  return { id: relational ? newUuid() : newId("usage_event"), tenant_id: body.tenant_id, firm_id: body.firm_id ?? actor.firm_id ?? null, actor_id: actor.actor_id ?? actor.id ?? null, usage_type: body.usage_type, quantity: Number(body.quantity ?? 1), unit: body.unit ?? "event", source_ref: body.source_ref ?? null, recorded_at: now(), metadata: body.metadata ?? {} };
}

function buildBillingReadinessReview(body, actor = {}) {
  const relational = storeBackend === "postgres";
  return { id: relational ? newUuid() : newId("billing_review"), tenant_id: body.tenant_id, firm_id: body.firm_id ?? actor.firm_id ?? null, reviewed_by_actor_id: actor.actor_id ?? actor.id ?? null, readiness_status: body.readiness_status ?? "NOT_READY", pricing_model: body.pricing_model ?? "PILOT_USAGE_REVIEW", checks: body.checks ?? ["usage limits configured", "billing policy reviewed", "no live payment capture", "tenant export available"], decision_summary: body.decision_summary ?? null, created_at: now(), metadata: body.metadata ?? {} };
}

export async function createTenantPilotControlRecord(body, actor = systemActor(body.tenant_id, body.firm_id)) {
  const control = buildTenantPilotControl(body, actor);
  if (storeBackend !== "postgres") return withStore((store)=>{ store.tenant_pilot_controls.push(control); appendEventAndAudit(store,{event_type:"tenant_pilot_control.created",actor,tenant_id:control.tenant_id,firm_id:control.firm_id,aggregate_type:"TenantPilotControl",aggregate_id:control.id,payload:control,summary:"Tenant pilot control created."}); return control; });
  const c=await getPool().connect(); try{ await c.query("begin"); await setTenantContext(c, control.tenant_id); await createTenantPilotControl({ ...control, firm_id: uuidOrNull(control.firm_id), created_by_actor_id: uuidOrNull(control.created_by_actor_id) }, c); await c.query("commit"); await withAppState((store)=>{appendEventAndAudit(store,{event_type:"tenant_pilot_control.created",actor,tenant_id:control.tenant_id,firm_id:control.firm_id,aggregate_type:"TenantPilotControl",aggregate_id:control.id,payload:control,summary:"Tenant pilot control created."}); return control;}); return control;} catch (error) { await c.query("rollback"); throw error; } finally{c.release();}
}

export async function recordTenantUsageEventRecord(body, actor = systemActor(body.tenant_id, body.firm_id)) {
  const usage = buildTenantUsageEvent(body, actor);
  if (storeBackend !== "postgres") return withStore((store)=>{ store.tenant_usage_events.push(usage); appendEventAndAudit(store,{event_type:"tenant_usage.recorded",actor,tenant_id:usage.tenant_id,firm_id:usage.firm_id,aggregate_type:"TenantUsageEvent",aggregate_id:usage.id,payload:usage,summary:"Tenant usage recorded."}); return usage; });
  const c=await getPool().connect(); try{ await c.query("begin"); await setTenantContext(c, usage.tenant_id); await createTenantUsageEvent({ ...usage, firm_id: uuidOrNull(usage.firm_id), actor_id: uuidOrNull(usage.actor_id) }, c); await c.query("commit"); await withAppState((store)=>{appendEventAndAudit(store,{event_type:"tenant_usage.recorded",actor,tenant_id:usage.tenant_id,firm_id:usage.firm_id,aggregate_type:"TenantUsageEvent",aggregate_id:usage.id,payload:usage,summary:"Tenant usage recorded."}); return usage;}); return usage;} catch (error) { await c.query("rollback"); throw error; } finally{c.release();}
}

export async function createBillingReadinessReviewRecord(body, actor = systemActor(body.tenant_id, body.firm_id)) {
  const review = buildBillingReadinessReview(body, actor);
  if (storeBackend !== "postgres") return withStore((store)=>{ store.billing_readiness_reviews.push(review); appendEventAndAudit(store,{event_type:"billing_readiness.reviewed",actor,tenant_id:review.tenant_id,firm_id:review.firm_id,aggregate_type:"BillingReadinessReview",aggregate_id:review.id,payload:review,summary:"Billing readiness reviewed."}); return review; });
  const c=await getPool().connect(); try{ await c.query("begin"); await setTenantContext(c, review.tenant_id); await createBillingReadinessReview({ ...review, firm_id: uuidOrNull(review.firm_id), reviewed_by_actor_id: uuidOrNull(review.reviewed_by_actor_id) }, c); await c.query("commit"); await withAppState((store)=>{appendEventAndAudit(store,{event_type:"billing_readiness.reviewed",actor,tenant_id:review.tenant_id,firm_id:review.firm_id,aggregate_type:"BillingReadinessReview",aggregate_id:review.id,payload:review,summary:"Billing readiness reviewed."}); return review;}); return review;} catch (error) { await c.query("rollback"); throw error; } finally{c.release();}
}
function buildPilotExpansionCohort(body, actor = {}) {
  const relational = storeBackend === "postgres";
  const timestamp = now();
  return { id: relational ? newUuid() : newId("expansion_cohort"), tenant_id: body.tenant_id, firm_id: body.firm_id ?? actor.firm_id ?? null, stakeholder_decision_id: body.stakeholder_decision_id ?? null, created_by_actor_id: actor.actor_id ?? actor.id ?? null, cohort_name: body.cohort_name ?? "Controlled Pilot Expansion Cohort", expansion_status: body.expansion_status ?? "PROPOSED", max_tenants: Number(body.max_tenants ?? 1), max_pilot_users: Number(body.max_pilot_users ?? 5), entry_criteria: body.entry_criteria ?? ["stakeholder expansion approval", "no active SEV1 incidents", "tenant onboarding plan required"], risk_controls: body.risk_controls ?? ["tenant scoped access", "human approval gates", "support desk and incident monitoring"], created_at: timestamp, updated_at: timestamp, metadata: body.metadata ?? {} };
}

function buildTenantOnboardingPlan(body, actor = {}) {
  const relational = storeBackend === "postgres";
  const timestamp = now();
  return { id: relational ? newUuid() : newId("onboarding_plan"), tenant_id: body.tenant_id, firm_id: body.firm_id ?? actor.firm_id ?? null, expansion_cohort_id: body.expansion_cohort_id ?? null, assigned_operator_actor_id: actor.actor_id ?? actor.id ?? null, onboarding_status: body.onboarding_status ?? "DRAFT", onboarding_steps: body.onboarding_steps ?? ["confirm tenant owner", "invite pilot users", "configure auth", "run Formwork pilot workflow", "review support readiness"], readiness_checks: body.readiness_checks ?? ["database migrated", "auth provider configured", "support desk ready", "incident response ready"], target_start_at: body.target_start_at ?? null, created_at: timestamp, updated_at: timestamp, completed_at: null, metadata: body.metadata ?? {} };
}

function buildReleaseCandidateGate(body, actor = {}) {
  const relational = storeBackend === "postgres";
  const timestamp = now();
  return { id: relational ? newUuid() : newId("rc_gate"), tenant_id: body.tenant_id, firm_id: body.firm_id ?? actor.firm_id ?? null, expansion_cohort_id: body.expansion_cohort_id ?? null, reviewed_by_actor_id: actor.actor_id ?? actor.id ?? null, release_candidate: body.release_candidate ?? "RC-LOCAL-PILOT", gate_status: body.gate_status ?? "PENDING", required_checks: body.required_checks ?? ["npm run check", "npm run check:db:postgres", "stakeholder review decision recorded", "onboarding plan complete"], evidence_refs: body.evidence_refs ?? [], decision_summary: body.decision_summary ?? null, created_at: timestamp, decided_at: ["APPROVED","REJECTED","HOLD"].includes(body.gate_status) ? timestamp : null, metadata: body.metadata ?? {} };
}

export async function createPilotExpansionCohortRecord(body, actor = systemActor(body.tenant_id, body.firm_id)) {
  const cohort = buildPilotExpansionCohort(body, actor);
  if (storeBackend !== "postgres") return withStore((store)=>{ store.pilot_expansion_cohorts.push(cohort); appendEventAndAudit(store,{event_type:"pilot_expansion.cohort_created",actor,tenant_id:cohort.tenant_id,firm_id:cohort.firm_id,aggregate_type:"PilotExpansionCohort",aggregate_id:cohort.id,payload:cohort,summary:"Controlled pilot expansion cohort created."}); return cohort; });
  const c=await getPool().connect(); try{ await c.query("begin"); await setTenantContext(c, cohort.tenant_id); await createPilotExpansionCohort({ ...cohort, firm_id: uuidOrNull(cohort.firm_id), stakeholder_decision_id: uuidOrNull(cohort.stakeholder_decision_id), created_by_actor_id: uuidOrNull(cohort.created_by_actor_id) }, c); await c.query("commit"); await withAppState((store)=>{appendEventAndAudit(store,{event_type:"pilot_expansion.cohort_created",actor,tenant_id:cohort.tenant_id,firm_id:cohort.firm_id,aggregate_type:"PilotExpansionCohort",aggregate_id:cohort.id,payload:cohort,summary:"Controlled pilot expansion cohort created."}); return cohort;}); return cohort;} catch (error) { await c.query("rollback"); throw error; } finally{c.release();}
}

export async function updatePilotExpansionCohortRecord(body, actor = systemActor(body.tenant_id, body.firm_id)) {
  const timestamp=now();
  if (storeBackend !== "postgres") return withStore((store)=>{ const cohort=store.pilot_expansion_cohorts.find((item)=>item.id===body.expansion_cohort_id&&item.tenant_id===body.tenant_id); if(!cohort) throwNotFound("pilot_expansion_cohorts", body.expansion_cohort_id); cohort.expansion_status=body.expansion_status??cohort.expansion_status; cohort.updated_at=timestamp; appendEventAndAudit(store,{event_type:"pilot_expansion.cohort_updated",actor,tenant_id:cohort.tenant_id,firm_id:cohort.firm_id,aggregate_type:"PilotExpansionCohort",aggregate_id:cohort.id,payload:cohort,summary:"Controlled pilot expansion cohort updated."}); return cohort; });
  const c=await getPool().connect(); try{ await c.query("begin"); await setTenantContext(c, body.tenant_id); const result=await c.query("update pilot_expansion_cohorts set expansion_status=coalesce($1,expansion_status), updated_at=$2 where id=$3 and tenant_id=$4 returning id::text, tenant_id::text, firm_id::text, stakeholder_decision_id::text, created_by_actor_id::text, cohort_name, expansion_status, max_tenants, max_pilot_users, entry_criteria, risk_controls, created_at, updated_at, metadata",[body.expansion_status??null,timestamp,body.expansion_cohort_id,body.tenant_id]); if(result.rowCount===0) throwNotFound("pilot_expansion_cohorts", body.expansion_cohort_id); const cohort=mapDbDates(result.rows[0]); await c.query("commit"); await withAppState((store)=>{appendEventAndAudit(store,{event_type:"pilot_expansion.cohort_updated",actor,tenant_id:cohort.tenant_id,firm_id:cohort.firm_id,aggregate_type:"PilotExpansionCohort",aggregate_id:cohort.id,payload:cohort,summary:"Controlled pilot expansion cohort updated."}); return cohort;}); return cohort;} catch (error) { await c.query("rollback"); throw error; } finally{c.release();}
}

export async function activatePrivatePilotCohortRecord(body, actor = systemActor(body.tenant_id, body.firm_id)) {
  const timestamp = now();
  const metadataPatch = {
    ...(body.metadata ?? {}),
    private_pilot_activation: {
      activated_at: timestamp,
      activated_by_actor_id: actor.actor_id ?? actor.id ?? null,
      accepted_prior_evidence_required: body.activation_gate?.accepted_prior_evidence_required ?? ["R4-S1", "R4-S2", "R4-S3", "R4-S4"],
      activation_checks: body.activation_gate?.checks ?? [],
      activation_status: body.activation_gate?.status ?? "READY_FOR_PRIVATE_PILOT"
    }
  };
  if (storeBackend !== "postgres") return withStore((store)=>{ const cohort=store.pilot_expansion_cohorts.find((item)=>item.id===body.expansion_cohort_id&&item.tenant_id===body.tenant_id); if(!cohort) throwNotFound("pilot_expansion_cohorts", body.expansion_cohort_id); cohort.expansion_status="PRIVATE_PILOT_ACTIVE"; cohort.updated_at=timestamp; cohort.metadata={...(cohort.metadata??{}), ...metadataPatch}; appendEventAndAudit(store,{event_type:"pilot_private_cohort.activated",actor,tenant_id:cohort.tenant_id,firm_id:cohort.firm_id,aggregate_type:"PilotExpansionCohort",aggregate_id:cohort.id,payload:{cohort_id:cohort.id, status:cohort.expansion_status, activation_gate:body.activation_gate},summary:"Private pilot cohort activated after R4-S1 through R4-S4 evidence gates passed."}); return cohort; });
  const c=await getPool().connect(); try{ await c.query("begin"); await setTenantContext(c, body.tenant_id); const result=await c.query("update pilot_expansion_cohorts set expansion_status='PRIVATE_PILOT_ACTIVE', updated_at=$1, metadata = metadata || $2::jsonb where id=$3 and tenant_id=$4 returning id::text, tenant_id::text, firm_id::text, stakeholder_decision_id::text, created_by_actor_id::text, cohort_name, expansion_status, max_tenants, max_pilot_users, entry_criteria, risk_controls, created_at, updated_at, metadata",[timestamp,JSON.stringify(metadataPatch),body.expansion_cohort_id,body.tenant_id]); if(result.rowCount===0) throwNotFound("pilot_expansion_cohorts", body.expansion_cohort_id); const cohort=mapDbDates(result.rows[0]); await c.query("commit"); await withAppState((store)=>{appendEventAndAudit(store,{event_type:"pilot_private_cohort.activated",actor,tenant_id:cohort.tenant_id,firm_id:cohort.firm_id,aggregate_type:"PilotExpansionCohort",aggregate_id:cohort.id,payload:{cohort_id:cohort.id, status:cohort.expansion_status, activation_gate:body.activation_gate},summary:"Private pilot cohort activated after R4-S1 through R4-S4 evidence gates passed."}); return cohort;}); return cohort;} catch (error) { await c.query("rollback"); throw error; } finally{c.release();}
}

export async function createTenantOnboardingPlanRecord(body, actor = systemActor(body.tenant_id, body.firm_id)) {
  const plan = buildTenantOnboardingPlan(body, actor);
  if (storeBackend !== "postgres") return withStore((store)=>{ store.tenant_onboarding_plans.push(plan); appendEventAndAudit(store,{event_type:"tenant_onboarding.plan_created",actor,tenant_id:plan.tenant_id,firm_id:plan.firm_id,aggregate_type:"TenantOnboardingPlan",aggregate_id:plan.id,payload:plan,summary:"Tenant onboarding plan created."}); return plan; });
  const c=await getPool().connect(); try{ await c.query("begin"); await setTenantContext(c, plan.tenant_id); await createTenantOnboardingPlan({ ...plan, firm_id: uuidOrNull(plan.firm_id), expansion_cohort_id: uuidOrNull(plan.expansion_cohort_id), assigned_operator_actor_id: uuidOrNull(plan.assigned_operator_actor_id) }, c); await c.query("commit"); await withAppState((store)=>{appendEventAndAudit(store,{event_type:"tenant_onboarding.plan_created",actor,tenant_id:plan.tenant_id,firm_id:plan.firm_id,aggregate_type:"TenantOnboardingPlan",aggregate_id:plan.id,payload:plan,summary:"Tenant onboarding plan created."}); return plan;}); return plan;} catch (error) { await c.query("rollback"); throw error; } finally{c.release();}
}

export async function updateTenantOnboardingPlanRecord(body, actor = systemActor(body.tenant_id, body.firm_id)) {
  const timestamp=now();
  if (storeBackend !== "postgres") return withStore((store)=>{ const plan=store.tenant_onboarding_plans.find((item)=>item.id===body.onboarding_plan_id&&item.tenant_id===body.tenant_id); if(!plan) throwNotFound("tenant_onboarding_plans", body.onboarding_plan_id); plan.onboarding_status=body.onboarding_status??plan.onboarding_status; plan.updated_at=timestamp; plan.completed_at=body.onboarding_status==="COMPLETE"?timestamp:plan.completed_at; appendEventAndAudit(store,{event_type:"tenant_onboarding.plan_updated",actor,tenant_id:plan.tenant_id,firm_id:plan.firm_id,aggregate_type:"TenantOnboardingPlan",aggregate_id:plan.id,payload:plan,summary:"Tenant onboarding plan updated."}); return plan; });
  const c=await getPool().connect(); try{ await c.query("begin"); await setTenantContext(c, body.tenant_id); const result=await c.query("update tenant_onboarding_plans set onboarding_status=coalesce($1,onboarding_status), updated_at=$2, completed_at=case when $1='COMPLETE' then $2 else completed_at end where id=$3 and tenant_id=$4 returning id::text, tenant_id::text, firm_id::text, expansion_cohort_id::text, assigned_operator_actor_id::text, onboarding_status, onboarding_steps, readiness_checks, target_start_at, created_at, updated_at, completed_at, metadata",[body.onboarding_status??null,timestamp,body.onboarding_plan_id,body.tenant_id]); if(result.rowCount===0) throwNotFound("tenant_onboarding_plans", body.onboarding_plan_id); const plan=mapDbDates(result.rows[0]); await c.query("commit"); await withAppState((store)=>{appendEventAndAudit(store,{event_type:"tenant_onboarding.plan_updated",actor,tenant_id:plan.tenant_id,firm_id:plan.firm_id,aggregate_type:"TenantOnboardingPlan",aggregate_id:plan.id,payload:plan,summary:"Tenant onboarding plan updated."}); return plan;}); return plan;} catch (error) { await c.query("rollback"); throw error; } finally{c.release();}
}

export async function createReleaseCandidateGateRecord(body, actor = systemActor(body.tenant_id, body.firm_id)) {
  const gate = buildReleaseCandidateGate(body, actor);
  if (storeBackend !== "postgres") return withStore((store)=>{ store.release_candidate_gates.push(gate); appendEventAndAudit(store,{event_type:"release_candidate.gate_recorded",actor,tenant_id:gate.tenant_id,firm_id:gate.firm_id,aggregate_type:"ReleaseCandidateGate",aggregate_id:gate.id,payload:gate,summary:"Release candidate governance gate recorded."}); return gate; });
  const c=await getPool().connect(); try{ await c.query("begin"); await setTenantContext(c, gate.tenant_id); await createReleaseCandidateGate({ ...gate, firm_id: uuidOrNull(gate.firm_id), expansion_cohort_id: uuidOrNull(gate.expansion_cohort_id), reviewed_by_actor_id: uuidOrNull(gate.reviewed_by_actor_id) }, c); await c.query("commit"); await withAppState((store)=>{appendEventAndAudit(store,{event_type:"release_candidate.gate_recorded",actor,tenant_id:gate.tenant_id,firm_id:gate.firm_id,aggregate_type:"ReleaseCandidateGate",aggregate_id:gate.id,payload:gate,summary:"Release candidate governance gate recorded."}); return gate;}); return gate;} catch (error) { await c.query("rollback"); throw error; } finally{c.release();}
}
function pilotReportSummary(store, tenant_id, firm_id = null) {
  const scope = (records) => (records ?? []).filter((item)=> (!tenant_id || item.tenant_id === tenant_id) && (!firm_id || item.firm_id === firm_id));
  const feedback = scope(store.pilot_feedback);
  const improvements = scope(store.pilot_improvement_items);
  const incidents = scope(store.pilot_incidents);
  const support = scope(store.support_cases);
  const reviews = scope(store.pilot_acceptance_reviews);
  const events = scope(store.event_log);
  const ratings = feedback.map((item)=>Number(item.rating)).filter(Number.isFinite);
  return {
    generated_at: now(),
    counts: {
      feedback: feedback.length,
      acceptance_reviews: reviews.length,
      improvement_items: improvements.length,
      open_improvements: improvements.filter((item)=>!["DONE","CLOSED"].includes(item.status)).length,
      incidents: incidents.length,
      active_incidents: incidents.filter((item)=>!["RESOLVED","CLOSED"].includes(item.status)).length,
      support_cases: support.length,
      open_support_cases: support.filter((item)=>item.status!=="CLOSED").length,
      events: events.length
    },
    rating_average: ratings.length ? Number((ratings.reduce((a,b)=>a+b,0)/ratings.length).toFixed(2)) : null,
    readiness: improvements.some((item)=>["P0","P1"].includes(item.priority)&&!["DONE","CLOSED"].includes(item.status)) ? "CONDITIONAL" : incidents.some((item)=>!["RESOLVED","CLOSED"].includes(item.status)) ? "INCIDENT_REVIEW_REQUIRED" : "READY_FOR_REVIEW"
  };
}

function buildPilotReportPack(body, actor = {}, store = initialStore()) {
  const relational = storeBackend === "postgres";
  const summary = body.summary ?? pilotReportSummary(store, body.tenant_id, body.firm_id ?? actor.firm_id ?? null);
  return { id: relational ? newUuid() : newId("pilot_report"), tenant_id: body.tenant_id, firm_id: body.firm_id ?? actor.firm_id ?? null, generated_by_actor_id: actor.actor_id ?? actor.id ?? null, report_scope: body.report_scope ?? "FORMWORK_PILOT", report_status: body.report_status ?? "GENERATED", summary, export_manifest: body.export_manifest ?? { includes:["pilot_feedback","pilot_acceptance_reviews","pilot_improvement_items","pilot_incidents","support_cases","event_log"], format:"json", tenant_scoped:true }, created_at: now(), metadata: body.metadata ?? {} };
}

function buildStakeholderReviewBoard(body, actor = {}) {
  const relational = storeBackend === "postgres";
  const timestamp = now();
  return { id: relational ? newUuid() : newId("review_board"), tenant_id: body.tenant_id, firm_id: body.firm_id ?? actor.firm_id ?? null, report_pack_id: body.report_pack_id ?? null, chaired_by_actor_id: actor.actor_id ?? actor.id ?? null, board_name: body.board_name ?? "Pilot Stakeholder Review Board", review_status: body.review_status ?? "OPEN", agenda: body.agenda ?? ["Review pilot report pack", "Review acceptance criteria", "Decide next stage"], attendees: body.attendees ?? [], scheduled_at: body.scheduled_at ?? null, created_at: timestamp, updated_at: timestamp, closed_at: null, metadata: body.metadata ?? {} };
}

function buildStakeholderReviewDecision(body, actor = {}) {
  const relational = storeBackend === "postgres";
  return { id: relational ? newUuid() : newId("review_decision"), tenant_id: body.tenant_id, firm_id: body.firm_id ?? actor.firm_id ?? null, board_id: body.board_id, decided_by_actor_id: actor.actor_id ?? actor.id ?? null, decision: body.decision ?? "PENDING", decision_summary: body.decision_summary ?? null, conditions: body.conditions ?? [], next_stage: body.next_stage ?? null, decided_at: now(), metadata: body.metadata ?? {} };
}

export async function createPilotReportPackRecord(body, actor = systemActor(body.tenant_id, body.firm_id)) {
  const store = await readStore();
  const pack = buildPilotReportPack(body, actor, store);
  if (storeBackend !== "postgres") return withStore((store)=>{ store.pilot_report_packs.push(pack); appendEventAndAudit(store,{event_type:"pilot_report_pack.generated",actor,tenant_id:pack.tenant_id,firm_id:pack.firm_id,aggregate_type:"PilotReportPack",aggregate_id:pack.id,payload:pack,summary:"Pilot report pack generated."}); return pack; });
  const clientConn = await getPool().connect();
  try { await clientConn.query("begin"); await setTenantContext(clientConn, pack.tenant_id); await createPilotReportPack({ ...pack, firm_id: uuidOrNull(pack.firm_id), generated_by_actor_id: uuidOrNull(pack.generated_by_actor_id) }, clientConn); await clientConn.query("commit"); await withAppState((store)=>{appendEventAndAudit(store,{event_type:"pilot_report_pack.generated",actor,tenant_id:pack.tenant_id,firm_id:pack.firm_id,aggregate_type:"PilotReportPack",aggregate_id:pack.id,payload:pack,summary:"Pilot report pack generated."}); return pack;}); return pack; } catch (error) { await clientConn.query("rollback"); throw error; } finally { clientConn.release(); }
}

export async function createStakeholderReviewBoardRecord(body, actor = systemActor(body.tenant_id, body.firm_id)) {
  const board = buildStakeholderReviewBoard(body, actor);
  if (storeBackend !== "postgres") return withStore((store)=>{ store.stakeholder_review_boards.push(board); appendEventAndAudit(store,{event_type:"stakeholder_review_board.opened",actor,tenant_id:board.tenant_id,firm_id:board.firm_id,aggregate_type:"StakeholderReviewBoard",aggregate_id:board.id,payload:board,summary:"Stakeholder review board opened."}); return board; });
  const clientConn = await getPool().connect();
  try { await clientConn.query("begin"); await setTenantContext(clientConn, board.tenant_id); await createStakeholderReviewBoard({ ...board, firm_id: uuidOrNull(board.firm_id), report_pack_id: uuidOrNull(board.report_pack_id), chaired_by_actor_id: uuidOrNull(board.chaired_by_actor_id) }, clientConn); await clientConn.query("commit"); await withAppState((store)=>{appendEventAndAudit(store,{event_type:"stakeholder_review_board.opened",actor,tenant_id:board.tenant_id,firm_id:board.firm_id,aggregate_type:"StakeholderReviewBoard",aggregate_id:board.id,payload:board,summary:"Stakeholder review board opened."}); return board;}); return board; } catch (error) { await clientConn.query("rollback"); throw error; } finally { clientConn.release(); }
}

export async function createStakeholderReviewDecisionRecord(body, actor = systemActor(body.tenant_id, body.firm_id)) {
  const decision = buildStakeholderReviewDecision(body, actor);
  if (storeBackend !== "postgres") return withStore((store)=>{ const board=store.stakeholder_review_boards.find((item)=>item.id===decision.board_id && item.tenant_id===decision.tenant_id); if(!board) throwNotFound("stakeholder_review_boards", decision.board_id); store.stakeholder_review_decisions.push(decision); board.review_status="CLOSED"; board.closed_at=decision.decided_at; board.updated_at=decision.decided_at; appendEventAndAudit(store,{event_type:"stakeholder_review.decision_recorded",actor,tenant_id:decision.tenant_id,firm_id:decision.firm_id,aggregate_type:"StakeholderReviewDecision",aggregate_id:decision.id,payload:decision,summary:"Stakeholder review decision recorded."}); return decision; });
  const clientConn = await getPool().connect();
  try { await clientConn.query("begin"); await setTenantContext(clientConn, decision.tenant_id); const board=await clientConn.query("select id from stakeholder_review_boards where id=$1 and tenant_id=$2",[decision.board_id,decision.tenant_id]); if(board.rowCount===0) throwNotFound("stakeholder_review_boards", decision.board_id); await createStakeholderReviewDecision({ ...decision, firm_id: uuidOrNull(decision.firm_id), decided_by_actor_id: uuidOrNull(decision.decided_by_actor_id) }, clientConn); await updateStakeholderReviewBoard(decision.board_id, { review_status: "CLOSED", closed_at: decision.decided_at, updated_at: decision.decided_at }, clientConn); await clientConn.query("commit"); await withAppState((store)=>{appendEventAndAudit(store,{event_type:"stakeholder_review.decision_recorded",actor,tenant_id:decision.tenant_id,firm_id:decision.firm_id,aggregate_type:"StakeholderReviewDecision",aggregate_id:decision.id,payload:decision,summary:"Stakeholder review decision recorded."}); return decision;}); return decision; } catch(error){ await clientConn.query("rollback"); throw error; } finally { clientConn.release(); }
}
const supportCaseStateTransitions = {
  OPEN: ["TRIAGED", "ESCALATED", "WAITING_ON_USER", "RESOLVED", "CLOSED"],
  TRIAGED: ["ESCALATED", "WAITING_ON_USER", "RESOLVED", "CLOSED"],
  ESCALATED: ["WAITING_ON_USER", "RESOLVED", "CLOSED"],
  WAITING_ON_USER: ["TRIAGED", "ESCALATED", "RESOLVED", "CLOSED"],
  RESOLVED: ["CLOSED"],
  CLOSED: []
};

const pilotIncidentStateTransitions = {
  OPEN: ["TRIAGED", "MITIGATING", "ESCALATED", "RESOLVED", "CLOSED"],
  TRIAGED: ["MITIGATING", "ESCALATED", "RESOLVED", "CLOSED"],
  MITIGATING: ["ESCALATED", "RESOLVED", "CLOSED"],
  ESCALATED: ["MITIGATING", "RESOLVED", "CLOSED"],
  RESOLVED: ["CLOSED"],
  CLOSED: []
};

function assertStateTransition(current, next, transitions, label) {
  if (!next || next === current) return;
  if (!transitions[current]) invalidState(`${label} state is invalid: ${current}.`);
  if (!transitions[current].includes(next)) invalidState(`${label} cannot move from ${current} to ${next}.`);
}

function buildPilotIncident(body, actor = {}, options = {}) {
  const relational = storeBackend === "postgres" || options.ids === "uuid";
  const timestamp = now();
  return {
    id: relational ? newUuid() : newId("pilot_incident"),
    tenant_id: body.tenant_id,
    firm_id: body.firm_id ?? actor.firm_id ?? null,
    support_case_id: body.support_case_id ?? null,
    project_id: body.project_id ?? null,
    opened_by_actor_id: actor.actor_id ?? actor.id ?? body.opened_by_actor_id ?? null,
    incident_type: body.incident_type ?? "OPERATIONAL",
    severity: body.severity ?? "SEV3",
    status: body.status ?? "OPEN",
    title: body.title,
    description: body.description ?? null,
    detection_source: body.detection_source ?? "operator",
    impact_summary: body.impact_summary ?? null,
    mitigation_summary: body.mitigation_summary ?? null,
    root_cause_summary: body.root_cause_summary ?? null,
    created_at: timestamp,
    updated_at: timestamp,
    resolved_at: body.status === "RESOLVED" ? timestamp : null,
    metadata: body.metadata ?? {}
  };
}

export async function createPilotIncidentRecord(body, actor = systemActor(body.tenant_id, body.firm_id)) {
  const incident = buildPilotIncident(body, actor);
  if (storeBackend !== "postgres") return withStore((store)=>{ if(!pilotIncidentStateTransitions[incident.status]) invalidState(`Pilot incident state is invalid: ${incident.status}.`); store.pilot_incidents.push(incident); appendEventAndAudit(store,{event_type:"pilot_incident.opened",actor,tenant_id:incident.tenant_id,firm_id:incident.firm_id,aggregate_type:"PilotIncident",aggregate_id:incident.id,payload:incident,summary:"Pilot incident opened."}); return incident; });
  const clientConn = await getPool().connect();
  try {
    await clientConn.query("begin");
    await setTenantContext(clientConn, incident.tenant_id);
    await createPilotIncident({ ...incident, firm_id: uuidOrNull(incident.firm_id), support_case_id: uuidOrNull(incident.support_case_id), project_id: uuidOrNull(incident.project_id), opened_by_actor_id: uuidOrNull(incident.opened_by_actor_id) }, clientConn);
    await clientConn.query("commit");
    await withAppState((store)=>{ appendEventAndAudit(store,{event_type:"pilot_incident.opened",actor,tenant_id:incident.tenant_id,firm_id:incident.firm_id,aggregate_type:"PilotIncident",aggregate_id:incident.id,payload:incident,summary:"Pilot incident opened."}); return incident; });
    return incident;
  } catch (error) { await clientConn.query("rollback"); throw error; } finally { clientConn.release(); }
}

export async function updatePilotIncidentRecord(body, actor = systemActor(body.tenant_id, body.firm_id)) {
  const timestamp = now();
  if (storeBackend !== "postgres") return withStore((store)=>{ const item=store.pilot_incidents.find((record)=>record.id===body.incident_id && record.tenant_id===body.tenant_id); if(!item) throwNotFound("pilot_incidents", body.incident_id); assertStateTransition(item.status, body.status, pilotIncidentStateTransitions, "Pilot incident"); item.status=body.status ?? item.status; item.severity=body.severity ?? item.severity; item.mitigation_summary=body.mitigation_summary ?? item.mitigation_summary; item.root_cause_summary=body.root_cause_summary ?? item.root_cause_summary; item.updated_at=timestamp; item.resolved_at=["RESOLVED","CLOSED"].includes(body.status) ? timestamp : item.resolved_at; appendEventAndAudit(store,{event_type:"pilot_incident.updated",actor,tenant_id:item.tenant_id,firm_id:item.firm_id,aggregate_type:"PilotIncident",aggregate_id:item.id,payload:item,summary:"Pilot incident updated."}); return item; });
  const clientConn = await getPool().connect();
  try {
    await clientConn.query("begin");
    await setTenantContext(clientConn, body.tenant_id);
    const existing = await clientConn.query("select status from pilot_incidents where id=$1 and tenant_id=$2", [body.incident_id, body.tenant_id]);
    if(existing.rowCount===0) throwNotFound("pilot_incidents", body.incident_id);
    assertStateTransition(existing.rows[0].status, body.status, pilotIncidentStateTransitions, "Pilot incident");
    const result = await clientConn.query("update pilot_incidents set status=coalesce($1,status), severity=coalesce($2,severity), mitigation_summary=coalesce($3,mitigation_summary), root_cause_summary=coalesce($4,root_cause_summary), updated_at=$5, resolved_at=case when $1 in ('RESOLVED','CLOSED') then $5 else resolved_at end where id=$6 and tenant_id=$7 returning id::text, tenant_id::text, firm_id::text, support_case_id::text, project_id::text, opened_by_actor_id::text, incident_type, severity, status, title, description, detection_source, impact_summary, mitigation_summary, root_cause_summary, created_at, updated_at, resolved_at, metadata", [body.status ?? null,body.severity ?? null,body.mitigation_summary ?? null,body.root_cause_summary ?? null,timestamp,body.incident_id,body.tenant_id]);
    if(result.rowCount===0) throwNotFound("pilot_incidents", body.incident_id);
    const item = mapDbDates(result.rows[0]);
    await clientConn.query("commit");
    await withAppState((store)=>{ appendEventAndAudit(store,{event_type:"pilot_incident.updated",actor,tenant_id:item.tenant_id,firm_id:item.firm_id,aggregate_type:"PilotIncident",aggregate_id:item.id,payload:item,summary:"Pilot incident updated."}); return item; });
    return item;
  } catch (error) { await clientConn.query("rollback"); throw error; } finally { clientConn.release(); }
}
function buildSupportCase(body, actor = {}, options = {}) {
  const relational = storeBackend === "postgres" || options.ids === "uuid";
  const timestamp = now();
  return {
    id: relational ? newUuid() : newId("support_case"),
    tenant_id: body.tenant_id,
    firm_id: body.firm_id ?? actor.firm_id ?? null,
    opened_by_actor_id: body.opened_by_actor_id ?? actor.actor_id ?? actor.id ?? null,
    related_pilot_user_id: body.related_pilot_user_id ?? body.pilot_user_id ?? null,
    case_type: body.case_type ?? "GENERAL_SUPPORT",
    severity: body.severity ?? "NORMAL",
    status: body.status ?? "OPEN",
    subject: body.subject,
    description: body.description ?? null,
    resolution_summary: body.resolution_summary ?? null,
    created_at: timestamp,
    updated_at: timestamp,
    closed_at: body.closed_at ?? null,
    metadata: body.metadata ?? {}
  };
}

export async function revokePilotUserRecord(body, actor = systemActor(body.tenant_id, body.firm_id)) {
  const timestamp = now();
  if (storeBackend !== "postgres") return withStore((store)=>{ const user=store.pilot_users.find((item)=>item.id===body.pilot_user_id && item.tenant_id===body.tenant_id); if(!user) throwNotFound("pilot_users", body.pilot_user_id); user.invite_status="REVOKED"; user.revoked_at=timestamp; user.metadata={...(user.metadata??{}), revocation_reason: body.revocation_reason ?? "pilot_access_revoked"}; appendEventAndAudit(store,{event_type:"pilot_user.revoked",actor,tenant_id:user.tenant_id,firm_id:user.firm_id,aggregate_type:"PilotUser",aggregate_id:user.id,payload:user,summary:"Pilot user access revoked."}); return user; });
  const clientConn = await getPool().connect();
  try {
    await clientConn.query("begin");
    await setTenantContext(clientConn, body.tenant_id);
    const result = await clientConn.query("update pilot_users set invite_status='REVOKED', revoked_at=$1, metadata = metadata || $2::jsonb where id=$3 and tenant_id=$4 returning id::text, tenant_id::text, firm_id::text, person_id::text, actor_id::text, email, display_name, pilot_role, invite_status, auth_provider, external_subject, invited_at, activated_at, revoked_at, metadata", [timestamp, JSON.stringify({ revocation_reason: body.revocation_reason ?? "pilot_access_revoked" }), body.pilot_user_id, body.tenant_id]);
    if(result.rowCount===0) throwNotFound("pilot_users", body.pilot_user_id);
    const user = mapDbDates(result.rows[0]);
    await clientConn.query("commit");
    await withAppState((store)=>{ appendEventAndAudit(store,{event_type:"pilot_user.revoked",actor,tenant_id:user.tenant_id,firm_id:user.firm_id,aggregate_type:"PilotUser",aggregate_id:user.id,payload:user,summary:"Pilot user access revoked."}); return user; });
    return user;
  } catch (error) { await clientConn.query("rollback"); throw error; } finally { clientConn.release(); }
}

export async function suspendPilotUserRecord(body, actor = systemActor(body.tenant_id, body.firm_id)) {
  const timestamp = now();
  if (storeBackend !== "postgres") return withStore((store)=>{ const user=store.pilot_users.find((item)=>item.id===body.pilot_user_id && item.tenant_id===body.tenant_id); if(!user) throwNotFound("pilot_users", body.pilot_user_id); if(user.invite_status==="REVOKED") invalidState("Revoked pilot user cannot be suspended; create a new invitation after explicit approval."); user.invite_status="SUSPENDED"; user.metadata={...(user.metadata??{}), suspension_reason: body.suspension_reason ?? "pilot_access_suspended"}; appendEventAndAudit(store,{event_type:"pilot_user.suspended",actor,tenant_id:user.tenant_id,firm_id:user.firm_id,aggregate_type:"PilotUser",aggregate_id:user.id,payload:user,summary:"Pilot user access suspended."}); return user; });
  const clientConn = await getPool().connect();
  try {
    await clientConn.query("begin");
    await setTenantContext(clientConn, body.tenant_id);
    const result = await clientConn.query("update pilot_users set invite_status='SUSPENDED', metadata = metadata || $1::jsonb where id=$2 and tenant_id=$3 and invite_status <> 'REVOKED' returning id::text, tenant_id::text, firm_id::text, person_id::text, actor_id::text, email, display_name, pilot_role, invite_status, auth_provider, external_subject, invited_at, activated_at, revoked_at, metadata", [JSON.stringify({ suspension_reason: body.suspension_reason ?? "pilot_access_suspended" }), body.pilot_user_id, body.tenant_id]);
    if(result.rowCount===0) throwNotFound("pilot_users", body.pilot_user_id);
    const user = mapDbDates(result.rows[0]);
    await clientConn.query("commit");
    await withAppState((store)=>{ appendEventAndAudit(store,{event_type:"pilot_user.suspended",actor,tenant_id:user.tenant_id,firm_id:user.firm_id,aggregate_type:"PilotUser",aggregate_id:user.id,payload:user,summary:"Pilot user access suspended."}); return user; });
    return user;
  } catch (error) { await clientConn.query("rollback"); throw error; } finally { clientConn.release(); }
}

export async function createSupportCaseRecord(body, actor = systemActor(body.tenant_id, body.firm_id)) {
  const supportCase = buildSupportCase(body, actor);
  if (storeBackend !== "postgres") return withStore((store)=>{ if(!supportCaseStateTransitions[supportCase.status]) invalidState(`Support case state is invalid: ${supportCase.status}.`); store.support_cases.push(supportCase); appendEventAndAudit(store,{event_type:"support_case.opened",actor,tenant_id:supportCase.tenant_id,firm_id:supportCase.firm_id,aggregate_type:"SupportCase",aggregate_id:supportCase.id,payload:supportCase,summary:"Support case opened."}); return supportCase; });
  const clientConn = await getPool().connect();
  try {
    await clientConn.query("begin");
    await setTenantContext(clientConn, supportCase.tenant_id);
    await createSupportCase({ ...supportCase, firm_id: uuidOrNull(supportCase.firm_id), opened_by_actor_id: uuidOrNull(supportCase.opened_by_actor_id), related_pilot_user_id: uuidOrNull(supportCase.related_pilot_user_id) }, clientConn);
    await clientConn.query("commit");
    await withAppState((store)=>{ appendEventAndAudit(store,{event_type:"support_case.opened",actor,tenant_id:supportCase.tenant_id,firm_id:supportCase.firm_id,aggregate_type:"SupportCase",aggregate_id:supportCase.id,payload:supportCase,summary:"Support case opened."}); return supportCase; });
    return supportCase;
  } catch (error) { await clientConn.query("rollback"); throw error; } finally { clientConn.release(); }
}

export async function updateSupportCaseRecord(body, actor = systemActor(body.tenant_id, body.firm_id)) {
  const timestamp = now();
  if (storeBackend !== "postgres") return withStore((store)=>{ const item=store.support_cases.find((record)=>record.id===body.support_case_id && record.tenant_id===body.tenant_id); if(!item) throwNotFound("support_cases", body.support_case_id); assertStateTransition(item.status, body.status, supportCaseStateTransitions, "Support case"); item.status=body.status ?? item.status; item.resolution_summary=body.resolution_summary ?? item.resolution_summary; item.updated_at=timestamp; item.closed_at=body.status === "CLOSED" ? timestamp : item.closed_at; appendEventAndAudit(store,{event_type:"support_case.updated",actor,tenant_id:item.tenant_id,firm_id:item.firm_id,aggregate_type:"SupportCase",aggregate_id:item.id,payload:item,summary:"Support case updated."}); return item; });
  const clientConn = await getPool().connect();
  try {
    const existing = await clientConn.query("select status from support_cases where id=$1 and tenant_id=$2", [body.support_case_id, body.tenant_id]);
    if(existing.rowCount===0) throwNotFound("support_cases", body.support_case_id);
    assertStateTransition(existing.rows[0].status, body.status, supportCaseStateTransitions, "Support case");
    const result = await clientConn.query("update support_cases set status=coalesce($1,status), resolution_summary=coalesce($2,resolution_summary), updated_at=$3, closed_at=case when $1='CLOSED' then $3 else closed_at end where id=$4 and tenant_id=$5 returning id::text, tenant_id::text, firm_id::text, opened_by_actor_id::text, related_pilot_user_id::text, case_type, severity, status, subject, description, resolution_summary, created_at, updated_at, closed_at, metadata", [body.status ?? null,body.resolution_summary ?? null,timestamp,body.support_case_id,body.tenant_id]);
    if(result.rowCount===0) throwNotFound("support_cases", body.support_case_id);
    const item = mapDbDates(result.rows[0]);
    await withAppState((store)=>{ appendEventAndAudit(store,{event_type:"support_case.updated",actor,tenant_id:item.tenant_id,firm_id:item.firm_id,aggregate_type:"SupportCase",aggregate_id:item.id,payload:item,summary:"Support case updated."}); return item; });
    return item;
  } finally { clientConn.release(); }
}
function buildPilotUser(body, options = {}) {
  const relational = storeBackend === "postgres" || options.ids === "uuid";
  const timestamp = now();
  return {
    id: relational ? newUuid() : newId("pilot_user"),
    tenant_id: body.tenant_id,
    firm_id: body.firm_id ?? null,
    person_id: body.person_id ?? null,
    actor_id: body.actor_id ?? null,
    email: String(body.email ?? "").toLowerCase(),
    display_name: body.display_name ?? body.name ?? body.email,
    pilot_role: body.pilot_role ?? "PILOT_OPERATOR",
    invite_status: body.invite_status ?? "INVITED",
    auth_provider: body.auth_provider ?? process.env.VFIRM_AUTH_PROVIDER ?? "staging-header",
    external_subject: body.external_subject ?? null,
    invited_at: timestamp,
    activated_at: body.activated_at ?? null,
    revoked_at: null,
    metadata: body.metadata ?? {}
  };
}

export async function invitePilotUserRecord(body, actor = systemActor(body.tenant_id, body.firm_id)) {
  const user = buildPilotUser(body);
  if (storeBackend !== "postgres") return withStore((store)=>{ const existing=store.pilot_users.find((item)=>item.tenant_id===user.tenant_id && item.email===user.email && item.invite_status!=="REVOKED"); if(existing) invalidState("Pilot user already has an active, invited, or suspended identity record for this tenant."); store.pilot_users.push(user); appendEventAndAudit(store,{event_type:"pilot_user.invited",actor,tenant_id:user.tenant_id,firm_id:user.firm_id,aggregate_type:"PilotUser",aggregate_id:user.id,payload:user,summary:"Pilot user invited."}); return user; });
  const clientConn = await getPool().connect();
  try {
    await clientConn.query("begin");
    await setTenantContext(clientConn, user.tenant_id);
    await createPilotUser({ ...user, firm_id: uuidOrNull(user.firm_id), person_id: uuidOrNull(user.person_id), actor_id: uuidOrNull(user.actor_id) }, clientConn);
    await clientConn.query("commit");
    await withAppState((store)=>{ appendEventAndAudit(store,{event_type:"pilot_user.invited",actor,tenant_id:user.tenant_id,firm_id:user.firm_id,aggregate_type:"PilotUser",aggregate_id:user.id,payload:user,summary:"Pilot user invited."}); return user; });
    return user;
  } catch (error) { await clientConn.query("rollback"); throw error; } finally { clientConn.release(); }
}

export async function activatePilotUserRecord(body, actor = systemActor(body.tenant_id, body.firm_id)) {
  const timestamp = now();
  if (storeBackend !== "postgres") return withStore((store)=>{ const user=store.pilot_users.find((item)=>item.id===body.pilot_user_id || (item.tenant_id===body.tenant_id && item.email===String(body.email??"").toLowerCase())); if(!user) throwNotFound("pilot_users", body.pilot_user_id ?? body.email); if(["REVOKED","SUSPENDED"].includes(user.invite_status)) invalidState("Suspended or revoked pilot user cannot be activated without a new explicit invitation."); user.invite_status="ACTIVE"; user.external_subject=body.external_subject ?? user.external_subject; user.activated_at=timestamp; appendEventAndAudit(store,{event_type:"pilot_user.activated",actor,tenant_id:user.tenant_id,firm_id:user.firm_id,aggregate_type:"PilotUser",aggregate_id:user.id,payload:user,summary:"Pilot user activated."}); return user; });
  const clientConn = await getPool().connect();
  try {
    await clientConn.query("begin");
    await setTenantContext(clientConn, body.tenant_id);
    const result = await clientConn.query("update pilot_users set invite_status='ACTIVE', external_subject=coalesce($1, external_subject), activated_at=$2 where id=coalesce($3,id) and tenant_id=$4 and ($5::text is null or lower(email)=lower($5)) and invite_status not in ('REVOKED','SUSPENDED') returning id::text, tenant_id::text, firm_id::text, person_id::text, actor_id::text, email, display_name, pilot_role, invite_status, auth_provider, external_subject, invited_at, activated_at, revoked_at, metadata", [body.external_subject ?? null,timestamp,uuidOrNull(body.pilot_user_id),body.tenant_id,body.email ?? null]);
    if(result.rowCount===0) throwNotFound("pilot_users", body.pilot_user_id ?? body.email);
    const user = mapDbDates(result.rows[0]);
    await clientConn.query("commit");
    await withAppState((store)=>{ appendEventAndAudit(store,{event_type:"pilot_user.activated",actor,tenant_id:user.tenant_id,firm_id:user.firm_id,aggregate_type:"PilotUser",aggregate_id:user.id,payload:user,summary:"Pilot user activated."}); return user; });
    return user;
  } catch (error) { await clientConn.query("rollback"); throw error; } finally { clientConn.release(); }
}
function buildMarketplaceListing(body, options = {}) {
  const relational = storeBackend === "postgres" || options.ids === "uuid";
  const timestamp = now();
  return { id: relational ? newUuid() : newId("marketplace_listing"), tenant_id: body.tenant_id, firm_id: body.firm_id, service_pack_id: body.service_pack_id ?? "11111111-1111-4111-8111-111111111111", listing_scope: body.listing_scope ?? "PRIVATE_NETWORK", title: body.title ?? "Formwork Engineering Preliminary Package", description: body.description ?? "Trusted-network listing for Formwork preliminary support.", qualification_requirements: body.qualification_requirements ?? ["professional_authority_required", "tenant_membership_required"], commercial_model: body.commercial_model ?? { pricing: "fixed_or_scoped", currency: "MYR" }, visibility: body.visibility ?? "TRUSTED_NETWORK", status: body.status ?? "PUBLISHED", created_at: timestamp, updated_at: timestamp };
}

function buildCapacityOffer(body, options = {}) {
  const relational = storeBackend === "postgres" || options.ids === "uuid";
  const timestamp = now();
  return { id: relational ? newUuid() : newId("capacity_offer"), tenant_id: body.tenant_id, firm_id: body.firm_id, service_pack_id: body.service_pack_id ?? "11111111-1111-4111-8111-111111111111", capacity_type: body.capacity_type ?? "FORMWORK_REVIEW_CAPACITY", pce_units: Number(body.pce_units ?? 1), available_from: body.available_from ?? timestamp, available_until: body.available_until ?? new Date(Date.now()+14*86400000).toISOString(), jurisdiction_refs: body.jurisdiction_refs ?? ["MY"], constraints: body.constraints ?? { trusted_network_only: true, requires_data_room: true }, status: body.status ?? "OPEN", created_at: timestamp, updated_at: timestamp };
}

function buildCollaborationRequest(body, options = {}) {
  const relational = storeBackend === "postgres" || options.ids === "uuid";
  const timestamp = now();
  return { id: relational ? newUuid() : newId("collaboration_request"), tenant_id: body.tenant_id, requesting_firm_id: body.requesting_firm_id ?? body.firm_id, provider_firm_id: body.provider_firm_id ?? null, service_pack_id: body.service_pack_id ?? "11111111-1111-4111-8111-111111111111", project_id: body.project_id ?? null, capacity_offer_id: body.capacity_offer_id ?? null, request_summary: body.request_summary ?? "Request trusted Formwork support capacity.", data_room_policy: body.data_room_policy ?? { minimum_necessary_access: true, client_confidential: true, audit_required: true }, status: body.status ?? "REQUESTED", created_at: timestamp, updated_at: timestamp };
}


function actorId(actor = {}) {
  return actor.actor_id ?? actor.id ?? null;
}

function requireHumanNetworkActor(actor = {}, action = "network profile action") {
  if (actor.actor_type !== "HUMAN") {
    const error = new Error(`${action} requires a human network operator.`);
    error.status = 403;
    error.code = "NETWORK_HUMAN_AUTHORITY_REQUIRED";
    throw error;
  }
}

function assertTrustedNetworkOnly(body = {}) {
  const visibility = body.visibility ?? "TRUSTED_NETWORK_ONLY";
  const scope = body.profile_scope ?? body.listing_scope ?? "TRUSTED_NETWORK_ONLY";
  const text = JSON.stringify({ visibility, scope, metadata: body.metadata ?? {} }).toLowerCase();
  if (["PUBLIC", "OPEN_MARKETPLACE", "PUBLIC_MARKETPLACE"].includes(String(visibility).toUpperCase()) || text.includes("public marketplace") || text.includes("open marketplace")) {
    const error = new Error("Release 5 trusted network profiles cannot be published as public marketplace records.");
    error.status = 403;
    error.code = "R5_PUBLIC_MARKETPLACE_SCOPE_DENIED";
    throw error;
  }
}

function buildNetworkProfessionalProfile(body, actor = {}) {
  const relational = storeBackend === "postgres";
  const timestamp = now();
  return { id: relational ? newUuid() : newId("network_professional_profile"), tenant_id: body.tenant_id, firm_id: body.firm_id, person_id: body.person_id ?? null, professional_profile_id: body.professional_profile_id ?? null, display_name: body.display_name ?? "Trusted Network Professional", profile_scope: body.profile_scope ?? "TRUSTED_NETWORK_ONLY", network_status: body.network_status ?? "DRAFT", authority_grant: false, jurisdiction_refs: body.jurisdiction_refs ?? [], credential_refs: body.credential_refs ?? [], capability_refs: body.capability_refs ?? [], created_by_actor_id: actorId(actor), created_at: timestamp, updated_at: timestamp, metadata: body.metadata ?? {} };
}

function buildNetworkFirmProfile(body, actor = {}) {
  const relational = storeBackend === "postgres";
  const timestamp = now();
  return { id: relational ? newUuid() : newId("network_firm_profile"), tenant_id: body.tenant_id, firm_id: body.firm_id, display_name: body.display_name ?? "Trusted Network Firm", profile_scope: body.profile_scope ?? "TRUSTED_NETWORK_ONLY", network_status: body.network_status ?? "DRAFT", jurisdiction_refs: body.jurisdiction_refs ?? [], capability_refs: body.capability_refs ?? [], created_by_actor_id: actorId(actor), created_at: timestamp, updated_at: timestamp, metadata: body.metadata ?? {} };
}

function buildNetworkCapability(body, actor = {}) {
  const relational = storeBackend === "postgres";
  const timestamp = now();
  return { id: relational ? newUuid() : newId("network_capability"), tenant_id: body.tenant_id, firm_id: body.firm_id, professional_network_profile_id: body.professional_network_profile_id ?? null, firm_network_profile_id: body.firm_network_profile_id ?? null, capability_code: body.capability_code, service_pack_ref: body.service_pack_ref ?? null, jurisdiction_refs: body.jurisdiction_refs ?? [], visibility: body.visibility ?? "TRUSTED_NETWORK_ONLY", qualification_required: body.qualification_required ?? true, status: body.status ?? "DRAFT", created_by_actor_id: actorId(actor), created_at: timestamp, updated_at: timestamp, metadata: body.metadata ?? {} };
}

function buildNetworkCredential(body, actor = {}) {
  const relational = storeBackend === "postgres";
  const timestamp = now();
  return { id: relational ? newUuid() : newId("network_credential"), tenant_id: body.tenant_id, firm_id: body.firm_id, professional_network_profile_id: body.professional_network_profile_id ?? null, credential_type: body.credential_type, credential_name: body.credential_name, issuer: body.issuer ?? null, jurisdiction_refs: body.jurisdiction_refs ?? [], verification_status: body.verification_status ?? "RECORDED_UNVERIFIED", verified_by_actor_id: body.verified_by_actor_id ?? null, verified_at: body.verified_at ?? null, valid_from: body.valid_from ?? null, valid_until: body.valid_until ?? null, evidence_refs: body.evidence_refs ?? [], authority_grant: false, created_by_actor_id: actorId(actor), created_at: timestamp, updated_at: timestamp, metadata: body.metadata ?? {} };
}

function buildNetworkTrustSignal(body, actor = {}) {
  const relational = storeBackend === "postgres";
  const timestamp = now();
  return { id: relational ? newUuid() : newId("network_trust_signal"), tenant_id: body.tenant_id, firm_id: body.firm_id, subject_type: body.subject_type, subject_id: body.subject_id, signal_type: body.signal_type, signal_summary: body.signal_summary, evidence_refs: body.evidence_refs ?? [], trust_weight: body.trust_weight ?? "LOW", substitutes_for_credential: false, status: body.status ?? "RECORDED", created_by_actor_id: actorId(actor), created_at: timestamp, updated_at: timestamp, metadata: body.metadata ?? {} };
}

function qualificationDenialReasons(gate) {
  const failures = [];
  if (gate.credential_status !== "VERIFIED") failures.push("credential_not_verified");
  if (gate.jurisdiction_status !== "VALID") failures.push("jurisdiction_not_valid");
  if (gate.insurance_status !== "VALID") failures.push("insurance_not_valid");
  if (gate.conflict_status !== "CLEARED") failures.push("conflict_not_cleared");
  if (gate.capacity_status !== "AVAILABLE") failures.push("capacity_not_available");
  if (gate.policy_status !== "APPROVED") failures.push("policy_not_approved");
  return failures;
}

function buildNetworkConflictCheck(body, actor = {}) {
  const relational = storeBackend === "postgres";
  const timestamp = now();
  return { id: relational ? newUuid() : newId("network_conflict_check"), tenant_id: body.tenant_id, requesting_firm_id: body.requesting_firm_id, provider_firm_id: body.provider_firm_id, subject_profile_id: body.subject_profile_id ?? null, check_status: body.check_status ?? "PENDING", conflict_summary: body.conflict_summary ?? null, evidence_refs: body.evidence_refs ?? [], checked_by_actor_id: actorId(actor), created_at: timestamp, metadata: body.metadata ?? {} };
}

function buildNetworkQualificationGate(body, actor = {}) {
  const relational = storeBackend === "postgres";
  const timestamp = now();
  const gate = { id: relational ? newUuid() : newId("network_qualification_gate"), tenant_id: body.tenant_id, requesting_firm_id: body.requesting_firm_id, provider_firm_id: body.provider_firm_id, professional_network_profile_id: body.professional_network_profile_id ?? null, firm_network_profile_id: body.firm_network_profile_id ?? null, capability_id: body.capability_id, credential_id: body.credential_id, conflict_check_id: body.conflict_check_id ?? null, jurisdiction_ref: body.jurisdiction_ref, credential_status: body.credential_status ?? "MISSING", jurisdiction_status: body.jurisdiction_status ?? "NOT_CHECKED", insurance_status: body.insurance_status ?? "NOT_CHECKED", conflict_status: body.conflict_status ?? "NOT_CHECKED", capacity_status: body.capacity_status ?? "NOT_CHECKED", policy_status: body.policy_status ?? "NOT_CHECKED", gate_status: "PENDING", denial_reasons: [], created_by_actor_id: actorId(actor), created_at: timestamp, updated_at: timestamp, metadata: body.metadata ?? {} };
  gate.denial_reasons = qualificationDenialReasons(gate);
  gate.gate_status = gate.denial_reasons.length === 0 ? "PASS" : "DENIED";
  return gate;
}

function buildSpecialistInvitation(body, actor = {}, gate) {
  const relational = storeBackend === "postgres";
  const timestamp = now();
  return { id: relational ? newUuid() : newId("specialist_invitation"), tenant_id: body.tenant_id, requesting_firm_id: body.requesting_firm_id, provider_firm_id: body.provider_firm_id, qualification_gate_id: body.qualification_gate_id, capability_id: body.capability_id ?? gate?.capability_id ?? null, invitation_status: gate?.gate_status === "PASS" ? (body.invitation_status ?? "READY_TO_SEND") : "DENIED", denial_reasons: gate?.gate_status === "PASS" ? [] : (gate?.denial_reasons ?? ["qualification_gate_not_passed"]), invited_by_actor_id: actorId(actor), created_at: timestamp, updated_at: timestamp, metadata: body.metadata ?? {} };
}

function assertWorkspacePolicy(policy = {}) {
  const required = ["minimum_necessary_access", "client_confidential", "audit_required"];
  const missing = required.filter((key) => policy[key] !== true);
  if (missing.length) {
    const error = new Error(`Collaboration workspace data-room policy missing required controls: ${missing.join(", ")}.`);
    error.status = 403;
    error.code = "COLLABORATION_WORKSPACE_POLICY_DENIED";
    error.details = { missing_controls: missing };
    throw error;
  }
}

function buildCollaborationWorkspace(body, actor = {}, invitation) {
  const relational = storeBackend === "postgres";
  const timestamp = now();
  const policy = body.data_room_policy ?? { minimum_necessary_access: true, client_confidential: true, audit_required: true, revocation_supported: true };
  return { id: relational ? newUuid() : newId("collaboration_workspace"), tenant_id: body.tenant_id, requesting_firm_id: body.requesting_firm_id, provider_firm_id: body.provider_firm_id ?? invitation?.provider_firm_id ?? null, specialist_invitation_id: body.specialist_invitation_id, qualification_gate_id: invitation?.qualification_gate_id ?? body.qualification_gate_id ?? null, workspace_status: body.workspace_status ?? "ACTIVE", data_room_policy: policy, permitted_evidence_refs: body.permitted_evidence_refs ?? [], created_by_actor_id: actorId(actor), created_at: timestamp, updated_at: timestamp, metadata: body.metadata ?? {} };
}

function buildWorkspaceParticipant(body, actor = {}) {
  const relational = storeBackend === "postgres";
  const timestamp = now();
  return { id: relational ? newUuid() : newId("workspace_participant"), tenant_id: body.tenant_id, workspace_id: body.workspace_id, firm_id: body.firm_id, actor_id: body.participant_actor_id ?? body.actor_id ?? null, participant_role: body.participant_role ?? "SPECIALIST", access_status: "ACTIVE", permissions: body.permissions ?? ["evidence.read", "evidence.add", "comment.add"], granted_by_actor_id: actorId(actor), granted_at: timestamp, revoked_by_actor_id: null, revoked_at: null, metadata: body.metadata ?? {} };
}

function buildWorkspaceEvidence(body, actor = {}) {
  const relational = storeBackend === "postgres";
  return { id: relational ? newUuid() : newId("workspace_evidence"), tenant_id: body.tenant_id, workspace_id: body.workspace_id, participant_id: body.participant_id, evidence_ref: body.evidence_ref, evidence_type: body.evidence_type ?? "CONTROLLED_EVIDENCE_REF", access_scope: body.access_scope ?? "WORKSPACE_ONLY", added_by_actor_id: actorId(actor), added_at: now(), metadata: body.metadata ?? {} };
}

function buildResponsibilityMatrix(body, actor = {}, workspace) {
  const relational = storeBackend === "postgres";
  const timestamp = now();
  return {
    id: relational ? newUuid() : newId("responsibility_matrix"),
    tenant_id: body.tenant_id,
    workspace_id: body.workspace_id,
    requesting_firm_id: workspace?.requesting_firm_id ?? body.requesting_firm_id,
    provider_firm_id: workspace?.provider_firm_id ?? body.provider_firm_id ?? null,
    accountable_firm_id: body.accountable_firm_id,
    responsible_professional_actor_id: body.responsible_professional_actor_id,
    reviewer_actor_id: body.reviewer_actor_id ?? null,
    approver_actor_id: body.approver_actor_id ?? null,
    permitted_worker_actions: body.permitted_worker_actions ?? [],
    regulated_scope: body.regulated_scope ?? "CONTROLLED_SPECIALIST_CONTRIBUTION",
    approval_required: body.approval_required !== false,
    matrix_status: body.matrix_status ?? "ACTIVE",
    created_by_actor_id: actorId(actor),
    created_at: timestamp,
    updated_at: timestamp,
    metadata: body.metadata ?? {}
  };
}

function assertResponsibilityMatrix(matrix, workspace, participants = []) {
  const validFirmIds = [workspace.requesting_firm_id, workspace.provider_firm_id].filter(Boolean);
  if (!validFirmIds.includes(matrix.accountable_firm_id)) invalidState("Accountable firm must belong to the scoped collaboration workspace.");
  if (!matrix.responsible_professional_actor_id) invalidState("No orphan regulated work: responsible professional actor is required.");
  if (!matrix.approver_actor_id) invalidState("No silent approval: approver actor is required.");
  if (matrix.approver_actor_id === matrix.reviewer_actor_id) invalidState("Reviewer and approver must be separately recorded where review is required.");
  if (matrix.approval_required !== true) invalidState("Regulated collaboration requires explicit human approval.");
  const activeActorIds = new Set(participants.filter((participant) => participant.access_status === "ACTIVE").map((participant) => participant.actor_id).filter(Boolean));
  for (const field of ["responsible_professional_actor_id", "approver_actor_id"]) {
    if (!activeActorIds.has(matrix[field])) invalidState(`${field} must refer to an active workspace participant actor.`);
  }
  if (matrix.reviewer_actor_id && !activeActorIds.has(matrix.reviewer_actor_id)) invalidState("reviewer_actor_id must refer to an active workspace participant actor.");
  if (!Array.isArray(matrix.permitted_worker_actions) || matrix.permitted_worker_actions.length === 0) invalidState("Permitted worker actions must be explicit.");
  const forbidden = matrix.permitted_worker_actions.filter((action) => /approve|certify|seal|issue_regulated|final_output/i.test(String(action)));
  if (forbidden.length > 0) invalidState("Permitted worker actions cannot include approval, certification, seal, regulated issue, or final regulated output.");
}
function buildObservatorySnapshot(body, options = {}) {
  const relational = storeBackend === "postgres" || options.ids === "uuid";
  return { id: relational ? newUuid() : newId("observatory_snapshot"), tenant_id: body.tenant_id ?? null, firm_id: body.firm_id ?? null, snapshot_scope: body.snapshot_scope ?? "PRIVATE_NETWORK_INTERNAL", metrics: body.metrics ?? {}, privacy_class: body.privacy_class ?? "AGGREGATED_INTERNAL", generated_at: now() };
}
function localWorkerTemplates() {
  return [
    { id: "worker_template_formwork_intake", code: "formwork-intake-agent", name: "Formwork Intake Agent", version: "1.0", default_tools: ["formwork.input.extract", "document.read"], default_budget: { max_runtime_minutes: 10, max_cost: 5, currency: "MYR" }, risk_envelope: { max_risk_class: "CONTROLLED", requires_human_review: true }, status: "ACTIVE", created_at: now(), updated_at: now() },
    { id: "worker_template_front_desk", code: "front-desk-coordinator", name: "Front Desk Coordinator", version: "1.0", default_tools: ["client.enquiry.capture", "client.communication.draft", "calendar.request"], default_budget: { max_runtime_minutes: 10, max_cost: 4, currency: "MYR" }, risk_envelope: { max_risk_class: "STANDARD", requires_human_review: true, forbidden_actions: ["technical_advice", "commercial_commitment"] }, status: "ACTIVE", created_at: now(), updated_at: now() },
    { id: "worker_template_admin_clerk", code: "administration-clerk", name: "Administration Clerk", version: "1.0", default_tools: ["document.register.update", "correspondence.draft", "task.follow_up"], default_budget: { max_runtime_minutes: 15, max_cost: 5, currency: "MYR" }, risk_envelope: { max_risk_class: "CONTROLLED", requires_human_review: true, forbidden_actions: ["document_approval"] }, status: "ACTIVE", created_at: now(), updated_at: now() },
    { id: "worker_template_accounts_clerk", code: "accounts-clerk", name: "Accounts Clerk", version: "1.0", default_tools: ["invoice.draft", "receivable.monitor", "expense.classify"], default_budget: { max_runtime_minutes: 15, max_cost: 5, currency: "MYR" }, risk_envelope: { max_risk_class: "CONTROLLED", requires_human_review: true, forbidden_actions: ["payment_approval", "bank_instruction"] }, status: "ACTIVE", created_at: now(), updated_at: now() },
    { id: "worker_template_marketing_sales", code: "marketing-sales-coordinator", name: "Marketing & Sales Coordinator", version: "1.0", default_tools: ["lead.qualify", "proposal.draft", "pipeline.summarize"], default_budget: { max_runtime_minutes: 15, max_cost: 6, currency: "MYR" }, risk_envelope: { max_risk_class: "STANDARD", requires_human_review: true, forbidden_actions: ["proposal_send", "pricing_commitment"] }, status: "ACTIVE", created_at: now(), updated_at: now() },
    { id: "worker_template_drawing_assistant", code: "technical-drawing-assistant", name: "Technical Drawing Assistant", version: "1.0", default_tools: ["document.read", "drawing.register.check", "drawing.revision.compare", "formwork.input.extract"], default_budget: { max_runtime_minutes: 20, max_cost: 8, currency: "MYR" }, risk_envelope: { max_risk_class: "CONTROLLED", requires_human_review: true, forbidden_actions: ["engineering_approval", "drawing_issue", "professional_certification"] }, status: "ACTIVE", created_at: now(), updated_at: now() },
    { id: "worker_template_project_coordination", code: "project-coordination-assistant", name: "Project Coordination Assistant", version: "1.0", default_tools: ["task.follow_up", "document.register.update", "project.status.summarize"], default_budget: { max_runtime_minutes: 15, max_cost: 6, currency: "MYR" }, risk_envelope: { max_risk_class: "CONTROLLED", requires_human_review: true, forbidden_actions: ["scope_change_approval", "professional_instruction"] }, status: "ACTIVE", created_at: now(), updated_at: now() },
    { id: "worker_template_formwork_qa", code: "formwork-qa-agent", name: "Formwork QA Agent", version: "1.0", default_tools: ["formwork.qa.check", "document.read"], default_budget: { max_runtime_minutes: 15, max_cost: 8, currency: "MYR" }, risk_envelope: { max_risk_class: "CONTROLLED", requires_human_review: true }, status: "ACTIVE", created_at: now(), updated_at: now() }
  ];
}

function ensureLocalWorkerTemplates(store) {
  store.worker_templates ??= [];
  for (const template of localWorkerTemplates()) {
    if (!store.worker_templates.some((record) => record.code === template.code)) store.worker_templates.push(template);
  }
  return store.worker_templates;
}

function buildWorkerInstance(body, template, options = {}) {
  const relational = options.ids === "uuid";
  const timestamp = now();
  const workerId = relational ? newUuid() : newId("worker_instance");
  const actorId = relational ? newUuid() : newId("actor");
  const worker = {
    id: workerId,
    tenant_id: body.tenant_id,
    firm_id: body.firm_id,
    worker_template_id: template.id,
    actor_id: actorId,
    name: body.name ?? template.name,
    assigned_services: body.assigned_services ?? ["VF-SP-001"],
    tool_allowlist: body.tool_allowlist ?? template.default_tools ?? [],
    budget_envelope: body.budget_envelope ?? template.default_budget ?? {},
    risk_limits: body.risk_limits ?? template.risk_envelope ?? {},
    runtime_status: "PROVISIONED",
    created_at: timestamp,
    updated_at: timestamp
  };
  const actor = { id: actorId, actor_id: actorId, actor_type: "AI_AGENT", person_id: null, worker_instance_id: workerId, system_id: null, external_service_id: null, tenant_id: body.tenant_id, firm_id: body.firm_id, display_name: worker.name, status: "ACTIVE", created_at: timestamp, metadata: { worker_template_id: template.id, tool_allowlist: worker.tool_allowlist } };
  return { worker_instance: worker, actor };
}


export async function createMarketplaceListingRecord(body, actor) {
  const listing = buildMarketplaceListing(body);
  if (storeBackend !== "postgres") return withStore((store)=>{ store.marketplace_listings.push(listing); appendEventAndAudit(store,{event_type:"marketplace.listing_published",actor,tenant_id:body.tenant_id,firm_id:body.firm_id,aggregate_type:"MarketplaceListing",aggregate_id:listing.id,payload:listing,summary:"Private network marketplace listing published."}); return listing; });
  const clientConn=await getPool().connect(); try{ await repoCreateMarketplaceListing({ ...listing, service_pack_id: uuidOrNull(listing.service_pack_id) }, clientConn); await withAppState((store)=>{appendEventAndAudit(store,{event_type:"marketplace.listing_published",actor,tenant_id:body.tenant_id,firm_id:body.firm_id,aggregate_type:"MarketplaceListing",aggregate_id:listing.id,payload:listing,summary:"Private network marketplace listing published."}); return listing;}); return listing;} finally{clientConn.release();}
}


export async function updateMarketplaceListingStatusRecord(body, actor, nextStatus) {
  const timestamp = now();
  const allowed = ["SUSPENDED", "REVOKED"];
  if (!allowed.includes(nextStatus)) invalidState(`Unsupported marketplace directory status transition: ${nextStatus}`);
  const eventType = nextStatus === "SUSPENDED" ? "marketplace.directory_publication_suspended" : "marketplace.directory_publication_revoked";
  const summary = nextStatus === "SUSPENDED" ? "Qualified directory publication suspended by human governance operator." : "Qualified directory publication revoked by human governance operator.";
  if (storeBackend !== "postgres") return withStore((store) => {
    const listing = (store.marketplace_listings ?? []).find((item) => item.id === body.listing_id && item.tenant_id === body.tenant_id && item.firm_id === body.firm_id);
    if (!listing) throwNotFound("marketplace_listings", body.listing_id);
    if (!["PUBLISHED", "SUSPENDED"].includes(listing.status)) invalidState(`Marketplace listing cannot move from ${listing.status} to ${nextStatus}.`);
    listing.status = nextStatus;
    listing.updated_at = timestamp;
    listing.commercial_model = { ...(listing.commercial_model ?? {}), governance_reason: body.reason ?? `${nextStatus.toLowerCase()} by governance operator` };
    appendEventAndAudit(store,{event_type:eventType,actor,tenant_id:listing.tenant_id,firm_id:listing.firm_id,aggregate_type:"MarketplaceListing",aggregate_id:listing.id,payload:listing,summary});
    return listing;
  });
  const clientConn = await getPool().connect();
  try {
    const result = await clientConn.query("update marketplace_listings set status=$1, updated_at=$2, commercial_model = commercial_model || $3::jsonb where id=$4 and tenant_id=$5 and firm_id=$6 and status in ('PUBLISHED','SUSPENDED') returning id::text, tenant_id::text, firm_id::text, service_pack_id::text, listing_scope, title, description, qualification_requirements, commercial_model, visibility, status, created_at, updated_at", [nextStatus, timestamp, JSON.stringify({ governance_reason: body.reason ?? `${nextStatus.toLowerCase()} by governance operator` }), body.listing_id, body.tenant_id, body.firm_id]);
    if (result.rowCount === 0) throwNotFound("marketplace_listings", body.listing_id);
    const listing = mapDbDates(result.rows[0]);
    await withAppState((store)=>{appendEventAndAudit(store,{event_type:eventType,actor,tenant_id:listing.tenant_id,firm_id:listing.firm_id,aggregate_type:"MarketplaceListing",aggregate_id:listing.id,payload:listing,summary}); return listing;});
    return listing;
  } finally { clientConn.release(); }
}
export async function createDirectoryReviewBoardDecisionRecord(body, actor) {
  requireHumanNetworkActor(actor, "ME-S3 directory review board decision");
  if (!Array.isArray(body.evidence_refs) || body.evidence_refs.length === 0) invalidState("Directory review board decision requires evidence references.");
  const decision = String(body.decision ?? "").toUpperCase();
  if (!["APPROVE_PUBLICATION", "REVIEW_CONTINUE", "SUSPEND", "REVOKE"].includes(decision)) invalidState("Unsupported directory review board decision.");
  if (body.live_matching === true || body.ranking_enabled === true || body.capacity_allocation === true || body.autonomous_award === true || body.autonomous_regulated_approval === true) invalidState("ME-S3 review board cannot authorize marketplace matching, ranking, allocation, award, or regulated approval.");
  const timestamp = now();
  const boundaryMetadata = { ...(body.metadata ?? {}), boundaries: ["private_directory_only", "no_live_matching", "no_ranking", "no_capacity_allocation", "no_autonomous_award", "no_autonomous_regulated_approval"] };
  if (storeBackend !== "postgres") return withStore((store) => {
    store.directory_review_board_decisions ??= [];
    const listing = (store.marketplace_listings ?? []).find((item) => item.id === body.listing_id && item.tenant_id === body.tenant_id && item.firm_id === body.provider_firm_id && item.commercial_model?.directory_type === "CONTROLLED_PRIVATE_QUALIFIED_DIRECTORY");
    if (!listing) throwNotFound("marketplace_listings", body.listing_id);
    if (listing.visibility !== "TRUSTED_NETWORK" || listing.listing_scope !== "PRIVATE_NETWORK") invalidState("Directory review board can only govern controlled private directory listings.");
    const record = { id: newId("directory_review"), tenant_id: body.tenant_id, provider_firm_id: body.provider_firm_id, listing_id: listing.id, qualification_gate_id: listing.commercial_model?.qualification_gate_id ?? body.qualification_gate_id ?? null, board_ref: body.board_ref ?? "ME-S3-DIRECTORY-REVIEW-BOARD", decision, decision_summary: body.decision_summary, evidence_refs: body.evidence_refs, decided_by_actor_id: actorId(actor), decided_at: timestamp, created_at: timestamp, metadata: boundaryMetadata };
    if (decision === "SUSPEND") listing.status = "SUSPENDED";
    if (decision === "REVOKE") listing.status = "REVOKED";
    if (["SUSPEND", "REVOKE"].includes(decision)) listing.updated_at = timestamp;
    store.directory_review_board_decisions.push(record);
    appendEventAndAudit(store, { event_type: "marketplace.directory_review_board_decision_recorded", actor, tenant_id: body.tenant_id, firm_id: body.provider_firm_id, aggregate_type: "DirectoryReviewBoardDecision", aggregate_id: record.id, payload: record, summary: "Private directory review board decision recorded." });
    return record;
  });
  const clientConn = await getPool().connect();
  try {
    await clientConn.query("begin");
    const listingResult = await clientConn.query("select id::text, tenant_id::text, firm_id::text, service_pack_id::text, listing_scope, title, description, qualification_requirements, commercial_model, visibility, status, created_at, updated_at from marketplace_listings where id=$1 and tenant_id=$2 and firm_id=$3 and commercial_model->>'directory_type'='CONTROLLED_PRIVATE_QUALIFIED_DIRECTORY'", [body.listing_id, body.tenant_id, body.provider_firm_id]);
    if (listingResult.rowCount === 0) throwNotFound("marketplace_listings", body.listing_id);
    const listing = mapDbDates(listingResult.rows[0]);
    if (listing.visibility !== "TRUSTED_NETWORK" || listing.listing_scope !== "PRIVATE_NETWORK") invalidState("Directory review board can only govern controlled private directory listings.");
    if (decision === "SUSPEND" || decision === "REVOKE") await clientConn.query("update marketplace_listings set status=$1, updated_at=$2 where id=$3 and tenant_id=$4 and firm_id=$5", [decision === "SUSPEND" ? "SUSPENDED" : "REVOKED", timestamp, listing.id, body.tenant_id, body.provider_firm_id]);
    const record = { id: newUuid(), tenant_id: body.tenant_id, provider_firm_id: body.provider_firm_id, listing_id: listing.id, qualification_gate_id: listing.commercial_model?.qualification_gate_id ?? body.qualification_gate_id ?? null, board_ref: body.board_ref ?? "ME-S3-DIRECTORY-REVIEW-BOARD", decision, decision_summary: body.decision_summary, evidence_refs: body.evidence_refs, decided_by_actor_id: actorId(actor), decided_at: timestamp, created_at: timestamp, metadata: boundaryMetadata };
    await createDirectoryReviewBoardDecision({ ...record, qualification_gate_id: uuidOrNull(record.qualification_gate_id), decided_by_actor_id: uuidOrNull(record.decided_by_actor_id) }, clientConn);
    await clientConn.query("commit");
    await withAppState((store) => { appendEventAndAudit(store, { event_type: "marketplace.directory_review_board_decision_recorded", actor, tenant_id: body.tenant_id, firm_id: body.provider_firm_id, aggregate_type: "DirectoryReviewBoardDecision", aggregate_id: record.id, payload: record, summary: "Private directory review board decision recorded." }); return record; });
    return record;
  } catch (error) { await clientConn.query("rollback"); throw error; } finally { clientConn.release(); }
}

export async function createPrivateDirectoryEnquiryRecord(body, actor) {
  requireHumanNetworkActor(actor, "ME-S3 private directory enquiry");
  if (body.live_matching === true || body.auto_match === true || body.ranking_requested === true || body.award_requested === true || body.autonomous_award === true) invalidState("ME-S3 enquiry is manual/private only; live matching, ranking, and award are not authorized.");
  const timestamp = now();
  if (storeBackend !== "postgres") return withStore((store) => {
    store.directory_private_enquiries ??= [];
    const listing = (store.marketplace_listings ?? []).find((item) => item.id === body.listing_id && item.tenant_id === body.tenant_id && item.firm_id === body.provider_firm_id && item.status === "PUBLISHED" && item.visibility === "TRUSTED_NETWORK" && item.listing_scope === "PRIVATE_NETWORK" && item.commercial_model?.directory_type === "CONTROLLED_PRIVATE_QUALIFIED_DIRECTORY");
    if (!listing) throwNotFound("marketplace_listings", body.listing_id);
    if (body.requesting_firm_id === body.provider_firm_id) invalidState("Private directory enquiry requires a separate requesting firm.");
    const enquiry = { id: newId("directory_enquiry"), tenant_id: body.tenant_id, requesting_firm_id: body.requesting_firm_id, provider_firm_id: body.provider_firm_id, listing_id: listing.id, enquiry_summary: body.enquiry_summary, status: "ENQUIRY_RECORDED", matching_mode: "MANUAL_REVIEW_ONLY", no_live_matching: true, no_ranking: true, no_award: true, created_by_actor_id: actorId(actor), created_at: timestamp, updated_at: timestamp, metadata: body.metadata ?? {} };
    store.directory_private_enquiries.push(enquiry);
    appendEventAndAudit(store, { event_type: "marketplace.private_directory_enquiry_recorded", actor, tenant_id: body.tenant_id, firm_id: body.requesting_firm_id, aggregate_type: "PrivateDirectoryEnquiry", aggregate_id: enquiry.id, payload: enquiry, summary: "Private directory enquiry recorded for manual governance review only." });
    return enquiry;
  });
  const clientConn = await getPool().connect();
  try {
    const listingResult = await clientConn.query("select id::text from marketplace_listings where id=$1 and tenant_id=$2 and firm_id=$3 and status='PUBLISHED' and visibility='TRUSTED_NETWORK' and listing_scope='PRIVATE_NETWORK' and commercial_model->>'directory_type'='CONTROLLED_PRIVATE_QUALIFIED_DIRECTORY'", [body.listing_id, body.tenant_id, body.provider_firm_id]);
    if (listingResult.rowCount === 0) throwNotFound("marketplace_listings", body.listing_id);
    if (body.requesting_firm_id === body.provider_firm_id) invalidState("Private directory enquiry requires a separate requesting firm.");
    const enquiry = { id: newUuid(), tenant_id: body.tenant_id, requesting_firm_id: body.requesting_firm_id, provider_firm_id: body.provider_firm_id, listing_id: body.listing_id, enquiry_summary: body.enquiry_summary, status: "ENQUIRY_RECORDED", matching_mode: "MANUAL_REVIEW_ONLY", no_live_matching: true, no_ranking: true, no_award: true, created_by_actor_id: actorId(actor), created_at: timestamp, updated_at: timestamp, metadata: body.metadata ?? {} };
    await createDirectoryPrivateEnquiry({ ...enquiry, created_by_actor_id: uuidOrNull(enquiry.created_by_actor_id) }, clientConn);
    await withAppState((store) => { appendEventAndAudit(store, { event_type: "marketplace.private_directory_enquiry_recorded", actor, tenant_id: body.tenant_id, firm_id: body.requesting_firm_id, aggregate_type: "PrivateDirectoryEnquiry", aggregate_id: enquiry.id, payload: enquiry, summary: "Private directory enquiry recorded for manual governance review only." }); return enquiry; });
    return enquiry;
  } finally { clientConn.release(); }
}

export async function createDirectoryEnquiryCollaborationRequestRecord(body, actor) {
  requireHumanNetworkActor(actor, "ME-S3 enquiry-to-collaboration request");
  if (body.live_matching === true || body.ranking_requested === true || body.award_requested === true || body.autonomous_award === true) invalidState("ME-S3 collaboration request remains manual and cannot award work.");
  const timestamp = now();
  if (storeBackend !== "postgres") return withStore((store) => {
    const enquiry = (store.directory_private_enquiries ?? []).find((item) => item.id === body.enquiry_id && item.tenant_id === body.tenant_id && item.requesting_firm_id === body.requesting_firm_id && item.status === "ENQUIRY_RECORDED");
    if (!enquiry) throwNotFound("directory_private_enquiries", body.enquiry_id);
    const request = { id: newId("collab_req"), tenant_id: body.tenant_id, requesting_firm_id: enquiry.requesting_firm_id, provider_firm_id: enquiry.provider_firm_id, service_pack_id: body.service_pack_id ?? null, project_id: body.project_id ?? null, capacity_offer_id: null, request_summary: body.request_summary ?? enquiry.enquiry_summary, data_room_policy: { allowed: false, reason: "ME-S3 private enquiry request only; no client data room opened by default.", permitted_evidence_refs: body.permitted_evidence_refs ?? [] }, status: "REQUESTED", created_at: timestamp, updated_at: timestamp, metadata: { ...(body.metadata ?? {}), source_directory_enquiry_id: enquiry.id, listing_id: enquiry.listing_id, no_live_matching: true, no_ranking: true, no_award: true } };
    enquiry.status = "COLLABORATION_REQUESTED";
    enquiry.updated_at = timestamp;
    store.collaboration_requests.push(request);
    appendEventAndAudit(store, { event_type: "marketplace.directory_enquiry_collaboration_requested", actor, tenant_id: body.tenant_id, firm_id: enquiry.requesting_firm_id, aggregate_type: "CollaborationRequest", aggregate_id: request.id, payload: request, summary: "Private directory enquiry progressed to manual collaboration request without matching or award." });
    return { enquiry, collaboration_request: request };
  });
  const clientConn = await getPool().connect();
  try {
    await clientConn.query("begin");
    const enquiryResult = await clientConn.query("select id::text, tenant_id::text, requesting_firm_id::text, provider_firm_id::text, listing_id::text, enquiry_summary, status, matching_mode, no_live_matching, no_ranking, no_award, created_by_actor_id::text, created_at, updated_at, metadata from directory_private_enquiries where id=$1 and tenant_id=$2 and requesting_firm_id=$3 and status='ENQUIRY_RECORDED'", [body.enquiry_id, body.tenant_id, body.requesting_firm_id]);
    if (enquiryResult.rowCount === 0) throwNotFound("directory_private_enquiries", body.enquiry_id);
    const enquiry = mapDbDates(enquiryResult.rows[0]);
    const request = { id: newUuid(), tenant_id: body.tenant_id, requesting_firm_id: enquiry.requesting_firm_id, provider_firm_id: enquiry.provider_firm_id, service_pack_id: body.service_pack_id ?? null, project_id: body.project_id ?? null, capacity_offer_id: null, request_summary: body.request_summary ?? enquiry.enquiry_summary, data_room_policy: { allowed: false, reason: "ME-S3 private enquiry request only; no client data room opened by default.", permitted_evidence_refs: body.permitted_evidence_refs ?? [] }, status: "REQUESTED", created_at: timestamp, updated_at: timestamp, metadata: { ...(body.metadata ?? {}), source_directory_enquiry_id: enquiry.id, listing_id: enquiry.listing_id, no_live_matching: true, no_ranking: true, no_award: true } };
    await clientConn.query("insert into collaboration_requests (id, tenant_id, requesting_firm_id, provider_firm_id, service_pack_id, project_id, capacity_offer_id, request_summary, data_room_policy, status, created_at, updated_at, metadata) values ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12,$13::jsonb)", [request.id, request.tenant_id, request.requesting_firm_id, request.provider_firm_id, uuidOrNull(request.service_pack_id), uuidOrNull(request.project_id), uuidOrNull(request.capacity_offer_id), request.request_summary, JSON.stringify(request.data_room_policy), request.status, request.created_at, request.updated_at, JSON.stringify(request.metadata)]);
    await clientConn.query("update directory_private_enquiries set status='COLLABORATION_REQUESTED', updated_at=$1 where id=$2 and tenant_id=$3", [timestamp, enquiry.id, body.tenant_id]);
    await clientConn.query("commit");
    enquiry.status = "COLLABORATION_REQUESTED";
    enquiry.updated_at = timestamp;
    await withAppState((store) => { appendEventAndAudit(store, { event_type: "marketplace.directory_enquiry_collaboration_requested", actor, tenant_id: body.tenant_id, firm_id: enquiry.requesting_firm_id, aggregate_type: "CollaborationRequest", aggregate_id: request.id, payload: request, summary: "Private directory enquiry progressed to manual collaboration request without matching or award." }); return request; });
    return { enquiry, collaboration_request: request };
  } catch (error) { await clientConn.query("rollback"); throw error; } finally { clientConn.release(); }
}

export async function createQualificationRenewalReviewRecord(body, actor) {
  requireHumanNetworkActor(actor, "ME-S3 qualification renewal review");
  const reviewStatus = String(body.review_status ?? "").toUpperCase();
  if (!["VALID", "EXPIRING", "EXPIRED", "RENEWAL_REQUIRED", "SUSPEND_PUBLICATION"].includes(reviewStatus)) invalidState("Unsupported qualification renewal review status.");
  if (!Array.isArray(body.evidence_refs) || body.evidence_refs.length === 0) invalidState("Qualification renewal review requires evidence references.");
  const timestamp = now();
  if (storeBackend !== "postgres") return withStore((store) => {
    store.qualification_renewal_reviews ??= [];
    const gate = (store.network_qualification_gates ?? []).find((item) => item.id === body.qualification_gate_id && item.tenant_id === body.tenant_id && item.provider_firm_id === body.provider_firm_id);
    if (!gate) throwNotFound("network_qualification_gates", body.qualification_gate_id);
    const listing = (store.marketplace_listings ?? []).find((item) => item.id === body.listing_id && item.tenant_id === body.tenant_id && item.firm_id === body.provider_firm_id && item.commercial_model?.qualification_gate_id === gate.id);
    if (!listing) throwNotFound("marketplace_listings", body.listing_id);
    const record = { id: newId("qualification_renewal"), tenant_id: body.tenant_id, provider_firm_id: body.provider_firm_id, qualification_gate_id: gate.id, listing_id: listing.id, credential_id: gate.credential_id ?? listing.commercial_model?.credential_id ?? null, jurisdiction_ref: gate.jurisdiction_ref ?? null, review_status: reviewStatus, expires_at: body.expires_at ?? null, next_review_due_at: body.next_review_due_at ?? null, evidence_refs: body.evidence_refs, reviewed_by_actor_id: actorId(actor), reviewed_at: timestamp, created_at: timestamp, metadata: { ...(body.metadata ?? {}), tenant_confidential: true } };
    if (["EXPIRED", "SUSPEND_PUBLICATION"].includes(reviewStatus)) { listing.status = "SUSPENDED"; listing.updated_at = timestamp; listing.commercial_model = { ...(listing.commercial_model ?? {}), renewal_status: reviewStatus, renewal_suspended_at: timestamp }; }
    store.qualification_renewal_reviews.push(record);
    appendEventAndAudit(store, { event_type: "marketplace.qualification_renewal_review_recorded", actor, tenant_id: body.tenant_id, firm_id: body.provider_firm_id, aggregate_type: "QualificationRenewalReview", aggregate_id: record.id, payload: record, summary: "Qualification renewal or expiry review recorded for private directory listing." });
    return { renewal_review: record, listing };
  });
  const clientConn = await getPool().connect();
  try {
    await clientConn.query("begin");
    const gateResult = await clientConn.query("select id::text, tenant_id::text, provider_firm_id::text, credential_id::text, jurisdiction_ref from network_qualification_gates where id=$1 and tenant_id=$2 and provider_firm_id=$3", [body.qualification_gate_id, body.tenant_id, body.provider_firm_id]);
    if (gateResult.rowCount === 0) throwNotFound("network_qualification_gates", body.qualification_gate_id);
    const gate = gateResult.rows[0];
    const listingResult = await clientConn.query("select id::text, tenant_id::text, firm_id::text, service_pack_id::text, listing_scope, title, description, qualification_requirements, commercial_model, visibility, status, created_at, updated_at from marketplace_listings where id=$1 and tenant_id=$2 and firm_id=$3 and commercial_model->>'qualification_gate_id'=$4", [body.listing_id, body.tenant_id, body.provider_firm_id, gate.id]);
    if (listingResult.rowCount === 0) throwNotFound("marketplace_listings", body.listing_id);
    const listing = mapDbDates(listingResult.rows[0]);
    const record = { id: newUuid(), tenant_id: body.tenant_id, provider_firm_id: body.provider_firm_id, qualification_gate_id: gate.id, listing_id: listing.id, credential_id: gate.credential_id ?? listing.commercial_model?.credential_id ?? null, jurisdiction_ref: gate.jurisdiction_ref ?? null, review_status: reviewStatus, expires_at: body.expires_at ?? null, next_review_due_at: body.next_review_due_at ?? null, evidence_refs: body.evidence_refs, reviewed_by_actor_id: actorId(actor), reviewed_at: timestamp, created_at: timestamp, metadata: { ...(body.metadata ?? {}), tenant_confidential: true } };
    if (["EXPIRED", "SUSPEND_PUBLICATION"].includes(reviewStatus)) {
      listing.status = "SUSPENDED";
      listing.updated_at = timestamp;
      listing.commercial_model = { ...(listing.commercial_model ?? {}), renewal_status: reviewStatus, renewal_suspended_at: timestamp };
      await clientConn.query("update marketplace_listings set status='SUSPENDED', updated_at=$1, commercial_model = commercial_model || $2::jsonb where id=$3 and tenant_id=$4 and firm_id=$5", [timestamp, JSON.stringify({ renewal_status: reviewStatus, renewal_suspended_at: timestamp }), listing.id, body.tenant_id, body.provider_firm_id]);
    }
    await createQualificationRenewalReview({ ...record, credential_id: uuidOrNull(record.credential_id), reviewed_by_actor_id: uuidOrNull(record.reviewed_by_actor_id) }, clientConn);
    await clientConn.query("commit");
    await withAppState((store) => { appendEventAndAudit(store, { event_type: "marketplace.qualification_renewal_review_recorded", actor, tenant_id: body.tenant_id, firm_id: body.provider_firm_id, aggregate_type: "QualificationRenewalReview", aggregate_id: record.id, payload: record, summary: "Qualification renewal or expiry review recorded for private directory listing." }); return record; });
    return { renewal_review: record, listing };
  } catch (error) { await clientConn.query("rollback"); throw error; } finally { clientConn.release(); }
}
export async function createCapacityOfferRecord(body, actor) {
  const offer = buildCapacityOffer(body);
  if (storeBackend !== "postgres") return withStore((store)=>{ store.capacity_offers.push(offer); appendEventAndAudit(store,{event_type:"capacity_offer.created",actor,tenant_id:body.tenant_id,firm_id:body.firm_id,aggregate_type:"CapacityOffer",aggregate_id:offer.id,payload:offer,summary:"Capacity offer created for trusted network."}); return offer; });
  const clientConn=await getPool().connect(); try{ await createCapacityOffer({ ...offer, service_pack_id: uuidOrNull(offer.service_pack_id) }, clientConn); await withAppState((store)=>{appendEventAndAudit(store,{event_type:"capacity_offer.created",actor,tenant_id:body.tenant_id,firm_id:body.firm_id,aggregate_type:"CapacityOffer",aggregate_id:offer.id,payload:offer,summary:"Capacity offer created for trusted network."}); return offer;}); return offer;} finally{clientConn.release();}
}

export async function createCollaborationRequestRecord(body, actor) {
  const request = buildCollaborationRequest(body);
  if (storeBackend !== "postgres") return withStore((store)=>{ const offer=body.capacity_offer_id ? store.capacity_offers.find((item)=>item.id===body.capacity_offer_id) : null; if(body.capacity_offer_id&&!offer) throwNotFound("capacity_offers",body.capacity_offer_id); store.collaboration_requests.push(request); appendEventAndAudit(store,{event_type:"collaboration.requested",actor,tenant_id:body.tenant_id,firm_id:body.requesting_firm_id,aggregate_type:"CollaborationRequest",aggregate_id:request.id,payload:request,summary:"Trusted network collaboration requested."}); return request; });
  const clientConn=await getPool().connect(); try{ await clientConn.query("insert into collaboration_requests (id, tenant_id, requesting_firm_id, provider_firm_id, service_pack_id, project_id, capacity_offer_id, request_summary, data_room_policy, status, created_at, updated_at) values ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12)",[request.id,request.tenant_id,request.requesting_firm_id,uuidOrNull(request.provider_firm_id),uuidOrNull(request.service_pack_id),uuidOrNull(request.project_id),uuidOrNull(request.capacity_offer_id),request.request_summary,JSON.stringify(request.data_room_policy),request.status,request.created_at,request.updated_at]); await withAppState((store)=>{appendEventAndAudit(store,{event_type:"collaboration.requested",actor,tenant_id:body.tenant_id,firm_id:body.requesting_firm_id,aggregate_type:"CollaborationRequest",aggregate_id:request.id,payload:request,summary:"Trusted network collaboration requested."}); return request;}); return request;} finally{clientConn.release();}
}


export async function createNetworkProfessionalProfileRecord(body, actor) {
  requireHumanNetworkActor(actor, "Trusted network professional profile creation");
  assertTrustedNetworkOnly(body);
  const profile = buildNetworkProfessionalProfile(body, actor);
  if (body.authority_grant === true || profile.authority_grant === true) invalidState("Network professional profiles do not grant professional authority.");
  if (storeBackend !== "postgres") return withStore((store)=>{ store.network_professional_profiles.push(profile); appendEventAndAudit(store,{event_type:"network.professional_profile_created",actor,tenant_id:profile.tenant_id,firm_id:profile.firm_id,aggregate_type:"NetworkProfessionalProfile",aggregate_id:profile.id,payload:profile,summary:"Trusted network professional profile created without authority grant."}); return profile; });
  const clientConn=await getPool().connect(); try{ await createNetworkProfessionalProfile({ ...profile, person_id: uuidOrNull(profile.person_id), professional_profile_id: uuidOrNull(profile.professional_profile_id), created_by_actor_id: uuidOrNull(profile.created_by_actor_id) }, clientConn); await withAppState((store)=>{appendEventAndAudit(store,{event_type:"network.professional_profile_created",actor,tenant_id:profile.tenant_id,firm_id:profile.firm_id,aggregate_type:"NetworkProfessionalProfile",aggregate_id:profile.id,payload:profile,summary:"Trusted network professional profile created without authority grant."}); return profile;}); return profile;} finally{clientConn.release();}
}

export async function createNetworkFirmProfileRecord(body, actor) {
  requireHumanNetworkActor(actor, "Trusted network firm profile creation");
  assertTrustedNetworkOnly(body);
  const profile = buildNetworkFirmProfile(body, actor);
  if (storeBackend !== "postgres") return withStore((store)=>{ store.network_firm_profiles.push(profile); appendEventAndAudit(store,{event_type:"network.firm_profile_created",actor,tenant_id:profile.tenant_id,firm_id:profile.firm_id,aggregate_type:"NetworkFirmProfile",aggregate_id:profile.id,payload:profile,summary:"Trusted network firm profile created."}); return profile; });
  const clientConn=await getPool().connect(); try{ await createNetworkFirmProfile({ ...profile, created_by_actor_id: uuidOrNull(profile.created_by_actor_id) }, clientConn); await withAppState((store)=>{appendEventAndAudit(store,{event_type:"network.firm_profile_created",actor,tenant_id:profile.tenant_id,firm_id:profile.firm_id,aggregate_type:"NetworkFirmProfile",aggregate_id:profile.id,payload:profile,summary:"Trusted network firm profile created."}); return profile;}); return profile;} finally{clientConn.release();}
}

export async function createNetworkCapabilityRecord(body, actor) {
  requireHumanNetworkActor(actor, "Trusted network capability creation");
  assertTrustedNetworkOnly(body);
  const capability = buildNetworkCapability(body, actor);
  if (!capability.qualification_required) invalidState("Trusted network capabilities require qualification before invitation or assignment.");
  if (storeBackend !== "postgres") return withStore((store)=>{ store.network_capabilities.push(capability); appendEventAndAudit(store,{event_type:"network.capability_created",actor,tenant_id:capability.tenant_id,firm_id:capability.firm_id,aggregate_type:"NetworkCapability",aggregate_id:capability.id,payload:capability,summary:"Trusted network capability created with qualification required."}); return capability; });
  const clientConn=await getPool().connect(); try{ await createNetworkCapability({ ...capability, professional_network_profile_id: uuidOrNull(capability.professional_network_profile_id), firm_network_profile_id: uuidOrNull(capability.firm_network_profile_id), created_by_actor_id: uuidOrNull(capability.created_by_actor_id) }, clientConn); await withAppState((store)=>{appendEventAndAudit(store,{event_type:"network.capability_created",actor,tenant_id:capability.tenant_id,firm_id:capability.firm_id,aggregate_type:"NetworkCapability",aggregate_id:capability.id,payload:capability,summary:"Trusted network capability created with qualification required."}); return capability;}); return capability;} finally{clientConn.release();}
}

export async function createNetworkCredentialRecord(body, actor) {
  requireHumanNetworkActor(actor, "Trusted network credential recording");
  const credential = buildNetworkCredential(body, actor);
  if (body.authority_grant === true || credential.authority_grant === true) invalidState("Network credentials are evidence records and do not grant professional authority.");
  if (credential.verification_status === "VERIFIED" && !credential.verified_by_actor_id) {
    credential.verified_by_actor_id = actorId(actor);
    credential.verified_at = credential.verified_at ?? now();
  }
  if (storeBackend !== "postgres") return withStore((store)=>{ store.network_credentials.push(credential); appendEventAndAudit(store,{event_type:"network.credential_recorded",actor,tenant_id:credential.tenant_id,firm_id:credential.firm_id,aggregate_type:"NetworkCredential",aggregate_id:credential.id,payload:credential,summary:"Trusted network credential recorded without authority grant."}); return credential; });
  const clientConn=await getPool().connect(); try{ await createNetworkCredential({ ...credential, professional_network_profile_id: uuidOrNull(credential.professional_network_profile_id), verified_by_actor_id: uuidOrNull(credential.verified_by_actor_id), created_by_actor_id: uuidOrNull(credential.created_by_actor_id) }, clientConn); await withAppState((store)=>{appendEventAndAudit(store,{event_type:"network.credential_recorded",actor,tenant_id:credential.tenant_id,firm_id:credential.firm_id,aggregate_type:"NetworkCredential",aggregate_id:credential.id,payload:credential,summary:"Trusted network credential recorded without authority grant."}); return credential;}); return credential;} finally{clientConn.release();}
}

export async function createNetworkTrustSignalRecord(body, actor) {
  requireHumanNetworkActor(actor, "Trusted network trust signal recording");
  if (body.substitutes_for_credential === true) {
    const error = new Error("Trust signals cannot substitute for credentials or professional authority.");
    error.status = 403;
    error.code = "TRUST_SIGNAL_CANNOT_REPLACE_CREDENTIAL";
    throw error;
  }
  const signal = buildNetworkTrustSignal(body, actor);
  if (storeBackend !== "postgres") return withStore((store)=>{ store.network_trust_signals.push(signal); appendEventAndAudit(store,{event_type:"network.trust_signal_recorded",actor,tenant_id:signal.tenant_id,firm_id:signal.firm_id,aggregate_type:"NetworkTrustSignal",aggregate_id:signal.id,payload:signal,summary:"Trusted network trust signal recorded as non-credential evidence."}); return signal; });
  const clientConn=await getPool().connect(); try{ await createNetworkTrustSignal({ ...signal, subject_id: uuidOrNull(signal.subject_id), created_by_actor_id: uuidOrNull(signal.created_by_actor_id) }, clientConn); await withAppState((store)=>{appendEventAndAudit(store,{event_type:"network.trust_signal_recorded",actor,tenant_id:signal.tenant_id,firm_id:signal.firm_id,aggregate_type:"NetworkTrustSignal",aggregate_id:signal.id,payload:signal,summary:"Trusted network trust signal recorded as non-credential evidence."}); return signal;}); return signal;} finally{clientConn.release();}
}

export async function createNetworkConflictCheckRecord(body, actor) {
  requireHumanNetworkActor(actor, "Trusted network conflict check recording");
  const check = buildNetworkConflictCheck(body, actor);
  if (storeBackend !== "postgres") return withStore((store)=>{ store.network_conflict_checks.push(check); appendEventAndAudit(store,{event_type:"network.conflict_check_recorded",actor,tenant_id:check.tenant_id,firm_id:check.requesting_firm_id,aggregate_type:"NetworkConflictCheck",aggregate_id:check.id,payload:check,summary:"Trusted network conflict check recorded before invitation."}); return check; });
  const clientConn=await getPool().connect(); try{ await createNetworkConflictCheck({ ...check, subject_profile_id: uuidOrNull(check.subject_profile_id), checked_by_actor_id: uuidOrNull(check.checked_by_actor_id) }, clientConn); await withAppState((store)=>{appendEventAndAudit(store,{event_type:"network.conflict_check_recorded",actor,tenant_id:check.tenant_id,firm_id:check.requesting_firm_id,aggregate_type:"NetworkConflictCheck",aggregate_id:check.id,payload:check,summary:"Trusted network conflict check recorded before invitation."}); return check;}); return check;} finally{clientConn.release();}
}

export async function createNetworkQualificationGateRecord(body, actor) {
  requireHumanNetworkActor(actor, "Trusted network qualification gate evaluation");
  const gate = buildNetworkQualificationGate(body, actor);
  if (storeBackend !== "postgres") return withStore((store)=>{ store.network_qualification_gates.push(gate); appendEventAndAudit(store,{event_type:gate.gate_status === "PASS" ? "network.qualification_gate_passed" : "network.qualification_gate_denied",actor,tenant_id:gate.tenant_id,firm_id:gate.requesting_firm_id,aggregate_type:"NetworkQualificationGate",aggregate_id:gate.id,payload:gate,summary:gate.gate_status === "PASS" ? "Trusted network qualification gate passed." : "Trusted network qualification gate denied before invitation."}); return gate; });
  const clientConn=await getPool().connect(); try{ await createNetworkQualificationGate({ ...gate, professional_network_profile_id: uuidOrNull(gate.professional_network_profile_id), firm_network_profile_id: uuidOrNull(gate.firm_network_profile_id), capability_id: uuidOrNull(gate.capability_id), credential_id: uuidOrNull(gate.credential_id), conflict_check_id: uuidOrNull(gate.conflict_check_id), created_by_actor_id: uuidOrNull(gate.created_by_actor_id) }, clientConn); await withAppState((store)=>{appendEventAndAudit(store,{event_type:gate.gate_status === "PASS" ? "network.qualification_gate_passed" : "network.qualification_gate_denied",actor,tenant_id:gate.tenant_id,firm_id:gate.requesting_firm_id,aggregate_type:"NetworkQualificationGate",aggregate_id:gate.id,payload:gate,summary:gate.gate_status === "PASS" ? "Trusted network qualification gate passed." : "Trusted network qualification gate denied before invitation."}); return gate;}); return gate;} finally{clientConn.release();}
}

export async function createSpecialistInvitationRecord(body, actor) {
  requireHumanNetworkActor(actor, "Trusted network specialist invitation");
  const store = await readStore();
  const gate = (store.network_qualification_gates ?? []).find((item)=>item.id === body.qualification_gate_id && item.tenant_id === body.tenant_id && item.requesting_firm_id === body.requesting_firm_id);
  if (!gate) throwNotFound("network_qualification_gates", body.qualification_gate_id);
  const invitation = buildSpecialistInvitation(body, actor, gate);
  if (gate.gate_status !== "PASS") {
    await withStore((next)=>{ next.specialist_invitations.push(invitation); appendEventAndAudit(next,{event_type:"network.specialist_invitation_denied",actor,tenant_id:invitation.tenant_id,firm_id:invitation.requesting_firm_id,aggregate_type:"SpecialistInvitation",aggregate_id:invitation.id,payload:invitation,summary:"Specialist invitation denied because qualification gate did not pass."}); return invitation; });
    const error = new Error("Specialist invitation requires a passing qualification gate.");
    error.status = 403;
    error.code = "SPECIALIST_INVITATION_GATE_DENIED";
    error.details = { qualification_gate_id: gate.id, denial_reasons: gate.denial_reasons };
    throw error;
  }
  if (storeBackend !== "postgres") return withStore((next)=>{ next.specialist_invitations.push(invitation); appendEventAndAudit(next,{event_type:"network.specialist_invitation_ready",actor,tenant_id:invitation.tenant_id,firm_id:invitation.requesting_firm_id,aggregate_type:"SpecialistInvitation",aggregate_id:invitation.id,payload:invitation,summary:"Specialist invitation prepared after passing qualification gate."}); return invitation; });
  const clientConn=await getPool().connect(); try{ await createSpecialistInvitation({ ...invitation, qualification_gate_id: uuidOrNull(invitation.qualification_gate_id), capability_id: uuidOrNull(invitation.capability_id), invited_by_actor_id: uuidOrNull(invitation.invited_by_actor_id) }, clientConn); await withAppState((next)=>{appendEventAndAudit(next,{event_type:"network.specialist_invitation_ready",actor,tenant_id:invitation.tenant_id,firm_id:invitation.requesting_firm_id,aggregate_type:"SpecialistInvitation",aggregate_id:invitation.id,payload:invitation,summary:"Specialist invitation prepared after passing qualification gate."}); return invitation;}); return invitation;} finally{clientConn.release();}
}

export async function createCollaborationWorkspaceRecord(body, actor) {
  requireHumanNetworkActor(actor, "Trusted collaboration workspace creation");
  const store = await readStore();
  const invitation = (store.specialist_invitations ?? []).find((item)=>item.id === body.specialist_invitation_id && item.tenant_id === body.tenant_id && item.requesting_firm_id === body.requesting_firm_id);
  if (!invitation) throwNotFound("specialist_invitations", body.specialist_invitation_id);
  if (invitation.invitation_status !== "READY_TO_SEND") invalidState("Collaboration workspace requires a ready specialist invitation from a passed qualification gate.");
  const workspace = buildCollaborationWorkspace(body, actor, invitation);
  assertWorkspacePolicy(workspace.data_room_policy);
  if (storeBackend !== "postgres") return withStore((next)=>{ next.collaboration_workspaces.push(workspace); appendEventAndAudit(next,{event_type:"network.collaboration_workspace_opened",actor,tenant_id:workspace.tenant_id,firm_id:workspace.requesting_firm_id,aggregate_type:"CollaborationWorkspace",aggregate_id:workspace.id,payload:workspace,summary:"Scoped trusted collaboration workspace opened from qualified specialist invitation."}); return workspace; });
  const clientConn=await getPool().connect(); try{ await createCollaborationWorkspace({ ...workspace, specialist_invitation_id: uuidOrNull(workspace.specialist_invitation_id), qualification_gate_id: uuidOrNull(workspace.qualification_gate_id), created_by_actor_id: uuidOrNull(workspace.created_by_actor_id) }, clientConn); await withAppState((next)=>{appendEventAndAudit(next,{event_type:"network.collaboration_workspace_opened",actor,tenant_id:workspace.tenant_id,firm_id:workspace.requesting_firm_id,aggregate_type:"CollaborationWorkspace",aggregate_id:workspace.id,payload:workspace,summary:"Scoped trusted collaboration workspace opened from qualified specialist invitation."}); return workspace;}); return workspace;} finally{clientConn.release();}
}

export async function grantCollaborationWorkspaceParticipantRecord(body, actor) {
  requireHumanNetworkActor(actor, "Trusted collaboration workspace participant grant");
  const store = await readStore();
  const workspace = (store.collaboration_workspaces ?? []).find((item)=>item.id === body.workspace_id && item.tenant_id === body.tenant_id && item.requesting_firm_id === body.requesting_firm_id && item.workspace_status === "ACTIVE");
  if (!workspace) throwNotFound("collaboration_workspaces", body.workspace_id);
  if (![workspace.requesting_firm_id, workspace.provider_firm_id].includes(body.firm_id)) invalidState("Participant firm must belong to the scoped collaboration workspace.");
  const participant = buildWorkspaceParticipant(body, actor);
  if (storeBackend !== "postgres") return withStore((next)=>{ next.collaboration_workspace_participants.push(participant); appendEventAndAudit(next,{event_type:"network.collaboration_participant_granted",actor,tenant_id:participant.tenant_id,firm_id:workspace.requesting_firm_id,aggregate_type:"CollaborationWorkspaceParticipant",aggregate_id:participant.id,payload:participant,summary:"Scoped collaboration workspace access granted."}); return participant; });
  const clientConn=await getPool().connect(); try{ await createCollaborationWorkspaceParticipant({ ...participant, workspace_id: uuidOrNull(participant.workspace_id), actor_id: uuidOrNull(participant.actor_id), granted_by_actor_id: uuidOrNull(participant.granted_by_actor_id), revoked_by_actor_id: uuidOrNull(participant.revoked_by_actor_id) }, clientConn); await withAppState((next)=>{appendEventAndAudit(next,{event_type:"network.collaboration_participant_granted",actor,tenant_id:participant.tenant_id,firm_id:workspace.requesting_firm_id,aggregate_type:"CollaborationWorkspaceParticipant",aggregate_id:participant.id,payload:participant,summary:"Scoped collaboration workspace access granted."}); return participant;}); return participant;} finally{clientConn.release();}
}

export async function revokeCollaborationWorkspaceParticipantRecord(body, actor) {
  requireHumanNetworkActor(actor, "Trusted collaboration workspace participant revocation");
  const timestamp = now();
  if (storeBackend !== "postgres") return withStore((store)=>{ const participant=(store.collaboration_workspace_participants??[]).find((item)=>item.id===body.participant_id && item.tenant_id===body.tenant_id); if(!participant) throwNotFound("collaboration_workspace_participants",body.participant_id); participant.access_status="REVOKED"; participant.revoked_by_actor_id=actorId(actor); participant.revoked_at=timestamp; participant.metadata={...(participant.metadata??{}), revocation_reason: body.revocation_reason ?? "workspace_access_revoked"}; const workspace=(store.collaboration_workspaces??[]).find((item)=>item.id===participant.workspace_id); appendEventAndAudit(store,{event_type:"network.collaboration_participant_revoked",actor,tenant_id:participant.tenant_id,firm_id:workspace?.requesting_firm_id??actor.firm_id,aggregate_type:"CollaborationWorkspaceParticipant",aggregate_id:participant.id,payload:participant,summary:"Scoped collaboration workspace access revoked."}); return participant; });
  const clientConn=await getPool().connect(); try{ const result=await clientConn.query("update collaboration_workspace_participants set access_status='REVOKED', revoked_by_actor_id=$1, revoked_at=$2, metadata = metadata || $3::jsonb where id=$4 and tenant_id=$5 returning id::text, tenant_id::text, workspace_id::text, firm_id::text, actor_id::text, participant_role, access_status, permissions, granted_by_actor_id::text, granted_at, revoked_by_actor_id::text, revoked_at, metadata",[uuidOrNull(actorId(actor)),timestamp,JSON.stringify({revocation_reason: body.revocation_reason ?? "workspace_access_revoked"}),body.participant_id,body.tenant_id]); if(result.rowCount===0) throwNotFound("collaboration_workspace_participants",body.participant_id); const participant=mapDbDates(result.rows[0]); await withAppState((store)=>{appendEventAndAudit(store,{event_type:"network.collaboration_participant_revoked",actor,tenant_id:participant.tenant_id,firm_id:actor.firm_id,aggregate_type:"CollaborationWorkspaceParticipant",aggregate_id:participant.id,payload:participant,summary:"Scoped collaboration workspace access revoked."}); return participant;}); return participant;} finally{clientConn.release();}
}

export async function createResponsibilityMatrixRecord(body, actor) {
  requireHumanNetworkActor(actor, "Trusted collaboration responsibility matrix");
  const store = await readStore();
  const workspace = (store.collaboration_workspaces ?? []).find((item)=>item.id === body.workspace_id && item.tenant_id === body.tenant_id && item.workspace_status === "ACTIVE");
  if (!workspace) throwNotFound("collaboration_workspaces", body.workspace_id);
  const participants = (store.collaboration_workspace_participants ?? []).filter((item)=>item.workspace_id === body.workspace_id && item.tenant_id === body.tenant_id);
  const matrix = buildResponsibilityMatrix(body, actor, workspace);
  assertResponsibilityMatrix(matrix, workspace, participants);
  if (storeBackend !== "postgres") return withStore((next)=>{ next.responsibility_matrices.push(matrix); appendEventAndAudit(next,{event_type:"network.responsibility_matrix_recorded",actor,tenant_id:matrix.tenant_id,firm_id:workspace.requesting_firm_id,aggregate_type:"ResponsibilityMatrix",aggregate_id:matrix.id,payload:matrix,summary:"Trusted collaboration responsibility and approval matrix recorded."}); return matrix; });
  const clientConn=await getPool().connect(); try{ await createResponsibilityMatrix({ ...matrix, workspace_id: uuidOrNull(matrix.workspace_id), responsible_professional_actor_id: uuidOrNull(matrix.responsible_professional_actor_id), reviewer_actor_id: uuidOrNull(matrix.reviewer_actor_id), approver_actor_id: uuidOrNull(matrix.approver_actor_id), created_by_actor_id: uuidOrNull(matrix.created_by_actor_id) }, clientConn); await withAppState((next)=>{appendEventAndAudit(next,{event_type:"network.responsibility_matrix_recorded",actor,tenant_id:matrix.tenant_id,firm_id:workspace.requesting_firm_id,aggregate_type:"ResponsibilityMatrix",aggregate_id:matrix.id,payload:matrix,summary:"Trusted collaboration responsibility and approval matrix recorded."}); return matrix;}); return matrix;} finally{clientConn.release();}
}


function buildSpecialistAssignment(body, actor = {}, matrix) {
  const relational = storeBackend === "postgres";
  const timestamp = now();
  return {
    id: relational ? newUuid() : newId("specialist_assignment"),
    tenant_id: body.tenant_id,
    workspace_id: matrix.workspace_id,
    responsibility_matrix_id: matrix.id,
    requesting_firm_id: matrix.requesting_firm_id,
    provider_firm_id: matrix.provider_firm_id,
    assignment_title: body.assignment_title,
    assignment_scope: body.assignment_scope,
    assignment_status: "REQUESTED",
    requested_by_actor_id: actorId(actor),
    accepted_by_actor_id: null,
    started_by_actor_id: null,
    delivered_by_actor_id: null,
    reviewed_by_actor_id: null,
    approved_by_actor_id: null,
    closed_by_actor_id: null,
    evidence_refs: body.evidence_refs ?? [],
    review_summary: null,
    approval_summary: null,
    requested_at: timestamp,
    accepted_at: null,
    started_at: null,
    delivered_at: null,
    reviewed_at: null,
    approved_at: null,
    closed_at: null,
    updated_at: timestamp,
    metadata: body.metadata ?? {}
  };
}

function findActiveResponsibilityMatrix(store, body) {
  const matrix = (store.responsibility_matrices ?? []).find((item) => item.id === body.responsibility_matrix_id && item.tenant_id === body.tenant_id && item.matrix_status === "ACTIVE");
  if (!matrix) throwNotFound("responsibility_matrices", body.responsibility_matrix_id);
  const workspace = (store.collaboration_workspaces ?? []).find((item) => item.id === matrix.workspace_id && item.tenant_id === body.tenant_id && item.workspace_status === "ACTIVE");
  if (!workspace) throwNotFound("collaboration_workspaces", matrix.workspace_id);
  return { matrix, workspace };
}

function assertSpecialistAssignmentActor(assignment, matrix, actor, action) {
  const id = actorId(actor);
  if (action === "accept" && id !== matrix.responsible_professional_actor_id) invalidState("Only the responsible professional can accept the specialist assignment.");
  if (action === "start" && id !== matrix.responsible_professional_actor_id) invalidState("Only the responsible professional can start specialist assignment work.");
  if (action === "deliver" && id !== matrix.responsible_professional_actor_id) invalidState("Only the responsible professional can deliver specialist assignment evidence.");
  if (action === "review" && matrix.reviewer_actor_id && id !== matrix.reviewer_actor_id) invalidState("Only the recorded reviewer can review specialist assignment delivery.");
  if (action === "approve" && id !== matrix.approver_actor_id) invalidState("Only the recorded approver can approve specialist assignment delivery.");
  if (action === "close" && id !== matrix.approver_actor_id) invalidState("Only the recorded approver can close specialist assignment delivery.");
}

function assertAssignmentTransition(assignment, nextStatus) {
  const allowed = {
    ACCEPTED: ["REQUESTED"],
    IN_PROGRESS: ["ACCEPTED"],
    DELIVERED: ["IN_PROGRESS"],
    REVIEWED: ["DELIVERED"],
    APPROVED: ["REVIEWED"],
    CLOSED: ["APPROVED"]
  };
  if (!(allowed[nextStatus] ?? []).includes(assignment.assignment_status)) invalidState(`Specialist assignment cannot move from ${assignment.assignment_status} to ${nextStatus}.`);
}

async function persistSpecialistAssignmentPostgres(assignment) {
  const clientConn = await getPool().connect();
  try {
    await clientConn.query("insert into specialist_assignments (id, tenant_id, workspace_id, responsibility_matrix_id, requesting_firm_id, provider_firm_id, assignment_title, assignment_scope, assignment_status, requested_by_actor_id, accepted_by_actor_id, started_by_actor_id, delivered_by_actor_id, reviewed_by_actor_id, approved_by_actor_id, closed_by_actor_id, evidence_refs, review_summary, approval_summary, requested_at, accepted_at, started_at, delivered_at, reviewed_at, approved_at, closed_at, updated_at, metadata) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17::jsonb,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28::jsonb) on conflict (id) do update set assignment_status=excluded.assignment_status, accepted_by_actor_id=excluded.accepted_by_actor_id, started_by_actor_id=excluded.started_by_actor_id, delivered_by_actor_id=excluded.delivered_by_actor_id, reviewed_by_actor_id=excluded.reviewed_by_actor_id, approved_by_actor_id=excluded.approved_by_actor_id, closed_by_actor_id=excluded.closed_by_actor_id, evidence_refs=excluded.evidence_refs, review_summary=excluded.review_summary, approval_summary=excluded.approval_summary, accepted_at=excluded.accepted_at, started_at=excluded.started_at, delivered_at=excluded.delivered_at, reviewed_at=excluded.reviewed_at, approved_at=excluded.approved_at, closed_at=excluded.closed_at, updated_at=excluded.updated_at, metadata=excluded.metadata", [assignment.id, assignment.tenant_id, uuidOrNull(assignment.workspace_id), uuidOrNull(assignment.responsibility_matrix_id), assignment.requesting_firm_id, assignment.provider_firm_id, assignment.assignment_title, assignment.assignment_scope, assignment.assignment_status, uuidOrNull(assignment.requested_by_actor_id), uuidOrNull(assignment.accepted_by_actor_id), uuidOrNull(assignment.started_by_actor_id), uuidOrNull(assignment.delivered_by_actor_id), uuidOrNull(assignment.reviewed_by_actor_id), uuidOrNull(assignment.approved_by_actor_id), uuidOrNull(assignment.closed_by_actor_id), JSON.stringify(assignment.evidence_refs ?? []), assignment.review_summary, assignment.approval_summary, assignment.requested_at, assignment.accepted_at, assignment.started_at, assignment.delivered_at, assignment.reviewed_at, assignment.approved_at, assignment.closed_at, assignment.updated_at, JSON.stringify(assignment.metadata ?? {})]);
    return assignment;
  } finally {
    clientConn.release();
  }
}

export async function createSpecialistAssignmentRecord(body, actor) {
  requireHumanNetworkActor(actor, "Trusted specialist assignment request");
  const store = await readStore();
  const { matrix } = findActiveResponsibilityMatrix(store, body);
  const assignment = buildSpecialistAssignment(body, actor, matrix);
  if (storeBackend !== "postgres") return withStore((next)=>{ next.specialist_assignments.push(assignment); appendEventAndAudit(next,{event_type:"network.specialist_assignment_requested",actor,tenant_id:assignment.tenant_id,firm_id:assignment.requesting_firm_id,aggregate_type:"SpecialistAssignment",aggregate_id:assignment.id,payload:assignment,summary:"Trusted specialist assignment requested under active responsibility matrix."}); return assignment; });
  await persistSpecialistAssignmentPostgres(assignment);
  await withAppState((next)=>{appendEventAndAudit(next,{event_type:"network.specialist_assignment_requested",actor,tenant_id:assignment.tenant_id,firm_id:assignment.requesting_firm_id,aggregate_type:"SpecialistAssignment",aggregate_id:assignment.id,payload:assignment,summary:"Trusted specialist assignment requested under active responsibility matrix."}); return assignment;});
  return assignment;
}

export async function transitionSpecialistAssignmentRecord(body, actor, action) {
  requireHumanNetworkActor(actor, `Trusted specialist assignment ${action}`);
  const transition = { accept: "ACCEPTED", start: "IN_PROGRESS", deliver: "DELIVERED", review: "REVIEWED", approve: "APPROVED", close: "CLOSED" }[action];
  const timestampField = { accept: "accepted_at", start: "started_at", deliver: "delivered_at", review: "reviewed_at", approve: "approved_at", close: "closed_at" }[action];
  const actorField = { accept: "accepted_by_actor_id", start: "started_by_actor_id", deliver: "delivered_by_actor_id", review: "reviewed_by_actor_id", approve: "approved_by_actor_id", close: "closed_by_actor_id" }[action];
  const eventType = { accept: "network.specialist_assignment_accepted", start: "network.specialist_assignment_started", deliver: "network.specialist_assignment_delivered", review: "network.specialist_assignment_reviewed", approve: "network.specialist_assignment_approved", close: "network.specialist_assignment_closed" }[action];
  const store = await readStore();
  const assignment = (store.specialist_assignments ?? []).find((item) => item.id === body.assignment_id && item.tenant_id === body.tenant_id);
  if (!assignment) throwNotFound("specialist_assignments", body.assignment_id);
  const matrix = (store.responsibility_matrices ?? []).find((item) => item.id === assignment.responsibility_matrix_id && item.tenant_id === body.tenant_id && item.matrix_status === "ACTIVE");
  if (!matrix) throwNotFound("responsibility_matrices", assignment.responsibility_matrix_id);
  assertSpecialistAssignmentActor(assignment, matrix, actor, action);
  assertAssignmentTransition(assignment, transition);
  if (action === "deliver" && (!Array.isArray(body.evidence_refs) || body.evidence_refs.length === 0)) invalidState("Specialist delivery requires evidence references.");
  const update = (record) => {
    record.assignment_status = transition;
    record[actorField] = actorId(actor);
    record[timestampField] = now();
    record.updated_at = record[timestampField];
    if (action === "deliver") record.evidence_refs = body.evidence_refs;
    if (action === "review") record.review_summary = body.review_summary ?? "Specialist delivery reviewed.";
    if (action === "approve") record.approval_summary = body.approval_summary ?? "Specialist delivery approved by recorded approver.";
    record.metadata = { ...(record.metadata ?? {}), ...(body.metadata ?? {}) };
    return record;
  };
  if (storeBackend !== "postgres") return withStore((next)=>{ const target=(next.specialist_assignments??[]).find((item)=>item.id===assignment.id); const updated=update(target); appendEventAndAudit(next,{event_type:eventType,actor,tenant_id:updated.tenant_id,firm_id:updated.requesting_firm_id,aggregate_type:"SpecialistAssignment",aggregate_id:updated.id,payload:updated,summary:`Trusted specialist assignment ${action} transition recorded.`}); return updated; });
  const updatedAssignment = update({ ...assignment });
  await persistSpecialistAssignmentPostgres(updatedAssignment);
  await withAppState((next)=>{appendEventAndAudit(next,{event_type:eventType,actor,tenant_id:updatedAssignment.tenant_id,firm_id:updatedAssignment.requesting_firm_id,aggregate_type:"SpecialistAssignment",aggregate_id:updatedAssignment.id,payload:updatedAssignment,summary:`Trusted specialist assignment ${action} transition recorded.`}); return updatedAssignment;});
  return updatedAssignment;
}
export async function addCollaborationWorkspaceEvidenceRecord(body, actor) {
  requireHumanNetworkActor(actor, "Trusted collaboration workspace evidence addition");
  const store = await readStore();
  const workspace = (store.collaboration_workspaces ?? []).find((item)=>item.id === body.workspace_id && item.tenant_id === body.tenant_id && item.workspace_status === "ACTIVE");
  if (!workspace) throwNotFound("collaboration_workspaces", body.workspace_id);
  const participant = (store.collaboration_workspace_participants ?? []).find((item)=>item.id === body.participant_id && item.workspace_id === body.workspace_id && item.tenant_id === body.tenant_id);
  if (!participant) throwNotFound("collaboration_workspace_participants", body.participant_id);
  if (participant.access_status !== "ACTIVE") {
    const error = new Error("Revoked or inactive collaboration participants cannot add workspace evidence.");
    error.status = 403;
    error.code = "COLLABORATION_WORKSPACE_ACCESS_REVOKED";
    throw error;
  }
  const evidence = buildWorkspaceEvidence(body, actor);
  if (evidence.access_scope !== "WORKSPACE_ONLY") invalidState("R5-S3 evidence refs must remain workspace-scoped.");
  if (storeBackend !== "postgres") return withStore((next)=>{ next.collaboration_workspace_evidence.push(evidence); appendEventAndAudit(next,{event_type:"network.collaboration_evidence_added",actor,tenant_id:evidence.tenant_id,firm_id:workspace.requesting_firm_id,aggregate_type:"CollaborationWorkspaceEvidence",aggregate_id:evidence.id,payload:evidence,summary:"Workspace-scoped collaboration evidence reference added."}); return evidence; });
  const clientConn=await getPool().connect(); try{ await createCollaborationWorkspaceEvidence({ ...evidence, workspace_id: uuidOrNull(evidence.workspace_id), participant_id: uuidOrNull(evidence.participant_id), added_by_actor_id: uuidOrNull(evidence.added_by_actor_id) }, clientConn); await withAppState((next)=>{appendEventAndAudit(next,{event_type:"network.collaboration_evidence_added",actor,tenant_id:evidence.tenant_id,firm_id:workspace.requesting_firm_id,aggregate_type:"CollaborationWorkspaceEvidence",aggregate_id:evidence.id,payload:evidence,summary:"Workspace-scoped collaboration evidence reference added."}); return evidence;}); return evidence;} finally{clientConn.release();}
}
export async function createObservatorySnapshotRecord(body, actor) {
  const store = await readStore();
  const metrics = body.metrics ?? {
    firms: (store.firms ?? []).length,
    active_service_packs: (store.service_packs ?? []).filter((pack)=>pack.status==="ACTIVE").length,
    marketplace_listings: (store.marketplace_listings ?? []).length,
    open_capacity_offers: (store.capacity_offers ?? []).filter((offer)=>offer.status==="OPEN").length,
    collaboration_requests: (store.collaboration_requests ?? []).length,
    issued_deliverables: (store.projects ?? []).filter((project)=>project.project_state==="DELIVERABLE_ISSUED").length,
    paid_invoices: (store.invoices ?? []).filter((invoice)=>invoice.status==="PAID").length,
    ai_task_outputs: (store.task_outputs ?? []).length
  };
  const snapshot = buildObservatorySnapshot({ ...body, metrics });
  if (storeBackend !== "postgres") return withStore((next)=>{ next.observatory_snapshots.push(snapshot); appendEventAndAudit(next,{event_type:"observatory.snapshot_created",actor,tenant_id:body.tenant_id,firm_id:body.firm_id,aggregate_type:"ObservatorySnapshot",aggregate_id:snapshot.id,payload:snapshot,summary:"Privacy-safe observatory snapshot created."}); return snapshot; });
  const clientConn=await getPool().connect(); try{ await clientConn.query("begin"); await setTenantContext(clientConn, snapshot.tenant_id ?? null); await repoCreateObservatorySnapshot({ ...snapshot, tenant_id: uuidOrNull(snapshot.tenant_id), firm_id: uuidOrNull(snapshot.firm_id) }, clientConn); await clientConn.query("commit"); await withAppState((next)=>{appendEventAndAudit(next,{event_type:"observatory.snapshot_created",actor,tenant_id:body.tenant_id,firm_id:body.firm_id,aggregate_type:"ObservatorySnapshot",aggregate_id:snapshot.id,payload:snapshot,summary:"Privacy-safe observatory snapshot created."}); return snapshot;}); return snapshot;} catch (error) { await clientConn.query("rollback"); throw error; } finally{clientConn.release();}
}
export async function provisionWorkerInstanceRecord(body, actor) {
  if (storeBackend !== "postgres") {
    return withStore((store) => {
      const firm = store.firms.find((record) => record.id === body.firm_id && record.tenant_id === body.tenant_id);
      if (!firm) throwNotFound("firms", body.firm_id);
      const template = ensureLocalWorkerTemplates(store).find((record) => record.id === body.worker_template_id || record.code === body.worker_template_code) ?? ensureLocalWorkerTemplates(store)[0];
      const records = buildWorkerInstance(body, template);
      store.worker_instances.push(records.worker_instance);
      store.actors.push(records.actor);
      appendEventAndAudit(store, { event_type: "worker_instance.provisioned", actor, tenant_id: body.tenant_id, firm_id: body.firm_id, aggregate_type: "WorkerInstance", aggregate_id: records.worker_instance.id, payload: { worker_instance_id: records.worker_instance.id, worker_template_id: template.id }, summary: "AI worker instance provisioned." });
      return records;
    });
  }
  const clientConn = await getPool().connect();
  try {
    await clientConn.query("begin");
    await setTenantContext(clientConn, body.tenant_id);
    await seedWorkerTemplates(clientConn);
    const templateResult = await clientConn.query("select id::text, code, name, version, default_tools, default_budget, risk_envelope from worker_templates where id::text = $1 or code = $2 order by created_at limit 1", [body.worker_template_id ?? "", body.worker_template_code ?? "formwork-intake-agent"]);
    const template = templateResult.rows[0];
    if (!template) throwNotFound("worker_templates", body.worker_template_id ?? body.worker_template_code);
    const records = buildWorkerInstance(body, template, { ids: "uuid" });
    await clientConn.query("insert into actors (id, actor_type, person_id, worker_instance_id, system_id, external_service_id, tenant_id, firm_id, display_name, status, created_at, metadata) values ($1,'AI_AGENT',null,$2,null,null,$3,$4,$5,'ACTIVE',$6,$7::jsonb)", [records.actor.id, records.worker_instance.id, body.tenant_id, body.firm_id, records.actor.display_name, records.actor.created_at, JSON.stringify(records.actor.metadata)]);
    await createWorkerInstance({ id: records.worker_instance.id, tenant_id: body.tenant_id, firm_id: body.firm_id, worker_template_id: uuidOrNull(template.id), actor_id: uuidOrNull(records.actor.id), name: records.worker_instance.name, assigned_services: records.worker_instance.assigned_services, tool_allowlist: records.worker_instance.tool_allowlist, budget_envelope: records.worker_instance.budget_envelope, risk_limits: records.worker_instance.risk_limits, runtime_status: records.worker_instance.runtime_status, created_at: records.worker_instance.created_at, updated_at: records.worker_instance.updated_at }, clientConn);
    await clientConn.query("commit");
    await withAppState((store) => { appendEventAndAudit(store, { event_type: "worker_instance.provisioned", actor, tenant_id: body.tenant_id, firm_id: body.firm_id, aggregate_type: "WorkerInstance", aggregate_id: records.worker_instance.id, payload: { worker_instance_id: records.worker_instance.id, worker_template_id: template.id }, summary: "AI worker instance provisioned." }); return records; });
    return records;
  } catch (error) { await clientConn.query("rollback"); throw error; } finally { clientConn.release(); }
}

export async function activateWorkerInstanceRecord(body, actor) {
  if (storeBackend !== "postgres") return withStore((store) => { const worker = store.worker_instances.find((record) => record.id === body.worker_instance_id && record.tenant_id === body.tenant_id && record.firm_id === body.firm_id); if (!worker) throwNotFound("worker_instances", body.worker_instance_id); worker.runtime_status = "ACTIVE"; worker.updated_at = now(); appendEventAndAudit(store, { event_type: "worker_instance.activated", actor, tenant_id: body.tenant_id, firm_id: body.firm_id, aggregate_type: "WorkerInstance", aggregate_id: worker.id, payload: { worker_instance_id: worker.id }, summary: "AI worker instance activated." }); return worker; });
  const clientConn = await getPool().connect();
  try { const result = await clientConn.query("update worker_instances set runtime_status = 'ACTIVE', updated_at = $1 where id = $2 and tenant_id = $3 and firm_id = $4 returning id::text, tenant_id::text, firm_id::text, worker_template_id::text, actor_id::text, name, assigned_services, tool_allowlist, budget_envelope, risk_limits, runtime_status, created_at, updated_at", [now(), body.worker_instance_id, body.tenant_id, body.firm_id]); if (result.rowCount === 0) throwNotFound("worker_instances", body.worker_instance_id); const worker = mapDbDates(result.rows[0]); await withAppState((store)=>{ appendEventAndAudit(store,{event_type:"worker_instance.activated",actor,tenant_id:body.tenant_id,firm_id:body.firm_id,aggregate_type:"WorkerInstance",aggregate_id:worker.id,payload:{worker_instance_id:worker.id},summary:"AI worker instance activated."}); return worker;}); return worker; } finally { clientConn.release(); }
}

export async function assignTaskToWorkerRecord(body, actor) {
  if (storeBackend !== "postgres") return withStore((store)=>{ const worker=store.worker_instances.find((record)=>record.id===body.worker_instance_id&&record.runtime_status==="ACTIVE"); if(!worker) throwNotFound("worker_instances",body.worker_instance_id); const task=store.tasks.find((record)=>record.id===body.task_id&&record.tenant_id===body.tenant_id&&record.firm_id===body.firm_id); if(!task) throwNotFound("tasks",body.task_id); task.assigned_actor_or_worker_ref=worker.id; task.state="READY"; task.updated_at=now(); appendEventAndAudit(store,{event_type:"task.assigned_to_worker",actor,tenant_id:body.tenant_id,firm_id:body.firm_id,aggregate_type:"Task",aggregate_id:task.id,payload:{task_id:task.id,worker_instance_id:worker.id},summary:"Task assigned to AI worker."}); return {task,worker_instance:worker}; });
  const clientConn=await getPool().connect(); try{ await clientConn.query("begin"); await setTenantContext(clientConn, body.tenant_id); const workerResult=await clientConn.query("select id::text from worker_instances where id=$1 and tenant_id=$2 and firm_id=$3 and runtime_status='ACTIVE'",[body.worker_instance_id,body.tenant_id,body.firm_id]); if(workerResult.rowCount===0) throwNotFound("worker_instances",body.worker_instance_id); const result=await clientConn.query("update tasks set assigned_actor_or_worker_ref=$1, state='READY', updated_at=$2 where id=$3 and tenant_id=$4 and firm_id=$5 returning id::text, tenant_id::text, firm_id::text, project_id::text, work_package_id::text, task_type, input_ref, output_ref, assigned_actor_or_worker_ref::text, state, risk_class, due_at, created_at, updated_at",[body.worker_instance_id,now(),body.task_id,body.tenant_id,body.firm_id]); if(result.rowCount===0) throwNotFound("tasks",body.task_id); await clientConn.query("commit"); const task=mapDbDates(result.rows[0]); await withAppState((store)=>{ appendEventAndAudit(store,{event_type:"task.assigned_to_worker",actor,tenant_id:body.tenant_id,firm_id:body.firm_id,aggregate_type:"Task",aggregate_id:task.id,payload:{task_id:task.id,worker_instance_id:body.worker_instance_id},summary:"Task assigned to AI worker."}); return task;}); return {task,worker_instance_id:body.worker_instance_id}; } catch(error){ await clientConn.query("rollback"); throw error; } finally{ clientConn.release(); }
}

function aiActorForWorker(worker) { return { actor_id: worker.actor_id, actor_type: "AI_AGENT", worker_instance_id: worker.id, tenant_id: worker.tenant_id, firm_id: worker.firm_id, display_name: worker.name }; }

export async function produceTaskOutputRecord(body, policyDecision) {
  if (storeBackend !== "postgres") return withStore((store)=>{ const worker=store.worker_instances.find((record)=>record.id===body.worker_instance_id&&record.runtime_status==="ACTIVE"); if(!worker) throwNotFound("worker_instances",body.worker_instance_id); const task=store.tasks.find((record)=>record.id===body.task_id&&record.assigned_actor_or_worker_ref===worker.id); if(!task) throwNotFound("tasks",body.task_id); const output={id:newId("task_output"),tenant_id:body.tenant_id,firm_id:body.firm_id,project_id:task.project_id,task_id:task.id,worker_instance_id:worker.id,output_ref:body.output_ref??`ai-output:${task.id}`,output_schema_ref:body.output_schema_ref??"formwork.worker_output.v1",evidence_refs:body.evidence_refs??[],quality_flags:body.quality_flags??[],requires_human_review:body.requires_human_review??true,status:"PRODUCED",created_at:now()}; store.task_outputs.push(output); task.output_ref=output.output_ref; task.state="OUTPUT_PRODUCED"; task.updated_at=now(); appendEventAndAudit(store,{event_type:"task.output_produced",actor:aiActorForWorker(worker),tenant_id:body.tenant_id,firm_id:body.firm_id,aggregate_type:"TaskOutput",aggregate_id:output.id,payload:output,summary:"AI worker produced task output.",policy_decision_id:policyDecision?.id??null}); return {task_output:output,task}; });
  const clientConn=await getPool().connect(); try{ await clientConn.query("begin"); await setTenantContext(clientConn, body.tenant_id); const workerResult=await clientConn.query("select id::text, tenant_id::text, firm_id::text, actor_id::text, name, runtime_status from worker_instances where id=$1 and tenant_id=$2 and firm_id=$3 and runtime_status='ACTIVE'",[body.worker_instance_id,body.tenant_id,body.firm_id]); if(workerResult.rowCount===0) throwNotFound("worker_instances",body.worker_instance_id); const taskResult=await clientConn.query("select id::text, tenant_id::text, firm_id::text, project_id::text from tasks where id=$1 and assigned_actor_or_worker_ref=$2",[body.task_id,body.worker_instance_id]); if(taskResult.rowCount===0) throwNotFound("tasks",body.task_id); const worker=mapDbDates(workerResult.rows[0]); const task=mapDbDates(taskResult.rows[0]); const output={id:newUuid(),tenant_id:body.tenant_id,firm_id:body.firm_id,project_id:task.project_id,task_id:task.id,worker_instance_id:worker.id,output_ref:body.output_ref??`ai-output:${task.id}`,output_schema_ref:body.output_schema_ref??"formwork.worker_output.v1",evidence_refs:body.evidence_refs??[],quality_flags:body.quality_flags??[],requires_human_review:body.requires_human_review??true,status:"PRODUCED",created_at:now()}; await createTaskOutput({ ...output, tenant_id: uuidOrNull(output.tenant_id), firm_id: uuidOrNull(output.firm_id), project_id: uuidOrNull(output.project_id), task_id: uuidOrNull(output.task_id), worker_instance_id: uuidOrNull(output.worker_instance_id) }, clientConn); const updatedTaskResult=await clientConn.query("update tasks set output_ref=$1, state='OUTPUT_PRODUCED', updated_at=$2 where id=$3 returning id::text, tenant_id::text, firm_id::text, project_id::text, work_package_id::text, task_type, input_ref, output_ref, assigned_actor_or_worker_ref::text, state, risk_class, due_at, created_at, updated_at",[output.output_ref,now(),task.id]); await clientConn.query("commit"); await withAppState((store)=>{ appendEventAndAudit(store,{event_type:"task.output_produced",actor:aiActorForWorker(worker),tenant_id:body.tenant_id,firm_id:body.firm_id,aggregate_type:"TaskOutput",aggregate_id:output.id,payload:output,summary:"AI worker produced task output.",policy_decision_id:policyDecision?.id??null}); return output;}); return {task_output:output,task:mapDbDates(updatedTaskResult.rows[0])}; } catch(error){ await clientConn.query("rollback"); throw error; } finally{ clientConn.release(); }
}

export async function requestToolInvocationRecord(body, policyDecision) {
  if (storeBackend !== "postgres") return withStore((store)=>{ const worker=store.worker_instances.find((record)=>record.id===body.worker_instance_id&&record.runtime_status==="ACTIVE"); if(!worker) throwNotFound("worker_instances",body.worker_instance_id); if(!(worker.tool_allowlist??[]).includes(body.tool_name)) invalidState("Tool is not allowed for this worker."); const invocation={id:newId("tool_invocation"),tenant_id:body.tenant_id,firm_id:body.firm_id,worker_instance_id:worker.id,task_id:body.task_id??null,tool_name:body.tool_name,invocation_status:"REQUESTED",input_summary:body.input_summary??null,output_ref:null,cost_estimate:Number(body.cost_estimate??0),created_at:now(),completed_at:null}; store.tool_invocations.push(invocation); appendEventAndAudit(store,{event_type:"tool.invocation_requested",actor:aiActorForWorker(worker),tenant_id:body.tenant_id,firm_id:body.firm_id,aggregate_type:"ToolInvocation",aggregate_id:invocation.id,payload:invocation,summary:"AI worker requested tool invocation.",policy_decision_id:policyDecision?.id??null}); return invocation; });
  const clientConn=await getPool().connect(); try{ const workerResult=await clientConn.query("select id::text, tenant_id::text, firm_id::text, actor_id::text, name, tool_allowlist, runtime_status from worker_instances where id=$1 and tenant_id=$2 and firm_id=$3 and runtime_status='ACTIVE'",[body.worker_instance_id,body.tenant_id,body.firm_id]); if(workerResult.rowCount===0) throwNotFound("worker_instances",body.worker_instance_id); const worker=mapDbDates(workerResult.rows[0]); if(!(worker.tool_allowlist??[]).includes(body.tool_name)) invalidState("Tool is not allowed for this worker."); const invocation={id:newUuid(),tenant_id:body.tenant_id,firm_id:body.firm_id,worker_instance_id:worker.id,task_id:uuidOrNull(body.task_id),tool_name:body.tool_name,invocation_status:"REQUESTED",input_summary:body.input_summary??null,output_ref:null,cost_estimate:Number(body.cost_estimate??0),created_at:now(),completed_at:null}; await createToolInvocation({ ...invocation, tenant_id: uuidOrNull(invocation.tenant_id), firm_id: uuidOrNull(invocation.firm_id), worker_instance_id: uuidOrNull(invocation.worker_instance_id) }, clientConn); await withAppState((store)=>{ appendEventAndAudit(store,{event_type:"tool.invocation_requested",actor:aiActorForWorker(worker),tenant_id:body.tenant_id,firm_id:body.firm_id,aggregate_type:"ToolInvocation",aggregate_id:invocation.id,payload:invocation,summary:"AI worker requested tool invocation.",policy_decision_id:policyDecision?.id??null}); return invocation;}); return invocation; } finally{ clientConn.release(); }
}
export async function issueInvoiceRecord(body, actor) {
  if (storeBackend !== "postgres") {
    return withStore((store) => {
      const invoice = store.invoices.find((record) => record.id === body.invoice_id && record.tenant_id === body.tenant_id && record.firm_id === body.firm_id);
      if (!invoice) throwNotFound("invoices", body.invoice_id);
      const project = store.projects.find((record) => record.id === invoice.project_id);
      if (project?.project_state !== "DELIVERABLE_ISSUED") invalidState("Invoice can only be issued after project deliverable is issued.");
      invoice.status = "ISSUED";
      invoice.updated_at = now();
      appendEventAndAudit(store, { event_type: "invoice.issued", actor, tenant_id: body.tenant_id, firm_id: body.firm_id, aggregate_type: "Invoice", aggregate_id: invoice.id, payload: { invoice_id: invoice.id }, summary: "Invoice issued after delivery gate." });
      return invoice;
    });
  }
  const clientConn = await getPool().connect();
  try {
    await clientConn.query("begin");
    await setTenantContext(clientConn, body.tenant_id);
    const invoiceResult = await clientConn.query("select i.id::text, i.tenant_id::text, i.firm_id::text, i.relationship_id::text, i.engagement_id::text, i.project_id::text, i.invoice_number, i.currency, i.line_items, i.tax_summary, i.status, i.due_at, i.created_at, i.updated_at, p.project_state from invoices i left join projects p on p.id = i.project_id where i.id = $1 and i.tenant_id = $2 and i.firm_id = $3", [body.invoice_id, body.tenant_id, body.firm_id]);
    if (invoiceResult.rowCount === 0) throwNotFound("invoices", body.invoice_id);
    if (invoiceResult.rows[0].project_state !== "DELIVERABLE_ISSUED") invalidState("Invoice can only be issued after project deliverable is issued.");
    const result = await clientConn.query("update invoices set status = 'ISSUED', updated_at = $1 where id = $2 returning id::text, tenant_id::text, firm_id::text, relationship_id::text, engagement_id::text, project_id::text, invoice_number, currency, line_items, tax_summary, status, due_at, created_at, updated_at", [now(), body.invoice_id]);
    const invoice = mapDbDates(result.rows[0]);
    await clientConn.query("commit");
    await withAppState((store) => { appendEventAndAudit(store, { event_type: "invoice.issued", actor, tenant_id: body.tenant_id, firm_id: body.firm_id, aggregate_type: "Invoice", aggregate_id: invoice.id, payload: { invoice_id: invoice.id }, summary: "Invoice issued after delivery gate." }); return invoice; });
    return invoice;
  } catch (error) {
    await clientConn.query("rollback");
    throw error;
  } finally { clientConn.release(); }
}

function invoiceTotal(invoice) {
  return (invoice.line_items ?? []).reduce((sum, item) => sum + Number(item.amount ?? 0), 0);
}

function buildPaymentStatus(body, invoice, options = {}) {
  const relational = options.ids === "uuid";
  const timestamp = now();
  return {
    id: relational ? newUuid() : newId("payment"),
    tenant_id: body.tenant_id,
    firm_id: body.firm_id,
    invoice_id: invoice.id,
    amount: Number(body.amount ?? invoiceTotal(invoice)),
    currency: body.currency ?? invoice.currency,
    provider_ref: body.provider_ref ?? "local-dev-payment",
    payment_status: body.payment_status ?? "PAID",
    received_at: body.received_at ?? timestamp,
    created_at: timestamp,
    updated_at: timestamp
  };
}

export async function recordPaymentStatusRecord(body, actor) {
  if (storeBackend !== "postgres") {
    return withStore((store) => {
      const invoice = store.invoices.find((record) => record.id === body.invoice_id && record.tenant_id === body.tenant_id && record.firm_id === body.firm_id);
      if (!invoice) throwNotFound("invoices", body.invoice_id);
      if (invoice.status !== "ISSUED") invalidState("Payment can only be recorded against an issued invoice.");
      const payment = buildPaymentStatus(body, invoice);
      store.payment_statuses.push(payment);
      invoice.status = payment.payment_status === "PAID" ? "PAID" : "PAYMENT_PENDING";
      invoice.updated_at = now();
      appendEventAndAudit(store, { event_type: "payment.recorded", actor, tenant_id: body.tenant_id, firm_id: body.firm_id, aggregate_type: "PaymentStatus", aggregate_id: payment.id, payload: { invoice_id: invoice.id, payment_status: payment.payment_status }, summary: "Payment status recorded." });
      return { payment_status: payment, invoice };
    });
  }
  const clientConn = await getPool().connect();
  try {
    await clientConn.query("begin");
    await setTenantContext(clientConn, body.tenant_id);
    const invoiceResult = await clientConn.query("select id::text, tenant_id::text, firm_id::text, relationship_id::text, engagement_id::text, project_id::text, invoice_number, currency, line_items, tax_summary, status, due_at, created_at, updated_at from invoices where id = $1 and tenant_id = $2 and firm_id = $3", [body.invoice_id, body.tenant_id, body.firm_id]);
    if (invoiceResult.rowCount === 0) throwNotFound("invoices", body.invoice_id);
    const invoice = mapDbDates(invoiceResult.rows[0]);
    if (invoice.status !== "ISSUED") invalidState("Payment can only be recorded against an issued invoice.");
    const payment = buildPaymentStatus(body, invoice, { ids: "uuid" });
    await createPaymentStatus({ ...payment, firm_id: uuidOrNull(payment.firm_id), invoice_id: uuidOrNull(payment.invoice_id) }, clientConn);
    const status = payment.payment_status === "PAID" ? "PAID" : "PAYMENT_PENDING";
    const updatedInvoiceRow = await updateInvoice(invoice.id, { status, updated_at: now() }, clientConn);
    await clientConn.query("commit");
    const updatedInvoice = mapDbDates(updatedInvoiceRow);
    await withAppState((store) => { appendEventAndAudit(store, { event_type: "payment.recorded", actor, tenant_id: body.tenant_id, firm_id: body.firm_id, aggregate_type: "PaymentStatus", aggregate_id: payment.id, payload: { invoice_id: invoice.id, payment_status: payment.payment_status }, summary: "Payment status recorded." }); return payment; });
    return { payment_status: payment, invoice: updatedInvoice };
  } catch (error) { await clientConn.query("rollback"); throw error; } finally { clientConn.release(); }
}

function factoryRecordId(prefix) {
  return storeBackend === "postgres" ? newUuid() : newId(prefix);
}

function requireHumanPrincipal(actor, action) {
  if (actor?.actor_type !== "HUMAN") invalidState(`${action} requires an authenticated human principal.`);
}

function factoryValidationStatus(result) {
  return result.ok ? "VALIDATED" : "VALIDATION_FAILED";
}

function findFactoryBlueprint(store, body) {
  const item = store.factory_firm_blueprints.find((record) => record.id === body.firm_blueprint_id && record.tenant_id === body.tenant_id);
  if (!item) throwNotFound("factory_firm_blueprints", body.firm_blueprint_id);
  return item;
}

export async function createFactoryFirmBlueprintRecord(body, actor = systemActor(body.tenant_id, null)) {
  return withStore((store) => {
    const tenant = store.tenants.find((item) => item.id === body.tenant_id);
    if (!tenant) throwNotFound("tenants", body.tenant_id);
    const validation = validateFactoryBlueprintBundle(body.bundle);
    const timestamp = now();
    const blueprint = {
      id: factoryRecordId("firm_blueprint"),
      tenant_id: body.tenant_id,
      firm_id: null,
      blueprint_code: body.blueprint_code ?? body.bundle?.firm_blueprint?.firm_blueprint_id ?? `blueprint-${timestamp}`,
      blueprint_name: body.blueprint_name ?? body.bundle?.firm_blueprint?.firm_name ?? "Untitled Firm Blueprint",
      blueprint_version: body.blueprint_version ?? "1.0",
      blueprint_state: "DRAFT",
      validation_status: validation.ok ? "NOT_REQUESTED_VALID_BUNDLE" : "DRAFT_HAS_VALIDATION_ERRORS",
      validation_findings: validation.findings,
      approved_by_actor_id: null,
      approved_at: null,
      provisioned_firm_id: null,
      bundle: body.bundle,
      created_by_actor_id: actor.actor_id,
      created_at: timestamp,
      updated_at: timestamp,
      metadata: body.metadata ?? {}
    };
    store.factory_firm_blueprints.push(blueprint);
    appendEventAndAudit(store, { event_type: "firm_blueprint.created", actor, tenant_id: body.tenant_id, firm_id: null, aggregate_type: "FirmBlueprint", aggregate_id: blueprint.id, payload: { blueprint_state: blueprint.blueprint_state, validation_status: blueprint.validation_status }, summary: "Firm Blueprint draft created for factory provisioning." });
    return blueprint;
  });
}

export async function validateFactoryFirmBlueprintRecord(body, actor = systemActor(body.tenant_id, null)) {
  return withStore((store) => {
    const blueprint = findFactoryBlueprint(store, body);
    const result = validateFactoryBlueprintBundle(blueprint.bundle);
    blueprint.validation_status = factoryValidationStatus(result);
    blueprint.validation_findings = result.findings;
    blueprint.blueprint_state = result.ok ? "VALIDATED" : "VALIDATION_FAILED";
    blueprint.updated_at = now();
    appendEventAndAudit(store, { event_type: result.ok ? "firm_blueprint.validated" : "firm_blueprint.validation_failed", actor, tenant_id: blueprint.tenant_id, firm_id: null, aggregate_type: "FirmBlueprint", aggregate_id: blueprint.id, payload: { validation_status: blueprint.validation_status, findings: result.findings }, summary: result.ok ? "Firm Blueprint passed deterministic validation." : "Firm Blueprint failed deterministic validation." });
    return blueprint;
  });
}

export async function approveFactoryFirmBlueprintRecord(body, actor = systemActor(body.tenant_id, null)) {
  requireHumanPrincipal(actor, "Blueprint approval");
  return withStore((store) => {
    const blueprint = findFactoryBlueprint(store, body);
    if (blueprint.blueprint_state !== "VALIDATED") invalidState("Only a VALIDATED Firm Blueprint can be approved for provisioning.");
    blueprint.blueprint_state = "APPROVED_FOR_PROVISIONING";
    blueprint.approved_by_actor_id = actor.actor_id;
    blueprint.approved_at = now();
    blueprint.updated_at = blueprint.approved_at;
    appendEventAndAudit(store, { event_type: "firm_blueprint.approved_for_provisioning", actor, tenant_id: blueprint.tenant_id, firm_id: null, aggregate_type: "FirmBlueprint", aggregate_id: blueprint.id, payload: { approved_by_actor_id: actor.actor_id }, summary: "Firm Blueprint approved by human product owner/principal for provisioning." });
    return blueprint;
  });
}

export async function createFactoryProvisioningRunRecord(body, actor = systemActor(body.tenant_id, null)) {
  requireHumanPrincipal(actor, "Factory provisioning");
  const storeBefore = await readStore();
  const blueprint = storeBefore.factory_firm_blueprints.find((record) => record.id === body.firm_blueprint_id && record.tenant_id === body.tenant_id);
  if (!blueprint) throwNotFound("factory_firm_blueprints", body.firm_blueprint_id);
  if (blueprint.blueprint_state !== "APPROVED_FOR_PROVISIONING") invalidState("Only an APPROVED_FOR_PROVISIONING blueprint can be provisioned.");
  const duplicate = storeBefore.factory_provisioning_runs.find((run) => run.firm_blueprint_id === blueprint.id && !["PROVISIONING_FAILED", "READINESS_FAILED"].includes(run.provisioning_state));
  if (duplicate) invalidState("Blueprint already has an active or completed provisioning run.");
  const firmName = blueprint.bundle?.firm_blueprint?.firm_name ?? blueprint.blueprint_name;
  const principalName = blueprint.bundle?.firm_blueprint?.virtual_principal?.display_name ?? "Virtual Principal";
  const firmResult = await createFirmRecord({ tenant_id: body.tenant_id, name: firmName, principal_name: principalName, metadata: { source_blueprint_id: blueprint.id, factory_provisioned: true } });
  return withStore((store) => {
    const current = store.factory_firm_blueprints.find((record) => record.id === blueprint.id && record.tenant_id === body.tenant_id);
    const timestamp = now();
    const run = {
      id: factoryRecordId("provisioning_run"),
      tenant_id: body.tenant_id,
      firm_id: firmResult.firm.id,
      firm_blueprint_id: current.id,
      provisioning_state: "PROVISIONED",
      validation_snapshot: { status: current.validation_status, findings: current.validation_findings },
      created_resource_refs: { firm_id: firmResult.firm.id, principal_actor_id: firmResult.principal_actor.id },
      failure_reasons: [],
      started_by_actor_id: actor.actor_id,
      started_at: timestamp,
      completed_at: timestamp,
      updated_at: timestamp,
      metadata: body.metadata ?? {}
    };
    const instance = {
      id: factoryRecordId("provisioned_firm"),
      tenant_id: body.tenant_id,
      firm_id: firmResult.firm.id,
      firm_blueprint_id: current.id,
      provisioning_run_id: run.id,
      instance_status: "PROVISIONED",
      module_configuration: current.bundle?.firm_blueprint?.modules ?? [],
      service_catalogue: current.bundle?.firm_blueprint?.services ?? [],
      created_at: timestamp,
      updated_at: timestamp,
      metadata: { source_blueprint_code: current.blueprint_code }
    };
    const workers = current.bundle?.workforce_blueprint?.workers ?? [];
    const bindings = workers.map((worker) => ({
      id: factoryRecordId("factory_worker_binding"),
      tenant_id: body.tenant_id,
      firm_id: firmResult.firm.id,
      provisioning_run_id: run.id,
      worker_code: worker.worker_code,
      actor_type: worker.actor_type,
      role_skill_ref: worker.role_skill_ref,
      worker_skill_ref: worker.worker_skill_ref,
      authority_envelope: worker.authority_envelope,
      supervisor_actor_id: firmResult.principal_actor.id,
      escalation_route: worker.escalation_route,
      memory_boundary: worker.memory_boundary,
      budget_boundary: worker.budget_boundary,
      binding_state: "BOUND",
      created_at: timestamp,
      updated_at: timestamp,
      metadata: { source_supervisor_actor_id: worker.supervisor_actor_id }
    }));
    current.blueprint_state = "PROVISIONED";
    current.provisioned_firm_id = firmResult.firm.id;
    current.firm_id = firmResult.firm.id;
    current.updated_at = timestamp;
    store.factory_provisioning_runs.push(run);
    store.provisioned_firm_instances.push(instance);
    store.factory_worker_bindings.push(...bindings);
    appendEventAndAudit(store, { event_type: "provisioning_run.started", actor, tenant_id: body.tenant_id, firm_id: firmResult.firm.id, aggregate_type: "ProvisioningRun", aggregate_id: run.id, payload: { firm_blueprint_id: current.id }, summary: "Factory provisioning run started from approved Firm Blueprint." });
    appendEventAndAudit(store, { event_type: "firm_instance.provisioned", actor, tenant_id: body.tenant_id, firm_id: firmResult.firm.id, aggregate_type: "ProvisionedFirmInstance", aggregate_id: instance.id, payload: { worker_bindings: bindings.length, modules: instance.module_configuration.length }, summary: "Tenant-scoped firm instance provisioned from blueprint." });
    for (const binding of bindings) appendEventAndAudit(store, { event_type: "worker_binding.created", actor, tenant_id: body.tenant_id, firm_id: firmResult.firm.id, aggregate_type: "FactoryWorkerBinding", aggregate_id: binding.id, payload: { worker_code: binding.worker_code, role_skill_ref: binding.role_skill_ref }, summary: "Factory worker binding created with authority envelope and audit identity." });
    return { provisioning_run: run, provisioned_firm_instance: instance, worker_bindings: bindings, firm: firmResult.firm, principal_actor: firmResult.principal_actor };
  });
}


function findAuthorityInStore(store, { tenant_id, firm_id, actor_id, action = "deliverable.review" }) {
  const membership = (store.firm_memberships ?? []).find((item) => item.tenant_id === tenant_id && item.firm_id === firm_id && item.actor_id === actor_id && item.status === "ACTIVE");
  const profile = membership ? (store.professional_profiles ?? []).find((item) => item.person_id === membership.person_id && item.professional_status === "ACTIVE") : null;
  const timestamp = Date.now();
  const authority = profile ? (store.professional_authorities ?? []).find((item) => item.tenant_id === tenant_id && item.firm_id === firm_id && item.professional_id === profile.id && item.status === "ACTIVE" && (item.permitted_actions ?? []).includes(action) && Date.parse(item.valid_from) <= timestamp && (!item.valid_to || Date.parse(item.valid_to) >= timestamp)) : null;
  return { membership: membership ?? null, professional_profile: profile ?? null, professional_authority: authority ?? null, valid: Boolean(authority) };
}

export async function certifyFactoryPackBindingRecord(body, actor = systemActor(body.tenant_id, body.firm_id ?? null)) {
  requireHumanPrincipal(actor, "Pack binding certification");
  return withStore((store) => {
    const run = store.factory_provisioning_runs.find((record) => record.id === body.provisioning_run_id && record.tenant_id === body.tenant_id);
    if (!run) throwNotFound("factory_provisioning_runs", body.provisioning_run_id);
    if (body.firm_id && run.firm_id !== body.firm_id) invalidState("Provisioning run does not belong to requested firm.");
    if (!["PROVISIONED", "READY_FOR_HANDOFF", "ACCEPTED_FOR_LOCAL_PILOT", "PACK_CERTIFIED"].includes(run.provisioning_state)) invalidState("Provisioning run is not in a certifiable state.");
    const instance = store.provisioned_firm_instances.find((record) => record.provisioning_run_id === run.id && record.tenant_id === body.tenant_id);
    if (!instance) throwNotFound("provisioned_firm_instances", run.id);
    const blueprint = store.factory_firm_blueprints.find((record) => record.id === run.firm_blueprint_id && record.tenant_id === body.tenant_id);
    if (!blueprint) throwNotFound("factory_firm_blueprints", run.firm_blueprint_id);
    const workerBindings = store.factory_worker_bindings.filter((record) => record.provisioning_run_id === run.id && record.tenant_id === body.tenant_id && record.firm_id === run.firm_id);
    const professionalAuthority = findAuthorityInStore(store, { tenant_id: body.tenant_id, firm_id: run.firm_id, actor_id: actor.actor_id, action: body.authority_action ?? "deliverable.review" });
    const certificationBundle = body.candidate_bundle ?? blueprint.bundle;
    const result = evaluatePackBindingCertification({ bundle: certificationBundle, professionalAuthority, workerBindings });
    const timestamp = now();
    const compatibility = {
      id: factoryRecordId("pack_compatibility_check"),
      tenant_id: body.tenant_id,
      firm_id: run.firm_id,
      provisioning_run_id: run.id,
      firm_blueprint_id: blueprint.id,
      practice_pack_id: certificationBundle?.practice_pack_manifest?.practice_pack_id ?? null,
      service_delivery_pack_id: certificationBundle?.service_delivery_pack_manifest?.service_delivery_pack_id ?? null,
      governance_pack_id: certificationBundle?.governance_pack_manifest?.governance_pack_id ?? null,
      jurisdiction_pack_id: certificationBundle?.jurisdiction_pack_manifest?.jurisdiction_pack_id ?? null,
      compatibility_status: result.compatibility_status,
      findings: result.findings,
      checked_by_actor_id: actor.actor_id,
      checked_at: timestamp,
      metadata: body.metadata ?? {}
    };
    const certification = {
      id: factoryRecordId("pack_binding_certification"),
      tenant_id: body.tenant_id,
      firm_id: run.firm_id,
      provisioning_run_id: run.id,
      pack_compatibility_check_id: compatibility.id,
      certification_state: result.certification_state,
      authority_summary: result.authority_summary,
      denial_reasons: result.findings.filter((finding) => finding.severity === "ERROR"),
      certified_by_actor_id: result.ok ? actor.actor_id : null,
      certified_at: result.ok ? timestamp : null,
      created_at: timestamp,
      updated_at: timestamp,
      metadata: { worker_binding_count: result.worker_binding_count }
    };
    const serviceRecords = result.activated_services.map((service) => ({
      id: factoryRecordId("service_activation"),
      tenant_id: body.tenant_id,
      firm_id: run.firm_id,
      provisioning_run_id: run.id,
      pack_binding_certification_id: certification.id,
      service_id: service.service_id,
      activation_state: service.status,
      risk_class: service.risk_class,
      responsible_professional_id: service.responsible_professional_id,
      jurisdiction: service.jurisdiction,
      failure_reasons: result.ok ? [] : certification.denial_reasons,
      created_at: timestamp,
      updated_at: timestamp
    }));
    store.pack_compatibility_checks.push(compatibility);
    store.pack_binding_certifications.push(certification);
    store.service_activation_records.push(...serviceRecords);
    run.pack_certification_state = certification.certification_state;
    run.pack_compatibility_check_id = compatibility.id;
    run.updated_at = timestamp;
    instance.pack_certification_state = certification.certification_state;
    instance.service_activation_state = result.ok ? "ACTIVE" : "BLOCKED";
    instance.updated_at = timestamp;
    if (result.ok && run.provisioning_state === "PROVISIONED") run.provisioning_state = "PACK_CERTIFIED";
    appendEventAndAudit(store, { event_type: "pack.compatibility_checked", actor, tenant_id: body.tenant_id, firm_id: run.firm_id, aggregate_type: "PackCompatibilityCheck", aggregate_id: compatibility.id, payload: { compatibility_status: compatibility.compatibility_status, findings: compatibility.findings }, summary: result.ok ? "Pack compatibility check passed." : "Pack compatibility check failed." });
    appendEventAndAudit(store, { event_type: result.ok ? "pack.binding_certified" : "pack.binding_denied", actor, tenant_id: body.tenant_id, firm_id: run.firm_id, aggregate_type: "PackBindingCertification", aggregate_id: certification.id, payload: { certification_state: certification.certification_state, authority_summary: certification.authority_summary, denial_reasons: certification.denial_reasons }, summary: result.ok ? "Pack binding certified for service activation." : "Pack binding denied with deterministic findings." });
    for (const serviceRecord of serviceRecords) appendEventAndAudit(store, { event_type: result.ok ? "service.activation_enabled" : "service.activation_blocked", actor, tenant_id: body.tenant_id, firm_id: run.firm_id, aggregate_type: "ServiceActivationRecord", aggregate_id: serviceRecord.id, payload: serviceRecord, summary: result.ok ? "Service activation enabled after pack certification." : "Service activation blocked by pack certification gate." });
    return { pack_compatibility_check: compatibility, pack_binding_certification: certification, service_activation_records: serviceRecords, provisioning_run: run, provisioned_firm_instance: instance };
  });
}
export async function runFactoryReadinessTestRecord(body, actor = systemActor(body.tenant_id, body.firm_id ?? null)) {
  return withStore((store) => {
    const run = store.factory_provisioning_runs.find((record) => record.id === body.provisioning_run_id && record.tenant_id === body.tenant_id);
    if (!run) throwNotFound("factory_provisioning_runs", body.provisioning_run_id);
    if (body.firm_id && run.firm_id !== body.firm_id) invalidState("Provisioning run does not belong to requested firm.");
    const instance = store.provisioned_firm_instances.find((record) => record.provisioning_run_id === run.id);
    if (!instance) throwNotFound("provisioned_firm_instances", run.id);
    const bindings = store.factory_worker_bindings.filter((record) => record.provisioning_run_id === run.id && record.binding_state === "BOUND");
    const checks = [
      { code: "firm_instance_exists", status: instance ? "PASS" : "FAIL" },
      { code: "starter_modules_configured", status: (instance.module_configuration ?? []).length >= 6 ? "PASS" : "FAIL" },
      { code: "service_catalogue_configured", status: (instance.service_catalogue ?? []).length > 0 ? "PASS" : "FAIL" },
      { code: "worker_bindings_created", status: bindings.length > 0 ? "PASS" : "FAIL" },
      { code: "audit_identity_present", status: bindings.every((binding) => binding.supervisor_actor_id && binding.authority_envelope) ? "PASS" : "FAIL" }
    ];
    const passed = checks.every((check) => check.status === "PASS");
    run.provisioning_state = passed ? "READY_FOR_HANDOFF" : "READINESS_FAILED";
    run.readiness_checks = checks;
    run.updated_at = now();
    instance.instance_status = run.provisioning_state;
    instance.updated_at = run.updated_at;
    appendEventAndAudit(store, { event_type: "factory_readiness.checked", actor, tenant_id: run.tenant_id, firm_id: run.firm_id, aggregate_type: "ProvisioningRun", aggregate_id: run.id, payload: { readiness_checks: checks, status: run.provisioning_state }, summary: passed ? "Factory readiness checks passed." : "Factory readiness checks failed." });
    return { provisioning_run: run, provisioned_firm_instance: instance, readiness_checks: checks };
  });
}

export async function acceptFactoryHandoffRecord(body, actor = systemActor(body.tenant_id, body.firm_id ?? null)) {
  requireHumanPrincipal(actor, "Factory handoff acceptance");
  return withStore((store) => {
    const run = store.factory_provisioning_runs.find((record) => record.id === body.provisioning_run_id && record.tenant_id === body.tenant_id);
    if (!run) throwNotFound("factory_provisioning_runs", body.provisioning_run_id);
    if (run.provisioning_state !== "READY_FOR_HANDOFF") invalidState("Provisioning run must be READY_FOR_HANDOFF before acceptance.");
    run.provisioning_state = "ACCEPTED_FOR_LOCAL_PILOT";
    run.accepted_by_actor_id = actor.actor_id;
    run.accepted_at = now();
    run.updated_at = run.accepted_at;
    const instance = store.provisioned_firm_instances.find((record) => record.provisioning_run_id === run.id);
    if (instance) {
      instance.instance_status = "ACCEPTED_FOR_LOCAL_PILOT";
      instance.updated_at = run.updated_at;
    }
    appendEventAndAudit(store, { event_type: "factory_handoff.accepted", actor, tenant_id: run.tenant_id, firm_id: run.firm_id, aggregate_type: "ProvisioningRun", aggregate_id: run.id, payload: { decision_summary: body.decision_summary ?? null, evidence_refs: body.evidence_refs ?? [] }, summary: "Factory provisioned firm accepted for controlled local pilot handoff." });
    return { provisioning_run: run, provisioned_firm_instance: instance ?? null };
  });
}

function upsertById(collection, record) {
  const id = record?.id;
  const index = collection.findIndex((item) => item.id === id);
  if (index >= 0) collection[index] = { ...collection[index], ...record };
  else collection.push(record);
}

// Hiring-bug fix (2026-10-01, ADR-091): several AWIA provisioning records carry natural-key ids
// that are NOT firm-scoped -- seat-<code>, role-assignment-<code>, package-binding-<code>,
// staff-lifecycle-<code>-<state>, and the constant evidence-pack id -- so two firms hiring the same
// staff code (e.g. CFO-001) produce identical ids. The whole multi-tenant store is loaded into one
// in-memory object, so a plain upsertById() merged firm B's record INTO firm A's (cross-tenant
// overwrite). This variant only ever matches a record in the same firm.
function upsertScopedById(collection, record) {
  const index = collection.findIndex((item) => item.id === record?.id && item.firm_id === record?.firm_id);
  if (index >= 0) collection[index] = { ...collection[index], ...record };
  else collection.push(record);
}

function awiaRecord(record, idField) {
  return { id: record[idField], ...record };
}

function awiaProvisioningSnapshot(run) {
  return {
    id: run.provisioning_run_id,
    provisioning_run_id: run.provisioning_run_id,
    tenant_id: run.tenant_id,
    firm_id: run.firm_id,
    created_by_actor_id: run.created_by_actor_id,
    boundary: run.boundary,
    status: run.status,
    salary_plan_id: run.salary_plan_id,
    registry_id: run.registry_id,
    runtime_execution_enabled: run.runtime_execution_enabled,
    summary: run.summary,
    findings: run.findings,
    created_at: now(),
    updated_at: now()
  };
}

function awiaRunFromStore(store, tenant_id, firm_id) {
  return {
    provisioning_run_id: `awia-vs-s3-${firm_id}`,
    tenant_id,
    firm_id,
    created_by_actor_id: "human-principal-001",
    boundary: "provisioning_only_no_autonomous_execution",
    status: "PROVISIONED_DRAFT",
    salary_plan_id: "virtual-staff-controlled-pilot-plan",
    registry_id: awiaVirtualStaffPackageRegistry.registry_id,
    runtime_execution_enabled: false,
    seats: (store.awia_virtual_staff_seats ?? []).filter((item) => item.tenant_id === tenant_id && item.firm_id === firm_id),
    members: (store.awia_virtual_staff_members ?? []).filter((item) => item.organization_id === tenant_id && item.firm_id === firm_id),
    role_assignments: (store.awia_staff_role_assignments ?? []).filter((item) => item.tenant_id === tenant_id && item.firm_id === firm_id),
    package_bindings: (store.awia_staff_package_bindings ?? []).filter((item) => item.tenant_id === tenant_id && item.firm_id === firm_id),
    lifecycle_events: (store.awia_staff_lifecycle_events ?? []).filter((item) => item.tenant_id === tenant_id && item.firm_id === firm_id),
    findings: []
  };
}

export async function provisionAwiaVirtualStaffPilotRecord(body, actor) {
  return withStore((store) => {
    const firm = store.firms.find((record) => record.id === body.firm_id && record.tenant_id === body.tenant_id);
    if (!firm) throwNotFound("firms", body.firm_id);
    const run = provisionPilotVirtualStaff({
      tenant_id: body.tenant_id,
      firm_id: body.firm_id,
      created_by_actor_id: actor.actor_id,
      salary_plan_id: body.salary_plan_id ?? "virtual-staff-controlled-pilot-plan",
      registry: awiaVirtualStaffPackageRegistry
    });
    upsertScopedById(store.awia_virtual_staff_provisioning_runs, awiaProvisioningSnapshot(run));
    for (const seat of run.seats) upsertScopedById(store.awia_virtual_staff_seats, awiaRecord(seat, "staff_seat_id"));
    for (const member of run.members) upsertScopedById(store.awia_virtual_staff_members, awiaRecord(member, "agent_id"));
    for (const assignment of run.role_assignments) upsertScopedById(store.awia_staff_role_assignments, awiaRecord(assignment, "role_assignment_id"));
    for (const binding of run.package_bindings) upsertScopedById(store.awia_staff_package_bindings, awiaRecord(binding, "package_binding_id"));
    for (const event of run.lifecycle_events) upsertScopedById(store.awia_staff_lifecycle_events, awiaRecord(event, "lifecycle_event_id"));
    const evidencePack = buildAwiaVirtualStaffEvidencePack({ registry: awiaVirtualStaffPackageRegistry, provisioningRun: run });
    upsertScopedById(store.awia_staff_evidence_packs, { id: evidencePack.evidence_pack_id, ...evidencePack, tenant_id: body.tenant_id, firm_id: body.firm_id, created_at: now() });
    appendEventAndAudit(store, { event_type: "awia.virtual_staff.provisioned", actor, tenant_id: body.tenant_id, firm_id: body.firm_id, aggregate_type: "AwiaVirtualStaffProvisioningRun", aggregate_id: storeBackend === "postgres" ? deterministicUuid(run.provisioning_run_id) : run.provisioning_run_id, payload: { staff_count: run.members.length, boundary: run.boundary, runtime_execution_enabled: run.runtime_execution_enabled }, summary: "AWIA virtual staff pilot roster provisioned as controlled records." });
    return { provisioning_run: run, evidence_pack: evidencePack };
  });
}

// Phase 5, slice 5c (2026-09-30): the real AWIA staff lifecycle state machine. D.1's finding
// confirmed directly by reading the code: staffLifecycleStates (awia-virtual-staff-
// provisioning.mjs) already names all 7 states and canAcceptExecutableTask() already gates
// task-readiness on lifecycle_status === "ACTIVE" (the authority gate's
// STAFF_LIFECYCLE_NOT_EXECUTABLE finding, confirmed live via the HM-S2 pilot flow) -- but
// updateAwiaVirtualStaffLifecycleRecord itself only checked that to_state belonged to an
// incomplete 5-state set (missing PROVISIONING and ARCHIVED entirely) with NO transition-
// table validation: a member could jump from any state directly to any other, including
// DRAFT->RETIRED or RETIRED->ACTIVE. That is the concrete gap "enforce lifecycle transitions
// after hire, not just at hire" describes. Fixed by validating every transition against a
// real from->to table below. canAcceptExecutableTask()'s existing gate then automatically
// blocks task assignment/readiness the instant a member leaves ACTIVE -- no separate
// enforcement code is needed at the task-assignment call sites for this to take effect.
const AWIA_STAFF_LIFECYCLE_TRANSITIONS = {
  DRAFT: ["PROVISIONING", "ACTIVE"],
  PROVISIONING: ["ACTIVE"],
  ACTIVE: ["PAUSED", "SUSPENDED", "RETIRED"],
  PAUSED: ["ACTIVE", "SUSPENDED", "RETIRED"],
  SUSPENDED: ["ACTIVE", "RETIRED"],
  RETIRED: ["ARCHIVED"],
  ARCHIVED: []
};

export async function updateAwiaVirtualStaffLifecycleRecord(body, actor) {
  if (!staffLifecycleStates.includes(body.to_state)) invalidState(`Unsupported AWIA staff lifecycle state: ${body.to_state}`);
  return withStore((store) => {
    const member = store.awia_virtual_staff_members.find((record) => record.organization_id === body.tenant_id && record.firm_id === body.firm_id && record.agent_code === body.staff_code);
    if (!member) throwNotFound("awia_virtual_staff_members", body.staff_code);
    const fromState = member.lifecycle_status;
    const allowedNextStates = AWIA_STAFF_LIFECYCLE_TRANSITIONS[fromState] ?? [];
    if (!allowedNextStates.includes(body.to_state)) {
      invalidState(`AWIA staff lifecycle transition rejected: ${fromState} -> ${body.to_state} is not allowed (from ${fromState}, allowed: ${allowedNextStates.join(", ") || "none -- terminal state"}).`);
    }
    member.lifecycle_status = body.to_state;
    member.updated_at = now();
    const event = {
      id: `staff-lifecycle-${body.staff_code.toLowerCase()}-${body.to_state.toLowerCase()}-${store.awia_staff_lifecycle_events.length + 1}`,
      lifecycle_event_id: `staff-lifecycle-${body.staff_code.toLowerCase()}-${body.to_state.toLowerCase()}-${store.awia_staff_lifecycle_events.length + 1}`,
      tenant_id: body.tenant_id,
      firm_id: body.firm_id,
      staff_code: body.staff_code,
      from_state: fromState,
      to_state: body.to_state,
      reason: body.reason ?? "controlled_operator_lifecycle_update",
      actor_id: actor.actor_id,
      event_boundary: "human_controlled_lifecycle_update_no_autonomous_execution",
      created_at: now()
    };
    store.awia_staff_lifecycle_events.push(event);
    appendEventAndAudit(store, { event_type: "awia.virtual_staff.lifecycle_updated", actor, tenant_id: body.tenant_id, firm_id: body.firm_id, aggregate_type: "AwiaVirtualStaffMember", aggregate_id: storeBackend === "postgres" ? deterministicUuid(member.id) : member.id, payload: { staff_code: body.staff_code, from_state: fromState, to_state: body.to_state }, summary: "AWIA virtual staff lifecycle updated by a human operator." });
    return { member, lifecycle_event: event };
  });
}

export async function evaluateAwiaVirtualStaffTaskReadinessRecord(body, actor) {
  return withStore((store) => {
    const run = awiaRunFromStore(store, body.tenant_id, body.firm_id);
    if (!run.members.length) throwNotFound("awia_virtual_staff_members", body.staff_code);
    const request = createRuntimeActionRequest({
      request_id: body.request_id ?? (storeBackend === "postgres" ? newUuid() : newId("awia_runtime_request")),
      tenant_id: body.tenant_id,
      firm_id: body.firm_id,
      staff_code: body.staff_code,
      action: body.action,
      tool: body.tool,
      risk_class: body.risk_class ?? "CONTROLLED",
      client_id: body.client_id,
      project_id: body.project_id,
      evidence_refs: body.evidence_refs ?? [],
      approval: body.approval ?? null,
      requested_by_actor_id: actor.actor_id,
      responsible_professional_id: body.responsible_professional_id ?? null,
      sod: body.sod ?? { actor_has_conflicting_role: false },
      prompt_authority_claim: body.prompt_authority_claim ?? null,
      salary_authority_claim: body.salary_authority_claim ?? null,
      package_binding_authority_claim: body.package_binding_authority_claim ?? null
    });
    const decision = evaluateVirtualStaffRuntimeAction({ provisioningRun: run, registry: awiaVirtualStaffPackageRegistry, request });
    const record = {
      id: request.request_id,
      tenant_id: body.tenant_id,
      firm_id: body.firm_id,
      staff_code: body.staff_code,
      action: body.action,
      tool: body.tool,
      decision: decision.decision,
      risk_class: request.risk_class,
      findings: decision.findings,
      evidence_refs: request.evidence_refs,
      requested_by_actor_id: actor.actor_id,
      created_at: now()
    };
    upsertById(store.awia_staff_task_readiness_records, record);
    upsertById(store.awia_staff_authority_decisions, { id: request.request_id, tenant_id: body.tenant_id, firm_id: body.firm_id, ...decision, created_at: now() });
    appendEventAndAudit(store, { event_type: "awia.virtual_staff.task_readiness_evaluated", actor, tenant_id: body.tenant_id, firm_id: body.firm_id, aggregate_type: "AwiaStaffAuthorityDecision", aggregate_id: record.id, payload: { staff_code: body.staff_code, action: body.action, decision: decision.decision }, summary: "AWIA virtual staff task readiness evaluated with deterministic authority gate." });
    return record;
  });
}


export async function assignAwiaVirtualStaffTaskRecord(body, actor) {
  return withStore((store) => {
    const member = store.awia_virtual_staff_members.find((record) => record.organization_id === body.tenant_id && record.firm_id === body.firm_id && record.agent_code === body.staff_code);
    if (!member) throwNotFound("awia_virtual_staff_members", body.staff_code);
    // HM-S4 item 2: optional skill-scoped assignment. When the caller names a
    // specific catalogue skill_id (e.g. "ARO-10"), enforce that the hired
    // member's own position (not just its role_code) actually carries that
    // skill -- closes the real gap where General Clerk and HR Administrator,
    // both role_code ARO, were otherwise indistinguishable at runtime. Callers
    // that omit skill_id (e.g. HM-S2's existing ARO-01 pilot smoke test) are
    // unaffected -- this check is additive, not retroactive.
    let skillScope = null;
    if (body.skill_id) {
      if (!member.position_id) invalidState(`AWIA staff task assignment denied: POSITION_ID_REQUIRED_FOR_SKILL_SCOPED_ASSIGNMENT:${body.staff_code}`);
      const skillRequirement = resolveClassAApprovalRequirement({ position_id: member.position_id, skill_id: body.skill_id });
      if (!skillRequirement.found) invalidState(`AWIA staff task assignment denied: SKILL_NOT_IN_POSITION_SCOPE:${body.skill_id}@${member.position_id}`);
      skillScope = { position_id: member.position_id, skill_id: body.skill_id, requires_class_a_approval: skillRequirement.requires_approval === true };
    }
    const task = store.tasks.find((record) => record.id === body.task_id && record.tenant_id === body.tenant_id && record.firm_id === body.firm_id);
    if (!task) throwNotFound("tasks", body.task_id);
    // ADR-089 W1 (B1): an evidence ref of the form "file:<id>" must point at a real uploaded file
    // in this same tenant/firm -- a worker can never be handed another firm's file by id.
    assertScopedFileRefs(store, body.evidence_refs ?? [], body);
    let readiness = evaluateVirtualStaffRuntimeAction({
      provisioningRun: awiaRunFromStore(store, body.tenant_id, body.firm_id),
      registry: awiaVirtualStaffPackageRegistry,
      request: createRuntimeActionRequest({
        request_id: body.readiness_request_id ?? (storeBackend === "postgres" ? newUuid() : newId("awia_runtime_request")),
        tenant_id: body.tenant_id,
        firm_id: body.firm_id,
        staff_code: body.staff_code,
        action: body.action ?? `${task.task_type}.prepare`,
        tool: body.tool,
        risk_class: body.risk_class ?? task.risk_class ?? "CONTROLLED",
        client_id: body.client_id,
        project_id: body.project_id ?? task.project_id,
        evidence_refs: body.evidence_refs ?? [],
        approval: body.approval ?? null,
        requested_by_actor_id: actor.actor_id,
        responsible_professional_id: body.responsible_professional_id ?? null,
        sod: body.sod ?? { actor_has_conflicting_role: false }
      })
    });
    // HM-S4 item 2, gap 2 (found running the item-2 smoke test): the OLD
    // per-role_code coarse tool/action allowlist (defaultToolPolicyByRole in
    // awia-virtual-staff-authority-gate.mjs) predates the position catalogue
    // and only knows ~4 fixed tool names per role_code family -- it has no
    // concept of positions or skills, so a legitimate position skill (e.g.
    // HR Administrator's ARO-10 "administration.employee.onboarding") gets
    // denied by that old list even though skillScope above has ALREADY
    // confirmed, against the real position catalogue, that this member's own
    // hired position genuinely carries this exact skill -- a strictly more
    // precise check than the coarse list. So: once skillScope has confirmed
    // the skill belongs to the position, drop only the two coarse
    // role-family findings (TOOL_NOT_ALLOWED_FOR_ROLE, ACTION_NOT_ALLOWED_FOR_ROLE)
    // that this finer-grained check supersedes -- every other readiness
    // check (lifecycle status, tenant/firm scope, evidence-refs required,
    // SOD conflict, high-risk/approval requirements) still applies in full,
    // unchanged. Calls with no skill_id (e.g. HM-S2's ARO-01 pilot) are
    // completely unaffected: skillScope is null and this block is skipped.
    if (skillScope) {
      const filteredFindings = readiness.findings.filter((finding) => finding.code !== "TOOL_NOT_ALLOWED_FOR_ROLE" && finding.code !== "ACTION_NOT_ALLOWED_FOR_ROLE");
      if (filteredFindings.length !== readiness.findings.length) {
        const hasErrors = filteredFindings.some((finding) => finding.severity === "ERROR");
        readiness = {
          ...readiness,
          findings: filteredFindings,
          ok: !hasErrors,
          decision: hasErrors ? (filteredFindings.some((finding) => finding.code === "HUMAN_APPROVAL_REQUIRED") ? "REQUIRE_APPROVAL" : "DENY") : "ALLOW"
        };
      }
    }
    const readinessRecord = {
      id: readiness.request.request_id,
      tenant_id: body.tenant_id,
      firm_id: body.firm_id,
      staff_code: body.staff_code,
      task_id: task.id,
      action: readiness.request.action,
      tool: readiness.request.tool,
      decision: readiness.decision,
      risk_class: readiness.request.risk_class,
      findings: readiness.findings,
      evidence_refs: readiness.request.evidence_refs,
      requested_by_actor_id: actor.actor_id,
      created_at: now()
    };
    upsertById(store.awia_staff_task_readiness_records, readinessRecord);
    upsertById(store.awia_staff_authority_decisions, { id: readiness.request.request_id, tenant_id: body.tenant_id, firm_id: body.firm_id, ...readiness, created_at: now() });
    if (readiness.decision !== "ALLOW") invalidState(`AWIA staff task assignment denied: ${readiness.findings.map((finding) => finding.code).join(", ")}`);
    const item = {
      id: body.workdesk_item_id ?? (storeBackend === "postgres" ? newUuid() : newId("awia_workdesk")),
      tenant_id: body.tenant_id,
      firm_id: body.firm_id,
      staff_code: body.staff_code,
      staff_member_id: member.id,
      task_id: task.id,
      project_id: task.project_id,
      workdesk_status: "ASSIGNED",
      assignment_summary: body.assignment_summary ?? `Assigned ${task.task_type} to ${member.display_name ?? body.staff_code}.`,
      action: readiness.request.action,
      tool: readiness.request.tool,
      risk_class: readiness.request.risk_class,
      evidence_refs: readiness.request.evidence_refs,
      position_id: skillScope?.position_id ?? member.position_id ?? null,
      skill_id: skillScope?.skill_id ?? null,
      class_a_approval_required: skillScope?.requires_class_a_approval === true,
      readiness_record_id: readinessRecord.id,
      assigned_by_actor_id: actor.actor_id,
      assigned_at: now(),
      updated_at: now(),
      // ADR-090 W2: link back to the owner's work request (null for project tasks assigned directly).
      work_request_id: body.work_request_id ?? null,
      instructions: body.instructions ?? null,
      due_at: body.due_at ?? task.due_at ?? null,
      boundary: "assigned_workdesk_item_requires_human_supervision_and_review"
    };
    store.awia_staff_workdesk_items.push(item);
    task.assigned_actor_or_worker_ref = member.id;
    task.state = "ASSIGNED_TO_AWIA_STAFF";
    task.updated_at = now();
    appendEventAndAudit(store, { event_type: "awia.virtual_staff.task_assigned", actor, tenant_id: body.tenant_id, firm_id: body.firm_id, aggregate_type: "AwiaStaffWorkdeskItem", aggregate_id: item.id, payload: { staff_code: body.staff_code, task_id: task.id, readiness_record_id: readinessRecord.id }, summary: "AWIA virtual staff task assigned to controlled workdesk after readiness gate." });
    return { workdesk_item: item, task, readiness: readinessRecord };
  });
}


export async function produceAwiaStaffOutputDraftRecord(body, actor) {
  return withStore((store) => {
    const item = store.awia_staff_workdesk_items.find((record) => record.id === body.workdesk_item_id && record.tenant_id === body.tenant_id && record.firm_id === body.firm_id);
    if (!item) throwNotFound("awia_staff_workdesk_items", body.workdesk_item_id);
    // ADR-089 W1 (B3): REWORK (owner asked for a revision) may produce a fresh draft; the prior
    // draft is kept untouched as history and linked via supersedes_output_draft_id.
    // ADR-093 W4: NEEDS_INFO counts as the status it will return to (ASSIGNED or REWORK).
    const effectiveStatus = effectiveWorkdeskStatus(item);
    if (effectiveStatus !== "ASSIGNED" && effectiveStatus !== "REWORK") invalidState("AWIA output drafts can only be produced from ASSIGNED or REWORK workdesk items.");
    const member = store.awia_virtual_staff_members.find((record) => record.id === item.staff_member_id && record.lifecycle_status === "ACTIVE");
    if (!member) throwNotFound("active awia_virtual_staff_members", item.staff_code);
    const priorDraft = effectiveStatus === "REWORK" && item.output_draft_id ? store.awia_staff_output_drafts.find((record) => record.id === item.output_draft_id) : null;
    // ADR-089 W1 (B1): owner-attached output file (for skills without an executable module yet --
    // decision D4). Must be an uploaded file in this tenant/firm.
    const outputFile = body.output_file_id ? assertScopedFileRefs(store, [`file:${body.output_file_id}`], body)[0] : null;
    // ADR-092 W3 (D4): work given through a request never gets an empty placeholder draft -- it is
    // either run by its skill (run-skill) or the owner attaches the finished output file.
    if (item.work_request_id && !outputFile && (body.output_payload === undefined || body.output_payload === null)) {
      invalidState(isRunnableSkill(item.skill_id ?? scopedFind(store, "work_requests", item.work_request_id, body)?.skill_id) ? "Run the worker on the inputs (or attach the finished output file) to produce this draft." : "This kind of work cannot be run automatically yet -- attach the finished output file.");
    }
    const output = {
      id: body.output_draft_id ?? (storeBackend === "postgres" ? newUuid() : newId("awia_output_draft")),
      tenant_id: body.tenant_id,
      firm_id: body.firm_id,
      workdesk_item_id: item.id,
      task_id: item.task_id,
      project_id: item.project_id,
      staff_code: item.staff_code,
      staff_member_id: item.staff_member_id,
      output_title: body.output_title ?? `${item.staff_code} draft output`,
      output_summary: body.output_summary ?? item.assignment_summary,
      output_ref: outputFile ? `file:${outputFile.id}` : (body.output_ref ?? `awia://draft-output/${item.id}`),
      output_file_id: outputFile?.id ?? null,
      output_payload: body.output_payload ?? null,
      // ADR-092 W3: how the draft was made -- the skill run (module, input files + SHA-256) or null
      // when the owner attached the output themselves.
      generation: body.generation ?? null,
      supersedes_output_draft_id: priorDraft?.id ?? null,
      revision_number: (priorDraft?.revision_number ?? (priorDraft ? 1 : 0)) + 1,
      revision_request_notes: priorDraft ? (item.revision_request_notes ?? null) : null,
      evidence_refs: body.evidence_refs ?? item.evidence_refs ?? [],
      status: "DRAFT_REVIEW_REQUIRED",
      requires_human_review: true,
      final_issue_allowed: false,
      // HM-S4 item 2: carry the workdesk item's skill scope through so the
      // Class-A approval gate has something real to check at review time.
      position_id: item.position_id ?? null,
      skill_id: item.skill_id ?? null,
      class_a_approval_required: item.class_a_approval_required === true,
      class_a_approval_status: item.class_a_approval_required === true ? "PENDING" : null,
      boundary: "draft_only_no_client_issue_without_human_review",
      created_by_actor_id: member.audit_identity?.actor_ref ?? member.id,
      created_at: now(),
      updated_at: now()
    };
    store.awia_staff_output_drafts.push(output);
    item.workdesk_status = "OUTPUT_DRAFTED";
    item.output_draft_id = output.id;
    item.last_run_error = null;
    item.needs_info_return_status = null;
    item.updated_at = now();
    // ADR-093 W4 (B6): timeline entry for request work (legacy items keep their old behaviour).
    if (item.work_request_id) {
      postItemThreadMessage(store, item, actor, output.generation
        ? { role: "VIRTUAL_STAFF", kind: "DRAFT_READY", content: `Draft ${output.revision_number > 1 ? `revision ${output.revision_number} ` : ""}ready for your review: ${output.output_summary ?? output.output_title}` }
        : { role: "HUMAN_SUPERVISOR", kind: "OUTPUT_ATTACHED", content: `Attached the finished output: ${outputFile?.filename ?? output.output_title}.`, file_ids: outputFile ? [outputFile.id] : [] });
    }
    const task = store.tasks.find((record) => record.id === item.task_id);
    if (task) {
      task.output_ref = output.output_ref;
      task.state = "AWIA_OUTPUT_DRAFTED";
      task.updated_at = now();
    }
    appendEventAndAudit(store, { event_type: "awia.virtual_staff.output_drafted", actor, tenant_id: body.tenant_id, firm_id: body.firm_id, aggregate_type: "AwiaStaffOutputDraft", aggregate_id: output.id, payload: { workdesk_item_id: item.id, task_id: item.task_id, requires_human_review: true }, summary: "AWIA virtual staff produced a draft-only output for human review." });
    return { output_draft: output, workdesk_item: item, task: task ?? null };
  });
}

export async function reviewAwiaStaffOutputDraftRecord(body, actor) {
  return withStore((store) => {
    const output = store.awia_staff_output_drafts.find((record) => record.id === body.output_draft_id && record.tenant_id === body.tenant_id && record.firm_id === body.firm_id);
    if (!output) throwNotFound("awia_staff_output_drafts", body.output_draft_id);
    const allowed = new Set(["APPROVED_FOR_CLIENT_DRAFT", "REVISION_REQUIRED", "REJECTED"]);
    if (!allowed.has(body.review_decision)) invalidState(`Unsupported AWIA output review decision: ${body.review_decision}`);
    // HM-S4 item 2: a Class A output cannot move to client-draft on ordinary
    // human review alone -- it needs its own firm-owner Class-A approval
    // first (decideAwiaStaffClassAApprovalRecord), which is the action-level
    // gate the position catalogue's escalation rules actually describe.
    // REVISION_REQUIRED / REJECTED are unaffected: a reviewer can still send
    // a Class A draft back without going through that gate.
    if (body.review_decision === "APPROVED_FOR_CLIENT_DRAFT" && output.class_a_approval_required === true && output.class_a_approval_status !== "APPROVED") {
      invalidState(`AWIA output review denied: CLASS_A_APPROVAL_REQUIRED_BEFORE_CLIENT_DRAFT:${output.skill_id}@${output.position_id}`);
    }
    const review = {
      id: body.review_id ?? (storeBackend === "postgres" ? newUuid() : newId("awia_output_review")),
      tenant_id: body.tenant_id,
      firm_id: body.firm_id,
      output_draft_id: output.id,
      workdesk_item_id: output.workdesk_item_id,
      task_id: output.task_id,
      project_id: output.project_id,
      staff_code: output.staff_code,
      review_decision: body.review_decision,
      review_notes: body.review_notes ?? null,
      reviewed_by_actor_id: actor.actor_id,
      professional_authority_ref: body.professional_authority_ref ?? null,
      reviewed_at: now(),
      boundary: "human_review_required_before_client_delivery_draft"
    };
    store.awia_staff_output_reviews.push(review);
    output.status = body.review_decision;
    output.updated_at = now();
    const item = store.awia_staff_workdesk_items.find((record) => record.id === output.workdesk_item_id);
    if (item) {
      // ADR-089 W1 (B3): REVISION_REQUIRED now sends the item back to the worker (REWORK) instead
      // of the old REVIEW_ACTION_REQUIRED dead end; REJECTED still lands in REVIEW_ACTION_REQUIRED
      // (archivable), unchanged.
      item.workdesk_status = body.review_decision === "APPROVED_FOR_CLIENT_DRAFT"
        ? "REVIEWED_FOR_CLIENT_DRAFT"
        : body.review_decision === "REVISION_REQUIRED" ? "REWORK" : "REVIEW_ACTION_REQUIRED";
      if (body.review_decision === "REVISION_REQUIRED") item.revision_request_notes = body.review_notes ?? null;
      item.updated_at = now();
      if (item.work_request_id) {
        const said = { APPROVED_FOR_CLIENT_DRAFT: "Approved", REVISION_REQUIRED: "Revision requested", REJECTED: "Rejected" }[body.review_decision];
        postItemThreadMessage(store, item, actor, { role: "HUMAN_SUPERVISOR", kind: "REVIEW", content: `${said}${body.review_notes ? `: ${body.review_notes}` : "."}` });
      }
    }
    appendEventAndAudit(store, { event_type: "awia.virtual_staff.output_reviewed", actor, tenant_id: body.tenant_id, firm_id: body.firm_id, aggregate_type: "AwiaStaffOutputReview", aggregate_id: review.id, payload: { output_draft_id: output.id, review_decision: body.review_decision }, summary: "Human reviewed AWIA virtual staff draft output." });
    return { output_draft: output, output_review: review, workdesk_item: item ?? null };
  });
}

// HM-S4 item 2: the live wiring of evaluateClassAApprovalGate() (built HM-S1
// item 5, deferred untested in HM-S2 item 3). This is a distinct action from
// reviewAwiaStaffOutputDraftRecord's ordinary human review: it gates the
// underlying Class A ACTION itself (per the position catalogue's escalation
// rule -- "prepares each one; structurally cannot self-approve any of
// them"), not just the quality of the drafted output. Boundary, stated
// plainly: this runtime has no separate firm-owner identity concept yet --
// whichever actor calls this endpoint for the firm is trusted as the firm
// owner, the same trust boundary already used by reviewAwiaStaffOutputDraftRecord's
// human reviewer. A denial (e.g. self-approval) is a legitimate, expected
// outcome, not an error -- it is persisted as DENIED and returned, not
// thrown, so a smoke test or the UI can inspect why.
export async function decideAwiaStaffClassAApprovalRecord(body, actor) {
  return withStore((store) => {
    const output = store.awia_staff_output_drafts.find((record) => record.id === body.output_draft_id && record.tenant_id === body.tenant_id && record.firm_id === body.firm_id);
    if (!output) throwNotFound("awia_staff_output_drafts", body.output_draft_id);
    if (output.class_a_approval_required !== true) invalidState("This AWIA output does not require Class A approval.");
    if (output.class_a_approval_status === "APPROVED") invalidState("This AWIA output's Class A approval has already been granted.");
    const gate = evaluateClassAApprovalGate({
      position_id: output.position_id,
      skill_id: output.skill_id,
      prepared_by_actor_id: output.created_by_actor_id,
      approver_actor_id: actor.actor_id,
      approver_role_claim: "firm_owner",
      firm_owner_actor_id: actor.actor_id
    });
    output.class_a_approval_status = gate.decision === "ALLOW" ? "APPROVED" : "DENIED";
    output.class_a_approval_findings = gate.findings;
    output.class_a_approval_decided_by_actor_id = actor.actor_id;
    output.class_a_approval_decided_at = now();
    output.updated_at = now();
    appendEventAndAudit(store, { event_type: "awia.virtual_staff.class_a_output_approval_decided", actor, tenant_id: body.tenant_id, firm_id: body.firm_id, aggregate_type: "AwiaStaffOutputDraft", aggregate_id: output.id, payload: { decision: gate.decision, findings: gate.findings, skill_id: output.skill_id, position_id: output.position_id }, summary: `Class A approval ${gate.decision === "ALLOW" ? "granted" : "denied"} for AWIA staff output requiring firm-owner sign-off.` });
    return { output_draft: output, decision: gate.decision, findings: gate.findings };
  });
}

export async function prepareAwiaClientDeliveryDraftRecord(body, actor) {
  return withStore((store) => {
    const output = store.awia_staff_output_drafts.find((record) => record.id === body.output_draft_id && record.tenant_id === body.tenant_id && record.firm_id === body.firm_id);
    if (!output) throwNotFound("awia_staff_output_drafts", body.output_draft_id);
    const review = [...store.awia_staff_output_reviews].reverse().find((record) => record.output_draft_id === output.id && record.review_decision === "APPROVED_FOR_CLIENT_DRAFT");
    if (!review) invalidState("Client delivery draft requires human review decision APPROVED_FOR_CLIENT_DRAFT.");
    // ADR-090 W2 (D2): INTERNAL firm work never goes to a client -- it is filed via
    // completeAwiaInternalWorkdeskItemRecord instead.
    const sourceItem = store.awia_staff_workdesk_items.find((record) => record.id === output.workdesk_item_id);
    if (sourceItem?.risk_class === "INTERNAL") invalidState("INTERNAL firm work cannot be prepared for a client; mark it complete instead.");
    const draft = {
      id: body.client_delivery_draft_id ?? (storeBackend === "postgres" ? newUuid() : newId("awia_client_delivery_draft")),
      tenant_id: body.tenant_id,
      firm_id: body.firm_id,
      output_draft_id: output.id,
      output_review_id: review.id,
      workdesk_item_id: output.workdesk_item_id,
      task_id: output.task_id,
      project_id: output.project_id,
      staff_code: output.staff_code,
      client_id: body.client_id,
      delivery_title: body.delivery_title ?? output.output_title,
      delivery_summary: body.delivery_summary ?? output.output_summary,
      // ADR-089 W1 (B1): an approved output that carries a real file hands that file straight to
      // the client delivery draft, so the owner can download exactly what was approved.
      delivery_ref: body.delivery_ref ?? (output.output_file_id ? `file:${output.output_file_id}` : `client-draft://${output.id}`),
      delivery_file_id: output.output_file_id ?? null,
      evidence_refs: body.evidence_refs ?? output.evidence_refs,
      status: "CLIENT_DELIVERY_DRAFT_PREPARED",
      final_issue_allowed: false,
      requires_human_issue_approval: true,
      prepared_by_actor_id: actor.actor_id,
      prepared_at: now(),
      boundary: "client_delivery_draft_only_no_final_issue"
    };
    store.awia_client_delivery_drafts.push(draft);
    const item = store.awia_staff_workdesk_items.find((record) => record.id === output.workdesk_item_id);
    if (item) {
      item.workdesk_status = "CLIENT_DELIVERY_DRAFT_PREPARED";
      item.client_delivery_draft_id = draft.id;
      item.updated_at = now();
    }
    appendEventAndAudit(store, { event_type: "awia.virtual_staff.client_delivery_draft_prepared", actor, tenant_id: body.tenant_id, firm_id: body.firm_id, aggregate_type: "AwiaClientDeliveryDraft", aggregate_id: draft.id, payload: { output_draft_id: output.id, output_review_id: review.id, final_issue_allowed: false }, summary: "Client delivery draft prepared from reviewed AWIA staff output without final issue authority." });
    return { client_delivery_draft: draft, output_draft: output, output_review: review, workdesk_item: item ?? null };
  });
}

export async function markAwiaClientDeliveryDraftSentRecord(body, actor) {
  return withStore((store) => {
    const draft = store.awia_client_delivery_drafts.find((record) => record.id === body.client_delivery_draft_id && record.tenant_id === body.tenant_id && record.firm_id === body.firm_id);
    if (!draft) throwNotFound("awia_client_delivery_drafts", body.client_delivery_draft_id);
    if (draft.status !== "CLIENT_DELIVERY_DRAFT_PREPARED") invalidState("Only a prepared client delivery draft can be marked sent.");
    draft.status = "OWNER_MARKED_SENT";
    draft.marked_sent_by_actor_id = actor.actor_id;
    draft.marked_sent_at = now();
    const item = store.awia_staff_workdesk_items.find((record) => record.id === draft.workdesk_item_id);
    let filed = null;
    if (item) {
      item.workdesk_status = "ARCHIVED_SENT";
      item.archived_at = now();
      item.archived_by_actor_id = actor.actor_id;
      item.updated_at = now();
      // ADR-093 W4 (B7): file the approved output in the document register.
      const outputDraft = store.awia_staff_output_drafts.find((record) => record.id === draft.output_draft_id);
      filed = fileWorkdeskOutputToRegister(store, item, outputDraft, actor);
      if (item.work_request_id) postItemThreadMessage(store, item, actor, { role: "HUMAN_SUPERVISOR", kind: "CLOSED", content: `Marked sent to the client.${filed ? ` Filed in Documents as ${filed.document_number}.` : ""}` });
    }
    appendEventAndAudit(store, { event_type: "awia.virtual_staff.client_delivery_draft_marked_sent", actor, tenant_id: body.tenant_id, firm_id: body.firm_id, aggregate_type: "AwiaClientDeliveryDraft", aggregate_id: draft.id, payload: { output_draft_id: draft.output_draft_id, marked_sent_by_actor_id: actor.actor_id }, summary: "Owner recorded that a prepared client delivery draft was delivered outside vFirm; this is a recordkeeping action only, not a system client transmission or final issue action." });
    return { client_delivery_draft: draft, workdesk_item: item ?? null, filed_document: filed };
  });
}

export async function archiveAwiaStaffWorkdeskItemRecord(body, actor) {
  return withStore((store) => {
    const item = store.awia_staff_workdesk_items.find((record) => record.id === body.workdesk_item_id && record.tenant_id === body.tenant_id && record.firm_id === body.firm_id);
    if (!item) throwNotFound("awia_staff_workdesk_items", body.workdesk_item_id);
    const output = item.output_draft_id ? store.awia_staff_output_drafts.find((record) => record.id === item.output_draft_id) : null;
    const isRejectedOutput = output?.status === "REJECTED";
    const archivableStatuses = new Set(["REVIEW_ACTION_REQUIRED", "REWORK", "NEEDS_INFO"]);
    if (!archivableStatuses.has(item.workdesk_status) && !isRejectedOutput) {
      invalidState("Only a workdesk item at REVIEW_ACTION_REQUIRED or REWORK, or whose output draft was REJECTED, can be archived.");
    }
    item.workdesk_status = "ARCHIVED_DISMISSED";
    item.archived_at = now();
    item.archived_by_actor_id = actor.actor_id;
    item.archived_reason = body.archived_reason ?? (isRejectedOutput ? "output_rejected" : "review_action_dismissed_by_owner");
    item.updated_at = now();
    appendEventAndAudit(store, { event_type: "awia.virtual_staff.workdesk_item_archived", actor, tenant_id: body.tenant_id, firm_id: body.firm_id, aggregate_type: "AwiaStaffWorkdeskItem", aggregate_id: item.id, payload: { archived_reason: item.archived_reason }, summary: "Owner archived a dead-end AWIA workdesk item; no re-draft path exists yet for revision-required items (tracked separately)." });
    return { workdesk_item: item };
  });
}

export async function appendAwiaStaffMemoryEntryRecord(body, actor) {
  return withStore((store) => {
    const member = store.awia_virtual_staff_members.find((record) => record.organization_id === body.tenant_id && record.firm_id === body.firm_id && record.agent_code === body.staff_code);
    if (!member) throwNotFound("awia_virtual_staff_members", body.staff_code);
    const built = buildStaffMemoryEntry({
      ...body,
      memory_entry_id: body.memory_entry_id ?? (storeBackend === "postgres" ? newUuid() : newId("awia_staff_memory_entry")),
      tenant_id: body.tenant_id,
      firm_id: body.firm_id,
      staff_code: body.staff_code,
      workdesk_item_id: body.workdesk_item_id ?? null,
      task_id: body.task_id ?? null,
      kind: body.kind,
      content: body.content,
      evidence_refs: body.evidence_refs ?? [],
      authored_by_actor_id: actor.actor_id,
      created_at: now()
    });
    if (!built.accepted) invalidState(`AWIA staff memory entry rejected: ${built.findings.join(", ")}`);
    store.awia_staff_memory_entries.push(built.entry);
    appendEventAndAudit(store, { event_type: "awia.virtual_staff.memory_entry_appended", actor, tenant_id: body.tenant_id, firm_id: body.firm_id, aggregate_type: "AwiaStaffMemoryEntry", aggregate_id: built.entry.id, payload: { staff_code: body.staff_code, kind: body.kind }, summary: "AWIA virtual staff memory entry appended as bounded evidence summary." });
    return built.entry;
  });
}

export async function openAwiaStaffConversationThreadRecord(body, actor) {
  return withStore((store) => {
    const member = store.awia_virtual_staff_members.find((record) => record.organization_id === body.tenant_id && record.firm_id === body.firm_id && record.agent_code === body.staff_code);
    if (!member) throwNotFound("awia_virtual_staff_members", body.staff_code);
    const thread = buildConversationThread({
      thread_id: body.thread_id ?? (storeBackend === "postgres" ? newUuid() : newId("awia_staff_conversation_thread")),
      tenant_id: body.tenant_id,
      firm_id: body.firm_id,
      staff_code: body.staff_code,
      workdesk_item_id: body.workdesk_item_id ?? null,
      task_id: body.task_id ?? null,
      opened_by_actor_id: actor.actor_id,
      created_at: now()
    });
    store.awia_staff_conversation_threads.push(thread);
    appendEventAndAudit(store, { event_type: "awia.virtual_staff.conversation_thread_opened", actor, tenant_id: body.tenant_id, firm_id: body.firm_id, aggregate_type: "AwiaStaffConversationThread", aggregate_id: thread.id, payload: { staff_code: body.staff_code }, summary: "AWIA virtual staff conversation thread opened under human supervision." });
    return thread;
  });
}

export async function postAwiaStaffConversationMessageRecord(body, actor) {
  return withStore((store) => {
    const thread = store.awia_staff_conversation_threads.find((record) => record.id === body.thread_id && record.tenant_id === body.tenant_id && record.firm_id === body.firm_id);
    if (!thread) throwNotFound("awia_staff_conversation_threads", body.thread_id);
    const built = buildConversationMessage({
      ...body,
      message_id: body.message_id ?? (storeBackend === "postgres" ? newUuid() : newId("awia_staff_conversation_message")),
      thread_id: thread.id,
      tenant_id: body.tenant_id,
      firm_id: body.firm_id,
      staff_code: thread.staff_code,
      participant_role: body.participant_role,
      classification: body.classification ?? "INTERNAL_OPERATIONAL_CONTEXT",
      content: body.content,
      authored_by_actor_id: actor.actor_id,
      created_at: now()
    });
    if (!built.accepted) invalidState(`AWIA staff conversation message rejected: ${built.findings.join(", ")}`);
    store.awia_staff_conversation_messages.push(built.message);
    appendEventAndAudit(store, { event_type: "awia.virtual_staff.conversation_message_posted", actor, tenant_id: body.tenant_id, firm_id: body.firm_id, aggregate_type: "AwiaStaffConversationMessage", aggregate_id: built.message.id, payload: { thread_id: thread.id, participant_role: body.participant_role, classification: built.message.classification }, summary: "AWIA virtual staff conversation message posted as internal operational context." });
    return { message: built.message, thread };
  });
}

export async function updateAwiaStaffSeatBillingStatusRecord(body, actor) {
  return withStore((store) => {
    const seat = store.awia_virtual_staff_seats.find((record) => record.tenant_id === body.tenant_id && record.firm_id === body.firm_id && record.staff_code === body.staff_code);
    if (!seat) throwNotFound("awia_virtual_staff_seats", body.staff_code);
    const fromStatus = seat.billing_status ?? "DRAFT";
    const evaluation = evaluateSeatBillingTransition({ from_status: fromStatus, to_status: body.to_status });
    if (evaluation.decision !== "ALLOW") invalidState(`AWIA seat billing transition denied: ${evaluation.findings.join(", ")}`);
    seat.billing_status = body.to_status;
    seat.billing_status_updated_at = now();
    const event = {
      id: storeBackend === "postgres" ? newUuid() : newId("awia_seat_billing_event"),
      tenant_id: body.tenant_id,
      firm_id: body.firm_id,
      staff_code: body.staff_code,
      from_status: fromStatus,
      to_status: body.to_status,
      note: body.note ?? null,
      recorded_by_actor_id: actor.actor_id,
      created_at: now(),
      boundary: "billing_bookkeeping_only_no_live_payment_release"
    };
    store.awia_staff_seat_billing_events.push(event);
    appendEventAndAudit(store, { event_type: "awia.virtual_staff.seat_billing_status_updated", actor, tenant_id: body.tenant_id, firm_id: body.firm_id, aggregate_type: "AwiaVirtualStaffSeat", aggregate_id: storeBackend === "postgres" ? deterministicUuid(seat.staff_seat_id) : seat.staff_seat_id, payload: { staff_code: body.staff_code, from_status: fromStatus, to_status: body.to_status }, summary: "AWIA virtual staff seat billing status updated as bookkeeping only; no live payment released." });
    return { seat, billing_event: event };
  });
}

export async function assignAwiaFirmPackageRecord(body, actor) {
  const resolved = resolveAwiaFirmPackage(body.package_code);
  if (!resolved.found) invalidState(`AWIA firm package rejected: ${resolved.findings.join(", ")}`);
  return withStore((store) => {
    const firm = store.firms.find((record) => record.id === body.firm_id && record.tenant_id === body.tenant_id);
    if (!firm) throwNotFound("firms", body.firm_id);
    store.awia_firm_package_assignments = store.awia_firm_package_assignments ?? [];
    const existing = store.awia_firm_package_assignments.find((record) => record.tenant_id === body.tenant_id && record.firm_id === body.firm_id);
    const timestamp = now();
    const fromPackageCode = existing?.package_code ?? null;
    const record = existing ?? {
      id: storeBackend === "postgres" ? newUuid() : newId("awia_firm_package_assignment"),
      tenant_id: body.tenant_id,
      firm_id: body.firm_id,
      created_at: timestamp
    };
    record.package_code = resolved.package.package_code;
    record.package_name = resolved.package.package_name;
    record.max_seats = resolved.package.max_seats;
    record.allowed_roles = resolved.package.allowed_roles;
    record.custom_worker_selection_required = resolved.package.custom_worker_selection_required;
    record.assigned_by_actor_id = actor.actor_id;
    record.updated_at = timestamp;
    upsertById(store.awia_firm_package_assignments, record);
    appendEventAndAudit(store, {
      event_type: "awia.firm_package.assigned",
      actor,
      tenant_id: body.tenant_id,
      firm_id: body.firm_id,
      aggregate_type: "AwiaFirmPackageAssignment",
      aggregate_id: record.id,
      payload: { from_package_code: fromPackageCode, to_package_code: record.package_code },
      summary: "Operator assigned an AWIA commercial package to this firm (pre-billing seat/role gating only, no live payment)."
    });
    return record;
  });
}

export async function readAwiaFirmPackageAssignmentRecord(tenant_id, firm_id) {
  const store = await readStore();
  const assignment = (store.awia_firm_package_assignments ?? []).find((record) => record.tenant_id === tenant_id && record.firm_id === firm_id) ?? null;
  return { boundary: "seat_and_role_gating_only_no_payment_no_runtime_authority", assignment, catalogue: listAwiaFirmPackages() };
}

// Business-owner "hire a virtual worker" flow (HireMe): adds ONE named
// worker to a firm's existing AWIA team, rather than the whole-roster,
// one-shot template flow above. Every per-item collection (seats, members,
// role assignments, package bindings, lifecycle events) is keyed by a
// deterministic id derived from (firm_id, staff_code), so calling this
// repeatedly for the same firm safely grows its roster instead of
// clobbering previously hired staff. The provisioning-run summary row is
// always recomputed from the firm's full current roster (awiaRunFromStore),
// never just this one hire's delta, so it stays an accurate team snapshot.
const AWIA_HIREABLE_ROLE_PACKAGE_IDS = { CFO: "cfo", FAO: "fao", SAO: "sao", OPO: "opo", ARO: "aro" };

function maxAwiaStaffCodeSuffixForRole(store, tenant_id, firm_id, role_code) {
  const existing = (store.awia_staff_role_assignments ?? []).filter((item) => item.tenant_id === tenant_id && item.firm_id === firm_id && item.role_code === role_code);
  let maxSuffix = 0;
  for (const assignment of existing) {
    const match = /^([A-Z]+)-(\d+)$/.exec(assignment.staff_code ?? "");
    if (match && match[1] === role_code) maxSuffix = Math.max(maxSuffix, Number(match[2]));
  }
  return maxSuffix;
}

function nextAwiaStaffCodeForRole(store, tenant_id, firm_id, role_code) {
  return `${role_code}-${String(maxAwiaStaffCodeSuffixForRole(store, tenant_id, firm_id, role_code) + 1).padStart(3, "0")}`;
}

// HM-S3 item 7 -- generates staff codes for a whole roster (e.g. a
// template's staff_set) in one pass, using the same per-firm incremental
// generator as single hiring (nextAwiaStaffCodeForRole / ROLE-NNN) so
// every code minted here is recognized by that generator afterward.
// Previously, bulk-template hiring used the staff_code literals hardcoded
// in the template definition; some of those (FAO-AP-001, FAO-REV-001,
// DATA-001 with role_code "FAO") didn't match the ROLE-NNN shape, so a
// later single hire of the same role couldn't see them when computing its
// own next number, silently breaking the incrementing sequence. Seeds each
// role's counter from the firm's existing role assignments, then
// increments in-memory for every subsequent entry of the same role within
// this same roster, so multiple entries of one role in a single template
// get distinct, sequential codes.
function generateAwiaStaffCodesForRoster(store, tenant_id, firm_id, staffSet) {
  const counters = {};
  return staffSet.map((entry) => {
    const roleCode = entry.role_code;
    if (!(roleCode in counters)) counters[roleCode] = maxAwiaStaffCodeSuffixForRole(store, tenant_id, firm_id, roleCode);
    counters[roleCode] += 1;
    return { ...entry, staff_code: `${roleCode}-${String(counters[roleCode]).padStart(3, "0")}` };
  });
}

export async function hireAwiaFirmWorkerRecord(body, actor) {
  const roleCode = body.role_code;
  const packageId = AWIA_HIREABLE_ROLE_PACKAGE_IDS[roleCode];
  if (!packageId) invalidState(`AWIA staff hire rejected: role_not_hireable_yet:${roleCode}`);
  // HM-S4 item 2: resolve and persist the real catalogue position_id at hire
  // time, closing the HM-S1-documented gap where role_code "ARO" could not
  // distinguish General Clerk from HR Administrator anywhere at runtime
  // (api.js's HIREABLE_ROLES already carried position_id client-side; it was
  // never actually sent to or stored by this endpoint). Optional and
  // backward compatible: omitting it (e.g. CFO, or an older caller) leaves
  // position_id null, exactly as before this change.
  let resolvedPositionId = null;
  if (body.position_id) {
    const positionLookup = resolveAwiaVirtualStaffPosition(body.position_id);
    if (!positionLookup.found) invalidState(`AWIA staff hire rejected: position_not_recognized:${body.position_id}`);
    if (positionLookup.position.role_code !== roleCode) invalidState(`AWIA staff hire rejected: position_role_code_mismatch:${body.position_id} expects role_code ${positionLookup.position.role_code}, got ${roleCode}`);
    resolvedPositionId = positionLookup.position.position_id;
  }
  return withStore((store) => {
    const firm = store.firms.find((record) => record.id === body.firm_id && record.tenant_id === body.tenant_id);
    if (!firm) throwNotFound("firms", body.firm_id);

    const packageAssignment = (store.awia_firm_package_assignments ?? []).find((record) => record.tenant_id === body.tenant_id && record.firm_id === body.firm_id);
    if (!packageAssignment) invalidState("AWIA_STAFF_HIRE_REQUIRES_PACKAGE_ASSIGNMENT: assign a subscription package to this firm before hiring AWIA virtual staff.");
    const packageResolved = resolveAwiaFirmPackage(packageAssignment.package_code);
    if (!packageResolved.found) invalidState(`AWIA firm package on record is no longer recognized: ${packageResolved.findings.join(", ")}`);

    const existingRoleAssignments = (store.awia_staff_role_assignments ?? []).filter((item) => item.tenant_id === body.tenant_id && item.firm_id === body.firm_id);
    const proposedStaffSet = [...existingRoleAssignments.map((item) => ({ role_code: item.role_code })), { role_code: roleCode }];
    const seatGate = evaluateAwiaFirmPackageSeatGate({ package: packageResolved.package, staffSet: proposedStaffSet });
    if (seatGate.decision !== "ALLOW") invalidState(`AWIA staff hire denied by package gate: ${seatGate.findings.join(", ")}`);

    // Post-HM-S4 hire-guardrail fix (2026-09-22): nothing before this point
    // ever checked whether a position was already occupied -- the product
    // owner hired "General Clerk" (role_code ARO, position_id
    // general_clerk) twice by mistake, and nextAwiaStaffCodeForRole() below
    // simply minted the next available staff_code (GC-1, then GC-2) and let
    // both through. This blocks a second hire into the SAME position (or,
    // for a position-less role such as CFO, the same role_code) while an
    // earlier hire there is still DRAFT/ACTIVE/PAUSED/SUSPENDED. A RETIRED
    // occupant does NOT block a re-hire -- retiring a worker (see the My
    // Team "Retire" button, updateAwiaVirtualStaffLifecycleRecord) is the
    // intended way to free a seat back up. role_code isn't stored on the
    // member record itself (see createVirtualStaffMember in
    // awia-virtual-staff-provisioning.mjs), so a position-less occupant is
    // identified via its role assignment record instead.
    // Hiring-bug fix (2026-10-01, ADR-091): member records carry the tenant as `organization_id`
    // (createVirtualStaffMember), never `tenant_id`, so filtering on item.tenant_id matched nothing
    // and this guardrail silently never fired (a second Bookkeeper was accepted as FAO-002).
    const activeMembersForFirm = (store.awia_virtual_staff_members ?? []).filter((item) => (item.tenant_id ?? item.organization_id) === body.tenant_id && item.firm_id === body.firm_id && item.lifecycle_status !== "RETIRED");
    const duplicateOccupant = body.position_id
      ? activeMembersForFirm.find((item) => item.position_id === body.position_id)
      : activeMembersForFirm.find((item) => !item.position_id && existingRoleAssignments.some((assignment) => assignment.staff_code === item.agent_code && assignment.role_code === roleCode));
    if (duplicateOccupant) {
      invalidState(`AWIA staff hire rejected: position_already_occupied:${body.position_id ?? roleCode}:${duplicateOccupant.agent_code}`);
    }

    const staffCode = body.staff_code ?? nextAwiaStaffCodeForRole(store, body.tenant_id, body.firm_id, roleCode);
    if ((store.awia_virtual_staff_members ?? []).some((item) => item.agent_code === staffCode && item.firm_id === body.firm_id)) {
      invalidState(`AWIA staff hire rejected: staff_code_already_hired:${staffCode}`);
    }

    const run = provisionPilotVirtualStaff({
      tenant_id: body.tenant_id,
      firm_id: body.firm_id,
      created_by_actor_id: actor.actor_id,
      salary_plan_id: body.salary_plan_id ?? "virtual-staff-controlled-pilot-plan",
      registry: awiaVirtualStaffPackageRegistry,
      pilotStaff: [{ staff_code: staffCode, package_id: packageId, role_code: roleCode, staff_grade: body.staff_grade ?? "Worker" }]
    });
    if (!run.ok) invalidState(`AWIA staff hire rejected: ${run.findings.map((finding) => finding.code).join(", ")}`);

    for (const seat of run.seats) upsertScopedById(store.awia_virtual_staff_seats, awiaRecord(seat, "staff_seat_id"));
    for (const member of run.members) upsertScopedById(store.awia_virtual_staff_members, { ...awiaRecord(member, "agent_id"), display_name: body.display_name ?? member.display_name, position_id: resolvedPositionId });
    for (const assignment of run.role_assignments) upsertScopedById(store.awia_staff_role_assignments, awiaRecord(assignment, "role_assignment_id"));
    for (const binding of run.package_bindings) upsertScopedById(store.awia_staff_package_bindings, awiaRecord(binding, "package_binding_id"));
    for (const event of run.lifecycle_events) upsertScopedById(store.awia_staff_lifecycle_events, awiaRecord(event, "lifecycle_event_id"));

    const fullRun = validateVirtualStaffProvisioningRun(awiaRunFromStore(store, body.tenant_id, body.firm_id), awiaVirtualStaffPackageRegistry);
    upsertScopedById(store.awia_virtual_staff_provisioning_runs, { ...awiaProvisioningSnapshot(fullRun), package_code: packageAssignment.package_code });
    const evidencePack = buildAwiaVirtualStaffEvidencePack({ registry: awiaVirtualStaffPackageRegistry, provisioningRun: fullRun });
    upsertScopedById(store.awia_staff_evidence_packs, { id: evidencePack.evidence_pack_id, ...evidencePack, tenant_id: body.tenant_id, firm_id: body.firm_id, created_at: now() });

    const hiredMember = store.awia_virtual_staff_members.find((item) => item.agent_code === staffCode && item.firm_id === body.firm_id);
    appendEventAndAudit(store, {
      event_type: "awia.virtual_staff.hired",
      actor,
      tenant_id: body.tenant_id,
      firm_id: body.firm_id,
      aggregate_type: "AwiaVirtualStaffMember",
      aggregate_id: storeBackend === "postgres" ? deterministicUuid(hiredMember.id) : hiredMember.id,
      payload: { staff_code: staffCode, role_code: roleCode, package_code: packageAssignment.package_code, team_size: fullRun.summary.member_count },
      summary: `Business owner hired a new AWIA virtual staff member (${roleCode}) into this firm's team.`
    });

    return { member: hiredMember, staff_code: staffCode, role_code: roleCode, team_size: fullRun.summary.member_count, evidence_pack: evidencePack };
  });
}

export async function provisionAwiaVirtualStaffFromTemplateRecord(body, actor) {
  return withStore((store) => {
    const firm = store.firms.find((record) => record.id === body.firm_id && record.tenant_id === body.tenant_id);
    if (!firm) throwNotFound("firms", body.firm_id);
    const existingRun = (store.awia_virtual_staff_provisioning_runs ?? []).find((record) => record.tenant_id === body.tenant_id && record.firm_id === body.firm_id);
    if (existingRun) invalidState(`AWIA virtual staff roster already provisioned for firm ${body.firm_id}; use lifecycle commands to manage existing staff.`);
    const resolved = resolveAwiaStaffTemplate(body.template_id);
    if (!resolved.found) invalidState(`AWIA staff template rejected: ${resolved.findings.join(", ")}`);
    const packageAssignment = (store.awia_firm_package_assignments ?? []).find((record) => record.tenant_id === body.tenant_id && record.firm_id === body.firm_id);
    if (!packageAssignment) invalidState("AWIA_STAFF_HIRE_REQUIRES_PACKAGE_ASSIGNMENT: assign a subscription package to this firm before hiring AWIA virtual staff.");
    const packageResolved = resolveAwiaFirmPackage(packageAssignment.package_code);
    if (!packageResolved.found) invalidState(`AWIA firm package on record is no longer recognized: ${packageResolved.findings.join(", ")}`);
    const seatGate = evaluateAwiaFirmPackageSeatGate({ package: packageResolved.package, staffSet: resolved.template.staff_set });
    if (seatGate.decision !== "ALLOW") invalidState(`AWIA staff hire denied by package gate: ${seatGate.findings.join(", ")}`);
    // HM-S3 item 7: generate staff codes for this roster the same way single
    // hiring does, instead of using the template's hardcoded staff_code
    // literals -- see generateAwiaStaffCodesForRoster for why.
    const pilotStaff = generateAwiaStaffCodesForRoster(store, body.tenant_id, body.firm_id, resolved.template.staff_set);
    const run = provisionPilotVirtualStaff({
      tenant_id: body.tenant_id,
      firm_id: body.firm_id,
      created_by_actor_id: actor.actor_id,
      salary_plan_id: body.salary_plan_id ?? "virtual-staff-controlled-pilot-plan",
      registry: awiaVirtualStaffPackageRegistry,
      pilotStaff
    });
    upsertScopedById(store.awia_virtual_staff_provisioning_runs, { ...awiaProvisioningSnapshot(run), template_id: resolved.template.template_id, template_name: resolved.template.name, template_version: resolved.template.version, package_code: packageAssignment.package_code });
    for (const seat of run.seats) upsertScopedById(store.awia_virtual_staff_seats, { ...awiaRecord(seat, "staff_seat_id"), template_id: resolved.template.template_id });
    for (const member of run.members) upsertScopedById(store.awia_virtual_staff_members, awiaRecord(member, "agent_id"));
    for (const assignment of run.role_assignments) upsertScopedById(store.awia_staff_role_assignments, awiaRecord(assignment, "role_assignment_id"));
    for (const binding of run.package_bindings) upsertScopedById(store.awia_staff_package_bindings, awiaRecord(binding, "package_binding_id"));
    for (const event of run.lifecycle_events) upsertScopedById(store.awia_staff_lifecycle_events, awiaRecord(event, "lifecycle_event_id"));
    const evidencePack = buildAwiaVirtualStaffEvidencePack({ registry: awiaVirtualStaffPackageRegistry, provisioningRun: run });
    upsertScopedById(store.awia_staff_evidence_packs, { id: evidencePack.evidence_pack_id, ...evidencePack, tenant_id: body.tenant_id, firm_id: body.firm_id, template_id: resolved.template.template_id, created_at: now() });
    appendEventAndAudit(store, { event_type: "awia.virtual_staff.provisioned_from_template", actor, tenant_id: body.tenant_id, firm_id: body.firm_id, aggregate_type: "AwiaVirtualStaffProvisioningRun", aggregate_id: storeBackend === "postgres" ? deterministicUuid(run.provisioning_run_id) : run.provisioning_run_id, payload: { staff_count: run.members.length, template_id: resolved.template.template_id, boundary: run.boundary, runtime_execution_enabled: run.runtime_execution_enabled }, summary: "AWIA virtual staff roster provisioned for this firm from a named reusable template." });
    return { provisioning_run: { ...run, template_id: resolved.template.template_id, template_name: resolved.template.name }, evidence_pack: evidencePack };
  });
}

export async function readAwiaStaffTemplateCatalogueRecord() {
  return { boundary: "named_roster_templates_only_no_cross_firm_data_sharing_no_autonomous_authority", templates: listAwiaStaffTemplates() };
}

// HM-S7 Phase 4f, slice 1 (2026-09-29): persistLedgerFromStore() used to re-upsert every
// policy_decisions/audit_events/event_log row ever created, on every single withStore()/
// withAppState() call, because it looped over the FULL array loadPostgresStore() had just
// read back from the database (all tenants, all history) with no way to tell old rows from
// new ones. Since these 3 tables are strictly append-only in the postgres path (confirmed by
// reading every call site: the only place they're ever pushed to is appendEventAndAudit()'s
// two push()es and the JSON-backend-only branch of createPolicyDecisionRecord() -- nothing
// mutates or reorders an existing entry), capturing each array's length right after load and
// only persisting the slice added after that point is exactly equivalent to before (every
// row still gets upserted exactly once, in the same order) but turns an O(total historical
// ledger size) cost on every request into O(rows actually added this request) -- the ledger
// only ever grows, so this was the single biggest, worst-compounding instance of the "load
// everything, resync everything" pattern flagged for Phase 4f.
function captureLedgerBaseline(store) {
  return {
    policy_decisions: (store.policy_decisions ?? []).length,
    audit_events: (store.audit_events ?? []).length,
    event_log: (store.event_log ?? []).length
  };
}

// HM-S7 Phase 4f, slice 3 (2026-09-29): the ledger's baseline-array-length trick (above) only
// works because those 3 arrays are strictly append-only. Most of the other 7 persist*FromStore
// domains are NOT append-only -- e.g. front_desk_enquiries records get mutated in place
// (handOffQualifiedEnquiry's Object.assign(current, {status: "HANDED_OFF", ...})) rather than
// re-pushed, so a naive "only persist rows added after this array's starting length" check would
// silently stop persisting that status change forever (the array's length doesn't grow when an
// existing row is edited). This is exactly the risk the architecture review flagged before any of
// these 7 domains could be touched.
//
// Content-diff dirty-checking is the safe, generic alternative that works for both create-only
// and mutate-in-place domains without needing to find and instrument every call site that
// creates or edits a record: snapshot each opted-in collection's rows by id -> JSON string right
// after load, then at save time only upsert rows whose current JSON differs from that snapshot
// (new rows, whose id has no snapshot entry, always count as changed). A row that's genuinely
// unchanged since load always serializes identically, so this can only ever skip a row that
// truly has nothing new to persist -- it cannot silently miss a real change, because a real
// content change necessarily produces a different JSON string. Worst case on any edge (e.g. two
// different mutations that happen to produce byte-identical JSON, which isn't possible for
// different field values) is an unnecessary upsert -- the same behavior as today, never data
// loss. Domains are opted in one at a time, per slice, after confirming (as above) how their
// records get created/mutated -- not applied blanket across all persist*FromStore functions at
// once.
const RECORD_DEDUP_COLLECTIONS = [
  "file_objects", // ADR-089 W1: created via registerFileObjectRecord only; download audit never mutates the row
  "work_requests", // ADR-090 W2: created via createWorkRequestRecord, mutated in place on assign/cancel/add-files
  "front_desk_enquiries", // slice 3: created via createFrontDeskEnquiryRecord, mutated in place
  "client_communication_drafts", // slice 3: created via draftClientCommunicationRecord only, never mutated in place
  // slice 4 (2026-09-29): all 17 AWIA virtual staff collections, audited call-by-call --
  // created via upsertById() (matches by id, merges or pushes), plain .push(), or mutated in
  // place via direct field assignment after a .find() (e.g. updateAwiaVirtualStaffLifecycleRecord's
  // `member.lifecycle_status = body.to_state`, updateAwiaStaffSeatBillingStatusRecord's
  // `seat.billing_status = ...`, produceAwiaStaffOutputDraftRecord's
  // `item.workdesk_status = "OUTPUT_DRAFTED"`, reviewAwiaStaffOutputDraftRecord's
  // `output.status = body.review_decision`, markAwiaClientDeliveryDraftSentRecord's
  // `draft.status = "OWNER_MARKED_SENT"`, archiveAwiaStaffWorkdeskItemRecord's
  // `item.workdesk_status = "ARCHIVED_DISMISSED"`). All three patterns are handled correctly by
  // changedRecords()'s content-diff, which doesn't care how a record changed, only whether its
  // current JSON differs from its baseline JSON. Confirmed no collection is ever removed from
  // (only .filter()'d into a separate derived array for reads, never reassigned) -- the test-firm
  // purge utility deletes these tables with direct SQL (`delete from awia_virtual_staff_seats
  // where firm_id = $1`, etc.), never touching these in-memory arrays.
  "awia_virtual_staff_provisioning_runs",
  "awia_virtual_staff_seats",
  "awia_virtual_staff_members",
  "awia_staff_role_assignments",
  "awia_staff_package_bindings",
  "awia_staff_lifecycle_events",
  "awia_staff_authority_decisions",
  "awia_staff_evidence_packs",
  "awia_staff_task_readiness_records",
  "awia_staff_workdesk_items",
  "awia_staff_output_drafts",
  "awia_staff_output_reviews",
  "awia_client_delivery_drafts",
  "awia_staff_memory_entries",
  "awia_staff_conversation_threads",
  "awia_staff_conversation_messages",
  "awia_staff_seat_billing_events",
  // slice 5 (2026-09-29): all 7 Firm Factory / Provisioning collections, audited call-by-call --
  // factory_firm_blueprints, factory_provisioning_runs and provisioned_firm_instances are mutated
  // in place after a .find() (e.g. validateFactoryFirmBlueprintRecord's
  // `blueprint.validation_status = ...`, createFactoryProvisioningRunRecord's
  // `current.blueprint_state = "PROVISIONED"`, certifyFactoryPackBindingRecord's
  // `run.pack_certification_state = ...` / `instance.pack_certification_state = ...`,
  // runFactoryReadinessTestRecord's `run.provisioning_state = ...` / `instance.instance_status = ...`,
  // acceptFactoryHandoffRecord's `run.provisioning_state = "ACCEPTED_FOR_LOCAL_PILOT"` /
  // `instance.instance_status = ...`); factory_worker_bindings, pack_compatibility_checks,
  // pack_binding_certifications and service_activation_records are only ever .push()'d, never
  // mutated afterward (confirmed via grep across the whole file). changedRecords()'s content-diff
  // handles both patterns correctly, same as slice 4.
  "factory_firm_blueprints",
  "factory_provisioning_runs",
  "provisioned_firm_instances",
  "factory_worker_bindings",
  "pack_compatibility_checks",
  "pack_binding_certifications",
  "service_activation_records",
  // slice 6 (2026-09-29): all 6 Quotation/AWIA-package collections, audited call-by-call --
  // quotation_cases, boq_extraction_aids and quotation_draft_packs are mutated in place after a
  // .find() (e.g. approveQuotationCaseRecord's `item.status = "APPROVAL_RECORDED"`,
  // reviewBoqExtractionAidRecord's `item.extraction_status = ...`,
  // reviewQuotationDraftPackRecord's `item.draft_status = ...`; issueQuotationDraftPackRecord
  // additionally cross-mutates a quotation_draft_packs row and a quotation_cases row together
  // in one call, which changedRecords() handles fine since each collection is diffed
  // independently); quotation_issue_records and quotation_receivable_preparations are only ever
  // .push()'d, never mutated afterward; awia_firm_package_assignments goes through upsertById()
  // (matches by id, merges or pushes), the same pattern already proven safe in slice 4.
  "quotation_cases",
  "boq_extraction_aids",
  "quotation_draft_packs",
  "quotation_issue_records",
  "quotation_receivable_preparations",
  "awia_firm_package_assignments",
  // slice 7 (2026-09-29): all 6 Administration collections, audited call-by-call --
  // administration_skill_bindings, administrative_deadlines and transmittal_drafts are
  // create-only (.push(), never mutated afterward); correspondence_records is mutated in place
  // elsewhere (issueQuotationDraftPackRecord's `correspondence.status = "ISSUED_BY_HUMAN"`);
  // document_register_entries and document_revision_records are both mutated in place by
  // addDocumentRevisionRecord (`entry.current_revision_id = revision.id`,
  // `previous.status = "SUPERSEDED"`). persistAdministrationFromStore's hand-rolled per-column
  // insert loops (not a generic record-jsonb array like the domains above) are updated to filter
  // through changedRecords() the same way.
  "administration_skill_bindings",
  "correspondence_records",
  "document_register_entries",
  "document_revision_records",
  "administrative_deadlines",
  "transmittal_drafts",
  // slice 8 (2026-09-29): all 5 Commercial Operations collections, audited call-by-call --
  // commercial_skill_bindings, proposal_dispatch_records (create-only by construction, its
  // insert is "on conflict do nothing") and receivable_follow_ups are create-only; sales_pipeline_records
  // and expense_records are mutated in place elsewhere (dispatchProposalRecord's
  // `opportunity.stage = "PROPOSAL_SENT"`, approveExpenseRecord's `item.status = "APPROVED"`).
  "commercial_skill_bindings",
  "sales_pipeline_records",
  "proposal_dispatch_records",
  "expense_records",
  "receivable_follow_ups",
  // slice 9 (2026-09-29): all 5 Technical Delivery collections, audited call-by-call --
  // technical_skill_bindings, drawing_review_records, calculation_input_sets and
  // delivery_package_records are create-only; technical_qa_findings is mutated in place by
  // resolveTechnicalQaFindingRecord's `item.status = "RESOLVED"`.
  "technical_skill_bindings",
  "drawing_review_records",
  "calculation_input_sets",
  "technical_qa_findings",
  "delivery_package_records"
];

function captureRecordBaseline(store) {
  const baseline = {};
  for (const name of RECORD_DEDUP_COLLECTIONS) {
    const map = new Map();
    for (const record of store[name] ?? []) {
      if (record?.id) map.set(record.id, JSON.stringify(record));
    }
    baseline[name] = map;
  }
  return baseline;
}

// Used inside a persist*FromStore function to get only the rows worth upserting this request. A
// record with no `id`, or a collection not opted into RECORD_DEDUP_COLLECTIONS (baseline is
// undefined for it), is returned unfiltered -- same as today's always-upsert-everything behavior.
function changedRecords(store, name, recordBaseline) {
  const map = recordBaseline?.[name];
  const records = store[name] ?? [];
  if (!map) return records;
  return records.filter((record) => {
    if (!record?.id) return true;
    const prior = map.get(record.id);
    return prior === undefined || prior !== JSON.stringify(record);
  });
}

export async function withStore(mutator) {
  const store = await loadStore();
  const ledgerBaseline = captureLedgerBaseline(store);
  const recordBaseline = captureRecordBaseline(store);
  const result = await mutator(store);
  await saveStore(store, ledgerBaseline, recordBaseline);
  return result;
}

async function withAppState(mutator) {
  const store = await loadStore();
  const ledgerBaseline = captureLedgerBaseline(store);
  const recordBaseline = captureRecordBaseline(store);
  const result = await mutator(store);
  await savePostgresStore(store, ledgerBaseline, recordBaseline);
  return result;
}

// Read-side tenant scoping, first usable entry point (2026-09-30): pass tenantId when a caller
// genuinely only needs one tenant's data and isn't also about to mutate/save the store in the same
// call (that's withStore/withAppState, deliberately left unscoped for now -- see loadPostgresStore's
// comment). Every existing call site (readStore() with no argument) is completely unaffected.
export async function readStore(tenantId = null) {
  return loadStore(tenantId);
}

export function requireFields(body, fields) {
  const missing = fields.filter((field) => body[field] === undefined || body[field] === null || body[field] === "");
  if (missing.length > 0) {
    const error = new Error(`Missing required fields: ${missing.join(", ")}`);
    error.code = "VALIDATION_ERROR";
    error.status = 400;
    throw error;
  }
}

export function appendEventAndAudit(store, { event_type, actor, tenant_id, firm_id = null, aggregate_type, aggregate_id, payload, summary, policy_decision_id = null }) {
  const timestamp = now();
  const correlation_id = newUuid();
  const audit = {
    id: storeBackend === "postgres" ? newUuid() : newId("audit"),
    tenant_id,
    firm_id,
    actor_id: actor.actor_id,
    action: event_type,
    resource_type: aggregate_type,
    resource_id: aggregate_id,
    resource_version: 1,
    policy_decision_id,
    correlation_id,
    causation_id: null,
    occurred_at: timestamp,
    summary,
    evidence_ref: null
  };
  const event = {
    id: storeBackend === "postgres" ? newUuid() : newId("event"),
    event_type,
    event_version: "1.0",
    occurred_at: timestamp,
    recorded_at: timestamp,
    actor_id: actor.actor_id,
    actor_type: actor.actor_type,
    tenant_id,
    firm_id,
    aggregate_type,
    aggregate_id,
    aggregate_version: 1,
    correlation_id,
    causation_id: null,
    idempotency_key: null,
    payload,
    payload_ref: null,
    payload_summary: summary,
    policy_decision_id,
    audit_event_id: audit.id,
    provenance: { adapter: storeBackend }
  };
  store.audit_events.push(audit);
  store.event_log.push(event);
  return { event, audit };
}

export function systemActor(tenant_id = null, firm_id = null) {
  return {
    actor_id: storeBackend === "postgres" ? "00000000-0000-0000-0000-000000000000" : "system",
    actor_type: "SYSTEM",
    tenant_id,
    firm_id,
    display_name: "vFirm System"
  };
}

export async function resetStore() {
  const store = initialStore();
  if (storeBackend === "postgres") {
    const client = await getPool().connect();
    try {
      await client.query("begin");
      await ensureAppStateTable(client);
      await client.query("delete from app_state where id = $1", ["mvp-store"]);
      await client.query("do $$ begin if to_regclass('public.factory_worker_bindings') is not null then delete from factory_worker_bindings; end if; end $$;");
      await client.query("do $$ begin if to_regclass('public.provisioned_firm_instances') is not null then delete from provisioned_firm_instances; end if; end $$;");
      await client.query("do $$ begin if to_regclass('public.factory_provisioning_runs') is not null then delete from factory_provisioning_runs; end if; end $$;");
      await client.query("do $$ begin if to_regclass('public.factory_firm_blueprints') is not null then delete from factory_firm_blueprints; end if; end $$;");
      await client.query("do $$ begin if to_regclass('public.service_activation_records') is not null then delete from service_activation_records; end if; end $$;");
      await client.query("do $$ begin if to_regclass('public.pack_binding_certifications') is not null then delete from pack_binding_certifications; end if; end $$;");
      await client.query("do $$ begin if to_regclass('public.pack_compatibility_checks') is not null then delete from pack_compatibility_checks; end if; end $$;");
      await client.query("delete from event_log");
      await client.query("delete from audit_events");
      await client.query("delete from policy_decisions");
      await client.query("delete from pilot_handoff_records");
      await client.query("delete from commercial_launch_controls");
      await client.query("delete from subscription_packages");
      await client.query("delete from payment_provider_configs");
      await client.query("delete from billing_readiness_reviews");
      await client.query("delete from tenant_usage_events");
      await client.query("delete from tenant_pilot_controls");
      await client.query("delete from release_candidate_gates");
      await client.query("delete from tenant_onboarding_plans");
      await client.query("delete from pilot_expansion_cohorts");
      await client.query("delete from stakeholder_review_decisions");
      await client.query("delete from stakeholder_review_boards");
      await client.query("delete from pilot_report_packs");
      await client.query("delete from pilot_improvement_items");
      await client.query("delete from pilot_acceptance_reviews");
      await client.query("delete from pilot_feedback");
      await client.query("delete from pilot_incidents");
      await client.query("delete from support_cases");
      await client.query("delete from pilot_users");
      await client.query("delete from observatory_snapshots");
      await client.query("do $$ begin if to_regclass('public.specialist_assignments') is not null then delete from specialist_assignments; end if; end $$;");
      await client.query("do $$ begin if to_regclass('public.responsibility_matrices') is not null then delete from responsibility_matrices; end if; end $$;");
      await client.query("do $$ begin if to_regclass('public.collaboration_workspace_evidence') is not null then delete from collaboration_workspace_evidence; end if; end $$;");
      await client.query("do $$ begin if to_regclass('public.collaboration_workspace_participants') is not null then delete from collaboration_workspace_participants; end if; end $$;");
      await client.query("do $$ begin if to_regclass('public.collaboration_workspaces') is not null then delete from collaboration_workspaces; end if; end $$;");
      await client.query("do $$ begin if to_regclass('public.specialist_invitations') is not null then delete from specialist_invitations; end if; end $$;");
      await client.query("do $$ begin if to_regclass('public.qualification_renewal_reviews') is not null then delete from qualification_renewal_reviews; end if; end $$;");
      await client.query("do $$ begin if to_regclass('public.directory_private_enquiries') is not null then delete from directory_private_enquiries; end if; end $$;");
      await client.query("do $$ begin if to_regclass('public.directory_review_board_decisions') is not null then delete from directory_review_board_decisions; end if; end $$;");
      await client.query("do $$ begin if to_regclass('public.network_qualification_gates') is not null then delete from network_qualification_gates; end if; end $$;");
      await client.query("do $$ begin if to_regclass('public.network_conflict_checks') is not null then delete from network_conflict_checks; end if; end $$;");
      await client.query("do $$ begin if to_regclass('public.network_trust_signals') is not null then delete from network_trust_signals; end if; end $$;");
      await client.query("do $$ begin if to_regclass('public.network_credentials') is not null then delete from network_credentials; end if; end $$;");
      await client.query("do $$ begin if to_regclass('public.network_capabilities') is not null then delete from network_capabilities; end if; end $$;");
      await client.query("do $$ begin if to_regclass('public.network_professional_profiles') is not null then delete from network_professional_profiles; end if; end $$;");
      await client.query("do $$ begin if to_regclass('public.network_firm_profiles') is not null then delete from network_firm_profiles; end if; end $$;");
      await client.query("delete from collaboration_requests");
      await client.query("delete from capacity_offers");
      await client.query("delete from marketplace_listings");
      await client.query("delete from tool_invocations");
      await client.query("delete from task_outputs");
      await client.query("delete from receivable_follow_ups");
      await client.query("delete from expense_records");
      await client.query("delete from proposal_dispatch_records");
      await client.query("delete from sales_pipeline_records");
      await client.query("delete from commercial_skill_bindings");
      await client.query("delete from worker_instances");
      await client.query("delete from payment_statuses");
      await client.query("delete from invoices");
      await client.query("delete from approvals");
      await client.query("delete from transmittal_drafts");
      await client.query("delete from administrative_deadlines");
      await client.query("update document_register_entries set current_revision_id=null");
      await client.query("delete from delivery_package_records");
      await client.query("delete from technical_qa_findings");
      await client.query("delete from calculation_input_sets");
      await client.query("delete from drawing_review_records");
      await client.query("delete from technical_skill_bindings");
      await client.query("delete from document_revision_records");
      await client.query("delete from document_register_entries");
      await client.query("delete from correspondence_records");
      await client.query("delete from administration_skill_bindings");
      await client.query("delete from client_communication_drafts");
      await client.query("delete from front_desk_enquiries");
      await client.query("delete from evidence_bundles");
      await client.query("delete from document_versions");
      await client.query("delete from documents");
      await client.query("delete from tasks");
      await client.query("delete from work_packages");
      await client.query("delete from projects");
      await client.query("delete from engagements");
      await client.query("delete from proposals");
      await client.query("delete from price_build_ups");
      await client.query("delete from intake_sessions");
      await client.query("delete from leads");
      await client.query("delete from firm_client_relationships");
      await client.query("delete from clients");
      await client.query("delete from firm_memberships");
      await client.query("delete from professional_authorities");
      await client.query("delete from professional_profiles");
      await client.query("delete from firms");
      await client.query("delete from actors");
      await client.query("delete from persons");
      await client.query("delete from tenants");
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
    return store;
  }
  await saveJsonStore(store);
  return store;
}

function getPool() {
  if (!pool) {
    // HM-S7 Phase 4f, slice 2 (2026-09-29): loadPostgresStore() now fires its ~120 read queries
    // concurrently instead of one at a time (see its comment), so this pool needs enough
    // connections for that fan-out to actually run in parallel rather than queueing behind the
    // previous default of 10. DATABASE_POOL_MAX lets this be tuned per-environment.
    //
    // HM-S7 Phase 4f, hotfix (2026-09-29): the default here was 20, which broke login in
    // production with "(EMAXCONNSESSION) max clients reached in session mode - max clients are
    // limited to pool_size: 15" -- Supabase's Session Mode connection pooler (typically the
    // port-5432 connection string) caps how many real Postgres connections it will hand out at
    // once, and this app's own pool was asking for more of them than that cap allows, on top of
    // whatever other connections share that same pooler. Lowered the default to 10 (below the
    // reported cap of 15) so this doesn't reproduce out of the box. If DATABASE_POOL_MAX is set
    // in the environment, that value still wins -- it must stay below your Supabase project's
    // pooler pool_size (Project Settings -> Database -> Connection pooling), with headroom for
    // any other services sharing that same pooler. For real throughput at this fan-out size, the
    // more correct fix is switching DATABASE_URL to Supabase's Transaction Mode pooler
    // (typically port 6543 instead of 5432) -- it's built for many short-lived concurrent
    // connections like this read fan-out, unlike Session Mode.
    pool = new Pool({
      connectionString: databaseUrl,
      max: Number(process.env.DATABASE_POOL_MAX) || 10
    });
  }
  return pool;
}

function buildTenant(body, overrides = {}) {
  return {
    id: overrides.id ?? newId("tenant"),
    name: body.name,
    status: body.status ?? "ACTIVE",
    isolation_policy_id: overrides.isolation_policy_id ?? body.isolation_policy_id ?? newId("policy"),
    default_region: body.default_region ?? "MY",
    data_residency_policy: body.data_residency_policy ?? "MVP_DEFAULT",
    billing_account_ref: body.billing_account_ref ?? null,
    created_at: overrides.created_at ?? now(),
    metadata: body.metadata ?? {}
  };
}

function buildFirmFoundation(body, options = {}) {
  const timestamp = now();
  const relational = options.ids === "uuid";
  const person = {
    id: relational ? newUuid() : newId("person"),
    tenant_id: body.tenant_id,
    identity_provider_subject: body.identity_provider_subject ?? null,
    legal_name: body.principal_name,
    preferred_name: body.principal_name,
    contact_refs: body.contact_refs ?? [],
    status: "ACTIVE",
    created_at: timestamp,
    updated_at: timestamp,
    metadata: {}
  };
  const actor = {
    id: relational ? newUuid() : newId("actor"),
    actor_id: null,
    actor_type: "HUMAN",
    person_id: person.id,
    worker_instance_id: null,
    system_id: null,
    external_service_id: null,
    tenant_id: body.tenant_id,
    firm_id: null,
    display_name: body.principal_name,
    status: "ACTIVE",
    created_at: timestamp,
    metadata: {}
  };
  actor.actor_id = actor.id;
  const firm = {
    id: relational ? newUuid() : newId("firm"),
    tenant_id: body.tenant_id,
    name: body.name,
    brand_id: null,
    business_entity_id: null,
    primary_principal_assignment_id: null,
    lifecycle_state: body.lifecycle_state ?? "ACTIVE",
    lifecycle_state_reason: body.lifecycle_state_reason ?? "MVP command",
    active_practices: body.active_practices ?? ["temporary_works_formwork"],
    configuration_version: 1,
    status: "ACTIVE",
    version: 1,
    created_at: timestamp,
    created_by_actor_id: actor.id,
    updated_at: timestamp,
    updated_by_actor_id: actor.id,
    data_classification: "INTERNAL",
    provenance: {},
    metadata: body.metadata ?? {}
  };
  actor.firm_id = firm.id;
  return { person, actor, firm };
}




function buildDeliveryPackage(body, actor, engagement, requiredEvidence = [], options = {}) {
  const timestamp = now();
  const relational = options.ids === "uuid";
  const project = {
    id: relational ? newUuid() : newId("project"),
    tenant_id: body.tenant_id,
    firm_id: body.firm_id,
    relationship_id: engagement.relationship_id,
    engagement_id: engagement.id,
    service_id: relational ? (uuidOrNull(body.service_id) ?? uuidOrNull(body.proposal?.service_id) ?? newUuid()) : body.proposal?.service_id,
    project_name: body.project_name,
    project_state: "OPEN",
    risk_class: body.risk_class ?? "CONTROLLED",
    responsible_professional_id: uuidOrNull(body.responsible_professional_id),
    created_at: timestamp,
    updated_at: timestamp
  };
  const workPackage = {
    id: relational ? newUuid() : newId("wp"),
    tenant_id: body.tenant_id,
    firm_id: body.firm_id,
    project_id: project.id,
    service_step: body.service_step ?? "formwork_intake_and_preliminary_package",
    assigned_worker_instance_id: uuidOrNull(body.assigned_worker_instance_id),
    assigned_human_actor_id: relational ? uuidOrNull(actor.actor_id) : actor.actor_id,
    state: "CREATED",
    required_evidence: requiredEvidence,
    approval_requirement_id: uuidOrNull(body.approval_requirement_id),
    created_at: timestamp,
    updated_at: timestamp
  };
  const task = {
    id: relational ? newUuid() : newId("task"),
    tenant_id: body.tenant_id,
    firm_id: body.firm_id,
    project_id: project.id,
    work_package_id: workPackage.id,
    task_type: body.task_type ?? "formwork_intake_summary",
    input_ref: body.input_ref ?? null,
    output_ref: null,
    assigned_actor_or_worker_ref: relational ? uuidOrNull(actor.actor_id) : actor.actor_id,
    state: "CREATED",
    risk_class: project.risk_class,
    due_at: body.due_at ?? null,
    created_at: timestamp,
    updated_at: timestamp
  };
  return { project, workPackage, task };
}

function buildEvidenceBundle(body, options = {}) {
  const relational = options.ids === "uuid";
  return {
    id: relational ? newUuid() : newId("evidence"),
    tenant_id: body.tenant_id,
    firm_id: body.firm_id,
    project_id: body.project_id,
    subject_type: body.subject_type,
    subject_id: body.subject_id,
    source_document_refs: body.source_document_refs ?? [],
    input_refs: body.input_refs ?? [],
    calculation_refs: body.calculation_refs ?? [],
    qa_check_refs: body.qa_check_refs ?? [],
    policy_check_refs: body.policy_check_refs ?? [],
    review_notes_ref: body.review_notes_ref ?? null,
    final_output_ref: body.final_output_ref ?? null,
    bundle_hash: relational ? newUuid() : newId("hash"),
    status: "READY_FOR_REVIEW",
    created_at: now()
  };
}

function buildInvoice(body, sequence = 1, options = {}) {
  const relational = options.ids === "uuid";
  const timestamp = now();
  return {
    id: relational ? newUuid() : newId("invoice"),
    tenant_id: body.tenant_id,
    firm_id: body.firm_id,
    relationship_id: body.relationship_id,
    engagement_id: relational ? uuidOrNull(body.engagement_id) : (body.engagement_id ?? null),
    project_id: relational ? uuidOrNull(body.project_id) : (body.project_id ?? null),
    invoice_number: body.invoice_number ?? `MVP-${sequence}`,
    currency: body.currency ?? "MYR",
    line_items: body.line_items ?? [],
    tax_summary: body.tax_summary ?? {},
    status: body.status ?? "DRAFT",
    due_at: body.due_at ?? new Date(Date.now() + 30 * 86400000).toISOString(),
    created_at: timestamp,
    updated_at: timestamp
  };
}
function buildCommercialProposal(body, options = {}) {
  const timestamp = now();
  const relational = options.ids === "uuid";
  const price = {
    id: relational ? newUuid() : newId("price"),
    tenant_id: body.tenant_id,
    firm_id: body.firm_id,
    service_sku_id: body.service_sku_id ?? "formwork_preliminary_wall_slab",
    scope_inputs: body.scope_inputs ?? {},
    human_effort_estimate: body.human_effort_estimate ?? 0,
    ai_runtime_estimate: body.ai_runtime_estimate ?? 0,
    specialist_cost_estimate: body.specialist_cost_estimate ?? 0,
    tool_cost_estimate: body.tool_cost_estimate ?? 0,
    risk_contingency: body.risk_contingency ?? 0,
    platform_fee: body.platform_fee ?? 0,
    margin_target: body.margin_target ?? 0,
    final_price: body.final_price ?? 2500,
    approval_required: body.approval_required ?? true,
    created_at: timestamp
  };
  const proposal = {
    id: relational ? newUuid() : newId("proposal"),
    tenant_id: body.tenant_id,
    firm_id: body.firm_id,
    relationship_id: body.relationship_id,
    service_id: relational ? (uuidOrNull(body.service_id) ?? newUuid()) : (body.service_id ?? null),
    scope_summary: body.scope_summary,
    price_build_up_id: price.id,
    commercial_approval_id: null,
    proposal_status: price.approval_required ? "APPROVAL_REQUIRED" : "APPROVED",
    valid_until: body.valid_until ?? new Date(Date.now() + 14 * 86400000).toISOString(),
    issued_document_ref: body.issued_document_ref ?? null,
    version: 1,
    created_at: timestamp,
    updated_at: timestamp
  };
  return { price, proposal };
}

function buildApproval(body, actor, proposal, options = {}) {
  const timestamp = now();
  const relational = options.ids === "uuid";
  return {
    id: relational ? newUuid() : newId("approval"),
    tenant_id: body.tenant_id,
    firm_id: body.firm_id,
    subject_type: options.subject_type ?? "Proposal",
    subject_id: proposal.id,
    subject_version_or_hash: String(proposal.version),
    requested_by_actor_id: relational ? uuidOrNull(actor.actor_id) : actor.actor_id,
    approver_actor_id: relational ? uuidOrNull(actor.actor_id) : actor.actor_id,
    approver_professional_id: relational ? uuidOrNull(body.approver_professional_id) : (body.approver_professional_id ?? null),
    authority_id: relational ? uuidOrNull(body.authority_id) : (body.authority_id ?? null),
    decision: "APPROVED",
    conditions: body.conditions ?? [],
    evidence_bundle_id: uuidOrNull(body.evidence_bundle_id),
    authentication_strength: body.authentication_strength ?? "MVP",
    decided_at: timestamp,
    audit_event_id: uuidOrNull(body.audit_event_id),
    created_at: timestamp
  };
}

function buildEngagement(body, proposal, options = {}) {
  const timestamp = now();
  const relational = options.ids === "uuid";
  const engagement = {
    id: relational ? newUuid() : newId("engagement"),
    tenant_id: body.tenant_id,
    firm_id: body.firm_id,
    relationship_id: proposal.relationship_id,
    proposal_id: proposal.id,
    contract_ref: body.contract_ref ?? null,
    scope_ref: body.scope_ref ?? null,
    commercial_terms_ref: body.commercial_terms_ref ?? null,
    acceptance_criteria_ref: body.acceptance_criteria_ref ?? null,
    status: "ACTIVE",
    created_at: timestamp,
    updated_at: timestamp
  };
  return { engagement };
}

function invalidState(message) {
  const error = new Error(message);
  error.status = 409;
  error.code = "INVALID_STATE";
  throw error;
}
function buildClientFrontdoor(body, actor, options = {}) {
  const timestamp = now();
  const relational = options.ids === "uuid";
  const client = {
    id: relational ? newUuid() : newId("client"),
    tenant_id: body.tenant_id,
    firm_id: body.firm_id,
    client_type: body.client_type ?? "ORGANIZATION",
    name: body.name,
    primary_contact_id: uuidOrNull(body.primary_contact_id),
    confidentiality_class: body.confidentiality_class ?? "CLIENT_CONFIDENTIAL",
    status: "ACTIVE",
    version: 1,
    created_at: timestamp,
    updated_at: timestamp,
    metadata: body.metadata ?? {}
  };
  const relationship = {
    id: relational ? newUuid() : newId("rel"),
    tenant_id: body.tenant_id,
    firm_id: body.firm_id,
    client_id: client.id,
    relationship_type: "CLIENT",
    status: "ACTIVE",
    origin: body.origin ?? "api",
    responsible_owner_actor_id: relational ? uuidOrNull(actor.actor_id) : actor.actor_id,
    contracting_business_entity_id: uuidOrNull(body.contracting_business_entity_id),
    consent_or_legal_basis_ref: body.consent_or_legal_basis_ref ?? null,
    conflict_check_ref: body.conflict_check_ref ?? null,
    created_at: timestamp,
    updated_at: timestamp
  };
  return { client, relationship };
}

function buildIntakeFrontdoor(body, actor, options = {}) {
  const timestamp = now();
  const relational = options.ids === "uuid";
  const lead = {
    id: relational ? newUuid() : newId("lead"),
    tenant_id: body.tenant_id,
    firm_id: body.firm_id,
    relationship_id: body.relationship_id,
    source_channel: body.source_channel ?? "api",
    requested_service_hint: body.requested_service_hint ?? body.service_hint ?? null,
    urgency: body.urgency ?? "STANDARD",
    qualification_status: "QUALIFIED",
    assigned_actor_id: relational ? uuidOrNull(actor.actor_id) : actor.actor_id,
    created_from_conversation_ref: body.created_from_conversation_ref ?? null,
    created_at: timestamp,
    metadata: body.lead_metadata ?? {}
  };
  const requiredInputs = body.required_inputs ?? [];
  const providedInputs = body.provided_inputs ?? {};
  const missing = requiredInputs.filter((field) => providedInputs[field] === undefined || providedInputs[field] === null || providedInputs[field] === "");
  const intake = {
    id: relational ? newUuid() : newId("intake"),
    tenant_id: body.tenant_id,
    firm_id: body.firm_id,
    lead_id: lead.id,
    service_id: body.service_id ?? null,
    required_inputs: requiredInputs,
    provided_inputs: providedInputs,
    missing_information_items: missing,
    intake_status: missing.length > 0 ? "NEEDS_INFORMATION" : "COMPLETE",
    created_at: timestamp,
    updated_at: timestamp
  };
  return { lead, intake, missing };
}

function buildPrincipalGovernance(body, person, actor, firm, options = {}) {
  const relational = options.ids === "uuid";
  const timestamp = now();
  const professionalProfile = {
    id: relational ? newUuid() : newId("professional_profile"),
    tenant_id: firm.tenant_id,
    person_id: person.id,
    disciplines: body.disciplines ?? ["temporary_works_engineering"],
    specializations: body.specializations ?? ["formwork_engineering"],
    jurisdictions: body.jurisdictions ?? ["MY"],
    credential_refs: body.credential_refs ?? ["DEV-PRINCIPAL-AUTHORITY"],
    professional_status: "ACTIVE",
    created_at: timestamp,
    updated_at: timestamp
  };
  const membership = {
    id: relational ? newUuid() : newId("firm_membership"),
    tenant_id: firm.tenant_id,
    firm_id: firm.id,
    actor_id: actor.id ?? actor.actor_id,
    person_id: person.id,
    role: body.principal_role ?? "PRINCIPAL",
    permissions: body.permissions ?? ["tenant.read", "firm.manage", "client.manage", "proposal.approve", "project.manage", "invoice.manage", "audit.read"],
    status: "ACTIVE",
    created_at: timestamp,
    updated_at: timestamp
  };
  const professionalAuthority = {
    id: relational ? newUuid() : newId("professional_authority"),
    tenant_id: firm.tenant_id,
    firm_id: firm.id,
    professional_id: professionalProfile.id,
    practice_id: body.practice_id ?? "11111111-1111-4111-8111-111111111111",
    service_scope: body.service_scope ?? ["VF-SP-001", "formwork_preliminary_wall_slab"],
    jurisdiction_id: body.jurisdiction_id ?? null,
    permitted_actions: body.permitted_actions ?? ["approval.grant", "proposal.approve", "deliverable.review"],
    risk_limits: body.risk_limits ?? [{ risk_class: "STANDARD", max_price: 50000, currency: "MYR" }],
    credential_refs: body.credential_refs ?? ["DEV-PRINCIPAL-AUTHORITY"],
    valid_from: timestamp,
    valid_to: body.authority_valid_to ?? null,
    status: "ACTIVE",
    policy_basis_ref: body.policy_basis_ref ?? "STAGE-4-DEV-AUTHORITY-SEED",
    created_at: timestamp,
    updated_at: timestamp
  };
  return { membership, professionalProfile, professionalAuthority };
}

export async function findValidProfessionalAuthority({ tenant_id, firm_id, actor_id, action = "approval.grant" }) {
  const store = await readStore();
  const membership = (store.firm_memberships ?? []).find((item) => item.tenant_id === tenant_id && item.firm_id === firm_id && item.actor_id === actor_id && item.status === "ACTIVE");
  const profile = membership ? (store.professional_profiles ?? []).find((item) => item.person_id === membership.person_id && item.professional_status === "ACTIVE") : null;
  const timestamp = Date.now();
  const authority = profile ? (store.professional_authorities ?? []).find((item) => item.tenant_id === tenant_id && item.firm_id === firm_id && item.professional_id === profile.id && item.status === "ACTIVE" && (item.permitted_actions ?? []).includes(action) && Date.parse(item.valid_from) <= timestamp && (!item.valid_to || Date.parse(item.valid_to) >= timestamp)) : null;
  return { membership: membership ?? null, professional_profile: profile ?? null, professional_authority: authority ?? null, valid: Boolean(authority) };
}
function uuidOrNull(value) {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) ? value : null;
}

function stripRelationalCollections(store) {
  return {
    ...store,
    tenants: [],
  // HM-S6 (2026-09-22): these 7 now have real Postgres relational tables (migration
  // 0025_firm_factory_persistence.sql, written and read via FIRM_FACTORY_RELATIONAL_TABLES /
  // persistFirmFactoryFromStore / readFirmFactoryRelational above), so they are stripped from the
  // JSONB app_state blob here exactly like the awia_* collections below -- keeping them in both
  // places would let the two copies drift.
  factory_firm_blueprints: [],
  factory_provisioning_runs: [],
  provisioned_firm_instances: [],
  factory_worker_bindings: [],
  pack_compatibility_checks: [],
  pack_binding_certifications: [],
  service_activation_records: [],
  // HM-S6 item 3 (2026-09-23): these 6 now have real Postgres relational tables (migration
  // 0027_quotation_and_awia_package_persistence.sql, written and read via
  // QUOTATION_AWIA_RELATIONAL_TABLES / persistQuotationAwiaFromStore / readQuotationAwiaRelational
  // above), so they are stripped from the JSONB app_state blob here exactly like Firm Factory above
  // -- keeping them in both places would let the two copies drift.
  quotation_cases: [],
  boq_extraction_aids: [],
  quotation_draft_packs: [],
  quotation_issue_records: [],
  quotation_receivable_preparations: [],
  awia_firm_package_assignments: [],
  // ADR-089 W1: file_objects has its own relational table (migration 0048), so it is stripped
  // from the app_state blob like every other relational collection.
  file_objects: [],
  work_requests: [],
  // CE-S1 (ADR-095): EDCS collections are never part of the app_state blob (migration 0050 tables).
  edcs_connections: [],
  edcs_transactions: [],
  edcs_transaction_revisions: [],
  edcs_sync_runs: [],
  edcs_sync_events: [],
  automation_rules: [],
  automation_rule_runs: [],
  service_packs: [],
  service_skus: [],
  worker_templates: [],
  worker_instances: [],
  // NOTE (Phase B, TD-009 -- closes the Phase A pilot-day workaround above): the awia_* collections
  // now have real Postgres relational tables (migration 0024_awia_virtual_staff_persistence.sql,
  // written and read via AWIA_RELATIONAL_TABLES / persistAwiaVirtualStaffFromStore /
  // readAwiaVirtualStaffRelational below), so they are stripped from the JSONB app_state blob here
  // exactly like every other relational collection -- keeping them in both places would let the two
  // copies drift.
  awia_virtual_staff_provisioning_runs: [],
  awia_virtual_staff_seats: [],
  awia_virtual_staff_members: [],
  awia_staff_role_assignments: [],
  awia_staff_package_bindings: [],
  awia_staff_lifecycle_events: [],
  awia_staff_authority_decisions: [],
  awia_staff_evidence_packs: [],
  awia_staff_task_readiness_records: [],
  awia_staff_workdesk_items: [],
  awia_staff_output_drafts: [],
  awia_staff_output_reviews: [],
  awia_client_delivery_drafts: [],
  awia_staff_memory_entries: [],
  awia_staff_conversation_threads: [],
  awia_staff_conversation_messages: [],
  awia_staff_seat_billing_events: [],
  task_outputs: [],
  tool_invocations: [],
  marketplace_listings: [],
  directory_review_board_decisions: [],
  directory_private_enquiries: [],
  qualification_renewal_reviews: [],
  capacity_offers: [],
  collaboration_requests: [],
  network_professional_profiles: [],
  network_firm_profiles: [],
  network_capabilities: [],
  network_credentials: [],
  network_trust_signals: [],
  network_conflict_checks: [],
  network_qualification_gates: [],
  specialist_invitations: [],
  collaboration_workspaces: [],
  collaboration_workspace_participants: [],
  collaboration_workspace_evidence: [],
  responsibility_matrices: [],
  specialist_assignments: [],
  observatory_snapshots: [],
  pilot_users: [],
  support_cases: [],
  pilot_incidents: [],
  pilot_feedback: [],
  pilot_acceptance_reviews: [],
  pilot_improvement_items: [],
  pilot_report_packs: [],
  stakeholder_review_boards: [],
  stakeholder_review_decisions: [],
  pilot_expansion_cohorts: [],
  tenant_onboarding_plans: [],
  release_candidate_gates: [],
  tenant_pilot_controls: [],
  tenant_usage_events: [],
  billing_readiness_reviews: [],
  payment_provider_configs: [],
  subscription_packages: [],
  commercial_launch_controls: [],
  firm_memberships: [],
  professional_profiles: [],
  professional_authorities: [],
  actors: [],
    persons: [],
    firms: [],
    clients: [],
    firm_client_relationships: [],
    leads: [],
    front_desk_enquiries: [],
    client_communication_drafts: [],
    intake_sessions: [],
    administration_skill_bindings: [],
    correspondence_records: [],
    document_register_entries: [],
    document_revision_records: [],
    administrative_deadlines: [],
    transmittal_drafts: [],
    price_build_ups: [],
    commercial_skill_bindings: [],
    sales_pipeline_records: [],
    proposal_dispatch_records: [],
    expense_records: [],
    receivable_follow_ups: [],
    proposals: [],
    approvals: [],
    engagements: [],
    projects: [],
    technical_skill_bindings: [],
    drawing_review_records: [],
    calculation_input_sets: [],
    technical_qa_findings: [],
    delivery_package_records: [],
    pilot_handoff_records: [],
    work_packages: [],
    tasks: [],
    evidence_bundles: [],
    invoices: [],
    policy_decisions: [],
    event_log: [],
    audit_events: []
  };
}

function normalizeStore(store) {
  const next = initialStore();
  for (const key of Object.keys(next)) {
    next[key] = Array.isArray(store?.[key]) ? store[key] : [];
  }
  for (const template of localWorkerTemplates()) {
    if (!next.worker_templates.some((record) => record.code === template.code)) next.worker_templates.push(template);
  }

  return next;
}

function mapDbDates(row) {
  const next = { ...row };
  for (const field of ["created_at", "updated_at"]) {
    if (next[field] instanceof Date) next[field] = next[field].toISOString();
  }
  return next;
}

function throwNotFound(collection, id) {
  const error = new Error(`${collection} record not found: ${id}`);
  error.code = "NOT_FOUND";
  error.status = 404;
  throw error;
}

function selectStoreBackend() {
  if (requestedBackend === "json" || process.env.VFIRM_STORE_PATH) return "json";
  if (requestedBackend === "postgres") {
    if (!databaseUrl) throw new Error("VFIRM_STORE_BACKEND=postgres requires DATABASE_URL.");
    return "postgres";
  }
  return databaseUrl ? "postgres" : "json";
}

async function loadLocalEnv(path) {
  try {
    const body = await readFile(path, "utf8");
    for (const line of body.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const index = trimmed.indexOf("=");
      if (index === -1) continue;
      const key = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim().replace(/^[`'"]|[`'"]$/g, "");
      if (key && !(key in process.env)) process.env[key] = value;
    }
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}
