import { describe, it, expect } from 'vitest';
import { createClient } from '@libsql/client';
import { ensureSalaUniqueIndex } from '../migrate-sala-unique-index';
import { restorePlainUniqueConstraint } from '../migrate-sala-unique-index-down';

type DatabaseClient = ReturnType<typeof createClient>;

/**
 * Mirrors src/db.sql presentation tables in their CURRENT pre-migration
 * shape: presentation_part already carries the sala column but still holds
 * the table-level UNIQUE(id_week, tipo, orden). usuario + assignment child
 * table included so the rebuild's FK behavior is exercised end to end.
 */
async function freshOldShapeClient(): Promise<DatabaseClient> {
  const client = createClient({ url: ':memory:' });
  await client.execute('PRAGMA foreign_keys = ON');
  await client.execute(`
    CREATE TABLE usuario (
      id_usuario INTEGER PRIMARY KEY,
      nombre TEXT NOT NULL,
      apellido TEXT NOT NULL
    )
  `);
  await client.execute(`
    CREATE TABLE presentation_week (
      id_week INTEGER PRIMARY KEY AUTOINCREMENT,
      semana TEXT NOT NULL UNIQUE,
      issue TEXT NOT NULL,
      fecha_inicio TEXT NOT NULL,
      fecha_fin TEXT NOT NULL,
      estado TEXT NOT NULL DEFAULT 'no_generada'
        CHECK(estado IN ('no_generada','borrador','confirmada')),
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    )
  `);
  await client.execute(`
    CREATE TABLE presentation_part (
      id_part INTEGER PRIMARY KEY AUTOINCREMENT,
      id_week INTEGER NOT NULL,
      orden INTEGER NOT NULL,
      tipo TEXT NOT NULL CHECK(tipo IN
        ('lectura_biblia','empiece_conversaciones','haga_revisitas','haga_discipulos','discurso','que_diria','explique_sus_creencias')),
      seccion TEXT NOT NULL CHECK(seccion IN ('TESOROS_DE_LA_BIBLIA','SEAMOS_MEJORES_MAESTROS')),
      duracion_min INTEGER NOT NULL CHECK(duracion_min > 0),
      escenario TEXT CHECK(escenario IS NULL OR escenario IN
        ('DE_CASA_EN_CASA','PREDICACION_INFORMAL','PREDICACION_PUBLICA')),
      fuente TEXT NOT NULL,
      leccion INTEGER,
      punto TEXT,
      sala TEXT CHECK(sala IS NULL OR sala IN ('A','B')),
      UNIQUE(id_week, tipo, orden),
      FOREIGN KEY (id_week) REFERENCES presentation_week(id_week) ON DELETE CASCADE
    )
  `);
  await client.execute('CREATE INDEX IF NOT EXISTS idx_part_week ON presentation_part(id_week)');
  await client.execute(`
    CREATE TABLE presentation_assignment (
      id_asignacion INTEGER PRIMARY KEY AUTOINCREMENT,
      id_part INTEGER NOT NULL,
      id_week INTEGER NOT NULL,
      id_usuario INTEGER NOT NULL,
      rol TEXT NOT NULL CHECK(rol IN ('presentador','companero')),
      estado TEXT NOT NULL DEFAULT 'draft' CHECK(estado IN ('draft','confirmed','manual')),
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      UNIQUE(id_part, rol),
      FOREIGN KEY (id_part) REFERENCES presentation_part(id_part) ON DELETE CASCADE,
      FOREIGN KEY (id_week) REFERENCES presentation_week(id_week) ON DELETE CASCADE,
      FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE RESTRICT
    )
  `);
  return client;
}

