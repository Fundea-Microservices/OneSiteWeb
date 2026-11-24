import type { CellValue, Style, Workbook, Worksheet } from 'exceljs';
import { IFilaProyeccion, IFlujoDetalle, IParametroFlujo } from '../../../interfaces/flujo-fondos';
import { etiquetaFormaPago, formatoFecha, sumaMontos } from './flujo';
import { Datos, fechaHora, letra, PlantillaFlujoError, reemplazar, texto } from './reporte-excel';

/** Código de la plantilla en el módulo de Plantillas. */
export const CODIGO_PLANTILLA_FLUJO_AJUSTADO = 'FLUJOF-REPORTE-EXCEL';

/**
 * Llenado de la plantilla "Base / Flujo / Flujo (ajustado)" (docs/plantillas/plantilla-flujo-ajustado.xlsx).
 *
 * Solo se llena la hoja Base; Flujo y Flujo (ajustado) son fórmulas que suman Base por la
 * etiqueta de la columna B (SUMIFS), así que la etiqueta decide en qué fila del flujo cae cada monto.
 *
 * Convención de la hoja Base:
 * - Encabezado: textos con {{campo}}. La celda con {{fechaInicio}} recibe la fecha del mes 1 y
 *   marca la fila de meses: desde ella, las columnas de meses hasta las de "Año N"
 *   (cada año suma 12 meses del horizonte, contados desde el mes 1).
 * - Columna de claves (oculta): cada fila con clave se repite por cada dato de su fuente y
 *   recibe en C el texto del modelo con sus {{campo}}. Sin datos queda una fila en 0.
 *     ACTIVIDAD_INGRESO / ACTIVIDAD_EGRESO   una fila por línea del flujo
 *     ESTACIONAL_INGRESO / ESTACIONAL_EGRESO una fila por actividad estacional
 *     PRESTAMO_CUOTA                         una fila por préstamo en otras instituciones
 *     MONTO_CREDITO                          el monto del crédito en el mes 1
 *     PARAMETROS:COD1,COD2                   una fila por parámetro de Bantotal de esas categorías
 *     SIN_DATO                               una fila en 0, para llenar a mano
 * - Las filas sin clave (secciones, totales) se copian tal cual.
 */

const FUENTES = [
  'ACTIVIDAD_INGRESO', 'ACTIVIDAD_EGRESO', 'ESTACIONAL_INGRESO', 'ESTACIONAL_EGRESO',
  'PRESTAMO_CUOTA', 'MONTO_CREDITO', 'SIN_DATO',
] as const;
type Fuente = typeof FUENTES[number];

const PREFIJO_PARAMETROS = 'PARAMETROS:';
const MARCADOR_INICIO = /\{\{\s*fechaInicio\s*\}\}/;
const MARCADOR = /\{\{\s*\w+\s*\}\}/g;
const ENCABEZADO_ANIO = /^\s*A[ñn]o\s*\d+\s*$/i;
const MESES_POR_ANIO = 12;

/** Fila que se escribe: datos de los {{campo}} y monto de cada mes del horizonte. */
interface Linea { datos: Datos; montos: number[] }

interface CeldaModelo { valor: CellValue; estilo: Partial<Style> }
interface FilaModelo { altura?: number; clave: string | null; celdas: CeldaModelo[] }

export interface ResultadoFlujoAjustado {
  /** Datos con monto que no tienen fila en la plantilla (no se suman en el Excel). */
  omitidos: string[];
}

const esClave = (t: string) => (FUENTES as readonly string[]).includes(t) || t.startsWith(PREFIJO_PARAMETROS);

/** 'YYYY-MM...' → número de mes absoluto, para ubicar fechas en el horizonte. */
const indiceMes = (fecha: string) => {
  const [anio, mes] = fecha.split('-').map(Number);
  return anio * 12 + mes - 1;
};

const redondear = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

const formatoCantidad = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

/** Quita los {{campo}} de la fila en 0 (sin datos). */
function sinMarcadores(valor: CellValue): CellValue {
  if (typeof valor === 'string') return valor.replace(MARCADOR, '');
  if (valor && typeof valor === 'object' && 'richText' in valor) {
    return { richText: valor.richText.map(r => ({ ...r, text: r.text.replace(MARCADOR, '') })) };
  }
  return valor;
}

