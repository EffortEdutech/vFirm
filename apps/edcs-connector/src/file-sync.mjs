// CE-S6 (ADR-101): the controlled folders -- files that belong to BizKick transactions.
//
// Each configured folder is walked (read-only). A file is a candidate when its size or modified time changed
// since the last look; it is then fingerprinted (SHA-256, streamed) and, only if the fingerprint is new, a
// delivery is queued. WHAT is sent depends on the firm's content policy (D7), which vFirm hands the connector
// on every heartbeat, per document type: under CONTENT the file's bytes go with the delivery (within the size
// cap); under any metadata-only policy -- the default for HR and other sensitive documents -- only the name,
// size and fingerprint go, and the bytes never leave the PC. vFirm enforces the same policy again on its side.

import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { basename, extname, join, relative } from "node:path";
import { extractTransactionId } from "../../../packages/core-domain/src/edcs-chains.mjs";

const MIME_BY_EXTENSION = {
  ".pdf": "application/pdf", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".txt": "text/plain", ".csv": "text/csv",
  ".doc": "application/msword", ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel", ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
};

function hashFile(path) {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    createReadStream(path).on("data", (chunk) => hash.update(chunk)).on("error", reject).on("end", () => resolve(hash.digest("hex")));
  });
}

async function* walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return; // a folder that is not there (yet) is simply empty
    throw error;
  }
  for (const entry of entries) {
    if (entry.name.startsWith(".") || entry.name.startsWith("~$") || entry.name === "_vFirm_Outbox") continue; // hidden, Office lock files, our own outbox
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else if (entry.isFile()) yield path;
  }
}

// Returns { queued, metadata_only, with_content, skipped_large }.
export async function scanControlledFolders({ config, state, queue, companyCode, contentPolicy }) {
  const result = { queued: 0, metadata_only: 0, with_content: 0, skipped_large: 0 };
  if (!companyCode) return result;
  const memory = (state.files ??= {});
  for (const folder of config.controlled) {
    for await (const path of walk(folder.path)) {
      const key = relative(config.bizkick_root, path) || path;
      const info = await stat(path);
      const known = memory[key];
      if (known && known.size === info.size && known.mtimeMs === info.mtimeMs) continue;
      const sha256 = await hashFile(path);
      memory[key] = { size: info.size, mtimeMs: info.mtimeMs, sha256 };
      if (known && known.sha256 === sha256) continue; // touched but identical
      const filename = basename(path);
      const found = extractTransactionId(filename, companyCode);
      const policy = found.status === "FOUND" ? (contentPolicy?.[found.document_type] ?? "METADATA_ONLY") : "METADATA_ONLY";
      const body = { filename, mime_type: MIME_BY_EXTENSION[extname(filename).toLowerCase()] ?? "application/octet-stream", sha256, size_bytes: info.size, role: folder.role };
      if (policy === "CONTENT") {
        if (info.size > config.max_file_bytes) {
          result.skipped_large += 1;
          body.content_withheld = "FILE_TOO_LARGE"; // metadata only; vFirm will answer that it needs the bytes
        } else {
          body.content_base64 = (await readFile(path)).toString("base64");
          result.with_content += 1;
        }
      }
      if (!body.content_base64) result.metadata_only += 1;
      await queue.enqueue("file", body, { idempotencyKey: `file-${sha256}-${found.status === "FOUND" ? found.transaction_id : "none"}-${folder.role}` });
      result.queued += 1;
    }
  }
  return result;
}
