import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, signal, ViewChild, inject, ChangeDetectorRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Modal } from 'bootstrap';
import { EncabezadoService } from '../../../../../services/emanager/encabezado.service';
import { IEncabezado } from '../../../../../interfaces/emanager/encabezado';
import { PaginationAllComponent } from '../../../../shared/components/pagination-all/pagination-all';
import { UpsertEncabezadoComponent } from '../../../components/encabezado/upsert-encabezado/upsert-encabezado';

@Component({
  selector: 'app-encabezado-listado-page',
  imports: [RouterLink, PaginationAllComponent, UpsertEncabezadoComponent],
  templateUrl: './encabezado-listado-page.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class EncabezadoListadoPage {
  private encabezadoService = inject(EncabezadoService);
  private cdr = inject(ChangeDetectorRef);

  isLoading = signal(false);
  buscador = signal('');

  nuevoEncabezado = signal(true);
  encabezadoEdit = signal<IEncabezado>(this.getEmptyEncabezado());

  encabezadosList = signal<IEncabezado[]>([]);
  pagination = signal<IPagination>({ page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });

  @ViewChild('upsertEncabezadoModal') modalElementRef!: ElementRef;
  private modalUpsertInstance!: bootstrap.Modal;

  @ViewChild('deleteEncabezadoModal') modalDeleteElementRef!: ElementRef;
  private modalDeleteInstance!: bootstrap.Modal;

  modal = signal({
    titulo: 'Crear Encabezado',
    visible: false,
  });

  ngOnInit() {
    this.fetchData();
  }

  ngAfterViewInit() {
    this.modalUpsertInstance = new Modal(this.modalElementRef.nativeElement);
    this.modalDeleteInstance = new Modal(this.modalDeleteElementRef.nativeElement);
  }

  private getEmptyEncabezado(): IEncabezado {
    return {
      encabezadoId: '',
      nombre: '',
      proceso: 0,
      activo: true,
      created_at: new Date(),
    };
  }

  async fetchData() {
    if (this.isLoading()) return;

    this.isLoading.set(true);

    try {
      const resultado = await this.encabezadoService.getEncabezados({
        page: this.pagination().page,
        limit: this.pagination().pageSize,
        search: this.buscador()
      });

      if (resultado?.data) {
        this.encabezadosList.set(resultado.data);

        if (resultado.metadata) {
          const metadata = resultado.metadata;
          this.pagination.set({
            page: metadata.page || 1,
            pageSize: metadata.limit || 10,
            totalItems: metadata.total || 0,
            totalPages: metadata.totalPages || 0
          });
        }
      } else {
        this.encabezadosList.set([]);
        this.pagination.set({ page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
      }

      this.cdr.markForCheck();
    } catch (error) {
      console.error('❌ Error en fetchData:', error);
      this.encabezadosList.set([]);
    } finally {
      this.isLoading.set(false);
      this.cdr.markForCheck();
    }
  }

  onChangePage(newPagination: IPagination) {
    this.pagination.set(newPagination);
    this.fetchData();
  }

  async createEncabezado(encabezado: IEncabezado) {
    const resp = await this.encabezadoService.createEncabezado(encabezado);
    if (resp?.success) {
      this.fetchData();
      this.closeModal();
      this.encabezadoEdit.set(this.getEmptyEncabezado());
      this.nuevoEncabezado.set(true);
    }
  }

  async updateEncabezado(encabezado: IEncabezado) {
    const resp = await this.encabezadoService.updateEncabezado(encabezado);
    if (resp?.success) {
      this.fetchData();
      this.closeModal();
    }
  }

  async deleteEncabezado(encabezado: IEncabezado) {
    if (!encabezado.encabezadoId) return;
    const resp = await this.encabezadoService.deleteEncabezado(encabezado.encabezadoId);
    if (resp?.success) {
      this.fetchData();
      if (this.modalDeleteInstance) {
        this.modalDeleteInstance.hide();
      }
    }
  }

  async upsertEncabezado(encabezado: IEncabezado) {
    if (!encabezado.encabezadoId) {
      await this.createEncabezado(encabezado);
    } else {
      await this.updateEncabezado(encabezado);
    }
  }

  openModal(nuevo: boolean = true, encabezado: IEncabezado = this.getEmptyEncabezado()) {
    this.nuevoEncabezado.set(nuevo);

    if (this.nuevoEncabezado()) {
      this.encabezadoEdit.set(this.getEmptyEncabezado());
      this.modal.set({ titulo: 'Crear Encabezado', visible: true });
    } else {
      this.encabezadoEdit.set(encabezado);
      this.modal.set({ titulo: 'Actualizar Encabezado', visible: true });
    }

    if (!this.modalUpsertInstance) {
      this.modalUpsertInstance = new Modal(this.modalElementRef.nativeElement);
    }
    this.modalUpsertInstance.show();
  }

  closeModal() {
    if (this.modalUpsertInstance) {
      this.modalUpsertInstance.hide();
    }
  }

  openDeleteModal(encabezado: IEncabezado) {
    this.encabezadoEdit.set(encabezado);
    if (!this.modalDeleteInstance) {
      this.modalDeleteInstance = new Modal(this.modalDeleteElementRef.nativeElement);
    }
    this.modalDeleteInstance.show();
  }
}
