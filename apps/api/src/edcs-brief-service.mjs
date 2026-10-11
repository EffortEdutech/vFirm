// VI-S2 (ADR-110): the Owner Morning Brief service.
//
// Reads only this firm's own records, hands them to the pure engine (packages/core-domain/src/edcs-brief.mjs)
// and returns the brief. Read-only except for the daily snapshot: the first brief of a Malaysia day is saved
// (insert-if-absent) either by the 06:00 tick or by the owner's first open, so history keeps what the owner
// was shown. Owner-only. Nothing here calls a model or sends anything.

import { appendEventAndAudit, newUuid, now, readStore, systemActor, withStore } from "./store.mjs";
import { edcsRepository as repo } from "./edcs-repository.mjs";
import { isFirmOwner } from "./edcs-owner.mjs";
import { buildBrief, briefDigest } from "../../../packages/core-domain/src/edcs-brief.mjs";
import { DEFAULT_SETTINGS, todayInKL } from "../../../packages/core-domain/src/edcs-standing.mjs";

function httpError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

const scopeOf = (source) => ({ tenant_id: source.tenant_id, firm_id: source.firm_id });

// Today in Malaysia time. VFIRM_AUTOMATION_AS_OF pins it (YYYY-MM-DD) for tests and rehearsals only.
function briefToday() {
  const pinned = process.env.VFIRM_AUTOMATION_AS_OF;
  if (pinned && /^\d{4}-\d{2}-\d{2}$/.test(pinned)) return pinned;
  return todayInKL();
}

// Collect this firm's records and build the brief. No cross-firm data: every list is filtered by tenant AND firm.
export async function composeBrief(scope, asOf = briefToday()) {
  const store = await readStore(scope.tenant_id, { ledger: false });
  const mine = (list) => (list ?? []).filter((record) => record.tenant_id === scope.tenant_id && record.firm_id === scope.firm_id);
  const [transactions, reservations, instructions, runs, settingsRow] = await Promise.all([
    repo.listTransactions(scope), repo.listReservations(scope), repo.listStanding(scope), repo.listStandingRuns(scope), repo.getStandingSettings(scope)
  ]);
  const settings = settingsRow ? { holidays: settingsRow.holidays ?? [], weekend_days: settingsRow.weekend_days ?? [6, 0] } : { ...DEFAULT_SETTINGS };
  return buildBrief({
    as_of: asOf,
    requests: mine(store.work_requests),
    items: mine(store.awia_staff_workdesk_items),
    drafts: mine(store.awia_staff_output_drafts),
    transactions: transactions.filter((record) => record.tenant_id === scope.tenant_id && record.firm_id === scope.firm_id),
    reservations: reservations.filter((record) => record.tenant_id === scope.tenant_id && record.firm_id === scope.firm_id),
    standing: { instructions, settings, runs },
    connected: transactions.length > 0
  });
}

const snapshotMeta = (record) => (record ? { id: record.id, as_of: record.as_of, saved_by: record.saved_by, saved_at: record.saved_at, digest: record.digest } : null);

async function saveSnapshot(scope, brief, savedBy, actor) {
  const record = { id: newUuid(), tenant_id: scope.tenant_id, firm_id: scope.firm_id, as_of: brief.as_of, saved_by: savedBy, saved_at: now(), digest: briefDigest(brief), brief };
  const result = await repo.saveBriefOnce(scope, record);
  if (result.saved) {
    await withStore((store) => {
      appendEventAndAudit(store, { actor: actor ?? systemActor(scope.tenant_id, scope.firm_id), tenant_id: scope.tenant_id, firm_id: scope.firm_id, event_type: "brief.saved", aggregate_type: "FirmBrief", aggregate_id: record.id, payload: { as_of: brief.as_of, saved_by: savedBy, digest: record.digest }, summary: `Morning brief for ${brief.as_of} saved (${savedBy === "TICK" ? "daily job" : "first open"}).` });
    }, { tenantId: scope.tenant_id, ledger: false });
  }
  return result;
}

// GET /brief/today: the live brief; saves the day's first snapshot if there is none yet.
export async function briefToday_({ scope, actor }) {
  if (!isFirmOwner(actor)) throw httpError(403, "EDCS_OWNER_REQUIRED", "The Morning Brief is for the firm owner.");
  const brief = await composeBrief(scope);
  const saved = await saveSnapshot(scope, brief, "FIRST_OPEN", actor);
  return { brief, digest: briefDigest(brief), snapshot: snapshotMeta(saved.record), snapshot_just_saved: saved.saved, changed_since_snapshot: saved.record.digest !== briefDigest(brief) };
}

export async function briefHistory({ scope, actor }) {
  if (!isFirmOwner(actor)) throw httpError(403, "EDCS_OWNER_REQUIRED", "The Morning Brief is for the firm owner.");
  const list = await repo.listBriefs(scope);
  return { briefs: list.map((record) => ({ ...snapshotMeta(record), headline: record.brief?.headline ?? [] })) };
}

export async function briefOn({ scope, actor, asOf }) {
  if (!isFirmOwner(actor)) throw httpError(403, "EDCS_OWNER_REQUIRED", "The Morning Brief is for the firm owner.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(asOf))) throw httpError(400, "VALIDATION_ERROR", "Date must be YYYY-MM-DD.");
  const record = await repo.getBrief(scope, asOf);
  if (!record) throw httpError(404, "NOT_FOUND", `No brief was saved for ${asOf}.`);
  return { brief: record.brief, snapshot: snapshotMeta(record) };
}

// The scheduled tick: save today's brief for every firm (after the standing instructions were raised).
export async function tickBriefs({ scope = null } = {}) {
  const scopes = scope ? [scope] : await repo.listBriefScopes();
  const firms = [];
  for (const target of scopes) {
    try {
      const brief = await composeBrief(target);
      const saved = await saveSnapshot(target, brief, "TICK", null);
      firms.push({ tenant_id: target.tenant_id, firm_id: target.firm_id, saved: saved.saved });
    } catch (error) {
      firms.push({ tenant_id: target.tenant_id, firm_id: target.firm_id, error: error instanceof Error ? error.message : String(error) });
    }
  }
  return { ticked_at: now(), firms_visited: firms.length, saved: firms.filter((firm) => firm.saved).length, errors: firms.filter((firm) => firm.error).length, firms };
}