/** Post-PR1 fresh-database shape (new src/db.sql): no table UNIQUE, expression index. */
async function freshNewShapeClient(): Promise<DatabaseClient> {
  const client = createClient({ url: ':memory:' });
  await client.execute(`
    CREATE TABLE presentation_week (
      id_week INTEGER PRIMARY KEY AUTOINCREMENT,
      semana TEXT NOT NULL UNIQUE,
      issue TEXT NOT NULL,
      fecha_inicio TEXT NOT NULL,
      fecha_fin TEXT NOT NULL,
      estado TEXT NOT NULL DEFAULT 'no_generada',
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    )
  `);
  await client.execute(`
    CREATE TABLE presentation_part (
      id_part INTEGER PRIMARY KEY AUTOINCREMENT,
      id_week INTEGER NOT NULL,
      orden INTEGER NOT NULL,
      tipo TEXT NOT NULL CHECK(tipo IN
        ('lectura_biblia','empiece_conversaciones','haga_revisitas','haga_discipulos','discurso','que_diria','explique_sus_creencias')),
      seccion TEXT NOT NULL CHECK(seccion IN ('TESOROS_DE_LA_BIBLIA','SEAMOS_MEJORES_MAESTROS')),
      duracion_min INTEGER NOT NULL CHECK(duracion_min > 0),
      escenario TEXT,
      fuente TEXT NOT NULL,
      leccion INTEGER,
      punto TEXT,
      sala TEXT CHECK(sala IS NULL OR sala IN ('A','B')),
      FOREIGN KEY (id_week) REFERENCES presentation_week(id_week) ON DELETE CASCADE
    )
  `);
  await client.execute('CREATE INDEX IF NOT EXISTS idx_part_week ON presentation_part(id_week)');
  await client.execute(
    "CREATE UNIQUE INDEX ux_part_week_tipo_orden_sala ON presentation_part(id_week, tipo, orden, COALESCE(sala, ''))"
  );
  return client;
}

async function seedWeekAndUser(client: DatabaseClient): Promise<{ idWeek: number; idUser: number }> {
  const week = await client.execute({
    sql: "INSERT INTO presentation_week (semana, issue, fecha_inicio, fecha_fin, estado) VALUES ('2026-10-05', 'mwb-2026-10-05', '2026-10-05', '2026-10-11', 'confirmada')",
    args: [],
  });
  const user = await client.execute({
    sql: "INSERT INTO usuario (nombre, apellido) VALUES ('Sandro', 'Valeriano')",
    args: [],
  });
  return { idWeek: Number(week.lastInsertRowid), idUser: Number(user.lastInsertRowid) };
}

interface PartSeed {
  idWeek: number;
  orden: number;
  tipo: string;
  sala: string | null;
  seccion?: string;
}

async function insertPart(client: DatabaseClient, seed: PartSeed): Promise<number> {
  const result = await client.execute({
    sql: `INSERT INTO presentation_part (id_week, orden, tipo, seccion, duracion_min, escenario, fuente, sala)
          VALUES (?, ?, ?, ?, ?, NULL, ?, ?)`,
    args: [seed.idWeek, seed.orden, seed.tipo, seed.seccion ?? 'SEAMOS_MEJORES_MAESTROS', 5, 'Fuente', seed.sala],
  });
  return Number(result.lastInsertRowid);
}

async function insertAssignment(
  client: DatabaseClient,
  idPart: number,
  idWeek: number,
  idUser: number,
  estado: string
): Promise<void> {
  await client.execute({
    sql: 'INSERT INTO presentation_assignment (id_part, id_week, id_usuario, rol, estado) VALUES (?, ?, ?, ?, ?)',
    args: [idPart, idWeek, idUser, 'presentador', estado],
  });
}

async function countRows(client: DatabaseClient, table: string): Promise<number> {
  const result = await client.execute(`SELECT COUNT(*) AS count FROM ${table}`);
  return Number((result.rows[0] as unknown as { count: number }).count);
}

async function partTableSql(client: DatabaseClient): Promise<string> {
  const result = await client.execute({
    sql: "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'presentation_part'",
    args: [],
  });
  return (result.rows[0] as unknown as { sql: string }).sql;
}

async function indexSql(client: DatabaseClient, name: string): Promise<string | null> {
  const result = await client.execute({
    sql: "SELECT sql FROM sqlite_master WHERE type = 'index' AND name = ?",
    args: [name],
  });
  if (result.rows.length === 0) return null;
  return (result.rows[0] as unknown as { sql: string | null }).sql ?? null;
}

async function foreignKeysPragma(client: DatabaseClient): Promise<number> {
  const result = await client.execute('PRAGMA foreign_keys');
  return Number((result.rows[0] as unknown as { foreign_keys: number }).foreign_keys);
}

/** Delegates only execute(); throws at the first DROP TABLE to force a mid-up failure. */
function clientFailingAtDropTable(inner: DatabaseClient): DatabaseClient {
  return {
    execute: (request: string | { sql: string }) => {
      const sql = typeof request === 'string' ? request : request.sql;
      if (sql.includes('DROP TABLE')) {
        return Promise.reject(new Error('fallo forzado: DROP TABLE'));
      }
      return inner.execute(request as string);
    },
  } as unknown as DatabaseClient;
}

