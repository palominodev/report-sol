import { describe, it, expect } from 'vitest';
import { AssignablePerson } from '../AssignablePerson';
import { PresentationPart } from '../PresentationPart';
import { SourceRef } from '../SourceRef';

function partOf(tipo: string): PresentationPart {
  return new PresentationPart(1, 1, 1, tipo as never, 'TESOROS_DE_LA_BIBLIA', 4, null, new SourceRef('lmd', 1));
}

describe('AssignablePerson.elegible', () => {
  it('is eligible when genero is femenino', () => {
    expect(new AssignablePerson(1, 'A', 'B', 'femenino', null, null).elegible()).toBe(true);
  });

  it('is eligible when genero is masculino', () => {
    expect(new AssignablePerson(1, 'A', 'B', 'masculino', null, null).elegible()).toBe(true);
  });

  it('is not eligible when genero is NULL', () => {
    expect(new AssignablePerson(1, 'A', 'B', null, null, null).elegible()).toBe(false);
  });
});

describe('AssignablePerson cargo and familia projection', () => {
  it('carries the cargo derived from usuario_rol', () => {
    expect(new AssignablePerson(1, 'A', 'B', 'masculino', 'anciano', null).cargo).toBe('anciano');
    expect(new AssignablePerson(2, 'C', 'D', 'masculino', 'siervo', null).cargo).toBe('siervo');
  });

  it('carries a null cargo when the person holds neither anciano nor siervo', () => {
    expect(new AssignablePerson(3, 'E', 'F', 'masculino', null, null).cargo).toBeNull();
  });

  it('carries the nullable familia_id', () => {
    expect(new AssignablePerson(4, 'G', 'H', 'femenino', null, 7).familia_id).toBe(7);
    expect(new AssignablePerson(5, 'I', 'J', 'femenino', null, null).familia_id).toBeNull();
  });
});

describe('PresentationPart.requiresCompanero', () => {
  it('returns true for the two-person part types', () => {
    expect(partOf('empiece_conversaciones').requiresCompanero()).toBe(true);
    expect(partOf('haga_revisitas').requiresCompanero()).toBe(true);
    expect(partOf('haga_discipulos').requiresCompanero()).toBe(true);
    expect(partOf('escenificacion').requiresCompanero()).toBe(true);
  });

  it('returns false for the one-person part types', () => {
    expect(partOf('lectura_biblia').requiresCompanero()).toBe(false);
    expect(partOf('discurso').requiresCompanero()).toBe(false);
    expect(partOf('que_diria').requiresCompanero()).toBe(false);
  });
});