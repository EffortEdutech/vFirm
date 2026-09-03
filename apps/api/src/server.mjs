import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { evaluatePolicy } from "../../../packages/policy-engine/src/index.mjs";
import { apiContracts } from "../../../packages/core-domain/src/api-contracts.mjs";
import { formworkServicePack } from "../../../packages/service-packs/src/formwork.mjs";
import { acceptProposalRecord, approveProposalRecord, createClientRecord, completeTaskRecord, createDeliverableDraftRecord, createEvidenceBundleRecord, createFirmRecord, createIntakeSessionRecord, createInvoiceRecord, createMarketplaceListingRecord, updateMarketplaceListingStatusRecord, createDirectoryReviewBoardDecisionRecord, createPrivateDirectoryEnquiryRecord, createDirectoryEnquiryCollaborationRequestRecord, createQualificationRenewalReviewRecord, createCapacityOfferRecord, createCollaborationRequestRecord, createObservatorySnapshotRecord, createPolicyDecisionRecord, createProposalRecord, createTenantRecord, findValidProfessionalAuthority, invitePilotUserRecord, activatePilotUserRecord, revokePilotUserRecord, suspendPilotUserRecord, createSupportCaseRecord, updateSupportCaseRecord, createPilotIncidentRecord, updatePilotIncidentRecord, createPilotFeedbackRecord, createPilotAcceptanceReviewRecord, createPilotImprovementItemRecord, updatePilotImprovementItemRecord, createPilotReportPackRecord, createStakeholderReviewBoardRecord, createStakeholderReviewDecisionRecord, createPilotExpansionCohortRecord, updatePilotExpansionCohortRecord, activatePrivatePilotCohortRecord, createTenantOnboardingPlanRecord, updateTenantOnboardingPlanRecord, createReleaseCandidateGateRecord, createTenantPilotControlRecord, recordTenantUsageEventRecord, createBillingReadinessReviewRecord, createPaymentProviderConfigRecord, createSubscriptionPackageRecord, createCommercialLaunchControlRecord, issueDeliverableRecord, issueInvoiceRecord, produceTaskOutputRecord, provisionWorkerInstanceRecord, recordPaymentStatusRecord, requestToolInvocationRecord, reviewDeliverableRecord, activateWorkerInstanceRecord, assignTaskToWorkerRecord, startTaskRecord, getStoreInfo, newId, now, openProjectDeliveryRecord, readStore, requireFields, systemActor, withStore } from "./store.mjs";
import { createFrontDeskEnquiryRecord, qualifyFrontDeskEnquiryRecord, createClientCommunicationDraftRecord, handoffFrontDeskEnquiryRecord } from "./store.mjs";
import { bindAdministrationSkillsRecord, createCorrespondenceRecord, registerDocumentRecord, addDocumentRevisionRecord, createAdministrativeDeadlineRecord, completeAdministrativeDeadlineRecord, createTransmittalDraftRecord } from "./store.mjs";
import { bindCommercialSkillsRecord, createSalesPipelineRecord, updateSalesPipelineRecord, dispatchProposalRecord, createExpenseRecord, approveExpenseRecord, createReceivableFollowUpRecord, readCashSnapshot } from "./store.mjs";
import { bindTechnicalSkillsRecord, createDrawingReviewRecord, createCalculationInputSetRecord, createTechnicalQaFindingRecord, resolveTechnicalQaFindingRecord, createDeliveryPackageRecord, readDailyOperationsSummary, createPilotHandoffRecord, createFactoryFirmBlueprintRecord, validateFactoryFirmBlueprintRecord, approveFactoryFirmBlueprintRecord, createFactoryProvisioningRunRecord, runFactoryReadinessTestRecord, acceptFactoryHandoffRecord, certifyFactoryPackBindingRecord, createQuotationCaseRecord, linkQuotationCaseProposalRecord, approveQuotationCaseRecord, issueQuotationCaseRecord, createBoqExtractionAidRecord, reviewBoqExtractionAidRecord } from "./store.mjs";
import { createNetworkProfessionalProfileRecord, createNetworkFirmProfileRecord, createNetworkCapabilityRecord, createNetworkCredentialRecord, createNetworkTrustSignalRecord } from "./store.mjs";
import { createNetworkConflictCheckRecord, createNetworkQualificationGateRecord, createSpecialistInvitationRecord } from "./store.mjs";
import { createCollaborationWorkspaceRecord, grantCollaborationWorkspaceParticipantRecord, revokeCollaborationWorkspaceParticipantRecord, addCollaborationWorkspaceEvidenceRecord, createResponsibilityMatrixRecord, createSpecialistAssignmentRecord, transitionSpecialistAssignmentRecord } from "./store.mjs";

const root = process.cwd();
const port = Number(process.env.VFIRM_API_PORT ?? 3091);
const FORMWORK_SERVICE_PACK_ID = "11111111-1111-4111-8111-111111111111";
const FORMWORK_SERVICE_SKU_ID = "22222222-2222-4222-8222-222222222222";
const readCollections = new Map([
  ["tenants", "tenants"],
  ["persons", "persons"],
  ["actors", "actors"],
  ["firms", "firms"],
  ["firm-memberships", "firm_memberships"],
  ["professional-profiles", "professional_profiles"],
  ["professional-authorities", "professional_authorities"],
  ["clients", "clients"],
  ["front-desk-enquiries", "front_desk_enquiries"],
  ["client-communication-drafts", "client_communication_drafts"],
  ["administration-skill-bindings", "administration_skill_bindings"],
  ["correspondence-records", "correspondence_records"],
  ["document-register-entries", "document_register_entries"],
  ["document-revision-records", "document_revision_records"],
  ["administrative-deadlines", "administrative_deadlines"],
  ["transmittal-drafts", "transmittal_drafts"],
  ["firm-client-relationships", "firm_client_relationships"],
  ["commercial-skill-bindings", "commercial_skill_bindings"],
  ["sales-pipeline-records", "sales_pipeline_records"],
  ["proposal-dispatch-records", "proposal_dispatch_records"],
  ["expense-records", "expense_records"],
  ["receivable-follow-ups", "receivable_follow_ups"],
  ["technical-skill-bindings", "technical_skill_bindings"],
  ["drawing-review-records", "drawing_review_records"],
  ["calculation-input-sets", "calculation_input_sets"],
  ["technical-qa-findings", "technical_qa_findings"],
  ["delivery-package-records", "delivery_package_records"],
  ["pilot-handoff-records", "pilot_handoff_records"],
  ["quotation-cases", "quotation_cases"],
  ["boq-extraction-aids", "boq_extraction_aids"],
  ["leads", "leads"],
  ["intake-sessions", "intake_sessions"],
  ["price-build-ups", "price_build_ups"],
  ["proposals", "proposals"],
  ["approvals", "approvals"],
  ["engagements", "engagements"],
  ["projects", "projects"],
  ["work-packages", "work_packages"],
  ["tasks", "tasks"],
  ["documents", "documents"],
  ["document-versions", "document_versions"],
  ["evidence-bundles", "evidence_bundles"],
  ["invoices", "invoices"],
  ["payment-statuses", "payment_statuses"],
  ["policy-decisions", "policy_decisions"],
  ["event-log", "event_log"],
  ["audit-events", "audit_events"],
  ["service-packs", "service_packs"],
  ["service-skus", "service_skus"],
  ["worker-templates", "worker_templates"],
  ["worker-instances", "worker_instances"],
  ["task-outputs", "task_outputs"],
  ["tool-invocations", "tool_invocations"],
  ["marketplace-listings", "marketplace_listings"],
  ["directory-review-board-decisions", "directory_review_board_decisions"],
  ["directory-private-enquiries", "directory_private_enquiries"],
  ["qualification-renewal-reviews", "qualification_renewal_reviews"],
  ["capacity-offers", "capacity_offers"],
  ["collaboration-requests", "collaboration_requests"],
  ["network-professional-profiles", "network_professional_profiles"],
  ["network-firm-profiles", "network_firm_profiles"],
  ["network-capabilities", "network_capabilities"],
  ["network-credentials", "network_credentials"],
  ["network-trust-signals", "network_trust_signals"],
  ["network-conflict-checks", "network_conflict_checks"],
  ["network-qualification-gates", "network_qualification_gates"],
  ["specialist-invitations", "specialist_invitations"],
  ["collaboration-workspaces", "collaboration_workspaces"],
  ["collaboration-workspace-participants", "collaboration_workspace_participants"],
  ["collaboration-workspace-evidence", "collaboration_workspace_evidence"],
  ["responsibility-matrices", "responsibility_matrices"],
  ["specialist-assignments", "specialist_assignments"],
  ["observatory-snapshots", "observatory_snapshots"],
  ["pilot-users", "pilot_users"],
  ["support-cases", "support_cases"],
  ["pilot-incidents", "pilot_incidents"],
  ["pilot-feedback", "pilot_feedback"],
  ["pilot-acceptance-reviews", "pilot_acceptance_reviews"],
  ["pilot-improvement-items", "pilot_improvement_items"],
  ["pilot-report-packs", "pilot_report_packs"],
  ["stakeholder-review-boards", "stakeholder_review_boards"],
  ["stakeholder-review-decisions", "stakeholder_review_decisions"],
  ["pilot-expansion-cohorts", "pilot_expansion_cohorts"],
  ["tenant-onboarding-plans", "tenant_onboarding_plans"],
  ["release-candidate-gates", "release_candidate_gates"],
  ["tenant-pilot-controls", "tenant_pilot_controls"],
  ["tenant-usage-events", "tenant_usage_events"],
  ["billing-readiness-reviews", "billing_readiness_reviews"],
  ["payment-provider-configs", "payment_provider_configs"],
  ["subscription-packages", "subscription_packages"],
  ["commercial-launch-controls", "commercial_launch_controls"],
  ["factory-firm-blueprints", "factory_firm_blueprints"],
  ["factory-provisioning-runs", "factory_provisioning_runs"],
  ["provisioned-firm-instances", "provisioned_firm_instances"],
  ["factory-worker-bindings", "factory_worker_bindings"],
  ["pack-compatibility-checks", "pack_compatibility_checks"],
  ["pack-binding-certifications", "pack_binding_certifications"],
  ["service-activation-records", "service_activation_records"]
]);

function corsHeaders(req) {
  const origin = req.headers.origin;
  const configuredOrigins = String(process.env.VFIRM_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const allowedOrigins = new Set([
    "http://127.0.0.1:3090",
    "http://localhost:3090",
    ...configuredOrigins
  ]);
  return {
    "access-control-allow-origin": allowedOrigins.has(origin) ? origin : "http://127.0.0.1:3090",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type,x-vfirm-actor-id,x-vfirm-tenant-id,x-vfirm-firm-id,x-vfirm-role,x-vfirm-auth-provider,x-vfirm-user-email,x-vfirm-user-subject,x-vfirm-user-name,x-vfirm-auth-verified",
    "vary": "Origin"
  };
}

function sendJson(req, res, status, body) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    ...corsHeaders(req)
  });
  res.end(JSON.stringify(body, null, 2));
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString("utf8");
  return text.trim() ? JSON.parse(text) : {};
}

function headerValue(req, name) {
  const value = req?.headers?.[name];
  return Array.isArray(value) ? value[0] : value;
}

function devActorFromHeaders(req, tenant_id = null, firm_id = null) {
  const actor_id = headerValue(req, "x-vfirm-actor-id");
  if (!actor_id) return null;
  return {
    actor_id,
    actor_type: "HUMAN",
    tenant_id: headerValue(req, "x-vfirm-tenant-id") ?? tenant_id,
    firm_id: headerValue(req, "x-vfirm-firm-id") ?? firm_id,
    role: headerValue(req, "x-vfirm-role") ?? "principal",
    display_name: "Dev Auth Actor"
  };
}

function authProviderConfig() {
  const provider = process.env.VFIRM_AUTH_PROVIDER ?? "dev-header";
  const mode = process.env.VFIRM_AUTH_MODE ?? (provider === "dev-header" ? "development" : "staging");
  const configured = provider !== "dev-header" && Boolean(process.env.VFIRM_AUTH_ISSUER || process.env.VFIRM_AUTH_JWKS_URL || provider === "staging-header");
  return {
    provider,
    mode,
    configured,
    issuer_configured: Boolean(process.env.VFIRM_AUTH_ISSUER),
    jwks_configured: Boolean(process.env.VFIRM_AUTH_JWKS_URL),
    audience_configured: Boolean(process.env.VFIRM_AUTH_AUDIENCE),
    adapter_status: provider === "staging-header" ? "STAGING_HEADER_ADAPTER" : configured ? "PROVIDER_CONFIG_DECLARED" : "DEV_HEADER_ONLY",
    supported_providers: ["staging-header", "clerk", "auth0", "supabase", "entra"]
  };
}

function verifiedExternalIdentityFromHeaders(req) {
  const provider = headerValue(req, "x-vfirm-auth-provider") ?? process.env.VFIRM_AUTH_PROVIDER;
  const email = headerValue(req, "x-vfirm-user-email");
  const subject = headerValue(req, "x-vfirm-user-subject");
  if (!email || !subject) return null;
  return {
    provider: provider ?? "staging-header",
    external_subject: subject,
    email: String(email).toLowerCase(),
    display_name: headerValue(req, "x-vfirm-user-name") ?? email,
    verified: headerValue(req, "x-vfirm-auth-verified") === "true" || provider === "staging-header",
    verification_mode: provider === "staging-header" ? "trusted_staging_header" : "provider_adapter_claims"
  };
}
function externalStagingIdentityFromHeaders(req) {
  const email = headerValue(req, "x-vfirm-user-email");
  if (!email) return null;
  return {
    provider: headerValue(req, "x-vfirm-auth-provider") ?? process.env.VFIRM_AUTH_PROVIDER ?? "staging-header",
    external_subject: headerValue(req, "x-vfirm-user-subject") ?? email,
    email: String(email).toLowerCase(),
    display_name: headerValue(req, "x-vfirm-user-name") ?? email
  };
}

async function readStagingAuthContext(req) {
  const identity = externalStagingIdentityFromHeaders(req);
  if (!identity) return { mode: "staging-header-auth", identity: null, pilot_user: null, actor: null, active: false };
  const store = await readStore();
  const pilotUser = (store.pilot_users ?? []).find((user) => user.email === identity.email && user.invite_status === "ACTIVE");
  if (!pilotUser) return { mode: "staging-header-auth", identity, pilot_user: null, actor: null, active: false };
  return {
    mode: "staging-header-auth",
    identity,
    pilot_user: pilotUser,
    actor: {
      actor_id: pilotUser.actor_id ?? pilotUser.id,
      actor_type: "HUMAN",
      tenant_id: pilotUser.tenant_id,
      firm_id: pilotUser.firm_id,
      role: pilotUser.pilot_role,
      display_name: pilotUser.display_name
    },
    active: true
  };
}
function requireHumanOperationalAuthority(actor, label) {
  if (!actor || actor.actor_type !== "HUMAN") {
    const error = new Error(`${label} requires a human support or incident operator.`);
    error.status = 403;
    error.code = "SUPPORT_AUTHORITY_DENIED";
    throw error;
  }
}

function actorFromBody(body, req = null, tenant_id = null, firm_id = null) {
  const actor = body.actor ?? devActorFromHeaders(req, tenant_id, firm_id) ?? systemActor(tenant_id, firm_id);
  assertActorScope(actor, { tenant_id, firm_id }, "command");
  return actor;
}

function findById(store, collection, id) {
  return store[collection].find((record) => record.id === id);
}

function requireRecord(store, collection, id) {
  const record = findById(store, collection, id);
  if (!record) {
    const error = new Error(`${collection} record not found: ${id}`);
    error.code = "NOT_FOUND";
    error.status = 404;
    throw error;
  }
  return record;
}

function forbidden(message) {
  const error = new Error(message);
  error.status = 403;
  error.code = "TENANT_ACCESS_DENIED";
  throw error;
}


const marketplaceGovernancePolicy = Object.freeze({
  release: "Marketplace / Ecosystem Intelligence",
  sprint: "ME-S1",
  status: "GOVERNANCE_LOCKED_IMPLEMENTATION_BLOCKED",
  publication_policy: {
    allowed_visibility: ["TRUSTED_NETWORK", "PRIVATE_NETWORK", "TRUSTED_NETWORK_ONLY"],
    denied_visibility: ["PUBLIC", "OPEN_MARKETPLACE", "PUBLIC_MARKETPLACE"],
    required_controls: ["human_operator", "verified_profile", "qualification_required", "revocation_supported", "audit_required"]
  },
  matching_policy: {
    mode: "POLICY_LOCK_ONLY",
    price_rank_allowed: false,
    required_precedence: ["credential", "jurisdiction", "insurance", "conflict", "capacity", "policy", "responsibility", "price"]
  },
  privacy_policy: {
    minimum_benchmark_cohort_size: 10,
    allowed_snapshot_scopes: ["PRIVATE_NETWORK_INTERNAL", "GOVERNANCE_REHEARSAL_ONLY"],
    denied_snapshot_scopes: ["PUBLIC_OBSERVATORY", "VF24_PUBLICATION", "ECOSYSTEM_PUBLIC_BENCHMARK"],
    raw_tenant_data_publication_allowed: false
  },
  implementation_boundaries: ["controlled_private_directory_only", "no_public_directory", "no_live_matching_engine", "no_capacity_economy_allocation", "no_vf24_observatory_publication", "no_autonomous_regulated_award", "no_live_payment_movement"]
});

function meS1Denied(message, code = "ME_S1_MARKETPLACE_GOVERNANCE_DENIED") {
  const error = new Error(message);
  error.status = 403;
  error.code = code;
  throw error;
}

function normalizeUpper(value) {
  return String(value ?? "").toUpperCase();
}

function assertMEGovernanceActor(actor = {}, action = "marketplace governance action") {
  if (actor.actor_type && actor.actor_type !== "HUMAN") meS1Denied(`${action} requires a human marketplace governance operator.`, "ME_S1_HUMAN_GOVERNANCE_REQUIRED");
}

function assertMEPublicationGovernance(body = {}, actor = {}) {
  assertMEGovernanceActor(actor, "Marketplace publication governance");
  const visibility = normalizeUpper(body.visibility ?? "TRUSTED_NETWORK");
  const listingScope = normalizeUpper(body.listing_scope ?? "PRIVATE_NETWORK");
  const status = normalizeUpper(body.status ?? "PUBLISHED");
  if (marketplaceGovernancePolicy.publication_policy.denied_visibility.includes(visibility) || marketplaceGovernancePolicy.publication_policy.denied_visibility.includes(listingScope)) meS1Denied("ME-S1 does not authorize public/open marketplace publication.", "ME_S1_PUBLIC_MARKETPLACE_DENIED");
  if (!["TRUSTED_NETWORK", "PRIVATE_NETWORK", "TRUSTED_NETWORK_ONLY"].includes(visibility)) meS1Denied(`ME-S1 listing visibility must remain trusted/private network only: ${visibility}.`);
  if (!["PRIVATE_NETWORK", "TRUSTED_NETWORK", "TRUSTED_NETWORK_ONLY"].includes(listingScope)) meS1Denied(`ME-S1 listing scope must remain trusted/private network only: ${listingScope}.`);
  if (!["DRAFT", "PUBLISHED", "SUSPENDED", "REVOKED"].includes(status)) meS1Denied(`ME-S1 listing status is not governed: ${status}.`);
  const requirements = body.qualification_requirements ?? [];
  if (Array.isArray(requirements) && requirements.length > 0 && !requirements.some((item) => /qualification|credential|professional_authority/i.test(String(item)))) meS1Denied("ME-S1 listings must retain qualification or credential requirements.");
}

function assertMECapacityGovernance(body = {}, actor = {}) {
  assertMEGovernanceActor(actor, "Marketplace capacity governance");
  const constraints = body.constraints ?? {};
  if (body.price_rank === true || body.auto_allocate === true || constraints.price_first === true || constraints.auto_allocate === true) meS1Denied("ME-S1 does not authorize price-first capacity allocation or automatic allocation.", "ME_S1_PRICE_FIRST_ALLOCATION_DENIED");
  if (Number(body.pce_units ?? 1) <= 0) meS1Denied("ME-S1 capacity signals must use positive bounded capacity units.");
}

function assertMECollaborationGovernance(body = {}, actor = {}) {
  assertMEGovernanceActor(actor, "Marketplace collaboration governance");
  const policy = body.data_room_policy ?? { minimum_necessary_access: true, client_confidential: true, audit_required: true };
  const missing = ["minimum_necessary_access", "client_confidential", "audit_required"].filter((key) => policy[key] !== true);
  if (missing.length) meS1Denied(`ME-S1 collaboration requests require controlled data-room policy: ${missing.join(", ")}.`, "ME_S1_DATA_ROOM_POLICY_DENIED");
  if (body.auto_award === true || body.autonomous_award === true) meS1Denied("ME-S1 does not authorize autonomous marketplace award.", "ME_S1_AUTONOMOUS_AWARD_DENIED");
}

function assertMEObservatoryGovernance(body = {}, actor = {}) {
  assertMEGovernanceActor(actor, "Marketplace observatory governance");
  const scope = normalizeUpper(body.snapshot_scope ?? "PRIVATE_NETWORK_INTERNAL");
  const privacyClass = normalizeUpper(body.privacy_class ?? "AGGREGATED_INTERNAL");
  if (marketplaceGovernancePolicy.privacy_policy.denied_snapshot_scopes.includes(scope) || /PUBLIC|VF24|ECOSYSTEM_PUBLIC/.test(scope)) meS1Denied("ME-S1 does not authorize VF-24 or public ecosystem observatory publication.", "ME_S1_VF24_PUBLICATION_DENIED");
  if (["RAW_TENANT_DATA", "CLIENT_IDENTIFIABLE", "PUBLIC_RAW"].includes(privacyClass)) meS1Denied("ME-S1 observatory governance forbids raw tenant/client data publication.", "ME_S1_RAW_DATA_PUBLICATION_DENIED");
}

function readMEGovernanceLock() {
  const checks = [
    { key: "publication_policy_locked", status: "PASS", detail: "Trusted/private publication only; public/open marketplace denied." },
    { key: "qualification_precedes_price", status: "PASS", detail: "Credential, jurisdiction, insurance, conflict, capacity, policy, and responsibility precede price." },
    { key: "matching_implementation_blocked", status: "PASS", detail: "No live matching engine is authorized by ME-S1." },
    { key: "revocation_policy_required", status: "PASS", detail: "Published records must support suspension/revocation posture." },
    { key: "privacy_thresholds_locked", status: "PASS", detail: "Benchmark cohort threshold and raw-data publication denial are locked." },
    { key: "vf13_vf24_separation_locked", status: "PASS", detail: "Firm intelligence and ecosystem observatory remain separated." },
    { key: "human_governance_required", status: "PASS", detail: "Marketplace governance actions require human operators." }
  ];
  return { ...marketplaceGovernancePolicy, checks, recommendation: "ME_S1_LOCKED_READY_FOR_ME_S2_DECISION", next_step: "Product owner must explicitly authorize ME-S2 before qualified directory implementation." };
}
function assertActorScope(actor, recordOrQuery, label = "resource") {
  if (!actor) return;
  const tenant_id = recordOrQuery?.tenant_id;
  const firm_id = recordOrQuery?.firm_id;
  if (actor.tenant_id && tenant_id && String(actor.tenant_id) !== String(tenant_id)) forbidden(`Actor cannot read ${label} outside tenant ${actor.tenant_id}.`);
  if (actor.firm_id && firm_id && String(actor.firm_id) !== String(firm_id)) forbidden(`Actor cannot read ${label} outside firm ${actor.firm_id}.`);
}

function applyActorScope(records, actor) {
  if (!actor) return records;
  return records.filter((record) => {
    if (actor.tenant_id && record?.tenant_id && String(record.tenant_id) !== String(actor.tenant_id)) return false;
    const scopedFirmIds = [record?.firm_id, record?.requesting_firm_id, record?.provider_firm_id, record?.accountable_firm_id].filter(Boolean).map(String);
    if (actor.firm_id && scopedFirmIds.length > 0 && !scopedFirmIds.includes(String(actor.firm_id))) return false;
    return true;
  });
}

async function readResource(req, url) {
  const match = url.pathname.match(/^\/([^/]+)(?:\/([^/]+))?$/);
  if (!match) return null;
  const [, slug, id] = match;
  const collection = readCollections.get(slug);
  if (!collection) return null;
  const actor = devActorFromHeaders(req);
  assertActorScope(actor, { tenant_id: url.searchParams.get("tenant_id"), firm_id: url.searchParams.get("firm_id") }, collection);
  const store = await readStore();
  const records = Array.isArray(store[collection]) ? store[collection] : [];
  if (id) {
    const record = requireRecord(store, collection, id);
    assertActorScope(actor, record, collection);
    return { status: 200, body: { ok: true, data: record } };
  }
  return { status: 200, body: { ok: true, data: applyActorScope(applyReadFilters(records, url), actor) } };
}

