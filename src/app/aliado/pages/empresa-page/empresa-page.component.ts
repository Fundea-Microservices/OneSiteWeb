import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, inject, signal, ViewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IEmpresaAliado } from '../../../../interfaces/aliado/empresa';
import { EmpresaAliadoService } from '../../../../services/aliado/empresa.service';
import { Modal } from 'bootstrap';
import { DatePipe } from '@angular/common';
import { PaginationComponent } from '../../../shared/components/pagination/pagination';
import { UpsertEmpresaComponent } from '../../components/empresa/upsert-empresa/upsert-empresa.component';

const emptyEmpresa: IEmpresaAliado = {
  empresaId: '',
  name: '',
  description: '',
  pathImg: null,
  address: '',
  latitud: null,
  longitud: null,
  phone: '',
  phone2: null,
  email: '',
  active: true,
  created_at: new Date(),
  updated_at: null,
  deleted_at: null,
}

@Component({
  selector: 'app-empresa-page',
  imports: [RouterLink, DatePipe, PaginationComponent, UpsertEmpresaComponent],
  templateUrl: './empresa-page.component.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class EmpresaPageComponent {

  empresaService = inject(EmpresaAliadoService);
  empresasList = signal<IEmpresaAliado[]>([]);
  metadata = signal({})// Cambia el tipo según tu modelo de datos
  nuevoEmpresa = signal(true)
  empresaEdit = signal<IEmpresaAliado>(emptyEmpresa)

  pagination = signal<IPagination>({
    page: 1,
    pageSize: 10,
    totalItems: 0
  })
  isLoading = signal(false);
  formKey = signal(Date.now());

  @ViewChild('upsertModal') modalElementRef!: ElementRef;
  private modalUpsertInstance!: bootstrap.Modal;

  @ViewChild('deleteModal') modalDeleteElementRef!: ElementRef;
  private modalDeleteInstance!: bootstrap.Modal;

  modal = signal({
    titulo: 'Crear Rol',
    visible: false,
  });

  buscador = signal('');

  constructor() { }

  ngOnInit() {

    this.empresasList.set([]); // Limpiamos la lista antes de cargar nuevos datos
    this.fetchData();
  }

  ngAfterViewInit() {
    this.modalUpsertInstance = new Modal(this.modalElementRef.nativeElement);
    this.modalDeleteInstance = new Modal(this.modalDeleteElementRef.nativeElement);
  }

  async fetchData() {
    if (this.isLoading()) return;
    this.isLoading.set(true);
    let resp = await this.empresaService.getEmpresas({ page: this.pagination().page, limit: this.pagination().pageSize, search: this.buscador() });
    if (resp) {
      let { empresas, metadata } = resp.data;
      this.empresasList.set(empresas);
      this.metadata.set(metadata);
      this.pagination.set({
        page: metadata.page,
        pageSize: metadata.limit,
        totalItems: metadata.total
      });
    }
    this.isLoading.set(false);
  }

  async deleteEmpresa(empresa: IEmpresaAliado) {
    let resp = await this.empresaService.deleteEmpresa(empresa);
    if (resp?.success) {
      this.fetchData();
      if (this.modalDeleteInstance) {
        this.modalDeleteInstance.hide();
      }
    }
  }

  changeActive(empresa: IEmpresaAliado, checked: boolean) {
    empresa.active = checked;
    this.updateEmpresa(empresa);
  }

  async createEmpresa(empresa: IEmpresaAliado) {
    let resp = await this.empresaService.createEmpresa(empresa)
    if (resp?.success) {
      this.fetchData()
      this.closeModal();
      this.empresaEdit.set(emptyEmpresa);
      this.nuevoEmpresa.set(true); // Reseteamos el estado de nuevo empresa
    }
  }

  async updateEmpresa(empresa: IEmpresaAliado) {
    let resp = await this.empresaService.updateEmpresa(empresa)
    if (resp?.success) {
      this.fetchData()
      this.closeModal();
    }
  }

  onChangePage(newPagination: IPagination) {
    this.empresasList.set([]); // Limpiamos la lista antes de cargar nuevos datos
    this.pagination.set(newPagination);
    this.fetchData();
  }

  async upsertEmpresa(empresa: IEmpresaAliado) {
    if (!empresa.empresaId) {
      this.createEmpresa(empresa);
    } else {
      this.updateEmpresa(empresa);
    }
  }

  openModal(nuevo: boolean = true, empresa: IEmpresaAliado = emptyEmpresa) {
    this.nuevoEmpresa.set(nuevo);

    if (this.nuevoEmpresa()) {
      this.empresaEdit.set(emptyEmpresa)
    } else {
      this.empresaEdit.set(empresa);
    }
    this.formKey.set(Date.now()); // esto obliga al componente hijo a resetear
    this.modal.set({ titulo: nuevo ? 'Crear Empresa' : 'Actualizar Empresa', visible: true });
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

  openDeleteModal(empresa: IEmpresaAliado) {
    this.empresaEdit.set(empresa);
    this.modal.set({
      titulo: empresa.empresaId ? 'Actualizar Empresa' : 'Crear Empresa',
      visible: true,
    });
    if (!this.modalDeleteInstance) {
      this.modalDeleteInstance = new Modal(this.modalDeleteElementRef.nativeElement);
    }
    this.modalDeleteInstance.show();
  }


}
