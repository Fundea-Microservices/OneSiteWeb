import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  inject,
  signal,
  ViewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Modal } from 'bootstrap';
import { DocumentosService } from '../../../../services/config/documentos.service';
import { IDocumento } from '../../../../interfaces/documentos/documento';
import { PaginationAllComponent } from '../../../shared/components/pagination-all/pagination-all';
import { UpsertDocumentoComponent } from '../../components/documentos/upsert-documento/upsert-documento.component';

@Component({
  selector: 'app-documentos-page',
  imports: [RouterLink, PaginationAllComponent, UpsertDocumentoComponent],
  templateUrl: './documentos-page.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class DocumentosPage {
  private documentosService = inject(DocumentosService);
  private cdr = inject(ChangeDetectorRef);

  isLoading = signal(false);
  nuevo = signal(true);
  documentoList = signal<IDocumento[]>([]);
  pagination = signal<IPagination>({ page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
  documentoEdit = signal<IDocumento>(this.emptyDocumento());
  formKey = signal(0);

  @ViewChild('upsertModal') upsertModalRef!: ElementRef;
  upsertModalInstance!: Modal;

  @ViewChild('deleteModal') deleteModalRef!: ElementRef;
  private deleteModalInstance!: Modal;

  closeUpsertModal() {
    this.upsertModalInstance?.hide();
  }

  ngOnInit() {
    this.fetchData();
  }

  ngAfterViewInit() {
    if (this.upsertModalRef) {
      this.upsertModalInstance = new Modal(this.upsertModalRef.nativeElement);
    }
    if (this.deleteModalRef) {
      this.deleteModalInstance = new Modal(this.deleteModalRef.nativeElement);
    }
  }

  private emptyDocumento(): IDocumento {
    return { nombre: '', codigo: '', categoria: 'ALIADO', descripcion: '', activo: true };
  }

  async fetchData() {
    if (this.isLoading()) return;
    this.isLoading.set(true);
    try {
      const resp = await this.documentosService.getDocumentos({
        page: this.pagination().page,
        limit: this.pagination().pageSize,
      });
      if (resp?.data) {
        this.documentoList.set(resp.data);
        const m = resp.metadata;
        this.pagination.set({
          page: m.page ?? 1,
          pageSize: m.limit ?? 10,
          totalItems: m.total ?? 0,
          totalPages: Math.ceil((m.total ?? 0) / (m.limit ?? 10)),
        });
      } else {
        this.documentoList.set([]);
      }
    } catch (e) {
      this.documentoList.set([]);
    } finally {
      this.isLoading.set(false);
      this.cdr.markForCheck();
    }
  }

  onChangePage(p: IPagination) {
    this.pagination.set(p);
    this.fetchData();
  }

  async toggleActivo(item: IDocumento) {
    const resp = await this.documentosService.updateDocumento({ ...item, activo: !item.activo });
    if (resp?.success) this.fetchData();
  }

  openUpsertModal(nuevo: boolean = true, item?: IDocumento) {
    this.nuevo.set(nuevo);
    this.documentoEdit.set(nuevo ? this.emptyDocumento() : { ...item! });
    this.formKey.update(k => k + 1);
    if (!this.upsertModalInstance) {
      this.upsertModalInstance = new Modal(this.upsertModalRef.nativeElement);
    }
    this.upsertModalInstance.show();
  }

  async onSaveDocumento(data: IDocumento) {
    this.isLoading.set(true);
    try {
      const resp = this.nuevo()
        ? await this.documentosService.createDocumento(data)
        : await this.documentosService.updateDocumento(data);
      if (resp?.success) {
        this.upsertModalInstance?.hide();
        this.isLoading.set(false);
        this.fetchData();
      }
    } finally {
      this.isLoading.set(false);
      this.cdr.markForCheck();
    }
  }

  openDeleteModal(item: IDocumento) {
    this.documentoEdit.set(item);
    if (!this.deleteModalInstance) {
      this.deleteModalInstance = new Modal(this.deleteModalRef.nativeElement);
    }
    this.deleteModalInstance.show();
  }

  async deleteDocumento() {
    const item = this.documentoEdit();
    if (!item.documentoId) return;
    const resp = await this.documentosService.deleteDocumento(item.documentoId);
    if (resp?.success) {
      this.fetchData();
      this.deleteModalInstance?.hide();
    }
  }
}
