import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, inject, signal, ViewChild } from '@angular/core';
import { Modal } from 'bootstrap';
import { IReporte } from '../../../../interfaces/reportes/reporte';
import { ReporteService } from '../../../../services/reportes/reporte.service';
import { RouterLink } from '@angular/router';
import { PaginationComponent } from '../../../shared/components/pagination/pagination';
import { PaginationAllComponent } from '../../../shared/components/pagination-all/pagination-all';
import { DatePipe } from '@angular/common';
import { PlantillaService } from '../../../../services/reportes/plantilla.service';
import { MenuService } from '../../../../services/config/menu.service';
import { IMenu } from '../../../../interfaces/auth';
import { ToastrService } from 'ngx-toastr';
import { IProcedimiento } from '../../../../interfaces/procedimientos/procedimiento';
import { ProcedimientoService } from '../../../../services/procedimientos/procedimiento.service';
import { UpsertProcedimientoComponent } from '../../components/upsert-procedimiento/upsert-procedimiento.component';

const emptyProcedimiento: IProcedimiento = {
  procedimientoId: '',
  nombre: '',
  descripcion: '',
  procedimiento: '',
  activo: true,
  created_at: new Date()
}

@Component({
  selector: 'app-procedimiento',
  imports: [RouterLink, PaginationAllComponent, DatePipe, UpsertProcedimientoComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './procedimiento.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ProcedimientoComponent {
  procedimientoService = inject(ProcedimientoService);
  procedimientoList = signal<IProcedimiento[]>([]);
  metadata = signal({})// Cambia el tipo según tu modelo de datos
  procedimientoEdit = signal<IProcedimiento>(emptyProcedimiento)
  nuevoProcedimiento = signal<boolean>(true); // Indica si es una nueva configuración o una existente

  procedimientoId = signal('')

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
    titulo: 'Crear procedimiento',
    visible: false,
  });

  buscador = signal('');

  constructor(private toastr: ToastrService) { }

  ngOnInit() {

    this.procedimientoList.set([]); // Limpiamos la lista antes de cargar nuevos datos
    this.fetchData();
  }

  ngAfterViewInit() {
    this.modalUpsertInstance = new Modal(this.modalElementRef.nativeElement);
    this.modalDeleteInstance = new Modal(this.modalDeleteElementRef.nativeElement);
  }

  async fetchData() {
    if (this.isLoading()) return;
    this.isLoading.set(true);
    let resp = await this.procedimientoService.getProcedimientos({ page: this.pagination().page, limit: this.pagination().pageSize, search: this.buscador() });
    if (resp) {
      let { procedimientos, metadata } = resp.data;
      console.log("🚀 ~ ProcedimientoComponent ~ fetchData ~ procedimientos:", procedimientos)
      this.procedimientoList.set(procedimientos);
      this.metadata.set(metadata);
      this.pagination.set({
        page: metadata.page,
        pageSize: metadata.limit,
        totalItems: metadata.total
      });
    }
    this.isLoading.set(false);
  }

  async deleteProcedimiento(procedimiento: IProcedimiento) {
    let resp = await this.procedimientoService.deleteProcedimiento(procedimiento);
    if (resp?.success) {
      this.fetchData();
      if (this.modalDeleteInstance) {
        this.modalDeleteInstance.hide();
      }
    }
  }

  changeActive(procedimiento: IProcedimiento, checked: boolean) {
    procedimiento.activo = checked;
    this.updateProcedimiento(procedimiento);
  }

  async createProcedimiento(procedimiento: IProcedimiento) {
    let resp = await this.procedimientoService.createProcedimiento(procedimiento);
    if (resp?.success) {
      this.fetchData()
      this.closeModal();
      this.procedimientoEdit.set(emptyProcedimiento);
      this.nuevoProcedimiento.set(true); // Reseteamos el estado de nueva configuración
    }
  }

  async updateProcedimiento(procedimiento: IProcedimiento, eliminarPlantilla: boolean = false) {
    let resp = await this.procedimientoService.updateProcedimiento(procedimiento);
    if (resp?.success) {
      // this.configList.set([]); // Limpiamos la lista antes de cargar nuevos datos
      this.fetchData()
      this.closeModal();
    }
  }

  onChangePage(newPagination: IPagination) {
    this.procedimientoList.set([]); // Limpiamos la lista antes de cargar nuevos datos
    this.pagination.set(newPagination);
    this.fetchData();
  }

  async upsertProcedimiento(procedimiento: IProcedimiento) {
    if (!procedimiento.procedimientoId) {
      this.createProcedimiento(procedimiento);
    } else {
      this.updateProcedimiento(procedimiento);
    }
  }

  openModal(nuevo: boolean = true, procedimiento: IProcedimiento = emptyProcedimiento) {
    this.nuevoProcedimiento.set(nuevo);

    if (this.nuevoProcedimiento()) {
      this.procedimientoEdit.set(emptyProcedimiento)
    } else {
      this.procedimientoEdit.set(procedimiento);
    }
    this.formKey.set(Date.now()); // esto obliga al componente hijo a resetear
    this.modal.set({ titulo: nuevo ? 'Crear Procedimiento' : 'Actualizar Procedimiento', visible: true });
    if (!this.modalUpsertInstance) {
      this.modalUpsertInstance = new Modal(this.modalElementRef.nativeElement);
    }
    this.modalUpsertInstance.show();
  }

  closeModal() {
    if (this.modalUpsertInstance) {
      this.modalUpsertInstance.hide();
    }
    if (this.modalDeleteInstance) {
      this.modalDeleteInstance.hide();
    }
  }

  openDeleteModal(procedimiento: IProcedimiento) {
    this.procedimientoEdit.set(procedimiento);
    this.modal.set({
      titulo: procedimiento.procedimientoId ? 'Actualizar Procedimiento' : 'Crear Procedimiento',
      visible: true,
    });
    if (!this.modalDeleteInstance) {
      this.modalDeleteInstance = new Modal(this.modalDeleteElementRef.nativeElement);
    }
    this.modalDeleteInstance.show();
  }


}
