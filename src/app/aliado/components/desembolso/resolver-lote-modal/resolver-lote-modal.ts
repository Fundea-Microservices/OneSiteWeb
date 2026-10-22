import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DesembolsoService } from '../../../../../services/aliado/desembolso.service';
import { ILoteDesembolso } from '../../../../../interfaces/aliado/desembolso';
import { nombrePeriodo } from '../../../utils/desembolso.utils';

export type AccionResolucion = 'aprobar' | 'rechazar' | 'pagar';

const TEXTOS: Record<AccionResolucion, { titulo: string; boton: string; etiqueta: string; placeholder: string }> = {
  aprobar: {
    titulo: 'Aprobar lote',
    boton: 'Aprobar',
    etiqueta: 'Observaciones (opcional)',
    placeholder: 'Observaciones de la aprobación',
  },
  rechazar: {
    titulo: 'Rechazar lote',
    boton: 'Rechazar',
    etiqueta: 'Motivo del rechazo',
    placeholder: 'Indique el motivo del rechazo',
  },
  pagar: {
    titulo: 'Marcar como pagado el lote',
    boton: 'Marcar como Pagado',
    etiqueta: 'Observaciones del pago (opcional)',
    placeholder: 'Ej. Transferencias del 25/10',
  },
};

@Component({
  selector: 'app-resolver-lote-modal',
  imports: [FormsModule, CurrencyPipe],
  templateUrl: './resolver-lote-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResolverLoteModal {
  private desembolsoService = inject(DesembolsoService);

  lote = input.required<ILoteDesembolso>();
  accion = input.required<AccionResolucion>();

  resuelto = output<ILoteDesembolso>();
  cerrar = output<void>();

  readonly maxLength = 500;
  observaciones = signal('');
  isSaving = signal(false);

  esRechazo = computed(() => this.accion() === 'rechazar');
  esPago = computed(() => this.accion() === 'pagar');
  textos = computed(() => TEXTOS[this.accion()]);
  periodoLabel = computed(() => nombrePeriodo(this.lote().periodo));
  formularioValido = computed(() => !this.esRechazo() || this.observaciones().trim().length > 0);

  async confirmar() {
    if (!this.formularioValido() || this.isSaving()) return;

    this.isSaving.set(true);
    const id = this.lote().id;
    const observaciones = this.observaciones().trim();
    const opcional = observaciones ? { observaciones } : {};
    const resp =
      this.accion() === 'rechazar' ? await this.desembolsoService.rechazarLote(id, { observaciones }) :
      this.accion() === 'pagar' ? await this.desembolsoService.pagarLote(id, opcional) :
      await this.desembolsoService.aprobarLote(id, opcional);
    this.isSaving.set(false);

    if (resp?.data) {
      this.resuelto.emit(resp.data);
    }
  }

  onCerrar() {
    if (!this.isSaving()) this.cerrar.emit();
  }
}
