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

export interface FormEncabezado {
    formId?:         string;
    nombre:          string;
    descripcion:     string | null;
    categoria:       string | null;
    tabla:           string | null;
    activo:          boolean;
    created_at?:     Date;
    updated_at?:     Date;
    deleted_at?:     Date | null;
    totalSecciones?: number;
    totalPreguntas?: number;
}

export interface FormEncabezadoResponse {
    success:    boolean;
    statusCode: number;
    message:    string;
    data:       FormEncabezado[];
    metadata:   Metadata;
}

export interface FormEncabezadoByIdResponse {
    success:    boolean;
    statusCode: number;
    message:    string;
    data:       FormEncabezado;
}

export type TipoPregunta = 'TEXT' | 'NUMBER' | 'SELECT' | 'DATE' | 'TIME' | 'FILE' | 'TEXTAREA' | 'CHECKBOX' | 'RADIO';

export interface FormSeccion {
    seccionId?:    string;
    encabezadoId:  string;
    nombre:        string;
    titulo:        string;
    subtitulo?:    string;
    orden?:        number;
    activo:        boolean;
    created_at?:   Date;
    preguntas?:    FormPregunta[];
}

export interface FormSeccionResponse {
    success:    boolean;
    statusCode: number;
    message:    string;
    data:       FormSeccion[];
    metadata:   Metadata;
}

export interface FormSeccionByIdResponse {
    success:    boolean;
    statusCode: number;
    message:    string;
    data:       FormSeccion;
}

export interface FormPregunta {
    preguntaId?:        string;
    seccionId:          string;
    titulo:             string;
    subtitulo?:         string;
    tipo:               TipoPregunta;
    valorDefecto?:      string;
    opciones?:          string;
    placeholder?:       string;
    patronValidacion?:  string;
    mensajeError?:      string;
    orden?:             number;
    visible:            boolean;
    obligatorio:        boolean;
    activo:             boolean;
    created_at?:        Date;
}

export interface FormPreguntaResponse {
    success:    boolean;
    statusCode: number;
    message:    string;
    data:       FormPregunta[];
    metadata:   Metadata;
}

export interface FormPreguntaByIdResponse {
    success:    boolean;
    statusCode: number;
    message:    string;
    data:       FormPregunta;
}

export interface FormEncabezadoCompleto extends FormEncabezado {
    secciones: FormSeccion[];
}

export interface FormEncabezadoCompletoResponse {
    success:    boolean;
    statusCode: number;
    message:    string;
    data:       FormEncabezadoCompleto;
}