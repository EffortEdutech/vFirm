import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const port = 3114;
const tmp = await mkdtemp(join(tmpdir(), "vfirm-me-s1-"));
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
  assert(contracts.some((contract) => contract.path === "/marketplace/governance-lock"), "ME-S1 governance-lock contract missing.");
  const tenant = await post("/tenants", { name: "ME S1 Governance Tenant" });
  const firm = await post("/firms", { tenant_id: tenant.id, name: "ME Governance Virtual Firm", principal_name: "Pn. Marketplace Governance" });
  const headers = authHeaders(firm);
  const actor = firm.principal_actor;
  const lock = await get("/marketplace/governance-lock", headers);
  assert(lock.status === "GOVERNANCE_LOCKED_IMPLEMENTATION_BLOCKED", `Unexpected governance status ${lock.status}`);
  assert(lock.matching_policy.price_rank_allowed === false, "ME-S1 must lock price-first matching off.");
  assert(lock.privacy_policy.minimum_benchmark_cohort_size >= 10, "ME-S1 must lock benchmark privacy threshold.");
  for (const boundary of ["no_public_directory", "no_live_matching_engine", "no_capacity_economy_allocation", "no_vf24_observatory_publication"]) assert(lock.implementation_boundaries.includes(boundary), `${boundary} boundary missing.`);
  assert(lock.checks.every((check) => check.status === "PASS"), `Governance lock checks failed: ${JSON.stringify(lock.checks)}`);
  const privateListing = await post("/marketplace/listings", { tenant_id: tenant.id, firm_id: firm.firm.id, title: "ME-S1 private governed listing", visibility: "TRUSTED_NETWORK", listing_scope: "PRIVATE_NETWORK", qualification_requirements: ["credential_required", "qualification_gate_required"], actor }, headers);
  assert(privateListing.visibility === "TRUSTED_NETWORK" && privateListing.listing_scope === "PRIVATE_NETWORK", "Private trusted-network listing should remain allowed.");
  const publicListingDenied = await postRaw("/marketplace/listings", { tenant_id: tenant.id, firm_id: firm.firm.id, title: "Unsafe public listing", visibility: "PUBLIC", listing_scope: "OPEN_MARKETPLACE", actor }, headers);
  assert(publicListingDenied.response.status === 403 && publicListingDenied.json.error?.code === "ME_S1_PUBLIC_MARKETPLACE_DENIED", "Public/open listing must be denied by ME-S1.");
  const aiListingDenied = await postRaw("/marketplace/listings", { tenant_id: tenant.id, firm_id: firm.firm.id, title: "AI listing attempt", actor: { ...actor, actor_type: "AI_AGENT" } }, headers);
  assert(aiListingDenied.response.status === 403 && aiListingDenied.json.error?.code === "ME_S1_HUMAN_GOVERNANCE_REQUIRED", "AI marketplace publication must be denied by ME-S1.");
  const capacity = await post("/capacity/offers", { tenant_id: tenant.id, firm_id: firm.firm.id, pce_units: 1, capacity_type: "FORMWORK_REVIEW_CAPACITY", constraints: { trusted_network_only: true, requires_data_room: true }, actor }, headers);
  assert(capacity.status === "OPEN", "Trusted capacity signal should remain allowed.");
  const priceFirstCapacityDenied = await postRaw("/capacity/offers", { tenant_id: tenant.id, firm_id: firm.firm.id, pce_units: 1, price_rank: true, constraints: { price_first: true }, actor }, headers);
  assert(priceFirstCapacityDenied.response.status === 403 && priceFirstCapacityDenied.json.error?.code === "ME_S1_PRICE_FIRST_ALLOCATION_DENIED", "Price-first capacity allocation must be denied.");
  const collaboration = await post("/collaboration/requests", { tenant_id: tenant.id, requesting_firm_id: firm.firm.id, capacity_offer_id: capacity.id, request_summary: "Governed private collaboration rehearsal", data_room_policy: { minimum_necessary_access: true, client_confidential: true, audit_required: true }, actor }, headers);
  assert(collaboration.status === "REQUESTED", "Controlled collaboration request should remain allowed.");
  const autoAwardDenied = await postRaw("/collaboration/requests", { tenant_id: tenant.id, requesting_firm_id: firm.firm.id, request_summary: "Unsafe auto award", auto_award: true, data_room_policy: { minimum_necessary_access: true, client_confidential: true, audit_required: true }, actor }, headers);
  assert(autoAwardDenied.response.status === 403 && autoAwardDenied.json.error?.code === "ME_S1_AUTONOMOUS_AWARD_DENIED", "Autonomous marketplace award must be denied.");
  const unsafeDataRoomDenied = await postRaw("/collaboration/requests", { tenant_id: tenant.id, requesting_firm_id: firm.firm.id, request_summary: "Unsafe data room", data_room_policy: { minimum_necessary_access: false, client_confidential: true, audit_required: true }, actor }, headers);
  assert(unsafeDataRoomDenied.response.status === 403 && unsafeDataRoomDenied.json.error?.code === "ME_S1_DATA_ROOM_POLICY_DENIED", "Unsafe data-room policy must be denied.");
  const privateSnapshot = await post("/observatory/snapshots", { tenant_id: tenant.id, firm_id: firm.firm.id, snapshot_scope: "PRIVATE_NETWORK_INTERNAL", privacy_class: "AGGREGATED_INTERNAL", actor }, headers);
  assert(privateSnapshot.privacy_class === "AGGREGATED_INTERNAL", "Private aggregated observatory rehearsal should remain allowed.");
  const publicObservatoryDenied = await postRaw("/observatory/snapshots", { tenant_id: tenant.id, firm_id: firm.firm.id, snapshot_scope: "VF24_PUBLICATION", privacy_class: "PUBLIC_RAW", actor }, headers);
  assert(publicObservatoryDenied.response.status === 403 && publicObservatoryDenied.json.error?.code === "ME_S1_VF24_PUBLICATION_DENIED", "VF-24/public observatory publication must be denied.");
  const rawDataDenied = await postRaw("/observatory/snapshots", { tenant_id: tenant.id, firm_id: firm.firm.id, snapshot_scope: "PRIVATE_NETWORK_INTERNAL", privacy_class: "RAW_TENANT_DATA", actor }, headers);
  assert(rawDataDenied.response.status === 403 && rawDataDenied.json.error?.code === "ME_S1_RAW_DATA_PUBLICATION_DENIED", "Raw tenant data publication must be denied.");
  console.log("ME-S1 marketplace governance lock smoke passed.");
} finally {
  api.kill();
  await rm(tmp, { recursive: true, force: true });
}