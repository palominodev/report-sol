# Runbook: Production Schema Migration — 2026-09-18

## Target

Turso: `libsql://reportsoldb-palominodev.aws-us-east-1.turso.io` (credentials in `.env`).

## What was applied

Additive-only migration, executed via `pnpm tsx scripts/db-migrate-prod.ts --prod`
after a full dry-run on a clone restored from `pnpm tsx scripts/db-dump.ts` output.

1. `ALTER TABLE usuario ADD COLUMN genero TEXT CHECK(genero IN ('masculino','femenino'))`
2. `ALTER TABLE usuario ADD COLUMN familia_id INTEGER`
   (intentionally FK-less: no `familia` table exists yet)
3. `CREATE TABLE IF NOT EXISTS` + indexes for:
   `presentation_week`, `presentation_part` (tipo CHECK with 7 values, including
   `escenificacion` and `que_diria`), `presentation_assignment`, `presentation_sync_state`
4. Seed from local dev DB: 21 `presentation_week` rows + 61 `presentation_part` rows
   (PKs preserved; weeks use ids 6–13 and 22–34, AUTOINCREMENT high-water = 34).
   `presentation_assignment` NOT seeded (regenerated in prod per week).
   `presentation_sync_state` NOT seeded (self-initializes via `ON CONFLICT DO UPDATE`).

## Post-migration evidence

- All 10 tables verified via `PRAGMA table_info`.
- `sqlite_sequence`: `presentation_week=34`, `presentation_part=104` (match seeded PKs).
- Clone probes: CHECK rejects invalid `genero`/`tipo`; `escenificacion` and `que_diria`
  inserts succeed; `PRAGMA foreign_key_check` clean.
- Round-trip: `pnpm tsx scripts/dev-backup-from-prod.ts` now pulls
  presentation tables (21/61/0) idempotently.

## Canonical schema

`src/db.sql` is reconciled: `usuario.genero` + `usuario.familia_id`, `informe.notas`,
7-value `presentation_part.tipo` CHECK. `db.sql` is now the source of truth;
`scripts/migrate-genero.ts` is historical.

## Rollback

Only if the migration must be reverted (data loss warning: seeded weeks/parts
and any assignments created in prod would be dropped):

```sql
DROP TABLE IF EXISTS presentation_assignment;
DROP TABLE IF EXISTS presentation_part;
DROP TABLE IF EXISTS presentation_week;
DROP TABLE IF EXISTS presentation_sync_state;
ALTER TABLE usuario DROP COLUMN familia_id;
ALTER TABLE usuario DROP COLUMN genero;
```

Full restore alternative: rebuild from the pre-migration dump
(`data/backup-prod-2026-09-18-13-06-.sql`) or Turso PITR.

## Tooling

| Script | Purpose |
| --- | --- |
| `scripts/db-dump.ts` | Read-only prod dump (schema + data) for backup/clones |
| `scripts/db-migrate-prod.ts` | Guarded additive migration; `--db` for clones, `--prod` for production, `--no-seed` for DDL only |
| `scripts/db-push.ts` | Applies `src/db.sql`; local by default, `--prod` explicit; skips only idempotent errors |
