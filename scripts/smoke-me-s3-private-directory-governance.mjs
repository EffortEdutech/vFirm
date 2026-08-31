import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const port = 3116;
const tmp = await mkdtemp(join(tmpdir(), "vfirm-me-s3-"));
const api = spawn(process.execPath, ["apps/api/src/server.mjs"], { cwd: root, env: { ...process.env, VFIRM_API_PORT: String(port), VFIRM_STORE_PATH: join(tmp, "store.json"), DATABASE_URL: "", VFIRM_STORE_BACKEND: "json" }, stdio: ["ignore", "pipe", "pipe"] });
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
  const contracts = await get("/contracts");
  for (const path of ["/marketplace/private-directory-governance-summary", "/marketplace/directory-review-board/decisions", "/marketplace/private-directory/enquiries", "/marketplace/private-directory/enquiries/request-collaboration", "/marketplace/qualification-renewal-reviews"]) assert(contracts.some((contract) => contract.path === path), `${path} contract missing.`);

  const tenant = await post("/tenants", { name: "ME S3 Directory Tenant" });
  const requester = await post("/firms", { tenant_id: tenant.id, name: "Manual Enquiry Virtual Firm", principal_name: "Pn. Manual Requester" });
  const provider = await post("/firms", { tenant_id: tenant.id, name: "Renewal Specialist Firm", principal_name: "Ir. Renewal Specialist" });
  const requesterHeaders = authHeaders(requester), requesterActor = requester.principal_actor;
  const providerHeaders = authHeaders(provider), providerActor = provider.principal_actor;

  const firmProfile = await post("/network/firm-profiles", { tenant_id: tenant.id, firm_id: provider.firm.id, display_name: "Renewal Specialist Firm Profile", jurisdiction_refs: ["MY"], actor: providerActor }, providerHeaders);
  const professionalProfile = await post("/network/professional-profiles", { tenant_id: tenant.id, firm_id: provider.firm.id, display_name: "Ir. Renewal Specialist Profile", jurisdiction_refs: ["MY"], actor: providerActor }, providerHeaders);
  const credential = await post("/network/credentials", { tenant_id: tenant.id, firm_id: provider.firm.id, professional_network_profile_id: professionalProfile.id, credential_type: "PROFESSIONAL_REGISTRATION", credential_name: "Verified ME-S3 credential", jurisdiction_refs: ["MY"], verification_status: "VERIFIED", evidence_refs: ["me-s3-credential-evidence"], actor: providerActor }, providerHeaders);
  const capability = await post("/network/capabilities", { tenant_id: tenant.id, firm_id: provider.firm.id, professional_network_profile_id: professionalProfile.id, firm_network_profile_id: firmProfile.id, capability_code: "FORMWORK_PRIVATE_DIRECTORY_SUPPORT", jurisdiction_refs: ["MY"], visibility: "TRUSTED_NETWORK_ONLY", qualification_required: true, actor: providerActor }, providerHeaders);
  const conflict = await post("/network/conflict-checks", { tenant_id: tenant.id, requesting_firm_id: requester.firm.id, provider_firm_id: provider.firm.id, subject_profile_id: professionalProfile.id, check_status: "CLEARED", conflict_summary: "No conflict found.", evidence_refs: ["me-s3-conflict-cleared"], actor: requesterActor }, requesterHeaders);
  const passGate = await post("/network/qualification-gates", { tenant_id: tenant.id, requesting_firm_id: requester.firm.id, provider_firm_id: provider.firm.id, professional_network_profile_id: professionalProfile.id, firm_network_profile_id: firmProfile.id, capability_id: capability.id, credential_id: credential.id, conflict_check_id: conflict.id, jurisdiction_ref: "MY", credential_status: "VERIFIED", jurisdiction_status: "VALID", insurance_status: "VALID", conflict_status: "CLEARED", capacity_status: "AVAILABLE", policy_status: "APPROVED", actor: requesterActor }, requesterHeaders);
  assert(passGate.gate_status === "PASS", "ME-S3 requires a passed qualification gate fixture.");

  const listing = await post("/marketplace/directory-publications", { tenant_id: tenant.id, firm_id: provider.firm.id, qualification_gate_id: passGate.id, title: "ME-S3 private directory listing", description: "Manual enquiry only.", actor: providerActor }, providerHeaders);
  assert(listing.status === "PUBLISHED" && listing.visibility === "TRUSTED_NETWORK", "ME-S3 fixture listing must be private and published.");

  const badReview = await postRaw("/marketplace/directory-review-board/decisions", { tenant_id: tenant.id, provider_firm_id: provider.firm.id, listing_id: listing.id, decision: "APPROVE_PUBLICATION", decision_summary: "Unsafe", evidence_refs: ["unsafe"], ranking_enabled: true, actor: providerActor }, providerHeaders);
  assert(!badReview.response.ok, `Review board cannot authorize ranking. status=${badReview.response.status} body=${JSON.stringify(badReview.json)}`);
  const review = await post("/marketplace/directory-review-board/decisions", { tenant_id: tenant.id, provider_firm_id: provider.firm.id, listing_id: listing.id, decision: "REVIEW_CONTINUE", decision_summary: "Listing remains qualified for private directory publication only.", evidence_refs: ["me-s3-review-evidence"], actor: providerActor }, providerHeaders);
  assert(review.decision === "REVIEW_CONTINUE", "Review board decision not recorded.");

  const badEnquiry = await postRaw("/marketplace/private-directory/enquiries", { tenant_id: tenant.id, requesting_firm_id: requester.firm.id, provider_firm_id: provider.firm.id, listing_id: listing.id, enquiry_summary: "Please auto match", live_matching: true, actor: requesterActor }, requesterHeaders);
  assert(!badEnquiry.response.ok, `Private directory enquiry cannot request live matching. status=${badEnquiry.response.status} body=${JSON.stringify(badEnquiry.json)}`);
  const enquiry = await post("/marketplace/private-directory/enquiries", { tenant_id: tenant.id, requesting_firm_id: requester.firm.id, provider_firm_id: provider.firm.id, listing_id: listing.id, enquiry_summary: "Manual enquiry about qualified Formwork support.", actor: requesterActor }, requesterHeaders);
  assert(enquiry.status === "ENQUIRY_RECORDED" && enquiry.no_live_matching === true && enquiry.no_award === true, "Private enquiry boundary metadata missing.");

  const badCollab = await postRaw("/marketplace/private-directory/enquiries/request-collaboration", { tenant_id: tenant.id, requesting_firm_id: requester.firm.id, enquiry_id: enquiry.id, award_requested: true, actor: requesterActor }, requesterHeaders);
  assert(!badCollab.response.ok, `Enquiry-to-collaboration cannot request award. status=${badCollab.response.status} body=${JSON.stringify(badCollab.json)}`);
  const collab = await post("/marketplace/private-directory/enquiries/request-collaboration", { tenant_id: tenant.id, requesting_firm_id: requester.firm.id, enquiry_id: enquiry.id, request_summary: "Manual collaboration request after private directory enquiry.", actor: requesterActor }, requesterHeaders);
  assert(collab.collaboration_request.status === "REQUESTED" && collab.collaboration_request.capacity_offer_id === null && collab.collaboration_request.metadata.no_live_matching === true, "Manual collaboration request boundary missing.");

  const aiRenewalDenied = await postRaw("/marketplace/qualification-renewal-reviews", { tenant_id: tenant.id, provider_firm_id: provider.firm.id, qualification_gate_id: passGate.id, listing_id: listing.id, review_status: "VALID", evidence_refs: ["ai-renewal"], actor: { ...providerActor, actor_type: "AI_AGENT" } }, providerHeaders);
  assert(aiRenewalDenied.response.status === 403, "AI cannot perform renewal governance review.");
  const renewal = await post("/marketplace/qualification-renewal-reviews", { tenant_id: tenant.id, provider_firm_id: provider.firm.id, qualification_gate_id: passGate.id, listing_id: listing.id, review_status: "EXPIRING", expires_at: "2026-12-31", next_review_due_at: "2026-11-30", evidence_refs: ["me-s3-renewal-evidence"], actor: providerActor }, providerHeaders);
  assert(renewal.renewal_review.review_status === "EXPIRING", "Renewal review not recorded.");

  const summary = await get(`/marketplace/private-directory-governance-summary?tenant_id=${tenant.id}`, providerHeaders);
  assert(summary.status === "ME_S3_PRIVATE_DIRECTORY_GOVERNANCE_READY", `Unexpected ME-S3 status: ${summary.status} ${JSON.stringify(summary)}`);
  assert(summary.checks.every((check) => check.status === "PASS"), `ME-S3 checks failed: ${JSON.stringify(summary.checks)}`);
  for (const boundary of ["controlled_private_directory_only", "directory_review_board_only", "manual_private_enquiry_only", "qualification_renewal_monitoring", "no_public_marketplace", "no_live_matching_engine", "no_ranking", "no_capacity_allocation", "no_vf24_observatory_publication", "no_autonomous_award", "no_autonomous_regulated_approval"]) assert(summary.boundaries.includes(boundary), `${boundary} boundary missing.`);
  const auditEvents = await get(`/audit-events?tenant_id=${tenant.id}&firm_id=${provider.firm.id}`, providerHeaders);
  for (const action of ["marketplace.directory_review_board_decision_recorded", "marketplace.qualification_renewal_review_recorded"]) assert(auditEvents.some((event) => (event.action ?? event.event_type) === action), `${action} audit event missing.`);
  console.log("ME-S3 private directory governance, enquiry, and renewal smoke passed.");
} finally {
  api.kill();
  await rm(tmp, { recursive: true, force: true });
}