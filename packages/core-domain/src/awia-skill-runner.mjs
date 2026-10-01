// ADR-092 W3 (B4, 2026-10-01): the skill runner -- hired workers actually do the work.
//
// Until W3 the five deterministic skill modules (ARO-01, FAO-11, SAO-03, OPO-09, ARO-10) were only
// ever called by smoke scripts; in real use "Get their draft" saved an empty placeholder. This
// registry connects each module to the owner's real inputs: the work request's brief, the
// per-skill form fields the owner filled in (input_fields), and the uploaded files in each named
// slot (file_slots, e.g. FAO-11's bank statement + book entries, read via tabular-file-reader).
//
// Boundaries (unchanged, AGENTS principles 6 & 7): every module stays deterministic; the result
// is only ever a DRAFT for human review (the caller stores it through
// produceAwiaStaffOutputDraftRecord, final_issue_allowed: false, Class A still gated); nothing is
// posted, sent, dispatched or written back anywhere. No LLM is involved (decision D4 -- that is
// W5, separately authorized). Skills without a module here are not runnable: the owner attaches
// the finished output file instead -- no fake drafts.
//
// Pure functions: the API fetches file bytes from storage and passes them in; this module never
// touches storage, the store or the network.

import { triageAdministrativeRequest, validateAro01TriageOutput, aro01TriageCategories } from "./awia-virtual-staff-aro01-request-triage.mjs";
import { reconcileAccountEntries, validateFao11ReconciliationOutput } from "./awia-virtual-staff-fao11-account-reconciliation.mjs";
import { qualifyAndScoreLead, validateSao03QualificationOutput } from "./awia-virtual-staff-sao03-lead-qualification-scoring.mjs";
import { assignTaskToCapacity, validateOpo09AssignmentOutput } from "./awia-virtual-staff-opo09-task-capacity-assignment.mjs";
import { prepareOnboardingChecklist, validateAro10OnboardingOutput, requiredOnboardingDocuments } from "./awia-virtual-staff-aro10-employee-onboarding-administration.mjs";
import { readTabularFile, isTabularFile, parseAmount, normalizeDateCell, pickColumn, toCsv, TabularReadError } from "./tabular-file-reader.mjs";

export const skillRunnerBoundary = "deterministic_skill_execution_draft_only_no_autonomous_action";
const MAX_ROWS = 20000;
const MAX_TEXT_INPUT_BYTES = 200 * 1024;

// Thrown when the owner's inputs are not enough to run the skill. `missing` lists what to add, in
// plain English, so the Workdesk can say exactly what is needed. The item stays where it is.
export class SkillInputError extends Error {
  constructor(message, missing = []) {
    super(message);
    this.code = "SKILL_INPUT_REQUIRED";
    this.missing = missing;
  }
}

const ONBOARDING_DOCUMENT_LABELS = {
  employment_contract_signed: "Signed employment contract",
  identity_document_verified: "Identity document verified",
  bank_details_provided: "Bank details provided",
  tax_form_submitted: "Tax form submitted",
  emergency_contact_provided: "Emergency contact provided"
};

const humanCategory = (value) => String(value ?? "").toLowerCase().replace(/_/g, " ");

