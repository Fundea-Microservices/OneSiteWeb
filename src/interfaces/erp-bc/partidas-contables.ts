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
}

export interface EstadoEjecucionData {
    /** Ya existe un registro de carga para la fecha consultada. */
    existe:           boolean;
    /** Sin fechaFin y dentro de la ventana de vida del proceso. */
    enEjecucion:      boolean;
    /** Sin fechaFin pero el proceso ya murió (superó las 6h). */
    interrumpida:     boolean;
    /** Terminó dejando registros en ERROR. */
    tieneErrores:     boolean;
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
