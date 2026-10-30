/**
 * ────────────────────────────────────────────────────────────────────────────
 * Los colores del dictamen.
 *
 * El procedimiento de punteo del modelo puede devolver su propia paleta en
 * hexadecimal: `colorSemaforo` para el indicador y los bordes, `colorDoc` para
 * el fondo del documento. Si la devuelve, manda ella; si no, se cae a las
 * clases de Bootstrap que el módulo ya usaba.
 *
 * Son dos caminos excluyentes y no uno encima del otro porque las utilidades
 * de Bootstrap (`border-success`, `bg-warning-subtle`…) llevan `!important`:
 * un estilo en línea NO les gana. Así que cuando hay hexadecimal la clase se
 * omite, en vez de superponerse y perder.
 *
 * El color se guarda con el dictamen, no se resuelve al mostrarlo: un
 * expediente emitido tiene que seguir viéndose igual aunque mañana se
 * reparametrice la paleta.
 * ────────────────────────────────────────────────────────────────────────────
 */

/** Lo mínimo que hace falta para pintar: el nombre y, si hay, los dos hex. */
export interface DictamenColoreable {
  resultadoSemaforo?: string | null;
  colorSemaforo?: string | null;
  colorDoc?: string | null;
}

/** Las clases de siempre, por nombre de semáforo. */
const CLASES = {
  Verde: { punto: 'text-success', borde: 'border-success', fondo: 'bg-success-subtle', tabla: 'tabla-semaforo-verde', pie: 'table-success' },
  Amarillo: { punto: 'text-warning', borde: 'border-warning', fondo: 'bg-warning-subtle', tabla: 'tabla-semaforo-amarillo', pie: 'table-warning' },
  // Cuarto color: Punteo Precalificado de TransUnion entre 1 y 19.
  Naranja: { punto: 'text-orange', borde: 'border-orange', fondo: 'bg-orange-subtle', tabla: 'tabla-semaforo-naranja', pie: 'tabla-pie-naranja' },
  Rojo: { punto: 'text-danger', borde: 'border-danger', fondo: 'bg-danger-subtle', tabla: 'tabla-semaforo-rojo', pie: 'table-danger' },
} as const;

type Variante = (typeof CLASES)[keyof typeof CLASES];

const variante = (semaforo: string | null | undefined): Variante | null =>
  (CLASES as Record<string, Variante>)[semaforo ?? ''] ?? null;

/** Un hexadecimal utilizable: '#abc' o '#aabbcc'. */
const hex = (valor: string | null | undefined): string | null => {
  const limpio = valor?.trim();
  return limpio && /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(limpio)
    ? limpio
    : null;
};

/** El mismo color con transparencia, para franjas y cuadrículas. */
const conAlfa = (valor: string | null | undefined, alfa: number): string | null => {
  const color = hex(valor);
  if (!color) return null;

  const corto = color.length === 4;
  const parte = (i: number) =>
    parseInt(
      corto
        ? color[1 + i] + color[1 + i]
        : color.slice(1 + i * 2, 3 + i * 2),
      16,
    );

  return `rgba(${parte(0)}, ${parte(1)}, ${parte(2)}, ${alfa})`;
};

/**
 * Negro o blanco sobre el color, el que se lea.
 *
 * Sin esto, el amarillo del semáforo (#ffe440) con el texto blanco que trae
 * `badge` por omisión queda ilegible. La fórmula es la luminancia relativa de
 * la WCAG, y el corte en 0.55 es el que usa Bootstrap para decidir entre sus
 * dos colores de texto.
 */
export const contrasteDe = (valor: string | null | undefined): string | null => {
  const color = hex(valor);
  if (!color) return null;

  const corto = color.length === 4;
  const canal = (i: number) => {
    const c =
      parseInt(
        corto ? color[1 + i] + color[1 + i] : color.slice(1 + i * 2, 3 + i * 2),
        16,
      ) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };

  const luminancia =
    0.2126 * canal(0) + 0.7152 * canal(1) + 0.0722 * canal(2);

  return luminancia > 0.55 ? '#212529' : '#ffffff';
};

