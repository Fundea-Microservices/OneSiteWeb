import { ChangeDetectionStrategy, Component, effect, EventEmitter, inject, input, Output, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { IRegla } from '../../../../interfaces/encuesta/encuesta';

@Component({
  selector: 'app-upsert-regla',
  imports: [ReactiveFormsModule],
  templateUrl: './upsert-regla.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpsertReglaComponent {
  private fb = inject(FormBuilder);

  regla = input<IRegla>({ idPregunta: 0 });
  formKey = input<number>(0);

  @Output() save = new EventEmitter<IRegla>();
  @Output() cancel = new EventEmitter<void>();

  form = signal<FormGroup>(this.fb.group({}));

  constructor() {
    effect(() => {
      const _ = this.formKey();
      this.initForm(this.regla());
    });
  }

  private initForm(regla: IRegla) {
    this.form.set(this.fb.group({
      sintaxisCalculo: [regla.sintaxisCalculo ?? null],
      reglaValidacion: [regla.reglaValidacion ?? null],
      reglaVisibilidad: [regla.reglaVisibilidad ?? null],
      mensajeError: [regla.mensajeError ?? null, [Validators.maxLength(500)]],
      mensajeNotificacion: [regla.mensajeNotificacion ?? null, [Validators.maxLength(500)]],
    }));
  }

  hasError(field: string, error: string): boolean {
    const ctrl = this.form().get(field);
    return !!(ctrl?.touched && ctrl?.errors?.[error]);
  }

  largo(field: string): number {
    return (this.form().get(field)?.value ?? '').length;
  }

  onSubmit() {
    this.form().markAllAsTouched();
    if (!this.form().valid) return;

    const { mensajeError, mensajeNotificacion, ...resto } = this.form().value;
    this.save.emit({
      ...this.regla(),
      ...resto,
      mensajeError: mensajeError?.trim() || null,
      mensajeNotificacion: mensajeNotificacion?.trim() || null,
    });
  }

  onCancel() { this.cancel.emit(); }
}
