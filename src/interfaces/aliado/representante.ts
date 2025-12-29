/**
 * Interface para crear un nuevo representante
 */
export interface CrearRepresentanteDto {
  primerNombre: string;
  segundoNombre?: string;
  tercerNombre?: string;
  primerApellido: string;
  segundoApellido?: string;
  nroDocumento: string;
  tipoDocumentoId: number;
  paisDocumentoId: number;
  fechaNacimiento: string; // formato: "YYYY-MM-DD"
  sexo: 'M' | 'F';
  nit?: string;
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
  idRepresentante: string;
  primerNombre: string;
  segundoNombre?: string;
  tercerNombre?: string;
  primerApellido: string;
  segundoApellido?: string;
  nroDocumento: string;
  tipoDocumentoId: number;
  paisDocumentoId: number;
  fechaNacimiento: string;
  fechaVencimiento?: string;
  nit: string;
  sexo: string;
  correoElectronico: string;
  telefonoCelular: number;
  telefonoFijo?: number;
  direccionRepresentante: string;
  codigoPostal?: number;
  estadoCivilId: number;
  ocupacionId: number;
  nombreEmpresa?: string;
  actividadLaboralId: number;
  fechaInicioActividad?: string;
  ingresos: number;
  paisDomicilioId: number;
  departamentoId: number;
  localidadId: number;
  barrioId?: number;
  profesionId?: number;
  etniaId?: number;
  sabeLeer?: boolean;
  sabeEscribir?: boolean;
  idNacionalidad?: number;
  sectorId?: number;
  clasificacionInternaId?: number;
  asesorId?: string;
  cuentabanTotal?: string;
  fotoFrontalDpi?: string;
  fotoReversoDpi?: string;
  usrIngreso: string;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string;
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
