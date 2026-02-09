// src/app/models/trama.model.ts
export interface ITrama {
  /** Identificador UUID */
  tramaId?: string;
  procesoId: number;
  sistemaId: number;
  descripcion: string;
  codigo: number;
  activo: number;
  created_at: string | Date;
  updated_at?: string | Date | null;
  deleted_at?: string | Date | null;
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