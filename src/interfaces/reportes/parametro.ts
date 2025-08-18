export interface ParametrosResponse {
    success:    boolean;
    statusCode: number;
    message:    string;
    data:       Data;
}

export interface Data {
    parametros: IParametro[];
    metadata:   Metadata;
}

export interface Metadata {
    total: number;
    page:  number;
    limit: number;
}

export interface IParametro {
    parametroId?: string;
    reporteId:   string;
    nombre:      string;
    variable:    string;
    tipo:        string;
    obligatorio: boolean;
    valor:       string;
    orden:       number;
    valorSeleccionado?: string | boolean;
    created_at?:  Date;
    updated_at?:  null;
    deleted_at?:  null;
}
