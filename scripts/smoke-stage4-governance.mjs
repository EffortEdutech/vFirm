import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const tempDir = await mkdtemp(join(tmpdir(), "vfirm-stage4-"));
const port = 3095;
const baseUrl = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ["apps/api/src/server.mjs"], {
  env: { ...process.env, VFIRM_API_PORT: String(port), VFIRM_STORE_PATH: join(tempDir, "store.json") },
  stdio: ["ignore", "pipe", "pipe"]
});
const logs = [];
child.stdout.on("data", (chunk) => logs.push(chunk.toString()));
child.stderr.on("data", (chunk) => logs.push(chunk.toString()));

try {
  await waitForHealth();
  const tenant = await post("/tenants", { name: "Stage 4 Tenant", default_region: "MY" });
  const firmResult = await post("/firms", { tenant_id: tenant.id, name: "Stage 4 Firm", principal_name: "Ir. Authority Principal" });
  if (!firmResult.membership?.id || !firmResult.professional_authority?.id) throw new Error("Firm creation did not seed membership and professional authority.");
  const badActor = { actor_id: "00000000-0000-0000-0000-000000000000", actor_type: "SYSTEM", tenant_id: tenant.id, firm_id: firmResult.firm.id, display_name: "System" };
  const clientResult = await post("/clients", { tenant_id: tenant.id, firm_id: firmResult.firm.id, name: "Stage 4 Client", actor: firmResult.principal_actor });
  const intakeResult = await post("/intake-sessions", { tenant_id: tenant.id, firm_id: firmResult.firm.id, relationship_id: clientResult.relationship.id, actor: firmResult.principal_actor, provided_inputs: { project_name: "Stage 4 Project", site_location: "Kuala Lumpur", structure_type: "basement", formwork_element_type: "wall", height: 3.5, length_or_area: 120, concrete_grade: "C30", available_drawings: ["S-100"] } });
  const proposalResult = await post("/proposals", { tenant_id: tenant.id, firm_id: firmResult.firm.id, relationship_id: clientResult.relationship.id, intake_session_id: intakeResult.intake.id, scope_summary: "Stage 4 authority proposal", final_price: 2500, actor: firmResult.principal_actor });

  const denied = await postRaw("/proposals/approve", { tenant_id: tenant.id, firm_id: firmResult.firm.id, proposal_id: proposalResult.proposal.id, actor: badActor, professional_authority_valid: true });
  if (denied.status !== 403) throw new Error(`Expected system actor approval to be denied, got ${denied.status}.`);
  if (!/human actor|authority/i.test(denied.body.error?.message ?? "")) throw new Error("Denied approval did not explain authority/human actor requirement.");

  const approved = await post("/proposals/approve", { tenant_id: tenant.id, firm_id: firmResult.firm.id, proposal_id: proposalResult.proposal.id, actor: firmResult.principal_actor });
  if (!approved.approval?.authority_id) throw new Error("Approved proposal did not record authority_id.");
  if (approved.approval.approver_professional_id !== firmResult.professional_profile.id) throw new Error("Approved proposal did not record professional profile reference.");

  const authorities = await get("/professional-authorities");
  if (!authorities.some((authority) => authority.id === firmResult.professional_authority.id)) throw new Error("Professional authorities read endpoint missing seeded authority.");
  console.log("Stage 4 governance smoke test passed.");
} finally {
  child.kill();
  await rm(tempDir, { recursive: true, force: true });
}

async function waitForHealth() {
  const started = Date.now();
  while (Date.now() - started < 5000) {
    try { const res = await fetch(`${baseUrl}/health`); if (res.ok) return; } catch { await new Promise((resolve) => setTimeout(resolve, 100)); }
  }
  throw new Error(`API health timed out. Logs:\n${logs.join("")}`);
}
async function get(path) {
  const res = await fetch(`${baseUrl}${path}`);
  const body = await res.json();
  if (!res.ok || !body.ok) throw new Error(body.error?.message ?? `GET ${path} failed`);
  return body.data;
}
async function post(path, body) {
  const res = await postRaw(path, body);
  if (res.status < 200 || res.status >= 300 || !res.body.ok) throw new Error(res.body.error?.message ?? `POST ${path} failed`);
  return res.body.data;
}
async function postRaw(path, body) {
  const res = await fetch(`${baseUrl}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return { status: res.status, body: await res.json() };
}
