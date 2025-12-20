/**
 * Interface para crear un nuevo representante
 */
export interface CrearRepresentanteDto {
  primerNombre: string;
  segundoNombre?: string;
  primerApellido: string;
  segundoApellido?: string;
  nroDocumento: string;
  tipoDocumentoId: number;
  paisDocumentoId: number;
  fechaNacimiento: string; // formato: "YYYY-MM-DD"
  sexo: 'M' | 'F';
  correoElectronico: string;
  telefonoCelular: number;
  direccionRepresentante: string;
  codigoPostal?: number;
  estadoCivilId: number;
  ocupacionId: number;
  actividadLaboralId: number;
  ingresos: number;
  paisDomicilioId: number;
  departamentoId: number;
  localidadId: number;
  usrIngreso: string;
}

/**
 * Interface para filtrar representantes en el listado
 */
export interface ListarRepresentantesParams {
  page?: number;
  limit?: number;
  busqueda?: string;
  nroDocumento?: string;
  tipoDocumentoId?: number;
  activo?: boolean;
}

/**
 * Interface para el representante completo retornado por el backend
 */
export interface Representante {
  representanteId: string;
  primerNombre: string;
  segundoNombre?: string;
  primerApellido: string;
  segundoApellido?: string;
  nroDocumento: string;
  tipoDocumentoId: number;
  paisDocumentoId: number;
  fechaNacimiento: string;
  sexo: string;
  correoElectronico: string;
  telefonoCelular: number;
  direccionRepresentante: string;
  codigoPostal?: number;
  estadoCivilId: number;
  ocupacionId: number;
  actividadLaboralId: number;
  ingresos: number;
  paisDomicilioId: number;
  departamentoId: number;
  localidadId: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
  usrIngreso: string;
  usrModifica?: string;
}

/**
 * Respuesta del backend para operaciones con representantes
 */
export interface RepresentanteResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data?: {
    representante?: Representante;
    representantes?: Representante[];
  };
  metadata?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
