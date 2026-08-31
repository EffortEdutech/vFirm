import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const tempDir = await mkdtemp(join(tmpdir(), "vfirm-web-api-"));
const apiPort = 3097;
const webPort = 3096;
const apiBase = `http://127.0.0.1:${apiPort}`;
const webBase = `http://127.0.0.1:${webPort}`;
const children = [];
const logs = [];

function start(name, args, env) {
  const child = spawn(process.execPath, args, { env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] });
  children.push(child);
  child.stdout.on("data", (chunk) => logs.push(`[${name}] ${chunk}`));
  child.stderr.on("data", (chunk) => logs.push(`[${name}] ${chunk}`));
}

start("api", ["apps/api/src/server.mjs"], { VFIRM_API_PORT: String(apiPort), VFIRM_STORE_PATH: join(tempDir, "store.json") });
start("web", ["apps/web/src/server.mjs"], { VFIRM_WEB_PORT: String(webPort), VFIRM_API_BASE: apiBase });

async function waitForJson(url) {
  const started = Date.now();
  while (Date.now() - started < 5000) {
    try {
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error(`Timed out waiting for ${url}. Logs:\n${logs.join("")}`);
}

try {
  const health = await waitForJson(`${webBase}/api/health`);
  if (!health.ok || health.service !== "vfirm-api") throw new Error("Web /api proxy did not return API health.");
  const page = await (await fetch(webBase)).text();
  if (!page.includes("Solopreneur Firm Workspace")) throw new Error("Web page did not load.");
  if (!page.includes("Guided MVP Workflow")) throw new Error("Guided workflow UI not found.");
  const js = await (await fetch(`${webBase}/app.js`)).text();
  if (!js.includes("const health = await res.json()")) throw new Error("Web health check is not using raw health response.");
  if (!js.includes("POST /tenants") || !js.includes("POST /proposals/accept")) throw new Error("Step-by-step command endpoints not found in web JS.");
  if (!js.includes("Create Client") || !js.includes("Create Formwork Intake")) throw new Error("Clients/Intake module forms not found in web JS.");
  console.log("Web/API integration smoke test passed.");
} finally {
  for (const child of children) child.kill();
  await rm(tempDir, { recursive: true, force: true });
}