// ---------------------------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------------------------
const runners = {
  "ARO-01": {
    run_label: "Triage it",
    input_fields: [
      { name: "category_hint", label: "Category (optional — leave blank to let the Clerk decide)", type: "select", options: aro01TriageCategories.map((value) => ({ value, label: humanCategory(value) })) }
    ],
    file_slots: [
      { role: "request_text", label: "The request as a text file (optional)", required: false, accept: ".txt", help: "The title and instructions are always read; a .txt copy of the email or memo is read too." }
    ],
    run({ title, instructions, form_inputs, files }) {
      const texts = files.filter((file) => /\.txt$/i.test(file.filename)).map((file) => file.buffer.subarray(0, MAX_TEXT_INPUT_BYTES).toString("utf8"));
      const body = [instructions ?? "", ...texts].join("\n\n").trim();
      const payload = triageAdministrativeRequest({ request_subject: title ?? "", request_body: body, category_hint: form_inputs.category_hint || null });
      return {
        payload,
        validate: validateAro01TriageOutput,
        title: `Triage — ${title}`,
        summary: `${humanCategory(payload.category)}, ${payload.priority.toLowerCase()} priority → ${humanCategory(payload.routed_to)}`,
        rows: [["Field", "Value"], ["Request", title], ["Category", payload.category], ["Priority", payload.priority], ["Route to", payload.routed_to], ["Matched keywords", payload.matched_keywords.join("; ")], ["Rationale", payload.rationale], ["Text files read", texts.length], ["Boundary", "Recommendation only — nothing has been dispatched."]],
        input_notes: [`${texts.length} text file(s) read with the brief.`]
      };
    }
  },

  "FAO-11": {
    run_label: "Reconcile",
    input_fields: [],
    file_slots: [
      { role: "bank_statement", label: "Bank statement (CSV or Excel)", required: true, accept: ".csv,.xlsx", help: "Columns: date, reference, and amount — or separate debit/credit (withdrawal/deposit) columns." },
      { role: "book_entries", label: "Book / ledger entries (CSV or Excel)", required: true, accept: ".csv,.xlsx", help: "Columns: date, reference, and amount — or separate debit/credit columns (cash book)." }
    ],
    run({ title, filesByRole }) {
      const bank = readEntries(filesByRole.bank_statement, "bank");
      const book = readEntries(filesByRole.book_entries, "book");
      const payload = reconcileAccountEntries({ book_entries: book.entries, bank_entries: bank.entries });
      payload.inputs = { bank_statement: bank.note, book_entries: book.note };
      const bookById = new Map(book.entries.map((entry) => [entry.entry_id, entry]));
      const bankById = new Map(bank.entries.map((entry) => [entry.entry_id, entry]));
      const detail = [];
      for (const m of payload.mismatches) detail.push(entryRow("AMOUNT MISMATCH", m.reference, bookById.get(m.book_entry_id), bankById.get(m.bank_entry_id), m.variance));
      for (const id of payload.unmatched_book_entries) detail.push(entryRow("IN BOOKS, NOT IN BANK", bookById.get(id)?.reference, bookById.get(id), null, bookById.get(id)?.amount));
      for (const id of payload.unmatched_bank_entries) detail.push(entryRow("IN BANK, NOT IN BOOKS", bankById.get(id)?.reference, null, bankById.get(id), -(bankById.get(id)?.amount ?? 0)));
      for (const m of payload.matched) detail.push(entryRow("MATCHED", m.reference, bookById.get(m.book_entry_id), bankById.get(m.bank_entry_id), 0));
      return {
        payload,
        validate: validateFao11ReconciliationOutput,
        title: `Bank reconciliation — ${title}`,
        summary: payload.reconciled
          ? `Reconciled: all ${payload.matched.length} entries match.`
          : `${payload.matched.length} matched, ${payload.mismatches.length} amount mismatch(es), ${payload.unmatched_book_entries.length} only in books, ${payload.unmatched_bank_entries.length} only in bank — difference ${payload.variance_total.toFixed(2)}.`,
        rows: [
          ["Bank reconciliation (draft for review — nothing has been posted)"],
          ["Book total", payload.book_total.toFixed(2)],
          ["Bank total", payload.bank_total.toFixed(2)],
          ["Difference (book − bank)", payload.variance_total.toFixed(2)],
          ["Reconciled", payload.reconciled ? "YES" : "NO"],
          ["Bank file", `${bank.note.filename} — ${bank.note.rows_used} rows used, ${bank.note.rows_skipped} skipped`],
          ["Book file", `${book.note.filename} — ${book.note.rows_used} rows used, ${book.note.rows_skipped} skipped`],
          [],
          ["Status", "Reference", "Book row", "Book date", "Book amount", "Bank row", "Bank date", "Bank amount", "Difference"],
          ...detail
        ],
        input_notes: [bank.note.summary, book.note.summary]
      };
    }
  },

  "SAO-03": {
    run_label: "Score the lead",
    input_fields: [
      { name: "budget_confirmed", label: "Budget confirmed?", type: "boolean" },
      { name: "decision_maker_engaged", label: "Talking to the decision-maker?", type: "boolean" },
      { name: "timeline_days", label: "Expected start (days from now)", type: "number", min: 0 },
      { name: "industry_fit", label: "Fit with your industry focus", type: "select", required: true, options: [{ value: "HIGH", label: "High" }, { value: "MEDIUM", label: "Medium" }, { value: "LOW", label: "Low" }] },
      { name: "company_size_employees", label: "Company size (employees)", type: "number", min: 0 }
    ],
    file_slots: [],
    run({ title, form_inputs }) {
      requireFields(this.input_fields, form_inputs);
      const payload = qualifyAndScoreLead({
        budget_confirmed: form_inputs.budget_confirmed === true,
        decision_maker_engaged: form_inputs.decision_maker_engaged === true,
        timeline_days: numberOrNull(form_inputs.timeline_days),
        industry_fit: form_inputs.industry_fit,
        company_size_employees: numberOrNull(form_inputs.company_size_employees)
      });
      const c = payload.score_components;
      return {
        payload,
        validate: validateSao03QualificationOutput,
        title: `Lead score — ${title}`,
        summary: `${payload.tier} lead, score ${payload.score}/100. Next: ${payload.recommended_next_action}`,
        rows: [["Field", "Value"], ["Lead", title], ["Score", `${payload.score}/100`], ["Tier", payload.tier], ["Budget confirmed", c.budget_confirmed], ["Decision-maker engaged", c.decision_maker_engaged], ["Timeline", c.timeline], ["Industry fit", c.industry_fit], ["Company size", c.company_size], ["Recommended next step", payload.recommended_next_action], ["Boundary", "Recommendation only — no CRM change has been made."]],
        input_notes: []
      };
    }
  },

  "OPO-09": {
    run_label: "Plan the assignment",
    input_fields: [
      { name: "task_type", label: "Type of task (must match a skill tag in the queue list)", type: "text", required: true, placeholder: "e.g. site_inspection" },
      { name: "urgent", label: "Urgent?", type: "boolean" }
    ],
    file_slots: [
      { role: "queues", label: "Team queues and capacity (CSV or Excel)", required: true, accept: ".csv,.xlsx", help: "Columns: queue_id, skill_tags (separated by ; or |), capacity_remaining." }
    ],
    run({ title, form_inputs, filesByRole }) {
      requireFields(this.input_fields, form_inputs);
      const queues = readQueues(filesByRole.queues);
      const payload = assignTaskToCapacity({ task_type: String(form_inputs.task_type).trim(), urgent: form_inputs.urgent === true, queues: queues.queues });
      payload.inputs = { queues: queues.note };
      return {
        payload,
        validate: validateOpo09AssignmentOutput,
        title: `Capacity plan — ${title}`,
        summary: payload.capacity_status === "ASSIGNED" ? `Recommend queue ${payload.assigned_queue_id} (${payload.priority.toLowerCase()} priority).` : `${humanCategory(payload.capacity_status)} — needs your decision.`,
        rows: [["Field", "Value"], ["Task", title], ["Task type", payload.task_type], ["Recommendation", payload.assigned_queue_id], ["Capacity status", payload.capacity_status], ["Priority", payload.priority], ["Rationale", payload.rationale], [], ["Queue", "Skill tags", "Capacity remaining"], ...queues.queues.map((q) => [q.queue_id, q.skill_tags.join("; "), q.capacity_remaining])],
        input_notes: [queues.note.summary]
      };
    }
  },

  "ARO-10": {
    run_label: "Prepare the checklist",
    input_fields: [
      { name: "new_hire_role", label: "New hire's role", type: "text", required: true, placeholder: "e.g. Site supervisor" },
      { name: "start_date", label: "Start date", type: "date", required: true },
      { name: "documents_received", label: "Documents already received", type: "multiselect", options: requiredOnboardingDocuments.map((value) => ({ value, label: ONBOARDING_DOCUMENT_LABELS[value] ?? humanCategory(value) })) },
      { name: "responsible_administrator_id", label: "Who is doing the onboarding admin", type: "text", required: true, help: "Name or staff ID — used only to check it is not the hiring manager (segregation of duties). Not printed on the output." },
      { name: "hiring_manager_id", label: "Hiring manager", type: "text", required: true, help: "Name or staff ID — used only for the same check." }
    ],
    file_slots: [],
    run({ form_inputs }) {
      requireFields(this.input_fields, form_inputs);
      const canonical = (value) => String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
      const payload = prepareOnboardingChecklist({
        new_hire_role: String(form_inputs.new_hire_role).trim(),
        start_date: String(form_inputs.start_date).trim(),
        documents_received: Array.isArray(form_inputs.documents_received) ? form_inputs.documents_received : [],
        responsible_administrator_id: canonical(form_inputs.responsible_administrator_id),
        hiring_manager_id: canonical(form_inputs.hiring_manager_id)
      });
      return {
        payload,
        validate: validateAro10OnboardingOutput,
        title: `Onboarding checklist — ${payload.new_hire_role}`,
        summary: payload.sod_conflict ? "Blocked: the onboarding administrator is also the hiring manager." : payload.missing_documents.length ? `${payload.missing_documents.length} document(s) outstanding before onboarding.` : "All documents in — ready to onboard once you approve.",
        rows: [["Field", "Value"], ["Role", payload.new_hire_role], ["Start date", payload.start_date], ["Status", payload.status], ["Segregation-of-duties conflict", payload.sod_conflict ? "YES — needs your review" : "No"], ["Rationale", payload.rationale], [], ["Document", "Received?"], ...requiredOnboardingDocuments.map((doc) => [ONBOARDING_DOCUMENT_LABELS[doc] ?? doc, payload.missing_documents.includes(doc) ? "OUTSTANDING" : "Received"]), [], ["Boundary", "Checklist only — no HR action has been taken. Class A: needs your owner approval."]],
        input_notes: []
      };
    }
  }
};

