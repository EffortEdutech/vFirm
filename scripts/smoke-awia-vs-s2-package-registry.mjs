import assert from "node:assert/strict";
import { stat } from "node:fs/promises";
import {
  awiaVirtualStaffPackageRegistry,
  firstPilotStaffSet,
  runtimeEligibilityByStatus,
  validateAwiaPackageRegistry
} from "../packages/core-domain/src/awia-virtual-staff-registry.mjs";

const result = validateAwiaPackageRegistry();
assert.equal(result.ok, true, JSON.stringify(result.findings, null, 2));
assert.equal(result.summary.entry_count, 17);
assert.equal(result.summary.business_staff_package_count, 10);
assert.equal(result.summary.runtime_candidate_count, 6);

for (const entry of awiaVirtualStaffPackageRegistry.entries) {
  await stat(entry.source_path);
  assert(runtimeEligibilityByStatus[entry.registry_status], `Missing eligibility for ${entry.registry_status}`);
  assert(!entry.default_boundary.toLowerCase().includes("unlimited"), `${entry.package_id} boundary must not imply unlimited authority`);
}

const sourceNames = new Set(awiaVirtualStaffPackageRegistry.entries.map((entry) => entry.source_name));
for (const expected of ["ARO", "AWIA", "CFO", "CHRO", "CIO", "CMO", "Construction", "COO", "CTO", "ECC-main", "FAO", "OPO", "SAO", "vFirm", "virtual-firm", "_archive", "_cowork-ready"]) {
  assert(sourceNames.has(expected), `Expected source folder ${expected} to be mapped`);
}

const byPackageId = new Map(awiaVirtualStaffPackageRegistry.entries.map((entry) => [entry.package_id, entry]));
for (const staff of firstPilotStaffSet) {
  const entry = byPackageId.get(staff.package_id);
  assert(entry, `Pilot staff ${staff.staff_code} package missing`);
  assert(["REFERENCE_PINNED", "VALIDATED_CANDIDATE", "CANDIDATE"].includes(entry.registry_status), `Pilot staff ${staff.staff_code} package is not controlled-runtime candidate`);
}

assert.equal(byPackageId.get("cfo").registry_status, "REFERENCE_PINNED");
assert.equal(byPackageId.get("fao").registry_status, "REFERENCE_PINNED");
assert.equal(byPackageId.get("sao").registry_status, "VALIDATED_CANDIDATE");
assert.equal(byPackageId.get("coo").registry_status, "PLANNED");
assert.equal(byPackageId.get("ecc-main").package_kind, "engineering_tooling_package");

console.log(JSON.stringify({
  smoke: "awia-vs-s2-package-registry",
  result: "passed",
  summary: result.summary,
  pilot_staff_count: firstPilotStaffSet.length,
  boundary: awiaVirtualStaffPackageRegistry.implementation_boundary
}, null, 2));
