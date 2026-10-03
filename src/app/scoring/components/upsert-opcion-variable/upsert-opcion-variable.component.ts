import {
  ChangeDetectionStrategy,
  Component,
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
import { IOpcionVariable } from '../../../../interfaces/scoring/scoring';

/**
 * Modal 2 de la Pantalla 2: una opción del catálogo con sus coeficientes.
 *
 * Los cinco coeficientes son obligatorios por especificación y admiten
 * negativos: un factor de riesgo puede restar punteo.
 */
@Component({
  selector: 'app-upsert-opcion-variable',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './upsert-opcion-variable.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpsertOpcionVariableComponent {
  private fb = inject(FormBuilder);

  opcion = input<IOpcionVariable | null>(null);
  catalogoId = input.required<number>();
  nuevo = input<boolean>(true);
  formKey = input<number>(0);

  @Output() save = new EventEmitter<IOpcionVariable>();
  @Output() cancel = new EventEmitter<void>();

  form = signal<FormGroup>(this.fb.group({}));

  constructor() {
    effect(() => {
      const _ = this.formKey();
      this.initForm(this.opcion());
    });
  }

  private initForm(opcion: IOpcionVariable | null): void {
    this.form.set(
      this.fb.group({
        codigoOpcion: [
          opcion?.codigoOpcion ?? '',
          [Validators.required, Validators.maxLength(50)],
        ],
        descripcionOpcion: [
          opcion?.descripcionOpcion ?? '',
          [Validators.required, Validators.maxLength(150)],
        ],
        peso: [opcion?.peso ?? 0, [Validators.required]],
        constante: [opcion?.constante ?? 0, [Validators.required]],
        valorReferencia: [opcion?.valorReferencia ?? 0, [Validators.required]],
        coeficienteA: [opcion?.coeficienteA ?? 0, [Validators.required]],
        coeficienteB: [opcion?.coeficienteB ?? 0, [Validators.required]],
        observacionesVar: [
          opcion?.observacionesVar ?? '',
          [Validators.maxLength(500)],
        ],
        ordenDespliegue: [opcion?.ordenDespliegue ?? null],
        estado: [opcion?.estado ?? 'Activo', [Validators.required]],
      }),
    );
  }

  onSubmit(): void {
    const form = this.form();

    if (form.invalid) {
      form.markAllAsTouched();
      return;
    }

    const valores = form.getRawValue();

    this.save.emit({
      ...(this.opcion() ?? {}),
      ...valores,
      catalogoId: this.catalogoId(),
      peso: Number(valores.peso),
      constante: Number(valores.constante),
      valorReferencia: Number(valores.valorReferencia),
      coeficienteA: Number(valores.coeficienteA),
      coeficienteB: Number(valores.coeficienteB),
      observacionesVar: valores.observacionesVar?.trim() || null,
      ordenDespliegue: valores.ordenDespliegue ?? undefined,
    } as IOpcionVariable);
  }

  onCancel(): void {
    this.cancel.emit();
  }

  campoInvalido(campo: string): boolean {
    const control = this.form().get(campo);
    return !!control && control.invalid && control.touched;
  }
}
