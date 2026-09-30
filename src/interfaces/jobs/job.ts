/**
 * PATTERN: envía un mensaje NATS a otro microservicio.
 * PROCEDIMIENTO: ejecuta un procedimiento almacenado del esquema `jobs`.
 */
export type JobTipo = 'PATTERN' | 'PROCEDIMIENTO';

/** Tarea programada que el scheduler ejecuta automáticamente en la fecha/hora configurada. */
export interface IJob {
  jobId: string;
  nombre: string;
  descripcion?: string | null;
  /** Los jobs anteriores a los tipos no lo traen y se tratan como PATTERN. */
  tipo?: JobTipo;
  /** Solo PATTERN. Mensaje NATS que invoca el scheduler, ej. "reportes.generar.cierre". */
  pattern?: string | null;
  /** Solo PATTERN. JSON serializado como string, ej. '{"tipo":"diario"}'. */
  payload?: string | null;
  /** Solo PROCEDIMIENTO. "esquema.nombre", ej. "jobs.sp_CierreDiarioCartera". */
  procedimiento?: string | null;
  /** 0 = todos los meses, 1-12. */
  mes: number;
  /** 0 = todos los días, 1-31. */
  dia: number;
  /** "HH:MM" en 24 h, hora de Guatemala. */
  hora: string;
  activo: boolean;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
}

/**
 * Registro de la bitácora (solo lectura: lo crea el sistema en cada ejecución).
 * Solo trae el `jobId`: el nombre se resuelve en el frontend.
 */
export interface IJobEjecucion {
  ejecucionId: string;
  jobId: string;
  fechaEjecucion: string;
  /** null = en progreso, true = éxito, false = fallo. */
  exitoso: boolean | null;
  mensaje: string | null;
  duracionMs: number | null;
  created_at: string;
  updated_at: string | null;
}

interface JobApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
}

export interface JobMetadata {
  total: number;
  page: number;
  limit: number;
}

export type JobListResponse = JobApiResponse<{ jobs: IJob[]; metadata: JobMetadata }>;
export type JobResponse = JobApiResponse<IJob>;
export type JobDeleteResponse = JobApiResponse<{ job: IJob }>;
export type JobEjecucionListResponse = JobApiResponse<{ ejecuciones: IJobEjecucion[]; metadata: JobMetadata }>;
export type JobEjecucionResponse = JobApiResponse<IJobEjecucion>;
/** La ejecución manual responde de inmediato (statusCode 202) con la ejecución recién creada. */
export type JobEjecutarResponse = JobApiResponse<IJobEjecucion>;

export interface JobFiltros {
  page?: number;
  limit?: number;
  /** Busca por nombre. */
  search?: string;
  /** Sin valor trae activos e inactivos. */
  active?: boolean;
  /** Sin paginación. En este modo el backend ignora `active` y `search`. */
  all?: boolean;
}

export interface JobEjecucionFiltros {
  page?: number;
  limit?: number;
  jobId?: string;
  exitoso?: boolean;
}

/** Enviar un campo que no corresponde al `tipo` (ej. `pattern` en un PROCEDIMIENTO) responde 400. */
export interface CreateJobDto {
  nombre: string;
  hora: string;
  /** Por defecto PATTERN. */
  tipo?: JobTipo;
  /** Requerido si tipo = PATTERN. */
  pattern?: string;
  /** Solo PATTERN. String JSON, no objeto. */
  payload?: string;
  /** Requerido si tipo = PROCEDIMIENTO. */
  procedimiento?: string;
  descripcion?: string;
  mes?: number;
  dia?: number;
  activo?: boolean;
}

/**
 * El backend rechaza (400) cualquier campo fuera de estos, incluido `jobId`.
 * Al cambiar de tipo se envía el tipo nuevo con su campo; el backend limpia los del tipo anterior.
 * `payload: null` quita el payload.
 */
export type UpdateJobDto = Partial<Omit<CreateJobDto, 'payload'>> & { payload?: string | null };
