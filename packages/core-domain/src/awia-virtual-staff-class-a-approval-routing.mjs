// AWIA Virtual Staff Class-A Approval Routing (HM-S1 checklist item 5)
//
// Boundary: this module is a deterministic routing/approval GATE only. It
// decides who must approve a Class A skill's prepared output and whether a
// proposed approval is structurally valid -- it does not execute any skill,
// does not itself produce or move any output, and does not grant runtime
// authority. Per the HM-S1 owner decision (Section 8, item 1: option (a)),
// no skill-execution engine exists yet in apps/ or packages/, so there is no
// live HTTP path to wire this into in this sprint -- this gate is the
// enforceable, testable form of Section 7's decision, ready to be called
// from HM-S2's execution/output-review path the moment real Class A skill
// outputs exist. Until then, calling code (e.g. a future extension of
// apps/api/src/server.mjs's produceOutputDraft/reviewOutputDraft handlers)
// is expected to invoke evaluateClassAApprovalGate() before treating any
// Class A output as approved.
//
// Section 7's decision, restated: all five Class A escalation points per
// position route to the firm owner by default. No dedicated reviewer role
// exists yet; COO becomes OPO's reviewer specifically only once COO is
// hired and approval volume justifies it (a routing-table change at that
// point, via defaultClassAApprover below -- not a rearchitecture).

import {
  awiaVirtualStaffPositionCatalogue,
  resolveAwiaVirtualStaffPosition
} from "./awia-virtual-staff-position-catalogue.mjs";

export const classAApprovalRoutingBoundary =
  "class_a_approval_routing_gate_only_no_execution_no_runtime_authority";

// firm_owner is the only approver role recognized in HM-S1. A future
// per-position override (e.g. { ops_coordinator: "coo" } once COO is hired)
// is exactly the routing-table change Section 7 anticipates -- add it here,
// not by rearchitecting this module.
export const defaultClassAApprover = awiaVirtualStaffPositionCatalogue.default_class_a_approver;
export const classAApproverOverridesByPosition = {};

function resolveApproverRoleForPosition(positionId) {
  return classAApproverOverridesByPosition[positionId] ?? defaultClassAApprover;
}

function findSkill(position, skillId) {
  return position?.skills?.find((skill) => skill.skill_id === skillId) ?? null;
}

// Pure lookup: who must approve this skill's output for this position, and
// whether the skill even carries an approval requirement at all.
export function resolveClassAApprovalRequirement({ position_id, skill_id } = {}) {
  const { found, position } = resolveAwiaVirtualStaffPosition(position_id);
  if (!found) {
    return { found: false, requires_approval: false, findings: [`CLASS_A_POSITION_NOT_RECOGNIZED:${position_id}`] };
  }
  const skill = findSkill(position, skill_id);
  if (!skill) {
    return { found: false, requires_approval: false, findings: [`CLASS_A_SKILL_NOT_IN_POSITION:${skill_id}@${position_id}`] };
  }
  if (skill.authority_class !== "A") {
    return { found: true, requires_approval: false, findings: [], skill, position_id: position.position_id };
  }
  return {
    found: true,
    requires_approval: true,
    findings: [],
    skill,
    position_id: position.position_id,
    job_title: position.job_title,
    approver_role: resolveApproverRoleForPosition(position.position_id),
    sod_scoped: skill.sod_scoped === true,
    pii_scoped: skill.pii_scoped === true
  };
}

// The actual gate. This is the one function calling code must go through
// before treating a Class A output as approved. It is deliberately
// structural, not advisory: it returns DENY (never ALLOW) whenever the
// preparer and the approver are the same actor, regardless of what role
// either claims to hold -- "no self-approval path exists even as a bug"
// from the sprint checklist is enforced here, not just documented.
export function evaluateClassAApprovalGate({
  position_id,
  skill_id,
  prepared_by_actor_id,
  approver_actor_id = null,
  approver_role_claim = null,
  firm_owner_actor_id = null
} = {}) {
  const findings = [];
  const requirement = resolveClassAApprovalRequirement({ position_id, skill_id });

  if (!requirement.found) {
    return { decision: "DENY", boundary: classAApprovalRoutingBoundary, findings: requirement.findings, requirement };
  }
  if (!requirement.requires_approval) {
    // Class B/C: this gate has nothing to enforce; the skill was already
    // full-autonomy per the position catalogue.
    return { decision: "ALLOW", boundary: classAApprovalRoutingBoundary, findings: [], requirement };
  }

  if (!prepared_by_actor_id) findings.push("CLASS_A_PREPARER_REQUIRED");
  if (!approver_actor_id) findings.push("CLASS_A_APPROVER_REQUIRED");

  if (prepared_by_actor_id && approver_actor_id && prepared_by_actor_id === approver_actor_id) {
    findings.push("CLASS_A_SELF_APPROVAL_DENIED");
  }

  if (requirement.approver_role === "firm_owner") {
    if (!firm_owner_actor_id) {
      findings.push("CLASS_A_FIRM_OWNER_ACTOR_UNKNOWN");
    } else if (approver_actor_id && approver_actor_id !== firm_owner_actor_id) {
      findings.push("CLASS_A_APPROVER_NOT_FIRM_OWNER");
    }
    if (approver_role_claim && approver_role_claim !== "firm_owner") {
      findings.push("CLASS_A_APPROVER_ROLE_CLAIM_MISMATCH");
    }
  }

  if (requirement.sod_scoped && prepared_by_actor_id && approver_actor_id && prepared_by_actor_id === approver_actor_id) {
    findings.push("CLASS_A_SOD_VIOLATION");
  }

  return {
    decision: findings.length === 0 ? "ALLOW" : "DENY",
    boundary: classAApprovalRoutingBoundary,
    findings,
    requirement
  };
}

// Exhaustive self-check: for every Class A skill in every position, confirm
// the gate structurally cannot return ALLOW when the preparer and approver
// are the same actor -- operationalizes "no self-approval path exists even
// as a bug" as a runnable assertion rather than a comment.
export function verifyNoClassASelfApprovalPathExists(catalogue = awiaVirtualStaffPositionCatalogue) {
  const failures = [];
  let checked = 0;

  for (const position of catalogue.positions) {
    for (const skill of position.skills) {
      if (skill.authority_class !== "A") continue;
      checked += 1;
      const sameActorResult = evaluateClassAApprovalGate({
        position_id: position.position_id,
        skill_id: skill.skill_id,
        prepared_by_actor_id: "actor-under-test",
        approver_actor_id: "actor-under-test",
        firm_owner_actor_id: "actor-under-test"
      });
      if (sameActorResult.decision === "ALLOW") {
        failures.push({ position_id: position.position_id, skill_id: skill.skill_id, code: "SELF_APPROVAL_WAS_ALLOWED" });
      }

      const validApprovalResult = evaluateClassAApprovalGate({
        position_id: position.position_id,
        skill_id: skill.skill_id,
        prepared_by_actor_id: "actor-preparer",
        approver_actor_id: "actor-firm-owner",
        firm_owner_actor_id: "actor-firm-owner"
      });
      if (validApprovalResult.decision !== "ALLOW") {
        failures.push({ position_id: position.position_id, skill_id: skill.skill_id, code: "VALID_DISTINCT_APPROVAL_WAS_DENIED", findings: validApprovalResult.findings });
      }
    }
  }

  return {
    ok: failures.length === 0,
    class_a_skills_checked: checked,
    failures
  };
}
