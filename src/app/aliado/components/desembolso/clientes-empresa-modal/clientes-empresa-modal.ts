import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, inject, input, output, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { DesembolsoService } from '../../../../../services/aliado/desembolso.service';
import { IClientesEmpresa, IDesembolsoReferido } from '../../../../../interfaces/aliado/desembolso';

/** Clientes referidos de una empresa dentro de un lote (solo lectura) */
@Component({
  selector: 'app-clientes-empresa-modal',
  imports: [CurrencyPipe, DatePipe],
  templateUrl: './clientes-empresa-modal.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientesEmpresaModal {
  private desembolsoService = inject(DesembolsoService);

  loteId = input.required<string>();
  empresaId = input.required<string>();
  /** Se muestra en el título mientras carga */
  nombreEmpresa = input<string | null>(null);

  cerrar = output<void>();

  isLoading = signal(false);
  data = signal<IClientesEmpresa | null>(null);

  ngOnInit() {
    this.cargar();
  }

  async cargar() {
    this.isLoading.set(true);
    const resp = await this.desembolsoService.obtenerClientesEmpresa(this.loteId(), this.empresaId());
    this.data.set(resp?.data ?? null);
    this.isLoading.set(false);
  }

  /** "Juan P." */
  nombreCorto(r: IDesembolsoReferido): string {
    const inicial = r.primerApellido?.trim().charAt(0);
    return [r.primerNombre, inicial ? `${inicial}.` : ''].filter(Boolean).join(' ');
  }
}
