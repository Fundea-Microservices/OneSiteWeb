// Interfaces para validación de documentos con agente

export interface ValidarDocumentoParams {
  accion: string;
  upload_file: File;
}

export interface MetadataDocumento {
  success: boolean;
  statusCode: number;
  timestamp: string;
  tipo_archivo_procesado: string;
  procesado_por: string;
  mensaje_usuario: string;
}

export interface ValidacionTipo {
  tipo_detectado: string;
  es_documento_esperado: boolean;
  confianza_prediccion: string;
  mensaje_error: string | null;
}

export interface RegistroCivil {
  libro: string;
  folio: string;
  partida: string;
}

export interface Demografia {
  estado_civil: string;
  profesion_oficio: string;
  pueblo: string;
  comunidad_linguistica: string;
  fecha_de_vencimiento: string;
}

export interface Geografia {
  nacimiento_completo: string;
  nacimiento_municipio: string;
  nacimiento_departamento: string;
  vecindad_completa: string;
  vecindad_municipio: string;
  vecindad_departamento: string;
}

export interface DatosSeguridad {
  numero_de_serie: string;
  mrz_linea_1: string;
  mrz_linea_2: string;
  mrz_linea_3: string;
}

export interface DesgloseNombre {
  apellido_1: string;
  apellido_2: string;
  apellido_casada?: string | null;
  nombre_1: string;
  nombre_2?: string | null;
  nombre_3?: string | null;
}

export interface DatosEspecificos {
  // Datos del frontal
  cui_visual?: string;
  cui_numero?: string;
  desglose_nombre?: DesgloseNombre;
  sexo_codigo?: string;
  sexo_descripcion?: string;
  nacionalidad_iso?: string;
  nacionalidad_pais?: string;
  pais_nacimiento_iso?: string;
  pais_nacimiento_pais?: string;
  fecha_nacimiento?: string;
  fecha_de_emision?: string;
  
  // Datos del reverso
  registro_civil?: RegistroCivil;
  demografia?: Demografia;
  geografia?: Geografia;
  datos_seguridad?: DatosSeguridad;
}

export interface ContenidoDocumento {
  validacion_tipo: ValidacionTipo;
  datos_especificos: DatosEspecificos | null;
}

export interface AuditoriaCalidad {
  puntuacion_1_100: number;
  nivel_legibilidad: string;
  codigo_barras_visible?: boolean;
  problemas_detectados: string[];
  feedback_para_asesor: string;
}

export interface LlavesCruce {
  identificador_principal: string | null;
  nombre_normalizado: string | null;
  fecha_clave: string | null;
}

export interface ResumenEjecutivo {
  decision_ia: string;
  accion_sugerida: string;
  riesgo_fraude: string;
  llaves_para_cruce: LlavesCruce;
}

export interface DocumentoValidado {
  metadata: MetadataDocumento;
  contenido_documento: ContenidoDocumento;
  auditoria_calidad: AuditoriaCalidad;
  resumen_ejecutivo: ResumenEjecutivo;
}

export interface ValidarDocumentoResponse {
  documento?: DocumentoValidado;
  metadata?: MetadataDocumento;
  contenido_documento?: ContenidoDocumento;
  auditoria_calidad?: AuditoriaCalidad;
  resumen_ejecutivo?: ResumenEjecutivo;
}
