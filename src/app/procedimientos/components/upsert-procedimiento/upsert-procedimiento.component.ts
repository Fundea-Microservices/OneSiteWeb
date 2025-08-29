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
import { IProcedimiento } from '../../../../interfaces/procedimientos/procedimiento';

export interface ProcedimientoValidationRules {
  nombre?: any[];
  descripcion?: any[];
  procedimiento?: any[];
  versionCode?: any[];
}

@Component({
  selector: 'app-upsert-procedimiento',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './upsert-procedimiento.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpsertProcedimientoComponent {
  fb = inject(FormBuilder);

  procedimiento = input<IProcedimiento>({
    procedimientoId: '',
    nombre: '',
    descripcion: '',
    procedimiento: '',
    versionCode: '',
    activo: true,
    created_at: new Date()
  });

  nuevo = input<boolean>(true);
  key = input<number>(0);

  validationRules: ProcedimientoValidationRules = {
    nombre: [Validators.required, Validators.maxLength(150)],
    descripcion: [Validators.maxLength(300)],
    procedimiento: [Validators.required],
    versionCode: [Validators.maxLength(20)]
  };

  @Output() save = new EventEmitter<IProcedimiento>();
  @Output() cancel = new EventEmitter<void>();

  form = signal<FormGroup>(this.fb.group({}));

  constructor() {
    effect(() => {
      const _ = this.key(); // provoca que el form se reinicie cada vez que cambia el key
      const isNuevo = this.nuevo();
      const procedimiento = this.procedimiento();

      const newForm = this.fb.group({
        nombre: [procedimiento.nombre, this.validationRules.nombre],
        descripcion: [procedimiento.descripcion, this.validationRules.descripcion],
        procedimiento: [procedimiento.versiones ? procedimiento.versiones[0].valor : '', this.validationRules.procedimiento],
        versionCode: [procedimiento.versiones ? procedimiento.versiones[0].codigo : '', this.validationRules.versionCode],
        activo: [procedimiento.activo],
      });

      if (isNuevo) {
        newForm.reset({
          nombre: '',
          descripcion: '',
          procedimiento: '',
          versionCode: '01-'+(new Date().getFullYear().toString()),
          activo: true,
        });
      }

      this.form.set(newForm);
    });
  }

  get btnText(): string {
    return this.nuevo() ? 'Crear Procedimiento' : 'Actualizar Procedimiento';
  }

  onSubmit() {
    if (this.form().valid) {
      const value: IProcedimiento = {
        ...this.procedimiento(),
        ...this.form().value,
      };
      this.save.emit(value);
    }
  }

  onCancel() {
    this.cancel.emit();
  }
}
