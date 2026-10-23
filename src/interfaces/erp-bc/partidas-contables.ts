// ── Configuración del job de carga de asientos contables ─────────────────────

export const JOB_CARGA_ASIENTOS_KEY = 'job_carga_asientos_contables';

export interface JobCargaAsientosContables {
    activo:      string;
    hora:        string;
    correo:      string;
    diaAnterior: string;
}

// ── Carga de partidas contables ──────────────────────────────────────────────

export type TipoCargaAsientos = 'MANUAL' | 'AUTOMATICA' | 'REENVIO';

/**
 * Qué lotes procesa una carga. Cada asiento tiene fecha de aplicación (el día
 * en que se registró, que es la `fecha` que manda el front) y fecha valor (el
 * día al que corresponde).
 * - `DIA`: solo asientos con fecha valor igual a la fecha.
 * - `ANTERIORES`: solo asientos registrados en la fecha con fecha valor anterior.
 * - `AMBAS`: los dos. Es el valor por defecto del backend.
 */
export type AlcanceCarga = 'DIA' | 'ANTERIORES' | 'AMBAS';

/**
 * Body del POST que dispara la carga. El gateway usa `forbidNonWhitelisted`:
 * cualquier campo extra (o un `alcance` fuera de los tres valores) devuelve
 * 400. El usuario se toma del token.
 */
export interface CargarPartidasDto {
    fecha:    string;
    alcance?: AlcanceCarga;
}

/**
 * Body del reenvío de errores. Solo `fecha`: el reenvío siempre cubre todos
 * los lotes de la fecha (el del día y los de fecha valor anterior).
 */
export interface ReenviarErroresDto {
    fecha: string;
}

/** Respuesta 202 del disparo: la carga quedó corriendo en background. */
export interface CargarPartidasData {
    id:          string;
    fecha:       string;
    tipo:        TipoCargaAsientos;
    fechaFin:    string | null;
    enEjecucion: boolean;
}

export interface CargarPartidasResponse {
    success:    boolean;
    statusCode: number;
    message:    string;
    data:       CargarPartidasData;
}

// ── Cuadre por póliza ────────────────────────────────────────────────────────

/**
 * Suma de `valorCuenta` de todas las partidas del lote que comparten póliza.
 * Una póliza cuadra cuando la suma es 0: los cargos y abonos se compensan.
 *
 * Los asientos sin póliza se agrupan bajo cadena vacía `''`.
 */
export interface CuadrePoliza {
    poliza:      string;
    /** Diferencia con signo. Negativo: sobran débitos. Positivo: sobran créditos. */
    valorCuenta: number;
}

// ── Estado de la ejecución (LogsCargaAsientos) ───────────────────────────────

/**
 * Los contadores cambian de significado según `tipo`:
 * - `MANUAL` / `AUTOMATICA`: `registrosObtenidos` es el total traído de Bantotal,
 *   `registrosInsertados` son los asientos nuevos que quedaron guardados y
 *   `registrosEnviados` los que Business Central aceptó.
 * - `REENVIO`: `registrosObtenidos` son los asientos en error encontrados y
 *   `registrosEnviados` los reenviados con éxito. Ahí `registrosInsertados` y
 *   `registrosDuplicados` vienen siempre en 0: el reenvío no guarda nada, solo
 *   reintenta el envío de asientos que ya estaban en la base.
 *
 * La ejecución terminó cuando `fechaFin !== null`, nunca cuando `porcentaje`
 * llega a 100: un reenvío sin errores pendientes termina en 0%.
 */
export interface EjecucionCargaAsientos {
    id:                  string;
    tipo:                TipoCargaAsientos;
    userName:            string | null;
    fechaInicio:         string;
    fechaFin:            string | null;
    duracionSegundos:    number;
    registrosObtenidos:  number;
    registrosProcesados: number;
    registrosInsertados: number;

    registrosEnviados:   number | null;

    registrosDuplicados: number;
    registrosConError:   number;
    porcentaje:          number;
    error:               boolean;
    comentario:          string | null;

    /** Fecha de aplicación solicitada, `YYYY-MM-DD`. */
    fechaIndicada?:      string;

    /** Fecha valor del lote, `YYYY-MM-DD`. En el lote del día es igual a `fechaIndicada`. */
    fechaValor:          string | null;

    /** `true` en los lotes de fecha valor anterior. */
    fechaAnterior:       boolean;

    /** `null` en reenvíos, en lotes anteriores y en ejecuciones viejas. */
    alcance:             AlcanceCarga | null;

    /**
     * `true` solo si la fase 2 llegó a mandar los asientos a Business Central.
     * En un descuadre es `false`: quedaron guardados en bc.AsientosContables.
     *
     * No confundir con `registrosEnviados`: esto es la fase, no la cuenta. Una
     * ejecución puede tener `enviado: true` y `registrosEnviados` por debajo del
     * total si el ERP rechazó parte de los asientos (quedan en ERROR y son
     * reenviables).
     */
    enviado:             boolean;

