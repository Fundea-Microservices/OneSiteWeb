import {
  ChangeDetectionStrategy,
  Component,
  effect,
  EventEmitter,
  inject,
  input,
  Output,
  signal,
} from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ICatalogoOpcion } from '../../../../interfaces/catalogo-maestro/catalogo-maestro';

@Component({
  selector: 'app-upsert-catalogo-opcion',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './upsert-catalogo-opcion.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpsertCatalogoOpcionComponent {
  private fb = inject(FormBuilder);

  opcion = input<ICatalogoOpcion>({
    id: '',
    idCatalogo: '',
    nombre: '',
    codigo: '',
    orden: 0,
    activo: true,
    porDefecto: false,
    idPadre: null,
  });

  nuevo = input<boolean>(true);
  formKey = input<number>(0);

  @Output() save = new EventEmitter<ICatalogoOpcion>();
  @Output() cancel = new EventEmitter<void>();

  form = signal<FormGroup>(this.fb.group({}));

  constructor() {
    effect(() => {
      const _ = this.formKey();
      const op = this.opcion();
      const isNuevo = this.nuevo();
      this.initForm(op, isNuevo);
    });
  }

  private initForm(op: ICatalogoOpcion, isNuevo: boolean) {
    const newForm = this.fb.group({
      nombre: [isNuevo ? '' : op.nombre, [Validators.required, Validators.maxLength(150)]],
      codigo: [isNuevo ? '' : op.codigo, [Validators.required, Validators.maxLength(15)]],
      orden: [isNuevo ? 0 : (op.orden ?? 0), [Validators.min(0)]],
      activo: [isNuevo ? true : op.activo],
      porDefecto: [isNuevo ? false : op.porDefecto],
      idPadre: [isNuevo ? null : (op.idPadre ?? null)],
    });
    this.form.set(newForm);
  }

  get btnText(): string {
    return this.nuevo() ? 'Crear opción' : 'Actualizar opción';
  }

  hasError(field: string, error: string): boolean {
    const ctrl = this.form().get(field);
    return !!(ctrl?.touched && ctrl?.errors?.[error]);
  }

  onSubmit() {
    this.form().markAllAsTouched();
    if (!this.form().valid) return;

    const value: ICatalogoOpcion = {
      ...this.opcion(),
      ...this.form().value,
    };
    this.save.emit(value);
  }

  onCancel() {
    this.cancel.emit();
  }
}
