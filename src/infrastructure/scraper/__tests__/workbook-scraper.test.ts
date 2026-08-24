import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  parseWorkbookPage,
  mapToWeekAndParts,
  parseIssueFromLanding,
  parseWeekUrlsFromLanding,
} from '../workbook-scraper';

const FIXTURES = join(__dirname, 'fixtures');

function fixture(name: string): string {
  return readFileSync(join(FIXTURES, name), 'utf-8');
}

const WEEK_FIXTURE = fixture('mwb-week1-sep7.html');
const LANDING_FIXTURE = fixture('mwb-landing-2026-09.html');

describe('parseWorkbookPage', () => {
  it('extracts the week label from the article h1', () => {
    const data = parseWorkbookPage(WEEK_FIXTURE);
    expect(data.weekLabel).toBe('7-13 de septiembre');
  });

  it('finds the four in-scope included parts in document order with section', () => {
    const data = parseWorkbookPage(WEEK_FIXTURE);
    const labels = data.parts.map((p) => `${p.title}|${p.section}`);
    expect(labels).toEqual([
      'Lectura de la Biblia|TESOROS_DE_LA_BIBLIA',
      'Empiece conversaciones|SEAMOS_MEJORES_MAESTROS',
      'Empiece conversaciones|SEAMOS_MEJORES_MAESTROS',
      'Haga revisitas|SEAMOS_MEJORES_MAESTROS',
    ]);
  });

  it('excludes NUESTRA VIDA CRISTIANA and non-assignable parts entirely', () => {
    const data = parseWorkbookPage(WEEK_FIXTURE);
    const titles = data.parts.map((p) => p.title);
    expect(titles).not.toContain('Estudio bíblico de la congregación');
    expect(titles).not.toContain('Meditar en las cualidades de Jehová fortalece nuestra fe');
    expect(titles).not.toContain('Busquemos perlas escondidas');
    expect(titles).not.toContain("¿Qué diría?");
  });
});

