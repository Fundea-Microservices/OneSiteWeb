// ─── Módulo de Scoring Crediticio ─────────────────────────────────────────────
//
// Contrato con client-gateway (/scoring/*). Los códigos de mensaje
// (OK-SCOR-*, ERR-SCOR-*) vienen del catálogo de la especificación funcional y
// son los que deciden qué toast se muestra.

/** Respuesta de toda operación de escritura. */
export interface RespuestaScoring<T> {
  success: boolean;
  codigo: string;
  message: string;
  data: T;
}

/** Respuesta de los listados paginados. */
export interface PaginadoScoring<T> {
  items: T[];
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
}

export type Estado = 'Activo' | 'Inactivo';
export type Semaforo = 'Gris' | 'Verde' | 'Amarillo' | 'Naranja' | 'Rojo';
export type SemaforoDictamen = Exclude<Semaforo, 'Gris'>;
export type EstadoEvaluacion = 'Solicitud' | 'Procesado';

/**
 * De dónde salieron los datos del cliente de una evaluación.
 * Qué orígenes admite cada modelo lo dicen origenBantotal y origenCaptura.
 */
export type OrigenDatos = 'Bantotal' | 'Captura';

export type TipoPregunta =
  | 'Casilla'
  | 'Texto'
  | 'Entero'
  | 'Decimal'
  | 'BotonOpcion'
  | 'Desplegable';

/** Tipos que exigen catálogo de respuestas (ERR-SCOR-004). */
export const TIPOS_PREGUNTA_SELECCION: TipoPregunta[] = [
  'BotonOpcion',
  'Desplegable',
];

export const TIPOS_PREGUNTA: { valor: TipoPregunta; etiqueta: string }[] = [
  { valor: 'Casilla', etiqueta: 'Casilla de verificación' },
  { valor: 'Texto', etiqueta: 'Texto' },
  { valor: 'Entero', etiqueta: 'Número entero' },
  { valor: 'Decimal', etiqueta: 'Decimal' },
  { valor: 'BotonOpcion', etiqueta: 'Botón de opción' },
  { valor: 'Desplegable', etiqueta: 'Lista desplegable' },
];

// ─── Pantalla 1: Creación de Scoring ─────────────────────────────────────────

export interface ITipoScoring {
  idTipoScoring: number;
  descripcion: string;
  /** true = el punteo lo calcula un procedimiento almacenado. */
  ejecutaProcedimiento: boolean;
  estado: Estado;
}

export interface IRangoDictamen {
  rangoId?: number;
  scoringId?: number;
  semaforo: SemaforoDictamen;
  /** Inclusivo. */
  puntajeMinimo: number;
  /** Inclusivo. */
  puntajeMaximo: number;
  descripcion?: string | null;
}

/**
 * Una fila de ModeloScoring es una VERSIÓN de un modelo, no un modelo: FU01 v1
 * y FU01 v2 son registros distintos con scoringId propio. Una evaluación queda
 * amarrada a la versión con la que se calculó.
 */
export interface IModeloScoring {
  scoringId?: number;
  codigoInterno: string;
  version?: number;
  nombreScoring: string;
  descripcion: string;
  idTipoScoring: number;
  /** Solo si el tipo ejecuta procedimientos. */
  procesoVariables?: string | null;
  procesoPunteo?: string | null;
  /** AAAA-MM-DD. */
  fechaVigencia: string;
  estado: Estado;
  /** Toma los datos del cliente del Core Bantotal. */
  origenBantotal: boolean;
  /** Admite captura manual de los datos del cliente. */
  origenCaptura: boolean;
  ordenDespliegue?: number;
  fechaCreacion?: string;
  usuarioCreacion?: string | null;
  fechaModificacion?: string | null;
  usuarioModificacion?: string | null;
  tipoScoring?: ITipoScoring;
  rangos?: IRangoDictamen[];
}

// ─── Pantalla 2: Catálogo de Variables ───────────────────────────────────────

export interface ICatalogoVariable {
  catalogoId?: number;
  scoringId: number;
  /** Mapeo al Core Bantotal (BT_CAT_01). */
  codigoExterno?: string | null;
  descripcionCatalogo: string;
  estado: Estado;
  ordenDespliegue?: number;
  opciones?: IOpcionVariable[];
}

