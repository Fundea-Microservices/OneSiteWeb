/**
 * Interfaces para el servicio de API Bantotal - Préstamos
 */

/**
 * Parámetros para buscar préstamo por documento
 */
export interface BuscarPrestamoPorDocumentoParams {
  documento: string;
  tipoDoc?: number;
  pais?: number;
  prestamo: string;
}

/**
 * Información de la persona asociada al préstamo
 */
export interface PersonaPrestamo {
  personaUId: number;
  primerNombre: string;
  segundoNombre?: string;
  primerApellido: string;
  segundoApellido?: string;
  nombreCompleto?: string;
  razonSocial?: string;
  tipoDocumento: string;
  numeroDocumento: string;
  pais: number;
}

/**
 * Titularidad de cuenta
 */
export interface Titularidad {
  identificador: number;
  descripcion: string;
}

/**
 * Cuenta del cliente asociada al préstamo
 */
export interface CuentaClientePrestamo {
  clienteUId: number;
  titularidad: Titularidad;
  representativo: string;
}

/**
 * Información del cliente
 */
export interface ClientePrestamo {
  clienteUId: number;
  cuentas: CuentaClientePrestamo[];
}

/**
 * Producto del préstamo
 */
export interface ProductoPrestamo {
  productoUId: number;
  nombre: string;
  moneda: string;
}

/**
 * Detalle del préstamo (desembolso)
 */
export interface DetallePrestamo {
  Codigo_barras: string;
  Cuenta_Cliente: number;
  Fecha: string;
  ID_Agencia: number;
  Id_Transaccion: string;
  Itmod: number;
  Itnrel: number;
  Itsuc: number;
  Ittran: number;
  Numero_Operacion: number;
  Referencia: string;
  Sub_Operacion: number;
  Valor: number;
  cam_carga_tipo: number;
  codigo: number;
  codigo_cuenta_destino: number;
  id_banco_destino: number;
  moneda: number;
  numero_de_cuenta: string;
}

/**
 * Información del préstamo
 */
export interface PrestamoInfo {
  operacionUId: number;
  idOperacionFmt: string;
  idOperacionBT: string;
  producto: ProductoPrestamo;
  sucursal: string;
  saldo: number;
  estado: string;
  detalles: DetallePrestamo[];
}

/**
 * Respuesta completa de búsqueda de préstamo por documento
 */
export interface BuscarPrestamoPorDocumentoResponse {
  persona: PersonaPrestamo;
  cliente: ClientePrestamo;
  prestamo: PrestamoInfo;
}

/**
 * Respuesta genérica de la API Bantotal para préstamos
 */
export interface ApiBantotalPrestamoResponse<T> {
  success: boolean;
  statusCode: string;
  path: string;
  timestamp: string;
  message: string;
  data: T;
  metadata: {
    fecha: string;
    hora: string;
    numero: string;
    estado: string;
  };
}
