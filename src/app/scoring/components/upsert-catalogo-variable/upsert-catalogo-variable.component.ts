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
  nuevo = input<boolean>(true);
  formKey = input<number>(0);

  @Output() save = new EventEmitter<ICatalogoVariable>();
  @Output() cancel = new EventEmitter<void>();

  form = signal<FormGroup>(this.fb.group({}));

  constructor() {
    effect(() => {
      const _ = this.formKey();
      this.initForm(this.catalogo());
    });
  }

  private initForm(catalogo: ICatalogoVariable | null): void {
    this.form.set(
      this.fb.group({
        codigoExterno: [
          catalogo?.codigoExterno ?? '',
          [Validators.maxLength(50)],
        ],
        descripcionCatalogo: [
          catalogo?.descripcionCatalogo ?? '',
          [Validators.required, Validators.maxLength(150)],
        ],
        ordenDespliegue: [catalogo?.ordenDespliegue ?? null],
        estado: [catalogo?.estado ?? 'Activo', [Validators.required]],
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
      ...(this.catalogo() ?? {}),
      ...valores,
      scoringId: this.scoringId(),
      // Vacío se manda como null: el código externo es opcional y la unicidad
      // en base es filtrada, así que varios catálogos pueden no tenerlo.
      codigoExterno: valores.codigoExterno?.trim() || null,
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
