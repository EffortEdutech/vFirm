import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const required = [
  "infra/database/schema.sql",
  "packages/core-domain/src/types.ts",
  "packages/core-domain/src/events.ts",
  "packages/core-domain/src/api-contracts.ts",
  "packages/core-domain/src/index.ts",
  "packages/core-domain/src/factory-blueprints.ts",
  "packages/core-domain/src/factory-blueprints.mjs",
  "packages/core-domain/src/pack-certification.ts",
  "packages/core-domain/src/pack-certification.mjs",
  "packages/policy-engine/src/index.ts",
  "packages/service-packs/src/formwork.ts",
  "packages/service-packs/src/index.ts",
  "tests/policy/policy-fixtures.json",
  "tests/events/tenant-created.fixture.json",
  "tests/api-contracts/proposal-send.command.fixture.json",
  "tests/factory-blueprints/valid-formwork-firm.fixture.json",
  "tests/factory-blueprints/second-formwork-firm.fixture.json",
  "scripts/smoke-r3-blueprint-contract-lock.mjs",
  "scripts/smoke-r3-provisioning-kernel.mjs",
  "scripts/smoke-r3-pack-binding-certification.mjs",
  "scripts/smoke-r3-second-firm-rehearsal.mjs",
  "scripts/smoke-r3-factory-hardening-gate.mjs",
  "infra/database/migrations/0021_r3_s2_virtual_firm_factory_provisioning.sql",
  "infra/database/migrations/0022_r3_s3_pack_binding_certification.sql"
];

const failures = [];

for (const file of required) {
  try {
    await stat(join(root, file));
  } catch {
    failures.push(`Missing implementation artifact: ${file}`);
  }
}

const schema = await readFile(join(root, "infra/database/schema.sql"), "utf8");
for (const table of ["tenants", "actors", "firms", "professional_authorities", "clients", "intake_sessions", "proposals", "projects", "documents", "document_versions", "evidence_bundles", "approvals", "policy_decisions", "event_log", "audit_events"]) {
  if (!schema.includes(`create table if not exists ${table}`)) failures.push(`Database schema missing table: ${table}`);
}

const parseJson = async (path) => JSON.parse((await readFile(path, "utf8")).replace(/^\uFEFF/, ""));
const eventFixture = await parseJson(join(root, "tests/events/tenant-created.fixture.json"));
for (const field of ["event_id", "event_type", "event_version", "actor_id", "actor_type", "tenant_id", "aggregate_type", "aggregate_id", "correlation_id", "payload", "payload_summary"]) {
  if (!(field in eventFixture)) failures.push(`Event fixture missing field: ${field}`);
}

const policyFixtures = await parseJson(join(root, "tests/policy/policy-fixtures.json"));
if (!Array.isArray(policyFixtures) || policyFixtures.length < 5) failures.push("Policy fixtures must include at least five MVP cases.");
for (const fixture of policyFixtures) {
  if (!fixture.name || !fixture.input || !fixture.expected_result) failures.push(`Invalid policy fixture: ${fixture.name ?? "unnamed"}`);
}

const r3Blueprint = await parseJson(join(root, "tests/factory-blueprints/valid-formwork-firm.fixture.json"));
for (const key of ["firm_blueprint", "workforce_blueprint", "practice_pack_manifest", "service_delivery_pack_manifest", "governance_pack_manifest", "jurisdiction_pack_manifest"]) {
  if (!(key in r3Blueprint)) failures.push(`R3 valid blueprint fixture missing key: ${key}`);
}

if (failures.length > 0) {
  console.error("Implementation artifact validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Implementation artifact validation passed.");