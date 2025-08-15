import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, inject, signal, ViewChild } from '@angular/core';
import { Modal } from 'bootstrap';
import { IReporte } from '../../../../interfaces/reportes/reporte';
import { ReporteService } from '../../../../services/reportes/reporte.service';
import { RouterLink } from '@angular/router';
import { PaginationComponent } from '../../../shared/components/pagination/pagination';
import { PaginationAllComponent } from '../../../shared/components/pagination-all/pagination-all';
import { DatePipe } from '@angular/common';
import { UpsertReporteComponent } from '../../components/upsert-reporte/upsert-reporte.component';

const emptyReporte: IReporte = {
  reporteId: '',
  nombre: '',
  descripcion: '',
  procedimiento: '',
  activo: true,
  created_at: new Date()
}

@Component({
  selector: 'app-reporte',
  imports: [RouterLink, PaginationAllComponent, DatePipe, UpsertReporteComponent],
  templateUrl: './reporte.component.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ReporteComponent {
  reporteService = inject(ReporteService);
  reporteList = signal<IReporte[]>([]);
  metadata = signal({})// Cambia el tipo según tu modelo de datos
  reporteEdit = signal<IReporte>(emptyReporte)
  nuevoReporte = signal<boolean>(true); // Indica si es una nueva configuración o una existente

  pagination = signal<IPagination>({
    page: 1,
    pageSize: 10,
    totalItems: 0
  });
  isLoading = signal(false);
  formKey = signal(Date.now());

  @ViewChild('upsertModal') modalElementRef!: ElementRef;
  private modalUpsertInstance!: bootstrap.Modal;

  @ViewChild('deleteModal') modalDeleteElementRef!: ElementRef;
  private modalDeleteInstance!: bootstrap.Modal;

  modal = signal({
    titulo: 'Crear reporte',
    visible: false,
  });

  buscador = signal('');

  constructor() { }

  ngOnInit() {

    this.reporteList.set([]); // Limpiamos la lista antes de cargar nuevos datos
    this.fetchData();
  }

  ngAfterViewInit() {
    this.modalUpsertInstance = new Modal(this.modalElementRef.nativeElement);
    this.modalDeleteInstance = new Modal(this.modalDeleteElementRef.nativeElement);
  }

  async fetchData() {
    if (this.isLoading()) return;
    this.isLoading.set(true);
    let resp = await this.reporteService.getReportes({ page: this.pagination().page, limit: this.pagination().pageSize, search: this.buscador() });
    if (resp) {
      let { reportes, metadata } = resp.data;
      this.reporteList.set(reportes);
      this.metadata.set(metadata);
      this.pagination.set({
        page: metadata.page,
        pageSize: metadata.limit,
        totalItems: metadata.total
      });
    }
    this.isLoading.set(false);
  }

  async deleteReporte(reporte: IReporte) {
    let resp = await this.reporteService.deleteReporte(reporte);
    if (resp?.success) {
      this.fetchData();
      if (this.modalDeleteInstance) {
        this.modalDeleteInstance.hide();
      }
    }
  }

  changeActive(reporte: IReporte, checked: boolean) {
    reporte.activo = checked;
    this.updateReporte(reporte);
  }

  async createReporte(reporte: IReporte) {
    let resp = await this.reporteService.createReporte(reporte);
    if (resp?.success) {
      this.fetchData()
      this.closeModal();
      this.reporteEdit.set(emptyReporte);
      this.nuevoReporte.set(true); // Reseteamos el estado de nueva configuración
    }
  }

  async updateReporte(reporte: IReporte) {
    let resp = await this.reporteService.updateReporte(reporte);
    if (resp?.success) {
      // this.configList.set([]); // Limpiamos la lista antes de cargar nuevos datos
      this.fetchData()
      this.closeModal();
    }
  }

  onChangePage(newPagination: IPagination) {
    this.reporteList.set([]); // Limpiamos la lista antes de cargar nuevos datos
    this.pagination.set(newPagination);
    this.fetchData();
  }

  async upsertReporte(reporte: IReporte) {
    if (!reporte.reporteId) {
      this.createReporte(reporte);
    } else {
      this.updateReporte(reporte);
    }
  }

  openModal(nuevo: boolean = true, reporte: IReporte = emptyReporte) {
    this.nuevoReporte.set(nuevo);

    if (this.nuevoReporte()) {
      this.reporteEdit.set(emptyReporte)
    } else {
      this.reporteEdit.set(reporte);
    }
    this.formKey.set(Date.now()); // esto obliga al componente hijo a resetear
    this.modal.set({ titulo: nuevo ? 'Crear Reporte' : 'Actualizar Reporte', visible: true });
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

  openDeleteModal(reporte: IReporte) {
    this.reporteEdit.set(reporte);
    this.modal.set({
      titulo: reporte.reporteId ? 'Actualizar Reporte' : 'Crear Reporte',
      visible: true,
    });
    if (!this.modalDeleteInstance) {
      this.modalDeleteInstance = new Modal(this.modalDeleteElementRef.nativeElement);
    }
    this.modalDeleteInstance.show();
  }

}
