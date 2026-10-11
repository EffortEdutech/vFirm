// VI-S2 (ADR-110): the Owner Morning Brief -- the firm's state in two minutes, deterministic and linked.
//
// A pure function of the data it is given and the date: the same data and date always give the same brief
// (no clock, no randomness; every list is sorted on a stable key). It never writes anything and never calls a
// model. Every item carries a `link` ({ page, tab?, id? }) to the record it came from, so the console can open
// it. The service (apps/api/src/edcs-brief-service.mjs) reads the firm's own records and hands them in.
//
// Dates are ISO strings in Malaysia time (UTC+8). A timestamp is turned into a Malaysia date by klDate().

import { computeEdcsAlert, daysToDue } from "./edcs-register.mjs";
import { chainFlagsFor } from "./edcs-chains.mjs";
import { addDays, isIsoDate, upcomingRuns } from "./edcs-standing.mjs";

export const BRIEF_ITEM_LIMIT = 8;
const CLOSED_ITEM = new Set(["ARCHIVED_SENT", "ARCHIVED_DISMISSED", "ARCHIVED_COMPLETED"]);
// Invoice statuses that are NOT money owed: finished, dropped, or not yet issued.
const NOT_RECEIVABLE = new Set(["Completed", "Cancelled", "Rejected", "Superseded", "Draft", "Reserved", "Under Review"]);
const MS = 86400000;

export const klDate = (iso) => (iso && Number.isFinite(Date.parse(iso)) ? new Date(Date.parse(iso) + 8 * 3600000).toISOString().slice(0, 10) : null);
const byKey = (key) => (a, b) => String(a[key] ?? "").localeCompare(String(b[key] ?? "")) || String(a.id ?? "").localeCompare(String(b.id ?? ""));
const dayDiff = (later, earlier) => Math.round((Date.parse(`${later}T00:00:00Z`) - Date.parse(`${earlier}T00:00:00Z`)) / MS);
const money = (n) => Math.round(Number(n || 0) * 100) / 100;
const cap = (list) => ({ total: list.length, items: list.slice(0, BRIEF_ITEM_LIMIT), more: Math.max(0, list.length - BRIEF_ITEM_LIMIT) });

function requestLabel(request) {
  return `${request.request_number ?? "Request"}: ${request.title ?? ""}`.trim();
}

// ---------------- section: needs you (the W4 tray, from the same rules the console tray uses) ----------------

function needsYou({ requests, items, drafts, today }) {
  const draftFor = (item) => drafts.find((draft) => draft.id === item.output_draft_id);
  const itemFor = (request) => items.find((item) => item.id === request.workdesk_item_id);
  const requestFor = (item) => requests.find((request) => request.id === item.work_request_id);
  const classAPending = (item) => item.workdesk_status === "OUTPUT_DRAFTED" && draftFor(item)?.class_a_approval_required && draftFor(item)?.class_a_approval_status === "PENDING";
  const forItem = (item, tab) => {
    const request = requestFor(item);
    return { id: item.id, label: request ? requestLabel(request) : String(item.assignment_summary ?? "Work item"), link: { page: "workdesk", tab, id: item.id } };
  };
  const forRequest = (request, tab) => ({ id: request.id, label: requestLabel(request), link: { page: "workdesk", tab, id: request.id } });
  const overdue = requests.filter((request) => request.due_at && klDate(request.due_at) < today && request.status === "ASSIGNED" && !CLOSED_ITEM.has(itemFor(request)?.workdesk_status) && itemFor(request)?.workdesk_status !== "NEEDS_INFO");
  // a late request already shown as "new to assign" or "question" is not counted twice
  const tiles = [
    { key: "questions", label: "Questions from your team", urgent: true, list: items.filter((item) => item.workdesk_status === "NEEDS_INFO").sort(byKey("assigned_at")).map((item) => forItem(item, "inbox")) },
    { key: "inbox", label: "New requests to assign", urgent: false, list: requests.filter((request) => request.status === "SUBMITTED").sort(byKey("created_at")).map((request) => forRequest(request, "inbox")) },
    { key: "approval", label: "Drafts to review", urgent: false, list: items.filter((item) => ["OUTPUT_DRAFTED", "REVIEW_ACTION_REQUIRED"].includes(item.workdesk_status) && !classAPending(item)).sort(byKey("assigned_at")).map((item) => forItem(item, "approval")) },
    { key: "classa", label: "Class A approvals", urgent: true, list: items.filter(classAPending).sort(byKey("assigned_at")).map((item) => forItem(item, "approval")) },
    { key: "outbox", label: "Ready to send or file", urgent: false, list: items.filter((item) => ["REVIEWED_FOR_CLIENT_DRAFT", "CLIENT_DELIVERY_DRAFT_PREPARED"].includes(item.workdesk_status)).sort(byKey("assigned_at")).map((item) => forItem(item, "outbox")) },
    { key: "overdue", label: "Past due date", urgent: true, list: overdue.sort(byKey("due_at")).map((request) => forRequest(request, "pending")) }
  ];
  return { key: "needs_you", title: "Needs you", total: tiles.reduce((sum, tile) => sum + tile.list.length, 0), tiles: tiles.map(({ list, ...tile }) => ({ ...tile, ...cap(list) })) };
}