// ── Punto de color ──────────────────────────────────────────────────────────

/**
 * El dictamen dicho con un punto y su nombre, no con un rectángulo relleno.
 *
 * Es el tratamiento que ya tenía «Pendiente», extendido al resto. Una columna
 * con cuatro insignias saturadas compite con los números de la tabla, y el
 * color del dictamen deja de destacar justo donde importa.
 *
 * El color va SOLO en el punto: el nombre se lee siempre en el color de texto
 * estándar. Puesto sobre el texto, el amarillo del semáforo no se lee.
 */
export const clasePunto = (d: DictamenColoreable | null | undefined): string => {
  if (hex(d?.colorSemaforo)) return '';
  return variante(d?.resultadoSemaforo)?.punto ?? 'text-secondary';
};

export const estiloPunto = (
  d: DictamenColoreable | null | undefined,
): Record<string, string> => {
  const color = hex(d?.colorSemaforo);
  return color ? { color } : {};
};

// ── Marco: tarjetas y cabeceras ─────────────────────────────────────────────

/**
 * Borde y fondo son independientes: un procedimiento podría devolver uno y no
 * el otro, y cada mitad cae a su clase por separado.
 */
export const claseMarco = (d: DictamenColoreable | null | undefined): string => {
  const clases = variante(d?.resultadoSemaforo);
  if (!clases) return '';

  return [
    hex(d?.colorSemaforo) ? '' : clases.borde,
    hex(d?.colorDoc) ? '' : clases.fondo,
  ]
    .filter(Boolean)
    .join(' ');
};

export const estiloMarco = (
  d: DictamenColoreable | null | undefined,
): Record<string, string> => {
  const estilo: Record<string, string> = {};

  const borde = hex(d?.colorSemaforo);
  if (borde) estilo['border-color'] = borde;

  const fondo = hex(d?.colorDoc);
  if (fondo) estilo['background-color'] = fondo;

  return estilo;
};

/** Solo el borde, para los contenedores que no llevan fondo. */
export const claseBorde = (d: DictamenColoreable | null | undefined): string =>
  hex(d?.colorSemaforo) ? '' : (variante(d?.resultadoSemaforo)?.borde ?? '');

export const estiloBorde = (
  d: DictamenColoreable | null | undefined,
): Record<string, string> => {
  const borde = hex(d?.colorSemaforo);
  return borde ? { 'border-color': borde } : {};
};

// ── Tabla del desglose ──────────────────────────────────────────────────────

export const claseTabla = (d: DictamenColoreable | null | undefined): string =>
  hex(d?.colorSemaforo) ? '' : (variante(d?.resultadoSemaforo)?.tabla ?? '');

/**
 * Bootstrap pinta las franjas y la cuadrícula con dos variables CSS, así que
 * teñir la tabla es redefinirlas sobre ella y no tocar celda por celda. Las
 * opacidades son las mismas que ya tenían las clases.
 */
export const estiloTabla = (
  d: DictamenColoreable | null | undefined,
): Record<string, string> => {
  const borde = conAlfa(d?.colorSemaforo, 0.35);
  if (!borde) return {};

  return {
    '--bs-table-border-color': borde,
    '--bs-table-striped-bg': conAlfa(d?.colorSemaforo, 0.1) ?? 'transparent',
  };
};

/** La fila que cierra el cálculo, en el mismo color pero más marcada. */
export const clasePie = (d: DictamenColoreable | null | undefined): string =>
  hex(d?.colorSemaforo) ? '' : (variante(d?.resultadoSemaforo)?.pie ?? '');

export const estiloPie = (
  d: DictamenColoreable | null | undefined,
): Record<string, string> => {
  const fondo = conAlfa(d?.colorSemaforo, 0.25);
  return fondo ? { '--bs-table-bg-type': fondo } : {};
};
