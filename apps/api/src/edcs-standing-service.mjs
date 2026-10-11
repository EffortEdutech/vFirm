// VI-S1 (ADR-109, 2026-10-11): Standing Instructions -- recurring work that raises itself once per period.
//
// "Every month on the 5th, ask for the bank reconciliation." Each due period becomes ONE work request through
// the same governed path an owner uses by hand (createWorkRequestRecord, then -- if the instruction names a
// worker -- the unchanged assignment path: authority gate, position scope, Class A approval). Nothing here is
// a new authority; a refused assignment leaves the request in the Inbox.
//
// Safety properties (same pattern as the CE-S3 rules this builds on):
//   - Created PAUSED. Turning one on needs a preview of the current definition first.
//   - One occurrence per instruction + period. The occurrence row (automation_rule_runs, kind SI_OCCURRENCE) is
//     claimed atomically BEFORE the request is created, so repeated ticks or racing callers create one.
//   - A missing input never blocks the request: it is raised with a "needs info" note so the worker's run asks
//     for the file (W4) instead of the period silently passing.
//   - Resuming does not back-fill the time it was paused; a missed tick is caught up for CATCH_UP_DAYS only.
//   - Writes are owner-only; a scheduled run acts as the instruction's owner and every request names it.
//   - Everything is scoped to one firm.

import { appendEventAndAudit, newUuid, now, readStore, withStore } from "./store.mjs";
import { edcsRepository as repo } from "./edcs-repository.mjs";
import { buildContext } from "./edcs-automation-service.mjs";
import { isFirmOwner } from "./edcs-owner.mjs";
import { resolveWorkRequestType } from "../../../packages/core-domain/src/awia-work-request-types.mjs";
import {
  CATCH_UP_DAYS, DEFAULT_SETTINGS, STANDING_TEMPLATES, dueRuns, manualOccurrenceKey, manualRun, normalizeSettings, occurrenceKey,
  pickLatestDocument, pickTransactions, renderText, requestVars, standingTemplateById, todayInKL, upcomingRuns, validateInstruction
} from "../../../packages/core-domain/src/edcs-standing.mjs";

function httpError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function requireOwner(actor, action) {
  if (!isFirmOwner(actor)) throw httpError(403, "EDCS_OWNER_REQUIRED", `${action} requires the firm owner.`);
}

const scopeOf = (source) => ({ tenant_id: source.tenant_id, firm_id: source.firm_id });
const cloneRecord = (record) => JSON.parse(JSON.stringify(record));

// Today in Malaysia time. VFIRM_AUTOMATION_AS_OF pins it (YYYY-MM-DD) for tests and rehearsals only.
function standingToday() {
  const pinned = process.env.VFIRM_AUTOMATION_AS_OF;
  if (pinned && /^\d{4}-\d{2}-\d{2}$/.test(pinned)) return pinned;
  return todayInKL();
}

async function audit(scope, actor, events) {
  if (!events.length) return;
  await withStore((store) => {
    for (const event of events) appendEventAndAudit(store, { actor, tenant_id: scope.tenant_id, firm_id: scope.firm_id, ...event });
  }, { tenantId: scope.tenant_id, ledger: false });
}

function checkRequestType(requestTypeId) {
  const { found } = resolveWorkRequestType(requestTypeId);
  if (!found) throw httpError(400, "VALIDATION_ERROR", `Unknown request type: ${requestTypeId}`);
}

async function settingsFor(scope) {
  const row = await repo.getStandingSettings(scope);
  return row ? { holidays: row.holidays ?? [], weekend_days: row.weekend_days ?? [6, 0] } : { ...DEFAULT_SETTINGS };
}

// ---------------- read ----------------

