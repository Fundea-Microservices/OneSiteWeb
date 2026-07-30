import { ChangeDetectionStrategy, Component, computed, CUSTOM_ELEMENTS_SCHEMA, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RolService } from '../../../../services/rol.service';
import { CatalogosBantotalService } from '../../../../services/api-bantotal/catalogos.service';
import { SiucomService } from '../../../../services/config/siucom.service';
import { IRol } from '../../../../interfaces/auth';
import { AuditoriaResumen, AuditoriaSesion, ConsultaAuditoriaSiucomParams, DashboardSiucom } from '../../../../interfaces/siucom/auditoria';
import { PaginationComponent } from '../../../shared/components/pagination/pagination';

export interface Region {
  regionId: string; // valorCore
  nombre: string;
}

export interface Agencia {
  agenciaId: string; // valorCore
  nombre: string;
  regionId: string;  // padreValorCore
}

/** Tipo de filtro seleccionado en la página. */
type TipoFiltro = 'usuario' | 'ubicacion' | 'rol';

/** Opciones del filtro por tipo de dashboard. */
const DASHBOARDS: { valor: DashboardSiucom; nombre: string }[] = [
  { valor: 'todos',       nombre: 'Todos' },
  { valor: 'empresarial', nombre: 'Empresarial' },
  { valor: 'avanzado',    nombre: 'Avanzado' },
  { valor: 'intermedio',  nombre: 'Intermedio' },
  { valor: 'basico_pro',  nombre: 'Básico Pro' },
  { valor: 'basico_plus', nombre: 'Básico Plus' },
  { valor: 'basico',      nombre: 'Básico' },
];

