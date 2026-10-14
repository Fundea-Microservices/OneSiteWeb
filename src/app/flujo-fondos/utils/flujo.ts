import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { FORMAS_PAGO, FormaPago } from '../../../interfaces/flujo-fondos';

/** Máximo `n` decimales (el backend valida IsNumber({ maxDecimalPlaces: n })). */
export const maxDecimales = (n: number): ValidatorFn => (control: AbstractControl): ValidationErrors | null => {
  const valor = control.value;
  if (valor === null || valor === undefined || valor === '') return null;
  const escalado = Number(valor) * 10 ** n;
  return Math.abs(Math.round(escalado) - escalado) < 1e-6 ? null : { decimales: n };
};

/**
 * Tasa del periodo, solo para mostrarla mientras se escribe (el back la devuelve en
 * tasaPeriodo): tasa anual / 12 × meses del periodo. 18 % trimestral = 4.5 %.
 */
export function tasaPeriodo(tasaAnual: number | null, formaPago: FormaPago | null): number | null {
  const meses = FORMAS_PAGO.find(f => f.value === formaPago)?.meses;
  if (tasaAnual === null || isNaN(tasaAnual) || !meses) return null;
  return Math.round(tasaAnual / 12 * meses * 1e6) / 1e6;
}

export function etiquetaFormaPago(formaPago: FormaPago | null | undefined): string {
  return FORMAS_PAGO.find(f => f.value === formaPago)?.label ?? formaPago ?? '';
}

const MESES_CORTOS =['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/**
 * '2026-10-01' -> 'Oct 2026'. Se parte el texto en lugar de usar Date: new Date('2026-10-01')
 * es medianoche UTC y en Guatemala (UTC-6) se mostraría como septiembre.
 */
export function formatoPeriodo(periodo: string | null | undefined): string {
  if (!periodo) return '';
  const [anio, mes] = periodo.split('-');
  return `${MESES_CORTOS[Number(mes) - 1] ?? mes} ${anio}`;
}

/** '2026-08-10' -> '10/08/2026' */
export function formatoFecha(fecha: string | null | undefined): string {
  if (!fecha) return '';
  const [anio, mes, dia] = fecha.slice(0, 10).split('-');
  return `${dia}/${mes}/${anio}`;
}

/** Primer día del mes actual en formato YYYY-MM (valor de un <input type="month">). */
export function mesActual(): string {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
}

/** 'YYYY-MM...' -> número de mes absoluto (año × 12 + mes), para comparar meses sin usar Date. */
function indiceMes(fecha: string): number {
  const [anio, mes] = fecha.split('-').map(Number);
  return anio * 12 + (mes - 1);
}

/**
 * Mismo criterio del back: el horizonte va del mes de fechaInicio al mes
 * fechaInicio + plazoMeses − 1. Solo para la alerta mientras se captura.
 */
export function fueraDeHorizonte(fecha: string, fechaInicio: string, plazoMeses: number): boolean {
  if (!fecha || !fechaInicio || !plazoMeses) return false;
  const mes = indiceMes(fecha);
  const inicio = indiceMes(fechaInicio);
  return mes < inicio || mes > inicio + plazoMeses - 1;
}

/** '2026-01-31' + 1 mes -> '2026-02-28': si el día no existe se usa el último día del mes. */
export function sumarMeses(fecha: string, meses: number): string {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const indice = anio * 12 + (mes - 1) + meses;
  const nuevoAnio = Math.floor(indice / 12);
  const nuevoMes = (indice % 12) + 1;
  const ultimoDia = new Date(nuevoAnio, nuevoMes, 0).getDate();
  return `${nuevoAnio}-${String(nuevoMes).padStart(2, '0')}-${String(Math.min(dia, ultimoDia)).padStart(2, '0')}`;
}

/** Suma montos en centavos para no arrastrar errores de punto flotante. */
export function sumaMontos(montos: number[]): number {
  return montos.reduce((suma, m) => suma + Math.round(m * 100), 0) / 100;
}

/** Multiplica montos en centavos para no arrastrar errores de punto flotante. */
export function montoCiclo(cantidad: number, cantidadEstimada: number, unitario: number | null): number {
  if (!unitario) return 0;
  return Math.round(cantidad * 100) * Math.round(cantidadEstimada * 100) * Math.round(unitario * 100) / 1e6;
}
