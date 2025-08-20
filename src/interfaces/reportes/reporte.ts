export interface ReportesResponse {
    success:    boolean;
    statusCode: number;
    message:    string;
    data:       Data;
}

export interface Data {
    reportes: IReporte[];
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
    data:       IReporte;
}


export interface IReporte {
    reporteId:     string;
    nombre:        string;
    descripcion:   string;
    rutaPlantilla?:   string;
    procedimiento: string;
    activo:        boolean;
    exportarTabla: boolean;
    exportarExcel: boolean;
    exportarPDF:   boolean;
    exportarCSV:   boolean;
    exportarJSON:  boolean;
    created_at:    Date;
    updated_at?:    null;
    deleted_at?:    null;
}