@Component({
  selector: 'app-historial-siucom-page',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './historial-siucom-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class HistorialSiucomPage implements OnInit {

  private rolService = inject(RolService);
  private catalogosService = inject(CatalogosBantotalService);
  private siucomService = inject(SiucomService);

  // Fecha máxima seleccionable: hoy (no se permiten fechas futuras)
  readonly hoy = new Date().toISOString().split('T')[0];

  // Tipo de filtro: usuario exacto, región/agencia o rol
  tipoFiltro = signal<TipoFiltro>('usuario');

  // Filtros
  fechaInicio = signal('');
  fechaFin    = signal('');
  usuario         = signal('');
  selectedRegion  = signal('');
  selectedAgencia = signal('');
  selectedRol     = signal('');
  // Tipo de dashboard: independiente del tipo de filtro, aplica siempre
  selectedDashboard = signal<DashboardSiucom>('todos');

  // Catálogos
  readonly dashboards = DASHBOARDS;
  regiones = signal<Region[]>([]);
  agencias = signal<Agencia[]>([]);
  agenciasFilterradas = signal<Agencia[]>([]);
  roles = signal<IRol[]>([]);

  // Resultados
  isLoading    = signal(false);
  descargandoCsv = signal(false);
  buscado      = signal(false);
  errorBusqueda = signal('');
  sesiones     = signal<AuditoriaSesion[]>([]);
  resumen      = signal<AuditoriaResumen | null>(null);

  pagination = signal<IPagination>({
    page: 1,
    pageSize: 10,
    totalItems: 0,
  });

  // Página actual de sesiones (paginación en cliente: el endpoint devuelve todo)
  registrosPagina = computed(() => {
    const { page, pageSize } = this.pagination();
    const inicio = (page - 1) * pageSize;
    return this.sesiones().slice(inicio, inicio + pageSize);
  });

  // La fecha fin no puede ser menor a la fecha inicio
  fechaFinInvalida = computed(() =>
    this.fechaInicio() !== '' &&
    this.fechaFin() !== '' &&
    this.fechaFin() < this.fechaInicio()
  );

  /**
   * Valor que se enviará en el parámetro `filtro` (búsqueda general).
   * Solo aplica cuando el tipo de filtro es 'ubicacion' o 'rol'.
   * Precedencia en ubicación: si hay agencia se manda solo la agencia,
   * de lo contrario se manda la región. El texto se envía normalizado
   * (sin código): "REGIONAL X" -> "REGIÓN X" y "Agencia X" -> "X".
   */
  filtro = computed(() => {
    if (this.tipoFiltro() === 'ubicacion') {
      if (this.selectedAgencia()) {
        return this.normalizarAgencia(this.getAgenciaNombre(this.selectedAgencia()));
      }
      if (this.selectedRegion()) {
        return this.normalizarRegion(this.getRegionNombre(this.selectedRegion()));
      }
      return '';
    }
    if (this.tipoFiltro() === 'rol') {
      return this.getRolNombre(this.selectedRol());
    }
    return '';
  });

  get formularioValido(): boolean {
    return !this.fechaFinInvalida();
  }

  async ngOnInit(): Promise<void> {
    await Promise.all([
      this.cargarRegionesYAgencias(),
      this.cargarRoles(),
    ]);
  }

  private async cargarRegionesYAgencias(): Promise<void> {
    const { regiones, agencias } = await new Promise<{ regiones: Region[]; agencias: Agencia[] }>((resolve) => {
      this.catalogosService.listarCatalogos({ grupo: 'region', all: true }).subscribe({
        next: (result) => {
          const catalogos: any[] = (result as any)?.data?.data?.catalogos
            ?? (result as any)?.data?.catalogos
            ?? [];
          const regiones: Region[] = [];
          const agencias: Agencia[] = [];
          for (const r of catalogos) {
            // Normalizar a string: valorCore/padreValorCore pueden venir como número
            // o string desde el backend, y las comparaciones (filtro de agencias,
            // preselección con ngModel) deben ser consistentes en tipo.
            regiones.push({ regionId: String(r.valorCore), nombre: r.nombre });
            for (const a of (r.hijos ?? [])) {
              agencias.push({ agenciaId: String(a.valorCore), nombre: a.nombre, regionId: String(a.padreValorCore) });
            }
          }
          resolve({ regiones, agencias });
        },
        error: () => resolve({ regiones: [], agencias: [] }),
      });
    });

    this.regiones.set(regiones);
    this.agencias.set(agencias);
  }

  private async cargarRoles(): Promise<void> {
    const resp = await this.rolService.getRoles({ all: true });
    this.roles.set(resp?.data?.roles ?? []);
  }

  onTipoFiltroChange(tipo: TipoFiltro): void {
    this.tipoFiltro.set(tipo);
    // Limpiar los campos que no aplican al tipo seleccionado
    this.usuario.set('');
    this.selectedRegion.set('');
    this.selectedAgencia.set('');
    this.selectedRol.set('');
    this.agenciasFilterradas.set([]);
  }

  onRegionChange(regionId: string): void {
    this.selectedRegion.set(regionId);
    this.selectedAgencia.set('');
    this.agenciasFilterradas.set(
      this.agencias().filter((a) => a.regionId === regionId)
    );
  }

  onFechaInicioChange(valor: string): void {
    this.fechaInicio.set(valor);
    // Si la fecha fin quedó por debajo del nuevo inicio, se limpia
    if (this.fechaFin() && this.fechaFin() < valor) {
      this.fechaFin.set('');
    }
  }

  /** "REGIONAL I" -> "REGIÓN I" */
  private normalizarRegion(nombre: string): string {
    return nombre.replace(/regional/gi, 'REGIÓN').trim();
  }

  /** "Agencia Chimaltenango" -> "Chimaltenango" */
  private normalizarAgencia(nombre: string): string {
    return nombre.replace(/agencia/gi, '').replace(/\s+/g, ' ').trim();
  }

  getRegionNombre(id: string): string {
    return this.regiones().find((r) => r.regionId === id)?.nombre ?? '';
  }

  getAgenciaNombre(id: string): string {
    return this.agencias().find((a) => a.agenciaId === id)?.nombre ?? '';
  }

  getRolNombre(id: string): string {
    return this.roles().find((r) => r.rolId === id)?.name ?? '';
  }

  /** Construye los parámetros de consulta según los filtros seleccionados. */
  private construirParametros(): ConsultaAuditoriaSiucomParams {
    const params: ConsultaAuditoriaSiucomParams = {};

    if (this.tipoFiltro() === 'usuario' && this.usuario().trim()) {
      params.usuario = this.usuario().trim();
    }

    const filtro = this.filtro();
    if (filtro) {
      params.filtro = filtro;
    }

    params.dashboard = this.selectedDashboard();

    if (this.fechaInicio()) params.fechaInicio = this.fechaInicio();
    if (this.fechaFin())    params.fechaFin    = this.fechaFin();

    return params;
  }

  async buscar(): Promise<void> {
    if (!this.formularioValido || this.isLoading()) return;

    this.isLoading.set(true);
    this.errorBusqueda.set('');
    this.pagination.update((p) => ({ ...p, page: 1, totalItems: 0 }));

    try {
      const resp = await this.siucomService.consultarAuditoria(this.construirParametros());

      if (resp?.success) {
        const sesiones = resp.data?.sesiones ?? [];
        this.sesiones.set(sesiones);
        this.resumen.set(resp.data?.resumen ?? null);
        this.pagination.update((p) => ({ ...p, page: 1, totalItems: sesiones.length }));
      } else {
        this.sesiones.set([]);
        this.resumen.set(null);
        this.errorBusqueda.set(resp?.message ?? 'No se pudo consultar la auditoría de SIUCOM.');
      }
    } finally {
      this.isLoading.set(false);
      this.buscado.set(true);
    }
  }

  async exportarCsv(): Promise<void> {
    if (this.descargandoCsv()) return;
    this.descargandoCsv.set(true);
    try {
      const ok = await this.siucomService.descargarAuditoriaCsv(this.construirParametros());
      if (!ok) {
        this.errorBusqueda.set('No se pudo generar el archivo CSV.');
      }
    } finally {
      this.descargandoCsv.set(false);
    }
  }

  limpiarFiltros(): void {
    this.fechaInicio.set('');
    this.fechaFin.set('');
    this.tipoFiltro.set('usuario');
    this.usuario.set('');
    this.selectedRegion.set('');
    this.selectedAgencia.set('');
    this.selectedRol.set('');
    this.selectedDashboard.set('todos');
    this.agenciasFilterradas.set([]);
    this.sesiones.set([]);
    this.resumen.set(null);
    this.errorBusqueda.set('');
    this.buscado.set(false);
    this.pagination.set({ page: 1, pageSize: 10, totalItems: 0 });
  }

  onChangePage(newPagination: IPagination): void {
    // Paginación en cliente: solo cambia la página mostrada, no se reconsulta.
    this.pagination.set(newPagination);
  }
}