export interface IOpcionVariable {
  opcionId?: number;
  catalogoId: number;
  codigoOpcion: string;
  descripcionOpcion: string;
  peso: number;
  constante: number;
  valorReferencia: number;
  coeficienteA: number;
  coeficienteB: number;
  observacionesVar?: string | null;
  /** Cascada: la opción de Municipio apunta a la de Departamento. */
  opcionPadreId?: number | null;
  estado: Estado;
  ordenDespliegue?: number;
}

// ─── Pantalla 3: Gestión de Preguntas ────────────────────────────────────────

export interface IPreguntaDinamica {
  preguntaId?: number;
  scoringId: number;
  /** P1, P01... Es lo que referencian las fórmulas de otras preguntas. */
  codigoPregunta: string;
  enunciado: string;
  tipoPregunta: TipoPregunta;
  /** null = "Ninguno". */
  catalogoRespuestasId?: number | null;
  peso: number;
  constante: number;
  valorReferencia: number;
  coeficienteA: number;
  coeficienteB: number;
  preguntaVisible: boolean;
  /** FlgCalculo del origen: la pregunta participa del cálculo del punteo. */
  preguntaCalculada: boolean;
  /** Su valor sale de una fórmula en vez de capturarse. */
  respuestaCalculada: boolean;
  /**
   * Sintaxis "P01 - P02". Obligatoria si respuestaCalculada y no se indicó una
   * rutina en calculoId.
   */
  formula?: string | null;
  /**
   * Rutina de scoring.Calculo que resuelve el valor cuando no sale de una
   * operación entre campos de pantalla (RTE). Alternativa a formula.
   */
  calculoId?: number | null;
  /**
   * Bandera RTE del sistema de origen: la respuesta misma se calcula a partir
   * de otras preguntas antes de derivar x y los coeficientes.
   */
  requiereRTE?: boolean;
  aplicaScore: boolean;
  observacionesPregunta?: string | null;
  /** Dependencia padre-hijo: Municipio depende de Departamento. */
  preguntaPadreId?: number | null;
  ordenDespliegue?: number;
  catalogoRespuestas?: ICatalogoVariable | null;
}

export interface IValidacionFormula {
  valida: boolean;
  /** Códigos de pregunta que la fórmula necesita. */
  referencias: string[];
}

// ─── Pantalla 4: Evaluación de Crédito ───────────────────────────────────────

/**
 * Datos que devuelve el Core Bantotal al consultar una solicitud. Son solo
 * lectura y el front los reenvía tal cual al guardar: scoring-ms los persiste
 * como snapshot del día del dictamen, no como referencia al core.
 */
export interface ISolicitudBantotal {
  numeroSolicitud: number;
  numeroOperacion: number | null;
  nombreCliente: string;
  dpi: string;
  cuenta: string;
  direccion: string | null;
  region: string | null;
  agencia: string | null;
  montoCredito: number;
  productoCredito: string;
}

export interface IRespuestaCaptura {
  preguntaId: number;
  /** Obligatorio en preguntas de selección. */
  opcionId?: number | null;
  valorIngresado?: string | null;
}

/** Pregunta tal como la entrega el endpoint de cuestionario, lista de renderizar. */
export interface IPreguntaCuestionario {
  preguntaId: number;
  codigoPregunta: string;
  enunciado: string;
  tipoPregunta: TipoPregunta;
  respuestaCalculada: boolean;
  formula: string | null;
  aplicaScore: boolean;
  ordenDespliegue: number;
  opciones: {
    opcionId: number;
    codigoOpcion: string;
    descripcionOpcion: string;
  }[];
}

export interface ICuestionario {
  scoring: {
    scoringId: number;
    codigoInterno: string;
    version: number;
    nombreScoring: string;
  };
  preguntas: IPreguntaCuestionario[];
}

export interface IEvaluacionCredito {
  evaluacionId?: number;
  numeroSolicitud: number;
  numeroOperacion?: number | null;
  scoringId: number;
  nombreCliente: string;
  dpi: string;
  cuenta: string;
  direccion?: string | null;
  region?: string | null;
  agencia?: string | null;
  montoCredito: number;
  productoCredito: string;
  fechaConsultaBantotal?: string | null;
  origenDatos: OrigenDatos;
  estadoEvaluacion: EstadoEvaluacion;
  punteoTotal?: number | null;
  resultadoSemaforo: Semaforo;
  usuarioCreacion?: string | null;
  fechaCreacion?: string;
  usuarioProcesa?: string | null;
  fechaProcesamiento?: string | null;
  modelo?: IModeloScoring;
  respuestas?: IRespuestaEvaluacion[];
}

