import { User } from "./User";

export class Grupo {
	constructor(
		public encargado: User,
		public auxilar: User | null,
		public miembros: User[]
	){
		this.validaciones()
	}

	private validaciones(){
		this.esEncargado(this.encargado)
	}

	private esEncargado(user:User) {
		if(this.encargado.rol_grupo !== 'encargado'){
			throw new Error(this.encargado.nombre + ' no puede ser asignado a encargado de grupo')
		}
	}
}