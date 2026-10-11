// VI-S6 (ADR-114): e-Invoice readiness -- pure rules, no I/O, and NO submission capability of any kind.
//
// vFirm checks whether an invoice carries what a MyInvois e-Invoice needs and says what to fix. It never builds a
// signed document, never talks to LHDN and never submits anything. Rules were confirmed on 2026-10-11 from:
//   - MyInvois SDK, Invoice v1.1 field tables (https://sdk.myinvois.hasil.gov.my/documents/invoice-v1-1/)
//   - IRBM e-Invoice Specific Guideline, version 4.9 (7 September 2026): general/placeholder TINs, consolidated rules
//   - LHDN e-Invoice FAQs, updated 4 September 2026: phases, RM3 million exemption, interim relaxation periods
// Every check states what it needs and where to add it. A value vFirm does not hold is UNKNOWN, never guessed.

export const SPEC = {
  checked_on: "2026-10-11",
  sources: [
    { name: "MyInvois SDK, Invoice v1.1", url: "https://sdk.myinvois.hasil.gov.my/documents/invoice-v1-1/" },
    { name: "IRBM e-Invoice Specific Guideline, version 4.9 (7 September 2026)", url: "https://www.hasil.gov.my/wp-content/uploads/IRBM-e-Invoice-Specific-Guideline.pdf" },
    { name: "LHDN e-Invoice FAQs, updated 4 September 2026", url: "https://www.hasil.gov.my/wp-content/uploads/lhdnm-e-invoice-general-faqs.pdf" }
  ],
  invoice_version: "1.1",
  consolidated_single_limit: 10000,
  consolidated_days_after_month_end: 7,
  consolidated_max_lines_per_submission: 100,
  general_tin_public: "EI00000000010",
  general_tin_business_without_tin: "EI00000000020"
};

// Status of one field check.
export const STATUS = { READY: "READY", MISSING: "MISSING", INVALID: "INVALID", UNKNOWN: "UNKNOWN" };

// Annual turnover bands the owner picks from (the firm's own, or the customer's, depending on whose invoices are checked).
// `since` is the date e-Invoice became mandatory for the band; `relaxation_until` is the end of the interim relaxation
// period (individual e-Invoices are not penalised while consolidated ones are issued monthly).
export const BANDS = {
  UNDER_3M: { label: "Below RM3 million", exempt_possible: true, since: "2026-07-01", relaxation_until: "2027-12-31" },
  "3M_5M": { label: "RM3 million up to RM5 million", exempt_possible: false, since: "2026-01-01", relaxation_until: "2027-12-31" },
  "5M_25M": { label: "Above RM5 million up to RM25 million", exempt_possible: false, since: "2025-07-01", relaxation_until: "2025-12-31" },
  "25M_100M": { label: "Above RM25 million up to RM100 million", exempt_possible: false, since: "2025-01-01", relaxation_until: "2025-06-30" },
  OVER_100M: { label: "Above RM100 million", exempt_possible: false, since: "2024-08-01", relaxation_until: "2025-01-31" }
};

const isIsoDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value ?? "")) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));

// Does e-Invoice apply, from when, and is the interim relaxation still running? `related_over_3m` removes the exemption
// (a non-individual shareholder, holding company, related company or joint venture with RM3 million or more).
export function applicability({ band, related_over_3m = false, as_of }) {
  if (!BANDS[band]) return { ok: false, error: `band must be one of ${Object.keys(BANDS).join(", ")}.` };
  if (!isIsoDate(as_of)) return { ok: false, error: "as_of must be YYYY-MM-DD." };
  const b = BANDS[band];
  if (band === "UNDER_3M" && !related_over_3m) {
    return { ok: true, band, label: b.label, applies: false, exempt: true, since: null, relaxation_until: null, in_relaxation: false,
      note: "Below RM3 million, e-Invoice can be exempt if the exemption conditions in the Guideline (section 1.6.10) are met. Exempt taxpayers face no e-Invoice penalty. Confirm the conditions with LHDN or your tax agent." };
  }
  const effective = band === "UNDER_3M" ? { ...b, label: `${b.label}, but a related party has RM3 million or more` } : b;
  const started = as_of >= effective.since;
  const inRelax = started && as_of <= effective.relaxation_until;
  return { ok: true, band, label: effective.label, applies: true, exempt: false, since: effective.since, started, relaxation_until: effective.relaxation_until, in_relaxation: inRelax,
    note: !started ? `e-Invoice starts on ${effective.since}.`
      : inRelax ? `e-Invoice applies. The interim relaxation runs to ${effective.relaxation_until}: if you cannot yet issue individual e-Invoices, consolidated e-Invoices must still be issued monthly.`
        : `e-Invoice applies and the interim relaxation period ended on ${effective.relaxation_until}.` };
}

