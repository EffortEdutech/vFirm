import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const tempDir = await mkdtemp(join(tmpdir(), "vfirm-smoke-"));
const storePath = join(tempDir, "store.json");
const port = 3099;
const baseUrl = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ["apps/api/src/server.mjs"], {
  env: { ...process.env, VFIRM_API_PORT: String(port), VFIRM_STORE_PATH: storePath },
  stdio: ["ignore", "pipe", "pipe"]
});

const logs = [];
child.stdout.on("data", (chunk) => logs.push(chunk.toString()));
child.stderr.on("data", (chunk) => logs.push(chunk.toString()));

async function waitForHealth() {
  const started = Date.now();
  while (Date.now() - started < 5000) {
    try {
      const res = await fetch(`${baseUrl}/health`);
      if (res.ok) return await res.json();
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error(`API health check timed out. Logs:\n${logs.join("")}`);
}

try {
  const health = await waitForHealth();
  if (!health.ok || health.service !== "vfirm-api" || health.phase !== "persistent-mvp-command-loop") throw new Error("Unexpected health response.");

  const contracts = await (await fetch(`${baseUrl}/contracts`)).json();
  if (!contracts.ok || !Array.isArray(contracts.data) || contracts.data.length === 0) throw new Error("Contracts endpoint failed.");

  const policy = await (await fetch(`${baseUrl}/policy/evaluate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      actor: { actor_id: "a1", actor_type: "HUMAN", tenant_id: "tenant-a", firm_id: "firm-a" },
      action: "client.read",
      resource: { resource_type: "Client", resource_id: "c1", tenant_id: "tenant-b", firm_id: "firm-b", risk_class: "STANDARD" }
    })
  })).json();
  if (policy.data?.result !== "DENY") throw new Error("Policy endpoint did not deny cross-tenant access.");

  const loop = await (await fetch(`${baseUrl}/mvp/demo-loop`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      tenant_name: "Demo Tenant",
      firm_name: "Amanah Temporary Works",
      principal_name: "Ir. Demo Principal",
      client_name: "Demo Contractor Sdn Bhd",
      project_name: "Basement Wall Formwork Package",
      final_price: 2500,
      currency: "MYR",
      formwork_inputs: {
        project_name: "Basement Wall Formwork Package",
        site_location: "Kuala Lumpur",
        structure_type: "basement",
        formwork_element_type: "wall",
        height: 3.5,
        length_or_area: 120,
        concrete_grade: "C30",
        available_drawings: ["S-100"]
      }
    })
  })).json();
  if (!loop.ok || !loop.data?.project?.id || !loop.data?.invoice?.id) throw new Error("MVP demo loop did not create project and invoice.");

  const store = await (await fetch(`${baseUrl}/mvp/store`)).json();
  if (!store.ok) throw new Error("Store endpoint failed.");
  for (const collection of ["tenants", "firms", "clients", "intake_sessions", "proposals", "projects", "work_packages", "evidence_bundles", "approvals", "invoices", "event_log", "audit_events"]) {
    if (!Array.isArray(store.data?.[collection]) || store.data[collection].length === 0) throw new Error(`Persistent store missing ${collection}.`);
  }

  console.log("API smoke test passed.");
} finally {
  child.kill();
  await rm(tempDir, { recursive: true, force: true });
}

