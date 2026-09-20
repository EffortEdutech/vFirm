// AWIA Virtual Staff Position Catalogue (HM-S1 checklist item 2)
//
// Boundary: this module is metadata only -- a position-to-skill-subset
// mapping table. It answers "which skills, at which authority class, does
// this client-facing job title draw from" and nothing else. It does not
// execute any skill, does not grant runtime authority, does not change
// hiring/provisioning behavior, and does not touch the existing role_code
// based registry in awia-virtual-staff-registry.mjs. Per the HM-S1 owner
// decision (Section 8 of "vFirm Position-to-Skill Mapping v1.0"), HM-S1
// ships this data/UI layer only -- no skill-execution engine exists yet in
// apps/ or packages/, and none is added by this module. HM-S2+ is the
// separately authorized sprint that would add real execution against this
// mapping.
//
// Source of truth for this data: "vFirm Position-to-Skill Mapping v1.0"
// (living doc), Sections 2-7, cross-checked directly against each
// package's own registry/README (ARO/SKILLS_CONTENT_INDEX.md, FAO
// fao-skills/skills/registry.yaml, SAO registry/skills.registry.yaml,
// OPO README.md) rather than any earlier stale proposal document.

export const positionCatalogueBoundary =
  "position_to_skill_mapping_metadata_only_no_runtime_authority_no_execution_engine";

// Authority class meaning, shared across every position:
//   B/C = full autonomy, position may act on its own.
//   A   = prepare-only; the position drafts, a separate named human
//         approver (per Section 7's decision: the firm owner, by default,
//         for every position in this starter batch) must approve before
//         the output takes effect. SOD-scoped skills additionally require
//         that the approver never be the same identity as the preparer.
export const positionSkillAuthorityClasses = ["A", "B", "C"];