// ---------------- field checks ----------------

const text = (value) => (value === undefined || value === null ? "" : String(value).trim());
const num = (value) => (value === "" || value === null || value === undefined ? NaN : Number(value));
const money = (n) => Math.round(n * 100) / 100;
const E164 = /^\+?[1-9]\d{6,14}$/;
const REG_LEN = { BRN: 20, NRIC: 12, PASSPORT: 12, ARMY: 12 };

function check(key, label, where, fix, status, message) {
  return { key, label, status, message: message ?? null, where: status === STATUS.READY ? null : where, fix: status === STATUS.READY ? null : fix };
}

// A required text field with a maximum length.
function required(key, label, value, max, where, fix, { allowNA = true } = {}) {
  const v = text(value);
  if (!v) return check(key, label, where, fix, STATUS.MISSING, `${label} is required.`);
  if (v.length > max) return check(key, label, where, `Shorten it to ${max} characters or fewer.`, STATUS.INVALID, `${label} is longer than ${max} characters.`);
  if (!allowNA && v.toUpperCase() === "NA") return check(key, label, where, fix, STATUS.INVALID, `${label} cannot be NA.`);
  return check(key, label, where, fix, STATUS.READY);
}

function partyChecks(prefix, party, whereParty, { isBuyer, consolidated }) {
  const out = [];
  const P = prefix === "supplier" ? "Supplier" : "Buyer";
  const add = (c) => out.push(c);
  const p = party ?? {};
  add(required(`${prefix}.name`, `${P}'s name`, p.name, 300, whereParty, `Enter the ${P.toLowerCase()}'s registered name.`));
  add(required(`${prefix}.tin`, `${P}'s TIN`, p.tin, 14, whereParty, isBuyer ? `Enter the buyer's TIN. If a business buyer has none, the Guideline allows the general TIN ${SPEC.general_tin_business_without_tin}.` : "Enter your LHDN Tax Identification Number."));
  // registration / ID
  const type = text(p.reg_type).toUpperCase();
  const reg = text(p.reg_no);
  if (!type || !reg) out.push(check(`${prefix}.reg`, `${P}'s registration / ID number`, whereParty, "Choose BRN, NRIC, PASSPORT or ARMY and enter the number.", STATUS.MISSING, "Registration, ID or passport number is required."));
  else if (!REG_LEN[type]) out.push(check(`${prefix}.reg`, `${P}'s registration / ID number`, whereParty, "Use BRN, NRIC, PASSPORT or ARMY.", STATUS.INVALID, `ID type ${type} is not one of BRN, NRIC, PASSPORT, ARMY.`));
  else if (reg.length > REG_LEN[type] || (type === "NRIC" && !/^\d{12}$/.test(reg))) out.push(check(`${prefix}.reg`, `${P}'s registration / ID number`, whereParty, type === "NRIC" ? "NRIC is exactly 12 digits, no dashes." : `${type} is at most ${REG_LEN[type]} characters.`, STATUS.INVALID, `The ${type} number is not in the required format.`));
  else out.push(check(`${prefix}.reg`, `${P}'s registration / ID number`, whereParty, "", STATUS.READY));
  add(required(`${prefix}.sst`, `${P}'s SST registration number`, p.sst, 35, whereParty, 'Enter the SST number, or "NA" if not SST-registered.'));
  if (!isBuyer) {
    add(required("supplier.ttx", "Supplier's tourism tax registration number", p.ttx, 17, whereParty, 'Enter the tourism tax number, or "NA" if not registered.'));
    const msic = text(p.msic);
    out.push(!msic ? check("supplier.msic", "Supplier's MSIC code", whereParty, "Enter your 5-digit MSIC code.", STATUS.MISSING, "MSIC code is required.")
      : /^\d{5}$/.test(msic) ? check("supplier.msic", "Supplier's MSIC code", whereParty, "", STATUS.READY)
        : check("supplier.msic", "Supplier's MSIC code", whereParty, "MSIC is exactly 5 digits.", STATUS.INVALID, "MSIC code must be 5 digits."));
    add(required("supplier.activity", "Supplier's business activity description", p.activity, 300, whereParty, "Describe your business activity."));
  }
  // address
  const a = p.address ?? {};
  add(required(`${prefix}.address.line0`, `${P}'s address (line 0)`, a.line0, 150, whereParty, "Enter the first address line."));
  add(required(`${prefix}.address.city`, `${P}'s city`, a.city, 50, whereParty, "Enter the city."));
  add(required(`${prefix}.address.state`, `${P}'s state`, a.state, 50, whereParty, "Enter the state."));
  const country = text(a.country).toUpperCase();
  out.push(!country ? check(`${prefix}.address.country`, `${P}'s country`, whereParty, "Enter the 3-letter country code, for example MYS.", STATUS.MISSING, "Country is required.")
    : /^[A-Z]{3}$/.test(country) ? check(`${prefix}.address.country`, `${P}'s country`, whereParty, "", STATUS.READY)
      : check(`${prefix}.address.country`, `${P}'s country`, whereParty, "Use the 3-letter ISO code, for example MYS.", STATUS.INVALID, "Country must be a 3-letter code."));
  // contact
  const contact = text(p.contact);
  if (!contact) out.push(check(`${prefix}.contact`, `${P}'s contact number`, whereParty, "Enter a phone number with the country code, for example +60123456789.", STATUS.MISSING, "Contact number is required."));
  else if (isBuyer && consolidated && contact.toUpperCase() === "NA") out.push(check(`${prefix}.contact`, `${P}'s contact number`, whereParty, "", STATUS.READY));
  else if (!E164.test(contact.replace(/[\s-]/g, ""))) out.push(check(`${prefix}.contact`, `${P}'s contact number`, whereParty, "Use international format, for example +60123456789.", STATUS.INVALID, "Contact number is not in international (E.164) format."));
  else out.push(check(`${prefix}.contact`, `${P}'s contact number`, whereParty, "", STATUS.READY));
  return out;
}

