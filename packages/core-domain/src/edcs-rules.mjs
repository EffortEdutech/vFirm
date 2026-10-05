// CE-S3 (ADR-097, 2026-10-05): the pure rule engine for register-driven work.
//
// A rule says: "when a BizKick transaction looks like THIS, ask the firm to do THAT". The engine only
// decides -- from the arguments it is given, with no I/O and no clock -- which transactions match a rule
// and what work request each match would create. apps/api/src/edcs-automation-service.mjs does the I/O
// (reads, dedupe claim, creating the request through the existing governed W2 path).
//
// Conditions are ANDed; every field is optional but at least one must be set:
//   document_type        "QT" or ["QT","SO"]
//   status               ["Issued","Accepted"]        (register status names)
//   days_to_due_lte      3                             open transaction due within N days (overdue counts)
//   overdue              true                          open transaction past its due date
//   open                 true                          not closed (a completed, cancelled or superseded transaction is skipped)
//   event                "NEW_TRANSACTION" | "NEW_REVISION"   only events AFTER the rule was enabled
//   chain_flag           ["MISSING_PREDECESSOR","RELATED_NOT_FOUND","RELATED_UNEXPECTED_TYPE"]
//   has_supporting_file  true                          a supporting file (e.g. a bank statement) is attached
//   has_file             true                          a primary document file is linked
//
// Dedupe: one occurrence per rule + transaction + occurrence key, so the same condition never creates a
// second request. The key says what "the same occurrence" means: NEW for a new transaction, REV:<rev>
// for a new revision, FLAG:<flags> for a chain problem, STATE:<rev> for a state condition (due soon,
// overdue). A transaction that is revised and still matches a state condition is a new occurrence.

import { computeEdcsAlert, daysToDue, EDCS_DOCUMENT_TYPES, EDCS_STATUSES } from "./edcs-register.mjs";
import { chainFlagsFor } from "./edcs-chains.mjs";

export const RULE_EVENTS = ["NEW_TRANSACTION", "NEW_REVISION"];
export const RULE_CHAIN_FLAGS = ["MISSING_PREDECESSOR", "RELATED_NOT_FOUND", "RELATED_UNEXPECTED_TYPE"];
const CONDITION_KEYS = ["document_type", "status", "days_to_due_lte", "overdue", "open", "event", "chain_flag", "has_supporting_file", "has_file"];
const PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"];

const asArray = (value) => (value === undefined || value === null || value === "" ? [] : Array.isArray(value) ? value : [value]);
const clean = (value) => String(value ?? "").trim();

// ---------------- templates (all off by default) ----------------