describe('migrate-sala-unique-index (UP)', () => {
  it('swaps the table UNIQUE for the expression index preserving rows and assignments', async () => {
    const client = await freshOldShapeClient();
    const { idWeek, idUser } = await seedWeekAndUser(client);
    const idPart = await insertPart(client, { idWeek, orden: 1, tipo: 'discurso', sala: 'A' });
    await insertAssignment(client, idPart, idWeek, idUser, 'confirmed');
    await insertPart(client, { idWeek, orden: 2, tipo: 'que_diria', sala: null });

    const applied = await ensureSalaUniqueIndex(client);

    expect(applied).toBe(true);
    expect(await countRows(client, 'presentation_part')).toBe(2);
    expect(await countRows(client, 'presentation_assignment')).toBe(1);
    // Table-level UNIQUE gone, expression index present with COALESCE.
    expect((await partTableSql(client)).toUpperCase()).not.toContain('UNIQUE(ID_WEEK');
    const idx = await indexSql(client, 'ux_part_week_tipo_orden_sala');
    expect(idx?.toUpperCase()).toContain('COALESCE');
    // Child FK resolves again after the rename.
    const part = await client.execute('SELECT sala FROM presentation_part WHERE id_part = ?;', [idPart]);
    expect(String(part.rows[0].sala)).toBe('A');
  });

  it('is a no-op on the second run (idempotent)', async () => {
    const client = await freshOldShapeClient();
    await ensureSalaUniqueIndex(client);
    const sqlAfterFirstRun = await partTableSql(client);

    const appliedAgain = await ensureSalaUniqueIndex(client);

    expect(appliedAgain).toBe(false);
    expect(await partTableSql(client)).toBe(sqlAfterFirstRun);
  });

  it('no-ops on a fresh database already created in the new shape (db-migrate-prod path)', async () => {
    const client = await freshNewShapeClient();

    const applied = await ensureSalaUniqueIndex(client);

    expect(applied).toBe(false);
  });

  it('keeps the CHECK constraints alive through the rebuild', async () => {
    const client = await freshOldShapeClient();
    const { idWeek } = await seedWeekAndUser(client);
    await ensureSalaUniqueIndex(client);

    await expect(
      insertPart(client, { idWeek, orden: 1, tipo: 'escenificacion', sala: null })
    ).rejects.toThrow();
    await expect(
      insertPart(client, { idWeek, orden: 1, tipo: 'discurso', sala: 'C' })
    ).rejects.toThrow();
    await expect(
      insertPart(client, { idWeek, orden: 1, tipo: 'discurso', sala: null, seccion: 'OTRA' })
    ).rejects.toThrow();
  });

  it('leaves the schema with zero foreign key violations and FK enforcement back ON', async () => {
    const client = await freshOldShapeClient();
    const { idWeek, idUser } = await seedWeekAndUser(client);
    const idPart = await insertPart(client, { idWeek, orden: 1, tipo: 'discurso', sala: 'B' });
    await insertAssignment(client, idPart, idWeek, idUser, 'manual');

    await ensureSalaUniqueIndex(client);

    const violations = await client.execute('PRAGMA foreign_key_check');
    expect(violations.rows).toHaveLength(0);
    expect(await foreignKeysPragma(client)).toBe(1);
  });

  it('allows A/B twins while blocking double B-clone and double NULL inserts', async () => {
    const client = await freshOldShapeClient();
    const { idWeek } = await seedWeekAndUser(client);
    await insertPart(client, { idWeek, orden: 1, tipo: 'discurso', sala: null });

    await ensureSalaUniqueIndex(client);

    // NULL maps to '' — its own slot. A and B twins may join an existing NULL
    // row; collapsing that surplus NULL is the merge layer's job (spike A5),
    // NOT the index's. What the index must block: a second NULL and a second
    // clone of the same sala for the same (week, tipo, orden).
    await insertPart(client, { idWeek, orden: 1, tipo: 'discurso', sala: 'A' });
    await insertPart(client, { idWeek, orden: 1, tipo: 'discurso', sala: 'B' });
    await expect(
      insertPart(client, { idWeek, orden: 1, tipo: 'discurso', sala: 'B' })
    ).rejects.toThrow();
    await expect(
      insertPart(client, { idWeek, orden: 1, tipo: 'discurso', sala: null })
    ).rejects.toThrow();
  });

  it('rolls back leaving the DB unchanged when a mid-rebuild step fails', async () => {
    const client = await freshOldShapeClient();
    const { idWeek } = await seedWeekAndUser(client);
    await insertPart(client, { idWeek, orden: 1, tipo: 'discurso', sala: 'A' });
    const failing = clientFailingAtDropTable(client);

    await expect(ensureSalaUniqueIndex(failing)).rejects.toThrow('fallo forzado');

    expect(await countRows(client, 'presentation_part')).toBe(1);
    expect((await partTableSql(client)).toUpperCase()).toContain('UNIQUE(ID_WEEK');
    expect(await indexSql(client, 'ux_part_week_tipo_orden_sala')).toBeNull();
    // The old constraint still bites: plain duplicates keep being rejected.
    await expect(
      insertPart(client, { idWeek, orden: 1, tipo: 'discurso', sala: 'B' })
    ).rejects.toThrow();
    expect(await foreignKeysPragma(client)).toBe(1);
  });
});

