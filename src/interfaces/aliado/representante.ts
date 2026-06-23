/**
 * Interface para filtrar representantes en el listado
 */
export interface ListarRepresentantesParams {
  page?: number;
  limit?: number;
  busqueda?: string;
  documento?: string;
  nit?: string;
  tipoDocumento?: number;
  activo?: boolean;
  usuarioId?: string;
}

/**
 * Interface para el representante completo retornado por el backend
 */
export interface Representante {
  representanteId: string; // uniqueidentifier se maneja como string
  direccion: string;
  nit: string,
  codigoPostal?: string;   // Ahora es string para no perder ceros
  telefonoFijo?: string;   // String para evitar desbordamiento de int
  telefonoCelular?: string;
  correoElectronico: string;
  correoNotificaciones?: string;
  asesorId?: number;
  paisDocumento: number;
  tipoDocumento: number;
  documento?: string;
  fechaVencimiento?: string; // O string, dependiendo de tu config JSON
  
  primerApellido: string;
  segundoApellido?: string;
  primerNombre: string;
  segundoNombre?: string;
  tercerNombre?: string;
  
  fechaNacimiento?: string;
  sexo: string;
  
  profesion?: number;
  etnia?: number;
  
  // BIT en SQL se mapea a boolean en TypeORM/JS
  sabeLeer?: boolean;     
  sabeEscribir?: boolean; 
  
  estadoCivil?: number;
  nacionalidad?: number;
  ocupacion?: number;
  nombreEmpresa?: string;
  actividadLaboral?: number;
  fechaInicioActividad?: string;
  
  ingresos?: number; // JS usa number para decimales
  
  sectorId?: number;
  clasificacionInterna?: number;
  paisDomicilio: number;
  departamentoDomicilio: number;
  municipioDomicilio?: number;
  
  localidad?: number;
  barrio?: number;
  
  cuentaBantotal?: number; 
  clienteUId?: number; // 
  
  fotoFrontalDpi?: string; // URL o Path
  fotoReversoDpi?: string; // URL o Path
  
  cuentaBT?: number; // Cuenta Bantotal del cliente
  
  usuarioIngreso?: string;
  usuarioId?: string;

  datosAdicionales?: { datoId?: string; tipo: string; campo?: string; nombre?: string; valor: string; preguntaId?: string; usuarioId?: string; usuarioNombre?: string; representanteId?: string; representanteNombre?: string; created_at?: string; updated_at?: string | null; seccion?: string; orden?: number }[];
  
  created_at?: Date; // Mapeo de created_at
  updated_at?: Date; // Mapeo de updated_at
  deleted_at?: Date; // Mapeo de deleted_at
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
    metadata?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  };
  metadata?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateRepresentanteResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data?: Representante;
  metadata?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