    /**
     * Todas las pólizas del lote con su suma, cuadren o no. `null` si la
     * ejecución murió antes de calcular el cuadre (fallo técnico).
     *
     * Las listas vienen recortadas (500 en el lote del día, 50 en cada lote
     * anterior) porque la respuesta viaja por NATS. Para el total real usar
     * `totalPolizas` / `totalPolizasDescuadradas`.
     */
    polizas:                      CuadrePoliza[] | null;
    totalPolizas:                 number;
    polizasTruncadas:             boolean;

    /** Solo las pólizas cuya suma no da cero. Vacía cuando no hay descuadre. */
    polizasDescuadradas:          CuadrePoliza[];
    totalPolizasDescuadradas:     number;
    polizasDescuadradasTruncadas: boolean;
}

/**
 * Último resultado de un lote (el del día o uno de fecha valor anterior) con
 * sus propias banderas. Las banderas de `EstadoEjecucionData` resumen todos.
 */
export interface LoteCargaAsientos extends EjecucionCargaAsientos {
    enEjecucion:   boolean;
    interrumpida:  boolean;
    tieneErrores:  boolean;
    descuadre:     boolean;
    puedeReenviar: boolean;
}

/** La última corrida de la fecha, con cualquier alcance. */
export interface UltimaEjecucionCarga {
    id:               string;
    tipo:             TipoCargaAsientos;
    alcance:          AlcanceCarga | null;
    userName:         string | null;
    fechaInicio:      string;
    fechaFin:         string | null;
    duracionSegundos: number;
    error:            boolean;
    comentario:       string | null;
    enEjecucion:      boolean;
    interrumpida:     boolean;
}

export interface EstadoEjecucionData {
    /** Fecha consultada, `YYYY-MM-DD`. */
    fecha?:           string;
    /** Ya existe un registro de carga para la fecha consultada. */
    existe:           boolean;

    // Las banderas generales resumen TODOS los lotes (el del día y los
    // anteriores). Para saber cuál fue, revisar las banderas de cada lote.

    /** Algún lote sigue sin fechaFin y dentro de la ventana de vida del proceso. */
    enEjecucion:      boolean;
    /** La última corrida quedó sin fechaFin y el proceso ya murió (superó las 6h). */
    interrumpida?:    boolean;
    /**
     * Algún lote terminó dejando registros en ERROR.
     *
     * Ojo: también sale `true` en un descuadre, así que NO sirve para decidir
     * si se ofrece el reenvío. Para eso está `puedeReenviar`.
     */
    tieneErrores:     boolean;
    /**
     * La carga se detuvo en la validación de cuadre: los asientos quedaron
     * guardados y no se envió nada al ERP. No es un fallo técnico —la petición
     * responde 200— sino un estado de negocio que hay que renderizar.
     */
    descuadre:        boolean;
    /**
     * Hay asientos en estado ERROR que Business Central rechazó y tiene
     * sentido reintentar. En un descuadre siempre es `false`: los asientos
     * están en INICIO, no en ERROR, y el reenvío no encontraría nada.
     */
    puedeReenviar:    boolean;
    /** El job automático está activo para esa fecha: no se permite disparo manual. */
    automaticaActiva: boolean;
    /** El backend acepta un POST de carga para esta fecha. */
    puedeEjecutar:    boolean;
    /** La última corrida, con cualquier alcance. `null` si no existe ninguna. */
    ultimaEjecucion:  UltimaEjecucionCarga | null;
    /**
     * Último resultado del lote del día. Puede venir en `null` aunque
     * `existe = true`: pasa si solo se han corrido cargas con alcance ANTERIORES.
     */
    ejecucion:        LoteCargaAsientos | null;
    /** Último resultado de cada lote de fecha valor anterior, ordenados por fecha valor. */
    anteriores:       LoteCargaAsientos[];
}

export interface EstadoEjecucionResponse {
    success:    boolean;
    statusCode: number;
    message:    string;
    data:       EstadoEjecucionData;
}

// ── Errores de envío agrupados por mensaje ───────────────────────────────────

/**
 * Asientos en ERROR que comparten mensaje. El backend quita el CorrelationId
 * de Business Central antes de agrupar; un mensaje vacío llega como
 * "Sin detalle del error".
 */
export interface GrupoErrorAsientos {
    mensaje:  string;
    cantidad: number;
}

export interface ErroresEjecucionMetadata {
    /** Cantidad de mensajes distintos (grupos). */
    total:         number;
    /** Cantidad de asientos en error, sumando todos los grupos. */
    totalAsientos: number;
    page:          number;
    limit:         number;
    totalPages:    number;
    todos:         boolean;
}

/**
 * Mismo alcance que el reenvío: asientos en ERROR del lote del día y de los
 * lotes de fecha valor anterior registrados en la fecha. Los grupos vienen
 * ordenados de mayor a menor cantidad.
 */
export interface ErroresEjecucionData {
    fecha:    string;
    errores:  GrupoErrorAsientos[];
    metadata: ErroresEjecucionMetadata;
}

export interface ErroresEjecucionResponse {
    success:     boolean;
    statusCode?: number;
    message?:    string;
    data:        ErroresEjecucionData;
}

export interface ErroresEjecucionParams {
    page?:  number;
    limit?: number;
    /** `true` devuelve todos los grupos sin paginar. */
    todos?: boolean;
}
