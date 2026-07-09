import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { PartidasContablesService } from '../../../../services/erp-bc/partidas-contables.service';
import { CargarPartidasData } from '../../../../interfaces/erp-bc/partidas-contables';

@Component({
  selector: 'app-ejecutar-carga-asientos-contables-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './ejecutar-carga-asientos-contables-page.html',
  styleUrl: './ejecutar-carga-asientos-contables-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class EjecutarCargaAsientosContablesPage {

  private service = inject(PartidasContablesService);

  fecha = signal('');
  todos = signal(true);

  isLoading = signal(false);
  errorMsg  = signal('');
  mensaje   = signal('');
  resultado = signal<CargarPartidasData | null>(null);
  ejecutado = signal(false);

  /** Máxima fecha permitida: ayer (no se permite hoy ni fechas futuras). */
  get maxFecha(): string {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return this.toLocalDateString(d);
  }

  get fechaValida(): boolean {
    const f = this.fecha();
    return !!f && f <= this.maxFecha;
  }

  private toLocalDateString(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  async ejecutar() {
    if (!this.fechaValida || this.isLoading()) return;

    this.isLoading.set(true);
    this.errorMsg.set('');
    this.mensaje.set('');
    this.resultado.set(null);
    this.ejecutado.set(false);

    try {
      const resp = await firstValueFrom(
        this.service.cargar({ fecha: this.fecha(), todos: this.todos() })
      );
      if (resp?.success) {
        this.resultado.set(resp.data);
        this.mensaje.set(resp.message);
      } else {
        this.errorMsg.set(resp?.message ?? 'No se pudieron cargar las partidas contables.');
      }
    } catch (error: any) {
      this.errorMsg.set(
        error?.error?.message ?? error?.message ?? 'Error al cargar las partidas contables.'
      );
    } finally {
      this.isLoading.set(false);
      this.ejecutado.set(true);
    }
  }
}
