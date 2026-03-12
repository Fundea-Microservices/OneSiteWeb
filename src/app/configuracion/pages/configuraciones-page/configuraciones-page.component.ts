import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, inject, signal, ViewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PaginationComponent } from '../../../shared/components/pagination/pagination';
import { DatePipe } from '@angular/common';
import { Modal } from 'bootstrap';
import { IConfiguracion } from '../../../../interfaces/configuracion';
import { ConfiguracionService } from '../../../../services/config/configuracion.service';
import { UpsertAccesoComponent } from "../../components/acceso/upsert-acceso/upsert-acceso.component";
import { UpsertConfigComponent } from "../../components/configuraciones/upsert-config/upsert-config.component";

const emptyConfiguracion: IConfiguracion = {
    configId: '',
    key: '',
    value: '',
    description: '',
    type: '',
    active: true,
  }

@Component({
  selector: 'app-configuraciones-page',
  imports: [RouterLink, PaginationComponent, DatePipe, UpsertConfigComponent],
  templateUrl: './configuraciones-page.component.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ConfiguracionesPageComponent {
  configService = inject(ConfiguracionService);
  configList = signal<IConfiguracion[]>([]);
  metadata = signal({})// Cambia el tipo según tu modelo de datos
  configuracionEdit = signal<IConfiguracion>(emptyConfiguracion)
  nuevaConfiguracion = signal<boolean>(true); // Indica si es una nueva configuración o una existente

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
    titulo: 'Crear Configuración',
    visible: false,
  });

  buscador = signal('');

  constructor() { }

  ngOnInit() {

    this.configList.set([]); // Limpiamos la lista antes de cargar nuevos datos
    this.fetchData();
  }

  ngAfterViewInit() {
    this.modalUpsertInstance = new Modal(this.modalElementRef.nativeElement);
    this.modalDeleteInstance = new Modal(this.modalDeleteElementRef.nativeElement);
  }

  async fetchData() {
    if (this.isLoading()) return;
    this.isLoading.set(true);
    let resp = await this.configService.getConfiguraciones({ page: this.pagination().page, limit: this.pagination().pageSize, search: this.buscador() });
    if (resp) {
      let { configuraciones, metadata } = resp.data;
      this.configList.set(configuraciones);
      this.metadata.set(metadata);
      this.pagination.set({
        page: metadata.page,
        pageSize: metadata.limit,
        totalItems: metadata.total
      });
    }
    this.isLoading.set(false);
  }

  async deleteConfiguracion(config: IConfiguracion) {
    let resp = await this.configService.deleteConfiguracion(config);
    if (resp?.success) {
      this.fetchData();
      if (this.modalDeleteInstance) {
        this.modalDeleteInstance.hide();
      }
    }
  }

  changeActive(config: IConfiguracion, checked: boolean) {
    config.active = checked;
    this.updateConfiguracion(config);
  }

  async createConfiguracion(config: IConfiguracion) {
    let resp = await this.configService.createConfiguracion(config);
    if (resp?.success) {
      this.fetchData()
      this.closeModal();
      this.configuracionEdit.set(emptyConfiguracion);
      this.nuevaConfiguracion.set(true); // Reseteamos el estado de nueva configuración
    }
  }

  async updateConfiguracion(config: IConfiguracion) {
    let resp = await this.configService.updateConfiguracion(config);
    if (resp?.success) {
      // this.configList.set([]); // Limpiamos la lista antes de cargar nuevos datos
      this.fetchData()
      this.closeModal();
    }
  }

  onChangePage(newPagination: IPagination) {
    this.configList.set([]); // Limpiamos la lista antes de cargar nuevos datos
    this.pagination.set(newPagination);
    this.fetchData();
  }

  async upsertConfiguracion(config: IConfiguracion) {
    if (!config.configId) {
      this.createConfiguracion(config);
    } else {
      this.updateConfiguracion(config);
    }
  }

  openModal(nuevo: boolean = true, configuracion: IConfiguracion = emptyConfiguracion) {
    this.nuevaConfiguracion.set(nuevo);

    if (this.nuevaConfiguracion()) {
      this.configuracionEdit.set(emptyConfiguracion)
    } else {
      this.configuracionEdit.set(configuracion);
    }
    this.formKey.set(Date.now()); // esto obliga al componente hijo a resetear
    this.modal.set({ titulo: nuevo ? 'Crear Configuración' : 'Actualizar Configuración', visible: true });
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

  openDeleteModal(configuracion: IConfiguracion) {
    this.configuracionEdit.set(configuracion);
    this.modal.set({
      titulo: configuracion.configId ? 'Actualizar Configuración' : 'Crear Configuración',
      visible: true,
    });
    if (!this.modalDeleteInstance) {
      this.modalDeleteInstance = new Modal(this.modalDeleteElementRef.nativeElement);
    }
    this.modalDeleteInstance.show();
  }
 }
