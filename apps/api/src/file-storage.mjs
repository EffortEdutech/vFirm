// ADR-089 W1 (B1, 2026-09-30): byte storage for uploaded firm files.
//
// Decision D1: Supabase Storage (private bucket) in any environment that has the Supabase
// service-role credentials the API already uses for auth (VFIRM_SUPABASE_URL +
// VFIRM_SUPABASE_SERVICE_ROLE_KEY); local disk otherwise (development). Force either with
// VFIRM_FILE_STORAGE_BACKEND=supabase|local.
//
// Every object key is tenant- and firm-prefixed (tenant/<tenant_id>/firm/<firm_id>/<file_id>) and
// the bucket is never public: bytes are only ever served back through the API's scope-checked
// GET /files/<id>/download route. Metadata (filename, SHA-256, size, uploader) lives in the
// file_objects collection -- see registerFileObjectRecord() in store.mjs.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";
import { createHash } from "node:crypto";

export const FILE_ALLOWED_TYPES = Object.freeze({
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "application/vnd.ms-excel": [".xls"],
  "text/csv": [".csv"],
  "text/plain": [".txt"],
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"]
});

export const FILE_CLASSIFICATIONS = Object.freeze(["CLIENT_CONFIDENTIAL", "FIRM_INTERNAL", "HR_RESTRICTED", "FINANCE_RESTRICTED"]);

export function fileMaxBytes() {
  const configured = Number(process.env.VFIRM_FILE_MAX_BYTES ?? 0);
  return Number.isFinite(configured) && configured > 0 ? configured : 25 * 1024 * 1024;
}

export function sha256Hex(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

// Normalizes a client-supplied filename to a safe display name (never used as a path).
export function sanitizeFilename(name) {
  const base = String(name ?? "").split(/[\\/]/).pop().replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return (base || "file").slice(0, 200);
}

// Resolves the effective MIME type and rejects anything outside the allowlist. Browsers often send
// CSV as application/vnd.ms-excel or an empty type, so the extension is the tiebreaker.
export function resolveAllowedMimeType(filename, declaredType) {
  const lower = filename.toLowerCase();
  const declared = String(declaredType ?? "").split(";")[0].trim().toLowerCase();
  if (FILE_ALLOWED_TYPES[declared]?.some((ext) => lower.endsWith(ext))) return declared;
  for (const [mime, exts] of Object.entries(FILE_ALLOWED_TYPES)) {
    if (exts.some((ext) => lower.endsWith(ext))) return mime;
  }
  const error = new Error(`File type not allowed: ${filename}. Allowed: ${[...new Set(Object.values(FILE_ALLOWED_TYPES).flat())].join(", ")}`);
  error.code = "FILE_TYPE_NOT_ALLOWED";
  error.status = 415;
  throw error;
}

export function storageKeyFor({ tenant_id, firm_id, file_id }) {
  return `tenant/${tenant_id}/firm/${firm_id}/${file_id}`;
}

export function createFileStorage({ supabaseAdmin = null, root = process.cwd() } = {}) {
  const requested = (process.env.VFIRM_FILE_STORAGE_BACKEND ?? "").toLowerCase();
  const backend = requested === "local" || requested === "supabase" ? requested : supabaseAdmin ? "supabase" : "local";
  if (backend === "supabase" && !supabaseAdmin) throw new Error("VFIRM_FILE_STORAGE_BACKEND=supabase requires VFIRM_SUPABASE_URL and VFIRM_SUPABASE_SERVICE_ROLE_KEY.");
  const bucket = process.env.VFIRM_FILE_BUCKET ?? "vfirm-files";
  const localRoot = resolve(process.env.VFIRM_FILE_LOCAL_DIR ?? join(root, "data/files"));
  let bucketChecked = false;

  function localPath(key) {
    const full = resolve(localRoot, key);
    if (!full.startsWith(localRoot + sep)) throw new Error("Invalid storage key.");
    return full;
  }

  async function ensureBucket() {
    if (bucketChecked) return;
    const { data, error } = await supabaseAdmin.storage.getBucket(bucket);
    if (error || !data) {
      const created = await supabaseAdmin.storage.createBucket(bucket, { public: false, fileSizeLimit: fileMaxBytes() });
      if (created.error && !/already exists/i.test(created.error.message ?? "")) throw new Error(`Supabase Storage bucket "${bucket}" unavailable: ${created.error.message}`);
    } else if (data.public) {
      throw new Error(`Supabase Storage bucket "${bucket}" is public; file storage requires a private bucket.`);
    }
    bucketChecked = true;
  }

  return {
    backend,
    bucket: backend === "supabase" ? bucket : null,
    async put(key, buffer, contentType) {
      if (backend === "local") {
        const path = localPath(key);
        await mkdir(dirname(path), { recursive: true });
        await writeFile(path, buffer, { flag: "wx" });
        return;
      }
      await ensureBucket();
      const { error } = await supabaseAdmin.storage.from(bucket).upload(key, buffer, { contentType, upsert: false });
      if (error) throw new Error(`File upload to storage failed: ${error.message}`);
    },
    async get(key) {
      if (backend === "local") return readFile(localPath(key));
      await ensureBucket();
      const { data, error } = await supabaseAdmin.storage.from(bucket).download(key);
      if (error || !data) throw new Error(`File download from storage failed: ${error?.message ?? "no data"}`);
      return Buffer.from(await data.arrayBuffer());
    }
  };
}
