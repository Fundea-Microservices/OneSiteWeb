import { CategoriaComision, EstadoLote, ILoteDesembolso } from '../../../interfaces/aliado/desembolso';

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

/** Fecha de hoy en Guatemala como "YYYY-MM-DD" */
export function hoyGuatemala(): string {
  return new Date(Date.now() + OFFSET_GUATEMALA_MS).toISOString().slice(0, 10);
}

export interface RangoFechas {
  label: string;
  desde: string; // "YYYY-MM-DD" ('' = sin límite)
  hasta: string;
}

/** Último día del mes (mes en base 1) como "YYYY-MM-DD" */
function finDeMes(anio: number, mes: number): string {
  const dia = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  return `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

function inicioDeMes(anio: number, mes: number): string {
  return `${anio}-${String(mes).padStart(2, '0')}-01`;
}

/**
 * Rangos rápidos del filtro: Todos, último mes cerrado, último trimestre cerrado y año en curso,
 * según la hora de Guatemala. Ej. en octubre 2026: Septiembre 2026 · Jul–Sep 2026 · Año 2026.
 */
export function rangosRapidos(): RangoFechas[] {
  const ahora = new Date(Date.now() + OFFSET_GUATEMALA_MS);
  const anioActual = ahora.getUTCFullYear();
  const mesActual = ahora.getUTCMonth(); // 0-11

  // Último mes cerrado (base 1)
  const anioMes = mesActual === 0 ? anioActual - 1 : anioActual;
  const mes = mesActual === 0 ? 12 : mesActual;

  // Último trimestre cerrado: mes inicial en base 1 (1, 4, 7 o 10)
  const trimestreActual = Math.floor(mesActual / 3);
  const anioTrim = trimestreActual === 0 ? anioActual - 1 : anioActual;
  const mesIniTrim = trimestreActual === 0 ? 10 : (trimestreActual - 1) * 3 + 1;
  const mesFinTrim = mesIniTrim + 2;
  const abrev = (m: number) => MESES[m - 1].slice(0, 3);

  return [
    { label: 'Todos', desde: '', hasta: '' },
    { label: nombrePeriodo(`${anioMes}-${mes}`), desde: inicioDeMes(anioMes, mes), hasta: finDeMes(anioMes, mes) },
    {
      label: `${abrev(mesIniTrim)}–${abrev(mesFinTrim)} ${anioTrim}`,
      desde: inicioDeMes(anioTrim, mesIniTrim),
      hasta: finDeMes(anioTrim, mesFinTrim),
    },
    { label: `Año ${anioActual}`, desde: `${anioActual}-01-01`, hasta: `${anioActual}-12-31` },
  ];
}

/** Clases Tailwind del badge según el estado del lote */
export function claseEstadoLote(estado: EstadoLote): string {
  switch (estado) {
    case 'SOLICITADO': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'PROCESADO': return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'APROBADO': return 'bg-green-100 text-green-800 border-green-300';
    case 'RECHAZADO': return 'bg-red-100 text-red-800 border-red-300';
    case 'PAGADO': return 'bg-purple-100 text-purple-800 border-purple-300';
    default: return 'bg-gray-100 text-gray-800 border-gray-300';
  }
}

/** Clases Tailwind del badge de la categoría de comisión */
export function claseCategoriaComision(categoria: CategoriaComision | null): string {
  switch (categoria) {
    case 'A': return 'bg-blue-100 text-blue-800';
    case 'B': return 'bg-amber-100 text-amber-800';
    case 'C': return 'bg-green-100 text-green-800';
    default: return 'bg-gray-100 text-gray-600';
  }
}

/**
 * Nombre de la agencia de una empresa en mayúsculas. Si la solicitud no guardó el nombre,
 * se busca su código en el catálogo de agencias (ver CatalogosBantotalService.mapaAgencias)
 */
export function nombreAgenciaEmpresa(
  agenciaNombre: string | null | undefined,
  agenciaId: number | null | undefined,
  agencias: Map<string, string>,
): string {
  const nombre = agenciaNombre?.trim()
    || (agenciaId !== null && agenciaId !== undefined ? agencias.get(String(agenciaId)) : undefined);
  return nombre ? nombre.toUpperCase() : '—';
}

/** Los GUID de SQL Server pueden venir en mayúsculas o minúsculas */
export function mismoUsuario(a: string | null | undefined, b: string | null | undefined): boolean {
  return !!a && !!b && a.toLowerCase() === b.toLowerCase();
}

export function puedeValidar(lote: ILoteDesembolso): boolean {
  return lote.estado === 'SOLICITADO' || lote.estado === 'PROCESADO';
}

/** Aprobar solo desde PROCESADO; cualquier usuario puede hacerlo, incluso quien generó o validó el lote */
export function puedeAprobar(lote: ILoteDesembolso): boolean {
  return lote.estado === 'PROCESADO';
}

/** Rechazar desde SOLICITADO o PROCESADO; cualquier usuario puede hacerlo */
export function puedeRechazar(lote: ILoteDesembolso): boolean {
  return lote.estado === 'SOLICITADO' || lote.estado === 'PROCESADO';
}

/** Solo un lote APROBADO puede marcarse como pagado */
export function puedePagar(lote: ILoteDesembolso): boolean {
  return lote.estado === 'APROBADO';
}
