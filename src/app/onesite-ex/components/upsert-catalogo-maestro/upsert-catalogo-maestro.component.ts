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
import { ICatalogo } from '../../../../interfaces/catalogo-maestro/catalogo-maestro';

@Component({
  selector: 'app-upsert-catalogo-maestro',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './upsert-catalogo-maestro.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpsertCatalogoMaestroComponent {
  private fb = inject(FormBuilder);

  catalogo = input<ICatalogo>({
    id: '',
    nombre: '',
    codigo: '',
    activo: true,
  });

  nuevo = input<boolean>(true);
  formKey = input<number>(0);

  @Output() save = new EventEmitter<ICatalogo>();
  @Output() cancel = new EventEmitter<void>();

  form = signal<FormGroup>(this.fb.group({}));

  constructor() {
    effect(() => {
      const _ = this.formKey();
      const cat = this.catalogo();
      const isNuevo = this.nuevo();
      this.initForm(cat, isNuevo);
    });
  }

  private initForm(cat: ICatalogo, isNuevo: boolean) {
    const newForm = this.fb.group({
      nombre: [isNuevo ? '' : cat.nombre, [Validators.required, Validators.maxLength(200)]],
      codigo: [isNuevo ? '' : cat.codigo, [Validators.required, Validators.maxLength(50)]],
      activo: [isNuevo ? true : cat.activo],
    });
    this.form.set(newForm);
  }

  get btnText(): string {
    return this.nuevo() ? 'Crear catálogo' : 'Actualizar catálogo';
  }

  hasError(field: string, error: string): boolean {
    const ctrl = this.form().get(field);
    return !!(ctrl?.touched && ctrl?.errors?.[error]);
  }

  onSubmit() {
    this.form().markAllAsTouched();
    if (!this.form().valid) return;

    const value: ICatalogo = {
      ...this.catalogo(),
      ...this.form().value,
    };
    this.save.emit(value);
  }

  onCancel() {
    this.cancel.emit();
  }
}
