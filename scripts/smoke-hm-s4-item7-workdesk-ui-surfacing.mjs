import assert from "node:assert/strict";
import { readFile, mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { reconcileAccountEntries } from "../packages/core-domain/src/awia-virtual-staff-fao11-account-reconciliation.mjs";
import { qualifyAndScoreLead } from "../packages/core-domain/src/awia-virtual-staff-sao03-lead-qualification-scoring.mjs";
import { assignTaskToCapacity } from "../packages/core-domain/src/awia-virtual-staff-opo09-task-capacity-assignment.mjs";
import { prepareOnboardingChecklist } from "../packages/core-domain/src/awia-virtual-staff-aro10-employee-onboarding-administration.mjs";
import { triageAdministrativeRequest } from "../packages/core-domain/src/awia-virtual-staff-aro01-request-triage.mjs";

// HM-S4 item 7 (ADR-087 candidate continued): My Team / Workdesk UI
// surfacing for all four new pilots, plus HR Administrator's distinct
// pending-Class-A-approval state -- verified against the REAL, EXACT
// function source shipped in apps/web-console/public/js/{pages-owner,ui}.js,
// not a reimplementation of the same logic. Both edited functions
// (summarizeOutputPayload, workdeskStatusLabel) and the STATUS_TONE-driven
// statusPill/pill helpers have zero external module dependencies, so this
// test extracts their exact source text from the real files (rather than
// importing pages-owner.js directly, which transitively imports a live
// Supabase client via api.js -> auth.js and would need real network/browser
// globals unrelated to what item 7 actually changed) and loads it as a
// real ES module, then exercises it with the REAL output_payload shapes
// produced by each pilot's own core-domain module (not hand-typed fixtures
// pretending to be those shapes).
//
// Proves:
//   1. summarizeOutputPayload() renders each of the five real pilot output
//      shapes (ARO-01, FAO-11, SAO-03, OPO-09, ARO-10) correctly, including
//      two ARO-10 branches (documents outstanding, SOD conflict) and never
//      leaks a field the module itself doesn't carry.
//   2. workdeskStatusLabel() surfaces CLASS_A_APPROVAL_PENDING distinctly
//      when a Class A output draft is pending approval, but falls back to
//      the item's real workdesk_status once approved or for a Class B item.
//   3. The three new STATUS_TONE entries added for this render the correct
//      pill tone classes (amber for pending, moss for approved, rose for
//      denied) via the real statusPill()/pill() functions, not a copy.

const root = process.cwd();
const tmp = await mkdtemp(join(tmpdir(), "vfirm-hm-s4-item7-"));

function extractBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `Could not find "${startMarker}" in source.`);
  const end = source.indexOf(endMarker, start);
  assert.notEqual(end, -1, `Could not find "${endMarker}" after "${startMarker}".`);
  return source.slice(start, end).trim();
}

// --- Extract the exact function source from the real pages-owner.js ---
const pagesOwnerSource = await readFile(join(root, "apps/web-console/public/js/pages-owner.js"), "utf8");
const summarizeOutputPayloadSrc = extractBetween(pagesOwnerSource, "function summarizeOutputPayload(payload) {", "\n\n// HM-S4 item 7");
const workdeskStatusLabelSrc = extractBetween(pagesOwnerSource, "function workdeskStatusLabel(item, draft) {", "\n\nexport async function mountWorkdesk");
assert.match(summarizeOutputPayloadSrc, /function summarizeOutputPayload\(payload\) \{[\s\S]*\n\}$/, "Extracted summarizeOutputPayload source malformed.");
assert.match(workdeskStatusLabelSrc, /function workdeskStatusLabel\(item, draft\) \{[\s\S]*\n\}$/, "Extracted workdeskStatusLabel source malformed.");

// --- Extract the exact STATUS_TONE / statusPill / pill / escapeHtml source from the real ui.js ---
const uiSource = await readFile(join(root, "apps/web-console/public/js/ui.js"), "utf8");
const pillSrc = extractBetween(uiSource, "export function pill(text, tone = \"default\") {", "\n\nconst STATUS_TONE");
const statusToneSrc = extractBetween(uiSource, "const STATUS_TONE = {", "\n\nexport function statusPill");
const statusPillSrc = extractBetween(uiSource, "export function statusPill(status) {", "\n\nexport function escapeHtml");
const escapeHtmlSrc = extractBetween(uiSource, "export function escapeHtml(value) {", "\n\nexport function initials");

const harnessPath = join(tmp, "workdesk-harness.mjs");
await writeFile(harnessPath, [
  pillSrc,
  statusToneSrc,
  statusPillSrc,
  escapeHtmlSrc,
  `export ${summarizeOutputPayloadSrc}`,
  `export ${workdeskStatusLabelSrc}`
].join("\n\n"), "utf8");

// pathToFileURL is required for dynamic import() to work on Windows, where a
// bare drive-letter path (e.g. "C:\Users\...\workdesk-harness.mjs") is not a
// valid ESM specifier and throws ERR_UNSUPPORTED_ESM_URL_SCHEME.
const { summarizeOutputPayload, workdeskStatusLabel, statusPill } = await import(pathToFileURL(harnessPath).href);

// --- 1. summarizeOutputPayload against every REAL pilot output shape ---

const aro01Result = triageAdministrativeRequest({ request_subject: "Cannot login to VPN, urgent", request_body: "" });
assert.equal(summarizeOutputPayload(aro01Result), "IT_SUPPORT · HIGH → IT_SUPPORT_QUEUE");

const fao11Reconciled = reconcileAccountEntries({
  book_entries: [{ reference: "INV-1", amount: 100 }],
  bank_entries: [{ reference: "INV-1", amount: 100 }]
});
assert.equal(fao11Reconciled.reconciled, true);
assert.equal(summarizeOutputPayload(fao11Reconciled), "Reconciled · variance 0 · 1 matched, 0 mismatched");

