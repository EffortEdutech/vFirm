-- vFirm database audit -- PART 3 of 3 -- which migrations this database has recorded
-- as applied. Plain read of a real, permanent table -- no function needed.
select filename, applied_at from schema_migrations order by filename;