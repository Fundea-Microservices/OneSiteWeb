export interface IDocumento {
  documentoId?: string;
  nombre: string;
  codigo: string;
  categoria: string;
  descripcion?: string | null;
  activo: boolean;
  created_at?: Date;
  updated_at?: Date;
  deleted_at?: Date | null;
  totalVersiones?: number;
}

export interface IVersionDocumento {
  versionId?: string;
  documentoId: string;
  correlativo: number;
  codigoVersion?: string | null;
  rutaArchivo: string;
  aprobado?: boolean;
  fechaAprobacion?: string | null;
  aprobadoPor?: string | null;
  vigente?: boolean;
  notasCambio?: string | null;
  created_at?: Date;
  updated_at?: Date;
  deleted_at?: Date | null;
}

export interface DocumentoResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: IDocumento[];
  metadata: {
    total: number;
    page: number;
    limit: number;
  };
}

export interface DocumentoByIdResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: IDocumento;
}

export interface VersionDocumentoResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: IVersionDocumento[];
  metadata: {
    total: number;
    page: number;
    limit: number;
  };
}

export interface VersionDocumentoByIdResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: IVersionDocumento;
}

export interface IParametro {
  parametroId?: string;
  versionId: string;
  nombreTag: string;
  valor?: string | null;
  etiquetaVisual?: string | null;
  origenDato?: string;
  tipoDato?: string;
  requerido?: boolean;
  orden?: number;
  created_at?: Date;
}

export interface ParametroResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: IParametro[];
  metadata: {
    total: number;
    page: number;
    limit: number;
  };
}

export interface ParametroBulkResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: IParametro[];
}
