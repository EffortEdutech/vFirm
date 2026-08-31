import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const migrationsDir = join(root, "infra/database/migrations");
const args = new Set(process.argv.slice(2));
const mode = args.has("--apply") ? "apply" : "validate";
const dockerMode = args.has("--docker");

await loadLocalEnv(join(root, ".env.local"));

const databaseUrl = process.env.DATABASE_URL;
const dockerContainer = process.env.VFIRM_POSTGRES_CONTAINER ?? "vfirm-postgres";
const dockerDb = process.env.VFIRM_DB_NAME ?? "vfirm";
const dockerUser = process.env.VFIRM_DB_USER ?? "vfirm";

const files = (await readdir(migrationsDir)).filter((file) => file.endsWith(".sql")).sort();
const failures = [];
const migrationBodies = [];

if (files.length === 0) failures.push("No migration files found.");

for (const file of files) {
  const sql = await readFile(join(migrationsDir, file), "utf8");
  migrationBodies.push(sql);
  if (!/create table if not exists/i.test(sql)) failures.push(`${file}: no create table statements found.`);
}

const allSql = migrationBodies.join("\n");
for (const required of ["event_log", "audit_events", "app_state", "schema_migrations", "service_packs", "service_skus"]) {
  if (!new RegExp(`create table if not exists\\s+${required}`, "i").test(allSql)) failures.push(`Migrations missing required table: ${required}`);
}

if (failures.length > 0) {
  console.error("Migration validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

if (mode === "validate") {
  console.log(`Migration validation passed (${files.length} migration file${files.length === 1 ? "" : "s"}).`);
  console.log("Use `npm run db:migrate:docker` to apply migrations to the local Docker PostgreSQL container.");
  console.log("Use `npm run db:migrate:apply` with DATABASE_URL configured to apply migrations via host psql.");
  process.exit(0);
}

await ensureMigrationHistory();
let applied = 0;
let skipped = 0;

for (const file of files) {
  const migrationPath = join(migrationsDir, file);
  const sql = await readFile(migrationPath, "utf8");
  const checksum = createHash("sha256").update(sql).digest("hex");
  const current = await appliedMigration(file);
  if (current === checksum) {
    skipped += 1;
    continue;
  }
  if (current && current !== checksum) {
    throw new Error(`Migration checksum changed after apply: ${file}`);
  }
  await executeSql(sql, migrationPath);
  await recordMigration(file, checksum);
  applied += 1;
}

console.log(`Migration run complete. Applied ${applied}, skipped ${skipped}${dockerMode ? ` on Docker container ${dockerContainer}` : ""}.`);

async function ensureMigrationHistory() {
  await executeSql(`create table if not exists schema_migrations (\n  filename text primary key,\n  checksum text not null,\n  applied_at timestamptz not null default now()\n);`);
}

async function appliedMigration(file) {
  const sql = `select checksum from schema_migrations where filename = '${escapeSql(file)}';`;
  const out = await querySql(sql);
  const value = out.trim().split(/\r?\n/).map((line) => line.trim()).find(Boolean);
  return value ?? null;
}

async function recordMigration(file, checksum) {
  await executeSql(`insert into schema_migrations (filename, checksum) values ('${escapeSql(file)}', '${escapeSql(checksum)}') on conflict (filename) do update set checksum = excluded.checksum, applied_at = now();`);
}

async function executeSql(sql, filePath = null) {
  if (dockerMode) return run("docker", ["exec", "-i", dockerContainer, "psql", "-U", dockerUser, "-d", dockerDb, "-v", "ON_ERROR_STOP=1"], { input: sql });
  if (!databaseUrl) {
    console.error("DATABASE_URL is required for --apply unless --docker is used.");
    process.exit(1);
  }
  if (filePath) return run("psql", [databaseUrl, "-v", "ON_ERROR_STOP=1", "-f", filePath]);
  return run("psql", [databaseUrl, "-v", "ON_ERROR_STOP=1"], { input: sql });
}

async function querySql(sql) {
  if (dockerMode) return run("docker", ["exec", "-i", dockerContainer, "psql", "-U", dockerUser, "-d", dockerDb, "-tA", "-v", "ON_ERROR_STOP=1"], { input: sql, capture: true });
  if (!databaseUrl) {
    console.error("DATABASE_URL is required for --apply unless --docker is used.");
    process.exit(1);
  }
  return run("psql", [databaseUrl, "-tA", "-v", "ON_ERROR_STOP=1"], { input: sql, capture: true });
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
    const value = trimmed.slice(index + 1).trim().replace(/^[ '\"]|[ '\"]$/g, "");
    if (key && !(key in process.env)) process.env[key] = value;
  }
}

function escapeSql(value) {
  return String(value).replaceAll("'", "''");
}

function run(command, commandArgs, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, { stdio: [options.input ? "pipe" : "inherit", options.capture ? "pipe" : "inherit", options.capture ? "pipe" : "inherit"] });
    let stdout = "";
    let stderr = "";
    if (options.capture) {
      child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
      child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    }
    if (options.input) child.stdin.end(options.input);
    child.on("exit", (code) => code === 0 ? resolve(options.capture ? stdout : undefined) : reject(new Error(`${command} failed with exit code ${code}${stderr ? `\n${stderr}` : ""}`)));
    child.on("error", reject);
  });
}
