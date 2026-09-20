// HM-S3 item 1 -- read-only audit.
//
// Purpose: enumerate every real firm in the live store that currently
// carries any staff_code from the hard-coded `firstPilotStaffSet` legacy
// pilot roster (packages/core-domain/src/awia-virtual-staff-registry.mjs),
// confirmed in this sprint's investigation to have been injected via the
// ungated admin "provision-pilot" escape hatch (POST
// /awia/virtual-staff/provision-pilot), not through the governed
// hire-a-worker flow.
//
// This script makes NO writes. It reads /mvp/store and reports findings
// only. Nothing here changes any firm's data.

import { firstPilotStaffSet } from "../packages/core-domain/src/awia-virtual-staff-registry.mjs";

const base = process.env.VFIRM_API_BASE ?? "http://127.0.0.1:3091";
const legacyCodes = new Set(firstPilotStaffSet.map((staff) => staff.staff_code));

async function readStore() {
  const response = await fetch(`${base}/mvp/store`);
  const json = await response.json().catch(() => ({ ok: false, error: { message: "Non-JSON response" } }));
  if (!response.ok || !json.ok) throw new Error(`/mvp/store failed: ${response.status} ${JSON.stringify(json)}`);
  return json.data;
}

async function main() {
  const health = await fetch(`${base}/health`).then((r) => r.json()).catch(() => null);
  if (!health?.ok) throw new Error(`vFirm API is not healthy at ${base}`);

  const store = await readStore();
  const firms = store.firms ?? [];
  const members = store.awia_virtual_staff_members ?? [];
  const packageAssignments = store.awia_firm_package_assignments ?? [];

  const findings = [];

  for (const firm of firms) {
    const firmMembers = members.filter((m) => m.firm_id === firm.id);
    if (!firmMembers.length) continue;

    const legacyMembers = firmMembers.filter((m) => legacyCodes.has(m.agent_code));
    if (!legacyMembers.length) continue;

    const governedMembers = firmMembers.filter((m) => !legacyCodes.has(m.agent_code));
    const packageAssignment = packageAssignments.find((p) => p.tenant_id === firm.tenant_id && p.firm_id === firm.id);

    findings.push({
      firm_name: firm.name,
      firm_id: firm.id,
      tenant_id: firm.tenant_id,
      total_staff_count: firmMembers.length,
      legacy_pilot_staff: legacyMembers.map((m) => ({
        staff_code: m.agent_code,
        display_name: m.display_name,
        lifecycle_status: m.lifecycle_status
      })),
      legacy_pilot_staff_count: legacyMembers.length,
      governed_hire_staff: governedMembers.map((m) => ({
        staff_code: m.agent_code,
        display_name: m.display_name,
        lifecycle_status: m.lifecycle_status
      })),
      governed_hire_staff_count: governedMembers.length,
      has_package_assignment: Boolean(packageAssignment),
      package_code: packageAssignment?.package_code ?? null
    });
  }

  console.log(JSON.stringify({
    audit: "hm-s3-item-1-legacy-staff-roster",
    boundary: "read_only_no_writes",
    checked_at: new Date().toISOString(),
    total_firms_in_store: firms.length,
    firms_with_legacy_pilot_roster: findings.length,
    findings
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
