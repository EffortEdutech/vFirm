// CE-S6 (ADR-101): the connector's configuration.
//
// A JSON file (see config.example.json). The token may instead come from the VFIRM_CONNECTOR_TOKEN
// environment variable so it never has to sit in a file the whole PC can read; the file value is the
// fallback. Paths in the file may be absolute (C:\BizKick, \\server\BizKick for a UNC share) or relative to
// bizkick_root.

import { readFile } from "node:fs/promises";
import { isAbsolute, join, resolve, sep } from "node:path";

export const AGENT_VERSION = "1.0.0";

const DEFAULTS = {
  topology: "A",
  poll_interval_seconds: 60,
  heartbeat_interval_seconds: 60,
  watch: true,
  watch_debounce_ms: 1500,
  max_file_bytes: 15 * 1024 * 1024,
  max_rows_per_delivery: 2000,
  retry: { base_ms: 5000, max_ms: 900000 },
  outbox_enabled: false,
  controlled_folders: []
};

export class ConfigError extends Error {}

export function normalizeConfig(raw, { env = process.env } = {}) {
  const config = { ...DEFAULTS, ...raw, retry: { ...DEFAULTS.retry, ...(raw.retry ?? {}) } };
  config.connector_token = env.VFIRM_CONNECTOR_TOKEN || raw.connector_token || "";
  const problems = [];
  if (!/^https?:\/\//i.test(String(config.vfirm_url ?? ""))) problems.push("vfirm_url (the vFirm API address, starting http:// or https://)");
  if (!String(config.connector_token).startsWith("vfc_")) problems.push("connector_token (issued in the vFirm console; or set VFIRM_CONNECTOR_TOKEN)");
  if (!config.bizkick_root) problems.push("bizkick_root (the BizKick folder, or its UNC path)");
  if (!config.register_path) problems.push("register_path (the register workbook, relative to bizkick_root)");
  if (!config.state_dir) problems.push("state_dir (where the connector keeps its queue and memory; NOT inside the BizKick folder)");
  if (!["A", "C"].includes(String(config.topology).toUpperCase())) problems.push("topology (A or C)");
  if (problems.length) throw new ConfigError(`Invalid connector configuration. Missing or wrong: ${problems.join("; ")}.`);

  config.vfirm_url = String(config.vfirm_url).replace(/\/+$/, "");
  config.topology = String(config.topology).toUpperCase();
  config.bizkick_root = resolve(config.bizkick_root);
  config.state_dir = resolve(config.state_dir);
  // The connector keeps its own files in state_dir. Refuse a state_dir inside BizKick: it would be a write there.
  const inside = (child, parent) => child === parent || child.startsWith(parent.endsWith(sep) ? parent : `${parent}${sep}`);
  if (inside(config.state_dir, config.bizkick_root)) throw new ConfigError("state_dir must be outside the BizKick folder: the connector never writes there.");
  const underRoot = (path) => (isAbsolute(path) ? resolve(path) : resolve(join(config.bizkick_root, path)));
  config.register_file = underRoot(config.register_path);
  config.controlled = (config.controlled_folders ?? []).map((entry) => {
    const item = typeof entry === "string" ? { path: entry } : entry;
    return { path: underRoot(item.path), role: item.role === "SUPPORTING" ? "SUPPORTING" : "PRIMARY" };
  });
  config.outbox_dir = join(config.bizkick_root, "_vFirm_Outbox");
  return config;
}

export async function loadConfig(path, options) {
  let raw;
  try {
    raw = JSON.parse((await readFile(path, "utf8")).replace(/^\uFEFF/, ""));
  } catch (error) {
    throw new ConfigError(`Cannot read the configuration file ${path}: ${error.message}`);
  }
  return normalizeConfig(raw, options);
}
