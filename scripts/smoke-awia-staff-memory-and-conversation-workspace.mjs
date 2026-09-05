import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const tmp = await mkdtemp(join(tmpdir(), "vfirm-awia-memory-"));
const port = 3108;
const base = `http://127.0.0.1:${port}`;
const api = spawn(process.execPath, ["apps/api/src/server.mjs"], {
  cwd: root,
  env: { ...process.env, VFIRM_API_PORT: String(port), VFIRM_STORE_PATH: join(tmp, "store.json"), VFIRM_STORE_BACKEND: "json" },
  stdio: ["ignore", "pipe", "pipe"]
});

let logs = "";
api.stdout.on("data", (chunk) => { logs += chunk.toString(); });
api.stderr.on("data", (chunk) => { logs += chunk.toString(); });

async function waitForHealth() {
  const started = Date.now();
  while (Date.now() - started < 10000) {
    try {
      const response = await fetch(`${base}/health`);
      const json = await response.json();
      if (response.ok && json.ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error(`API did not become healthy. Logs:\n${logs}`);
}

async function request(path, { method = "GET", body, headers = {} } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { "content-type": "application/json", ...headers },
    body: body ? JSON.stringify(body) : undefined
  });
  const json = await response.json();
  return { response, json };
}

async function post(path, body, headers = {}) {
  const { response, json } = await request(path, { method: "POST", body, headers });
  if (!response.ok || !json.ok) throw new Error(`${path} failed: ${response.status} ${JSON.stringify(json)}`);
  return json.data;
}

async function postExpectError(path, body, headers = {}) {
  const { response, json } = await request(path, { method: "POST", body, headers });
  if (response.ok && json.ok) throw new Error(`${path} unexpectedly succeeded: ${JSON.stringify(json)}`);
  return json;
}

function authHeaders(firm) {
  return {
    "x-vfirm-actor-id": firm.principal_actor.id,
    "x-vfirm-tenant-id": firm.firm.tenant_id,
    "x-vfirm-firm-id": firm.firm.id,
    "x-vfirm-role": "principal"
  };
}

try {
  await waitForHealth();
  const tenant = await post("/tenants", { name: "AWIA Memory Bundle Tenant" });
  const firm = await post("/firms", { tenant_id: tenant.id, name: "AWIA Memory Bundle Firm", principal_name: "Ir. AWIA Principal" });
  const headers = authHeaders(firm);
  const actor = firm.principal_actor;

  const provisioned = await post("/awia/virtual-staff/provision-pilot", { tenant_id: tenant.id, firm_id: firm.firm.id, actor }, headers);
  if (provisioned.provisioning_run.summary.member_count !== 8) throw new Error("AWIA pilot roster did not provision 8 virtual staff.");

  await post("/awia/virtual-staff/lifecycle", { tenant_id: tenant.id, firm_id: firm.firm.id, staff_code: "CFO-001", to_state: "ACTIVE", actor }, headers);

  // Accepted memory entry: bounded evidence summary, not a chain-of-thought dump.
  const memoryEntry = await post("/awia/virtual-staff/memory/append", {
    tenant_id: tenant.id,
    firm_id: firm.firm.id,
    staff_code: "CFO-001",
    kind: "TASK_CONTEXT_SUMMARY",
    content: "Client requested a Q3 cash-flow summary; prior figures referenced from evidence-2026-q2-close.",
    evidence_refs: ["evidence-2026-q2-close"],
    actor
  }, headers);
  if (memoryEntry.staff_code !== "CFO-001" || memoryEntry.kind !== "TASK_CONTEXT_SUMMARY") throw new Error("AWIA memory entry was not persisted with expected fields.");

  // Rejected: attempting to smuggle a raw chain-of-thought / authority claim field.
  const rejectedMemory = await postExpectError("/awia/virtual-staff/memory/append", {
    tenant_id: tenant.id,
    firm_id: firm.firm.id,
    staff_code: "CFO-001",
    kind: "TASK_CONTEXT_SUMMARY",
    content: "Attempted smuggled entry.",
    evidence_refs: ["evidence-2026-q2-close"],
    raw_chain_of_thought: "internal hidden reasoning that must never be persisted",
    actor
  }, headers);
  if (!String(rejectedMemory.error?.message ?? "").includes("forbidden_field_present")) throw new Error("AWIA memory entry with chain-of-thought field was not rejected as expected.");

  // Rejected: missing evidence reference.
  const rejectedNoEvidence = await postExpectError("/awia/virtual-staff/memory/append", {
    tenant_id: tenant.id,
    firm_id: firm.firm.id,
    staff_code: "CFO-001",
    kind: "TASK_CONTEXT_SUMMARY",
    content: "Entry without any evidence backing.",
    evidence_refs: [],
    actor
  }, headers);
  if (!String(rejectedNoEvidence.error?.message ?? "").includes("memory_entry_missing_evidence_reference")) throw new Error("AWIA memory entry without evidence reference was not rejected as expected.");

  const persistedEntries = (await request("/awia-staff-memory-entries")).json.data;
  if (persistedEntries.length !== 1) throw new Error(`Expected exactly 1 persisted AWIA memory entry, got ${persistedEntries.length}.`);

  const thread = await post("/awia/virtual-staff/conversation/open", { tenant_id: tenant.id, firm_id: firm.firm.id, staff_code: "CFO-001", actor }, headers);
  if (thread.status !== "OPEN" || thread.staff_code !== "CFO-001") throw new Error("AWIA conversation thread was not opened correctly.");

  const supervisorMessage = await post("/awia/virtual-staff/conversation/message", { tenant_id: tenant.id, firm_id: firm.firm.id, thread_id: thread.id, participant_role: "HUMAN_SUPERVISOR", content: "Please prepare the Q3 cash-flow summary draft.", actor }, headers);
  if (supervisorMessage.message.classification !== "INTERNAL_OPERATIONAL_CONTEXT") throw new Error("Default AWIA conversation message classification was not internal-operational.");

  const staffMessage = await post("/awia/virtual-staff/conversation/message", { tenant_id: tenant.id, firm_id: firm.firm.id, thread_id: thread.id, participant_role: "VIRTUAL_STAFF", classification: "DRAFT_FOR_HUMAN_REVIEW", content: "Draft cash-flow summary prepared for your review.", actor }, headers);
  if (staffMessage.message.participant_role !== "VIRTUAL_STAFF") throw new Error("AWIA conversation message participant role was not persisted.");

  const rejectedRole = await postExpectError("/awia/virtual-staff/conversation/message", { tenant_id: tenant.id, firm_id: firm.firm.id, thread_id: thread.id, participant_role: "UNSUPERVISED_AUTONOMOUS_AGENT", content: "This role must not be accepted.", actor }, headers);
  if (!String(rejectedRole.error?.message ?? "").includes("conversation_participant_role_not_recognized")) throw new Error("AWIA conversation message with unrecognized participant role was not rejected as expected.");

  const persistedMessages = (await request("/awia-staff-conversation-messages")).json.data;
  if (persistedMessages.length !== 2) throw new Error(`Expected exactly 2 persisted AWIA conversation messages, got ${persistedMessages.length}.`);

  const persistedThreads = (await request("/awia-staff-conversation-threads")).json.data;
  if (persistedThreads.length !== 1) throw new Error(`Expected exactly 1 persisted AWIA conversation thread, got ${persistedThreads.length}.`);

  const auditEvents = (await request("/audit-events")).json.data.filter((event) => event.action?.startsWith("awia.virtual_staff.memory_entry") || event.action?.startsWith("awia.virtual_staff.conversation_"));
  if (auditEvents.length < 3) throw new Error("AWIA memory/conversation commands were not audit-recorded.");

  console.log("AWIA staff memory and conversation workspace smoke passed.");
} finally {
  api.kill();
  await rm(tmp, { recursive: true, force: true });
}
