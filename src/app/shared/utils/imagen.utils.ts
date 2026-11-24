export interface OpcionesReduccionImagen {
  /** Lado más largo máximo, en píxeles. */
  maxLado?: number;
  /** Calidad JPEG (0-1). */
  calidad?: number;
  /** Si el archivo ya pesa menos que esto y no excede maxLado, se devuelve sin cambios. */
  bytesSinReducir?: number;
}

/**
 * Reduce una foto antes de validarla/subirla. Las cámaras de los teléfonos generan
 * imágenes de 5-15MB (y HEIC en iPhone); esto las redimensiona y las convierte a JPEG
 * en el navegador.
 *
 * La orientación EXIF se respeta porque los navegadores actuales la aplican al dibujar
 * la imagen en el canvas. Si el navegador no puede decodificar el archivo (p. ej. HEIC en
 * Chrome de escritorio) se devuelve el archivo original sin modificar.
 */
export async function reducirImagen(file: File, opciones: OpcionesReduccionImagen = {}): Promise<File> {
  const { maxLado = 2048, calidad = 0.85, bytesSinReducir = 1.5 * 1024 * 1024 } = opciones;

  if (!file.type.startsWith('image/') && !/\.(heic|heif)$/i.test(file.name)) {
    return file;
  }

  const url = URL.createObjectURL(file);
  try {
    return await reducir(file, url, maxLado, calidad, bytesSinReducir);
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function reducir(file: File, url: string, maxLado: number, calidad: number, bytesSinReducir: number): Promise<File> {
  const img = await cargarImagen(url);
  const ancho = img.naturalWidth;
  const alto = img.naturalHeight;
  if (!ancho || !alto) return file;

  const formatoCompatible = file.type === 'image/jpeg' || file.type === 'image/png';
  const ladoMayor = Math.max(ancho, alto);
  if (formatoCompatible && ladoMayor <= maxLado && file.size <= bytesSinReducir) {
    return file;
  }

  const escala = Math.min(1, maxLado / ladoMayor);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(ancho * escala);
  canvas.height = Math.round(alto * escala);
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;

  // Fondo blanco por si la imagen original tenía transparencia (PNG → JPEG)
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', calidad));
  if (!blob) return file;

  // Si por algún motivo el resultado es más pesado y el original ya era utilizable, conservar el original
  if (formatoCompatible && blob.size >= file.size) return file;

  const nombre = file.name.replace(/\.[^.]+$/, '') + '.jpg';
  return new File([blob], nombre, { type: 'image/jpeg', lastModified: Date.now() });
}

function cargarImagen(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo decodificar la imagen'));
    img.src = src;
  });
}
