// VI-S3 (ADR-111): the Evidence Passport -- a dossier a bank, tender board or auditor can verify on their own.
//
// Pure functions: what goes into a passport (planPassport), the manifest and its seal (buildPassportFiles), the
// cover page, and the verifier. The verifier core (passportVerifierCore) is ONE function whose source is embedded
// in the offline verify.html, so the page the recipient opens and the check vFirm runs on download are the same
// code. Nothing here reads a store, a clock or a file: the service passes everything in.
//
// What the seal proves, stated plainly: SEAL.txt and the vFirm passport record carry the SHA-256 of the canonical
// form of manifest.json, and manifest.json lists the SHA-256 of every other file. So any file or manifest that was
// changed, added or removed after issue is detected. A forger who rewrites the whole bundle AND its seal is only
// caught by comparing the seal with the one vFirm shows on the passport page (or that the owner sent separately),
// which is why the verifier has an "expected seal" box.

import { createHash } from "node:crypto";
import { writeZip, withContent } from "./xlsx-package.mjs";
import { buildTransactionChains } from "./edcs-chains.mjs";

export const PASSPORT_SCHEMA = "vfirm.evidence-passport/1";
export const RESTRICTED_CLASSIFICATIONS = Object.freeze(["HR_RESTRICTED", "FINANCE_RESTRICTED"]);
export const MAX_PASSPORT_BYTES = 25 * 1024 * 1024;
export const REVISION_MODES = Object.freeze(["CURRENT", "ALL"]);

