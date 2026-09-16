import {
  AfterViewInit, ChangeDetectionStrategy, Component, computed, CUSTOM_ELEMENTS_SCHEMA,
  ElementRef, inject, OnInit, signal, ViewChild,
} from '@angular/core';
import { DatePipe, formatDate } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Modal } from 'bootstrap';
import { PaginationAllComponent } from '../../../shared/components/pagination-all/pagination-all';
import { AutocompleteComponent, AutocompleteOption } from '../../../shared/components/autocomplete/autocomplete';
import { PrecargaService } from '../../../../services/onesiteex-precarga/precarga.service';
import { EmpresaExService } from '../../../../services/onesiteex-auth/empresa-ex.service';
import { UsuarioExService } from '../../../../services/onesiteex-auth/usuario-ex.service';
import { EncuestaService } from '../../../../services/encuesta/encuesta.service';
import {
  ESTADOS_PRECARGA,
  EstadoPrecarga,
  IAnularPrecargasResultado,
  IDetallePrecargaFilters,
  IPrecargaDetalle,
  MAX_COMENTARIO_ANULACION,
  MAX_PRECARGAS_ANULAR,
  MOTIVO_NO_ANULADA_LABEL,
} from '../../../../interfaces/onesiteex-precarga/onesiteex-precarga';
import { IEmpresaEx, IUsuarioEx } from '../../../../interfaces/onesiteex-auth/onesiteex-auth';
import { IEncuesta } from '../../../../interfaces/encuesta/encuesta';

const ESTADO_BADGE: Record<EstadoPrecarga, string> = {
  CARGADO: 'text-bg-primary',
  APLICADO: 'text-bg-success',
  FINALIZADO: 'text-bg-dark',
  ANULADO: 'text-bg-secondary',
  RECHAZADO: 'text-bg-danger',
};

const fechaISO = (fecha: Date) => formatDate(fecha, 'yyyy-MM-dd', 'en-US');