/** Montos de un parámetro por mes: PRIMER_MES en el mes 1, MENSUAL todos los meses, PLAN cada cuota en su mes. */
function montosParametro(p: IParametroFlujo, inicio: number, plazo: number): number[] {
  const montos = new Array<number>(plazo).fill(0);
  const monto = Number(p.monto) || 0;
  if (p.tipoIngreso === 'PRIMER_MES') {
    if (plazo) montos[0] = monto;
  } else if (p.tipoIngreso === 'MENSUAL') {
    montos.fill(monto);
  } else {
    const factor = Number(p.factor) || 0;
    for (const cuota of p.planPagos ?? []) {
      const i = indiceMes(cuota.fecha) - inicio;
      if (i >= 0 && i < plazo) montos[i] = redondear(montos[i] + Number(cuota.monto) * factor);
    }
  }
  return montos;
}

function hojaBase(wb: Workbook): Worksheet {
  const ws = wb.getWorksheet('Base') ?? wb.worksheets[0];
  if (!ws) throw new PlantillaFlujoError('La plantilla no tiene hojas.');
  return ws;
}

/**
 * Llena la hoja Base con el flujo y los parámetros de Bantotal. La proyección debe venir por
 * línea (sin agrupar) para que cada siembra tenga su fila.
 * @throws PlantillaFlujoError si la plantilla no sigue la convención.
 */
