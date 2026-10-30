import { ChangeDetectionStrategy, Component, computed, CUSTOM_ELEMENTS_SCHEMA, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DesembolsoService } from '../../../../services/aliado/desembolso.service';
import { NotificacionLoteService } from '../../../../services/aliado/notificacion-lote.service';
import { CatalogosBantotalService } from '../../../../services/api-bantotal/catalogos.service';
import { IComisionEmpresa, IConteoNotificaciones, ILoteDesembolso } from '../../../../interfaces/aliado/desembolso';
import { PaginationAllComponent } from '../../../shared/components/pagination-all/pagination-all';
import { ClientesEmpresaModal } from '../../components/desembolso/clientes-empresa-modal/clientes-empresa-modal';
import { NotificacionesLoteModal } from '../../components/desembolso/notificaciones-lote-modal/notificaciones-lote-modal';
import {
  claseCategoriaComision,
  claseEstadoLote,
  nombreAgenciaEmpresa,
  nombrePeriodo,
} from '../../utils/desembolso.utils';

/** Una empresa dentro de un lote */
interface FilaSeguimiento extends IComisionEmpresa {
  lote: ILoteDesembolso;
  region: string;
  agencia: string;
}

/** Los lotes son mensuales: con este límite se traen todos los del rango en una sola página */
const LIMITE_LOTES = 500;

/**
 * Seguimiento de pagos: empresas de todos los lotes (cualquier estado) con su región, agencia,
 * casos válidos y comisión. Se arma con el listado de lotes y el resumen de comisiones de cada uno.
 */
