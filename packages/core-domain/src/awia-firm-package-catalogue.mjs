// AWIA Firm Subscription Package Catalogue and Seat Gating
//
// Boundary: this module is deterministic seat/role gating metadata only. It
// never moves money, never grants runtime authority, and never bypasses the
// existing role tool-policy authority gate in awia-virtual-staff-authority-gate.mjs.
// It answers exactly one question: given a firm's assigned commercial package,
// is a proposed AWIA staff roster (a set of {role_code}) within that package's
// seat count and role limits? Package assignment and gating are pre-billing --
// see ADR-073 in DECISION_REGISTER.md -- and do not authorize any live payment
// capture, matching the AGENTS.md "no live payment movement" boundary.

export const awiaFirmPackageGateBoundary = "seat_and_role_gating_only_no_payment_no_runtime_authority";

const ALL_ROLES = ["CFO", "FAO", "SAO", "OPO", "ARO"];

export const awiaFirmPackages = {
  SOLO_STAND: {
    package_code: "SOLO_STAND",
    package_name: "SoloStand",
    max_seats: 1,
    allowed_roles: ALL_ROLES,
    custom_worker_selection_required: false,
    description: "Single AWIA virtual staff seat, any one role."
  },
  ENT_GROW: {
    package_code: "ENT_GROW",
    package_name: "EntGrow",
    max_seats: 3,
    allowed_roles: ["FAO", "SAO", "OPO", "ARO"],
    custom_worker_selection_required: false,
    description: "Up to three AWIA virtual staff seats for a growth-stage firm; no CFO seat at this tier."
  },
  CORPO_EXT: {
    package_code: "CORPO_EXT",
    package_name: "CorpoExt",
    max_seats: 6,
    allowed_roles: ALL_ROLES,
    custom_worker_selection_required: false,
    description: "Up to six AWIA virtual staff seats across all roles, including CFO."
  },
  HIRE_ME: {
    package_code: "HIRE_ME",
    package_name: "HireMe",
    max_seats: null,
    allowed_roles: ALL_ROLES,
    custom_worker_selection_required: true,
    description: "Custom package: the client names the specific virtual worker(s) to hire; no fixed seat cap in this pass."
  }
};

export function listAwiaFirmPackages() {
  return Object.values(awiaFirmPackages).map((item) => ({ ...item }));
}

export function resolveAwiaFirmPackage(packageCode) {
  const found = awiaFirmPackages[packageCode];
  if (!found) {
    return { found: false, findings: [`awia_firm_package_not_recognized:${packageCode}`] };
  }
  return { found: true, findings: [], package: found };
}

// staffSet: array of { role_code } (or objects carrying role_code, as used by
// awia-virtual-staff-templates.mjs staff_set entries).
export function evaluateAwiaFirmPackageSeatGate({ package: pkg, staffSet = [] } = {}) {
  const findings = [];
  if (!pkg) {
    findings.push("AWIA_FIRM_PACKAGE_REQUIRED");
    return { decision: "DENY", boundary: awiaFirmPackageGateBoundary, findings };
  }
  if (Array.isArray(pkg.allowed_roles)) {
    for (const staff of staffSet) {
      const role = staff?.role_code;
      if (role && !pkg.allowed_roles.includes(role)) {
        findings.push(`AWIA_FIRM_PACKAGE_ROLE_NOT_ALLOWED:${role}`);
      }
    }
  }
  if (typeof pkg.max_seats === "number" && staffSet.length > pkg.max_seats) {
    findings.push(`AWIA_FIRM_PACKAGE_SEAT_LIMIT_EXCEEDED:${staffSet.length}>${pkg.max_seats}`);
  }
  return {
    decision: findings.length === 0 ? "ALLOW" : "DENY",
    boundary: awiaFirmPackageGateBoundary,
    findings
  };
}
