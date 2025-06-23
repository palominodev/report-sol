type RolCongregacion = 'anciano' | 'siervo ministerial' | 'regular' | 'auxiliar' | 'publicador'

type RolGrupo = 'encargado' | 'miembro' | 'auxiliar'

class UserId {
	constructor(public readonly value: number){
		if(value <= 0){
			throw new Error('El id del usuario debe ser positivo')
		}
	}
}

class GrupoId {
	constructor(public readonly value: number) {
		if (value <= 0) {
			throw new Error('El id de grupo debe ser positivo');
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
		if(nuevoNombre === '' || nuevoApellido === '') {
			throw new Error('El nombre y apellido no puede estar en blanco')
		}
		this.nombre = nuevoNombre
		this.apellido = nuevoApellido
		console.log(`Nombre cambiado a ${nuevoNombre} ${nuevoApellido}`)
	}

	cambiarGrupo(nuevoGrupo: GrupoId): void {
		this.grupo = nuevoGrupo;
		console.log(`${this.nombre} ${this.apellido} ahora pertenece al grupo ${nuevoGrupo.value}`);
	}

	actualizarRolCongregacion(nuevosRoles: RolCongregacion[]) {
		if (nuevosRoles.length < 1) {
			throw new Error('El usuario debe tener al menos un rol en la congregación.');
		}

		if(nuevosRoles.length > 2) {
			throw new Error('El usuairo no debe tener mas de 2 roles de congregación')
		}

		const rolesUnicos = new Set(nuevosRoles);

		// No puede ser anciano y siervo ministerial a la vez
		if (rolesUnicos.has('anciano') && rolesUnicos.has('siervo ministerial')) {
			throw new Error(`${this.nombre} ${this.apellido} solo puede ser "Anciano" o "Siervo Ministerial", no ambos.`);
		}

		// Solo puede tener uno entre regular, auxiliar o publicador
		const rolesPublicador = ['regular', 'auxiliar', 'publicador'];
		const cantidadRolesPublicador = nuevosRoles.filter(r => rolesPublicador.includes(r)).length;
		if (cantidadRolesPublicador > 1) {
			throw new Error(`${this.nombre} ${this.apellido} solo puede ser uno entre "Auxiliar", "Regular" o "Publicador".`);
		}

		this.rol_congregacion = nuevosRoles;
		console.log(`Ahora el usuario tiene estos roles: ${this.rol_congregacion}`);
	}
}