// doc = { source, number, issue_date, currency, type_code, supplier, buyer, lines, totals, where: { invoice, lines }, consolidated }
export function checkInvoice(doc, { as_of } = {}) {
  const where = doc.where ?? {};
  const wInvoice = where.invoice ?? "the invoice";
  const wLines = where.lines ?? where.invoice ?? "the invoice";
  const checks = [];
  checks.push(required("invoice.number", "e-Invoice code / number", doc.number, 50, wInvoice, "Give the invoice a number."));
  const date = text(doc.issue_date);
  checks.push(!date ? check("invoice.date", "e-Invoice date", wInvoice, "Record the issue date.", STATUS.MISSING, "Issue date is required.")
    : !isIsoDate(date) ? check("invoice.date", "e-Invoice date", wInvoice, "Use YYYY-MM-DD.", STATUS.INVALID, "Issue date is not a valid date.")
      : as_of && date > as_of ? check("invoice.date", "e-Invoice date", wInvoice, "The date cannot be in the future.", STATUS.INVALID, "Issue date is in the future.")
        : check("invoice.date", "e-Invoice date", wInvoice, "", STATUS.READY));
  const cur = text(doc.currency).toUpperCase();
  checks.push(!cur ? check("invoice.currency", "Invoice currency", wInvoice, "Record the currency, for example MYR.", STATUS.MISSING, "Currency is required.")
    : /^[A-Z]{3}$/.test(cur) ? check("invoice.currency", "Invoice currency", wInvoice, "", STATUS.READY)
      : check("invoice.currency", "Invoice currency", wInvoice, "Use the 3-letter code, for example MYR.", STATUS.INVALID, "Currency must be a 3-letter code."));
  const typeCode = text(doc.type_code || "01");
  checks.push(/^\d{2}$/.test(typeCode) ? check("invoice.type", "e-Invoice type code", wInvoice, "", STATUS.READY) : check("invoice.type", "e-Invoice type code", wInvoice, "Use the 2-digit document type code, for example 01.", STATUS.INVALID, "Type code must be 2 digits."));
  checks.push(...partyChecks("supplier", doc.supplier, "Supplier details (this page)", { isBuyer: false, consolidated: false }));
  checks.push(...partyChecks("buyer", doc.buyer, "Buyer details (this page)", { isBuyer: true, consolidated: doc.consolidated === true }));

  // lines
  const lines = Array.isArray(doc.lines) ? doc.lines : null;
  if (!lines || lines.length === 0) {
    checks.push(check("lines", "Invoice line items", wLines, "Add the line items: classification code, description, unit price, subtotal and tax per line.", STATUS.UNKNOWN, "vFirm does not hold line items for this invoice."));
  } else {
    lines.forEach((line, i) => {
      const n = i + 1;
      const cls = text(line.classification);
      checks.push(!cls ? check(`line${n}.classification`, `Line ${n} classification code`, wLines, "Add the 3-digit classification code.", STATUS.MISSING, "Classification code is required.")
        : /^\d{3}$/.test(cls) ? check(`line${n}.classification`, `Line ${n} classification code`, wLines, "", STATUS.READY)
          : check(`line${n}.classification`, `Line ${n} classification code`, wLines, "Use the 3-digit code from the MyInvois classification list.", STATUS.INVALID, "Classification code must be 3 digits."));
      checks.push(required(`line${n}.description`, `Line ${n} description`, line.description, 300, wLines, "Describe the product or service."));
      for (const [k, label] of [["unit_price", "unit price"], ["subtotal", "subtotal"], ["tax_amount", "tax amount"]]) {
        const v = num(line[k]);
        checks.push(text(line[k]) === "" ? check(`line${n}.${k}`, `Line ${n} ${label}`, wLines, `Add the ${label}.`, STATUS.MISSING, `${label[0].toUpperCase()}${label.slice(1)} is required.`)
          : Number.isFinite(v) && v >= 0 ? check(`line${n}.${k}`, `Line ${n} ${label}`, wLines, "", STATUS.READY)
            : check(`line${n}.${k}`, `Line ${n} ${label}`, wLines, "Enter a number of zero or more.", STATUS.INVALID, `${label[0].toUpperCase()}${label.slice(1)} is not a valid amount.`));
      }
      const tt = text(line.tax_type);
      checks.push(!tt ? check(`line${n}.tax_type`, `Line ${n} tax type`, wLines, "Add the 2-character tax type code.", STATUS.MISSING, "Tax type is required.")
        : tt.length === 2 ? check(`line${n}.tax_type`, `Line ${n} tax type`, wLines, "", STATUS.READY)
          : check(`line${n}.tax_type`, `Line ${n} tax type`, wLines, "The tax type code is 2 characters.", STATUS.INVALID, "Tax type must be 2 characters."));
    });
  }

  // totals
  const t = doc.totals ?? {};
  const have = (k) => text(t[k]) !== "" && Number.isFinite(num(t[k]));
  for (const [k, label] of [["excl", "Total excluding tax"], ["tax", "Total tax amount"], ["incl", "Total including tax"], ["payable", "Total payable amount"]]) {
    checks.push(have(k) ? check(`total.${k}`, label, wInvoice, "", STATUS.READY)
      : check(`total.${k}`, label, wInvoice, `Record the ${label.toLowerCase()}.`, text(t[k]) === "" ? STATUS.UNKNOWN : STATUS.INVALID, text(t[k]) === "" ? `vFirm does not hold the ${label.toLowerCase()} for this invoice.` : `${label} is not a number.`));
  }
  if (have("excl") && have("tax") && have("incl")) {
    const ok = Math.abs(money(num(t.excl) + num(t.tax)) - money(num(t.incl))) <= 0.01;
    checks.push(ok ? check("total.arithmetic", "Total including tax equals excluding tax plus tax", wInvoice, "", STATUS.READY)
      : check("total.arithmetic", "Total including tax equals excluding tax plus tax", wInvoice, "Correct the totals so they add up.", STATUS.INVALID, `${t.excl} + ${t.tax} is not ${t.incl}.`));
  }
  if (lines?.length && have("excl") && lines.every((l) => Number.isFinite(num(l.subtotal)))) {
    const sum = money(lines.reduce((s, l) => s + num(l.subtotal), 0));
    checks.push(Math.abs(sum - money(num(t.excl))) <= 0.01 ? check("total.lines", "Line subtotals add up to the total excluding tax", wLines, "", STATUS.READY)
      : check("total.lines", "Line subtotals add up to the total excluding tax", wLines, "Correct the lines or the total.", STATUS.INVALID, `Lines add up to ${sum}, total excluding tax is ${t.excl}.`));
  }

  const count = (s) => checks.filter((c) => c.status === s).length;
  const counts = { ready: count(STATUS.READY), missing: count(STATUS.MISSING), invalid: count(STATUS.INVALID), unknown: count(STATUS.UNKNOWN), total: checks.length };
  const verdict = counts.missing + counts.invalid > 0 ? "NEEDS_FIXES" : counts.unknown > 0 ? "CANNOT_CONFIRM" : "READY";
  return { verdict, counts, checks, fix_list: checks.filter((c) => c.status !== STATUS.READY).map((c) => ({ key: c.key, label: c.label, status: c.status, fix: c.fix, where: c.where })) };
}

