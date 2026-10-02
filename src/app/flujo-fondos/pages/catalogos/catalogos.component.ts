import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, inject, signal, ViewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Modal } from 'bootstrap';
import { ICatalogo, ICatalogoCreate, ICatalogoUpdate } from '../../../../interfaces/catalogo';
import { CatalogoService } from '../../../../services/flujo-fondos/catalogo.service';
import { PaginationComponent } from '../../../shared/components/pagination/pagination';
import { UpsertCatalogoComponent } from '../../components/catalogo/upsert-catalogo/upsert-catalogo';
import { ImportarCatalogosComponent } from '../../components/catalogo/importar-catalogos/importar-catalogos';
import { DescargarPlantillaComponent } from '../../../shared/components/descargar-plantilla/descargar-plantilla';

@Component({
  selector: 'app-catalogos',
  imports: [RouterLink, PaginationComponent, UpsertCatalogoComponent, ImportarCatalogosComponent, DescargarPlantillaComponent],
  templateUrl: './catalogos.component.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class CatalogosComponent {

  catalogoService = inject(CatalogoService);
  router = inject(Router);
  catalogosList = signal<ICatalogo[]>([]);
  nuevoCatalogo = signal(true);
  catalogoEdit = signal<ICatalogo | null>(null);

  pagination = signal<IPagination>({
    page: 1,
    pageSize: 10,
    totalItems: 0
  });
  isLoading = signal(false);
  formKey = signal(Date.now());

  @ViewChild('upsertCatalogoModal') modalElementRef!: ElementRef;
  private modalUpsertInstance!: bootstrap.Modal;

  @ViewChild('desactivarCatalogoModal') modalDesactivarElementRef!: ElementRef;
  private modalDesactivarInstance!: bootstrap.Modal;

  modal = signal({
    titulo: 'Crear Catálogo',
    visible: false,
  });

  buscador = signal('');
  // '' = todos, 'true' = activos, 'false' = inactivos
  activoFilter = signal<'' | 'true' | 'false'>('');

  ngOnInit() {
    this.catalogosList.set([]);
    this.fetchData();
  }

  ngAfterViewInit() {
    this.modalUpsertInstance = new Modal(this.modalElementRef.nativeElement);
    this.modalDesactivarInstance = new Modal(this.modalDesactivarElementRef.nativeElement);
  }

  async fetchData() {
    if (this.isLoading()) return;
    this.isLoading.set(true);
    const activo = this.activoFilter();
    let resp = await this.catalogoService.getCatalogos({
      page: this.pagination().page,
      limit: this.pagination().pageSize,
      search: this.buscador().trim(),
      // Sin `active` no se filtra; `active=false` ahora sí devuelve solo inactivos
      active: activo === '' ? undefined : activo === 'true',
    });
    if (resp) {
      let { catalogos, metadata } = resp.data;
      this.catalogosList.set(catalogos);
      this.pagination.set({
        page: metadata.page,
        pageSize: metadata.limit,
        totalItems: metadata.total
      });
    }
    this.isLoading.set(false);
  }

  buscar() {
    this.pagination.update(p => ({ ...p, page: 1 }));
    this.fetchData();
  }

  async desactivarCatalogo(catalogo: ICatalogo) {
    let resp = await this.catalogoService.desactivarCatalogo(catalogo.id);
    if (resp?.success) {
      this.fetchData();
      this.modalDesactivarInstance?.hide();
    }
  }

  async changeActivo(catalogo: ICatalogo, cbx: HTMLInputElement) {
    const checked = cbx.checked;
    let resp = await this.catalogoService.updateCatalogo({ id: catalogo.id, activo: checked });
    if (resp?.success) {
      this.catalogosList.update(list => list.map(c => c.id === catalogo.id ? { ...c, activo: checked } : c));
    } else {
      // Revertir el switch si el backend rechazó el cambio
      cbx.checked = !checked;
    }
  }

  async createCatalogo(catalogo: ICatalogoCreate) {
    let resp = await this.catalogoService.createCatalogo(catalogo);
    if (resp?.success) {
      this.fetchData();
      this.closeModal();
    }
  }

  async updateCatalogo(catalogo: ICatalogoUpdate) {
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

  openModal(nuevo: boolean = true, catalogo: ICatalogo | null = null) {
    this.nuevoCatalogo.set(nuevo);
    this.catalogoEdit.set(nuevo ? null : catalogo);

    this.formKey.set(Date.now());
    this.modal.set({
      titulo: nuevo ? 'Crear Catálogo' : 'Actualizar Catálogo',
      visible: true,
    });

    if (!this.modalUpsertInstance) {
      this.modalUpsertInstance = new Modal(this.modalElementRef.nativeElement);
    }
    this.modalUpsertInstance.show();
  }

  closeModal() {
    this.modalUpsertInstance?.hide();
  }

  openDesactivarModal(catalogo: ICatalogo) {
    this.catalogoEdit.set(catalogo);
    if (!this.modalDesactivarInstance) {
      this.modalDesactivarInstance = new Modal(this.modalDesactivarElementRef.nativeElement);
    }
    this.modalDesactivarInstance.show();
  }

  verOpciones(catalogo: ICatalogo) {
    this.router.navigate(['/flujo-fondos/catalogos', catalogo.id, 'opciones']);
  }

  onSave(catalogo: ICatalogoCreate | ICatalogoUpdate) {
    if ('id' in catalogo) {
      this.updateCatalogo(catalogo);
    } else {
      this.createCatalogo(catalogo);
    }
  }
}
