import { Component, signal, ViewChild, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface OrdenParaAprobar {
  numeroOrden: string;
  banco: string;
  nombreCliente: string;
  tipoDocumento: string;
  numeroDocumento: string;
  monto: number;
  fechaCreacion: Date;
  estado: 'pendiente' | 'aprobado' | 'rechazado';
}

@Component({
  selector: 'app-aprobar-gyt-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './aprobar-gyt-page.html',
  styleUrls: ['./aprobar-gyt-page.css'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export default class AprobarGytPageComponent {
  // Señal para el número de orden a buscar
  numeroOrdenBuscar = signal('');
  
  // Señal para la orden encontrada
  ordenEncontrada = signal<OrdenParaAprobar | null>(null);
  
  // Señal para indicar si se está buscando
  buscando = signal(false);
  
  // Señal para indicar si no se encontró la orden
  noEncontrada = signal(false);
  
  // Señal para controlar el modal de confirmación
  mostrarModal = signal(false);
  
  // Señal para indicar si se está procesando la aprobación
  procesandoAprobacion = signal(false);

  // Datos mock para pruebas (simula órdenes en el sistema)
  private ordenesMock: OrdenParaAprobar[] = [
    {
      numeroOrden: 'OP-1732000001',
      banco: 'BANCO G&T CONTINENTAL',
      nombreCliente: 'Juan Carlos García López',
      tipoDocumento: 'DPI',
      numeroDocumento: '2345678901234',
      monto: 25000.00,
      fechaCreacion: new Date('2025-11-17'),
      estado: 'pendiente'
    },
    {
      numeroOrden: 'OP-1732000002',
      banco: 'BANCO G&T CONTINENTAL',
      nombreCliente: 'María Fernanda Rodríguez',
      tipoDocumento: 'DPI',
      numeroDocumento: '3456789012345',
      monto: 15000.00,
      fechaCreacion: new Date('2025-11-18'),
      estado: 'pendiente'
    },
    {
      numeroOrden: 'OP-1732000003',
      banco: 'BANCO G&T CONTINENTAL',
      nombreCliente: 'Pedro Antonio Méndez',
      tipoDocumento: 'DPI',
      numeroDocumento: '4567890123456',
      monto: 30000.00,
      fechaCreacion: new Date('2025-11-19'),
      estado: 'pendiente'
    }
  ];

  // Computed para validar si se puede buscar
  get puedesBuscar(): boolean {
    return this.numeroOrdenBuscar().trim() !== '';
  }

  // Método para buscar la orden
  buscarOrden() {
    if (!this.puedesBuscar) {
      return;
    }

    this.buscando.set(true);
    this.noEncontrada.set(false);
    this.ordenEncontrada.set(null);

    // Simular búsqueda con delay
    setTimeout(() => {
      const ordenBuscada = this.numeroOrdenBuscar().trim();
      const orden = this.ordenesMock.find(o => o.numeroOrden === ordenBuscada);

      if (orden) {
        this.ordenEncontrada.set(orden);
        this.noEncontrada.set(false);
      } else {
        this.ordenEncontrada.set(null);
        this.noEncontrada.set(true);
      }

      this.buscando.set(false);
    }, 500);
  }

  // Método para abrir el modal de confirmación
  abrirModalConfirmacion() {
    this.mostrarModal.set(true);
  }

  // Método para cerrar el modal
  cerrarModal() {
    this.mostrarModal.set(false);
  }

  // Método para confirmar la aprobación
  confirmarAprobacion() {
    this.procesandoAprobacion.set(true);

    // Simular aprobación con delay
    setTimeout(() => {
      const orden = this.ordenEncontrada();
      if (orden) {
        orden.estado = 'aprobado';
        alert(`✅ Orden ${orden.numeroOrden} aprobada exitosamente`);
      }

      this.procesandoAprobacion.set(false);
      this.cerrarModal();
      this.limpiarBusqueda();
    }, 1000);
  }

  // Método para limpiar la búsqueda
  limpiarBusqueda() {
    this.numeroOrdenBuscar.set('');
    this.ordenEncontrada.set(null);
    this.noEncontrada.set(false);
    this.buscando.set(false);
  }

  // Método para manejar Enter en el input
  onEnterBuscar(event: KeyboardEvent) {
    if (event.key === 'Enter' && this.puedesBuscar) {
      this.buscarOrden();
    }
  }

  // Método para limpiar resultados cuando se modifica el input
  onInputChange() {
    // Si hay resultados previos, limpiarlos cuando el usuario modifica el input
    if (this.ordenEncontrada() || this.noEncontrada()) {
      this.ordenEncontrada.set(null);
      this.noEncontrada.set(false);
    }
  }
}
