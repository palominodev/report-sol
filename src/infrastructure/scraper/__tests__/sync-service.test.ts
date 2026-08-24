import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { createClient } from '@libsql/client';
import { setDatabaseClient } from '../../persistence/database.client';
import {
  syncMeetingWorkbook,
  checkGuideUpdate,
  getSyncState,
} from '../sync-service';

const FIXTURES = join(__dirname, 'fixtures');

function fixture(name: string): string {
  return readFileSync(join(FIXTURES, name), 'utf-8');
}

const LANDING_FIXTURE = fixture('mwb-landing-2026-09.html');
const WEEK_FIXTURE = fixture('mwb-week1-sep7.html');

describe('sync-service', () => {
  let inMemoryDb: ReturnType<typeof createClient>;

  beforeEach(async () => {
    inMemoryDb = createClient({ url: ':memory:' });
    setDatabaseClient(inMemoryDb);

    await inMemoryDb.execute(`
      CREATE TABLE presentation_week (
        id_week INTEGER PRIMARY KEY AUTOINCREMENT,
        semana TEXT NOT NULL UNIQUE,
        issue TEXT NOT NULL,
        fecha_inicio TEXT NOT NULL,
        fecha_fin TEXT NOT NULL,
        estado TEXT NOT NULL DEFAULT 'no_generada'
          CHECK(estado IN ('no_generada','borrador','confirmada')),
        created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
      );
    `);

    await inMemoryDb.execute(`
      CREATE TABLE presentation_part (
        id_part INTEGER PRIMARY KEY AUTOINCREMENT,
        id_week INTEGER NOT NULL,
        orden INTEGER NOT NULL,
        tipo TEXT NOT NULL CHECK(tipo IN
          ('lectura_biblia','empiece_conversaciones','haga_revisitas','haga_discipulos','discurso')),
        seccion TEXT NOT NULL CHECK(seccion IN ('TESOROS_DE_LA_BIBLIA','SEAMOS_MEJORES_MAESTROS')),
        duracion_min INTEGER NOT NULL CHECK(duracion_min > 0),
        escenario TEXT CHECK(escenario IS NULL OR escenario IN
          ('DE_CASA_EN_CASA','PREDICACION_INFORMAL','PREDICACION_PUBLICA')),
        fuente TEXT NOT NULL,
        leccion INTEGER,
        punto TEXT,
        UNIQUE(id_week, tipo, orden),
        FOREIGN KEY (id_week) REFERENCES presentation_week(id_week) ON DELETE CASCADE
      );
    `);

    await inMemoryDb.execute(`
      CREATE TABLE presentation_sync_state (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        latest_loaded_issue TEXT,
        latest_known_published TEXT,
        last_checked_at TEXT
      );
    `);
  });

  afterEach(() => {
    setDatabaseClient(null);
  });

  describe('getSyncState', () => {
    it('returns null fields when presentation_sync_state is empty', async () => {
      const state = await getSyncState();
      expect(state).toEqual({
        latestLoaded: null,
        latestPublished: null,
        lastCheckedAt: null,
      });
    });

    it('returns populated state when row exists', async () => {
      await inMemoryDb.execute({
        sql: `INSERT INTO presentation_sync_state (id, latest_loaded_issue, latest_known_published, last_checked_at)
              VALUES (1, '2026-09', '2026-09', '2026-08-23 12:00:00')`,
      });

      const state = await getSyncState();
      expect(state.latestLoaded).toBe('2026-09');
      expect(state.latestPublished).toBe('2026-09');
      expect(state.lastCheckedAt).toBe('2026-08-23 12:00:00');
    });
  });

  describe('syncMeetingWorkbook', () => {
    it('fetches landing and all week pages, saves weeks and parts, and updates sync state', async () => {
      const customFetch = vi.fn(async (url?: string) => {
        if (!url || !url.includes('Vida-y-Ministerio-Cristianos')) {
          return LANDING_FIXTURE;
        }
        const slugMatch = url.match(/Vida-y-Ministerio-Cristianos-([^\/]+)/);
        const label = slugMatch ? slugMatch[1].replace(/-/g, ' ') : '7-13 de septiembre';
        return WEEK_FIXTURE.replace('7-13 de septiembre', label);
      });

      const result = await syncMeetingWorkbook({ customFetch });

      expect(result.issue).toBe('2026-09');
      expect(result.weeksLoaded).toBe(8);
      expect(result.partsLoaded).toBe(32); // 8 weeks * 4 parts

      // Verify DB contents
      const weeksRes = await inMemoryDb.execute('SELECT COUNT(*) as count FROM presentation_week');
      expect(Number(weeksRes.rows[0].count)).toBe(8);

      const partsRes = await inMemoryDb.execute('SELECT COUNT(*) as count FROM presentation_part');
      expect(Number(partsRes.rows[0].count)).toBe(32);

      const syncRes = await inMemoryDb.execute('SELECT * FROM presentation_sync_state WHERE id = 1');
      expect(syncRes.rows).toHaveLength(1);
      expect(syncRes.rows[0].latest_loaded_issue).toBe('2026-09');
      expect(syncRes.rows[0].latest_known_published).toBe('2026-09');
      expect(syncRes.rows[0].last_checked_at).toBeTruthy();
    });

    it('is idempotent: running sync multiple times does not duplicate records or error', async () => {
      const customFetch = vi.fn(async (url?: string) => {
        if (!url || !url.includes('Vida-y-Ministerio-Cristianos')) {
          return LANDING_FIXTURE;
        }
        const slugMatch = url.match(/Vida-y-Ministerio-Cristianos-([^\/]+)/);
        const label = slugMatch ? slugMatch[1].replace(/-/g, ' ') : '7-13 de septiembre';
        return WEEK_FIXTURE.replace('7-13 de septiembre', label);
      });

      const firstSync = await syncMeetingWorkbook({ issue: '2026-09', customFetch });
      const secondSync = await syncMeetingWorkbook({ issue: '2026-09', customFetch });

      expect(firstSync).toEqual(secondSync);

      const weeksRes = await inMemoryDb.execute('SELECT COUNT(*) as count FROM presentation_week');
      expect(Number(weeksRes.rows[0].count)).toBe(8);

      const partsRes = await inMemoryDb.execute('SELECT COUNT(*) as count FROM presentation_part');
      expect(Number(partsRes.rows[0].count)).toBe(32);
    });

    it('throws error when no week links are found', async () => {
      const customFetch = vi.fn(async () => '<html><body>No links here</body></html>');

      await expect(syncMeetingWorkbook({ customFetch })).rejects.toThrow(
        /No se encontraron semanas para sincronizar/
      );
    });
  });

  describe('checkGuideUpdate', () => {
    it('fetches latest issue and updates DB when no cached check exists', async () => {
      const customFetch = vi.fn(async () => LANDING_FIXTURE);

      const result = await checkGuideUpdate({ customFetch });

      expect(result.hasNewer).toBe(true);
      expect(result.latestLoaded).toBeNull();
      expect(result.latestPublished).toBe('2026-09');
      expect(result.lastCheckedAt).toBeTruthy();
      expect(customFetch).toHaveBeenCalledTimes(1);

      const dbRow = await inMemoryDb.execute('SELECT * FROM presentation_sync_state WHERE id = 1');
      expect(dbRow.rows[0].latest_known_published).toBe('2026-09');
    });

    it('returns cached state without re-fetching if last check is recent (< 24h)', async () => {
      const recentTimestamp = new Date(Date.now() - 3600 * 1000).toISOString(); // 1 hour ago
      await inMemoryDb.execute({
        sql: `INSERT INTO presentation_sync_state (id, latest_loaded_issue, latest_known_published, last_checked_at)
              VALUES (1, '2026-09', '2026-09', ?)`,
        args: [recentTimestamp],
      });

      const customFetch = vi.fn(async () => LANDING_FIXTURE);

      const result = await checkGuideUpdate({ customFetch });

      expect(result.hasNewer).toBe(false);
      expect(result.latestLoaded).toBe('2026-09');
      expect(result.latestPublished).toBe('2026-09');
      expect(result.lastCheckedAt).toBe(recentTimestamp);
      expect(customFetch).not.toHaveBeenCalled();
    });

    it('bypasses cache and re-fetches when force is true', async () => {
      const recentTimestamp = new Date(Date.now() - 3600 * 1000).toISOString();
      await inMemoryDb.execute({
        sql: `INSERT INTO presentation_sync_state (id, latest_loaded_issue, latest_known_published, last_checked_at)
              VALUES (1, '2026-09', '2026-09', ?)`,
        args: [recentTimestamp],
      });

      const customFetch = vi.fn(async () => LANDING_FIXTURE);

      const result = await checkGuideUpdate({ force: true, customFetch });

      expect(result.hasNewer).toBe(false);
      expect(result.latestLoaded).toBe('2026-09');
      expect(result.latestPublished).toBe('2026-09');
      expect(customFetch).toHaveBeenCalledTimes(1);
    });

    it('indicates hasNewer=true when published issue differs from loaded issue', async () => {
      await inMemoryDb.execute({
        sql: `INSERT INTO presentation_sync_state (id, latest_loaded_issue, latest_known_published, last_checked_at)
              VALUES (1, '2026-07', '2026-07', '2026-07-01 00:00:00')`,
      });

      const customFetch = vi.fn(async () => LANDING_FIXTURE);

      const result = await checkGuideUpdate({ force: true, customFetch });

      expect(result.hasNewer).toBe(true);
      expect(result.latestLoaded).toBe('2026-07');
      expect(result.latestPublished).toBe('2026-09');
    });
  });
});
