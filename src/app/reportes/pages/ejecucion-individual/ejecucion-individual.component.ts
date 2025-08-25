import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IParametro } from '../../../../interfaces/reportes/parametro';
import { ParametroService } from '../../../../services/reportes/parametro.service';
import { ReporteService } from '../../../../services/reportes/reporte.service';
import { IReporte } from '../../../../interfaces/reportes/reporte';
import { ToastrService } from 'ngx-toastr';
import { EjecutarService } from '../../../../services/reportes/ejecutar.service';
import { ExportarService } from '../../../../services/reportes/exportar.service';

import { ActivatedRoute } from '@angular/router';



@Component({
  selector: 'app-ejecucion',
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './ejecucion-individual.component.html',
  // styleUrls: ['./ejecucion.component.css'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class EjecucionIndividualComponent {

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
  metodoSalidaSelected = signal('')
  progresoDescarga = signal<number>(0);
  intervaloProgreso: any = null;


  metadata = signal({})
  pagination = signal<IPagination>({
    page: 1,
    pageSize: 10,
    totalItems: 0
  });
  isLoading = signal(false);
  procesandoReporte = signal(false);

  constructor(private toastr: ToastrService, private route: ActivatedRoute) { }

  ngOnInit() {
    this.isLoading.set(true);
    this.route.params.subscribe(params => {
      const idReporte = params['idReporte'];
      this.cargarReporte(idReporte);
    });
  }

  async cargarReporte(idReporte: string) {
    console.log("🚀 ~ EjecucionIndividualComponent ~ cargarReporte ~ idReporte:", idReporte)
    let resp = await this.reporteService.getReporteById(idReporte);
    if (resp) {
      let reporte = resp.data;
      this.reporteSelected.set(reporte);
      await this.buscarParametros();
      console.log(reporte);
    }
    this.isLoading.set(false);
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

  getColumnKeys(data: any[]): string[] {
    if (!data || data.length === 0) return [];
    return Object.keys(data[0]);
  }

  async generarReporte() {
    this.showResults.set(false);
    let data = {
      reporteId: this.reporteSelected()?.reporteId,
      parametros: this.parametrosList(),
      type: 'TABLE',
      fileName: 'reporte.json'
    }
    if (!this.validarParametros()) return;

    let response = await this.ejecutarService.ejecutarReporte(data);

    if (response?.success) {
      this.showResults.set(true);
      this.dataResultado.set(response.data);
    }
    return

  }


  async exportarExcel() {
    let data = {
      reporteId: this.reporteSelected()?.reporteId,
      parametros: this.parametrosList(),
      type: 'excel',
      fileName: await this.getFileName()
    }
    if (!this.validarParametros()) return;

    let response = await this.exportarService.exportarExcel(data);

    return true

  }

  async exportarExcelPlantilla() {

    let data = {
      reporteId: this.reporteSelected()?.reporteId,
      parametros: this.parametrosList(),
      type: 'excel',
      rutaPlantilla: this.reporteSelected()?.rutaPlantilla || '',
      fileName: await this.getFileName()
    }
    if (!this.validarParametros()) return;

    let response = await this.exportarService.exportarExcelPlantilla(data);

  }

  async exportarPDF() {

    let data = {
      reporteId: this.reporteSelected()?.reporteId,
      parametros: this.parametrosList(),
      type: 'PDF',
      rutaPlantilla: this.reporteSelected()?.rutaPlantilla || '',
      fileName: await this.getFileName()
    }
    if (!this.validarParametros()) return;

    let response = await this.exportarService.exportarPDFPlantilla(data);
  }

  async exportarCSV() {
    let data = {
      reporteId: this.reporteSelected()?.reporteId,
      parametros: this.parametrosList(),
      type: 'csv',
      fileName: await this.getFileName()
    }

    if (!this.validarParametros()) return;

    let response = await this.exportarService.exportarCSV(data);
  }

  exportarJSON() {
    this.toastr.warning(`Exportar a JSON pendiente de implementación`, 'Advertencia');
  }

  async validarParametros(): Promise<boolean> {

    // Validamos los parámetros obligatorios
    let parametrosObligatorios = this.parametrosList().filter(param => param.obligatorio);
    let hayErrores = false;
    for (let param of parametrosObligatorios) {
      if (!param.valorSeleccionado || param.valorSeleccionado === '') {
        hayErrores = true;
        this.toastr.warning(`El parámetro obligatorio ${param.nombre} no tiene un valor seleccionado.`, 'Advertencia');
        return false
      }
    }
    if (hayErrores) {
      console.error("No se puede generar el reporte debido a errores en los parámetros.");
      return false;
    }
    return true;
  }

  async getFileName(): Promise<string> {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0'); // Los meses empiezan en 0
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    let fileName = this.reporteSelected()?.nombre
      ? `${this.reporteSelected()?.nombre}_${day}${month}${year}_${hours}${minutes}`
      : `reporte_${day}${month}${year}_${hours}${minutes}`

    return fileName;
  }

  async procesarReporte() {
    this.procesandoReporte.set(true);
    this.iniciarProgreso();

    try {
      switch (this.metodoSalidaSelected()) {
        case 'tabla':
          await this.generarReporte();
          break;
        case 'excel':
          await this.exportarExcel();
          break;
        case 'excel_plantilla':
          await this.exportarExcelPlantilla();
          break;
        case 'pdf':
          await this.exportarPDF();
          break;
        case 'csv':
          await this.exportarCSV();
          break;
        case 'json':
          this.exportarJSON();
          break;
        default:
          this.toastr.warning(`Método de salida no válido`, 'Advertencia');
      }
    } catch (error) {
      this.toastr.error('Error al procesar el reporte', 'Error');
    } finally {
      this.detenerProgreso(true); // completa al 100%
      setTimeout(() => {
        this.procesandoReporte.set(false); // oculta la barra 0.5s después
      }, 800);
    }
  }

  iniciarProgreso() {
    this.progresoDescarga.set(20);
    this.intervaloProgreso = setInterval(() => {
      const actual = this.progresoDescarga();
      if (actual < 90) {
        this.progresoDescarga.set(actual + 10);
      }
    }, 1200); // cada 1200ms sube 10%
  }

  detenerProgreso(final: boolean = false) {
    if (this.intervaloProgreso) {
      clearInterval(this.intervaloProgreso);
      this.intervaloProgreso = null;
    }
    if (final) {
      this.progresoDescarga.set(100);
    }
  }


}
