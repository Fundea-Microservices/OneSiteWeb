// ---------- Respuestas del gateway ----------
export interface ApiResponse<T> {
    success: boolean;
    statusCode: number;
    message: string;
    data: T;
}

export interface Metadata {
    total: number;
    page: number;
    limit: number;
}

// ---------- Catálogo ----------
export interface ICatalogo {
    id: string;
    codigo: string;            // p. ej. 'MUNICIPIOS'
    codigoExterno: string;
    nombre: string;
    catalogoPadreId: string | null;
    catalogoPadre?: ICatalogo | null; // incluido en listar y obtener
    activo: boolean;
    created_at?: string;
    updated_at?: string | null;
}

export interface ICatalogoCreate {
    codigo: string;            // máx. 50, no se puede cambiar después
    codigoExterno: string;     // máx. 50
    nombre: string;            // máx. 200
    catalogoPadreId?: string | null;
    activo?: boolean;
}

export interface ICatalogoUpdate extends Partial<ICatalogoCreate> {
    id: string;
}

export type CatalogosResponse = ApiResponse<{ catalogos: ICatalogo[]; metadata: Metadata }>;
export type CatalogoResponse = ApiResponse<ICatalogo>;

// ---------- Opción de catálogo ----------
export interface ICatalogoOpcion {
    id: string;
    catalogoId: string;
    codigo: string;            // valor que se guarda en los registros
    nombre: string;            // texto del select
    padreId: string | null;
    padre?: ICatalogoOpcion | null;
    orden: number;
    porDefecto: boolean;
    activo: boolean;
    created_at?: string;
    updated_at?: string | null;
}

export interface IOpcionCreate {
    catalogoId: string;
    codigo: string;            // máx. 50, único por catálogo, no se puede cambiar
    nombre: string;            // máx. 150
    padreId?: string | null;   // requerido si el catálogo depende de otro
    orden?: number;            // >= 0
    porDefecto?: boolean;
    activo?: boolean;
}

export interface IOpcionUpdate extends Partial<IOpcionCreate> {
    id: string;
}

export type OpcionesResponse = ApiResponse<{ opciones: ICatalogoOpcion[]; metadata: Metadata }>;
export type OpcionResponse = ApiResponse<ICatalogoOpcion>;

// ---------- Select ----------
export interface IOpcionSelect {
    value: string;             // codigo de la opción
    label: string;             // nombre de la opción
    padre: string | null;      // codigo de la opción padre
    porDefecto: boolean;
    activo: boolean;
}

export interface ICatalogoSelect {
    catalogo: {
        codigo: string;
        nombre: string;
        catalogoPadre: string | null; // codigo del catálogo padre
    };
    opciones: IOpcionSelect[];
}

export type CatalogoSelectResponse = ApiResponse<ICatalogoSelect>;
