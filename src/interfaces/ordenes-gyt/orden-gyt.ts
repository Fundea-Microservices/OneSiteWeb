/**
 * Interfaces para el sistema de Órdenes GYT
 */

/**
 * Estado de una orden de pago GYT
 */
export type EstadoOrdenGyt = 'pendiente' | 'aprobada' | 'rechazada' | 'pagada';

/**
 * Cliente asociado a la orden
 */
export interface ClienteOrden {
  nombres: string;
  apellidos: string;
  tipoIdentificacion: string;
  numeroIdentificacion: string;
  telefono: string;
  correo: string;
}

/**
 * Información del préstamo asociado
 */
export interface PrestamoOrden {
  numeroOperacion: string;
  idOperacionFmt: string;
  operacionUId: number;
  saldo: number;
  producto: string;
  sucursal: string;
  estado: string;
}

/**
 * Orden de pago GYT completa
 */
export interface OrdenGyt {
  id: string; // OP-xxxxxxxx
  estado: EstadoOrdenGyt;
  cliente: ClienteOrden;
  prestamo: PrestamoOrden;
  montoDesembolso: number;
  fechaCreacion: Date;
  fechaEmision: Date;
  usuarioEmision: string;
  fechaAprobacion?: Date;
  usuarioAprobacion?: string;
  motivoRechazo?: string;
  observaciones?: string;
}

/**
 * Filtros para búsqueda de órdenes
 */
export interface FiltrosOrdenGyt {
  id?: string;
  numeroDocumento?: string;
  numeroOperacion?: string;
  estado?: EstadoOrdenGyt;
  fechaDesde?: Date;
  fechaHasta?: Date;
}

/**
 * Resultado de búsqueda de órdenes
 */
export interface ResultadoBusquedaOrden {
  ordenes: OrdenGyt[];
  total: number;
}
