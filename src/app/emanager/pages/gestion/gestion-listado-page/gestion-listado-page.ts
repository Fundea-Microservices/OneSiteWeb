import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, signal, ViewChild, inject, ChangeDetectorRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Modal } from 'bootstrap';
import { TramaService } from '../../../../../services/emanager/trama.service';
import { ITrama } from '../../../../../interfaces/emanager/getion';
import { PaginationAllComponent } from '../../../../shared/components/pagination-all/pagination-all';
import { UpsertTramaComponent } from '../../../components/trama/upsert-trama/upsert-trama';

@Component({
  selector: 'app-gestion-listado-page',
  imports: [RouterLink, PaginationAllComponent, UpsertTramaComponent],
  templateUrl: './gestion-listado-page.html',  
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class GestionListadoPage {  
  private tramaService = inject(TramaService);
  private cdr = inject(ChangeDetectorRef);

  isLoading = signal(false);
  buscador = signal('');

  nuevoTrama = signal(true);
  tramaEdit = signal<ITrama>(this.getEmptyTrama());

  tramasList = signal<ITrama[]>([]);
  pagination = signal<IPagination>({ page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });

  @ViewChild('upsertTramaModal') modalElementRef!: ElementRef;
  private modalUpsertInstance!: bootstrap.Modal;

  @ViewChild('deleteTramaModal') modalDeleteElementRef!: ElementRef;
  private modalDeleteInstance!: bootstrap.Modal;

  modal = signal({
    titulo: 'Crear Trama',
    visible: false,
  });

  ngOnInit() {
    this.fetchData();
  }

  ngAfterViewInit() {
    this.modalUpsertInstance = new Modal(this.modalElementRef.nativeElement);
    this.modalDeleteInstance = new Modal(this.modalDeleteElementRef.nativeElement);
  }

  private getEmptyTrama(): ITrama {
    return {
      tramaId: '',
      procesoId: 0,
      sistemaId: 2,
      nombre: '',
      descripcion: '',
      codigo: 0,
      codigoInterno: 0,
      usuario: 'usuarioapp',
      usuarioGlobal: false,
      activo: true,
      created_at: new Date(),
    };
  }

  async fetchData() {
    if (this.isLoading()) return;

    this.isLoading.set(true);

    try {
      const resultado = await this.tramaService.getTramas({
        page: this.pagination().page,
        limit: this.pagination().pageSize,
        search: this.buscador()
      });

      if (resultado?.data) {
        this.tramasList.set(resultado.data);

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
        this.tramasList.set([]);
        this.pagination.set({ page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
      }

      this.cdr.markForCheck();
    } catch (error) {
      console.error('❌ Error en fetchData:', error);
      this.tramasList.set([]);
    } finally {
      this.isLoading.set(false);
      this.cdr.markForCheck();
    }
  }

  onChangePage(newPagination: IPagination) {
    this.pagination.set(newPagination);
    this.fetchData();
  }

  async createTrama(trama: ITrama) {
    const resp = await this.tramaService.createTrama(trama);
    if (resp?.success) {
      this.fetchData();
      this.closeModal();
      this.tramaEdit.set(this.getEmptyTrama());
      this.nuevoTrama.set(true);
    }
  }

  async updateTrama(trama: ITrama) {
    const resp = await this.tramaService.updateTrama(trama);
    if (resp?.success) {
      this.fetchData();
      this.closeModal();
    }
  }

  async deleteTrama(trama: ITrama) {
    if (!trama.tramaId) return;
    const resp = await this.tramaService.deleteTrama(trama.tramaId);
    if (resp?.success) {
      this.fetchData();
      if (this.modalDeleteInstance) {
        this.modalDeleteInstance.hide();
      }
    }
  }

  async upsertTrama(trama: ITrama) {
    if (!trama.tramaId) {
      await this.createTrama(trama);
    } else {
      await this.updateTrama(trama);
    }
  }

  openModal(nuevo: boolean = true, trama: ITrama = this.getEmptyTrama()) {
    this.nuevoTrama.set(nuevo);

    if (this.nuevoTrama()) {
      this.tramaEdit.set(this.getEmptyTrama());
      this.modal.set({ titulo: 'Crear Trama', visible: true });
    } else {
      this.tramaEdit.set(trama);
      this.modal.set({ titulo: 'Actualizar Trama', visible: true });
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

  openDeleteModal(trama: ITrama) {
    this.tramaEdit.set(trama);
    if (!this.modalDeleteInstance) {
      this.modalDeleteInstance = new Modal(this.modalDeleteElementRef.nativeElement);
    }
    this.modalDeleteInstance.show();
  }
}