export async function listStanding({ scope }) {
  const items = await repo.listStanding(scope);
  const runs = await repo.listStandingRuns(scope);
  const settings = await settingsFor(scope);
  const today = standingToday();
  const byInstruction = new Map();
  for (const run of runs) {
    const entry = byInstruction.get(run.instruction_id) ?? { created: 0, skipped: 0, errors: 0, needs_input: 0, last: null };
    if (run.status === "CREATED") entry.created += 1;
    if (run.status === "SKIPPED") entry.skipped += 1;
    if (run.status === "ERROR") entry.errors += 1;
    if (run.status === "CREATED" && run.needs_input) entry.needs_input += 1;
    if (!entry.last || String(run.at) > String(entry.last.at)) entry.last = { at: run.at, period_key: run.period_key, status: run.status, work_request_number: run.work_request_number ?? null };
    byInstruction.set(run.instruction_id, entry);
  }
  const used = new Set(items.map((item) => item.template_id).filter(Boolean));
  return {
    as_of: today,
    settings,
    instructions: items.map((item) => ({ ...item, activity: byInstruction.get(item.id) ?? { created: 0, skipped: 0, errors: 0, needs_input: 0, last: null }, next: item.status === "ARCHIVED" ? [] : upcomingRuns(item, settings, today, 3) })),
    templates: STANDING_TEMPLATES.map((template) => ({ ...template, installed: used.has(template.template_id), request_type: resolveWorkRequestType(template.action.request_type_id).type?.label ?? template.action.request_type_id }))
  };
}

export async function listStandingHistory({ scope, instructionId }) {
  const instruction = instructionId ? await repo.getStanding(scope, instructionId) : null;
  if (instructionId && !instruction) throw httpError(404, "NOT_FOUND", `standing_instructions record not found: ${instructionId}`);
  return { instruction, occurrences: (await repo.listStandingRuns(scope, { instruction_id: instructionId })).slice(0, 100) };
}

// ---------------- owner writes ----------------

export async function saveStandingSettings({ body, actor }) {
  requireOwner(actor, "Setting the firm calendar");
  const scope = scopeOf(body);
  const checked = normalizeSettings(body);
  if (!checked.ok) throw httpError(400, "VALIDATION_ERROR", checked.errors.join(" "));
  const existing = await repo.getStandingSettings(scope);
  const timestamp = now();
  const row = { id: existing?.id ?? newUuid(), kind: "SETTINGS", tenant_id: scope.tenant_id, firm_id: scope.firm_id, ...checked.settings, created_at: existing?.created_at ?? timestamp, updated_at: timestamp };
  await repo.commit(scope, { standing_instructions: [row] });
  await audit(scope, actor, [{ event_type: "standing.settings_updated", aggregate_type: "StandingInstructionSettings", aggregate_id: row.id, payload: { holidays: row.holidays.length, weekend_days: row.weekend_days }, summary: `Firm calendar updated: ${row.holidays.length} holiday${row.holidays.length === 1 ? "" : "s"}.` }]);
  return { settings: checked.settings };
}

export async function createStanding({ body, actor }) {
  requireOwner(actor, "Creating a standing instruction");
  const scope = scopeOf(body);
  let input = body;
  let templateId = null;
  if (body.template_id) {
    const template = standingTemplateById(body.template_id);
    if (!template) throw httpError(404, "NOT_FOUND", `Unknown standing-instruction template: ${body.template_id}`);
    templateId = template.template_id;
    input = {
      name: body.name ?? template.name, description: body.description ?? template.description,
      schedule: { ...template.schedule, ...(body.schedule ?? {}) }, input: { ...template.input, ...(body.input ?? {}) }, action: { ...template.action, ...(body.action ?? {}) }
    };
  }
  const checked = validateInstruction(input);
  if (!checked.ok) throw httpError(400, "VALIDATION_ERROR", checked.errors.join(" "));
  checkRequestType(checked.instruction.action.request_type_id);
  const timestamp = now();
  const record = {
    id: newUuid(), kind: "INSTRUCTION", tenant_id: scope.tenant_id, firm_id: scope.firm_id, ...checked.instruction, template_id: templateId,
    status: "PAUSED", active_from: null, last_preview_at: null, skip_periods: [], owner_actor_id: actor.actor_id ?? null, created_at: timestamp, updated_at: timestamp
  };
  await repo.commit(scope, { standing_instructions: [record] });
  await audit(scope, actor, [{ event_type: "standing.instruction_created", aggregate_type: "StandingInstruction", aggregate_id: record.id, payload: { name: record.name, template_id: templateId, schedule: record.schedule, request_type_id: record.action.request_type_id }, summary: `Standing instruction created (paused): ${record.name}.` }]);
  return { instruction: record };
}

