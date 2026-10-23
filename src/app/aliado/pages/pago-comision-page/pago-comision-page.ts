import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DesembolsoService } from '../../../../services/aliado/desembolso.service';
import { NotificacionLoteService } from '../../../../services/aliado/notificacion-lote.service';
import { ESTADOS_PAGO_COMISION, IConteoNotificaciones, ILoteDesembolso } from '../../../../interfaces/aliado/desembolso';
import { PaginationAllComponent } from '../../../shared/components/pagination-all/pagination-all';
import { GestionPagosModal } from '../../components/desembolso/gestion-pagos-modal/gestion-pagos-modal';
import { NotificacionesLoteModal } from '../../components/desembolso/notificaciones-lote-modal/notificaciones-lote-modal';
import { VerLoteModal } from '../../components/desembolso/ver-lote-modal/ver-lote-modal';
import { claseEstadoLote, nombrePeriodo, RangoFechas, rangosRapidos } from '../../utils/desembolso.utils';

@Component({
  selector: 'app-pago-comision-page',
  imports: [
    RouterLink, FormsModule, DatePipe, CurrencyPipe, PaginationAllComponent,
    GestionPagosModal, NotificacionesLoteModal, VerLoteModal,
  ],
  templateUrl: './pago-comision-page.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class PagoComisionPage {
  private desembolsoService = inject(DesembolsoService);
  private notificacionService = inject(NotificacionLoteService);

  readonly rangos = rangosRapidos();
  readonly nombrePeriodo = nombrePeriodo;
  readonly claseEstado = claseEstadoLote;

  // Filtros
  fechaDesde = signal('');
  fechaHasta = signal('');
  loteFiltro = signal('');

  isLoading = signal(false);
  lotes = signal<ILoteDesembolso[]>([]);
  pagination = signal<IPagination>({ page: 1, pageSize: 10, totalItems: 0 });
  /** Totales de notificaciones por lote (para el contador del botón) */
  notificaciones = signal<Map<string, IConteoNotificaciones>>(new Map());

  // Modales
  loteGestion = signal<ILoteDesembolso | null>(null);
  loteNotificaciones = signal<ILoteDesembolso | null>(null);
  loteVer = signal<ILoteDesembolso | null>(null);

  ngOnInit() {
    this.fetchData();
  }

  async fetchData() {
    if (this.isLoading()) return;
    this.isLoading.set(true);

    const resp = await this.desembolsoService.listarLotes({
      page: this.pagination().page,
      limit: this.pagination().pageSize,
      fechaDesde: this.fechaDesde(),
      fechaHasta: this.fechaHasta(),
      lote: this.loteFiltro().trim().toUpperCase(),
      estados: ESTADOS_PAGO_COMISION.join(','),
    });

    if (resp?.data) {
      this.lotes.set(resp.data);
      this.pagination.update(p => ({
        ...p,
        page: resp.metadata?.page ?? p.page,
        pageSize: resp.metadata?.limit ?? p.pageSize,
        totalItems: resp.metadata?.total ?? resp.data.length,
      }));
    } else {
      this.lotes.set([]);
      this.pagination.update(p => ({ ...p, page: 1, totalItems: 0 }));
    }

    this.isLoading.set(false);
    this.cargarNotificaciones(this.lotes());
  }

  /** Un resumen por lote de la página; si alguno falla, su botón queda sin contador */
  private async cargarNotificaciones(lotes: ILoteDesembolso[]) {
    const resumenes = await Promise.all(lotes.map(l => this.notificacionService.resumenPorLote(l.id)));
    this.notificaciones.set(new Map(
      lotes.flatMap((l, i) => resumenes[i]?.data ? [[l.id, resumenes[i]!.data.totales] as const] : [])
    ));
  }

  async actualizarNotificaciones(lote: ILoteDesembolso) {
    const resp = await this.notificacionService.resumenPorLote(lote.id);
    if (!resp?.data) return;
    this.notificaciones.update(actual => new Map(actual).set(lote.id, resp.data.totales));
  }

  conteo(lote: ILoteDesembolso): IConteoNotificaciones | null {
    return this.notificaciones().get(lote.id) ?? null;
  }

  /** Hay algo que atender: mensajes sin leer o por responder */
  pendientes(lote: ILoteDesembolso): boolean {
    const c = this.conteo(lote);
    return !!c && (c.sinLeer > 0 || c.porResponder > 0);
  }

  tituloNotificaciones(lote: ILoteDesembolso): string {
    const c = this.conteo(lote);
    if (!c) return 'Notificaciones';
    return `Notificaciones: ${c.abiertas} abiertas · ${c.sinLeer} sin leer · ${c.porResponder} por responder`;
  }

  buscar() {
    this.pagination.update(p => ({ ...p, page: 1 }));
    this.fetchData();
  }

  limpiarFiltros() {
    this.fechaDesde.set('');
    this.fechaHasta.set('');
    this.loteFiltro.set('');
    this.buscar();
  }

  /** Los botones de rango solo llenan las fechas y buscan */
  aplicarRango(rango: RangoFechas) {
    this.fechaDesde.set(rango.desde);
    this.fechaHasta.set(rango.hasta);
    this.buscar();
  }

  rangoActivo(rango: RangoFechas): boolean {
    return this.fechaDesde() === rango.desde && this.fechaHasta() === rango.hasta;
  }

  onChangePage(newPagination: IPagination) {
    this.pagination.set(newPagination);
    this.fetchData();
  }
}
