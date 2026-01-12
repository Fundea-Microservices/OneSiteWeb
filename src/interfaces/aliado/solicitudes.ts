import { CuentaBancaria, ICuentaBancaria } from "./cuenta-bancaria";
import { EstadoSolicitud, TipoAfiliacion, TipoSolicitud } from "./generalidades";
import { Representante } from "./representante";

export interface Empresa {
  empresaId: string;
  representanteId: string;
  nombreEmpresa: string;
  nit: string;
  telefono: string;
  departamento: number;
  municipio: number;
  direccion: string;
  tipoActividad: string;
  actividad: string;
  detalleActividad: string;
  fechaInicioActividad: string;
  usrIngreso?: string | null;
  created_at: string;
  updated_at?: string | null;
  deleted_at?: string | null;
}

export interface Solicitud {
  solicitudId: string; // UUID

  // IDs de Relaciones (Foreign Keys)
  representanteId?: string | null;
  cuentaBancariaId?: string | null;
  empresaId?: string | null;
  tipoSolicitudId?: string | null;
  tipoAfiliacionId?: string | null;
  estadoSolicitudId?: string | null;

  // IDs Numéricos (Catálogo de Agencias)
  regionId?: number | null;
  agenciaId?: number | null;

  // Datos
  fechaSolicitud?: string | null; // ISO Date String (ej: "2023-10-25T10:00:00Z")
  observaciones?: string | null;

  /**
   * string: Si viene en Base64 desde el backend (JSON).
   * null: Si no hay documento.
   * Blob/File: Si lo estás manipulando en un input antes de enviarlo.
   */
  documentoCargado?: string | null; 

  // Auditoría
  usrIngreso?: string | null;
  created_at?: string; // Mapeado de created_at
  updated_at?: string | null; // Mapeado de updated_at
  deleted_at?: string | null; // Mapeado de deleted_at

  // --- Relaciones Opcionales (Si el backend hace 'populate' o 'eager loading') ---
  representante?: Representante;
  empresa?: Empresa;
  cuentaBancaria?: ICuentaBancaria;
  tipoSolicitud?: TipoSolicitud;
  estadoSolicitud?: EstadoSolicitud;
  tipoAfiliacion?: TipoAfiliacion;
  seguimientos?: SeguimientoSolicitud[];
}

export interface SeguimientoSolicitud {
  seguimientoId: string; // UUID

  // Relación con Solicitud
  solicitudId?: string | null;

  // Datos
  ordenSeguimiento?: number | null;
  estadoAprobacionId?: string | null; // UUID
  estadoAprobacion?: EstadoSolicitud
  observaciones?: string | null;

  // Auditoría
  usrIngreso?: string | null;
  created_at?: string; 
  updated_at?: string | null;
  deleted_at?: string | null;

  // Relación inversa opcional
  solicitud?: Solicitud;
}