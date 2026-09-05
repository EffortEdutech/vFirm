// AWIA Virtual Staff Templates for Multi-Firm Scaling
//
// Boundary: a named, versioned staff roster template is metadata only. It
// lets multiple firms each provision their own independent AWIA virtual
// staff roster from a shared, reusable definition instead of every firm
// being hard-pinned to the single original pilot roster. Selecting a
// template does not grant authority, does not enable autonomous runtime
// execution, and does not create any cross-firm data sharing: each firm's
// provisioning run remains tenant/firm scoped exactly as before.

import { firstPilotStaffSet } from "./awia-virtual-staff-registry.mjs";

export const templateScalingBoundary =
  "named_roster_templates_only_no_cross_firm_data_sharing_no_autonomous_authority";

export const awiaStaffTemplates = {
  formwork_engineering_standard_v1: {
    template_id: "formwork_engineering_standard_v1",
    name: "Formwork Engineering Standard Roster",
    description: "The original 8-role controlled pilot roster (CFO, FAO x3, SAO, OPO, ARO, DATA) used for the Amanah Formwork Pilot Firm and NHL Global Solution.",
    version: "1.0",
    staff_set: firstPilotStaffSet
  },
  lean_advisory_practice_v1: {
    template_id: "lean_advisory_practice_v1",
    name: "Lean Advisory Practice Roster",
    description: "A minimal 3-role roster for a small advisory firm: one executive finance role, one operations manager role, one administration worker role.",
    version: "1.0",
    staff_set: [
      { staff_code: "CFO-001", package_id: "cfo", role_code: "CFO", staff_grade: "Executive" },
      { staff_code: "OPO-001", package_id: "opo", role_code: "OPO", staff_grade: "Manager" },
      { staff_code: "ARO-001", package_id: "aro", role_code: "ARO", staff_grade: "Worker" }
    ]
  },
  finance_back_office_v1: {
    template_id: "finance_back_office_v1",
    name: "Finance Back-Office Roster",
    description: "A finance-operations-focused roster: one executive oversight role plus three finance administration workers.",
    version: "1.0",
    staff_set: [
      { staff_code: "CFO-001", package_id: "cfo", role_code: "CFO", staff_grade: "Executive" },
      { staff_code: "FAO-AP-001", package_id: "fao", role_code: "FAO", staff_grade: "Worker" },
      { staff_code: "FAO-REV-001", package_id: "fao", role_code: "FAO", staff_grade: "Worker" },
      { staff_code: "DATA-001", package_id: "fao", role_code: "FAO", staff_grade: "Assistant" }
    ]
  }
};

export function listAwiaStaffTemplates() {
  return Object.values(awiaStaffTemplates).map((template) => ({
    template_id: template.template_id,
    name: template.name,
    description: template.description,
    version: template.version,
    staff_count: template.staff_set.length
  }));
}

export function resolveAwiaStaffTemplate(templateId) {
  const template = awiaStaffTemplates[templateId];
  if (!template) {
    return { found: false, findings: [`awia_staff_template_not_recognized:${templateId}`] };
  }
  return { found: true, findings: [], template };
}
