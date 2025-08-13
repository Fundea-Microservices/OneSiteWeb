export interface ConfiguracionResponse {
    success:    boolean;
    statusCode: number;
    message:    string;
    data:       Data;
}

export interface Data {
    configuraciones:  IConfiguracion[];
    metadata: Metadata;
}

export interface Metadata {
    total: number;
    page:  number;
    limit: number;
}

export interface IConfiguracion {
    configId?:     string;
    key:           string;
    value:         string | boolean;
    description:   string;
    type:          string;
    active:        boolean;
    created_at?:    Date;
    updated_at?:    Date;
    deleted_at?:    Date;
}


export interface ConfiguracionByKeyResponse {
    success:    boolean;
    statusCode: number;
    message:    string;
    data:       IConfiguracion;
}