export async function updateStanding({ body, actor }) {
  requireOwner(actor, "Editing a standing instruction");
  const scope = scopeOf(body);
  const current = await repo.getStanding(scope, body.instruction_id);
  if (!current) throw httpError(404, "NOT_FOUND", `standing_instructions record not found: ${body.instruction_id}`);
  if (current.status === "ACTIVE") throw httpError(409, "STANDING_ACTIVE", "Pause the standing instruction before editing it.");
  if (current.status === "ARCHIVED") throw httpError(409, "STANDING_ARCHIVED", "An archived standing instruction cannot be edited.");
  const checked = validateInstruction({
    name: body.name ?? current.name, description: body.description ?? current.description, start_date: body.start_date ?? current.start_date,
    schedule: { ...current.schedule, ...(body.schedule ?? {}) }, input: { ...current.input, ...(body.input ?? {}) }, action: { ...current.action, ...(body.action ?? {}) }
  });
  if (!checked.ok) throw httpError(400, "VALIDATION_ERROR", checked.errors.join(" "));
  checkRequestType(checked.instruction.action.request_type_id);
  const record = { ...cloneRecord(current), ...checked.instruction, last_preview_at: null, skip_periods: [], updated_at: now() };
  await repo.commit(scope, { standing_instructions: [record] });
  await audit(scope, actor, [{ event_type: "standing.instruction_updated", aggregate_type: "StandingInstruction", aggregate_id: record.id, payload: { name: record.name, schedule: record.schedule, action: record.action }, summary: `Standing instruction edited: ${record.name}. It needs a new preview before it can be turned on.` }]);
  return { instruction: record };
}

// Preview: the next runs and what each would attach right now. Creates nothing; marks the definition as previewed.
export async function previewStanding({ body, actor }) {
  requireOwner(actor, "Previewing a standing instruction");
  const scope = scopeOf(body);
  const current = await repo.getStanding(scope, body.instruction_id);
  if (!current) throw httpError(404, "NOT_FOUND", `standing_instructions record not found: ${body.instruction_id}`);
  const settings = await settingsFor(scope);
  const today = standingToday();
  const resolvers = await inputSources(scope, current, today);
  const runs = upcomingRuns(current, settings, today, 5).map((run) => {
    const input = resolveInput(current, run, resolvers);
    return { period_key: run.period_key, run_date: run.run_date, covers: run.covered.label, title: renderText(current.action.title_template, requestVars(current, run)), inputs_found: input.file_ids.length, transactions_found: input.references.length, needs_input: input.needs_input, input_note: input.note };
  });
  const updated = { ...cloneRecord(current), last_preview_at: now() };
  await repo.commit(scope, { standing_instructions: [updated] });
  return { instruction: updated, as_of: today, next_runs: runs, summary: `${current.name} would next run on ${runs[0]?.run_date ?? "(no date found)"}.` };
}

async function transition({ body, actor, to, event, label, guard }) {
  requireOwner(actor, label);
  const scope = scopeOf(body);
  const current = await repo.getStanding(scope, body.instruction_id);
  if (!current) throw httpError(404, "NOT_FOUND", `standing_instructions record not found: ${body.instruction_id}`);
  if (current.status === "ARCHIVED") throw httpError(409, "STANDING_ARCHIVED", "This standing instruction is archived.");
  if (current.status === to) return { instruction: current };
  guard?.(current);
  const timestamp = now();
  // active_from: resuming never back-fills the time it was off; the first run is on or after today.
  const record = { ...cloneRecord(current), status: to, active_from: to === "ACTIVE" ? standingToday() : current.active_from, updated_at: timestamp };
  await repo.commit(scope, { standing_instructions: [record] });
  await audit(scope, actor, [{ event_type: event, aggregate_type: "StandingInstruction", aggregate_id: record.id, payload: { name: record.name }, summary: `Standing instruction ${to === "ACTIVE" ? "resumed" : to === "PAUSED" ? "paused" : "archived"}: ${record.name}.` }]);
  return { instruction: record };
}

export async function resumeStanding({ body, actor }) {
  return transition({
    body, actor, to: "ACTIVE", event: "standing.instruction_resumed", label: "Turning on a standing instruction",
    guard: (current) => { if (!current.last_preview_at) throw httpError(409, "STANDING_PREVIEW_REQUIRED", "Preview what this standing instruction would do before turning it on."); }
  });
}

export const pauseStanding = ({ body, actor }) => transition({ body, actor, to: "PAUSED", event: "standing.instruction_paused", label: "Pausing a standing instruction" });
export const archiveStanding = ({ body, actor }) => transition({ body, actor, to: "ARCHIVED", event: "standing.instruction_archived", label: "Archiving a standing instruction" });

