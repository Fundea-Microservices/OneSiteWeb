/**
 * Interfaces para el servicio de API Bantotal - Personas
 */

/**
 * Parámetros de consulta para buscar persona por documento
 */
export interface BuscarPersonaPorDocumentoParams {
  pais?: number;
  tipoDoc?: number;
}

/**
 * Respuesta de búsqueda de persona por documento
 */
export interface BuscarPersonaPorDocumentoResponse {
  personaUId: string;
  nroDocumento: string;
  tipoDocumento: string;
  tipoDocumentoId: string;
  paisDocumento: string;
  paisDocumentoId: string;
}

/**
 * Datos completos de una persona desde Bantotal
 */
export interface PersonaCompleta {
  personaUId: string;
  nroDocumento: string;
  tipoDocumentoId: string;
  tipoDocumento: string;
  paisDocumentoId: string;
  paisDocumento: string;
  primerNombre: string;
  segundoNombre?: string;
  primerApellido: string;
  segundoApellido?: string;
  apellidoCasada?: string;
  fechaNacimiento?: string;
  sexo?: string;
  estadoCivil?: string;
  estadoCivilId?: string;
  nacionalidad?: string;
  nacionalidadId?: string;
  ocupacion?: string;
  ocupacionId?: string;
  ingresos?: string;
  correoElectronico?: string;
  telefonoCelular?: string;
  telefonoFijo?: string;
  calle?: string;
  numeroPuerta?: string;
  apartamento?: string;
  barrio?: string;
  barrioId?: string;
  localidad?: string;
  localidadId?: string;
  departamento?: string;
  departamentoId?: string;
  paisDomicilio?: string;
  paisDomicilioId?: string;
  codigoPostal?: string;
  fechaInicioActividad?: string;
  fechaVencimiento?: string;
  [key: string]: any; // Para campos adicionales que pueda retornar Bantotal
}

/**
 * Cuenta de cliente
 */
export interface CuentaCliente {
  cuentaId: string;
  numeroCuenta: string;
  tipoCuenta: string;
  descripcionTipoCuenta: string;
  moneda: string;
  saldo: number;
  saldoDisponible: number;
  estado: string;
  fechaApertura: string;
  sucursal?: string;
  [key: string]: any;
}

/**
 * Respuesta con lista de cuentas
 */
export interface CuentasClienteResponse {
  personaUId: string;
  cuentas: CuentaCliente[];
  totalCuentas: number;
}

/**
 * Respuesta genérica de la API
 */
export interface ApiBantotalResponse<T> {
  success: boolean;
  message: string;
  data: T;
  error?: string;
  timestamp?: string;
}