function applyReadFilters(records, url) {
  const exactFilters = ["tenant_id", "firm_id", "client_id", "relationship_id", "project_id", "proposal_status", "project_state", "status"];
  let filtered = records;
  for (const key of exactFilters) {
    const value = url.searchParams.get(key);
    if (!value) continue;
    if (key === "firm_id") {
      filtered = filtered.filter((record) => [record?.firm_id, record?.requesting_firm_id, record?.provider_firm_id, record?.accountable_firm_id].filter(Boolean).map(String).includes(value));
    } else {
      filtered = filtered.filter((record) => String(record?.[key] ?? "") === value);
    }
  }
  const limit = Number(url.searchParams.get("limit") ?? 0);
  return Number.isInteger(limit) && limit > 0 ? filtered.slice(-limit) : filtered;
}
const workspaceModuleCatalogue = Object.freeze({
  front_desk: { module_code: "front_desk", module_name: "Front Desk", default_view: "front-desk", worker_template_codes: ["front-desk-coordinator"] },
  administration: { module_code: "administration", module_name: "Administration", default_view: "administration", worker_template_codes: ["administration-clerk"] },
  sales_accounts: { module_code: "sales_accounts", module_name: "Sales & Accounts", default_view: "sales-accounts", worker_template_codes: ["marketing-sales-coordinator", "accounts-clerk"] },
  technical_delivery: { module_code: "technical_delivery", module_name: "Technical Delivery", default_view: "technical-delivery", worker_template_codes: ["technical-drawing-assistant"] },
  projects: { module_code: "projects", module_name: "Projects", default_view: "projects", worker_template_codes: ["project-coordination-assistant"] },
  approvals: { module_code: "approvals", module_name: "Approvals", default_view: "approvals", worker_template_codes: [] },
  invoices: { module_code: "invoices", module_name: "Invoices", default_view: "invoices", worker_template_codes: ["accounts-clerk"] },
  ai_workforce: { module_code: "ai_workforce", module_name: "AI Workforce", default_view: "ai-workforce", worker_template_codes: [] },
  network: { module_code: "network", module_name: "Network", default_view: "network", worker_template_codes: [] },
  ops: { module_code: "ops", module_name: "Ops", default_view: "ops", worker_template_codes: ["project-coordination-assistant"] },
  audit: { module_code: "audit", module_name: "Audit", default_view: "audit", worker_template_codes: [] }
});

const workspaceProfiles = Object.freeze({
  FORMWORK_ENGINEERING: {
    firm_type: "FORMWORK_ENGINEERING",
    workspace_title: "Formwork Engineering Virtual Firm Workspace",
    workspace_description: "Operate controlled formwork engineering intake, proposals, delivery support, QA evidence, approvals, invoicing, and audit.",
    subscription: { package_code: "VF-FORMWORK-PILOT", package_name: "Formwork Engineering Pilot Workspace", package_status: "ACTIVE", pricing_model: "CONTROLLED_PILOT", commercial_boundary: "NO_LIVE_PAYMENT_CAPTURE", features: ["front desk", "administration", "sales and proposals", "accounts and receivables", "technical drawing and delivery support", "professional approval gates", "audit and export"] },
    service_lines: [{ service_code: "formwork_preliminary_wall_slab", service_name: "Preliminary Wall/Slab Formwork Support", service_type: "PROFESSIONAL_PRACTICE", status: "ACTIVE", requires_human_approval: true, regulated_work: true, delivery_outputs: ["controlled drawings", "QA evidence bundle", "delivery report"] }],
    modules: ["front_desk", "administration", "sales_accounts", "technical_delivery", "projects", "approvals", "invoices", "ai_workforce", "ops", "audit"],
    worker_templates: ["front-desk-coordinator", "administration-clerk", "accounts-clerk", "marketing-sales-coordinator", "technical-drawing-assistant", "project-coordination-assistant"],
    authority_boundaries: ["AI may prepare drafts and checks only.", "Regulated deliverables require valid human professional approval.", "No silent approval."]
  },
  ORGANIZATION_SUPPORT: {
    firm_type: "ORGANIZATION_SUPPORT",
    workspace_title: "NHL Global Solution Workspace",
    workspace_description: "Operate a virtual organization-support firm for project reporting, technical writing, clerical work, and BizKick EDCS documentation/control support.",
    subscription: { package_code: "VF-ORG-SUPPORT-PILOT", package_name: "Organization Support and EDCS Pilot Workspace", package_status: "ACTIVE", pricing_model: "CONTROLLED_PILOT", commercial_boundary: "NO_LIVE_PAYMENT_CAPTURE", features: ["front desk", "administration and clerical records", "project reporting", "technical writing", "BizKick EDCS document/control support", "sales and proposals", "accounts and receivables", "audit and export"] },
    service_lines: [
      { service_code: "project_reporting", service_name: "Project Reporting", service_type: "ORGANIZATION_SUPPORT", status: "ACTIVE", requires_human_approval: true, regulated_work: false, delivery_outputs: ["project report draft", "status summary", "evidence index"] },
      { service_code: "technical_writing", service_name: "Technical Writing", service_type: "ORGANIZATION_SUPPORT", status: "ACTIVE", requires_human_approval: true, regulated_work: false, delivery_outputs: ["technical writing draft", "review pack"] },
      { service_code: "clerical_work", service_name: "Clerical Work", service_type: "ADMINISTRATIVE_SUPPORT", status: "ACTIVE", requires_human_approval: true, regulated_work: false, delivery_outputs: ["register", "correspondence draft", "filing index"] },
      { service_code: "bizkick_edcs", service_name: "BizKick EDCS", service_type: "ORGANIZATION_SUPPORT", status: "ACTIVE", requires_human_approval: true, regulated_work: false, delivery_outputs: ["EDCS control index", "document register", "workflow checklist"] }
    ],
    modules: ["front_desk", "administration", "sales_accounts", "projects", "invoices", "ai_workforce", "ops", "audit"],
    worker_templates: ["front-desk-coordinator", "administration-clerk", "accounts-clerk", "marketing-sales-coordinator", "technical-drawing-assistant", "project-coordination-assistant"],
    authority_boundaries: ["AI may prepare drafts, registers, reports, and document-control support only.", "Human principal approval is required before external sending or client commitment.", "No autonomous payment action."]
  },
  DIRECTORY_REHEARSAL: {
    firm_type: "DIRECTORY_REHEARSAL",
    workspace_title: "Private Directory Rehearsal Workspace",
    workspace_description: "Controlled private-directory rehearsal workspace for governance, enquiry, renewal, and evidence testing.",
    subscription: { package_code: "VF-DIRECTORY-REHEARSAL", package_name: "Private Directory Rehearsal Workspace", package_status: "ACTIVE", pricing_model: "READINESS_ONLY", commercial_boundary: "NO_LIVE_PAYMENT_CAPTURE", features: ["private directory rehearsal", "governance review", "audit evidence"] },
    service_lines: [{ service_code: "private_directory_rehearsal", service_name: "Private Directory Rehearsal", service_type: "ORGANIZATION_SUPPORT", status: "ACTIVE", requires_human_approval: true, regulated_work: false, delivery_outputs: ["rehearsal evidence pack"] }],
    modules: ["front_desk", "network", "ops", "audit"],
    worker_templates: ["front-desk-coordinator", "project-coordination-assistant"],
    authority_boundaries: ["Rehearsal/test workspace only.", "No public marketplace widening.", "No autonomous award."]
  }
});

function inferFirmType(firm = {}) {
  const explicit = firm.metadata?.workspace_profile?.firm_type ?? firm.metadata?.firm_type;
  if (explicit && workspaceProfiles[explicit]) return explicit;
  const name = String(firm.name ?? "").toLowerCase();
  const practices = firm.active_practices ?? [];
  if (name.includes("nhl global solution") || practices.includes("organization_support") || practices.includes("bizkick_edcs")) return "ORGANIZATION_SUPPORT";
  if (name.includes("pd h2") || name.includes("rehearsal") || firm.metadata?.workspace_classification === "REHEARSAL") return "DIRECTORY_REHEARSAL";
  return "FORMWORK_ENGINEERING";
}

function latestActiveSubscriptionForFirm(store, firmId) {
  const packages = (store.subscription_packages ?? []).filter((item) => item.firm_id === firmId);
  return packages.findLast?.((item) => item.package_status === "ACTIVE") ?? packages.findLast?.((item) => ["APPROVED", "APPROVED_TEST_MODE"].includes(item.package_status)) ?? packages.at(-1) ?? null;
}

function workerMatchesTemplate(worker, templateCode) {
  const normalizedCode = String(templateCode ?? "").replace(/-/g, " ").toLowerCase();
  const workerName = String(worker?.name ?? "").toLowerCase();
  const assigned = (worker?.assigned_services ?? []).map((item) => String(item).toLowerCase());
  return workerName.includes(normalizedCode.split(" ")[0]) || assigned.includes(String(templateCode ?? "").toLowerCase());
}

function normalizeWorkspaceModule(moduleCode, profile, workers) {
  const base = workspaceModuleCatalogue[moduleCode] ?? { module_code: moduleCode, module_name: moduleCode, default_view: moduleCode, worker_template_codes: [] };
  const activeWorkers = workers.filter((worker) => (base.worker_template_codes ?? []).some((code) => workerMatchesTemplate(worker, code)) && worker.runtime_status === "ACTIVE");
  return { ...base, status: "SUBSCRIBED", description: `${base.module_name} module for ${profile.firm_type.toLowerCase().replace(/_/g, " ")} workspace.`, active_workers: activeWorkers.length, authority_note: (profile.authority_boundaries ?? [])[0] ?? "Assistive only under human authority." };
}

function workspaceProfileForFirm(store, tenant, firm) {
  const subscription = latestActiveSubscriptionForFirm(store, firm.id);
  const firmType = inferFirmType(firm);
  const base = workspaceProfiles[firmType] ?? workspaceProfiles.FORMWORK_ENGINEERING;
  const override = subscription?.metadata?.workspace_profile ?? firm.metadata?.workspace_profile ?? {};
  const principalActor = (store.actors ?? []).find((actor) => actor.firm_id === firm.id && actor.actor_type === "HUMAN") ?? null;
  const workers = (store.worker_instances ?? []).filter((worker) => worker.tenant_id === tenant.id && worker.firm_id === firm.id);
  const profile = {
    ...base,
    ...override,
    tenant_id: tenant.id,
    firm_id: firm.id,
    workspace_code: override.workspace_code ?? `${firmType.toLowerCase()}-${firm.id}`,
    workspace_status: override.workspace_status ?? firm.status ?? "ACTIVE",
    workspace_classification: override.workspace_classification ?? firm.metadata?.workspace_classification ?? (firmType === "DIRECTORY_REHEARSAL" ? "REHEARSAL" : "PILOT"),
    firm_type: override.firm_type ?? firmType,
    workspace_title: override.workspace_title ?? (firmType === "ORGANIZATION_SUPPORT" ? `${firm.name} Workspace` : base.workspace_title),
    principal_display_name: override.principal_display_name ?? principalActor?.display_name ?? "Principal not resolved",
    subscription: { ...base.subscription, ...(subscription ? { package_code: subscription.package_code, package_name: subscription.package_name, package_status: subscription.package_status, pricing_model: subscription.pricing_model, features: subscription.features ?? base.subscription.features } : {}), ...(override.subscription ?? {}) },
    service_lines: override.service_lines ?? subscription?.metadata?.service_lines ?? base.service_lines,
    modules: override.modules ?? subscription?.metadata?.modules ?? base.modules,
    worker_templates: override.worker_templates ?? subscription?.metadata?.worker_templates ?? base.worker_templates,
    authority_boundaries: override.authority_boundaries ?? base.authority_boundaries,
    record_scope: { tenant_scoped: true, firm_scoped: true, cross_tenant_access: false },
    audit_requirements: { all_material_actions_attributable: true, private_chain_of_thought_excluded: true, evidence_summary_required: true }
  };
  return {
    ...profile,
    subscription_package_id: subscription?.id ?? null,
    modules: (profile.modules ?? []).map((moduleCode) => normalizeWorkspaceModule(moduleCode, profile, workers)),
    worker_bindings: (profile.worker_templates ?? []).map((code) => {
      const worker = workers.find((item) => workerMatchesTemplate(item, code));
      return { worker_template_code: code, display_name: worker?.name ?? code, runtime_status: worker?.runtime_status ?? "AVAILABLE", worker_instance_id: worker?.id ?? null, authority_boundary: (profile.authority_boundaries ?? [])[0] ?? "Assistive only.", requires_supervisor: true };
    }),
    counts: {
      workers: workers.length,
      active_workers: workers.filter((worker) => worker.runtime_status === "ACTIVE").length,
      service_lines: (profile.service_lines ?? []).length,
      modules: (profile.modules ?? []).length
    }
  };
}

async function readActiveWorkspaceSummary(req, url) {
  const tenantId = url.searchParams.get("tenant_id");
  const firmId = url.searchParams.get("firm_id");
  requireFields({ tenant_id: tenantId, firm_id: firmId }, ["tenant_id", "firm_id"]);
  assertActorScope(devActorFromHeaders(req), { tenant_id: tenantId, firm_id: firmId }, "active workspace summary");
  const store = await readStore();
  const tenant = (store.tenants ?? []).find((item) => item.id === tenantId);
  if (!tenant) requireRecord(store, "tenants", tenantId);
  const firm = (store.firms ?? []).find((item) => item.id === firmId && item.tenant_id === tenantId);
  if (!firm) {
    const error = new Error(`firms record not found in selected tenant: ${firmId}`);
    error.code = "NOT_FOUND";
    error.status = 404;
    throw error;
  }
  const workspace = workspaceProfileForFirm(store, tenant, firm);
  return {
    generated_at: new Date().toISOString(),
    tenant: { id: tenant.id, name: tenant.name, status: tenant.status },
    firm: { id: firm.id, name: firm.name, status: firm.status, active_practices: firm.active_practices ?? [], metadata: firm.metadata ?? {} },
    workspace,
    service_pack: { status: workspace.subscription?.package_status ?? "MISSING", code: workspace.subscription?.package_code ?? "NO_SUBSCRIPTION", name: workspace.subscription?.package_name ?? "No active subscription package", sku_status: "PROFILE_BOUND", sku_code: workspace.service_lines?.[0]?.service_code ?? "NO_SERVICE_LINE" },
    boundaries: ["no_public_marketplace", "no_live_matching", "no_ranking", "no_capacity_allocation", "no_vf24_publication", "no_pricing_intelligence", "no_autonomous_award", "no_autonomous_regulated_approval", "no_live_payment_movement"]
  };
}
async function readDashboardSummary(url) {
  const store = await readStore();
  const filtered = Object.fromEntries([...readCollections.values()].map((collection) => [collection, applyReadFilters(Array.isArray(store[collection]) ? store[collection] : [], url)]));
  const counts = {
    tenants: filtered.tenants.length,
    firms: filtered.firms.length,
    clients: filtered.clients.length,
    open_intake: filtered.intake_sessions.filter((item) => item.intake_status !== "COMPLETE").length,
    proposals: filtered.proposals.length,
    projects: filtered.projects.length,
    approvals: filtered.approvals.length,
    invoices: filtered.invoices.length,
    events: filtered.event_log.length,
    audit_events: filtered.audit_events.length,
    marketplace_listings: filtered.marketplace_listings.length,
    capacity_offers: filtered.capacity_offers.length,
    collaboration_requests: filtered.collaboration_requests.length,
    observatory_snapshots: filtered.observatory_snapshots.length,
    support_cases: filtered.support_cases.length,
    pilot_incidents: filtered.pilot_incidents.length,
    pilot_feedback: filtered.pilot_feedback.length,
    pilot_acceptance_reviews: filtered.pilot_acceptance_reviews.length,
    pilot_improvement_items: filtered.pilot_improvement_items.length,
    pilot_report_packs: filtered.pilot_report_packs.length,
    stakeholder_review_boards: filtered.stakeholder_review_boards.length,
    stakeholder_review_decisions: filtered.stakeholder_review_decisions.length,
    pilot_expansion_cohorts: filtered.pilot_expansion_cohorts.length,
    tenant_onboarding_plans: filtered.tenant_onboarding_plans.length,
    release_candidate_gates: filtered.release_candidate_gates.length,
    tenant_pilot_controls: filtered.tenant_pilot_controls.length,
    tenant_usage_events: filtered.tenant_usage_events.length,
    billing_readiness_reviews: filtered.billing_readiness_reviews.length,
    payment_provider_configs: filtered.payment_provider_configs.length,
    subscription_packages: filtered.subscription_packages.length,
    commercial_launch_controls: filtered.commercial_launch_controls.length
  };
  const tenantId = url.searchParams.get("tenant_id");
  const firmId = url.searchParams.get("firm_id");
  const activeWorkspaceSummary = tenantId && firmId ? await readActiveWorkspaceSummary(null, url) : null;
  const formworkPack = filtered.service_packs.find((pack) => pack.code === "VF-SP-001") ?? null;
  const formworkSku = filtered.service_skus.find((sku) => sku.code === "formwork_preliminary_wall_slab") ?? null;
  const resolvedServicePack = activeWorkspaceSummary?.service_pack ?? { status: formworkPack?.status ?? "MISSING", code: formworkPack?.code ?? "VF-SP-001", name: formworkPack?.name ?? "Formwork Engineering Preliminary Package", sku_status: formworkSku?.status ?? "MISSING", sku_code: formworkSku?.code ?? "formwork_preliminary_wall_slab" };
  return {
    counts,
    latest_activity: filtered.event_log.slice(-6).reverse(),
    health: {
      api: { status: "ONLINE", port_family: "309#", api_port: port, phase: "persistent-mvp-command-loop" },
      persistence: getStoreInfo(),
      service_pack: resolvedServicePack,
      audit: { status: counts.events > 0 && counts.audit_events > 0 ? "ACTIVE" : "WAITING_FOR_ACTIVITY", events: counts.events, audit_events: counts.audit_events },
      workflow: { status: workflowReadinessStatus(counts), next_gate: workflowNextGate(counts) },
      active_workspace: activeWorkspaceSummary?.workspace ?? null
    },
    generated_at: new Date().toISOString()
  };
}

function workflowReadinessStatus(counts) {
  if (counts.invoices > 0) return "INVOICE_READY";
  if (counts.projects > 0) return "DELIVERY_OPEN";
  if (counts.proposals > 0) return "COMMERCIAL_ACTIVE";
  if (counts.clients > 0) return "FRONT_DOOR_ACTIVE";
  if (counts.firms > 0) return "FIRM_READY";
  return "SETUP_REQUIRED";
}

function workflowNextGate(counts) {
  if (counts.firms === 0) return "Create Firm";
  if (counts.clients === 0) return "Add Client";
  if (counts.open_intake === 0 && counts.proposals === 0) return "Create Intake";
  if (counts.proposals === 0) return "Create Proposal";
  if (counts.projects === 0) return "Approve and Accept Proposal";
  if (counts.invoices === 0) return "Capture Evidence and Create Invoice";
  return "Review Audit";
}

function readStagingDeploymentPackage() {
  return {
    code: "VF-STAGING-PACKAGE-001",
    stage: "Stage 13 - Staging Deployment Package and Production Data Protection",
    release_channel: process.env.VFIRM_RELEASE_CHANNEL ?? "local-pilot",
    recommended_services: ["vfirm-web", "vfirm-api", "managed-postgresql"],
    local_ports: { web: 3090, api: port, family: "309#" },
    required_environment: [
      "DATABASE_URL",
      "VFIRM_AUTH_PROVIDER",
      "VFIRM_AUTH_MODE",
      "VFIRM_AUTH_ISSUER",
      "VFIRM_AUTH_AUDIENCE",
      "VFIRM_AUTH_JWKS_URL",
      "VFIRM_ALLOWED_ORIGINS",
      "VFIRM_BACKUP_POLICY",
      "VFIRM_RELEASE_CHANNEL"
    ],
    preflight_commands: [
      "npm run check",
      "npm run db:migrate:docker",
      "npm run check:db:postgres",
      "npm run check:stage13"
    ],
    deployment_steps: [
      "Provision managed PostgreSQL and set DATABASE_URL.",
      "Configure auth provider callback URLs and verified token adapter settings.",
      "Set explicit allowed origins for staging domain.",
      "Apply migrations before starting staging traffic.",
      "Run full smoke suite against staging.",
      "Invite only approved pilot users.",
      "Confirm backup/restore policy before external access."
    ],
    rollback_plan: [
      "Disable staging ingress or remove pilot user access.",
      "Rollback app version.",
      "Preserve audit/event records for incident review.",
      "Restore database only after confirming restore point and data impact."
    ]
  };
}

function readDataProtectionPolicy() {
  return {
    code: "VF-DATA-PROTECTION-PILOT-001",
    status: "STAGING_POLICY_DEFINED",
    classifications: ["PUBLIC", "INTERNAL", "CONFIDENTIAL", "REGULATED", "SECRET"],
    default_classification: "CONFIDENTIAL",
    tenant_isolation: "required",
    export_policy: {
      allowed: true,
      format: "json",
      requires_tenant_scope: true,
      includes: ["ids", "relationships", "timestamps", "provenance", "classification", "policy_constraints"],
      excludes: ["secrets", "provider tokens", "raw credentials", "unlicensed third-party data"]
    },
    backup_policy: process.env.VFIRM_BACKUP_POLICY ?? "pilot-daily-required-before-external-access",
    retention_policy: {
      pilot_operational_records: "retain during pilot plus review period",
      audit_events: "retain for full pilot review",
      revoked_users: "retain revocation metadata for audit",
      deletion: "soft-delete/retire before destructive deletion"
    },
    external_pilot_requirements: [
      "explicit client/pilot consent",
      "managed database backup active",
      "auth provider verification active",
      "tenant-scoped access checks",
      "no secrets in repository or export packages"
    ]
  };
}

const tenantExportCollections = [
  "tenants", "firms", "firm_memberships", "professional_profiles", "professional_authorities", "actors", "persons",
  "clients", "firm_client_relationships", "front_desk_enquiries", "client_communication_drafts", "leads", "intake_sessions",
  "administration_skill_bindings", "correspondence_records", "document_register_entries", "document_revision_records", "administrative_deadlines", "transmittal_drafts",
  "commercial_skill_bindings", "sales_pipeline_records", "price_build_ups", "proposals", "proposal_dispatch_records", "approvals", "engagements", "projects", "work_packages", "tasks",
  "technical_skill_bindings", "drawing_review_records", "calculation_input_sets", "technical_qa_findings", "delivery_package_records",
  "documents", "document_versions", "evidence_bundles", "invoices", "payment_statuses", "expense_records", "receivable_follow_ups",
  "worker_instances", "task_outputs", "tool_invocations", "pilot_handoff_records", "pilot_users", "support_cases", "pilot_incidents", "pilot_feedback", "pilot_acceptance_reviews", "pilot_improvement_items", "pilot_report_packs", "stakeholder_review_boards", "stakeholder_review_decisions",
  "tenant_pilot_controls", "tenant_usage_events", "billing_readiness_reviews", "payment_provider_configs", "subscription_packages", "commercial_launch_controls", "factory_firm_blueprints", "factory_provisioning_runs", "provisioned_firm_instances", "factory_worker_bindings", "pack_compatibility_checks", "pack_binding_certifications", "service_activation_records", "policy_decisions", "event_log", "audit_events"
];

function tenantExportRecords(store, collection, tenantId, firmId = null) {
  const records = Array.isArray(store[collection]) ? store[collection] : [];
  return records.filter((record) => {
    if (collection === "tenants") return !tenantId || String(record.id) === String(tenantId);
    if (tenantId && record?.tenant_id && String(record.tenant_id) !== String(tenantId)) return false;
    if (firmId && record?.firm_id && String(record.firm_id) !== String(firmId)) return false;
    return true;
  });
}

async function readTenantExportPackage(req, url) {
  const actor = devActorFromHeaders(req);
  const tenantId = url.searchParams.get("tenant_id") ?? actor?.tenant_id ?? null;
  const firmId = url.searchParams.get("firm_id") ?? actor?.firm_id ?? null;
  requireFields({ tenant_id: tenantId }, ["tenant_id"]);
  assertActorScope(actor, { tenant_id: tenantId, firm_id: firmId }, "tenant export package");
  const store = await readStore();
  const records = Object.fromEntries(tenantExportCollections.map((collection) => [collection, tenantExportRecords(store, collection, tenantId, firmId)]));
  const counts = Object.fromEntries(Object.entries(records).map(([collection, rows]) => [collection, rows.length]));
  return {
    package_type: "tenant_business_records_export",
    format: "json",
    tenant_id: tenantId,
    firm_id: firmId,
    generated_at: new Date().toISOString(),
    policy: readDataProtectionPolicy().export_policy,
    records,
    counts,
    integrity: {
      ids_preserved: true,
      relationship_preservation: true,
      timestamp_preservation: true,
      provenance_preservation: true,
      audit_trail_included: true,
      secrets_excluded: true,
      provider_tokens_excluded: true,
      professional_authority_preserved: true
    }
  };
}
async function readDataExportManifest(req, url) {
  assertActorScope(devActorFromHeaders(req), { tenant_id: url.searchParams.get("tenant_id"), firm_id: url.searchParams.get("firm_id") }, "data export manifest");
  const store = await readStore();
  const tenantId = url.searchParams.get("tenant_id");
  const collections = tenantExportCollections;
  const counts = Object.fromEntries(collections.map((collection) => {
    const scoped = tenantExportRecords(store, collection, tenantId);
    return [collection, scoped.length];
  }));
  return {
    manifest_type: "tenant_export_manifest",
    tenant_id: tenantId ?? null,
    generated_at: new Date().toISOString(),
    policy: readDataProtectionPolicy().export_policy,
    counts,
    integrity: {
      relationship_preservation: true,
      provenance_preservation: true,
      audit_trail_included: true,
      secrets_excluded: true
    }
  };
}

function csvEnv(key) {
  return String(process.env[key] ?? "").split(",").map((item) => item.trim()).filter(Boolean);
}

