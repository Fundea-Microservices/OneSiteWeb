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
 * Body del POST que dispara la carga (y también el del reenvío de errores).
 * Solo se admite `fecha`: el gateway usa `forbidNonWhitelisted`, cualquier
 * campo extra devuelve 400. El usuario se toma del token.
 */
export interface CargarPartidasDto {
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

// ── Cuadre por cuenta externa ────────────────────────────────────────────────

/**
 * Suma de `valorCuenta` de todas las partidas de la fecha que comparten
 * `numeroExterno` (Sucursal-Módulo-Transacción-Relación). Una cuenta cuadra
 * cuando la suma es exactamente 0: los cargos y abonos se compensan.
 *
 * Los asientos sin cuenta externa se agrupan bajo cadena vacía `''`.
 */
export interface CuentaExternaCuadre {
    cuentaExterna: string;
    /** Diferencia con signo. Negativo: sobran débitos. Positivo: sobran créditos. */
    valorCuenta:   number;
}

// ── Estado de la ejecución (LogsCargaAsientos) ───────────────────────────────

/**
 * Los contadores cambian de significado según `tipo`:
 * - `MANUAL` / `AUTOMATICA`: `registrosObtenidos` es el total traído de Bantotal
 *   y `registrosInsertados` son los asientos nuevos.
 * - `REENVIO`: `registrosObtenidos` son los asientos en error encontrados y
 *   `registrosInsertados` son los reenviados con éxito.
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
    registrosDuplicados: number;
    registrosConError:   number;
    porcentaje:          number;
    error:               boolean;
    comentario:          string | null;

    /** Fecha contable solicitada, `YYYY-MM-DD`. */
    fechaIndicada?:      string;

    /**
     * `true` solo si la fase 2 llegó a mandar los asientos a Business Central.
     * En un descuadre es `false`: quedaron guardados en bc.AsientosContables.
     */
    enviado:             boolean;

    /**
     * Solo las cuentas externas cuya suma no da cero. Es la lista que se
     * muestra en pantalla. Viene vacía cuando no hay descuadre.
     */
    cuentasDescuadradas: CuentaExternaCuadre[];

    /**
     * Todas las cuentas externas de la fecha con su suma, cuadren o no.
     * `null` si la ejecución murió antes de calcular el cuadre (fallo técnico).
     */
    cuentasExternas:     CuentaExternaCuadre[] | null;
}

export interface EstadoEjecucionData {
    /** Fecha consultada, `YYYY-MM-DD`. */
    fecha?:           string;
    /** Ya existe un registro de carga para la fecha consultada. */
    existe:           boolean;
    /** Sin fechaFin y dentro de la ventana de vida del proceso. */
    enEjecucion:      boolean;
    /** Sin fechaFin pero el proceso ya murió (superó las 6h). */
    interrumpida:     boolean;
    /**
     * Terminó dejando registros en ERROR.
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
    ejecucion:        EjecucionCargaAsientos | null;
}

export interface EstadoEjecucionResponse {
    success:    boolean;
    statusCode: number;
    message:    string;
    data:       EstadoEjecucionData;
}
