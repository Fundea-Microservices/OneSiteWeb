import {
  ChangeDetectionStrategy,
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  inject,
  signal,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Modal } from 'bootstrap';
import { ToastrService } from 'ngx-toastr';
import { JobsService } from '../../../../services/jobs/jobs.service';
import { AuthService } from '../../../../services/auth.service';
import { CreateJobDto, IJob, IJobEjecucion, UpdateJobDto } from '../../../../interfaces/jobs/job';
import { PaginationAllComponent } from '../../../shared/components/pagination-all/pagination-all';
import { JobForm, UpsertJobComponent } from '../../components/upsert-job/upsert-job.component';
import {
  CLASE_ESTADO,
  describirProgramacion,
  destinoJob,
  estadoEjecucion,
  formatearDuracion,
  payloadParaEnviar,
  TEXTO_ESTADO,
  TEXTO_TIPO,
  tipoJob,
} from '../../components/job-formato';

type FiltroEstado = '' | 'activos' | 'inactivos';

/** Cada cuánto se consulta el resultado de una ejecución manual. */
const INTERVALO_SEGUIMIENTO_MS = 3000;
/** Pasado este tiempo se deja de consultar y se remite a la bitácora. */
const MAX_SEGUIMIENTO_MS = 10 * 60 * 1000;

/** Ejecución manual que se muestra en el modal; `ejecucion` es null mientras no se confirma. */
interface EjecucionManual {
  job: IJob;
  ejecucion: IJobEjecucion | null;
}