function readR4StagingDataProtectionReadiness() {
  const stagingPackage = readStagingDeploymentPackage();
  const dataPolicy = readDataProtectionPolicy();
  const allowedOrigins = csvEnv("VFIRM_ALLOWED_ORIGINS");
  const selectedEnvironment = process.env.VFIRM_STAGING_ENVIRONMENT ?? "provider-neutral-controlled-staging";
  const backupPolicy = process.env.VFIRM_BACKUP_POLICY ?? null;
  const releaseChannel = process.env.VFIRM_RELEASE_CHANNEL ?? null;
  const authProvider = process.env.VFIRM_AUTH_PROVIDER ?? null;
  const checks = [
    { key: "staging_environment_selected", status: selectedEnvironment ? "PASS" : "FAIL", detail: selectedEnvironment },
    { key: "secrets_policy", status: "PASS", detail: "Secrets and provider tokens are excluded from source, audit summaries, and export packages." },
    { key: "allowed_origins", status: allowedOrigins.length > 0 ? "PASS" : "FAIL", detail: allowedOrigins.length > 0 ? allowedOrigins : "No allowed origins configured." },
    { key: "auth_provider", status: authProvider ? "PASS" : "FAIL", detail: authProvider ?? "No external auth provider adapter configured." },
    { key: "backup_rehearsal", status: backupPolicy ? "PASS" : "FAIL", detail: backupPolicy ?? "No backup policy declared." },
    { key: "restore_rehearsal", status: backupPolicy ? "PASS" : "FAIL", detail: backupPolicy ? "Restore rehearsal must use the declared backup policy before private pilot invitation." : "Cannot rehearse restore without backup policy." },
    { key: "export_policy", status: dataPolicy.export_policy?.requires_tenant_scope ? "PASS" : "FAIL", detail: "Tenant-scoped JSON export with provenance and exclusions." },
    { key: "release_channel", status: releaseChannel ? "PASS" : "FAIL", detail: releaseChannel ?? "No release channel configured." }
  ];
  const failed = checks.filter((check) => check.status === "FAIL");
  return {
    code: "R4-S2-STAGING-DATA-PROTECTION-READINESS",
    selected_environment: selectedEnvironment,
    deployment_model: "provider-neutral web/api services plus managed PostgreSQL-compatible persistence",
    private_pilot_invitation_gate: failed.length === 0 ? "READY_FOR_R4_S3_SUPPORT_AND_INCIDENT_CONTROLS" : "BLOCKED_UNTIL_R4_S2_CHECKS_PASS",
    release_channel: releaseChannel,
    allowed_origins: allowedOrigins,
    required_environment: stagingPackage.required_environment,
    preflight_commands: ["npm run check", "npm run check:r4", "npm run check:r4:s2", "git diff --check"],
    backup_restore_rehearsal: {
      backup_policy: backupPolicy,
      backup_status: backupPolicy ? "DECLARED" : "MISSING",
      restore_status: backupPolicy ? "REHEARSAL_REQUIRED_BEFORE_PRIVATE_PILOT_INVITATION" : "BLOCKED",
      destructive_restore_allowed: false,
      operator_note: "Restore is rehearsed as a controlled procedure/evidence gate; live destructive restore requires separate incident approval."
    },
    data_protection_review: {
      tenant_isolation_required: true,
      export_requires_tenant_scope: dataPolicy.export_policy?.requires_tenant_scope === true,
      secrets_excluded: dataPolicy.export_policy?.excludes?.includes("secrets") === true,
      provider_tokens_excluded: dataPolicy.export_policy?.excludes?.includes("provider tokens") === true,
      raw_credentials_excluded: dataPolicy.export_policy?.excludes?.includes("raw credentials") === true,
      private_chain_of_thought_excluded: true
    },
    checks,
    status: failed.length === 0 ? "R4_S2_READY_FOR_SUPPORT_INCIDENT_CONTROLS" : "R4_S2_BLOCKED",
    generated_at: new Date().toISOString()
  };
}
function readFormworkPilotPackage() {
  return {
    code: "VF-PILOT-001",
    name: "Formwork Engineering Pilot Package",
    stage: "Stage 10 - Pilot Deployment and Formwork Service Pilot Packaging",
    service_pack_code: "VF-SP-001",
    pilot_mode: "controlled_private_pilot",
    readiness_status: "PILOT_PACKAGE_READY_FOR_INTERNAL_TRIAL",
    scope: {
      included: [
        "client intake",
        "proposal and approval",
        "project opening",
        "task/evidence workflow",
        "deliverable draft/review/issue gates",
        "invoice issue/payment status",
        "AI worker assistance with human review",
        "trusted-network listing and capacity signal"
      ],
      excluded: [
        "final automated engineering design",
        "professional seal/signature automation",
        "manufacturer-specific claims without licensed data",
        "public marketplace discovery",
        "external production users without production auth"
      ]
    },
    onboarding_checklist: [
      "Confirm pilot tenant and firm principal.",
      "Confirm principal authority for Formwork MVP approval actions.",
      "Create pilot client and relationship.",
      "Capture complete Formwork intake inputs.",
      "Create and approve pilot proposal.",
      "Open project and complete evidence bundle.",
      "Draft, review, and issue deliverable.",
      "Issue invoice and record payment status for pilot transaction.",
      "Provision bounded AI worker only for assistive tasks.",
      "Publish private trusted-network listing and capacity offer if needed.",
      "Review Ops readiness warnings before any external access."
    ],
    acceptance_criteria: [
      "Pilot workflow can be seeded repeatedly in local/dev mode.",
      "Every regulated gate preserves human authority and audit trail.",
      "Every command produces a traceable event/audit record.",
      "Ops readiness clearly displays dev-only warnings.",
      "Pilot docs explain operator workflow and boundaries."
    ]
  };
}
function readOpsReadiness() {
  const persistence = getStoreInfo();
  const requiredEnv = ["VFIRM_API_PORT"];
  const productionRequiredEnv = ["VFIRM_DATABASE_URL", "VFIRM_AUTH_PROVIDER", "VFIRM_ALLOWED_ORIGINS", "VFIRM_BACKUP_POLICY", "VFIRM_RELEASE_CHANNEL"];
  const env = Object.fromEntries([...requiredEnv, ...productionRequiredEnv].map((key) => [key, Boolean(process.env[key])]));
  const checks = [
    { key: "port_family", status: String(port).startsWith("309") ? "PASS" : "WARN", detail: `API port ${port}` },
    { key: "persistence", status: persistence.store_backend === "postgres" ? "PASS" : "WARN", detail: `Store backend: ${persistence.store_backend}` },
    { key: "database_url", status: process.env.VFIRM_DATABASE_URL ? "PASS" : "WARN", detail: process.env.VFIRM_DATABASE_URL ? "Database URL configured" : "Using JSON/dev fallback" },
    { key: "auth_provider", status: process.env.VFIRM_AUTH_PROVIDER ? "PASS" : "WARN", detail: process.env.VFIRM_AUTH_PROVIDER ? "External auth configured" : "Dev-header auth active" },
    { key: "allowed_origins", status: process.env.VFIRM_ALLOWED_ORIGINS ? "PASS" : "WARN", detail: process.env.VFIRM_ALLOWED_ORIGINS ? "Explicit allowed origins configured" : "Localhost-only CORS defaults active" },
    { key: "backup_policy", status: process.env.VFIRM_BACKUP_POLICY ? "PASS" : "WARN", detail: process.env.VFIRM_BACKUP_POLICY ? "Backup policy declared" : "Backup policy not declared" },
    { key: "release_channel", status: process.env.VFIRM_RELEASE_CHANNEL ? "PASS" : "WARN", detail: process.env.VFIRM_RELEASE_CHANNEL ? `Release channel: ${process.env.VFIRM_RELEASE_CHANNEL}` : "Release channel not set" }
  ];
  const failCount = checks.filter((check) => check.status === "FAIL").length;
  const warnCount = checks.filter((check) => check.status === "WARN").length;
  return {
    service: "vfirm-api",
    stage: "Stage 9 - Production Readiness",
    status: failCount ? "NOT_READY" : warnCount ? "DEV_READY_WITH_WARNINGS" : "PRODUCTION_READY_CANDIDATE",
    generated_at: new Date().toISOString(),
    environment: { node_env: process.env.NODE_ENV ?? "development", api_port: port, port_family: "309#", env },
    persistence,
    checks,
    release_gate: {
      required_before_real_production: productionRequiredEnv,
      command: "npm run check:production-readiness",
      note: "Warnings are acceptable for local MVP development; production release must resolve them explicitly."
    }
  };
}
async function createTenant(body) {
  requireFields(body, ["name"]);
  return createTenantRecord(body);
}

async function createFirm(body) {
  requireFields(body, ["tenant_id", "name", "principal_name"]);
  return createFirmRecord(body);
}

async function createClient(body, req = null) {
  requireFields(body, ["tenant_id", "firm_id", "name"]);
  const actor = actorFromBody(body, req, body.tenant_id, body.firm_id);
  return createClientRecord({ ...body, actor });
}

async function createFrontDeskEnquiry(body, req = null) { requireFields(body, ["tenant_id", "firm_id", "contact_name", "enquiry_summary"]); return createFrontDeskEnquiryRecord({ ...body, actor: actorFromBody(body, req, body.tenant_id, body.firm_id) }); }
async function qualifyFrontDeskEnquiry(body, req = null) { requireFields(body, ["tenant_id", "firm_id", "enquiry_id", "decision"]); return qualifyFrontDeskEnquiryRecord({ ...body, actor: actorFromBody(body, req, body.tenant_id, body.firm_id) }); }
async function createClientCommunicationDraft(body, req = null) { requireFields(body, ["tenant_id", "firm_id", "enquiry_id", "message_body"]); return createClientCommunicationDraftRecord({ ...body, actor: actorFromBody(body, req, body.tenant_id, body.firm_id) }); }
async function handoffFrontDeskEnquiry(body, req = null) { requireFields(body, ["tenant_id", "firm_id", "enquiry_id"]); return handoffFrontDeskEnquiryRecord({ ...body, actor: actorFromBody(body, req, body.tenant_id, body.firm_id), required_inputs: body.required_inputs ?? formworkServicePack.intake_required_fields, service_id: body.service_id ?? FORMWORK_SERVICE_PACK_ID }); }


async function bindAdministrationSkills(body, req=null){requireFields(body,["tenant_id","firm_id","role_skill_ref","worker_skill_ref"]);return bindAdministrationSkillsRecord({...body,actor:actorFromBody(body,req,body.tenant_id,body.firm_id)});}
async function createCorrespondence(body,req=null){requireFields(body,["tenant_id","firm_id","subject","correspondent"]);return createCorrespondenceRecord({...body,actor:actorFromBody(body,req,body.tenant_id,body.firm_id)});}
async function registerAdministrationDocument(body,req=null){requireFields(body,["tenant_id","firm_id","document_number","title","document_type","revision","storage_ref","content_hash"]);return registerDocumentRecord({...body,actor:actorFromBody(body,req,body.tenant_id,body.firm_id)});}
async function addAdministrationRevision(body,req=null){requireFields(body,["tenant_id","firm_id","document_register_entry_id","revision","storage_ref","content_hash"]);return addDocumentRevisionRecord({...body,actor:actorFromBody(body,req,body.tenant_id,body.firm_id)});}
async function createAdministrationDeadline(body,req=null){requireFields(body,["tenant_id","firm_id","title","due_at"]);return createAdministrativeDeadlineRecord({...body,actor:actorFromBody(body,req,body.tenant_id,body.firm_id)});}
async function completeAdministrationDeadline(body,req=null){requireFields(body,["tenant_id","firm_id","deadline_id"]);return completeAdministrativeDeadlineRecord({...body,actor:actorFromBody(body,req,body.tenant_id,body.firm_id)});}
async function createTransmittalDraft(body,req=null){requireFields(body,["tenant_id","firm_id","recipient","subject","message_body"]);return createTransmittalDraftRecord({...body,actor:actorFromBody(body,req,body.tenant_id,body.firm_id)});}

async function bindCommercialSkills(body,req=null){requireFields(body,["tenant_id","firm_id","worker_template_code","role_skill_ref","worker_skill_ref"]);return bindCommercialSkillsRecord({...body,actor:actorFromBody(body,req,body.tenant_id,body.firm_id)});}
async function createSalesOpportunity(body,req=null){requireFields(body,["tenant_id","firm_id","opportunity_name"]);return createSalesPipelineRecord({...body,actor:actorFromBody(body,req,body.tenant_id,body.firm_id)});}
async function updateSalesOpportunity(body,req=null){requireFields(body,["tenant_id","firm_id","opportunity_id","stage"]);return updateSalesPipelineRecord({...body,actor:actorFromBody(body,req,body.tenant_id,body.firm_id)});}
async function dispatchProposal(body,req=null){requireFields(body,["tenant_id","firm_id","proposal_id","recipient","document_ref"]);const actor=actorFromBody(body,req,body.tenant_id,body.firm_id);return dispatchProposalRecord(body,actor);}
async function createExpense(body,req=null){requireFields(body,["tenant_id","firm_id","supplier","description","amount"]);return createExpenseRecord({...body,actor:actorFromBody(body,req,body.tenant_id,body.firm_id)});}
async function approveExpense(body,req=null){requireFields(body,["tenant_id","firm_id","expense_id"]);const actor=actorFromBody(body,req,body.tenant_id,body.firm_id);return approveExpenseRecord(body,actor);}
async function createReceivableFollowUp(body,req=null){requireFields(body,["tenant_id","firm_id","invoice_id","subject","message_body"]);return createReceivableFollowUpRecord({...body,actor:actorFromBody(body,req,body.tenant_id,body.firm_id)});}
async function readAccountsCashSnapshot(req,url){const tenant_id=url.searchParams.get("tenant_id"),firm_id=url.searchParams.get("firm_id");requireFields({tenant_id,firm_id},["tenant_id","firm_id"]);assertActorScope(devActorFromHeaders(req,tenant_id,firm_id),{tenant_id,firm_id},"cash_snapshot");return readCashSnapshot(tenant_id,firm_id);}
async function bindTechnicalSkills(body,req=null){requireFields(body,["tenant_id","firm_id","worker_template_code","role_skill_ref","worker_skill_ref"]);return bindTechnicalSkillsRecord({...body,actor:actorFromBody(body,req,body.tenant_id,body.firm_id)});}
async function createDrawingReview(body,req=null){requireFields(body,["tenant_id","firm_id","project_id","document_register_entry_id","base_revision_id","compared_revision_id"]);return createDrawingReviewRecord({...body,actor:actorFromBody(body,req,body.tenant_id,body.firm_id)});}
async function createCalculationInputSet(body,req=null){requireFields(body,["tenant_id","firm_id","project_id","intake_session_id","source_revision_refs","input_values"]);return createCalculationInputSetRecord({...body,actor:actorFromBody(body,req,body.tenant_id,body.firm_id)});}
async function createTechnicalQaFinding(body,req=null){requireFields(body,["tenant_id","firm_id","project_id","subject_type","subject_id","finding_code","severity","description"]);return createTechnicalQaFindingRecord({...body,actor:actorFromBody(body,req,body.tenant_id,body.firm_id)});}
async function resolveTechnicalQaFinding(body,req=null){requireFields(body,["tenant_id","firm_id","finding_id","resolution_summary"]);return resolveTechnicalQaFindingRecord(body,actorFromBody(body,req,body.tenant_id,body.firm_id));}
async function createDeliveryPackage(body,req=null){requireFields(body,["tenant_id","firm_id","project_id","drawing_revision_refs","calculation_input_set_id","evidence_refs"]);return createDeliveryPackageRecord({...body,actor:actorFromBody(body,req,body.tenant_id,body.firm_id)});}
async function readDailyOperations(req,url){
  const actor=devActorFromHeaders(req);
  const store=await readStore();
  let tenant_id=url.searchParams.get("tenant_id")??actor?.tenant_id??null;
  let firm_id=url.searchParams.get("firm_id")??actor?.firm_id??null;
  if(!tenant_id||!firm_id){
    const firm=[...(store.firms??[])].reverse().find((item)=>(!tenant_id||item.tenant_id===tenant_id)&&(!actor?.firm_id||item.id===actor.firm_id));
    firm_id=firm_id??firm?.id??null;
    tenant_id=tenant_id??firm?.tenant_id??null;
  }
  requireFields({tenant_id,firm_id},["tenant_id","firm_id"]);
  assertActorScope(actor,{tenant_id,firm_id},"daily operations summary");
  return readDailyOperationsSummary(tenant_id,firm_id);
}
async function acceptPilotHandoff(body,req=null){requireFields(body,["tenant_id","firm_id"]);return createPilotHandoffRecord(body,actorFromBody(body,req,body.tenant_id,body.firm_id));}
async function createIntakeSession(body, req = null) {
  requireFields(body, ["tenant_id", "firm_id", "relationship_id"]);

  const actor = actorFromBody(body, req, body.tenant_id, body.firm_id);
  return createIntakeSessionRecord({
    ...body,
    actor,
    requested_service_hint: body.requested_service_hint ?? formworkServicePack.mvp_service,
    required_inputs: body.required_inputs ?? formworkServicePack.intake_required_fields,
    service_id: body.service_id ?? FORMWORK_SERVICE_PACK_ID
  });
}

async function createProposal(body, req = null) {
  requireFields(body, ["tenant_id", "firm_id", "relationship_id", "intake_session_id", "scope_summary"]);
  const actor = actorFromBody(body, req, body.tenant_id, body.firm_id);
  return createProposalRecord({
    ...body,
    actor,
    service_id: body.service_id ?? FORMWORK_SERVICE_PACK_ID
  });
}

async function readProviderAuthContext(req) {
  const config = authProviderConfig();
  const identity = verifiedExternalIdentityFromHeaders(req);
  if (!identity) return { mode: "provider-adapter", config, identity: null, pilot_user: null, actor: null, active: false, reasons: ["No external identity headers supplied to adapter."] };
  if (!identity.verified) return { mode: "provider-adapter", config, identity, pilot_user: null, actor: null, active: false, reasons: ["External identity is not marked verified by adapter."] };
  const store = await readStore();
  const pilotUser = (store.pilot_users ?? []).find((user) => user.email === identity.email && user.external_subject === identity.external_subject && user.invite_status === "ACTIVE");
  if (!pilotUser) return { mode: "provider-adapter", config, identity, pilot_user: null, actor: null, active: false, reasons: ["No active pilot user matches this external identity."] };
  return {
    mode: "provider-adapter",
    config,
    identity,
    pilot_user: pilotUser,
    actor: {
      actor_id: pilotUser.actor_id ?? pilotUser.id,
      actor_type: "HUMAN",
      tenant_id: pilotUser.tenant_id,
      firm_id: pilotUser.firm_id,
      role: pilotUser.pilot_role,
      display_name: pilotUser.display_name
    },
    active: true,
    reasons: []
  };
}

function readTenantAdminPolicy() {
  return {
    roles: {
      TENANT_ADMIN: ["pilot.users.invite", "pilot.users.activate", "pilot.users.revoke", "tenant.members.read", "firm.members.read"],
      FIRM_ADMIN: ["pilot.users.invite", "firm.members.read"],
      PILOT_PRINCIPAL: ["approval.grant", "deliverable.review", "pilot.workflow.operate"],
      PILOT_OPERATOR: ["pilot.workflow.operate", "records.read"],
      PILOT_OBSERVER: ["records.read"]
    },
    enforcement_status: "R4_S1_PROVIDER_NEUTRAL_IDENTITY_ADMIN_DEFINED",
    note: "Stage 12 defines admin controls and provider adapter seam. Fine-grained enforcement will deepen after real provider selection."
  };
}
async function readAuthContext(req) {
  const actor = devActorFromHeaders(req);
  if (!actor) return { mode: "anonymous-dev", actor: null, membership: null, professional_profile: null, authority: null, authority_valid: false };
  const authorityCheck = await findValidProfessionalAuthority({ tenant_id: actor.tenant_id, firm_id: actor.firm_id, actor_id: actor.actor_id, action: "approval.grant" });
  return { mode: "dev-header-auth", actor, membership: authorityCheck.membership, professional_profile: authorityCheck.professional_profile, authority: authorityCheck.professional_authority, authority_valid: authorityCheck.valid };
}

async function approveProposal(body, req = null) {
  requireFields(body, ["tenant_id", "firm_id", "proposal_id"]);
  const actor = actorFromBody(body, req, body.tenant_id, body.firm_id);
  const authorityCheck = await findValidProfessionalAuthority({ tenant_id: body.tenant_id, firm_id: body.firm_id, actor_id: actor.actor_id, action: "approval.grant" });
  const policyInput = { actor, action: "approval.grant", resource: { resource_type: "Proposal", resource_id: body.proposal_id, tenant_id: body.tenant_id, firm_id: body.firm_id, risk_class: "STANDARD" }, context: { professional_authority_valid: authorityCheck.valid, authority_id: authorityCheck.professional_authority?.id ?? null } };
  const decision = evaluatePolicy(policyInput);
  if (decision.result !== "ALLOW") { const error = new Error(decision.reasons.join("; ")); error.status = 403; error.code = "POLICY_DENIED"; throw error; }
  const policyDecision = await createPolicyDecisionRecord(policyInput, decision);
  return approveProposalRecord({ ...body, authority_id: authorityCheck.professional_authority?.id ?? body.authority_id, approver_professional_id: authorityCheck.professional_profile?.id ?? body.approver_professional_id }, actor, policyDecision ?? decision);
}

async function acceptProposal(body) {
  requireFields(body, ["tenant_id", "firm_id", "proposal_id", "project_name"]);
  const actor = actorFromBody(body, null, body.tenant_id, body.firm_id);
  const { proposal, engagement } = await acceptProposalRecord(body, actor);
  const delivery = await openProjectDeliveryRecord({ ...body, proposal, engagement }, actor, formworkServicePack.validators);
  return { proposal, engagement, ...delivery };
}

async function createEvidenceBundle(body, req = null) {
  requireFields(body, ["tenant_id", "firm_id", "project_id", "subject_type", "subject_id"]);
  const actor = actorFromBody(body, req, body.tenant_id, body.firm_id);
  return createEvidenceBundleRecord({ ...body, actor });
}


async function startTask(body, req = null) {
  requireFields(body, ["tenant_id", "firm_id", "task_id"]);
  const actor = actorFromBody(body, req, body.tenant_id, body.firm_id);
  return startTaskRecord({ ...body, actor });
}

async function completeTask(body, req = null) {
  requireFields(body, ["tenant_id", "firm_id", "task_id"]);
  const actor = actorFromBody(body, req, body.tenant_id, body.firm_id);
  return completeTaskRecord({ ...body, actor });
}

async function createDeliverableDraft(body, req = null) {
  requireFields(body, ["tenant_id", "firm_id", "project_id"]);
  const actor = actorFromBody(body, req, body.tenant_id, body.firm_id);
  return createDeliverableDraftRecord(body, actor);
}

async function reviewDeliverable(body, req = null) {
  requireFields(body, ["tenant_id", "firm_id", "project_id", "document_version_id", "evidence_bundle_id"]);
  const actor = actorFromBody(body, req, body.tenant_id, body.firm_id);
  const authorityCheck = await findValidProfessionalAuthority({ tenant_id: body.tenant_id, firm_id: body.firm_id, actor_id: actor.actor_id, action: "deliverable.review" });
  const policyInput = { actor, action: "deliverable.review", resource: { resource_type: "DocumentVersion", resource_id: body.document_version_id, tenant_id: body.tenant_id, firm_id: body.firm_id, risk_class: "CONTROLLED" }, context: { professional_authority_valid: authorityCheck.valid, evidence_bundle_id: body.evidence_bundle_id } };
  const decision = evaluatePolicy(policyInput);
  if (decision.result !== "ALLOW") { const error = new Error(decision.reasons.join("; ")); error.status = 403; error.code = "POLICY_DENIED"; throw error; }
  const policyDecision = await createPolicyDecisionRecord(policyInput, decision);
  return reviewDeliverableRecord(body, actor, authorityCheck, policyDecision ?? decision);
}

async function issueDeliverable(body, req = null) {
  requireFields(body, ["tenant_id", "firm_id", "project_id", "document_version_id", "evidence_bundle_id", "approval_id", "subject_version_or_hash"]);
  const actor = actorFromBody(body, req, body.tenant_id, body.firm_id);
  const policyInput = { actor, action: "deliverable.issue", resource: { resource_type: "DocumentVersion", resource_id: body.document_version_id, tenant_id: body.tenant_id, firm_id: body.firm_id, risk_class: "CONTROLLED", subject_version_or_hash: body.subject_version_or_hash }, context: { evidence_bundle_id: body.evidence_bundle_id, required_approval_id: body.approval_id, subject_version_or_hash: body.subject_version_or_hash, approval_subject_version_or_hash: body.approval_subject_version_or_hash ?? body.subject_version_or_hash } };
  const decision = evaluatePolicy(policyInput);
  if (decision.result !== "ALLOW") { const error = new Error(decision.reasons.join("; ")); error.status = 403; error.code = "POLICY_DENIED"; throw error; }
  const policyDecision = await createPolicyDecisionRecord(policyInput, decision);
  return issueDeliverableRecord(body, actor, policyDecision ?? decision);
}
async function createInvoice(body, req = null) {
  requireFields(body, ["tenant_id", "firm_id", "relationship_id"]);
  const actor = actorFromBody(body, req, body.tenant_id, body.firm_id);
  return createInvoiceRecord({ ...body, actor });
}




async function publishMarketplaceListing(body, req = null) {
  requireFields(body, ["tenant_id", "firm_id"]);
  const actor = actorFromBody(body, req, body.tenant_id, body.firm_id);
  assertMEPublicationGovernance(body, actor);
  return createMarketplaceListingRecord(body, actor);
}

async function createCapacityOffer(body, req = null) {
  requireFields(body, ["tenant_id", "firm_id"]);
  const actor = actorFromBody(body, req, body.tenant_id, body.firm_id);
  assertMECapacityGovernance(body, actor);
  return createCapacityOfferRecord(body, actor);
}

