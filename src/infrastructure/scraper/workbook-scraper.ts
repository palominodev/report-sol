import * as cheerio from 'cheerio';
import {
  MeetingSection,
  PresentationSetting,
  PresentationType,
} from '@/domain/entities/presentation/enums';
import { SourceRef } from '@/domain/entities/presentation/SourceRef';
import {
  WORKBOOK_SELECTORS,
  LANDING_SELECTORS,
  cleanWhitespace,
  parseDuration,
  parseScenario,
  parseSection,
  parsePresentationType,
  parseSourceRef,
  extractIssue,
  extractDates,
  buildIssueLandingUrl,
} from './selectors';

export interface ParsedPart {
  title: string;
  section: MeetingSection;
  tipo: PresentationType;
  durationMin: number;
  scenario: PresentationSetting | null;
  sourceRef: SourceRef;
  rawText: string;
  rawHtml: string;
  orden?: number;
}

export interface WorkbookData {
  weekLabel: string;
  canonicalUrl?: string;
  issue?: string;
  rawHtml?: string;
  parts: ParsedPart[];
}

export interface WorkbookWeekDTO {
  week: {
    semana: string;
    issue: string;
    fecha_inicio: string;
    fecha_fin: string;
  };
  parts: Array<{
    orden: number;
    tipo: PresentationType;
    seccion: MeetingSection;
    duracion_min: number;
    escenario: PresentationSetting | null;
    fuente: SourceRef;
  }>;
}

/**
 * Pure function to parse a weekly workbook HTML page and extract
 * week label and in-scope assignable presentation parts.
 */
export function parseWorkbookPage(html: string): WorkbookData {
  const $ = cheerio.load(html);

  const weekLabel = cleanWhitespace(
    $(WORKBOOK_SELECTORS.WEEK_TITLE).first().text()
  );
  const canonicalUrl =
    $(WORKBOOK_SELECTORS.CANONICAL_LINK).attr('href') || undefined;
  const issue = extractIssue(html, canonicalUrl) || undefined;

  const parts: ParsedPart[] = [];
  let currentSection: MeetingSection | null = null;

  $(WORKBOOK_SELECTORS.HEADINGS).each((_, el) => {
    const tagName = (el.tagName || '').toLowerCase();
    const headingText = $(el).text();

    if (tagName === 'h2') {
      const section = parseSection(headingText);
      if (section) {
        currentSection = section;
      } else {
        const cleanH2 = cleanWhitespace(headingText).toUpperCase();
        if (cleanH2.includes('NUESTRA VIDA CRISTIANA')) {
          currentSection = null;
        }
      }
      return;
    }

    if (tagName === 'h3') {
      if (!currentSection) {
        return;
      }

      const match = parsePresentationType(headingText, currentSection);
      if (!match) {
        return;
      }

      // Collect sibling content following this h3 until the next heading
      let partHtml = '';
      let partText = '';
      let bibleLinkText: string | undefined;

      let sibling = $(el).next();
      while (
        sibling.length &&
        !sibling.is('h2, h3') &&
        sibling.find('h2, h3').length === 0
      ) {
        partHtml += $.html(sibling);
        partText += ' ' + sibling.text();

        if (!bibleLinkText) {
          const bibleLink = sibling.is(WORKBOOK_SELECTORS.BIBLE_LINK)
            ? sibling
            : sibling.find(WORKBOOK_SELECTORS.BIBLE_LINK);
          if (bibleLink.length) {
            bibleLinkText = bibleLink.first().text();
          }
        }

        sibling = sibling.next();
      }

      const cleanPartText = cleanWhitespace(partText || headingText);
      const durationMin = parseDuration(cleanPartText);
      const scenario = parseScenario(cleanPartText);
      const sourceRef = parseSourceRef(match.tipo, cleanPartText, bibleLinkText);

      parts.push({
        title: match.title,
        section: currentSection,
        tipo: match.tipo,
        durationMin,
        scenario,
        sourceRef,
        rawText: cleanPartText,
        rawHtml: partHtml.trim(),
        orden: parts.length + 1,
      });
    }
  });

  return {
    weekLabel,
    canonicalUrl,
    issue,
    rawHtml: html,
    parts,
  };
}