// Skip the next run: it is recorded in the history as SKIPPED (never silently lost) when its day comes.
export async function skipNextStanding({ body, actor }) {
  requireOwner(actor, "Skipping a standing instruction run");
  const scope = scopeOf(body);
  const current = await repo.getStanding(scope, body.instruction_id);
  if (!current) throw httpError(404, "NOT_FOUND", `standing_instructions record not found: ${body.instruction_id}`);
  if (current.status === "ARCHIVED") throw httpError(409, "STANDING_ARCHIVED", "This standing instruction is archived.");
  const settings = await settingsFor(scope);
  const taken = new Set((await repo.listStandingRuns(scope, { instruction_id: current.id })).map((run) => run.period_key));
  const skips = new Set(current.skip_periods ?? []);
  const next = upcomingRuns(current, settings, standingToday(), 12).find((run) => !skips.has(run.period_key) && !taken.has(run.period_key));
  if (!next) throw httpError(409, "STANDING_NOTHING_TO_SKIP", "There is no upcoming run to skip.");
  const record = { ...cloneRecord(current), skip_periods: [...skips, next.period_key], updated_at: now() };
  await repo.commit(scope, { standing_instructions: [record] });
  await audit(scope, actor, [{ event_type: "standing.run_skipped", aggregate_type: "StandingInstruction", aggregate_id: record.id, payload: { name: record.name, period_key: next.period_key, run_date: next.run_date }, summary: `Standing instruction: the ${next.run_date} run of ${record.name} will be skipped.` }]);
  return { instruction: record, skipped: { period_key: next.period_key, run_date: next.run_date } };
}

// ---------------- inputs ----------------

async function inputSources(scope, instruction, today) {
  if (instruction.input.mode === "NONE") return { mode: "NONE" };
  const ctx = await buildContext(scope, today);
  if (instruction.input.mode === "TRANSACTIONS") return { mode: "TRANSACTIONS", transactions: ctx.transactions, files: ctx.files };
  const store = await readStore(scope.tenant_id, { ledger: false });
  const mine = (record) => record.tenant_id === scope.tenant_id && record.firm_id === scope.firm_id;
  const fileById = new Map((store.file_objects ?? []).filter(mine).map((file) => [file.id, file]));
  const revisions = (store.document_revision_records ?? []).filter(mine);
  const entries = (store.document_register_entries ?? []).filter(mine).map((entry) => {
    const revision = revisions.find((item) => item.id === entry.current_revision_id);
    const file = fileById.get(revision?.metadata?.file_id);
    return { document_type: entry.document_type, title: entry.title, updated_at: revision?.created_at ?? entry.updated_at, file: file ? { file_id: file.id, filename: file.filename, downloadable: file.status === "STORED" } : null };
  });
  return { mode: "LATEST_DOCUMENT", entries };
}

// What a run can attach right now: { file_ids, references, needs_input, note }.
function resolveInput(instruction, run, sources) {
  const spec = instruction.input;
  if (spec.mode === "NONE") return { file_ids: [], references: [], needs_input: false, note: "No input needed." };
  if (spec.mode === "LATEST_DOCUMENT") {
    const hit = pickLatestDocument(sources.entries ?? [], spec);
    if (!hit) return { file_ids: [], references: [], needs_input: true, note: `No ${spec.document_type || "matching"} document${spec.title_contains ? ` with "${spec.title_contains}" in its title` : ""} was found in Documents.` };
    return { file_ids: [hit.file.file_id], references: [], needs_input: false, note: `Attached the latest matching document: ${hit.file.filename}.` };
  }
  const found = pickTransactions(sources.transactions ?? [], spec, run.covered, sources.files ?? new Map());
  if (!found.transaction_ids.length) return { file_ids: [], references: [], needs_input: true, note: `No ${spec.transaction_type} transactions were found in the BizKick register for ${run.covered.label}.` };
  const ids = [...new Set(found.files.map((file) => file.file_id))];
  return { file_ids: ids, references: found.transaction_ids, needs_input: false, note: `Found ${found.transaction_ids.length} ${spec.transaction_type} transaction${found.transaction_ids.length === 1 ? "" : "s"} for ${run.covered.label}; ${ids.length} file${ids.length === 1 ? "" : "s"} attached${found.truncated ? ` (first ${spec.max_files} only)` : ""}.` };
}

// ---------------- raising work ----------------

