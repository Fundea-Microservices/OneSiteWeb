import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { construirVentanaPaginas, PageItem, SALTO_SECCION } from './page-window';


@Component({
  selector: 'app-pagination',
  imports: [],
  templateUrl: './pagination.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaginationComponent {

  paginationObj = input.required<IPagination>();

  /** Hasta cuántas páginas se listan completas antes de recortar con saltos. */
  maxPaginasVisibles = input<number>(10);

  changePage = output<IPagination>();

  readonly saltoSeccion = SALTO_SECCION;

  get totalPages(): number {
    const { totalItems, pageSize } = this.paginationObj();
    if (!totalItems || !pageSize) return 1;
    return Math.max(1, Math.ceil(totalItems / pageSize));
  }

  /** Página actual acotada al rango válido. */
  paginaActual = computed(() =>
    Math.min(Math.max(this.paginationObj().page, 1), this.totalPages)
  );

  /** Botones a dibujar: números de página y saltos de sección. */
  paginas = computed<PageItem[]>(() =>
    construirVentanaPaginas(this.paginaActual(), this.totalPages, this.maxPaginasVisibles())
  );

  /** "Mostrando 61 – 70 de 256 registros" */
  rango = computed(() => {
    const { totalItems, pageSize } = this.paginationObj();
    if (!totalItems) return null;
    const desde = (this.paginaActual() - 1) * pageSize + 1;
    const hasta = Math.min(this.paginaActual() * pageSize, totalItems);
    return { desde, hasta, total: totalItems };
  });

  esNumero(item: PageItem): item is number {
    return typeof item === 'number';
  }

  goToPage(page: number): void {
    const destino = Math.min(Math.max(page, 1), this.totalPages);
    if (destino === this.paginaActual()) return;
    this.changePage.emit({ ...this.paginationObj(), page: destino });
  }

  /** Retrocede una sección completa de páginas. */
  saltarAtras(): void {
    this.goToPage(this.paginaActual() - SALTO_SECCION);
  }

  /** Avanza una sección completa de páginas. */
  saltarAdelante(): void {
    this.goToPage(this.paginaActual() + SALTO_SECCION);
  }

  nextPage(): void {
    this.goToPage(this.paginaActual() + 1);
  }

  previousPage(): void {
    this.goToPage(this.paginaActual() - 1);
  }

  changePageSize(pageSize: number = 10): void {
    this.changePage.emit({ ...this.paginationObj(), pageSize, page: 1 });
  }

}
