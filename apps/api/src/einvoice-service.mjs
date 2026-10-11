// VI-S6 (ADR-114): e-Invoice readiness service. CHECKS ONLY -- there is no submission capability anywhere in this file.
//
// - Owner-only for every read and write.
// - GET builds one document model per counted invoice (BizKick INV transactions + vFirm invoices), fills in the supplier and
//   buyer profiles the owner saved, and runs the pure rules in packages/core-domain/src/edcs-einvoice.mjs.
// - A value vFirm does not hold stays blank and is reported as MISSING or UNKNOWN; nothing is invented.
// - The monthly consolidated summary (sales under RM10,000 to the public) is a draft the owner downloads; it is not sent.

import { appendEventAndAudit, newUuid, now, readStore, withStore } from "./store.mjs";
import { edcsRepository as repo } from "./edcs-repository.mjs";
import { isFirmOwner } from "./edcs-owner.mjs";
import { BANDS, SPEC, applicability, checkInvoice, consolidatedDraft } from "../../../packages/core-domain/src/edcs-einvoice.mjs";

function httpError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}
function requireOwner(actor, action) {
  if (!isFirmOwner(actor)) throw httpError(403, "EDCS_OWNER_REQUIRED", `${action} requires the firm owner.`);
}

function today() {
  const pinned = process.env.VFIRM_AUTOMATION_AS_OF;
  if (pinned && /^\d{4}-\d{2}-\d{2}$/.test(pinned)) return pinned;
  return new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
}

const NOT_INVOICED = new Set(["Cancelled", "Rejected", "Superseded", "Draft", "Reserved", "Under Review"]);
const isoDay = (v) => (/^\d{4}-\d{2}-\d{2}/.test(String(v ?? "")) ? String(v).slice(0, 10) : null);
const txt = (v) => (v === undefined || v === null ? "" : String(v).trim());
const buyerKeyFor = (clientId, name) => (clientId ? `client:${clientId}` : `name:${txt(name).toLowerCase()}`);

const PARTY_FIELDS = ["name", "tin", "reg_type", "reg_no", "sst", "ttx", "msic", "activity", "contact"];
const ADDRESS_FIELDS = ["line0", "city", "state", "country"];

function cleanParty(input, { supplier }) {
  const out = {};
  for (const f of PARTY_FIELDS) {
    if (!supplier && (f === "ttx" || f === "msic" || f === "activity")) continue;
    if (input?.[f] !== undefined) out[f] = txt(input[f]).slice(0, 300);
  }
  if (input?.address && typeof input.address === "object") {
    out.address = {};
    for (const f of ADDRESS_FIELDS) if (input.address[f] !== undefined) out.address[f] = txt(input.address[f]).slice(0, 150);
  }
  return out;
}

// Supplier = saved profile on top of what the company details already hold. Address in company details is one block of text,
// so it only fills line 0; city, state and country must be entered.
function supplierParty(company, saved) {
  const base = { name: company?.legal_name, tin: company?.tax_id, reg_type: company?.registration_no ? "BRN" : "", reg_no: company?.registration_no, contact: company?.telephone, address: { line0: company?.address } };
  const s = saved ?? {};
  const merged = { ...base };
  for (const f of PARTY_FIELDS) if (txt(s[f]) !== "") merged[f] = s[f];
  merged.address = { ...base.address };
  for (const f of ADDRESS_FIELDS) if (txt(s.address?.[f]) !== "") merged.address[f] = s.address[f];
  return merged;
}

async function loadFirm(scope) {
  const store = await readStore(scope.tenant_id, { ledger: false });
  const mine = (list) => (list ?? []).filter((r) => r.tenant_id === scope.tenant_id && r.firm_id === scope.firm_id);
  const transactions = (await repo.listTransactions(scope)).filter((r) => r.tenant_id === scope.tenant_id && r.firm_id === scope.firm_id);
  const profiles = await repo.listEinvoiceProfiles(scope);
  const company = await repo.getCompanyProfile(scope);
  return { invoices: mine(store.invoices), relationships: mine(store.firm_client_relationships), clients: mine(store.clients), transactions, profiles, company };
}

