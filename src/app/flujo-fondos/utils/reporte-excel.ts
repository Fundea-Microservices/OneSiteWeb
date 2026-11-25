import type { CellRichTextValue, CellValue, Style, Workbook } from 'exceljs';
import { IFlujoDetalle } from '../../../interfaces/flujo-fondos';
import { etiquetaFormaPago, formatoFecha, formatoPeriodo, sumarMeses } from './flujo';

/** Código de la plantilla en el módulo de Plantillas. */
export const CODIGO_PLANTILLA_FLUJO_EXCEL = 'FLUJOF-REPORTE-EXCEL-V2';

/**
 * Llenado de la plantilla Excel del flujo de fondos ("Descargar Excel").
 *
 * Convención de la plantilla (docs/plantillas/plantilla-flujo-fondos.xlsx):
 * - Encabezado: textos con {{campo}}. Si la celda es solo un marcador y el dato es número,
 *   se escribe como número para que conserve el formato de la celda (montoCredito).
 * - Matriz: una columna oculta marca el tipo de cada fila (ENCABEZADO_PERIODO, ACTIVIDAD_INGRESO,
 *   TOTAL_NETO...). Las filas modelo dan el estilo, la altura y las celdas combinadas de cada
 *   tipo; aquí se repiten por cada actividad, estacional y préstamo.
 * - Meses: las columnas con {{periodo}} en el encabezado. La columna siguiente es el Total.
 *
 * Los totales se escriben como fórmulas (SUMIFS sobre la columna de tipo) junto con el
 * resultado que calculó el back, por si el visor no recalcula.
 */

const TIPOS_CUERPO = [
  'ACTIVIDAD_INGRESO', 'ACTIVIDAD_EGRESO',
  'SECCION_ESTACIONALES', 'ESTACIONAL_INGRESO', 'ESTACIONAL_EGRESO',
  'SECCION_PRESTAMOS', 'PRESTAMO_CUOTA',
] as const;

const TIPOS_TOTAL = [
  'TOTAL_INGRESO', 'TOTAL_EGRESO', 'TOTAL_INGRESO_ESTACIONAL', 'TOTAL_EGRESO_ESTACIONAL',
  'TOTAL_PAGO_PRESTAMOS', 'TOTAL_NETO', 'TOTAL_ACUMULADO',
] as const;

const TIPOS_ENCABEZADO = ['ENCABEZADO_PERIODO', 'ENCABEZADO_MES'] as const;

type TipoCuerpo = typeof TIPOS_CUERPO[number];
type TipoTotal = typeof TIPOS_TOTAL[number];
type TipoFila = TipoCuerpo | TipoTotal | typeof TIPOS_ENCABEZADO[number];

const TODOS_LOS_TIPOS: readonly string[] = [...TIPOS_ENCABEZADO, ...TIPOS_CUERPO, ...TIPOS_TOTAL];

type CampoTotal = 'ingreso' | 'egreso' | 'ingresoEstacional' | 'egresoEstacional' | 'pagoPrestamos';

/** Fila de totales → filas del cuerpo que suma y campo de totales.meses del back. */
const SUMA_TOTAL: Record<Exclude<TipoTotal, 'TOTAL_NETO' | 'TOTAL_ACUMULADO'>, { criterio: TipoCuerpo; campo: CampoTotal }> = {
  TOTAL_INGRESO: { criterio: 'ACTIVIDAD_INGRESO', campo: 'ingreso' },
  TOTAL_EGRESO: { criterio: 'ACTIVIDAD_EGRESO', campo: 'egreso' },
  TOTAL_INGRESO_ESTACIONAL: { criterio: 'ESTACIONAL_INGRESO', campo: 'ingresoEstacional' },
  TOTAL_EGRESO_ESTACIONAL: { criterio: 'ESTACIONAL_EGRESO', campo: 'egresoEstacional' },
  TOTAL_PAGO_PRESTAMOS: { criterio: 'PRESTAMO_CUOTA', campo: 'pagoPrestamos' },
};

const MARCADOR = /\{\{\s*(\w+)\s*\}\}/g;
const MARCADOR_UNICO = /^\s*\{\{\s*(\w+)\s*\}\}\s*$/;
const MARCADOR_PERIODO = /\{\{\s*periodo\s*\}\}/;
const SIN_DATO = '—';

/** La plantilla no sigue la convención: el mensaje se muestra tal cual al usuario. */
export class PlantillaFlujoError extends Error {}

/** Valores de los {{campo}}. Un Date solo se escribe como fecha si la celda es solo el marcador. */
export type Datos = Record<string, string | number | Date | null | undefined>;

