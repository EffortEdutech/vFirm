-- Backfills the missing schema_migrations bookkeeping rows for the 4 migrations you already
-- applied directly to production (0024_zzz/0025/0026/0027), whose tables/indexes were verified
-- present in the audit but whose schema_migrations rows were never recorded because they were run
-- by hand rather than through scripts/db-migrate.mjs. Checksums below are sha256 of each migration
-- file's exact current content (matching how db-migrate.mjs computes them), so a future migration
-- run correctly recognizes these as already applied and skips them, instead of re-running them or
-- (if the file content ever legitimately changes later) throwing a checksum-mismatch error.
-- Read-only risk: this INSERTs tracking metadata only -- it does not touch any table's data or
-- structure. Safe to run once against production.
insert into schema_migrations (filename, checksum) values ('0024_zzz_reconcile_firm_factory_table_collisions.sql', '8c8dd9beaa4122fb1c18cc3280883c59000eb2afaa874fc60cad9bd083242d94') on conflict (filename) do update set checksum = excluded.checksum, applied_at = now();
insert into schema_migrations (filename, checksum) values ('0025_firm_factory_persistence.sql', '89beef3aba34e62ae246d46049b368fd5ae3cb7a3ce7fb8ccf9f5af3f6057c83') on conflict (filename) do update set checksum = excluded.checksum, applied_at = now();
insert into schema_migrations (filename, checksum) values ('0026_remaining_relational_tables.sql', '207d161495c44b97a82e42ddc682c3963bf91391548d8db4d692dbde1c08b450') on conflict (filename) do update set checksum = excluded.checksum, applied_at = now();
insert into schema_migrations (filename, checksum) values ('0027_quotation_and_awia_package_persistence.sql', 'f8c388ea4675032a48ba9c5f08e5ba96f3c2f03fe1702a705abd988f43e90143') on conflict (filename) do update set checksum = excluded.checksum, applied_at = now();

select filename, applied_at from schema_migrations order by filename;