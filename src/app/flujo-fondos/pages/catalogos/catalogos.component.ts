import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, inject, signal, ViewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Modal } from 'bootstrap';
import { ICatalogo } from '../../../../interfaces/catalogo';
import { CatalogoService } from '../../../../services/flujo-fondos/catalogo.service';
import { PaginationComponent } from '../../../shared/components/pagination/pagination';
import { UpsertCatalogoComponent } from '../../components/catalogo/upsert-catalogo/upsert-catalogo';

const emptyCatalogo: ICatalogo = {
  catalogoId: '',
  codigo: 0,
  codigoExterno: 0,
  descripcion: '',
  estado: true,
  tipo: '',
  created_at: new Date(),
}

@Component({
  selector: 'app-catalogos',
  imports: [RouterLink, PaginationComponent, UpsertCatalogoComponent],
  templateUrl: './catalogos.component.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class CatalogosComponent {

  catalogoService = inject(CatalogoService);
  catalogosList = signal<ICatalogo[]>([]);
  metadata = signal({});
  nuevoCatalogo = signal(true);
  catalogoEdit = signal<ICatalogo>(emptyCatalogo);

  pagination = signal<IPagination>({
    page: 1,
    pageSize: 10,
    totalItems: 0
  });
  isLoading = signal(false);
  formKey = signal(Date.now());

  @ViewChild('upsertCatalogoModal') modalElementRef!: ElementRef;
  private modalUpsertInstance!: bootstrap.Modal;

  @ViewChild('deleteCatalogoModal') modalDeleteElementRef!: ElementRef;
  private modalDeleteInstance!: bootstrap.Modal;

  modal = signal({
    titulo: 'Crear Catálogo',
    visible: false,
  });

  buscador = signal('');
  tipoFilter = signal('');

  constructor() { }

  ngOnInit() {
    this.catalogosList.set([]);
    this.fetchData();
  }

  ngAfterViewInit() {
    this.modalUpsertInstance = new Modal(this.modalElementRef.nativeElement);
    this.modalDeleteInstance = new Modal(this.modalDeleteElementRef.nativeElement);
  }

  async fetchData() {
    if (this.isLoading()) return;
    this.isLoading.set(true);
    let params: any = {
      page: this.pagination().page,
      limit: this.pagination().pageSize,
      search: this.buscador()
    }
    if (this.tipoFilter()) {
      params.search = this.tipoFilter();
    }
    let resp = await this.catalogoService.getCatalogos(params);
    if (resp) {
      let { catalogos, metadata } = resp.data;
      this.catalogosList.set(catalogos);
      this.metadata.set(metadata);
      this.pagination.set({
        page: metadata.page,
        pageSize: metadata.limit,
        totalItems: metadata.total
      });
    }
    this.isLoading.set(false);
  }

  async deleteCatalogo(catalogo: ICatalogo) {
    let resp = await this.catalogoService.deleteCatalogo(catalogo);
    if (resp?.success) {
      this.fetchData();
      if (this.modalDeleteInstance) {
        this.modalDeleteInstance.hide();
      }
    }
  }

  changeEstado(catalogo: ICatalogo, checked: boolean) {
    catalogo.estado = checked;
    this.updateCatalogo(catalogo);
  }

  async createCatalogo(catalogo: ICatalogo) {
    let resp = await this.catalogoService.createCatalogo(catalogo);
    if (resp?.success) {
      this.fetchData();
      this.closeModal();
      this.catalogoEdit.set(emptyCatalogo);
      this.nuevoCatalogo.set(true);
    }
  }

  async updateCatalogo(catalogo: ICatalogo) {
    let resp = await this.catalogoService.updateCatalogo(catalogo);
    if (resp?.success) {
      this.fetchData();
      this.closeModal();
    }
  }

  onChangePage(newPagination: IPagination) {
    this.catalogosList.set([]);
    this.pagination.set(newPagination);
    this.fetchData();
  }

  openModal(nuevo: boolean = true, catalogo: ICatalogo = emptyCatalogo) {
    this.nuevoCatalogo.set(nuevo);
    if (this.nuevoCatalogo()) {
      this.catalogoEdit.set(emptyCatalogo);
    } else {
      this.catalogoEdit.set(catalogo);
    }

    this.formKey.set(Date.now());
    this.modal.set({
      titulo: catalogo.catalogoId ? 'Actualizar Catálogo' : 'Crear Catálogo',
      visible: true,
    });

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

  openDeleteModal(catalogo: ICatalogo) {
    this.catalogoEdit.set(catalogo);
    if (!this.modalDeleteInstance) {
      this.modalDeleteInstance = new Modal(this.modalDeleteElementRef.nativeElement);
    }
    this.modalDeleteInstance.show();
  }

  onSave(catalogo: ICatalogo) {
    if (!catalogo.catalogoId) {
      this.createCatalogo(catalogo);
    } else {
      this.updateCatalogo(catalogo);
    }
  }
}
