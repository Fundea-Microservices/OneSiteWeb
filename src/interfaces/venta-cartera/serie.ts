export interface SerieMetadata {
  total: number;
  page: number;
  limit: number;
  totalPages?: number;
}

export interface SerieEncabezado {
  serieId?: string;
  identificador: string;
  empresaNombre?: string;
  empresaId?: string;
  observaciones?: string;
  estado?: string;
  usuarioNombre?: string;
  usuarioId?: string;
  created_at?: string | Date;
  updated_at?: string | Date;
  deleted_at?: string | Date | null;
  detallesRegistrados?: number;
  detallesActivos?: number;
  saldo?: number;
}

export interface SerieEncabezadoResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: SerieEncabezado[];
  metadata: SerieMetadata;
}

export interface SerieEncabezadoByIdResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: SerieEncabezado;
}

export interface SerieDetalle {
  id?: string;
  frontendId?: string;
  serieId: string;
  activo?: boolean;
  programa?: string;
  destinoCredito?: string;
  actividadCliente?: string;
  cuenta?: string;
  operacion?: string;
  tipoOperacion?: string;
  estado?: string;
  nombreCliente?: string;
  domicilioDepto?: string;
  domicilioMuni?: string;
  agenciaColocacion?: string;
  genero?: string;
  calificacionCliente?: string;
  tipoGarantia?: string;
  codigoGarantiaAsociado?: string;
  modalidadAmortizacionCapital?: string;
  modalidadPagoIntereses?: string;
  tipoTasa?: string;
  creditoReestructurado?: string;
  garantiaCompartidaExclusiva?: string;
  modulo?: number;
  edad?: number;
  diasMora?: number;
  cantidadGarantia?: number;
  plazoMeses?: number;
  maduracionMeses?: number;
  montoOtorgado?: number;
  saldoCapital?: number;
  capitalMora?: number;
  interesesMoratorios?: number;
  valorGarantiaActual?: number;
  ltv?: number;
  relacionGarantiaPrestamo?: number;
  tasaInteresOrigen?: number;
  tasaInteresMensual?: number;
  tasaMoraActual?: number;
  ingresosMensualesReportados?: number;
  fechaNac?: string;
  fechaOtorgamiento?: string;
  fechaVencimiento?: string;
  created_at?: string | Date;
  updated_at?: string | Date;
  deleted_at?: string | Date | null;
}

export interface SerieDetalleResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: SerieDetalle[];
  metadata: SerieMetadata;
}

export interface SerieDetalleByIdResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: SerieDetalle;
}

export interface ValidarDetalleDuplicadoDto {
  frontendId: string;
  cuenta?: string;
  operacion?: string;
  tipoOperacion?: string;
}

export interface ValidarDuplicadosResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: {
    ids: string[];
    registros: number;
    registrosDuplicados: number;
  };
}