// VI-S4 (ADR-112): worker scorecards and cost-to-serve.
//
// A pure function of the firm's own records and a date window. No clock, no randomness, no model call; every
// list is sorted on a stable key, so the same data and window always give the same numbers. Dates are Malaysia
// time (UTC+8).
//
// What is measured, and only this:
//   - virtual workers (by staff code) and the skill they ran: how their drafts fared on first review;
//   - per client: requests, worker jobs, drafts, how long drafts wait for the owner, and what was invoiced.
// What is NOT measured: any human. Reviews are counted as events on a worker's draft, never per reviewer, and
// no actor id appears in the output. The owner's "turnaround" is a firm-wide wait (draft ready to decision),
// not time spent reviewing, because the time spent is not recorded.

import { klDate } from "./edcs-brief.mjs";
import { addDays, isIsoDate } from "./edcs-standing.mjs";

export const LOW_SAMPLE_BELOW = 5;
export const PRESETS = ["30d", "90d", "ytd", "custom"];
export const DECISIONS = ["APPROVED_FOR_CLIENT_DRAFT", "REVISION_REQUIRED", "REJECTED"];
// BizKick invoice statuses that are not an issued invoice (so not counted as invoiced).
const NOT_INVOICED = new Set(["Cancelled", "Rejected", "Superseded", "Draft", "Reserved", "Under Review"]);
const VFIRM_INVOICED = new Set(["ISSUED", "PAID", "OVERDUE"]);
const MISSING_PREFIX = "I need more from you before I can do this.";

const money = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
const rate = (part, whole) => (whole ? Math.round((part / whole) * 1000) / 10 : null);
const byKey = (...keys) => (a, b) => { for (const key of keys) { const x = String(a[key] ?? ""); const y = String(b[key] ?? ""); if (x !== y) return x < y ? -1 : 1; } return 0; };

export function median(values) {
  const list = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (!list.length) return null;
  const mid = Math.floor(list.length / 2);
  return list.length % 2 ? list[mid] : Math.round(((list[mid - 1] + list[mid]) / 2) * 10) / 10;
}

// Window: "30d" / "90d" end on as_of (inclusive); "ytd" starts 1 January of as_of's year; "custom" needs from and to.
export function resolvePeriod({ period = "90d", from, to } = {}, asOf) {
  if (!isIsoDate(asOf)) return { ok: false, error: "as_of must be YYYY-MM-DD." };
  const kind = String(period || "90d").toLowerCase();
  if (!PRESETS.includes(kind)) return { ok: false, error: `period must be one of ${PRESETS.join(", ")}.` };
  if (kind === "30d") return { ok: true, period: kind, from: addDays(asOf, -29), to: asOf };
  if (kind === "90d") return { ok: true, period: kind, from: addDays(asOf, -89), to: asOf };
  if (kind === "ytd") return { ok: true, period: kind, from: `${asOf.slice(0, 4)}-01-01`, to: asOf };
  if (!isIsoDate(from) || !isIsoDate(to)) return { ok: false, error: "A custom period needs from and to as YYYY-MM-DD." };
  if (from > to) return { ok: false, error: "from must not be after to." };
  return { ok: true, period: kind, from, to };
}

const inWindow = (iso, window) => { const day = klDate(iso); return Boolean(day && day >= window.from && day <= window.to); };
const minutesBetween = (a, b) => { const x = Date.parse(a); const y = Date.parse(b); return Number.isFinite(x) && Number.isFinite(y) && y >= x ? Math.round((y - x) / 60000) : null; };

// "Add the missing file: A; B." -> two missing inputs; "Fill in: X." -> one; anything else is bucketed as written.
export function missingInputsOf(content) {
  let text = String(content ?? "").trim();
  if (text.startsWith(MISSING_PREFIX)) text = text.slice(MISSING_PREFIX.length).trim();
  const file = text.match(/^Add the missing files?:\s*(.+?)\.?$/i);
  if (file) return file[1].split(/;\s*/).map((part) => part.trim()).filter(Boolean).map((part) => `File: ${part}`);
  const fill = text.match(/^Fill in:\s*(.+?)\.?$/i);
  if (fill) return fill[1].split(/;\s*/).map((part) => part.trim()).filter(Boolean).map((part) => `Field: ${part}`);
  return text ? [`Other: ${text.slice(0, 100)}`] : [];
}

function topMissing(counter) {
  return [...counter.entries()].map(([input, count]) => ({ input, count })).sort((a, b) => b.count - a.count || a.input.localeCompare(b.input)).slice(0, 5);
}

