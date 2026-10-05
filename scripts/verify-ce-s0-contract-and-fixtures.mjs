#!/usr/bin/env node
// CE-S0 verification (ADR-094): integration contract present and complete, ADR recorded with
// CRLF intact, and the synthetic Nexa (NEX) BizKick fixture pack internally consistent.
// No dependencies: includes a tiny ZIP reader for the .xlsx fixtures. Run: npm run check:ce:s0-contract-and-fixtures
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { inflateRawSync } from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fx = path.join(root, "scripts", "fixtures", "bizkick");
const contractPath = path.join(root, "docs", "10_post_freeze_technical_design", "CONNECTED_EDCS_INTEGRATION_CONTRACT_v1.0.md");
const registerPath = path.join(root, "docs", "00_project_control", "DECISION_REGISTER.md");

const HEADERS = ["Company Code", "Document Type", "Year", "Sequence", "Transaction ID", "Revision", "Date Reserved", "Date Issued",
  "Counterparty Type", "Counterparty Name", "Subject / Description", "Amount", "Currency", "Status", "Owner", "Expiry / Due Date",
  "Days to Expiry", "Alert", "Related Transaction ID", "Original External Ref", "File Link / Path", "Last Updated", "Remarks", "Duplicate Check"];
const TYPES = ["QT", "SO", "DO", "INV", "RC", "CN", "CMP", "PR", "RFQ", "QC", "PO", "GRN", "SE", "PV", "EC", "PCV", "BR", "JV", "EMP", "LV", "TS", "OT", "EXIT", "SI", "ST", "SA", "SCV", "NDA", "AGR", "MIN", "DEC", "INC"];
const STATUSES = ["Reserved", "Draft", "Under Review", "Approved", "Issued", "Accepted", "Rejected", "Expired", "Completed", "Cancelled", "Superseded", "On Hold"];
const OUTCOMES = ["CREATED", "UPDATED", "REVISED", "UNCHANGED", "REJECTED", "CONFLICT", "ROW_MISSING"];

let failures = 0;
const ok = (cond, msg) => { if (!cond) { failures++; console.error("FAIL: " + msg); } else console.log("ok:   " + msg); };

// ---------- minimal zip reader ----------
function unzip(file) {
  const buf = readFileSync(file);
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i--) if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error("not a zip: " + file);
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const files = new Map();
  for (let n = 0; n < count; n++) {
    const method = buf.readUInt16LE(p + 10), csize = buf.readUInt32LE(p + 20);
    const nlen = buf.readUInt16LE(p + 28), elen = buf.readUInt16LE(p + 30), clen = buf.readUInt16LE(p + 32);
    const lho = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nlen);
    const lnlen = buf.readUInt16LE(lho + 26), lelen = buf.readUInt16LE(lho + 28);
    const start = lho + 30 + lnlen + lelen;
    const raw = buf.subarray(start, start + csize);
    files.set(name, method === 0 ? raw : inflateRawSync(raw));
    p += 46 + nlen + elen + clen;
  }
  return files;
}
const xmlText = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
function sheetFor(zip, name) {
  const wb = zip.get("xl/workbook.xml").toString("utf8");
  const rels = zip.get("xl/_rels/workbook.xml.rels").toString("utf8");
  const m = [...wb.matchAll(/<(?:\w+:)?sheet\b[^>]*>/g)].map((x) => x[0]).find((t) => new RegExp(`name="${name}"`).test(t));
  if (!m) return null;
  const rid = /r:id="([^"]+)"/.exec(m)[1];
  const rel = [...rels.matchAll(/<Relationship\b[^>]*>/g)].map((x) => x[0]).find((t) => t.includes(`Id="${rid}"`));
  const target = /Target="([^"]+)"/.exec(rel)[1].replace(/^\//, "").replace(/^(?!xl\/)/, "xl/");
  return zip.get(target).toString("utf8");
}
function readRows(sheetXml) {
  const rows = new Map();
  for (const rm of sheetXml.matchAll(/<(?:\w+:)?row\b[^>]*\br="(\d+)"[^>]*>([\s\S]*?)<\/(?:\w+:)?row>/g)) {
    const cells = {};
    for (const cm of rm[2].matchAll(/<(?:\w+:)?c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:\w+:)?c>)/g)) {
      const ref = /\br="([A-Z]+)\d+"/.exec(cm[1])[1];
      const body = cm[2] || "";
      const is = /<(?:\w+:)?is>[\s\S]*?<(?:\w+:)?t[^>]*>([\s\S]*?)<\/(?:\w+:)?t>/.exec(body);
      const v = /<(?:\w+:)?v>([\s\S]*?)<\/(?:\w+:)?v>/.exec(body);
      cells[ref] = is ? xmlText(is[1]) : v ? xmlText(v[1]) : "";
    }
    rows.set(Number(rm[1]), cells);
  }
  return rows;
}
const idOf = (c) => (c.A && c.B && c.C && c.D) ? `${c.A}-${c.B}-${String(Number(c.C)).padStart(4, "0")}-${String(Number(c.D)).padStart(4, "0")}` : "";
function register(file) {
  const zip = unzip(path.join(fx, file));
  const xml = sheetFor(zip, "TRANSACTION REGISTER");
  const rows = readRows(xml);
  const header = rows.get(6) || {};
  const data = [...rows.entries()].filter(([n, c]) => n >= 7 && c.B).map(([n, c]) => ({ n, c, composed: idOf(c) }));
  return { zip, header, data, rows };
}