export const awiaVirtualStaffPositionCatalogue = {
  catalogue_id: "awia-virtual-staff-position-catalogue-v1",
  version: "1.0",
  scope: "position_to_skill_subset_mapping",
  implementation_boundary: positionCatalogueBoundary,
  default_class_a_approver: "firm_owner",
  positions: [
    {
      position_id: "general_clerk",
      job_title: "General Clerk",
      package_id: "aro",
      role_code: "ARO",
      skills: [
        { skill_id: "ARO-01", authority_class: "B" },
        { skill_id: "ARO-02", authority_class: "B" },
        { skill_id: "ARO-03", authority_class: "B" },
        { skill_id: "ARO-04", authority_class: "B" },
        { skill_id: "ARO-05", authority_class: "B" },
        { skill_id: "ARO-06", authority_class: "B" },
        { skill_id: "ARO-08", authority_class: "B" },
        { skill_id: "ARO-09", authority_class: "B" },
        { skill_id: "ARO-17", authority_class: "B" },
        { skill_id: "ARO-27", authority_class: "B" },
        { skill_id: "ARO-28", authority_class: "B" },
        { skill_id: "ARO-29", authority_class: "B" },
        { skill_id: "ARO-32", authority_class: "B" },
        { skill_id: "ARO-33", authority_class: "B" },
        { skill_id: "ARO-34", authority_class: "B" }
      ],
      out_of_scope_note: "ARO-07, ARO-10-16, ARO-18-26, ARO-30-31 -- PII-scoped, SOD-scoped, or Class A; routed to HR Administrator or the firm owner instead.",
      maturity_note: "ARO is fully authored but pre-Candidate (no Phase 7 package validation or human professional review yet)."
    },
    {
      position_id: "bookkeeper",
      job_title: "Bookkeeper",
      package_id: "fao",
      role_code: "FAO",
      skills: [
        { skill_id: "FAO-05", authority_class: "B" },
        { skill_id: "FAO-06", authority_class: "B" },
        { skill_id: "FAO-07", authority_class: "B" },
        { skill_id: "FAO-09", authority_class: "C" },
        { skill_id: "FAO-11", authority_class: "B" },
        { skill_id: "FAO-12", authority_class: "C" },
        { skill_id: "FAO-23", authority_class: "C" },
        { skill_id: "FAO-24", authority_class: "B" },
        { skill_id: "FAO-26", authority_class: "B" },
        { skill_id: "FAO-27", authority_class: "B" },
        { skill_id: "FAO-28", authority_class: "B" },
        { skill_id: "FAO-10", authority_class: "A", sod_scoped: true, note: "Journal Entry Preparation & Support -- drafts the entry; someone else must approve/post it." },
        { skill_id: "FAO-13", authority_class: "A", sod_scoped: true, note: "Chart of Accounts Maintenance -- proposes changes; does not self-approve." }
      ],
      out_of_scope_note: "FAO-01-04 (AP), FAO-08 (credit risk scoring), FAO-14 (intercompany), FAO-15-18 (payroll), FAO-19-22 (fixed assets/costing), FAO-25 (petty cash, PII-scoped), FAO-29-34 (tax, audit, SOX, data-quality monitoring) -- Accountant/Controller tier instead.",
      maturity_note: "FAO is the most mature worker package after CFO -- still pre-Candidate."
    },
    {
      position_id: "sales_coordinator",
      job_title: "Sales Coordinator",
      package_id: "sao",
      role_code: "SAO",
      skills: [
        { skill_id: "SAO-01", authority_class: "B" },
        { skill_id: "SAO-02", authority_class: "B" },
        { skill_id: "SAO-03", authority_class: "B" },
        { skill_id: "SAO-04", authority_class: "B" },
        { skill_id: "SAO-05", authority_class: "B" },
        { skill_id: "SAO-06", authority_class: "B" },
        { skill_id: "SAO-07", authority_class: "B" },
        { skill_id: "SAO-08", authority_class: "B" },
        { skill_id: "SAO-09", authority_class: "B" },
        { skill_id: "SAO-10", authority_class: "B" },
        { skill_id: "SAO-13", authority_class: "B" },
        { skill_id: "SAO-14", authority_class: "B" },
        { skill_id: "SAO-15", authority_class: "B" },
        { skill_id: "SAO-16", authority_class: "C" },
        { skill_id: "SAO-19", authority_class: "B" },
        { skill_id: "SAO-20", authority_class: "C" },
        { skill_id: "SAO-22", authority_class: "C" },
        { skill_id: "SAO-23", authority_class: "C" },
        { skill_id: "SAO-25", authority_class: "C" },
        { skill_id: "SAO-26", authority_class: "C" },
        { skill_id: "SAO-27", authority_class: "C" },
        { skill_id: "SAO-28", authority_class: "C" },
        { skill_id: "SAO-11", authority_class: "A", note: "Quotation Request Preparation" },
        { skill_id: "SAO-12", authority_class: "A", note: "Pricing & Discount Application" },
        { skill_id: "SAO-17", authority_class: "A", note: "Contract Handoff Preparation" },
        { skill_id: "SAO-18", authority_class: "A", note: "Order & Sale Booking Administration" },
        { skill_id: "SAO-21", authority_class: "A", note: "Renewal & Retention Administration" },
        { skill_id: "SAO-24", authority_class: "A", note: "Partnership & Referral Administration" }
      ],
      out_of_scope_note: "None -- Sales Coordinator draws on the entire 28-skill SAO package.",
      maturity_note: "SAO has passed Layers 1-3 and 5 of its five-layer validation; only Phase 8 (qualified human sales/commercial review) is outstanding. Spot-check early output rather than treating it as fully autonomous from day one."
    },
    {
      position_id: "ops_coordinator",
      job_title: "Ops Coordinator",
      package_id: "opo",
      role_code: "OPO",
      skills: [
        { skill_id: "OPO-01", authority_class: "B" }, { skill_id: "OPO-02", authority_class: "B" },
        { skill_id: "OPO-04", authority_class: "B" }, { skill_id: "OPO-05", authority_class: "B" },
        { skill_id: "OPO-06", authority_class: "B" }, { skill_id: "OPO-07", authority_class: "B" },
        { skill_id: "OPO-08", authority_class: "B" }, { skill_id: "OPO-09", authority_class: "B" },
        { skill_id: "OPO-10", authority_class: "B" }, { skill_id: "OPO-11", authority_class: "B" },
        { skill_id: "OPO-12", authority_class: "B" }, { skill_id: "OPO-13", authority_class: "B" },
        { skill_id: "OPO-14", authority_class: "B" }, { skill_id: "OPO-16", authority_class: "B" },
        { skill_id: "OPO-17", authority_class: "B" }, { skill_id: "OPO-18", authority_class: "B" },
        { skill_id: "OPO-19", authority_class: "B" }, { skill_id: "OPO-20", authority_class: "B" },
        { skill_id: "OPO-21", authority_class: "B" }, { skill_id: "OPO-22", authority_class: "B" },
        { skill_id: "OPO-23", authority_class: "B" }, { skill_id: "OPO-25", authority_class: "B" },
        { skill_id: "OPO-26", authority_class: "B" }, { skill_id: "OPO-27", authority_class: "B" },
        { skill_id: "OPO-28", authority_class: "B" }, { skill_id: "OPO-30", authority_class: "B" },
        { skill_id: "OPO-32", authority_class: "C" }, { skill_id: "OPO-33", authority_class: "C" },
        { skill_id: "OPO-34", authority_class: "C" }, { skill_id: "OPO-35", authority_class: "C" },
        { skill_id: "OPO-36", authority_class: "C" }, { skill_id: "OPO-37", authority_class: "C" },
        { skill_id: "OPO-38", authority_class: "B" }, { skill_id: "OPO-39", authority_class: "B" },
        { skill_id: "OPO-40", authority_class: "B" }, { skill_id: "OPO-42", authority_class: "B" },
        { skill_id: "OPO-43", authority_class: "B" }, { skill_id: "OPO-44", authority_class: "B" },
        { skill_id: "OPO-15", authority_class: "B" },
        { skill_id: "OPO-03", authority_class: "A", sod_scoped: true, note: "Scope/Schedule/Budget Change Control" },
        { skill_id: "OPO-24", authority_class: "A", sod_scoped: true, note: "QA Release / Sign-Off Gate" },
        { skill_id: "OPO-29", authority_class: "A", sod_scoped: true, pii_scoped: true, note: "Compliance Attestation Preparation" },
        { skill_id: "OPO-31", authority_class: "A", sod_scoped: true, note: "Incident/Nonconformance Regulatory Reporting" },
        { skill_id: "OPO-41", authority_class: "A", sod_scoped: true, pii_scoped: true, note: "Proof-of-Delivery & Delivery Confirmation" }
      ],
      out_of_scope_note: "None -- Ops Coordinator draws on the entire 44-skill OPO package (39 full-autonomy + 5 Class A sign-off gates).",
      supervision_note: "The five Class A gates are the clearest future fit for the COO package once deployed (platform's own \"COO commands OPO\" chain). Until a COO position exists, route these five to the firm owner directly, per Section 7's decision.",
      maturity_note: "OPO is fully authored (44/44) but has not yet had its own Phase 7 package validation -- treat as the position needing the closest early oversight of the four."
    },
    {
      position_id: "hr_administrator",
      job_title: "HR Administrator",
      package_id: "aro",
      role_code: "ARO",
      skills: [
        { skill_id: "ARO-14", authority_class: "B", note: "Training & Competency Record Administration" },
        { skill_id: "ARO-21", authority_class: "B", note: "Facilities Request Triage" },
        { skill_id: "ARO-22", authority_class: "B", note: "Preventive Maintenance Coordination" },
        { skill_id: "ARO-16", authority_class: "C", note: "Expense Documentation Preparation" },
        { skill_id: "ARO-20", authority_class: "C", note: "Contract & Service Agreement Register Administration" },
        { skill_id: "ARO-23", authority_class: "C", note: "Workspace & Space Allocation" },
        { skill_id: "ARO-30", authority_class: "C", note: "Emergency Contact & Administrative Readiness" },
        { skill_id: "ARO-07", authority_class: "A", sod_scoped: true, note: "Records Retention & Disposition -- Class A in practice (SOD-scoped), so also prepare-only." },
        { skill_id: "ARO-10", authority_class: "A", pii_scoped: true, sod_scoped: true, note: "Employee Onboarding Administration" },
        { skill_id: "ARO-11", authority_class: "A", pii_scoped: true, sod_scoped: true, note: "Employee Offboarding Administration" },
        { skill_id: "ARO-12", authority_class: "A", pii_scoped: true, sod_scoped: true, note: "Leave & Attendance Administration" },
        { skill_id: "ARO-13", authority_class: "A", pii_scoped: true, sod_scoped: true, note: "Personnel Records Administration" },
        { skill_id: "ARO-15", authority_class: "A", pii_scoped: true, sod_scoped: true, note: "Business Travel Administration" },
        { skill_id: "ARO-18", authority_class: "A", pii_scoped: true, sod_scoped: true, note: "Vendor Administrative Record Management" },
        { skill_id: "ARO-19", authority_class: "A", pii_scoped: true, sod_scoped: true, note: "Purchase Requisition Administration" },
        { skill_id: "ARO-24", authority_class: "A", pii_scoped: true, sod_scoped: true, note: "Physical Access, Keys & Card Administration" },
        { skill_id: "ARO-25", authority_class: "A", pii_scoped: true, sod_scoped: true, note: "Asset Custody Assignment & Return" },
        { skill_id: "ARO-26", authority_class: "A", pii_scoped: true, sod_scoped: true, note: "Fleet & Vehicle Administration" },
        { skill_id: "ARO-31", authority_class: "A", pii_scoped: true, sod_scoped: true, note: "Licence, Permit, Insurance & Renewal Tracking" }
      ],
      out_of_scope_note: "None -- HR Administrator is the deliberately-excluded PII/Class-A slice of ARO not used by General Clerk. Same package, no new build.",
      why_this_position_exists: "Demonstrates the layering model directly: one skill package (ARO) powers two positions at two different authority tiers, rather than needing a sixth package built from scratch.",
      maturity_note: "Same as General Clerk -- ARO is fully authored, pre-Candidate."
    }
  ]
};

