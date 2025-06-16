import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
  inject,
  input,
  Input,
  effect,
  signal
} from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { IRol } from '../../../../../interfaces/auth';

export interface RolValidationRules {
  name?: any[];
  description?: any[];
  password?: any[];
}

@Component({
  selector: 'app-upsert-rol',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './upsert-rol.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpsertRolComponent {
  fb = inject(FormBuilder);

  rol = input<IRol>({
    rolId: '',
    name: '',
    active: true,
    guest: false,
  });

  nuevo = input<boolean>(true);

  validationRules: RolValidationRules = {
    name: [Validators.required, Validators.minLength(5)],
  };

  @Output() save = new EventEmitter<IRol>();
  @Output() cancel = new EventEmitter<void>();

  form = signal<FormGroup>(this.fb.group({}));

  constructor() {
  effect(() => {
    const isNuevo = this.nuevo();
    const rol = this.rol();

    const newForm = this.fb.group({
      name: [rol.name, this.validationRules.name],
      active: [rol.active],
      guest: [rol.guest],
    });

    if (isNuevo) {
      newForm.reset({
        name: '',
        active: true,
        guest: false,
      });
    }

    this.form.set(newForm); // Actualiza el signal
  });
}

  get btnText(): string {
    return this.nuevo() ? 'Crear Rol' : 'Actualizar Rol';
  }

 

  onSubmit() {
    if (this.form().valid) {
      const value: IRol = {
        ...this.rol(),
        ...this.form().value,
      };
      this.save.emit(value);
    }
  }

  onCancel() {
    this.cancel.emit();
  }
}

