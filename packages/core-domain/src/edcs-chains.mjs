// CE-S2 (ADR-096, 2026-10-05): pure helpers for linking files to BizKick transactions and for the
// transaction chain view. No I/O, no clock, no store: everything here is decided from its arguments,
// so the smoke script can test it directly and the API layer stays thin.
//
//   extractTransactionId     find a Transaction ID in a file name (BK-SYS-006: the ID is in the file name)
//   revisionLabelFromFilename  "..._R1_..." -> "R1"
//   buildTransactionChains   follow Related Transaction ID to build QT->SO->DO->INV->RC style chains,
//                            with missing-link flags (a GRN with no PO, a related ID not in the register)
//
// The chain view reads the governed register only. It never changes a transaction.

import { EDCS_DOCUMENT_TYPES, composeTransactionId } from "./edcs-register.mjs";

// ---------------- file name -> Transaction ID ----------------

const ID_IN_NAME = /(?:^|[^A-Za-z0-9])([A-Za-z0-9]{2,8})-([A-Za-z]{2,4})-(\d{4})-(\d{4,})(?![0-9])/;

// Returns { status, transaction_id?, company_code?, document_type?, remainder? } where status is
//   FOUND            a well-formed ID for this firm's company code and a known document type
//   WRONG_COMPANY    well-formed, but for another company code
//   UNKNOWN_TYPE     well-formed, but the type is not one of the 32 contract types
//   NONE             no Transaction ID in the name
export function extractTransactionId(filename, companyCode) {
  const name = String(filename ?? "");
  const match = name.match(ID_IN_NAME);
  if (!match) return { status: "NONE" };
  const company = match[1].toUpperCase();
  const type = match[2].toUpperCase();
  const remainder = name.slice(match.index + match[0].length);
  if (!EDCS_DOCUMENT_TYPES[type]) return { status: "UNKNOWN_TYPE", company_code: company, document_type: type, remainder };
  if (companyCode && company !== String(companyCode).toUpperCase()) return { status: "WRONG_COMPANY", company_code: company, document_type: type, remainder };
  return { status: "FOUND", transaction_id: composeTransactionId(company, type, match[3], Number(match[4])), company_code: company, document_type: type, remainder };
}

// "NEX-QT-2026-0001_R1_Alpha.xlsx" -> "R1". Only looked for after the ID, so an R in the ID itself
// (RC, RFQ) can never be mistaken for a revision.
export function revisionLabelFromFilename(remainder) {
  const match = String(remainder ?? "").match(/(?:^|[_\-\s.])R(\d{1,3})(?=[_\-\s.]|$)/i);
  return match ? `R${Number(match[1])}` : null;
}

// ---------------- transaction chains ----------------

export const CHAIN_FAMILIES = {
  SALES: ["QT", "SO", "DO", "INV", "RC", "CN"],
  PROCUREMENT: ["PR", "RFQ", "QC", "PO", "GRN", "PV"]
};

// Documents that cannot sensibly stand alone, and what each must follow. A standalone invoice,
// purchase order or quotation is normal and is never flagged.
export const CHAIN_REQUIRED_PREDECESSOR = {
  SO: ["QT"],
  DO: ["SO"],
  RC: ["INV"],
  CN: ["INV"],
  RFQ: ["PR"],
  QC: ["RFQ"],
  GRN: ["PO"]
};

const TYPE_ORDER = [...CHAIN_FAMILIES.SALES, ...CHAIN_FAMILIES.PROCUREMENT];
const typeRank = (type) => { const index = TYPE_ORDER.indexOf(type); return index < 0 ? 99 : index; };
const byTypeThenId = (a, b) => (typeRank(a.document_type) - typeRank(b.document_type)) || a.transaction_id.localeCompare(b.transaction_id);

export function chainFlagsFor(record, byId) {
  const flags = [];
  const related = record.related_transaction_id || null;
  if (related && !byId.has(related)) flags.push({ flag: "RELATED_NOT_FOUND", detail: `Related ${related} is not in the register.` });
  const required = CHAIN_REQUIRED_PREDECESSOR[record.document_type];
  if (required) {
    if (!related) flags.push({ flag: "MISSING_PREDECESSOR", detail: `A ${record.document_type} should follow a ${required.join(" or ")}; none is related.` });
    else if (byId.has(related) && !required.includes(byId.get(related).document_type)) {
      flags.push({ flag: "RELATED_UNEXPECTED_TYPE", detail: `A ${record.document_type} normally follows a ${required.join(" or ")}, but is related to a ${byId.get(related).document_type}.` });
    }
  }
  return flags;
}

