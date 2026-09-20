// HM-S3 item 6 -- staff template copy no longer names real pilot firms.
//
// Read-only: fetches GET /awia/virtual-staff/templates (the shared
// catalogue every firm sees) and asserts none of the template
// descriptions mention a real pilot firm by name.

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
await loadLocalEnv(join(root, ".env.local"));

const apiBase = process.env.VFIRM_API_BASE ?? "http://127.0.0.1:3091";

// Real firm names that must never appear in shared catalogue copy.
const bannedNames = ["Amanah Formwork Pilot Firm", "NHL Global Solution"];

async function main() {
  const response = await fetch(`${apiBase}/awia/virtual-staff/templates`);
  const json = await response.json();
  if (!response.ok || !json?.ok) {
    throw new Error(`GET /awia/virtual-staff/templates failed: ${response.status} ${JSON.stringify(json)}`);
  }

  const templates = json.data?.templates ?? [];
  const findings = [];
  for (const template of templates) {
    for (const bannedName of bannedNames) {
      if (template.description?.includes(bannedName)) {
        findings.push({ template_id: template.template_id, banned_name: bannedName });
      }
    }
  }

  const isClean = findings.length === 0 && templates.length > 0;
  console.log(JSON.stringify({
    check: "hm-s3-item-6-template-copy-clean",
    checked_at: new Date().toISOString(),
    api_base: apiBase,
    template_count: templates.length,
    templates_checked: templates.map((t) => ({ template_id: t.template_id, description: t.description })),
    findings,
    is_clean: isClean
  }, null, 2));

  if (!isClean) process.exitCode = 1;
}

async function loadLocalEnv(path) {
  if (!existsSync(path)) return;
  const body = await readFile(path, "utf8");
  for (const line of body.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^[ '"]|[ '"]$/g, "");
    if (key && !(key in process.env)) process.env[key] = value;
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ check: "hm-s3-item-6-template-copy-clean", is_clean: false, fatal_error: error.message }, null, 2));
  process.exit(1);
});
