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
import { IDocumento } from '../../../../../interfaces/documentos/documento';

@Component({
  selector: 'app-upsert-documento',
  imports: [FormsModule],
  templateUrl: './upsert-documento.component.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpsertDocumentoComponent {
  private cdr = inject(ChangeDetectorRef);

  documento = input<IDocumento>({
    nombre: '',
    codigo: '',
    categoria: 'ALIADO',
    descripcion: '',
    activo: true,
  });
  nuevo = input<boolean>(true);
  key = input<number>(0);

  @Output() save = new EventEmitter<IDocumento>();
  @Output() cancel = new EventEmitter<void>();

  form = signal<IDocumento>({ ...this.documento() });

  constructor() {
    effect(() => {
      const d = this.documento();
      const _key = this.key();
      this.form.set({ ...d });
      this.cdr.markForCheck();
    });
  }

  onSave(ngForm: any) {
    if (ngForm.invalid) return;
    this.save.emit({ ...this.form() });
  }

  onCancel() {
    this.cancel.emit();
  }
}
