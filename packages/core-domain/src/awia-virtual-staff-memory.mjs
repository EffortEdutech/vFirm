// AWIA Virtual Staff Memory and Conversation Workspace
//
// Boundary: deterministic, bounded, tenant-scoped memory and conversation
// records for a named AWIA virtual staff member. This module does not
// execute an LLM, does not store private chain-of-thought, and does not
// grant authority. Every memory entry and conversation message is an
// auditable evidence-style summary, not a hidden reasoning trace, per
// AGENTS.md principle 9 (do not expose private chain-of-thought; expose
// auditable evidence summaries).

export const memoryWorkspaceBoundary =
  "bounded_evidence_memory_no_chain_of_thought_no_autonomous_authority";

export const staffMemoryEntryKinds = [
  "TASK_CONTEXT_SUMMARY",
  "DECISION_REFERENCE",
  "CLIENT_PREFERENCE_NOTE",
  "HANDOFF_NOTE"
];

export const conversationParticipantRoles = [
  "HUMAN_SUPERVISOR",
  "VIRTUAL_STAFF",
  "HUMAN_CLIENT_PROXY"
];

export const conversationMessageClassifications = [
  "INTERNAL_OPERATIONAL_CONTEXT",
  "DRAFT_FOR_HUMAN_REVIEW"
];

const MAX_CONTENT_LENGTH = 4000;

const forbiddenFields = [
  "raw_chain_of_thought",
  "internal_reasoning_trace",
  "hidden_reasoning",
  "model_scratchpad",
  "authority_grant",
  "salary_authority_claim",
  "prompt_authority_claim",
  "package_binding_authority_claim"
];

function collectForbiddenFields(payload) {
  if (!payload || typeof payload !== "object") return [];
  return forbiddenFields.filter((field) => Object.prototype.hasOwnProperty.call(payload, field));
}

export function evaluateMemoryRetentionBoundary({ kind, content, evidence_refs = [] } = {}) {
  const findings = [];
  if (!staffMemoryEntryKinds.includes(kind)) findings.push(`memory_entry_kind_not_recognized:${kind}`);
  if (typeof content !== "string" || content.trim().length === 0) findings.push("memory_entry_content_missing");
  if (typeof content === "string" && content.length > MAX_CONTENT_LENGTH) findings.push("memory_entry_content_exceeds_bounded_length");
  if (!Array.isArray(evidence_refs) || evidence_refs.length === 0) findings.push("memory_entry_missing_evidence_reference");
  return { decision: findings.length === 0 ? "ACCEPTED" : "REJECTED", boundary: memoryWorkspaceBoundary, findings };
}

export function buildStaffMemoryEntry(input = {}) {
  const { memory_entry_id, tenant_id, firm_id, staff_code, workdesk_item_id = null, task_id = null, kind, content, evidence_refs = [], authored_by_actor_id, created_at } = input;
  const smuggled = collectForbiddenFields(input);
  if (smuggled.length > 0) {
    return { accepted: false, decision: "REJECTED", boundary: memoryWorkspaceBoundary, findings: smuggled.map((field) => `forbidden_field_present:${field}`) };
  }
  const evaluation = evaluateMemoryRetentionBoundary({ kind, content, evidence_refs });
  if (evaluation.decision !== "ACCEPTED") return { accepted: false, ...evaluation };
  return {
    accepted: true,
    decision: "ACCEPTED",
    boundary: memoryWorkspaceBoundary,
    findings: [],
    entry: { id: memory_entry_id, memory_entry_id, tenant_id, firm_id, staff_code, workdesk_item_id, task_id, kind, content, evidence_refs, authored_by_actor_id, created_at }
  };
}

export function evaluateConversationMessageBoundary({ participant_role, classification, content } = {}) {
  const findings = [];
  if (!conversationParticipantRoles.includes(participant_role)) findings.push(`conversation_participant_role_not_recognized:${participant_role}`);
  if (!conversationMessageClassifications.includes(classification)) findings.push(`conversation_message_classification_not_recognized:${classification}`);
  if (typeof content !== "string" || content.trim().length === 0) findings.push("conversation_message_content_missing");
  if (typeof content === "string" && content.length > MAX_CONTENT_LENGTH) findings.push("conversation_message_content_exceeds_bounded_length");
  return { decision: findings.length === 0 ? "ACCEPTED" : "REJECTED", boundary: memoryWorkspaceBoundary, findings };
}

export function buildConversationThread({ thread_id, tenant_id, firm_id, staff_code, workdesk_item_id = null, task_id = null, opened_by_actor_id, created_at } = {}) {
  return { id: thread_id, thread_id, tenant_id, firm_id, staff_code, workdesk_item_id, task_id, opened_by_actor_id, status: "OPEN", created_at };
}

export function buildConversationMessage(input = {}) {
  const { message_id, thread_id, tenant_id, firm_id, staff_code, participant_role, classification = "INTERNAL_OPERATIONAL_CONTEXT", content, authored_by_actor_id, created_at } = input;
  const smuggled = collectForbiddenFields(input);
  if (smuggled.length > 0) {
    return { accepted: false, decision: "REJECTED", boundary: memoryWorkspaceBoundary, findings: smuggled.map((field) => `forbidden_field_present:${field}`) };
  }
  const evaluation = evaluateConversationMessageBoundary({ participant_role, classification, content });
  if (evaluation.decision !== "ACCEPTED") return { accepted: false, ...evaluation };
  return {
    accepted: true,
    decision: "ACCEPTED",
    boundary: memoryWorkspaceBoundary,
    findings: [],
    message: { id: message_id, message_id, thread_id, tenant_id, firm_id, staff_code, participant_role, classification, content, authored_by_actor_id, created_at }
  };
}
