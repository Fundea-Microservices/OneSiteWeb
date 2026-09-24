// ─── Envoltorio de respuesta ──────────────────────────────────────────────────

export interface CapturaMetadata {
  total: number;
  page?: number;
  limit?: number;
}

export interface CapturaListResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T[];
  metadata: CapturaMetadata;
}

export interface CapturaSingleResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
}

// ─── Validación ───────────────────────────────────────────────────────────────

/**
 * Valor de una marca del supervisor (`Revisado` / `Validado`).
 *
 * `null` es el tercer estado y significa "sin marcar": es el único desde el que
 * se puede marcar, y por eso no forma parte de este tipo, que describe lo que
 * se puede escribir.
 */
export type Marca = 'Si' | 'No';

/** Las dos marcas son independientes: ninguna exige a la otra. */
export type CampoMarca = 'revisado' | 'validado';

export const MARCA_LABEL: Record<CampoMarca, Record<Marca, string>> = {
  revisado: { Si: 'Revisada', No: 'Rechazada' },
  validado: { Si: 'Validada', No: 'Rechazada' },
};

// ─── Encuesta contestada ──────────────────────────────────────────────────────

/**
 * Elemento de GET /onesiteex/captura: una encuesta ya contestada en campo.
 *
 * Cliente, cuenta y operación salen de la precarga de origen, no de la captura.
 * Una captura ad-hoc (levantada sin precarga) trae `idPrecarga` en null y esos
 * tres campos vacíos.
 */
export interface ICaptura {
  /** BIGINT: viaja como string para no perder precisión. */
  idCaptura: string;
  idEncuesta: number;
  nombreEncuesta: string | null;
  /** Usuarios_AppEx.IdUsuario del encuestador que la levantó. */
  idEncuestador: number;
  encuestador: string | null;
  username: string | null;
  /** Empresa del encuestador: la captura no la guarda. */
  idEmpresa: number | null;
  nombreEmpresa: string | null;
  /** DATETIME sin zona, ya en hora local (America/Guatemala). */
  fechaInicio: string;
  fechaFin: string;
  idPrecarga: string | null;
  documento: string | null;
  cliente: string | null;
  cuenta: string | null;
  operacion: string | null;
  /** Marcas del supervisor. null = sin marcar, que es cuando se ofrece el botón. */
  revisado: Marca | null;
  validado: Marca | null;
  /** Username de OneSiteWeb de quien puso cada marca. */
  usuarioRevisor: string | null;
  usuarioValidador: string | null;
}

/** Una respuesta del encuestado dentro de una sección. */
export interface IRespuestaCaptura {
  idPregunta: number;
  /** appEx_Pregunta.Codigo: el número de pregunta que se muestra. */
  codigo: number;
  /** appEx_Pregunta.Etiqueta: el texto de la pregunta. */
  pregunta: string;
  /**
   * Distingue las filas de una matriz: varias respuestas a la misma pregunta
   * solo se diferencian por este uuid. null fuera de las matrices.
   */
  uuidInstancia: string | null;
  valor: string | null;
}

export interface ISeccionCaptura {
  idSeccion: number;
  seccion: string;
  orden: number;
  respuestas: IRespuestaCaptura[];
}

/** Respuesta de GET /onesiteex/captura/:id. */
export interface ICapturaDetalle extends ICaptura {
  secciones: ISeccionCaptura[];
}

export interface ICapturaFilters {
  /** YYYY-MM-DD, inclusiva. Acota por la fecha de finalización de la encuesta. */
  fechaInicio?: string;
  /** YYYY-MM-DD, inclusiva: abarca todo ese día. */
  fechaFin?: string;
  idEncuesta?: number;
  idEncuestador?: number;
  idEmpresa?: number;
  /** 'PENDIENTE' son las que siguen sin validar. */
  validado?: Marca | 'PENDIENTE';
  page?: number;
  limit?: number;
  all?: boolean;
}

/** Resultado de PATCH /onesiteex/captura/:id/revisar y .../validar. */
export interface IMarcarCapturaResultado {
  idCaptura: string;
  /** Viene la marca que se escribió: `revisado` o `validado`, según la ruta. */
  revisado?: Marca;
  validado?: Marca;
  usuario: string;
}
