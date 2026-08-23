import { ValidationError } from '@/core/domain/errors/ValidationError';

export const GENERO_VALUES = ['masculino', 'femenino'] as const;

/**
 * Normalizes and validates a usuario genero value.
 * Returns the trimmed lowercase value, or null when undefined/empty
 * (backfill allowed — user stays ineligible until set).
 */
export function normalizeGenero(genero?: string | null): 'masculino' | 'femenino' | null {
  if (genero === undefined || genero === null || genero.trim() === '') {
    return null;
  }
  const normalized = genero.trim().toLowerCase();
  if (!(GENERO_VALUES as readonly string[]).includes(normalized)) {
    throw new ValidationError(`El género debe ser "masculino" o "femenino". Se recibió: ${genero}`);
  }
  return normalized as 'masculino' | 'femenino';
}

export const PREACHING_ROLES = ['publicador', 'auxiliar', 'regular'] as const;
export type PreachingRole = (typeof PREACHING_ROLES)[number];

export const APPOINTMENT_ROLES = ['anciano', 'siervo', 'secretario', 'coordinador'] as const;
export type AppointmentRole = (typeof APPOINTMENT_ROLES)[number];

export type RolCongregacion = PreachingRole | AppointmentRole;

export type RolGrupo = 'encargado' | 'miembro' | 'auxiliar';

export function validateAndNormalizeRoles(roles: string[]): RolCongregacion[] {
	const normalized = roles.map(r => r.trim().toLowerCase());

	const preaching = normalized.filter(r => (PREACHING_ROLES as readonly string[]).includes(r)) as PreachingRole[];
	if (preaching.length > 1) {
		throw new ValidationError(
			`Solo se permite un rol de predicación ("Publicador", "Precursor Auxiliar" o "Precursor Regular"). Se enviaron: ${preaching.join(', ')}.`
		);
	}

	const selectedPreaching: PreachingRole = preaching.length === 1 ? preaching[0] : 'publicador';

	const appointments = normalized.filter(r => (APPOINTMENT_ROLES as readonly string[]).includes(r)) as AppointmentRole[];
	const appointmentSet = new Set(appointments);

	if (appointmentSet.has('anciano') && appointmentSet.has('siervo')) {
		throw new ValidationError('Un usuario no puede ser "Anciano" y "Siervo Ministerial" simultáneamente.');
	}

	const uniqueAppointments = Array.from(new Set(appointments));
	return [selectedPreaching, ...uniqueAppointments];
}

export class UserId {
	constructor(public readonly value: number){
		if(value <= 0){
			throw new ValidationError('El id del usuario debe ser positivo');
		}
	}
}

export class GrupoId {
	constructor(public readonly value: number) {
		if (value <= 0) {
			throw new ValidationError('El id de grupo debe ser positivo');
		}
	}
}

export class User {
	constructor(
		public readonly id: UserId,
		public nombre: string,
		public apellido: string,
		public rol_congregacion: RolCongregacion[],
		public rol_grupo: RolGrupo,
		public grupo: GrupoId
	) { }

	cambiarNombre(nuevoNombre: string, nuevoApellido: string): void {
		if(nuevoNombre.trim() === '' || nuevoApellido.trim() === '') {
			throw new ValidationError('El nombre y apellido no pueden estar en blanco');
		}
		this.nombre = nuevoNombre.trim();
		this.apellido = nuevoApellido.trim();
	}

	cambiarGrupo(nuevoGrupo: GrupoId): void {
		this.grupo = nuevoGrupo;
	}

	actualizarRolCongregacion(nuevosRoles: string[]): void {
		this.rol_congregacion = validateAndNormalizeRoles(nuevosRoles);
	}
}