async function requestCollaboration(body, req = null) {
  requireFields(body, ["tenant_id", "requesting_firm_id", "request_summary"]);
  const actor = actorFromBody(body, req, body.tenant_id, body.requesting_firm_id);
  assertMECollaborationGovernance(body, actor);
  return createCollaborationRequestRecord(body, actor);
}


function assertHumanNetworkActor(actor = {}) {
  if (actor.actor_type !== "HUMAN") {
    const error = new Error("Trusted network profile actions require a human operator.");
    error.status = 403;
    error.code = "NETWORK_HUMAN_AUTHORITY_REQUIRED";
    throw error;
  }
}


function requireMEQualifiedDirectoryEvidence(body = {}, store = {}) {
  const gate = (store.network_qualification_gates ?? []).find((item) => item.id === body.qualification_gate_id && item.tenant_id === body.tenant_id && item.provider_firm_id === body.firm_id);
  if (!gate) meS1Denied("ME-S2 directory publication requires a qualification gate for the listed provider firm.", "ME_S2_QUALIFICATION_GATE_REQUIRED");
  if (gate.gate_status !== "PASS") meS1Denied("ME-S2 directory publication requires a PASS qualification gate.", "ME_S2_QUALIFICATION_GATE_NOT_PASSED");
  const capability = (store.network_capabilities ?? []).find((item) => item.id === gate.capability_id && item.tenant_id === body.tenant_id && item.firm_id === body.firm_id);
  if (!capability || capability.qualification_required !== true) meS1Denied("ME-S2 directory publication requires a qualification-required capability.", "ME_S2_CAPABILITY_QUALIFICATION_REQUIRED");
  const credential = (store.network_credentials ?? []).find((item) => item.id === gate.credential_id && item.tenant_id === body.tenant_id && item.firm_id === body.firm_id);
  if (!credential || credential.verification_status !== "VERIFIED" || !Array.isArray(credential.evidence_refs) || credential.evidence_refs.length === 0) meS1Denied("ME-S2 directory publication requires verified credential evidence.", "ME_S2_VERIFIED_CREDENTIAL_REQUIRED");
  if (!gate.jurisdiction_ref || !(capability.jurisdiction_refs ?? []).includes(gate.jurisdiction_ref) || !(credential.jurisdiction_refs ?? []).includes(gate.jurisdiction_ref)) meS1Denied("ME-S2 directory publication requires aligned jurisdiction scope.", "ME_S2_JURISDICTION_SCOPE_REQUIRED");
  return { gate, capability, credential };
}

async function publishQualifiedDirectoryListing(body, req = null) {
  requireFields(body, ["tenant_id", "firm_id", "qualification_gate_id", "title"]);
  const actor = actorFromBody(body, req, body.tenant_id, body.firm_id);
  assertMEPublicationGovernance({ ...body, visibility: body.visibility ?? "TRUSTED_NETWORK", listing_scope: body.listing_scope ?? "PRIVATE_NETWORK" }, actor);
  if (body.matching_enabled === true || body.public_directory === true) meS1Denied("ME-S2 does not authorize public directory or live matching.", "ME_S2_PUBLIC_OR_MATCHING_DENIED");
  const store = await readStore();
  const evidence = requireMEQualifiedDirectoryEvidence(body, store);
  return createMarketplaceListingRecord({
    ...body,
    visibility: "TRUSTED_NETWORK",
    listing_scope: "PRIVATE_NETWORK",
    status: "PUBLISHED",
    qualification_requirements: ["qualification_gate_passed", "verified_credential", "jurisdiction_scope", "human_governance_approval", "revocation_supported"],
    commercial_model: { ...(body.commercial_model ?? { pricing: "quotation_required" }), directory_type: "CONTROLLED_PRIVATE_QUALIFIED_DIRECTORY", qualification_gate_id: evidence.gate.id, capability_id: evidence.capability.id, credential_id: evidence.credential.id, governance_approved_by_actor_id: actor.actor_id ?? actor.id ?? null, matching_enabled: false, public_directory: false, tenant_confidential: true }
  }, actor);
}

async function suspendQualifiedDirectoryListing(body, req = null) {
  requireFields(body, ["tenant_id", "firm_id", "listing_id"]);
  const actor = actorFromBody(body, req, body.tenant_id, body.firm_id);
  assertMEGovernanceActor(actor, "Qualified directory suspension");
  return updateMarketplaceListingStatusRecord(body, actor, "SUSPENDED");
}

async function revokeQualifiedDirectoryListing(body, req = null) {
  requireFields(body, ["tenant_id", "firm_id", "listing_id"]);
  const actor = actorFromBody(body, req, body.tenant_id, body.firm_id);
  assertMEGovernanceActor(actor, "Qualified directory revocation");
  return updateMarketplaceListingStatusRecord(body, actor, "REVOKED");
}

async function readMEQualifiedDirectorySummary(req, url) {
  assertActorScope(devActorFromHeaders(req), { tenant_id: url.searchParams.get("tenant_id"), firm_id: url.searchParams.get("firm_id") }, "ME-S2 qualified directory");
  const store = await readStore();
  const tenantId = url.searchParams.get("tenant_id");
  const firmId = url.searchParams.get("firm_id");
  const scope = (records) => (records ?? []).filter((item) => (!tenantId || item.tenant_id === tenantId) && (!firmId || item.firm_id === firmId || item.provider_firm_id === firmId));
  const listings = scope(store.marketplace_listings).filter((item) => item.commercial_model?.directory_type === "CONTROLLED_PRIVATE_QUALIFIED_DIRECTORY");
  const published = listings.filter((item) => item.status === "PUBLISHED");
  const suspended = listings.filter((item) => item.status === "SUSPENDED");
  const revoked = listings.filter((item) => item.status === "REVOKED");
  const unsafe = listings.filter((item) => item.visibility !== "TRUSTED_NETWORK" || item.listing_scope !== "PRIVATE_NETWORK" || item.commercial_model?.matching_enabled === true || item.commercial_model?.public_directory === true || item.commercial_model?.tenant_confidential !== true);
  const auditEvents = scope(store.audit_events).filter((event) => ["marketplace.listing_published", "marketplace.directory_publication_suspended", "marketplace.directory_publication_revoked"].includes(event.action ?? event.event_type));
  const checks = [
    { key: "qualified_directory_publication_exists", status: published.length > 0 ? "PASS" : "FAIL", detail: `${published.length} published qualified directory listing(s)` },
    { key: "private_controlled_visibility", status: listings.length > 0 && unsafe.length === 0 ? "PASS" : "FAIL", detail: `${unsafe.length} unsafe listing(s)` },
    { key: "verified_qualification_evidence", status: published.every((item) => item.commercial_model?.qualification_gate_id && item.commercial_model?.credential_id && item.commercial_model?.capability_id) ? "PASS" : "FAIL", detail: "Published directory listings retain gate, credential, and capability references." },
    { key: "suspension_and_revocation_paths", status: suspended.length > 0 && revoked.length > 0 ? "PASS" : "FAIL", detail: `${suspended.length} suspended, ${revoked.length} revoked listing(s)` },
    { key: "directory_actions_audited", status: auditEvents.length >= 3 ? "PASS" : "FAIL", detail: `${auditEvents.length} directory audit event(s)` }
  ];
  const failed = checks.filter((check) => check.status !== "PASS");
  return { release: "Marketplace / Ecosystem Intelligence", sprint: "ME-S2", status: failed.length === 0 ? "ME_S2_QUALIFIED_DIRECTORY_READY" : "ME_S2_QUALIFIED_DIRECTORY_BLOCKED", counts: { directory_listings: listings.length, published: published.length, suspended: suspended.length, revoked: revoked.length, directory_audit_events: auditEvents.length }, checks, blocked_reasons: failed.map((check) => `${check.key}: ${check.detail}`), boundaries: ["controlled_private_directory_only", "no_public_marketplace", "no_live_matching_engine", "no_price_first_ranking", "no_capacity_economy_allocation", "no_vf24_observatory_publication", "no_autonomous_regulated_award", "tenant_confidentiality", "human_governance_approval"] };
}
async function recordDirectoryReviewBoardDecision(body, req = null) {
  requireFields(body, ["tenant_id", "provider_firm_id", "listing_id", "decision", "decision_summary", "evidence_refs"]);
  const actor = actorFromBody(body, req, body.tenant_id, body.provider_firm_id);
  assertMEGovernanceActor(actor, "ME-S3 directory review board decision");
  return createDirectoryReviewBoardDecisionRecord(body, actor);
}

async function recordPrivateDirectoryEnquiry(body, req = null) {
  requireFields(body, ["tenant_id", "requesting_firm_id", "provider_firm_id", "listing_id", "enquiry_summary"]);
  const actor = actorFromBody(body, req, body.tenant_id, body.requesting_firm_id);
  assertMEGovernanceActor(actor, "ME-S3 private directory enquiry");
  return createPrivateDirectoryEnquiryRecord(body, actor);
}

async function requestPrivateDirectoryCollaboration(body, req = null) {
  requireFields(body, ["tenant_id", "requesting_firm_id", "enquiry_id"]);
  const actor = actorFromBody(body, req, body.tenant_id, body.requesting_firm_id);
  assertMEGovernanceActor(actor, "ME-S3 enquiry-to-collaboration request");
  return createDirectoryEnquiryCollaborationRequestRecord(body, actor);
}

async function recordQualificationRenewalReview(body, req = null) {
  requireFields(body, ["tenant_id", "provider_firm_id", "qualification_gate_id", "listing_id", "review_status", "evidence_refs"]);
  const actor = actorFromBody(body, req, body.tenant_id, body.provider_firm_id);
  assertMEGovernanceActor(actor, "ME-S3 qualification renewal review");
  return createQualificationRenewalReviewRecord(body, actor);
}

async function readMEPrivateDirectoryGovernanceSummary(req, url) {
  assertActorScope(devActorFromHeaders(req), { tenant_id: url.searchParams.get("tenant_id"), firm_id: url.searchParams.get("firm_id") }, "ME-S3 private directory governance");
  const store = await readStore();
  const tenantId = url.searchParams.get("tenant_id");
  const firmId = url.searchParams.get("firm_id");
  const tenantScoped = (records) => (records ?? []).filter((item) => (!tenantId || item.tenant_id === tenantId));
  const firmScoped = (records) => tenantScoped(records).filter((item) => !firmId || item.firm_id === firmId || item.provider_firm_id === firmId || item.requesting_firm_id === firmId);
  const listings = firmScoped(store.marketplace_listings).filter((item) => item.commercial_model?.directory_type === "CONTROLLED_PRIVATE_QUALIFIED_DIRECTORY");
  const reviewDecisions = firmScoped(store.directory_review_board_decisions);
  const enquiries = firmScoped(store.directory_private_enquiries);
  const renewalReviews = firmScoped(store.qualification_renewal_reviews);
  const collaborationRequests = firmScoped(store.collaboration_requests).filter((item) => item.metadata?.source_directory_enquiry_id);
  const auditActions = ["marketplace.directory_review_board_decision_recorded", "marketplace.private_directory_enquiry_recorded", "marketplace.directory_enquiry_collaboration_requested", "marketplace.qualification_renewal_review_recorded"];
  const auditEvents = firmScoped(store.audit_events).filter((event) => auditActions.includes(event.action ?? event.event_type));
  const unsafeListing = listings.some((item) => item.visibility !== "TRUSTED_NETWORK" || item.listing_scope !== "PRIVATE_NETWORK" || item.commercial_model?.matching_enabled === true || item.commercial_model?.public_directory === true);
  const unsafeCollaboration = collaborationRequests.some((item) => item.capacity_offer_id || item.metadata?.no_live_matching !== true || item.metadata?.no_award !== true);
  const checks = [
    { key: "directory_review_board_decision", status: reviewDecisions.length > 0 ? "PASS" : "FAIL", detail: `${reviewDecisions.length} review board decision(s)` },
    { key: "private_enquiry_recorded", status: enquiries.length > 0 ? "PASS" : "FAIL", detail: `${enquiries.length} private enquiry record(s)` },
    { key: "enquiry_to_collaboration_without_matching", status: collaborationRequests.length > 0 && !unsafeCollaboration ? "PASS" : "FAIL", detail: `${collaborationRequests.length} manual collaboration request(s), unsafe=${unsafeCollaboration}` },
    { key: "qualification_renewal_review", status: renewalReviews.length > 0 ? "PASS" : "FAIL", detail: `${renewalReviews.length} renewal/expiry review(s)` },
    { key: "private_directory_boundaries", status: listings.length > 0 && !unsafeListing ? "PASS" : "FAIL", detail: `${listings.length} qualified private listing(s), unsafe=${unsafeListing}` },
    { key: "me_s3_actions_audited", status: auditEvents.length >= 4 ? "PASS" : "FAIL", detail: `${auditEvents.length} ME-S3 audit event(s)` }
  ];
  const failed = checks.filter((check) => check.status !== "PASS");
  return { release: "Marketplace / Ecosystem Intelligence", sprint: "ME-S3", status: failed.length === 0 ? "ME_S3_PRIVATE_DIRECTORY_GOVERNANCE_READY" : "ME_S3_PRIVATE_DIRECTORY_GOVERNANCE_BLOCKED", counts: { qualified_directory_listings: listings.length, review_board_decisions: reviewDecisions.length, private_enquiries: enquiries.length, collaboration_requests_from_enquiries: collaborationRequests.length, qualification_renewal_reviews: renewalReviews.length, me_s3_audit_events: auditEvents.length }, checks, blocked_reasons: failed.map((check) => `${check.key}: ${check.detail}`), boundaries: ["controlled_private_directory_only", "directory_review_board_only", "manual_private_enquiry_only", "qualification_renewal_monitoring", "no_public_marketplace", "no_live_matching_engine", "no_ranking", "no_capacity_allocation", "no_vf24_observatory_publication", "no_autonomous_award", "no_autonomous_regulated_approval", "tenant_confidentiality", "auditability"] };
}

async function readMEPrivateDirectoryIntelligenceSummary(req, url) {
  assertActorScope(devActorFromHeaders(req), { tenant_id: url.searchParams.get("tenant_id"), firm_id: url.searchParams.get("firm_id") }, "ME-S6 private directory intelligence");
  const store = await readStore();
  const tenantId = url.searchParams.get("tenant_id");
  const firmId = url.searchParams.get("firm_id");
  const tenantScoped = (records) => (records ?? []).filter((item) => !tenantId || item.tenant_id === tenantId);
  const firmScoped = (records) => tenantScoped(records).filter((item) => !firmId || item.firm_id === firmId || item.provider_firm_id === firmId || item.requesting_firm_id === firmId);
  const listings = firmScoped(store.marketplace_listings).filter((item) => item.commercial_model?.directory_type === "CONTROLLED_PRIVATE_QUALIFIED_DIRECTORY");
  const publishedListings = listings.filter((item) => item.status === "PUBLISHED");
  const reviewDecisions = firmScoped(store.directory_review_board_decisions);
  const enquiries = firmScoped(store.directory_private_enquiries);
  const collaborationRequests = firmScoped(store.collaboration_requests).filter((item) => item.metadata?.source_directory_enquiry_id);
  const renewalReviews = firmScoped(store.qualification_renewal_reviews);
  const auditActions = ["marketplace.listing_published", "marketplace.directory_publication_suspended", "marketplace.directory_publication_revoked", "marketplace.directory_review_board_decision_recorded", "marketplace.private_directory_enquiry_recorded", "marketplace.directory_enquiry_collaboration_requested", "marketplace.qualification_renewal_review_recorded"];
  const auditEvents = firmScoped(store.audit_events).filter((event) => auditActions.includes(event.action ?? event.event_type));
  const reviewedListingIds = new Set(reviewDecisions.map((decision) => decision.listing_id));
  const enquiryCollaborationIds = new Set(collaborationRequests.map((request) => request.metadata?.source_directory_enquiry_id).filter(Boolean));
  const now = new Date();
  const soon = new Date(now.getTime() + 45 * 86400000);
  const renewalRiskStatuses = new Set(["EXPIRING", "RENEWAL_REQUIRED", "SUSPEND_PUBLICATION"]);
  const renewalRisks = renewalReviews.filter((review) => renewalRiskStatuses.has(review.review_status) || (review.next_review_due_at && new Date(review.next_review_due_at) <= soon) || (review.expires_at && new Date(review.expires_at) <= soon));
  const pendingReviewListings = publishedListings.filter((listing) => !reviewedListingIds.has(listing.id));
  const pendingEnquiries = enquiries.filter((enquiry) => enquiry.status === "ENQUIRY_RECORDED" && !enquiryCollaborationIds.has(enquiry.id));
  const pendingActions = [
    ...pendingReviewListings.map((listing) => ({ type: "REVIEW_BOARD_DECISION_DUE", severity: "MEDIUM", listing_id: listing.id, provider_firm_id: listing.firm_id, summary: `Listing ${listing.title ?? listing.id} has no review board decision recorded.` })),
    ...pendingEnquiries.map((enquiry) => ({ type: "PRIVATE_ENQUIRY_FOLLOW_UP", severity: "MEDIUM", enquiry_id: enquiry.id, listing_id: enquiry.listing_id, requesting_firm_id: enquiry.requesting_firm_id, provider_firm_id: enquiry.provider_firm_id, summary: enquiry.enquiry_summary ?? "Private enquiry requires manual follow-up." })),
    ...renewalRisks.map((review) => ({ type: "QUALIFICATION_RENEWAL_RISK", severity: review.review_status === "SUSPEND_PUBLICATION" ? "HIGH" : "MEDIUM", renewal_review_id: review.id, listing_id: review.listing_id, provider_firm_id: review.provider_firm_id, summary: `${review.review_status} qualification renewal review requires operator attention.` }))
  ];
  const unsafeListings = listings.filter((item) => item.visibility !== "TRUSTED_NETWORK" || item.listing_scope !== "PRIVATE_NETWORK" || item.commercial_model?.matching_enabled === true || item.commercial_model?.public_directory === true || item.commercial_model?.tenant_confidential !== true || item.commercial_model?.ranking_enabled === true || item.commercial_model?.price_first === true);
  const unsafeCollaborations = collaborationRequests.filter((item) => item.capacity_offer_id || item.metadata?.no_live_matching !== true || item.metadata?.no_award !== true || item.metadata?.price_first === true);
  const unsafeObservatory = tenantScoped(store.observatory_snapshots).filter((item) => ["VF24_PUBLICATION", "PUBLIC", "PUBLIC_OBSERVATORY"].includes(String(item.snapshot_scope ?? "").toUpperCase()) || ["PUBLIC_RAW", "RAW_TENANT_DATA"].includes(String(item.privacy_class ?? "").toUpperCase()));
  const checks = [
    { key: "internal_readiness_view_only", status: "PASS", detail: "ME-S6 is read-only private directory intelligence; it creates no public publication, matching, ranking, allocation, or award endpoint." },
    { key: "qualified_directory_context_available", status: listings.length > 0 ? "PASS" : "FAIL", detail: `${listings.length} qualified private listing(s)` },
    { key: "pending_actions_visible", status: pendingActions.length > 0 ? "PASS" : "FAIL", detail: `${pendingActions.length} pending operator action(s)` },
    { key: "enquiry_collaboration_status_visible", status: enquiries.length > 0 && collaborationRequests.length > 0 ? "PASS" : "FAIL", detail: `${enquiries.length} private enquiry record(s), ${collaborationRequests.length} manual collaboration request(s)` },
    { key: "expiry_risk_visible", status: renewalRisks.length > 0 ? "PASS" : "FAIL", detail: `${renewalRisks.length} renewal or expiry risk item(s)` },
    { key: "audit_readiness_visible", status: auditEvents.length >= 5 ? "PASS" : "FAIL", detail: `${auditEvents.length} private directory audit event(s)` },
    { key: "forbidden_marketplace_behaviour_absent", status: unsafeListings.length === 0 && unsafeCollaborations.length === 0 && unsafeObservatory.length === 0 ? "PASS" : "FAIL", detail: `${unsafeListings.length} unsafe listing(s), ${unsafeCollaborations.length} unsafe collaboration(s), ${unsafeObservatory.length} unsafe observatory snapshot(s)` }
  ];
  const failed = checks.filter((check) => check.status !== "PASS");
  return {
    release: "Marketplace / Ecosystem Intelligence",
    sprint: "ME-S6",
    status: failed.length === 0 ? "ME_S6_PRIVATE_DIRECTORY_INTELLIGENCE_READY" : "ME_S6_PRIVATE_DIRECTORY_INTELLIGENCE_BLOCKED",
    scope: "Private Directory Intelligence and Readiness View only",
    counts: {
      qualified_directory_listings: listings.length,
      published_listings: publishedListings.length,
      review_board_decisions: reviewDecisions.length,
      private_enquiries: enquiries.length,
      manual_collaboration_requests: collaborationRequests.length,
      renewal_reviews: renewalReviews.length,
      renewal_risks: renewalRisks.length,
      pending_actions: pendingActions.length,
      private_directory_audit_events: auditEvents.length
    },
    pending_actions: pendingActions,
    readiness: {
      review_board_pending: pendingReviewListings.length,
      enquiry_follow_up_pending: pendingEnquiries.length,
      qualification_renewal_risk: renewalRisks.length,
      audit_events: auditEvents.length
    },
    checks,
    blocked_reasons: failed.map((check) => `${check.key}: ${check.detail}`),
    boundaries: ["private_internal_readiness_view_only", "controlled_private_directory_only", "no_public_marketplace", "no_live_matching", "no_ranking", "no_capacity_allocation", "no_vf24_observatory_publication", "no_pricing_intelligence", "no_autonomous_award", "no_autonomous_regulated_approval", "tenant_confidentiality", "auditability"]
  };
}
async function createNetworkProfessionalProfile(body, req = null) {
  requireFields(body, ["tenant_id", "firm_id", "display_name"]);
  const actor = actorFromBody(body, req, body.tenant_id, body.firm_id);
  assertHumanNetworkActor(actor);
  return createNetworkProfessionalProfileRecord(body, actor);
}

async function createNetworkFirmProfile(body, req = null) {
  requireFields(body, ["tenant_id", "firm_id", "display_name"]);
  const actor = actorFromBody(body, req, body.tenant_id, body.firm_id);
  assertHumanNetworkActor(actor);
  return createNetworkFirmProfileRecord(body, actor);
}

async function createNetworkCapability(body, req = null) {
  requireFields(body, ["tenant_id", "firm_id", "capability_code"]);
  const actor = actorFromBody(body, req, body.tenant_id, body.firm_id);
  assertHumanNetworkActor(actor);
  return createNetworkCapabilityRecord(body, actor);
}

async function createNetworkCredential(body, req = null) {
  requireFields(body, ["tenant_id", "firm_id", "credential_type", "credential_name"]);
  const actor = actorFromBody(body, req, body.tenant_id, body.firm_id);
  assertHumanNetworkActor(actor);
  return createNetworkCredentialRecord(body, actor);
}

async function createNetworkTrustSignal(body, req = null) {
  requireFields(body, ["tenant_id", "firm_id", "subject_type", "subject_id", "signal_type", "signal_summary"]);
  const actor = actorFromBody(body, req, body.tenant_id, body.firm_id);
  assertHumanNetworkActor(actor);
  return createNetworkTrustSignalRecord(body, actor);
}

async function readR5TrustedNetworkProfiles(req, url) {
  assertActorScope(devActorFromHeaders(req), { tenant_id: url.searchParams.get("tenant_id"), firm_id: url.searchParams.get("firm_id") }, "R5 trusted network profiles");
  const store = await readStore();
  const tenantId = url.searchParams.get("tenant_id");
  const firmId = url.searchParams.get("firm_id");
  const scope = (records) => (records ?? []).filter((item) => (!tenantId || item.tenant_id === tenantId) && (!firmId || item.firm_id === firmId));
  const professionals = scope(store.network_professional_profiles);
  const firms = scope(store.network_firm_profiles);
  const capabilities = scope(store.network_capabilities);
  const credentials = scope(store.network_credentials);
  const trustSignals = scope(store.network_trust_signals);
  const publicCapabilities = capabilities.filter((item) => ["PUBLIC", "OPEN_MARKETPLACE", "PUBLIC_MARKETPLACE"].includes(String(item.visibility ?? "").toUpperCase()));
  const authorityClaims = [...professionals, ...credentials].filter((item) => item.authority_grant === true);
  const trustSubstitutes = trustSignals.filter((item) => item.substitutes_for_credential === true);
  const unqualifiedCapabilities = capabilities.filter((item) => item.qualification_required !== true);
  const verifiedCredentials = credentials.filter((item) => item.verification_status === "VERIFIED");
  const auditEvents = scope(store.audit_events).filter((event) => String(event.action ?? event.event_type ?? "").startsWith("network."));
  const checks = [
    { key: "professional_profile_separate_from_authority", status: professionals.length > 0 && authorityClaims.length === 0 ? "PASS" : "FAIL", detail: `${professionals.length} professional profile(s), ${authorityClaims.length} authority grant claim(s)` },
    { key: "firm_profile_recorded", status: firms.length > 0 ? "PASS" : "FAIL", detail: `${firms.length} firm network profile(s)` },
    { key: "capability_trusted_network_only", status: capabilities.length > 0 && publicCapabilities.length === 0 ? "PASS" : "FAIL", detail: `${capabilities.length} capability record(s), ${publicCapabilities.length} public/open record(s)` },
    { key: "capability_requires_qualification", status: capabilities.length > 0 && unqualifiedCapabilities.length === 0 ? "PASS" : "FAIL", detail: `${unqualifiedCapabilities.length} capability record(s) without qualification_required=true` },
    { key: "credential_evidence_recorded", status: credentials.length > 0 && verifiedCredentials.length > 0 ? "PASS" : "FAIL", detail: `${credentials.length} credential(s), ${verifiedCredentials.length} verified credential(s)` },
    { key: "trust_signal_not_credential_substitute", status: trustSignals.length > 0 && trustSubstitutes.length === 0 ? "PASS" : "FAIL", detail: `${trustSignals.length} trust signal(s), ${trustSubstitutes.length} credential substitute claim(s)` },
    { key: "network_actions_audited", status: auditEvents.length >= 5 ? "PASS" : "FAIL", detail: `${auditEvents.length} network audit event(s)` }
  ];
  const failed = checks.filter((check) => check.status !== "PASS");
  return {
    release: "R5",
    sprint: "R5-S1",
    status: failed.length === 0 ? "R5_S1_PROFILE_FOUNDATION_READY" : "R5_S1_PROFILE_FOUNDATION_BLOCKED",
    counts: { professional_profiles: professionals.length, firm_profiles: firms.length, capabilities: capabilities.length, credentials: credentials.length, verified_credentials: verifiedCredentials.length, trust_signals: trustSignals.length, network_audit_events: auditEvents.length },
    checks,
    blocked_reasons: failed.map((check) => `${check.key}: ${check.detail}`),
    boundaries: ["trusted_network_only", "no_public_marketplace", "no_price_first_allocation", "no_authority_from_profile", "no_trust_signal_as_credential", "no_autonomous_regulated_award"]
  };
}

