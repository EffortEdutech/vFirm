// CE-S3 (ADR-097, 2026-10-05): register-driven work -- the rules service.
//
// Rules turn BizKick register events into work requests for the firm's hired staff, under rules the
// owner turns on. Nothing here is a new authority: a rule only creates a W2 work request through the
// same governed path an owner uses by hand (createWorkRequestRecord, then -- if the rule names a
// worker -- the unchanged assignment path: authority gate, position scope, Class A approval). A
// refused assignment leaves the request in the Inbox, exactly as it does for the owner.
//
// Safety properties:
//   - Every rule is created DISABLED. Enabling needs a dry run of the current definition first.
//   - One occurrence per rule + transaction + occurrence key. The occurrence row is claimed atomically
//     BEFORE the request is created, so repeated imports, ticks, or two racing evaluations create one.
//   - Event conditions (new transaction / new revision) only act on events after the rule was enabled.
//   - Everything is scoped to one firm; the tick visits each firm that has an enabled rule on its own.
//   - Rule writes are owner-only. Evaluations run as the rule's owner (a standing instruction the owner
//     gave when enabling it) and every request and audit event names the rule.
//
// The route layer (server.mjs) authenticates and passes `actor`; it also passes `deps` so this module
// never imports the server (createWorkRequest, assignWorkRequest).

import { appendEventAndAudit, newUuid, now, readStore, withStore } from "./store.mjs";
import { edcsRepository as repo } from "./edcs-repository.mjs";
import { computeEdcsAlert, daysToDue } from "../../../packages/core-domain/src/edcs-register.mjs";
import { chainFlagsFor } from "../../../packages/core-domain/src/edcs-chains.mjs";
import { buildRequestFields, matchRule, occurrenceNaturalKey, RULE_TEMPLATES, templateById, validateRuleDefinition } from "../../../packages/core-domain/src/edcs-rules.mjs";
import { resolveWorkRequestType } from "../../../packages/core-domain/src/awia-work-request-types.mjs";


import { isFirmOwner } from "./edcs-owner.mjs";

function httpError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function requireOwner(actor, action) {
  if (!isFirmOwner(actor)) {
    throw httpError(403, "EDCS_OWNER_REQUIRED", `${action} requires the firm owner.`);
  }
}

const scopeOf = (source) => ({ tenant_id: source.tenant_id, firm_id: source.firm_id });
const cloneRecord = (record) => JSON.parse(JSON.stringify(record));

// Evaluation date. VFIRM_AUTOMATION_AS_OF pins it (YYYY-MM-DD) for tests and rehearsals only.
function automationToday() {
  const pinned = process.env.VFIRM_AUTOMATION_AS_OF;
  if (pinned && /^\d{4}-\d{2}-\d{2}$/.test(pinned)) return pinned;
  return new Date().toISOString().slice(0, 10);
}

async function audit(scope, actor, events) {
  if (!events.length) return;
  await withStore((store) => {
    for (const event of events) appendEventAndAudit(store, { actor, tenant_id: scope.tenant_id, firm_id: scope.firm_id, ...event });
  }, { tenantId: scope.tenant_id, ledger: false }); // CE-H1: append-only, so no whole-database or ledger load
}

function checkRequestType(requestTypeId) {
  const { found } = resolveWorkRequestType(requestTypeId);
  if (!found) throw httpError(400, "VALIDATION_ERROR", `Unknown request type: ${requestTypeId}`);
}

// ---------------- rules: read ----------------

export async function listRules({ scope }) {
  const rules = await repo.listRules(scope);
  const runs = await repo.listRuleRuns(scope, { kind: "OCCURRENCE" });
  const counts = new Map();
  for (const run of runs) {
    const entry = counts.get(run.rule_id) ?? { created: 0, errors: 0, last_at: null };
    if (run.status === "CREATED") entry.created += 1;
    if (run.status === "ERROR") entry.errors += 1;
    if (!entry.last_at || String(run.at) > entry.last_at) entry.last_at = run.at;
    counts.set(run.rule_id, entry);
  }
  const used = new Set(rules.map((rule) => rule.template_id).filter(Boolean));
  return {
    rules: rules.map((rule) => ({ ...rule, activity: counts.get(rule.id) ?? { created: 0, errors: 0, last_at: null } })),
    templates: RULE_TEMPLATES.map((template) => ({ ...template, installed: used.has(template.template_id), request_type: resolveWorkRequestType(template.action.request_type_id).type?.label ?? template.action.request_type_id }))
  };
}

