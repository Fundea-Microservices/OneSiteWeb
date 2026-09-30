import { IJob, IJobEjecucion, JobTipo } from '../../../interfaces/jobs/job';

/** "HH:MM" en 24 h, de 00:00 a 23:59 (misma regla que el backend). */
export const JOB_HORA_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/** Opciones de los select de programación; 0 significa "todos". */
export const OPCIONES_MES = [
  { valor: 0, texto: 'Todos los meses' },
  ...MESES.map((mes, i) => ({ valor: i + 1, texto: capitalizar(mes) })),
];

export const OPCIONES_DIA = [
  { valor: 0, texto: 'Todos los días' },
  ...Array.from({ length: 31 }, (_, i) => ({ valor: i + 1, texto: `Día ${i + 1}` })),
];

/** Días del mes (año bisiesto para febrero, que es el máximo posible). */
const DIAS_POR_MES = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** Programación en lenguaje natural, ej. "Día 15 de cada mes a las 08:00". */
export function describirProgramacion({ mes, dia, hora }: Pick<IJob, 'mes' | 'dia' | 'hora'>): string {
  const nombreMes = MESES[mes - 1];
  if (!mes && !dia) return `Todos los días a las ${hora}`;
  if (!mes) return `Día ${dia} de cada mes a las ${hora}`;
  if (!dia) return `Todos los días de ${nombreMes} a las ${hora}`;
  return `Cada ${dia} de ${nombreMes} a las ${hora}`;
}

/**
 * Revisa la combinación mes/día. `error`: fecha imposible que el backend rechaza (ej. 31 de abril).
 * `aviso`: fecha válida que no se ejecuta todos los meses/años (ej. día 31 con "todos los meses").
 */
export function validarDiaMes(mes: number, dia: number): { error: string | null; aviso: string | null } {
  if (!dia) return { error: null, aviso: null };
  if (mes) {
    if (dia > DIAS_POR_MES[mes - 1]) return { error: `${capitalizar(MESES[mes - 1])} no tiene día ${dia}.`, aviso: null };
    if (mes === 2 && dia === 29) return { error: null, aviso: 'Solo se ejecutará en años bisiestos.' };
    return { error: null, aviso: null };
  }
  const aviso = dia > 28 ? `Solo se ejecutará en los meses que tienen día ${dia}.` : null;
  return { error: null, aviso };
}

function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// ─── Tipo de job ─────────────────────────────────────────────────

export const TEXTO_TIPO: Record<JobTipo, string> = {
  PATTERN: 'Pattern',
  PROCEDIMIENTO: 'Procedimiento',
};

/** Los jobs anteriores a los tipos no traen `tipo` y funcionan como PATTERN. */
export function tipoJob(job: Pick<IJob, 'tipo'>): JobTipo {
  return job.tipo ?? 'PATTERN';
}

/** Lo que ejecuta el job: el mensaje NATS o el procedimiento almacenado. */
export function destinoJob(job: Pick<IJob, 'tipo' | 'pattern' | 'procedimiento'>): string {
  return (tipoJob(job) === 'PROCEDIMIENTO' ? job.procedimiento : job.pattern) ?? '';
}

/** "esquema.nombre" dentro del esquema `jobs`, que es donde el backend busca el procedimiento. */
export const JOB_PROCEDIMIENTO_REGEX = /^jobs\.[A-Za-z_][A-Za-z0-9_]*$/;

/** "850 ms", "12.4 s" o "2 min 5 s". */
export function formatearDuracion(ms: number | null): string {
  if (ms === null || ms === undefined) return '—';
  if (ms < 1000) return `${ms} ms`;
  const segundos = ms / 1000;
  if (segundos < 60) return `${segundos.toFixed(1)} s`;
  const minutos = Math.floor(segundos / 60);
  return `${minutos} min ${Math.round(segundos % 60)} s`;
}

export type EstadoEjecucion = 'progreso' | 'exito' | 'error';

export function estadoEjecucion({ exitoso }: Pick<IJobEjecucion, 'exitoso'>): EstadoEjecucion {
  if (exitoso === null || exitoso === undefined) return 'progreso';
  return exitoso ? 'exito' : 'error';
}

export const TEXTO_ESTADO: Record<EstadoEjecucion, string> = {
  progreso: 'En progreso',
  exito: 'Éxito',
  error: 'Error',
};

/** Clase de `etiqueta-estado` (src/styles/identidad/componentes.css) para cada estado. */
export const CLASE_ESTADO: Record<EstadoEjecucion, string> = {
  progreso: 'etiqueta-estado--informacion',
  exito: 'etiqueta-estado--exito',
  error: 'etiqueta-estado--error',
};

/**
 * Payload guardado (string JSON compacto) a texto legible para editar.
 * Si no es JSON válido se devuelve tal cual para no perder el valor.
 */
export function payloadParaEditar(payload: string | null | undefined): string {
  if (!payload) return '';
  try {
    return JSON.stringify(JSON.parse(payload), null, 2);
  } catch {
    return payload;
  }
}

/** Texto del editor a string JSON compacto para enviar. Lanza si el JSON no es válido. */
export function payloadParaEnviar(texto: string): string {
  return texto.trim() ? JSON.stringify(JSON.parse(texto)) : '';
}
