import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, inject, signal, ViewChild } from '@angular/core';
import { Modal } from 'bootstrap';
import { IReporte } from '../../../../interfaces/reportes/reporte';
import { ReporteService } from '../../../../services/reportes/reporte.service';
import { RouterLink } from '@angular/router';
import { PaginationComponent } from '../../../shared/components/pagination/pagination';
import { PaginationAllComponent } from '../../../shared/components/pagination-all/pagination-all';
import { DatePipe } from '@angular/common';
import { UpsertReporteComponent } from '../../components/upsert-reporte/upsert-reporte.component';
import { UpsertPlantillaComponent } from "../../components/upsert-plantilla/upsert-plantilla.component";
import { StorageService } from '../../../../services/storage.service';
import { MenuService } from '../../../../services/config/menu.service';
import { IMenu } from '../../../../interfaces/auth';
import { ToastrService } from 'ngx-toastr';

const emptyReporte: IReporte = {
  reporteId: '',
  nombre: '',
  descripcion: '',
  rutaPlantilla: '',
  procedimiento: '',
  activo: true,
  exportarCSV: false,
  exportarTabla: false,
  exportarExcel: false,
  exportarPDF: false,
  exportarJSON: false,
  exportarPlantilla: false,
  created_at: new Date()
}

const emptyMenu: IMenu = {
  menuId: '',
  name: '',
  description: '',
  pathApp: '',
  pathWeb: '',
  reporteId: '',
  label: '',
  icon: '',
  color: '',
  main: false,
  active: true,
}

