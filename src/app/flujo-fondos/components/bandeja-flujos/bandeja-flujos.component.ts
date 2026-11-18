import { ChangeDetectionStrategy, Component, computed, CUSTOM_ELEMENTS_SCHEMA, inject, input, OnInit, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CLASE_ESTADO_FLUJO, EstadoFlujo, ESTADOS_FLUJO, IFlujoEncabezado } from '../../../../interfaces/flujo-fondos';
import { Agencia, Region } from '../../../../interfaces/api-bantotal/sucursales';
import { FlujoFondosService } from '../../../../services/flujo-fondos/flujo-fondos.service';
import { SucursalesBantotalService } from '../../../../services/api-bantotal/sucursales.service';
import { PaginationComponent } from '../../../shared/components/pagination/pagination';
import { formatoPeriodo } from '../../utils/flujo';

/**
 * Bandeja de flujos de fondos (GET /flujo-fondos/flujos, paginado) con sus filtros.
 * - gestion: la del asesor; "Ver" abre el flujo para editarlo y se puede crear uno nuevo.
 * - aprobacion: la del analista; "Aprobar" abre el expediente en /flujo-fondos/aprobacion/revisar.
 */
@Component({
  selector: 'app-bandeja-flujos',
  imports: [RouterLink, DatePipe, DecimalPipe, PaginationComponent],
  templateUrl: './bandeja-flujos.component.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BandejaFlujosComponent implements OnInit {

  private flujoService = inject(FlujoFondosService);
  private sucursalesService = inject(SucursalesBantotalService);

  modo = input<'gestion' | 'aprobacion'>('gestion');

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
  regionFilter = signal('');   // id de Bantotal como texto (valor del select)
  agenciaFilter = signal('');

  // Regiones y agencias de Bantotal: son los mismos ids que el flujo copia de la solicitud
  regiones = signal<Region[]>([]);
  agencias = signal<Agencia[]>([]);
  cargandoSucursales = signal(false);

  /** Agencias de la región elegida; sin región, todas. */
  agenciasFiltradas = computed(() => {
    const region = this.regionFilter();
    const agencias = this.agencias();
    return region ? agencias.filter(a => String(a.regionId) === region) : agencias;
  });

  ngOnInit() {
    this.fetchData();
    this.cargarSucursales();
  }

  private async cargarSucursales() {
    this.cargandoSucursales.set(true);
    const data = await this.sucursalesService.getTodasLasSucursales();
    if (data) {
      const porNombre = (a: { descripcion: string }, b: { descripcion: string }) => a.descripcion.localeCompare(b.descripcion);
      this.regiones.set([...data.regiones].sort(porNombre));
      this.agencias.set([...data.agencias].sort(porNombre));
    }
    this.cargandoSucursales.set(false);
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
      regionId: Number(this.regionFilter()) || undefined,
      agenciaId: Number(this.agenciaFilter()) || undefined,
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

  /** Al cambiar de región se limpia la agencia: podría no pertenecer a la nueva región. */
  onRegionChange(regionId: string) {
    this.regionFilter.set(regionId);
    this.agenciaFilter.set('');
    this.buscar();
  }

  onAgenciaChange(agenciaId: string) {
    this.agenciaFilter.set(agenciaId);
    this.buscar();
  }

  onChangePage(newPagination: IPagination) {
    this.flujosList.set([]);
    this.pagination.set(newPagination);
    this.fetchData();
  }

  /** Solo CREADO y CORREGIDO se pueden aprobar; los demás se abren para consulta. */
  esAprobable(estado: EstadoFlujo): boolean {
    return estado === 'CREADO' || estado === 'CORREGIDO';
  }
}