export async function listRuleActivity({ scope, ruleId }) {
  const rule = ruleId ? await repo.getRule(scope, ruleId) : null;
  if (ruleId && !rule) throw httpError(404, "NOT_FOUND", `automation_rules record not found: ${ruleId}`);
  const occurrences = await repo.listRuleRuns(scope, { kind: "OCCURRENCE", rule_id: ruleId });
  const evaluations = ruleId ? [] : (await repo.listRuleRuns(scope, { kind: "EVALUATION" })).slice(0, 25);
  return { rule, occurrences, evaluations };
}

// ---------------- rules: owner writes ----------------

export async function createRule({ body, actor }) {
  requireOwner(actor, "Creating a BizKick rule");
  const scope = scopeOf(body);
  let input = body;
  let templateId = null;
  if (body.template_id) {
    const template = templateById(body.template_id);
    if (!template) throw httpError(404, "NOT_FOUND", `Unknown rule template: ${body.template_id}`);
    templateId = template.template_id;
    // The owner may adjust a template's condition/action fields; anything not sent keeps the template value.
    input = { name: body.name ?? template.name, description: body.description ?? template.description, condition: { ...template.condition, ...(body.condition ?? {}) }, action: { ...template.action, ...(body.action ?? {}) } };
  }
  const checked = validateRuleDefinition(input);
  if (!checked.ok) throw httpError(400, "VALIDATION_ERROR", checked.errors.join(" "));
  checkRequestType(checked.rule.action.request_type_id);
  const timestamp = now();
  const rule = {
    id: newUuid(), tenant_id: scope.tenant_id, firm_id: scope.firm_id, ...checked.rule, template_id: templateId,
    enabled: false, enabled_at: null, last_dry_run_at: null, owner_actor_id: actor.actor_id ?? null, created_at: timestamp, updated_at: timestamp
  };
  await repo.commit(scope, { automation_rules: [rule] });
  await audit(scope, actor, [{ event_type: "automation.rule_created", aggregate_type: "AutomationRule", aggregate_id: rule.id, payload: { name: rule.name, template_id: templateId, condition: rule.condition, request_type_id: rule.action.request_type_id }, summary: `BizKick rule created (off): ${rule.name}.` }]);
  return { rule };
}

export async function updateRule({ body, actor }) {
  requireOwner(actor, "Editing a BizKick rule");
  const scope = scopeOf(body);
  const current = await repo.getRule(scope, body.rule_id);
  if (!current) throw httpError(404, "NOT_FOUND", `automation_rules record not found: ${body.rule_id}`);
  if (current.enabled) throw httpError(409, "AUTOMATION_RULE_ENABLED", "Turn the rule off before editing it.");
  const checked = validateRuleDefinition({ name: body.name ?? current.name, description: body.description ?? current.description, condition: body.condition ?? current.condition, action: { ...current.action, ...(body.action ?? {}) } });
  if (!checked.ok) throw httpError(400, "VALIDATION_ERROR", checked.errors.join(" "));
  checkRequestType(checked.rule.action.request_type_id);
  const timestamp = now();
  const rule = { ...cloneRecord(current), ...checked.rule, last_dry_run_at: null, updated_at: timestamp };
  await repo.commit(scope, { automation_rules: [rule] });
  await audit(scope, actor, [{ event_type: "automation.rule_updated", aggregate_type: "AutomationRule", aggregate_id: rule.id, payload: { name: rule.name, condition: rule.condition, action: rule.action }, summary: `BizKick rule edited: ${rule.name}. It needs a new dry run before it can be turned on.` }]);
  return { rule };
}

