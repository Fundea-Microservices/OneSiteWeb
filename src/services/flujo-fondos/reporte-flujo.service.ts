import { inject, Injectable } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import type { Workbook } from 'exceljs';
import { IFlujoDetalle, IParametroFlujo } from '../../interfaces/flujo-fondos';
import { PlantillasService } from '../config/plantillas.service';
import { FlujoFondosService } from './flujo-fondos.service';
import {
  CODIGO_PLANTILLA_FLUJO_EXCEL,
  llenarPlantillaFlujo,
  nombreArchivoFlujo,
  PlantillaFlujoError,
} from '../../app/flujo-fondos/utils/reporte-excel';
import {
  CODIGO_PLANTILLA_FLUJO_AJUSTADO,
  llenarPlantillaFlujoAjustado,
} from '../../app/flujo-fondos/utils/reporte-excel-ajustado';

const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/**
 * AJUSTADO (principal): hojas Base / Flujo / Flujo (ajustado) con los parámetros de Bantotal (FLUJOF-REPORTE-EXCEL).
 * DETALLADO (secundario): matriz mensual por actividad (FLUJOF-REPORTE-EXCEL-V2).
 */
export type FormatoExcelFlujo = 'DETALLADO' | 'AJUSTADO';

/**
 * "Descargar Excel" del flujo de fondos, todo en el navegador: baja la plantilla del formato
 * del módulo de Plantillas, la llena con el flujo y descarga el resultado.
 * exceljs se carga solo al usarlo (es pesado y no hace falta en el resto de la pantalla).
 */
@Injectable({ providedIn: 'root' })
export class ReporteFlujoService {
  private plantillas = inject(PlantillasService);
  private flujoService = inject(FlujoFondosService);
  private toastr = inject(ToastrService);

  /**
   * @param parametros los de Bantotal ya cargados (solo AJUSTADO); si no vienen se consultan.
   */
  async descargarExcel(
    flujo: IFlujoDetalle, formato: FormatoExcelFlujo = 'AJUSTADO', parametros?: IParametroFlujo[] | null,
  ): Promise<boolean> {
    const ajustado = formato === 'AJUSTADO';
    const codigo = ajustado ? CODIGO_PLANTILLA_FLUJO_AJUSTADO : CODIGO_PLANTILLA_FLUJO_EXCEL;
    // DETALLADO lleva las actividades agrupadas; AJUSTADO, una fila por línea
    const agrupar = !ajustado;

    const [detalle, archivo, exceljs, params] = await Promise.all([
      flujo.proyeccion.agrupado === agrupar ? flujo : this.flujoService.getFlujoById(flujo.id, agrupar),
      this.plantillas.getArchivoPlantilla(codigo),
      import('exceljs').catch(error => { console.error(error); return null; }),
      !ajustado || parametros ? parametros ?? [] : this.flujoService.getParametros(flujo.id)
        .then(resp => 'data' in resp ? resp.data.parametros : resp.error),
    ]);
    if (!detalle) return false; // el aviso ya lo dio getFlujoById
    if (typeof params === 'string') {
      this.toastr.error(`No se pudieron obtener los parámetros de Bantotal: ${params}`, 'Error al generar Excel');
      return false;
    }
    if (!archivo) {
      this.toastr.error(
        `No se encontró la plantilla ${codigo} o está inactiva. Revísela en el módulo de Plantillas.`,
        'Error al generar Excel');
      return false;
    }
    if (!exceljs) {
      this.toastr.error('No se pudo cargar el generador de Excel. Recargue la página e intente de nuevo.', 'Error al generar Excel');
      return false;
    }

    try {
      // exceljs es CommonJS: según el empaquetado, Workbook viene en default o en el módulo
      const { Workbook: Libro } = ((exceljs as any).default ?? exceljs) as typeof import('exceljs');
      const libro: Workbook = new Libro();
      await libro.xlsx.load(await archivo.arrayBuffer());
      if (ajustado) {
        const { omitidos } = llenarPlantillaFlujoAjustado(libro, detalle, params);
        if (omitidos.length) {
          this.toastr.warning(
            `No tienen fila en la plantilla y no se sumaron: ${omitidos.join(', ')}.`,
            'Excel generado con datos omitidos', { timeOut: 15000 });
        }
      } else {
        llenarPlantillaFlujo(libro, detalle);
      }
      const buffer = await libro.xlsx.writeBuffer();
      const sufijo = ajustado ? '' : ' (detallado)';
      this.guardar(new Blob([buffer], { type: MIME_XLSX }), `${nombreArchivoFlujo(detalle)}${sufijo}.xlsx`);
      return true;
    } catch (error: any) {
      console.error('🚀 ~ ReporteFlujoService ~ descargarExcel ~ error:', error);
      this.toastr.error(
        error instanceof PlantillaFlujoError
          ? `La plantilla ${codigo} no tiene el formato esperado. ${error.message}`
          : 'No se pudo generar el Excel del flujo.',
        'Error al generar Excel');
      return false;
    }
  }

  private guardar(blob: Blob, nombre: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url));
  }
}
