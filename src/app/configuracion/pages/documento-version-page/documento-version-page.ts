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
import * as renderDocx from 'docx-preview';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
// @ts-ignore
import { Previewer } from 'pagedjs';
import { DocumentosService } from '../../../../services/config/documentos.service';
import { StorageService } from '../../../../services/storage.service';
import { IDocumento, IParametro, IVersionDocumento } from '../../../../interfaces/documentos/documento';

@Component({
  selector: 'app-documento-version-page',
  imports: [RouterLink],
  templateUrl: './documento-version-page.html',
  styleUrl: './documento-version-page.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class DocumentoVersionPage {
  private service = inject(DocumentosService);
  private storage = inject(StorageService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  @ViewChild('previewContainer') previewContainer!: ElementRef;

  documentoId = signal('');
  versionId = signal<string | null>(null);
  esNuevo = signal(true);
  documento = signal<IDocumento | null>(null);

  // Estado del archivo Word
  archivoOriginal = signal<ArrayBuffer | null>(null);
  archivoFile = signal<File | null>(null);
  variables = signal<string[]>([]);
  variablesDefault = signal<Record<string, string>>({});
  isLoadingPreview = signal(false);
  errorCargaArchivo = signal(false);

  // Parámetros existentes (para edición)
  parametrosExistentes = signal<IParametro[]>([]);

  // Formulario de versión
  form = signal<Partial<IVersionDocumento>>({
    correlativo: 1,
    codigoVersion: '',
    notasCambio: '',
    aprobado: false,
    vigente: false,
    aprobadoPor: '',
    fechaAprobacion: undefined,
  });

  isSaving = signal(false);
  showToast = signal(false);
  isClosingToast = signal(false);
  toastMessage = signal('');
  toastType = signal<'success' | 'error' | 'info'>('success');

  ngOnInit() {
    const docId = this.route.snapshot.paramMap.get('documentoId') ?? '';
    const verId = this.route.snapshot.paramMap.get('versionId');
    this.documentoId.set(docId);
    this.versionId.set(verId);
    this.esNuevo.set(!verId);
    this.loadDocumento(docId);
    if (verId) {
      this.loadVersion(verId);
      this.loadParametros(verId);
    }
  }

  async loadDocumento(id: string) {
    const resp = await this.service.getDocumentoById(id);
    if (resp?.data) {
      this.documento.set(resp.data);
      this.form.update(f => ({ ...f, documentoId: id }));
      this.cdr.markForCheck();
    }
  }

  async loadVersion(verId: string) {
    const resp = await this.service.getVersionById(verId);
    if (resp?.data) {
      this.form.set({ ...resp.data });
      this.cdr.markForCheck();
      if (resp.data.rutaArchivo) await this.cargarArchivoVersion(resp.data.rutaArchivo);
    }
  }

  /** En edición el archivo no se reemplaza: solo se descarga para previsualizarlo */
  private async cargarArchivoVersion(rutaArchivo: string) {
    this.isLoadingPreview.set(true);
    this.errorCargaArchivo.set(false);
    this.cdr.markForCheck();

    const blob = await this.storage.downloadFileAsBlob(rutaArchivo);
    if (!blob) {
      this.isLoadingPreview.set(false);
      this.errorCargaArchivo.set(true);
      this.cdr.markForCheck();
      return;
    }

    try {
      const buffer = await blob.arrayBuffer();
      this.archivoOriginal.set(buffer);
      this.cdr.detectChanges(); // force DOM render so #previewContainer is available
      await this.renderizarPreview(buffer);
    } catch (err) {
      console.error('Error al visualizar documento de la versión:', err);
      this.archivoOriginal.set(null);
      this.errorCargaArchivo.set(true);
    } finally {
      this.isLoadingPreview.set(false);
      this.cdr.markForCheck();
    }
  }

  async loadParametros(verId: string) {
    const resp = await this.service.getParametros({ versionId: verId });
    if (resp?.data?.length) {
      this.parametrosExistentes.set(resp.data);
      const defaults: Record<string, string> = {};
      resp.data.forEach(p => { defaults[p.nombreTag] = p.valor ?? ''; });
      this.variablesDefault.set(defaults);
      this.variables.set(resp.data.map(p => p.nombreTag));
      this.cdr.markForCheck();
    }
  }

  async onFileSelected(event: Event): Promise<void> {
    // Cambios de estructura o variables se hacen creando una nueva versión
    if (!this.esNuevo()) return;

    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const allowed = [
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (!allowed.includes(file.type)) {
      this.mostrarToast('Solo se permiten archivos Word (.doc, .docx)', 'error');
      input.value = '';
      return;
    }

    const buffer = await file.arrayBuffer();
    this.archivoOriginal.set(buffer);
    this.archivoFile.set(file);
    this.isLoadingPreview.set(true);
    this.cdr.detectChanges(); // force DOM render so #previewContainer is available

    try {
      await this.renderizarPreview(buffer);

      const zip = new PizZip(buffer);
      const doc = new Docxtemplater(zip, { delimiters: { start: '{', end: '}' } });
      const matches = doc.getFullText().match(/{(.*?)}/g);
      this.variables.set(
        matches ? [...new Set(matches.map((m: string) => m.replace(/{|}/g, '')))] : []
      );
      this.isLoadingPreview.set(false);
    } catch (err) {
      this.isLoadingPreview.set(false);
      console.error('Error al procesar documento:', err);
      this.mostrarToast('Error al procesar el documento Word', 'error');
    }
    this.cdr.markForCheck();
  }

  private async renderizarPreview(buffer: ArrayBuffer): Promise<void> {
    const container = this.previewContainer.nativeElement;
    container.innerHTML = '';
    const tempDiv = document.createElement('div');
    await renderDocx.renderAsync(buffer, tempDiv, undefined, {
      className: 'docx',
      inWrapper: false,
      ignoreWidth: false,
      ignoreHeight: false,
    });
    this.resaltarVariables(tempDiv);
    const paged = new Previewer();
    const styleSheet = `@page { size: 215.9mm 279.4mm; margin: 25.4mm; } .pagedjs_page_content { overflow: hidden !important; }`;
    // Paged.js trata los strings como URL a descargar; el CSS en línea debe ir como { href: css }.
    // Si se pasa como string, en el server el fallback del SPA devuelve index.html y falla el parseo.
    await paged.preview(tempDiv.innerHTML, [{ [window.location.href]: styleSheet }], container);
    setTimeout(() => this.eliminarPaginaExtra(container), 500);
  }

  private resaltarVariables(container: HTMLElement): void {
    container.querySelectorAll('p, td, li, span').forEach((block) => {
      if (block.textContent?.includes('{')) {
        let html = block.innerHTML.replace(/<span[^>]*><\/span>/g, '');
        html = html.replace(/{(.*?)}/g, (match) => {
          const clean = match.replace(/<\/?[^>]+(>|$)/g, '');
          return `<span class="highlight-var">${clean}</span>`;
        });
        block.innerHTML = html;
      }
    });
  }

  private eliminarPaginaExtra(container: HTMLElement): void {
    const pages = Array.from(container.querySelectorAll('.pagedjs_page'));
    for (let i = pages.length - 1; i >= 0; i--) {
      const pageContent = pages[i].querySelector('.pagedjs_page_content');
      const text = pageContent?.textContent?.trim() || '';
      const hasMedia = (pageContent?.querySelectorAll('img, table, svg, canvas').length ?? 0) > 0;
      if ((!text || /^\d+$/.test(text)) && !hasMedia) {
        pages[i].remove();
      } else { break; }
    }
  }

  updateForm(field: keyof IVersionDocumento, value: any) {
    this.form.update(f => ({ ...f, [field]: value }));
  }

  updateVariableDefault(variable: string, value: string) {
    this.variablesDefault.update(d => ({ ...d, [variable]: value }));
  }

  async guardar() {
    const f = this.form();
    if (!f.correlativo) {
      this.mostrarToast('El correlativo es obligatorio', 'error');
      return;
    }
    if (this.esNuevo() && !this.archivoFile()) {
      this.mostrarToast('Debes cargar una plantilla o documento Word antes de guardar', 'error');
      return;
    }

    this.isSaving.set(true);
    this.cdr.markForCheck();
    try {
      const ok = this.esNuevo() ? await this.crearVersion(f) : await this.actualizarVersion(f);
      if (ok) this.router.navigate(['/config/documentos/detalle', this.documentoId()]);
    } finally {
      this.isSaving.set(false);
      this.cdr.markForCheck();
    }
  }

  private async crearVersion(f: Partial<IVersionDocumento>): Promise<boolean> {
    const uploadResp = await this.storage.uploadFile(this.archivoFile()!, 'documento');
    if (!uploadResp?.data?.url) return false;

    const payload: Partial<IVersionDocumento> = { ...f, documentoId: this.documentoId(), rutaArchivo: uploadResp.data.url };
    if (!payload.fechaAprobacion) delete payload.fechaAprobacion;
    if (!payload.aprobadoPor) delete payload.aprobadoPor;

    const resp = await this.service.createVersion(payload);
    if (!resp?.success) return false;

    const vars = this.variables();
    if (vars.length > 0) {
      const defaults = this.variablesDefault();
      const parametros = vars.map((tag) => ({
        versionId: resp.data?.versionId ?? '',
        nombreTag: tag,
        valor: defaults[tag] || undefined,
      }));
      await this.service.createParametrosBulk(parametros);
    }
    return true;
  }

  /** Edición: solo datos de la versión y valores por defecto; el archivo y los tags no cambian */
  private async actualizarVersion(f: Partial<IVersionDocumento>): Promise<boolean> {
    const verId = this.versionId()!;
    const resp = await this.service.updateVersion({
      versionId: verId,
      correlativo: f.correlativo,
      codigoVersion: f.codigoVersion ?? '',
      notasCambio: f.notasCambio ?? '',
    });
    if (!resp?.success) return false;

    const defaults = this.variablesDefault();
    const cambios = this.parametrosExistentes()
      .filter((p) => p.parametroId && (defaults[p.nombreTag] ?? '') !== (p.valor ?? ''))
      .map((p) => ({ parametroId: p.parametroId!, valor: defaults[p.nombreTag] ?? '' }));

    if (cambios.length > 0) {
      return this.service.updateParametrosBulk(verId, cambios);
    }
    return true;
  }

  cancelar() {
    this.router.navigate(['/config/documentos/detalle', this.documentoId()]);
  }

  private mostrarToast(mensaje: string, tipo: 'success' | 'error' | 'info'): void {
    this.toastMessage.set(mensaje);
    this.toastType.set(tipo);
    this.isClosingToast.set(false);
    this.showToast.set(true);
    this.cdr.markForCheck();
    setTimeout(() => {
      this.isClosingToast.set(true);
      this.cdr.markForCheck();
      setTimeout(() => { this.showToast.set(false); this.cdr.markForCheck(); }, 500);
    }, 3000);
  }
}
