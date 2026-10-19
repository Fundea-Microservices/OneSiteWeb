import { EstadoLote, ILoteDesembolso } from '../../../interfaces/aliado/desembolso';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

/** Guatemala es UTC-6 todo el año (sin horario de verano) */
const OFFSET_GUATEMALA_MS = -6 * 60 * 60 * 1000;

/** "2026-09" → "Septiembre 2026" */
export function nombrePeriodo(periodo: string | null | undefined): string {
  if (!periodo) return '';
  const [anio, mes] = periodo.split('-').map(Number);
  if (!anio || !mes) return periodo;
  return `${MESES[mes - 1]} ${anio}`;
}

/**
 * Últimos `cantidad` meses cerrados (sin el mes en curso), según la hora de Guatemala.
 * El más reciente va primero.
 */
export function mesesCerrados(cantidad = 12): { value: string; label: string }[] {
  const ahora = new Date(Date.now() + OFFSET_GUATEMALA_MS);
  let anio = ahora.getUTCFullYear();
  let mes = ahora.getUTCMonth(); // 0-11 → el mes anterior en base 1

  const meses: { value: string; label: string }[] = [];
  for (let i = 0; i < cantidad; i++) {
    if (mes === 0) {
      mes = 12;
      anio--;
    }
    const value = `${anio}-${String(mes).padStart(2, '0')}`;
    meses.push({ value, label: nombrePeriodo(value) });
    mes--;
  }
  return meses;
}

/** Clases Tailwind del badge según el estado del lote */
export function claseEstadoLote(estado: EstadoLote): string {
  switch (estado) {
    case 'SOLICITADO': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'PROCESADO': return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'APROBADO': return 'bg-green-100 text-green-800 border-green-300';
    case 'RECHAZADO': return 'bg-red-100 text-red-800 border-red-300';
    default: return 'bg-gray-100 text-gray-800 border-gray-300';
  }
}

/** Los GUID de SQL Server pueden venir en mayúsculas o minúsculas */
export function mismoUsuario(a: string | null | undefined, b: string | null | undefined): boolean {
  return !!a && !!b && a.toLowerCase() === b.toLowerCase();
}

export function puedeValidar(lote: ILoteDesembolso): boolean {
  return lote.estado === 'SOLICITADO' || lote.estado === 'PROCESADO';
}

/** Aprobar solo desde PROCESADO y por un usuario distinto al que validó */
export function puedeAprobar(lote: ILoteDesembolso, usuarioId: string): boolean {
  return lote.estado === 'PROCESADO' && !mismoUsuario(lote.usuarioIdProceso, usuarioId);
}

/** Rechazar desde SOLICITADO o PROCESADO; si está PROCESADO, por un usuario distinto al que validó */
export function puedeRechazar(lote: ILoteDesembolso, usuarioId: string): boolean {
  if (lote.estado === 'SOLICITADO') return true;
  return lote.estado === 'PROCESADO' && !mismoUsuario(lote.usuarioIdProceso, usuarioId);
}
