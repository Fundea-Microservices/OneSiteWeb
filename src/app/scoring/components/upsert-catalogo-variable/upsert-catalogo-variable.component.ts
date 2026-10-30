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
import { ICatalogoVariable } from '../../../../interfaces/scoring/scoring';

/** Modal 1 de la Pantalla 2: datos del catálogo, sin sus opciones. */
@Component({
  selector: 'app-upsert-catalogo-variable',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './upsert-catalogo-variable.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpsertCatalogoVariableComponent {
  private fb = inject(FormBuilder);

  catalogo = input<ICatalogoVariable | null>(null);
  scoringId = input.required<number>();
  nombreScoring =input<string>('');
  nuevo = input<boolean>(true);
  formKey = input<number>(0);

  /** Todos los del scoring: de ahí sale el catálogo padre. */
  catalogos = input<ICatalogoVariable[]>([]);

  @Output() save = new EventEmitter<ICatalogoVariable>();
  @Output() cancel = new EventEmitter<void>();

  /**
   * Se construye con sus controles desde el inicio, no vacío.
   *
   * Este componente se crea dentro de un `@if`, y los `effect()` corren después
   * del primer ciclo de detección de cambios. Si el formulario naciera vacío,
   * en ese primer render los `formControlName` no encontrarían sus controles y
   * Angular abortaría el componente: el modal saldría en blanco.
   */
  form = signal<FormGroup>(this.construirForm(null));

  /** Candidatos a padre: activos y distintos de este. */
  posiblesPadres = computed(() =>
    this.catalogos().filter(
      (c) =>
        c.estado === 'Activo' &&
        c.catalogoId !== this.catalogo()?.catalogoId,
    ),
  );

  constructor() {
    effect(() => {
      const _ = this.formKey();
      this.form.set(this.construirForm(this.catalogo()));
    });
  }

  private construirForm(catalogo: ICatalogoVariable | null): FormGroup {
    return this.fb.group({
      codigoExterno: [
        catalogo?.codigoExterno ?? '',
        [Validators.maxLength(50)],
      ],
      descripcionCatalogo: [
        catalogo?.descripcionCatalogo ?? '',
        [Validators.required, Validators.maxLength(150)],
      ],
      catalogoPadreId: [catalogo?.catalogoPadreId ?? null],
      ordenDespliegue: [catalogo?.ordenDespliegue ?? null],
      estado: [catalogo?.estado ?? 'Activo', [Validators.required]],
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
      ...(this.catalogo() ?? {}),
      ...valores,
      scoringId: this.scoringId(),
      // Vacío se manda como null: el código externo es opcional y la unicidad
      // en base es filtrada, así que varios catálogos pueden no tenerlo.
      codigoExterno: valores.codigoExterno?.trim() || null,
      // null, no undefined: es lo que el backend lee como "quítale el padre".
      catalogoPadreId: valores.catalogoPadreId
        ? Number(valores.catalogoPadreId)
        : null,
      ordenDespliegue: valores.ordenDespliegue ?? undefined,
    } as ICatalogoVariable);
  }

  onCancel(): void {
    this.cancel.emit();
  }

  campoInvalido(campo: string): boolean {
    const control = this.form().get(campo);
    return !!control && control.invalid && control.touched;
  }
}
