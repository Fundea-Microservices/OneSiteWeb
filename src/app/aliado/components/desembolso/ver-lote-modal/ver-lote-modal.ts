import { ChangeDetectionStrategy, Component, computed, CUSTOM_ELEMENTS_SCHEMA, inject, input, output, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DesembolsoService } from '../../../../../services/aliado/desembolso.service';
import { EstadoValidacion, IDesembolsoReferido, ILoteDesembolso } from '../../../../../interfaces/aliado/desembolso';
import { PaginationAllComponent } from '../../../../shared/components/pagination-all/pagination-all';
import { claseEstadoLote, nombrePeriodo } from '../../../utils/desembolso.utils';

/** Detalle de un lote en modo solo lectura */
@Component({
  selector: 'app-ver-lote-modal',
  imports: [FormsModule, DatePipe, CurrencyPipe, PaginationAllComponent],
  templateUrl: './ver-lote-modal.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'cerrar.emit()' },
})
export class VerLoteModal {
  private desembolsoService = inject(DesembolsoService);

  lote = input.required<ILoteDesembolso>();
  cerrar = output<void>();

  readonly claseEstado = claseEstadoLote;

  isLoading = signal(false);
  registros = signal<IDesembolsoReferido[]>([]);

  busqueda = signal('');
  filtroValidacion = signal<EstadoValidacion | ''>('');
  pagination = signal<IPagination>({ page: 1, pageSize: 10, totalItems: 0 });

  periodoLabel = computed(() => nombrePeriodo(this.lote().periodo));

  registrosFiltrados = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    const filtro = this.filtroValidacion();

    return this.registros().filter(r => {
      if (filtro === 'PENDIENTE' && r.validado !== null) return false;
      if (filtro === 'VALIDO' && r.validado !== true) return false;
      if (filtro === 'NO_VALIDO' && r.validado !== false) return false;
      if (!texto) return true;
      return [r.dpi, this.nombreCliente(r), r.nombreEmpresa, r.username, r.cuenta, r.operacion]
        .some(v => (v ?? '').toString().toLowerCase().includes(texto));
    });
  });

  registrosPagina = computed(() => {
    const { page, pageSize } = this.pagination();
    const inicio = (page - 1) * pageSize;
    return this.registrosFiltrados().slice(inicio, inicio + pageSize);
  });

  paginationView = computed<IPagination>(() => ({
    ...this.pagination(),
    totalItems: this.registrosFiltrados().length,
  }));

  ngOnInit() {
    this.cargar();
  }

  async cargar() {
    this.isLoading.set(true);
    const resp = await this.desembolsoService.listarDetalle(this.lote().id, {
      page: 1,
      limit: Math.max(this.lote().desembolsos, 1),
    });
    this.registros.set(resp?.data ?? []);
    this.isLoading.set(false);
  }

  nombreCliente(r: IDesembolsoReferido): string {
    return [r.primerNombre, r.segundoNombre, r.primerApellido, r.segundoApellido].filter(Boolean).join(' ');
  }

  onBusqueda(valor: string) {
    this.busqueda.set(valor);
    this.pagination.update(p => ({ ...p, page: 1 }));
  }

  onFiltroValidacion(valor: EstadoValidacion | '') {
    this.filtroValidacion.set(valor);
    this.pagination.update(p => ({ ...p, page: 1 }));
  }

  onChangePage(newPagination: IPagination) {
    this.pagination.set(newPagination);
  }
}
