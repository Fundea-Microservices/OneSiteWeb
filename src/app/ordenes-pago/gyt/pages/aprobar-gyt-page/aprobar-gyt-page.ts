import { Component, signal, computed, CUSTOM_ELEMENTS_SCHEMA, ViewContainerRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { OrdenesGytService } from '../../../../../services/ordenes-gyt/ordenes-gyt.service';
import { OrdenGytImpresionService } from '../../../../../services/ordenes-gyt/orden-gyt-impresion.service';
import { OrdenGyt, EstadoOrdenGyt, OrdenGytApiDetalle, EstadoOrdenGytApi } from '../../../../../interfaces/ordenes-gyt/orden-gyt';

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

  // Señal para indicar si se está consultando el resultado del pago en GYT
  sincronizandoPago = signal(false);

  // Señal para órdenes pendientes
  ordenesPendientes = signal<OrdenGyt[]>([]);

  // Controla si se muestra el botón de "Abrir ventana de impresión".
  // Por ahora siempre visible; más adelante se puede condicionar según el
  // estado de la orden (p. ej. solo cuando esté AUTORIZADO/PAGADO).
  mostrarBotonImpresion = signal(true);
  
  // Último estado de la orden (el de mayor ordenSecuencia)
  ultimoEstado = computed<EstadoOrdenGytApi | null>(() => {
    const orden = this.ordenEncontrada();
    if (!orden?.estados?.length) return null;
    return orden.estados.reduce((prev, curr) =>
      curr.ordenSecuencia > prev.ordenSecuencia ? curr : prev
    );
  });

  // Clase CSS del badge según el último estado
  estadoBadgeClass = computed<string>(() => {
    const estado = this.ultimoEstado()?.estado ?? '';
    switch (estado) {
      case 'CREADO':       return 'bg-secondary';
      case 'REVISADO':     return 'bg-info text-dark';
      case 'PENDIENTE':    return 'bg-warning text-dark';
      case 'AUTORIZADO':   return 'bg-primary';
      case 'EN_COLA_PAGO': return 'bg-dark';
      case 'PAGADO':       return 'bg-success';
      case 'ERROR_PAGO':   return 'bg-danger';
      case 'ELIMINADO':    return 'bg-danger';
      default:             return 'bg-secondary';
    }
  });

  // Estadísticas
  estadisticas = signal({
    total: 0,
    creadas: 0,
    revisadas: 0,
    pendientes: 0,
    autorizadas: 0,
    pagadas: 0,
    eliminadas: 0
  });

  constructor(
    private ordenesGytService: OrdenesGytService,
    private toastr: ToastrService,
    private viewContainerRef: ViewContainerRef,
    private impresionService: OrdenGytImpresionService
  ) {
    this.cargarEstadisticas();
    this.cargarOrdenesPendientes();
  }

  /**
   * Abre la ventana de impresión para reimprimir la boleta de la orden encontrada.
   */
  imprimirOrden(): void {
    const orden = this.ordenEncontrada();
    if (!orden) return;

    this.impresionService.imprimirOrden(this.viewContainerRef, {
      ordenId: orden.numero,
      fecha: orden.createdAt ? new Date(orden.createdAt) : new Date(),
      monto: orden.monto,
      cliente: {
        // La API entrega el nombre del cliente como un solo string
        nombres: orden.cliente,
        apellidos: '',
        tipoIdentificacion: orden.tipoDocumentoCliente,
        numeroIdentificacion: orden.documentoCliente,
        telefono: orden.telefono,
        correo: orden.correo,
        montoPrestamo: orden.monto,
        numeroOperacion: orden.gestion
      }
    });
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
    this.ordenesGytService.obtenerOrdenesPorEstado('PENDIENTE').subscribe(ordenes => {
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

        // Si está en cola de pago, consultar a GYT si ya hay resultado
        if (this.ultimoEstado()?.estado === 'EN_COLA_PAGO') {
          this.consultarResultadoPago(true);
        }
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
        this.toastr.success(
          `Orden ${orden.numero} enviada a la cola de pago. El resultado se confirmará al consultarlo con GyT.`,
          'Pago enviado'
        );
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

  /**
   * Consulta en GYT el resultado del pago de la orden encontrada (consume /ordenes/gyt/sincronizar-pago)
   * @param silencioso Si es true, no muestra aviso cuando aún no hay resultado o hay error
   */
  consultarResultadoPago(silencioso = false): void {
    const orden = this.ordenEncontrada();
    if (!orden || this.sincronizandoPago()) return;

    this.sincronizandoPago.set(true);

    this.ordenesGytService.sincronizarPagoApi(orden.numero).subscribe({
      next: (resp) => {
        this.sincronizandoPago.set(false);

        if (!resp.data.actualizado) {
          if (!silencioso) {
            this.toastr.info('GyT aún no reporta el resultado del pago. Intente más tarde.', 'Pago en proceso');
          }
          return;
        }

        // Recargar la orden para mostrar el nuevo estado
        this.ordenesGytService.obtenerOrdenPorNumeroApi(orden.numero).subscribe({
          next: (ordenActualizada) => this.ordenEncontrada.set(ordenActualizada)
        });

        switch (resp.data.estado) {
          case 'PAGADO':
            this.toastr.success(resp.data.descripcion ?? 'Pago aplicado', `Orden ${orden.numero} pagada`);
            break;
          case 'ERROR_PAGO':
            this.toastr.error(resp.data.descripcion ?? 'El pago no se aplicó', `Orden ${orden.numero} con error`);
            break;
          default:
            this.toastr.warning(resp.data.descripcion ?? resp.message, `Orden ${orden.numero}`);
        }
      },
      error: (error) => {
        this.sincronizandoPago.set(false);
        if (!silencioso) {
          this.toastr.error(error?.error?.message ?? 'Error al consultar el resultado del pago', 'Error');
        }
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
      case 'CREADO':       return 'bg-secondary';
      case 'REVISADO':     return 'bg-info text-dark';
      case 'PENDIENTE':    return 'bg-warning text-dark';
      case 'AUTORIZADO':   return 'bg-primary';
      case 'EN_COLA_PAGO': return 'bg-dark';
      case 'PAGADO':       return 'bg-success';
      case 'ERROR_PAGO':   return 'bg-danger';
      case 'ELIMINADO':    return 'bg-danger';
      default:             return 'bg-secondary';
    }
  }

  // Método para seleccionar una orden de la lista de pendientes
  seleccionarOrden(orden: OrdenGyt): void {
    this.numeroOrdenBuscar.set(orden.id);
    this.noEncontrada.set(false);
    this.buscarOrden();
  }
}

