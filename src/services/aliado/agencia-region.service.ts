import { Injectable } from '@angular/core';

export interface Agencia {
	agenciaId: string;
	nombre: string;
	codigo: number;
	activo: boolean;
	regionId: string;
}

export interface Region {
	regionId: string;
	nombre: string;
	activo: string;
}

@Injectable({ providedIn: 'root' })
export class AgenciaRegionService {
	private readonly regiones: Region[] = [
		{ regionId: 'r-001', nombre: 'Región I', activo: 'true' },
		{ regionId: 'r-002', nombre: 'Región II', activo: 'true' },
		{ regionId: 'r-003', nombre: 'Región III', activo: 'true' },
		{ regionId: 'r-004', nombre: 'Región IV', activo: 'true' },
		{ regionId: 'r-005', nombre: 'Región V', activo: 'true' },
		{ regionId: 'r-006', nombre: 'Región VI', activo: 'true' },
		{ regionId: 'r-007', nombre: 'Región VII', activo: 'true' },
	];

	private readonly agencias: Agencia[] = [
		{ agenciaId: 'a-001', nombre: 'Chimaltenango (Sede)', codigo: 1, activo: true, regionId: 'r-001' },
		{ agenciaId: 'a-002', nombre: 'Sumpango', codigo: 2, activo: true, regionId: 'r-001' },
		{ agenciaId: 'a-003', nombre: 'San Andrés Itzapa', codigo: 3, activo: true, regionId: 'r-001' },
		{ agenciaId: 'a-004', nombre: 'San Juan Sacatepéquez', codigo: 4, activo: true, regionId: 'r-001' },
		{ agenciaId: 'a-005', nombre: 'Escuintla', codigo: 5, activo: true, regionId: 'r-001' },
		{ agenciaId: 'a-006', nombre: 'Cobán (Sede)', codigo: 6, activo: true, regionId: 'r-002' },
		{ agenciaId: 'a-007', nombre: 'Tactic', codigo: 7, activo: true, regionId: 'r-002' },
		{ agenciaId: 'a-008', nombre: 'Fray Bartolomé de las Casas', codigo: 8, activo: true, regionId: 'r-002' },
		{ agenciaId: 'a-009', nombre: 'Sololá (Sede)', codigo: 9, activo: true, regionId: 'r-003' },
		{ agenciaId: 'a-010', nombre: 'San Andrés Semetabaj', codigo: 10, activo: true, regionId: 'r-003' },
		{ agenciaId: 'a-011', nombre: 'San Pedro La Laguna', codigo: 11, activo: true, regionId: 'r-003' },
		{ agenciaId: 'a-012', nombre: 'San Lucas Tolimán', codigo: 12, activo: true, regionId: 'r-003' },
		{ agenciaId: 'a-013', nombre: 'Quetzaltenango (Xela)', codigo: 13, activo: true, regionId: 'r-003' },
		{ agenciaId: 'a-014', nombre: 'San Rafael Pie de la Cuesta', codigo: 14, activo: true, regionId: 'r-003' },
		{ agenciaId: 'a-015', nombre: 'San Pedro Sacatepéquez', codigo: 15, activo: true, regionId: 'r-003' },
		{ agenciaId: 'a-016', nombre: 'Santa Cruz del Quiché', codigo: 16, activo: true, regionId: 'r-003' },
		{ agenciaId: 'a-017', nombre: 'Chichicastenango', codigo: 17, activo: true, regionId: 'r-003' },
		{ agenciaId: 'a-018', nombre: 'Huehuetenango (Sede)', codigo: 18, activo: true, regionId: 'r-004' },
		{ agenciaId: 'a-019', nombre: 'La Democracia', codigo: 19, activo: true, regionId: 'r-004' },
		{ agenciaId: 'a-020', nombre: 'San Antonio Huista', codigo: 20, activo: true, regionId: 'r-004' },
		{ agenciaId: 'a-021', nombre: 'Todos Santos Cuchumatán', codigo: 21, activo: true, regionId: 'r-004' },
		{ agenciaId: 'a-022', nombre: 'Nebaj', codigo: 22, activo: true, regionId: 'r-004' },
		{ agenciaId: 'a-023', nombre: 'Tecpán (Sede)', codigo: 23, activo: true, regionId: 'r-005' },
		{ agenciaId: 'a-024', nombre: 'Patzicía', codigo: 24, activo: true, regionId: 'r-005' },
		{ agenciaId: 'a-025', nombre: 'Patzún', codigo: 25, activo: true, regionId: 'r-005' },
		{ agenciaId: 'a-026', nombre: 'San Juan Comalapa', codigo: 26, activo: true, regionId: 'r-005' },
		{ agenciaId: 'a-027', nombre: 'San Martín Jilotepeque', codigo: 27, activo: true, regionId: 'r-005' },
		{ agenciaId: 'a-028', nombre: 'Cuilapa (Sede)', codigo: 28, activo: true, regionId: 'r-006' },
		{ agenciaId: 'a-029', nombre: 'Chiquimulilla', codigo: 29, activo: true, regionId: 'r-006' },
		{ agenciaId: 'a-030', nombre: 'Jalapa', codigo: 30, activo: true, regionId: 'r-006' },
		{ agenciaId: 'a-031', nombre: 'Jutiapa', codigo: 31, activo: true, regionId: 'r-006' },
		{ agenciaId: 'a-032', nombre: 'San José Pinula', codigo: 32, activo: true, regionId: 'r-006' },
		{ agenciaId: 'a-033', nombre: 'Sayaxché (Sede)', codigo: 33, activo: true, regionId: 'r-007' },
		{ agenciaId: 'a-034', nombre: 'Poptún', codigo: 34, activo: true, regionId: 'r-007' },
		{ agenciaId: 'a-035', nombre: 'Las Cruces', codigo: 35, activo: true, regionId: 'r-007' },
		{ agenciaId: 'a-036', nombre: 'Ixcán', codigo: 36, activo: true, regionId: 'r-007' },
	];


	// Solo métodos para listar
	async getRegiones(): Promise<Region[]> {
		return Promise.resolve(this.regiones);
	}

	async getAgencias(): Promise<Agencia[]> {
		return Promise.resolve(this.agencias);
	}

}

