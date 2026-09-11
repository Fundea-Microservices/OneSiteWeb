/** Plantilla de Excel descargable (carga masiva, formatos, etc.) administrada en `/plantillas`. */
export interface IPlantilla {
  plantillaId: string;
  /** Identificador lógico único, ej. "plantilla_usuarios_onesiteex". No se puede cambiar. */
  codigo: string;
  nombre: string;
  descripcion: string | null;
  /** Microservicio dueño, ej. "onesite-ex-ms". */
  modulo: string;
  /** Agrupación libre, ej. "carga_masiva". */
  categoria: string | null;
  /** Uso interno del backend, no mostrar. */
  rutaArchivo: string;
  mimeType: string;
  tamanioBytes: number;
  /** Empieza en 1 y sube +1 cada vez que se reemplaza el archivo. */
  version: number;
  activo: boolean;
  /** Id del usuario que subió el archivo. */
  actualizadoPor: string | null;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
}

interface PlantillaApiResponse<T, M = undefined> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  metadata?: M;
}

/** Con `all=true` la metadata trae solo `total`. */
export type PlantillaListResponse = PlantillaApiResponse<IPlantilla[], { total: number; page?: number; limit?: number }>;
export type PlantillaByCodigoResponse = PlantillaApiResponse<IPlantilla>;
export type PlantillaDeleteResponse = PlantillaApiResponse<{ codigo: string }>;

export interface PlantillaFiltros {
  page?: number;
  limit?: number;
  /** Busca por nombre (contiene). */
  search?: string;
  modulo?: string;
  categoria?: string;
  /** Sin valor trae activas e inactivas. */
  activo?: boolean;
  /** Sin paginación. */
  all?: boolean;
}

/** Campos de texto del alta; el archivo va aparte en el campo `file` del multipart. */
export interface CreatePlantillaDto {
  codigo: string;
  nombre: string;
  modulo: string;
  categoria?: string;
  descripcion?: string;
}

/** El backend rechaza (400) cualquier campo fuera de estos, incluido `codigo`. */
export type UpdatePlantillaDto = Partial<{
  nombre: string;
  descripcion: string;
  modulo: string;
  categoria: string;
  activo: boolean;
}>;