const sha256Hex = (data) => createHash("sha256").update(data).digest("hex");
const klDate = (iso) => (iso && Number.isFinite(Date.parse(iso)) ? new Date(Date.parse(iso) + 8 * 3600000).toISOString().slice(0, 10) : null);
const isDate = (value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const unique = (list) => [...new Set(list)];

// Canonical JSON: keys sorted, no whitespace. The seal is the SHA-256 of this form of the manifest.
export function canonicalJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value === undefined ? null : value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  return `{${Object.keys(value).filter((k) => value[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${canonicalJson(value[k])}`).join(",")}}`;
}

export const sealOf = (manifest) => sha256Hex(Buffer.from(canonicalJson(manifest), "utf8"));

// ---------------- selection validation ----------------

export function validateSelection(body) {
  const errors = [];
  const list = (value) => (Array.isArray(value) ? unique(value.map((v) => String(v).trim()).filter(Boolean)) : []);
  const purpose = String(body?.purpose ?? "").trim();
  const recipient = String(body?.recipient ?? "").trim();
  const selection = {
    document_ids: list(body?.document_ids),
    transaction_ids: list(body?.transaction_ids),
    include_chain: body?.include_chain === true,
    revisions: String(body?.revisions ?? "CURRENT").toUpperCase(),
    period: null,
    include_restricted: list(body?.include_restricted)
  };
  if (!selection.document_ids.length && !selection.transaction_ids.length) errors.push("Choose at least one document or BizKick transaction.");
  if (purpose.length < 3 || purpose.length > 300) errors.push("Say what the passport is for (3 to 300 characters).");
  if (recipient.length > 200) errors.push("Recipient is too long (200 characters).");
  if (!REVISION_MODES.includes(selection.revisions)) errors.push("Revisions must be CURRENT or ALL.");
  if (body?.period && (body.period.from || body.period.to)) {
    const { from = null, to = null } = body.period;
    if ((from && !isDate(from)) || (to && !isDate(to))) errors.push("Period dates must be YYYY-MM-DD.");
    else if (from && to && from > to) errors.push("Period start is after its end.");
    else selection.period = { from: from || null, to: to || null };
  }
  return { ok: errors.length === 0, errors, selection, purpose, recipient };
}

// ---------------- the plan: what is in, what is out, and why ----------------

// input: { selection, entries, revisions, files, transactions }  (all of one firm)
// Returns { unknown: {documents, transactions}, items, orphan_transactions, totals, digest }.
export function planPassport({ selection, entries, revisions, files, transactions }) {
  const entryById = new Map(entries.map((entry) => [entry.id, entry]));
  const entryByNumber = new Map(entries.map((entry) => [entry.document_number, entry]));
  const txById = new Map(transactions.map((tx) => [tx.transaction_id, tx]));
  const fileById = new Map(files.map((file) => [file.id, file]));
  const unknown = { documents: selection.document_ids.filter((id) => !entryById.has(id)), transactions: selection.transaction_ids.filter((id) => !txById.has(id)) };

  // transactions in scope: the ones picked, plus their whole chains when asked
  let txIds = selection.transaction_ids.filter((id) => txById.has(id));
  if (selection.include_chain && txIds.length) {
    const { chains } = buildTransactionChains(transactions);
    for (const chain of chains) if (chain.nodes.some((node) => txIds.includes(node.transaction_id))) txIds = txIds.concat(chain.nodes.map((node) => node.transaction_id));
  }
  txIds = unique(txIds).sort();

  const candidateIds = unique([...selection.document_ids.filter((id) => entryById.has(id)), ...txIds.map((id) => entryByNumber.get(id)?.id).filter(Boolean)]);
  const orphan = txIds.filter((id) => !entryByNumber.has(id));
  const restrictedAsked = new Set(selection.include_restricted);
  const notCandidate = [...restrictedAsked].filter((id) => !candidateIds.includes(id));

  const inPeriod = (revision) => {
    if (!selection.period) return true;
    const day = klDate(revision.created_at);
    return Boolean(day) && (!selection.period.from || day >= selection.period.from) && (!selection.period.to || day <= selection.period.to);
  };

  const items = candidateIds.map((id) => entryById.get(id)).sort((a, b) => String(a.document_number).localeCompare(String(b.document_number)) || String(a.id).localeCompare(String(b.id))).map((entry) => {
    const all = revisions.filter((rev) => rev.document_register_entry_id === entry.id).sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)) || String(a.id).localeCompare(String(b.id)));
    const chosen = selection.revisions === "CURRENT" ? all.filter((rev) => rev.id === entry.current_revision_id) : all;
    const restricted = RESTRICTED_CLASSIFICATIONS.includes(entry.classification);
    const ticked = restrictedAsked.has(entry.id);
    const revs = chosen.map((rev) => {
      const fileId = rev.metadata?.file_id ?? (String(rev.storage_ref ?? "").startsWith("file:") ? String(rev.storage_ref).slice(5) : null);
      const file = fileId ? fileById.get(fileId) ?? null : null;
      const stored = Boolean(file && file.status === "STORED" && file.storage_key);
      const inRange = inPeriod(rev);
      return {
        revision_id: rev.id, revision: rev.revision, status: rev.status, role: rev.metadata?.role ?? "PRIMARY", filed_at: rev.created_at,
        output_draft_id: rev.metadata?.output_draft_id ?? null, content_hash: rev.content_hash ?? null,
        file_id: file?.id ?? null, filename: file?.filename ?? rev.metadata?.filename ?? null, size_bytes: file?.size_bytes ?? null, sha256: file?.sha256 ?? rev.content_hash ?? null,
        content: stored ? "INCLUDED" : "METADATA_ONLY", included: inRange, reason: inRange ? null : "OUTSIDE_PERIOD"
      };
    });
    let included = true;
    let reason = null;
    if (restricted && !ticked) { included = false; reason = "RESTRICTED_NOT_INCLUDED"; }
    else if (!revs.some((rev) => rev.included)) { included = false; reason = chosen.length ? "NO_REVISION_IN_PERIOD" : "NO_REVISION"; }
    return {
      entry_id: entry.id, document_number: entry.document_number, title: entry.title, document_type: entry.document_type ?? null, classification: entry.classification,
      restricted, restricted_ticked: restricted && ticked, included, reason, revisions: revs
    };
  });

  const includedItems = items.filter((item) => item.included);
  const includedRevs = includedItems.flatMap((item) => item.revisions.filter((rev) => rev.included));
  const totals = {
    documents: includedItems.length,
    documents_excluded: items.length - includedItems.length,
    revisions: includedRevs.length,
    files_with_content: includedRevs.filter((rev) => rev.content === "INCLUDED").length,
    metadata_only: includedRevs.filter((rev) => rev.content === "METADATA_ONLY").length,
    bytes: includedRevs.filter((rev) => rev.content === "INCLUDED").reduce((sum, rev) => sum + (Number(rev.size_bytes) || 0), 0),
    restricted_candidates: items.filter((item) => item.restricted).length,
    restricted_included: includedItems.filter((item) => item.restricted).length,
    transactions: txIds.length
  };
  const plan = { unknown, not_candidate_restricted: notCandidate, transactions: txIds, orphan_transactions: orphan, items, totals };
  return { ...plan, digest: sha256Hex(Buffer.from(canonicalJson({ ...plan, selection }), "utf8")).slice(0, 32) };
}

// ---------------- the bundle ----------------

const safeSegment = (value) => String(value ?? "").replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").replace(/^\.+/, "_").trim().slice(0, 120) || "_";

export function bundlePathFor(documentNumber, revision, filename, taken) {
  const base = `documents/${safeSegment(documentNumber)}/${safeSegment(revision)}/${safeSegment(filename)}`;
  let path = base;
  for (let n = 2; taken.has(path.toLowerCase()); n += 1) {
    const dot = base.lastIndexOf(".");
    path = dot > base.lastIndexOf("/") ? `${base.slice(0, dot)}-${n}${base.slice(dot)}` : `${base}-${n}`;
  }
  taken.add(path.toLowerCase());
  return path;
}

const zipEntry = (name, content) => withContent({ name, method: 8, flags: 0, time: 0, date: 33, crc: 0, compressedSize: 0, size: 0, raw: Buffer.alloc(0) }, content);

function coverHtml(m) {
  const p = m.passport;
  const rows = m.documents.map((doc) => doc.revisions.map((rev) => `<tr><td>${esc(doc.document_number)}</td><td>${esc(doc.title)}</td><td>${esc(rev.revision)}</td><td>${esc(doc.classification)}${doc.restricted ? " (restricted, included by the owner)" : ""}</td><td>${esc(rev.file?.filename ?? "")}${rev.content === "METADATA_ONLY" ? " <em>(fingerprint only)</em>" : ""}</td><td class="h">${esc(rev.file?.sha256 ? rev.file.sha256.slice(0, 16) : "")}</td></tr>`).join("")).join("");
  const excluded = m.excluded.length ? `<h2>Left out</h2><ul>${m.excluded.map((e) => `<li>${esc(e.document_number)} ${esc(e.title)}: ${esc(e.reason_text)}</li>`).join("")}</ul>` : "";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Evidence Passport ${esc(p.number)}</title><style>
body{font:15px/1.5 system-ui,Segoe UI,Arial,sans-serif;max-width:960px;margin:32px auto;padding:0 16px;color:#111}
h1{margin:0 0 4px}h2{margin-top:28px}table{border-collapse:collapse;width:100%;font-size:13px}td,th{border:1px solid #ccc;padding:5px 8px;text-align:left;vertical-align:top}
th{background:#f3f4f6}.h{font-family:ui-monospace,Consolas,monospace}.note{background:#f0f9ff;border:1px solid #bae6fd;padding:10px 14px;border-radius:6px}
</style></head><body>
<h1>Evidence Passport</h1><p><strong>${esc(p.number)}</strong> issued ${esc(p.issued_at)} by ${esc(p.firm.name)}</p>
<table><tr><th>Purpose</th><td>${esc(p.purpose)}</td></tr><tr><th>Prepared for</th><td>${esc(p.recipient || "Not stated")}</td></tr><tr><th>Issued by</th><td>${esc(p.issued_by.name || p.issued_by.actor_id)}</td></tr>
<tr><th>Revisions</th><td>${p.selection.revisions === "ALL" ? "Every revision" : "Current revision"}${p.selection.period ? `, filed ${esc(p.selection.period.from ?? "start")} to ${esc(p.selection.period.to ?? "today")}` : ""}</td></tr>
<tr><th>Contents</th><td>${m.counts.documents} document(s), ${m.counts.files} file(s) included, ${m.counts.metadata_only} listed by fingerprint only, ${m.counts.transactions} BizKick transaction record(s)</td></tr></table>
<div class="note"><strong>How to check this passport.</strong> Open <code>verify.html</code> in any browser and choose this folder (or the .zip). It recomputes every file's SHA-256 on your own computer. Nothing is uploaded and no account is needed. It then shows PASS or FAIL for the whole bundle. The seal is in <code>SEAL.txt</code>; to be sure the bundle is the one vFirm issued, compare it with the seal the issuer gives you separately.</div>
<h2>Documents</h2><table><tr><th>Number</th><th>Title</th><th>Revision</th><th>Classification</th><th>File</th><th>SHA-256 (start)</th></tr>${rows}</table>${excluded}
<h2>Approvals and records</h2><p>Approvals (who, what decision, when), BizKick sync events and an audit extract are in <code>manifest.json</code> and <code>evidence/audit_extract.json</code>.</p>
</body></html>`;
}

