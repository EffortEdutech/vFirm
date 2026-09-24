// HM-S4 item 3 pilot skill: Bookkeeper (FAO) / FAO-11 Account Reconciliation.
// Deterministic, reference-and-amount matching of a set of book (ledger)
// entries against a set of bank statement entries -- no PII, no SOD, Class B
// per the position catalogue (awia-virtual-staff-position-catalogue.mjs).
// This module is pure matching logic only: it produces a structured
// reconciliation result for a human (or a downstream workdesk item) to act
// on -- it never posts, adjusts, or writes back to any ledger or bank feed.
// Mirrors the HM-S2 ARO-01 triage module's shape and boundary discipline
// (awia-virtual-staff-aro01-request-triage.mjs). Wired into the output-draft
// pipeline (apps/api/src/store.mjs) via the generic output_payload field, and
// into task assignment via skill_id "FAO-11" -- the position-scope check
// added in HM-S4 item 2 (assignAwiaVirtualStaffTaskRecord) is what actually
// authorizes this skill at runtime; no defaultToolPolicyByRole edit was
// needed because that item 2 fix already supersedes the coarse per-role
// tool/action allowlist for any skill-scoped call once position scope is
// confirmed.

export const fao11ReconciliationBoundary = "deterministic_matching_only_no_autonomous_posting_or_adjustment";

const AMOUNT_TOLERANCE = 0.005; // half a cent, to absorb floating-point noise only

function normalizeReference(reference) {
  return String(reference ?? "").trim().toLowerCase();
}

