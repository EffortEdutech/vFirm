import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import pg from "pg";

// (harness copied from smoke-w1) ADR-089 W1 (2026-09-30) -- firm operating workflow foundations:
//
//  B1) File storage: an owner uploads real files (raw-binary POST /files/upload), each gets a
//      SHA-256 and a file_objects record; files are attached to a worker's assignment as
//      "file:<id>" evidence refs and as an owner-attached output file on a draft; downloads
//      return the exact bytes and are audited. Guards: anonymous upload/download refused,
//      another firm cannot download or attach this firm's file, disallowed types and
//      oversize bodies refused.
//  B3) Rework: REVISION_REQUIRED sends the item back to the worker as REWORK (Pending bucket),
//      the worker produces a second draft that supersedes the first, and that draft can then be
//      approved and taken through client delivery -- the old dead end is gone.
//
// Local JSON backend + local-disk file storage (VFIRM_FILE_STORAGE_BACKEND=local), temp dirs.

const root = process.cwd();
const tmp = await mkdtemp(join(tmpdir(), "vfirm-hire-collision-"));
const apiPort = 3150;
const apiBase = `http://127.0.0.1:${apiPort}`;
const children = [];
let logs = "";

function start(name, args, env) {
  const child = spawn(process.execPath, args, { cwd: root, env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] });
  children.push(child);
  child.stdout.on("data", (chunk) => { logs += `[${name}] ${chunk}`; });
  child.stderr.on("data", (chunk) => { logs += `[${name}] ${chunk}`; });
  return child;
}