// ---------------------------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------------------------
export function isRunnableSkill(skillId) {
  return Boolean(skillId && runners[skillId]);
}

// What the New Request form needs to show for a skill (no functions, safe to serialize).
export function describeSkillInputs(skillId) {
  const runner = skillId ? runners[skillId] : null;
  if (!runner) return { runnable: false, run_label: null, input_fields: [], file_slots: [] };
  return { runnable: true, run_label: runner.run_label, input_fields: runner.input_fields.map((field) => ({ ...field })), file_slots: runner.file_slots.map((slot) => ({ ...slot })) };
}

// Keeps only the fields this skill defines, coerced to their declared type. Unknown keys are
// dropped (nothing free-form is persisted on the request beyond what the form defines).
export function sanitizeSkillFormInputs(skillId, raw) {
  const runner = skillId ? runners[skillId] : null;
  if (!runner || !raw || typeof raw !== "object") return {};
  const clean = {};
  for (const field of runner.input_fields) {
    const value = raw[field.name];
    if (value === undefined || value === null || value === "") continue;
    if (field.type === "boolean") clean[field.name] = value === true || value === "true" || value === "yes" || value === "on";
    else if (field.type === "number") { const n = Number(value); if (Number.isFinite(n)) clean[field.name] = n; }
    else if (field.type === "select") { const v = String(value); if (field.options.some((o) => o.value === v)) clean[field.name] = v; }
    else if (field.type === "multiselect") { const list = (Array.isArray(value) ? value : [value]).map(String); clean[field.name] = field.options.map((o) => o.value).filter((v) => list.includes(v)); }
    else if (field.type === "date") { const v = String(value).trim(); if (/^\d{4}-\d{2}-\d{2}$/.test(v)) clean[field.name] = v; }
    else clean[field.name] = String(value).trim().slice(0, 500);
  }
  return clean;
}