// ---------------- section: due and overdue ----------------

function dueSection({ requests, items, transactions, today }) {
  const itemFor = (request) => items.find((item) => item.id === request.workdesk_item_id);
  const open = (request) => request.status === "SUBMITTED" || (request.status === "ASSIGNED" && !CLOSED_ITEM.has(itemFor(request)?.workdesk_status));
  const dueRequests = requests
    .filter((request) => request.due_at && open(request) && klDate(request.due_at) <= today)
    .sort(byKey("due_at"))
    .map((request) => ({ id: request.id, label: requestLabel(request), due: klDate(request.due_at), days_late: dayDiff(today, klDate(request.due_at)), link: { page: "workdesk", tab: request.status === "SUBMITTED" ? "inbox" : "pending", id: request.id } }));
  const alerts = transactions
    .map((record) => ({ record, alert: computeEdcsAlert(record, today) }))
    .filter(({ alert }) => alert === "OVERDUE" || alert === "DUE SOON")
    .sort((a, b) => String(a.record.due_date).localeCompare(String(b.record.due_date)) || String(a.record.transaction_id).localeCompare(String(b.record.transaction_id)));
  const bizkick = alerts.map(({ record, alert }) => ({ id: record.transaction_id, label: `${record.transaction_id}${record.counterparty_name ? ` (${record.counterparty_name})` : ""}`, due: record.due_date, alert, days_late: -daysToDue(record, today), link: { page: "bizkick-transactions", id: record.transaction_id } }));
  return {
    key: "due", title: "Due and overdue",
    requests: { overdue: dueRequests.filter((item) => item.days_late > 0).length, due_today: dueRequests.filter((item) => item.days_late === 0).length, ...cap(dueRequests) },
    bizkick: { overdue: alerts.filter(({ alert }) => alert === "OVERDUE").length, due_soon: alerts.filter(({ alert }) => alert === "DUE SOON").length, ...cap(bizkick) }
  };
}

// ---------------- section: cash signals ----------------

export const AGING_BUCKETS = [["not_due", "Not yet due"], ["d1_30", "1-30 days late"], ["d31_60", "31-60 days late"], ["d61_90", "61-90 days late"], ["d90_plus", "Over 90 days late"]];

function bucketOf(daysLate) {
  if (daysLate <= 0) return "not_due";
  if (daysLate <= 30) return "d1_30";
  if (daysLate <= 60) return "d31_60";
  if (daysLate <= 90) return "d61_90";
  return "d90_plus";
}

export function receivablesAging(transactions, today) {
  const invoices = transactions.filter((record) => record.document_type === "INV" && !NOT_RECEIVABLE.has(record.status));
  const currencies = new Map();
  const undated = [];
  for (const record of invoices) {
    const due = isIsoDate(String(record.due_date ?? "").slice(0, 10)) ? String(record.due_date).slice(0, 10) : null;
    const issued = isIsoDate(String(record.date_issued ?? "").slice(0, 10)) ? String(record.date_issued).slice(0, 10) : null;
    const basis = due ?? issued;
    if (!basis) { undated.push(record); continue; }
    const code = String(record.currency || "MYR");
    const entry = currencies.get(code) ?? { currency: code, total: 0, count: 0, buckets: Object.fromEntries(AGING_BUCKETS.map(([key]) => [key, { count: 0, amount: 0, ids: [] }])) };
    const bucket = entry.buckets[bucketOf(dayDiff(today, basis))];
    const amount = Number(record.amount) || 0;
    bucket.count += 1; bucket.amount = money(bucket.amount + amount); bucket.ids.push(record.transaction_id);
    entry.total = money(entry.total + amount); entry.count += 1;
    currencies.set(code, entry);
  }
  return {
    currencies: [...currencies.values()].sort((a, b) => (a.currency === "MYR" ? -1 : b.currency === "MYR" ? 1 : a.currency.localeCompare(b.currency)))
      .map((entry) => ({ ...entry, buckets: AGING_BUCKETS.map(([key, label]) => ({ key, label, count: entry.buckets[key].count, amount: entry.buckets[key].amount, ids: entry.buckets[key].ids.sort().slice(0, BRIEF_ITEM_LIMIT) })) })),
    undated: undated.map((record) => record.transaction_id).sort()
  };
}

