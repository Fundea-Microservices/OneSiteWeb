import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, inject, input, signal, ViewChild } from '@angular/core';
import { PaginationAllComponent } from '../../../shared/components/pagination-all/pagination-all';
import { Modal } from 'bootstrap';
import { DatePipe } from '@angular/common';
import { UpsertReglaComponent } from '../../components/upsert-regla/upsert-regla.component';
import { IRegla } from '../../../../interfaces/reportes/regla-ejecucion';
import { ReglaEjecucionService } from '../../../../services/reportes/regla-ejecucion.service';

@Component({
  selector: 'app-reglas-ejecucion',
  imports: [PaginationAllComponent, DatePipe, UpsertReglaComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './reglas-ejecucion.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ReglasEjecucionComponent {

  reglaService = inject(ReglaEjecucionService);
  reglasList = signal<IRegla[]>([]);
  metadata = signal({});
  pagination = signal<IPagination>({ page: 1, pageSize: 10, totalItems: 0 });
  isLoading = signal(false);
  formKey = signal(Date.now());
  modal = signal({ titulo: 'Crear regla', visible: false });

  reglaEdit = signal<IRegla>({} as IRegla);
  nuevaRegla = signal<boolean>(true);

  buscador = signal('');
  reporteId = input.required<string>();

  @ViewChild('upsertModal') modalElementRef!: ElementRef;
  private modalUpsertInstance!: bootstrap.Modal;

  @ViewChild('deleteModal') modalDeleteElementRef!: ElementRef;
  private modalDeleteInstance!: bootstrap.Modal;

  ngOnInit() {
    this.reglasList.set([]);
    this.fetchData();
  }

  async fetchData() {
    if (this.isLoading()) return;
    this.isLoading.set(true);
    let resp = await this.reglaService.getReglas({
      page: this.pagination().page,
      limit: this.pagination().pageSize,
      search: this.buscador(),
      parentId: this.reporteId()
    });
    if (resp) {
      const { reglas, metadata } = resp.data;
      this.reglasList.set(reglas);
      this.metadata.set(metadata);
      this.pagination.set({ page: metadata.page, pageSize: metadata.limit, totalItems: metadata.total });
    }
    this.isLoading.set(false);
  }

  ngAfterViewInit() {
    this.modalUpsertInstance = new Modal(this.modalElementRef.nativeElement);
    this.modalDeleteInstance = new Modal(this.modalDeleteElementRef.nativeElement);
  }

  async createRegla(regla: IRegla) {
    const resp = await this.reglaService.createRegla(regla);
    if (resp?.success) {
      this.fetchData();
      this.closeModal();
      this.reglaEdit.set({} as IRegla);
      this.nuevaRegla.set(true);
    }
  }

  async updateRegla(regla: IRegla) {
    const resp = await this.reglaService.updateRegla(regla);
    if (resp?.success) {
      this.fetchData();
      this.closeModal();
    }
  }

  async upsertRegla(regla: IRegla) {
    if (!regla.reglaId) this.createRegla(regla);
    else this.updateRegla(regla);
  }

  openModal(nuevo: boolean = true, regla: IRegla = {} as IRegla) {
    this.nuevaRegla.set(nuevo);
    this.reglaEdit.set(nuevo ? {} as IRegla : regla);
    this.formKey.set(Date.now());
    this.modal.set({ titulo: nuevo ? 'Crear Regla' : 'Actualizar Regla', visible: true });
    if (!this.modalUpsertInstance) this.modalUpsertInstance = new Modal(this.modalElementRef.nativeElement);
    this.modalUpsertInstance.show();
  }

  closeModal() {
    if (this.modalUpsertInstance) this.modalUpsertInstance.hide();
  }

  openDeleteModal(regla: IRegla) {
    this.reglaEdit.set(regla);
    if (!this.modalDeleteInstance) this.modalDeleteInstance = new Modal(this.modalDeleteElementRef.nativeElement);
    this.modalDeleteInstance.show();
  }

  async deleteRegla(regla: IRegla) {
    const resp = await this.reglaService.deleteRegla(regla);
    if (resp?.success) {
      this.fetchData();
      if (this.modalDeleteInstance) this.modalDeleteInstance.hide();
    }
  }

  onChangePage(newPagination: IPagination) {
    this.reglasList.set([]);
    this.pagination.set(newPagination);
    this.fetchData();
  }

  changeActive(regla: IRegla, checked: boolean) {
    regla.active = checked;
    this.updateRegla(regla);
  }
}