export async function setRuleEnabled({ body, actor }) {
  requireOwner(actor, "Turning a BizKick rule on or off");
  const scope = scopeOf(body);
  const current = await repo.getRule(scope, body.rule_id);
  if (!current) throw httpError(404, "NOT_FOUND", `automation_rules record not found: ${body.rule_id}`);
  const enable = body.enabled === true;
  if (enable && current.enabled) return { rule: current };
  if (enable && !current.last_dry_run_at) throw httpError(409, "AUTOMATION_DRY_RUN_REQUIRED", "Preview what this rule would do (dry run) before turning it on.");
  if (enable) {
    const connection = await repo.getConnection(scope);
    if (!connection) throw httpError(409, "EDCS_NOT_CONNECTED", "Set up the BizKick connection before turning a rule on.");
  }
  const timestamp = now();
  const rule = { ...cloneRecord(current), enabled: enable, enabled_at: enable ? timestamp : current.enabled_at, owner_actor_id: enable ? actor.actor_id ?? current.owner_actor_id : current.owner_actor_id, updated_at: timestamp };
  await repo.commit(scope, { automation_rules: [rule] });
  await audit(scope, actor, [{ event_type: enable ? "automation.rule_enabled" : "automation.rule_disabled", aggregate_type: "AutomationRule", aggregate_id: rule.id, payload: { name: rule.name }, summary: `BizKick rule turned ${enable ? "on" : "off"}: ${rule.name}.` }]);
  return { rule };
}

// ---------------- context and matching ----------------

async function buildContext(scope, asOf) {
  const transactions = await repo.listTransactions(scope);
  const revisions = await repo.listRevisions(scope);
  const latestRevision = new Map();
  for (const revision of revisions) {
    const previous = latestRevision.get(revision.transaction_id);
    if (!previous || revision.seq > previous.seq) latestRevision.set(revision.transaction_id, { seq: revision.seq, revision: revision.revision, kind: revision.kind, created_at: revision.created_at });
  }
  // Document register state of each transaction: its primary file and attached supporting files.
  const store = await readStore(scope.tenant_id, { ledger: false });
  const inScope = (record) => record.tenant_id === scope.tenant_id && record.firm_id === scope.firm_id;
  const files = new Map();
  const fileById = new Map((store.file_objects ?? []).filter(inScope).map((file) => [file.id, file]));
  const describe = (revision) => {
    const file = fileById.get(revision.metadata?.file_id);
    return file ? { file_id: file.id, filename: file.filename, downloadable: file.status === "STORED" } : null;
  };
  for (const entry of (store.document_register_entries ?? []).filter((record) => inScope(record) && record.metadata?.source === "bizkick_edcs")) {
    const entryRevisions = (store.document_revision_records ?? []).filter((record) => inScope(record) && record.document_register_entry_id === entry.id);
    const primary = entryRevisions.find((record) => record.id === entry.current_revision_id);
    files.set(entry.document_number, {
      primary: primary ? describe(primary) : null,
      attachments: entryRevisions.filter((record) => record.metadata?.role === "SUPPORTING").map(describe).filter(Boolean)
    });
  }
  return { as_of: asOf, now_iso: now(), transactions, byId: new Map(transactions.map((record) => [record.transaction_id, record])), latestRevision, files };
}

function describeMatch(rule, record, match, ctx) {
  const fields = buildRequestFields(rule, record, ctx.files.get(record.transaction_id), ctx.as_of);
  return { transaction_id: record.transaction_id, occurrence_key: match.occurrence_key, reason: match.reason, title: fields.title, request_type_id: fields.request_type_id, priority: fields.priority, file_count: fields.file_ids.length, assign_to_staff_code: fields.assign_to_staff_code };
}

// Dry run: what this rule would create right now. Creates nothing. Marks the rule as previewed (the
// owner must have previewed the current definition before turning it on).
export async function dryRunRule({ body, actor }) {
  requireOwner(actor, "Previewing a BizKick rule");
  const scope = scopeOf(body);
  const rule = await repo.getRule(scope, body.rule_id);
  if (!rule) throw httpError(404, "NOT_FOUND", `automation_rules record not found: ${body.rule_id}`);
  const ctx = await buildContext(scope, automationToday());
  const { matches, older_than_rule } = matchRule(rule, ctx);
  const existing = new Map((await repo.listRuleRuns(scope, { kind: "OCCURRENCE", rule_id: rule.id })).map((run) => [run.key, run]));
  const would = [];
  const already = [];
  for (const match of matches) {
    const detail = describeMatch(rule, ctx.byId.get(match.transaction_id), match, ctx);
    const prior = existing.get(occurrenceNaturalKey(rule.id, match.transaction_id, match.occurrence_key));
    if (prior && (prior.status !== "ERROR" || (prior.attempts ?? 1) >= 3)) already.push({ ...detail, work_request_number: prior.work_request_number ?? null });
    else would.push(detail);
  }
  const updated = { ...cloneRecord(rule), last_dry_run_at: now() };
  await repo.commit(scope, { automation_rules: [updated] });
  return { rule: updated, as_of: ctx.as_of, enabled: rule.enabled, would_create: would, already_created: already, older_than_rule, summary: `${rule.enabled ? "This rule is on." : "This rule is off."} It would create ${would.length} request${would.length === 1 ? "" : "s"} now${already.length ? ` (${already.length} already created)` : ""}.` };
}

