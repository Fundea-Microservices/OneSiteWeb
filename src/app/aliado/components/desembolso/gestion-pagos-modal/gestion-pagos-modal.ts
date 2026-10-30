import { ChangeDetectionStrategy, Component, computed, CUSTOM_ELEMENTS_SCHEMA, inject, input, output, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, NgTemplateOutlet } from '@angular/common';
import { DesembolsoService } from '../../../../../services/aliado/desembolso.service';
import { NotificacionLoteService } from '../../../../../services/aliado/notificacion-lote.service';
import { CatalogosBantotalService } from '../../../../../services/api-bantotal/catalogos.service';
import { IConteoNotificaciones, IPagoEmpresa, IPagosLote } from '../../../../../interfaces/aliado/desembolso';
import { claseEstadoLote, nombreAgenciaEmpresa, nombrePeriodo, puedePagar } from '../../../utils/desembolso.utils';
import { ClientesEmpresaModal } from '../clientes-empresa-modal/clientes-empresa-modal';
import { NotificacionesLoteModal } from '../notificaciones-lote-modal/notificaciones-lote-modal';
import { RegistrarPagoModal } from '../registrar-pago-modal/registrar-pago-modal';
import { ResolverLoteModal } from '../resolver-lote-modal/resolver-lote-modal';

type Seccion = 'datos' | 'empresas' | 'conciliacion';

/** Ventana "Gestión de Pagos y Transferencias por Empresa" de un lote APROBADO */
@Component({
  selector: 'app-gestion-pagos-modal',
  imports: [
    CurrencyPipe, DatePipe, NgTemplateOutlet,
    ClientesEmpresaModal, NotificacionesLoteModal, RegistrarPagoModal, ResolverLoteModal,
  ],
  templateUrl: './gestion-pagos-modal.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'onEscape()' },
})
export class GestionPagosModal {
  private desembolsoService = inject(DesembolsoService);
  private notificacionService = inject(NotificacionLoteService);
  private catalogosService = inject(CatalogosBantotalService);

  loteId = input.required<string>();

  cerrar = output<void>();
  /** Se emite al registrar pagos o cambiar notificaciones, para que el listado se recargue */
  actualizado = output<void>();

  readonly claseEstado = claseEstadoLote;

  isLoading = signal(false);
  pagos = signal<IPagosLote | null>(null);
  /** Región por empresa (clave en mayúsculas): el estado de pagos no la incluye, viene del resumen de comisiones */
  regionEmpresa = signal<Map<string, number | null>>(new Map());
  /** Código de agencia por empresa (clave en mayúsculas), también del resumen de comisiones */
  agenciaEmpresa = signal<Map<string, number | null>>(new Map());
  regiones = signal<Map<string, string>>(new Map());
  agencias = signal<Map<string, string>>(new Map());
  /** Conteos de notificaciones por empresa (clave en mayúsculas) */
  notificaciones = signal<Map<string, IConteoNotificaciones>>(new Map());

  empresaClientes = signal<IPagoEmpresa | null>(null);
  /** Empresa con la que se abrió el historial de notificaciones */
  empresaNotificaciones = signal<string | null>(null);
  /** Empresa con la que se abrió el registro de comprobante ('' = la primera pendiente) */
  empresaPago = signal<string | null>(null);
  pagando = signal(false);

  seccionesCerradas = signal<Set<Seccion>>(new Set());

  lote = computed(() => this.pagos()?.lote ?? null);
  periodoLabel = computed(() => nombrePeriodo(this.lote()?.periodo));
  totales = computed(() => this.pagos()?.totales ?? null);

  progreso = computed(() => {
    const t = this.totales();
    return t?.empresas ? Math.round((t.pagadas / t.empresas) * 100) : 0;
  });

  /** Empresas con monto > 0 que aún no tienen comprobante */
  transferenciasPendientes = computed(() =>
    (this.pagos()?.empresas ?? []).filter(e => e.estadoPago === 'PENDIENTE' && e.requiereTransferencia)
  );