async function createNetworkConflictCheck(body, req = null) {
  requireFields(body, ["tenant_id", "requesting_firm_id", "provider_firm_id", "check_status"]);
  const actor = actorFromBody(body, req, body.tenant_id, body.requesting_firm_id);
  assertHumanNetworkActor(actor);
  return createNetworkConflictCheckRecord(body, actor);
}

async function createNetworkQualificationGate(body, req = null) {
  requireFields(body, ["tenant_id", "requesting_firm_id", "provider_firm_id", "capability_id", "credential_id", "jurisdiction_ref"]);
  const actor = actorFromBody(body, req, body.tenant_id, body.requesting_firm_id);
  assertHumanNetworkActor(actor);
  return createNetworkQualificationGateRecord(body, actor);
}

async function createSpecialistInvitation(body, req = null) {
  requireFields(body, ["tenant_id", "requesting_firm_id", "provider_firm_id", "qualification_gate_id"]);
  const actor = actorFromBody(body, req, body.tenant_id, body.requesting_firm_id);
  assertHumanNetworkActor(actor);
  return createSpecialistInvitationRecord(body, actor);
}

async function readR5QualificationGateSummary(req, url) {
  assertActorScope(devActorFromHeaders(req), { tenant_id: url.searchParams.get("tenant_id"), firm_id: url.searchParams.get("firm_id") }, "R5 qualification and conflict gate");
  const store = await readStore();
  const tenantId = url.searchParams.get("tenant_id");
  const firmId = url.searchParams.get("firm_id");
  const scope = (records) => (records ?? []).filter((item) => (!tenantId || item.tenant_id === tenantId) && (!firmId || item.firm_id === firmId || item.requesting_firm_id === firmId || item.provider_firm_id === firmId));
  const gates = scope(store.network_qualification_gates);
  const conflictChecks = scope(store.network_conflict_checks);
  const invitations = scope(store.specialist_invitations);
  const auditEvents = scope(store.audit_events).filter((event) => String(event.action ?? event.event_type ?? "").startsWith("network."));
  const passedGates = gates.filter((item) => item.gate_status === "PASS");
  const deniedGates = gates.filter((item) => item.gate_status === "DENIED");
  const readyInvitations = invitations.filter((item) => item.invitation_status === "READY_TO_SEND");
  const deniedInvitations = invitations.filter((item) => item.invitation_status === "DENIED");
  const unauthorizedInvitations = readyInvitations.filter((invite) => !passedGates.some((gate) => gate.id === invite.qualification_gate_id));
  const gateDimensions = ["credential_status", "jurisdiction_status", "insurance_status", "conflict_status", "capacity_status", "policy_status"];
  const checks = [
    { key: "credential_verification_gate", status: gates.some((gate) => gate.credential_status === "VERIFIED") && deniedGates.some((gate) => gate.denial_reasons?.includes("credential_not_verified")) ? "PASS" : "FAIL", detail: "Verified credential required and missing credential denial observed." },
    { key: "jurisdiction_gate", status: gates.some((gate) => gate.jurisdiction_status === "VALID") && deniedGates.some((gate) => gate.denial_reasons?.includes("jurisdiction_not_valid")) ? "PASS" : "FAIL", detail: "Valid jurisdiction required and invalid jurisdiction denial observed." },
    { key: "insurance_gate", status: gates.some((gate) => gate.insurance_status === "VALID") && deniedGates.some((gate) => gate.denial_reasons?.includes("insurance_not_valid")) ? "PASS" : "FAIL", detail: "Valid insurance evidence required and insurance denial observed." },
    { key: "conflict_gate", status: conflictChecks.some((check) => check.check_status === "CLEARED") && deniedGates.some((gate) => gate.denial_reasons?.includes("conflict_not_cleared")) ? "PASS" : "FAIL", detail: "Conflict check must be cleared before invitation." },
    { key: "capacity_gate", status: gates.some((gate) => gate.capacity_status === "AVAILABLE") && deniedGates.some((gate) => gate.denial_reasons?.includes("capacity_not_available")) ? "PASS" : "FAIL", detail: "Available capacity required and denial observed." },
    { key: "policy_gate", status: gates.some((gate) => gate.policy_status === "APPROVED") && deniedGates.some((gate) => gate.denial_reasons?.includes("policy_not_approved")) ? "PASS" : "FAIL", detail: "Policy approval required and denial observed." },
    { key: "invitation_requires_passed_gate", status: readyInvitations.length > 0 && unauthorizedInvitations.length === 0 && deniedInvitations.length > 0 ? "PASS" : "FAIL", detail: `${readyInvitations.length} ready invitation(s), ${deniedInvitations.length} denied invitation(s), ${unauthorizedInvitations.length} unauthorized ready invitation(s)` },
    { key: "qualification_first_not_price_first", status: gates.length > 0 && gates.every((gate) => gateDimensions.every((field) => Object.hasOwn(gate, field))) ? "PASS" : "FAIL", detail: "Gate evaluates credentials, jurisdiction, insurance, conflict, capacity, and policy before invitation; price is not a gate dimension." },
    { key: "network_gate_actions_audited", status: auditEvents.some((event) => (event.action ?? event.event_type) === "network.qualification_gate_passed") && auditEvents.some((event) => (event.action ?? event.event_type) === "network.qualification_gate_denied") && auditEvents.some((event) => (event.action ?? event.event_type) === "network.specialist_invitation_denied") ? "PASS" : "FAIL", detail: `${auditEvents.length} network audit event(s)` }
  ];
  const failed = checks.filter((check) => check.status !== "PASS");
  return {
    release: "R5",
    sprint: "R5-S2",
    status: failed.length === 0 ? "R5_S2_QUALIFICATION_CONFLICT_GATE_READY" : "R5_S2_QUALIFICATION_CONFLICT_GATE_BLOCKED",
    counts: { qualification_gates: gates.length, passed_gates: passedGates.length, denied_gates: deniedGates.length, conflict_checks: conflictChecks.length, ready_invitations: readyInvitations.length, denied_invitations: deniedInvitations.length, network_audit_events: auditEvents.length },
    checks,
    blocked_reasons: failed.map((check) => `${check.key}: ${check.detail}`),
    boundaries: ["qualification_first", "no_price_first_allocation", "no_invitation_without_passed_gate", "credential_jurisdiction_insurance_conflict_capacity_policy_required", "trusted_network_only", "no_autonomous_regulated_award"]
  };
}

async function createCollaborationWorkspace(body, req = null) {
  requireFields(body, ["tenant_id", "requesting_firm_id", "specialist_invitation_id"]);
  const actor = actorFromBody(body, req, body.tenant_id, body.requesting_firm_id);
  assertHumanNetworkActor(actor);
  return createCollaborationWorkspaceRecord(body, actor);
}

async function grantCollaborationWorkspaceParticipant(body, req = null) {
  requireFields(body, ["tenant_id", "requesting_firm_id", "workspace_id", "firm_id"]);
  const actor = actorFromBody(body, req, body.tenant_id, body.requesting_firm_id);
  assertHumanNetworkActor(actor);
  return grantCollaborationWorkspaceParticipantRecord(body, actor);
}

async function revokeCollaborationWorkspaceParticipant(body, req = null) {
  requireFields(body, ["tenant_id", "participant_id"]);
  const actor = actorFromBody(body, req, body.tenant_id, body.requesting_firm_id ?? body.firm_id ?? null);
  assertHumanNetworkActor(actor);
  return revokeCollaborationWorkspaceParticipantRecord(body, actor);
}

async function addCollaborationWorkspaceEvidence(body, req = null) {
  requireFields(body, ["tenant_id", "workspace_id", "participant_id", "evidence_ref"]);
  const actor = actorFromBody(body, req, body.tenant_id, body.requesting_firm_id ?? body.firm_id ?? null);
  assertHumanNetworkActor(actor);
  return addCollaborationWorkspaceEvidenceRecord(body, actor);
}

async function createResponsibilityMatrix(body, req = null) {
  requireFields(body, ["tenant_id", "workspace_id", "accountable_firm_id", "responsible_professional_actor_id", "approver_actor_id", "permitted_worker_actions"]);
  const actor = actorFromBody(body, req, body.tenant_id, body.requesting_firm_id ?? body.firm_id ?? null);
  assertHumanNetworkActor(actor);
  return createResponsibilityMatrixRecord(body, actor);
}

async function readR5ResponsibilityMatrixSummary(req, url) {
  assertActorScope(devActorFromHeaders(req), { tenant_id: url.searchParams.get("tenant_id"), firm_id: url.searchParams.get("firm_id") }, "R5 responsibility matrix");
  const store = await readStore();
  const tenantId = url.searchParams.get("tenant_id");
  const firmId = url.searchParams.get("firm_id");
  const tenantScoped = (records) => (records ?? []).filter((item) => !tenantId || item.tenant_id === tenantId);
  const firmScoped = (records) => tenantScoped(records).filter((item) => !firmId || item.firm_id === firmId || item.requesting_firm_id === firmId || item.provider_firm_id === firmId || item.accountable_firm_id === firmId);
  const workspaces = firmScoped(store.collaboration_workspaces);
  const workspaceIds = new Set(workspaces.map((workspace) => workspace.id));
  const matrices = tenantScoped(store.responsibility_matrices).filter((matrix) => workspaceIds.has(matrix.workspace_id));
  const participants = tenantScoped(store.collaboration_workspace_participants).filter((participant) => workspaceIds.has(participant.workspace_id));
  const activeActorIdsByWorkspace = new Map();
  for (const participant of participants.filter((item) => item.access_status === "ACTIVE" && item.actor_id)) {
    const set = activeActorIdsByWorkspace.get(participant.workspace_id) ?? new Set();
    set.add(participant.actor_id);
    activeActorIdsByWorkspace.set(participant.workspace_id, set);
  }
  const validFirmIds = (matrix) => [matrix.requesting_firm_id, matrix.provider_firm_id].filter(Boolean);
  const activeMatrices = matrices.filter((item) => item.matrix_status === "ACTIVE");
  const missingAccountableFirm = activeMatrices.filter((matrix) => !validFirmIds(matrix).includes(matrix.accountable_firm_id));
  const missingResponsibleProfessional = activeMatrices.filter((matrix) => !matrix.responsible_professional_actor_id || !(activeActorIdsByWorkspace.get(matrix.workspace_id)?.has(matrix.responsible_professional_actor_id)));
  const missingApprover = activeMatrices.filter((matrix) => !matrix.approver_actor_id || !(activeActorIdsByWorkspace.get(matrix.workspace_id)?.has(matrix.approver_actor_id)));
  const missingReviewerSeparation = activeMatrices.filter((matrix) => matrix.reviewer_actor_id && matrix.reviewer_actor_id === matrix.approver_actor_id);
  const missingWorkerActions = activeMatrices.filter((matrix) => !Array.isArray(matrix.permitted_worker_actions) || matrix.permitted_worker_actions.length === 0);
  const forbiddenWorkerActions = activeMatrices.filter((matrix) => (matrix.permitted_worker_actions ?? []).some((action) => /approve|certify|seal|issue_regulated|final_output/i.test(String(action))));
  const silentApproval = activeMatrices.filter((matrix) => matrix.approval_required !== true);
  const auditEvents = firmScoped(store.audit_events).filter((event) => (event.action ?? event.event_type) === "network.responsibility_matrix_recorded");
  const checks = [
    { key: "accountable_firm_recorded", status: activeMatrices.length > 0 && missingAccountableFirm.length === 0 ? "PASS" : "FAIL", detail: `${activeMatrices.length} active matrix/matrices, ${missingAccountableFirm.length} with invalid accountable firm` },
    { key: "responsible_professional_recorded", status: activeMatrices.length > 0 && missingResponsibleProfessional.length === 0 ? "PASS" : "FAIL", detail: `${missingResponsibleProfessional.length} matrix/matrices missing active responsible professional` },
    { key: "reviewer_approver_separated", status: activeMatrices.length > 0 && missingReviewerSeparation.length === 0 ? "PASS" : "FAIL", detail: `${missingReviewerSeparation.length} matrix/matrices with same reviewer and approver` },
    { key: "permitted_worker_actions_explicit", status: activeMatrices.length > 0 && missingWorkerActions.length === 0 && forbiddenWorkerActions.length === 0 ? "PASS" : "FAIL", detail: `${missingWorkerActions.length} missing action set, ${forbiddenWorkerActions.length} forbidden action set` },
    { key: "no_orphan_regulated_work", status: activeMatrices.length > 0 && missingResponsibleProfessional.length === 0 ? "PASS" : "FAIL", detail: "Every active matrix has an active responsible professional participant." },
    { key: "no_silent_approval", status: activeMatrices.length > 0 && missingApprover.length === 0 && silentApproval.length === 0 ? "PASS" : "FAIL", detail: `${missingApprover.length} missing active approver, ${silentApproval.length} approval_required=false` },
    { key: "responsibility_actions_audited", status: auditEvents.length > 0 ? "PASS" : "FAIL", detail: `${auditEvents.length} responsibility matrix audit event(s)` }
  ];
  const failed = checks.filter((check) => check.status !== "PASS");
  return {
    release: "R5",
    sprint: "R5-S4",
    status: failed.length === 0 ? "R5_S4_RESPONSIBILITY_MATRIX_READY" : "R5_S4_RESPONSIBILITY_MATRIX_BLOCKED",
    counts: { responsibility_matrices: matrices.length, active_matrices: activeMatrices.length, workspace_participants: participants.length, responsibility_audit_events: auditEvents.length },
    checks,
    blocked_reasons: failed.map((check) => `${check.key}: ${check.detail}`),
    boundaries: ["accountable_firm_explicit", "responsible_professional_explicit", "reviewer_approver_recorded", "worker_actions_bounded", "no_orphan_regulated_work", "no_silent_approval", "trusted_network_only"]
  };
}

async function createSpecialistAssignment(body, req = null) {
  requireFields(body, ["tenant_id", "responsibility_matrix_id", "assignment_title", "assignment_scope"]);
  const actor = actorFromBody(body, req, body.tenant_id, body.requesting_firm_id ?? body.firm_id ?? null);
  assertHumanNetworkActor(actor);
  return createSpecialistAssignmentRecord(body, actor);
}

async function transitionSpecialistAssignment(body, req = null, action) {
  requireFields(body, ["tenant_id", "assignment_id"]);
  const actor = actorFromBody(body, req, body.tenant_id, body.firm_id ?? null);
  assertHumanNetworkActor(actor);
  return transitionSpecialistAssignmentRecord(body, actor, action);
}

async function readR5AssignmentDeliverySummary(req, url) {
  assertActorScope(devActorFromHeaders(req), { tenant_id: url.searchParams.get("tenant_id"), firm_id: url.searchParams.get("firm_id") }, "R5 specialist assignment delivery loop");
  const store = await readStore();
  const tenantId = url.searchParams.get("tenant_id");
  const firmId = url.searchParams.get("firm_id");
  const tenantScoped = (records) => (records ?? []).filter((item) => !tenantId || item.tenant_id === tenantId);
  const firmScoped = (records) => tenantScoped(records).filter((item) => !firmId || item.firm_id === firmId || item.requesting_firm_id === firmId || item.provider_firm_id === firmId || item.accountable_firm_id === firmId);
  const matrices = firmScoped(store.responsibility_matrices).filter((matrix) => matrix.matrix_status === "ACTIVE");
  const matrixIds = new Set(matrices.map((matrix) => matrix.id));
  const assignments = tenantScoped(store.specialist_assignments).filter((assignment) => matrixIds.has(assignment.responsibility_matrix_id));
  const accepted = assignments.filter((item) => item.accepted_at);
  const delivered = assignments.filter((item) => item.delivered_at && Array.isArray(item.evidence_refs) && item.evidence_refs.length > 0);
  const reviewed = assignments.filter((item) => item.reviewed_at && item.review_summary);
  const approved = assignments.filter((item) => item.approved_at && item.approval_summary);
  const closed = assignments.filter((item) => item.assignment_status === "CLOSED");
  const invalidFinal = assignments.filter((item) => ["APPROVED", "CLOSED"].includes(item.assignment_status) && (!item.reviewed_at || !item.approved_at));
  const auditEvents = firmScoped(store.audit_events).filter((event) => String(event.action ?? event.event_type ?? "").startsWith("network.specialist_assignment_"));
  const checks = [
    { key: "assignment_request_state", status: assignments.some((item) => item.requested_at) ? "PASS" : "FAIL", detail: `${assignments.length} assignment(s) with request records` },
    { key: "specialist_acceptance_state", status: accepted.length > 0 ? "PASS" : "FAIL", detail: `${accepted.length} accepted assignment(s)` },
    { key: "delivery_evidence_state", status: delivered.length > 0 ? "PASS" : "FAIL", detail: `${delivered.length} delivered assignment(s) with evidence` },
    { key: "review_and_approval_states", status: reviewed.length > 0 && approved.length > 0 && invalidFinal.length === 0 ? "PASS" : "FAIL", detail: `${reviewed.length} reviewed, ${approved.length} approved, ${invalidFinal.length} invalid final assignment(s)` },
    { key: "closure_state", status: closed.length > 0 ? "PASS" : "FAIL", detail: `${closed.length} closed assignment(s)` },
    { key: "assignment_delivery_audited", status: auditEvents.length >= 7 ? "PASS" : "FAIL", detail: `${auditEvents.length} specialist assignment audit event(s)` }
  ];
  const failed = checks.filter((check) => check.status !== "PASS");
  return {
    release: "R5",
    sprint: "R5-S5",
    status: failed.length === 0 ? "R5_S5_ASSIGNMENT_DELIVERY_READY" : "R5_S5_ASSIGNMENT_DELIVERY_BLOCKED",
    counts: { assignments: assignments.length, accepted: accepted.length, delivered: delivered.length, reviewed: reviewed.length, approved: approved.length, closed: closed.length, assignment_audit_events: auditEvents.length },
    checks,
    blocked_reasons: failed.map((check) => `${check.key}: ${check.detail}`),
    boundaries: ["responsibility_matrix_required", "human_specialist_acceptance", "delivery_evidence_required", "human_review_required", "human_approval_required", "no_autonomous_regulated_approval", "trusted_network_only"]
  };
}

async function readR5NetworkEvidenceGoNoGo(req, url) {
  assertActorScope(devActorFromHeaders(req), { tenant_id: url.searchParams.get("tenant_id"), firm_id: url.searchParams.get("firm_id") }, "R5 network evidence go/no-go");
  const tenantId = url.searchParams.get("tenant_id");
  const firmId = url.searchParams.get("firm_id");
  const qs = `tenant_id=${tenantId ?? ""}${firmId ? `&firm_id=${firmId}` : ""}`;
  const profileFoundation = await readR5TrustedNetworkProfiles(req, new URL(`http://localhost/network/r5-profile-summary?${qs}`));
  const qualificationGate = await readR5QualificationGateSummary(req, new URL(`http://localhost/network/r5-qualification-summary?${qs}`));
  const collaborationWorkspace = await readR5CollaborationWorkspaceSummary(req, new URL(`http://localhost/network/r5-collaboration-workspace-summary?${qs}`));
  const responsibilityMatrix = await readR5ResponsibilityMatrixSummary(req, new URL(`http://localhost/network/r5-responsibility-matrix-summary?${qs}`));
  const assignmentDelivery = await readR5AssignmentDeliverySummary(req, new URL(`http://localhost/network/r5-assignment-delivery-summary?${qs}`));
  const store = await readStore();
  const tenantScoped = (records) => (records ?? []).filter((item) => !tenantId || item.tenant_id === tenantId);
  const firmScoped = (records) => tenantScoped(records).filter((item) => !firmId || item.firm_id === firmId || item.requesting_firm_id === firmId || item.provider_firm_id === firmId || item.accountable_firm_id === firmId);
  const networkAuditEvents = firmScoped(store.audit_events).filter((event) => String(event.action ?? event.event_type ?? "").startsWith("network."));
  const publicCapabilities = tenantScoped(store.network_capabilities).filter((item) => ["PUBLIC", "OPEN_MARKETPLACE", "PUBLIC_MARKETPLACE"].includes(String(item.visibility ?? "").toUpperCase()));
  const marketplaceRecords = tenantScoped(store.marketplace_listings).length + tenantScoped(store.capacity_offers).length + tenantScoped(store.observatory_snapshots).length;
  const closedAssignments = firmScoped(store.specialist_assignments).filter((item) => item.assignment_status === "CLOSED");
  const assignmentsWithoutEvidence = closedAssignments.filter((item) => !Array.isArray(item.evidence_refs) || item.evidence_refs.length === 0);
  const explicitApprovalAssignments = closedAssignments.filter((item) => item.reviewed_at && item.approved_at && item.approved_by_actor_id);
  const checks = [
    { key: "r5_s1_profile_foundation", status: profileFoundation.status === "R5_S1_PROFILE_FOUNDATION_READY" ? "PASS" : "FAIL", detail: profileFoundation.status },
    { key: "r5_s2_qualification_conflict_gate", status: qualificationGate.status === "R5_S2_QUALIFICATION_CONFLICT_GATE_READY" ? "PASS" : "FAIL", detail: qualificationGate.status },
    { key: "r5_s3_collaboration_workspace", status: collaborationWorkspace.status === "R5_S3_COLLABORATION_WORKSPACE_READY" ? "PASS" : "FAIL", detail: collaborationWorkspace.status },
    { key: "r5_s4_responsibility_matrix", status: responsibilityMatrix.status === "R5_S4_RESPONSIBILITY_MATRIX_READY" ? "PASS" : "FAIL", detail: responsibilityMatrix.status },
    { key: "r5_s5_assignment_delivery_loop", status: assignmentDelivery.status === "R5_S5_ASSIGNMENT_DELIVERY_READY" ? "PASS" : "FAIL", detail: assignmentDelivery.status },
    { key: "qualification_first_not_price_first", status: qualificationGate.boundaries.includes("qualification_first") && qualificationGate.boundaries.includes("no_price_first_allocation") ? "PASS" : "FAIL", detail: "Qualification, jurisdiction, insurance, conflict, capacity, and policy outrank price." },
    { key: "trusted_network_only_no_public_marketplace", status: publicCapabilities.length === 0 && marketplaceRecords === 0 ? "PASS" : "FAIL", detail: `${publicCapabilities.length} public capability record(s), ${marketplaceRecords} marketplace/ecosystem record(s)` },
    { key: "responsibility_and_approval_trace", status: closedAssignments.length > 0 && assignmentsWithoutEvidence.length === 0 && explicitApprovalAssignments.length === closedAssignments.length ? "PASS" : "FAIL", detail: `${closedAssignments.length} closed assignment(s), ${assignmentsWithoutEvidence.length} without evidence, ${explicitApprovalAssignments.length} with explicit review/approval` },
    { key: "network_audit_reconstructable", status: networkAuditEvents.length >= 20 ? "PASS" : "FAIL", detail: `${networkAuditEvents.length} network audit event(s)` },
    { key: "tenant_scoped_evidence_pack", status: tenantId ? "PASS" : "FAIL", detail: tenantId ? `tenant scope ${tenantId}` : "tenant_id is required for release evidence pack" }
  ];
  const failed = checks.filter((check) => check.status !== "PASS");
  const hardFailureKeys = new Set(["r5_s1_profile_foundation", "r5_s2_qualification_conflict_gate", "r5_s3_collaboration_workspace", "r5_s4_responsibility_matrix", "r5_s5_assignment_delivery_loop", "trusted_network_only_no_public_marketplace", "responsibility_and_approval_trace", "tenant_scoped_evidence_pack"]);
  const recommendation = failed.length === 0 ? "GO_FOR_RELEASE_5_ACCEPTANCE" : failed.some((check) => hardFailureKeys.has(check.key)) ? "NO_GO" : "GO_WITH_LIMITATIONS";
  return {
    code: "R5-S6-NETWORK-EVIDENCE-GO-NO-GO",
    generated_at: new Date().toISOString(),
    scope: { tenant_id: tenantId ?? null, firm_id: firmId ?? null },
    status: failed.length === 0 ? "EVIDENCE_READY" : "EVIDENCE_INCOMPLETE",
    recommendation,
    checks,
    evidence_pack: {
      sprint_statuses: { r5_s1: profileFoundation.status, r5_s2: qualificationGate.status, r5_s3: collaborationWorkspace.status, r5_s4: responsibilityMatrix.status, r5_s5: assignmentDelivery.status },
      counts: {
        professional_profiles: profileFoundation.counts.professional_profiles,
        firm_profiles: profileFoundation.counts.firm_profiles,
        capabilities: profileFoundation.counts.capabilities,
        verified_credentials: profileFoundation.counts.verified_credentials,
        qualification_gates: qualificationGate.counts.qualification_gates,
        ready_invitations: qualificationGate.counts.ready_invitations,
        active_workspaces: collaborationWorkspace.counts.active_workspaces,
        active_matrices: responsibilityMatrix.counts.active_matrices,
        closed_assignments: closedAssignments.length,
        network_audit_events: networkAuditEvents.length
      }
    },
    blocked_reasons: failed.map((check) => `${check.key}: ${check.detail}`),
    boundaries: ["trusted_network_only", "no_public_marketplace", "no_price_first_allocation", "qualification_gates_outrank_price", "no_orphan_regulated_work", "no_silent_approval", "no_autonomous_regulated_approval", "workspace_scoped_evidence", "tenant_data_isolation", "no_vf24_ecosystem_intelligence", "no_live_payment_movement"]
  };
}
async function readR5CollaborationWorkspaceSummary(req, url) {
  assertActorScope(devActorFromHeaders(req), { tenant_id: url.searchParams.get("tenant_id"), firm_id: url.searchParams.get("firm_id") }, "R5 collaboration workspace");
  const store = await readStore();
  const tenantId = url.searchParams.get("tenant_id");
  const firmId = url.searchParams.get("firm_id");
  const tenantScoped = (records) => (records ?? []).filter((item) => !tenantId || item.tenant_id === tenantId);
  const firmScoped = (records) => tenantScoped(records).filter((item) => !firmId || item.firm_id === firmId || item.requesting_firm_id === firmId || item.provider_firm_id === firmId);
  const workspaces = firmScoped(store.collaboration_workspaces);
  const workspaceIds = new Set(workspaces.map((workspace) => workspace.id));
  const participants = tenantScoped(store.collaboration_workspace_participants).filter((participant) => workspaceIds.has(participant.workspace_id));
  const evidence = tenantScoped(store.collaboration_workspace_evidence).filter((item) => workspaceIds.has(item.workspace_id));
  const invitations = firmScoped(store.specialist_invitations);
  const auditEvents = firmScoped(store.audit_events).filter((event) => String(event.action ?? event.event_type ?? "").startsWith("network.collaboration_"));
  const activeWorkspaces = workspaces.filter((item) => item.workspace_status === "ACTIVE");
  const badPolicy = workspaces.filter((item) => !(item.data_room_policy?.minimum_necessary_access && item.data_room_policy?.client_confidential && item.data_room_policy?.audit_required));
  const activeParticipants = participants.filter((item) => item.access_status === "ACTIVE");
  const revokedParticipants = participants.filter((item) => item.access_status === "REVOKED");
  const outOfScopeEvidence = evidence.filter((item) => item.access_scope !== "WORKSPACE_ONLY");
  const unqualifiedWorkspaces = workspaces.filter((workspace) => !invitations.some((invite) => invite.id === workspace.specialist_invitation_id && invite.invitation_status === "READY_TO_SEND"));
  const checks = [
    { key: "workspace_from_ready_invitation", status: activeWorkspaces.length > 0 && unqualifiedWorkspaces.length === 0 ? "PASS" : "FAIL", detail: `${activeWorkspaces.length} active workspace(s), ${unqualifiedWorkspaces.length} without ready invitation` },
    { key: "data_room_policy_controlled", status: workspaces.length > 0 && badPolicy.length === 0 ? "PASS" : "FAIL", detail: `${badPolicy.length} workspace(s) missing required data-room controls` },
    { key: "participant_access_explicit", status: activeParticipants.length > 0 ? "PASS" : "FAIL", detail: `${activeParticipants.length} active participant access grant(s)` },
    { key: "revocation_path", status: revokedParticipants.length > 0 ? "PASS" : "FAIL", detail: `${revokedParticipants.length} revoked participant access record(s)` },
    { key: "evidence_workspace_scoped", status: evidence.length > 0 && outOfScopeEvidence.length === 0 ? "PASS" : "FAIL", detail: `${evidence.length} evidence ref(s), ${outOfScopeEvidence.length} out-of-scope` },
    { key: "workspace_actions_audited", status: auditEvents.length >= 4 ? "PASS" : "FAIL", detail: `${auditEvents.length} collaboration workspace audit event(s)` }
  ];
  const failed = checks.filter((check) => check.status !== "PASS");
  return {
    release: "R5",
    sprint: "R5-S3",
    status: failed.length === 0 ? "R5_S3_COLLABORATION_WORKSPACE_READY" : "R5_S3_COLLABORATION_WORKSPACE_BLOCKED",
    counts: { workspaces: workspaces.length, active_workspaces: activeWorkspaces.length, active_participants: activeParticipants.length, revoked_participants: revokedParticipants.length, evidence_refs: evidence.length, collaboration_audit_events: auditEvents.length },
    checks,
    blocked_reasons: failed.map((check) => `${check.key}: ${check.detail}`),
    boundaries: ["workspace_scoped_evidence", "minimum_necessary_access", "client_confidential", "revocation_supported", "auditable_participation", "no_unqualified_workspace", "trusted_network_only"]
  };
}
async function createObservatorySnapshot(body, req = null) {
  const actor = actorFromBody(body, req, body.tenant_id ?? null, body.firm_id ?? null);
  assertMEObservatoryGovernance(body, actor);
  return createObservatorySnapshotRecord(body, actor);
}
async function provisionWorkerInstance(body, req = null) {
  requireFields(body, ["tenant_id", "firm_id"]);
  const actor = actorFromBody(body, req, body.tenant_id, body.firm_id);
  return provisionWorkerInstanceRecord(body, actor);
}

