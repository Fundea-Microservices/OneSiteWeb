// ── Configuración del job de carga de asientos contables ─────────────────────

export const JOB_CARGA_ASIENTOS_KEY = 'job_carga_asientos_contables';

export interface JobCargaAsientosContables {
    activo:      string;
    hora:        string;
    correo:      string;
    diaAnterior: string;
}

// ── Carga de partidas contables ──────────────────────────────────────────────

export interface CargarPartidasDto {
    fecha: string;
    todos: boolean;
}

export interface EnvioBusinessCentral {
    total:    number;
    cargados: number;
    errores:  number;
}

export interface CargarPartidasData {
    fecha:                string;
    todos:                boolean;
    limit:                number;
    totalItems:           number;
    totalPages:           number;
    paginasProcesadas:    number;
    registrosProcesados:  number;
    registrosInsertados:  number;
    registrosDuplicados:  number;
    envioBusinessCentral: EnvioBusinessCentral;
}

export interface CargarPartidasResponse {
    success:    boolean;
    statusCode: number;
    message:    string;
    data:       CargarPartidasData;
}
