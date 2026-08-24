import {
  MeetingSection,
  PresentationSetting,
  PresentationType,
} from '@/domain/entities/presentation/enums';
import { SourceRef } from '@/domain/entities/presentation/SourceRef';

export const WORKBOOK_SELECTORS = {
  WEEK_TITLE: 'article header h1, article h1, .onPageTitle, header h1, h1',
  CANONICAL_LINK: 'link[rel="canonical"]',
  ARTICLE: 'article#article, article',
  BODY: 'body',
  PAGE_CONFIG: '#pageConfig',
  HEADINGS: 'h2, h3',
  BIBLE_LINK: '.jsBibleLink, a[data-bible], a[href*="biblioteca/biblia"]',
  TH_LINK: '.pub-th, a[href*="folletos/lectores-y-maestros"]',
  LMD_LINK: '.pub-lmd, a[href*="folletos/hacer-discipulos-obra-amor"]',
} as const;

export const LANDING_SELECTORS = {
  LANGUAGE_CHOOSE_LINK: 'a.jsChooseSiteLanguage, a[href*="choose-language"]',
  DATA_ISSUE: '[data-issue]',
  TOC_CONTAINER: '.toc',
  WEEK_LINKS: '.toc .synopsis h2 a, .toc a[href*="Vida-y-Ministerio-Cristianos"], a[href*="Vida-y-Ministerio-Cristianos"]',
} as const;

export const SPANISH_MONTHS: Record<string, string> = {
  enero: '01',
  febrero: '02',
  marzo: '03',
  abril: '04',
  mayo: '05',
  junio: '06',
  julio: '07',
  agosto: '08',
  septiembre: '09',
  setiembre: '09',
  octubre: '10',
  noviembre: '11',
  diciembre: '12',
};

export const ISSUE_MONTH_PAIRS: Record<string, string> = {
  '01': 'enero-febrero',
  '02': 'enero-febrero',
  '03': 'marzo-abril',
  '04': 'marzo-abril',
  '05': 'mayo-junio',
  '06': 'mayo-junio',
  '07': 'julio-agosto',
  '08': 'julio-agosto',
  '09': 'septiembre-octubre',
  '10': 'septiembre-octubre',
  '11': 'noviembre-diciembre',
  '12': 'noviembre-diciembre',
};

/** Build the landing page URL for a specific issue (e.g. 2026-09) or default landing. */
export function buildIssueLandingUrl(issue?: string): string {
  if (!issue) {
    return 'https://www.jw.org/es/biblioteca/guia-actividades-reunion-testigos-jehova/';
  }
  if (issue.startsWith('http://') || issue.startsWith('https://')) {
    return issue;
  }
  if (issue.startsWith('/')) {
    return `https://www.jw.org${issue}`;
  }
  const match = issue.match(/^(\d{4})-(\d{2})$/);
  if (match) {
    const year = match[1];
    const month = match[2];
    const pair = ISSUE_MONTH_PAIRS[month] || 'septiembre-octubre';
    return `https://www.jw.org/es/biblioteca/guia-actividades-reunion-testigos-jehova/${pair}-${year}-mwb/`;
  }
  return 'https://www.jw.org/es/biblioteca/guia-actividades-reunion-testigos-jehova/';
}


