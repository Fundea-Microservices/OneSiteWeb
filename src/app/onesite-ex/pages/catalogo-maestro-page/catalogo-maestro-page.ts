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
import { RouterLink } from '@angular/router';
import { Modal } from 'bootstrap';
import { PaginationComponent } from '../../../shared/components/pagination/pagination';
import { CatalogoMaestroService } from '../../../../services/config/catalogo-maestro.service';
import { ICatalogoMaestro } from '../../../../interfaces/catalogo-maestro/catalogo-maestro';
import { UpsertCatalogoMaestroComponent } from '../../components/upsert-catalogo-maestro/upsert-catalogo-maestro.component';

const emptyCatalogo: ICatalogoMaestro = {
  nombreCatalogo: '',
  codigoOpcion: '',
  valorOpcion: '',
  idPadreOpcion: null,
};

@Component({
  selector: 'app-catalogo-maestro-page',
  imports: [RouterLink, PaginationComponent, UpsertCatalogoMaestroComponent],
  templateUrl: './catalogo-maestro-page.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class CatalogoMaestroPage implements OnInit, AfterViewInit {
  private catalogoService = inject(CatalogoMaestroService);

  catalogoList = signal<ICatalogoMaestro[]>([]);
  catalogoEdit = signal<ICatalogoMaestro>(emptyCatalogo);
  nuevo = signal<boolean>(true);
  formKey = signal(Date.now());

  pagination = signal<IPagination>({ page: 1, pageSize: 10, totalItems: 0 });
  isLoading = signal(false);
  buscador = signal('');
  nombreCatalogoFilter = signal('');

  modal = signal({ titulo: 'Crear catálogo maestro' });

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
        nombreCatalogo: this.nombreCatalogoFilter(),
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

  openModal(esNuevo: boolean, catalogo?: ICatalogoMaestro) {
    this.nuevo.set(esNuevo);
    this.formKey.set(Date.now());
    if (esNuevo) {
      this.catalogoEdit.set({ ...emptyCatalogo });
      this.modal.set({ titulo: 'Crear catálogo maestro' });
    } else {
      this.catalogoEdit.set({ ...catalogo! });
      this.modal.set({ titulo: 'Editar catálogo maestro' });
    }
    this.modalUpsertInstance.show();
  }

  closeModal() {
    this.modalUpsertInstance.hide();
  }

  openDeleteModal(catalogo: ICatalogoMaestro) {
    this.catalogoEdit.set({ ...catalogo });
    this.modalDeleteInstance.show();
  }

  async upsertCatalogo(catalogo: ICatalogoMaestro) {
    if (this.nuevo()) {
      await this.createCatalogo(catalogo);
    } else {
      await this.updateCatalogo(catalogo);
    }
  }

  async createCatalogo(catalogo: ICatalogoMaestro) {
    const resp = await this.catalogoService.createCatalogo(catalogo);
    if (resp?.success) {
      this.closeModal();
      this.fetchData();
    }
  }

  async updateCatalogo(catalogo: ICatalogoMaestro) {
    const resp = await this.catalogoService.updateCatalogo(catalogo);
    if (resp?.success) {
      this.closeModal();
      this.fetchData();
    }
  }

  async deleteCatalogo() {
    const id = this.catalogoEdit().idCatalogo!;
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

