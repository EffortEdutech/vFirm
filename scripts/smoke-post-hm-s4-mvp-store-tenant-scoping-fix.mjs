import assert from "node:assert/strict";
import { readFile, mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

// Post-HM-S4 hotfix (2026-09-21): a real cross-tenant data leak was found
// while manually testing the ARO-10 pilot against a real, live firm --
// My Team showed 17 hired workers instead of that one firm's own roster,
// because apps/web-console/public/js/api.js's getStore() (GET /mvp/store)
// is a deliberate, unscoped WHOLE-DATABASE read (see api-contracts.mjs:
// "Compatibility full-store read for local development fallback"), and
// every Owner-console content page (My Team, Workdesk, Sales, Projects,
// Finance) rendered that unfiltered result as if it were the current firm's
// own data. Invisible while only one real firm existed in the store;
// became a real leak once HM-S3 put multiple real firms in one shared live
// database. Fixed by adding api.js's scopeStoreToCurrentFirm() and wiring
// it into all four affected render paths in pages-owner.js.
//
// This test extracts scopeStoreToCurrentFirm()'s EXACT shipped source
// (rather than importing api.js directly, which transitively imports a
// live Supabase client via a bare "https://esm.sh/..." specifier that
// Node's ESM loader cannot resolve on its own) and exercises it as a real
// ES module against a synthetic multi-firm store fixture shaped exactly
// like the real /mvp/store response (tenants/firms unscoped reference
// arrays; awia_virtual_staff_members/clients/invoices firm-scoped arrays).
//
// Proves:
//   1. Firm-scoped collections (records carrying a firm_id field) are
//      filtered down to ONLY the current firm's records.
//   2. Reference collections that never carry firm_id (firms, tenants) are
//      left completely untouched -- resolveIdentityFromStore() and any
//      other boot-time reader still sees every firm/tenant.
//   3. Before identity is resolved (no firm_id set yet), the store passes
//      through unscoped -- the boot-time bootstrap path is not broken.
//   4. A non-array field on the store passes through untouched.
//   5. The exact scenario the product owner hit -- three firms each having
//      hired a "CFO-001"/"General Clerk" with colliding auto-generated
//      codes -- is resolved to just the current firm's one worker.

const root = process.cwd();
const tmp = await mkdtemp(join(tmpdir(), "vfirm-mvp-store-scoping-fix-"));

function extractBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `Could not find "${startMarker}" in source.`);
  const end = source.indexOf(endMarker, start);
  assert.notEqual(end, -1, `Could not find "${endMarker}" after "${startMarker}".`);
  return source.slice(start, end).trim();
}

const apiSource = await readFile(join(root, "apps/web-console/public/js/api.js"), "utf8");
const identityDeclSrc = extractBetween(apiSource, "let identity = null;", "\n\nexport function setIdentity");
const setIdentitySrc = extractBetween(apiSource, "export function setIdentity(value) {", "\n\nexport function getIdentity");
const scopeStoreSrc = extractBetween(apiSource, "export function scopeStoreToCurrentFirm(store) {", "\n\n// Reference data for the \"Hire a worker\" panel");
assert.match(setIdentitySrc, /export function setIdentity\(value\) \{[\s\S]*\n\}$/, "Extracted setIdentity source malformed.");
assert.match(scopeStoreSrc, /export function scopeStoreToCurrentFirm\(store\) \{[\s\S]*\n\}$/, "Extracted scopeStoreToCurrentFirm source malformed.");

const harnessPath = join(tmp, "mvp-store-scoping-harness.mjs");
await writeFile(harnessPath, [
  identityDeclSrc + ";",
  setIdentitySrc,
  scopeStoreSrc
].join("\n\n"), "utf8");

// pathToFileURL is required for dynamic import() to work on Windows, where a
// bare drive-letter path is not a valid ESM specifier and throws
// ERR_UNSUPPORTED_ESM_URL_SCHEME.
const { setIdentity, scopeStoreToCurrentFirm } = await import(pathToFileURL(harnessPath).href);

