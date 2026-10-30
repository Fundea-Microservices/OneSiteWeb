import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  effect,
  EventEmitter,
  inject,
  input,
  Output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { IProcedimientoScoring } from '../../../../interfaces/scoring/scoring';

/** El nombre viaja sin esquema: el backend antepone `scoring.` al ejecutar. */
const NOMBRE_OBJETO = /^[A-Za-z_][A-Za-z0-9_]{0,127}$/;

/**
 * Modal de un procedimiento almacenado del módulo.
 *
 * Guardar solo registra el script. Ejecutarlo contra la base es otra acción,
 * desde la tabla, para que un borrador no corra DDL sin querer.
 */
@Component({
  selector: 'app-upsert-procedimiento-scoring',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './upsert-procedimiento-scoring.component.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpsertProcedimientoScoringComponent {
  private fb = inject(FormBuilder);

  procedimiento = input<IProcedimientoScoring | null>(null);
  nuevo = input<boolean>(true);
  formKey = input<number>(0);

  @Output() save = new EventEmitter<IProcedimientoScoring>();
  @Output() cancel = new EventEmitter<void>();

  form = signal<FormGroup>(this.construirForm(null));

  constructor() {
    effect(() => {
      const _ = this.formKey();
      this.form.set(this.construirForm(this.procedimiento()));
    });
  }

  private construirForm(
    procedimiento: IProcedimientoScoring | null,
  ): FormGroup {
    return this.fb.group({
      nombre: [
        procedimiento?.nombre ?? '',
        [
          Validators.required,
          Validators.maxLength(128),
          Validators.pattern(NOMBRE_OBJETO),
        ],
      ],
      version: [
        procedimiento?.version ?? this.versionSugerida(),
        [Validators.required, Validators.maxLength(20)],
      ],
      descripcion: [
        procedimiento?.descripcion ?? '',
        [Validators.maxLength(500)],
      ],
      definicion: [procedimiento?.definicion ?? '', [Validators.required]],
      activo: [(procedimiento?.estado ?? 'Activo') === 'Activo'],
    });
  }

  /** MM-AAAA del mes en curso, que es como se vienen numerando. */
  private versionSugerida(): string {
    const hoy = new Date();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    return `${mes}-${hoy.getFullYear()}`;
  }

  onSubmit(): void {
    const form = this.form();

    if (form.invalid) {
      form.markAllAsTouched();
      return;
    }

    const valores = form.getRawValue();

    this.save.emit({
      ...(this.procedimiento() ?? {}),
      nombre: valores.nombre.trim(),
      version: valores.version.trim(),
      descripcion: valores.descripcion?.trim() || null,
      definicion: valores.definicion,
      estado: valores.activo ? 'Activo' : 'Inactivo',
    } as IProcedimientoScoring);
  }

  onCancel(): void {
    this.cancel.emit();
  }

  campoInvalido(campo: string): boolean {
    const control = this.form().get(campo);
    return !!control && control.invalid && (control.dirty || control.touched);
  }
}
