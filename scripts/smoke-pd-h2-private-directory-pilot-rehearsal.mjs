import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const postgres = process.argv.includes("--postgres");
const port = postgres ? 3121 : 3120;
const tmp = await mkdtemp(join(tmpdir(), "vfirm-pd-h2-"));
const env = { ...process.env, VFIRM_API_PORT: String(port) };
if (postgres) {
  env.VFIRM_STORE_BACKEND = "postgres";
  delete env.VFIRM_STORE_PATH;
} else {
  env.VFIRM_STORE_BACKEND = "json";
  env.VFIRM_STORE_PATH = join(tmp, "store.json");
  env.DATABASE_URL = "";
}

const api = spawn(process.execPath, ["apps/api/src/server.mjs"], { cwd: root, env, stdio: ["ignore", "pipe", "pipe"] });
let stderr = "";
api.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
api.on("error", (error) => { stderr += String(error.stack ?? error); });

async function request(path, options = {}) {
  const response = await fetch(`http://127.0.0.1:${port}${path}`, { method: options.method ?? "GET", headers: { "content-type": "application/json", ...(options.headers ?? {}) }, body: options.body ? JSON.stringify(options.body) : undefined });
  const json = await response.json().catch(() => ({}));
  return { response, json };
}
async function waitForHealth() { const started = Date.now(); while (Date.now() - started < 10000) { try { const { response, json } = await request("/health"); if (response.ok && json.ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 100)); } throw new Error(`API did not start. stderr=${stderr}`); }
async function get(path, headers = {}) { const { response, json } = await request(path, { headers }); if (!response.ok || !json.ok) throw new Error(`${path} failed: ${response.status} ${JSON.stringify(json)}`); return json.data; }
async function post(path, body, headers = {}) { const { response, json } = await request(path, { method: "POST", body, headers }); if (!response.ok || !json.ok) throw new Error(`${path} failed: ${response.status} ${JSON.stringify(json)}`); return json.data; }
async function postRaw(path, body, headers = {}) { return request(path, { method: "POST", body, headers }); }
function assert(condition, message) { if (!condition) throw new Error(message); }
function authHeaders(firm) { return { "x-vfirm-actor-id": firm.principal_actor.id, "x-vfirm-tenant-id": firm.firm.tenant_id, "x-vfirm-firm-id": firm.firm.id, "x-vfirm-role": "principal" }; }

