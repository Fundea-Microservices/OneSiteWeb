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
import { ITrama } from '../../../../../interfaces/emanager/getion';

export interface TramaValidationRules {
  procesoId?: any[];
  sistemaId?: any[];
  descripcion?: any[];
  codigo?: any[];
}

@Component({
  selector: 'app-upsert-trama',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './upsert-trama.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpsertTramaComponent {
  fb = inject(FormBuilder);

  trama = input<ITrama>({
    tramaId: '',
    procesoId: 0,
    sistemaId: 2,
    descripcion: '',
    codigo: 0,
    activo: 1,
    created_at: new Date(),
  });

  nuevo = input<boolean>(true);

  validationRules: TramaValidationRules = {
    procesoId: [Validators.required, Validators.min(1)],
    sistemaId: [Validators.required, Validators.min(1)],
    descripcion: [Validators.required, Validators.minLength(3), Validators.maxLength(300)],
    codigo: [Validators.required, Validators.min(0)],
  };

  @Output() save = new EventEmitter<ITrama>();
  @Output() cancel = new EventEmitter<void>();

  form = signal<FormGroup>(this.fb.group({}));

  constructor() {
    effect(() => {
      const isNuevo = this.nuevo();
      const trama = this.trama();

      const newForm = this.fb.group({
        procesoId: [trama.procesoId, this.validationRules.procesoId],
        sistemaId: [trama.sistemaId, this.validationRules.sistemaId],
        descripcion: [trama.descripcion, this.validationRules.descripcion],
        codigo: [trama.codigo, this.validationRules.codigo],
        activo: [trama.activo === 1],
      });

      if (isNuevo) {
        newForm.reset({
          procesoId: 0,
          sistemaId: 2,
          descripcion: '',
          codigo: 0,
          activo: true,
        });
      }

      this.form.set(newForm);
    });
  }

  get btnText(): string {
    return this.nuevo() ? 'Crear Trama' : 'Actualizar Trama';
  }

  onSubmit() {
    if (this.form().valid) {
      const formValue = this.form().value as {
        procesoId: number | string;
        descripcion: string;
        codigo: number | string;
        activo: boolean;
      };

      const value: ITrama = {
        ...this.trama(),
        ...formValue,
        procesoId: Number(formValue.procesoId ?? 0),
        codigo: Number(formValue.codigo ?? 0),
        activo: formValue.activo ? 1 : 0,
      };
      this.save.emit(value);
    }
  }

  onCancel() {
    this.cancel.emit();
  }
}
