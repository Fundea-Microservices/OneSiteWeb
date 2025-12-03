import { ChangeDetectionStrategy, Component, signal, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import GenerarGytPage from '../../gyt/pages/generar-gyt-page/generar-gyt-page';

interface Banco {
  id: string;
  nombre: string;
  codigo: string;
  disponible: boolean;
}

@Component({
  selector: 'app-generar-orden-page',
  standalone: true,
  imports: [CommonModule, FormsModule, GenerarGytPage],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './generar-orden-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class GenerarOrdenPage {
  
  // Lista de bancos disponibles
  bancos = signal<Banco[]>([
    {
      id: 'gyt',
      nombre: 'Banco GyT Continental',
      codigo: 'GYT',
      disponible: true
    },
    {
      id: 'banrural',
      nombre: 'Banrural',
      codigo: 'BANRURAL',
      disponible: false
    },
    {
      id: 'bac',
      nombre: 'BAC Credomatic',
      codigo: 'BAC',
      disponible: false
    }
  ]);

  // Banco seleccionado
  bancoSeleccionado = signal<string | null>(null);

  /**
   * Selecciona un banco para generar la orden
   */
  seleccionarBanco(bancoId: string) {
    this.bancoSeleccionado.set(bancoId);
  }

  /**
   * Vuelve a la selección de banco
   */
  volverSeleccion() {
    this.bancoSeleccionado.set(null);
  }

  /**
   * Obtiene el banco actualmente seleccionado
   */
  getBancoActual(): Banco | undefined {
    const bancoId = this.bancoSeleccionado();
    if (!bancoId) return undefined;
    return this.bancos().find(b => b.id === bancoId);
  }
}