const fao11NotReconciled = reconcileAccountEntries({
  book_entries: [{ reference: "INV-1", amount: 100 }, { reference: "INV-2", amount: 50 }],
  bank_entries: [{ reference: "INV-1", amount: 90 }]
});
assert.equal(fao11NotReconciled.reconciled, false);
assert.match(summarizeOutputPayload(fao11NotReconciled), /^Not reconciled · variance -?\d+/);

const sao03Hot = qualifyAndScoreLead({ budget_confirmed: true, decision_maker_engaged: true, timeline_days: 10, industry_fit: "HIGH", company_size_employees: 200 });
assert.equal(sao03Hot.tier, "HOT");
assert.equal(summarizeOutputPayload(sao03Hot), `HOT · score ${sao03Hot.score}/100`);

const opo09Assigned = assignTaskToCapacity({ task_type: "design_review", urgent: true, queues: [{ queue_id: "design-queue-b", skill_tags: ["design_review"], capacity_remaining: 5 }] });
assert.equal(opo09Assigned.capacity_status, "ASSIGNED");
assert.equal(summarizeOutputPayload(opo09Assigned), "ASSIGNED → design-queue-b");

const aro10Outstanding = prepareOnboardingChecklist({ new_hire_role: "Bookkeeper", start_date: "2026-10-01", documents_received: ["employment_contract_signed"], responsible_administrator_id: "admin-001", hiring_manager_id: "owner-001" });
assert.equal(aro10Outstanding.status, "DOCUMENTS_OUTSTANDING");
assert.equal(summarizeOutputPayload(aro10Outstanding), "DOCUMENTS_OUTSTANDING · 4 document(s) outstanding");
assert.doesNotMatch(summarizeOutputPayload(aro10Outstanding), /Bookkeeper|admin-001|owner-001/, "The rendered preview must never leak the new hire's role/administrator ids beyond the checklist status.");

const aro10SodConflict = prepareOnboardingChecklist({ new_hire_role: "Ops Coordinator", start_date: "2026-11-01", documents_received: ["employment_contract_signed", "identity_document_verified", "bank_details_provided", "tax_form_submitted", "emergency_contact_provided"], responsible_administrator_id: "owner-001", hiring_manager_id: "owner-001" });
assert.equal(aro10SodConflict.status, "SOD_CONFLICT_BLOCKED");
assert.equal(summarizeOutputPayload(aro10SodConflict), "SOD_CONFLICT_BLOCKED · SOD conflict flagged");

// Unrecognized shape still falls back to the generic first-3-keys preview.
assert.equal(summarizeOutputPayload({ alpha: 1, beta: 2, gamma: 3, delta: 4 }), "alpha: 1, beta: 2, gamma: 3");
assert.equal(summarizeOutputPayload(null), null);

// --- 2. workdeskStatusLabel: Class A pending surfaced distinctly ---

const classAPendingDraft = { class_a_approval_required: true, class_a_approval_status: "PENDING" };
const classAApprovedDraft = { class_a_approval_required: true, class_a_approval_status: "APPROVED" };
const classBDraft = { class_a_approval_required: false, class_a_approval_status: null };

assert.equal(workdeskStatusLabel({ workdesk_status: "OUTPUT_DRAFTED" }, classAPendingDraft), "CLASS_A_APPROVAL_PENDING");
assert.equal(workdeskStatusLabel({ workdesk_status: "REVIEW_ACTION_REQUIRED" }, classAApprovedDraft), "REVIEW_ACTION_REQUIRED", "Once Class A approval is granted, the ordinary workdesk_status must be shown again -- not stuck on 'pending'.");
assert.equal(workdeskStatusLabel({ workdesk_status: "OUTPUT_DRAFTED" }, classBDraft), "OUTPUT_DRAFTED", "A Class B item must never show the Class A pending label.");
assert.equal(workdeskStatusLabel({ workdesk_status: "ASSIGNED" }, undefined), "ASSIGNED", "An item with no draft yet must fall back to its real workdesk_status.");

// --- 3. The three new STATUS_TONE entries render the correct pill tone ---

assert.match(statusPill("CLASS_A_APPROVAL_PENDING"), /pill-amber/);
assert.match(statusPill("CLASS_A_APPROVED"), /pill-moss/);
assert.match(statusPill("CLASS_A_DENIED"), /pill-rose/);
assert.match(statusPill("CLASS_A_APPROVAL_PENDING"), />CLASS A APPROVAL PENDING</, "statusPill must still humanize the label (underscores to spaces).");

console.log(JSON.stringify({
  smoke: "hm-s4-item7-workdesk-ui-surfacing",
  result: "passed",
  aro01_preview: summarizeOutputPayload(aro01Result),
  fao11_reconciled_preview: summarizeOutputPayload(fao11Reconciled),
  fao11_not_reconciled_preview: summarizeOutputPayload(fao11NotReconciled),
  sao03_preview: summarizeOutputPayload(sao03Hot),
  opo09_preview: summarizeOutputPayload(opo09Assigned),
  aro10_documents_outstanding_preview: summarizeOutputPayload(aro10Outstanding),
  aro10_sod_conflict_preview: summarizeOutputPayload(aro10SodConflict),
  class_a_pending_label: workdeskStatusLabel({ workdesk_status: "OUTPUT_DRAFTED" }, classAPendingDraft),
  class_a_pending_tone: "amber",
  boundary: "extracted_and_exercised_the_real_shipped_source_no_reimplementation"
}, null, 2));

await rm(tmp, { recursive: true, force: true });