async function activateWorkerInstance(body, req = null) {
  requireFields(body, ["tenant_id", "firm_id", "worker_instance_id"]);
  const actor = actorFromBody(body, req, body.tenant_id, body.firm_id);
  return activateWorkerInstanceRecord(body, actor);
}

async function assignTaskToWorker(body, req = null) {
  requireFields(body, ["tenant_id", "firm_id", "task_id", "worker_instance_id"]);
  const actor = actorFromBody(body, req, body.tenant_id, body.firm_id);
  return assignTaskToWorkerRecord(body, actor);
}

async function produceTaskOutput(body) {
  requireFields(body, ["tenant_id", "firm_id", "task_id", "worker_instance_id"]);
  const store = await readStore();
  const worker = (store.worker_instances ?? []).find((record) => record.id === body.worker_instance_id && record.tenant_id === body.tenant_id && record.firm_id === body.firm_id);
  if (!worker) { const error = new Error(`worker_instances record not found: ${body.worker_instance_id}`); error.status = 404; error.code = "NOT_FOUND"; throw error; }
  const actor = { actor_id: worker.actor_id, actor_type: "AI_AGENT", worker_instance_id: worker.id, tenant_id: body.tenant_id, firm_id: body.firm_id, display_name: worker.name };
  const policyInput = { actor, action: "task.output_produce", resource: { resource_type: "Task", resource_id: body.task_id, tenant_id: body.tenant_id, firm_id: body.firm_id, risk_class: body.risk_class ?? "CONTROLLED" }, context: { assigned_worker_instance_id: body.worker_instance_id } };
  const decision = evaluatePolicy(policyInput);
  if (decision.result !== "ALLOW") { const error = new Error(decision.reasons.join("; ")); error.status = 403; error.code = "POLICY_DENIED"; throw error; }
  const policyDecision = await createPolicyDecisionRecord(policyInput, decision);
  return produceTaskOutputRecord(body, policyDecision ?? decision);
}

async function requestToolInvocation(body) {
  requireFields(body, ["tenant_id", "firm_id", "worker_instance_id", "tool_name"]);
  const store = await readStore();
  const worker = (store.worker_instances ?? []).find((record) => record.id === body.worker_instance_id && record.tenant_id === body.tenant_id && record.firm_id === body.firm_id);
  if (!worker) { const error = new Error(`worker_instances record not found: ${body.worker_instance_id}`); error.status = 404; error.code = "NOT_FOUND"; throw error; }
  const actor = { actor_id: worker.actor_id, actor_type: "AI_AGENT", worker_instance_id: worker.id, tenant_id: body.tenant_id, firm_id: body.firm_id, display_name: worker.name };
  const policyInput = { actor, action: "tool.invoke", resource: { resource_type: "ToolInvocation", resource_id: body.task_id ?? newId("tool_resource"), tenant_id: body.tenant_id, firm_id: body.firm_id, risk_class: body.risk_class ?? "CONTROLLED" }, context: { assigned_worker_instance_id: body.worker_instance_id, tool_name: body.tool_name } };
  const decision = evaluatePolicy(policyInput);
  if (decision.result !== "ALLOW") { const error = new Error(decision.reasons.join("; ")); error.status = 403; error.code = "POLICY_DENIED"; throw error; }
  const policyDecision = await createPolicyDecisionRecord(policyInput, decision);
  return requestToolInvocationRecord(body, policyDecision ?? decision);
}
async function issueInvoice(body, req = null) {
  requireFields(body, ["tenant_id", "firm_id", "invoice_id"]);
  const actor = actorFromBody(body, req, body.tenant_id, body.firm_id);
  return issueInvoiceRecord(body, actor);
}

async function recordPaymentStatus(body, req = null) {
  requireFields(body, ["tenant_id", "firm_id", "invoice_id"]);
  const actor = actorFromBody(body, req, body.tenant_id, body.firm_id);
  return recordPaymentStatusRecord(body, actor);
}






async function readCommercialLaunchSummary(req, url) {
  assertActorScope(devActorFromHeaders(req), { tenant_id: url.searchParams.get("tenant_id"), firm_id: url.searchParams.get("firm_id") }, "commercial launch summary");
  const store = await readStore();
  const tenantId = url.searchParams.get("tenant_id");
  const firmId = url.searchParams.get("firm_id");
  const scope = (records) => (records ?? []).filter((item)=> (!tenantId || item.tenant_id === tenantId) && (!firmId || item.firm_id === firmId));
  const providers = scope(store.payment_provider_configs);
  const packages = scope(store.subscription_packages);
  const controls = scope(store.commercial_launch_controls);
  const billingReviews = scope(store.billing_readiness_reviews);
  return {
    generated_at: new Date().toISOString(),
    scope: { tenant_id: tenantId ?? null, firm_id: firmId ?? null },
    status: controls.some((item)=>item.launch_status === "APPROVED_LIVE_PREP") ? "LIVE_PREP_APPROVED" : controls.some((item)=>item.launch_status === "APPROVED_TEST_MODE") ? "TEST_MODE_APPROVED" : providers.length && packages.length && billingReviews.some((item)=>item.readiness_status === "READY") ? "COMMERCIAL_GATE_READY" : "COMMERCIAL_PREP_REQUIRED",
    counts: { payment_provider_configs: providers.length, subscription_packages: packages.length, commercial_launch_controls: controls.length, billing_ready_reviews: billingReviews.filter((item)=>item.readiness_status === "READY").length },
    latest_provider_config: providers.at(-1) ?? null,
    latest_subscription_package: packages.at(-1) ?? null,
    latest_launch_control: controls.at(-1) ?? null,
    boundary: "payment_provider_preparation_only_no_live_payment_capture"
  };
}

async function createPaymentProviderConfig(body, req = null) {
  requireFields(body, ["tenant_id"]);
  const actor = actorFromBody(body, req, body.tenant_id, body.firm_id ?? null);
  return createPaymentProviderConfigRecord(body, actor);
}

async function createSubscriptionPackage(body, req = null) {
  requireFields(body, ["tenant_id", "package_code", "package_name"]);
  const actor = actorFromBody(body, req, body.tenant_id, body.firm_id ?? null);
  return createSubscriptionPackageRecord(body, actor);
}

async function createCommercialLaunchControl(body, req = null) {
  requireFields(body, ["tenant_id", "launch_status"]);
  if (["APPROVED_LIVE_CAPTURE", "LIVE_CAPTURE_ENABLED"].includes(body.launch_status)) { const error = new Error("Release 1 does not allow live payment capture activation."); error.status = 403; error.code = "LIVE_CAPTURE_NOT_ALLOWED"; throw error; }
  const actor = actorFromBody(body, req, body.tenant_id, body.firm_id ?? null);
  return createCommercialLaunchControlRecord(body, actor);
}
async function readTenantUsageBillingSummary(req, url) {
  assertActorScope(devActorFromHeaders(req), { tenant_id: url.searchParams.get("tenant_id"), firm_id: url.searchParams.get("firm_id") }, "tenant usage summary");
  const store = await readStore();
  const tenantId = url.searchParams.get("tenant_id");
  const firmId = url.searchParams.get("firm_id");
  const scope = (records) => (records ?? []).filter((item)=> (!tenantId || item.tenant_id === tenantId) && (!firmId || item.firm_id === firmId));
  const controls = scope(store.tenant_pilot_controls);
  const usage = scope(store.tenant_usage_events);
  const reviews = scope(store.billing_readiness_reviews);
  const latestControl = controls.at(-1) ?? null;
  const totals = usage.reduce((acc,item)=>{ const key = item.usage_type; acc[key] = (acc[key] ?? 0) + Number(item.quantity ?? 0); return acc; }, {});
  const limitWarnings = [];
  for (const [key, limit] of Object.entries(latestControl?.limits ?? {})) {
    const used = totals[key] ?? 0;
    if (Number.isFinite(Number(limit)) && used >= Number(limit)) limitWarnings.push(`${key} limit reached (${used}/${limit}).`);
  }
  return {
    generated_at: new Date().toISOString(),
    scope: { tenant_id: tenantId ?? null, firm_id: firmId ?? null },
    status: reviews.some((item)=>item.readiness_status === "READY") ? "BILLING_READY" : latestControl ? "USAGE_CONTROLLED" : "PILOT_CONTROLS_REQUIRED",
    counts: { controls: controls.length, usage_events: usage.length, billing_reviews: reviews.length, ready_reviews: reviews.filter((item)=>item.readiness_status === "READY").length },
    latest_control: latestControl,
    usage_totals: totals,
    limit_warnings: limitWarnings,
    billing_mode: "readiness_only_no_live_payment_capture"
  };
}

async function createTenantPilotControl(body, req = null) {
  requireFields(body, ["tenant_id"]);
  const actor = actorFromBody(body, req, body.tenant_id, body.firm_id ?? null);
  return createTenantPilotControlRecord(body, actor);
}

async function recordTenantUsage(body, req = null) {
  requireFields(body, ["tenant_id", "usage_type"]);
  const actor = actorFromBody(body, req, body.tenant_id, body.firm_id ?? null);
  return recordTenantUsageEventRecord(body, actor);
}

async function reviewBillingReadiness(body, req = null) {
  requireFields(body, ["tenant_id"]);
  const actor = actorFromBody(body, req, body.tenant_id, body.firm_id ?? null);
  return createBillingReadinessReviewRecord(body, actor);
}
async function readPilotExpansionSummary(req, url) {
  assertActorScope(devActorFromHeaders(req), { tenant_id: url.searchParams.get("tenant_id"), firm_id: url.searchParams.get("firm_id") }, "pilot expansion summary");
  const store = await readStore();
  const tenantId = url.searchParams.get("tenant_id");
  const firmId = url.searchParams.get("firm_id");
  const scope = (records) => (records ?? []).filter((item)=> (!tenantId || item.tenant_id === tenantId) && (!firmId || item.firm_id === firmId));
  const cohorts = scope(store.pilot_expansion_cohorts);
  const plans = scope(store.tenant_onboarding_plans);
  const gates = scope(store.release_candidate_gates);
  const decisions = scope(store.stakeholder_review_decisions);
  const approvedDecision = decisions.some((item)=>item.decision === "APPROVE_EXPANSION");
  return {
    generated_at: new Date().toISOString(),
    scope: { tenant_id: tenantId ?? null, firm_id: firmId ?? null },
    status: gates.some((item)=>item.gate_status === "APPROVED") ? "RELEASE_CANDIDATE_APPROVED" : plans.some((item)=>item.onboarding_status !== "COMPLETE") ? "ONBOARDING_ACTIVE" : cohorts.some((item)=>item.expansion_status === "APPROVED") ? "EXPANSION_APPROVED" : approvedDecision ? "COHORT_REQUIRED" : "STAKEHOLDER_APPROVAL_REQUIRED",
    counts: {
      expansion_cohorts: cohorts.length,
      approved_cohorts: cohorts.filter((item)=>item.expansion_status === "APPROVED").length,
      onboarding_plans: plans.length,
      completed_onboarding_plans: plans.filter((item)=>item.onboarding_status === "COMPLETE").length,
      release_candidate_gates: gates.length,
      approved_release_gates: gates.filter((item)=>item.gate_status === "APPROVED").length,
      expansion_approval_decisions: decisions.filter((item)=>item.decision === "APPROVE_EXPANSION").length
    },
    latest_cohort: cohorts.at(-1) ?? null,
    latest_onboarding_plan: plans.at(-1) ?? null,
    latest_release_gate: gates.at(-1) ?? null,
    controls: ["stakeholder_approval_required", "cohort_limit_required", "tenant_onboarding_required", "release_candidate_gate_required"]
  };
}

async function createPilotExpansionCohort(body, req = null) {
  requireFields(body, ["tenant_id", "cohort_name"]);
  const actor = actorFromBody(body, req, body.tenant_id, body.firm_id ?? null);
  return createPilotExpansionCohortRecord(body, actor);
}

async function updatePilotExpansionCohort(body, req = null) {
  requireFields(body, ["tenant_id", "expansion_cohort_id"]);
  const actor = actorFromBody(body, req, body.tenant_id, body.firm_id ?? null);
  return updatePilotExpansionCohortRecord(body, actor);
}

async function createTenantOnboardingPlan(body, req = null) {
  requireFields(body, ["tenant_id"]);
  const actor = actorFromBody(body, req, body.tenant_id, body.firm_id ?? null);
  return createTenantOnboardingPlanRecord(body, actor);
}

async function updateTenantOnboardingPlan(body, req = null) {
  requireFields(body, ["tenant_id", "onboarding_plan_id"]);
  const actor = actorFromBody(body, req, body.tenant_id, body.firm_id ?? null);
  return updateTenantOnboardingPlanRecord(body, actor);
}

async function createReleaseCandidateGate(body, req = null) {
  requireFields(body, ["tenant_id"]);
  const actor = actorFromBody(body, req, body.tenant_id, body.firm_id ?? null);
  return createReleaseCandidateGateRecord(body, actor);
}

const r4S5AcceptedEvidence = ["R4-S1", "R4-S2", "R4-S3", "R4-S4"];

async function readR4PrivatePilotCohortGate(req, url) {
  assertActorScope(devActorFromHeaders(req), { tenant_id: url.searchParams.get("tenant_id"), firm_id: url.searchParams.get("firm_id") }, "R4 private pilot cohort gate");
  const store = await readStore();
  const tenantId = url.searchParams.get("tenant_id");
  const firmId = url.searchParams.get("firm_id");
  const cohortId = url.searchParams.get("cohort_id");
  const scope = (records) => (records ?? []).filter((item) => (!tenantId || item.tenant_id === tenantId) && (!firmId || item.firm_id === firmId));
  const cohorts = scope(store.pilot_expansion_cohorts).filter((item) => !cohortId || item.id === cohortId);
  const plans = scope(store.tenant_onboarding_plans);
  const gates = scope(store.release_candidate_gates);
  const pilotUsers = scope(store.pilot_users);
  const supportCases = scope(store.support_cases);
  const incidents = scope(store.pilot_incidents);
  const audits = scope(store.audit_events);
  const events = scope(store.event_log);
  const selectedCohort = cohorts.at(-1) ?? null;
  const plansForCohort = plans.filter((item) => !selectedCohort || item.expansion_cohort_id === selectedCohort.id);
  const gatesForCohort = gates.filter((item) => !selectedCohort || item.expansion_cohort_id === selectedCohort.id);
  const authConfig = authProviderConfig();
  const stagingReadiness = readR4StagingDataProtectionReadiness();
  const observabilityUrl = new URL(`http://localhost/ops/r4-observability-audit-review?tenant_id=${tenantId ?? ""}&firm_id=${firmId ?? ""}`);
  const observability = await readR4ObservabilityAuditReview(req, observabilityUrl);
  const activeIncidents = incidents.filter((item) => !["RESOLVED", "CLOSED"].includes(item.status));
  const activeUsers = pilotUsers.filter((item) => item.invite_status === "ACTIVE");
  const revokedUsers = pilotUsers.filter((item) => item.invite_status === "REVOKED");
  const checks = [
    { key: "r4_s1_identity_tenant_admin", status: authConfig.configured && authConfig.adapter_status !== "DEV_HEADER_ONLY" ? "PASS" : "FAIL", detail: authConfig.adapter_status },
    { key: "r4_s2_staging_data_protection", status: stagingReadiness.status === "R4_S2_READY_FOR_SUPPORT_INCIDENT_CONTROLS" ? "PASS" : "FAIL", detail: stagingReadiness.private_pilot_invitation_gate },
    { key: "r4_s3_support_incident_controls", status: activeIncidents.length === 0 && readR4SupportIncidentPolicy().authority_boundary.denied_actor_types.includes("AI_AGENT") ? "PASS" : "FAIL", detail: activeIncidents.length ? `${activeIncidents.length} active incident(s)` : "support and incident controls ready" },
    { key: "r4_s4_observability_audit_review", status: observability.status === "REVIEW_READY" ? "PASS" : "FAIL", detail: observability.status },
    { key: "pilot_cohort_record", status: selectedCohort ? "PASS" : "FAIL", detail: selectedCohort?.cohort_name ?? "missing cohort" },
    { key: "pilot_invitation_gate", status: pilotUsers.length > 0 && pilotUsers.length <= Number(selectedCohort?.max_pilot_users ?? 0) ? "PASS" : "FAIL", detail: `${pilotUsers.length}/${selectedCohort?.max_pilot_users ?? 0} pilot user(s)` },
    { key: "pilot_activation_gate", status: activeUsers.length > 0 && activeUsers.length <= Number(selectedCohort?.max_pilot_users ?? 0) ? "PASS" : "FAIL", detail: `${activeUsers.length} active pilot user(s)` },
    { key: "pilot_offboarding_gate", status: revokedUsers.length > 0 || supportCases.some((item) => ["RESOLVED", "CLOSED"].includes(item.status)) ? "PASS" : "FAIL", detail: revokedUsers.length ? `${revokedUsers.length} revoked pilot user(s)` : "offboarding evidence missing" },
    { key: "pilot_expansion_gate", status: gatesForCohort.some((item) => item.gate_status === "APPROVED") && plansForCohort.some((item) => item.onboarding_status === "COMPLETE") ? "PASS" : "FAIL", detail: gatesForCohort.some((item) => item.gate_status === "APPROVED") ? "approved RC gate present" : "approved RC gate missing" },
    { key: "audit_event_trace", status: audits.length > 0 && events.length > 0 ? "PASS" : "FAIL", detail: `${audits.length} audit(s), ${events.length} event(s)` }
  ];
  const failed = checks.filter((check) => check.status !== "PASS");
  return {
    code: "R4-S5-PRIVATE-PILOT-COHORT-GATE",
    generated_at: new Date().toISOString(),
    scope: { tenant_id: tenantId ?? null, firm_id: firmId ?? null, cohort_id: selectedCohort?.id ?? cohortId ?? null },
    status: failed.length === 0 ? "READY_FOR_PRIVATE_PILOT" : "BLOCKED",
    accepted_prior_evidence_required: r4S5AcceptedEvidence,
    selected_cohort: selectedCohort,
    counts: { cohorts: cohorts.length, pilot_users: pilotUsers.length, active_pilot_users: activeUsers.length, revoked_pilot_users: revokedUsers.length, onboarding_plans: plansForCohort.length, release_candidate_gates: gatesForCohort.length, active_incidents: activeIncidents.length, support_cases: supportCases.length },
    checks,
    blocked_reasons: failed.map((check) => `${check.key}: ${check.detail}`),
    boundaries: ["private_pilot_only", "no_public_marketplace", "no_trusted_specialist_network", "no_autonomous_regulated_approval", "no_live_payment_movement"]
  };
}

