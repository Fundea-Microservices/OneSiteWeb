import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { HttpService } from '../HttpService';
import {
  OrdenGyt,
  EstadoOrdenGyt,
  FiltrosOrdenGyt,
  ResultadoBusquedaOrden,
  ClienteOrden,
  PrestamoOrden,
  CrearOrdenGytDto,
  CrearOrdenGytApiResponse,
  OrdenGytApiDetalle,
  ObtenerOrdenGytApiResponse,
  ConsultarPorFechaGytDto,
  SincronizarPagoGytResponse
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
export class OrdenesGytService extends HttpService {
  private readonly STORAGE_KEY = 'ordenes-gyt';
  private ordenesSubject = new BehaviorSubject<OrdenGyt[]>(this.cargarOrdenes());

  private readonly endpoints = {
    crearOrden: '/ordenes/gyt/crear'
  };

  // Observable público para suscribirse a cambios en las órdenes
  public ordenes$ = this.ordenesSubject.asObservable();

  constructor(http: HttpClient) {
    super(http);
    console.log('🏦 [OrdenesGytService] Servicio inicializado');
    console.log('📋 [OrdenesGytService] Órdenes cargadas:', this.ordenesSubject.value.length);
  }

  /**
   * Obtener una orden GYT por su número via API REST (ej: OPA-156)
   */
  obtenerOrdenPorNumeroApi(numeroOrden: string): Observable<OrdenGytApiDetalle> {
    return this.get<ObtenerOrdenGytApiResponse>(`/ordenes/gyt/${numeroOrden}`).pipe(
      map(response => {
        return response.body!.data.orden;
      }),
      catchError(error => {
        console.error('❌ [OrdenesGytService] Error al obtener orden:', {
          status: error.status,
          errorData: error.error
        });
        return throwError(() => error);
      })
    );
  }

  /**
   * Crear una orden GYT via API REST
   */
  crearOrdenApi(dto: CrearOrdenGytDto): Observable<CrearOrdenGytApiResponse> {
    return this.post<CrearOrdenGytApiResponse>(this.endpoints.crearOrden, dto).pipe(
      map(response => response.body!),
      catchError(error => {
        console.error('❌ [OrdenesGytService] Error al crear orden via API:', {
          status: error.status,
          errorData: error.error
        });
        return throwError(() => error);
      })
    );
  }

  /**
   * Revisar una orden GYT via API REST
   */
  revisarOrdenApi(numeroOrden: string): Observable<any> {
    return this.post<any>('/ordenes/gyt/revisar', { numeroOrden }).pipe(
      map(response => response.body!),
      catchError(error => {
        console.error('❌ [OrdenesGytService] Error al revisar orden:', {
          status: error.status,
          errorData: error.error
        });
        return throwError(() => error);
      })
    );
  }

  /**
   * Autorizar una orden GYT via API REST
   */
  autorizarOrdenApi(numeroOrden: string): Observable<any> {
    return this.post<any>('/ordenes/gyt/autorizar', { numeroOrden }).pipe(
      map(response => response.body!),
      catchError(error => {
        console.error('❌ [OrdenesGytService] Error al autorizar orden:', {
          status: error.status,
          errorData: error.error
        });
        return throwError(() => error);
      })
    );
  }

  /**
   * Pagar una orden GYT via API REST
   */
  pagarOrdenApi(numeroOrden: string): Observable<any> {
    return this.post<any>('/ordenes/gyt/pagar', { numeroOrden }).pipe(
      map(response => response.body!),
      catchError(error => {
        console.error('❌ [OrdenesGytService] Error al pagar orden:', {
          status: error.status,
          errorData: error.error
        });
        return throwError(() => error);
      })
    );
  }

  /**
   * Consultar en GYT el resultado del pago de una orden que está en cola de pago
   */
  sincronizarPagoApi(numeroOrden: string): Observable<SincronizarPagoGytResponse> {
    return this.post<SincronizarPagoGytResponse>('/ordenes/gyt/sincronizar-pago', { numeroOrden }).pipe(
      map(response => response.body!),
      catchError(error => {
        console.error('❌ [OrdenesGytService] Error al sincronizar pago:', {
          status: error.status,
          errorData: error.error
        });
        return throwError(() => error);
      })
    );
  }

  consultarPorFechaApi(dto: ConsultarPorFechaGytDto): Observable<any> {
    const params = new URLSearchParams({ fechaInicio: dto.fechaInicio, fechaFin: dto.fechaFin });
    if (dto.etapa) params.set('etapa', dto.etapa);
    return this.get<any>(`/ordenes/gyt/historial?${params.toString()}`).pipe(
      map(response => response.body!),
      catchError(error => {
        console.error('❌ [OrdenesGytService] Error al consultar historial:', {
          status: error.status,
          errorData: error.error
        });
        return throwError(() => error);
      })
    );
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
      estado: 'CREADO',
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

    if (orden.estado !== 'PENDIENTE') {
      console.error('❌ [OrdenesGytService] Orden no está pendiente:', id);
      return false;
    }

    orden.estado = 'AUTORIZADO';
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

    if (orden.estado !== 'PENDIENTE') {
      console.error('❌ [OrdenesGytService] Orden no está pendiente:', id);
      return false;
    }

    orden.estado = 'ELIMINADO';
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

    if (orden.estado !== 'AUTORIZADO') {
      console.error('❌ [OrdenesGytService] Orden no está autorizada:', id);
      return false;
    }

    orden.estado = 'PAGADO';

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
    creadas: number;
    revisadas: number;
    pendientes: number;
    autorizadas: number;
    pagadas: number;
    eliminadas: number;
  }> {
    return this.ordenes$.pipe(
      map(ordenes => ({
        total: ordenes.length,
        creadas: ordenes.filter(o => o.estado === 'CREADO').length,
        revisadas: ordenes.filter(o => o.estado === 'REVISADO').length,
        pendientes: ordenes.filter(o => o.estado === 'PENDIENTE').length,
        autorizadas: ordenes.filter(o => o.estado === 'AUTORIZADO').length,
        pagadas: ordenes.filter(o => o.estado === 'PAGADO').length,
        eliminadas: ordenes.filter(o => o.estado === 'ELIMINADO').length,
      }))
    );
  }
}
