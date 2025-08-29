import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ProcedimientoService } from '../../../../services/procedimientos/procedimiento.service';
import { ParametroSPService } from '../../../../services/procedimientos/parametro.service';
import { EjecutarSPService } from '../../../../services/procedimientos/ejecutar.service';
import { IProcedimiento } from '../../../../interfaces/procedimientos/procedimiento';
import { IParametro } from '../../../../interfaces/reportes/parametro';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-ejecutar-procedimiento',
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './ejecutar-procedimiento.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class EjecutarProcedimientoComponent {

  fb = inject(FormBuilder);
  procedimientoService = inject(ProcedimientoService);
  parametroService = inject(ParametroSPService);
  ejecutarService = inject(EjecutarSPService);

  procedimientosList = signal<IProcedimiento[]>([]);
  parametrosList = signal<IParametro[]>([]);

  procedimientoSelected = signal<IProcedimiento | null>(null);
  formParametros: FormGroup = this.fb.group({});

  selectProcedimiento = signal('')
  parametrosBuscados = signal(false)

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
    let resp = await this.procedimientoService.getProcedimientos({ page: this.pagination().page, limit: this.pagination().pageSize });
    if (resp) {
      let { procedimientos, metadata } = resp.data;
      this.procedimientosList.set(procedimientos);
      this.metadata.set(metadata);
      this.pagination.set({
        page: metadata.page,
        pageSize: metadata.limit,
        totalItems: metadata.total
      });
    }
    this.isLoading.set(false);
  }

  changeProcedimiento(idProcedimiento: string) {
    let procedimientoS = this.procedimientosList().find(r => r.procedimientoId === idProcedimiento) || null;
    this.procedimientoSelected.set(procedimientoS);
    this.parametrosList.set([]);
  }

  async buscarParametros() {
    if (!this.procedimientoSelected()?.procedimientoId) return;
    this.parametrosBuscados.set(false);
    const resp = await this.parametroService.getParametros({ parentId: this.procedimientoSelected()?.procedimientoId == null ? '' : this.procedimientoSelected()?.procedimientoId, page: 1, limit: 100 });
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
      this.parametrosBuscados.set(true);
    }
  }

  async generarReporte() {
    let data = {
      procedimientoId: this.procedimientoSelected()?.procedimientoId,
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
    let response = await this.ejecutarService.ejecutarProcedimiento(data);


  }

  getColumnKeys(data: any[]): string[] {
    if (!data || data.length === 0) return [];
    return Object.keys(data[0]);
  }


}
