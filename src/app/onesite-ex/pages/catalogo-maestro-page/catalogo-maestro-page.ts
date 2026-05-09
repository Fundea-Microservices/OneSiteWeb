import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  inject,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Modal } from 'bootstrap';
import { PaginationComponent } from '../../../shared/components/pagination/pagination';
import { CatalogoService } from '../../../../services/config/catalogo-maestro.service';
import { ICatalogo } from '../../../../interfaces/catalogo-maestro/catalogo-maestro';
import { UpsertCatalogoMaestroComponent } from '../../components/upsert-catalogo-maestro/upsert-catalogo-maestro.component';

const emptyCatalogo: ICatalogo = {
  id: '',
  nombre: '',
  codigo: '',
  activo: true,
};

@Component({
  selector: 'app-catalogo-maestro-page',
  imports: [RouterLink, PaginationComponent, UpsertCatalogoMaestroComponent],
  templateUrl: './catalogo-maestro-page.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class CatalogoMaestroPage implements OnInit, AfterViewInit {
  private catalogoService = inject(CatalogoService);
  private router = inject(Router);

  catalogoList = signal<ICatalogo[]>([]);
  catalogoEdit = signal<ICatalogo>(emptyCatalogo);
  nuevo = signal<boolean>(true);
  formKey = signal(Date.now());

  pagination = signal<IPagination>({ page: 1, pageSize: 10, totalItems: 0 });
  isLoading = signal(false);
  buscador = signal('');

  modal = signal({ titulo: 'Crear catálogo' });

  @ViewChild('upsertModal') modalElementRef!: ElementRef;
  private modalUpsertInstance!: Modal;

  @ViewChild('deleteModal') modalDeleteElementRef!: ElementRef;
  private modalDeleteInstance!: Modal;

  ngOnInit() {
    this.fetchData();
  }

  ngAfterViewInit() {
    this.modalUpsertInstance = new Modal(this.modalElementRef.nativeElement);
    this.modalDeleteInstance = new Modal(this.modalDeleteElementRef.nativeElement);
  }

  async fetchData() {
    if (this.isLoading()) return;
    this.isLoading.set(true);
    try {
      const resp = await this.catalogoService.getCatalogos({
        page: this.pagination().page,
        limit: this.pagination().pageSize,
        search: this.buscador(),
      });
      if (resp?.data) {
        this.catalogoList.set(resp.data ?? []);
        const metadata = resp.metadata;
        if (metadata) {
          this.pagination.set({
            page: metadata.page,
            pageSize: metadata.limit,
            totalItems: metadata.total,
          });
        }
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  openModal(esNuevo: boolean, catalogo?: ICatalogo) {
    this.nuevo.set(esNuevo);
    this.formKey.set(Date.now());
    if (esNuevo) {
      this.catalogoEdit.set({ ...emptyCatalogo });
      this.modal.set({ titulo: 'Crear catálogo' });
    } else {
      this.catalogoEdit.set({ ...catalogo! });
      this.modal.set({ titulo: 'Editar catálogo' });
    }
    this.modalUpsertInstance.show();
  }

  closeModal() {
    this.modalUpsertInstance.hide();
  }

  openDeleteModal(catalogo: ICatalogo) {
    this.catalogoEdit.set({ ...catalogo });
    this.modalDeleteInstance.show();
  }

  verOpciones(catalogo: ICatalogo) {
    this.router.navigate(['/onesiteex/catalogos', catalogo.id, 'opciones']);
  }

  async upsertCatalogo(catalogo: ICatalogo) {
    if (this.nuevo()) {
      await this.createCatalogo(catalogo);
    } else {
      await this.updateCatalogo(catalogo);
    }
  }

  async createCatalogo(catalogo: ICatalogo) {
    const resp = await this.catalogoService.createCatalogo(catalogo);
    if (resp?.success) {
      this.closeModal();
      this.fetchData();
    }
  }

  async updateCatalogo(catalogo: ICatalogo) {
    const resp = await this.catalogoService.updateCatalogo(catalogo);
    if (resp?.success) {
      this.closeModal();
      this.fetchData();
    }
  }

  async toggleActivo(item: ICatalogo) {
    const updated = { ...item, activo: !item.activo };
    const resp = await this.catalogoService.updateCatalogo(updated);
    if (resp?.success) {
      this.catalogoList.update(list =>
        list.map(c => c.id === item.id ? { ...c, activo: !c.activo } : c)
      );
    }
  }

  async deleteCatalogo() {
    const id = this.catalogoEdit().id!;
    const resp = await this.catalogoService.deleteCatalogo(id);
    if (resp?.success) {
      this.modalDeleteInstance.hide();
      this.fetchData();
    }
  }

  onChangePage(newPagination: IPagination) {
    this.pagination.set(newPagination);
    this.fetchData();
  }
}