export function listAwiaVirtualStaffPositions() {
  return awiaVirtualStaffPositionCatalogue.positions.map((position) => ({
    position_id: position.position_id,
    job_title: position.job_title,
    package_id: position.package_id,
    role_code: position.role_code,
    skill_count: position.skills.length,
    class_a_skill_count: position.skills.filter((skill) => skill.authority_class === "A").length
  }));
}

export function resolveAwiaVirtualStaffPosition(positionId) {
  const position = awiaVirtualStaffPositionCatalogue.positions.find((item) => item.position_id === positionId);
  if (!position) {
    return { found: false, findings: [`awia_virtual_staff_position_not_recognized:${positionId}`] };
  }
  return { found: true, findings: [], position };
}

// Every Class A skill in a position, with the default approver applied
// (Section 7's decision: firm owner, by default, for this starter batch).
// This is metadata for the UI/config layer only -- it does not itself
// route, approve, or execute anything.
export function listClassAEscalationPoints(positionId) {
  const { found, position } = resolveAwiaVirtualStaffPosition(positionId);
  if (!found) return [];
  return position.skills
    .filter((skill) => skill.authority_class === "A")
    .map((skill) => ({
      skill_id: skill.skill_id,
      position_id: position.position_id,
      job_title: position.job_title,
      approver: awiaVirtualStaffPositionCatalogue.default_class_a_approver,
      sod_scoped: skill.sod_scoped === true,
      pii_scoped: skill.pii_scoped === true
    }));
}

