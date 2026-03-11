export type TipoTrama = 'CLIENTE' | 'PARAMETRO';
export type TipoRespuesta = 'TEXT' | 'NUMBER' | 'DATE' | 'BOOLEAN' | 'FILE';
export type TipoInput = 'TEXT' | 'NUMBER' | 'DATE' | 'SELECT' | 'EMAIL' | 'SWITCH' | 'FILE';

export interface ITramaDetalle {
  detalleId: string;
  tramaId: string;
  
  // Campos opcionales (?) porque en SQL aceptan NULL
  codigo?: number;
  codigoInterno?: string;
  valor?: string;
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

export interface ITrama {
  tramaId: string;
  procesoId: number;
  codigo: number;
  gestion?: number;
  codigoInterno: number; // Nuevo campo
  sistemaId: number;
  nombre: string;
  descripcion: string;
  
  usuario: string;       // Nuevo campo
  usuarioGlobal: boolean; // Nuevo campo (BIT en SQL)

  verApp: boolean;
  icono?: string;
  color?: string;
  
  activo: boolean;
  
  // Las fechas suelen manejarse como string (ISO) al venir del backend
  created_at?: string | Date;
  updated_at?: string | Date;
  deleted_at?: string | Date;
}

export interface IGestion {
  tramaEjecucionId: string; // UUID
  usuario?: string;
  usuarioId?: string;        // UUID
  trama?: string;           
  
  operacion?: number;       // Opcional/Nullable
  nombreCliente?: string;   // Opcional/Nullable
  documento?: string;       // Opcional/Nullable
  created_at: string | Date;
}

export interface TramaResponse {
  success: boolean;
  message: string;
  statusCode: number;
  data?: ITrama;
}

export interface TramasResponse {
  success: boolean;
  message: string;
  statusCode: number;
  data: ITrama[];
  metadata: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}


export interface TramaDetalleResponse {
  success: boolean;
  message: string;
  statusCode: number;
  data?: ITramaDetalle;
}

export interface TramaDetallesResponse {
  success: boolean;
  message: string;
  statusCode: number;
  data: ITramaDetalle[];
  metadata: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}