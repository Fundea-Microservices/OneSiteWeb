import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Modal } from 'bootstrap';
import { PaginationAllComponent } from '../../../shared/components/pagination-all/pagination-all';
import { SerieEncabezado } from '../../../../interfaces/venta-cartera/serie';
import { SerieService } from '../../../../services/venta-cartera/serie.service';

@Component({
  selector: 'app-titularizacion-page',
  imports: [RouterLink, PaginationAllComponent, FormsModule, CurrencyPipe],
  templateUrl: './titularizacion-page.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class TitularizacionPage {
  private serieService = inject(SerieService);
  private cdr = inject(ChangeDetectorRef);

  isLoading = signal(false);
  serieList = signal<SerieEncabezado[]>([]);
  buscador = signal('');
  pagination = signal<IPagination>({ page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
  serieEdit = signal<SerieEncabezado>(this.emptySerie());

  @ViewChild('upsertModal') upsertModalRef!: ElementRef;
  private upsertModalInstance!: Modal;

  ngOnInit() {
    this.fetchData();
  }

  ngAfterViewInit() {
    if (this.upsertModalRef) {
      this.upsertModalInstance = new Modal(this.upsertModalRef.nativeElement);
    }
  }

  private emptySerie(): SerieEncabezado {
    return {
      identificador: '',
      empresaNombre: '',
      empresaId: '',
      observaciones: '',
      estado: 'Pendiente',
      usuarioNombre: '',
      usuarioId: '',
    };
  }

  async fetchData() {
    if (this.isLoading()) return;

    this.isLoading.set(true);
    try {
      const resp = await this.serieService.getSerieEncabezados({
        page: this.pagination().page,
        limit: this.pagination().pageSize,
        search: this.buscador(),
      });

      if (resp?.data) {
        this.serieList.set(resp.data);
        const metadata = resp.metadata;
        this.pagination.set({
          page: metadata.page ?? 1,
          pageSize: metadata.limit ?? 10,
          totalItems: metadata.total ?? 0,
          totalPages: metadata.totalPages ?? Math.ceil((metadata.total ?? 0) / (metadata.limit ?? 10)),
        });
      } else {
        this.serieList.set([]);
      }
    } catch (error) {
      console.error('Error fetching serie encabezados', error);
      this.serieList.set([]);
    } finally {
      this.isLoading.set(false);
      this.cdr.markForCheck();
    }
  }

  onChangePage(pagination: IPagination) {
    this.pagination.set(pagination);
    this.fetchData();
  }

  onSearchChange(value: string) {
    this.buscador.set(value);
  }

  buscar() {
    this.pagination.update(current => ({ ...current, page: 1 }));
    this.fetchData();
  }

  openUpsertModal() {
    this.serieEdit.set(this.emptySerie());

    if (!this.upsertModalInstance) {
      this.upsertModalInstance = new Modal(this.upsertModalRef.nativeElement);
    }

    this.upsertModalInstance.show();
  }

  async saveSerie() {
    const data = this.serieEdit();
    if (!data.identificador) return;

    this.isLoading.set(true);
    try {
      const resp = await this.serieService.createSerieEncabezado(data);
      if (resp?.success) {
        this.upsertModalInstance?.hide();
        this.pagination.update(current => ({ ...current, page: 1 }));
        this.isLoading.set(false);
        this.fetchData();
      }
    } catch (error) {
      console.error('Error saving serie:', error);
    } finally {
      this.isLoading.set(false);
      this.cdr.markForCheck();
    }
  }
}