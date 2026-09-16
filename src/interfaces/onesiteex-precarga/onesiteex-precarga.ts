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

// ─── Gestión de precargas ───────────────────────────────────────────────────

export const ESTADOS_PRECARGA = ['CARGADO', 'APLICADO', 'FINALIZADO', 'ANULADO', 'RECHAZADO'] as const;

export type EstadoPrecarga = (typeof ESTADOS_PRECARGA)[number];

/** Captura local que la app móvil usa para prellenar la encuesta. */
export interface IPrecargaValor {
  id: string | null;
  id_pregunta: string;
  id_encuesta: string;
  valor: string;
  uuid_instancia: string | null;
  estado_sincro: number;
  fecha_inicio: string | null;
  fecha_fin: string | null;
}

/** Elemento de GET /precarga/detalle. */
export interface IPrecargaDetalle {
  id: string;
  idLogPrecarga: string;
  idConfiguracion: string;
  idEncuesta: number;
  idEmpresa: number;
  encuestador: string | null;
  idEncuestador: number | null;
  documento: string | null;
  nombres: string | null;
  cuenta: string | null;
  operacion: string | null;
  /** true: la precarga es para toda la empresa, no para un encuestador. */
  todos: boolean;
  estado: EstadoPrecarga;
  valores: IPrecargaValor[];
  usrActualiza: string | null;
  idUsrActualiza: string | null;
  comentario: string | null;
  createdAt: string;
  updatedAt: string | null;
  deletedAt: string | null;
}

export interface IDetallePrecargaFilters {
  /** YYYY-MM-DD, inclusiva. */
  fechaInicio: string;
  /** YYYY-MM-DD, inclusiva: abarca todo ese día. */
  fechaFin: string;
  idEncuesta?: number;
  idEmpresa?: number;
  /** Usuarios_AppEx.IdUsuario. No incluye las precargas marcadas para toda la empresa. */
  idEncuestador?: number;
  estado?: EstadoPrecarga;
  page?: number;
  limit?: number;
  all?: boolean;
}

/** Tope de ids por solicitud de anulación (límite de parámetros de SQL Server). */
export const MAX_PRECARGAS_ANULAR = 1000;
export const MAX_COMENTARIO_ANULACION = 500;

export interface IAnularPrecargas {
  ids: string[];
  comentario: string;
}

export type MotivoNoAnulada = 'NO_ENCONTRADA' | 'ELIMINADA' | 'ESTADO_NO_PERMITIDO';

export const MOTIVO_NO_ANULADA_LABEL: Record<MotivoNoAnulada, string> = {
  NO_ENCONTRADA: 'No encontrada',
  ELIMINADA: 'Lote revertido',
  ESTADO_NO_PERMITIDO: 'Ya no estaba en CARGADO',
};

export interface IPrecargaNoAnulada {
  id: string;
  motivo: MotivoNoAnulada;
  /** Estado actual; null cuando la precarga no existe. */
  estado: EstadoPrecarga | null;
}

/** Respuesta de POST /precarga/anular. No es todo o nada. */
export interface IAnularPrecargasResultado {
  anuladas: string[];
  noAnuladas: IPrecargaNoAnulada[];
}
