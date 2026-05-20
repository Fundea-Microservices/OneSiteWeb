import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  effect,
  EventEmitter,
  inject,
  input,
  Output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IVersionDocumento } from '../../../../../interfaces/documentos/documento';
import { DocumentosService } from '../../../../../services/config/documentos.service';

@Component({
  selector: 'app-upsert-version',
  imports: [FormsModule],
  templateUrl: './upsert-version.component.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpsertVersionComponent {
  private cdr = inject(ChangeDetectorRef);
  private documentosService = inject(DocumentosService);

  version = input<IVersionDocumento>({
    documentoId: '',
    correlativo: 1,
    codigoVersion: '',
    rutaArchivo: '',
    aprobado: false,
    vigente: false,
    notasCambio: '',
  });
  nuevo = input<boolean>(true);
  key = input<number>(0);

  @Output() save = new EventEmitter<IVersionDocumento>();
  @Output() cancel = new EventEmitter<void>();

  form = signal<IVersionDocumento>({ ...this.version() });
  isUploading = signal(false);
  archivoSeleccionado = signal<File | null>(null);

  constructor() {
    effect(() => {
      const v = this.version();
      const _key = this.key();
      this.form.set({ ...v });
      this.archivoSeleccionado.set(null);
      this.cdr.markForCheck();
    });
  }

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    const allowed = [
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (!allowed.includes(file.type)) {
      alert('Solo se permiten archivos Word (.doc, .docx)');
      input.value = '';
      return;
    }

    this.archivoSeleccionado.set(file);
    this.isUploading.set(true);
    this.cdr.markForCheck();

    const rutaArchivo = await this.documentosService.uploadArchivoVersion(file);
    this.isUploading.set(false);

    if (rutaArchivo) {
      this.form.update(f => ({ ...f, rutaArchivo }));
    } else {
      input.value = '';
      this.archivoSeleccionado.set(null);
    }
    this.cdr.markForCheck();
  }

  onSave(ngForm: any) {
    if (ngForm.invalid) return;
    this.save.emit({ ...this.form() });
  }

  onCancel() {
    this.cancel.emit();
  }
}
