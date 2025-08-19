import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, inject, input, signal, ViewChild } from '@angular/core';
import { PaginationAllComponent } from '../../../shared/components/pagination-all/pagination-all';
import { AtributoService } from '../../../../services/reportes/atributo.service';
import { IAtributo } from '../../../../interfaces/reportes/atributo';
import { Modal } from 'bootstrap';
import { DatePipe } from '@angular/common';
import { UpsertAtributoComponent } from '../../components/upsert-atributo/upsert-atributo.component';
import { CdkDropList, CdkDrag, DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';



@Component({
  selector: 'app-reporte-atributos',
  imports: [PaginationAllComponent, DatePipe, UpsertAtributoComponent, DragDropModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './reporte-atributos.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ReporteAtributosComponent {

  atributoService = inject(AtributoService);
  atributosList = signal<IAtributo[]>([]);
  metadata = signal({});
  pagination = signal<IPagination>({
    page: 1,
    pageSize: 10,
    totalItems: 0
  });
  isLoading = signal(false);
  formKey = signal(Date.now());
  modal = signal({
    titulo: 'Crear atributo',
    visible: false,
  });

  atributoEdit = signal<IAtributo>({} as IAtributo);
  nuevoAtributo = signal<boolean>(true);

  buscador = signal('');
  reporteId = input.required<string>();

  @ViewChild('upsertModal') modalElementRef!: ElementRef;
  private modalUpsertInstance!: bootstrap.Modal;

  @ViewChild('deleteModal') modalDeleteElementRef!: ElementRef;
  private modalDeleteInstance!: bootstrap.Modal;

  ngOnInit() {
    this.atributosList.set([]); // Limpiamos la lista antes de cargar nuevos datos
    this.fetchData();
  }

  async fetchData() {
    if (this.isLoading()) return;
    this.isLoading.set(true);
    let resp = await this.atributoService.getAtributos({ page: this.pagination().page, limit: this.pagination().pageSize, search: this.buscador(), parentId: this.reporteId() });
    if (resp) {
      let { atributos, metadata } = resp.data;
      this.atributosList.set(atributos);
      this.metadata.set(metadata);
      this.pagination.set({
        page: metadata.page,
        pageSize: metadata.limit,
        totalItems: metadata.total
      });
    }
    this.isLoading.set(false);
  }

  ngAfterViewInit() {
    this.modalUpsertInstance = new Modal(this.modalElementRef.nativeElement);
    this.modalDeleteInstance = new Modal(this.modalDeleteElementRef.nativeElement);
  }

  changeActive(atributo: IAtributo, checked: boolean) {
    atributo.visible = checked;
    this.updateAtributo(atributo);
  }

  async createAtributo(atributo: IAtributo) {
    let resp = await this.atributoService.createAtributo(atributo);
    if (resp?.success) {
      this.fetchData()
      this.closeModal();
      this.atributoEdit.set({} as IAtributo);
      this.nuevoAtributo.set(true); // Reseteamos el estado de nueva configuración
    }
  }

  async updateAtributo(atributo: IAtributo) {
    let resp = await this.atributoService.updateAtributo(atributo);
    if (resp?.success) {
      // this.configList.set([]); // Limpiamos la lista antes de cargar nuevos datos
      this.fetchData()
      this.closeModal();
    }
  }

  onChangePage(newPagination: IPagination) {
    this.atributosList.set([]); // Limpiamos la lista antes de cargar nuevos datos
    this.pagination.set(newPagination);
    this.fetchData();
  }

  async upsertAtributo(atributo: IAtributo) {
    if (!atributo.atributoId) {
      this.createAtributo(atributo);
    } else {
      this.updateAtributo(atributo);
    }
  }

  openModal(nuevo: boolean = true, atributo: IAtributo = {} as IAtributo) {
    this.nuevoAtributo.set(nuevo);

    if (this.nuevoAtributo()) {
      this.atributoEdit.set({} as IAtributo)
    } else {
      this.atributoEdit.set(atributo);
    }
    this.formKey.set(Date.now()); // esto obliga al componente hijo a resetear
    this.modal.set({ titulo: nuevo ? 'Crear Atributo' : 'Actualizar Atributo', visible: true });
    if (!this.modalUpsertInstance) {
      this.modalUpsertInstance = new Modal(this.modalElementRef.nativeElement);
    }
    this.modalUpsertInstance.show();
  }

  closeModal() {
    this.modalUpsertInstance.hide();
  }

  openDeleteModal(atributo: IAtributo) {
    this.atributoEdit.set(atributo);
    this.modal.set({
      titulo: atributo.atributoId ? 'Actualizar Atributo' : 'Crear Atributo',
      visible: true,
    });
    if (!this.modalDeleteInstance) {
      this.modalDeleteInstance = new Modal(this.modalDeleteElementRef.nativeElement);
    }
    this.modalDeleteInstance.show();
  }

  async deleteAtributo(atributo: IAtributo) {
    let resp = await this.atributoService.deleteAtributo(atributo);
    if (resp?.success) {
      this.fetchData();
      if (this.modalDeleteInstance) {
        this.modalDeleteInstance.hide();
      }
    }
  }

  async drop(event: CdkDragDrop<IAtributo[]>) {
    const items = [...this.atributosList()];

    // Reordenar en el array local
    moveItemInArray(items, event.previousIndex, event.currentIndex);

    // Reasignar el orden según la nueva posición
    const nuevosOrdenes = items.map((item, index) => ({
      atributoId: item.atributoId || '',
      orden: (index + 1) + ((this.pagination().page - 1) * this.pagination().pageSize)
    }));

    // Llamar al API para actualizar en backend
    let resp = await this.atributoService.reordenarAtributos(nuevosOrdenes)
    if (resp?.success) {
      // Si falla, revertir lista
      //this.atributosList.set([]);
      this.fetchData();
    }
  }

}
