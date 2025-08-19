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

interface IParametroSend {

}

@Component({
  selector: 'app-ejecucion',
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './ejecucion.component.html',
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

  reporteIdSeleccionado = '';
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

  async buscarParametros() {
    if (!this.reporteIdSeleccionado) return;

    const resp = await this.parametroService.getParametros({ parentId: this.reporteIdSeleccionado, page: 1, limit: 100 });
    console.log("🚀 ~ ReporteService ~ createReporte ~ resp:", resp)
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
      reporteId: this.reporteIdSeleccionado,
      parametros: this.parametrosList()
    }
    console.log("🚀 ~ EjecucionComponent ~ generarReporte ~ data:", data)

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
    let data = {
      reporteId: this.reporteIdSeleccionado,
      parametros: this.parametrosList()
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




}