// ---------- 1. contract ----------
ok(existsSync(contractPath), "integration contract file exists");
if (existsSync(contractPath)) {
  const t = readFileSync(contractPath, "utf8");
  ok(HEADERS.every((h) => t.includes(h)), "contract names all 24 register columns");
  ok(TYPES.every((c) => new RegExp(`\\b${c}\\b`).test(t)), "contract maps all 32 document type codes");
  ok(STATUSES.every((s) => t.includes(s)), "contract maps all 12 statuses");
  ok(OUTCOMES.every((o) => t.includes(o)), "contract defines all 7 outcome codes");
  ok(["D1", "D2", "D3", "D6", "D7", "D8"].every((d) => new RegExp(`\\b${d}\\b`).test(t)) && t.includes("ADR-094"), "contract records decisions D1, D2, D3, D6, D7, D8 and cites ADR-094");
  ok(/never edits|never writes|read-only/i.test(t), "contract states the golden rule (vFirm never edits BizKick sources)");
}

// ---------- 2. ADR-094 recorded, CRLF intact ----------
const reg = readFileSync(registerPath, "utf8");
const at = reg.indexOf("## ADR-094");
ok(at >= 0, "ADR-094 present in DECISION_REGISTER.md");
if (at >= 0) {
  const block = reg.slice(at);
  ok(!/[^\r]\n/.test(block), "ADR-094 block uses CRLF line endings throughout");
  ok(/Status: Accepted/.test(block) && /D3/.test(block) && /D8/.test(block), "ADR-094 records status and decisions");
}
ok(!/[^\r]\n/.test(reg.slice(reg.indexOf("## ADR-093"))), "ADR-093 onward still CRLF (no line-ending damage)");

// ---------- 3. fixtures ----------
const expected = JSON.parse(readFileSync(path.join(fx, "expected_outcomes.json"), "utf8"));
for (const f of Object.keys(expected.files)) ok(existsSync(path.join(fx, f)), `expected_outcomes references existing file ${f}`);

