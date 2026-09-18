import { TursoInformeRepository } from '../persistence/turso-informe.repository';
import { TursoGrupoRepository } from '../persistence/turso-grupo.repository';
import { TursoUserRepository } from '../persistence/turso-user.repository';
import { TursoAssignmentsRepository } from '../persistence/turso-assignments.repository';
import { IInformeRepository } from '@/core/domain/repositories/IInformeRepository';
import { IGrupoRepository } from '@/core/domain/repositories/IGrupoRepository';
import { IUserRepository } from '@/core/domain/repositories/IUserRepository';
import { GetDashboardStatsUseCase } from '@/core/application/use-cases/GetDashboardStatsUseCase';
import { IAssignmentsRepository } from '@/core/domain/presentations/IAssignmentsRepository';
import { RuleRegistry } from '@/core/domain/presentations/RuleRegistry';
import { NoRepeatPairWithin6MonthsRule } from '@/core/domain/presentations/NoRepeatPairWithin6MonthsRule';
import { PresenterEligibilityRule } from '@/core/domain/presentations/rules/PresenterEligibilityRule';
import { PairPolicyRule } from '@/core/domain/presentations/rules/PairPolicyRule';
import { NoRepeatTipoRule } from '@/core/domain/presentations/rules/NoRepeatTipoRule';
import { RoleRotationRule } from '@/core/domain/presentations/rules/RoleRotationRule';
import { SalaRotationRule } from '@/core/domain/presentations/rules/SalaRotationRule';
import { CreateMeetingWeekUseCase } from '@/core/application/use-cases/presentation/CreateMeetingWeekUseCase';
import { GenerateWeekAssignmentsUseCase } from '@/core/application/use-cases/presentation/GenerateWeekAssignmentsUseCase';
import { GetWeekAssignmentsUseCase } from '@/core/application/use-cases/presentation/GetWeekAssignmentsUseCase';
import { OverrideAssignmentUseCase } from '@/core/application/use-cases/presentation/OverrideAssignmentUseCase';
import { SetPartSalaUseCase } from '@/core/application/use-cases/presentation/SetPartSalaUseCase';
import { ConfirmWeekAssignmentsUseCase } from '@/core/application/use-cases/presentation/ConfirmWeekAssignmentsUseCase';

export function getInformeRepository(): IInformeRepository {
  return new TursoInformeRepository();
}

export function getAssignmentsRepository(): IAssignmentsRepository {
  return new TursoAssignmentsRepository();
}

export function getCreateMeetingWeekUseCase(): CreateMeetingWeekUseCase {
  return new CreateMeetingWeekUseCase(getAssignmentsRepository());
}

/**
 * Composition-root factory for the matching-rule registry: adding, removing,
 * or reordering a rule is a one-line edit here, never an engine change.
 */
export function getMatchingRules(): RuleRegistry {
  const registry = new RuleRegistry();
  registry.register(new NoRepeatPairWithin6MonthsRule()); // R5 soft
  registry.register(new PresenterEligibilityRule()); // R1+R3 hard
  registry.register(new PairPolicyRule()); // R2 hard
  registry.register(new NoRepeatTipoRule()); // R4 hard
  registry.register(new RoleRotationRule()); // R6 soft
  registry.register(new SalaRotationRule()); // joint sala+acompañante repeat, soft (26w)
  return registry;
}

export function getGenerateWeekAssignmentsUseCase(): GenerateWeekAssignmentsUseCase {
  return new GenerateWeekAssignmentsUseCase(getUserRepository(), getAssignmentsRepository(), getMatchingRules());
}

export function getGetWeekAssignmentsUseCase(): GetWeekAssignmentsUseCase {
  return new GetWeekAssignmentsUseCase(getAssignmentsRepository());
}

export function getOverrideAssignmentUseCase(): OverrideAssignmentUseCase {
  return new OverrideAssignmentUseCase(getAssignmentsRepository());
}

export function getSetPartSalaUseCase(): SetPartSalaUseCase {
  return new SetPartSalaUseCase(getAssignmentsRepository());
}

export function getConfirmWeekAssignmentsUseCase(): ConfirmWeekAssignmentsUseCase {
  return new ConfirmWeekAssignmentsUseCase(getAssignmentsRepository());
}

export function getGrupoRepository(): IGrupoRepository {
  return new TursoGrupoRepository();
}

export function getUserRepository(): IUserRepository {
  return new TursoUserRepository();
}

export function getDashboardStatsUseCase(): GetDashboardStatsUseCase {
  return new GetDashboardStatsUseCase(new TursoInformeRepository());
}