/**
 * Maps parsed workbook data to MeetingWeek DTO and PresentationParts DTO.
 */
export function mapToWeekAndParts(data: WorkbookData): WorkbookWeekDTO {
  let issue = data.issue || extractIssue(data.rawHtml || '', data.canonicalUrl);

  let dates = extractDates(data.canonicalUrl || '');
  if (!dates.fecha_inicio || !dates.fecha_fin) {
    const fallbackYear = issue ? parseInt(issue.split('-')[0], 10) : undefined;
    dates = extractDates(data.weekLabel, fallbackYear);
  }

  if (!issue && dates.fecha_inicio) {
    const [year, monthStr] = dates.fecha_inicio.split('-');
    const mNum = parseInt(monthStr, 10);
    const issueMonth = mNum % 2 === 1 ? mNum : mNum - 1;
    issue = `${year}-${String(issueMonth).padStart(2, '0')}`;
  }

  return {
    week: {
      semana: data.weekLabel,
      issue: issue || '',
      fecha_inicio: dates.fecha_inicio,
      fecha_fin: dates.fecha_fin,
    },
    parts: data.parts.map((p, idx) => ({
      orden: idx + 1,
      tipo: p.tipo,
      seccion: p.section,
      duracion_min: p.durationMin,
      escenario: p.scenario,
      fuente: p.sourceRef,
    })),
  };
}

/**
 * Parses issue string (e.g. "2026-09") from a landing page HTML.
 */
export function parseIssueFromLanding(html: string): string {
  return extractIssue(html);
}

/**
 * Parses the ordered unique week page URLs from a landing TOC page.
 */
export function parseWeekUrlsFromLanding(html: string): string[] {
  const $ = cheerio.load(html);
  const urls: string[] = [];

  $(LANDING_SELECTORS.WEEK_LINKS).each((_, el) => {
    let href = $(el).attr('href');
    if (href && href.includes('Vida-y-Ministerio-Cristianos')) {
      if (href.startsWith('/')) {
        href = `https://www.jw.org${href}`;
      }
      if (!urls.includes(href)) {
        urls.push(href);
      }
    }
  });

  return urls;
}

/**
 * Fetches HTML from jw.org using global fetch with standard headers.
 */
export async function fetchWorkbookPage(urlOrIssue?: string): Promise<string> {
  let targetUrl = urlOrIssue;

  if (!targetUrl) {
    targetUrl =
      'https://www.jw.org/es/biblioteca/guia-actividades-reunion-testigos-jehova/';
  } else if (targetUrl.startsWith('/')) {
    targetUrl = `https://www.jw.org${targetUrl}`;
  } else if (
    !targetUrl.startsWith('http://') &&
    !targetUrl.startsWith('https://')
  ) {
    targetUrl =
      'https://www.jw.org/es/biblioteca/guia-actividades-reunion-testigos-jehova/';
  }

  const response = await fetch(targetUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'es-ES,es;q=0.9',
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch workbook page (${response.status} ${response.statusText}): ${targetUrl}`
    );
  }

  return response.text();
}

export async function loadLatestIssueLanding(
  fetchFn?: (url?: string) => Promise<string>
): Promise<{
  issue: string;
  weekUrls: string[];
}> {
  const fetcher = fetchFn || fetchWorkbookPage;
  const html = await fetcher();
  const issue = parseIssueFromLanding(html);
  let weekUrls = parseWeekUrlsFromLanding(html);

  if (issue && weekUrls.length === 0) {
    try {
      const issueUrl = buildIssueLandingUrl(issue);
      const issueHtml = await fetcher(issueUrl);
      weekUrls = parseWeekUrlsFromLanding(issueHtml);
    } catch {
      // Ignored for future or unreleased issues
    }
  }

  return { issue, weekUrls };
}