// One row of facts per workdesk item: the first draft, the first decision on it, and whether the worker asked for more.
export function factsFor(item, drafts, reviews, messages) {
  const mine = drafts.filter((d) => d.workdesk_item_id === item.id)
    .sort((a, b) => (Number(a.revision_number ?? 1) - Number(b.revision_number ?? 1)) || String(a.created_at).localeCompare(String(b.created_at)) || String(a.id).localeCompare(String(b.id)));
  const first = mine[0] ?? null;
  const firstReview = first ? reviews.filter((r) => r.output_draft_id === first.id && DECISIONS.includes(r.review_decision)).sort((a, b) => String(a.reviewed_at).localeCompare(String(b.reviewed_at)) || String(a.id).localeCompare(String(b.id)))[0] ?? null : null;
  const asks = messages.filter((m) => m.workdesk_item_id === item.id && m.kind === "NEEDS_INFO");
  const missing = new Set();
  for (const ask of asks) for (const input of missingInputsOf(String(ask.content ?? ""))) missing.add(input);
  return {
    item, first, decision: firstReview?.review_decision ?? null, decided_at: firstReview?.reviewed_at ?? null,
    drafted: Boolean(first), draft_count: mine.length,
    minutes_to_draft: first ? minutesBetween(item.assigned_at, first.created_at) : null,
    waited_minutes: first && firstReview ? minutesBetween(first.created_at, firstReview.reviewed_at) : null,
    asked: asks.length > 0, missing: [...missing]
  };
}

function summarise(facts) {
  const assigned = facts.length;
  const drafted = facts.filter((f) => f.drafted).length;
  const reviewed = facts.filter((f) => f.decision).length;
  const approved = facts.filter((f) => f.decision === "APPROVED_FOR_CLIENT_DRAFT").length;
  const revision = facts.filter((f) => f.decision === "REVISION_REQUIRED").length;
  const rejected = facts.filter((f) => f.decision === "REJECTED").length;
  const asked = facts.filter((f) => f.asked).length;
  const counter = new Map();
  for (const fact of facts) for (const input of fact.missing) counter.set(input, (counter.get(input) ?? 0) + 1);
  return {
    jobs: assigned, drafted, reviewed, pending_review: drafted - reviewed,
    approved_first_pass: approved, revision_required: revision, rejected,
    first_pass_approval_rate: rate(approved, reviewed), revision_rate: rate(revision, reviewed), rejection_rate: rate(rejected, reviewed),
    needs_info_jobs: asked, needs_info_rate: rate(asked, assigned),
    median_minutes_to_draft: median(facts.map((f) => f.minutes_to_draft)),
    top_missing_inputs: topMissing(counter),
    low_sample_jobs: assigned < LOW_SAMPLE_BELOW, low_sample_reviews: reviewed < LOW_SAMPLE_BELOW
  };
}

