import pg from "pg";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

await loadLocalEnv(join(process.cwd(), ".env.local"));
const { Pool } = pg;
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required for PostgreSQL smoke test.");

const pool = new Pool({ connectionString: databaseUrl });
const requiredTables = [
  "schema_migrations", "service_packs", "service_skus", "worker_templates", "worker_instances", "task_outputs", "tool_invocations", "marketplace_listings", "capacity_offers", "collaboration_requests", "observatory_snapshots", "pilot_users", "support_cases", "pilot_incidents", "pilot_feedback", "pilot_acceptance_reviews", "pilot_improvement_items", "pilot_report_packs", "stakeholder_review_boards", "stakeholder_review_decisions", "pilot_expansion_cohorts", "tenant_onboarding_plans", "release_candidate_gates", "tenant_pilot_controls", "tenant_usage_events", "billing_readiness_reviews", "payment_provider_configs", "subscription_packages", "commercial_launch_controls", "firm_memberships", "tenants", "persons", "actors", "firms", "clients", "firm_client_relationships", "leads", "intake_sessions", "price_build_ups", "proposals", "approvals", "engagements", "projects", "work_packages", "tasks", "evidence_bundles", "invoices", "payment_statuses", "policy_decisions", "event_log", "audit_events", "app_state"
];

try {
  const tableRows = await pool.query(
    `select table_name from information_schema.tables where table_schema = 'public' and table_name = any($1::text[])`,
    [requiredTables]
  );
  const found = new Set(tableRows.rows.map((row) => row.table_name));
  const missing = requiredTables.filter((name) => !found.has(name));
  if (missing.length) throw new Error(`Missing PostgreSQL tables: ${missing.join(", ")}`);

  const servicePack = await pool.query("select code, status from service_packs where code = 'VF-SP-001'");
  if (servicePack.rowCount !== 1 || servicePack.rows[0].status !== "ACTIVE") throw new Error("Formwork service pack seed is missing or inactive.");

  const serviceSku = await pool.query("select code, status from service_skus where code = 'formwork_preliminary_wall_slab'");
  if (serviceSku.rowCount !== 1 || serviceSku.rows[0].status !== "ACTIVE") throw new Error("Formwork service SKU seed is missing or inactive.");

  console.log("PostgreSQL smoke test passed.");
} finally {
  await pool.end();
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
    const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");
    if (key && !(key in process.env)) process.env[key] = value;
  }
}











