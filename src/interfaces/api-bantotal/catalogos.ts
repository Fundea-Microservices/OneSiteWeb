/**
 * Interfaces para el servicio de API Bantotal - Catálogos
 */

/**
 * Parámetros para listar catálogos
 */
export interface ListarCatalogosParams {
  activo?: boolean;
  grupo?: string;
  busqueda?: string;
  all?: boolean;
  page?: number;
  limit?: number;
}

/**
 * Catálogo individual
 */
export interface Catalogo {
  catalogoId: string;
  grupo: string;
  nombre: string;
  valorCore: string;
  padreId: string | null;
  padre: CatalogoPadre | null;
  hijos: CatalogoHijo[];
  padreValorCore: string | null;
  metadatos: any | null;
  activo: boolean;
  orden: number;
  created_at: string;
  updated_at: string;
}

/**
 * Catálogo padre (simplificado)
 */
export interface CatalogoPadre {
  catalogoId: string;
  grupo: string;
  nombre: string;
  valorCore: string;
  padreId: string | null;
  padreValorCore: string | null;
  metadatos: any | null;
  activo: boolean;
  orden: number;
  created_at: string;
  updated_at: string;
}

/**
 * Catálogo hijo (simplificado)
 */
export interface CatalogoHijo {
  catalogoId: string;
  grupo: string;
  nombre: string;
  valorCore: string;
  padreId: string;
  padreValorCore: string | null;
  metadatos: any | null;
  activo: boolean;
  orden: number;
  created_at: string;
  updated_at: string;
}

/**
 * Data de la respuesta de listar catálogos
 */
export interface ListarCatalogosData {
  catalogos: Catalogo[];
}

/**
 * Metadata de paginación
 */
export interface CatalogosMetadata {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Respuesta completa de listar catálogos
 */
export interface ListarCatalogosResponse {
  success: boolean;
  statusCode: string;
  path: string;
  timestamp: string;
  message: string;
  data: ListarCatalogosData;
  metadata: CatalogosMetadata;
}

/**
 * Catálogo simplificado para almacenamiento local
 */
export interface CatalogoSimple {
  catalogoId: string;
  grupo: string;
  nombre: string;
  valorCore: string;
  padreId: string | null;
  padreValorCore: string | null;
  activo: boolean;
  orden: number;
}

/**
 * Data de la respuesta de configuración de catálogos
 */
export interface ConfiguracionData {
  key: string;
  value: string; // This is a JSON string of an array
  type: string;
  description: string;
}

/**
 * Respuesta de configuración de catálogos
 */
export interface ConfiguracionCatalogosResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: ConfiguracionData;
}