export const RULE_TEMPLATES = Object.freeze([
  {
    template_id: "quotation_expiring",
    name: "Quotation expiring in 3 days: follow-up draft",
    description: "A quotation due within 3 days gets a client follow-up message drafted for you to review and send.",
    condition: { document_type: "QT", status: ["Issued", "Under Review"], days_to_due_lte: 3 },
    action: { request_type_id: "client_message_draft", title_template: "Follow up on {transaction_id} before it expires ({counterparty})", instructions_template: "Draft a polite follow-up to {counterparty} about quotation {transaction_id} ({subject}), which is due {due_date}. Mention the amount {amount}. The owner sends it.", priority: "NORMAL", due_in_days: 1, attach_files: true }
  },
  {
    template_id: "invoice_overdue",
    name: "Invoice overdue: collections draft",
    description: "An overdue invoice gets a collections follow-up prepared for you to review.",
    condition: { document_type: "INV", overdue: true, open: true },
    action: { request_type_id: "receivables_prepare", title_template: "Collections follow-up for {transaction_id} ({counterparty})", instructions_template: "Invoice {transaction_id} for {counterparty} ({subject}), amount {amount}, was due {due_date} and is overdue. Prepare a collections follow-up draft for the owner to review.", priority: "HIGH", due_in_days: 1, attach_files: true }
  },
  {
    template_id: "bank_reconciliation_statement",
    name: "New bank reconciliation with statement: reconcile",
    description: "A new bank reconciliation that has its bank statement attached goes to the Bookkeeper to reconcile (FAO-11).",
    condition: { document_type: "BR", event: "NEW_TRANSACTION", open: true, has_supporting_file: true },
    action: { request_type_id: "bank_reconciliation", title_template: "Reconcile {transaction_id}: {subject}", instructions_template: "Reconcile the bank statement attached to {transaction_id} ({subject}). Attach the book entries if the draft says they are missing.", priority: "NORMAL", due_in_days: 3, attach_files: true, file_role_hint: "bank_statement" }
  },
  {
    template_id: "complaint_triage",
    name: "New customer complaint: triage",
    description: "A new customer complaint is sorted and routed by the General Clerk.",
    condition: { document_type: "CMP", event: "NEW_TRANSACTION", open: true },
    action: { request_type_id: "admin_request_triage", title_template: "Triage complaint {transaction_id} from {counterparty}", instructions_template: "Customer complaint {transaction_id} from {counterparty}: {subject}. Classify it, set its priority and route it.", priority: "HIGH", due_in_days: 1, attach_files: true }
  },
  {
    template_id: "employee_onboarding",
    name: "New employee record: onboarding (Class A)",
    description: "A new employee record starts onboarding preparation. Class A: it still needs your approval before anything is final. HR content stays metadata only unless you opted in.",
    condition: { document_type: "EMP", event: "NEW_TRANSACTION", open: true },
    action: { request_type_id: "employee_onboarding", title_template: "Onboarding for {transaction_id}", instructions_template: "A new employee record {transaction_id} appeared in BizKick ({subject}). Prepare the onboarding paperwork and a missing-documents checklist.", priority: "NORMAL", due_in_days: 3, attach_files: true }
  },
  {
    template_id: "grn_without_po",
    name: "Goods received without a purchase order: exception",
    description: "A goods received note with no purchase order behind it is flagged to the Bookkeeper as an exception.",
    condition: { document_type: "GRN", chain_flag: ["MISSING_PREDECESSOR"] },
    action: { request_type_id: "payables_prepare", title_template: "Exception: {transaction_id} has no purchase order", instructions_template: "Goods received note {transaction_id} ({counterparty}, {subject}) has no related purchase order. Review it as a procurement exception and prepare what the owner needs to decide.", priority: "NORMAL", due_in_days: 2, attach_files: true }
  }
]);

export function templateById(id) {
  return RULE_TEMPLATES.find((template) => template.template_id === id) ?? null;
}

// ---------------- validation ----------------