function actorFor(scope, instruction, actor) {
  if (actor) return actor;
  return { actor_id: instruction.owner_actor_id, actor_type: "HUMAN", role: "principal", tenant_id: scope.tenant_id, firm_id: scope.firm_id, display_name: `Standing instruction: ${instruction.name}`, via: "standing_instruction" };
}

async function raiseOccurrence({ scope, instruction, run, key, trigger, actor, deps, sources, periodKey, status = "CREATED" }) {
  const base = {
    id: newUuid(), kind: "SI_OCCURRENCE", key, tenant_id: scope.tenant_id, firm_id: scope.firm_id, instruction_id: instruction.id, instruction_name: instruction.name,
    period_key: periodKey, run_date: run.run_date ?? run.nominal, covers: run.covered.label, trigger, status: "CLAIMED", attempts: 1,
    work_request_id: null, work_request_number: null, assignment: null, needs_input: false, input_note: null, at: now()
  };
  const claim = await repo.claimOccurrence(scope, base);
  if (!claim) return { skipped: true };
  const runner = actorFor(scope, instruction, actor);
  if (status === "SKIPPED") {
    const done = { ...claim, status: "SKIPPED", finished_at: now() };
    await repo.commit(scope, { automation_rule_runs: [done] });
    return { skipped_by_owner: { instruction_id: instruction.id, period_key: periodKey } };
  }
  try {
    const vars = requestVars(instruction, run);
    const input = resolveInput(instruction, run, sources);
    const instructions = [
      renderText(instruction.action.instructions_template, vars),
      "",
      `Standing instruction: ${instruction.name} (period ${periodKey}, covers ${run.covered.label}).`,
      input.needs_input ? `NEEDS INFO: ${input.note} Ask the owner for the missing input before starting.` : `Input: ${input.note}`
    ].join("\n").trim();
    const baseDay = run.run_date ?? run.nominal;
    const dueAt = instruction.action.due_in_days === null || instruction.action.due_in_days === undefined ? null : new Date(Date.parse(`${baseDay}T00:00:00Z`) + instruction.action.due_in_days * 86400000).toISOString();
    const request = await deps.createWorkRequest({
      tenant_id: scope.tenant_id, firm_id: scope.firm_id, request_type_id: instruction.action.request_type_id, title: renderText(instruction.action.title_template, vars).slice(0, 200),
      instructions, priority: instruction.action.priority, due_at: dueAt, file_ids: input.file_ids, file_roles: {}, references: input.references,
      source: { type: "STANDING_INSTRUCTION", instruction_id: instruction.id, instruction_name: instruction.name, period_key: periodKey, trigger }
    }, runner);
    let assignment = { outcome: "NONE" };
    if (instruction.action.assign_to_staff_code) {
      try {
        await deps.assignWorkRequest({ tenant_id: scope.tenant_id, firm_id: scope.firm_id, work_request_id: request.id, staff_code: instruction.action.assign_to_staff_code }, runner);
        assignment = { outcome: "ASSIGNED", staff_code: instruction.action.assign_to_staff_code };
      } catch (error) {
        assignment = { outcome: "REFUSED", staff_code: instruction.action.assign_to_staff_code, message: error instanceof Error ? error.message : String(error) };
      }
    }
    const done = { ...claim, status: "CREATED", work_request_id: request.id, work_request_number: request.request_number, assignment, needs_input: input.needs_input, input_note: input.note, finished_at: now() };
    await repo.commit(scope, { automation_rule_runs: [done] });
    await audit(scope, runner, [{
      event_type: "standing.request_created", aggregate_type: "StandingInstruction", aggregate_id: instruction.id,
      payload: { instruction_id: instruction.id, name: instruction.name, period_key: periodKey, trigger, work_request_id: request.id, request_number: request.request_number, needs_input: input.needs_input, assignment: assignment.outcome },
      summary: `Standing instruction ${instruction.name} raised ${request.request_number} for ${run.covered.label}${input.needs_input ? " (needs info)" : ""}.`
    }]);
    return { created: { instruction_id: instruction.id, name: instruction.name, period_key: periodKey, work_request_id: request.id, request_number: request.request_number, needs_input: input.needs_input, assignment } };
  } catch (error) {
    const failed = { ...claim, status: "ERROR", error: error instanceof Error ? error.message : String(error), finished_at: now() };
    await repo.commit(scope, { automation_rule_runs: [failed] });
    return { error: { instruction_id: instruction.id, period_key: periodKey, message: failed.error } };
  }
}