const EXCLUSION_TEXT = {
  RESTRICTED_NOT_INCLUDED: "classified as restricted and not ticked for inclusion",
  NO_REVISION_IN_PERIOD: "no revision filed in the chosen period",
  NO_REVISION: "no revision on record"
};

// input: { passport: {id, number, issued_at, issued_by, firm, purpose, recipient, selection}, plan,
//          contents: Map<revision_id, Buffer>, approvals: Map<revision_id|"tx:<id>", [..]>, transactions: [..records with events/revisions..],
//          audit: [..] }
// Returns { zip: Buffer, manifest, seal, files: [{path,sha256,size,kind}], verifier_sha256, entries: Map<path, Buffer> }.
export function buildPassportFiles({ passport, plan, contents, approvals = new Map(), transactions = [], audit = [] }) {
  const taken = new Set(["manifest.json", "seal.txt", "verify.html", "cover.html", "evidence/audit_extract.json"]);
  const fileList = [];
  const entries = new Map();
  const addFile = (path, buffer, kind, extra = {}) => { entries.set(path, buffer); fileList.push({ path, sha256: sha256Hex(buffer), size: buffer.length, kind, ...extra }); };

  const documents = [];
  const excluded = plan.items.filter((item) => !item.included).map((item) => ({ document_number: item.document_number, title: item.title, classification: item.classification, reason: item.reason, reason_text: EXCLUSION_TEXT[item.reason] ?? item.reason }));
  for (const item of plan.items.filter((i) => i.included)) {
    const revs = [];
    for (const rev of item.revisions.filter((r) => r.included)) {
      let file = null;
      if (rev.content === "INCLUDED") {
        const bytes = contents.get(rev.revision_id);
        const path = bundlePathFor(item.document_number, rev.revision, rev.filename ?? "file", taken);
        addFile(path, bytes, "DOCUMENT", { document_number: item.document_number, revision: rev.revision });
        file = { path, filename: rev.filename, sha256: sha256Hex(bytes), size: bytes.length };
      } else if (rev.filename || rev.sha256) {
        file = { path: null, filename: rev.filename, sha256: rev.sha256, size: rev.size_bytes ?? null };
      }
      revs.push({ revision: rev.revision, status: rev.status, role: rev.role, filed_at: rev.filed_at, content_hash: rev.content_hash, content: rev.content, file, approvals: approvals.get(rev.revision_id) ?? [] });
    }
    documents.push({ document_number: item.document_number, title: item.title, document_type: item.document_type, classification: item.classification, restricted: item.restricted, revisions: revs });
  }

  const auditJson = Buffer.from(`${JSON.stringify({ note: "Event type, time, actor, record and summary only. Event payloads are not included.", events: audit }, null, 2)}\n`, "utf8");
  addFile("evidence/audit_extract.json", auditJson, "EVIDENCE");

  const counts = { documents: documents.length, files: fileList.filter((f) => f.kind === "DOCUMENT").length, metadata_only: documents.reduce((n, d) => n + d.revisions.filter((r) => r.content === "METADATA_ONLY").length, 0), transactions: transactions.length, audit_events: audit.length };
  const manifestBase = {
    schema: PASSPORT_SCHEMA,
    passport: { ...passport, restricted_included: documents.filter((d) => d.restricted).map((d) => ({ document_number: d.document_number, title: d.title, classification: d.classification })) },
    counts, documents, excluded,
    transactions: transactions.map((tx) => ({ ...tx, approvals: approvals.get(`tx:${tx.transaction_id}`) ?? [] })),
    audit_extract: { path: "evidence/audit_extract.json", events: audit.length }
  };
  // The cover page is part of the sealed set, so it is built from the manifest body first.
  const cover = Buffer.from(coverHtml(manifestBase), "utf8");
  addFile("cover.html", cover, "COVER");
  const manifest = { ...manifestBase, files: [...fileList].sort((a, b) => a.path.localeCompare(b.path)) };
  const seal = sealOf(manifest);
  const manifestBuffer = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  const sealText = Buffer.from(`vFirm Evidence Passport seal\npassport: ${passport.number}\nseal: ${seal}\nalgorithm: SHA-256 of the canonical form of manifest.json (keys sorted, no whitespace)\nissued: ${passport.issued_at}\n`, "utf8");
  const verifier = Buffer.from(verifierHtml(), "utf8");

  const ordered = [["verify.html", verifier], ["SEAL.txt", sealText], ["manifest.json", manifestBuffer], ["cover.html", cover], ["evidence/audit_extract.json", auditJson], ...[...entries].filter(([path]) => path.startsWith("documents/")).sort(([a], [b]) => a.localeCompare(b))];
  const zip = writeZip(ordered.map(([name, content]) => zipEntry(name, content)));
  return { zip, manifest, seal, files: manifest.files, verifier_sha256: sha256Hex(verifier), entries: new Map(ordered) };
}

