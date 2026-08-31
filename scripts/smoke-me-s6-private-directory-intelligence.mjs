import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const postgres = process.argv.includes("--postgres");
const port = postgres ? 3119 : 3118;
const tmp = await mkdtemp(join(tmpdir(), "vfirm-me-s6-"));
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
async function request(path, options = {}) { const response = await fetch(`http://127.0.0.1:${port}${path}`, { method: options.method ?? "GET", headers: { "content-type": "application/json", ...(options.headers ?? {}) }, body: options.body ? JSON.stringify(options.body) : undefined }); const json = await response.json().catch(() => ({})); return { response, json }; }
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
  for (const path of ["/marketplace/private-directory-intelligence-summary", "/marketplace/private-directory-governance-summary", "/marketplace/directory-publications", "/marketplace/private-directory/enquiries", "/marketplace/private-directory/enquiries/request-collaboration", "/marketplace/qualification-renewal-reviews"]) assert(contracts.some((contract) => contract.path === path), `${path} contract missing.`);

  const tenant = await post("/tenants", { name: "ME S6 Private Intelligence Tenant" });
  const requester = await post("/firms", { tenant_id: tenant.id, name: "ME S6 Requesting Virtual Firm", principal_name: "Pn. Readiness Requester" });
  const provider = await post("/firms", { tenant_id: tenant.id, name: "ME S6 Provider Firm", principal_name: "Ir. Readiness Provider" });
  const requesterHeaders = authHeaders(requester), requesterActor = requester.principal_actor;
  const providerHeaders = authHeaders(provider), providerActor = provider.principal_actor;

  const firmProfile = await post("/network/firm-profiles", { tenant_id: tenant.id, firm_id: provider.firm.id, display_name: "ME S6 Provider Profile", jurisdiction_refs: ["MY"], actor: providerActor }, providerHeaders);
  const professionalProfile = await post("/network/professional-profiles", { tenant_id: tenant.id, firm_id: provider.firm.id, display_name: "Ir. Readiness Provider Profile", jurisdiction_refs: ["MY"], actor: providerActor }, providerHeaders);
  const credential = await post("/network/credentials", { tenant_id: tenant.id, firm_id: provider.firm.id, professional_network_profile_id: professionalProfile.id, credential_type: "PROFESSIONAL_REGISTRATION", credential_name: "Verified ME-S6 credential", jurisdiction_refs: ["MY"], verification_status: "VERIFIED", evidence_refs: ["me-s6-credential-evidence"], actor: providerActor }, providerHeaders);
  const capability = await post("/network/capabilities", { tenant_id: tenant.id, firm_id: provider.firm.id, professional_network_profile_id: professionalProfile.id, firm_network_profile_id: firmProfile.id, capability_code: "FORMWORK_PRIVATE_DIRECTORY_READINESS", jurisdiction_refs: ["MY"], visibility: "TRUSTED_NETWORK_ONLY", qualification_required: true, actor: providerActor }, providerHeaders);
  const conflict = await post("/network/conflict-checks", { tenant_id: tenant.id, requesting_firm_id: requester.firm.id, provider_firm_id: provider.firm.id, subject_profile_id: professionalProfile.id, check_status: "CLEARED", conflict_summary: "No conflict found for ME-S6 readiness fixture.", evidence_refs: ["me-s6-conflict-cleared"], actor: requesterActor }, requesterHeaders);
  const passGate = await post("/network/qualification-gates", { tenant_id: tenant.id, requesting_firm_id: requester.firm.id, provider_firm_id: provider.firm.id, professional_network_profile_id: professionalProfile.id, firm_network_profile_id: firmProfile.id, capability_id: capability.id, credential_id: credential.id, conflict_check_id: conflict.id, jurisdiction_ref: "MY", credential_status: "VERIFIED", jurisdiction_status: "VALID", insurance_status: "VALID", conflict_status: "CLEARED", capacity_status: "AVAILABLE", policy_status: "APPROVED", actor: requesterActor }, requesterHeaders);
  assert(passGate.gate_status === "PASS", "ME-S6 requires a passed qualification gate fixture.");

  const reviewedListing = await post("/marketplace/directory-publications", { tenant_id: tenant.id, firm_id: provider.firm.id, qualification_gate_id: passGate.id, title: "ME-S6 reviewed private directory listing", description: "Reviewed listing for internal readiness summary.", actor: providerActor }, providerHeaders);
  const pendingListing = await post("/marketplace/directory-publications", { tenant_id: tenant.id, firm_id: provider.firm.id, qualification_gate_id: passGate.id, title: "ME-S6 pending review listing", description: "Listing intentionally pending review board action.", actor: providerActor }, providerHeaders);
  await post("/marketplace/directory-review-board/decisions", { tenant_id: tenant.id, provider_firm_id: provider.firm.id, listing_id: reviewedListing.id, decision: "REVIEW_CONTINUE", decision_summary: "Reviewed listing remains private-directory ready.", evidence_refs: ["me-s6-review-board-evidence"], actor: providerActor }, providerHeaders);
  const followedEnquiry = await post("/marketplace/private-directory/enquiries", { tenant_id: tenant.id, requesting_firm_id: requester.firm.id, provider_firm_id: provider.firm.id, listing_id: reviewedListing.id, enquiry_summary: "Manual enquiry that will become a collaboration request.", actor: requesterActor }, requesterHeaders);
  await post("/marketplace/private-directory/enquiries/request-collaboration", { tenant_id: tenant.id, requesting_firm_id: requester.firm.id, enquiry_id: followedEnquiry.id, request_summary: "Manual collaboration request for readiness evidence.", actor: requesterActor }, requesterHeaders);
  await post("/marketplace/private-directory/enquiries", { tenant_id: tenant.id, requesting_firm_id: requester.firm.id, provider_firm_id: provider.firm.id, listing_id: pendingListing.id, enquiry_summary: "Manual enquiry intentionally pending follow-up.", actor: requesterActor }, requesterHeaders);
  await post("/marketplace/qualification-renewal-reviews", { tenant_id: tenant.id, provider_firm_id: provider.firm.id, qualification_gate_id: passGate.id, listing_id: reviewedListing.id, review_status: "EXPIRING", expires_at: "2026-09-20", next_review_due_at: "2026-09-10", evidence_refs: ["me-s6-renewal-risk-evidence"], actor: providerActor }, providerHeaders);

  const publicObservatoryDenied = await postRaw("/observatory/snapshots", { tenant_id: tenant.id, firm_id: provider.firm.id, snapshot_scope: "VF24_PUBLICATION", privacy_class: "PUBLIC_RAW", actor: providerActor }, providerHeaders);
  assert(!publicObservatoryDenied.response.ok, "ME-S6 fixture must not permit VF-24/public observatory publication.");
  const publicListingDenied = await postRaw("/marketplace/directory-publications", { tenant_id: tenant.id, firm_id: provider.firm.id, qualification_gate_id: passGate.id, title: "Unsafe public ME-S6 listing", visibility: "PUBLIC", listing_scope: "OPEN_MARKETPLACE", actor: providerActor }, providerHeaders);
  assert(!publicListingDenied.response.ok, "ME-S6 fixture must not permit public directory publication.");

  const summary = await get(`/marketplace/private-directory-intelligence-summary?tenant_id=${tenant.id}`, providerHeaders);
  assert(summary.status === "ME_S6_PRIVATE_DIRECTORY_INTELLIGENCE_READY", `Unexpected ME-S6 status: ${summary.status} ${JSON.stringify(summary)}`);
  assert(summary.scope === "Private Directory Intelligence and Readiness View only", "ME-S6 scope label missing.");
  assert(summary.counts.qualified_directory_listings === 2, "ME-S6 should summarize two private directory listings.");
  assert(summary.counts.pending_actions >= 3, "ME-S6 should expose review, enquiry, and renewal pending actions.");
  assert(summary.readiness.review_board_pending >= 1, "ME-S6 should show pending review board actions.");
  assert(summary.readiness.enquiry_follow_up_pending >= 1, "ME-S6 should show private enquiry follow-up needs.");
  assert(summary.readiness.qualification_renewal_risk >= 1, "ME-S6 should show renewal/expiry risks.");
  assert(summary.checks.every((check) => check.status === "PASS"), `ME-S6 checks failed: ${JSON.stringify(summary.checks)}`);
  for (const boundary of ["private_internal_readiness_view_only", "controlled_private_directory_only", "no_public_marketplace", "no_live_matching", "no_ranking", "no_capacity_allocation", "no_vf24_observatory_publication", "no_pricing_intelligence", "no_autonomous_award", "no_autonomous_regulated_approval"]) assert(summary.boundaries.includes(boundary), `${boundary} boundary missing.`);
  assert(summary.pending_actions.some((item) => item.type === "REVIEW_BOARD_DECISION_DUE"), "Review pending action missing.");
  assert(summary.pending_actions.some((item) => item.type === "PRIVATE_ENQUIRY_FOLLOW_UP"), "Enquiry pending action missing.");
  assert(summary.pending_actions.some((item) => item.type === "QUALIFICATION_RENEWAL_RISK"), "Renewal risk pending action missing.");
  console.log(`ME-S6 private directory intelligence and readiness smoke passed (${postgres ? "postgres" : "json"}).`);
} finally {
  api.kill();
  await rm(tmp, { recursive: true, force: true });
}