// The last completed months (at most 6, and none before the firm's first transaction) with no completed bank reconciliation.
export function unreconciledMonths(transactions, today, window = 6) {
  const seen = transactions.map((record) => String(record.date_issued ?? record.date_reserved ?? "").slice(0, 7)).filter((month) => /^\d{4}-\d{2}$/.test(month)).sort();
  if (!seen.length) return [];
  const first = seen[0];
  const thisMonth = today.slice(0, 7);
  const months = [];
  let [y, m] = thisMonth.split("-").map(Number);
  for (let i = 0; i < window; i += 1) {
    m -= 1;
    if (m < 1) { m = 12; y -= 1; }
    const key = `${y}-${String(m).padStart(2, "0")}`;
    if (key < first) break;
    months.push(key);
  }
  const reconciled = (month) => transactions.filter((record) => record.document_type === "BR" && String(record.date_issued ?? "").startsWith(month));
  return months.sort().map((month) => {
    const reconciliations = reconciled(month);
    const done = reconciliations.some((record) => record.status === "Completed");
    return { month, state: done ? "RECONCILED" : reconciliations.length ? "IN_PROGRESS" : "MISSING", ids: reconciliations.map((record) => record.transaction_id).sort() };
  }).filter((entry) => entry.state !== "RECONCILED");
}

function cashSection({ transactions, today, connected }) {
  const aging = receivablesAging(transactions, today);
  const months = unreconciledMonths(transactions, today);
  return {
    key: "cash", title: "Cash signals", connected,
    receivables: { ...aging, link: { page: "bizkick-transactions" } },
    unreconciled_months: months.map((entry) => ({ ...entry, link: entry.ids[0] ? { page: "bizkick-transactions", id: entry.ids[0] } : { page: "bizkick-transactions" } }))
  };
}

// ---------------- section: yesterday's throughput ----------------

function throughput({ requests, items, drafts, yesterday }) {
  const on = (iso) => klDate(iso) === yesterday;
  const submitted = requests.filter((request) => on(request.created_at));
  const assigned = items.filter((item) => on(item.assigned_at));
  const drafted = drafts.filter((draft) => on(draft.created_at));
  const completed = items.filter((item) => item.archived_at && on(item.archived_at) && ["ARCHIVED_COMPLETED", "ARCHIVED_SENT"].includes(item.workdesk_status));
  const staff = new Map();
  const touch = (code) => { const entry = staff.get(code) ?? { staff_code: code, assigned: 0, drafts: 0, completed: 0 }; staff.set(code, entry); return entry; };
  const itemById = new Map(items.map((item) => [item.id, item]));
  for (const item of assigned) touch(item.staff_code ?? "unknown").assigned += 1;
  for (const draft of drafted) touch(itemById.get(draft.workdesk_item_id)?.staff_code ?? draft.staff_code ?? "unknown").drafts += 1;
  for (const item of completed) touch(item.staff_code ?? "unknown").completed += 1;
  return {
    key: "throughput", title: "Your team yesterday", date: yesterday,
    requests_submitted: submitted.length, items_assigned: assigned.length, drafts_produced: drafted.length, items_completed: completed.length,
    workers: [...staff.values()].sort((a, b) => a.staff_code.localeCompare(b.staff_code)).map((entry) => ({ ...entry, link: { page: "workdesk", tab: "pending" } }))
  };
}

// ---------------- section: exceptions ----------------

function exceptions({ transactions, reservations }) {
  const byId = new Map(transactions.map((record) => [record.transaction_id, record]));
  const ids = (list) => list.map((record) => record.transaction_id).sort();
  const entry = (list, page) => ({ ...cap(ids(list).map((id) => ({ id, label: id, link: { page, id } }))) });
  const reservedIds = new Set(reservations.map((record) => record.transaction_id));
  const firstReservation = reservations.map((record) => record.reserved_at).filter(Boolean).sort()[0] ?? null;
  const unreserved = firstReservation ? transactions.filter((record) => !reservedIds.has(record.transaction_id) && String(record.first_seen_at ?? "") >= firstReservation) : [];
  return {
    key: "exceptions", title: "Exceptions",
    conflicts: entry(transactions.filter((record) => record.held_conflict), "bizkick-conflicts"),
    duplicates: entry(transactions.filter((record) => record.flags?.duplicate), "bizkick-transactions"),
    missing_links: entry(transactions.filter((record) => chainFlagsFor(record, byId).length > 0), "bizkick-chains"),
    unreserved_ids: entry(unreserved, "bizkick-numbers")
  };
}

// ---------------- section: standing instructions today ----------------

