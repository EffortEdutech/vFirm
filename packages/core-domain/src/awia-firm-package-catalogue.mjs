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
//
// ADR-075: the product owner narrowed direction to a single commercial
// package -- HireMe -- for now. SoloStand, EntGrow, and CorpoExt (built under
// ADR-074) are removed rather than kept dormant, so the catalogue reflects
// exactly one real offer: the business owner names the specific AWIA virtual
// worker(s) they want to hire, with human approval still required on every
// output. No fixed seat cap or role restriction is enforced at this stage.

export const awiaFirmPackageGateBoundary = "seat_and_role_gating_only_no_payment_no_runtime_authority";

const ALL_ROLES = ["CFO", "FAO", "SAO", "OPO", "ARO"];

export const awiaFirmPackages = {
  HIRE_ME: {
    package_code: "HIRE_ME",
    package_name: "HireMe",
    max_seats: null,
    allowed_roles: ALL_ROLES,
    custom_worker_selection_required: true,
    description: "The business owner names the specific AWIA virtual worker(s) to hire. No fixed seat cap or role restriction in this pass; every output still requires human approval."
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