  /**
   * "Marcar como Pagado" registra en Q0.00 las empresas sin comisión que falten y cierra el lote;
   * solo procede cuando ya no quedan transferencias pendientes
   */
  puedeMarcarPagado = computed(() => {
    const lote = this.lote();
    return !!lote && puedePagar(lote) && this.transferenciasPendientes().length === 0;
  });

  ngOnInit() {
    this.cargarRegiones();
    this.catalogosService.mapaAgencias().then(agencias => this.agencias.set(agencias));
    this.cargar();
    this.cargarRegionEmpresas();
    this.cargarNotificaciones();
  }

  async cargar() {
    this.isLoading.set(true);
    const resp = await this.desembolsoService.obtenerPagos(this.loteId());
    this.pagos.set(resp?.data ?? null);
    this.isLoading.set(false);
  }

  private async cargarRegionEmpresas() {
    const resp = await this.desembolsoService.obtenerComisiones(this.loteId());
    const empresas = resp?.data?.empresas ?? [];
    this.regionEmpresa.set(new Map(empresas.map(e => [e.idEmpresa.toUpperCase(), e.regionId])));
    this.agenciaEmpresa.set(new Map(empresas.map(e => [e.idEmpresa.toUpperCase(), e.agenciaId])));
  }

  async cargarNotificaciones() {
    const resp = await this.notificacionService.resumenPorLote(this.loteId());
    this.notificaciones.set(new Map(
      (resp?.data?.empresas ?? []).map(e => [e.idEmpresa.toUpperCase(), e])
    ));
  }

  private cargarRegiones() {
    this.catalogosService.listarCatalogos({ grupo: 'region', all: true }).subscribe({
      next: (result) => {
        const catalogos: any[] = (result as any)?.data?.data?.catalogos
          ?? (result as any)?.data?.catalogos
          ?? [];
        this.regiones.set(new Map(catalogos.map(r => [String(r.valorCore), r.nombre])));
      },
    });
  }

  nombreRegion(e: IPagoEmpresa): string {
    const regionId = this.regionEmpresa().get(e.idEmpresa.toUpperCase());
    if (regionId === null || regionId === undefined) return '—';
    return this.regiones().get(String(regionId)) ?? String(regionId);
  }

  nombreAgencia(e: IPagoEmpresa): string {
    return nombreAgenciaEmpresa(e.agenciaNombre, this.agenciaEmpresa().get(e.idEmpresa.toUpperCase()), this.agencias());
  }

  conteoNotificaciones(e: IPagoEmpresa): IConteoNotificaciones | null {
    return this.notificaciones().get(e.idEmpresa.toUpperCase()) ?? null;
  }

  abierta(seccion: Seccion): boolean {
    return !this.seccionesCerradas().has(seccion);
  }

  toggleSeccion(seccion: Seccion) {
    this.seccionesCerradas.update(actual => {
      const nuevas = new Set(actual);
      if (nuevas.has(seccion)) nuevas.delete(seccion);
      else nuevas.add(seccion);
      return nuevas;
    });
  }

  onNotificacionesActualizadas() {
    this.cargarNotificaciones();
    this.actualizado.emit();
  }

  /** La ventana de registro sigue abierta con el estado actualizado (para registrar la siguiente) */
  onPagoRegistrado(pagos: IPagosLote) {
    this.pagos.set(pagos);
    this.actualizado.emit();
  }

  onLotePagado() {
    this.pagando.set(false);
    this.cargar();
    this.actualizado.emit();
  }

  /** Esc cierra solo la ventana de clientes; las demás se cierran con sus botones */
  onEscape() {
    if (this.empresaClientes()) this.empresaClientes.set(null);
    else if (this.empresaNotificaciones() === null && this.empresaPago() === null && !this.pagando()) this.cerrar.emit();
  }
}
