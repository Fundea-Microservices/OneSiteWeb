export interface Region {
  id: number;
  descripcion: string;
  direccion: string;
  telefono: string;
  latitud: number;
  longitud: number;
}

export interface Agencia {
  id: number;
  descripcion: string;
  direccion: string;
  telefono: string;
  latitud: number;
  longitud: number;
  regionId: number;
}

export interface MisSucursalesData {
  regiones: Region[];
  agencias: Agencia[];
}

export interface MisSucursalesMetadata {
  total: number;
  totalRegiones: number;
  totalAgencias: number;
}

export interface MisSucursalesResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: MisSucursalesData;
  metadata: MisSucursalesMetadata;
}
