import {
  ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, effect,
  EventEmitter, inject, input, Output, signal,
} from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  IEmpresaEx,
  IRolEx,
  IUsuarioEx,
  IUsuarioExUpsert,
} from '../../../../interfaces/onesiteex-auth/onesiteex-auth';

@Component({
  selector: 'app-upsert-usuario-ex',
  imports: [ReactiveFormsModule],
  templateUrl: './upsert-usuario-ex.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class UpsertUsuarioExComponent {
  private fb = inject(FormBuilder);

  usuario = input<IUsuarioEx | null>(null);
  empresas = input<IEmpresaEx[]>([]);
  roles = input<IRolEx[]>([]);
  nuevo = input<boolean>(true);
  formKey = input<number>(0);

  @Output() save = new EventEmitter<IUsuarioExUpsert>();
  @Output() cancel = new EventEmitter<void>();

  form = signal<FormGroup>(this.fb.group({}));
  verPassword = signal(false);

  constructor() {
    effect(() => {
      const _ = this.formKey();
      this.initForm(this.usuario(), this.nuevo());
    });
  }

  private initForm(usr: IUsuarioEx | null, isNuevo: boolean) {
    // En edición la contraseña es opcional: solo se envía si el usuario escribe una nueva.
    const passwordValidators = isNuevo
      ? [Validators.required, Validators.minLength(6), Validators.maxLength(72)]
      : [Validators.minLength(6), Validators.maxLength(72)];

    this.verPassword.set(false);
    this.form.set(this.fb.group({
      username: [isNuevo ? '' : usr?.username ?? '', [Validators.required, Validators.maxLength(50)]],
      password: ['', passwordValidators],
      nombreCompleto: [isNuevo ? '' : usr?.nombreCompleto ?? '', [Validators.required, Validators.maxLength(100)]],
      idEmpresa: [isNuevo ? null : usr?.idEmpresa ?? null, [Validators.required]],
      idRol: [isNuevo ? null : usr?.idRol ?? null, [Validators.required]],
      estado: [isNuevo ? true : usr?.estado ?? true],
    }));
  }

  hasError(field: string, error: string) {
    const c = this.form().get(field);
    return !!(c?.touched && c?.errors?.[error]);
  }

  toggleVerPassword() { this.verPassword.update(v => !v); }

  get btnText() { return this.nuevo() ? 'Crear usuario' : 'Actualizar usuario'; }

  onSubmit() {
    this.form().markAllAsTouched();
    if (!this.form().valid) return;

    const v = this.form().value;
    const payload: IUsuarioExUpsert = {
      username: v.username?.trim(),
      nombreCompleto: v.nombreCompleto?.trim(),
      idEmpresa: Number(v.idEmpresa),
      idRol: Number(v.idRol),
      estado: !!v.estado,
    };
    if (v.password) payload.password = v.password;
    // tipoCarga no se edita desde la web: se fija al crear y en edición se deja intacto.
    if (this.nuevo()) payload.tipoCarga = 'Manual';
    else payload.idUsuario = this.usuario()?.idUsuario;

    this.save.emit(payload);
  }

  onCancel() { this.cancel.emit(); }
}
