import { createClient } from '@libsql/client';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';

/**
 * Dumps the PRODUCTION database (schema + data) to a SQL file that can be
 * restored into a fresh SQLite database (disaster recovery + migration
 * dry-run clones).
 *
 * SAFETY: read-only against production (SELECT / sqlite_master only).
 *
 * Usage: pnpm tsx scripts/db-dump.ts
 * Output: data/backup-prod-<timestamp>.sql (gitignored)
 */

function loadProdEnv(): { url: string; token: string } {
  const envPath = join(process.cwd(), '.env');
  if (!existsSync(envPath)) throw new Error('.env (production) not found');
  const envVars: Record<string, string> = {};
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...valueParts] = trimmed.split('=');
    if (key && valueParts.length > 0) {
      envVars[key] = valueParts.join('=').replace(/['"]/g, '');
    }
  }
  const { TURSO_URL, TURSO_TOKEN } = envVars;
  if (!TURSO_URL?.startsWith('libsql://') || !TURSO_TOKEN) {
    throw new Error('Refusing to run: .env TURSO_URL/TURSO_TOKEN do not look like production credentials');
  }
  return { url: TURSO_URL, token: TURSO_TOKEN };
}

function sqlValue(value: unknown): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Uint8Array) return `X'${Buffer.from(value).toString('hex')}'`;
  return `'${String(value).replace(/'/g, "''")}'`;
}

async function main(): Promise<void> {
  const { url, token } = loadProdEnv();
  const client = createClient({ url, authToken: token });

  const out: string[] = [
    '-- Production dump (schema + data)',
    `-- Source: ${url}`,
    `-- Generated: ${new Date().toISOString()}`,
    'PRAGMA foreign_keys=OFF;',
    'BEGIN TRANSACTION;',
  ];

  // Schema: tables first, then explicit indexes (auto-indexes have sql IS NULL).
  const master = await client.execute(
    `SELECT type, name, sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY CASE type WHEN 'table' THEN 0 ELSE 1 END, name`
  );
  const tables: string[] = [];
  for (const row of master.rows) {
    const sql = String(row.sql || '').trim();
    if (!sql) continue;
    out.push(`${sql};`);
    if (row.type === 'table') tables.push(String(row.name));
  }

  // Data: FK checks are off, so table order does not matter.
  const counts: Record<string, number> = {};
  for (const table of tables) {
    const result = await client.execute(`SELECT * FROM ${table}`);
    counts[table] = result.rows.length;
    if (result.rows.length === 0) continue;
    const columns = Object.keys(result.rows[0]).map((c) => `"${c}"`);
    for (const row of result.rows) {
      const values = columns.map((c) => sqlValue(row[c.slice(1, -1)]));
      out.push(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values.join(', ')});`);
    }
  }

  // AUTOINCREMENT counters, so a restored clone assigns the same next ids.
  try {
    const seq = await client.execute('SELECT * FROM sqlite_sequence');
    for (const row of seq.rows) {
      out.push(
        `INSERT INTO sqlite_sequence (name, seq) VALUES (${sqlValue(row.name)}, ${sqlValue(row.seq)});`
      );
    }
  } catch {
    out.push('-- sqlite_sequence not readable/dumpable on this target (skipped)');
  }

  out.push('COMMIT;');

  const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 17);
  const outPath = join(process.cwd(), 'data', `backup-prod-${stamp}.sql`);
  writeFileSync(outPath, out.join('\n'), 'utf-8');

  console.log(`✅ Dump: ${outPath}`);
  console.log(`   Tablas: ${tables.join(', ')}`);
  for (const [table, n] of Object.entries(counts)) console.log(`   ${table}: ${n} filas`);
  console.log('   Producción no fue modificada.');
}

main().catch((err) => {
  console.error('❌ Dump failed:', err);
  process.exit(1);
});
