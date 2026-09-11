import {
  ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, effect,
  EventEmitter, inject, input, Output, signal,
} from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  IEmpresaEx,
  IEmpresaExUpsert,
} from '../../../../interfaces/onesiteex-auth/onesiteex-auth';

@Component({
  selector: 'app-upsert-empresa-ex',
  imports: [ReactiveFormsModule],
  templateUrl: './upsert-empresa-ex.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class UpsertEmpresaExComponent {
  private fb = inject(FormBuilder);

  empresa = input<IEmpresaEx | null>(null);
  nuevo = input<boolean>(true);
  formKey = input<number>(0);

  @Output() save = new EventEmitter<IEmpresaExUpsert>();
  @Output() cancel = new EventEmitter<void>();

  form = signal<FormGroup>(this.fb.group({}));

  constructor() {
    effect(() => {
      const _ = this.formKey();
      this.initForm(this.empresa(), this.nuevo());
    });
  }

  private initForm(emp: IEmpresaEx | null, isNuevo: boolean) {
    this.form.set(this.fb.group({
      nombreEmpresa: [isNuevo ? '' : emp?.nombreEmpresa ?? '', [Validators.required, Validators.maxLength(100)]],
      codigoEnrolamiento: [isNuevo ? '' : emp?.codigoEnrolamiento ?? '', [Validators.required, Validators.maxLength(50)]],
      codigo: [isNuevo ? '' : emp?.codigo ?? '', [Validators.maxLength(20)]],
      estado: [isNuevo ? true : emp?.estado ?? true],
    }));
  }

  hasError(field: string, error: string) {
    const c = this.form().get(field);
    return !!(c?.touched && c?.errors?.[error]);
  }

  get btnText() { return this.nuevo() ? 'Crear empresa' : 'Actualizar empresa'; }

  onSubmit() {
    this.form().markAllAsTouched();
    if (!this.form().valid) return;

    const v = this.form().value;
    const payload: IEmpresaExUpsert = {
      nombreEmpresa: v.nombreEmpresa?.trim(),
      codigoEnrolamiento: v.codigoEnrolamiento?.trim(),
      codigo: v.codigo?.trim() || null,
      estado: !!v.estado,
    };
    if (!this.nuevo()) payload.idEmpresa = this.empresa()?.idEmpresa;

    this.save.emit(payload);
  }

  onCancel() { this.cancel.emit(); }
}
