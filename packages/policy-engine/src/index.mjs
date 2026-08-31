export function evaluatePolicy(input) {
  const reasons = [];

  if (input.actor?.tenant_id !== input.resource?.tenant_id) {
    return { result: "DENY", reasons: ["Actor tenant does not match resource tenant."] };
  }

  if (input.resource?.firm_id && input.actor?.firm_id && input.actor.firm_id !== input.resource.firm_id) {
    return { result: "DENY", reasons: ["Actor firm scope does not match resource firm."] };
  }

  if (input.context?.missing_required_information) {
    return { result: "REQUIRE_MORE_INFORMATION", reasons: ["Required information is missing."] };
  }

  if (input.actor?.actor_type === "AI_AGENT") {
    if (input.action?.includes("approve") || input.action?.includes("issue") || input.action?.includes("send_client_commitment")) {
      return { result: "DENY", reasons: ["AI workers cannot approve or issue controlled client-facing outputs."] };
    }
    if (input.context?.assigned_worker_instance_id && input.context.assigned_worker_instance_id !== input.actor.worker_instance_id) {
      return { result: "DENY", reasons: ["AI worker is not assigned to this task."] };
    }
  }

  if (input.action === "deliverable.issue") {
    if (!input.context?.evidence_bundle_id) reasons.push("Evidence bundle is required before deliverable issue.");
    if (!input.context?.required_approval_id) reasons.push("Approval is required before deliverable issue.");
    if (input.context?.approval_subject_version_or_hash && input.resource?.subject_version_or_hash && input.context.approval_subject_version_or_hash !== input.resource.subject_version_or_hash) {
      reasons.push("Approval subject hash/version does not match current deliverable.");
    }
    if (reasons.length > 0) return { result: "DENY", reasons };
  }

  if (input.action === "deliverable.review") {
    if (input.actor?.actor_type !== "HUMAN") return { result: "DENY", reasons: ["Deliverable review requires a human actor."] };
    if (!input.context?.professional_authority_valid) return { result: "DENY", reasons: ["Valid professional authority is required for deliverable review."] };
    if (!input.context?.evidence_bundle_id) return { result: "DENY", reasons: ["Evidence bundle is required for deliverable review."] };
  }

  if (input.action === "approval.grant") {
    if (input.actor?.actor_type !== "HUMAN") return { result: "DENY", reasons: ["Approval requires a human actor."] };
    if (!input.context?.professional_authority_valid) {
      return { result: "DENY", reasons: ["Valid professional authority is required for this approval."] };
    }
  }

  if (input.action === "proposal.send" && input.context?.commercial_threshold_exceeded) {
    return { result: "REQUIRE_APPROVAL", reasons: ["Proposal exceeds commercial authority threshold."], required_approver_role: "CommercialApprover" };
  }

  return { result: "ALLOW", reasons: ["Policy checks passed."] };
}

