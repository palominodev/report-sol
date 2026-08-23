import { describe, it, expect } from 'vitest';
import { AssignablePerson } from '../AssignablePerson';
import { PresentationPart } from '../PresentationPart';
import { SourceRef } from '../SourceRef';

function partOf(tipo: string): PresentationPart {
  return new PresentationPart(1, 1, 1, tipo as never, 'TESOROS_DE_LA_BIBLIA', 4, null, new SourceRef('lmd', 1));
}

describe('AssignablePerson.elegible', () => {
  it('is eligible when genero is femenino', () => {
    expect(new AssignablePerson(1, 'A', 'B', 'femenino').elegible()).toBe(true);
  });

  it('is eligible when genero is masculino', () => {
    expect(new AssignablePerson(1, 'A', 'B', 'masculino').elegible()).toBe(true);
  });

  it('is not eligible when genero is NULL', () => {
    expect(new AssignablePerson(1, 'A', 'B', null).elegible()).toBe(false);
  });
});

describe('PresentationPart.requiresCompanero', () => {
  it('returns true for the two-person part types', () => {
    expect(partOf('empiece_conversaciones').requiresCompanero()).toBe(true);
    expect(partOf('haga_revisitas').requiresCompanero()).toBe(true);
    expect(partOf('haga_discipulos').requiresCompanero()).toBe(true);
  });

  it('returns false for the one-person part types', () => {
    expect(partOf('lectura_biblia').requiresCompanero()).toBe(false);
    expect(partOf('discurso').requiresCompanero()).toBe(false);
  });
});