function documentsFor({ transactions, invoices, relationships, clients }) {
  const clientName = new Map(clients.map((c) => [c.id, c.name]));
  const relClient = new Map(relationships.map((r) => [r.id, r.client_id]));
  const docs = [];
  for (const t of transactions) {
    if (t.document_type !== "INV" || NOT_INVOICED.has(t.status) || !isoDay(t.date_issued)) continue;
    const clientId = t.counterparty_link?.link_type === "CLIENT" ? t.counterparty_link.client_id : null;
    docs.push({
      source: "BIZKICK", ref: t.transaction_id, number: t.transaction_id, issue_date: isoDay(t.date_issued), currency: t.currency, type_code: "01",
      buyer_key: buyerKeyFor(clientId, t.counterparty_name), buyer_name: t.counterparty_name ?? "", client_id: clientId,
      lines: null, totals: { payable: undefined }, amount: t.amount,
      where: { invoice: "BizKick (add the buyer's e-Invoice details to the invoice register)", lines: "BizKick (line items are not held by vFirm)" }
    });
  }
  for (const inv of invoices) {
    if (!["ISSUED", "PAID", "OVERDUE"].includes(inv.status)) continue;
    const clientId = relClient.get(inv.relationship_id) ?? null;
    const items = Array.isArray(inv.line_items) ? inv.line_items : [];
    const lines = items.map((l) => ({ classification: l.classification, description: l.description, unit_price: l.unit_price ?? l.amount, subtotal: l.subtotal ?? l.amount, tax_type: l.tax_type, tax_amount: l.tax_amount }));
    const excl = items.length && items.every((l) => Number.isFinite(Number(l.amount))) ? items.reduce((s, l) => s + Number(l.amount), 0) : undefined;
    const tax = inv.tax_summary?.tax_amount ?? inv.tax_summary?.total_tax;
    docs.push({
      source: "VFIRM", ref: inv.id, number: inv.invoice_number, issue_date: isoDay(inv.created_at), currency: inv.currency, type_code: "01",
      buyer_key: buyerKeyFor(clientId, clientName.get(clientId)), buyer_name: clientName.get(clientId) ?? "", client_id: clientId,
      lines: lines.length ? lines : null, totals: { excl, tax, incl: excl !== undefined && tax !== undefined ? Number(excl) + Number(tax) : undefined, payable: excl !== undefined && tax !== undefined ? Number(excl) + Number(tax) : undefined },
      amount: excl,
      where: { invoice: "the invoice in vFirm (Billing)", lines: "the invoice lines in vFirm (Billing)" }
    });
  }
  return docs.sort((a, b) => String(b.issue_date).localeCompare(String(a.issue_date)) || String(a.number).localeCompare(String(b.number)));
}

