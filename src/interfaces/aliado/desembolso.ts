export type EstadoLote = 'SOLICITADO' | 'PROCESADO' | 'APROBADO' | 'RECHAZADO';
export type EstadoValidacion = 'PENDIENTE' | 'VALIDO' | 'NO_VALIDO';

export const ESTADOS_LOTE: EstadoLote[] = ['SOLICITADO', 'PROCESADO', 'APROBADO', 'RECHAZADO'];

export interface DesembolsoResponse<T> {
  success: boolean;
  statusCode: string;
  path?: string;
  timestamp?: string;
  message: string;
  data: T;
  metadata: { total: number; page: number; limit: number } | null;
}

export interface ILoteDesembolso {
  id: string;
  lote: string;                 // "LOT-001"
  numeroLote: number;
  periodo: string;              // "2026-09"
  fechaInicio: string;          // date: formatear en UTC
  fechaFin: string;             // date: formatear en UTC
  fechaEjecucion: string;
  desembolsos: number;          // Total casos
  aprobados: number;            // Casos válidos (validado = true)
  rechazados: number;           // Casos rechazados (validado = false)
  pendientes: number;           // validado = null
  montoAprobado: number;
  estado: EstadoLote;
  observaciones: string | null;
  usuarioId: string;
  usuario: string;
  usuarioIdProceso: string | null;
  usuarioProceso: string | null;
  fechaProceso: string | null;
  usuarioIdResolucion: string | null;
  usuarioResolucion: string | null;
  fechaResolucion: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface IDesembolsoReferido {
  id: string;
  ejecucionId: string;
  // Aliado
  idEmpresa: string;
  cuentaRepresentante: string | null;
  usuarioEmpresa: string;
  username: string;
  nombreEmpresa: string;
  // Referido
  origenCaptacion: string | null;
  dpi: string;
  fechaNacimiento: string | null;
  primerNombre: string;
  segundoNombre: string;
  primerApellido: string;
  segundoApellido: string;
  telefono: string | null;
  gestion: string | null;
  monto: number | null;
  plazo: string | null;
  fechaReferenciacion: string | null;
  observaciones: string | null;
  fechaRegistro: string | null;
  // Operación Bantotal
  cuenta: string;               // bigint → string
  sucursal: number;
  tipoOperacion: number;
  operacion: string;            // bigint → string
  ciclo: number | null;
  montoOtorgado: number;
  fechaVigencia: string;
  fechaVencimiento: string;
  // Lote
  lote: string;
  fechaLote: string;
  aplicaComision: string | null;
  causa: string | null;
  // Validación
  validado: boolean | null;     // null = pendiente
  comentarioValidado: string | null;
  created_at: string;
}

export interface GenerarLoteRequest {
  periodo: string;              // "YYYY-MM", solo meses anteriores al actual
}

export interface ListarLotesQuery {
  page?: number;
  limit?: number;
  fechaDesde?: string;          // "YYYY-MM-DD"
  fechaHasta?: string;          // "YYYY-MM-DD"
  lote?: string;
  estado?: EstadoLote;
}

export interface ListarDesembolsosQuery {
  page?: number;
  limit?: number;
  validacion?: EstadoValidacion;
  busqueda?: string;
}

export interface ValidacionDesembolso {
  id: string;
  validado: boolean;
  comentarioValidado?: string;  // obligatorio si validado === false (máx. 500)
}

export interface ProcesarLoteRequest {
  detalles: ValidacionDesembolso[];
}

export interface AprobarLoteRequest {
  observaciones?: string;
}

export interface RechazarLoteRequest {
  observaciones: string;
}
