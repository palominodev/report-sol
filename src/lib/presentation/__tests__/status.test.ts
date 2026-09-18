import { describe, it, expect } from 'vitest';
import {
  weekEstadoMeta,
  assignmentEstadoLabel,
  presentationTypeLabel,
  meetingSectionLabel,
  salaLabel,
  SALA_LABELS,
} from '../status';

describe('weekEstadoMeta', () => {
  it('maps no_generada to a neutral "No generada" badge', () => {
    const meta = weekEstadoMeta('no_generada');
    expect(meta.label).toBe('No generada');
    expect(meta.badgeClass).toContain('gray');
  });

  it('maps borrador to an amber "Borrador" badge', () => {
    const meta = weekEstadoMeta('borrador');
    expect(meta.label).toBe('Borrador');
    expect(meta.badgeClass).toContain('amber');
  });

  it('maps confirmada to a green "Confirmada" badge', () => {
    const meta = weekEstadoMeta('confirmada');
    expect(meta.label).toBe('Confirmada');
    expect(meta.badgeClass).toContain('green');
  });
});

describe('assignmentEstadoLabel', () => {
  it('labels draft as Borrador', () => {
    expect(assignmentEstadoLabel('draft')).toBe('Borrador');
  });

  it('labels confirmed as Confirmado', () => {
    expect(assignmentEstadoLabel('confirmed')).toBe('Confirmado');
  });

  it('labels manual as Manual', () => {
    expect(assignmentEstadoLabel('manual')).toBe('Manual');
  });
});

describe('presentationTypeLabel', () => {
  it('labels a companion part type', () => {
    expect(presentationTypeLabel('empiece_conversaciones')).toBe('Empiece conversaciones');
  });

  it('labels the bible reading', () => {
    expect(presentationTypeLabel('lectura_biblia')).toBe('Lectura de la Biblia');
  });

  it('labels the discourse', () => {
    expect(presentationTypeLabel('discurso')).toBe('Discurso');
  });

  it('labels the new one-person qué diría part', () => {
    expect(presentationTypeLabel('que_diria')).toBe('¿Qué diría?');
  });

  it('labels the new two-person beliefs demonstration part', () => {
    expect(presentationTypeLabel('explique_sus_creencias')).toBe('Explique sus creencias');
  });
});

describe('meetingSectionLabel', () => {
  it('labels TESOROS_DE_LA_BIBLIA', () => {
    expect(meetingSectionLabel('TESOROS_DE_LA_BIBLIA')).toBe('TESOROS DE LA BIBLIA');
  });

  it('labels SEAMOS_MEJORES_MAESTROS', () => {
    expect(meetingSectionLabel('SEAMOS_MEJORES_MAESTROS')).toBe('SEAMOS MEJORES MAESTROS');
  });
});

describe('salaLabel', () => {
  it('labels Sala A with its principal-room name', () => {
    expect(salaLabel('A')).toBe('Sala A (Principal)');
  });

  it('labels Sala B with its auxiliary-room name', () => {
    expect(salaLabel('B')).toBe('Sala B (Auxiliar)');
  });

  it('returns null for an unknown room so no badge renders', () => {
    expect(salaLabel(null)).toBeNull();
  });
});

describe('SALA_LABELS (sala tabs and per-room print header contract)', () => {
  it('exposes a label for every room the tabs and print view can filter by', () => {
    expect(SALA_LABELS).toEqual({ A: 'Sala A (Principal)', B: 'Sala B (Auxiliar)' });
  });
});