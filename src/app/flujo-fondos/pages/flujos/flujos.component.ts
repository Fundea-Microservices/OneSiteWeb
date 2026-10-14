import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, inject, OnInit, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CLASE_ESTADO_FLUJO, EstadoFlujo, ESTADOS_FLUJO, IFlujoEncabezado } from '../../../../interfaces/flujo-fondos';
import { FlujoFondosService } from '../../../../services/flujo-fondos/flujo-fondos.service';
import { PaginationComponent } from '../../../shared/components/pagination/pagination';
import { formatoPeriodo } from '../../utils/flujo';

/** Bandeja de flujos de fondos (GET /flujo-fondos/flujos, paginado). */
@Component({
  selector: 'app-flujos',
  imports: [RouterLink, DatePipe, DecimalPipe, PaginationComponent],
  templateUrl: './flujos.component.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class FlujosComponent implements OnInit {

  flujoService = inject(FlujoFondosService);

  readonly estados = ESTADOS_FLUJO;
  readonly claseEstado = CLASE_ESTADO_FLUJO;
  readonly formatoPeriodo = formatoPeriodo;

  flujosList = signal<IFlujoEncabezado[]>([]);
  isLoading = signal(false);
  pagination = signal<IPagination>({
    page: 1,
    pageSize: 10,
    totalItems: 0
  });

  // Filtros: '' = Todos (no se envía el parámetro)
  buscador = signal('');
  numeroSolicitud = signal('');
  estadoFilter = signal<EstadoFlujo | ''>('');

  ngOnInit() {
    this.fetchData();
  }

  async fetchData() {
    if (this.isLoading()) return;
    this.isLoading.set(true);
    const numero = Number(this.numeroSolicitud());
    const resp = await this.flujoService.getFlujos({
      page: this.pagination().page,
      limit: this.pagination().pageSize,
      search: this.buscador().trim(),
      numeroSolicitud: Number.isInteger(numero) && numero > 0 ? numero : undefined,
      estado: this.estadoFilter(),
    });
    if (resp) {
      const { flujos, metadata } = resp.data;
      this.flujosList.set(flujos);
      this.pagination.set({
        page: metadata.page,
        pageSize: metadata.limit,
        totalItems: metadata.total
      });
    }
    this.isLoading.set(false);
  }

  buscar() {
    this.pagination.update(p => ({ ...p, page: 1 }));
    this.fetchData();
  }

  /** Solo dígitos: el número de solicitud es entero. */
  onNumeroSolicitud(input: HTMLInputElement) {
    const numero = input.value.replace(/\D/g, '');
    input.value = numero;
    this.numeroSolicitud.set(numero);
  }

  onEstadoChange(estado: string) {
    this.estadoFilter.set(estado as EstadoFlujo | '');
    this.buscar();
  }

  onChangePage(newPagination: IPagination) {
    this.flujosList.set([]);
    this.pagination.set(newPagination);
    this.fetchData();
  }
}
