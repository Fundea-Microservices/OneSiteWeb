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
    fechaCreacion:         string | null; // la asigna el servidor al crear
}

/** Body del POST: los 7 campos son obligatorios. */
export type CrearBanco = Omit<Banco, 'catalogoBancoId' | 'fechaCreacion'>;

/**
 * Body del PATCH: solo los campos que cambian. Enviar `catalogoBancoId` o
 * `fechaCreacion` devuelve 400, por eso nunca se manda el `Banco` completo.
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

/** Un parámetro que no esté en esta lista devuelve 400. */
export interface ListarBancosParams {
    page?:  number;
    limit?: number;
}
