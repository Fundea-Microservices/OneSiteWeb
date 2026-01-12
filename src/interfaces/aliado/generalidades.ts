export interface TipoSolicitud {
  tipoSolicitudId: string;      // uniqueidentifier (GUID)
  nombre: string | null;        // varchar(150) null
  mostrarPreguntas: boolean | null; // bit null
  activo?: boolean;
  deleted_at?: string | null;
}

export interface EstadoSolicitud {
  estadoSolicitudId: string;    // uniqueidentifier (GUID)
  nombre: string | null;        // varchar(150) null
  activo?: boolean;
  deleted_at?: string | null;
}

export interface TipoAfiliacion {
  tipoAfiliacionId: string;     // uniqueidentifier (GUID)
  nombre: string | null;        // varchar(150) null
  activo?: boolean;
  deleted_at?: string | null;
}