export function buildScorecards(input) {
  const window = input.window;
  const requests = input.requests ?? [];
  const items = input.items ?? [];
  const drafts = input.drafts ?? [];
  const reviews = input.reviews ?? [];
  const messages = input.messages ?? [];
  const clients = input.clients ?? [];
  const relationships = input.relationships ?? [];
  const requestById = new Map(requests.map((r) => [r.id, r]));
  const clientName = new Map(clients.map((c) => [c.id, c.name]));

  // ---- workers: items assigned in the window, by staff code and skill ----
  const cohort = items.filter((item) => inWindow(item.assigned_at, window));
  const allFacts = cohort.map((item) => factsFor(item, drafts, reviews, messages));
  const groups = new Map();
  for (const fact of allFacts) {
    const code = fact.item.staff_code ?? "UNASSIGNED";
    const entry = groups.get(code) ?? { staff_code: code, position_id: fact.item.position_id ?? null, facts: [], skills: new Map() };
    entry.facts.push(fact);
    const skill = fact.item.skill_id ?? fact.item.action ?? "UNKNOWN";
    const sk = entry.skills.get(skill) ?? { skill_id: skill, action: fact.item.action ?? null, facts: [] };
    sk.facts.push(fact);
    entry.skills.set(skill, sk);
    groups.set(code, entry);
  }
  const workers = [...groups.values()].map((worker) => ({
    staff_code: worker.staff_code, position_id: worker.position_id, ...summarise(worker.facts),
    skills: [...worker.skills.values()].map((sk) => ({ skill_id: sk.skill_id, action: sk.action, ...summarise(sk.facts) })).sort(byKey("skill_id"))
  })).sort(byKey("staff_code"));

  // ---- clients: requests created in the window, plus invoices dated in it ----
  const windowRequests = requests.filter((r) => r.client_id && inWindow(r.created_at, window));
  const perClient = new Map();
  const bucket = (clientId) => {
    if (!perClient.has(clientId)) perClient.set(clientId, { client_id: clientId, requests: [], currencies: new Map() });
    return perClient.get(clientId);
  };
  for (const request of windowRequests) bucket(request.client_id).requests.push(request);
  const revenueOf = (clientId, currency) => {
    const entry = bucket(clientId);
    const code = String(currency || "MYR");
    const row = entry.currencies.get(code) ?? { currency: code, bizkick: 0, vfirm: 0, invoices: 0 };
    entry.currencies.set(code, row);
    return row;
  };
  let unlinked = 0;
  let undated = 0;
  for (const record of input.transactions ?? []) {
    if (record.document_type !== "INV" || NOT_INVOICED.has(record.status)) continue;
    const issued = String(record.date_issued ?? "").slice(0, 10);
    if (!isIsoDate(issued)) { undated += 1; continue; }
    if (issued < window.from || issued > window.to) continue;
    const link = record.counterparty_link;
    if (!link || link.link_type !== "CLIENT" || !link.client_id) { unlinked += 1; continue; }
    const row = revenueOf(link.client_id, record.currency);
    row.bizkick = money(row.bizkick + (Number(record.amount) || 0));
    row.invoices += 1;
  }
  const clientOfRelationship = new Map(relationships.map((rel) => [rel.id, rel.client_id]));
  for (const invoice of input.invoices ?? []) {
    if (!VFIRM_INVOICED.has(invoice.status) || !inWindow(invoice.created_at, window)) continue;
    const clientId = clientOfRelationship.get(invoice.relationship_id);
    if (!clientId) { unlinked += 1; continue; }
    const total = (invoice.line_items ?? []).reduce((sum, line) => sum + (Number(line.amount) || 0), 0);
    const row = revenueOf(clientId, invoice.currency);
    row.vfirm = money(row.vfirm + total);
    row.invoices += 1;
  }
  const clientRows = [...perClient.values()].map((entry) => {
    const ids = new Set(entry.requests.map((r) => r.id));
    const itemsFor = items.filter((item) => ids.has(item.work_request_id));
    const facts = itemsFor.map((item) => factsFor(item, drafts, reviews, messages));
    return {
      client_id: entry.client_id, name: clientName.get(entry.client_id) ?? "(client not found)",
      requests: entry.requests.length, worker_jobs: itemsFor.length,
      drafts: facts.reduce((sum, f) => sum + f.draft_count, 0),
      reviewed: facts.filter((f) => f.decision).length,
      median_hours_waiting_for_owner: (() => { const m = median(facts.map((f) => f.waited_minutes)); return m === null ? null : Math.round((m / 60) * 10) / 10; })(),
      invoiced: [...entry.currencies.values()].map((row) => ({ currency: row.currency, bizkick: row.bizkick, vfirm: row.vfirm, total: money(row.bizkick + row.vfirm), invoices: row.invoices })).sort((a, b) => (a.currency === "MYR" ? -1 : b.currency === "MYR" ? 1 : a.currency.localeCompare(b.currency)))
    };
  }).sort((a, b) => b.requests - a.requests || a.name.localeCompare(b.name) || a.client_id.localeCompare(b.client_id));

  const firmWait = median(allFacts.map((f) => f.waited_minutes));
  return {
    schema: "vfirm.scorecards/1",
    period: { kind: window.period, from: window.from, to: window.to },
    as_of: input.as_of,
    low_sample_below: LOW_SAMPLE_BELOW,
    firm: { ...summarise(allFacts), median_hours_waiting_for_owner: firmWait === null ? null : Math.round((firmWait / 60) * 10) / 10, client_requests: windowRequests.length },
    workers,
    clients: clientRows,
    notes: {
      unlinked_invoices: unlinked, undated_invoices: undated,
      owner_time: "Owner review time is not recorded. The wait shown is how long a draft sat between being ready and being decided; it is never broken down by person.",
      revenue: "Invoiced amounts are BizKick invoices whose counterparty you confirmed as a client, plus vFirm invoices (issued, paid or overdue), by issue date. Each currency is shown on its own and never added to another.",
      scope: "Only virtual workers are measured. No human staff or reviewer is profiled."
    }
  };
}
