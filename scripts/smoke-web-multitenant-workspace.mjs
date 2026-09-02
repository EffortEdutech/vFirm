import { readFile } from "node:fs/promises";

const html = await readFile("apps/web/public/index.html", "utf8");
const app = await readFile("apps/web/public/app.js", "utf8");
const seed = await readFile("scripts/seed-nhl-global-solution-local.mjs", "utf8");
const onboarding = await readFile("scripts/smoke-nhl-global-solution-onboarding.mjs", "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(html.includes('id="activeWorkspace"'), "Active workspace selector container missing from HTML.");
assert(app.includes('ACTIVE_FIRM_STORAGE_KEY = "vfirm.activeFirmId"'), "Active firm localStorage key missing.");
assert(/function\s+activeFirmInStore\s*\(/.test(app), "activeFirmInStore helper missing.");
assert(/function\s+activeTenantInStore\s*\(/.test(app), "activeTenantInStore helper missing.");
assert(/function\s+scopedStoreForActiveFirm\s*\(/.test(app), "scopedStoreForActiveFirm helper missing.");
assert(/function\s+renderActiveWorkspaceSelector\s*\(/.test(app), "renderActiveWorkspaceSelector helper missing.");
assert(app.includes('localStorage.setItem(ACTIVE_FIRM_STORAGE_KEY'), "Active firm selection is not persisted.");
assert(app.includes('renderActiveWorkspaceSelector(lastStore, scopedStore);'), "renderAll must render the active workspace selector.");
assert(app.includes('renderSummary(scopedStore);'), "renderAll must render dashboard summary from scoped store.");
assert(app.includes('renderRecordViews(scopedStore);'), "renderAll must render record views from scoped store.");
assert(app.includes('firm_client_relationships'), "Scoped store should preserve firm-client relationship awareness.");
assert(app.includes('clientIds.has(item.id)'), "Client records should be scoped through active firm relationships.");
assert(seed.includes('NHL Global Solution') && onboarding.includes('NHL Global Solution'), "Correct singular NHL Global Solution test/seed identity should remain present.");
assert(!app.includes('NHL Global Solutions') && !html.includes('NHL Global Solutions') && !seed.includes('NHL Global Solutions') && !onboarding.includes('NHL Global Solutions'), "Old plural NHL Global Solutions name must not remain in web/onboarding source.");

console.log(JSON.stringify({
  smoke: "web-multitenant-workspace",
  result: "passed",
  checks: [
    "active_workspace_selector",
    "active_firm_persistence",
    "scoped_store_rendering",
    "firm_client_relationship_scoping",
    "nhl_singular_name"
  ]
}, null, 2));