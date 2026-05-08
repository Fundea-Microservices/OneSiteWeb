import { ChangeDetectionStrategy, Component, effect, EventEmitter, inject, input, Output, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ISeccion } from '../../../../interfaces/encuesta/encuesta';

@Component({
  selector: 'app-upsert-seccion',
  imports: [ReactiveFormsModule],
  templateUrl: './upsert-seccion.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpsertSeccionComponent {
  private fb = inject(FormBuilder);

  seccion = input<ISeccion>({ idEncuesta: 0, titulo: '', orden: 1, esVisibleDefault: true });
  nuevo = input<boolean>(true);
  formKey = input<number>(0);

  @Output() save = new EventEmitter<ISeccion>();
  @Output() cancel = new EventEmitter<void>();

  form = signal<FormGroup>(this.fb.group({}));

  constructor() {
    effect(() => {
      const _ = this.formKey();
      this.initForm(this.seccion(), this.nuevo());
    });
  }

  private initForm(sec: ISeccion, isNuevo: boolean) {
    const g = this.fb.group({
      titulo: [sec.titulo, [Validators.required, Validators.maxLength(255)]],
      orden: [sec.orden, [Validators.required, Validators.min(1)]],
      esVisibleDefault: [sec.esVisibleDefault ?? true],
    });
    if (isNuevo) g.reset({ titulo: '', orden: 1, esVisibleDefault: true });
    this.form.set(g);
  }

  hasError(field: string, error: string) {
    const c = this.form().get(field);
    return !!(c?.touched && c?.errors?.[error]);
  }

  get btnText() { return this.nuevo() ? 'Crear sección' : 'Actualizar sección'; }

  onSubmit() {
    this.form().markAllAsTouched();
    if (!this.form().valid) return;
    this.save.emit({ ...this.seccion(), ...this.form().value });
  }

  onCancel() { this.cancel.emit(); }
}