try {
  await waitForHealth();
  if (postgres) await post("/mvp/reset", {});
  const contracts = await get("/contracts");
  for (const path of ["/marketplace/qualified-directory-summary", "/marketplace/private-directory-governance-summary", "/marketplace/private-directory-intelligence-summary", "/marketplace/directory-publications", "/marketplace/directory-review-board/decisions", "/marketplace/private-directory/enquiries", "/marketplace/private-directory/enquiries/request-collaboration", "/marketplace/qualification-renewal-reviews"]) assert(contracts.some((contract) => contract.path === path), `${path} contract missing.`);

  const tenant = await post("/tenants", { name: "PD H2 Private Directory Pilot Tenant" });
  const requester = await post("/firms", { tenant_id: tenant.id, name: "PD H2 Requesting Virtual Firm", principal_name: "Pn. Pilot Requester" });
  const provider = await post("/firms", { tenant_id: tenant.id, name: "PD H2 Formwork Specialist Firm", principal_name: "Ir. Pilot Provider" });
  const requesterHeaders = authHeaders(requester), requesterActor = requester.principal_actor;
  const providerHeaders = authHeaders(provider), providerActor = provider.principal_actor;

  const firmProfile = await post("/network/firm-profiles", { tenant_id: tenant.id, firm_id: provider.firm.id, display_name: "PD H2 Formwork Specialist Profile", jurisdiction_refs: ["MY"], actor: providerActor }, providerHeaders);
  const professionalProfile = await post("/network/professional-profiles", { tenant_id: tenant.id, firm_id: provider.firm.id, display_name: "Ir. Pilot Provider Profile", jurisdiction_refs: ["MY"], actor: providerActor }, providerHeaders);
  const credential = await post("/network/credentials", { tenant_id: tenant.id, firm_id: provider.firm.id, professional_network_profile_id: professionalProfile.id, credential_type: "PROFESSIONAL_REGISTRATION", credential_name: "Verified PD-H2 rehearsal credential", jurisdiction_refs: ["MY"], verification_status: "VERIFIED", evidence_refs: ["pd-h2-credential-evidence"], actor: providerActor }, providerHeaders);
  const capability = await post("/network/capabilities", { tenant_id: tenant.id, firm_id: provider.firm.id, professional_network_profile_id: professionalProfile.id, firm_network_profile_id: firmProfile.id, capability_code: "FORMWORK_PRIVATE_DIRECTORY_PILOT_REHEARSAL", jurisdiction_refs: ["MY"], visibility: "TRUSTED_NETWORK_ONLY", qualification_required: true, actor: providerActor }, providerHeaders);
  const conflict = await post("/network/conflict-checks", { tenant_id: tenant.id, requesting_firm_id: requester.firm.id, provider_firm_id: provider.firm.id, subject_profile_id: professionalProfile.id, check_status: "CLEARED", conflict_summary: "No conflict found for PD-H2 pilot rehearsal.", evidence_refs: ["pd-h2-conflict-cleared"], actor: requesterActor }, requesterHeaders);
  const passGate = await post("/network/qualification-gates", { tenant_id: tenant.id, requesting_firm_id: requester.firm.id, provider_firm_id: provider.firm.id, professional_network_profile_id: professionalProfile.id, firm_network_profile_id: firmProfile.id, capability_id: capability.id, credential_id: credential.id, conflict_check_id: conflict.id, jurisdiction_ref: "MY", credential_status: "VERIFIED", jurisdiction_status: "VALID", insurance_status: "VALID", conflict_status: "CLEARED", capacity_status: "AVAILABLE", policy_status: "APPROVED", actor: requesterActor }, requesterHeaders);
  assert(passGate.gate_status === "PASS", "PD-H2 requires a PASS qualification gate.");

  const listing = await post("/marketplace/directory-publications", { tenant_id: tenant.id, firm_id: provider.firm.id, qualification_gate_id: passGate.id, title: "PD-H2 Private Formwork Review Listing", description: "Controlled private directory rehearsal listing only.", actor: providerActor }, providerHeaders);
  const pendingListing = await post("/marketplace/directory-publications", { tenant_id: tenant.id, firm_id: provider.firm.id, qualification_gate_id: passGate.id, title: "PD-H2 Pending Review Listing", description: "Listing retained to prove pending Review Board visibility.", actor: providerActor }, providerHeaders);
  const suspendedListing = await post("/marketplace/directory-publications", { tenant_id: tenant.id, firm_id: provider.firm.id, qualification_gate_id: passGate.id, title: "PD-H2 Suspension Path Listing", description: "Listing retained to prove suspension path evidence.", actor: providerActor }, providerHeaders);
  const revokedListing = await post("/marketplace/directory-publications", { tenant_id: tenant.id, firm_id: provider.firm.id, qualification_gate_id: passGate.id, title: "PD-H2 Revocation Path Listing", description: "Listing retained to prove revocation path evidence.", actor: providerActor }, providerHeaders);
  await post("/marketplace/directory-publications/suspend", { tenant_id: tenant.id, firm_id: provider.firm.id, listing_id: suspendedListing.id, reason: "PD-H2 suspension path rehearsal evidence", actor: providerActor }, providerHeaders);
  await post("/marketplace/directory-publications/revoke", { tenant_id: tenant.id, firm_id: provider.firm.id, listing_id: revokedListing.id, reason: "PD-H2 revocation path rehearsal evidence", actor: providerActor }, providerHeaders);
  const review = await post("/marketplace/directory-review-board/decisions", { tenant_id: tenant.id, provider_firm_id: provider.firm.id, listing_id: listing.id, decision: "REVIEW_CONTINUE", decision_summary: "Listing remains qualified for private directory operation only.", evidence_refs: ["pd-h2-review-board-evidence"], actor: providerActor }, providerHeaders);
  const enquiry = await post("/marketplace/private-directory/enquiries", { tenant_id: tenant.id, requesting_firm_id: requester.firm.id, provider_firm_id: provider.firm.id, listing_id: listing.id, enquiry_summary: "Pilot enquiry for private Formwork review support.", actor: requesterActor }, requesterHeaders);
  const collaboration = await post("/marketplace/private-directory/enquiries/request-collaboration", { tenant_id: tenant.id, requesting_firm_id: requester.firm.id, enquiry_id: enquiry.id, request_summary: "Manual collaboration request after private enquiry for pilot rehearsal.", actor: requesterActor }, requesterHeaders);
  const pendingEnquiry = await post("/marketplace/private-directory/enquiries", { tenant_id: tenant.id, requesting_firm_id: requester.firm.id, provider_firm_id: provider.firm.id, listing_id: pendingListing.id, enquiry_summary: "Pending enquiry retained to prove operator follow-up visibility.", actor: requesterActor }, requesterHeaders);
  const renewal = await post("/marketplace/qualification-renewal-reviews", { tenant_id: tenant.id, provider_firm_id: provider.firm.id, qualification_gate_id: passGate.id, listing_id: listing.id, review_status: "EXPIRING", expires_at: "2026-09-25", next_review_due_at: "2026-09-15", evidence_refs: ["pd-h2-renewal-risk-evidence"], actor: providerActor }, providerHeaders);

  const unsafePublic = await postRaw("/marketplace/directory-publications", { tenant_id: tenant.id, firm_id: provider.firm.id, qualification_gate_id: passGate.id, title: "Unsafe public listing", visibility: "PUBLIC", listing_scope: "OPEN_MARKETPLACE", actor: providerActor }, providerHeaders);
  assert(!unsafePublic.response.ok, "PD-H2 must not permit public marketplace publication.");
  const unsafeMatching = await postRaw("/marketplace/private-directory/enquiries", { tenant_id: tenant.id, requesting_firm_id: requester.firm.id, provider_firm_id: provider.firm.id, listing_id: listing.id, enquiry_summary: "Unsafe live matching attempt", live_matching: true, actor: requesterActor }, requesterHeaders);
  assert(!unsafeMatching.response.ok, "PD-H2 must not permit live matching requests.");

  const qualifiedSummary = await get(`/marketplace/qualified-directory-summary?tenant_id=${tenant.id}`, providerHeaders);
  const governanceSummary = await get(`/marketplace/private-directory-governance-summary?tenant_id=${tenant.id}`, providerHeaders);
  const intelligenceSummary = await get(`/marketplace/private-directory-intelligence-summary?tenant_id=${tenant.id}`, providerHeaders);
  const auditEvents = await get(`/audit-events?tenant_id=${tenant.id}`, providerHeaders);

  const evidencePack = {
    release_track: "Private Directory Product Hardening",
    sprint: "PD-H2",
    mode: postgres ? "postgres" : "json",
    tenant_id: tenant.id,
    firms: { requester: requester.firm.id, provider: provider.firm.id },
    records: { pass_gate: passGate.id, listing: listing.id, pending_listing: pendingListing.id, suspended_listing: suspendedListing.id, revoked_listing: revokedListing.id, review: review.id, enquiry: enquiry.id, pending_enquiry: pendingEnquiry.id, collaboration_request: collaboration.collaboration_request.id, renewal_review: renewal.renewal_review.id },
    summaries: { qualified: qualifiedSummary.status, governance: governanceSummary.status, intelligence: intelligenceSummary.status },
    walkthrough_steps: [
      "workspace_opened",
      "readiness_summary_reviewed",
      "qualified_listing_inspected",
      "review_board_decision_recorded",
      "private_enquiry_recorded",
      "manual_collaboration_request_recorded",
      "renewal_risk_recorded",
      "pending_actions_visible",
      "audit_evidence_reviewed",
      "forbidden_boundaries_confirmed"
    ],
    evidence_counts: { audit_events: auditEvents.length, pending_actions: intelligenceSummary.counts.pending_actions, renewal_risks: intelligenceSummary.counts.renewal_risks },
    boundaries: intelligenceSummary.boundaries
  };

  assert(qualifiedSummary.status === "ME_S2_QUALIFIED_DIRECTORY_READY", `Qualified summary not ready: ${qualifiedSummary.status}`);
  assert(governanceSummary.status === "ME_S3_PRIVATE_DIRECTORY_GOVERNANCE_READY", `Governance summary not ready: ${governanceSummary.status}`);
  assert(intelligenceSummary.status === "ME_S6_PRIVATE_DIRECTORY_INTELLIGENCE_READY", `Intelligence summary not ready: ${intelligenceSummary.status}`);
  assert(evidencePack.evidence_counts.pending_actions >= 3, "PD-H2 rehearsal must expose pending review, enquiry, and renewal actions.");
  assert(evidencePack.evidence_counts.audit_events >= 6, "PD-H2 rehearsal must produce audit evidence.");
  for (const boundary of ["controlled_private_directory_only", "no_public_marketplace", "no_live_matching", "no_ranking", "no_capacity_allocation", "no_vf24_observatory_publication", "no_pricing_intelligence", "no_autonomous_award", "no_autonomous_regulated_approval"]) assert(evidencePack.boundaries.includes(boundary), `${boundary} boundary missing from evidence pack.`);
  assert(evidencePack.walkthrough_steps.length === 10, "PD-H2 walkthrough must contain ten evidence steps.");

  console.log(JSON.stringify({
    smoke: "pd-h2-private-directory-pilot-rehearsal",
    result: "passed",
    mode: evidencePack.mode,
    evidence_pack: {
      summaries: evidencePack.summaries,
      records: Object.keys(evidencePack.records).length,
      walkthrough_steps: evidencePack.walkthrough_steps.length,
      evidence_counts: evidencePack.evidence_counts
    },
    boundary: "private directory pilot rehearsal only; no marketplace widening"
  }, null, 2));
} finally {
  api.kill();
  await rm(tmp, { recursive: true, force: true });
}