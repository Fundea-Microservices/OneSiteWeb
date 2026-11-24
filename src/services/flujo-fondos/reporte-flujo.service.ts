import { inject, Injectable } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { IFlujoDetalle } from '../../interfaces/flujo-fondos';
import { PlantillasService } from '../config/plantillas.service';
import { FlujoFondosService } from './flujo-fondos.service';
import {
  CODIGO_PLANTILLA_FLUJO_EXCEL,
  llenarPlantillaFlujo,
  nombreArchivoFlujo,
  PlantillaFlujoError,
} from '../../app/flujo-fondos/utils/reporte-excel';

const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/**
 * "Descargar Excel" del flujo de fondos, todo en el navegador: baja la plantilla
 * FLUJOF-REPORTE-EXEL del módulo de Plantillas, la llena con el flujo y descarga el resultado.
 * exceljs se carga solo al usarlo (es pesado y no hace falta en el resto de la pantalla).
 */
@Injectable({ providedIn: 'root' })
export class ReporteFlujoService {
  private plantillas = inject(PlantillasService);
  private flujoService = inject(FlujoFondosService);
  private toastr = inject(ToastrService);

  async descargarExcel(flujo: IFlujoDetalle): Promise<boolean> {
    // La plantilla lleva las actividades agrupadas: si en pantalla están desagrupadas se pide de nuevo
    const [detalle, archivo, exceljs] = await Promise.all([
      flujo.proyeccion.agrupado ? flujo : this.flujoService.getFlujoById(flujo.id, true),
      this.plantillas.getArchivoPlantilla(CODIGO_PLANTILLA_FLUJO_EXCEL),
      import('exceljs').catch(error => { console.error(error); return null; }),
    ]);
    if (!detalle) return false; // el aviso ya lo dio getFlujoById
    if (!archivo) {
      this.toastr.error(
        `No se encontró la plantilla ${CODIGO_PLANTILLA_FLUJO_EXCEL} o está inactiva. Revísela en el módulo de Plantillas.`,
        'Error al generar Excel');
      return false;
    }
    if (!exceljs) {
      this.toastr.error('No se pudo cargar el generador de Excel. Recargue la página e intente de nuevo.', 'Error al generar Excel');
      return false;
    }

    try {
      // exceljs es CommonJS: según el empaquetado, Workbook viene en default o en el módulo
      const { Workbook } = ((exceljs as any).default ?? exceljs) as typeof import('exceljs');
      const libro = new Workbook();
      await libro.xlsx.load(await archivo.arrayBuffer());
      llenarPlantillaFlujo(libro, detalle);
      const buffer = await libro.xlsx.writeBuffer();
      this.guardar(new Blob([buffer], { type: MIME_XLSX }), `${nombreArchivoFlujo(detalle)}.xlsx`);
      return true;
    } catch (error: any) {
      console.error('🚀 ~ ReporteFlujoService ~ descargarExcel ~ error:', error);
      this.toastr.error(
        error instanceof PlantillaFlujoError
          ? `La plantilla ${CODIGO_PLANTILLA_FLUJO_EXCEL} no tiene el formato esperado. ${error.message}`
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
