import { TipoInput, TipoRespuesta, TipoTrama } from "./getion";

export interface IEncabezadoDetalle {
  detalleId: string;
  encabezadoId: string;
  
  // Campos opcionales (?) porque en SQL aceptan NULL
  codigo?: number;
  tag?: string;           // Nuevo campo
  nombreInput?: string;   // Nuevo campo
  catalogo?: string;
  catalogoHijo?: string;
  procedimiento?: string;
  tipo: TipoTrama;
  
  codigoParametro?: number | null; // Nullable en SQL
  
  tipoRespuesta: TipoRespuesta;
  tipoInput: TipoInput;
  
  opciones?: string;      // Nullable
  valorDefecto?: string;  // Nullable
  
  // Campos obligatorios (NOT NULL en SQL)
  obligatorio: boolean;   // Nuevo campo
  orden: number;          // Nuevo campo
  visible: boolean;       // Nuevo campo
  activo: boolean;
  
  created_at?: string | Date;
  updated_at?: string | Date;
  deleted_at?: string | Date;
}


export interface IEncabezado {
  encabezadoId: string; // UUID
  nombre: string;  
  proceso: number;   
  activo: boolean;
  created_at?: string | Date;
  
  updated_at?: string | Date;
  deleted_at?: string | Date;
}

export interface EncabezadoResponse {
  success: boolean;
  message: string;
  statusCode: number;
  data?: IEncabezado;
}

export interface EncabezadosResponse {
  success: boolean;
  message: string;
  statusCode: number;
  data: IEncabezado[];
  metadata: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface EncabezadoDetalleResponse {
  success: boolean;
  message: string;
  statusCode: number;
  data?: IEncabezadoDetalle;
}

export interface EncabezadoDetallesResponse {
  success: boolean;
  message: string;
  statusCode: number;
  data: IEncabezadoDetalle[];
  metadata: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}