import {
  AfterViewInit, ChangeDetectionStrategy, Component, computed, CUSTOM_ELEMENTS_SCHEMA,
  ElementRef, inject, OnInit, signal, ViewChild,
} from '@angular/core';
import { DatePipe, formatDate } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Modal } from 'bootstrap';
import { PaginationAllComponent } from '../../../shared/components/pagination-all/pagination-all';
import { AutocompleteComponent, AutocompleteOption } from '../../../shared/components/autocomplete/autocomplete';
import { CapturaService } from '../../../../services/onesiteex-captura/captura.service';
import { EmpresaExService } from '../../../../services/onesiteex-auth/empresa-ex.service';
import { UsuarioExService } from '../../../../services/onesiteex-auth/usuario-ex.service';
import { EncuestaService } from '../../../../services/encuesta/encuesta.service';
import { AuthService } from '../../../../services/auth.service';
import {
  CampoMarca,
  ICaptura,
  ICapturaDetalle,
  ICapturaFilters,
  Marca,
  MARCA_LABEL,
} from '../../../../interfaces/onesiteex-captura/onesiteex-captura';
import { IEmpresaEx, IUsuarioEx } from '../../../../interfaces/onesiteex-auth/onesiteex-auth';
import { IEncuesta } from '../../../../interfaces/encuesta/encuesta';

const fechaISO = (fecha: Date) => formatDate(fecha, 'yyyy-MM-dd', 'en-US');

