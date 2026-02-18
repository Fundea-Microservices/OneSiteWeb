import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
  inject,
  input,
  effect,
  signal
} from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { IEncabezado } from '../../../../../interfaces/emanager/encabezado';

export interface EncabezadoValidationRules {
  nombre?: any[];
  descripcion?: any[];
  proceso?: any[];
}

@Component({
  selector: 'app-upsert-encabezado',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './upsert-encabezado.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpsertEncabezadoComponent {
  fb = inject(FormBuilder);

  encabezado = input<IEncabezado>({
    encabezadoId: '',
    nombre: '',
    proceso: 0,
    activo: true,
    created_at: new Date(),
  });

  nuevo = input<boolean>(true);

  validationRules: EncabezadoValidationRules = {
    nombre: [Validators.required, Validators.minLength(3), Validators.maxLength(200)],
    descripcion: [Validators.maxLength(300)],
    proceso: [Validators.required, Validators.min(0)],
  };

  @Output() save = new EventEmitter<IEncabezado>();
  @Output() cancel = new EventEmitter<void>();

  form = signal<FormGroup>(this.fb.group({}));

  constructor() {
    effect(() => {
      const isNuevo = this.nuevo();
      const encabezado = this.encabezado();

      const newForm = this.fb.group({
        nombre: [encabezado.nombre, this.validationRules.nombre],
        proceso: [encabezado.proceso, this.validationRules.proceso],
        activo: [encabezado.activo],
      });

      if (isNuevo) {
        newForm.reset({
          nombre: '',
          proceso: undefined,
          activo: true,
        });
      }

      this.form.set(newForm);
    });
  }

  get btnText(): string {
    return this.nuevo() ? 'Crear Encabezado' : 'Actualizar Encabezado';
  }

  onSubmit() {
    if (this.form().valid) {
      const formValue = this.form().value;

      const value: IEncabezado = {
        ...this.encabezado(),
        ...formValue,
        proceso: formValue.proceso ? Number(formValue.proceso) : undefined,
      };
      this.save.emit(value);
    }
  }

  onCancel() {
    this.cancel.emit();
  }
}
