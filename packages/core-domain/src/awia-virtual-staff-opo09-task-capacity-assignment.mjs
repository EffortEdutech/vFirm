// HM-S4 item 5 pilot skill: Ops Coordinator (OPO) / OPO-09 Task & Capacity
// Assignment. Deterministic assignment of an incoming task, given its type
// and urgency, to the correct owner queue based on declared skill coverage
// and remaining capacity -- no PII, no SOD, Class B per the position
// catalogue (awia-virtual-staff-position-catalogue.mjs). This is the closest
// OPO analogue to ARO-01's classify-and-route shape (per HM-S4 item 1's
// decision), and mirrors the ARO-01/FAO-11/SAO-03 modules' boundary
// discipline. Pure assignment logic only: it produces a structured
// recommendation for a human (or a downstream workdesk item) to act on --
// it never dispatches work, notifies a queue owner, or commits capacity.
// Wired into the output-draft pipeline (apps/api/src/store.mjs) via the
// generic output_payload field, and into task assignment via skill_id
// "OPO-09" -- the position-scope check added in HM-S4 item 2
// (assignAwiaVirtualStaffTaskRecord) is what authorizes this skill at
// runtime. Per OPO's own maturity_note ("treat as the position needing the
// closest early oversight of the four"), this module never auto-assigns
// past what a human reviewer can quickly sanity-check: every result still
// goes through the existing DRAFT_REVIEW_REQUIRED output-review gate before
// any client-facing draft is produced -- no different from the other three
// pilots, but worth restating given OPO's own flagged immaturity.

export const opo09AssignmentBoundary = "deterministic_assignment_only_no_autonomous_dispatch_or_capacity_commitment";

export const opo09CapacityStatuses = ["ASSIGNED", "ALL_QUEUES_AT_CAPACITY", "NO_QUEUE_FOR_TASK_TYPE"];

export function assignTaskToCapacity({ task_type = "", urgent = false, queues = [] } = {}) {
  const matchingQueues = queues.filter((queue) => Array.isArray(queue.skill_tags) && queue.skill_tags.includes(task_type));
  const eligibleQueues = matchingQueues.filter((queue) => typeof queue.capacity_remaining === "number" && queue.capacity_remaining > 0);
  const priority = urgent ? "HIGH" : "NORMAL";

  if (matchingQueues.length === 0) {
    return {
      assigned_queue_id: "UNASSIGNED_QUEUE",
      capacity_status: "NO_QUEUE_FOR_TASK_TYPE",
      priority,
      task_type,
      rationale: `No queue declares skill coverage for task type "${task_type}"; routed to the unassigned queue for human triage.`,
      boundary: opo09AssignmentBoundary
    };
  }

  if (eligibleQueues.length === 0) {
    return {
      assigned_queue_id: "UNASSIGNED_QUEUE",
      capacity_status: "ALL_QUEUES_AT_CAPACITY",
      priority,
      task_type,
      rationale: `${matchingQueues.length} queue(s) cover task type "${task_type}" but all are at zero remaining capacity; routed to the unassigned queue for human rebalancing.`,
      boundary: opo09AssignmentBoundary
    };
  }

  const chosen = [...eligibleQueues].sort((a, b) => b.capacity_remaining - a.capacity_remaining || a.queue_id.localeCompare(b.queue_id))[0];

  return {
    assigned_queue_id: chosen.queue_id,
    capacity_status: "ASSIGNED",
    priority,
    task_type,
    rationale: `Assigned to "${chosen.queue_id}" (${chosen.capacity_remaining} remaining capacity), the ${eligibleQueues.length > 1 ? "least-loaded of " + eligibleQueues.length + " eligible queues" : "only eligible queue"} covering task type "${task_type}".`,
    boundary: opo09AssignmentBoundary
  };
}

export function validateOpo09AssignmentOutput(output) {
  const findings = [];
  if (!output || typeof output !== "object") return { ok: false, findings: [{ code: "OUTPUT_REQUIRED", severity: "ERROR" }] };
  if (!output.assigned_queue_id) findings.push({ code: "ASSIGNED_QUEUE_REQUIRED", severity: "ERROR" });
  if (!opo09CapacityStatuses.includes(output.capacity_status)) findings.push({ code: "UNKNOWN_CAPACITY_STATUS", severity: "ERROR", capacity_status: output.capacity_status });
  if (!["HIGH", "NORMAL"].includes(output.priority)) findings.push({ code: "UNKNOWN_PRIORITY", severity: "ERROR", priority: output.priority });
  if (!output.rationale) findings.push({ code: "RATIONALE_REQUIRED", severity: "ERROR" });
  if (findings.length === 0 && output.capacity_status !== "ASSIGNED" && output.assigned_queue_id !== "UNASSIGNED_QUEUE") {
    findings.push({ code: "UNASSIGNED_STATUS_MUST_ROUTE_TO_UNASSIGNED_QUEUE", severity: "ERROR" });
  }
  return { ok: findings.length === 0, findings };
}

export function verifyOpo09AssignmentFixtures() {
  const fixtures = [
    {
      name: "assigned_to_least_loaded_queue",
      input: { task_type: "design_review", urgent: true, queues: [{ queue_id: "design-queue-a", skill_tags: ["design_review"], capacity_remaining: 2 }, { queue_id: "design-queue-b", skill_tags: ["design_review"], capacity_remaining: 5 }] },
      expectedStatus: "ASSIGNED",
      expectedQueue: "design-queue-b"
    },
    {
      name: "all_queues_at_capacity",
      input: { task_type: "site_inspection", urgent: false, queues: [{ queue_id: "field-queue-a", skill_tags: ["site_inspection"], capacity_remaining: 0 }] },
      expectedStatus: "ALL_QUEUES_AT_CAPACITY",
      expectedQueue: "UNASSIGNED_QUEUE"
    },
    {
      name: "no_queue_for_task_type",
      input: { task_type: "customs_clearance", urgent: false, queues: [{ queue_id: "field-queue-a", skill_tags: ["site_inspection"], capacity_remaining: 4 }] },
      expectedStatus: "NO_QUEUE_FOR_TASK_TYPE",
      expectedQueue: "UNASSIGNED_QUEUE"
    }
  ];
  const failures = [];
  for (const fixture of fixtures) {
    const result = assignTaskToCapacity(fixture.input);
    const validation = validateOpo09AssignmentOutput(result);
    if (!validation.ok) {
      failures.push({ fixture: fixture.name, reason: "invalid_output", findings: validation.findings });
    } else if (result.capacity_status !== fixture.expectedStatus || result.assigned_queue_id !== fixture.expectedQueue) {
      failures.push({ fixture: fixture.name, reason: "result_mismatch", expected: { status: fixture.expectedStatus, queue: fixture.expectedQueue }, got: { status: result.capacity_status, queue: result.assigned_queue_id } });
    }
  }
  return { ok: failures.length === 0, fixtures_checked: fixtures.length, failures };
}