// Returns { ok, errors[], rule } where `rule` holds only sanitized definition fields (name,
// description, trigger, condition, action). request_type_id existence is checked by the caller (it
// owns the request-type catalogue); everything else is checked here.
export function validateRuleDefinition(input) {
  const errors = [];
  const name = clean(input?.name).slice(0, 120);
  if (!name) errors.push("A rule needs a name.");
  const rawCondition = input?.condition && typeof input.condition === "object" ? input.condition : {};
  const condition = {};
  const types = asArray(rawCondition.document_type).map((value) => clean(value).toUpperCase()).filter(Boolean);
  for (const type of types) if (!EDCS_DOCUMENT_TYPES[type]) errors.push(`Unknown document type: ${type}`);
  if (types.length) condition.document_type = types.length === 1 ? types[0] : types;
  const statuses = asArray(rawCondition.status).map(clean).filter(Boolean);
  for (const status of statuses) if (!EDCS_STATUSES[status]) errors.push(`Unknown status: ${status}`);
  if (statuses.length) condition.status = statuses;
  if (rawCondition.days_to_due_lte !== undefined && rawCondition.days_to_due_lte !== null && rawCondition.days_to_due_lte !== "") {
    const days = Number(rawCondition.days_to_due_lte);
    if (!Number.isInteger(days) || days < -365 || days > 365) errors.push("days_to_due_lte must be a whole number of days between -365 and 365.");
    else condition.days_to_due_lte = days;
  }
  for (const key of ["overdue", "open", "has_supporting_file", "has_file"]) if (rawCondition[key] === true) condition[key] = true;
  if (rawCondition.event !== undefined && rawCondition.event !== null && rawCondition.event !== "") {
    if (!RULE_EVENTS.includes(rawCondition.event)) errors.push(`event must be one of ${RULE_EVENTS.join(", ")}.`);
    else condition.event = rawCondition.event;
  }
  const flags = asArray(rawCondition.chain_flag).map(clean).filter(Boolean);
  for (const flag of flags) if (!RULE_CHAIN_FLAGS.includes(flag)) errors.push(`Unknown chain flag: ${flag}`);
  if (flags.length) condition.chain_flag = flags;
  if (!Object.keys(condition).some((key) => CONDITION_KEYS.includes(key))) errors.push("A rule needs at least one condition.");

  const rawAction = input?.action && typeof input.action === "object" ? input.action : {};
  const action = {
    request_type_id: clean(rawAction.request_type_id),
    title_template: clean(rawAction.title_template).slice(0, 200),
    instructions_template: clean(rawAction.instructions_template).slice(0, 2000),
    priority: clean(rawAction.priority || "NORMAL").toUpperCase(),
    due_in_days: rawAction.due_in_days === undefined || rawAction.due_in_days === null || rawAction.due_in_days === "" ? null : Number(rawAction.due_in_days),
    assign_to_staff_code: clean(rawAction.assign_to_staff_code) || null,
    attach_files: rawAction.attach_files !== false,
    file_role_hint: clean(rawAction.file_role_hint) || null
  };
  if (!action.request_type_id) errors.push("A rule needs a request type for the work it creates.");
  if (!action.title_template) errors.push("A rule needs a title for the request.");
  if (!PRIORITIES.includes(action.priority)) errors.push(`priority must be one of ${PRIORITIES.join(", ")}.`);
  if (action.due_in_days !== null && (!Number.isInteger(action.due_in_days) || action.due_in_days < 0 || action.due_in_days > 365)) errors.push("due_in_days must be a whole number of days between 0 and 365.");
  return { ok: errors.length === 0, errors, rule: { name, description: clean(input?.description).slice(0, 400) || null, trigger: { type: "EDCS_EVENT" }, condition, action } };
}

// ---------------- matching ----------------

export function renderTemplate(template, record) {
  const values = {
    transaction_id: record.transaction_id,
    counterparty: record.counterparty_name || "the counterparty",
    subject: record.subject || EDCS_DOCUMENT_TYPES[record.document_type]?.name || record.document_type,
    due_date: record.due_date || "no due date",
    amount: record.amount === null || record.amount === undefined || record.amount === "" ? "not stated" : `${record.currency || "MYR"} ${record.amount}`,
    revision: record.revision || "R0",
    status: record.status || ""
  };
  return String(template ?? "").replace(/\{(\w+)\}/g, (match, key) => (key in values ? String(values[key]) : match));
}

function occurrenceKey(rule, record, flags) {
  const condition = rule.condition;
  if (condition.event === "NEW_TRANSACTION") return "NEW";
  if (condition.event === "NEW_REVISION") return `REV:${record.revision ?? "R0"}`;
  if (condition.chain_flag) return `FLAG:${flags.filter((flag) => condition.chain_flag.includes(flag)).sort().join("+")}`;
  return `STATE:${record.revision ?? "R0"}`;
}

