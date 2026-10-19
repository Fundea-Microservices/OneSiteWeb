import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DesembolsoService } from '../../../../../services/aliado/desembolso.service';
import { ILoteDesembolso } from '../../../../../interfaces/aliado/desembolso';
import { nombrePeriodo } from '../../../utils/desembolso.utils';

export type AccionResolucion = 'aprobar' | 'rechazar';

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
  periodoLabel = computed(() => nombrePeriodo(this.lote().periodo));
  formularioValido = computed(() => !this.esRechazo() || this.observaciones().trim().length > 0);

  async confirmar() {
    if (!this.formularioValido() || this.isSaving()) return;

    this.isSaving.set(true);
    const observaciones = this.observaciones().trim();
    const resp = this.esRechazo()
      ? await this.desembolsoService.rechazarLote(this.lote().id, { observaciones })
      : await this.desembolsoService.aprobarLote(this.lote().id, observaciones ? { observaciones } : {});
    this.isSaving.set(false);

    if (resp?.data) {
      this.resuelto.emit(resp.data);
    }
  }

  onCerrar() {
    if (!this.isSaving()) this.cerrar.emit();
  }
}