describe('mapToWeekAndParts', () => {
  it('derives week issue, dates, and semana from the canonical slug and heading', () => {
    const data = parseWorkbookPage(WEEK_FIXTURE);
    const { week } = mapToWeekAndParts(data);
    expect(week.semana).toBe('7-13 de septiembre');
    expect(week.issue).toBe('2026-09');
    expect(week.fecha_inicio).toBe('2026-09-07');
    expect(week.fecha_fin).toBe('2026-09-13');
  });

  it('maps each part to tipo, seccion, duracion, escenario and source ref', () => {
    const data = parseWorkbookPage(WEEK_FIXTURE);
    const { parts } = mapToWeekAndParts(data);

    expect(parts).toHaveLength(4);

    const lectura = parts[0];
    expect(lectura.orden).toBe(1);
    expect(lectura.tipo).toBe('lectura_biblia');
    expect(lectura.seccion).toBe('TESOROS_DE_LA_BIBLIA');
    expect(lectura.duracion_min).toBe(4);
    expect(lectura.escenario).toBeNull();
    expect(lectura.fuente.fuente).toBe('bib');
    expect(lectura.fuente.leccion).toBe(2);
    expect(lectura.fuente.punto).toBe('Jer 32:6-18');

    expect(parts[1]).toMatchObject({
      orden: 2,
      tipo: 'empiece_conversaciones',
      seccion: 'SEAMOS_MEJORES_MAESTROS',
      duracion_min: 3,
      escenario: 'DE_CASA_EN_CASA',
    });
    expect(parts[1].fuente).toMatchObject({ fuente: 'lmd', leccion: 4, punto: '3' });

    expect(parts[2]).toMatchObject({
      orden: 3,
      tipo: 'empiece_conversaciones',
      duracion_min: 4,
      escenario: 'PREDICACION_INFORMAL',
    });
    expect(parts[2].fuente).toMatchObject({ fuente: 'lmd', leccion: 4, punto: '4' });

    expect(parts[3]).toMatchObject({
      orden: 4,
      tipo: 'haga_revisitas',
      duracion_min: 5,
      escenario: 'DE_CASA_EN_CASA',
    });
    expect(parts[3].fuente).toMatchObject({ fuente: 'lmd', leccion: 8, punto: '3' });
  });

  it('maps Haga discípulos (th lesson) and Discurso (lmd appendix + th lesson title)', () => {
    const html =
      '<html><head>' +
      '<link rel="canonical" href="https://www.jw.org/es/biblioteca/guia-actividades-reunion-testigos-jehova/septiembre-octubre-2026-mwb/Vida-y-Ministerio-Cristianos-14-a-20-de-septiembre-de-2026/">' +
      '</head><body><article><h1>14-20 de septiembre</h1>' +
      '<h2>SEAMOS MEJORES MAESTROS</h2>' +
      '<h3>3. Haga discípulos</h3><div><p>(4 mins.) Converse con su estudiante sobre la conferencia (th lección 11).</p></div>' +
      '<h3>4. Discurso</h3><div><p>(4 mins.) lmd apéndice A punto 20. Título: Jesús no es Dios ( th lección 7 ).</p></div>' +
      '</article></body></html>';

    const data = parseWorkbookPage(html);
    const { parts } = mapToWeekAndParts(data);

    expect(parts).toHaveLength(2);
    expect(parts[0]).toMatchObject({ tipo: 'haga_discipulos', duracion_min: 4, escenario: null });
    expect(parts[0].fuente).toMatchObject({ fuente: 'th', leccion: 11, punto: undefined });

    expect(parts[1]).toMatchObject({ tipo: 'discurso', duracion_min: 4, escenario: null });
    expect(parts[1].fuente).toMatchObject({ fuente: 'lmd', punto: 'A20' });
    expect(parts[1].fuente.leccion).toBe(7);
  });

  it('derives cross-month dates from the canonical slug', () => {
    const html =
      '<html><head>' +
      '<link rel="canonical" href="https://www.jw.org/es/biblioteca/guia-actividades-reunion-testigos-jehova/septiembre-octubre-2026-mwb/Vida-y-Ministerio-Cristianos-28-de-septiembre-a-4-de-octubre-de-2026/">' +
      '</head><body><article><h1>28 de septiembre a 4 de octubre</h1>' +
      '<h2>SEAMOS MEJORES MAESTROS</h2>' +
      '<h3>2. Empiece conversaciones</h3><div><p>(3 mins.) DE CASA EN CASA (lmd lección 4 punto 3).</p></div>' +
      '</article></body></html>';

    const data = parseWorkbookPage(html);
    const { week } = mapToWeekAndParts(data);
    expect(week.fecha_inicio).toBe('2026-09-28');
    expect(week.fecha_fin).toBe('2026-10-04');
    expect(week.semana).toBe('28 de septiembre a 4 de octubre');
  });

  it('maps PREDICACIÓN PÚBLICA scenario for a revisita part', () => {
    const html =
      '<html><head>' +
      '<link rel="canonical" href="https://www.jw.org/es/biblioteca/guia-actividades-reunion-testigos-jehova/septiembre-octubre-2026-mwb/Vida-y-Ministerio-Cristianos-21-a-27-de-septiembre-de-2026/">' +
      '</head><body><article><h1>21-27 de septiembre</h1>' +
      '<h2>SEAMOS MEJORES MAESTROS</h2>' +
      '<h3>2. Haga revisitas</h3><div><p>(5 mins.) PREDICACIÓN PÚBLICA. Presente un texto bíblico (lmd lección 5 punto 2).</p></div>' +
      '</article></body></html>';

    const data = parseWorkbookPage(html);
    const { parts } = mapToWeekAndParts(data);
    expect(parts[0].escenario).toBe('PREDICACION_PUBLICA');
  });
});

describe('landing page parsing', () => {
  it('extracts the current issue label from the choose-language link', () => {
    expect(parseIssueFromLanding(LANDING_FIXTURE)).toBe('2026-09');
  });

  it('lists the eight week page URLs of the issue in order', () => {
    const urls = parseWeekUrlsFromLanding(LANDING_FIXTURE);
    expect(urls).toHaveLength(8);
    expect(urls[0]).toContain('7-a-13-de-septiembre-de-2026');
    expect(urls[7]).toContain('26-de-octubre-a-1-de-noviembre-de-2026');
    expect(new Set(urls).size).toBe(8);
  });
});