// Validates a { file_id: role } map against the skill's slots and the request's own files.
export function sanitizeFileRoles(skillId, raw, allowedFileIds) {
  const runner = skillId ? runners[skillId] : null;
  if (!runner || !raw || typeof raw !== "object") return {};
  const roles = new Set(runner.file_slots.map((slot) => slot.role));
  const allowed = new Set(allowedFileIds);
  return Object.fromEntries(Object.entries(raw).filter(([fileId, role]) => allowed.has(fileId) && roles.has(role)));
}

// Runs the skill over the owner's inputs. `files` = [{ id, filename, mime_type, sha256, buffer }]
// in the order they were attached (a later file wins a slot). Returns the draft payload, the CSV
// output bytes and a plain-English summary; throws SkillInputError when inputs are missing.
export function runSkill(skillId, { title = "", instructions = "", form_inputs = {}, file_roles = {}, files = [] } = {}) {
  const runner = runners[skillId];
  if (!runner) throw new SkillInputError("This kind of work cannot be run automatically yet — attach the finished output file instead.", []);
  const filesByRole = assignFilesToSlots(runner, files, file_roles);
  const missingFiles = runner.file_slots.filter((slot) => slot.required && !filesByRole[slot.role]).map((slot) => slot.label);
  if (missingFiles.length) throw new SkillInputError(`Add the missing file${missingFiles.length > 1 ? "s" : ""}: ${missingFiles.join("; ")}.`, missingFiles);
  let result;
  try {
    result = runner.run.call(runner, { title, instructions, form_inputs: form_inputs ?? {}, files, filesByRole });
  } catch (error) {
    if (error instanceof TabularReadError) throw new SkillInputError(error.message, [error.message]);
    throw error;
  }
  const check = result.validate(result.payload);
  if (!check.ok) throw new Error(`Skill ${skillId} produced an invalid output: ${check.findings.map((f) => f.code).join(", ")}`);
  return {
    skill_id: skillId,
    payload: result.payload,
    output_title: result.title.slice(0, 200),
    output_summary: result.summary,
    output_csv: Buffer.from(toCsv(result.rows), "utf8"),
    output_filename: `${skillId}-${slugify(title) || "output"}.csv`,
    input_notes: result.input_notes.filter(Boolean),
    input_files: Object.entries(filesByRole).map(([role, file]) => ({ role, file_id: file.id, filename: file.filename, sha256: file.sha256 ?? null })),
    boundary: skillRunnerBoundary
  };
}

