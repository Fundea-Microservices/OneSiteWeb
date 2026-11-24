import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DesembolsoService } from '../../../../services/aliado/desembolso.service';
import { ESTADOS_LOTE, EstadoLote, ILoteDesembolso } from '../../../../interfaces/aliado/desembolso';
import { PaginationAllComponent } from '../../../shared/components/pagination-all/pagination-all';
import { FechaInput } from '../../../shared/components/fecha-input/fecha-input';
import { AccionResolucion, ResolverLoteModal } from '../../components/desembolso/resolver-lote-modal/resolver-lote-modal';
import { VerLoteModal } from '../../components/desembolso/ver-lote-modal/ver-lote-modal';
import {
  claseEstadoLote,
  mesesCerrados,
  nombrePeriodo,
  puedeAprobar,
  puedeRechazar,
  puedeValidar,
} from '../../utils/desembolso.utils';

@Component({
  selector: 'app-lotes-desembolso-page',
  imports: [RouterLink, FormsModule, DatePipe, CurrencyPipe, PaginationAllComponent, FechaInput, ResolverLoteModal, VerLoteModal],
  templateUrl: './lotes-desembolso-page.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class LotesDesembolsoPage {
  private desembolsoService = inject(DesembolsoService);
  private router = inject(Router);

  readonly estados = ESTADOS_LOTE;
  readonly mesesDisponibles = mesesCerrados(12);
  readonly nombrePeriodo = nombrePeriodo;
  readonly claseEstado = claseEstadoLote;

  // Filtros
  fechaDesde = signal('');
  fechaHasta = signal('');
  loteFiltro = signal('');
  estadoFiltro = signal<EstadoLote | ''>('');

  isLoading = signal(false);
  lotes = signal<ILoteDesembolso[]>([]);
  pagination = signal<IPagination>({ page: 1, pageSize: 10, totalItems: 0 });

  // Generar lote
  modalGenerarOpen = signal(false);
  periodoSeleccionado = signal(this.mesesDisponibles[0]?.value ?? '');
  isGenerating = signal(false);

  // Ver detalle (solo lectura)
  loteVer = signal<ILoteDesembolso | null>(null);

  // Aprobar / rechazar
  loteResolver = signal<ILoteDesembolso | null>(null);
  accionResolver = signal<AccionResolucion>('aprobar');

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
      estado: this.estadoFiltro() || undefined,
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

  onChangePage(newPagination: IPagination) {
    this.pagination.set(newPagination);
    this.fetchData();
  }

  // ─── Generar lote ──────────────────────────────────────────────────────────

  abrirGenerar() {
    this.periodoSeleccionado.set(this.mesesDisponibles[0]?.value ?? '');
    this.modalGenerarOpen.set(true);
  }

  cerrarGenerar() {
    if (!this.isGenerating()) this.modalGenerarOpen.set(false);
  }

  async generarLote() {
    if (!this.periodoSeleccionado() || this.isGenerating()) return;

    this.isGenerating.set(true);
    const resp = await this.desembolsoService.generarLote({ periodo: this.periodoSeleccionado() });
    this.isGenerating.set(false);

    if (resp?.data) {
      this.modalGenerarOpen.set(false);
      this.router.navigate(['/aliado/desembolso', resp.data.id]);
    }
  }

  // ─── Acciones ──────────────────────────────────────────────────────────────

  puedeValidar(lote: ILoteDesembolso) {
    return puedeValidar(lote);
  }

  puedeAprobar(lote: ILoteDesembolso) {
    return puedeAprobar(lote);
  }

  puedeRechazar(lote: ILoteDesembolso) {
    return puedeRechazar(lote);
  }

  abrirResolver(lote: ILoteDesembolso, accion: AccionResolucion) {
    this.accionResolver.set(accion);
    this.loteResolver.set(lote);
  }

  onLoteResuelto(lote: ILoteDesembolso) {
    this.lotes.update(lista => lista.map(l => (l.id === lote.id ? lote : l)));
    this.loteResolver.set(null);
  }
}