export function validateAwiaVirtualStaffPositionCatalogue(catalogue = awiaVirtualStaffPositionCatalogue) {
  const findings = [];
  const positions = Array.isArray(catalogue?.positions) ? catalogue.positions : [];
  const positionIds = new Set();
  const jobTitles = new Set();

  if (catalogue?.implementation_boundary !== positionCatalogueBoundary) {
    findings.push({ code: "IMPLEMENTATION_BOUNDARY_REQUIRED", severity: "ERROR" });
  }

  for (const position of positions) {
    if (!position.position_id) findings.push({ code: "POSITION_ID_REQUIRED", severity: "ERROR", job_title: position.job_title });
    if (positionIds.has(position.position_id)) findings.push({ code: "DUPLICATE_POSITION_ID", severity: "ERROR", position_id: position.position_id });
    positionIds.add(position.position_id);

    if (!position.job_title) findings.push({ code: "JOB_TITLE_REQUIRED", severity: "ERROR", position_id: position.position_id });
    if (jobTitles.has(position.job_title)) findings.push({ code: "DUPLICATE_JOB_TITLE", severity: "ERROR", job_title: position.job_title });
    jobTitles.add(position.job_title);

    if (!position.package_id || !position.role_code) {
      findings.push({ code: "POSITION_PACKAGE_REFERENCE_REQUIRED", severity: "ERROR", position_id: position.position_id });
    }

    if (!Array.isArray(position.skills) || position.skills.length === 0) {
      findings.push({ code: "POSITION_SKILLS_REQUIRED", severity: "ERROR", position_id: position.position_id });
      continue;
    }

    const skillIds = new Set();
    for (const skill of position.skills) {
      if (!skill.skill_id) { findings.push({ code: "SKILL_ID_REQUIRED", severity: "ERROR", position_id: position.position_id }); continue; }
      if (skillIds.has(skill.skill_id)) findings.push({ code: "DUPLICATE_SKILL_IN_POSITION", severity: "ERROR", position_id: position.position_id, skill_id: skill.skill_id });
      skillIds.add(skill.skill_id);

      if (!positionSkillAuthorityClasses.includes(skill.authority_class)) {
        findings.push({ code: "UNKNOWN_AUTHORITY_CLASS", severity: "ERROR", position_id: position.position_id, skill_id: skill.skill_id, authority_class: skill.authority_class });
      }
    }
  }

  return {
    ok: findings.filter((finding) => finding.severity === "ERROR").length === 0,
    findings,
    summary: {
      position_count: positions.length,
      total_skill_count: positions.reduce((sum, position) => sum + (position.skills?.length ?? 0), 0),
      total_class_a_count: positions.reduce((sum, position) => sum + (position.skills ?? []).filter((skill) => skill.authority_class === "A").length, 0)
    }
  };
}
