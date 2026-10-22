import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DesembolsoService } from '../../../../services/aliado/desembolso.service';
import { AuthService } from '../../../../services/auth.service';
import { ESTADOS_APROBACION_PAGO, EstadoLote, ILoteDesembolso } from '../../../../interfaces/aliado/desembolso';
import { PaginationAllComponent } from '../../../shared/components/pagination-all/pagination-all';
import { ResolverLoteModal } from '../../components/desembolso/resolver-lote-modal/resolver-lote-modal';
import { VerLoteModal } from '../../components/desembolso/ver-lote-modal/ver-lote-modal';
import { ComisionesLoteModal } from '../../components/desembolso/comisiones-lote-modal/comisiones-lote-modal';
import {
  claseEstadoLote,
  mismoUsuario,
  nombrePeriodo,
  puedePagar,
  puedeRechazar,
  RangoFechas,
  rangosRapidos,
} from '../../utils/desembolso.utils';

@Component({
  selector: 'app-aprobacion-lotes-page',
  imports: [
    RouterLink, FormsModule, DatePipe, CurrencyPipe, PaginationAllComponent,
    ResolverLoteModal, VerLoteModal, ComisionesLoteModal,
  ],
  templateUrl: './aprobacion-lotes-page.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class AprobacionLotesPage {
  private desembolsoService = inject(DesembolsoService);
  private authService = inject(AuthService);

  readonly estados = ESTADOS_APROBACION_PAGO;
  readonly rangos = rangosRapidos();
  readonly nombrePeriodo = nombrePeriodo;
  readonly claseEstado = claseEstadoLote;
  readonly puedePagar = puedePagar;

  get usuarioId(): string {
    return this.authService.getUserStorage()?.userId;
  }

  // Filtros
  fechaDesde = signal('');
  fechaHasta = signal('');
  loteFiltro = signal('');
  estadoFiltro = signal<EstadoLote | ''>('');

  isLoading = signal(false);
  lotes = signal<ILoteDesembolso[]>([]);
  pagination = signal<IPagination>({ page: 1, pageSize: 10, totalItems: 0 });

  // Modales
  loteComisiones = signal<ILoteDesembolso | null>(null);
  loteVer = signal<ILoteDesembolso | null>(null);
  loteRechazar = signal<ILoteDesembolso | null>(null);
  lotePagar = signal<ILoteDesembolso | null>(null);

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
      estados: this.estadoFiltro() || this.estados.join(','),
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
  }

  buscar() {
    this.pagination.update(p => ({ ...p, page: 1 }));
    this.fetchData();
  }

  limpiarFiltros() {
    this.fechaDesde.set('');
    this.fechaHasta.set('');
    this.loteFiltro.set('');
    this.estadoFiltro.set('');
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

  // ─── Acciones ──────────────────────────────────────────────────────────────

  /** En esta vista solo se rechazan lotes PROCESADO, y lo hace alguien distinto a quien validó */
  puedeRechazar(lote: ILoteDesembolso) {
    return lote.estado === 'PROCESADO' && puedeRechazar(lote, this.usuarioId);
  }

  esperaOtroUsuario(lote: ILoteDesembolso) {
    return lote.estado === 'PROCESADO' && mismoUsuario(lote.usuarioIdProceso, this.usuarioId);
  }

  onLoteRechazado() {
    this.loteRechazar.set(null);
    this.fetchData();
  }

  onLotePagado() {
    this.lotePagar.set(null);
    this.fetchData();
  }
}
