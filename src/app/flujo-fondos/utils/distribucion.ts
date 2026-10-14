import { IDistribucion, IDistribucionGuardada, TipoDistribucion } from '../../../interfaces/actividad-economica';

export const TIPOS_DISTRIBUCION: TipoDistribucion[] = ['INGRESO', 'EGRESO'];
// Meses del ciclo, no del calendario: el mes 1 es el primer mes del ciclo (puede ser agosto, por ejemplo)
export const MESES = Array.from({ length: 12 }, (_, i) => i + 1);

/** Decimales que admite cada porcentaje (el backend valida IsNumber({ maxDecimalPlaces: 4 })). */
export const DECIMALES_PORCENTAJE = 4;

// Los porcentajes se suman como enteros en diezmilésimas para evitar errores de punto flotante
const ESCALA = 10 ** DECIMALES_PORCENTAJE;
const CIEN_POR_CIENTO = 100 * ESCALA;

// Formulario: 12 porcentajes por tipo, índice 0 = mes 1 del ciclo
export type DistribucionForm = Record<TipoDistribucion, number[]>;

/** Suma de porcentajes, sin errores de punto flotante (8.3334 + 8.3333 ... = 100). */
export function sumaPorcentajes(porcentajes: (number | string | null)[]): number {
  return porcentajes.reduce<number>((suma, p) => suma + Math.round((Number(p) || 0) * ESCALA), 0) / ESCALA;
}

/** Cuánto falta (positivo) o sobra (negativo) para llegar a 100 %. */
export function diferenciaCien(total: number): number {
  return (CIEN_POR_CIENTO - Math.round(total * ESCALA)) / ESCALA;
}

/** Habilita el botón Guardar: ingresos y egresos suman exactamente 100 %. */
export function distribucionCompleta(form: DistribucionForm): boolean {
  return TIPOS_DISTRIBUCION.every(tipo => diferenciaCien(sumaPorcentajes(form[tipo])) === 0);
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

/** 100 % repartido en 12 meses sin perder diezmilésimas (8.3334 × 4 + 8.3333 × 8). */
export function repartoUniforme(): number[] {
  const base = Math.floor(CIEN_POR_CIENTO / MESES.length);
  const resto = CIEN_POR_CIENTO - base * MESES.length;
  return MESES.map((_, i) => (base + (i < resto ? 1 : 0)) / ESCALA);
}