async function waitForJson(url) {
  const started = Date.now();
  while (Date.now() - started < 10000) {
    try {
      const response = await fetch(url);
      const json = await response.json();
      if (response.ok && json.ok !== false) return json;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${url}. Logs:\n${logs}`);
}

async function request(path, { method = "GET", body, headers = {} } = {}) {
  const response = await fetch(`${apiBase}${path}`, { method, headers: { "content-type": "application/json", ...headers }, body: body ? JSON.stringify(body) : undefined });
  const json = await response.json().catch(() => ({ ok: false, error: { message: "Non-JSON response" } }));
  return { response, json };
}
async function get(path, headers = {}) {
  const { response, json } = await request(path, { headers });
  assert.equal(response.ok, true, `${path} HTTP ${response.status}: ${JSON.stringify(json)}`);
  return json.data;
}
async function post(path, body, headers = {}) {
  const { response, json } = await request(path, { method: "POST", body, headers });
  assert.equal(response.ok, true, `${path} HTTP ${response.status}: ${JSON.stringify(json)}`);
  assert.equal(json.ok, true, `${path} failed: ${JSON.stringify(json)}`);
  return json.data;
}
async function postExpectFailure(path, body, headers = {}) {
  const { json } = await request(path, { method: "POST", body, headers });
  assert.notEqual(json.ok, true, `${path} unexpectedly succeeded: ${JSON.stringify(json)}`);
  return json;
}
async function upload(firm, headers, filename, contentType, bytes, extra = "") {
  const response = await fetch(`${apiBase}/files/upload?tenant_id=${firm.tenant_id}&firm_id=${firm.id}&filename=${encodeURIComponent(filename)}${extra}`, { method: "POST", headers: { "content-type": contentType, ...headers }, body: bytes });
  const json = await response.json();
  return { response, json };
}
function authHeaders(actorId, firm) {
  return { "x-vfirm-actor-id": actorId, "x-vfirm-tenant-id": firm.tenant_id, "x-vfirm-firm-id": firm.id, "x-vfirm-role": "principal" };
}
async function openRealTask(firm, h, label) {
  const enquiry = await post("/front-desk/enquiries", { tenant_id: firm.tenant_id, firm_id: firm.id, contact_name: `${label} Contact`, organization_name: `${label} Sdn Bhd`, contact_email: `${label.toLowerCase().replace(/\s+/g, "-")}@w1-smoke.example`, enquiry_summary: `Need support: ${label}`, requested_service_hint: "Finance Analysis" }, h);
  await post("/front-desk/enquiries/qualify", { tenant_id: firm.tenant_id, firm_id: firm.id, enquiry_id: enquiry.id, decision: "QUALIFIED", consent_or_legal_basis_ref: `${label}-CONSENT`, conflict_check_status: "CLEARED", conflict_check_ref: `${label}-CONFLICT-CLEARED` }, h);
  const handoff = await post("/front-desk/enquiries/handoff", { tenant_id: firm.tenant_id, firm_id: firm.id, enquiry_id: enquiry.id, provided_inputs: {} }, h);
  const intake = await post("/intake-sessions", { tenant_id: firm.tenant_id, firm_id: firm.id, relationship_id: handoff.relationship.id, provided_inputs: { engagement_summary: label } }, h);
  const proposal = await post("/proposals", { tenant_id: firm.tenant_id, firm_id: firm.id, relationship_id: handoff.relationship.id, intake_session_id: intake.intake.id, scope_summary: label, final_price: 1200 }, h);
  const approved = await post("/proposals/approve", { tenant_id: firm.tenant_id, firm_id: firm.id, proposal_id: proposal.proposal.id }, h);
  const opened = await post("/proposals/accept", { tenant_id: firm.tenant_id, firm_id: firm.id, proposal_id: approved.proposal.id, project_name: label }, h);
  const relationships = await get(`/firm-client-relationships?tenant_id=${firm.tenant_id}&firm_id=${firm.id}`, h);
  const relationship = relationships.find((item) => item.id === opened.project.relationship_id);
  return { task: opened.task, project: opened.project, clientId: relationship.client_id };
}


// ADR-091 (2026-10-01) -- hiring-bug regression: two firms hiring the SAME staff code.
// Before the fix: seat/role-assignment/package-binding/lifecycle/evidence-pack ids were not
// firm-scoped, so firm B's hire overwrote firm A's records in memory (both backends) and, on
// Postgres, either overwrote firm A's row (on conflict (id)) or failed the hire on
// fk_awia_virtual_staff_members_seat. Proves: both firms hire CFO-001 + Bookkeeper; firm A's
// records are byte-identical before/after firm B's hires; each firm sees only its own records;
// lifecycle changes in B don't touch A; B can run work end to end; and (Postgres) no row stores
// a record belonging to a different firm.
try {
  start("api", ["apps/api/src/server.mjs"], {
    VFIRM_API_PORT: String(apiPort),
    ...(process.env.VFIRM_SMOKE_DATABASE_URL ? {} : { VFIRM_STORE_PATH: join(tmp, "store.json") }),
    DATABASE_URL: process.env.VFIRM_SMOKE_DATABASE_URL ?? "",
    VFIRM_STORE_BACKEND: process.env.VFIRM_SMOKE_DATABASE_URL ? "postgres" : "json",
    VFIRM_FILE_STORAGE_BACKEND: "local",
    VFIRM_FILE_LOCAL_DIR: join(tmp, "files")
  });
  await waitForJson(`${apiBase}/health`);
  const stamp = Date.now();
  async function makeFirm(label, tenantId = null) {
    const tenant = tenantId ? { id: tenantId } : await post("/tenants", { name: `${label} Tenant ${stamp}` });
    const seed = await post("/firms", { tenant_id: tenant.id, name: `${label} ${stamp}`, principal_name: `${label} Owner` });
    const firm = seed.firm;
    const h = authHeaders(seed.principal_actor.id, firm);
    const s = { tenant_id: firm.tenant_id, firm_id: firm.id };
    await post("/ops/awia-package-assignment", { ...s, package_code: "HIRE_ME" }, h);
    return { firm, h, s };
  }
  const COLLECTIONS = ["awia_virtual_staff_seats", "awia_virtual_staff_members", "awia_staff_role_assignments", "awia_staff_package_bindings", "awia_staff_lifecycle_events", "awia_staff_evidence_packs", "awia_virtual_staff_provisioning_runs"];
  async function snapshot(firm, h) {
    const store = await get("/mvp/store", h);
    return Object.fromEntries(COLLECTIONS.map((c) => [c, JSON.stringify((store[c] ?? []).filter((r) => r.firm_id === firm.id).sort((x, y) => String(x.id).localeCompare(String(y.id))))]));
  }
  async function hire(ctx, role_code, position_id, display_name) {
    const hired = await post("/awia/virtual-staff/hire-worker", { ...ctx.s, role_code, position_id, display_name }, ctx.h);
    await post("/awia/virtual-staff/lifecycle", { ...ctx.s, staff_code: hired.staff_code, to_state: "ACTIVE" }, ctx.h);
    return hired;
  }

  const A = await makeFirm("Firm A");
  const aCfo = await hire(A, "CFO", undefined, "CFO");
  const aBk = await hire(A, "FAO", "bookkeeper", "Bookkeeper");
  const before = await snapshot(A.firm, A.h);

  const B = await makeFirm("Firm B");                 // different tenant
  const C = await makeFirm("Firm C", A.firm.tenant_id); // same tenant as A, different firm
  const bCfo = await hire(B, "CFO", undefined, "CFO");
  const bBk = await hire(B, "FAO", "bookkeeper", "Bookkeeper");
  const cCfo = await hire(C, "CFO", undefined, "CFO");
  assert.equal(aCfo.staff_code, bCfo.staff_code, "test premise: both firms hire the same staff code");
  assert.equal(aCfo.staff_code, cCfo.staff_code);
  assert.equal(aBk.staff_code, bBk.staff_code);

  const after = await snapshot(A.firm, A.h);
  for (const c of COLLECTIONS) assert.equal(after[c], before[c], `firm A's ${c} changed when firms B/C hired the same staff code`);

  // every firm sees exactly its own seat/role/binding per worker
  for (const [ctx, n] of [[A, 2], [B, 2], [C, 1]]) {
    const store = await get("/mvp/store", ctx.h);
    for (const c of ["awia_virtual_staff_seats", "awia_staff_role_assignments", "awia_staff_package_bindings", "awia_virtual_staff_members"]) {
      assert.equal((store[c] ?? []).filter((r) => r.firm_id === ctx.firm.id).length, n, `${c} count for ${ctx.firm.name}`);
    }
  }

  // B pauses its CFO -> A's CFO stays ACTIVE
  await post("/awia/virtual-staff/lifecycle", { ...B.s, staff_code: bCfo.staff_code, to_state: "PAUSED" }, B.h);
  const storeAfterPause = await get("/mvp/store", A.h);
  assert.equal(storeAfterPause.awia_virtual_staff_members.find((m) => m.firm_id === A.firm.id && m.agent_code === aCfo.staff_code).lifecycle_status, "ACTIVE");
  assert.equal(storeAfterPause.awia_virtual_staff_members.find((m) => m.firm_id === B.firm.id && m.agent_code === bCfo.staff_code).lifecycle_status, "PAUSED");

  // B can run real work with its colliding-code worker (exercises the downstream FKs on Postgres)
  const wr = await post("/work-requests", { ...B.s, title: "Reconcile September", request_type_id: "bank_reconciliation", assign_to_staff_code: bBk.staff_code }, B.h);
  assert.equal(wr.assignment_error, null, JSON.stringify(wr));
  // ADR-092 W3: request work needs a real payload/output (no empty placeholder drafts).
  const draft = await post("/awia/virtual-staff/output-draft", { ...B.s, workdesk_item_id: wr.workdesk_item.id, output_payload: { note: "smoke-supplied payload" } }, B.h);
  await post("/awia/virtual-staff/output-review", { ...B.s, output_draft_id: draft.output_draft.id, review_decision: "APPROVED_FOR_CLIENT_DRAFT" }, B.h);
  await post("/awia/virtual-staff/workdesk-item/complete-internal", { ...B.s, workdesk_item_id: wr.workdesk_item.id }, B.h);

  // a duplicate hire inside ONE firm is still refused (existing guardrail unchanged)
  await postExpectFailure("/awia/virtual-staff/hire-worker", { ...A.s, role_code: "FAO", position_id: "bookkeeper", display_name: "Bookkeeper" }, A.h);

  let pgCheck = "skipped (JSON backend)";
  if (process.env.VFIRM_SMOKE_DATABASE_URL) {
    const client = new pg.Client({ connectionString: process.env.VFIRM_SMOKE_DATABASE_URL });
    await client.connect();
    try {
      const firmIds = [A.firm.id, B.firm.id, C.firm.id];
      let mismatched = 0;
      for (const table of COLLECTIONS) {
        const result = await client.query(`select count(*)::int as n from ${table} where firm_id = any($1::uuid[]) and coalesce(record->>'firm_id', '') <> firm_id::text`, [firmIds]);
        mismatched += result.rows[0].n;
      }
      assert.equal(mismatched, 0, "no stored row may carry another firm's record");
      const seats = await client.query("select natural_key, firm_id::text from awia_virtual_staff_seats where firm_id = any($1::uuid[]) and natural_key = $2", [firmIds, `seat-${aCfo.staff_code.toLowerCase()}`]);
      assert.equal(seats.rowCount, 3, "each firm has its own seat row for the shared staff code");
      pgCheck = "passed";
    } finally {
      await client.end();
    }
  }

  console.log(JSON.stringify({
    smoke: "hiring-cross-firm-staff-code-collision",
    result: "passed",
    shared_staff_codes: [aCfo.staff_code, aBk.staff_code],
    firms: 3,
    firm_a_records_unchanged: true,
    postgres_row_ownership_check: pgCheck
  }, null, 2));
} catch (error) {
  console.error(logs);
  throw error;
} finally {
  for (const child of children) if (child.exitCode === null && !child.killed) child.kill();
  await Promise.all(children.map((child) => once(child, "exit").catch(() => {})));
  await rm(tmp, { recursive: true, force: true });
}
