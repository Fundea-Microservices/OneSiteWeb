import { ChangeDetectionStrategy, Component, effect, EventEmitter, inject, input, Output, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
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
    }));
  }

  onSubmit() {
    this.save.emit({ ...this.regla(), ...this.form().value });
  }

  onCancel() { this.cancel.emit(); }
}