export async function readEinvoice({ scope, actor, params }) {
  requireOwner(actor, "e-Invoice readiness");
  const asOf = today();
  const band = params.get("band");
  const month = params.get("month") || asOf.slice(0, 7);
  const related = ["1", "true", "yes"].includes(String(params.get("related_over_3m") ?? "").toLowerCase());
  const applies = applicability({ band, related_over_3m: related, as_of: asOf });
  if (!applies.ok) throw httpError(400, "VALIDATION_ERROR", applies.error);
  const firm = await loadFirm(scope);
  const supplierSaved = firm.profiles.find((p) => p.kind === "SUPPLIER") ?? null;
  const supplier = supplierParty(firm.company, supplierSaved);
  const buyers = new Map(firm.profiles.filter((p) => p.kind === "BUYER").map((p) => [p.buyer_key, p]));
  const docs = documentsFor(firm);
  const results = docs.map((d) => {
    const buyerProfile = buyers.get(d.buyer_key) ?? null;
    const buyer = buyerProfile ? { ...buyerProfile, name: txt(buyerProfile.name) || d.buyer_name } : { name: d.buyer_name };
    const r = checkInvoice({ ...d, supplier, buyer, consolidated: buyerProfile?.public_buyer === true }, { as_of: asOf });
    return { source: d.source, ref: d.ref, number: d.number, issue_date: d.issue_date, buyer_key: d.buyer_key, buyer_name: d.buyer_name, public_buyer: buyerProfile?.public_buyer === true, verdict: r.verdict, counts: r.counts, fix_list: r.fix_list };
  });
  const summary = { invoices: results.length, ready: 0, needs_fixes: 0, cannot_confirm: 0 };
  for (const r of results) summary[r.verdict === "READY" ? "ready" : r.verdict === "NEEDS_FIXES" ? "needs_fixes" : "cannot_confirm"] += 1;
  const candidates = docs.map((d) => ({ number: d.number, issue_date: d.issue_date, currency: d.currency, total: d.amount, candidate: buyers.get(d.buyer_key)?.public_buyer === true }));
  const consolidated = consolidatedDraft({ month, supplier, docs: candidates });
  const buyerList = [...new Map(docs.map((d) => [d.buyer_key, { buyer_key: d.buyer_key, name: d.buyer_name, saved: buyers.get(d.buyer_key) ?? null }])).values()];
  return {
    as_of: asOf, band, bands: Object.fromEntries(Object.entries(BANDS).map(([k, v]) => [k, v.label])), applicability: applies,
    spec: { checked_on: SPEC.checked_on, sources: SPEC.sources, invoice_version: SPEC.invoice_version },
    supplier: { effective: supplier, saved: supplierSaved }, buyers: buyerList, summary, results, consolidated,
    draft_only: true, submission: "none: vFirm never submits to MyInvois"
  };
}

export async function saveSupplier({ scope, actor, body }) {
  requireOwner(actor, "Saving e-Invoice supplier details");
  const existing = await repo.getEinvoiceProfile(scope, "supplier");
  const record = { ...(existing ?? {}), id: existing?.id ?? newUuid(), kind: "SUPPLIER", tenant_id: scope.tenant_id, firm_id: scope.firm_id, ...cleanParty(body, { supplier: true }), updated_at: now(), created_at: existing?.created_at ?? now() };
  await repo.commit(scope, { einvoice_profiles: [record] });
  await withStore((store) => appendEventAndAudit(store, { event_type: "einvoice.supplier_saved", actor, tenant_id: scope.tenant_id, firm_id: scope.firm_id, aggregate_type: "EinvoiceProfile", aggregate_id: record.id, payload: { fields: Object.keys(cleanParty(body, { supplier: true })) }, summary: "e-Invoice supplier details saved by the owner." }), { tenantId: scope.tenant_id, ledger: false });
  return { supplier: record };
}

export async function saveBuyer({ scope, actor, body }) {
  requireOwner(actor, "Saving e-Invoice buyer details");
  const key = txt(body.buyer_key);
  if (!/^(client:[\w-]+|name:.+)$/.test(key)) throw httpError(400, "VALIDATION_ERROR", "buyer_key must look like client:<id> or name:<name>.");
  const existing = await repo.getEinvoiceProfile(scope, `buyer:${key}`);
  const publicBuyer = body.public_buyer === undefined ? existing?.public_buyer === true : body.public_buyer === true;
  const record = { ...(existing ?? {}), id: existing?.id ?? newUuid(), kind: "BUYER", buyer_key: key, tenant_id: scope.tenant_id, firm_id: scope.firm_id, ...cleanParty(body, { supplier: false }), public_buyer: publicBuyer, updated_at: now(), created_at: existing?.created_at ?? now() };
  await repo.commit(scope, { einvoice_profiles: [record] });
  await withStore((store) => appendEventAndAudit(store, { event_type: "einvoice.buyer_saved", actor, tenant_id: scope.tenant_id, firm_id: scope.firm_id, aggregate_type: "EinvoiceProfile", aggregate_id: record.id, payload: { buyer_key: key, public_buyer: publicBuyer }, summary: `e-Invoice buyer details saved for ${key}.` }), { tenantId: scope.tenant_id, ledger: false });
  return { buyer: record };
}