// ---------------- monthly consolidated e-Invoice draft ----------------

function lastDayOf(month) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}
const addDays = (iso, days) => new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);

// docs: [{ number, issue_date, currency, total, candidate }] -- `candidate` is true when the buyer is marked as the public
// (no e-Invoice requested). Only those can be consolidated; a single transaction above RM10,000 cannot.
export function consolidatedDraft({ month, supplier, docs }) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(month ?? ""))) return { ok: false, error: "month must be YYYY-MM." };
  const included = [];
  const excluded = [];
  for (const doc of [...docs].sort((a, b) => String(a.issue_date).localeCompare(String(b.issue_date)) || String(a.number).localeCompare(String(b.number)))) {
    if (!doc.candidate) continue;
    const total = num(doc.total);
    if (!String(doc.issue_date ?? "").startsWith(month)) continue;
    if (!Number.isFinite(total)) excluded.push({ number: doc.number, reason: "No total amount is recorded." });
    else if (text(doc.currency).toUpperCase() !== "MYR") excluded.push({ number: doc.number, reason: "Not in MYR; convert to MYR before consolidating." });
    else if (total > SPEC.consolidated_single_limit) excluded.push({ number: doc.number, reason: `A single transaction above RM${SPEC.consolidated_single_limit.toLocaleString("en-US")} must be issued as an individual e-Invoice.` });
    else included.push({ receipt_ref: doc.number, date: doc.issue_date, description: `Receipt ${doc.number}`, amount: money(total) });
  }
  const end = lastDayOf(month);
  const batches = [];
  for (let i = 0; i < included.length; i += SPEC.consolidated_max_lines_per_submission) batches.push(included.slice(i, i + SPEC.consolidated_max_lines_per_submission));
  const header = {
    period: month, period_end: end, due_by: addDays(end, SPEC.consolidated_days_after_month_end),
    supplier_name: text(supplier?.name) || null, supplier_tin: text(supplier?.tin) || null,
    buyer: { name: "General Public", tin: SPEC.general_tin_public, registration: "NA", address: "NA", contact: "NA", sst: "NA" }
  };
  const total = money(included.reduce((s, l) => s + l.amount, 0));
  const lines = ["receipt_ref,date,description,amount_myr", ...included.map((l) => [l.receipt_ref, l.date, l.description, l.amount.toFixed(2)].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))];
  return { ok: true, draft_only: true, header, lines: included, excluded, total_myr: total, submissions_needed: batches.length, csv: lines.join("\n") + "\n" };
}