export function reconcileAccountEntries({ book_entries = [], bank_entries = [] } = {}) {
  const bankByReference = new Map();
  for (const entry of bank_entries) {
    const key = normalizeReference(entry.reference);
    if (!bankByReference.has(key)) bankByReference.set(key, []);
    bankByReference.get(key).push(entry);
  }

  const matched = [];
  const mismatches = [];
  const unmatched_book_entries = [];
  const claimedBankEntryIds = new Set();

  for (const bookEntry of book_entries) {
    const key = normalizeReference(bookEntry.reference);
    const candidates = (bankByReference.get(key) ?? []).filter((entry) => !claimedBankEntryIds.has(entry.entry_id));
    const bankEntry = candidates[0] ?? null;

    if (!bankEntry) {
      unmatched_book_entries.push(bookEntry.entry_id);
      continue;
    }

    claimedBankEntryIds.add(bankEntry.entry_id);
    const variance = Math.round((bookEntry.amount - bankEntry.amount) * 100) / 100;

    if (Math.abs(variance) <= AMOUNT_TOLERANCE) {
      matched.push({ reference: bookEntry.reference, amount: bookEntry.amount, book_entry_id: bookEntry.entry_id, bank_entry_id: bankEntry.entry_id });
    } else {
      mismatches.push({ reference: bookEntry.reference, book_entry_id: bookEntry.entry_id, bank_entry_id: bankEntry.entry_id, book_amount: bookEntry.amount, bank_amount: bankEntry.amount, variance });
    }
  }

  const unmatched_bank_entries = bank_entries.filter((entry) => !claimedBankEntryIds.has(entry.entry_id)).map((entry) => entry.entry_id);

  const book_total = round2(book_entries.reduce((sum, entry) => sum + entry.amount, 0));
  const bank_total = round2(bank_entries.reduce((sum, entry) => sum + entry.amount, 0));
  const variance_total = round2(book_total - bank_total);

  const reconciled = mismatches.length === 0 && unmatched_book_entries.length === 0 && unmatched_bank_entries.length === 0;

  return {
    matched,
    mismatches,
    unmatched_book_entries,
    unmatched_bank_entries,
    book_total,
    bank_total,
    variance_total,
    reconciled,
    rationale: reconciled
      ? `All ${matched.length} book entr${matched.length === 1 ? "y" : "ies"} matched to bank entries by reference and amount; no variance.`
      : `${matched.length} matched, ${mismatches.length} amount mismatch(es), ${unmatched_book_entries.length} unmatched book entr${unmatched_book_entries.length === 1 ? "y" : "ies"}, ${unmatched_bank_entries.length} unmatched bank entr${unmatched_bank_entries.length === 1 ? "y" : "ies"} -- needs human review before close.`,
    boundary: fao11ReconciliationBoundary
  };
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

export function validateFao11ReconciliationOutput(output) {
  const findings = [];
  if (!output || typeof output !== "object") return { ok: false, findings: [{ code: "OUTPUT_REQUIRED", severity: "ERROR" }] };
  if (!Array.isArray(output.matched)) findings.push({ code: "MATCHED_ARRAY_REQUIRED", severity: "ERROR" });
  if (!Array.isArray(output.mismatches)) findings.push({ code: "MISMATCHES_ARRAY_REQUIRED", severity: "ERROR" });
  if (!Array.isArray(output.unmatched_book_entries)) findings.push({ code: "UNMATCHED_BOOK_ARRAY_REQUIRED", severity: "ERROR" });
  if (!Array.isArray(output.unmatched_bank_entries)) findings.push({ code: "UNMATCHED_BANK_ARRAY_REQUIRED", severity: "ERROR" });
  if (typeof output.book_total !== "number" || !Number.isFinite(output.book_total)) findings.push({ code: "BOOK_TOTAL_REQUIRED", severity: "ERROR" });
  if (typeof output.bank_total !== "number" || !Number.isFinite(output.bank_total)) findings.push({ code: "BANK_TOTAL_REQUIRED", severity: "ERROR" });
  if (typeof output.reconciled !== "boolean") findings.push({ code: "RECONCILED_FLAG_REQUIRED", severity: "ERROR" });
  if (!output.rationale) findings.push({ code: "RATIONALE_REQUIRED", severity: "ERROR" });
  if (findings.length === 0) {
    const expectedReconciled = output.mismatches.length === 0 && output.unmatched_book_entries.length === 0 && output.unmatched_bank_entries.length === 0;
    if (output.reconciled !== expectedReconciled) findings.push({ code: "RECONCILED_FLAG_INCONSISTENT", severity: "ERROR", expected: expectedReconciled, got: output.reconciled });
  }
  return { ok: findings.length === 0, findings };
}

export function verifyFao11ReconciliationFixtures() {
  const fixtures = [
    {
      name: "fully_matched",
      input: {
        book_entries: [{ entry_id: "book-1", date: "2026-09-01", amount: 500, reference: "INV-1001" }, { entry_id: "book-2", date: "2026-09-02", amount: 120.5, reference: "INV-1002" }],
        bank_entries: [{ entry_id: "bank-1", date: "2026-09-02", amount: 500, reference: "INV-1001" }, { entry_id: "bank-2", date: "2026-09-03", amount: 120.5, reference: "INV-1002" }]
      },
      expectedReconciled: true
    },
    {
      name: "amount_mismatch",
      input: {
        book_entries: [{ entry_id: "book-3", date: "2026-09-01", amount: 300, reference: "INV-2001" }],
        bank_entries: [{ entry_id: "bank-3", date: "2026-09-01", amount: 290, reference: "INV-2001" }]
      },
      expectedReconciled: false
    },
    {
      name: "unmatched_both_sides",
      input: {
        book_entries: [{ entry_id: "book-4", date: "2026-09-01", amount: 75, reference: "INV-3001" }],
        bank_entries: [{ entry_id: "bank-4", date: "2026-09-01", amount: 50, reference: "INV-9999" }]
      },
      expectedReconciled: false
    }
  ];
  const failures = [];
  for (const fixture of fixtures) {
    const result = reconcileAccountEntries(fixture.input);
    const validation = validateFao11ReconciliationOutput(result);
    if (!validation.ok) {
      failures.push({ fixture: fixture.name, reason: "invalid_output", findings: validation.findings });
    } else if (result.reconciled !== fixture.expectedReconciled) {
      failures.push({ fixture: fixture.name, reason: "reconciled_flag_mismatch", expected: fixture.expectedReconciled, got: result.reconciled });
    }
  }
  return { ok: failures.length === 0, fixtures_checked: fixtures.length, failures };
}