// ---------------- evaluation ----------------

function actorForRule(scope, rule, actor) {
  if (actor) return actor;
  return { actor_id: rule.owner_actor_id, actor_type: "HUMAN", role: "principal", tenant_id: scope.tenant_id, firm_id: scope.firm_id, display_name: `BizKick rule: ${rule.name}`, via: "automation_rule" };
}

async function createFromMatch({ scope, rule, record, match, ctx, trigger, actor, deps }) {
  const fields = buildRequestFields(rule, record, ctx.files.get(record.transaction_id), ctx.as_of);
  const key = occurrenceNaturalKey(rule.id, record.transaction_id, match.occurrence_key);
  const claim = await repo.claimOccurrence(scope, {
    id: newUuid(), kind: "OCCURRENCE", key, tenant_id: scope.tenant_id, firm_id: scope.firm_id, rule_id: rule.id, rule_name: rule.name,
    transaction_id: record.transaction_id, occurrence_key: match.occurrence_key, reason: match.reason, status: "CLAIMED", attempts: 1,
    work_request_id: null, work_request_number: null, assignment: null, trigger, at: now()
  });
  if (!claim) return { skipped: true };
  const runner = actorForRule(scope, rule, actor);
  try {
    const request = await deps.createWorkRequest({
      tenant_id: scope.tenant_id, firm_id: scope.firm_id, request_type_id: fields.request_type_id, title: fields.title, instructions: fields.instructions,
      priority: fields.priority, due_at: fields.due_at, file_ids: fields.file_ids, file_roles: fields.file_roles, references: fields.references,
      source: { type: "BIZKICK_RULE", transaction_id: record.transaction_id, rule_id: rule.id, rule_name: rule.name, reason: match.reason }
    }, runner);
    let assignment = { outcome: "NONE" };
    if (fields.assign_to_staff_code) {
      try {
        await deps.assignWorkRequest({ tenant_id: scope.tenant_id, firm_id: scope.firm_id, work_request_id: request.id, staff_code: fields.assign_to_staff_code }, runner);
        assignment = { outcome: "ASSIGNED", staff_code: fields.assign_to_staff_code };
      } catch (error) {
        assignment = { outcome: "REFUSED", staff_code: fields.assign_to_staff_code, message: error instanceof Error ? error.message : String(error) };
      }
    }
    const done = { ...claim, status: "CREATED", work_request_id: request.id, work_request_number: request.request_number, assignment, finished_at: now() };
    await repo.commit(scope, { automation_rule_runs: [done] });
    await audit(scope, runner, [{ event_type: "automation.request_created", aggregate_type: "AutomationRule", aggregate_id: rule.id, payload: { rule_id: rule.id, rule_name: rule.name, transaction_id: record.transaction_id, occurrence_key: match.occurrence_key, work_request_id: request.id, request_number: request.request_number, assignment, trigger }, summary: `Rule "${rule.name}" created ${request.request_number} for ${record.transaction_id}${assignment.outcome === "REFUSED" ? " (assignment refused; left in the Inbox)" : ""}.` }]);
    return { created: { rule_id: rule.id, rule_name: rule.name, transaction_id: record.transaction_id, work_request_id: request.id, request_number: request.request_number, assignment } };
  } catch (error) {
    const failed = { ...claim, status: "ERROR", error: error instanceof Error ? error.message : String(error), finished_at: now() };
    await repo.commit(scope, { automation_rule_runs: [failed] });
    return { error: { rule_id: rule.id, transaction_id: record.transaction_id, message: failed.error } };
  }
}