@Component({
  selector: 'app-jobs-page',
  imports: [RouterLink, FormsModule, PaginationAllComponent, UpsertJobComponent],
  templateUrl: './jobs-page.html',
  styleUrl: './jobs-page.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class JobsPage {
  private jobsService = inject(JobsService);
  private authService = inject(AuthService);
  private toastr = inject(ToastrService);

  /** Crear, editar, eliminar y ejecutar son exclusivos de roles con `isAdmin` (el API responde 403). */
  readonly esAdmin = computed(() => !!this.authService.user()?.rol?.isAdmin);

  readonly describirProgramacion = describirProgramacion;
  readonly destinoJob = destinoJob;
  readonly tipoJob = tipoJob;
  readonly textoTipo = TEXTO_TIPO;
  readonly formatearDuracion = formatearDuracion;
  readonly estadoEjecucion = estadoEjecucion;
  readonly textoEstado = TEXTO_ESTADO;
  readonly claseEstado = CLASE_ESTADO;

  isLoading = signal(false);
  guardando = signal(false);
  /** Id del job con un cambio de estado en curso. */
  procesando = signal<string | null>(null);

  jobList = signal<IJob[]>([]);
  pagination = signal<IPagination>({ page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
  filtros = { search: '', estado: '' as FiltroEstado };

  /** null = crear uno nuevo. */
  jobEdit = signal<IJob | null>(null);
  jobEliminar = signal<IJob | null>(null);
  formKey = signal(0);

  ejecucionManual = signal<EjecucionManual | null>(null);
  iniciandoEjecucion = signal(false);
  /** Jobs con una ejecución manual en seguimiento (su botón "Ejecutar" queda deshabilitado). */
  jobsEnEjecucion = signal<ReadonlySet<string>>(new Set());
  private modalEjecutarVisible = false;
  private destruido = false;

  @ViewChild('upsertModal') upsertModalRef!: ElementRef;
  private upsertModalInstance?: Modal;

  @ViewChild('deleteModal') deleteModalRef!: ElementRef;
  private deleteModalInstance?: Modal;

  @ViewChild('ejecutarModal') ejecutarModalRef!: ElementRef;
  private ejecutarModalInstance?: Modal;

  ngOnInit() {
    this.fetchData();
  }

  ngAfterViewInit() {
    this.upsertModalInstance = new Modal(this.upsertModalRef.nativeElement);
    this.deleteModalInstance = new Modal(this.deleteModalRef.nativeElement);
    this.ejecutarModalInstance = new Modal(this.ejecutarModalRef.nativeElement);
    this.ejecutarModalRef.nativeElement.addEventListener('hidden.bs.modal', () => {
      this.modalEjecutarVisible = false;
    });
  }

  ngOnDestroy() {
    // Corta el seguimiento de las ejecuciones manuales en curso
    this.destruido = true;
  }

  // ─── Listado ───────────────────────────────────────────────────

  async fetchData() {
    if (this.isLoading()) return;
    this.isLoading.set(true);
    try {
      const { page, pageSize } = this.pagination();
      const resp = await this.jobsService.getJobs({
        page,
        limit: pageSize,
        search: this.filtros.search.trim(),
        active: this.filtros.estado ? this.filtros.estado === 'activos' : undefined,
      });
      const m = resp?.data?.metadata;
      const limit = Number(m?.limit ?? pageSize);
      const total = Number(m?.total ?? 0);
      this.jobList.set(resp?.data?.jobs ?? []);
      this.pagination.set({
        page: Number(m?.page ?? page),
        pageSize: limit,
        totalItems: total,
        totalPages: Math.ceil(total / limit),
      });
    } finally {
      this.isLoading.set(false);
    }
  }

  buscar() {
    this.pagination.update(p => ({ ...p, page: 1 }));
    this.fetchData();
  }

  limpiarFiltros() {
    this.filtros = { search: '', estado: '' };
    this.buscar();
  }

  onChangePage(p: IPagination) {
    this.pagination.set(p);
    this.fetchData();
  }

  numeroFila(index: number): number {
    const { page, pageSize } = this.pagination();
    return index + 1 + (page - 1) * pageSize;
  }

  // ─── Activar / desactivar ──────────────────────────────────────

  async toggleActivo(item: IJob, event: Event) {
    const input = event.target as HTMLInputElement;
    const ok = await this.cambiarEstado(item, input.checked);
    // Si falló, el switch vuelve a su estado real (la lista no cambió, así que Angular no lo repinta)
    if (!ok) input.checked = item.activo;
  }

  private async cambiarEstado(item: IJob, activo: boolean): Promise<boolean> {
    this.procesando.set(item.jobId);
    try {
      const resp = await this.jobsService.updateJob(item.jobId, { activo });
      if (resp) this.jobList.update(list => list.map(j => (j.jobId === item.jobId ? resp.data : j)));
      return !!resp;
    } finally {
      this.procesando.set(null);
    }
  }

  // ─── Crear / editar ────────────────────────────────────────────

  openUpsertModal(item: IJob | null = null) {
    this.jobEdit.set(item);
    this.formKey.update(k => k + 1);
    this.upsertModalInstance?.show();
  }

  closeUpsertModal() {
    this.upsertModalInstance?.hide();
  }

  async onSaveJob(datos: JobForm) {
    const original = this.jobEdit();
    this.guardando.set(true);
    try {
      const ok = original ? await this.actualizar(original, datos) : await this.crear(datos);
      if (ok) {
        this.upsertModalInstance?.hide();
        this.fetchData();
      }
    } finally {
      this.guardando.set(false);
    }
  }

  /** Solo se envían los campos del tipo elegido (el backend responde 400 si llega uno de otro tipo). */
  private async crear(datos: JobForm): Promise<boolean> {
    const body: CreateJobDto = {
      nombre: datos.nombre,
      tipo: datos.tipo,
      hora: datos.hora,
      mes: datos.mes,
      dia: datos.dia,
      activo: datos.activo,
    };
    if (datos.descripcion) body.descripcion = datos.descripcion;
    if (datos.tipo === 'PATTERN') {
      body.pattern = datos.pattern;
      if (datos.payload) body.payload = datos.payload;
    } else {
      body.procedimiento = datos.procedimiento;
    }
    return !!(await this.jobsService.createJob(body));
  }

  /** Envía solo los campos que cambiaron: el PUT rechaza (400) cualquier propiedad de más. */
  private async actualizar(original: IJob, datos: JobForm): Promise<boolean> {
    const cambios: UpdateJobDto = {};
    if (datos.nombre !== original.nombre) cambios.nombre = datos.nombre;
    if (datos.descripcion !== (original.descripcion ?? '')) cambios.descripcion = datos.descripcion;
    if (datos.mes !== original.mes) cambios.mes = datos.mes;
    if (datos.dia !== original.dia) cambios.dia = datos.dia;
    if (datos.hora !== original.hora) cambios.hora = datos.hora;
    if (datos.activo !== original.activo) cambios.activo = datos.activo;

    if (datos.tipo !== tipoJob(original)) {
      // Cambio de tipo: se envía el tipo nuevo con su campo; el backend limpia los del anterior
      cambios.tipo = datos.tipo;
      if (datos.tipo === 'PATTERN') {
        cambios.pattern = datos.pattern;
        if (datos.payload) cambios.payload = datos.payload;
      } else {
        cambios.procedimiento = datos.procedimiento;
      }
    } else if (datos.tipo === 'PATTERN') {
      if (datos.pattern !== (original.pattern ?? '')) cambios.pattern = datos.pattern;
      // Un payload borrado se envía como null (el backend exige JSON válido si viene un string)
      if (datos.payload !== payloadCompacto(original.payload)) cambios.payload = datos.payload || null;
    } else if (datos.procedimiento !== (original.procedimiento ?? '')) {
      cambios.procedimiento = datos.procedimiento;
    }

    if (Object.keys(cambios).length === 0) return true;
    return !!(await this.jobsService.updateJob(original.jobId, cambios));
  }

  // ─── Ejecutar manualmente ──────────────────────────────────────

  openEjecutarModal(item: IJob) {
    this.ejecucionManual.set({ job: item, ejecucion: null });
    this.modalEjecutarVisible = true;
    this.ejecutarModalInstance?.show();
  }

  async confirmarEjecucion() {
    const actual = this.ejecucionManual();
    if (!actual || this.iniciandoEjecucion()) return;
    this.iniciandoEjecucion.set(true);
    try {
      const resp = await this.jobsService.ejecutarJob(actual.job.jobId);
      if (!resp) return;
      this.ejecucionManual.set({ job: actual.job, ejecucion: resp.data });
      this.seguirEjecucion(actual.job, resp.data);
    } finally {
      this.iniciandoEjecucion.set(false);
    }
  }

  /**
   * La API responde sin esperar a que el job termine: se consulta la ejecución hasta que
   * `exitoso` deje de ser null. Sigue aunque se cierre el modal y avisa con un toast al terminar.
   */
  private async seguirEjecucion(job: IJob, ejecucion: IJobEjecucion) {
    this.jobsEnEjecucion.update(set => new Set(set).add(job.jobId));
    const inicio = Date.now();
    let actual = ejecucion;
    try {
      while (actual.exitoso === null && !this.destruido) {
        if (Date.now() - inicio > MAX_SEGUIMIENTO_MS) {
          this.toastr.info('La ejecución sigue en curso; consulta el resultado en la bitácora.', job.nombre);
          return;
        }
        await esperar(INTERVALO_SEGUIMIENTO_MS);
        const resp = await this.jobsService.getEjecucionById(actual.ejecucionId);
        if (!resp || this.destruido) return;
        actual = resp.data;
        if (this.enModal(actual.ejecucionId)) this.ejecucionManual.set({ job, ejecucion: actual });
      }
      if (!this.destruido && !(this.modalEjecutarVisible && this.enModal(actual.ejecucionId))) {
        this.notificarResultado(job, actual);
      }
    } finally {
      this.jobsEnEjecucion.update(set => {
        const nuevo = new Set(set);
        nuevo.delete(job.jobId);
        return nuevo;
      });
    }
  }

  private enModal(ejecucionId: string): boolean {
    return this.ejecucionManual()?.ejecucion?.ejecucionId === ejecucionId;
  }

  private notificarResultado(job: IJob, ejecucion: IJobEjecucion) {
    if (ejecucion.exitoso) {
      this.toastr.success(`Terminó en ${formatearDuracion(ejecucion.duracionMs)}.`, `${job.nombre}: ejecución exitosa`);
    } else {
      this.toastr.error(ejecucion.mensaje || 'Revisa el detalle en la bitácora.', `${job.nombre}: error en la ejecución`);
    }
  }

  // ─── Eliminar ──────────────────────────────────────────────────

  openDeleteModal(item: IJob) {
    this.jobEliminar.set(item);
    this.deleteModalInstance?.show();
  }

  async deleteJob() {
    const item = this.jobEliminar();
    if (!item) return;
    this.guardando.set(true);
    try {
      const resp = await this.jobsService.deleteJob(item.jobId);
      if (!resp) return;
      this.deleteModalInstance?.hide();
      // Si era el único registro de la página, se regresa a la anterior
      const { page } = this.pagination();
      if (this.jobList().length === 1 && page > 1) {
        this.pagination.update(p => ({ ...p, page: page - 1 }));
      }
      this.fetchData();
    } finally {
      this.guardando.set(false);
    }
  }

  /** Alternativa a eliminar cuando solo se quiere pausar el job. */
  async desactivarEnLugarDeEliminar() {
    const item = this.jobEliminar();
    if (item && (await this.cambiarEstado(item, false))) {
      this.deleteModalInstance?.hide();
    }
  }
}

/** Payload guardado en la misma forma que lo envía el formulario, para compararlos. */
function payloadCompacto(payload: string | null | undefined): string {
  try {
    return payloadParaEnviar(payload ?? '');
  } catch {
    return payload ?? '';
  }
}

function esperar(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