// Evaluate the active standing instructions of ONE firm for `today`. Never throws for a single bad instruction.
export async function evaluateStanding({ scope, trigger = "TICK", actor = null, deps, today = standingToday() }) {
  const instructions = (await repo.listStanding(scope)).filter((item) => item.status === "ACTIVE");
  const result = { trigger, as_of: today, evaluated: instructions.length, created: [], skipped_existing: 0, skipped_by_owner: 0, errors: [] };
  if (!instructions.length) return result;
  const settings = await settingsFor(scope);
  for (const instruction of instructions) {
    try {
      const runs = dueRuns(instruction, settings, today);
      if (!runs.length) continue;
      const sources = await inputSources(scope, instruction, today);
      const skips = new Set(instruction.skip_periods ?? []);
      for (const run of runs) {
        const outcome = await raiseOccurrence({ scope, instruction, run, key: occurrenceKey(instruction.id, run.period_key), trigger, actor, deps, sources, periodKey: run.period_key, status: skips.has(run.period_key) ? "SKIPPED" : "CREATED" });
        if (outcome.created) result.created.push(outcome.created);
        else if (outcome.skipped_by_owner) result.skipped_by_owner += 1;
        else if (outcome.error) result.errors.push(outcome.error);
        else result.skipped_existing += 1;
      }
    } catch (error) {
      result.errors.push({ instruction_id: instruction.id, message: error instanceof Error ? error.message : String(error) });
    }
  }
  return result;
}

// Owner "Run now": raise one request now for the period the schedule last ran for. At most one manual run
// per instruction per day (a double click cannot duplicate), and it never consumes the scheduled period.
export async function runStandingNow({ body, actor, deps }) {
  requireOwner(actor, "Running a standing instruction");
  const scope = scopeOf(body);
  const instruction = await repo.getStanding(scope, body.instruction_id);
  if (!instruction) throw httpError(404, "NOT_FOUND", `standing_instructions record not found: ${body.instruction_id}`);
  if (instruction.status === "ARCHIVED") throw httpError(409, "STANDING_ARCHIVED", "This standing instruction is archived.");
  const today = standingToday();
  const settings = await settingsFor(scope);
  const manual = manualRun(instruction, settings, today);
  const run = { ...manual, run_date: today };
  const sources = await inputSources(scope, instruction, today);
  const outcome = await raiseOccurrence({ scope, instruction, run, key: manualOccurrenceKey(instruction.id, today), trigger: "MANUAL", actor, deps, sources, periodKey: `manual:${today}` });
  if (outcome.skipped) throw httpError(409, "STANDING_ALREADY_RAN_TODAY", "This standing instruction was already run by hand today. Check the Inbox for the request.");
  if (outcome.error) throw httpError(502, "STANDING_RUN_FAILED", outcome.error.message);
  await audit(scope, actor, [{ event_type: "standing.run_now", aggregate_type: "StandingInstruction", aggregate_id: instruction.id, payload: { name: instruction.name, request_number: outcome.created.request_number }, summary: `Standing instruction ${instruction.name} was run by hand (${outcome.created.request_number}).` }]);
  return outcome.created;
}

// The scheduled tick: every firm with an active standing instruction, each on its own.
export async function tickStanding({ deps, scope = null }) {
  const scopes = scope ? [scope] : await repo.listStandingScopes();
  const firms = [];
  for (const target of scopes) {
    try {
      const result = await evaluateStanding({ scope: target, trigger: "TICK", actor: null, deps });
      firms.push({ tenant_id: target.tenant_id, firm_id: target.firm_id, evaluated: result.evaluated, created: result.created.length, skipped_existing: result.skipped_existing, skipped_by_owner: result.skipped_by_owner, errors: result.errors.length });
    } catch (error) {
      firms.push({ tenant_id: target.tenant_id, firm_id: target.firm_id, error: error instanceof Error ? error.message : String(error) });
    }
  }
  return { ticked_at: now(), catch_up_days: CATCH_UP_DAYS, firms_visited: firms.length, created: firms.reduce((sum, firm) => sum + (firm.created ?? 0), 0), skipped_existing: firms.reduce((sum, firm) => sum + (firm.skipped_existing ?? 0), 0), skipped_by_owner: firms.reduce((sum, firm) => sum + (firm.skipped_by_owner ?? 0), 0), errors: firms.reduce((sum, firm) => sum + (firm.errors ?? 0) + (firm.error ? 1 : 0), 0), firms };
}
