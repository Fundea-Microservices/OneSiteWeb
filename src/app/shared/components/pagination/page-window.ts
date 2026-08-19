/**
 * Ventana de paginación compartida por <app-pagination> y <app-pagination-all>.
 *
 * Problema que resuelve: con 26 páginas el paginador dibujaba los 26 botones y
 * se desbordaba horizontalmente. A partir de cierto número de páginas solo se
 * muestran la primera, la última y una ventana alrededor de la página actual;
 * los huecos se representan con saltos ("…") en los que se puede hacer clic
 * para avanzar o retroceder de sección.
 */

/** Salto de bloque hacia atrás o hacia adelante; el resto son números de página. */
export type PageItem = number | 'salto-atras' | 'salto-adelante';

/** Páginas visibles a cada lado de la actual dentro de la ventana. */
export const PAGINAS_LATERALES = 2;

/** Cuántas páginas avanza o retrocede un salto de sección. */
export const SALTO_SECCION = PAGINAS_LATERALES * 2 + 1;

/**
 * Construye la lista de botones del paginador.
 *
 * @param actual        página en curso (1..total)
 * @param total         total de páginas
 * @param maxSinVentana hasta cuántas páginas se listan completas, sin saltos
 */
export function construirVentanaPaginas(
  actual: number,
  total: number,
  maxSinVentana = 10
): PageItem[] {
  if (total <= 1) return total === 1 ? [1] : [];

  // Pocas páginas: se muestran todas, como antes.
  if (total <= maxSinVentana) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pagina = Math.min(Math.max(actual, 1), total);
  const items: PageItem[] = [1];

  let desde = Math.max(2, pagina - PAGINAS_LATERALES);
  let hasta = Math.min(total - 1, pagina + PAGINAS_LATERALES);

  // Cerca del principio o del final la ventana se desplaza en vez de encogerse,
  // para que el paginador conserve siempre el mismo ancho.
  const ancho = PAGINAS_LATERALES * 2 + 1;
  if (hasta - desde + 1 < ancho) {
    if (desde === 2) hasta = Math.min(total - 1, desde + ancho - 1);
    else if (hasta === total - 1) desde = Math.max(2, hasta - ancho + 1);
  }

  // Hueco a la izquierda: si solo falta una página, se dibuja en vez del salto.
  if (desde > 2) {
    items.push(desde === 3 ? 2 : 'salto-atras');
  }

  for (let p = desde; p <= hasta; p++) items.push(p);

  // Hueco a la derecha, con el mismo criterio.
  if (hasta < total - 1) {
    items.push(hasta === total - 2 ? total - 1 : 'salto-adelante');
  }

  items.push(total);
  return items;
}
