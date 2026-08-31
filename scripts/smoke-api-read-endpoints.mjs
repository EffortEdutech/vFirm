import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const tempDir = await mkdtemp(join(tmpdir(), "vfirm-read-smoke-"));
const storePath = join(tempDir, "store.json");
const port = 3098;
const baseUrl = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ["apps/api/src/server.mjs"], {
  env: { ...process.env, VFIRM_API_PORT: String(port), VFIRM_STORE_PATH: storePath },
  stdio: ["ignore", "pipe", "pipe"]
});

const logs = [];
child.stdout.on("data", (chunk) => logs.push(chunk.toString()));
child.stderr.on("data", (chunk) => logs.push(chunk.toString()));

try {
  await waitForHealth();
  const created = await post("/mvp/demo-loop", {
    tenant_name: "Read Endpoint Tenant",
    firm_name: "Read Endpoint Firm",
    principal_name: "Ir. Read Endpoint",
    client_name: "Read Endpoint Client",
    project_name: "Read Endpoint Project",
    final_price: 2500,
    currency: "MYR",
    formwork_inputs: { project_name: "Read Endpoint Project", site_location: "Kuala Lumpur", structure_type: "basement", formwork_element_type: "wall", height: 3.5, length_or_area: 120, concrete_grade: "C30", available_drawings: ["S-100"] }
  });
  const resources = [
    ["/tenants", created.tenant.id],
    ["/firms", created.firm.id],
    ["/clients", created.client.id],
    ["/intake-sessions", created.intake.id],
    ["/proposals", created.proposal.id],
    ["/projects", created.project.id],
    ["/invoices", created.invoice.id],
    ["/event-log", null],
    ["/audit-events", null]
  ];
  for (const [path, id] of resources) {
    const list = await get(path);
    if (!Array.isArray(list) || list.length === 0) throw new Error(`${path} list endpoint returned no records.`);
    if (id) {
      const detail = await get(`${path}/${id}`);
      if (detail.id !== id) throw new Error(`${path}/${id} detail endpoint returned wrong record.`);
    }
  }
  const summary = await get("/dashboard/summary");
  if (!summary.counts || summary.counts.projects < 1 || !Array.isArray(summary.latest_activity)) throw new Error("Dashboard summary endpoint returned invalid counts/activity.");
  const servicePack = await get("/service-packs/formwork");
  if (servicePack.service_pack_record_id !== "11111111-1111-4111-8111-111111111111") throw new Error("Formwork service pack metadata endpoint missing fixed record ID.");
  console.log("API read endpoint smoke test passed.");
} finally {
  child.kill();
  await rm(tempDir, { recursive: true, force: true });
}

async function waitForHealth() {
  const started = Date.now();
  while (Date.now() - started < 5000) {
    try {
      const res = await fetch(`${baseUrl}/health`);
      if (res.ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error(`API health check timed out. Logs:\n${logs.join("")}`);
}

async function get(path) {
  const res = await fetch(`${baseUrl}${path}`);
  const json = await res.json();
  if (!res.ok || !json.ok) throw new Error(json.error?.message ?? `GET ${path} failed`);
  return json.data;
}

async function post(path, body) {
  const res = await fetch(`${baseUrl}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json();
  if (!res.ok || !json.ok) throw new Error(json.error?.message ?? `POST ${path} failed`);
  return json.data;
}

