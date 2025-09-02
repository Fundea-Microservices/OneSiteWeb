import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IParametro } from '../../../../interfaces/reportes/parametro';
import { ParametroService } from '../../../../services/reportes/parametro.service';
import { ReporteService } from '../../../../services/reportes/reporte.service';
import { IReporte } from '../../../../interfaces/reportes/reporte';
import { ToastrService } from 'ngx-toastr';
import { EjecutarService } from '../../../../services/reportes/ejecutar.service';
import { ExportarService } from '../../../../services/reportes/exportar.service';
import { DatePipe } from '@angular/common';

interface IParametroSend {

}

@Component({
  selector: 'app-ejecucion',
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './ejecucion.component.html',
  // styleUrls: ['./ejecucion.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class EjecucionComponent {

  fb = inject(FormBuilder);
  reporteService = inject(ReporteService);
  parametroService = inject(ParametroService);
  ejecutarService = inject(EjecutarService);
  exportarService = inject(ExportarService);

  reportesList = signal<IReporte[]>([]);
  parametrosList = signal<IParametro[]>([]);

  reporteSelected = signal<IReporte | null>(null);
  formParametros: FormGroup = this.fb.group({});

  selectReporte = signal('')
  showResults = signal(false)
  dataResultado = signal<any[]>([])


  metadata = signal({})
  pagination = signal<IPagination>({
    page: 1,
    pageSize: 10,
    totalItems: 0
  });
  isLoading = signal(false);
  hoy = signal(new Date())

  constructor(private toastr: ToastrService) { }

  ngOnInit() {
    this.cargarReportes();
  }

  async cargarReportes() {
    let resp = await this.reporteService.getReportes({ page: this.pagination().page, limit: this.pagination().pageSize });
    if (resp) {
      let { reportes, metadata } = resp.data;
      this.reportesList.set(reportes);
      this.metadata.set(metadata);
      this.pagination.set({
        page: metadata.page,
        pageSize: metadata.limit,
        totalItems: metadata.total
      });
    }
    this.isLoading.set(false);
  }

  changeReporte(idReporte: string) {
    let reporteS = this.reportesList().find(r => r.reporteId === idReporte) || null;
    this.reporteSelected.set(reporteS);
    this.parametrosList.set([]);
  }

  async buscarParametros() {
    if (!this.reporteSelected()?.reporteId) return;

    const resp = await this.parametroService.getParametros({ parentId: this.reporteSelected()?.reporteId == null ? '' : this.reporteSelected()?.reporteId, page: 1, limit: 100 });
    if (resp) {
      let parametros: IParametro[] = resp.data.parametros.map(param => {
        let valorSeleccionado: string | boolean = param.valor;

        switch (param.tipo) {
          case 'boolean':
            // Convertir string 'true'/'false' a boolean
            valorSeleccionado = param.valor?.toLowerCase() === 'true';
            break;
          case 'number':
          case 'decimal':
            // Convertir string a número si aplica
            valorSeleccionado = param.valor ? Number(param.valor).toString() : '';
            break;
          case 'date':
            valorSeleccionado = param.valor ? new Date(param.valor).toISOString().split('T')[0] : '';
            if (param.fechaActual) {
              param.valor = this.hoy().toISOString().split('T')[0];
              valorSeleccionado = this.hoy().toISOString().split('T')[0];
            }
            break;
          case 'array':
            // Para array, no seleccionamos nada
            valorSeleccionado = '0';
            break;
          default:
            // string u otros tipos
            valorSeleccionado = param.valor || '';
        }

        return { ...param, valorSeleccionado };
      });

      this.parametrosList.set(parametros);
    }
  }

  async generarReporte() {
    this.showResults.set(false);
    let data = {
      reporteId: this.reporteSelected()?.reporteId,
      parametros: this.parametrosList(),
      type: 'json',
      fileName: 'reporte.json'
    }

    // Validamos los parámetros obligatorios
    let parametrosObligatorios = this.parametrosList().filter(param => param.obligatorio);
    let hayErrores = false;
    for (let param of parametrosObligatorios) {
      if (!param.valorSeleccionado || param.valorSeleccionado === '') {
        hayErrores = true;
        this.toastr.warning(`El parámetro obligatorio ${param.nombre} no tiene un valor seleccionado.`, 'Advertencia');
        return
      }
    }

    if (hayErrores) {
      console.error("No se puede generar el reporte debido a errores en los parámetros.");
      return;
    }
    let response = await this.ejecutarService.ejecutarReporte(data);

    if (response?.success) {
      this.showResults.set(true);
      this.dataResultado.set(response.data);
    }

  }

  getColumnKeys(data: any[]): string[] {
    if (!data || data.length === 0) return [];
    return Object.keys(data[0]);
  }

  async exportarExcel() {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0'); // Los meses empiezan en 0
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');


    let data = {
      reporteId: this.reporteSelected()?.reporteId,
      parametros: this.parametrosList(),
      type: 'excel',
      fileName: this.reporteSelected()?.nombre
        ? `${this.reporteSelected()?.nombre}_${day}${month}${year}_${hours}${minutes}.xlsx`
        : `reporte_${day}${month}${year}_${hours}${minutes}.xlsx`
    }

    // Validamos los parámetros obligatorios
    let parametrosObligatorios = this.parametrosList().filter(param => param.obligatorio);
    let hayErrores = false;
    for (let param of parametrosObligatorios) {
      if (!param.valorSeleccionado || param.valorSeleccionado === '') {
        hayErrores = true;
        this.toastr.warning(`El parámetro obligatorio ${param.nombre} no tiene un valor seleccionado.`, 'Advertencia');
        return
      }
    }
    if (hayErrores) {
      console.error("No se puede generar el reporte debido a errores en los parámetros.");
      return;
    }

    let response = await this.exportarService.exportarExcel(data);

  }

  async exportarExcelPlantilla() {

    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0'); // Los meses empiezan en 0
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    let data = {
      reporteId: this.reporteSelected()?.reporteId,
      parametros: this.parametrosList(),
      type: 'excel',
      rutaPlantilla: this.reporteSelected()?.rutaPlantilla || '',
      fileName: this.reporteSelected()?.nombre
        ? `${this.reporteSelected()?.nombre}_${day}${month}${year}_${hours}${minutes}.xlsx`
        : `reporte_${day}${month}${year}_${hours}${minutes}.xlsx`
    }

    // Validamos los parámetros obligatorios
    let parametrosObligatorios = this.parametrosList().filter(param => param.obligatorio);
    let hayErrores = false;
    for (let param of parametrosObligatorios) {
      if (!param.valorSeleccionado || param.valorSeleccionado === '') {
        hayErrores = true;
        this.toastr.warning(`El parámetro obligatorio ${param.nombre} no tiene un valor seleccionado.`, 'Advertencia');
        return
      }
    }
    if (hayErrores) {
      console.error("No se puede generar el reporte debido a errores en los parámetros.");
      return;
    }

    let response = await this.exportarService.exportarExcelPlantilla(data);

  }

  async exportarPDF() {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0'); // Los meses empiezan en 0
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    let data = {
      reporteId: this.reporteSelected()?.reporteId,
      parametros: this.parametrosList(),
      type: 'PDF',
      rutaPlantilla: this.reporteSelected()?.rutaPlantilla || '',
      fileName: this.reporteSelected()?.nombre
        ? `${this.reporteSelected()?.nombre}_${day}${month}${year}_${hours}${minutes}.pdf`
        : `reporte_${day}${month}${year}_${hours}${minutes}.pdf`
    }

    // Validamos los parámetros obligatorios
    let parametrosObligatorios = this.parametrosList().filter(param => param.obligatorio);
    let hayErrores = false;
    for (let param of parametrosObligatorios) {
      if (!param.valorSeleccionado || param.valorSeleccionado === '') {
        hayErrores = true;
        this.toastr.warning(`El parámetro obligatorio ${param.nombre} no tiene un valor seleccionado.`, 'Advertencia');
        return
      }
    }
    if (hayErrores) {
      console.error("No se puede generar el reporte debido a errores en los parámetros.");
      return;
    }

    let response = await this.exportarService.exportarPDFPlantilla(data);
  }

  exportarCSV() {
    this.toastr.warning(`Exportar a CSV pendiente de implementación`, 'Advertencia');
  }

  exportarJSON() {
    this.toastr.warning(`Exportar a JSON pendiente de implementación`, 'Advertencia');
  }


}