// ---------------------------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------------------------
function assignFilesToSlots(runner, files, fileRoles) {
  const byRole = {};
  const slots = runner.file_slots;
  const used = () => new Set(Object.values(byRole));
  for (const file of files) {
    const role = fileRoles?.[file.id];
    if (role && slots.some((slot) => slot.role === role)) byRole[role] = file;
  }
  // Files the owner did not label: match by name first, then fill a single remaining slot.
  const unlabelled = files.filter((file) => !fileRoles?.[file.id]);
  const guesses = { bank_statement: /bank|statement|stmt/i, book_entries: /book|ledger|cash ?book|\bgl\b/i, queues: /queue|capacity|team/i, request_text: /\.txt$/i };
  for (const slot of slots) {
    if (byRole[slot.role]) continue;
    const taken = used();
    const match = [...unlabelled].reverse().find((file) => guesses[slot.role]?.test(file.filename) && slotAccepts(slot, file) && !taken.has(file));
    if (match) byRole[slot.role] = match;
  }
  const openSlots = slots.filter((slot) => slot.required && !byRole[slot.role]);
  if (openSlots.length === 1) {
    const taken = used();
    const candidates = unlabelled.filter((file) => !taken.has(file) && slotAccepts(openSlots[0], file));
    if (candidates.length === 1) byRole[openSlots[0].role] = candidates[0];
  }
  return byRole;
}

function slotAccepts(slot, file) {
  const exts = String(slot.accept ?? "").split(",").map((ext) => ext.trim().toLowerCase()).filter(Boolean);
  return !exts.length || exts.some((ext) => file.filename.toLowerCase().endsWith(ext));
}

function requireFields(fields, inputs) {
  const missing = fields.filter((field) => field.required && (inputs?.[field.name] === undefined || inputs[field.name] === null || inputs[field.name] === "")).map((field) => field.label);
  if (missing.length) throw new SkillInputError(`Fill in: ${missing.join("; ")}.`, missing);
}

function numberOrNull(value) {
  const n = Number(value);
  return value === undefined || value === null || value === "" || !Number.isFinite(n) ? null : n;
}