describe('migrate-sala-unique-index-down (DOWN)', () => {
  it('de-dups by priority (manual > A > NULL > B), restores the plain UNIQUE and is idempotent', async () => {
    const client = await freshOldShapeClient();
    const { idWeek, idUser } = await seedWeekAndUser(client);

    await ensureSalaUniqueIndex(client);

    // Group 1 (discurso, orden 1): A twin + B twin with a draft assignment.
    // Keep 'A'; the B twin and its draft assignment are cascade-removed.
    await insertPart(client, { idWeek, orden: 1, tipo: 'discurso', sala: 'A' });
    const bTwin = await insertPart(client, { idWeek, orden: 1, tipo: 'discurso', sala: 'B' });
    await insertAssignment(client, bTwin, idWeek, idUser, 'draft');

    // Group 2 (que_diria, orden 2): NULL twin + manual-assignment 'B' twin.
    // Manual beats the NULL-priority rule: keep the manual 'B'.
    await insertPart(client, { idWeek, orden: 2, tipo: 'que_diria', sala: null });
    const manualB = await insertPart(client, { idWeek, orden: 2, tipo: 'que_diria', sala: 'B' });
    await insertAssignment(client, manualB, idWeek, idUser, 'manual');

    // Group 3 (lectura_biblia, orden 1): lone NULL row, untouched.
    await insertPart(client, { idWeek, orden: 1, tipo: 'lectura_biblia', sala: null });

    expect(await countRows(client, 'presentation_part')).toBe(5);
    expect(await countRows(client, 'presentation_assignment')).toBe(2);

    const result = await restorePlainUniqueConstraint(client);

    expect(result.ran).toBe(true);
    expect(result.removedParts).toBe(2);
    expect(result.removedAssignments).toBe(1);
    expect(await countRows(client, 'presentation_part')).toBe(3);
    expect(await countRows(client, 'presentation_assignment')).toBe(1);

    const group1 = await client.execute(
      "SELECT sala FROM presentation_part WHERE tipo = 'discurso' AND orden = 1"
    );
    expect(group1.rows).toHaveLength(1);
    expect(String(group1.rows[0].sala)).toBe('A');

    const group2 = await client.execute(
      'SELECT sala, id_part FROM presentation_part WHERE tipo = ? AND orden = 2',
      ['que_diria']
    );
    expect(group2.rows).toHaveLength(1);
    expect(Number(group2.rows[0].id_part)).toBe(manualB);

    // Plain constraint is back; the expression index is gone.
    expect((await partTableSql(client)).toUpperCase()).toContain('UNIQUE(ID_WEEK');
    expect(await indexSql(client, 'ux_part_week_tipo_orden_sala')).toBeNull();

    // A plain duplicate is rejected again (any sala, same triple).
    await expect(
      insertPart(client, { idWeek, orden: 1, tipo: 'discurso', sala: 'B' })
    ).rejects.toThrow();

    // fk integrity after the documented cascade loss.
    const violations = await client.execute('PRAGMA foreign_key_check');
    expect(violations.rows).toHaveLength(0);
    expect(await foreignKeysPragma(client)).toBe(1);

    // Second run: no-op.
    const again = await restorePlainUniqueConstraint(client);
    expect(again.ran).toBe(false);
    expect(again.removedParts).toBe(0);
    expect(await countRows(client, 'presentation_part')).toBe(3);
  });
});