@Component({
  selector: 'app-reporte',
  imports: [RouterLink, PaginationAllComponent, DatePipe, UpsertReporteComponent, UpsertPlantillaComponent],
  templateUrl: './reporte.component.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ReporteComponent {
  reporteService = inject(ReporteService);
  menuService = inject(MenuService);
  storageService = inject(StorageService);
  reporteList = signal<IReporte[]>([]);
  metadata = signal({})// Cambia el tipo según tu modelo de datos
  reporteEdit = signal<IReporte>(emptyReporte)
  nuevoReporte = signal<boolean>(true); // Indica si es una nueva configuración o una existente

  // Para asignar reporte a menu
  nuevaAsignacion = signal<boolean>(true);
  buscadorSubmenu = signal('');
  submenuList = signal<IMenu[]>([]);
  menuEdit = signal<IMenu>(emptyMenu);
  idSubmenuSelected = signal<string>('');
  isLoadingSubmenu = signal(false);

  reporteId = signal('')

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

  @ViewChild('upsertModalPlantilla') modalUpsertPlantillaElementRef!: ElementRef;
  private modalUpsertPlantillaInstance!: bootstrap.Modal;

  @ViewChild('deleteModalPlantilla') modalDeletePlantillaElementRef!: ElementRef;
  private modalDeletePlantillaInstance!: bootstrap.Modal;

  @ViewChild('asignarMenuModal') modalAsignarMenuElementRef!: ElementRef;
  private modalAsignarMenuInstance!: bootstrap.Modal;

  modal = signal({
    titulo: 'Crear reporte',
    visible: false,
  });

  buscador = signal('');

  constructor(private toastr: ToastrService) { }

  ngOnInit() {

    this.reporteList.set([]); // Limpiamos la lista antes de cargar nuevos datos
    this.fetchData();
  }

  ngAfterViewInit() {
    this.modalUpsertInstance = new Modal(this.modalElementRef.nativeElement);
    this.modalDeleteInstance = new Modal(this.modalDeleteElementRef.nativeElement);
    this.modalUpsertPlantillaInstance = new Modal(this.modalUpsertPlantillaElementRef.nativeElement);
    this.modalDeletePlantillaInstance = new Modal(this.modalDeletePlantillaElementRef.nativeElement);
    this.modalAsignarMenuInstance = new Modal(this.modalAsignarMenuElementRef.nativeElement);
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

  async fetchDataSubmenu() {
    if (this.isLoadingSubmenu()) return;
    this.isLoadingSubmenu.set(true);
    let resp = await this.menuService.getSubmenus({ page: 1, limit: 100, search: this.buscadorSubmenu() });
    if (resp) {
      let { menus } = resp.data;
      this.submenuList.set(menus);
    }
    this.isLoadingSubmenu.set(false);
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

  async updateReporte(reporte: IReporte, eliminarPlantilla: boolean = false) {
    if (eliminarPlantilla) reporte.rutaPlantilla = undefined;
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
    if (this.modalDeleteInstance) {
      this.modalDeleteInstance.hide();
    }
    if (this.modalDeletePlantillaInstance) {
      this.modalDeletePlantillaInstance.hide();
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

  openDeleteModalPlantilla(reporte: IReporte) {
    this.reporteEdit.set(reporte);
    this.modal.set({
      titulo: 'Eliminar Plantilla',
      visible: true,
    });
    if (!this.modalDeletePlantillaInstance) {
      this.modalDeletePlantillaInstance = new Modal(this.modalDeletePlantillaElementRef.nativeElement);
    }
    this.modalDeletePlantillaInstance.show();
  }

  openModalPlantilla(reporteId: string) {
    this.formKey.set(Date.now()); // esto obliga al componente hijo a resetear
    this.reporteId.set(reporteId);
    this.modal.set({
      titulo: 'Actualizar Plantilla',
      visible: true,
    });
    this.modalUpsertPlantillaInstance.show();
  }

  closeModalPlantilla() {
    console.log('Cerrando modal de plantilla');
    if (this.modalUpsertPlantillaInstance) {
      this.modalUpsertPlantillaInstance.hide();
    }
  }

  // Actualiza el registro del reporte con la ruta de la plantilla recibida del storage
  async onPlantillaSaved(rutaPlantilla: string) {
    const reporte = this.reporteList().find(r => r.reporteId === this.reporteId());
    if (reporte) {
      await this.updateReporte({ ...reporte, rutaPlantilla });
    }
    this.closeModalPlantilla();
  }

  async descargarPlantilla(reporteId: string) {
    const reporte = this.reporteList().find(r => r.reporteId === reporteId);
    if (!reporte?.rutaPlantilla) {
      this.toastr.error('No hay plantilla disponible para descargar', 'Error');
      return;
    }

    const blob = await this.storageService.downloadFileAsBlob(reporte.rutaPlantilla);
    if (!blob) {
      this.toastr.error('No se pudo descargar la plantilla', 'Error');
      return;
    }

    const nombreArchivo = reporte.rutaPlantilla.split('/').pop() || 'plantilla.xlsx';
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreArchivo;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  openModalAsignarMenu(nuevo: boolean = true, reporte: IReporte = emptyReporte) {
    this.nuevaAsignacion.set(nuevo);
    this.reporteEdit.set(reporte);
    this.idSubmenuSelected.set('');

    if (this.nuevaAsignacion()) {
      this.idSubmenuSelected.set('');
      this.buscadorSubmenu.set('');
      this.submenuList.set([]);
    }

    if (!this.modalAsignarMenuInstance) {
      this.modalAsignarMenuInstance = new Modal(this.modalAsignarMenuElementRef.nativeElement);
    }
    this.modalAsignarMenuInstance.show();
  }

  closeModalAsignarMenu() {
    if (this.modalAsignarMenuInstance) {
      this.modalAsignarMenuInstance.hide();
    }
  }

  async asignarReporteSubmenu() {
    if (this.idSubmenuSelected() == '') {
      this.toastr.warning(`No hay un submenu seleccionado`, 'Advertencia');
      return;
    }

    let submenuSelected = this.submenuList().find(m => m.menuId === this.idSubmenuSelected()) || null;

    if (!submenuSelected) {
      this.toastr.warning(`No hay un submenu seleccionado`, 'Advertencia');
      return;
    }
    this.menuEdit.set({
      menuId: submenuSelected.menuId,
      reporteId: this.reporteEdit().reporteId,
      name: submenuSelected.name,
      description: submenuSelected.description,
      color: submenuSelected.color,
      pathApp: submenuSelected.pathApp,
      pathWeb: submenuSelected.pathWeb,
      active: submenuSelected.active,
      label: submenuSelected.label,
      icon: submenuSelected.icon,
      main: submenuSelected.main
    });

    let resp = await this.menuService.updateMenu(this.menuEdit())
    if (resp?.success) {
      if (this.modalAsignarMenuInstance) {
        this.modalAsignarMenuInstance.hide();
      }
    }
  }

}
