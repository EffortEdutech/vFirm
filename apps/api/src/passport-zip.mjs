// VI-S3: read a zip into Map<name, Uint8Array> for the passport verifier (server side).
import { entryBytes, readZip } from "../../../packages/core-domain/src/xlsx-package.mjs";

export function zipRead(buffer) {
  const map = new Map();
  for (const entry of readZip(buffer)) if (!entry.name.endsWith("/")) map.set(entry.name, new Uint8Array(entryBytes(entry)));
  return map;
}