/** Clean any whitespace including non-breaking spaces and trim. */
export function cleanWhitespace(text: string): string {
  return text
    .replace(/[\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Clean heading title by removing leading numbers/dots (e.g. "3. Lectura de la Biblia" -> "Lectura de la Biblia"). */
export function cleanTitle(title: string): string {
  const cleaned = cleanWhitespace(title);
  return cleaned.replace(/^\d+[\.\s-]+\s*/, '').trim();
}

/** Extract duration in minutes from text (e.g. "(4 mins.)" -> 4). */
export function parseDuration(text: string): number {
  const match = text.match(/\((\d+)\s*(?:mins?|minutos?)\.?\)/i) || text.match(/\b(\d+)\s*(?:mins?|minutos?)\b/i);
  return match ? parseInt(match[1], 10) : 0;
}

/** Extract presentation setting / scenario from text. */
export function parseScenario(text: string): PresentationSetting | null {
  if (/DE\s+CASA\s+EN\s+CASA/i.test(text)) {
    return 'DE_CASA_EN_CASA';
  }
  if (/PREDICACI[OÓ]N\s+INFORMAL/i.test(text)) {
    return 'PREDICACION_INFORMAL';
  }
  if (/PREDICACI[OÓ]N\s+P[UÚ]BLICA/i.test(text)) {
    return 'PREDICACION_PUBLICA';
  }
  return null;
}

/** Identify meeting section from an h2 heading text. */
export function parseSection(text: string): MeetingSection | null {
  const clean = cleanWhitespace(text).toUpperCase();
  if (clean.includes('TESOROS DE LA BIBLIA')) {
    return 'TESOROS_DE_LA_BIBLIA';
  }
  if (clean.includes('SEAMOS MEJORES MAESTROS')) {
    return 'SEAMOS_MEJORES_MAESTROS';
  }
  return null;
}

/** Match an in-scope assignable presentation type. Returns null if out of scope. */
export function parsePresentationType(
  rawOrCleanTitle: string,
  section: MeetingSection | null
): { tipo: PresentationType; title: string } | null {
  const cleaned = cleanTitle(rawOrCleanTitle);

  if (section === 'TESOROS_DE_LA_BIBLIA') {
    if (/^Lectura\s+de\s+la\s+Biblia$/i.test(cleaned)) {
      return { tipo: 'lectura_biblia', title: 'Lectura de la Biblia' };
    }
  }

  if (section === 'SEAMOS_MEJORES_MAESTROS') {
    if (/^Empiece\s+conversaciones$/i.test(cleaned)) {
      return { tipo: 'empiece_conversaciones', title: 'Empiece conversaciones' };
    }
    if (/^Haga\s+revisitas$/i.test(cleaned)) {
      return { tipo: 'haga_revisitas', title: 'Haga revisitas' };
    }
    if (/^Haga\s+disc[ií]pulos$/i.test(cleaned)) {
      return { tipo: 'haga_discipulos', title: 'Haga discípulos' };
    }
    if (/^Discurso$/i.test(cleaned)) {
      return { tipo: 'discurso', title: 'Discurso' };
    }
  }

  return null;
}

/** Extract SourceRef from text and context for an in-scope presentation part. */
export function parseSourceRef(
  tipo: PresentationType,
  text: string,
  bibleLinkText?: string
): SourceRef {
  const clean = cleanWhitespace(text);

  if (tipo === 'lectura_biblia') {
    const thMatch = clean.match(/th\s+lecci[oó]n\s*(\d+)/i);
    const leccion = thMatch ? parseInt(thMatch[1], 10) : undefined;
    const punto = bibleLinkText ? cleanWhitespace(bibleLinkText) : undefined;
    return new SourceRef('bib', leccion, punto);
  }

  if (tipo === 'discurso') {
    // Check for appendix (e.g. "lmd apéndice A punto 20. Título: ... ( th lección 7 )")
    const appendixMatch = clean.match(/lmd\s+ap[eé]ndice\s*([A-Za-z0-9]+)\s*punto\s*(\d+)/i);
    const thMatch = clean.match(/th\s+lecci[oó]n\s*(\d+)/i);

    if (appendixMatch) {
      const appendix = appendixMatch[1].toUpperCase();
      const pt = appendixMatch[2];
      const punto = `${appendix}${pt}`;
      const leccion = thMatch ? parseInt(thMatch[1], 10) : undefined;
      return new SourceRef('lmd', leccion, punto);
    }

    const lmdMatch = clean.match(/lmd\s+lecci[oó]n\s*(\d+)(?:\s*punto\s*(\d+|[A-Za-z0-9]+))?/i);
    if (lmdMatch) {
      return new SourceRef(
        'lmd',
        parseInt(lmdMatch[1], 10),
        lmdMatch[2] ? lmdMatch[2] : undefined
      );
    }

    if (thMatch) {
      return new SourceRef('th', parseInt(thMatch[1], 10), undefined);
    }

    return new SourceRef('th', undefined, undefined);
  }

  if (tipo === 'haga_discipulos') {
    const lmdMatch = clean.match(/lmd\s+lecci[oó]n\s*(\d+)(?:\s*punto\s*(\d+|[A-Za-z0-9]+))?/i);
    if (lmdMatch) {
      return new SourceRef(
        'lmd',
        parseInt(lmdMatch[1], 10),
        lmdMatch[2] ? lmdMatch[2] : undefined
      );
    }

    const thMatch = clean.match(/th\s+lecci[oó]n\s*(\d+)/i);
    if (thMatch) {
      return new SourceRef('th', parseInt(thMatch[1], 10), undefined);
    }

    return new SourceRef('th', undefined, undefined);
  }

  // empiece_conversaciones & haga_revisitas
  const lmdMatch = clean.match(/lmd\s+lecci[oó]n\s*(\d+)(?:\s*punto\s*(\d+|[A-Za-z0-9]+))?/i);
  if (lmdMatch) {
    return new SourceRef(
      'lmd',
      parseInt(lmdMatch[1], 10),
      lmdMatch[2] ? lmdMatch[2] : undefined
    );
  }

  const thMatch = clean.match(/th\s+lecci[oó]n\s*(\d+)/i);
  if (thMatch) {
    return new SourceRef('th', parseInt(thMatch[1], 10), undefined);
  }

  return new SourceRef('lmd', undefined, undefined);
}

/** Extract issue (e.g. "2026-09") from HTML content, classes, or canonical URL. */
export function extractIssue(html: string, canonicalUrl?: string): string {
  // 1. Check choose-language query param: issue=YYYY-MM
  const chooseLangMatch = html.match(/issue=(\d{4}-\d{2})/);
  if (chooseLangMatch) {
    return chooseLangMatch[1];
  }

  // 2. Check data-issue="YYYY-MM"
  const dataIssueMatch = html.match(/data-issue="(\d{4}-\d{2})"/);
  if (dataIssueMatch) {
    return dataIssueMatch[1];
  }

  // 3. Check body class iss-YYYYMM
  const bodyIssMatch = html.match(/iss-(\d{4})(\d{2})/);
  if (bodyIssMatch) {
    return `${bodyIssMatch[1]}-${bodyIssMatch[2]}`;
  }

  // 4. Check toc-mwbYYYYMM
  const tocMatch = html.match(/toc-mwb(\d{4})(\d{2})/);
  if (tocMatch) {
    return `${tocMatch[1]}-${tocMatch[2]}`;
  }

  // 5. Check URL canonical e.g. /septiembre-octubre-2026-mwb/
  const urlToCheck = canonicalUrl || html;
  const canonicalIssueMatch = urlToCheck.match(
    /([a-zñ]+)-[a-zñ]+-(\d{4})-mwb/i
  );
  if (canonicalIssueMatch) {
    const month = SPANISH_MONTHS[canonicalIssueMatch[1].toLowerCase()];
    const year = canonicalIssueMatch[2];
    if (month && year) {
      return `${year}-${month}`;
    }
  }

  // 6. Check Year from URL or week string and bimonthly issue
  const yearMatch = urlToCheck.match(/\b(20\d{2})\b/);
  const monthMatch = urlToCheck.match(
    /\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\b/i
  );
  if (yearMatch && monthMatch) {
    const mNum = parseInt(SPANISH_MONTHS[monthMatch[1].toLowerCase()] || '1', 10);
    // Bimonthly MWB issues start on odd months: 1, 3, 5, 7, 9, 11
    const issueMonth = mNum % 2 === 1 ? mNum : mNum - 1;
    return `${yearMatch[1]}-${String(issueMonth).padStart(2, '0')}`;
  }

  return '';
}

/** Parse start and end date (YYYY-MM-DD) from slug, URL, or week label. */
export function extractDates(
  slugOrText: string,
  fallbackYear?: number
): { fecha_inicio: string; fecha_fin: string } {
  const text = cleanWhitespace(slugOrText).toLowerCase();

  // Pattern 1: Two years specified (cross-year): e.g. "28 de diciembre de 2026 a 3 de enero de 2027" or with dashes
  const twoYearMatch = text.match(
    /(\d{1,2})\s*(?:de|-)\s*([a-zñ]+)\s*(?:de|-)\s*(\d{4})\s*(?:a|-)\s*(\d{1,2})\s*(?:de|-)\s*([a-zñ]+)\s*(?:de|-)\s*(\d{4})/i
  );
  if (twoYearMatch) {
    const startDay = twoYearMatch[1].padStart(2, '0');
    const startMonth = SPANISH_MONTHS[twoYearMatch[2]];
    const startYear = twoYearMatch[3];
    const endDay = twoYearMatch[4].padStart(2, '0');
    const endMonth = SPANISH_MONTHS[twoYearMatch[5]];
    const endYear = twoYearMatch[6];
    if (startMonth && endMonth) {
      return {
        fecha_inicio: `${startYear}-${startMonth}-${startDay}`,
        fecha_fin: `${endYear}-${endMonth}-${endDay}`,
      };
    }
  }

  // Pattern 2: Cross-month with year at end: e.g. "28-de-septiembre-a-4-de-octubre-de-2026" or "28 de septiembre a 4 de octubre de 2026"
  const crossMonthYearMatch = text.match(
    /(\d{1,2})\s*(?:de|-)\s*([a-zñ]+)\s*(?:a|-)\s*(\d{1,2})\s*(?:de|-)\s*([a-zñ]+)\s*(?:de|-)\s*(\d{4})/i
  );
  if (crossMonthYearMatch) {
    const startDay = crossMonthYearMatch[1].padStart(2, '0');
    const startMonth = SPANISH_MONTHS[crossMonthYearMatch[2]];
    const endDay = crossMonthYearMatch[3].padStart(2, '0');
    const endMonth = SPANISH_MONTHS[crossMonthYearMatch[4]];
    const endYear = parseInt(crossMonthYearMatch[5], 10);
    const startYear = startMonth === '12' && endMonth === '01' ? endYear - 1 : endYear;
    if (startMonth && endMonth) {
      return {
        fecha_inicio: `${startYear}-${startMonth}-${startDay}`,
        fecha_fin: `${endYear}-${endMonth}-${endDay}`,
      };
    }
  }

  // Pattern 3: Same-month with year at end: e.g. "7-a-13-de-septiembre-de-2026" or "7-13 de septiembre de 2026"
  const sameMonthYearMatch = text.match(
    /(\d{1,2})\s*(?:a|-)\s*(\d{1,2})\s*(?:de|-)\s*([a-zñ]+)\s*(?:de|-)\s*(\d{4})/i
  );
  if (sameMonthYearMatch) {
    const startDay = sameMonthYearMatch[1].padStart(2, '0');
    const endDay = sameMonthYearMatch[2].padStart(2, '0');
    const month = SPANISH_MONTHS[sameMonthYearMatch[3]];
    const year = sameMonthYearMatch[4];
    if (month) {
      return {
        fecha_inicio: `${year}-${month}-${startDay}`,
        fecha_fin: `${year}-${month}-${endDay}`,
      };
    }
  }

  // Pattern 4: Cross-month without year: e.g. "28 de septiembre a 4 de octubre"
  const crossMonthNoYearMatch = text.match(
    /(\d{1,2})\s*(?:de|-)\s*([a-zñ]+)\s*(?:a|-)\s*(\d{1,2})\s*(?:de|-)\s*([a-zñ]+)/i
  );
  if (crossMonthNoYearMatch) {
    const startDay = crossMonthNoYearMatch[1].padStart(2, '0');
    const startMonth = SPANISH_MONTHS[crossMonthNoYearMatch[2]];
    const endDay = crossMonthNoYearMatch[3].padStart(2, '0');
    const endMonth = SPANISH_MONTHS[crossMonthNoYearMatch[4]];
    const year = fallbackYear || new Date().getFullYear();
    const startYear = startMonth === '12' && endMonth === '01' ? year - 1 : year;
    if (startMonth && endMonth) {
      return {
        fecha_inicio: `${startYear}-${startMonth}-${startDay}`,
        fecha_fin: `${year}-${endMonth}-${endDay}`,
      };
    }
  }

  // Pattern 5: Same-month without year: e.g. "7-13 de septiembre" or "7 a 13 de septiembre"
  const sameMonthNoYearMatch = text.match(
    /(\d{1,2})\s*(?:a|-)\s*(\d{1,2})\s*(?:de|-)\s*([a-zñ]+)/i
  );
  if (sameMonthNoYearMatch) {
    const startDay = sameMonthNoYearMatch[1].padStart(2, '0');
    const endDay = sameMonthNoYearMatch[2].padStart(2, '0');
    const month = SPANISH_MONTHS[sameMonthNoYearMatch[3]];
    const year = fallbackYear || new Date().getFullYear();
    if (month) {
      return {
        fecha_inicio: `${year}-${month}-${startDay}`,
        fecha_fin: `${year}-${month}-${endDay}`,
      };
    }
  }

  return { fecha_inicio: '', fecha_fin: '' };
}