@Component({
  selector: 'app-seguimiento-pagos-page',
  imports: [RouterLink, FormsModule, DatePipe, CurrencyPipe, PaginationAllComponent, ClientesEmpresaModal, NotificacionesLoteModal],
  templateUrl: './seguimiento-pagos-page.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class SeguimientoPagosPage {
  private desembolsoService = inject(DesembolsoService);
  private notificacionService = inject(NotificacionLoteService);
  private catalogosService = inject(CatalogosBantotalService);

  readonly nombrePeriodo = nombrePeriodo;
  readonly claseEstado = claseEstadoLote;
  readonly claseCategoria = claseCategoriaComision;

  // Filtros: las fechas consultan al backend; región y agencia filtran lo ya cargado
  fechaDesde = signal('');
  fechaHasta = signal('');
  regionFiltro = signal('');
  agenciaFiltro = signal('');

  isLoading = signal(false);
  filas = signal<FilaSeguimiento[]>([]);
  pagination = signal<IPagination>({ page: 1, pageSize: 10, totalItems: 0 });
  /** Conteos de notificaciones por lote y empresa (ver claveEmpresa) */
  notificaciones = signal<Map<string, IConteoNotificaciones>>(new Map());

  // Modales
  filaNotificaciones = signal<FilaSeguimiento | null>(null);
  filaClientes = signal<FilaSeguimiento | null>(null);

  /** Regiones presentes en los registros cargados */
  regionesDisponibles = computed(() => [...new Set(this.filas().map(f => f.region))].filter(r => r !== '—').sort());

  /** Agencias presentes en los registros cargados (de la región elegida, si hay) */
  agenciasDisponibles = computed(() => {
    const region = this.regionFiltro();
    const filas = region ? this.filas().filter(f => f.region === region) : this.filas();
    return [...new Set(filas.map(f => f.agencia))].filter(a => a !== '—').sort();
  });

  filasFiltradas = computed(() => {
    const region = this.regionFiltro();
    const agencia = this.agenciaFiltro();
    return this.filas().filter(f => (!region || f.region === region) && (!agencia || f.agencia === agencia));
  });

  filasPagina = computed(() => {
    const { page, pageSize } = this.pagination();
    const inicio = (page - 1) * pageSize;
    return this.filasFiltradas().slice(inicio, inicio + pageSize);
  });

  paginationView = computed<IPagination>(() => ({
    ...this.pagination(),
    totalItems: this.filasFiltradas().length,
  }));

  totales = computed(() => this.filasFiltradas().reduce(
    (acc, f) => ({ casosValidos: acc.casosValidos + f.casosValidos, totalComision: acc.totalComision + f.totalComision }),
    { casosValidos: 0, totalComision: 0 },
  ));

  ngOnInit() {
    this.fetchData();
  }

  async fetchData() {
    if (this.isLoading()) return;
    this.isLoading.set(true);

    const [respLotes, regiones, agencias] = await Promise.all([
      this.desembolsoService.listarLotes({
        page: 1,
        limit: LIMITE_LOTES,
        fechaDesde: this.fechaDesde(),
        fechaHasta: this.fechaHasta(),
      }),
      this.catalogosService.mapaRegiones(),
      this.catalogosService.mapaAgencias(),
    ]);
    const lotes = respLotes?.data ?? [];

    const [comisiones, resumenes] = await Promise.all([
      Promise.all(lotes.map(l => this.desembolsoService.obtenerComisiones(l.id))),
      Promise.all(lotes.map(l => this.notificacionService.resumenPorLote(l.id))),
    ]);

    const filas = lotes.flatMap((lote, i) =>
      (comisiones[i]?.data?.empresas ?? []).map(e => ({
        ...e,
        lote,
        region: e.regionId !== null ? (regiones.get(String(e.regionId)) ?? String(e.regionId)).toUpperCase() : '—',
        agencia: nombreAgenciaEmpresa(e.agenciaNombre, e.agenciaId, agencias),
      }))
    );

    // Agrupadas por región, agencia y empresa; dentro de cada empresa, sus lotes en orden
    filas.sort((a, b) =>
      a.region.localeCompare(b.region) ||
      a.agencia.localeCompare(b.agencia) ||
      (a.nombreEmpresa ?? '').localeCompare(b.nombreEmpresa ?? '') ||
      a.lote.numeroLote - b.lote.numeroLote
    );

    const conteos = new Map<string, IConteoNotificaciones>();
    lotes.forEach((lote, i) => {
      for (const e of resumenes[i]?.data?.empresas ?? []) {
        conteos.set(this.claveEmpresa(lote.id, e.idEmpresa), e);
      }
    });

    this.filas.set(filas);
    this.notificaciones.set(conteos);
    this.pagination.update(p => ({ ...p, page: 1 }));
    this.isLoading.set(false);
  }

  /** Clave de lote + empresa (los GUID pueden venir en mayúsculas o minúsculas) */
  private claveEmpresa(loteId: string, idEmpresa: string): string {
    return `${loteId}|${idEmpresa}`.toUpperCase();
  }

  async actualizarNotificaciones(loteId: string) {
    const resp = await this.notificacionService.resumenPorLote(loteId);
    if (!resp?.data) return;
    this.notificaciones.update(actual => {
      const nuevo = new Map(actual);
      for (const e of resp.data.empresas) nuevo.set(this.claveEmpresa(loteId, e.idEmpresa), e);
      return nuevo;
    });
  }

  conteo(f: FilaSeguimiento): IConteoNotificaciones | null {
    return this.notificaciones().get(this.claveEmpresa(f.lote.id, f.idEmpresa)) ?? null;
  }

  /** Hay algo que atender: mensajes sin leer o por responder */
  pendientes(f: FilaSeguimiento): boolean {
    const c = this.conteo(f);
    return !!c && (c.sinLeer > 0 || c.porResponder > 0);
  }

  tituloNotificaciones(f: FilaSeguimiento): string {
    const c = this.conteo(f);
    if (!c) return 'Notificaciones';
    return `Notificaciones: ${c.abiertas} abiertas · ${c.sinLeer} sin leer · ${c.porResponder} por responder`;
  }

  buscar() {
    this.fetchData();
  }

  limpiarFiltros() {
    this.fechaDesde.set('');
    this.fechaHasta.set('');
    this.regionFiltro.set('');
    this.agenciaFiltro.set('');
    this.fetchData();
  }

  onRegion(region: string) {
    this.regionFiltro.set(region);
    // La agencia elegida puede no pertenecer a la nueva región
    if (!this.agenciasDisponibles().includes(this.agenciaFiltro())) this.agenciaFiltro.set('');
    this.pagination.update(p => ({ ...p, page: 1 }));
  }

  onAgencia(agencia: string) {
    this.agenciaFiltro.set(agencia);
    this.pagination.update(p => ({ ...p, page: 1 }));
  }

  onChangePage(newPagination: IPagination) {
    this.pagination.set(newPagination);
  }
}