@Component({
  selector: 'app-validar-encuesta-page',
  imports: [RouterLink, DatePipe, PaginationAllComponent, AutocompleteComponent],
  templateUrl: './validar-encuesta-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export default class ValidarEncuestaPage implements OnInit, AfterViewInit {
  private capturaService = inject(CapturaService);
  private empresaService = inject(EmpresaExService);
  private usuarioService = inject(UsuarioExService);
  private encuestaService = inject(EncuestaService);
  private authService = inject(AuthService);

  readonly marcaLabel = MARCA_LABEL;
  readonly hoy = fechaISO(new Date());
  private readonly inicioMes = fechaISO(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  // ─── Catálogos para los filtros ────────────────────────────────────────────
  empresaList = signal<IEmpresaEx[]>([]);
  encuestaList = signal<IEncuesta[]>([]);
  encuestadorList = signal<IUsuarioEx[]>([]);
  catalogosLoading = signal(false);

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
  filtroEncuesta = signal<number | null>(null);
  filtroEncuestador = signal<number | null>(null);
  filtroEmpresa = signal<number | null>(null);

  errorFechas = computed(() => {
    if (!this.fechaInicio() || !this.fechaFin()) return 'La fecha inicial y la final son obligatorias';
    // Con YYYY-MM-DD la comparación de texto respeta el orden cronológico.
    if (this.fechaInicio() > this.fechaFin()) return 'La fecha inicial no puede ser posterior a la final';
    return '';
  });

  hayFiltrosActivos = computed(() =>
    this.fechaInicio() !== this.inicioMes || this.fechaFin() !== this.hoy ||
    this.filtroEncuesta() !== null || this.filtroEncuestador() !== null || this.filtroEmpresa() !== null
  );

  /** Filtros de la última búsqueda: la paginación los reutiliza aunque se hayan editado los campos. */
  private filtrosAplicados = signal<ICapturaFilters | null>(null);

  // ─── Listado ───────────────────────────────────────────────────────────────
  capturaList = signal<ICaptura[]>([]);
  isLoading = signal(false);
  pagination = signal<IPagination>({ page: 1, pageSize: 10, totalItems: 0 });

  // ─── Detalle ───────────────────────────────────────────────────────────────
  /** La captura abierta, ya con sus respuestas. null mientras se carga. */
  capturaDetalle = signal<ICapturaDetalle | null>(null);
  /** La fila que se pulsó: da encabezado al modal antes de que llegue el detalle. */
  capturaAbierta = signal<ICaptura | null>(null);
  detalleLoading = signal(false);
  /**
   * A qué marca vino el usuario: lo decide el botón del listado que pulsó, y
   * determina el botón del pie del modal.
   */
  modo = signal<CampoMarca>('validado');
  /** El paso de confirmación, dentro del mismo modal. */
  confirmando = signal(false);
  marcando = signal(false);

  /** 'Revisar' / 'Validar', para el botón y el mensaje de confirmación. */
  accionLabel = computed(() => (this.modo() === 'revisado' ? 'Revisar' : 'Validar'));
  confirmacionLabel = computed(() =>
    this.modo() === 'revisado'
      ? '¿Desea marcar como revisada la encuesta?'
      : '¿Desea marcar como válida la encuesta?'
  );

  /**
   * El botón se habilita solo si esa marca sigue en null. Mientras el detalle
   * carga no se habilita: todavía no se sabe si ya está marcada.
   */
  puedeMarcar = computed(() => {
    const detalle = this.capturaDetalle();
    return !!detalle && detalle[this.modo()] === null && !this.marcando();
  });

  totalRespuestas = computed(() =>
    (this.capturaDetalle()?.secciones ?? []).reduce((total, s) => total + s.respuestas.length, 0)
  );

  @ViewChild('detalleModal') detalleModalRef!: ElementRef;
  private detalleModalInstance!: Modal;

  ngOnInit() {
    this.fetchCatalogos();
    this.buscar();
  }

  ngAfterViewInit() {
    this.detalleModalInstance = new Modal(this.detalleModalRef.nativeElement);
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
    try {
      const resp = await this.capturaService.getCapturas({
        ...filtros,
        page: this.pagination().page,
        limit: this.pagination().pageSize,
      });
      if (resp) {
        this.capturaList.set(resp.data ?? []);
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
        this.capturaList.set([]);
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
      idEncuesta: this.filtroEncuesta() ?? undefined,
      idEncuestador: this.filtroEncuestador() ?? undefined,
      idEmpresa: this.filtroEmpresa() ?? undefined,
    });
    this.pagination.update(p => ({ ...p, page: 1 }));
    this.fetchData();
  }

  limpiarFiltros() {
    this.fechaInicio.set(this.inicioMes);
    this.fechaFin.set(this.hoy);
    this.filtroEncuesta.set(null);
    this.filtroEncuestador.set(null);
    this.filtroEmpresa.set(null);
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

  onChangePage(p: IPagination) { this.pagination.set(p); this.fetchData(); }

  // ─── Detalle ───────────────────────────────────────────────────────────────

  /** `modo` sale del botón que se pulsó: cada columna abre su propia acción. */
  async mostrarEncuesta(captura: ICaptura, modo: CampoMarca) {
    this.modo.set(modo);
    this.capturaAbierta.set(captura);
    this.capturaDetalle.set(null);
    this.confirmando.set(false);
    this.detalleModalInstance.show();

    this.detalleLoading.set(true);
    try {
      const resp = await this.capturaService.getCaptura(captura.idCaptura);
      // Si falla se queda el encabezado de la fila y el cuerpo vacío: el botón
      // de marcar sigue deshabilitado porque no hay detalle que lo respalde.
      this.capturaDetalle.set(resp?.data ?? null);
    } finally {
      this.detalleLoading.set(false);
    }
  }

  cerrarDetalle() { this.detalleModalInstance.hide(); }

  pedirConfirmacion() {
    if (!this.puedeMarcar()) return;
    this.confirmando.set(true);
  }

  cancelarConfirmacion() { this.confirmando.set(false); }

  async marcar() {
    const detalle = this.capturaDetalle();
    if (!detalle || !this.puedeMarcar()) return;

    // El autor de la marca es quien tiene la sesión de OneSiteWeb abierta.
    const usuario = this.authService.getUserStorage()?.userName ?? '';
    if (!usuario) return;

    const campo = this.modo();
    this.marcando.set(true);
    try {
      const resp = campo === 'revisado'
        ? await this.capturaService.revisarCaptura(detalle.idCaptura, usuario)
        : await this.capturaService.validarCaptura(detalle.idCaptura, usuario);

      if (resp?.data) {
        // El detalle abierto refleja la marca sin recargarlo entero.
        const marca = (resp.data[campo] ?? 'Si') as Marca;
        this.capturaDetalle.set({
          ...detalle,
          [campo]: marca,
          ...(campo === 'revisado'
            ? { usuarioRevisor: usuario }
            : { usuarioValidador: usuario }),
        });
        this.confirmando.set(false);
      }
      // También si falló: un 409 significa que otro supervisor se adelantó y
      // el listado tiene el estado desactualizado.
      this.fetchData();
    } finally {
      this.marcando.set(false);
    }
  }

  // ─── Etiquetas ─────────────────────────────────────────────────────────────

  nombreEncuestador(captura: ICaptura) {
    if (captura.encuestador) return captura.encuestador;
    return this.encuestadorMap().get(captura.idEncuestador)?.nombreCompleto ?? `#${captura.idEncuestador}`;
  }

  marcaBadge(marca: Marca | null) {
    if (marca === 'Si') return 'text-bg-success';
    if (marca === 'No') return 'text-bg-danger';
    return 'text-bg-secondary';
  }
}
