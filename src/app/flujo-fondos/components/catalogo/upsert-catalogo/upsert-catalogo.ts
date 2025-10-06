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
import { ICatalogo } from '../../../../../interfaces/catalogo';

export interface CatalogoValidationRules {
  codigo?: any[];
  codigoExterno?: any[];
  descripcion?: any[];
  tipo?: any[];
}

@Component({
  selector: 'app-upsert-catalogo',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './upsert-catalogo.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpsertCatalogoComponent {
  fb = inject(FormBuilder);

  catalogo = input<ICatalogo>({
    catalogoId: '',
    codigo: 0,
    codigoExterno: 0,
    descripcion: '',
    estado: true,
    tipo: '',
  });

  nuevo = input<boolean>(true);

  validationRules: CatalogoValidationRules = {
    codigo: [Validators.required, Validators.min(0)],
    codigoExterno: [Validators.required, Validators.min(0)],
    descripcion: [Validators.required, Validators.minLength(3), Validators.maxLength(300)],
    tipo: [Validators.required, Validators.minLength(3), Validators.maxLength(25)],
  };

  @Output() save = new EventEmitter<ICatalogo>();
  @Output() cancel = new EventEmitter<void>();

  form = signal<FormGroup>(this.fb.group({}));

  constructor() {
    effect(() => {
      const isNuevo = this.nuevo();
      const catalogo = this.catalogo();

      const newForm = this.fb.group({
        codigo: [catalogo.codigo, this.validationRules.codigo],
        codigoExterno: [catalogo.codigoExterno, this.validationRules.codigoExterno],
        descripcion: [catalogo.descripcion, this.validationRules.descripcion],
        estado: [catalogo.estado],
        tipo: [catalogo.tipo, this.validationRules.tipo],
      });

      if (isNuevo) {
        newForm.reset({
          codigo: 0,
          codigoExterno: 0,
          descripcion: '',
          estado: true,
          tipo: '',
        });
      }

      this.form.set(newForm);
    });
  }

  get btnText(): string {
    return this.nuevo() ? 'Crear Catálogo' : 'Actualizar Catálogo';
  }

  onSubmit() {
    if (this.form().valid) {
      const value: ICatalogo = {
        ...this.catalogo(),
        ...this.form().value,
      };
      this.save.emit(value);
    }
  }

  onCancel() {
    this.cancel.emit();
  }
}
