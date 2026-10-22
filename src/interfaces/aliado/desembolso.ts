export type EstadoLote = 'SOLICITADO' | 'PROCESADO' | 'APROBADO' | 'RECHAZADO' | 'PAGADO';
export type EstadoValidacion = 'PENDIENTE' | 'VALIDO' | 'NO_VALIDO';
export type CategoriaComision = 'A' | 'B' | 'C';

export const ESTADOS_LOTE: EstadoLote[] = ['SOLICITADO', 'PROCESADO', 'APROBADO', 'RECHAZADO', 'PAGADO'];

/** Estados que se trabajan en la vista de Aprobación de Lotes para Pago */
export const ESTADOS_APROBACION_PAGO: EstadoLote[] = ['PROCESADO', 'APROBADO', 'PAGADO'];

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
  totalComision: number | null; // se llena al aprobar
  estado: EstadoLote;
  observaciones: string | null; // comentario de aprobación / motivo de rechazo
  usuarioId: string;            // generó
  usuario: string;
  usuarioIdProceso: string | null;    // validó
  usuarioProceso: string | null;
  fechaProceso: string | null;
  usuarioIdResolucion: string | null; // aprobó / rechazó
  usuarioResolucion: string | null;
  fechaResolucion: string | null;
  usuarioIdPago: string | null;       // marcó como pagado
  usuarioPago: string | null;
  fechaPago: string | null;
  observacionesPago: string | null;
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
  estados?: string;             // varios estados separados por coma: "PROCESADO,APROBADO,PAGADO"
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

export interface PagarLoteRequest {
  observaciones?: string;
}

// ─── Comisiones ──────────────────────────────────────────────────────────────

export interface ICategoriaComision {
  categoria: CategoriaComision;
  minCasos: number;
  maxCasos: number | null;      // null = sin límite
  comisionPorCaso: number;
  montoMaximo: number | null;   // null = sin límite
}

export interface ICuentaDestino {
  nombreBanco: string | null;
  tipoCuenta: string | null;
  numeroCuenta: string | null;
  nombreCuenta: string | null;
}

export interface IComisionEmpresa {
  idEmpresa: string;
  nombreEmpresa: string | null;
  regionId: number | null;
  agenciaId: number | null;
  agenciaNombre: string | null;
  casos: number;
  casosValidos: number;
  casosNoValidos: number;
  montoDesembolsado: number;
  categoria: CategoriaComision | null; // null = sin casos válidos
  comisionPorCaso: number;
  totalComision: number;
  cuentaDestino: ICuentaDestino | null;
}

export interface IResumenComisiones {
  lote: ILoteDesembolso;
  preliminar: boolean;          // true = aún no aprobado, calculado con tarifas vigentes
  categorias: ICategoriaComision[];
  empresas: IComisionEmpresa[];
  totales: { empresas: number; casosValidos: number; montoDesembolsado: number; totalComision: number };
  oficialValidacion: {
    generadoPor: string;
    fechaGeneracion: string;
    validadoPor: string | null;
    fechaValidacion: string | null;
  };
}

export interface IClientesEmpresa {
  lote: { id: string; lote: string; periodo: string; estado: EstadoLote };
  empresa: IComisionEmpresa;
  estadoPago: 'PENDIENTE' | 'PAGADO';
  clientes: IDesembolsoReferido[];
}