@Component({
  selector: 'app-gestion-precarga-page',
  imports: [RouterLink, DatePipe, PaginationAllComponent, AutocompleteComponent],
  templateUrl: './gestion-precarga-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export default class GestionPrecargaPage implements OnInit, AfterViewInit {
  private precargaService = inject(PrecargaService);
  private empresaService = inject(EmpresaExService);
  private usuarioService = inject(UsuarioExService);
  private encuestaService = inject(EncuestaService);

  readonly estados = ESTADOS_PRECARGA;
  readonly motivoLabel = MOTIVO_NO_ANULADA_LABEL;
  readonly maxAnular = MAX_PRECARGAS_ANULAR;
  readonly maxComentario = MAX_COMENTARIO_ANULACION;
  readonly hoy = fechaISO(new Date());
  private readonly inicioMes = fechaISO(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  // ─── Catálogos para los filtros ────────────────────────────────────────────
  empresaList = signal<IEmpresaEx[]>([]);
  encuestaList = signal<IEncuesta[]>([]);
  encuestadorList = signal<IUsuarioEx[]>([]);
  catalogosLoading = signal(false);

  private empresaMap = computed(() => new Map(this.empresaList().map(e => [e.idEmpresa, e])));
  private encuestaMap = computed(() => new Map(this.encuestaList().map(e => [e.idEncuesta, e])));
  private encuestadorMap = computed(() => new Map(this.encuestadorList().map(u => [u.idUsuario, u])));

  empresaOptions = computed<AutocompleteOption[]>(() =>
    this.empresaList().map(e => ({ value: e.idEmpresa, label: e.nombreEmpresa, detalle: e.codigo ?? undefined }))
  );

  encuestaOptions = computed<AutocompleteOption[]>(() =>
    this.encuestaList()
      .filter(e => e.idEncuesta != null)
      .map(e => ({ value: e.idEncuesta!, label: e.nombre }))
  );

  /** Con una empresa elegida solo se ofrecen sus encuestadores. */
  encuestadorOptions = computed<AutocompleteOption[]>(() => {
    const idEmpresa = this.filtroEmpresa();
    return this.encuestadorList()
      .filter(u => idEmpresa === null || u.idEmpresa === idEmpresa)
      .map(u => ({
        value: u.idUsuario,
        label: u.nombreCompleto,
        detalle: u.estado ? u.username : `${u.username} · baja`,
      }));
  });

  // ─── Filtros ───────────────────────────────────────────────────────────────
  fechaInicio = signal(this.inicioMes);
  fechaFin = signal(this.hoy);
  filtroEmpresa = signal<number | null>(null);
  filtroEncuesta = signal<number | null>(null);
  filtroEncuestador = signal<number | null>(null);
  filtroEstado = signal<EstadoPrecarga | ''>('');

  errorFechas = computed(() => {
    if (!this.fechaInicio() || !this.fechaFin()) return 'La fecha inicial y la final son obligatorias';
    // Con YYYY-MM-DD la comparación de texto respeta el orden cronológico.
    if (this.fechaInicio() > this.fechaFin()) return 'La fecha inicial no puede ser posterior a la final';
    return '';
  });

  hayFiltrosActivos = computed(() =>
    this.fechaInicio() !== this.inicioMes || this.fechaFin() !== this.hoy ||
    this.filtroEmpresa() !== null || this.filtroEncuesta() !== null ||
    this.filtroEncuestador() !== null || this.filtroEstado() !== ''
  );

  /** Filtros de la última búsqueda: la paginación los reutiliza aunque se hayan editado los campos. */
  private filtrosAplicados = signal<IDetallePrecargaFilters | null>(null);

  // ─── Listado ───────────────────────────────────────────────────────────────
  precargaList = signal<IPrecargaDetalle[]>([]);
  isLoading = signal(false);
  pagination = signal<IPagination>({ page: 1, pageSize: 10, totalItems: 0 });

  // ─── Selección (solo la página actual) ─────────────────────────────────────
  seleccionados = signal<ReadonlySet<string>>(new Set());

  /** Solo se pueden anular las que siguen en CARGADO. */
  seleccionables = computed(() => this.precargaList().filter(p => this.esSeleccionable(p)));
  totalSeleccionados = computed(() => this.seleccionados().size);
  todosSeleccionados = computed(() => {
    const seleccionables = this.seleccionables();
    return seleccionables.length > 0 && seleccionables.every(p => this.seleccionados().has(p.id));
  });
  algunosSeleccionados = computed(() => this.totalSeleccionados() > 0 && !this.todosSeleccionados());
  excedeMaximo = computed(() => this.totalSeleccionados() > this.maxAnular);

  // ─── Anulación ─────────────────────────────────────────────────────────────
  /** Copia de lo seleccionado al abrir el modal: recargar el listado no la altera. */
  precargasAnular = signal<IPrecargaDetalle[]>([]);
  comentario = signal('');
  anulando = signal(false);
  resultadoAnulacion = signal<IAnularPrecargasResultado | null>(null);

  comentarioLength = computed(() => this.comentario().trim().length);
  comentarioValido = computed(() => this.comentarioLength() > 0 && this.comentarioLength() <= this.maxComentario);

  private precargasAnularMap = computed(() => new Map(this.precargasAnular().map(p => [p.id, p])));

  @ViewChild('anularModal') anularModalRef!: ElementRef;
  private anularModalInstance!: Modal;

  ngOnInit() {
    this.fetchCatalogos();
    this.buscar();
  }

  ngAfterViewInit() {
    this.anularModalInstance = new Modal(this.anularModalRef.nativeElement);
  }

  // ─── Datos ─────────────────────────────────────────────────────────────────

  async fetchCatalogos() {
    this.catalogosLoading.set(true);
    try {
      const [empresas, encuestas, encuestadores] = await Promise.all([
        this.empresaService.getEmpresas({ all: true }),
        this.encuestaService.getEncuestas({ all: true }),
        this.usuarioService.getUsuarios({ all: true }),
      ]);
      this.empresaList.set(empresas?.data ?? []);
      this.encuestaList.set(encuestas?.data ?? []);
      this.encuestadorList.set(encuestadores?.data ?? []);
    } finally {
      this.catalogosLoading.set(false);
    }
  }

  async fetchData() {
    const filtros = this.filtrosAplicados();
    if (!filtros || this.isLoading()) return;
    this.isLoading.set(true);
    this.seleccionados.set(new Set());
    try {
      const resp = await this.precargaService.getDetalle({
        ...filtros,
        page: this.pagination().page,
        limit: this.pagination().pageSize,
      });
      if (resp) {
        this.precargaList.set(resp.data ?? []);
        const m = resp.metadata;
        if (m) {
          this.pagination.set({
            page: m.page ?? 1,
            pageSize: m.limit ?? this.pagination().pageSize,
            totalItems: m.total,
          });
        }
      } else {
        // Sin esto quedaría a la vista el resultado de otros filtros.
        this.precargaList.set([]);
        this.pagination.update(p => ({ ...p, page: 1, totalItems: 0 }));
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  buscar() {
    if (this.errorFechas()) return;
    this.filtrosAplicados.set({
      fechaInicio: this.fechaInicio(),
      fechaFin: this.fechaFin(),
      idEmpresa: this.filtroEmpresa() ?? undefined,
      idEncuesta: this.filtroEncuesta() ?? undefined,
      idEncuestador: this.filtroEncuestador() ?? undefined,
      estado: this.filtroEstado() || undefined,
    });
    this.pagination.update(p => ({ ...p, page: 1 }));
    this.fetchData();
  }

  limpiarFiltros() {
    this.fechaInicio.set(this.inicioMes);
    this.fechaFin.set(this.hoy);
    this.filtroEmpresa.set(null);
    this.filtroEncuesta.set(null);
    this.filtroEncuestador.set(null);
    this.filtroEstado.set('');
    this.buscar();
  }

  onChangeEmpresa(idEmpresa: number | null) {
    this.filtroEmpresa.set(idEmpresa);
    // El encuestador elegido deja de tener sentido si es de otra empresa.
    const idEncuestador = this.filtroEncuestador();
    if (idEmpresa !== null && idEncuestador !== null && this.encuestadorMap().get(idEncuestador)?.idEmpresa !== idEmpresa) {
      this.filtroEncuestador.set(null);
    }
  }

  onChangeEstado(value: string) {
    this.filtroEstado.set(value as EstadoPrecarga | '');
  }

  onChangePage(p: IPagination) { this.pagination.set(p); this.fetchData(); }

  // ─── Etiquetas ─────────────────────────────────────────────────────────────

  nombreEmpresa(idEmpresa: number) { return this.empresaMap().get(idEmpresa)?.nombreEmpresa ?? `#${idEmpresa}`; }

  nombreEncuesta(idEncuesta: number) { return this.encuestaMap().get(idEncuesta)?.nombre ?? `#${idEncuesta}`; }

  nombreEncuestador(precarga: IPrecargaDetalle) {
    if (precarga.encuestador) return precarga.encuestador;
    if (precarga.idEncuestador == null) return '—';
    return this.encuestadorMap().get(precarga.idEncuestador)?.nombreCompleto ?? `#${precarga.idEncuestador}`;
  }

  estadoBadge(estado: EstadoPrecarga | null) { return estado ? ESTADO_BADGE[estado] : 'text-bg-light'; }

  precargaAnulada(id: string) { return this.precargasAnularMap().get(id) ?? null; }

  // ─── Selección ─────────────────────────────────────────────────────────────

  esSeleccionable(precarga: IPrecargaDetalle) { return precarga.estado === 'CARGADO'; }

  toggleSeleccion(precarga: IPrecargaDetalle, checked: boolean) {
    if (!this.esSeleccionable(precarga)) return;
    this.seleccionados.update(actual => {
      const nuevo = new Set(actual);
      if (checked) nuevo.add(precarga.id); else nuevo.delete(precarga.id);
      return nuevo;
    });
  }

  toggleTodos(checked: boolean) {
    this.seleccionados.set(checked ? new Set(this.seleccionables().map(p => p.id)) : new Set());
  }

  // ─── Anulación ─────────────────────────────────────────────────────────────

  openAnularModal() {
    const seleccionados = this.seleccionados();
    if (!seleccionados.size || this.excedeMaximo()) return;
    this.precargasAnular.set(this.precargaList().filter(p => seleccionados.has(p.id)));
    this.comentario.set('');
    this.resultadoAnulacion.set(null);
    this.anularModalInstance.show();
  }

  closeAnularModal() { this.anularModalInstance.hide(); }

  async anular() {
    const ids = this.precargasAnular().map(p => p.id);
    if (!ids.length || !this.comentarioValido() || this.anulando()) return;

    this.anulando.set(true);
    try {
      const resp = await this.precargaService.anularPrecargas({ ids, comentario: this.comentario().trim() });
      if (resp?.data) {
        // Si hubo parciales se muestran en el modal; si se anularon todas, se cierra.
        if (resp.data.noAnuladas.length) this.resultadoAnulacion.set(resp.data);
        else this.closeAnularModal();
      }
      // También tras un 409: el listado puede tener estados desactualizados.
      this.fetchData();
    } finally {
      this.anulando.set(false);
    }
  }
}
