export interface AtributosResponse {
    success:    boolean;
    statusCode: number;
    message:    string;
    data:       Data;
}

export interface Data {
    atributos: IAtributo[];
    metadata:  Metadata;
}

export interface IAtributo {
    atributoId?: string;
    reporteId:  string;
    variable:   string;
    alias:      string;
    tipo:       string;
    formato:    null;
    orden:      number;
    visible:    boolean;
    created_at?: Date;
    updated_at?: null;
    deleted_at?: null;
}

export interface Metadata {
    total: number;
    page:  number;
    limit: number;
}