function standingSection({ standing, today, requests, items }) {
  const itemOf = (request) => items.find((item) => item.id === request.workdesk_item_id);
  const stillOpen = (run) => {
    const request = requests.find((record) => record.id === run.work_request_id);
    return Boolean(request) && (request.status === "SUBMITTED" || (request.status === "ASSIGNED" && !CLOSED_ITEM.has(itemOf(request)?.workdesk_status)));
  };
  const instructions = (standing?.instructions ?? []).filter((item) => item.status === "ACTIVE").sort(byKey("name"));
  const settings = standing?.settings ?? { holidays: [], weekend_days: [6, 0] };
  const runs = standing?.runs ?? [];
  const due = instructions
    .map((instruction) => ({ instruction, next: upcomingRuns(instruction, settings, today, 1)[0] ?? null }))
    .filter(({ next }) => next && next.run_date === today)
    .map(({ instruction, next }) => ({ id: instruction.id, label: instruction.name, covers: next.covered.label, link: { page: "bizkick-standing", id: instruction.id } }));
  const todays = runs.filter((run) => run.run_date === today && run.status === "CREATED").sort(byKey("at"))
    .map((run) => ({ id: run.id, label: `${run.instruction_name}: ${run.work_request_number ?? ""}`.trim(), needs_input: Boolean(run.needs_input), link: { page: "bizkick-standing", id: run.instruction_id } }));
  const needsInfo = runs.filter((run) => run.status === "CREATED" && run.needs_input && stillOpen(run)).sort(byKey("at"))
    .map((run) => ({ id: run.id, label: `${run.instruction_name} (${run.covers ?? run.period_key}): ${run.input_note ?? "an input is missing"}`, link: { page: "bizkick-standing", id: run.instruction_id } }));
  const failed = runs.filter((run) => run.status === "ERROR" && String(run.run_date ?? "") >= addDays(today, -7)).sort(byKey("at"))
    .map((run) => ({ id: run.id, label: `${run.instruction_name} (${run.period_key}): ${run.error ?? "failed"}`, link: { page: "bizkick-standing", id: run.instruction_id } }));
  return { key: "standing", title: "Standing instructions", active: instructions.length, due_today: cap(due), raised_today: cap(todays), needs_info: cap(needsInfo), failed: cap(failed) };
}

// ---------------- the brief ----------------

// input: { as_of, requests, items, drafts, transactions, reservations, standing: { instructions, settings, runs }, connected }
export function buildBrief(input) {
  const today = input.as_of;
  if (!isIsoDate(today)) throw new Error("buildBrief needs as_of (YYYY-MM-DD).");
  const requests = [...(input.requests ?? [])].sort(byKey("created_at"));
  const items = [...(input.items ?? [])];
  const drafts = [...(input.drafts ?? [])];
  const transactions = [...(input.transactions ?? [])].sort((a, b) => String(a.transaction_id).localeCompare(String(b.transaction_id)));
  const reservations = [...(input.reservations ?? [])];
  const yesterday = addDays(today, -1);
  const connected = Boolean(input.connected) || transactions.length > 0;
  const sections = {
    needs_you: needsYou({ requests, items, drafts, today }),
    due: dueSection({ requests, items, transactions, today }),
    cash: cashSection({ transactions, today, connected }),
    throughput: throughput({ requests, items, drafts, yesterday }),
    exceptions: exceptions({ transactions, reservations }),
    standing: standingSection({ standing: input.standing, today, requests, items })
  };
  const e = sections.exceptions;
  const headline = [
    { key: "needs_you", label: "Waiting on you", count: sections.needs_you.total, urgent: sections.needs_you.tiles.some((tile) => tile.urgent && tile.total > 0) },
    { key: "overdue", label: "Overdue (requests and BizKick)", count: sections.due.requests.overdue + sections.due.bizkick.overdue, urgent: true },
    { key: "receivables_late", label: "Invoices past due", count: sections.cash.receivables.currencies.reduce((sum, entry) => sum + entry.buckets.filter((bucket) => bucket.key !== "not_due").reduce((s, bucket) => s + bucket.count, 0), 0), urgent: true },
    { key: "unreconciled", label: "Months without a bank reconciliation", count: sections.cash.unreconciled_months.length, urgent: false },
    { key: "exceptions", label: "Exceptions in the register", count: e.conflicts.total + e.duplicates.total + e.missing_links.total + e.unreserved_ids.total, urgent: false },
    { key: "standing", label: "Standing instructions needing info", count: sections.standing.needs_info.total + sections.standing.failed.total, urgent: false }
  ];
  return { as_of: today, yesterday, headline, sections };
}

// A short stable fingerprint of a brief (for "same data gives the same brief").
export function briefDigest(brief) {
  const text = JSON.stringify(brief);
  let hash = 5381;
  for (let i = 0; i < text.length; i += 1) hash = ((hash << 5) + hash + text.charCodeAt(i)) >>> 0;
  return hash.toString(16).padStart(8, "0");
}
