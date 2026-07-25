// ─── Metadata compartida ──────────────────────────────────────────────────────

export interface EncuestaMetadata {
  total: number;
  page: number;
  limit: number;
}

// ─── Encuesta ─────────────────────────────────────────────────────────────────

export interface IEncuesta {
  idEncuesta?: number;
  nombre: string;
  versionActiva?: number | null;
  estado?: boolean;
  fechaCreacion?: Date;
  fechaModificacion?: Date;
}

export interface EncuestaListResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: IEncuesta[];
  metadata: EncuestaMetadata;
}

export interface EncuestaSingleResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: IEncuesta;
}

// ─── Sección ──────────────────────────────────────────────────────────────────

export interface ISeccion {
  idSeccion?: number;
  idEncuesta: number;
  titulo: string;
  orden: number;
  esVisibleDefault?: boolean;
  fechaCreacion?: Date;
  fechaModificacion?: Date;
}

export interface SeccionListResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: ISeccion[];
  metadata: EncuestaMetadata;
}

export interface SeccionSingleResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: ISeccion;
}

// ─── Pregunta ─────────────────────────────────────────────────────────────────

export interface IPregunta {
  idPregunta?: number;
  idSeccion: number;
  idMatrizPadre?: number | null;
  etiqueta: string;
  tipoDato: string;
  origenDatosTipo?: string | null;
  origenDatosCmd?: string | null;
  esEditable?: boolean;
  esVisibleDefault?: boolean;
  orden: number;
  fechaCreacion?: Date;
  fechaModificacion?: Date;
  opciones?: string | null;
  codigo: number;
  filtro?: number | null;
  obligatorio?: boolean;
  catalogoHijo?: string | null;

}

export interface PreguntaListResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: IPregunta[];
  metadata: EncuestaMetadata;
}

export interface PreguntaSingleResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: IPregunta;
}

// ─── Regla ────────────────────────────────────────────────────────────────────

export interface IRegla {
  idPregunta: number;
  sintaxisCalculo?: string | null;
  reglaValidacion?: string | null;
  reglaVisibilidad?: string | null;
  fechaModificacion?: Date;
}

export interface ReglaSingleResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: IRegla;
}
