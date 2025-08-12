export interface CreditoCastigadoResponse {
    success:    boolean;
    statusCode: number;
    message:    string;
    data:       Data;
}

export interface Data {
    creditos: CreditoCastigadoView[];
    metadata: Metadata;
}

export interface CreditoCastigadoView {
    IncoSuc:              number;
    IncoCta:              number;
    Nombre:               string;
    IncoOpe:              number;
    IncoMod:              number;
    IncoSbp:              number;
    IncoTOp:              number;
    IncoGarantia:         string;
    IncoMontoOriginal:    number;
    IncoFechaOtorgado:    Date;
    IncoFechaVencimiento: Date;
    Capital:              number;
    Intereses_Corrientes: number;
    Intereses_Moratorios: number;
    Seguro:               number;
    Comisiones:           number;
    Total:                number;
    IncoFechaCastigo:     Date;
    IncoFechaCorte:       Date;
    IncoSys:              string;
    IncoTransaccion:      number;
    IncoExCta:            number;
    IncoExOpe:            number;
    trasladar?:           boolean;
    observaciones?:       string;

}

export interface Metadata {
    total: number;
    page:  number;
    limit: number;
    all:   boolean;
}
