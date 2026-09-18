import { GetUsersUseCase } from '@/core/application/use-cases/GetUsersUseCase';
import { getUserRepository } from '@/infrastructure/config/di';

export interface PublicadorResumen {
  id_usuario: number;
  nombre: string;
  apellido: string;
  id_grupo: number | null;
}

export async function getPublicadores(): Promise<PublicadorResumen[]> {
  const userRepository = getUserRepository();
  const getUsersUseCase = new GetUsersUseCase(userRepository);
  const rows = await getUsersUseCase.executeWithDetails();

  return rows.map((row) => ({
    id_usuario: Number(row.id_usuario),
    nombre: String(row.nombre ?? ''),
    apellido: String(row.apellido ?? ''),
    id_grupo: row.id_grupo == null ? null : Number(row.id_grupo),
  }));
}
