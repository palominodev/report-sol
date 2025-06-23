import { User } from "./User";

type Mes = 'ENE'|'FEB'|'MAR'|'ABR'|'MAY'|'JUN'|'JUL'|'AGO'|'SEP'|'OCT'|'NOV'|'DIC'

export class Informe {
	constructor(
		private id: number,
		private fecha_ingreso: Date,
		private horas: number | null,
		private anio: number,
		private participacion: boolean,
		private mes: Mes,
		private usuario: User
	) {
		this.validarInforme();
	}

	private validarInforme(): void {
		this.validarHoras();
		this.validarFecha();
		this.validarAnio();
	}

	private validarHoras(): void {
		if (this.horas !== null && (this.horas < 0 || this.horas > 200)) {
			throw new Error(`Las horas reportadas (${this.horas}) deben estar entre 0 y 200.`);
		}
	}

	private validarFecha(): void {
		const fechaActual = new Date();
		if (this.fecha_ingreso > fechaActual) {
			throw new Error('La fecha de ingreso no puede ser futura.');
		}
	}

	private validarAnio(): void {
		const anioActual = new Date().getFullYear();
		if (this.anio < 2020 || this.anio > anioActual) {
			throw new Error(`El año (${this.anio}) debe estar entre 2020 y ${anioActual}.`);
		}
	}

	// Métodos públicos para gestionar el informe
	actualizarHoras(nuevasHoras: number | null): void {
		if (nuevasHoras !== null && (nuevasHoras < 0 || nuevasHoras > 200)) {
			throw new Error(`Las horas reportadas (${nuevasHoras}) deben estar entre 0 y 200.`);
		}
		this.horas = nuevasHoras;
		console.log(`Horas actualizadas a: ${this.horas}`);
	}

	cambiarParticipacion(nuevaParticipacion: boolean): void {
		this.participacion = nuevaParticipacion;
		console.log(`Participación actualizada a: ${this.participacion}`);
	}

	// Getters para acceder a los datos
	getId(): number {
		return this.id;
	}

	getHoras(): number | null {
		return this.horas;
	}

	getParticipacion(): boolean {
		return this.participacion;
	}

	getMes(): Mes {
		return this.mes;
	}

	getAnio(): number {
		return this.anio;
	}

	getUsuario(): User {
		return this.usuario;
	}

	// Método para verificar si el informe está completo
	estaCompleto(): boolean {
		return this.horas !== null && this.participacion !== undefined;
	}

	// Método para obtener resumen del informe
	obtenerResumen(): string {
		return `Informe de ${this.usuario.nombre} ${this.usuario.apellido} - ${this.mes} ${this.anio}: ${this.horas || 0} horas, participación: ${this.participacion ? 'Sí' : 'No'}`;
	}
}


