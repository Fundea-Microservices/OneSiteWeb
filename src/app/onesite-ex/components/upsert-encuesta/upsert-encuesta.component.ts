import { ChangeDetectionStrategy, Component, effect, EventEmitter, inject, input, Output, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { IEncuesta } from '../../../../interfaces/encuesta/encuesta';

@Component({
  selector: 'app-upsert-encuesta',
  imports: [ReactiveFormsModule],
  templateUrl: './upsert-encuesta.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpsertEncuestaComponent {
  private fb = inject(FormBuilder);

  encuesta = input<IEncuesta>({ nombre: '', estado: true });
  nuevo = input<boolean>(true);
  formKey = input<number>(0);

  @Output() save = new EventEmitter<IEncuesta>();
  @Output() cancel = new EventEmitter<void>();

  form = signal<FormGroup>(this.fb.group({}));

  constructor() {
    effect(() => {
      const _ = this.formKey();
      this.initForm(this.encuesta(), this.nuevo());
    });
  }

  private initForm(enc: IEncuesta, isNuevo: boolean) {
    const g = this.fb.group({
      nombre: [enc.nombre, [Validators.required, Validators.maxLength(255)]],
      versionActiva: [enc.versionActiva ?? null],
      estado: [enc.estado ?? true, [Validators.required]],
    });
    if (isNuevo) g.reset({ nombre: '', versionActiva: null, estado: true });
    this.form.set(g);
  }

  hasError(field: string, error: string) {
    const c = this.form().get(field);
    return !!(c?.touched && c?.errors?.[error]);
  }

  get btnText() { return this.nuevo() ? 'Crear encuesta' : 'Actualizar encuesta'; }

  onSubmit() {
    this.form().markAllAsTouched();
    if (!this.form().valid) return;
    this.save.emit({ ...this.encuesta(), ...this.form().value });
  }

  onCancel() { this.cancel.emit(); }
}