const base = register("register_01_baseline.xlsx");
ok(HEADERS.every((h, i) => base.header["ABCDEFGHIJKLMNOPQRSTUVWX"[i]] === h), "baseline: header row 6 has the 24 BK-SYS-005 columns");
ok(base.data.length === expected.files["register_01_baseline.xlsx"].rows, `baseline: ${base.data.length} populated rows match expected`);
ok(base.data.every((r) => r.c.E === r.composed), "baseline: cached Transaction ID equals Company Code-Type-Year-Sequence on every row");
ok(base.data.every((r) => r.c.A === expected.company_code), "baseline: every row has company code " + expected.company_code);
ok(base.data.every((r) => TYPES.includes(r.c.B) && (STATUSES.includes(r.c.N) || r.c.N === "")), "baseline: types and statuses are in the controlled lists");
const byId = new Map();
for (const r of base.data) byId.set(r.composed, (byId.get(r.composed) || []).concat(r.n));
const dupRows = [...byId.values()].filter((v) => v.length > 1).flat();
const exp = expected.files["register_01_baseline.xlsx"];
ok(dupRows.length === exp.counts.REJECTED, `baseline: ${dupRows.length} duplicate-ID rows match expected REJECTED count`);
ok(base.data.length - dupRows.length === exp.counts.CREATED, "baseline: valid unique rows match expected CREATED count");
ok(Object.entries(exp.per_row).every(([n, e]) => base.rows.get(Number(n)) && idOf(base.rows.get(Number(n))) === e.transaction_id), "baseline: per-row expectations point at the right rows");
const missingRelated = base.data.filter((r) => r.c.S && !byId.has(r.c.S)).map((r) => r.composed);
ok(missingRelated.length === 1 && missingRelated[0] === "NEX-DO-2026-0003", "baseline: exactly one related-ID-not-found row (NEX-DO-2026-0003)");
ok(base.data.some((r) => r.c.B === "QT" && r.c.C === "2025"), "baseline: includes a prior-year transaction");

const nocache = register("register_08_no_cached_values.xlsx");
ok(nocache.data.length === base.data.length && nocache.data.every((r) => r.c.E === ""), "register_08: formula columns carry no cached values (as BizKick ships)");
ok(nocache.data.every((r, i) => r.composed === base.data[i].composed), "register_08: IDs composable from parts match the baseline");

const rej = register("register_07_rejects.xlsx");
ok(rej.data.length === base.data.length + 8, "register_07: eight invalid rows appended");
ok(Object.keys(expected.files["register_07_rejects.xlsx"].changed).length === 8, "register_07: eight per-row expectations");
ok(register("register_09_header_changed.xlsx").header.L === "Total", "register_09: Amount header renamed to Total");
for (const f of ["register_02_status_update", "register_03_revision", "register_04_conflict_same_revision", "register_05_conflict_backwards_and_reopen", "register_06_row_missing"]) {
  const r = register(f + ".xlsx");
  const differs = r.data.length !== base.data.length || base.data.some((b) => JSON.stringify(r.rows.get(b.n) || {}) !== JSON.stringify(b.c));
  ok(differs, `${f}: differs from the baseline`);
}
const mc = unzip(path.join(fx, "NEX_BK-SYS-003_Master_Control_Workbook.xlsx"));
ok(/Approval Limits/.test(mc.get("xl/workbook.xml").toString("utf8")), "master control workbook has the Approval Limits sheet");

// ---------- 4. sample files ----------
const manifest = JSON.parse(readFileSync(path.join(fx, "sample_files", "manifest.json"), "utf8"));
ok(manifest.synthetic === true, "sample file manifest is marked synthetic");
for (const m of manifest.files) {
  const bytes = readFileSync(path.join(fx, "sample_files", m.file));
  ok(createHash("sha256").update(bytes).digest("hex") === m.sha256, `sample ${m.file}: SHA-256 matches manifest`);
  if (m.transaction_id && !m.file.includes("Orphan")) ok(byId.has(m.transaction_id), `sample ${m.file}: transaction ${m.transaction_id} exists in the register`);
  if (m.file.includes("Orphan")) ok(!byId.has("NEX-QT-2026-0099"), "orphan sample: its ID is not in the register");
  if (m.transaction_id) ok(m.file.startsWith(m.transaction_id), `sample ${m.file}: file name starts with its Transaction ID`);
}
const r1 = manifest.files.find((m) => m.file.includes("_R1_")), r0 = manifest.files.find((m) => m.file.includes("QT-2026-0001_R0"));
ok(r0 && r1 && r0.sha256 !== r1.sha256, "QT-0001 R0 and R1 sample files have different hashes");

console.log(failures ? `\nCE-S0 verification FAILED (${failures})` : "\nCE-S0 verification passed");
process.exit(failures ? 1 : 0);
