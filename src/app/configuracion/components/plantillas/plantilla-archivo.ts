/**
 * Reglas del archivo de una plantilla (al crear y al reemplazar). El backend además valida
 * el MIME, la firma real del archivo y lo pasa por antivirus; aquí solo se evita enviar
 * lo que de seguro va a rechazar.
 */
export const PLANTILLA_EXTENSIONES = ['.xls', '.xlsx'];
export const PLANTILLA_ACCEPT = PLANTILLA_EXTENSIONES.join(',');
export const PLANTILLA_TAMANIO_MAX_MB = 10;

/** Devuelve el motivo por el que no se puede enviar el archivo, o null si es válido. */
export function validarArchivoPlantilla(archivo: File): string | null {
  const nombre = archivo.name.toLowerCase();
  if (!PLANTILLA_EXTENSIONES.some(ext => nombre.endsWith(ext))) {
    return 'Solo se permiten archivos de Excel (.xls o .xlsx).';
  }
  if (archivo.size === 0) {
    return 'El archivo está vacío.';
  }
  if (archivo.size > PLANTILLA_TAMANIO_MAX_MB * 1024 * 1024) {
    return `El archivo supera el tamaño máximo de ${PLANTILLA_TAMANIO_MAX_MB} MB.`;
  }
  return null;
}

/** 24576 -> "24 KB", 3250585 -> "3.1 MB" */
export function formatearTamanio(bytes: number): string {
  if (!bytes) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Etiqueta corta del formato a partir del MIME. */
export function formatoExcel(mimeType: string): 'XLS' | 'XLSX' {
  return mimeType?.includes('ms-excel') ? 'XLS' : 'XLSX';
}