// --- Synthetic store shaped like the real /mvp/store response: three real
// firms, each having independently hired a CFO-001 and a General Clerk with
// colliding auto-generated codes -- exactly the shape the product owner hit. ---
const store = {
  tenants: [{ id: "tenant-amanah" }, { id: "tenant-nhl" }, { id: "tenant-hm-test" }],
  firms: [{ id: "firm-amanah", tenant_id: "tenant-amanah" }, { id: "firm-nhl", tenant_id: "tenant-nhl" }, { id: "firm-hm-test", tenant_id: "tenant-hm-test" }],
  awia_virtual_staff_members: [
    { id: "member-1", firm_id: "firm-amanah", agent_code: "CFO-001", display_name: "Chief Finance Officer" },
    { id: "member-2", firm_id: "firm-amanah", agent_code: "GC-1", display_name: "General Clerk" },
    { id: "member-3", firm_id: "firm-nhl", agent_code: "CFO-001", display_name: "Chief Finance Officer" },
    { id: "member-4", firm_id: "firm-nhl", agent_code: "GC-1", display_name: "General Clerk" },
    { id: "member-5", firm_id: "firm-hm-test", agent_code: "CFO-001", display_name: "Chief Finance Officer" },
    { id: "member-6", firm_id: "firm-hm-test", agent_code: "GC-1", display_name: "General Clerk" }
  ],
  clients: [
    { id: "client-1", firm_id: "firm-amanah" },
    { id: "client-2", firm_id: "firm-nhl" }
  ],
  invoices: [],
  some_scalar_field: "unchanged"
};

// 1 & 2 & 4: before identity is set (boot-time bootstrap path), everything
// passes through completely unscoped -- resolveIdentityFromStore() needs
// the whole store to find the active firm in the first place.
const beforeIdentity = scopeStoreToCurrentFirm(store);
assert.equal(beforeIdentity, store, "Before identity is resolved, the store must pass through unscoped (the boot-time bootstrap path).");

// Now resolve identity to the real NHL firm, as main.js does after boot.
setIdentity({ tenant_id: "tenant-nhl", firm_id: "firm-nhl" });
const scoped = scopeStoreToCurrentFirm(store);

// 1: firm-scoped collections filtered down to ONLY firm-nhl's own records.
assert.equal(scoped.awia_virtual_staff_members.length, 2, "NHL's own roster must contain exactly its own 2 workers, not all 6 across 3 firms.");
assert.ok(scoped.awia_virtual_staff_members.every((m) => m.firm_id === "firm-nhl"), "Every remaining worker must belong to firm-nhl.");
assert.deepEqual(scoped.awia_virtual_staff_members.map((m) => m.id).sort(), ["member-3", "member-4"], "Must be exactly NHL's own two workers.");
assert.equal(scoped.clients.length, 1);
assert.equal(scoped.clients[0].firm_id, "firm-nhl");

// 2: reference collections without firm_id are left completely untouched --
// every firm/tenant must still be visible to whatever else reads them.
assert.equal(scoped.tenants.length, 3, "Reference collections without firm_id (tenants) must never be filtered.");
assert.equal(scoped.firms.length, 3, "Reference collections without firm_id (firms) must never be filtered.");
assert.deepEqual(scoped.firms, store.firms);

// 4: a non-array scalar field passes through untouched.
assert.equal(scoped.some_scalar_field, "unchanged");

// Empty firm-scoped array stays empty (not accidentally treated as
// "not firm-scoped" and left as some other firm's leftover data).
assert.deepEqual(scoped.invoices, []);

console.log(JSON.stringify({
  smoke: "post-hm-s4-mvp-store-tenant-scoping-fix",
  result: "passed",
  before_identity_passthrough: beforeIdentity === store,
  nhl_own_worker_count: scoped.awia_virtual_staff_members.length,
  total_workers_across_all_firms_in_fixture: store.awia_virtual_staff_members.length,
  reference_collections_untouched: scoped.tenants.length === 3 && scoped.firms.length === 3,
  boundary: "fixes_cross_tenant_leak_in_my_team_workdesk_sales_projects_finance_pages"
}, null, 2));

await rm(tmp, { recursive: true, force: true });