// Evaluate the enabled rules of ONE firm. `actor` is the caller (import / file upload / manual run);
// when absent (the tick) each rule runs as its owner. Returns what happened; never throws for a single
// bad rule or transaction.
export async function evaluateRules({ scope, trigger, actor = null, deps, ruleId = null }) {
  const allRules = await repo.listRules(scope);
  const rules = allRules.filter((rule) => rule.enabled && (!ruleId || rule.id === ruleId));
  const result = { trigger, as_of: automationToday(), rules_evaluated: rules.length, matched: 0, created: [], skipped_existing: 0, errors: [] };
  if (!rules.length) return result;
  const ctx = await buildContext(scope, result.as_of);
  for (const rule of rules) {
    let matches;
    try { matches = matchRule(rule, ctx).matches; } catch (error) { result.errors.push({ rule_id: rule.id, message: error instanceof Error ? error.message : String(error) }); continue; }
    result.matched += matches.length;
    for (const match of matches) {
      const outcome = await createFromMatch({ scope, rule, record: ctx.byId.get(match.transaction_id), match, ctx, trigger, actor, deps });
      if (outcome.created) result.created.push(outcome.created);
      else if (outcome.error) result.errors.push(outcome.error);
      else result.skipped_existing += 1;
    }
  }
  if (result.created.length || result.errors.length || ["TICK", "MANUAL"].includes(trigger)) {
    await repo.commit(scope, { automation_rule_runs: [{ id: newUuid(), kind: "EVALUATION", tenant_id: scope.tenant_id, firm_id: scope.firm_id, trigger, status: result.errors.length ? "PARTIAL" : "OK", rules_evaluated: result.rules_evaluated, matched: result.matched, created_count: result.created.length, skipped_existing: result.skipped_existing, error_count: result.errors.length, as_of: result.as_of, at: now() }] });
  }
  return result;
}

// Owner "Run now" button: evaluate this firm's enabled rules immediately.
export async function evaluateNow({ body, actor, deps }) {
  requireOwner(actor, "Running BizKick rules");
  return evaluateRules({ scope: scopeOf(body), trigger: "MANUAL", actor, deps });
}

// Called by the import / file-upload routes. A rules failure must never fail the import or the upload.
export async function evaluateAfter({ scope, trigger, actor, deps }) {
  try {
    const result = await evaluateRules({ scope, trigger, actor, deps });
    return result.rules_evaluated ? { automation: { trigger, created: result.created.length, skipped_existing: result.skipped_existing, errors: result.errors.length, requests: result.created.map((entry) => entry.request_number) } } : {};
  } catch (error) {
    return { automation_error: error instanceof Error ? error.message : String(error) };
  }
}

// The scheduled tick (service token, see server.mjs): every firm with an enabled rule, each on its own.
// `scope` limits it to one firm (used by tests and by an owner-scoped scheduler).
export async function tick({ deps, scope = null }) {
  const scopes = scope ? [scope] : await repo.listEnabledRuleScopes();
  const firms = [];
  for (const target of scopes) {
    try {
      const result = await evaluateRules({ scope: target, trigger: "TICK", actor: null, deps });
      firms.push({ tenant_id: target.tenant_id, firm_id: target.firm_id, rules_evaluated: result.rules_evaluated, matched: result.matched, created: result.created.length, skipped_existing: result.skipped_existing, errors: result.errors.length });
    } catch (error) {
      firms.push({ tenant_id: target.tenant_id, firm_id: target.firm_id, error: error instanceof Error ? error.message : String(error) });
    }
  }
  return { ticked_at: now(), firms_visited: firms.length, created: firms.reduce((sum, firm) => sum + (firm.created ?? 0), 0), firms };
}

// ---------------- the "Needs you" tray ----------------

export async function readSignals({ scope }) {
  const asOf = automationToday();
  const transactions = await repo.listTransactions(scope);
  const byId = new Map(transactions.map((record) => [record.transaction_id, record]));
  const pick = (list) => ({ count: list.length, ids: list.map((record) => record.transaction_id) });
  const expiring = transactions.filter((record) => {
    if (record.document_type !== "QT" || !["Issued", "Under Review"].includes(record.status)) return false;
    const days = daysToDue(record, asOf);
    return days !== null && days >= 0 && days <= 3;
  });
  return {
    as_of: asOf,
    connected: transactions.length > 0 || Boolean(await repo.getConnection(scope)),
    signals: {
      expiring_quotations: pick(expiring),
      overdue_invoices: pick(transactions.filter((record) => record.document_type === "INV" && computeEdcsAlert(record, asOf) === "OVERDUE")),
      conflicts: pick(transactions.filter((record) => record.held_conflict)),
      missing_links: pick(transactions.filter((record) => chainFlagsFor(record, byId).length > 0)),
      duplicates: pick(transactions.filter((record) => record.flags?.duplicate))
    }
  };
}
