import { PresentationType } from '@/domain/entities/presentation/enums';

/**
 * Arity of a presentation part in role slots.
 * One-person parts expose only `presentador`; two-person parts add `companero`.
 */
export type Arity = 1 | 2;

/** R1: who may present (and generally hold) this tipo. */
export type CargoPolicy = 'only_anciano_siervo' | 'any_cargo';

/** R3: gender gate for who may hold this tipo. */
export type GenderPolicy = 'masculino_only' | 'any_gender';

/** R2: pair composition policy for two-person parts. */
export type PairPolicy = 'mixed_iff_same_familia' | 'never_mixed' | 'none';

/**
 * Per-tipo hard-eligibility policy, encoded as pure data. The single editable
 * point for per-type rules: changing a tipo's rule is a one-cell edit here,
 * never an engine change. `Readonly<Record<PresentationType, PartTypePolicy>>`
 * makes the matrix compiler-enforced exhaustive: adding a `PresentationType`
 * without a row fails the build.
 */
export interface PartTypePolicy {
  readonly arity: Arity;
  readonly presenterCargo: CargoPolicy;
  readonly presenterGender: GenderPolicy;
  readonly pair: PairPolicy;
}

export const PART_TYPE_POLICIES: Readonly<Record<PresentationType, PartTypePolicy>> = {
  que_diria: {
    arity: 1,
    presenterCargo: 'only_anciano_siervo',
    presenterGender: 'any_gender',
    pair: 'none',
  },
  lectura_biblia: {
    arity: 1,
    presenterCargo: 'any_cargo',
    presenterGender: 'masculino_only',
    pair: 'none',
  },
  discurso: {
    arity: 1,
    presenterCargo: 'any_cargo',
    presenterGender: 'masculino_only',
    pair: 'none',
  },
  empiece_conversaciones: {
    arity: 2,
    presenterCargo: 'any_cargo',
    presenterGender: 'any_gender',
    pair: 'mixed_iff_same_familia',
  },
  haga_revisitas: {
    arity: 2,
    presenterCargo: 'any_cargo',
    presenterGender: 'any_gender',
    pair: 'never_mixed',
  },
  haga_discipulos: {
    arity: 2,
    presenterCargo: 'any_cargo',
    presenterGender: 'any_gender',
    pair: 'never_mixed',
  },
  explique_sus_creencias: {
    arity: 2,
    presenterCargo: 'any_cargo',
    presenterGender: 'any_gender',
    pair: 'mixed_iff_same_familia',
  },
};