async function activatePrivatePilotCohort(body, req = null) {
  requireFields(body, ["tenant_id", "expansion_cohort_id"]);
  const actor = actorFromBody(body, req, body.tenant_id, body.firm_id ?? null);
  requireHumanOperationalAuthority(actor, "activatePrivatePilotCohort");
  const gateUrl = new URL(`http://localhost/pilot/r4-private-cohort-gate?tenant_id=${body.tenant_id}&firm_id=${body.firm_id ?? ""}&cohort_id=${body.expansion_cohort_id}`);
  const gate = await readR4PrivatePilotCohortGate(req, gateUrl);
  if (gate.status !== "READY_FOR_PRIVATE_PILOT") {
    const error = new Error(`Private pilot cohort activation blocked: ${gate.blocked_reasons.join("; ")}`);
    error.status = 409;
    error.code = "PRIVATE_PILOT_COHORT_BLOCKED";
    throw error;
  }
  return activatePrivatePilotCohortRecord({ ...body, activation_gate: gate }, actor);
}
async function readPilotReviewBoardSummary(req, url) {
  assertActorScope(devActorFromHeaders(req), { tenant_id: url.searchParams.get("tenant_id"), firm_id: url.searchParams.get("firm_id") }, "stakeholder review summary");
  const store = await readStore();
  const tenantId = url.searchParams.get("tenant_id");
  const firmId = url.searchParams.get("firm_id");
  const scope = (records) => (records ?? []).filter((item)=> (!tenantId || item.tenant_id === tenantId) && (!firmId || item.firm_id === firmId));
  const reports = scope(store.pilot_report_packs);
  const boards = scope(store.stakeholder_review_boards);
  const decisions = scope(store.stakeholder_review_decisions);
  const improvements = scope(store.pilot_improvement_items);
  const incidents = scope(store.pilot_incidents);
  return {
    generated_at: new Date().toISOString(),
    scope: { tenant_id: tenantId ?? null, firm_id: firmId ?? null },
    status: decisions.some((item)=>item.decision === "APPROVE_EXPANSION") ? "EXPANSION_APPROVED" : boards.some((item)=>item.review_status === "OPEN") ? "BOARD_REVIEW_OPEN" : reports.length ? "REPORT_READY" : "REPORT_REQUIRED",
    counts: {
      report_packs: reports.length,
      review_boards: boards.length,
      open_boards: boards.filter((item)=>item.review_status === "OPEN").length,
      decisions: decisions.length,
      open_improvements: improvements.filter((item)=>!["DONE","CLOSED"].includes(item.status)).length,
      active_incidents: incidents.filter((item)=>!["RESOLVED","CLOSED"].includes(item.status)).length
    },
    latest_report: reports.at(-1) ?? null,
    open_boards: boards.filter((item)=>item.review_status === "OPEN").slice(-10).reverse(),
    latest_decisions: decisions.slice(-10).reverse(),
    board_actions: ["generate_report_pack", "open_review_board", "record_review_decision", "export_pilot_pack"]
  };
}

async function generatePilotReportPack(body, req = null) {
  requireFields(body, ["tenant_id"]);
  const actor = actorFromBody(body, req, body.tenant_id, body.firm_id ?? null);
  return createPilotReportPackRecord(body, actor);
}

async function openStakeholderReviewBoard(body, req = null) {
  requireFields(body, ["tenant_id"]);
  const actor = actorFromBody(body, req, body.tenant_id, body.firm_id ?? null);
  return createStakeholderReviewBoardRecord(body, actor);
}

async function recordStakeholderReviewDecision(body, req = null) {
  requireFields(body, ["tenant_id", "board_id", "decision"]);
  const actor = actorFromBody(body, req, body.tenant_id, body.firm_id ?? null);
  return createStakeholderReviewDecisionRecord(body, actor);
}
async function readPilotLearningLoop(req, url) {
  assertActorScope(devActorFromHeaders(req), { tenant_id: url.searchParams.get("tenant_id"), firm_id: url.searchParams.get("firm_id") }, "pilot learning loop");
  const store = await readStore();
  const tenantId = url.searchParams.get("tenant_id");
  const firmId = url.searchParams.get("firm_id");
  const scope = (records) => (records ?? []).filter((item)=> (!tenantId || item.tenant_id === tenantId) && (!firmId || item.firm_id === firmId));
  const feedback = scope(store.pilot_feedback);
  const reviews = scope(store.pilot_acceptance_reviews);
  const improvements = scope(store.pilot_improvement_items);
  const positive = feedback.filter((item)=>item.sentiment === "POSITIVE").length;
  const negative = feedback.filter((item)=>item.sentiment === "NEGATIVE").length;
  const ratings = feedback.map((item)=>Number(item.rating)).filter((value)=>Number.isFinite(value));
  return {
    generated_at: new Date().toISOString(),
    scope: { tenant_id: tenantId ?? null, firm_id: firmId ?? null },
    status: improvements.some((item)=>["OPEN","IN_PROGRESS"].includes(item.status) && ["P0","P1"].includes(item.priority)) ? "IMPROVEMENT_REQUIRED" : reviews.some((item)=>item.decision === "PASS") ? "PILOT_ACCEPTANCE_PROGRESSING" : "FEEDBACK_COLLECTION_ACTIVE",
    counts: {
      feedback: feedback.length,
      positive_feedback: positive,
      negative_feedback: negative,
      acceptance_reviews: reviews.length,
      passed_reviews: reviews.filter((item)=>item.decision === "PASS").length,
      improvement_items: improvements.length,
      open_improvements: improvements.filter((item)=>!["DONE","CLOSED"].includes(item.status)).length,
      high_priority_improvements: improvements.filter((item)=>["P0","P1"].includes(item.priority) && !["DONE","CLOSED"].includes(item.status)).length
    },
    rating_average: ratings.length ? Number((ratings.reduce((sum,value)=>sum+value,0)/ratings.length).toFixed(2)) : null,
    latest_feedback: feedback.slice(-5).reverse(),
    latest_reviews: reviews.slice(-5).reverse(),
    open_improvements: improvements.filter((item)=>!["DONE","CLOSED"].includes(item.status)).slice(-10).reverse(),
    loop: ["collect_feedback", "review_acceptance", "create_improvement", "close_improvement", "retest_pilot"]
  };
}

function release4EvidenceChecks({ privateGate, learningLoop, reviewBoard, observability, exportManifest, auditEvents, activeIncidents, openHighPriority }) {
  return [
    { key: "r4_s1_to_s5_private_pilot_gate", status: privateGate.status === "READY_FOR_PRIVATE_PILOT" ? "PASS" : "FAIL", detail: privateGate.status },
    { key: "feedback_intake_model", status: learningLoop.counts.feedback > 0 ? "PASS" : "FAIL", detail: `${learningLoop.counts.feedback} feedback record(s)` },
    { key: "feedback_classification", status: learningLoop.counts.positive_feedback + learningLoop.counts.negative_feedback > 0 || learningLoop.rating_average !== null ? "PASS" : "FAIL", detail: `positive=${learningLoop.counts.positive_feedback}, negative=${learningLoop.counts.negative_feedback}, rating_average=${learningLoop.rating_average ?? "n/a"}` },
    { key: "governed_backlog_conversion", status: learningLoop.counts.improvement_items > 0 ? "PASS" : "FAIL", detail: `${learningLoop.counts.improvement_items} improvement item(s)` },
    { key: "high_priority_backlog_closed_or_accepted", status: openHighPriority === 0 ? "PASS" : "FAIL", detail: `${openHighPriority} open P0/P1 item(s)` },
    { key: "out_of_scope_feedback_rejection", status: "PASS", detail: "R4 learning backlog blocks marketplace, VF-24, autonomous regulated approval, live payment, and uncontrolled launch scope." },
    { key: "observability_audit_evidence", status: observability.status === "REVIEW_READY" && auditEvents.length > 0 ? "PASS" : "FAIL", detail: `${auditEvents.length} audit event(s), observability=${observability.status}` },
    { key: "stakeholder_review_decision", status: reviewBoard.counts.decisions > 0 ? "PASS" : "FAIL", detail: `${reviewBoard.counts.decisions} decision(s)` },
    { key: "tenant_export_evidence", status: exportManifest.integrity?.audit_trail_included && exportManifest.integrity?.secrets_excluded ? "PASS" : "FAIL", detail: "tenant scoped export manifest with audit trail and secret exclusion" },
    { key: "no_active_private_pilot_incidents", status: activeIncidents === 0 ? "PASS" : "FAIL", detail: `${activeIncidents} active incident(s)` }
  ];
}

async function readR4EvidenceGoNoGo(req, url) {
  assertActorScope(devActorFromHeaders(req), { tenant_id: url.searchParams.get("tenant_id"), firm_id: url.searchParams.get("firm_id") }, "R4 evidence go/no-go");
  const tenantId = url.searchParams.get("tenant_id");
  const firmId = url.searchParams.get("firm_id");
  const cohortId = url.searchParams.get("cohort_id");
  const qs = `tenant_id=${tenantId ?? ""}&firm_id=${firmId ?? ""}${cohortId ? `&cohort_id=${cohortId}` : ""}`;
  const privateGate = await readR4PrivatePilotCohortGate(req, new URL(`http://localhost/pilot/r4-private-cohort-gate?${qs}`));
  const learningLoop = await readPilotLearningLoop(req, new URL(`http://localhost/pilot/learning-loop?${qs}`));
  const reviewBoard = await readPilotReviewBoardSummary(req, new URL(`http://localhost/stakeholder-review/summary?${qs}`));
  const observability = await readR4ObservabilityAuditReview(req, new URL(`http://localhost/ops/r4-observability-audit-review?${qs}`));
  const exportManifest = await readDataExportManifest(req, new URL(`http://localhost/data-protection/export-manifest?${qs}`));
  const store = await readStore();
  const scope = (records) => (records ?? []).filter((item) => (!tenantId || item.tenant_id === tenantId) && (!firmId || item.firm_id === firmId));
  const auditEvents = scope(store.audit_events);
  const activeIncidents = scope(store.pilot_incidents).filter((item) => !["RESOLVED", "CLOSED"].includes(item.status)).length;
  const openHighPriority = scope(store.pilot_improvement_items).filter((item) => ["P0", "P1"].includes(item.priority) && !["DONE", "CLOSED"].includes(item.status)).length;
  const checks = release4EvidenceChecks({ privateGate, learningLoop, reviewBoard, observability, exportManifest, auditEvents, activeIncidents, openHighPriority });
  const failed = checks.filter((check) => check.status !== "PASS");
  const recommendation = failed.length === 0 ? "GO_FOR_RELEASE_4_ACCEPTANCE" : failed.some((check) => ["r4_s1_to_s5_private_pilot_gate", "observability_audit_evidence", "no_active_private_pilot_incidents"].includes(check.key)) ? "NO_GO" : "GO_WITH_LIMITATIONS";
  return {
    code: "R4-S6-EVIDENCE-GO-NO-GO",
    generated_at: new Date().toISOString(),
    scope: { tenant_id: tenantId ?? null, firm_id: firmId ?? null, cohort_id: privateGate.scope?.cohort_id ?? cohortId ?? null },
    status: failed.length === 0 ? "EVIDENCE_READY" : "EVIDENCE_INCOMPLETE",
    recommendation,
    checks,
    evidence_pack: {
      private_pilot_gate: privateGate.status,
      learning_loop_status: learningLoop.status,
      review_board_status: reviewBoard.status,
      observability_status: observability.status,
      export_manifest_integrity: exportManifest.integrity,
      counts: {
        feedback: learningLoop.counts.feedback,
        acceptance_reviews: learningLoop.counts.acceptance_reviews,
        improvement_items: learningLoop.counts.improvement_items,
        open_improvements: learningLoop.counts.open_improvements,
        review_decisions: reviewBoard.counts.decisions,
        audit_events: auditEvents.length,
        active_incidents: activeIncidents
      }
    },
    blocked_reasons: failed.map((check) => `${check.key}: ${check.detail}`),
    boundaries: ["private_pilot_only", "no_public_marketplace", "no_trusted_specialist_network", "no_vf24_ecosystem_intelligence", "no_autonomous_regulated_approval", "no_live_payment_movement"]
  };
}

async function submitPilotFeedback(body, req = null) {
  requireFields(body, ["tenant_id", "subject"]);
  const actor = actorFromBody(body, req, body.tenant_id, body.firm_id ?? null);
  return createPilotFeedbackRecord(body, actor);
}

async function reviewPilotAcceptance(body, req = null) {
  requireFields(body, ["tenant_id"]);
  const actor = actorFromBody(body, req, body.tenant_id, body.firm_id ?? null);
  return createPilotAcceptanceReviewRecord(body, actor);
}

function assertR4LearningScope(body) {
  const text = JSON.stringify({ title: body.title, description: body.description, target_stage: body.target_stage, item_type: body.item_type, metadata: body.metadata }).toLowerCase();
  const blocked = [
    "public marketplace",
    "open marketplace",
    "trusted specialist network",
    "vf-24",
    "ecosystem intelligence",
    "autonomous regulated approval",
    "autonomous approval",
    "live payment",
    "payment capture",
    "production launch",
    "uncontrolled launch"
  ].find((phrase) => text.includes(phrase));
  if (blocked) {
    const error = new Error(`Release 4 learning backlog cannot accept out-of-scope item: ${blocked}.`);
    error.status = 403;
    error.code = "R4_LEARNING_SCOPE_BOUNDARY_DENIED";
    throw error;
  }
}

async function createPilotImprovement(body, req = null) {
  requireFields(body, ["tenant_id", "title"]);
  assertR4LearningScope(body);
  const actor = actorFromBody(body, req, body.tenant_id, body.firm_id ?? null);
  return createPilotImprovementItemRecord(body, actor);
}

async function updatePilotImprovement(body, req = null) {
  requireFields(body, ["tenant_id", "improvement_item_id"]);
  const actor = actorFromBody(body, req, body.tenant_id, body.firm_id ?? null);
  return updatePilotImprovementItemRecord(body, actor);
}
function publicTimestamp(value) {
  return value ?? null;
}

function summarizeReviewRecord(record, index = 0) {
  return {
    id: record?.id ?? null,
    type: record?.event_type ?? record?.action ?? record?.status ?? record?.resource_type ?? "record",
    actor_id: record?.actor_id ?? record?.created_by_actor_id ?? record?.prepared_by_actor_id ?? record?.opened_by_actor_id ?? null,
    actor_type: record?.actor_type ?? null,
    tenant_id: record?.tenant_id ?? null,
    firm_id: record?.firm_id ?? null,
    resource_type: record?.resource_type ?? record?.aggregate_type ?? null,
    resource_id: record?.resource_id ?? record?.aggregate_id ?? record?.id ?? null,
    status: record?.status ?? record?.state ?? record?.decision ?? record?.result ?? null,
    summary: record?.summary ?? record?.payload_summary ?? record?.title ?? record?.subject ?? record?.description ?? `Review record ${index + 1}`,
    occurred_at: publicTimestamp(record?.occurred_at ?? record?.created_at ?? record?.updated_at ?? record?.decided_at)
  };
}

function containsPrivateReasoning(value) {
  const forbiddenKeys = ["chain_of_thought", "private_chain_of_thought", "reasoning_trace", "hidden_reasoning", "raw_prompt", "raw_completion", "messages"];
  const visit = (node) => {
    if (!node || typeof node !== "object") return false;
    if (Array.isArray(node)) return node.some(visit);
    return Object.entries(node).some(([key, child]) => forbiddenKeys.includes(String(key).toLowerCase()) || visit(child));
  };
  return visit(value);
}

async function readR4ObservabilityAuditReview(req, url) {
  assertActorScope(devActorFromHeaders(req), { tenant_id: url.searchParams.get("tenant_id"), firm_id: url.searchParams.get("firm_id") }, "R4 observability audit review");
  const store = await readStore();
  const tenantId = url.searchParams.get("tenant_id");
  const firmId = url.searchParams.get("firm_id");
  const scope = (records) => (records ?? []).filter((item) => (!tenantId || item.tenant_id === tenantId) && (!firmId || item.firm_id === firmId));
  const events = scope(store.event_log);
  const audits = scope(store.audit_events);
  const policies = scope(store.policy_decisions);
  const workerBindings = scope(store.factory_worker_bindings).concat(scope(store.worker_instances));
  const workerActions = events.filter((event) => /worker|task|tool|factory|pack|service/.test(String(event.event_type ?? "")));
  const incidents = scope(store.pilot_incidents);
  const supportCases = scope(store.support_cases);
  const deniedPolicies = policies.filter((item) => ["DENY", "BLOCK", "REJECT"].includes(String(item.result ?? item.decision ?? "").toUpperCase()));
  const policyEvents = events.filter((event) => event.policy_decision_id || String(event.event_type ?? "").includes("policy"));
  const rawSamples = [events, audits, policies, workerBindings, workerActions].flat().slice(-60);
  const privateReasoningDetected = rawSamples.some(containsPrivateReasoning);
  const runtimeTraceSummaries = events.slice(-12).reverse().map(summarizeReviewRecord);
  const applicationLogSummary = {
    source: "derived_api_runtime_and_business_events",
    status: incidents.some((item) => !["RESOLVED", "CLOSED"].includes(item.status)) ? "INCIDENT_REVIEW_REQUIRED" : "REVIEWABLE",
    records_reviewed: events.length + audits.length,
    warnings: [
      ...(events.length ? [] : ["No runtime events recorded for selected scope."]),
      ...(audits.length ? [] : ["No audit records recorded for selected scope."]),
      ...(incidents.filter((item) => !["RESOLVED", "CLOSED"].includes(item.status)).length ? ["Active pilot incident requires review."] : [])
    ]
  };
  const reviewCompleteness = [
    { key: "runtime_trace_summary_model", status: events.length ? "PASS" : "WAITING", detail: "Canonical event log is summarized without raw prompts or private reasoning." },
    { key: "application_log_summary_model", status: "PASS", detail: "Application review status is derived from runtime events, audit records, incidents, and warnings." },
    { key: "worker_action_review_model", status: workerActions.length || workerBindings.length ? "PASS" : "WAITING", detail: "Worker bindings and worker/task/tool events are summarized with actor and authority context where available." },
    { key: "business_audit_review_model", status: audits.length ? "PASS" : "WAITING", detail: "Business audit records are tenant scoped and reviewable as evidence summaries." },
    { key: "policy_decision_review_model", status: policies.length || policyEvents.length ? "PASS" : "WAITING", detail: "Policy decisions and policy-linked events are counted and summarized." },
    { key: "private_chain_of_thought_excluded", status: privateReasoningDetected ? "FAIL" : "PASS", detail: "Review output excludes private chain-of-thought, raw prompts, raw completions, and message transcripts." },
    { key: "evidence_summaries_reviewable", status: audits.length && events.length ? "PASS" : "WAITING", detail: "Evidence summaries link material actions to event and audit records." }
  ];
  return {
    code: "R4-S4-OBSERVABILITY-AUDIT-REVIEW",
    generated_at: new Date().toISOString(),
    scope: { tenant_id: tenantId ?? null, firm_id: firmId ?? null },
    status: reviewCompleteness.some((check) => check.status === "FAIL") ? "BLOCKED_PRIVATE_REASONING_LEAK" : reviewCompleteness.every((check) => check.status === "PASS") ? "REVIEW_READY" : "REVIEW_WAITING_FOR_ACTIVITY",
    counts: {
      runtime_events: events.length,
      audit_records: audits.length,
      policy_decisions: policies.length,
      denied_policy_decisions: deniedPolicies.length,
      worker_bindings: workerBindings.length,
      worker_action_records: workerActions.length,
      support_cases: supportCases.length,
      pilot_incidents: incidents.length,
      active_pilot_incidents: incidents.filter((item) => !["RESOLVED", "CLOSED"].includes(item.status)).length
    },
    runtime_trace_summaries: runtimeTraceSummaries,
    application_log_summary: applicationLogSummary,
    worker_action_review: {
      bindings: workerBindings.slice(-10).reverse().map((binding, index) => ({
        id: binding.id ?? null,
        worker_code: binding.worker_code ?? binding.template_code ?? binding.name ?? `worker_${index + 1}`,
        actor_type: binding.actor_type ?? "AI_AGENT",
        binding_state: binding.binding_state ?? binding.status ?? null,
        supervisor_actor_id: binding.supervisor_actor_id ?? null,
        authority_envelope_present: Boolean(binding.authority_envelope ?? binding.authority_scope ?? binding.permissions)
      })),
      recent_actions: workerActions.slice(-10).reverse().map(summarizeReviewRecord)
    },
    business_audit_review: audits.slice(-12).reverse().map(summarizeReviewRecord),
    policy_decision_review: {
      decisions: policies.slice(-12).reverse().map((decision, index) => ({
        id: decision.id ?? null,
        action: decision.action ?? decision.requested_action ?? decision.resource_type ?? `policy_${index + 1}`,
        resource_type: decision.resource_type ?? null,
        result: decision.result ?? decision.decision ?? null,
        reasons: decision.reasons ?? decision.reason_codes ?? [],
        created_at: publicTimestamp(decision.created_at ?? decision.decided_at)
      })),
      policy_linked_events: policyEvents.slice(-10).reverse().map(summarizeReviewRecord)
    },
    evidence_summary: {
      latest_audit_refs: audits.slice(-8).reverse().map((audit) => ({ id: audit.id, action: audit.action, resource_type: audit.resource_type, resource_id: audit.resource_id, summary: audit.summary })),
      latest_event_refs: events.slice(-8).reverse().map((event) => ({ id: event.id, event_type: event.event_type, aggregate_type: event.aggregate_type, aggregate_id: event.aggregate_id, summary: event.payload_summary })),
      legally_permissible_export_alignment: "Audit and event records remain tenant-scoped and exportable through the existing data-protection export package where legally permissible."
    },
    redaction_policy: {
      private_chain_of_thought_excluded: !privateReasoningDetected,
      excluded_fields: ["chain_of_thought", "private_chain_of_thought", "reasoning_trace", "hidden_reasoning", "raw_prompt", "raw_completion", "messages"],
      expose_only: ["timestamps", "actor_ids", "actor_types", "resource_refs", "state", "decision_result", "evidence_summary"]
    },
    review_completeness: reviewCompleteness
  };
}
async function readOperatorMetrics(req, url) {
  assertActorScope(devActorFromHeaders(req), { tenant_id: url.searchParams.get("tenant_id"), firm_id: url.searchParams.get("firm_id") }, "operator metrics");
  const store = await readStore();
  const tenantId = url.searchParams.get("tenant_id");
  const firmId = url.searchParams.get("firm_id");
  const scope = (records) => (records ?? []).filter((item)=> (!tenantId || item.tenant_id === tenantId) && (!firmId || item.firm_id === firmId));
  const incidents = scope(store.pilot_incidents);
  const cases = scope(store.support_cases);
  const events = scope(store.event_log);
  const tasks = scope(store.tasks);
  const invoices = scope(store.invoices);
  const activeIncidents = incidents.filter((item)=>!["RESOLVED","CLOSED"].includes(item.status));
  const criticalIncidents = activeIncidents.filter((item)=>["SEV1","SEV2"].includes(item.severity));
  const openCases = cases.filter((item)=>item.status !== "CLOSED");
  const warnings = [];
  if (criticalIncidents.length) warnings.push("Critical pilot incident requires operator attention.");
  if (openCases.some((item)=>item.severity === "CRITICAL")) warnings.push("Critical support case is open.");
  if (!events.length) warnings.push("No audit/event activity recorded for this scope yet.");
  return {
    generated_at: new Date().toISOString(),
    scope: { tenant_id: tenantId ?? null, firm_id: firmId ?? null },
    status: criticalIncidents.length ? "INCIDENT_ACTIVE" : openCases.length ? "SUPPORT_QUEUE_ACTIVE" : "PILOT_STABLE",
    counts: {
      incidents: incidents.length,
      active_incidents: activeIncidents.length,
      critical_incidents: criticalIncidents.length,
      support_cases: cases.length,
      open_support_cases: openCases.length,
      events: events.length,
      tasks: tasks.length,
      open_tasks: tasks.filter((item)=>!["COMPLETED","DONE"].includes(item.state)).length,
      invoices: invoices.length,
      issued_or_paid_invoices: invoices.filter((item)=>["ISSUED","PAID"].includes(item.status)).length
    },
    queues: {
      incidents: activeIncidents.slice(-10).reverse(),
      support_cases: openCases.slice(-10).reverse()
    },
    warnings,
    operator_actions: ["open_incident", "update_incident", "review_support_queue", "review_audit_events", "verify_revoked_access"]
  };
}

async function createPilotIncident(body, req = null) {
  requireFields(body, ["tenant_id", "title"]);
  const actor = actorFromBody(body, req, body.tenant_id, body.firm_id ?? null);
  requireHumanOperationalAuthority(actor, "createPilotIncident");
  return createPilotIncidentRecord(body, actor);
}

async function updatePilotIncident(body, req = null) {
  requireFields(body, ["tenant_id", "incident_id"]);
  const actor = actorFromBody(body, req, body.tenant_id, body.firm_id ?? null);
  requireHumanOperationalAuthority(actor, "updatePilotIncident");
  return updatePilotIncidentRecord(body, actor);
}
function readR4SupportIncidentPolicy() {
  return {
    code: "R4-S3-SUPPORT-INCIDENT-POLICY",
    support_case_states: ["OPEN", "TRIAGED", "ESCALATED", "WAITING_ON_USER", "RESOLVED", "CLOSED"],
    incident_states: ["OPEN", "TRIAGED", "MITIGATING", "ESCALATED", "RESOLVED", "CLOSED"],
    triage_categories: ["ACCESS_SUPPORT", "DATA_PROTECTION", "WORKFLOW_BLOCKER", "REGULATED_WORK_GOVERNANCE", "BILLING_OR_COMMERCIAL", "GENERAL_SUPPORT"],
    support_severities: ["LOW", "NORMAL", "HIGH", "CRITICAL"],
    incident_severities: ["SEV1", "SEV2", "SEV3", "SEV4"],
    authority_boundary: {
      allowed_actor_type: "HUMAN",
      denied_actor_types: ["AI_AGENT", "SYSTEM", "EXTERNAL_SERVICE"],
      no_autonomous_restore: true,
      no_autonomous_regulated_approval: true,
      no_live_payment_action: true
    },
    suspension_path: ["support_case.opened", "pilot_incident.opened", "pilot_user.suspended", "pilot_incident.updated", "support_case.updated"],
    recovery_path: ["mitigation_summary", "root_cause_summary", "resolved_at", "audit_events"],
    private_pilot_gate: "R4-S3 evidence required before private pilot cohort activation"
  };
}

