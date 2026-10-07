import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

// Vercel adapter check (ADR-104). JSON store only, never touches a database. It simulates what Vercel does:
// no listening API server, a function called with (req, res), and the rewrite /api/x -> /api/index?__vf_path=x.
const tmp = await mkdtemp(join(tmpdir(), "vfirm-vercel-"));
Object.assign(process.env, { VERCEL: "1", VFIRM_STORE_BACKEND: "json", DATABASE_URL: "", VFIRM_DATABASE_URL: "", VFIRM_SMOKE_DATABASE_URL: "", VFIRM_STORE_PATH: join(tmp, "store.json"), VFIRM_STORE_AUTH: "", VFIRM_API_PORT: "3189" });

const { default: handler, rebuildUrl } = await import("../api/index.mjs");

// ---- URL rebuilding ----
assert.equal(rebuildUrl("/api/index?__vf_path=health"), "/health");
assert.equal(rebuildUrl("/api/index?__vf_path=edcs/sync/file"), "/edcs/sync/file");
assert.equal(rebuildUrl("/api/index?__vf_path=mvp/store&tenant_id=t1&firm_id=f1"), "/mvp/store?tenant_id=t1&firm_id=f1", "other query parameters survive");
assert.equal(rebuildUrl("/api/health"), "/health", "original URL kept by the platform");
assert.equal(rebuildUrl("/api/edcs/runs?tenant_id=t1"), "/edcs/runs?tenant_id=t1");
assert.equal(rebuildUrl("/api/index?__vf_path="), "/");
assert.equal(rebuildUrl("/api"), "/");
assert.equal(rebuildUrl("/api/index"), "/");

// ---- through the function, over a plain HTTP wrapper ----
const wrapper = createServer((req, res) => handler(req, res));
await new Promise((resolve) => wrapper.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${wrapper.address().port}`;
const call = async (method, path, body, headers = {}) => {
  const response = await fetch(`${base}${path}`, { method, headers: { "content-type": "application/json", ...headers }, body: body ? JSON.stringify(body) : undefined });
  return { status: response.status, json: await response.json().catch(() => ({})) };
};
try {
  let r = await call("GET", "/api/index?__vf_path=health");
  assert.equal(r.status, 200); assert.equal(r.json.service, "vfirm-api");
  r = await call("GET", "/api/health");
  assert.equal(r.status, 200, "also works when the platform keeps the original URL");
  r = await call("POST", "/api/index?__vf_path=tenants", { name: "Vercel Adapter Test" });
  assert.equal(r.status, 201, "a JSON request body reaches the route");
  const tenant = r.json.data;
  r = await call("GET", `/api/index?__vf_path=mvp/store&tenant_id=${encodeURIComponent(tenant.id)}`);
  assert.equal(r.status, 200, "query string reaches the route");
  assert.ok(r.json.data.tenants.some((t) => t.id === tenant.id), "and the scoped read sees the new tenant");
  r = await call("GET", "/api/index?__vf_path=no/such/route");
  assert.equal(r.status, 404);
} finally {
  await new Promise((resolve) => wrapper.close(resolve));
}

// ---- importing the API on Vercel must not start a listener ----
const probe = spawnSync(process.execPath, ["-e", `
  process.env.VERCEL = "1"; process.env.VFIRM_STORE_BACKEND = "json"; process.env.VFIRM_STORE_PATH = ${JSON.stringify(join(tmp, "probe.json"))}; process.env.DATABASE_URL = "";
  import("./api/index.mjs").then(() => setTimeout(() => process.exit(0), 300));
`], { cwd: process.cwd(), encoding: "utf8", timeout: 20000, env: { ...process.env } });
assert.equal(probe.status, 0, `import should finish cleanly: ${probe.stderr}`);
assert.ok(!/listening/.test(probe.stdout), "no server listens on Vercel");

// ---- deployment files ----
const config = JSON.parse(await readFile("vercel.json", "utf8"));
assert.deepEqual(config.regions, ["sin1"], "Singapore");
assert.equal(config.outputDirectory, "dist");
assert.ok(config.rewrites.some((rule) => rule.source === "/api/:path*" && rule.destination.startsWith("/api/index?__vf_path=")));
assert.ok(config.functions["api/index.mjs"].includeFiles.includes("infra/database"), "schema files for the readiness route are bundled");
const build = spawnSync(process.execPath, ["scripts/build-vercel-static.mjs"], { cwd: process.cwd(), encoding: "utf8" });
assert.equal(build.status, 0, build.stderr);
for (const file of ["dist/index.html", "dist/login.html", "dist/styles.css", "dist/shared/identity-resolution.mjs"]) assert.ok((await stat(file)).isFile(), `${file} built`);
assert.ok(!(await readFile("api/index.mjs", "utf8")).includes("listen("), "the function never listens");

await rm(tmp, { recursive: true, force: true });
console.log(JSON.stringify({ status: "pass", adr: "ADR-104", backend: "json (no database touched)", checked: ["URL rebuilding for both rewrite behaviours", "JSON body, query string and 404 through the function", "no listener on Vercel", "vercel.json (Singapore, rewrite, bundled schema files)", "console static build"] }, null, 2));
process.exit(0);
