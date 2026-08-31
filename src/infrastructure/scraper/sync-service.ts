import { getAssignmentsRepository } from '../config/di';
import { getDatabaseClient } from '../persistence/database.client';
import { MeetingWeek } from '@/domain/entities/presentation/MeetingWeek';
import { PresentationPart } from '@/domain/entities/presentation/PresentationPart';
import {
  parseWorkbookPage,
  mapToWeekAndParts,
  parseIssueFromLanding,
  parseWeekUrlsFromLanding,
  fetchWorkbookPage,
  loadLatestIssueLanding,
} from './workbook-scraper';
import { buildIssueLandingUrl } from './selectors';

export interface SyncOptions {
  issue?: string;
  customFetch?: (url?: string) => Promise<string>;
}

export interface SyncResult {
  issue: string;
  weeksLoaded: number;
  partsLoaded: number;
}

export interface GuideCheckOptions {
  force?: boolean;
  customFetch?: (url?: string) => Promise<string>;
}


export interface GuideCheckResult {
  hasNewer: boolean;
  latestLoaded: string | null;
  latestPublished: string | null;
  lastCheckedAt: string | null;
}

export interface SyncStateResult {
  latestLoaded: string | null;
  latestPublished: string | null;
  lastCheckedAt: string | null;
}

/**
 * Synchronizes the meeting workbook (MWB) from JW.org into the database.
 * Fetches landing TOC, retrieves weekly pages, parses in-scope parts, and upserts them.
 */
export async function syncMeetingWorkbook(options?: SyncOptions): Promise<SyncResult> {
  const repo = getAssignmentsRepository();
  const client = getDatabaseClient();
  const fetcher = options?.customFetch || fetchWorkbookPage;

  let parsedIssue: string;
  let weekUrls: string[];

  if (options?.issue) {
    const targetLandingUrl = buildIssueLandingUrl(options.issue);
    const landingHtml = await fetcher(targetLandingUrl);

    parsedIssue = parseIssueFromLanding(landingHtml) || options.issue;
    weekUrls = parseWeekUrlsFromLanding(landingHtml);

    if (weekUrls.length === 0) {
      throw new Error(
        `No se encontraron semanas para sincronizar en la edición ${options.issue}`
      );
    }
  } else {
    const landing = await loadLatestIssueLanding(fetcher);

    parsedIssue = landing.issue;
    weekUrls = landing.weekUrls;

    if (weekUrls.length === 0) {
      throw new Error(
        'No se encontraron semanas para sincronizar; la edición más reciente publicada no tiene semanas disponibles'
      );
    }
  }

  let weeksLoaded = 0;
  let partsLoaded = 0;

  for (const weekUrl of weekUrls) {
    const weekHtml = await fetcher(weekUrl);
    const parsedData = parseWorkbookPage(weekHtml);
    const mapped = mapToWeekAndParts(parsedData);

    const weekIssue = mapped.week.issue || parsedIssue || options?.issue || '';

    const week = new MeetingWeek(
      0,
      mapped.week.semana,
      weekIssue,
      mapped.week.fecha_inicio,
      mapped.week.fecha_fin,
      'no_generada'
    );

    const parts = mapped.parts.map(
      (p) =>
        new PresentationPart(
          0,
          0,
          p.orden,
          p.tipo,
          p.seccion,
          p.duracion_min,
          p.escenario,
          p.fuente
        )
    );

    await repo.upsertWeek(week, parts);
    weeksLoaded += 1;
    partsLoaded += parts.length;
  }

  const resolvedIssue = parsedIssue || options?.issue || '';

  await client.execute({
    sql: `INSERT INTO presentation_sync_state (id, latest_loaded_issue, latest_known_published, last_checked_at)
          VALUES (1, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(id) DO UPDATE SET
            latest_loaded_issue = excluded.latest_loaded_issue,
            latest_known_published = excluded.latest_known_published,
            last_checked_at = excluded.last_checked_at`,
    args: [resolvedIssue, resolvedIssue],
  });

  return {
    issue: resolvedIssue,
    weeksLoaded,
    partsLoaded,
  };
}

/**
 * Checks whether a newer meeting workbook issue is published on JW.org.
 * Caches check results up to 24 hours unless `force` is true.
 */
export async function checkGuideUpdate(options?: GuideCheckOptions): Promise<GuideCheckResult> {
  const client = getDatabaseClient();
  const stateResult = await client.execute({
    sql: 'SELECT latest_loaded_issue, latest_known_published, last_checked_at FROM presentation_sync_state WHERE id = 1',
  });

  const row = stateResult.rows[0] as Record<string, unknown> | undefined;
  const latestLoaded = (row?.latest_loaded_issue as string) ?? null;
  const cachedPublished = (row?.latest_known_published as string) ?? null;
  const cachedLastChecked = (row?.last_checked_at as string) ?? null;

  if (!options?.force && cachedLastChecked && cachedPublished) {
    const lastCheckedTime = new Date(cachedLastChecked).getTime();
    const now = Date.now();
    const isFresh = !isNaN(lastCheckedTime) && now - lastCheckedTime < 24 * 60 * 60 * 1000;
    if (isFresh) {
      return {
        hasNewer: Boolean(cachedPublished && cachedPublished !== latestLoaded),
        latestLoaded,
        latestPublished: cachedPublished,
        lastCheckedAt: cachedLastChecked,
      };
    }
  }

  const landing = await loadLatestIssueLanding(options?.customFetch);
  const latestPublished = landing.weekUrls.length > 0 ? landing.issue || null : null;

  await client.execute({
    sql: `INSERT INTO presentation_sync_state (id, latest_loaded_issue, latest_known_published, last_checked_at)
          VALUES (1, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(id) DO UPDATE SET
            latest_known_published = COALESCE(excluded.latest_known_published, presentation_sync_state.latest_known_published),
            last_checked_at = excluded.last_checked_at`,
    args: [latestLoaded, latestPublished],
  });

  const updatedState = await client.execute({
    sql: 'SELECT latest_known_published, last_checked_at FROM presentation_sync_state WHERE id = 1',
  });
  const effectivePublished = (updatedState.rows[0]?.latest_known_published as string) ?? latestPublished;
  const lastCheckedAt = (updatedState.rows[0]?.last_checked_at as string) ?? new Date().toISOString();

  return {
    hasNewer: Boolean(latestPublished && latestPublished !== latestLoaded),
    latestLoaded,
    latestPublished: effectivePublished,
    lastCheckedAt,
  };
}

/**
 * Retrieves the current synchronization state from database.
 */
export async function getSyncState(): Promise<SyncStateResult> {
  const client = getDatabaseClient();
  const stateResult = await client.execute({
    sql: 'SELECT latest_loaded_issue, latest_known_published, last_checked_at FROM presentation_sync_state WHERE id = 1',
  });

  if (stateResult.rows.length === 0) {
    return {
      latestLoaded: null,
      latestPublished: null,
      lastCheckedAt: null,
    };
  }

  const row = stateResult.rows[0] as Record<string, unknown>;
  return {
    latestLoaded: (row.latest_loaded_issue as string) ?? null,
    latestPublished: (row.latest_known_published as string) ?? null,
    lastCheckedAt: (row.last_checked_at as string) ?? null,
  };
}
