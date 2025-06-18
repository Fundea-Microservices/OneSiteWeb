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
import { IRol } from '../../../../../interfaces/auth';
import { IMetodo } from '../../../../../interfaces/metodo';

export interface MetodoValidationRules {
  name?: any[];
  code?: any[];
  description?: any[];
  verb?: any[];
  active?: any[];
  isDefault?: any[];
  tokenLocation?: any[];
}
@Component({
  selector: 'app-upsert-metodo',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './upsert-metodo.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpsertMetodoComponent {

  fb = inject(FormBuilder);

  metodo = input<IMetodo>({
    name: '',
    code: '',
    description: '',
    verb: '',
    tokenLocation: null,
    active: true,
    isDefault: false,
  });

  nuevo = input<boolean>(true);

  validationRules: MetodoValidationRules = {
    name: [Validators.required, Validators.minLength(5)],
    code: [Validators.required, Validators.minLength(3)],
    description: [Validators.required, Validators.minLength(3)],
    verb: [Validators.required],
    active: [Validators.required],
    isDefault: [Validators.required],
  };

  @Output() save = new EventEmitter<IMetodo>();
  @Output() cancel = new EventEmitter<void>();

  form = signal<FormGroup>(this.fb.group({}));

  constructor() {
    effect(() => {
      const isNuevo = this.nuevo();
      const metodo = this.metodo();

      const newForm = this.fb.group({
        name: [metodo.name, this.validationRules.name],
        description: [metodo.description, this.validationRules.description],
        verb: [metodo.verb, this.validationRules.verb],
        code: [metodo.code, this.validationRules.code],
        tokenLocation: [metodo.tokenLocation, this.validationRules.tokenLocation],
        active: [metodo.active, this.validationRules.active],
        isDefault: [metodo.isDefault, this.validationRules.isDefault],
      });

      if (isNuevo) {
        newForm.reset({
          name: '',
          code: '',
          description: '',
          verb: '',
          tokenLocation: null,
          active: true,
          isDefault: false,
        });
      }

      this.form.set(newForm); // Actualiza el signal
    });
  }

  get btnText(): string {
    return this.nuevo() ? 'Crear método' : 'Actualizar método';
  }



  onSubmit() {
    if (this.form().valid) {
      const value: IMetodo = {
        ...this.metodo(),
        ...this.form().value,
      };
      this.save.emit(value);
    }
  }

  onCancel() {
    this.cancel.emit();
  }

}