// ---------------- the verifier core (embedded in verify.html; also run by the server) ----------------

// Self-contained on purpose: it is stringified into verify.html. files: Map<name, Uint8Array>; sha256: async (Uint8Array) => hex.
export async function passportVerifierCore(files, sha256, expectedSeal) {
  const checks = [];
  const add = (name, ok, detail) => checks.push({ name, ok: Boolean(ok), detail: detail || "" });
  const canon = (value) => {
    if (value === null || typeof value !== "object") return JSON.stringify(value === undefined ? null : value);
    if (Array.isArray(value)) return `[${value.map(canon).join(",")}]`;
    return `{${Object.keys(value).filter((k) => value[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${canon(value[k])}`).join(",")}}`;
  };
  const decode = (bytes) => new TextDecoder().decode(bytes);
  const result = (extra) => ({ ok: checks.every((c) => c.ok), seal: null, checks, bad: [], missing: [], unlisted: [], verified: 0, listed: 0, ...extra });
  const manifestBytes = files.get("manifest.json");
  if (!manifestBytes) { add("manifest.json is present", false, "manifest.json is missing."); return result({}); }
  let manifest = null;
  try { manifest = JSON.parse(decode(manifestBytes)); } catch { add("manifest.json can be read", false, "manifest.json is not valid JSON."); return result({}); }
  add("manifest.json can be read", true);
  add("manifest format is recognised", manifest.schema === "vfirm.evidence-passport/1", `format: ${manifest.schema}`);
  const seal = await sha256(new TextEncoder().encode(canon(manifest)));
  const sealBytes = files.get("SEAL.txt");
  const sealLine = sealBytes ? decode(sealBytes).split(/\r?\n/).find((line) => line.startsWith("seal: ")) : null;
  add("SEAL.txt matches the manifest", Boolean(sealLine) && sealLine.slice(6).trim() === seal, sealLine ? (sealLine.slice(6).trim() === seal ? "" : "The manifest was changed after it was sealed.") : "SEAL.txt is missing.");
  if (expectedSeal) add("seal matches the seal you were given", String(expectedSeal).trim().toLowerCase() === seal, "Compared with the seal you typed.");
  const listed = Array.isArray(manifest.files) ? manifest.files : [];
  const bad = [];
  const missing = [];
  let verified = 0;
  for (const entry of listed) {
    const bytes = files.get(entry.path);
    if (!bytes) { missing.push(entry.path); continue; }
    const same = bytes.length === entry.size && (await sha256(bytes)) === entry.sha256;
    if (same) verified += 1; else bad.push(entry.path);
  }
  add("every listed file is present", missing.length === 0, missing.length ? `Missing: ${missing.join(", ")}` : `${listed.length} file(s) listed.`);
  add("every file matches its recorded SHA-256", bad.length === 0, bad.length ? `Changed: ${bad.join(", ")}` : `${verified} file(s) verified.`);
  const known = new Set([...listed.map((entry) => entry.path), "manifest.json", "SEAL.txt", "verify.html"]);
  const unlisted = [...files.keys()].filter((name) => !known.has(name));
  add("no file was added", unlisted.length === 0, unlisted.length ? `Not in the manifest: ${unlisted.join(", ")}` : "");
  return result({ seal, bad, missing, unlisted, verified, listed: listed.length, passport: manifest.passport ?? null });
}

// Pure SHA-256 for browsers without crypto.subtle (also self-contained and stringified into verify.html).
export function sha256PureHex(bytes) {
  const K = new Uint32Array([0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2]);
  const H = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
  const length = bytes.length;
  const padded = new Uint8Array(((length + 9 + 63) >> 6) << 6);
  padded.set(bytes);
  padded[length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, Math.floor((length * 8) / 0x100000000));
  view.setUint32(padded.length - 4, (length * 8) >>> 0);
  const w = new Uint32Array(64);
  const rotr = (x, n) => (x >>> n) | (x << (32 - n));
  for (let off = 0; off < padded.length; off += 64) {
    for (let i = 0; i < 16; i += 1) w[i] = view.getUint32(off + i * 4);
    for (let i = 16; i < 64; i += 1) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i += 1) {
      const t1 = (h + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) >>> 0;
      const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0; H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0; H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
  }
  return [...H].map((x) => x.toString(16).padStart(8, "0")).join("");
}

// Run the same verifier on a zip's entries on the server.
export async function verifyBundleEntries(map, expectedSeal = null) {
  return passportVerifierCore(map, async (bytes) => sha256Hex(Buffer.from(bytes)), expectedSeal);
}

// ---------------- verify.html ----------------

export function verifierHtml() {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Evidence Passport verifier</title>
<style>
body{font:15px/1.5 system-ui,Segoe UI,Arial,sans-serif;max-width:860px;margin:32px auto;padding:0 16px;color:#111}
h1{margin:0 0 4px}.box{border:1px solid #d1d5db;border-radius:8px;padding:14px 16px;margin:14px 0}
.pass{background:#ecfdf5;border-color:#6ee7b7}.fail{background:#fef2f2;border-color:#fca5a5}
ul{list-style:none;padding:0}li{padding:4px 0}.ok::before{content:"\\2713  ";color:#047857;font-weight:700}.no::before{content:"\\2717  ";color:#b91c1c;font-weight:700}
code,.mono{font-family:ui-monospace,Consolas,monospace;word-break:break-all}input[type=text]{width:100%;padding:6px;font-family:ui-monospace,Consolas,monospace}
</style></head><body>
<h1>Evidence Passport verifier</h1>
<p>This page checks a vFirm Evidence Passport on your own computer. Nothing is uploaded and no account is needed. It recomputes the SHA-256 of every file and compares it with the manifest, then checks the manifest against its seal.</p>
<div class="box"><p><strong>1. Choose the passport.</strong> Either the unzipped folder, or the .zip file.</p>
<p><label>Folder: <input type="file" id="folder" webkitdirectory directory multiple></label></p>
<p><label>or .zip file: <input type="file" id="zip" accept=".zip,application/zip"></label></p>
<p><label>2. Optional: the seal you were given separately<br><input type="text" id="expected" placeholder="paste the seal here to compare" autocomplete="off"></label></p></div>
<div id="out" aria-live="polite"></div>
<script>
"use strict";
const verifierCore = ${passportVerifierCore.toString()};
const sha256Pure = ${sha256PureHex.toString()};
async function sha256(bytes){
  if (window.crypto && window.crypto.subtle) {
    const digest = await window.crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  return sha256Pure(bytes);
}
async function inflate(data){
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
async function readZip(buffer){
  const u8 = new Uint8Array(buffer), dv = new DataView(buffer), files = new Map();
  let end = -1;
  for (let i = u8.length - 22; i >= Math.max(0, u8.length - 65557); i--) { if (dv.getUint32(i, true) === 0x06054b50) { end = i; break; } }
  if (end < 0) throw new Error("This is not a zip file.");
  const count = dv.getUint16(end + 10, true);
  let pos = dv.getUint32(end + 16, true);
  for (let n = 0; n < count; n++) {
    if (dv.getUint32(pos, true) !== 0x02014b50) throw new Error("The zip directory is damaged.");
    const method = dv.getUint16(pos + 10, true), csize = dv.getUint32(pos + 20, true);
    const nlen = dv.getUint16(pos + 28, true), elen = dv.getUint16(pos + 30, true), clen = dv.getUint16(pos + 32, true);
    const loff = dv.getUint32(pos + 42, true);
    const name = new TextDecoder().decode(u8.subarray(pos + 46, pos + 46 + nlen));
    pos += 46 + nlen + elen + clen;
    const start = loff + 30 + dv.getUint16(loff + 26, true) + dv.getUint16(loff + 28, true);
    const raw = u8.subarray(start, start + csize);
    if (name.endsWith("/")) continue;
    if (method === 0) files.set(name, raw);
    else if (method === 8) files.set(name, await inflate(raw));
    else throw new Error("Unsupported zip compression in " + name);
  }
  return files;
}
function show(result){
  const out = document.getElementById("out");
  out.textContent = "";
  const box = document.createElement("div");
  box.className = "box " + (result.ok ? "pass" : "fail");
  const head = document.createElement("h2");
  head.textContent = result.ok ? "PASS: every file matches" : "FAIL: this passport does not verify";
  box.appendChild(head);
  if (result.passport) { const p = document.createElement("p"); p.textContent = result.passport.number + " | " + result.passport.purpose + " | issued " + result.passport.issued_at; box.appendChild(p); }
  const list = document.createElement("ul");
  for (const c of result.checks) { const li = document.createElement("li"); li.className = c.ok ? "ok" : "no"; li.textContent = c.name + (c.detail ? ": " + c.detail : ""); list.appendChild(li); }
  box.appendChild(list);
  if (result.seal) { const s = document.createElement("p"); s.innerHTML = "Seal computed from this manifest:<br>"; const code = document.createElement("code"); code.textContent = result.seal; s.appendChild(code); box.appendChild(s); }
  out.appendChild(box);
}
async function run(files){
  document.getElementById("out").textContent = "Checking...";
  try { show(await verifierCore(files, sha256, document.getElementById("expected").value || null)); }
  catch (error) { document.getElementById("out").textContent = "Could not check this: " + error.message; }
}
document.getElementById("folder").addEventListener("change", async (event) => {
  const files = new Map();
  for (const file of event.target.files) {
    const parts = (file.webkitRelativePath || file.name).split("/");
    files.set(parts.slice(1).join("/") || file.name, new Uint8Array(await file.arrayBuffer()));
  }
  await run(files);
});
document.getElementById("zip").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  try { await run(await readZip(await file.arrayBuffer())); }
  catch (error) { document.getElementById("out").textContent = "Could not read this zip: " + error.message; }
});
</script></body></html>
`;
}
