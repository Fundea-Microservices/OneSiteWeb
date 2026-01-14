/**
 * Interfaces para el servicio de API Bantotal - Clientes
 */

/**
 * DTO para búsqueda por documento
 */
export interface DocumentoDto {
  documento: string;
  pais?: number;
  tipoDoc?: number;
}

/**
 * Metadata de respuesta de Bantotal
 */
export interface BantotalMetadata {
  fecha?: string;
  hora?: string;
  numero?: string;
  estado?: string;
  pasos?: Array<{
    paso: number;
    accion: string;
    resultado: string;
  }>;
}

/**
 * Respuesta estándar de API Bantotal
 */
export interface ApiBantotalClienteResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data?: T;
  metadata?: BantotalMetadata;
}

/**
 * Datos de cuenta de cliente
 */
export interface CuentaCliente {
  clienteUId: number;
  empresaId: number;
  cuentaBT: number;
}

/**
 * Respuesta de cuenta de cliente
 */
export interface ObtenerCuentaClienteResponse {
  clienteUId: number;
  empresaId: number;
  cuentaBT: number;
}

/**
 * Datos completos Bantotal de un cliente
 */
export interface DatosBantotalCliente {
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
  fechaNacimiento?: string;
  sexo?: string;
  estadoCivil?: string;
  estadoCivilId?: string;
  nacionalidad?: string;
  nacionalidadId?: string;
  ocupacion?: string;
  ocupacionId?: string;
  actividadLaboral?: string;
  actividadLaboralId?: string;
  sector?: string;
  sectorId?: string;
  clasificacionInterna?: string;
  clasificacionInternaId?: string;
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
  ejecutivo?: string;
  ejecutivoId?: string;
  clienteUId: number;
  cuentaBT: number;
    // Campos adicionales según el ejemplo proporcionado
  tercerNombre?: string;
  nombreEmpresa?: string;
  asesorId?: number | null;
  asesor?: string;
  profesionId?: number | null;
  profesion?: string;
  etniaId?: number | null;
  etnia?: string;
  sabeLeer?: number | boolean;
  sabeEscribir?: number | boolean;
  domicilio?: string;
}

/**
 * Respuesta de datos Bantotal
 */
export interface ObtenerDatosBantotalResponse {
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
  fechaNacimiento?: string;
  sexo?: string;
  estadoCivil?: string;
  estadoCivilId?: string;
  nacionalidad?: string;
  nacionalidadId?: string;
  ocupacion?: string;
  ocupacionId?: string;
  actividadLaboral?: string;
  actividadLaboralId?: string;
  sector?: string;
  sectorId?: string;
  clasificacionInterna?: string;
  clasificacionInternaId?: string;
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
  ejecutivo?: string;
  ejecutivoId?: string;
  clienteUId: number;
  cuentaBT: number;
  // Campos adicionales según el ejemplo proporcionado
  tercerNombre?: string;
  nombreEmpresa?: string;
  asesorId?: number | null;
  asesor?: string;
  profesionId?: number | null;
  profesion?: string;
  etniaId?: number | null;
  etnia?: string;
  sabeLeer?: number | boolean;
  sabeEscribir?: number | boolean;
  domicilio?: string;
}
