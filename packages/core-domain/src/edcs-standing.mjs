// VI-S1 (ADR-109): Standing Instructions -- recurring work that raises itself once per period.
//
// Pure functions only (no store, no clock unless a date is passed in), so every rule here is testable.
// A standing instruction says "every month on the 5th, ask the bookkeeper to reconcile the bank account".
// The service (apps/api/src/edcs-standing-service.mjs) turns each due period into ONE governed work request.
//
// Dates are ISO strings (YYYY-MM-DD) in Malaysia time (UTC+8). Weekends and public holidays are the
// firm's own settings: the owner types the holidays once (they change by announcement, so none are built in).

export const FREQUENCIES = ["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY"];
export const BUSINESS_DAY_MODES = ["NEXT", "PREVIOUS", "ON_DATE"];
export const INPUT_MODES = ["NONE", "LATEST_DOCUMENT", "TRANSACTIONS"];
export const COVERS = ["PREVIOUS", "CURRENT"];
// A tick that was missed (server asleep, deploy) still creates the work, for run dates up to this many days back.
export const CATCH_UP_DAYS = 7;

const DAY = 86400000;
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const parse = (iso) => new Date(`${iso}T00:00:00Z`);
const fmt = (date) => date.toISOString().slice(0, 10);
export const addDays = (iso, n) => fmt(new Date(parse(iso).getTime() + n * DAY));
const weekday = (iso) => parse(iso).getUTCDay(); // 0 = Sunday
const daysInMonth = (year, month) => new Date(Date.UTC(year, month, 0)).getUTCDate(); // month 1-12
const pad = (n) => String(n).padStart(2, "0");
export const isIsoDate = (value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && fmt(parse(value)) === value;
const clean = (value) => String(value ?? "").trim();

// Today in Malaysia time (UTC+8). VFIRM_AUTOMATION_AS_OF pins it for tests; the service passes that in.
export function todayInKL(date = new Date()) {
  return fmt(new Date(date.getTime() + 8 * 3600000));
}

// ---------------- firm calendar ----------------

export function normalizeSettings(input = {}) {
  const holidays = [...new Set((Array.isArray(input.holidays) ? input.holidays : String(input.holidays ?? "").split(/[\s,;]+/)).map(clean).filter(Boolean))];
  const bad = holidays.filter((day) => !isIsoDate(day));
  const weekend = Array.isArray(input.weekend_days) ? [...new Set(input.weekend_days.map(Number))] : [6, 0];
  const errors = [];
  if (bad.length) errors.push(`These holidays are not dates (use YYYY-MM-DD): ${bad.slice(0, 5).join(", ")}.`);
  if (weekend.some((day) => !Number.isInteger(day) || day < 0 || day > 6) || weekend.length > 3) errors.push("Weekend days must be 0 (Sunday) to 6 (Saturday), at most three of them.");
  return { ok: errors.length === 0, errors, settings: { holidays: holidays.filter(isIsoDate).sort(), weekend_days: weekend } };
}

export const DEFAULT_SETTINGS = { holidays: [], weekend_days: [6, 0] };

export function isBusinessDay(iso, settings = DEFAULT_SETTINGS) {
  return !(settings.weekend_days ?? [6, 0]).includes(weekday(iso)) && !(settings.holidays ?? []).includes(iso);
}

export function shiftToBusinessDay(iso, mode, settings = DEFAULT_SETTINGS) {
  if (mode === "ON_DATE" || isBusinessDay(iso, settings)) return iso;
  const step = mode === "PREVIOUS" ? -1 : 1;
  let day = iso;
  for (let i = 0; i < 21; i += 1) {
    day = addDays(day, step);
    if (isBusinessDay(day, settings)) return day;
  }
  return iso; // a calendar with no business day in three weeks is a settings mistake; do not loop forever
}

// ---------------- the definition ----------------

export function validateInstruction(raw = {}) {
  const errors = [];
  const name = clean(raw.name).slice(0, 120);
  if (!name) errors.push("Give the standing instruction a name.");
  const schedule = raw.schedule ?? {};
  const frequency = clean(schedule.frequency).toUpperCase();
  if (!FREQUENCIES.includes(frequency)) errors.push(`Choose how often: ${FREQUENCIES.join(", ")}.`);
  const businessDay = clean(schedule.business_day || "NEXT").toUpperCase();
  if (!BUSINESS_DAY_MODES.includes(businessDay)) errors.push("Business-day handling must be NEXT, PREVIOUS or ON_DATE.");
  const covers = clean(schedule.covers || "PREVIOUS").toUpperCase();
  if (!COVERS.includes(covers)) errors.push("'Covers' must be PREVIOUS (the period just ended) or CURRENT.");
  const out = { frequency, business_day: businessDay, covers, weekday: null, day_of_month: null, quarter_offset: 0 };
  if (frequency === "WEEKLY") {
    out.weekday = Number(schedule.weekday ?? 1);
    if (!Number.isInteger(out.weekday) || out.weekday < 0 || out.weekday > 6) errors.push("Weekly instructions need a weekday from 0 (Sunday) to 6 (Saturday).");
  }
  if (frequency === "MONTHLY" || frequency === "QUARTERLY") {
    out.day_of_month = Number(schedule.day_of_month ?? 1);
    if (!Number.isInteger(out.day_of_month) || out.day_of_month < 1 || out.day_of_month > 31) errors.push("Day of month must be 1 to 31 (a short month uses its last day).");
  }
  if (frequency === "QUARTERLY") {
    out.quarter_offset = Number(schedule.quarter_offset ?? 0);
    if (![0, 1, 2].includes(out.quarter_offset)) errors.push("Quarter offset must be 0, 1 or 2 (0 = Jan/Apr/Jul/Oct).");
  }
  const action = raw.action ?? {};
  const request_type_id = clean(action.request_type_id);
  if (!request_type_id) errors.push("Choose the kind of work this raises.");
  const title_template = clean(action.title_template).slice(0, 200);
  if (!title_template) errors.push("The work needs a title.");
  const priority = clean(action.priority || "NORMAL").toUpperCase();
  if (!["LOW", "NORMAL", "HIGH", "URGENT"].includes(priority)) errors.push("Priority must be LOW, NORMAL, HIGH or URGENT.");
  const dueIn = action.due_in_days === null || action.due_in_days === undefined || action.due_in_days === "" ? null : Number(action.due_in_days);
  if (dueIn !== null && (!Number.isInteger(dueIn) || dueIn < 0 || dueIn > 90)) errors.push("Due in must be 0 to 90 days.");
  const input = raw.input ?? {};
  const mode = clean(input.mode || "NONE").toUpperCase();
  if (!INPUT_MODES.includes(mode)) errors.push(`Input must be one of ${INPUT_MODES.join(", ")}.`);
  const resolved = { mode, document_type: clean(input.document_type), title_contains: clean(input.title_contains), transaction_type: clean(input.transaction_type).toUpperCase(), max_files: Math.min(25, Math.max(1, Number(input.max_files) || 10)) };
  if (mode === "LATEST_DOCUMENT" && !resolved.document_type && !resolved.title_contains) errors.push("Say which document to attach (its type or a word in its title).");
  if (mode === "TRANSACTIONS" && !resolved.transaction_type) errors.push("Say which BizKick transaction type to gather (for example INV or BANKREC).");
  const startDate = clean(raw.start_date);
  if (startDate && !isIsoDate(startDate)) errors.push("Start date must be YYYY-MM-DD.");
  if (errors.length) return { ok: false, errors };
  return {
    ok: true, errors,
    instruction: {
      name, description: clean(raw.description).slice(0, 500), schedule: out, input: resolved,
      action: { request_type_id, title_template, instructions_template: clean(action.instructions_template).slice(0, 4000), priority, due_in_days: dueIn, assign_to_staff_code: clean(action.assign_to_staff_code) || null },
      start_date: startDate || null
    }
  };
}

// ---------------- dates and periods ----------------

const quarterOf = (month) => Math.floor((month - 1) / 3) + 1;

// The key of the run period (what the once-only claim is made on). It follows the NOMINAL date, so moving a
// run to the next business day never changes which period it belongs to.
export function periodKeyFor(frequency, nominal) {
  const [year, month] = nominal.split("-").map(Number);
  if (frequency === "DAILY") return nominal;
  if (frequency === "WEEKLY") return addDays(nominal, -((weekday(nominal) + 6) % 7)); // the Monday of that week
  if (frequency === "MONTHLY") return `${year}-${pad(month)}`;
  return `${year}-Q${quarterOf(month)}`;
}

// The period the work is ABOUT, from the nominal run date: { start, end, label }.
export function coveredPeriod(schedule, nominal) {
  const previous = schedule.covers !== "CURRENT";
  const [year, month] = nominal.split("-").map(Number);
  if (schedule.frequency === "DAILY") {
    const day = previous ? addDays(nominal, -1) : nominal;
    return { start: day, end: day, label: day };
  }
  if (schedule.frequency === "WEEKLY") {
    const monday = addDays(nominal, -((weekday(nominal) + 6) % 7) - (previous ? 7 : 0));
    return { start: monday, end: addDays(monday, 6), label: `week of ${monday}` };
  }
  if (schedule.frequency === "MONTHLY") {
    let y = year; let m = month - (previous ? 1 : 0);
    if (m < 1) { m = 12; y -= 1; }
    return { start: `${y}-${pad(m)}-01`, end: `${y}-${pad(m)}-${pad(daysInMonth(y, m))}`, label: `${MONTHS[m - 1]} ${y}` };
  }
  let y = year; let q = quarterOf(month) - (previous ? 1 : 0);
  if (q < 1) { q = 4; y -= 1; }
  const firstMonth = (q - 1) * 3 + 1;
  return { start: `${y}-${pad(firstMonth)}-01`, end: `${y}-${pad(firstMonth + 2)}-${pad(daysInMonth(y, firstMonth + 2))}`, label: `Q${q} ${y}` };
}

function nominalDates(schedule, from, to) {
  const out = [];
  if (schedule.frequency === "DAILY") {
    for (let day = from; day <= to; day = addDays(day, 1)) out.push(day);
  } else if (schedule.frequency === "WEEKLY") {
    for (let day = from; day <= to; day = addDays(day, 1)) if (weekday(day) === schedule.weekday) out.push(day);
  } else {
    let [y, m] = from.split("-").map(Number);
    const [ty, tm] = to.split("-").map(Number);
    while (y < ty || (y === ty && m <= tm)) {
      if (schedule.frequency === "MONTHLY" || (m - 1) % 3 === schedule.quarter_offset) {
        const day = `${y}-${pad(m)}-${pad(Math.min(schedule.day_of_month, daysInMonth(y, m)))}`;
        if (day >= from && day <= to) out.push(day);
      }
      m += 1;
      if (m > 12) { m = 1; y += 1; }
    }
  }
  return out;
}

// Every run in [from, to] (inclusive, by the date the work is actually raised): [{ period_key, nominal, run_date, covered }].
export function runsBetween(schedule, settings, from, to) {
  const wideFrom = addDays(from, -25);
  const wideTo = addDays(to, 25);
  const seen = new Map();
  for (const nominal of nominalDates(schedule, wideFrom, wideTo)) {
    // A daily instruction means "every business day": a weekend day is skipped, not carried to Monday.
    if (schedule.frequency === "DAILY" && schedule.business_day !== "ON_DATE" && !isBusinessDay(nominal, settings)) continue;
    const runDate = schedule.frequency === "DAILY" ? nominal : shiftToBusinessDay(nominal, schedule.business_day, settings);
    if (runDate < from || runDate > to) continue;
    const key = periodKeyFor(schedule.frequency, nominal);
    if (!seen.has(key)) seen.set(key, { period_key: key, nominal, run_date: runDate, covered: coveredPeriod(schedule, nominal) });
  }
  return [...seen.values()].sort((a, b) => a.run_date.localeCompare(b.run_date));
}

// What the tick should raise today: runs from the later of (active_from, today - catch-up) up to today.
export function dueRuns(instruction, settings, today) {
  if (instruction.status !== "ACTIVE") return [];
  const earliest = addDays(today, -(CATCH_UP_DAYS - 1));
  const from = [earliest, instruction.active_from, instruction.schedule.start_date, instruction.start_date].filter(Boolean).sort().at(-1);
  return runsBetween(instruction.schedule, settings, from, today);
}

// The next few runs from `today` (for the preview and the list).
export function upcomingRuns(instruction, settings, today, count = 5) {
  const from = [today, instruction.start_date].filter(Boolean).sort().at(-1);
  const out = [];
  let windowStart = from;
  for (let i = 0; i < 24 && out.length < count; i += 1) {
    const windowEnd = addDays(windowStart, 60);
    for (const run of runsBetween(instruction.schedule, settings, windowStart, windowEnd)) if (out.length < count && !out.some((item) => item.period_key === run.period_key)) out.push(run);
    windowStart = addDays(windowEnd, 1);
  }
  return out;
}

// The occurrence key (dedupe key) of a period, and of a manual "run now" (one per day).
export const occurrenceKey = (instructionId, periodKey) => `si|${instructionId}|${periodKey}`;
export const manualOccurrenceKey = (instructionId, day) => `si|${instructionId}|manual|${day}`;

// The period a manual run covers: the one the schedule most recently ran for (or would run for today).
export function manualRun(instruction, settings, today) {
  const past = runsBetween(instruction.schedule, settings, addDays(today, -400), today).at(-1);
  if (past) return { nominal: past.nominal, covered: past.covered };
  return { nominal: today, covered: coveredPeriod(instruction.schedule, today) };
}

// ---------------- text ----------------

export function renderText(template, vars) {
  return String(template ?? "").replace(/\{(\w+)\}/g, (match, key) => (vars[key] === undefined || vars[key] === null ? match : String(vars[key])));
}

export function requestVars(instruction, run) {
  return { name: instruction.name, period_label: run.covered.label, period_start: run.covered.start, period_end: run.covered.end, run_date: run.run_date ?? run.nominal };
}

// ---------------- input resolvers (data comes from the service) ----------------

// entries: [{ document_type, title, updated_at, file: { file_id, filename, downloadable } | null }]
export function pickLatestDocument(entries, spec) {
  const type = spec.document_type.toLowerCase();
  const word = spec.title_contains.toLowerCase();
  const matches = entries
    .filter((entry) => entry.file?.downloadable)
    .filter((entry) => (!type || String(entry.document_type ?? "").toLowerCase() === type) && (!word || String(entry.title ?? "").toLowerCase().includes(word)))
    .sort((a, b) => String(b.updated_at ?? "").localeCompare(String(a.updated_at ?? "")));
  return matches[0] ?? null;
}

// transactions: BizKick register rows; files: Map(transaction_id -> { primary })
export function pickTransactions(transactions, spec, period, files) {
  const inPeriod = transactions
    .filter((record) => record.document_type === spec.transaction_type)
    .filter((record) => {
      const day = String(record.date_issued ?? "").slice(0, 10);
      return isIsoDate(day) && day >= period.start && day <= period.end;
    })
    .sort((a, b) => String(a.transaction_id).localeCompare(String(b.transaction_id)));
  const withFiles = inPeriod.map((record) => files.get(record.transaction_id)?.primary).filter((file) => file?.downloadable);
  return { transaction_ids: inPeriod.map((record) => record.transaction_id), files: withFiles.slice(0, spec.max_files), truncated: withFiles.length > spec.max_files };
}

// ---------------- ready-made starting points ----------------

export const STANDING_TEMPLATES = [
  {
    template_id: "monthly_bank_reconciliation",
    name: "Monthly bank reconciliation",
    description: "On the 5th, ask for last month's bank statement to be reconciled against the books.",
    schedule: { frequency: "MONTHLY", day_of_month: 5, business_day: "NEXT", covers: "PREVIOUS" },
    input: { mode: "LATEST_DOCUMENT", document_type: "BANK", title_contains: "statement" },
    action: { request_type_id: "bank_reconciliation", title_template: "Bank reconciliation for {period_label}", instructions_template: "Reconcile the bank statement for {period_label} ({period_start} to {period_end}) against the ledger and list every difference.", priority: "NORMAL", due_in_days: 5 }
  },
  {
    template_id: "weekly_receivables_followup",
    name: "Weekly receivables follow-up",
    description: "Every Monday, prepare follow-ups for invoices still unpaid.",
    schedule: { frequency: "WEEKLY", weekday: 1, business_day: "NEXT", covers: "PREVIOUS" },
    input: { mode: "TRANSACTIONS", transaction_type: "INV", max_files: 10 },
    action: { request_type_id: "receivables_prepare", title_template: "Receivables follow-up, {period_label}", instructions_template: "Prepare collection follow-ups for invoices issued in the {period_label} that are still unpaid, plus any older overdue ones. Drafts only; the owner sends them.", priority: "NORMAL", due_in_days: 2 }
  },
  {
    template_id: "quarterly_supplier_evaluation",
    name: "Quarterly supplier evaluation",
    description: "In the first month of each quarter, review how suppliers performed last quarter.",
    schedule: { frequency: "QUARTERLY", day_of_month: 10, business_day: "NEXT", covers: "PREVIOUS", quarter_offset: 0 },
    input: { mode: "TRANSACTIONS", transaction_type: "GRN", max_files: 10 },
    action: { request_type_id: "payables_prepare", title_template: "Supplier evaluation for {period_label}", instructions_template: "Review supplier delivery and billing performance for {period_label} using the goods received notes in the register, and list any supplier that needs a conversation.", priority: "NORMAL", due_in_days: 14 }
  },
  {
    template_id: "monthly_management_summary",
    name: "Monthly management summary",
    description: "On the 7th, prepare last month's management summary for the owner.",
    schedule: { frequency: "MONTHLY", day_of_month: 7, business_day: "NEXT", covers: "PREVIOUS" },
    input: { mode: "NONE" },
    action: { request_type_id: "finance_analysis", title_template: "Management summary for {period_label}", instructions_template: "Prepare the management summary for {period_label} ({period_start} to {period_end}): revenue, costs, cash position and what needs the owner's attention.", priority: "NORMAL", due_in_days: 5 }
  }
];

export const standingTemplateById = (id) => STANDING_TEMPLATES.find((template) => template.template_id === id) ?? null;
