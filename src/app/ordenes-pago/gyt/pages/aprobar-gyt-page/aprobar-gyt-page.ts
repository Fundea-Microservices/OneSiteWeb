import { Component, signal, ViewChild, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { OrdenesGytService } from '../../../../../services/ordenes-gyt/ordenes-gyt.service';
import { OrdenGyt, EstadoOrdenGyt, OrdenGytApiDetalle } from '../../../../../interfaces/ordenes-gyt/orden-gyt';

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
  
  // Señal para la orden encontrada (datos retornados por la API)
  ordenEncontrada = signal<OrdenGytApiDetalle | null>(null);
  
  // Señal para indicar si se está buscando
  buscando = signal(false);
  
  // Señal para indicar si no se encontró la orden
  noEncontrada = signal(false);
  
  // Señal para controlar el modal de confirmación
  mostrarModal = signal(false);
  
  // Señal para indicar si se está procesando la aprobación
  procesandoAprobacion = signal(false);
  
  // Señal para órdenes pendientes
  ordenesPendientes = signal<OrdenGyt[]>([]);
  
  // Estadísticas
  estadisticas = signal({
    total: 0,
    pendientes: 0,
    aprobadas: 0,
    rechazadas: 0,
    pagadas: 0
  });

  constructor(
    private ordenesGytService: OrdenesGytService,
    private toastr: ToastrService
  ) {
    this.cargarEstadisticas();
    this.cargarOrdenesPendientes();
  }

  /**
   * Cargar estadísticas
   */
  cargarEstadisticas(): void {
    this.ordenesGytService.obtenerEstadisticas().subscribe(stats => {
      this.estadisticas.set(stats);
    });
  }

  /**
   * Cargar órdenes pendientes
   */
  cargarOrdenesPendientes(): void {
    this.ordenesGytService.obtenerOrdenesPorEstado('pendiente').subscribe(ordenes => {
      this.ordenesPendientes.set(ordenes);
    });
  }

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

    const numeroOrden = this.numeroOrdenBuscar().trim();

    this.ordenesGytService.obtenerOrdenPorNumeroApi(numeroOrden).subscribe({
      next: (orden) => {
        this.ordenEncontrada.set(orden);
        this.noEncontrada.set(false);
        this.buscando.set(false);
        this.toastr.success('Orden encontrada', 'Búsqueda exitosa');
      },
      error: (error) => {
        this.ordenEncontrada.set(null);
        this.noEncontrada.set(true);
        this.buscando.set(false);
        if (error.status === 404) {
          this.toastr.warning('No se encontró la orden', 'Orden no encontrada');
        } else {
          this.toastr.error('Error al buscar la orden', 'Error');
        }
      }
    });
  }

  // Método para abrir el modal de confirmación
  abrirModalConfirmacion() {
    this.mostrarModal.set(true);
  }

  // Método para cerrar el modal
  cerrarModal() {
    this.mostrarModal.set(false);
  }

  // Método para confirmar la aprobación (consume endpoint /ordenes/gyt/pagar)
  confirmarAprobacion() {
    const orden = this.ordenEncontrada();
    if (!orden) return;

    this.procesandoAprobacion.set(true);

    this.ordenesGytService.pagarOrdenApi(orden.numero).subscribe({
      next: () => {
        this.toastr.success(`Orden ${orden.numero} aprobada exitosamente`, 'Aprobación exitosa');
        this.procesandoAprobacion.set(false);
        this.cerrarModal();
        this.limpiarBusqueda();
      },
      error: (error) => {
        const msg = error?.error?.message ?? 'Error al aprobar la orden';
        this.toastr.error(msg, 'Error');
        this.procesandoAprobacion.set(false);
        this.cerrarModal();
      }
    });
  }

  // Método para rechazar orden
  rechazarOrden() {
    const motivo = prompt('Ingrese el motivo del rechazo:');

    if (!motivo || motivo.trim() === '') {
      this.toastr.warning('Debe ingresar un motivo de rechazo', 'Rechazo');
      return;
    }

    const orden = this.ordenEncontrada();
    if (orden) {
      this.toastr.success(`Orden ${orden.numero} rechazada`, 'Rechazo');
      this.limpiarBusqueda();
    }
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
    if (this.ordenEncontrada() || this.noEncontrada()) {
      this.ordenEncontrada.set(null);
      this.noEncontrada.set(false);
    }
  }

  // Método para obtener clase de badge según estado
  getEstadoBadgeClass(estado: EstadoOrdenGyt): string {
    switch (estado) {
      case 'pendiente': return 'bg-warning text-dark';
      case 'aprobada': return 'bg-success';
      case 'rechazada': return 'bg-danger';
      case 'pagada': return 'bg-info';
      default: return 'bg-secondary';
    }
  }

  // Método para seleccionar una orden de la lista de pendientes
  seleccionarOrden(orden: OrdenGyt): void {
    this.numeroOrdenBuscar.set(orden.id);
    this.noEncontrada.set(false);
    this.buscarOrden();
  }
}

