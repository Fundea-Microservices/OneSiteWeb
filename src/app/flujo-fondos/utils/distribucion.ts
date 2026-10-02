import { IDistribucion, IDistribucionGuardada, TipoDistribucion } from '../../../interfaces/actividad-economica';

export const TIPOS_DISTRIBUCION: TipoDistribucion[] = ['INGRESO', 'EGRESO'];
// Meses del ciclo, no del calendario: el mes 1 es el primer mes del ciclo (puede ser agosto, por ejemplo)
export const MESES = Array.from({ length: 12 }, (_, i) => i + 1);

// Formulario: 12 porcentajes por tipo, índice 0 = mes 1 del ciclo
export type DistribucionForm = Record<TipoDistribucion, number[]>;

/** Suma en centésimas para evitar errores de punto flotante: 10000 = 100 %. */
export function sumaCentesimas(porcentajes: (number | string | null)[]): number {
  return porcentajes.reduce<number>((suma, p) => suma + Math.round((Number(p) || 0) * 100), 0);
}

/** Habilita el botón Guardar: ingresos y egresos suman exactamente 100 %. */
export function distribucionCompleta(form: DistribucionForm): boolean {
  return TIPOS_DISTRIBUCION.every(tipo => sumaCentesimas(form[tipo]) === 10000);
}

/** GET /:id -> formulario */
export function aFormulario(guardada: IDistribucionGuardada[] = []): DistribucionForm {
  const fila = (tipo: TipoDistribucion) =>
    MESES.map((_, i) => Number(guardada.find(d => d.tipo === tipo && d.numero === i + 1)?.porcentaje ?? 0));
  return { INGRESO: fila('INGRESO'), EGRESO: fila('EGRESO') };
}

/** Formulario -> body de POST/PUT (solo tipo, numero y porcentaje). */
export function aPayload(form: DistribucionForm): IDistribucion[] {
  return TIPOS_DISTRIBUCION.flatMap(tipo =>
    form[tipo].map((porcentaje, i) => ({ tipo, numero: i + 1, porcentaje: Number(porcentaje) || 0 })),
  );
}

/** 100 % repartido en 12 meses sin perder centésimas (8.34 × 4 + 8.33 × 8). */
export function repartoUniforme(): number[] {
  const base = Math.floor(10000 / 12);
  const resto = 10000 - base * 12;
  return MESES.map((_, i) => (base + (i < resto ? 1 : 0)) / 100);
}
