export interface ICatalogo {
  id: string;
  nombre: string;
  codigo: string;
  activo: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ICatalogoOpcion {
  id: string;
  idCatalogo: string;
  nombre: string;
  codigo: string;
  orden?: number;
  activo: boolean;
  porDefecto: boolean;
  idPadre?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CatalogoMetadata {
  total: number;
  page: number;
  limit: number;
}

export interface CatalogoResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: ICatalogo[];
  metadata: CatalogoMetadata;
}

export interface CatalogoSingleResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: ICatalogo;
}

export interface CatalogoOpcionResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: ICatalogoOpcion[];
  metadata: CatalogoMetadata;
}

export interface CatalogoOpcionSingleResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: ICatalogoOpcion;
}
