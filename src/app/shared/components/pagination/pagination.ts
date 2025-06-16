import { ChangeDetectionStrategy, Component, EventEmitter, input, Output, output } from '@angular/core';


@Component({
  selector: 'app-pagination',
  imports: [],
  templateUrl: './pagination.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaginationComponent {

  paginationObj = input.required<IPagination>();

  changePage = output<IPagination>();

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

}

