import {
  ChangeDetectionStrategy,
  Component,
  computed,
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
import {
  ICatalogoVariable,
  IOpcionVariable,
} from '../../../../interfaces/scoring/scoring';

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

  /** Catálogos del scoring: de ahí salen las opciones padre candidatas. */
  catalogos = input<ICatalogoVariable[]>([]);

  @Output() save = new EventEmitter<IOpcionVariable>();
  @Output() cancel = new EventEmitter<void>();

  /**
   * Con sus controles desde el inicio: el componente se crea dentro de un
   * `@if` y los `effect()` corren después del primer render, así que un
   * formulario vacío dejaría los `formControlName` sin control que enlazar.
   */
  form = signal<FormGroup>(this.construirForm(null));

  /** El catálogo al que pertenece esta opción. */
  private catalogoActual = computed(() =>
    this.catalogos().find((c) => c.catalogoId === this.catalogoId()),
  );

  /** De qué catálogo depende el actual. undefined = es independiente. */
  catalogoPadre = computed(() => {
    const padreId = this.catalogoActual()?.catalogoPadreId;
    if (!padreId) return undefined;
    return this.catalogos().find((c) => c.catalogoId === padreId);
  });

  /** Solo las opciones de ese catálogo: la cascada ya no cruza a dedo. */
  opcionesPadre = computed(() =>
    (this.catalogoPadre()?.opciones ?? []).filter((o) => o.estado === 'Activo'),
  );

  constructor() {
    effect(() => {
      const _ = this.formKey();
      this.form.set(this.construirForm(this.opcion()));
    });

    /* Sin padre, una opción de catálogo dependiente desaparece de la
       captura sin aviso. Por eso aquí es obligatorio. */
    effect(() => {
      const dependiente = !!this.catalogoPadre();
      const control = this.form().get('opcionPadreId');
      if (!control) return;

      control.setValidators(dependiente ? [Validators.required] : []);
      control.updateValueAndValidity({ emitEvent: false });

      if (!dependiente && control.value !== null) {
        control.setValue(null, { emitEvent: false });
      }
    });
  }

  private construirForm(opcion: IOpcionVariable | null): FormGroup {
    return this.fb.group({
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
      opcionPadreId: [opcion?.opcionPadreId ?? null],
      porDefecto: [opcion?.porDefecto ?? false],
      estado: [opcion?.estado ?? 'Activo', [Validators.required]],
    });
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
      opcionPadreId: valores.opcionPadreId
        ? Number(valores.opcionPadreId)
        : null,
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