export interface IRespuestaEvaluacion {
  respuestaId?: number;
  evaluacionId: number;
  preguntaId: number;
  opcionId?: number | null;
  valorIngresado?: string | null;
  valorCalculado?: number | null;
  /**
   * Las columnas Valor(x), bx y a+bx del reporte de resultados. Se llenan al
   * procesar; en una evaluación en Solicitud vienen en null.
   *
   * resultadoBX y resultadoABX son null cuando la pregunta no aporta al punteo
   * (aplicaScore = false): no participa, que no es lo mismo que aportar cero.
   */
  valorX?: number | null;
  resultadoBX?: number | null;
  resultadoABX?: number | null;
  pregunta?: IPreguntaDinamica;
  opcion?: IOpcionVariable;
}

/** Valor(x), bx y a+bx que devuelve la simulación, por preguntaId. */
export interface IDetalleCalculo {
  valorX: number;
  resultadoBX: number | null;
  resultadoABX: number | null;
}

// ─── Pantalla 5: Auditoría ───────────────────────────────────────────────────

/**
 * Una fila del desglose matemático. Se escribe una sola vez al procesar y no
 * vuelve a cambiar: copia los coeficientes vigentes en ese momento.
 */
export interface IDesgloseAuditoria {
  desgloseId: number;
  evaluacionId: number;
  secuencia: number;
  preguntaId: number | null;
  opcionId: number | null;
  factor: string;
  formulaAplicada: string | null;
  peso: number;
  constante: number;
  valorReferencia: number;
  coeficienteA: number;
  coeficienteB: number;
  valorX: number;
  /**
   * El procedimiento del modelo resolvió esta fila.
   *
   * `false` = salió de la parametrización. Sin esto, un Valor(x) en 0 no
   * distingue "la rutina devolvió 0" de "la rutina no corrió".
   */
  rte?: boolean;
  /** b · x */
  resultadoBX: number;
  /** a + (b · x) */
  resultadoABX: number;
  /** peso · (a + b·x). La suma de esta columna es el punteo total. */
  aportePonderado: number;
}

export interface IExpediente {
  evaluacion: {
    evaluacionId: number;
    numeroSolicitud: number;
    numeroOperacion: number | null;
    nombreCliente: string;
    dpi: string;
    cuenta: string;
    direccion: string | null;
    region: string | null;
    agencia: string | null;
    montoCredito: number;
    productoCredito: string;
    estadoEvaluacion: EstadoEvaluacion;
    origenDatos: OrigenDatos;
    fechaProcesamiento: string | null;
    usuarioProcesa: string | null;
  };
  /** Versión exacta del modelo con la que se calculó el dictamen. */
  scoring: {
    scoringId: number;
    codigoInterno: string;
    version: number;
    nombreScoring: string;
    tipoScoring: string | null;
  };
  desglose: IDesgloseAuditoria[];
  punteoTotal: number | null;
  resultadoSemaforo: Semaforo;
  /**
   * z = Σ(a + b·x) sobre las preguntas que aportan. Es el insumo de la
   * sigmoide, y la invariante que el expediente verifica.
   */
  sumaVariables: number | null;
  /** La sigmoide de z, en porcentaje. De su banda sale el bono del punteo. */
  probabilidadMora: number | null;
  /**
   * Comprobación de integridad. Si viene false, las filas se tocaron por fuera
   * del motor.
   */
  cuadra: boolean;
}

/** Resultado de la simulación, sin persistir. */
export interface ISimulacion {
  punteoTotal: number;
  semaforo: Semaforo;
  desglose: Omit<IDesgloseAuditoria, 'desgloseId' | 'evaluacionId'>[];
  /** preguntaId -> valor numérico resuelto (incluye las calculadas). */
  valoresCalculados: Record<string, number>;
  /** preguntaId -> Valor(x), bx y a+bx, el mismo desglose que se guardará. */
  detalleCalculo: Record<string, IDetalleCalculo>;
}