// ctx: {
//   as_of: "YYYY-MM-DD", now_iso,
//   transactions: [record],                      the firm's governed transactions
//   byId: Map(transaction_id -> record)          (for chain flags)
//   latestRevision: Map(transaction_id -> {revision, kind, created_at})
//   files: Map(transaction_id -> {primary, attachments[]})   (document register state; may be empty)
// }
// Returns { matches: [{ transaction_id, occurrence_key, reason }], older_than_rule: n } where
// older_than_rule counts transactions that satisfy the conditions but pre-date the rule being enabled
// (event conditions only act on events after enabling).
export function matchRule(rule, ctx) {
  const condition = rule.condition ?? {};
  const types = asArray(condition.document_type);
  const statuses = asArray(condition.status);
  const enabledAt = rule.enabled_at ?? ctx.now_iso ?? null;
  const matches = [];
  let olderThanRule = 0;
  for (const record of ctx.transactions) {
    if (types.length && !types.includes(record.document_type)) continue;
    if (statuses.length && !statuses.includes(record.status)) continue;
    const alert = computeEdcsAlert(record, ctx.as_of);
    const closed = alert === "Closed";
    if (condition.overdue === true && alert !== "OVERDUE") continue;
    if (condition.open === true && closed) continue;
    if (condition.days_to_due_lte !== undefined) {
      const days = daysToDue(record, ctx.as_of);
      if (closed || days === null || days > condition.days_to_due_lte) continue;
    }
    const flags = chainFlagsFor(record, ctx.byId).map((entry) => entry.flag);
    if (condition.chain_flag && !flags.some((flag) => condition.chain_flag.includes(flag))) continue;
    const docs = ctx.files?.get(record.transaction_id) ?? { primary: null, attachments: [] };
    if (condition.has_file === true && !docs.primary) continue;
    if (condition.has_supporting_file === true && !(docs.attachments?.length > 0)) continue;
    let reason = "state";
    if (condition.event === "NEW_TRANSACTION") {
      reason = "new transaction";
      if (!record.first_seen_at || !enabledAt || record.first_seen_at < enabledAt) { olderThanRule += 1; continue; }
    } else if (condition.event === "NEW_REVISION") {
      reason = "new revision";
      const latest = ctx.latestRevision?.get(record.transaction_id);
      if (!latest || latest.kind !== "REVISED" || !enabledAt || latest.created_at < enabledAt) { if (latest?.kind === "REVISED") olderThanRule += 1; continue; }
    } else if (condition.chain_flag) reason = "missing chain link";
    else if (condition.overdue) reason = "overdue";
    else if (condition.days_to_due_lte !== undefined) reason = `due within ${condition.days_to_due_lte} days`;
    matches.push({ transaction_id: record.transaction_id, occurrence_key: occurrenceKey(rule, record, flags), reason });
  }
  return { matches, older_than_rule: olderThanRule };
}

// The natural key of an occurrence in automation_rule_runs.
export const occurrenceNaturalKey = (ruleId, transactionId, key) => `${ruleId}|${transactionId}|${key}`;

// What a match would create, before the service attaches real file ids. `files` is the entry from
// ctx.files for this transaction. Returns plain request fields (no ids, no scope).
export function buildRequestFields(rule, record, files, asOf) {
  const action = rule.action;
  const dueAt = action.due_in_days === null || action.due_in_days === undefined ? null : new Date(Date.parse(`${asOf}T00:00:00Z`) + action.due_in_days * 86400000).toISOString();
  const attachments = action.attach_files === false ? [] : [files?.primary, ...(files?.attachments ?? [])].filter((file) => file?.downloadable);
  const fileIds = [...new Set(attachments.map((file) => file.file_id))];
  const fileRoles = {};
  if (action.file_role_hint) {
    const pick = (files?.attachments ?? []).find((file) => file.downloadable && /statement|bank|stmt/i.test(file.filename ?? "")) ?? (files?.attachments ?? []).find((file) => file.downloadable);
    if (pick) fileRoles[pick.file_id] = action.file_role_hint;
  }
  return {
    request_type_id: action.request_type_id,
    title: renderTemplate(action.title_template, record).slice(0, 200),
    instructions: renderTemplate(action.instructions_template, record),
    priority: action.priority,
    due_at: dueAt,
    file_ids: fileIds,
    file_roles: fileRoles,
    references: [record.transaction_id],
    assign_to_staff_code: action.assign_to_staff_code
  };
}
