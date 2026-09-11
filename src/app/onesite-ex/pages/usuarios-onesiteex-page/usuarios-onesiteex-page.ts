import {
  AfterViewInit, ChangeDetectionStrategy, Component, computed, CUSTOM_ELEMENTS_SCHEMA,
  ElementRef, inject, OnInit, signal, ViewChild,
} from '@angular/core';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Modal } from 'bootstrap';
import { PaginationComponent } from '../../../shared/components/pagination/pagination';
import { DescargarPlantillaComponent } from '../../../shared/components/descargar-plantilla/descargar-plantilla';
import { UpsertUsuarioExComponent } from '../../components/upsert-usuario-ex/upsert-usuario-ex.component';
import { UsuarioExService } from '../../../../services/onesiteex-auth/usuario-ex.service';
import { EmpresaExService } from '../../../../services/onesiteex-auth/empresa-ex.service';
import { RolExService } from '../../../../services/onesiteex-auth/rol-ex.service';
import {
  ICargaMasivaResultado,
  IDispositivoEx,
  IEmpresaEx,
  IRolEx,
  ISesionEx,
  IUsuarioEx,
  IUsuarioExUpsert,
} from '../../../../interfaces/onesiteex-auth/onesiteex-auth';

type EstadoFiltro = '' | 'true' | 'false';

