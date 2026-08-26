// ─── Envoltorio de respuesta ──────────────────────────────────────────────────

export interface AuthExMetadata {
  total: number;
  page?: number;
  limit?: number;
  idUsuario?: number;
}

export interface AuthExListResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T[];
  metadata: AuthExMetadata;
}

export interface AuthExSingleResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
}

// ─── Empresa ──────────────────────────────────────────────────────────────────

export interface IEmpresaEx {
  idEmpresa: number;
  nombreEmpresa: string;
  codigoEnrolamiento: string;
  estado: boolean;
  fechaCreacion: string;
  codigo: string | null;
}

/** Payload de creación/edición. El backend usa forbidNonWhitelisted: solo estos campos. */
export interface IEmpresaExUpsert {
  idEmpresa?: number;
  nombreEmpresa?: string;
  codigoEnrolamiento?: string;
  /** Clave corta usada en la carga masiva de usuarios (p. ej. GTDEMO). */
  codigo?: string | null;
  estado?: boolean;
}

// ─── Rol ──────────────────────────────────────────────────────────────────────

export interface IRolEx {
  idRol: number;
  nombreRol: string;
  /** Llega como string JSON, hay que parsearlo. Forma actual: {"modulos": ["encuestas"]} */
  permisosJSON: string;
  accesoLectura: boolean;
  accesoEscritura: boolean;
  codigo: string | null;
}

export interface IRolExPermisos {
  modulos?: string[];
  [key: string]: unknown;
}

// ─── Usuario ──────────────────────────────────────────────────────────────────

export interface IUsuarioEx {
  idUsuario: number;
  username: string;
  nombreCompleto: string;
  idEmpresa: number;
  idRol: number;
  /** true = Alta, false = Baja */
  estado: boolean;
  tipoCarga: string;
  fechaCreacion: string;
}

/** Payload de creación/edición. El backend usa forbidNonWhitelisted: solo estos campos. */
export interface IUsuarioExUpsert {
  idUsuario?: number;
  username?: string;
  password?: string;
  nombreCompleto?: string;
  idEmpresa?: number;
  idRol?: number;
  estado?: boolean;
  tipoCarga?: string;
}

// ─── Carga masiva ─────────────────────────────────────────────────────────────

export interface ICargaMasivaResultado {
  fecha: string;
  cantidad: number;
  cantidadRegistrada: number;
  cantidadErrores: number;
  /** Errores separados por "; ", cada uno con el prefijo "FILA n - " */
  mensajeError: string | null;
}

// ─── Dispositivo ──────────────────────────────────────────────────────────────

export interface IDispositivoEx {
  idDispositivo: number;
  hardwareID: string;
  deviceToken: string;
  estado: boolean;
  fechaIngreso: string;
  fechaModificacion: string;
  modelo: string | null;
  versionSO: string | null;
  idEmpresa: number | null;
}

// ─── Sesión ───────────────────────────────────────────────────────────────────

export interface ISesionEx {
  idSesion: number;
  idUsuario: number;
  idDispositivo: number;
  refreshToken: string;
  fechaExpiracion: string;
  activa: boolean;
}

// ─── Filtros ──────────────────────────────────────────────────────────────────

export interface IEmpresaExFilters {
  page?: number;
  limit?: number;
  search?: string;
  estado?: boolean;
  all?: boolean;
}

export interface IRolExFilters {
  page?: number;
  limit?: number;
  search?: string;
  all?: boolean;
}

export interface IUsuarioExFilters {
  page?: number;
  limit?: number;
  search?: string;
  idEmpresa?: number;
  idRol?: number;
  estado?: boolean;
  all?: boolean;
}

export interface IDispositivoExFilters {
  page?: number;
  limit?: number;
  search?: string;
  estado?: boolean;
  all?: boolean;
}

export interface ISesionExFilters {
  page?: number;
  limit?: number;
  idDispositivo?: number;
  activa?: boolean;
  /** true = fechaExpiracion > ahora */
  vigente?: boolean;
  all?: boolean;
}