interface CeldaModelo { valor: CellValue; estilo: Partial<Style> }
interface FilaModelo { altura?: number; celdas: CeldaModelo[] } // celdas[c] = columna c (desde 1)
/** Celda combinada, relativa a la fila donde se escribe el modelo. */
interface Combinacion { fila: number; col: number; filas: number; cols: number }

// ── Utilidades ──────────────────────────────────────────────────────────────

export function letra(col: number): string {
  let s = '';
  for (let n = col; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

function numeroColumna(letras: string): number {
  return [...letras].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);
}

/** 'A14:AA15' → { top: 14, left: 1, bottom: 15, right: 27 } */
function rango(ref: string) {
  const m = ref.replace(/\$/g, '').match(/^([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?$/);
  if (!m) return null;
  const [, c1, f1, c2 = c1, f2 = f1] = m;
  return { top: Number(f1), left: numeroColumna(c1), bottom: Number(f2), right: numeroColumna(c2) };
}

export function texto(valor: CellValue): string {
  if (typeof valor === 'string') return valor;
  if (valor && typeof valor === 'object' && 'richText' in valor) return valor.richText.map(r => r.text).join('');
  return '';
}

function reemplazarTexto(t: string, datos: Datos): string {
  return t.replace(MARCADOR, (original, clave: string) => {
    if (!(clave in datos)) return original; // marcador desconocido: se deja para que se note
    const v = datos[clave];
    if (v instanceof Date) return formatoFecha(v.toISOString());
    return v === null || v === undefined || v === '' ? SIN_DATO : String(v);
  });
}

/** Reemplaza los {{campo}} en un texto simple o enriquecido; los demás valores no cambian. */
export function reemplazar(valor: CellValue, datos: Datos): CellValue {
  if (typeof valor === 'string') {
    const unico = valor.match(MARCADOR_UNICO);
    const dato = unico ? datos[unico[1]] : undefined;
    if (typeof dato === 'number' || dato instanceof Date) return dato;
    return reemplazarTexto(valor, datos);
  }
  if (valor && typeof valor === 'object' && 'richText' in valor) {
    return { richText: (valor as CellRichTextValue).richText.map(r => ({ ...r, text: reemplazarTexto(r.text, datos) })) };
  }
  return valor;
}

const formatoCantidad = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

export function fechaHora(d: Date): string {
  const dos = (n: number) => String(n).padStart(2, '0');
  return `${dos(d.getDate())}/${dos(d.getMonth() + 1)}/${d.getFullYear()} ${dos(d.getHours())}:${dos(d.getMinutes())}`;
}

// ── Llenado ─────────────────────────────────────────────────────────────────

/**
 * Llena la primera hoja del libro (la plantilla ya cargada) con el flujo. La proyección debe
 * venir agrupada por actividad.
 * @throws PlantillaFlujoError si la plantilla no tiene las filas o columnas de la convención.
 */
export function llenarPlantillaFlujo(wb: Workbook, flujo: IFlujoDetalle, ahora = new Date()): void {
  const ws = wb.worksheets[0];
  if (!ws) throw new PlantillaFlujoError('La plantilla no tiene hojas.');

  const p = flujo.proyeccion;
  const t = p.totales;
  const plazo = t.meses.length;

  // ── Filas modelo (por la columna de tipo) ──
  const filaDe = new Map<TipoFila, number>();
  let colTipo = 0;
  ws.eachRow((row, r) => row.eachCell((cell, c) => {
    const valor = typeof cell.value === 'string' ? cell.value.trim() : '';
    if (TODOS_LOS_TIPOS.includes(valor) && !filaDe.has(valor as TipoFila)) {
      filaDe.set(valor as TipoFila, r);
      colTipo = Math.max(colTipo, c);
    }
  }));
  const faltan = TODOS_LOS_TIPOS.filter(tipo => !filaDe.has(tipo as TipoFila));
  if (faltan.length) {
    throw new PlantillaFlujoError(`A la plantilla le faltan las filas modelo: ${faltan.join(', ')}.`);
  }
  const fila = (tipo: TipoFila) => filaDe.get(tipo)!;

  // ── Columnas de meses ──
  const colsMes: number[] = [];
  ws.getRow(fila('ENCABEZADO_PERIODO')).eachCell((cell, c) => {
    if (MARCADOR_PERIODO.test(texto(cell.value))) colsMes.push(c);
  });
  colsMes.sort((a, b) => a - b);
  if (!colsMes.length || colsMes.some((c, i) => c !== colsMes[0] + i)) {
    throw new PlantillaFlujoError('La plantilla debe tener las columnas de meses seguidas, con {{periodo}} en el encabezado.');
  }
  if (plazo > colsMes.length) {
    throw new PlantillaFlujoError(`La plantilla tiene ${colsMes.length} meses y el flujo ${plazo}.`);
  }
  const colTotal = colsMes.at(-1)! + 1;
  const primerMes = letra(colsMes[0]);
  const ultimoMes = letra(colsMes[plazo - 1]);
  const ultimaCol = Math.max(colTipo, colTotal);

  // ── Encabezado ──
  const inicio = flujo.fechaInicio.slice(0, 10);
  const encabezado: Datos = {
    codigo: flujo.codigo,
    estado: flujo.estado,
    horizonte: `${formatoPeriodo(inicio)} – ${formatoPeriodo(sumarMeses(inicio, flujo.plazoMeses - 1))}`,
    plazoMeses: flujo.plazoMeses,
    fechaGeneracion: fechaHora(ahora),
    nombreCliente: flujo.nombreCliente,
    documento: flujo.documento,
    numeroSolicitud: flujo.numeroSolicitud,
    fechaSolicitud: formatoFecha(flujo.fechaSolicitud),
    numeroOperacion: flujo.numeroOperacion,
    cuenta: flujo.cuenta,
    evaluacion: flujo.evaluacion,
    clasificacion: flujo.clasificacion,
    fechaEvaluacion: formatoFecha(flujo.fechaEvaluacion),
    montoCredito: Number(flujo.montoCredito),
    agencia: flujo.agencia,
    region: flujo.region,
  };
  for (let r = 1; r < fila('ENCABEZADO_PERIODO'); r++) {
    ws.getRow(r).eachCell(cell => {
      if (cell.isMerged && cell.master !== cell) return; // el valor es el de la celda principal
      cell.value = reemplazar(cell.value, encabezado);
    });
  }

  // Encabezado de la matriz: periodo y número de mes. Los meses fuera del plazo se ocultan
  for (const tipo of TIPOS_ENCABEZADO) {
    const row = ws.getRow(fila(tipo));
    colsMes.forEach((c, j) => {
      const mes = t.meses[j];
      const cell = row.getCell(c);
      cell.value = mes ? reemplazar(cell.value, { periodo: formatoPeriodo(mes.periodo), n: mes.numeroMes }) : null;
    });
  }
  colsMes.forEach((c, j) => { if (j >= plazo) ws.getColumn(c).hidden = true; });

  // ── Copia de las filas modelo y de lo que hay debajo de los totales ──
  const inicioCuerpo = Math.min(...[...TIPOS_CUERPO, ...TIPOS_TOTAL].map(fila));
  const finTotales = Math.max(...TIPOS_TOTAL.map(fila));
  const ultimaFila = Math.max(ws.rowCount, finTotales);

  const copiar = (r: number): FilaModelo => {
    const row = ws.getRow(r);
    const celdas: CeldaModelo[] = [];
    for (let c = 1; c <= ultimaCol; c++) {
      const cell = row.getCell(c);
      const esEsclava = cell.isMerged && cell.master !== cell;
      celdas[c] = { valor: esEsclava ? null : structuredClone(cell.value), estilo: structuredClone(cell.style ?? {}) };
    }
    return { altura: row.height, celdas };
  };
  const modelos = new Map<TipoFila, FilaModelo>();
  for (const tipo of [...TIPOS_CUERPO, ...TIPOS_TOTAL]) modelos.set(tipo, copiar(fila(tipo)));
  const pie: FilaModelo[] = [];
  for (let r = finTotales + 1; r <= ultimaFila; r++) pie.push(copiar(r));

  // Celdas combinadas de la zona: por tipo de fila (las del modelo) o relativas al pie
  const combinacionesDe = new Map<TipoFila, Combinacion[]>();
  const combinacionesPie: Combinacion[] = [];
  const tipoEnFila = new Map([...filaDe].map(([tipo, r]) => [r, tipo]));
  for (const ref of ws.model.merges ?? []) {
    const m = rango(ref);
    if (!m || m.top < inicioCuerpo) continue;
    ws.unMergeCells(ref);
    const comb = { fila: 0, col: m.left, filas: m.bottom - m.top + 1, cols: m.right - m.left + 1 };
    const tipo = tipoEnFila.get(m.top);
    if (m.top > finTotales) {
      combinacionesPie.push({ ...comb, fila: m.top - finTotales - 1 });
    } else if (tipo) {
      combinacionesDe.set(tipo, [...(combinacionesDe.get(tipo) ?? []), comb]);
    }
  }
  // Se vacía la zona a mano: spliceRows de exceljs deja las últimas filas cuando quedan al final
  for (let fv = inicioCuerpo; fv <= ultimaFila; fv++) {
    const row = ws.getRow(fv);
    for (let c = 1; c <= ultimaCol; c++) {
      const cell = row.getCell(c);
      cell.value = null;
      cell.style = {};
    }
    (row as { height?: number }).height = undefined;
  }

  // ── Escritura ──
  let r = inicioCuerpo;

  // Las combinaciones se aplican al final: escribir en una celda esclava cambia la principal
  const pendientes: [number, number, number, number][] = [];
  const combinar = (filaInicio: number, lista: Combinacion[] = []) => {
    for (const c of lista) {
      if (c.filas === 1 && c.cols === 1) continue;
      pendientes.push([filaInicio + c.fila, c.col, filaInicio + c.fila + c.filas - 1, c.col + c.cols - 1]);
    }
  };

  /** Escribe la fila modelo en la fila `r` con sus marcadores reemplazados. */
  const escribir = (modelo: FilaModelo, datos: Datos = {}) => {
    const row = ws.getRow(r);
    if (modelo.altura) row.height = modelo.altura;
    for (let c = 1; c <= ultimaCol; c++) {
      const celda = modelo.celdas[c];
      const cell = row.getCell(c);
      cell.style = structuredClone(celda?.estilo ?? {});
      cell.value = celda ? reemplazar(structuredClone(celda.valor), datos) : null;
    }
    return row;
  };

  let filasCuerpo = 0;

  /** Fila del cuerpo: modelo + monto de cada mes + total de la fila. */
  const filaMontos = (tipo: TipoCuerpo, datos: Datos, montos: number[], total: number) => {
    const row = escribir(modelos.get(tipo)!, datos);
    colsMes.forEach((c, j) => { row.getCell(c).value = j < plazo ? Number(montos[j] ?? 0) : null; });
    row.getCell(colTotal).value = { formula: `SUM(${primerMes}${r}:${ultimoMes}${r})`, result: Number(total) };
    combinar(r, combinacionesDe.get(tipo));
    filasCuerpo++;
    r++;
  };

  const seccion = (tipo: 'SECCION_ESTACIONALES' | 'SECCION_PRESTAMOS', titulo?: string) => {
    const row = escribir(modelos.get(tipo)!);
    if (titulo) {
      row.getCell(1).value = titulo;
      row.getCell(colTipo).value = null;
    }
    combinar(r, combinacionesDe.get(tipo));
    r++;
  };

  /** Montos alineados con las columnas: el mes que no venga va en 0. */
  const porMes = <M extends { numeroMes: number }>(lista: M[], valor: (m: M) => number) => {
    const deMes = new Map(lista.map(m => [m.numeroMes, m]));
    return t.meses.map(m => { const x = deMes.get(m.numeroMes); return x ? valor(x) : 0; });
  };

  for (const f of p.filas) {
    const datos: Datos = {
      nombreActividad: f.nombreActividad,
      codigoActividad: f.codigoActividad,
      lineas: `${f.lineas} ${f.lineas === 1 ? 'actividad' : 'actividades'}`,
      cantidad: formatoCantidad.format(Number(f.cantidad)),
    };
    filaMontos('ACTIVIDAD_INGRESO', datos, porMes(f.meses, m => m.ingreso), f.totalIngreso);
    filaMontos('ACTIVIDAD_EGRESO', datos, porMes(f.meses, m => m.egreso), f.totalEgreso);
  }

  if (p.estacionales.length) {
    seccion('SECCION_ESTACIONALES');
    for (const e of p.estacionales) {
      const datos: Datos = { orden: e.orden, descripcion: e.descripcion };
      filaMontos('ESTACIONAL_INGRESO', datos, porMes(e.meses, m => m.ingreso), e.totalIngreso);
      filaMontos('ESTACIONAL_EGRESO', datos, porMes(e.meses, m => m.egreso), e.totalEgreso);
    }
  }

  if (p.prestamos.length) {
    seccion('SECCION_PRESTAMOS');
    for (const pr of p.prestamos) {
      const datos: Datos = { orden: pr.orden, institucion: pr.institucion, formaPago: etiquetaFormaPago(pr.formaPago) };
      filaMontos('PRESTAMO_CUOTA', datos, porMes(pr.meses, m => m.cuota), pr.totalCuota);
    }
  }

  // Sin ninguna fila, los SUMIFS de los totales necesitan un rango: va una fila de aviso
  if (!filasCuerpo && r === inicioCuerpo) seccion('SECCION_ESTACIONALES', 'Sin actividades');

  // ── Totales (en el orden de la plantilla) ──
  const ini = inicioCuerpo;
  const fin = r - 1;
  const rangoTipos = `$${letra(colTipo)}$${ini}:$${letra(colTipo)}$${fin}`;
  const ordenTotales = [...TIPOS_TOTAL].sort((a, b) => fila(a) - fila(b));
  const inicioTotales = r;
  const filaTotal = new Map(ordenTotales.map((tipo, k) => [tipo, inicioTotales + k]));
  const ft = (tipo: TipoTotal) => filaTotal.get(tipo)!;
  const totalDeFila: Record<TipoTotal, number> = {
    TOTAL_INGRESO: t.totalIngreso,
    TOTAL_EGRESO: t.totalEgreso,
    TOTAL_INGRESO_ESTACIONAL: t.totalIngresoEstacional,
    TOTAL_EGRESO_ESTACIONAL: t.totalEgresoEstacional,
    TOTAL_PAGO_PRESTAMOS: t.totalPagoPrestamos,
    TOTAL_NETO: t.neto,
    TOTAL_ACUMULADO: t.meses.at(-1)?.acumulado ?? 0,
  };

  for (const tipo of ordenTotales) {
    r = ft(tipo);
    const row = escribir(modelos.get(tipo)!, encabezado);
    colsMes.forEach((c, j) => {
      const cell = row.getCell(c);
      if (j >= plazo) { cell.value = null; return; }
      const L = letra(c);
      const mes = t.meses[j];
      let formula: string;
      let result: number;
      if (tipo === 'TOTAL_NETO') {
        formula = `${L}${ft('TOTAL_INGRESO')}-${L}${ft('TOTAL_EGRESO')}+${L}${ft('TOTAL_INGRESO_ESTACIONAL')}`
          + `-${L}${ft('TOTAL_EGRESO_ESTACIONAL')}-${L}${ft('TOTAL_PAGO_PRESTAMOS')}`;
        result = mes.neto;
      } else if (tipo === 'TOTAL_ACUMULADO') {
        formula = j === 0 ? `${L}${ft('TOTAL_NETO')}` : `${letra(c - 1)}${r}+${L}${ft('TOTAL_NETO')}`;
        result = mes.acumulado;
      } else {
        const { criterio, campo } = SUMA_TOTAL[tipo];
        formula = `SUMIFS(${L}$${ini}:${L}$${fin},${rangoTipos},"${criterio}")`;
        result = mes[campo];
      }
      cell.value = { formula, result: Number(result) };
    });
    row.getCell(colTotal).value = {
      formula: tipo === 'TOTAL_ACUMULADO' ? `${ultimoMes}${r}` : `SUM(${primerMes}${r}:${ultimoMes}${r})`,
      result: Number(totalDeFila[tipo]),
    };
  }
  for (const tipo of ordenTotales) combinar(ft(tipo), combinacionesDe.get(tipo));

  // ── Pie (nota debajo de los totales) ──
  r = inicioTotales + ordenTotales.length;
  const inicioPie = r;
  for (const modelo of pie) { escribir(modelo, encabezado); r++; }
  combinar(inicioPie, combinacionesPie);

  for (const [arriba, izquierda, abajo, derecha] of pendientes) ws.mergeCells(arriba, izquierda, abajo, derecha);

  // ── Impresión y cálculo ──
  ws.pageSetup.printArea = `A1:${letra(colTotal)}${r - 1}`;
  // exceljs escribe <pageSetUpPr> antes de <outlinePr> dentro de <sheetPr> (el esquema pide al revés):
  // con "Ajustar a página" activo, Excel declara la hoja dañada y la deja vacía. Los valores de
  // esquema de la plantilla son los de Excel por defecto, así que se quitan sin perder nada
  if (ws.pageSetup.fitToPage) delete (ws.properties as { outlineProperties?: unknown }).outlineProperties;
  wb.calcProperties = { ...wb.calcProperties, fullCalcOnLoad: true };
}

/** Nombre del archivo descargado, sin caracteres que Windows no admite. */
export function nombreArchivoFlujo(flujo: Pick<IFlujoDetalle, 'codigo' | 'numeroSolicitud'>): string {
  return `Flujo de fondos ${flujo.codigo} - Solicitud ${flujo.numeroSolicitud}`.replace(/[\\/:*?"<>|]+/g, '');
}
