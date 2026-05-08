export interface ICatalogoMaestro {
  idCatalogo?: number;
  nombreCatalogo: string;
  codigoOpcion: string;
  valorOpcion: string;
  idPadreOpcion?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CatalogoMaestroResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: ICatalogoMaestro[];
  metadata: CatalogoMaestroMetadata;
}

export interface CatalogoMaestroMetadata {
  total: number;
  page: number;
  limit: number;
}

export interface CatalogoMaestroSingleResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: ICatalogoMaestro;
}
