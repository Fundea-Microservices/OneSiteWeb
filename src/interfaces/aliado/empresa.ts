export interface EmpresaAliadoResponse {
    success:    boolean;
    statusCode: number;
    message:    string;
    data:       Data;
}

export interface Data {
    empresas: IEmpresaAliado[];
    metadata: Metadata;
}

export interface IEmpresaAliado {
    empresaId?:   string;
    name:        string;
    description: string;
    pathImg:     null;
    address:     string;
    latitud:     null;
    longitud:    null;
    phone:       string;
    phone2:      null;
    email:       string;
    active:      boolean;
    created_at?:  Date;
    updated_at?:  null;
    deleted_at?:  null;
}

export interface Metadata {
    total: number;
    page:  number;
    limit: number;
}
