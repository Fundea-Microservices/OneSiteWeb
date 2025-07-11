import { IUsuarioAliado } from "./usuario-aliado";

export interface AuthAliadoResponse {
    success: boolean;
    status:  number;
    message: string;
    data:    Data;
}

export interface Data {
    user:  IUsuarioAliado;
    token: string;
}


