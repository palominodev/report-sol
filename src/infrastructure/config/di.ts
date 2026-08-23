import { TursoInformeRepository } from '../persistence/turso-informe.repository';
import { TursoGrupoRepository } from '../persistence/turso-grupo.repository';
import { TursoUserRepository } from '../persistence/turso-user.repository';
import { TursoAssignmentsRepository } from '../persistence/turso-assignments.repository';
import { IInformeRepository } from '@/core/domain/repositories/IInformeRepository';
import { IGrupoRepository } from '@/core/domain/repositories/IGrupoRepository';
import { IUserRepository } from '@/core/domain/repositories/IUserRepository';
import { GetDashboardStatsUseCase } from '@/core/application/use-cases/GetDashboardStatsUseCase';
import { IAssignmentsRepository } from '@/core/domain/presentations/IAssignmentsRepository';
import { CreateMeetingWeekUseCase } from '@/core/application/use-cases/presentation/CreateMeetingWeekUseCase';
import { GenerateWeekAssignmentsUseCase } from '@/core/application/use-cases/presentation/GenerateWeekAssignmentsUseCase';
import { GetWeekAssignmentsUseCase } from '@/core/application/use-cases/presentation/GetWeekAssignmentsUseCase';
import { OverrideAssignmentUseCase } from '@/core/application/use-cases/presentation/OverrideAssignmentUseCase';
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

export function getGenerateWeekAssignmentsUseCase(): GenerateWeekAssignmentsUseCase {
  return new GenerateWeekAssignmentsUseCase(getUserRepository(), getAssignmentsRepository());
}

export function getGetWeekAssignmentsUseCase(): GetWeekAssignmentsUseCase {
  return new GetWeekAssignmentsUseCase(getAssignmentsRepository());
}

export function getOverrideAssignmentUseCase(): OverrideAssignmentUseCase {
  return new OverrideAssignmentUseCase(getAssignmentsRepository());
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
