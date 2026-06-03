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
  regionId: number | null;
}

interface TodasSucursalesRawRegion {
  identificador: number;
  descripcion: string;
  direccion: string;
  telefono: string;
  latitud: number;
  longitud: number;
}

interface TodasSucursalesRawAgencia {
  identificador: number;
  descripcion: string;
  direccion: string;
  telefono: string;
  latitud: number;
  longitud: number;
  regionId: number | null;
}

export interface TodasSucursalesResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: {
    regiones: TodasSucursalesRawRegion[];
    agencias: TodasSucursalesRawAgencia[];
  };
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
