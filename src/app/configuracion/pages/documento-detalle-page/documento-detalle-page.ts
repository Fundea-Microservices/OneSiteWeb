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
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Modal } from 'bootstrap';
import { ToastrService } from 'ngx-toastr';
import { DocumentosService } from '../../../../services/config/documentos.service';
import { StorageService } from '../../../../services/storage.service';
import { IDocumento, IVersionDocumento } from '../../../../interfaces/documentos/documento';

@Component({
  selector: 'app-documento-detalle-page',
  imports: [RouterLink],
  templateUrl: './documento-detalle-page.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class DocumentoDetallePage {
  private service = inject(DocumentosService);
  private storage = inject(StorageService);
  private toastr = inject(ToastrService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  isLoading = signal(false);
  documento = signal<IDocumento | null>(null);
  versionList = signal<IVersionDocumento[]>([]);
  pagination = signal<IPagination>({ page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });

  versionEdit = signal<IVersionDocumento | null>(null);
  descargandoId = signal<string | null>(null);

  @ViewChild('deleteVersionModal') deleteVersionModalRef!: ElementRef;
  private deleteVersionModalInstance!: Modal;

  ngOnInit() {
    const documentoId = this.route.snapshot.paramMap.get('documentoId');
    if (documentoId) {
      this.loadDocumento(documentoId);
    }
  }

  ngAfterViewInit() {
    this.deleteVersionModalInstance = new Modal(this.deleteVersionModalRef.nativeElement);
  }

  async loadDocumento(documentoId: string) {
    this.isLoading.set(true);
    try {
      const resp = await this.service.getDocumentoById(documentoId);
      if (resp?.data) {
        this.documento.set(resp.data);
        await this.loadVersiones(documentoId);
      }
    } finally {
      this.isLoading.set(false);
      this.cdr.markForCheck();
    }
  }

  async loadVersiones(documentoId: string) {
    const resp = await this.service.getVersiones({
      documentoId,
      page: this.pagination().page,
      limit: this.pagination().pageSize,
    });
    if (resp?.data) {
      this.versionList.set(resp.data);
      const m = resp.metadata;
      this.pagination.set({
        page: m.page ?? 1,
        pageSize: m.limit ?? 10,
        totalItems: m.total ?? 0,
        totalPages: Math.ceil((m.total ?? 0) / (m.limit ?? 10)),
      });
    } else {
      this.versionList.set([]);
    }
    this.cdr.markForCheck();
  }

  navigateToVersion(item?: IVersionDocumento) {
    const docId = this.documento()?.documentoId ?? '';
    if (item?.versionId) {
      this.router.navigate(['/config/documentos/detalle', docId, 'version', item.versionId]);
    } else {
      this.router.navigate(['/config/documentos/detalle', docId, 'version']);
    }
  }

  /** rutaArchivo es "categoria/archivo.ext": se descarga del API (requiere token), no es una URL pública */
  async descargarVersion(item: IVersionDocumento) {
    if (!item.rutaArchivo) {
      this.toastr.error('La versión no tiene un archivo asociado', 'Error');
      return;
    }

    this.descargandoId.set(item.versionId ?? null);
    try {
      const blob = await this.storage.downloadFileAsBlob(item.rutaArchivo);
      if (!blob) {
        this.toastr.error('No se pudo descargar el documento', 'Error');
        return;
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = item.rutaArchivo.split('/').pop() || 'documento.docx';
      a.click();
      window.URL.revokeObjectURL(url);
    } finally {
      this.descargandoId.set(null);
      this.cdr.markForCheck();
    }
  }

  openDeleteVersionModal(item: IVersionDocumento) {
    this.versionEdit.set(item);
    this.deleteVersionModalInstance.show();
  }

  async deleteVersion() {
    const item = this.versionEdit();
    if (!item?.versionId) return;
    const resp = await this.service.deleteVersion(item.versionId);
    if (resp?.success) {
      this.deleteVersionModalInstance.hide();
      const docId = this.documento()?.documentoId ?? '';
      await this.loadVersiones(docId);
    }
  }

  async toggleVigente(item: IVersionDocumento) {
    await this.service.updateVersion({ ...item, vigente: !item.vigente });
    const docId = this.documento()?.documentoId ?? '';
    await this.loadVersiones(docId);
  }

  async toggleAprobado(item: IVersionDocumento) {
    await this.service.updateVersion({ ...item, aprobado: !item.aprobado });
    const docId = this.documento()?.documentoId ?? '';
    await this.loadVersiones(docId);
  }
}
