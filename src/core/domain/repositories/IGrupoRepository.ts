import { Grupo } from '@/domain/entities/Grupo';

export interface GrupoDetails {
  id_grupo: number;
  nombre_grupo: string;
  encargado: string | null;
  auxiliar: string | null;
}

export interface GrupoMemberReportStatus {
  id_usuario: number;
  nombre: string;
  apellido: string;
  rol_en_grupo: string;
  roles: string | null;
  informe_enviado: boolean;
}

export interface IGrupoRepository {
  findAll(): Promise<Grupo[]>;
  findAllWithDetails(): Promise<GrupoDetails[]>;
  findById(id: number): Promise<Grupo | null>;
  findNombreById(id: number): Promise<string | null>;
  findMembersWithReportStatus(idGrupo: number, mes: string, año: number): Promise<GrupoMemberReportStatus[]>;
  create(nombre: string): Promise<Grupo>;
  delete(id: number): Promise<void>;
  countMembers(id: number): Promise<number>;
}
