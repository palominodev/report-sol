import { TursoInformeRepository } from '../persistence/turso-informe.repository';
import { TursoGrupoRepository } from '../persistence/turso-grupo.repository';
import { TursoUserRepository } from '../persistence/turso-user.repository';
import { IInformeRepository } from '@/core/domain/repositories/IInformeRepository';
import { IGrupoRepository } from '@/core/domain/repositories/IGrupoRepository';
import { IUserRepository } from '@/core/domain/repositories/IUserRepository';
import { GetDashboardStatsUseCase } from '@/core/application/use-cases/GetDashboardStatsUseCase';
import { IAssignmentsRepository } from '@/core/domain/presentations/IAssignmentsRepository';

export function getInformeRepository(): IInformeRepository {
  return new TursoInformeRepository();
}

export function getAssignmentsRepository(): IAssignmentsRepository {
  // Turso adapter is implemented in slice 2; a stub keeps the composition root compilable.
  throw new Error('getAssignmentsRepository not implemented yet (slice 2)');
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
