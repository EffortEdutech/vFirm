// CE-S6 manual test helper (ADR-101): builds everything the Windows manual test needs, in one command.
//
//   node apps/edcs-connector/scripts/local-test-kit.mjs --api http://127.0.0.1:3091 --out C:\vfirm-connector-test
//
// It needs a vFirm API that YOU started on this PC with the throw-away JSON store (see
// docs/10_post_freeze_technical_design/CE_S6_WINDOWS_MANUAL_TEST_v1.0.md). It refuses any address that is not
// this PC, so it can never create test data on the real (production) server.
//
// It does four things:
//   1. creates a throw-away test firm in that local API (tenant, firm, owner, BizKick connection company NEX);
//   2. issues a connector for it and keeps the token;
//   3. writes a small synthetic BizKick folder (a register of 6 rows, a Sales file, an HR file) under <out>\BizKick;
//   4. writes a ready connector.config.json under <out>, with the token filled in and the state folder outside BizKick.
// Then it prints the exact commands to run next.

import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { REGISTER_COLUMNS } from "../../../packages/core-domain/src/edcs-register.mjs";

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, item, index, all) => (item.startsWith("--") ? [...pairs, [item.slice(2), all[index + 1]]] : pairs), []));
const api = String(args.api ?? "http://127.0.0.1:3091").replace(/\/+$/, "");
if (!args.out) { console.error("Give a folder for the test files: --out C:\\vfirm-connector-test"); process.exit(1); }
const out = resolve(String(args.out));

const host = new URL(api).hostname;
if (!["127.0.0.1", "localhost", "[::1]", "::1"].includes(host)) {
  console.error(`Refusing ${api}: this helper only works against an API running on this PC (127.0.0.1 or localhost). It creates throw-away test data, so it must never point at the real server.`);
  process.exit(1);
}

async function call(path, body, headers = {}) {
  const response = await fetch(`${api}${path}`, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || json.ok === false) throw new Error(`${path} failed: HTTP ${response.status} ${JSON.stringify(json).slice(0, 300)}`);
  return json.data;
}

const stamp = Date.now();
const tenant = await call("/tenants", { name: `Connector Test Tenant ${stamp}` });
const seed = await call("/firms", { tenant_id: tenant.id, name: `Connector Test Firm ${stamp}`, principal_name: "Test Owner" });
const firm = seed.firm;
const scope = { tenant_id: firm.tenant_id, firm_id: firm.id };
const headers = { "x-vfirm-actor-id": seed.principal_actor.id, "x-vfirm-tenant-id": firm.tenant_id, "x-vfirm-firm-id": firm.id, "x-vfirm-role": "principal" };
await call("/edcs/connection", { ...scope, company_code: "NEX", bizkick_version: "1.0" }, headers);
const issued = await call("/edcs/connectors", { ...scope, name: "Manual test PC", topology: "A" }, headers);

const bizkick = join(out, "BizKick");
await mkdir(join(bizkick, "EDCS"), { recursive: true });
await mkdir(join(bizkick, "Sales"), { recursive: true });
await mkdir(join(bizkick, "HR"), { recursive: true });
const header = REGISTER_COLUMNS.map((c) => c.header).join(",");
const rows = [1, 2, 3, 4, 5].map((seq) => ["NEX", "QT", 2026, seq, "", "R0", "2026-09-01", "2026-09-02", "Customer", `Customer ${seq}`, `Quotation ${seq}`, 1000 * seq, "MYR", "Issued", "Owner", "2026-12-31", "", "", "", "", "", "2026-09-02", "", ""].join(","));
// one leave (LV) row: LV is an HR document type, so the default content policy keeps only its metadata
rows.push(["NEX", "LV", 2026, 1, "", "R0", "2026-09-01", "2026-09-02", "Employee", "Employee 1", "Leave 1", "", "", "Issued", "Owner", "2026-12-31", "", "", "", "", "", "2026-09-02", "", ""].join(","));
await writeFile(join(bizkick, "EDCS", "register.csv"), ["BizKick EDCS", "", "", "", "", header, ...rows].join("\n"));
await writeFile(join(bizkick, "Sales", "NEX-QT-2026-0001_R0.txt"), "Synthetic quotation file for the connector test.\n");
await writeFile(join(bizkick, "HR", "NEX-LV-2026-0001_R0.txt"), "Synthetic file standing in for a sensitive HR file. Its content must never leave this PC.\n");

const config = {
  vfirm_url: api,
  connector_token: issued.token,
  topology: "A",
  bizkick_root: bizkick,
  register_path: join("EDCS", "register.csv"),
  controlled_folders: ["Sales", "HR"],
  state_dir: join(out, "connector-state"),
  poll_interval_seconds: 20,
  heartbeat_interval_seconds: 20,
  watch: true,
  retry: { base_ms: 2000, max_ms: 60000 },
  outbox_enabled: false
};
const configPath = join(out, "connector.config.json");
await writeFile(configPath, JSON.stringify(config, null, 2));

// A tiny PowerShell helper so you can look at the results without a console login:  .\read-api.ps1 /edcs/sync-runs
const reader = `param([Parameter(Mandatory = $true)][string]$Path)
$headers = @{ 'x-vfirm-actor-id' = '${seed.principal_actor.id}'; 'x-vfirm-tenant-id' = '${firm.tenant_id}'; 'x-vfirm-firm-id' = '${firm.id}'; 'x-vfirm-role' = 'principal' }
$join = if ($Path.Contains('?')) { '&' } else { '?' }
Invoke-RestMethod -Uri "${api}$Path\${join}tenant_id=${firm.tenant_id}&firm_id=${firm.id}" -Headers $headers | ConvertTo-Json -Depth 8
`;
await writeFile(join(out, "read-api.ps1"), reader);
// ...and one for the few actions the test needs (revoke a connector):  .\post-api.ps1 /edcs/connectors/revoke '{"connector_id":"<id>"}'
const poster = `param([Parameter(Mandatory = $true)][string]$Path, [Parameter(Mandatory = $true)][string]$Json)
$headers = @{ 'x-vfirm-actor-id' = '${seed.principal_actor.id}'; 'x-vfirm-tenant-id' = '${firm.tenant_id}'; 'x-vfirm-firm-id' = '${firm.id}'; 'x-vfirm-role' = 'principal'; 'content-type' = 'application/json' }
$body = ($Json | ConvertFrom-Json)
$body | Add-Member -NotePropertyName tenant_id -NotePropertyValue '${firm.tenant_id}' -Force
$body | Add-Member -NotePropertyName firm_id -NotePropertyValue '${firm.id}' -Force
Invoke-RestMethod -Method Post -Uri "${api}$Path" -Headers $headers -Body ($body | ConvertTo-Json -Depth 8) | ConvertTo-Json -Depth 8
`;
await writeFile(join(out, "post-api.ps1"), poster);

console.log(JSON.stringify({ ok: true, test_firm: firm.name, connector: issued.connector.name, config: configPath, bizkick_folder: bizkick, console_scope: scope }, null, 2));
console.log(`
Next, from the virtual-firm folder:

  node apps\\edcs-connector\\bin\\edcs-connector.mjs once --config "${configPath}"

To look at the results (sync runs, connector health):

  cd "${out}"
  .\\read-api.ps1 /edcs/sync-runs
  .\\read-api.ps1 /edcs/connectors

Then follow the numbered steps in CE_S6_WINDOWS_MANUAL_TEST_v1.0.md. The connector token is inside the config file;
this is a throw-away test firm on your own PC, so that is fine. Delete the ${out} folder when you are done.`);
