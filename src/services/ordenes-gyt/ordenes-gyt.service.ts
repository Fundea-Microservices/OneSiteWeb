import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  OrdenGyt,
  EstadoOrdenGyt,
  FiltrosOrdenGyt,
  ResultadoBusquedaOrden,
  ClienteOrden,
  PrestamoOrden
} from '../../interfaces/ordenes-gyt/orden-gyt';

/**
 * Servicio para gestionar órdenes GYT (simulando una base de datos local)
 * 
 * Este servicio almacena las órdenes en localStorage para persistencia
 * entre sesiones del navegador.
 */
@Injectable({
  providedIn: 'root'
})
export class OrdenesGytService {
  private readonly STORAGE_KEY = 'ordenes-gyt';
  private ordenesSubject = new BehaviorSubject<OrdenGyt[]>(this.cargarOrdenes());
  
  // Observable público para suscribirse a cambios en las órdenes
  public ordenes$ = this.ordenesSubject.asObservable();

  constructor() {
    console.log('🏦 [OrdenesGytService] Servicio inicializado');
    console.log('📋 [OrdenesGytService] Órdenes cargadas:', this.ordenesSubject.value.length);
  }

  /**
   * Cargar órdenes desde localStorage
   */
  private cargarOrdenes(): OrdenGyt[] {
    try {
      const ordenesJson = localStorage.getItem(this.STORAGE_KEY);
      if (ordenesJson) {
        const ordenes = JSON.parse(ordenesJson);
        // Convertir las fechas de string a Date
        return ordenes.map((orden: any) => ({
          ...orden,
          fechaCreacion: new Date(orden.fechaCreacion),
          fechaEmision: new Date(orden.fechaEmision),
          fechaAprobacion: orden.fechaAprobacion ? new Date(orden.fechaAprobacion) : undefined
        }));
      }
    } catch (error) {
      console.error('❌ [OrdenesGytService] Error al cargar órdenes:', error);
    }
    return [];
  }

