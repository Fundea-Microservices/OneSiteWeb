// ─── Envoltorio de respuesta ──────────────────────────────────────────────────

export interface PrecargaMetadata {
  total: number;
  page?: number;
  limit?: number;
}

export interface PrecargaListResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T[];
  metadata: PrecargaMetadata;
}

export interface PrecargaSingleResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
}

// ─── Configuración de precarga ─────────────────────────────────────────────────

/**
 * Campo de búsqueda que alimenta una pregunta (Documento/Nombres/Operación).
 * Omitir para las preguntas que solo transportan datos hacia la encuesta.
 * Solo una pregunta por configuración puede tener cada tipo.
 *
 * 'CUENTA' se retiró: la columna Cuenta de la precarga viene siempre de
 * NO_CUENTA (columna fija de la plantilla), no de una pregunta configurada.
 */
export type TipoConfigDetalle = 'DOCUMENTO' | 'NOMBRES' | 'OPERACION';

export const TIPOS_CONFIG_DETALLE: TipoConfigDetalle[] = ['DOCUMENTO', 'NOMBRES', 'OPERACION'];

export const TIPO_CONFIG_DETALLE_LABEL: Record<TipoConfigDetalle, string> = {
  DOCUMENTO: 'Documento',
  NOMBRES: 'Nombres',
  OPERACION: 'Operación',
};

/** Lo que se envía al crear o actualizar. */
export interface IConfigDetalleItem {
  idPregunta: number;
  etiqueta: string;
  tipo?: TipoConfigDetalle | null;
  /**
   * Posición de la columna en el Excel, desde 1. Se omite siempre: el orden
   * en que quedan los elementos del arreglo es lo que define la columna.
   */
  orden?: number;
}

/** Lo que devuelve el servidor. Siempre trae orden, renumerado 1..N. */
export interface IConfigDetalle extends IConfigDetalleItem {
  id: string;
  idEncabezado: string;
  tipo: TipoConfigDetalle | null;
  orden: number;
  createdAt: string;
  updatedAt: string | null;
  deletedAt: string | null;
}

export interface IConfigEncabezado {
  id: string;
  idEncuesta: number;
  nombre: string;
  idUsuarioCrea: string;
  usuarioCrea: string;
  origen: string;
  /** Se incrementa en cada actualización. */
  version: number;
  activo: boolean;
  createdAt: string;
  updatedAt: string | null;
  deletedAt: string | null;
}

/** Respuesta de POST /config y GET /config/:id */
export interface IConfigEncabezadoConDetalle extends IConfigEncabezado {
  detalles: IConfigDetalle[];
}

// ─── Payloads ───────────────────────────────────────────────────────────────

export interface ICreateConfigEncabezado {
  idEncuesta: number;
  nombre: string;
  idUsuarioCrea: string;
  usuarioCrea: string;
  origen: string;
  activo?: boolean;
  detalles: IConfigDetalleItem[];
}

/**
 * Si se omite `detalles`, solo cambia el encabezado y las preguntas quedan
 * como estaban. Si se envía, reemplaza el detalle completo. En ambos casos
 * la versión sube.
 */
export type IUpdateConfigEncabezado = Partial<ICreateConfigEncabezado>;

export interface IConfigFilters {
  page?: number;
  limit?: number;
  search?: string;
  idEncuesta?: number;
  activo?: boolean;
  all?: boolean;
}

// ─── Carga masiva del Excel ─────────────────────────────────────────────────

export type DecisionDuplicados = 'OMITIR' | 'INCLUIR';
export type MotivoDuplicado = 'EN_ARCHIVO' | 'EN_BASE';

export interface IFilaDuplicada {
  numeroFila: number;
  motivo: MotivoDuplicado;
  documento: string | null;
  nombres: string | null;
  cuenta: string | null;
  operacion: string | null;
}

export interface IErrorFila {
  numeroFila: number;
  mensaje: string;
}

/** Respuesta de POST /config/:id/validar. No escribe nada, solo reporta. */
export interface IValidacionArchivo {
  idConfiguracion: string;
  versionConfig: number;
  resumen: {
    totalFilas: number;
    nuevas: number;
    duplicadas: number;
    duplicadasEnArchivo: number;
    duplicadasEnBase: number;
    conError: number;
  };
  requiereDecision: {
    duplicados: boolean;
    errores: boolean;
  };
  duplicadas: IFilaDuplicada[];
  errores: IErrorFila[];
  /** true si `duplicadas` o `errores` se recortaron a 200 elementos. */
  detalleTruncado: boolean;
}

/** Respuesta de POST /config/:id/carga-masiva. */
export interface IResultadoCarga {
  idLogPrecarga: string;
  decisionDuplicados: DecisionDuplicados;
  resumen: {
    totalFilas: number;
    insertadas: number;
    duplicadas: number;
    duplicadasIncluidas: number;
    conError: number;
  };
  procesadoErrores: boolean;
  errores: IErrorFila[];
  detalleTruncado: boolean;
}

/** Decisiones del usuario que acompañan la confirmación (paso 2). */
export interface IDecisionesCarga {
  usuarioCrea: string;
  /** OMITIR (por defecto) descarta las duplicadas; INCLUIR las inserta igual. */
  duplicados?: DecisionDuplicados;
  /** false (por defecto): un solo error descarta el archivo entero. */
  procesarConErrores?: boolean;
}
