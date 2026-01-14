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
		{ regionId: 'r-001', nombre: 'REGIONAL I', activo: 'true' },
		{ regionId: 'r-002', nombre: 'REGIONAL II', activo: 'true' },
		{ regionId: 'r-003', nombre: 'REGIONAL III', activo: 'true' },
		{ regionId: 'r-004', nombre: 'REGIONAL IV', activo: 'true' },
		{ regionId: 'r-005', nombre: 'REGIONAL V', activo: 'true' },
		{ regionId: 'r-006', nombre: 'REGIONAL VI', activo: 'true' },
		{ regionId: 'r-007', nombre: 'REGIONAL VII', activo: 'true' },
	];

	private readonly agencias: Agencia[] = [
		{ agenciaId: 'a-001', nombre: 'AGENCIA CHIMALTENANGO', codigo: 1, activo: true, regionId: 'r-001' },
		{ agenciaId: 'a-002', nombre: 'AGENCIA SAN JUAN SACATEPEQUEZ', codigo: 2, activo: true, regionId: 'r-001' },
		{ agenciaId: 'a-003', nombre: 'AGENCIA SAN MARTIN JILOPEPEQUE', codigo: 3, activo: true, regionId: 'r-001' },
		{ agenciaId: 'a-004', nombre: 'AGENCIA ANTIGUA', codigo: 4, activo: true, regionId: 'r-001' },
		{ agenciaId: 'a-005', nombre: 'AGENCIA SUMPANGO', codigo: 5, activo: true, regionId: 'r-001' },
		{ agenciaId: 'a-050', nombre: 'AGENCIA SAN ANDRES ITZAPA', codigo: 50, activo: true, regionId: 'r-001' },
		{ agenciaId: 'a-051', nombre: 'AGENCIA ESCUINTLA', codigo: 51, activo: true, regionId: 'r-001' },
		{ agenciaId: 'a-052', nombre: 'AGENCIA PUERTO SAN JOSÉ', codigo: 52, activo: true, regionId: 'r-001' },
		
		{ agenciaId: 'a-006', nombre: 'AGENCIA COBÁN', codigo: 6, activo: true, regionId: 'r-002' },
		{ agenciaId: 'a-007', nombre: 'AGENCIA LA TINTA', codigo: 7, activo: true, regionId: 'r-002' },
		{ agenciaId: 'a-008', nombre: 'AGENCIA FRAY BARTOLOMÉ DE LAS CASAS', codigo: 8, activo: true, regionId: 'r-002' },
		{ agenciaId: 'a-053', nombre: 'AGENCIA CARCHÁ', codigo: 53, activo: true, regionId: 'r-002' },
		{ agenciaId: 'a-054', nombre: 'AGENCIA RABINAL', codigo: 54, activo: true, regionId: 'r-002' },
		{ agenciaId: 'a-054', nombre: 'AGENCIA CHISEC', codigo: 55, activo: true, regionId: 'r-002' },
		{ agenciaId: 'a-055', nombre: 'AGENCIA TACTIC', codigo: 56, activo: true, regionId: 'r-002' },
		{ agenciaId: 'a-057', nombre: 'AGENCIA IXCAN', codigo: 57, activo: true, regionId: 'r-002' },
		{ agenciaId: 'a-058', nombre: 'AGENCIA SAYAXCHE', codigo: 58, activo: true, regionId: 'r-002' },
		{ agenciaId: 'a-059', nombre: 'AGENCIA LA LIBERTAD PETÉN', codigo: 59, activo: true, regionId: 'r-002' },
		{ agenciaId: 'a-060', nombre: 'AGENCIA POPTUN', codigo: 60, activo: true, regionId: 'r-002' },
		{ agenciaId: 'a-061', nombre: 'AGENCIA LAS CRUCES PETÉN', codigo: 61, activo: true, regionId: 'r-002' },
		
		
		
		{ agenciaId: 'a-009', nombre: 'AGENCIA SOLOLÁ', codigo: 9, activo: true, regionId: 'r-003' },
		{ agenciaId: 'a-010', nombre: 'AGENCIA CHICHICASTENANGO', codigo: 10, activo: true, regionId: 'r-003' },
		{ agenciaId: 'a-011', nombre: 'AGENCIA SAN LUCAS TOLIMAN', codigo: 11, activo: true, regionId: 'r-003' },
		{ agenciaId: 'a-012', nombre: 'AGENCIA QUICHÉ', codigo: 12, activo: true, regionId: 'r-003' },
		{ agenciaId: 'a-013', nombre: 'AGENCIA SAN PEDRO LA LAGUNA', codigo: 13, activo: true, regionId: 'r-003' },
		{ agenciaId: 'a-014', nombre: 'AGENCIA SAN ANDRÉS SEMETABAJ', codigo: 14, activo: true, regionId: 'r-003' },
		{ agenciaId: 'a-015', nombre: 'AGENCIA QUETZALTENANGO', codigo: 15, activo: true, regionId: 'r-003' },
		{ agenciaId: 'a-016', nombre: 'AGENCIA SAN RAFAEL PIE DE LA CRUZ', codigo: 16, activo: true, regionId: 'r-003' },
		{ agenciaId: 'a-017', nombre: 'AGENCIA SAN PEDRO SACATEPEQUEZ', codigo: 17, activo: true, regionId: 'r-003' },
		{ agenciaId: 'a-062', nombre: 'AGENCIA NEBAJ', codigo: 62, activo: true, regionId: 'r-003' },
	


		{ agenciaId: 'a-018', nombre: 'AGENCIA HUEHUETENANGO', codigo: 18, activo: true, regionId: 'r-004' },
		{ agenciaId: 'a-019', nombre: 'AGENCIA LA DEMOCRACIA', codigo: 19, activo: true, regionId: 'r-004' },
		{ agenciaId: 'a-020', nombre: 'AGENCIA SAN ANTONIO HUISTA', codigo: 20, activo: true, regionId: 'r-004' },
		{ agenciaId: 'a-021', nombre: 'AGENCIA TODOS SANTOS', codigo: 21, activo: true, regionId: 'r-004' },
		{ agenciaId: 'a-022', nombre: 'AGENCIA SAN PEDRO NECTA', codigo: 22, activo: true, regionId: 'r-004' },
		{ agenciaId: 'a-063', nombre: 'AGENCIA SAN ILDEFONSO IXTAHUA', codigo: 63, activo: true, regionId: 'r-004' },
		{ agenciaId: 'a-064', nombre: 'AGENCIA LA LIBERTAD', codigo: 64, activo: true, regionId: 'r-004' },
		{ agenciaId: 'a-065', nombre: 'AGENCIA SAN UNION CANTINIL', codigo: 65, activo: true, regionId: 'r-004' },


		{ agenciaId: 'a-023', nombre: 'AGENCIA TECPÁN', codigo: 23, activo: true, regionId: 'r-005' },
		{ agenciaId: 'a-024', nombre: 'AGENCIA PATZICÍA', codigo: 24, activo: true, regionId: 'r-005' },
		{ agenciaId: 'a-025', nombre: 'AGENCIA PATZÚN', codigo: 25, activo: true, regionId: 'r-005' },
		{ agenciaId: 'a-026', nombre: 'AGENCIA COMALAPA', codigo: 26, activo: true, regionId: 'r-005' },
		{ agenciaId: 'a-027', nombre: 'AGENCIA POAQUIL', codigo: 27, activo: true, regionId: 'r-005' },



		{ agenciaId: 'a-028', nombre: 'AGENCIA CUILAPA', codigo: 28, activo: true, regionId: 'r-006' },
		{ agenciaId: 'a-029', nombre: 'AGENCIA JALAPA', codigo: 29, activo: true, regionId: 'r-006' },
		{ agenciaId: 'a-030', nombre: 'AGENCIA JUTIAPA', codigo: 30, activo: true, regionId: 'r-006' },
		{ agenciaId: 'a-031', nombre: 'AGENCIA ZONA 13', codigo: 31, activo: true, regionId: 'r-006' },
		{ agenciaId: 'a-032', nombre: 'AGENCIA CHIQUIMULILLA', codigo: 32, activo: true, regionId: 'r-006' },
		{ agenciaId: 'a-032', nombre: 'AGENCIA SAN JOSÉ PINULA', codigo: 32, activo: true, regionId: 'r-006' },




	];


	// Solo métodos para listar
	async getRegiones(): Promise<Region[]> {
		return Promise.resolve(this.regiones);
	}

	async getAgencias(): Promise<Agencia[]> {
		return Promise.resolve(this.agencias);
	}

}