// transactions: the firm's governed records (needs transaction_id, document_type, status,
// related_transaction_id). Returns every connected group, including single transactions
// (trivial: true); callers show only the non-trivial ones.
export function buildTransactionChains(transactions) {
  const byId = new Map();
  for (const record of transactions ?? []) byId.set(record.transaction_id, record);
  const parentOf = new Map();
  for (const record of byId.values()) {
    const related = record.related_transaction_id;
    if (related && related !== record.transaction_id && byId.has(related)) parentOf.set(record.transaction_id, related);
  }
  const children = new Map();
  for (const [child, parent] of parentOf) {
    if (!children.has(parent)) children.set(parent, []);
    children.get(parent).push(byId.get(child));
  }
  for (const list of children.values()) list.sort(byTypeThenId);

  // Connected components over the parent links (undirected).
  const neighbours = new Map([...byId.keys()].map((id) => [id, new Set()]));
  for (const [child, parent] of parentOf) { neighbours.get(child).add(parent); neighbours.get(parent).add(child); }
  const seen = new Set();
  const chains = [];
  const allFlags = [];
  for (const startId of [...byId.keys()].sort()) {
    if (seen.has(startId)) continue;
    const members = [];
    const queue = [startId];
    seen.add(startId);
    while (queue.length) {
      const id = queue.shift();
      members.push(id);
      for (const next of neighbours.get(id)) if (!seen.has(next)) { seen.add(next); queue.push(next); }
    }
    let roots = members.filter((id) => !parentOf.has(id)).map((id) => byId.get(id)).sort(byTypeThenId);
    if (!roots.length) roots = [byId.get(members.slice().sort()[0])]; // a pure cycle: pick one
    const nodes = [];
    const placed = new Set();
    const walk = (record, depth, parentId) => {
      if (placed.has(record.transaction_id)) return;
      placed.add(record.transaction_id);
      const flags = chainFlagsFor(record, byId);
      for (const flag of flags) allFlags.push({ transaction_id: record.transaction_id, ...flag });
      nodes.push({
        transaction_id: record.transaction_id, document_type: record.document_type, status: record.status ?? null, state: record.state ?? null,
        related_transaction_id: record.related_transaction_id ?? null, parent_id: parentId, depth, flags
      });
      for (const child of children.get(record.transaction_id) ?? []) walk(child, depth + 1, record.transaction_id);
    };
    for (const root of roots) walk(root, 0, null);
    for (const id of members) if (!placed.has(id)) walk(byId.get(id), 0, null);
    const types = nodes.map((node) => node.document_type);
    const family = types.some((t) => CHAIN_FAMILIES.SALES.includes(t)) ? "SALES" : types.some((t) => CHAIN_FAMILIES.PROCUREMENT.includes(t)) ? "PROCUREMENT" : "OTHER";
    const flags = nodes.flatMap((node) => node.flags.map((flag) => ({ transaction_id: node.transaction_id, ...flag })));
    chains.push({
      chain_id: nodes[0].transaction_id, family, size: nodes.length, root_ids: roots.map((r) => r.transaction_id),
      trivial: nodes.length === 1 && flags.length === 0, nodes, flags
    });
  }
  chains.sort((a, b) => a.chain_id.localeCompare(b.chain_id));
  return { chains, flags: allFlags.sort((a, b) => a.transaction_id.localeCompare(b.transaction_id) || a.flag.localeCompare(b.flag)) };
}

// The chain containing one transaction, plus its ancestors (oldest first) for a breadcrumb.
export function chainForTransaction(transactions, transactionId) {
  const { chains } = buildTransactionChains(transactions);
  const chain = chains.find((candidate) => candidate.nodes.some((node) => node.transaction_id === transactionId)) ?? null;
  if (!chain) return null;
  const byId = new Map(chain.nodes.map((node) => [node.transaction_id, node]));
  const path = [];
  for (let cursor = byId.get(transactionId); cursor; cursor = cursor.parent_id ? byId.get(cursor.parent_id) : null) path.unshift(cursor.transaction_id);
  return { ...chain, path_to_transaction: path };
}