function slugify(text) {
  return String(text ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
}

function readTable(file) {
  if (!isTabularFile(file)) throw new SkillInputError(`${file.filename} is not a spreadsheet — upload it as .csv or .xlsx.`, [file.filename]);
  const table = readTabularFile(file);
  if (table.rows.length > MAX_ROWS) throw new SkillInputError(`${file.filename} has ${table.rows.length} rows; the limit is ${MAX_ROWS}. Split it by period.`, [file.filename]);
  return table;
}

// Bank/book entries. Sign convention when there is no single amount column: on a bank statement a
// credit (deposit) increases the balance; in the cash book a debit (receipt) does. So
// bank = credit - debit and book = debit - credit, which puts both on the same footing.
function readEntries(file, side) {
  const table = readTable(file);
  const h = table.headers;
  const referenceCol = pickColumn(h, ["reference", "ref", "ref_no", "reference_no", "invoice_no", "invoice", "cheque_no", "doc_no", "document_no", "transaction_id"]);
  const descriptionCol = pickColumn(h, ["description", "particulars", "details", "narration", "memo"]);
  const dateCol = pickColumn(h, ["date", "txn_date", "transaction_date", "value_date", "posting_date"]);
  const amountCol = pickColumn(h, ["amount", "amt", "net_amount", "value"]);
  const debitCol = amountCol ? null : pickColumn(h, ["debit", "dr", "withdrawal", "withdrawals", "money_out", "payments"]);
  const creditCol = amountCol ? null : pickColumn(h, ["credit", "cr", "deposit", "deposits", "money_in", "receipts"]);
  const label = side === "bank" ? "bank statement" : "book entries";
  if (!amountCol && !debitCol && !creditCol) throw new SkillInputError(`${file.filename} (${label}) has no amount column. Found columns: ${h.join(", ")}. Add an "amount" column or "debit"/"credit" columns.`, [file.filename]);
  const matchCol = referenceCol ?? descriptionCol;
  if (!matchCol) throw new SkillInputError(`${file.filename} (${label}) has no reference column. Found columns: ${h.join(", ")}. Add a "reference" column so entries can be matched.`, [file.filename]);
  const blank = (value) => value === undefined || String(value).trim() === "";
  const entries = [];
  let skipped = 0;
  for (const row of table.rows) {
    let amount;
    if (amountCol) amount = parseAmount(row[amountCol]);
    else if (blank(row[debitCol]) && blank(row[creditCol])) amount = null;
    else {
      const debit = parseAmount(row[debitCol]) ?? 0;
      const credit = parseAmount(row[creditCol]) ?? 0;
      amount = Math.round((side === "bank" ? credit - debit : debit - credit) * 100) / 100;
    }
    if (amount === null) { skipped += 1; continue; }
    // Blank reference: fall back to the description (e.g. "Bank charge"), else a unique placeholder.
    const reference = String(row[matchCol] ?? "").trim() || (descriptionCol ? String(row[descriptionCol] ?? "").trim() : "") || `(no reference, ${side} row ${row.__row})`;
    entries.push({ entry_id: `${side}-row-${row.__row}`, row: row.__row, date: dateCol ? normalizeDateCell(row[dateCol]) : "", amount, reference });
  }
  if (!entries.length) throw new SkillInputError(`${file.filename} (${label}) has no rows with an amount.`, [file.filename]);
  const columns = amountCol ? `amount "${amountCol}"` : `debit "${debitCol ?? "-"}", credit "${creditCol ?? "-"}"`;
  return {
    entries,
    note: { file_id: file.id, filename: file.filename, rows_used: entries.length, rows_skipped: skipped, reference_column: matchCol, amount_columns: columns, summary: `${file.filename}: ${entries.length} ${label} rows read (${skipped} without an amount skipped); matched on "${matchCol}", ${columns}.` }
  };
}

function readQueues(file) {
  const table = readTable(file);
  const h = table.headers;
  const idCol = pickColumn(h, ["queue_id", "queue", "name", "team", "worker"]);
  const tagsCol = pickColumn(h, ["skill_tags", "skills", "tags", "task_types"]);
  const capCol = pickColumn(h, ["capacity_remaining", "capacity", "remaining", "available"]);
  const missing = [!idCol && "queue_id", !tagsCol && "skill_tags", !capCol && "capacity_remaining"].filter(Boolean);
  if (missing.length) throw new SkillInputError(`${file.filename} is missing column(s): ${missing.join(", ")}. Found columns: ${h.join(", ")}.`, [file.filename]);
  const queues = table.rows
    .filter((row) => String(row[idCol] ?? "").trim())
    .map((row) => ({ queue_id: String(row[idCol]).trim(), skill_tags: String(row[tagsCol] ?? "").split(/[;|/]/).map((tag) => tag.trim()).filter(Boolean), capacity_remaining: parseAmount(row[capCol]) ?? 0 }));
  if (!queues.length) throw new SkillInputError(`${file.filename} lists no queues.`, [file.filename]);
  return { queues, note: { file_id: file.id, filename: file.filename, queues_read: queues.length, summary: `${file.filename}: ${queues.length} queue(s) read.` } };
}

function entryRow(status, reference, book, bank, difference) {
  return [status, reference ?? "", book?.row ?? "", book?.date ?? "", book ? book.amount.toFixed(2) : "", bank?.row ?? "", bank?.date ?? "", bank ? bank.amount.toFixed(2) : "", Number(difference ?? 0).toFixed(2)];
}
