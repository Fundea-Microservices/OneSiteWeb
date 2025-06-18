export interface MetodoResponse {
    success:    boolean;
    statusCode: number;
    message:    string;
    data:       Data;
}

export interface Data {
    metodos:  IMetodo[];
    metadata: Metadata;
}

export interface Metadata {
    total: number;
    page:  number;
    limit: number;
}

export interface IMetodo {
    metodoId?:      string;
    name:          string;
    code:          string;
    description:   string;
    verb:          string;
    tokenLocation: null;
    isDefault:     boolean;
    active:        boolean;
    created_at?:    Date;
    updated_at?:    Date;
    deleted_at?:    Date;
}
