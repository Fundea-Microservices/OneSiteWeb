export interface ConsultaAuditoriaSiucomParams {
  usuario?: string;
  filtro?: string;
  fecha?: string;        // YYYY-MM-DD
  fechaInicio?: string;  // YYYY-MM-DD
  fechaFin?: string;     // YYYY-MM-DD
  formato?: 'json' | 'csv';
}

export interface AuditoriaSesion {
  session_token: string;
  usuario: string;
  nombre_cliente: string;
  email: string;
  region: string;
  agencia: string;
  rol: string;
  fecha: string;
  ingreso: string;
  salida_o_ultima_actividad: string;
  estado: string;                     // ej. "expirada" | "activa"
  ip_conexion: string;
  dispositivo_navegador: string;
  minutos_sesion: number;
  modulos_vistos: number;
  modulos_con_foco: number;
  minutos_totales_foco: number;
  detalle_modulos_vistos: string;
}

export interface AuditoriaClienteAutenticado {
  nombre_cliente: string;
  email: string;
  region: string;
  agencia: string;
  rol: string;
}

export interface AuditoriaResumen {
  total_sesiones: number;
  sesiones_activas: number;
  minutos_totales_sesion: number;
  minutos_totales_foco: number;
  modulos_vistos_acumulados: number;
  modulos_unicos: number;
  visualizaciones_acumuladas: number;
  ips_unicas: number;
  usuarios_unicos: number;
  promedio_minutos_sesion: number;
}

export interface AuditoriaData {
  ok: boolean;
  codigo: number;
  mensaje: string;
  total_registros: number;
  cliente_autenticado: AuditoriaClienteAutenticado;
  restriccion_cliente: { prefijo_usuario: string };
  filtros: { usuario: string; filtro: string; fecha_desde: string; fecha_hasta: string };
  resumen: AuditoriaResumen;
  sesiones: AuditoriaSesion[];
  top_modulos: { modulo: string; vistas: number; minutos_foco: number; sesiones: number }[];
  actividad_diaria: { fecha: string; sesiones: number; minutos_sesion: number }[];
  top_ips: { ip: string; sesiones: number }[];
  top_usuarios: { usuario: string; sesiones: number; minutos_sesion: number }[];
  heatmap_uso: { dia_semana: number; hora: number; sesiones: number }[];
  generado_en: string;
}

export interface ConsultaAuditoriaResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: AuditoriaData;
}