@Component({
  selector: 'app-usuarios-onesiteex-page',
  imports: [RouterLink, DatePipe, NgTemplateOutlet, PaginationComponent, DescargarPlantillaComponent, UpsertUsuarioExComponent],
  templateUrl: './usuarios-onesiteex-page.html',
  styleUrl: './usuarios-onesiteex-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export default class UsuariosOnesiteexPage implements OnInit, AfterViewInit {
  private usuarioService = inject(UsuarioExService);
  private empresaService = inject(EmpresaExService);
  private rolService = inject(RolExService);

  usuarioList = signal<IUsuarioEx[]>([]);
  empresaList = signal<IEmpresaEx[]>([]);
  rolList = signal<IRolEx[]>([]);

  usuarioEdit = signal<IUsuarioEx | null>(null);
  nuevo = signal(true);
  formKey = signal(Date.now());
  isLoading = signal(false);
  modal = signal({ titulo: 'Nuevo usuario' });

  // Filtros
  buscador = signal('');
  filtroEmpresa = signal<number | null>(null);
  filtroRol = signal<number | null>(null);
  filtroEstado = signal<EstadoFiltro>('');

  pagination = signal<IPagination>({ page: 1, pageSize: 10, totalItems: 0 });

  // Detalle desplegable (dispositivos + sesiones)
  expandedId = signal<number | null>(null);
  detalleLoading = signal(false);
  dispositivoList = signal<IDispositivoEx[]>([]);
  sesionList = signal<ISesionEx[]>([]);
  detalleTab = signal<'dispositivos' | 'sesiones'>('dispositivos');

  // Las sesiones se paginan en el servidor; los dispositivos se traen completos.
  readonly sesionPageSize = 20;
  sesionPage = signal(1);
  sesionTotal = signal(0);
  sesionesLoading = signal(false);
  sesionTotalPages = computed(() => Math.max(1, Math.ceil(this.sesionTotal() / this.sesionPageSize)));
  sesionDesde = computed(() => this.sesionTotal() === 0 ? 0 : (this.sesionPage() - 1) * this.sesionPageSize + 1);
  sesionHasta = computed(() => Math.min(this.sesionPage() * this.sesionPageSize, this.sesionTotal()));

  // Carga masiva desde Excel
  readonly cargaMaxBytes = 4 * 1024 * 1024;
  cargaArchivo = signal<File | null>(null);
  cargaLoading = signal(false);
  cargaError = signal('');
  cargaResultado = signal<ICargaMasivaResultado | null>(null);
  cargaErrores = computed(() =>
    (this.cargaResultado()?.mensajeError ?? '')
      .split(';')
      .map(e => e.trim())
      .filter(Boolean)
  );

  hayFiltrosActivos = computed(() =>
    !!this.buscador() || this.filtroEmpresa() !== null || this.filtroRol() !== null || this.filtroEstado() !== ''
  );

  private empresaMap = computed(() => new Map(this.empresaList().map(e => [e.idEmpresa, e])));
  private rolMap = computed(() => new Map(this.rolList().map(r => [r.idRol, r])));
  private dispositivoMap = computed(() => new Map(this.dispositivoList().map(d => [d.idDispositivo, d])));

  @ViewChild('upsertModal') modalRef!: ElementRef;
  private modalInstance!: Modal;
  @ViewChild('deleteModal') deleteModalRef!: ElementRef;
  private deleteModalInstance!: Modal;
  @ViewChild('cargaModal') cargaModalRef!: ElementRef;
  private cargaModalInstance!: Modal;

  ngOnInit() {
    this.fetchCatalogos();
    this.fetchData();
  }

  ngAfterViewInit() {
    this.modalInstance = new Modal(this.modalRef.nativeElement);
    this.deleteModalInstance = new Modal(this.deleteModalRef.nativeElement);
    this.cargaModalInstance = new Modal(this.cargaModalRef.nativeElement);
  }

  // ─── Datos ─────────────────────────────────────────────────────────────────

  async fetchCatalogos() {
    const [empresas, roles] = await Promise.all([
      this.empresaService.getEmpresas({ all: true }),
      this.rolService.getRoles({ all: true }),
    ]);
    this.empresaList.set(empresas?.data ?? []);
    this.rolList.set(roles?.data ?? []);
  }

  async fetchData() {
    if (this.isLoading()) return;
    this.isLoading.set(true);
    this.expandedId.set(null);
    try {
      const estado = this.filtroEstado();
      const resp = await this.usuarioService.getUsuarios({
        page: this.pagination().page,
        limit: this.pagination().pageSize,
        search: this.buscador(),
        idEmpresa: this.filtroEmpresa() ?? undefined,
        idRol: this.filtroRol() ?? undefined,
        estado: estado === '' ? undefined : estado === 'true',
      });
      if (resp?.data) {
        this.usuarioList.set(resp.data ?? []);
        const m = resp.metadata;
        if (m) {
          this.pagination.set({
            page: m.page ?? 1,
            pageSize: m.limit ?? this.pagination().pageSize,
            totalItems: m.total,
          });
        }
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  buscar() {
    this.pagination.update(p => ({ ...p, page: 1 }));
    this.fetchData();
  }

  limpiarFiltros() {
    this.buscador.set('');
    this.filtroEmpresa.set(null);
    this.filtroRol.set(null);
    this.filtroEstado.set('');
    this.buscar();
  }

  onChangeEmpresa(value: string) {
    this.filtroEmpresa.set(value ? Number(value) : null);
    this.buscar();
  }

  onChangeRol(value: string) {
    this.filtroRol.set(value ? Number(value) : null);
    this.buscar();
  }

  onChangeEstado(value: string) {
    this.filtroEstado.set(value as EstadoFiltro);
    this.buscar();
  }

  onChangePage(p: IPagination) { this.pagination.set(p); this.fetchData(); }

  // ─── Etiquetas ─────────────────────────────────────────────────────────────

  nombreEmpresa(idEmpresa: number) { return this.empresaMap().get(idEmpresa)?.nombreEmpresa ?? `#${idEmpresa}`; }

  nombreRol(idRol: number) { return this.rolMap().get(idRol)?.nombreRol ?? `#${idRol}`; }

  permisosRol(idRol: number) {
    const permisos = this.rolService.parsePermisos(this.rolMap().get(idRol));
    return permisos.modulos ?? [];
  }

  nombreDispositivo(idDispositivo: number) {
    const d = this.dispositivoMap().get(idDispositivo);
    if (!d) return `Dispositivo #${idDispositivo}`;
    return d.modelo || d.hardwareID || `Dispositivo #${idDispositivo}`;
  }

  esVigente(sesion: ISesionEx) { return new Date(sesion.fechaExpiracion).getTime() > Date.now(); }

  // ─── Detalle: dispositivos y sesiones ──────────────────────────────────────

  async toggleDetalle(usuario: IUsuarioEx) {
    if (this.expandedId() === usuario.idUsuario) {
      this.expandedId.set(null);
      return;
    }
    this.expandedId.set(usuario.idUsuario);
    this.detalleTab.set('dispositivos');
    this.dispositivoList.set([]);
    this.sesionList.set([]);
    this.sesionPage.set(1);
    this.sesionTotal.set(0);
    this.detalleLoading.set(true);
    try {
      const [dispositivos, sesiones] = await Promise.all([
        this.usuarioService.getDispositivosByUsuario(usuario.idUsuario, { all: true }),
        this.usuarioService.getSesionesByUsuario(usuario.idUsuario, { page: 1, limit: this.sesionPageSize }),
      ]);
      this.dispositivoList.set(dispositivos?.data ?? []);
      this.sesionList.set(sesiones?.data ?? []);
      this.sesionTotal.set(sesiones?.metadata?.total ?? 0);
    } finally {
      this.detalleLoading.set(false);
    }
  }

  async cambiarPaginaSesiones(page: number) {
    const idUsuario = this.expandedId();
    if (!idUsuario || this.sesionesLoading()) return;
    if (page < 1 || page > this.sesionTotalPages() || page === this.sesionPage()) return;

    this.sesionesLoading.set(true);
    try {
      const resp = await this.usuarioService.getSesionesByUsuario(idUsuario, {
        page,
        limit: this.sesionPageSize,
      });
      if (resp?.data) {
        this.sesionList.set(resp.data);
        this.sesionTotal.set(resp.metadata?.total ?? this.sesionTotal());
        this.sesionPage.set(page);
      }
    } finally {
      this.sesionesLoading.set(false);
    }
  }

  // ─── CRUD ──────────────────────────────────────────────────────────────────

  openModal(esNuevo: boolean, usuario?: IUsuarioEx) {
    this.nuevo.set(esNuevo);
    this.formKey.set(Date.now());
    this.usuarioEdit.set(esNuevo ? null : { ...usuario! });
    this.modal.set({ titulo: esNuevo ? 'Nuevo usuario' : 'Editar usuario' });
    this.modalInstance.show();
  }

  closeModal() { this.modalInstance.hide(); }

  openDeleteModal(usuario: IUsuarioEx) {
    this.usuarioEdit.set({ ...usuario });
    this.deleteModalInstance.show();
  }

  async upsertUsuario(usuario: IUsuarioExUpsert) {
    const resp = this.nuevo()
      ? await this.usuarioService.createUsuario(usuario)
      : await this.usuarioService.updateUsuario(usuario);
    if (resp?.success) { this.closeModal(); this.fetchData(); }
  }

  async deleteUsuario() {
    const id = this.usuarioEdit()?.idUsuario;
    if (!id) return;
    const resp = await this.usuarioService.deleteUsuario(id);
    if (resp?.success) { this.deleteModalInstance.hide(); this.fetchData(); }
  }

  // ─── Carga masiva ──────────────────────────────────────────────────────────

  openCargaModal() {
    this.cargaArchivo.set(null);
    this.cargaResultado.set(null);
    this.cargaError.set('');
    this.cargaLoading.set(false);
    this.cargaModalInstance.show();
  }

  onArchivoSeleccionado(input: HTMLInputElement) {
    this.cargaResultado.set(null);
    this.cargaError.set('');

    const file = input.files?.[0] ?? null;
    if (!file) { this.cargaArchivo.set(null); return; }

    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension !== 'xlsx' && extension !== 'xls') {
      this.cargaError.set('El archivo debe ser .xlsx o .xls');
      this.cargaArchivo.set(null);
      input.value = '';
      return;
    }
    if (file.size > this.cargaMaxBytes) {
      this.cargaError.set('El archivo supera el máximo de 4 MB');
      this.cargaArchivo.set(null);
      input.value = '';
      return;
    }
    this.cargaArchivo.set(file);
  }

  quitarArchivo(input: HTMLInputElement) {
    input.value = '';
    this.cargaArchivo.set(null);
    this.cargaError.set('');
  }

  tamanoArchivo(file: File) { return (file.size / 1024).toFixed(1) + ' KB'; }

  async subirArchivo() {
    const file = this.cargaArchivo();
    if (!file || this.cargaLoading()) return;

    this.cargaLoading.set(true);
    try {
      const resp = await this.usuarioService.cargaMasivaUsuarios(file);
      if (resp?.data) {
        this.cargaResultado.set(resp.data);
        // Se recarga el listado si al menos un usuario entró, aunque haya errores parciales.
        if (resp.data.cantidadRegistrada > 0) this.fetchData();
      }
    } finally {
      this.cargaLoading.set(false);
    }
  }

  /** El switch de la tabla da de alta/baja vía PUT (la baja lógica también se puede revertir). */
  async toggleEstado(usuario: IUsuarioEx, checked: boolean) {
    const resp = await this.usuarioService.updateUsuario({ idUsuario: usuario.idUsuario, estado: checked });
    if (resp?.success) {
      this.usuarioList.update(list =>
        list.map(u => u.idUsuario === usuario.idUsuario ? { ...u, estado: checked } : u)
      );
    } else {
      this.fetchData();
    }
  }
}
