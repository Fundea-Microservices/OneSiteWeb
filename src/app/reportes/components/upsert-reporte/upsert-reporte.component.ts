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
import { IReporte } from '../../../../interfaces/reportes/reporte';


export interface ReporteValidationRules {
  nombre?: any[];
  descripcion?: any[];
  procedimiento?: any[];
}

@Component({
  selector: 'app-upsert-reporte',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './upsert-reporte.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpsertReporteComponent {
  fb = inject(FormBuilder);

  reporte = input<IReporte>({
    reporteId: '',
    nombre: '',
    descripcion: '',
    rutaPlantilla: '',
    procedimiento: '',
    activo: true,
    exportarExcel: false,
    exportarTabla: false,
    exportarPDF: false,
    exportarCSV: false,
    exportarJSON: false,
    created_at: new Date()
  });

  nuevo = input<boolean>(true);

  validationRules: ReporteValidationRules = {
    nombre: [Validators.required, Validators.maxLength(150)],
    descripcion: [Validators.maxLength(300)],
    procedimiento: [Validators.required],
  };

  @Output() save = new EventEmitter<IReporte>();
  @Output() cancel = new EventEmitter<void>();

  form = signal<FormGroup>(this.fb.group({}));

  constructor() {
    effect(() => {
      const isNuevo = this.nuevo();
      const reporte = this.reporte();

      const newForm = this.fb.group({
        nombre: [reporte.nombre, this.validationRules.nombre],
        descripcion: [reporte.descripcion, this.validationRules.descripcion],
        procedimiento: [reporte.procedimiento, this.validationRules.procedimiento],
        activo: [reporte.activo],
        exportarTabla: [reporte.exportarTabla],
        exportarExcel: [reporte.exportarExcel],
        exportarPDF: [reporte.exportarPDF],
        exportarCSV: [reporte.exportarCSV],
        exportarJSON: [reporte.exportarJSON],
      });

      if (isNuevo) {
        newForm.reset({
          nombre: '',
          descripcion: '',
          procedimiento: '',
          activo: true,
        });
      }

      this.form.set(newForm);
    });
  }

  get btnText(): string {
    return this.nuevo() ? 'Crear Reporte' : 'Actualizar Reporte';
  }

  onSubmit() {
    if (this.form().valid) {
      const value: IReporte = {
        ...this.reporte(),
        ...this.form().value,
      };
      this.save.emit(value);
    }
  }

  onCancel() {
    this.cancel.emit();
  }
}