  /**
   * Guardar órdenes en localStorage
   */
  private guardarOrdenes(ordenes: OrdenGyt[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(ordenes));
      console.log('💾 [OrdenesGytService] Órdenes guardadas:', ordenes.length);
    } catch (error) {
      console.error('❌ [OrdenesGytService] Error al guardar órdenes:', error);
    }
  }

  /**
   * Generar un nuevo ID de orden
   */
  private generarIdOrden(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `OP-${timestamp}${random}`;
  }

  /**
   * Crear una nueva orden GYT
   */
  crearOrden(
    cliente: ClienteOrden,
    prestamo: PrestamoOrden,
    montoDesembolso: number,
    usuarioEmision: string = 'SYSTEM'
  ): OrdenGyt {
    const nuevaOrden: OrdenGyt = {
      id: this.generarIdOrden(),
      estado: 'pendiente',
      cliente,
      prestamo,
      montoDesembolso,
      fechaCreacion: new Date(),
      fechaEmision: new Date(),
      usuarioEmision
    };

    const ordenes = this.ordenesSubject.value;
    ordenes.push(nuevaOrden);
    this.guardarOrdenes(ordenes);
    this.ordenesSubject.next(ordenes);

    console.log('✅ [OrdenesGytService] Orden creada:', nuevaOrden.id);
    return nuevaOrden;
  }

  /**
   * Obtener una orden por su ID
   */
  obtenerOrdenPorId(id: string): Observable<OrdenGyt | undefined> {
    return this.ordenes$.pipe(
      map(ordenes => ordenes.find(orden => orden.id === id))
    );
  }

  /**
   * Obtener orden por ID (versión síncrona)
   */
  obtenerOrdenPorIdSync(id: string): OrdenGyt | undefined {
    return this.ordenesSubject.value.find(orden => orden.id === id);
  }

  /**
   * Buscar órdenes por número de documento
   */
  buscarPorDocumento(numeroDocumento: string): Observable<OrdenGyt[]> {
    return this.ordenes$.pipe(
      map(ordenes => ordenes.filter(
        orden => orden.cliente.numeroIdentificacion === numeroDocumento
      ))
    );
  }

  /**
   * Buscar órdenes por número de operación
   */
  buscarPorOperacion(numeroOperacion: string): Observable<OrdenGyt[]> {
    return this.ordenes$.pipe(
      map(ordenes => ordenes.filter(
        orden => orden.prestamo.numeroOperacion === numeroOperacion ||
                 orden.prestamo.idOperacionFmt === numeroOperacion
      ))
    );
  }

  /**
   * Buscar órdenes con filtros avanzados
   */
  buscarOrdenes(filtros: FiltrosOrdenGyt): Observable<ResultadoBusquedaOrden> {
    return this.ordenes$.pipe(
      map(ordenes => {
        let ordenesFiltradas = [...ordenes];

        // Filtrar por ID
        if (filtros.id) {
          ordenesFiltradas = ordenesFiltradas.filter(
            orden => orden.id.toLowerCase().includes(filtros.id!.toLowerCase())
          );
        }

        // Filtrar por documento
        if (filtros.numeroDocumento) {
          ordenesFiltradas = ordenesFiltradas.filter(
            orden => orden.cliente.numeroIdentificacion.includes(filtros.numeroDocumento!)
          );
        }

        // Filtrar por operación
        if (filtros.numeroOperacion) {
          ordenesFiltradas = ordenesFiltradas.filter(
            orden => orden.prestamo.numeroOperacion.includes(filtros.numeroOperacion!) ||
                     orden.prestamo.idOperacionFmt.includes(filtros.numeroOperacion!)
          );
        }

        // Filtrar por estado
        if (filtros.estado) {
          ordenesFiltradas = ordenesFiltradas.filter(
            orden => orden.estado === filtros.estado
          );
        }

        // Filtrar por rango de fechas
        if (filtros.fechaDesde) {
          ordenesFiltradas = ordenesFiltradas.filter(
            orden => orden.fechaEmision >= filtros.fechaDesde!
          );
        }

        if (filtros.fechaHasta) {
          ordenesFiltradas = ordenesFiltradas.filter(
            orden => orden.fechaEmision <= filtros.fechaHasta!
          );
        }

        return {
          ordenes: ordenesFiltradas,
          total: ordenesFiltradas.length
        };
      })
    );
  }

  /**
   * Obtener todas las órdenes
   */
  obtenerTodasLasOrdenes(): Observable<OrdenGyt[]> {
    return this.ordenes$;
  }

  /**
   * Obtener órdenes por estado
   */
  obtenerOrdenesPorEstado(estado: EstadoOrdenGyt): Observable<OrdenGyt[]> {
    return this.ordenes$.pipe(
      map(ordenes => ordenes.filter(orden => orden.estado === estado))
    );
  }

  /**
   * Aprobar una orden
   */
  aprobarOrden(id: string, usuarioAprobacion: string, observaciones?: string): boolean {
    const ordenes = this.ordenesSubject.value;
    const orden = ordenes.find(o => o.id === id);

    if (!orden) {
      console.error('❌ [OrdenesGytService] Orden no encontrada:', id);
      return false;
    }

    if (orden.estado !== 'pendiente') {
      console.error('❌ [OrdenesGytService] Orden no está pendiente:', id);
      return false;
    }

    orden.estado = 'aprobada';
    orden.fechaAprobacion = new Date();
    orden.usuarioAprobacion = usuarioAprobacion;
    if (observaciones) {
      orden.observaciones = observaciones;
    }

    this.guardarOrdenes(ordenes);
    this.ordenesSubject.next(ordenes);

    console.log('✅ [OrdenesGytService] Orden aprobada:', id);
    return true;
  }

  /**
   * Rechazar una orden
   */
  rechazarOrden(id: string, usuarioAprobacion: string, motivoRechazo: string): boolean {
    const ordenes = this.ordenesSubject.value;
    const orden = ordenes.find(o => o.id === id);

    if (!orden) {
      console.error('❌ [OrdenesGytService] Orden no encontrada:', id);
      return false;
    }

    if (orden.estado !== 'pendiente') {
      console.error('❌ [OrdenesGytService] Orden no está pendiente:', id);
      return false;
    }

    orden.estado = 'rechazada';
    orden.fechaAprobacion = new Date();
    orden.usuarioAprobacion = usuarioAprobacion;
    orden.motivoRechazo = motivoRechazo;

    this.guardarOrdenes(ordenes);
    this.ordenesSubject.next(ordenes);

    console.log('❌ [OrdenesGytService] Orden rechazada:', id);
    return true;
  }

  /**
   * Marcar orden como pagada
   */
  marcarComoPagada(id: string): boolean {
    const ordenes = this.ordenesSubject.value;
    const orden = ordenes.find(o => o.id === id);

    if (!orden) {
      console.error('❌ [OrdenesGytService] Orden no encontrada:', id);
      return false;
    }

    if (orden.estado !== 'aprobada') {
      console.error('❌ [OrdenesGytService] Orden no está aprobada:', id);
      return false;
    }

    orden.estado = 'pagada';

    this.guardarOrdenes(ordenes);
    this.ordenesSubject.next(ordenes);

    console.log('💰 [OrdenesGytService] Orden marcada como pagada:', id);
    return true;
  }

  /**
   * Eliminar una orden
   */
  eliminarOrden(id: string): boolean {
    const ordenes = this.ordenesSubject.value;
    const index = ordenes.findIndex(o => o.id === id);

    if (index === -1) {
      console.error('❌ [OrdenesGytService] Orden no encontrada:', id);
      return false;
    }

    ordenes.splice(index, 1);
    this.guardarOrdenes(ordenes);
    this.ordenesSubject.next(ordenes);

    console.log('🗑️ [OrdenesGytService] Orden eliminada:', id);
    return true;
  }

  /**
   * Limpiar todas las órdenes (útil para desarrollo)
   */
  limpiarTodasLasOrdenes(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    this.ordenesSubject.next([]);
    console.log('🧹 [OrdenesGytService] Todas las órdenes eliminadas');
  }

  /**
   * Obtener estadísticas de órdenes
   */
  obtenerEstadisticas(): Observable<{
    total: number;
    pendientes: number;
    aprobadas: number;
    rechazadas: number;
    pagadas: number;
  }> {
    return this.ordenes$.pipe(
      map(ordenes => ({
        total: ordenes.length,
        pendientes: ordenes.filter(o => o.estado === 'pendiente').length,
        aprobadas: ordenes.filter(o => o.estado === 'aprobada').length,
        rechazadas: ordenes.filter(o => o.estado === 'rechazada').length,
        pagadas: ordenes.filter(o => o.estado === 'pagada').length
      }))
    );
  }
}
