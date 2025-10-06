export interface ICatalogo {
    catalogoId?: string;
    codigo: number;
    codigoExterno: number;
    descripcion: string;
    estado: boolean;
    tipo: string;
    created_at?: Date;
    updated_at?: Date;
    deleted_at?: Date;
}

export interface CatalogosResponse {
    success: boolean;
    statusCode: number;
    message: string;
    data: {
        catalogos: ICatalogo[];
        metadata: Metadata;
    }
}

export interface CatalogoResponse {
    success: boolean;
    statusCode: number;
    message: string;
    data: {
        catalogo: ICatalogo;
    }
}

export interface Metadata {
    total: number;
    page: number;
    limit: number;
}
