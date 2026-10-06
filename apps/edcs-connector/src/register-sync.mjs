// CE-S6 (ADR-101): reading the BizKick register and turning a change into a delta.
//
// The register file is only ever READ here. It is parsed with the same reader and the same row rules vFirm
// uses (packages/core-domain/src/edcs-register.mjs), a digest is kept for every row, and a delivery is queued
// only for the rows whose digest changed since the last delivery -- plus the identities of the whole file, so
// vFirm can still tell duplicates and vanished rows. Change one row, one sync event. Change nothing, nothing
// is sent.

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { TabularReadError } from "../../../packages/core-domain/src/tabular-file-reader.mjs";
import { readRegisterFile, registerRowDigest, registerRowIdentity } from "../../../packages/core-domain/src/edcs-register.mjs";

const sha256 = (buffer) => createHash("sha256").update(buffer).digest("hex");

// The key a row is remembered under: its Transaction ID. A second row with the same ID (a duplicate in the
// file) is remembered under a suffixed key so both are tracked.
function keyRows(rows, companyCode) {
  const seen = new Map();
  const keyed = [];
  const present = [];
  for (const row of rows) {
    const identity = registerRowIdentity(row.cells, companyCode);
    if (identity.ignored) continue;
    let key;
    if (identity.transaction_id) {
      const count = seen.get(identity.transaction_id) ?? 0;
      seen.set(identity.transaction_id, count + 1);
      key = count === 0 ? identity.transaction_id : `${identity.transaction_id}#${count + 1}`;
      present.push([identity.transaction_id, row.row_number]);
    } else {
      key = `row:${row.row_number}`;
    }
    keyed.push({ key, row, digest: registerRowDigest(row.cells) });
  }
  return { keyed, present };
}

// Returns { status, queued } where status is one of
//   UNCHANGED   the file's SHA-256 is what was last delivered
//   NO_DELTA    the file changed but no governed cell did (formatting, computed columns)
//   QUEUED      one or more deliveries were queued
//   STRUCTURE   the workbook no longer has the agreed structure; a rejection was queued (once per file version)
//   WAITING     the company code is not known yet (no heartbeat answered), nothing can be judged
export async function scanRegister({ config, state, queue, companyCode }) {
  if (!companyCode) return { status: "WAITING", queued: 0 };
  const buffer = await readFile(config.register_file); // read-only; a missing file throws ENOENT for the agent to report
  const fileSha = sha256(buffer);
  const memory = (state.register ??= { file_sha256: null, rows: {}, present_sig: null, structure_sha: null });
  if (memory.file_sha256 === fileSha) return { status: "UNCHANGED", queued: 0 };

  const filename = basename(config.register_file);
  const base = { filename, sha256: fileSha, size_bytes: buffer.length };
  let parsed;
  try {
    parsed = readRegisterFile({ filename, mime_type: "", buffer });
  } catch (error) {
    if (!(error instanceof TabularReadError)) throw error;
    parsed = { ok: false, reason: "FILE_UNREADABLE", detail: error.message };
  }

  if (!parsed.ok) {
    memory.file_sha256 = fileSha;
    if (memory.structure_sha === fileSha) return { status: "UNCHANGED", queued: 0 };
    memory.structure_sha = fileSha;
    await queue.enqueue("register", {
      ...base, structure_error: { reason: parsed.reason, detail: parsed.detail, expected: parsed.expected ?? null, found: parsed.found ?? null, column: parsed.column ?? null }
    });
    return { status: "STRUCTURE", queued: 1 };
  }

  const { keyed, present } = keyRows(parsed.rows, companyCode);
  const changed = keyed.filter(({ key, digest }) => memory.rows[key] !== digest);
  const presentSig = sha256(JSON.stringify(present.map(([id]) => id).sort()));
  const nextRows = Object.fromEntries(keyed.map(({ key, digest }) => [key, digest]));

  if (changed.length === 0 && memory.present_sig === presentSig) {
    memory.file_sha256 = fileSha;
    memory.structure_sha = null;
    memory.rows = nextRows;
    return { status: "NO_DELTA", queued: 0 };
  }

  const size = Math.max(1, config.max_rows_per_delivery);
  const chunks = [];
  for (let i = 0; i < changed.length; i += size) chunks.push(changed.slice(i, i + size));
  if (chunks.length === 0) chunks.push([]); // only removals: vFirm still needs the identities to flag vanished rows
  for (const chunk of chunks) {
    await queue.enqueue("register", { ...base, rows: chunk.map(({ row }) => ({ row_number: row.row_number, cells: row.cells })), present });
  }
  memory.file_sha256 = fileSha;
  memory.structure_sha = null;
  memory.rows = nextRows;
  memory.present_sig = presentSig;
  return { status: "QUEUED", queued: chunks.length };
}
