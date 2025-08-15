import { IRol } from "../auth";

export interface ReglasEjecucionResponse {
    success:    boolean;
    statusCode: number;
    message:    string;
    data:       Data;
}

export interface Data {
    reglas:   IRegla[];
    metadata: Metadata;
}

export interface Metadata {
    total: number;
    page:  number;
    limit: number;
}

export interface IRegla {
    reglaId?:    string;
    reporteId:  string;
    rolId:      string;
    rol:        IRol;
    active:     boolean;
    horaInicio: string;
    horaFin:    string;
    diaSemana:  string;
    diaMes:     string;
    created_at?: Date;
    updated_at?: null;
    deleted_at?: null;
}
