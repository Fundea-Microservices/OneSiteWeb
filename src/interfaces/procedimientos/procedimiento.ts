export interface ProcedimientoResponse {
    success:    boolean;
    statusCode: number;
    message:    string;
    data:       Data;
}

export interface Data {
    procedimientos: IProcedimiento[];
    metadata: Metadata;
}

export interface Metadata {
    total: number;
    page:  number;
    limit: number;
}

export interface ReporteResponse {
    success:    boolean;
    statusCode: number;
    message:    string;
    data:       IProcedimiento;
}


export interface IProcedimiento {
    procedimientoId: string;
    nombre:        string;
    descripcion:   string;
    procedimiento?: string;
    versiones?: IVersion[];
    versionCode?: string;
    activo:        boolean;
    created_at:    Date;
    updated_at?:    null;
    deleted_at?:    null;
}

export interface IVersion {
    versionId: string;
    procedimientoId: string; 
    valor: string;
    codigo: string; 
    correlativo: number; 
    created_at:    Date;
}
