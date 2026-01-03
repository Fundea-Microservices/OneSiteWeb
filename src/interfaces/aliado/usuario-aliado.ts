import { IEmpresaAliado } from "./empresa-aliado";

export interface UsuarioAliadoResponse {
    success:    boolean;
    statusCode: number;
    message:    string;
    data:       Data;
}

export interface Data {
    users:    IUsuarioAliado[];
    metadata: Metadata;
}

export interface Metadata {
    total: number;
    page:  number;
    limit: number;
}

export interface IUsuarioAliado {
    userId?:     string;
    fullName:   string;
    userName:   string;
    password?:   Password;
    email:      string;
    active:     boolean;
    empresaId:  string;
    empresa?:    IEmpresaAliado;
    created_at?: Date;
    updated_at?: null;
    deleted_at?: null;
}


export interface Password {
    type: string;
    data: number[];
}
