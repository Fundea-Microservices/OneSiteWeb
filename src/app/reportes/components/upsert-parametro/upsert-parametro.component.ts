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
import { IParametro } from '../../../../interfaces/reportes/parametro';

export interface ParametroValidationRules {
  nombre?: any[];
  variable?: any[];
  tipo?: any[];
  valor?: any[];
  orden?: any[];
}

@Component({
  selector: 'app-upsert-parametro',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './upsert-parametro.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpsertParametroComponent {
  fb = inject(FormBuilder);

  // ID obligatorio del reporte
  reporteId = input.required<string>();

  parametro = input<IParametro>({
    parametroId: '',
    reporteId: '',
    nombre: '',
    variable: '',
    tipo: '',
    obligatorio: false,
    valor: '',
    orden: 1,
    fechaActual: false
  });

  nuevo = input<boolean>(true);

  validationRules: ParametroValidationRules = {
    nombre: [Validators.required, Validators.maxLength(100)],
    variable: [Validators.required, Validators.maxLength(50)],
    tipo: [Validators.required, Validators.maxLength(50)],
    valor: [Validators.maxLength(200)],
    orden: [Validators.required],
  };

  @Output() save = new EventEmitter<IParametro>();
  @Output() cancel = new EventEmitter<void>();

  form = signal<FormGroup>(this.fb.group({}));

  constructor() {
    effect(() => {
      const isNuevo = this.nuevo();
      const parametro = this.parametro();

      const newForm = this.fb.group({
        nombre: [parametro.nombre, this.validationRules.nombre],
        variable: [parametro.variable, this.validationRules.variable],
        tipo: [parametro.tipo, this.validationRules.tipo],
        valor: [parametro.valor, this.validationRules.valor],
        orden: [parametro.orden, this.validationRules.orden],
        obligatorio: [parametro.obligatorio],
        fechaActual: [parametro.fechaActual],
      });

      if (isNuevo) {
        newForm.reset({
          nombre: '',
          variable: '',
          tipo: '',
          valor: '',
          orden: 1,
          obligatorio: false,
          fechaActual: false,
        });
      }

      this.form.set(newForm);
    });
  }

  get btnText(): string {
    return this.nuevo() ? 'Crear Parámetro' : 'Actualizar Parámetro';
  }

  onSubmit() {
    if (this.form().valid) {
      const value: IParametro = {
        ...this.parametro(),
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
