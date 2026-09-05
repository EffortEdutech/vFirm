// AWIA Virtual Staff Department Dashboard
//
// Boundary: read-only supervision/reporting aggregation grouped by staff
// department (role code). This module computes counts only. It does not
// rank, allocate capacity, approve anything, or grant authority; it exists
// so a human supervisor can see AWIA virtual staff workload and exception
// status per department inside the AFCC.

import { awiaVirtualStaffPackageRegistry } from "./awia-virtual-staff-registry.mjs";

export const departmentDashboardBoundary =
  "read_only_supervision_aggregation_no_ranking_no_capacity_allocation_no_authority";

function departmentFromStaffCode(staffCode) {
  if (typeof staffCode !== "string" || !staffCode.includes("-")) return "UNASSIGNED";
  return staffCode.split("-")[0];
}

function registryEntryForDepartment(department) {
  return awiaVirtualStaffPackageRegistry.entries.find((entry) => entry.role_code === department) ?? null;
}

function emptyDepartmentBucket(department) {
  const registryEntry = registryEntryForDepartment(department);
  return {
    department,
    role_name: registryEntry?.role_name ?? department,
    registry_status: registryEntry?.registry_status ?? "UNKNOWN",
    staff_total: 0,
    staff_active: 0,
    staff_by_lifecycle_status: {},
    workdesk_items_open: 0,
    workdesk_items_client_delivery_drafted: 0,
    output_drafts_pending_review: 0,
    output_drafts_reviewed: 0,
    client_delivery_drafts_prepared: 0,
    task_readiness_allow_count: 0,
    task_readiness_deny_count: 0,
    last_activity_at: null
  };
}

function laterTimestamp(a, b) {
  if (!a) return b ?? null;
  if (!b) return a;
  return new Date(a).getTime() >= new Date(b).getTime() ? a : b;
}

export function buildAwiaStaffDepartmentDashboard({
  members = [],
  workdeskItems = [],
  outputDrafts = [],
  outputReviews = [],
  taskReadinessRecords = []
} = {}) {
  const buckets = new Map();

  function bucketFor(department) {
    if (!buckets.has(department)) buckets.set(department, emptyDepartmentBucket(department));
    return buckets.get(department);
  }

  for (const member of members) {
    const department = departmentFromStaffCode(member.agent_code);
    const bucket = bucketFor(department);
    bucket.staff_total += 1;
    if (member.lifecycle_status === "ACTIVE") bucket.staff_active += 1;
    bucket.staff_by_lifecycle_status[member.lifecycle_status] = (bucket.staff_by_lifecycle_status[member.lifecycle_status] ?? 0) + 1;
    bucket.last_activity_at = laterTimestamp(bucket.last_activity_at, member.updated_at ?? member.created_at ?? null);
  }

  for (const item of workdeskItems) {
    const department = departmentFromStaffCode(item.staff_code);
    const bucket = bucketFor(department);
    if (item.workdesk_status && item.workdesk_status !== "CLIENT_DELIVERY_DRAFT_PREPARED") bucket.workdesk_items_open += 1;
    if (item.workdesk_status === "CLIENT_DELIVERY_DRAFT_PREPARED") bucket.workdesk_items_client_delivery_drafted += 1;
    bucket.last_activity_at = laterTimestamp(bucket.last_activity_at, item.updated_at ?? item.created_at ?? null);
  }

  for (const draft of outputDrafts) {
    const department = departmentFromStaffCode(draft.staff_code);
    const bucket = bucketFor(department);
    if (draft.requires_human_review) bucket.output_drafts_pending_review += 1;
    bucket.last_activity_at = laterTimestamp(bucket.last_activity_at, draft.created_at ?? null);
  }

  for (const review of outputReviews) {
    const draft = outputDrafts.find((record) => record.id === review.output_draft_id);
    const department = departmentFromStaffCode(draft?.staff_code);
    const bucket = bucketFor(department);
    bucket.output_drafts_reviewed += 1;
    if (review.review_decision === "APPROVED_FOR_CLIENT_DRAFT") bucket.client_delivery_drafts_prepared += 1;
    if (draft?.requires_human_review) bucket.output_drafts_pending_review = Math.max(0, bucket.output_drafts_pending_review - 1);
    bucket.last_activity_at = laterTimestamp(bucket.last_activity_at, review.created_at ?? null);
  }

  for (const record of taskReadinessRecords) {
    const department = departmentFromStaffCode(record.staff_code);
    const bucket = bucketFor(department);
    if (record.decision === "ALLOW") bucket.task_readiness_allow_count += 1;
    if (record.decision === "DENY") bucket.task_readiness_deny_count += 1;
    bucket.last_activity_at = laterTimestamp(bucket.last_activity_at, record.created_at ?? null);
  }

  const departments = [...buckets.values()].sort((a, b) => a.department.localeCompare(b.department));

  return {
    boundary: departmentDashboardBoundary,
    generated_at: new Date().toISOString(),
    department_count: departments.length,
    total_staff: departments.reduce((sum, bucket) => sum + bucket.staff_total, 0),
    total_active_staff: departments.reduce((sum, bucket) => sum + bucket.staff_active, 0),
    total_output_drafts_pending_review: departments.reduce((sum, bucket) => sum + bucket.output_drafts_pending_review, 0),
    total_task_readiness_deny_count: departments.reduce((sum, bucket) => sum + bucket.task_readiness_deny_count, 0),
    departments
  };
}
