import { ChangeDetectionStrategy, Component, computed, CUSTOM_ELEMENTS_SCHEMA, inject, input, output, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { DesembolsoService } from '../../../../../services/aliado/desembolso.service';
import { IPagoEmpresa, IPagosLote } from '../../../../../interfaces/aliado/desembolso';
import { hoyGuatemala, mismoUsuario, nombrePeriodo } from '../../../utils/desembolso.utils';

/**
 * "Registrar Comprobante de Transferencia Bancaria" de una empresa del lote.
 * El monto no se edita: el backend lo toma de la comisión aprobada.
 */
@Component({
  selector: 'app-registrar-pago-modal',
  imports: [FormsModule, CurrencyPipe, DatePipe],
  templateUrl: './registrar-pago-modal.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegistrarPagoModal {
  private desembolsoService = inject(DesembolsoService);
  private toastr = inject(ToastrService);

  pagos = input.required<IPagosLote>();
  /** Empresa con la que se abre la ventana; sin ella se elige la primera pendiente */
  idEmpresa = input<string | null>(null);

  /** Respuesta del API con el estado de pagos del lote ya actualizado */
  registrado = output<IPagosLote>();
  cerrar = output<void>();

  readonly maxComprobante = 50;
  readonly hoy = hoyGuatemala();

  empresaId = signal('');
  fechaTransferencia = signal(this.hoy);
  numeroComprobante = signal('');
  /** Paso de confirmación: un pago registrado no se puede editar ni anular */
  confirmando = signal(false);
  isSaving = signal(false);

  lote = computed(() => this.pagos().lote);
  periodoLabel = computed(() => nombrePeriodo(this.lote().periodo));

  empresa = computed<IPagoEmpresa | null>(() =>
    this.pagos().empresas.find(e => mismoUsuario(e.idEmpresa, this.empresaId())) ?? null
  );

  pendiente = computed(() => this.empresa()?.estadoPago === 'PENDIENTE');
  /** Pendiente con monto > 0 y sin cuenta bancaria activa: no se puede pagar */
  sinCuenta = computed(() => {
    const e = this.empresa();
    return !!e && this.pendiente() && e.requiereTransferencia && !e.cuentaDestino;
  });

  fechaValida = computed(() => !!this.fechaTransferencia() && this.fechaTransferencia() <= this.hoy);

  formularioValido = computed(() => {
    const e = this.empresa();
    if (!e || !this.pendiente() || this.lote().estado !== 'APROBADO') return false;
    if (!e.requiereTransferencia) return true;
    return !this.sinCuenta() && this.fechaValida() && !!this.numeroComprobante().trim();
  });

  /** Siguiente empresa pendiente, para registrar varias transferencias sin cerrar la ventana */
  siguientePendiente = computed(() =>
    this.pagos().empresas.find(e => e.estadoPago === 'PENDIENTE' && !mismoUsuario(e.idEmpresa, this.empresaId())) ?? null
  );

  ngOnInit() {
    const empresas = this.pagos().empresas;
    const inicial = empresas.find(e => mismoUsuario(e.idEmpresa, this.idEmpresa()))
      ?? empresas.find(e => e.estadoPago === 'PENDIENTE' && e.requiereTransferencia)
      ?? empresas.find(e => e.estadoPago === 'PENDIENTE')
      ?? empresas[0];
    this.empresaId.set(inicial?.idEmpresa ?? '');
  }

  /** "Librería Artemis — Banco Industrial (Q1,200.00) [Pendiente]" */
  etiquetaEmpresa(e: IPagoEmpresa): string {
    const banco = e.requiereTransferencia ? (e.cuentaDestino?.nombreBanco ?? 'Sin cuenta activa') : 'Sin transferencia';
    const monto = `Q${e.monto.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const estado = e.estadoPago === 'PAGADO' ? 'Pagado' : 'Pendiente';
    return `${e.nombreEmpresa || '—'} — ${banco} (${monto}) [${estado}]`;
  }

  onEmpresa(idEmpresa: string) {
    this.empresaId.set(idEmpresa);
    this.fechaTransferencia.set(this.hoy);
    this.numeroComprobante.set('');
    this.confirmando.set(false);
  }

  async copiarCuenta() {
    const numero = this.empresa()?.cuentaDestino?.numeroCuenta;
    if (!numero) return;
    try {
      await navigator.clipboard.writeText(numero);
      this.toastr.info(`No. de cuenta ${numero} copiado`, '', { timeOut: 2000 });
    } catch {
      this.toastr.warning('No se pudo copiar el número de cuenta');
    }
  }

  async guardar() {
    const e = this.empresa();
    if (!e || !this.formularioValido() || this.isSaving()) return;

    this.isSaving.set(true);
    const resp = await this.desembolsoService.registrarPagoEmpresa(
      this.lote().id,
      e.idEmpresa,
      e.requiereTransferencia
        ? { fechaTransferencia: this.fechaTransferencia(), numeroComprobante: this.numeroComprobante().trim() }
        : undefined,
    );
    this.isSaving.set(false);
    this.confirmando.set(false);

    if (resp?.data) {
      this.registrado.emit(resp.data);
    }
  }

  onCerrar() {
    if (!this.isSaving()) this.cerrar.emit();
  }
}
