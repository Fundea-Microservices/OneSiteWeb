import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, inject, input, signal, ViewChild } from '@angular/core';
import { PaginationAllComponent } from '../../../shared/components/pagination-all/pagination-all';
import { IParametro } from '../../../../interfaces/reportes/parametro';
import { Modal } from 'bootstrap';
import { DatePipe } from '@angular/common';
import { UpsertParametroComponent } from '../../components/upsert-parametro/upsert-parametro.component';
import { ParametroService } from '../../../../services/reportes/parametro.service';

@Component({
  selector: 'app-reporte-parametros',
  imports: [PaginationAllComponent, DatePipe, UpsertParametroComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './reporte-parametros.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ReporteParametrosComponent {

  parametroService = inject(ParametroService);
  parametrosList = signal<IParametro[]>([]);
  metadata = signal({});
  pagination = signal<IPagination>({ page: 1, pageSize: 10, totalItems: 0 });
  isLoading = signal(false);
  formKey = signal(Date.now());
  modal = signal({ titulo: 'Crear parámetro', visible: false });

  parametroEdit = signal<IParametro>({} as IParametro);
  nuevoParametro = signal<boolean>(true);

  buscador = signal('');
  reporteId = input.required<string>();

  @ViewChild('upsertModal') modalElementRef!: ElementRef;
  private modalUpsertInstance!: bootstrap.Modal;

  @ViewChild('deleteModal') modalDeleteElementRef!: ElementRef;
  private modalDeleteInstance!: bootstrap.Modal;

  ngOnInit() {
    this.parametrosList.set([]);
    this.fetchData();
  }

  async fetchData() {
    if (this.isLoading()) return;
    this.isLoading.set(true);
    let resp = await this.parametroService.getParametros({
      page: this.pagination().page,
      limit: this.pagination().pageSize,
      search: this.buscador(),
      parentId: this.reporteId()
    });
    if (resp) {
      const { parametros, metadata } = resp.data;
      this.parametrosList.set(parametros);
      this.metadata.set(metadata);
      this.pagination.set({ page: metadata.page, pageSize: metadata.limit, totalItems: metadata.total });
    }
    this.isLoading.set(false);
  }

  ngAfterViewInit() {
    this.modalUpsertInstance = new Modal(this.modalElementRef.nativeElement);
    this.modalDeleteInstance = new Modal(this.modalDeleteElementRef.nativeElement);
  }

  async createParametro(parametro: IParametro) {
    const resp = await this.parametroService.createParametro(parametro);
    if (resp?.success) {
      this.fetchData();
      this.closeModal();
      this.parametroEdit.set({} as IParametro);
      this.nuevoParametro.set(true);
    }
  }

  async updateParametro(parametro: IParametro) {
    const resp = await this.parametroService.updateParametro(parametro);
    if (resp?.success) {
      this.fetchData();
      this.closeModal();
    }
  }

  async upsertParametro(parametro: IParametro) {
    if (!parametro.parametroId) this.createParametro(parametro);
    else this.updateParametro(parametro);
  }

  openModal(nuevo: boolean = true, parametro: IParametro = {} as IParametro) {
    this.nuevoParametro.set(nuevo);
    this.parametroEdit.set(nuevo ? {} as IParametro : parametro);
    this.formKey.set(Date.now());
    this.modal.set({ titulo: nuevo ? 'Crear Parámetro' : 'Actualizar Parámetro', visible: true });
    if (!this.modalUpsertInstance) this.modalUpsertInstance = new Modal(this.modalElementRef.nativeElement);
    this.modalUpsertInstance.show();
  }

  closeModal() {
    if (this.modalUpsertInstance) this.modalUpsertInstance.hide();
  }

  openDeleteModal(parametro: IParametro) {
    this.parametroEdit.set(parametro);
    if (!this.modalDeleteInstance) this.modalDeleteInstance = new Modal(this.modalDeleteElementRef.nativeElement);
    this.modalDeleteInstance.show();
  }

  async deleteParametro(parametro: IParametro) {
    const resp = await this.parametroService.deleteParametro(parametro);
    if (resp?.success) {
      this.fetchData();
      if (this.modalDeleteInstance) this.modalDeleteInstance.hide();
    }
  }

  onChangePage(newPagination: IPagination) {
    this.parametrosList.set([]);
    this.pagination.set(newPagination);
    this.fetchData();
  }

  changeObligatorio(parametro: IParametro, checked: boolean) {
    parametro.obligatorio = checked;
    this.updateParametro(parametro);
  }
}