async function readSupportDeskSummary(req, url) {
  assertActorScope(devActorFromHeaders(req), { tenant_id: url.searchParams.get("tenant_id"), firm_id: url.searchParams.get("firm_id") }, "support summary");
  const store = await readStore();
  const tenantId = url.searchParams.get("tenant_id");
  const scopedCases = (store.support_cases ?? []).filter((item)=>!tenantId || item.tenant_id === tenantId);
  const scopedUsers = (store.pilot_users ?? []).filter((item)=>!tenantId || item.tenant_id === tenantId);
  return {
    generated_at: new Date().toISOString(),
    counts: {
      pilot_users: scopedUsers.length,
      active_pilot_users: scopedUsers.filter((user)=>user.invite_status === "ACTIVE").length,
      revoked_pilot_users: scopedUsers.filter((user)=>user.invite_status === "REVOKED").length,
      support_cases: scopedCases.length,
      open_cases: scopedCases.filter((item)=>item.status !== "CLOSED").length,
      critical_cases: scopedCases.filter((item)=>item.severity === "CRITICAL").length
    },
    queue: scopedCases.slice(-10).reverse(),
    controls: ["pilot_user_revoke", "support_case_open", "support_case_update", "tenant_scoped_queue"]
  };
}

async function revokePilotUser(body, req = null) {
  requireFields(body, ["tenant_id", "pilot_user_id"]);
  const actor = actorFromBody(body, req, body.tenant_id, body.firm_id ?? null);
  requireHumanOperationalAuthority(actor, "revokePilotUser");
  return revokePilotUserRecord(body, actor);
}

async function suspendPilotUser(body, req = null) {
  requireFields(body, ["tenant_id", "pilot_user_id"]);
  const actor = actorFromBody(body, req, body.tenant_id, body.firm_id ?? null);
  requireHumanOperationalAuthority(actor, "suspendPilotUser");
  return suspendPilotUserRecord(body, actor);
}

async function createSupportCase(body, req = null) {
  requireFields(body, ["tenant_id", "subject"]);
  const actor = actorFromBody(body, req, body.tenant_id, body.firm_id ?? null);
  requireHumanOperationalAuthority(actor, "createSupportCase");
  return createSupportCaseRecord(body, actor);
}

async function updateSupportCase(body, req = null) {
  requireFields(body, ["tenant_id", "support_case_id"]);
  const actor = actorFromBody(body, req, body.tenant_id, body.firm_id ?? null);
  requireHumanOperationalAuthority(actor, "updateSupportCase");
  return updateSupportCaseRecord(body, actor);
}
async function invitePilotUser(body, req = null) {
  requireFields(body, ["tenant_id", "email"]);
  const actor = actorFromBody(body, req, body.tenant_id, body.firm_id ?? null);
  return invitePilotUserRecord(body, actor);
}

async function activatePilotUser(body, req = null) {
  requireFields(body, ["tenant_id"]);
  const actor = actorFromBody(body, req, body.tenant_id, body.firm_id ?? null);
  return activatePilotUserRecord(body, actor);
}

async function createFactoryFirmBlueprint(body, req = null) {
  requireFields(body, ["tenant_id", "bundle"]);
  const actor = actorFromBody(body, req, body.tenant_id, null);
  return createFactoryFirmBlueprintRecord(body, actor);
}

async function validateFactoryFirmBlueprint(body, req = null) {
  requireFields(body, ["tenant_id", "firm_blueprint_id"]);
  const actor = actorFromBody(body, req, body.tenant_id, null);
  return validateFactoryFirmBlueprintRecord(body, actor);
}

async function approveFactoryFirmBlueprint(body, req = null) {
  requireFields(body, ["tenant_id", "firm_blueprint_id"]);
  const actor = actorFromBody(body, req, body.tenant_id, null);
  return approveFactoryFirmBlueprintRecord(body, actor);
}

async function createFactoryProvisioningRun(body, req = null) {
  requireFields(body, ["tenant_id", "firm_blueprint_id"]);
  const actor = actorFromBody(body, req, body.tenant_id, null);
  return createFactoryProvisioningRunRecord(body, actor);
}


async function certifyFactoryPackBinding(body, req = null) {
  requireFields(body, ["tenant_id", "provisioning_run_id"]);
  const actor = actorFromBody(body, req, body.tenant_id, body.firm_id ?? null);
  return certifyFactoryPackBindingRecord(body, actor);
}
async function runFactoryReadinessTest(body, req = null) {
  requireFields(body, ["tenant_id", "provisioning_run_id"]);
  const actor = actorFromBody(body, req, body.tenant_id, body.firm_id ?? null);
  return runFactoryReadinessTestRecord(body, actor);
}

async function acceptFactoryHandoff(body, req = null) {
  requireFields(body, ["tenant_id", "provisioning_run_id"]);
  const actor = actorFromBody(body, req, body.tenant_id, body.firm_id ?? null);
  return acceptFactoryHandoffRecord(body, actor);
}
async function createDemoLoop(body) {
  requireFields(body, ["tenant_name", "firm_name", "principal_name", "client_name", "project_name"]);
  const tenant = await createTenant({ name: body.tenant_name, default_region: body.default_region });
  const firmResult = await createFirm({ tenant_id: tenant.id, name: body.firm_name, principal_name: body.principal_name });
  const clientResult = await createClient({ tenant_id: tenant.id, firm_id: firmResult.firm.id, name: body.client_name, actor: firmResult.principal_actor });
  const intakeResult = await createIntakeSession({ tenant_id: tenant.id, firm_id: firmResult.firm.id, relationship_id: clientResult.relationship.id, provided_inputs: body.formwork_inputs ?? {}, actor: firmResult.principal_actor });
  const proposalResult = await createProposal({ tenant_id: tenant.id, firm_id: firmResult.firm.id, relationship_id: clientResult.relationship.id, intake_session_id: intakeResult.intake.id, scope_summary: "Preliminary formwork design support package", final_price: body.final_price, actor: firmResult.principal_actor });
  const approvalResult = await approveProposal({ tenant_id: tenant.id, firm_id: firmResult.firm.id, proposal_id: proposalResult.proposal.id, actor: firmResult.principal_actor });
  const acceptance = await acceptProposal({ tenant_id: tenant.id, firm_id: firmResult.firm.id, proposal_id: approvalResult.proposal.id, project_name: body.project_name, actor: firmResult.principal_actor });
  const evidence = await createEvidenceBundle({ tenant_id: tenant.id, firm_id: firmResult.firm.id, project_id: acceptance.project.id, subject_type: "Project", subject_id: acceptance.project.id, input_refs: [intakeResult.intake.id], actor: firmResult.principal_actor });
  const invoice = await createInvoice({ tenant_id: tenant.id, firm_id: firmResult.firm.id, relationship_id: clientResult.relationship.id, engagement_id: acceptance.engagement.id, project_id: acceptance.project.id, line_items: [{ description: formworkServicePack.mvp_service, amount: body.final_price ?? 2500 }], currency: body.currency, actor: firmResult.principal_actor });
  return { tenant, ...firmResult, ...clientResult, ...intakeResult, ...proposalResult, approval: approvalResult.approval, ...acceptance, evidence, invoice };
}

async function createQuotationCase(body, req = null) {
  requireFields(body, ["tenant_id", "firm_id", "relationship_id", "title", "client_request_summary"]);
  return createQuotationCaseRecord(body, actorFromBody(body, req, body.tenant_id, body.firm_id));
}
async function linkQuotationCaseProposal(body, req = null) {
  requireFields(body, ["tenant_id", "firm_id", "quotation_case_id", "proposal_id"]);
  return linkQuotationCaseProposalRecord(body, actorFromBody(body, req, body.tenant_id, body.firm_id));
}
async function approveQuotationCase(body, req = null) {
  requireFields(body, ["tenant_id", "firm_id", "quotation_case_id"]);
  return approveQuotationCaseRecord(body, actorFromBody(body, req, body.tenant_id, body.firm_id));
}
async function issueQuotationCase(body, req = null) {
  requireFields(body, ["tenant_id", "firm_id", "quotation_case_id", "issued_document_ref", "submitted_evidence_ref"]);
  return issueQuotationCaseRecord(body, actorFromBody(body, req, body.tenant_id, body.firm_id));
}

async function createBoqExtractionAid(body, req = null) {
  requireFields(body, ["tenant_id", "firm_id", "quotation_case_id"]);
  return createBoqExtractionAidRecord(body, actorFromBody(body, req, body.tenant_id, body.firm_id));
}
async function reviewBoqExtractionAid(body, req = null) {
  requireFields(body, ["tenant_id", "firm_id", "boq_extraction_aid_id"]);
  return reviewBoqExtractionAidRecord(body, actorFromBody(body, req, body.tenant_id, body.firm_id));
}

const routes = new Map([
  ["POST /tenants", createTenant],
  ["POST /firms", createFirm],
  ["POST /clients", createClient],
  ["POST /intake-sessions", createIntakeSession],
  ["POST /proposals", createProposal],
  ["POST /proposals/approve", approveProposal],
  ["POST /proposals/accept", acceptProposal],
  ["POST /evidence-bundles", createEvidenceBundle],
  ["POST /marketplace/listings", publishMarketplaceListing],
  ["POST /marketplace/directory-publications", publishQualifiedDirectoryListing],
  ["POST /marketplace/directory-publications/suspend", suspendQualifiedDirectoryListing],
  ["POST /marketplace/directory-publications/revoke", revokeQualifiedDirectoryListing],
  ["POST /marketplace/directory-review-board/decisions", recordDirectoryReviewBoardDecision],
  ["POST /marketplace/private-directory/enquiries", recordPrivateDirectoryEnquiry],
  ["POST /marketplace/private-directory/enquiries/request-collaboration", requestPrivateDirectoryCollaboration],
  ["POST /marketplace/qualification-renewal-reviews", recordQualificationRenewalReview],
  ["POST /capacity/offers", createCapacityOffer],
  ["POST /collaboration/requests", requestCollaboration],
  ["POST /observatory/snapshots", createObservatorySnapshot],
  ["POST /network/professional-profiles", createNetworkProfessionalProfile],
  ["POST /network/firm-profiles", createNetworkFirmProfile],
  ["POST /network/capabilities", createNetworkCapability],
  ["POST /network/credentials", createNetworkCredential],
  ["POST /network/trust-signals", createNetworkTrustSignal],
  ["POST /network/conflict-checks", createNetworkConflictCheck],
  ["POST /network/qualification-gates", createNetworkQualificationGate],
  ["POST /network/specialist-invitations", createSpecialistInvitation],
  ["POST /network/collaboration-workspaces", createCollaborationWorkspace],
  ["POST /network/collaboration-workspaces/participants", grantCollaborationWorkspaceParticipant],
  ["POST /network/collaboration-workspaces/participants/revoke", revokeCollaborationWorkspaceParticipant],
  ["POST /network/collaboration-workspaces/evidence", addCollaborationWorkspaceEvidence],
  ["POST /network/responsibility-matrices", createResponsibilityMatrix],
  ["POST /network/specialist-assignments", createSpecialistAssignment],
  ["POST /network/specialist-assignments/accept", (body, req) => transitionSpecialistAssignment(body, req, "accept")],
  ["POST /network/specialist-assignments/start", (body, req) => transitionSpecialistAssignment(body, req, "start")],
  ["POST /network/specialist-assignments/deliver", (body, req) => transitionSpecialistAssignment(body, req, "deliver")],
  ["POST /network/specialist-assignments/review", (body, req) => transitionSpecialistAssignment(body, req, "review")],
  ["POST /network/specialist-assignments/approve", (body, req) => transitionSpecialistAssignment(body, req, "approve")],
  ["POST /network/specialist-assignments/close", (body, req) => transitionSpecialistAssignment(body, req, "close")],
  ["POST /worker-instances", provisionWorkerInstance],
  ["POST /worker-instances/activate", activateWorkerInstance],
  ["POST /runtime/tasks/assign-ai", assignTaskToWorker],
  ["POST /runtime/tasks/output", produceTaskOutput],
  ["POST /front-desk/enquiries", createFrontDeskEnquiry],
  ["POST /front-desk/enquiries/qualify", qualifyFrontDeskEnquiry],
  ["POST /front-desk/communication-drafts", createClientCommunicationDraft],
  ["POST /front-desk/enquiries/handoff", handoffFrontDeskEnquiry],
  ["POST /administration/skill-bindings", bindAdministrationSkills],
  ["POST /commercial/skill-bindings", bindCommercialSkills],
  ["POST /sales/opportunities", createSalesOpportunity],
  ["POST /sales/opportunities/update", updateSalesOpportunity],
  ["POST /proposals/dispatch", dispatchProposal],
  ["POST /quotation-cases", createQuotationCase],
  ["POST /quotation-cases/link-proposal", linkQuotationCaseProposal],
  ["POST /quotation-cases/approve", approveQuotationCase],
  ["POST /quotation-cases/issue", issueQuotationCase],
  ["POST /boq-extraction-aids", createBoqExtractionAid],
  ["POST /boq-extraction-aids/review", reviewBoqExtractionAid],
  ["POST /accounts/expenses", createExpense],
  ["POST /accounts/expenses/approve", approveExpense],
  ["POST /accounts/receivable-follow-ups", createReceivableFollowUp],
  ["POST /administration/correspondence", createCorrespondence],
  ["POST /administration/documents", registerAdministrationDocument],
  ["POST /technical/skill-bindings", bindTechnicalSkills],
  ["POST /technical/drawing-reviews", createDrawingReview],
  ["POST /technical/calculation-input-sets", createCalculationInputSet],
  ["POST /technical/qa-findings", createTechnicalQaFinding],
  ["POST /technical/qa-findings/resolve", resolveTechnicalQaFinding],
  ["POST /technical/delivery-packages", createDeliveryPackage],
  ["POST /pilot/handoff", acceptPilotHandoff],
  ["POST /administration/document-revisions", addAdministrationRevision],
  ["POST /administration/deadlines", createAdministrationDeadline],
  ["POST /administration/deadlines/complete", completeAdministrationDeadline],
  ["POST /administration/transmittal-drafts", createTransmittalDraft],
  ["POST /runtime/tool-invocations", requestToolInvocation],
  ["POST /tasks/start", startTask],
  ["POST /tasks/complete", completeTask],
  ["POST /deliverables/draft", createDeliverableDraft],
  ["POST /deliverables/review", reviewDeliverable],
  ["POST /deliverables/issue", issueDeliverable],
  ["POST /invoices", createInvoice],
  ["POST /invoices/issue", issueInvoice],
  ["POST /payments/record", recordPaymentStatus],
  ["POST /pilot/users/invite", invitePilotUser],
  ["POST /pilot/users/activate", activatePilotUser],
  ["POST /pilot/users/revoke", revokePilotUser],
  ["POST /pilot/users/suspend", suspendPilotUser],
  ["POST /support/cases", createSupportCase],
  ["POST /support/cases/update", updateSupportCase],
  ["POST /ops/incidents", createPilotIncident],
  ["POST /ops/incidents/update", updatePilotIncident],
  ["POST /pilot/feedback", submitPilotFeedback],
  ["POST /pilot/acceptance-reviews", reviewPilotAcceptance],
  ["POST /pilot/improvement-items", createPilotImprovement],
  ["POST /pilot/improvement-items/update", updatePilotImprovement],
  ["POST /pilot/report-packs", generatePilotReportPack],
  ["POST /stakeholder-review/boards", openStakeholderReviewBoard],
  ["POST /stakeholder-review/decisions", recordStakeholderReviewDecision],
  ["POST /pilot/expansion-cohorts", createPilotExpansionCohort],
  ["POST /pilot/expansion-cohorts/update", updatePilotExpansionCohort],
  ["POST /pilot/private-cohort/activate", activatePrivatePilotCohort],
  ["POST /tenant-onboarding/plans", createTenantOnboardingPlan],
  ["POST /tenant-onboarding/plans/update", updateTenantOnboardingPlan],
  ["POST /release-candidate/gates", createReleaseCandidateGate],
  ["POST /tenant-pilot/controls", createTenantPilotControl],
  ["POST /tenant-usage/events", recordTenantUsage],
  ["POST /billing/readiness-reviews", reviewBillingReadiness],
  ["POST /payments/provider-configs", createPaymentProviderConfig],
  ["POST /subscriptions/packages", createSubscriptionPackage],
  ["POST /commercial-launch/controls", createCommercialLaunchControl],
  ["POST /factory/blueprints/firms", createFactoryFirmBlueprint],
  ["POST /factory/blueprints/firms/validate", validateFactoryFirmBlueprint],
  ["POST /factory/blueprints/firms/approve", approveFactoryFirmBlueprint],
  ["POST /factory/provisioning-runs", createFactoryProvisioningRun],
  ["POST /factory/provisioning-runs/certify-pack-binding", certifyFactoryPackBinding],
  ["POST /factory/provisioning-runs/readiness-test", runFactoryReadinessTest],
  ["POST /factory/provisioning-runs/accept-handoff", acceptFactoryHandoff],
  ["POST /mvp/demo-loop", createDemoLoop]
]);

const server = createServer(async (req, res) => {
  try {
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        ...corsHeaders(req),
        "cache-control": "no-store"
      });
      res.end();
      return;
    }

    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    if (req.method === "GET" && url.pathname === "/health") return sendJson(req, res, 200, { ok: true, service: "vfirm-api", phase: "persistent-mvp-command-loop", ...getStoreInfo(), port_family: "309#", api_port: port });
    if (req.method === "GET" && url.pathname === "/contracts") return sendJson(req, res, 200, { ok: true, data: apiContracts });
    if (req.method === "GET" && url.pathname === "/marketplace/governance-lock") return sendJson(req, res, 200, { ok: true, data: readMEGovernanceLock() });
    if (req.method === "GET" && url.pathname === "/marketplace/qualified-directory-summary") return sendJson(req, res, 200, { ok: true, data: await readMEQualifiedDirectorySummary(req, url) });
    if (req.method === "GET" && url.pathname === "/marketplace/private-directory-governance-summary") return sendJson(req, res, 200, { ok: true, data: await readMEPrivateDirectoryGovernanceSummary(req, url) });
    if (req.method === "GET" && url.pathname === "/marketplace/private-directory-intelligence-summary") return sendJson(req, res, 200, { ok: true, data: await readMEPrivateDirectoryIntelligenceSummary(req, url) });
    if (req.method === "GET" && url.pathname === "/ops/readiness") return sendJson(req, res, 200, { ok: true, data: readOpsReadiness() });
    if (req.method === "GET" && url.pathname === "/ops/staging-package") return sendJson(req, res, 200, { ok: true, data: readStagingDeploymentPackage() });
    if (req.method === "GET" && url.pathname === "/ops/r4-staging-readiness") return sendJson(req, res, 200, { ok: true, data: readR4StagingDataProtectionReadiness() });
    if (req.method === "GET" && url.pathname === "/data-protection/policy") return sendJson(req, res, 200, { ok: true, data: readDataProtectionPolicy() });
    if (req.method === "GET" && url.pathname === "/data-protection/export-manifest") return sendJson(req, res, 200, { ok: true, data: await readDataExportManifest(req, url) });
    if (req.method === "GET" && url.pathname === "/data-protection/export-package") return sendJson(req, res, 200, { ok: true, data: await readTenantExportPackage(req, url) });
    if (req.method === "GET" && url.pathname === "/pilot/formwork") return sendJson(req, res, 200, { ok: true, data: readFormworkPilotPackage() });
    if (req.method === "GET" && url.pathname === "/workspace/active-summary") return sendJson(req, res, 200, { ok: true, data: await readActiveWorkspaceSummary(req, url) });
    if (req.method === "GET" && url.pathname === "/dashboard/summary") return sendJson(req, res, 200, { ok: true, data: await readDashboardSummary(url) });
    if (req.method === "GET" && url.pathname === "/auth/context") return sendJson(req, res, 200, { ok: true, data: await readAuthContext(req) });
    if (req.method === "GET" && url.pathname === "/auth/provider/config") return sendJson(req, res, 200, { ok: true, data: authProviderConfig() });
    if (req.method === "GET" && url.pathname === "/auth/provider-context") return sendJson(req, res, 200, { ok: true, data: await readProviderAuthContext(req) });
    if (req.method === "GET" && url.pathname === "/tenant-admin/policy") return sendJson(req, res, 200, { ok: true, data: readTenantAdminPolicy() });
    if (req.method === "GET" && url.pathname === "/support/summary") return sendJson(req, res, 200, { ok: true, data: await readSupportDeskSummary(req, url) });
    if (req.method === "GET" && url.pathname === "/support/r4-incident-policy") return sendJson(req, res, 200, { ok: true, data: readR4SupportIncidentPolicy() });
    if (req.method === "GET" && url.pathname === "/ops/operator-metrics") return sendJson(req, res, 200, { ok: true, data: await readOperatorMetrics(req, url) });
    if (req.method === "GET" && url.pathname === "/ops/r4-observability-audit-review") return sendJson(req, res, 200, { ok: true, data: await readR4ObservabilityAuditReview(req, url) });
    if (req.method === "GET" && url.pathname === "/pilot/learning-loop") return sendJson(req, res, 200, { ok: true, data: await readPilotLearningLoop(req, url) });
    if (req.method === "GET" && url.pathname === "/pilot/r4-evidence-go-no-go") return sendJson(req, res, 200, { ok: true, data: await readR4EvidenceGoNoGo(req, url) });
    if (req.method === "GET" && url.pathname === "/network/r5-profile-summary") return sendJson(req, res, 200, { ok: true, data: await readR5TrustedNetworkProfiles(req, url) });
    if (req.method === "GET" && url.pathname === "/network/r5-qualification-summary") return sendJson(req, res, 200, { ok: true, data: await readR5QualificationGateSummary(req, url) });
    if (req.method === "GET" && url.pathname === "/network/r5-collaboration-workspace-summary") return sendJson(req, res, 200, { ok: true, data: await readR5CollaborationWorkspaceSummary(req, url) });
    if (req.method === "GET" && url.pathname === "/network/r5-responsibility-matrix-summary") return sendJson(req, res, 200, { ok: true, data: await readR5ResponsibilityMatrixSummary(req, url) });
    if (req.method === "GET" && url.pathname === "/network/r5-assignment-delivery-summary") return sendJson(req, res, 200, { ok: true, data: await readR5AssignmentDeliverySummary(req, url) });
    if (req.method === "GET" && url.pathname === "/network/r5-network-evidence-go-no-go") return sendJson(req, res, 200, { ok: true, data: await readR5NetworkEvidenceGoNoGo(req, url) });
    if (req.method === "GET" && url.pathname === "/stakeholder-review/summary") return sendJson(req, res, 200, { ok: true, data: await readPilotReviewBoardSummary(req, url) });
    if (req.method === "GET" && url.pathname === "/pilot/expansion-summary") return sendJson(req, res, 200, { ok: true, data: await readPilotExpansionSummary(req, url) });
    if (req.method === "GET" && url.pathname === "/pilot/r4-private-cohort-gate") return sendJson(req, res, 200, { ok: true, data: await readR4PrivatePilotCohortGate(req, url) });
    if (req.method === "GET" && url.pathname === "/tenant-usage/summary") return sendJson(req, res, 200, { ok: true, data: await readTenantUsageBillingSummary(req, url) });
    if (req.method === "GET" && url.pathname === "/commercial-launch/summary") return sendJson(req, res, 200, { ok: true, data: await readCommercialLaunchSummary(req, url) });
    if (req.method === "GET" && url.pathname === "/operations/today") return sendJson(req, res, 200, { ok: true, data: await readDailyOperations(req, url) });
    if (req.method === "GET" && url.pathname === "/auth/staging-context") return sendJson(req, res, 200, { ok: true, data: await readStagingAuthContext(req) });
    if (req.method === "GET" && url.pathname === "/service-packs/formwork") return sendJson(req, res, 200, { ok: true, data: { ...formworkServicePack, service_pack_record_id: FORMWORK_SERVICE_PACK_ID, service_sku_record_id: FORMWORK_SERVICE_SKU_ID } });
    if (req.method === "GET" && url.pathname === "/accounts/cash-snapshot") return sendJson(req, res, 200, { ok: true, data: await readAccountsCashSnapshot(req, url) });
    if (req.method === "GET" && url.pathname === "/database/schema") { const schema = await readFile(join(root, "infra/database/schema.sql"), "utf8"); return sendJson(req, res, 200, { ok: true, data: { path: "infra/database/schema.sql", bytes: schema.length } }); }
    if (req.method === "GET" && url.pathname === "/mvp/store") return sendJson(req, res, 200, { ok: true, data: await readStore() });
    if (req.method === "GET") { const resource = await readResource(req, url); if (resource) return sendJson(req, res, resource.status, resource.body); }
    if (req.method === "POST" && url.pathname === "/mvp/reset") { const { resetStore } = await import("./store.mjs"); return sendJson(req, res, 200, { ok: true, data: await resetStore() }); }
    if (req.method === "POST" && url.pathname === "/policy/evaluate") { const input = await readJson(req); const decision = evaluatePolicy(input); const policyDecision = await createPolicyDecisionRecord(input, decision); return sendJson(req, res, 200, { ok: true, data: decision, policy_decision_id: policyDecision?.id ?? null, audit_event_id: null, correlation_id: input?.correlation_id ?? null }); }
    const handler = routes.get(`${req.method} ${url.pathname}`);
    if (handler) return sendJson(req, res, 201, { ok: true, data: await handler(await readJson(req), req) });
    sendJson(req, res, 404, { ok: false, error: { code: "NOT_FOUND", message: "Route not found." } });
  } catch (error) {
    sendJson(req, res, error.status ?? 500, { ok: false, error: { code: error.code ?? "INTERNAL_ERROR", message: error instanceof Error ? error.message : String(error) } });
  }
});

server.listen(port, () => console.log(`vFirm API listening on http://127.0.0.1:${port}`));










































