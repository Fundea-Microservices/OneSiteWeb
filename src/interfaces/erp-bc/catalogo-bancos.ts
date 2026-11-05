// ── Catálogo de bancos (Bantotal ↔ Dynamics) ─────────────────────────────────

export interface Banco {
    catalogoBancoId:       number;        // lo genera el servidor
    bantotalRubro:         string;
    bantotalNombre:        string;
    bantotalAlias:         string;
    bantotalCuenta:        number;
    bantotalSuboperacion:  number;
    dynamicsCodigo:        string;
    dynamicsRubroContable: string;
    /** No hay DELETE: la baja es `activo: false` por PATCH. */
    activo:                boolean;
    fechaCreacion:         string | null; // la asigna el servidor al crear
}

/** Body del POST. `activo` es opcional en el API (default `true`); el formulario siempre lo envía. */
export type CrearBanco = Omit<Banco, 'catalogoBancoId' | 'fechaCreacion'>;

/**
 * Body del PATCH: solo los campos que cambian. Enviar `catalogoBancoId` o
 * `fechaCreacion` devuelve 400, por eso nunca se manda el `Banco` completo.
 * Activar o desactivar es `{ activo: true | false }`.
 */
export type ActualizarBanco = Partial<CrearBanco>;

export interface RespuestaApi<T> {
    success:    boolean;
    statusCode: number;
    message:    string;
    data:       T;
}

export interface ListaBancos {
    bancos: Banco[];
    metadata: {
        total:      number;
        page:       number;
        limit:      number;
        totalPages: number;
        todos:      boolean;
    };
}

/**
 * Query params del listado. Un parámetro que no esté en esta lista devuelve 400.
 * Los filtros se combinan con AND y no distinguen mayúsculas. El resultado se
 * ordena por rubro de Bantotal, suboperación e id.
 */
export interface FiltrosBancos {
    page?:          number;
    limit?:         number;
    /** `true` devuelve todo, sin paginar. */
    todos?:         boolean;
    /** Rubro contable de Dynamics, coincidencia exacta. Máx. 20. */
    rubroContable?: string;
    /** Busca en el alias O el nombre del banco, coincidencia parcial (`%` y `_` son literales). Máx. 100. */
    alias?:         string;
    /** Cuenta de Bantotal, coincidencia exacta. Entero ≥ 0. */
    cuenta?:        number;
    /** `true` solo activos, `false` solo inactivos; sin enviar, todos. */
    activo?:        boolean;
}
