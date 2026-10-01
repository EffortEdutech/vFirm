// HM-S7 Phase 2 backfill (2026-09-24).
//
// Phase 2 gave every NEWLY hired/provisioned AWIA virtual staff member a real `actors` row
// (ensureAwiaAgentActor() in apps/api/src/store.mjs) instead of only a synthetic `agent_id`
// string. That code only runs at hire/provisioning time, so it never touched staff members
// that already existed before Phase 2 shipped. The user confirmed 17 such rows exist in
// their real deployment (`select count(*) from awia_virtual_staff_members` -> 17).
//
// This script is that backfill, for those 17 (and only those) pre-existing rows. It:
//   1. Reads every row in awia_virtual_staff_members whose `record` jsonb has no
//      `agent_actor_id` yet.
//   2. Computes the SAME deterministic actor id ensureAwiaAgentActor() would compute for
//      that (firm_id, staff_code) -- so a member hired before this backfill and one hired
//      after both resolve to the identical actor id, with nothing to reconcile later.
//   3. Inserts a real `actors` row (actor_type = 'AI_AGENT') for it, ON CONFLICT DO NOTHING
//      (idempotent -- safe to re-run, e.g. if it's interrupted partway through).
//   4. Updates that member's `record` jsonb in place to add `agent_actor_id`, leaving every
//      other field (including the existing `agent_id` synthetic string) untouched.
//
// SAFETY:
//   - Defaults to DRY RUN: prints exactly what it would do and changes nothing. Pass
//     --apply to actually write.
//   - Reads DATABASE_URL from the environment. This script never sets or assumes a
//     connection string -- point it at whatever database you intend to run it against
//     (a disposable copy first, then your real one) by setting DATABASE_URL yourself
//     before running it. This was verified locally against a disposable Postgres instance
//     seeded with synthetic pre-Phase-2-shaped rows; it has never been run against any real
//     deployment from this session.
//   - Only ever touches rows missing `agent_actor_id` -- never re-touches a row Phase 2's
//     own hire/provisioning code already populated.
//
// Usage:
//   DATABASE_URL=postgresql://... node scripts/backfill-awia-agent-actors.mjs            # dry run
//   DATABASE_URL=postgresql://... node scripts/backfill-awia-agent-actors.mjs --apply     # writes

import pg from "pg";
import { createHash } from "node:crypto";

const APPLY = process.argv.includes("--apply");

// Identical to deterministicUuid() in apps/api/src/store.mjs -- kept as a literal copy here
// (not imported) so this one-off script has no dependency on the rest of the app and can be
// run standalone against any target database.
function deterministicUuid(seed) {
  const hash = createHash("sha256").update(String(seed)).digest("hex");
  const bytes = hash.slice(0, 32).split("");
  bytes[12] = "5";
  bytes[16] = "89ab"[parseInt(bytes[16], 16) % 4];
  const hex = bytes.join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function agentActorIdFor(firmId, staffCode) {
  return deterministicUuid(`awia-agent-actor-${firmId}-${staffCode.toLowerCase()}`);
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is not set. Point this at the database you intend to run against and try again.");
    process.exit(1);
  }
  console.log(`Mode: ${APPLY ? "APPLY (will write)" : "DRY RUN (no writes -- pass --apply to write)"}`);

  const pool = new pg.Pool({ connectionString: databaseUrl });
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `select id, natural_key, tenant_id, firm_id, record from awia_virtual_staff_members
       where record->>'agent_actor_id' is null or record->>'agent_actor_id' = ''
       order by created_at, id`
    );
    console.log(`Found ${rows.length} AWIA staff member row(s) missing agent_actor_id.`);
    if (rows.length === 0) {
      console.log("Nothing to do.");
      return;
    }

    let created = 0;
    let updated = 0;

    for (const row of rows) {
      const record = row.record ?? {};
      const staffCode = record.agent_code;
      const displayName = record.display_name ?? staffCode ?? row.natural_key;
      if (!staffCode) {
        console.warn(`SKIP: row ${row.id} (natural_key=${row.natural_key}) has no agent_code in its record -- cannot compute a deterministic actor id. Needs manual review.`);
        continue;
      }
      const agentActorId = agentActorIdFor(row.firm_id, staffCode);
      console.log(`- ${row.natural_key} (staff_code=${staffCode}, firm_id=${row.firm_id}) -> agent_actor_id=${agentActorId}`);

      if (!APPLY) continue;

      await client.query("begin");
      try {
        await client.query(
          `insert into actors (id, actor_type, person_id, worker_instance_id, system_id, external_service_id, tenant_id, firm_id, display_name, status, created_at, metadata)
           values ($1,'AI_AGENT',null,null,null,null,$2,$3,$4,'ACTIVE',now(),$5::jsonb)
           on conflict (id) do nothing`,
          [agentActorId, row.tenant_id, row.firm_id, displayName, JSON.stringify({ awia_staff_code: staffCode, backfilled: true, backfilled_at: new Date().toISOString() })]
        );
        created += 1;

        const updatedRecord = { ...record, agent_actor_id: agentActorId };
        await client.query(
          `update awia_virtual_staff_members set record = $1::jsonb, updated_at = now() where id = $2`,
          [JSON.stringify(updatedRecord), row.id]
        );
        updated += 1;

        await client.query("commit");
      } catch (error) {
        await client.query("rollback");
        console.error(`FAILED on row ${row.id} (staff_code=${staffCode}): ${error.message}`);
        throw error;
      }
    }

    if (APPLY) {
      console.log(`Done. Actor rows inserted (or already present): ${created}. Member records updated: ${updated}.`);
    } else {
      console.log("Dry run complete -- no changes made. Re-run with --apply to write these changes.");
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
