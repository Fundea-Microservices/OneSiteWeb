import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
  inject,
  input,
  computed,
  linkedSignal
} from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ITrama } from '../../../../../interfaces/emanager/getion';
import { CustomIconComponent } from '../../../../shared/components/custom-icon/custom-icon.component';

export interface TramaValidationRules {
  procesoId?: any[];
  sistemaId?: any[];
  nombre?: any[];
  descripcion?: any[];
  codigo?: any[];
  codigoInterno?: any[];
  usuario?: any[];
}

@Component({
  selector: 'app-upsert-trama',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CustomIconComponent],
  templateUrl: './upsert-trama.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpsertTramaComponent {
  fb = inject(FormBuilder);

  trama = input<ITrama>({
    tramaId: '',
    procesoId: 0,
    sistemaId: 2,
    nombre: '',
    descripcion: '',
    codigo: 0,
    codigoInterno: 0,
    usuario: '',
    usuarioGlobal: false,
    verApp: false,
    activo: true,
    created_at: new Date(),
  });

  nuevo = input<boolean>(true);

  validationRules: TramaValidationRules = {
    procesoId: [Validators.required, Validators.min(1)],
    sistemaId: [Validators.required, Validators.min(1)],
    nombre: [Validators.required, Validators.minLength(3), Validators.maxLength(200)],
    descripcion: [Validators.required, Validators.minLength(3), Validators.maxLength(300)],
    codigo: [Validators.required, Validators.min(0)],
    codigoInterno: [Validators.required, Validators.min(0)],
    usuario: [Validators.required, Validators.maxLength(100)],
  };

  @Output() save = new EventEmitter<ITrama>();
  @Output() cancel = new EventEmitter<void>();

  // computed() garantiza valores síncronos y correctos siempre, sin problemas de timing en zoneless
  form = computed<FormGroup>(() => {
    const isNuevo = this.nuevo();
    const t = this.trama();
    return this.fb.group({
      procesoId:    [isNuevo ? 0          : t.procesoId,              this.validationRules.procesoId],
      sistemaId:    [isNuevo ? 2          : t.sistemaId,              this.validationRules.sistemaId],
      nombre:       [isNuevo ? ''         : t.nombre,                 this.validationRules.nombre],
      descripcion:  [isNuevo ? ''         : t.descripcion,            this.validationRules.descripcion],
      codigo:       [isNuevo ? 0          : t.codigo,                 this.validationRules.codigo],
      codigoInterno:[isNuevo ? 0          : t.codigoInterno,          this.validationRules.codigoInterno],
      usuario:      [isNuevo ? ''         : t.usuario,                this.validationRules.usuario],
      usuarioGlobal:[isNuevo ? false      : t.usuarioGlobal],
      verApp:       [isNuevo ? false      : (t.verApp ?? false)],
      icono:        [isNuevo ? ''         : (t.icono ?? '')],
      color:        [isNuevo ? '#3b82f6'  : (t.color ?? '#3b82f6')],
      activo:       [isNuevo ? true       : t.activo],
    });
  });

  // linkedSignal: se resetea automáticamente cuando cambia trama/nuevo, pero también acepta escritura manual
  iconPreview  = linkedSignal(() => this.nuevo() ? '' : (this.trama().icono  ?? ''));
  colorPreview = linkedSignal(() => this.nuevo() ? '#3b82f6' : (this.trama().color ?? '#3b82f6'));

  onIconInput(event: Event) {
    this.iconPreview.set((event.target as HTMLInputElement).value);
  }

  onColorInput(event: Event) {
    this.colorPreview.set((event.target as HTMLInputElement).value);
  }

  get btnText(): string {
    return this.nuevo() ? 'Crear Trama' : 'Actualizar Trama';
  }

  onSubmit() {
    if (this.form().valid) {
      const formValue = this.form().value;

      const value: ITrama = {
        ...this.trama(),
        ...formValue,
        procesoId: Number(formValue.procesoId ?? 0),
        codigo: Number(formValue.codigo ?? 0),
        codigoInterno: Number(formValue.codigoInterno ?? 0),
        sistemaId: Number(formValue.sistemaId ?? 2),
      };
      this.save.emit(value);
    }
  }

  onCancel() {
    this.cancel.emit();
  }
}
