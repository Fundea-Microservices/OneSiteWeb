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

/**
 * Detalle de una orden GYT retornada por la API
 */
export interface OrdenGytApiDetalle {
  ordenId: string;
  numero: string;
  cliente: string;
  documentoCliente: string;
  tipoDocumentoCliente: string;
  monto: number;
  descripcion: string;
  telefono: string;
  correo: string;
  canalCobro: string;
  gestion: string;
  usuario: string;
  estado?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Respuesta de la API al obtener una orden GYT por número
 */
export interface ObtenerOrdenGytApiResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: OrdenGytApiDetalle;
}

/**
 * DTO para crear una orden GYT via API
 */
export interface CrearOrdenGytDto {
  nombre: string;
  apellido: string;
  documentoCliente: string;
  tipoDocumentoCliente: string;
  monto: number;
  descripcion: string;
  telefono: string;
  correo: string;
  canalCobro: string;
  cuentaDebito: string;
  gestion: string;
  usuario: undefined;
}

/**
 * Respuesta de la API al crear una orden GYT
 */
export interface CrearOrdenGytApiResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: {
    orden: {
      ordenId: string;
      numero: string;
      cliente: string;
      documentoCliente: string;
      tipoDocumentoCliente: string;
      monto: number;
      descripcion: string;
      telefono: string;
      correo: string;
      canalCobro: string;
      gestion: string;
      usuario: string;
      createdAt: string;
      updatedAt: string;
    };
    gyt: {
      statusCode: number;
      message: string;
      showMessage: boolean;
      data: {
        statusCode: number;
        data: string;
        gestion: string;
        message: string;
      };
    };
  };
}
