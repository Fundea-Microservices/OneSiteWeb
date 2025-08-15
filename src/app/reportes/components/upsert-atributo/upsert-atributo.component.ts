import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
  inject,
  input,
  signal,
  effect
} from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { IAtributo } from '../../../../interfaces/reportes/atributo';

export interface AtributoValidationRules {
  variable?: any[];
  alias?: any[];
  tipo?: any[];
  formato?: any[];
  orden?: any[];
}

@Component({
  selector: 'app-upsert-atributo',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './upsert-atributo.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpsertAtributoComponent {
  fb = inject(FormBuilder);

  // ID obligatorio del reporte
  reporteId = input.required<string>();

  atributo = input<IAtributo>({
    atributoId: '',
    reporteId: '',
    variable: '',
    alias: '',
    tipo: '',
    formato: null,
    orden: 1,
    visible: true,
  });

  nuevo = input<boolean>(true);

  validationRules: AtributoValidationRules = {
    variable: [Validators.required, Validators.maxLength(200)],
    alias: [Validators.required, Validators.maxLength(200)],
    tipo: [Validators.required, Validators.maxLength(50)],
    formato: [],
    orden: [Validators.required],
  };

  @Output() save = new EventEmitter<IAtributo>();
  @Output() cancel = new EventEmitter<void>();

  form = signal<FormGroup>(this.fb.group({}));

  constructor() {
    effect(() => {
      const isNuevo = this.nuevo();
      const atributo = this.atributo();

      const newForm = this.fb.group({
        variable: [atributo.variable, this.validationRules.variable],
        alias: [atributo.alias, this.validationRules.alias],
        tipo: [atributo.tipo, this.validationRules.tipo],
        formato: [atributo.formato],
        orden: [atributo.orden, this.validationRules.orden],
        visible: [atributo.visible],
      });

      if (isNuevo) {
        newForm.reset({
          variable: '',
          alias: '',
          tipo: '',
          formato: null,
          orden: 1,
          visible: true,
        });
      }

      this.form.set(newForm);
    });
  }

  get btnText(): string {
    return this.nuevo() ? 'Crear Atributo' : 'Actualizar Atributo';
  }

  onSubmit() {
    if (this.form().valid) {
      const value: IAtributo = {
        ...this.atributo(),
        ...this.form().value,
        reporteId: this.reporteId(), // siempre obligatorio
      };
      this.save.emit(value);
    }
  }

  onCancel() {
    this.cancel.emit();
  }
}