export function llenarPlantillaFlujoAjustado(
  wb: Workbook, flujo: IFlujoDetalle, parametros: IParametroFlujo[], ahora = new Date(),
): ResultadoFlujoAjustado {
  const ws = hojaBase(wb);
  const p = flujo.proyeccion;
  const plazo = p.totales.meses.length;
  const inicioIso = flujo.fechaInicio.slice(0, 10);
  const inicio = indiceMes(inicioIso);

  // ── Fila de meses y columnas ──
  let filaMeses = 0;
  let colInicio = 0;
  ws.eachRow((row, r) => row.eachCell((cell, c) => {
    if (!filaMeses && MARCADOR_INICIO.test(texto(cell.value))) { filaMeses = r; colInicio = c; }
  }));
  if (!filaMeses) throw new PlantillaFlujoError('Falta la celda {{fechaInicio}} del primer mes en la hoja Base.');

  const encabezadoDe = (c: number) => ws.getRow(filaMeses).getCell(c);
  const colsMes: number[] = [];
  let c = colInicio;
  for (; !ENCABEZADO_ANIO.test(texto(encabezadoDe(c).value)) && c < colInicio + 60; c++) {
    if (encabezadoDe(c).value === null || encabezadoDe(c).value === undefined) break;
    colsMes.push(c);
  }
  const colsAnio: number[] = [];
  for (; ENCABEZADO_ANIO.test(texto(encabezadoDe(c).value)); c++) colsAnio.push(c);
  if (!colsAnio.length) throw new PlantillaFlujoError('Faltan las columnas "Año 1", "Año 2"... después de los meses.');
  if (plazo > colsAnio.length * MESES_POR_ANIO) {
    throw new PlantillaFlujoError(`La plantilla tiene ${colsAnio.length} años y el flujo ${plazo} meses.`);
  }

  // ── Columna de claves y zona de datos ──
  let colClave = 0;
  let ultimaFila = filaMeses;
  ws.eachRow((row, r) => {
    if (r <= filaMeses) return;
    row.eachCell((cell, col) => {
      const v = cell.value;
      if (v !== null && v !== undefined && (typeof v !== 'string' || v.trim() !== '')) ultimaFila = Math.max(ultimaFila, r);
      if (esClave(texto(cell.value).trim())) {
        if (colClave && colClave !== col) throw new PlantillaFlujoError('Las claves de la hoja Base deben estar en una sola columna.');
        colClave = col;
      }
    });
  });
  if (!colClave) throw new PlantillaFlujoError('La hoja Base no tiene la columna de claves (ACTIVIDAD_INGRESO, PARAMETROS:...).');
  const ultimaCol = Math.max(colClave, colsAnio.at(-1)!);
  for (const ref of ws.model.merges ?? []) {
    const fila = Number(ref.match(/\d+/)?.[0]);
    if (fila > filaMeses) throw new PlantillaFlujoError('La hoja Base no puede tener celdas combinadas debajo de la fila de meses.');
  }

  // ── Encabezado ──
  const [anio, mes] = inicioIso.split('-').map(Number);
  const encabezado: Datos = {
    codigo: flujo.codigo,
    estado: flujo.estado,
    fechaInicio: new Date(Date.UTC(anio, mes - 1, 1)),
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
  for (let r = 1; r <= filaMeses; r++) {
    ws.getRow(r).eachCell(cell => {
      if (cell.isMerged && cell.master !== cell) return;
      cell.value = reemplazar(cell.value, encabezado);
    });
  }

  // ── Datos de cada fuente ──
  const porMes = <M extends { numeroMes: number }>(lista: M[], valor: (m: M) => number) => {
    const deMes = new Map(lista.map(m => [m.numeroMes, m]));
    return p.totales.meses.map(m => { const x = deMes.get(m.numeroMes); return x ? Number(valor(x)) || 0 : 0; });
  };
  const cicloDe = (lineaId: string | null, codigo: string) => {
    const linea = flujo.lineas.find(l => l.id && l.id === lineaId);
    if (linea) return linea.ciclo;
    const ciclos = flujo.lineas.filter(l => l.codigoActividad === codigo).map(l => Number(l.ciclo));
    return ciclos.length ? Math.max(...ciclos) : null;
  };
  const datosActividad = (f: IFilaProyeccion): Datos => ({
    nombre: f.nombre ?? f.nombreActividad,
    nombreActividad: f.nombreActividad,
    codigoActividad: f.codigoActividad,
    cantidad: formatoCantidad.format(Number(f.cantidad)),
    lineas: f.lineas,
    ciclo: cicloDe(f.lineaId, f.codigoActividad),
    fechaSiembra: formatoFecha(f.fechaSiembra),
  });

  const fuentes: Record<Fuente, Linea[]> = {
    ACTIVIDAD_INGRESO: p.filas.map(f => ({ datos: datosActividad(f), montos: porMes(f.meses, m => m.ingreso) })),
    ACTIVIDAD_EGRESO: p.filas.map(f => ({ datos: datosActividad(f), montos: porMes(f.meses, m => m.egreso) })),
    ESTACIONAL_INGRESO: p.estacionales.map(e => ({ datos: { orden: e.orden, descripcion: e.descripcion }, montos: porMes(e.meses, m => m.ingreso) })),
    ESTACIONAL_EGRESO: p.estacionales.map(e => ({ datos: { orden: e.orden, descripcion: e.descripcion }, montos: porMes(e.meses, m => m.egreso) })),
    PRESTAMO_CUOTA: p.prestamos.map(pr => ({
      datos: { orden: pr.orden, institucion: pr.institucion, formaPago: etiquetaFormaPago(pr.formaPago) },
      montos: porMes(pr.meses, m => m.cuota),
    })),
    MONTO_CREDITO: Number(flujo.montoCredito) > 0 && plazo
      ? [{ datos: {}, montos: p.totales.meses.map((_, i) => i === 0 ? Number(flujo.montoCredito) : 0) }]
      : [],
    SIN_DATO: [],
  };

  // Parámetros con algún monto en el horizonte, por código de categoría
  const parametrosDe = new Map<string, Linea[]>();
  const nombreParametro = new Map<Linea, string>();
  for (const x of [...parametros].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))) {
    const montos = montosParametro(x, inicio, plazo);
    if (!montos.some(m => m !== 0)) continue;
    const codigo = (x.categoria?.codigo ?? '').toUpperCase();
    const linea: Linea = {
      datos: { nombre: x.nombre || x.clave, clave: x.clave, categoria: x.categoria?.nombre ?? 'Sin categoría' },
      montos,
    };
    nombreParametro.set(linea, `${x.nombre || x.clave} (${x.categoria?.nombre ?? 'sin categoría'})`);
    parametrosDe.set(codigo, [...(parametrosDe.get(codigo) ?? []), linea]);
  }

  const usadas = new Set<string>();
  const lineasDe = (clave: string): Linea[] => {
    if (!clave.startsWith(PREFIJO_PARAMETROS)) { usadas.add(clave); return fuentes[clave as Fuente]; }
    const codigos = clave.slice(PREFIJO_PARAMETROS.length).split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
    codigos.forEach(cod => usadas.add(`${PREFIJO_PARAMETROS}${cod}`));
    return codigos.flatMap(cod => parametrosDe.get(cod) ?? []);
  };

  // ── Copia de las filas modelo ──
  const modelos: FilaModelo[] = [];
  for (let r = filaMeses + 1; r <= ultimaFila; r++) {
    const row = ws.getRow(r);
    const celdas: CeldaModelo[] = [];
    for (let col = 1; col <= ultimaCol; col++) {
      const cell = row.getCell(col);
      celdas[col] = { valor: structuredClone(cell.value), estilo: structuredClone(cell.style ?? {}) };
    }
    const clave = texto(row.getCell(colClave).value).trim();
    modelos.push({ altura: row.height, clave: esClave(clave) ? clave : null, celdas });
  }
  for (let r = filaMeses + 1; r <= ultimaFila; r++) {
    const row = ws.getRow(r);
    for (let col = 1; col <= ultimaCol; col++) {
      const cell = row.getCell(col);
      cell.value = null;
      cell.style = {};
    }
    (row as { height?: number }).height = undefined;
  }

  // ── Escritura ──
  let r = filaMeses + 1;
  const primerMes = letra(colsMes[0]);
  const ultimoMes = letra(colsMes.at(-1)!);

  const escribir = (modelo: FilaModelo, linea: Linea | null) => {
    const row = ws.getRow(r);
    if (modelo.altura) row.height = modelo.altura;
    for (let col = 1; col <= ultimaCol; col++) {
      const celda = modelo.celdas[col];
      const cell = row.getCell(col);
      cell.style = structuredClone(celda?.estilo ?? {});
      const valor = structuredClone(celda?.valor ?? null);
      cell.value = !modelo.clave ? reemplazar(valor, encabezado)
        : linea ? reemplazar(valor, { ...encabezado, ...linea.datos })
          : sinMarcadores(valor);
    }
    if (modelo.clave) {
      const montos = linea?.montos ?? [];
      colsMes.forEach((col, j) => { row.getCell(col).value = redondear(Number(montos[j] ?? 0)); });
      colsAnio.forEach((col, k) => {
        const delAnio = montos.slice(k * MESES_POR_ANIO, (k + 1) * MESES_POR_ANIO);
        const total = sumaMontos(delAnio.map(Number));
        // El año que cae entero en las columnas de meses se deja como fórmula
        const enColumnas = k === 0 && colsMes.length === MESES_POR_ANIO;
        row.getCell(col).value = enColumnas ? { formula: `SUM(${primerMes}${r}:${ultimoMes}${r})`, result: total } : total;
      });
    }
    r++;
  };

  for (const modelo of modelos) {
    if (!modelo.clave) { escribir(modelo, null); continue; }
    const lineas = lineasDe(modelo.clave);
    if (!lineas.length) { escribir(modelo, null); continue; }
    for (const linea of lineas) escribir(modelo, linea);
  }

  // ── Lo que no tiene fila en la plantilla ──
  const omitidos: string[] = [];
  const nombresFuente: Partial<Record<Fuente, string>> = {
    ESTACIONAL_INGRESO: 'Ingresos de actividades estacionales',
    ESTACIONAL_EGRESO: 'Egresos de actividades estacionales',
    PRESTAMO_CUOTA: 'Cuotas de préstamos en otras instituciones',
    MONTO_CREDITO: 'Monto del crédito',
  };
  for (const [fuente, nombre] of Object.entries(nombresFuente) as [Fuente, string][]) {
    if (!usadas.has(fuente) && fuentes[fuente].some(l => l.montos.some(m => m !== 0))) omitidos.push(nombre);
  }
  for (const fuente of ['ACTIVIDAD_INGRESO', 'ACTIVIDAD_EGRESO'] as const) {
    if (!usadas.has(fuente) && p.filas.length) omitidos.push(fuente === 'ACTIVIDAD_INGRESO' ? 'Ingresos de actividades' : 'Costos de actividades');
  }
  for (const [codigo, lineas] of parametrosDe) {
    if (!usadas.has(`${PREFIJO_PARAMETROS}${codigo}`)) omitidos.push(...lineas.map(l => nombreParametro.get(l)!));
  }

  // exceljs escribe <pageSetUpPr> antes de <outlinePr> (ver llenarPlantillaFlujo)
  for (const hoja of wb.worksheets) {
    if (hoja.pageSetup.fitToPage) delete (hoja.properties as { outlineProperties?: unknown }).outlineProperties;
  }
  wb.calcProperties = { ...wb.calcProperties, fullCalcOnLoad: true };
  return { omitidos };
}
