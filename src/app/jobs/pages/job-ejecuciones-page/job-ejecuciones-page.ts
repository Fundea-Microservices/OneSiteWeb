import {
  ChangeDetectionStrategy,
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { JobsService } from '../../../../services/jobs/jobs.service';
import { IJob, IJobEjecucion } from '../../../../interfaces/jobs/job';
import { PaginationAllComponent } from '../../../shared/components/pagination-all/pagination-all';
import {
  CLASE_ESTADO,
  describirProgramacion,
  destinoJob,
  estadoEjecucion,
  formatearDuracion,
  TEXTO_ESTADO,
  TEXTO_TIPO,
  tipoJob,
} from '../../components/job-formato';

type FiltroResultado = '' | 'exito' | 'error';

/** El gateway responde 400 si el id de la URL no es un UUID. */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Component({
  selector: 'app-job-ejecuciones-page',
  imports: [RouterLink, DatePipe, FormsModule, PaginationAllComponent],
  templateUrl: './job-ejecuciones-page.html',
  styleUrl: './job-ejecuciones-page.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class JobEjecucionesPage {
  private jobsService = inject(JobsService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly describirProgramacion = describirProgramacion;
  readonly destinoJob = destinoJob;
  readonly tipoJob = tipoJob;
  readonly textoTipo = TEXTO_TIPO;
  readonly formatearDuracion = formatearDuracion;
  readonly estadoEjecucion = estadoEjecucion;
  readonly textoEstado = TEXTO_ESTADO;
  readonly claseEstado = CLASE_ESTADO;

  isLoading = signal(false);

  ejecucionList = signal<IJobEjecucion[]>([]);
  pagination = signal<IPagination>({ page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
  filtros = { jobId: '', resultado: '' as FiltroResultado };

  /** Todos los jobs, para el filtro y para resolver el nombre de cada ejecución. */
  jobs = signal<IJob[]>([]);
  private jobsPorId = computed(() => new Map(this.jobs().map(j => [j.jobId, j])));

  /** Job por el que se filtró la última búsqueda (se muestra su ficha arriba de la tabla). */
  jobIdFiltrado = signal('');
  jobFiltrado = computed(() => this.jobsPorId().get(this.jobIdFiltrado()) ?? null);

  ngOnInit() {
    const jobId = this.route.snapshot.queryParamMap.get('jobId') ?? '';
    this.filtros.jobId = UUID_REGEX.test(jobId) ? jobId : '';
    this.cargarJobs();
    this.fetchData();
  }

  async cargarJobs() {
    const resp = await this.jobsService.getJobs({ all: true });
    this.jobs.set(resp?.data?.jobs ?? []);
  }

  // ─── Listado ───────────────────────────────────────────────────

  async fetchData() {
    if (this.isLoading()) return;
    this.isLoading.set(true);
    try {
      const { page, pageSize } = this.pagination();
      const { jobId, resultado } = this.filtros;
      const resp = await this.jobsService.getEjecuciones({
        page,
        limit: pageSize,
        jobId: jobId || undefined,
        exitoso: resultado ? resultado === 'exito' : undefined,
      });
      const m = resp?.data?.metadata;
      const limit = Number(m?.limit ?? pageSize);
      const total = Number(m?.total ?? 0);
      this.ejecucionList.set(resp?.data?.ejecuciones ?? []);
      this.jobIdFiltrado.set(jobId);
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
    // El job filtrado queda en la URL para poder compartir o recargar la vista
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { jobId: this.filtros.jobId || null },
      replaceUrl: true,
    });
    this.fetchData();
  }

  limpiarFiltros() {
    this.filtros = { jobId: '', resultado: '' };
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

  /** Los jobs eliminados no vienen en el listado, por eso puede no encontrarse. */
  nombreJob(jobId: string): string {
    return this.jobsPorId().get(jobId)?.nombre ?? 'Job eliminado';
  }

  jobExiste(jobId: string): boolean {
    return this.jobsPorId().has(jobId);
  }
}
