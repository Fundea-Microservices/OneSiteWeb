import { ChangeDetectionStrategy, Component, EventEmitter, inject, input, Output, output, signal } from '@angular/core';
import { ConfiguracionService } from '../../../../services/config/configuracion.service';


@Component({
  selector: 'app-pagination-all',
  imports: [],
  templateUrl: './pagination-all.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaginationAllComponent {

  configService = inject(ConfiguracionService);
  paginationObj = input.required<IPagination>();
  changePage = output<IPagination>();
  limiteMax = signal(1000)

  constructor() {
    this.loadLimiteMax();
  }

  async loadLimiteMax() {
    let resp = await this.configService.getConfigByKey('limite_paginacion');
    if (resp?.data) {      
      this.limiteMax.set(Number(resp.data.value));
    }
  }

  get totalPages(): number {
    return Math.ceil(this.paginationObj().totalItems / this.paginationObj().pageSize);
  }

  totalPagesArray(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  goToPage(page: number): void {
    this.changePage.emit({ ...this.paginationObj(), page });
  }

  nextPage(): void {
    if (this.paginationObj().page < this.totalPages) {
      this.changePage.emit({ ...this.paginationObj(), page: this.paginationObj().page + 1 });
    }
  }

  previousPage(): void {
    if (this.paginationObj().page > 1) {
      this.changePage.emit({ ...this.paginationObj(), page: this.paginationObj().page - 1 });
    }
  }

  changePageSize(pageSize: number = 10): void {
    this.changePage.emit({ ...this.paginationObj(), pageSize, page: 1 });
  }

}

