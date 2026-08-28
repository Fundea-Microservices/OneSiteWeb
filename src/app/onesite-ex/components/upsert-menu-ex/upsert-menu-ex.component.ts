import {
  ChangeDetectionStrategy, Component, computed, CUSTOM_ELEMENTS_SCHEMA, effect,
  EventEmitter, inject, input, Output, signal,
} from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { IMenuEx, IMenuExUpsert, IRolEx } from '../../../../interfaces/onesiteex-auth/onesiteex-auth';

@Component({
  selector: 'app-upsert-menu-ex',
  imports: [ReactiveFormsModule],
  templateUrl: './upsert-menu-ex.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class UpsertMenuExComponent {
  private fb = inject(FormBuilder);

  menu = input<IMenuEx | null>(null);
  menus = input<IMenuEx[]>([]);
  roles = input<IRolEx[]>([]);
  nuevo = input<boolean>(true);
  formKey = input<number>(0);

  @Output() save = new EventEmitter<IMenuExUpsert>();
  @Output() cancel = new EventEmitter<void>();

  form = signal<FormGroup>(this.fb.group({}));

  // Posibles padres: todos los menús menos el propio (no puede ser su propio padre).
  padresDisponibles = computed(() => {
    const actual = this.menu()?.idMenu;
    return this.menus().filter(m => m.idMenu !== actual);
  });

  constructor() {
    effect(() => {
      const _ = this.formKey();
      this.initForm(this.menu(), this.nuevo());
    });
  }

  private initForm(menu: IMenuEx | null, isNuevo: boolean) {
    this.form.set(this.fb.group({
      nombre: [isNuevo ? '' : menu?.nombre ?? '', [Validators.required, Validators.maxLength(100)]],
      rutaPantalla: [isNuevo ? '' : menu?.rutaPantalla ?? '', [Validators.required, Validators.maxLength(150)]],
      icono: [isNuevo ? '' : menu?.icono ?? ''],
      idPadre: [isNuevo ? null : menu?.idPadre ?? null],
      idPermisoRequerido: [isNuevo ? null : menu?.idPermisoRequerido ?? null],
      orden: [isNuevo ? null : menu?.orden ?? null],
      estado: [isNuevo ? true : menu?.estado ?? true],
    }));
  }

  hasError(field: string, error: string) {
    const c = this.form().get(field);
    return !!(c?.touched && c?.errors?.[error]);
  }

  get btnText() { return this.nuevo() ? 'Crear ítem' : 'Actualizar ítem'; }

  onSubmit() {
    this.form().markAllAsTouched();
    if (!this.form().valid) return;

    const v = this.form().value;
    const payload: IMenuExUpsert = {
      nombre: v.nombre?.trim(),
      rutaPantalla: v.rutaPantalla?.trim(),
      icono: v.icono?.trim() || null,
      idPadre: v.idPadre != null ? Number(v.idPadre) : null,
      idPermisoRequerido: v.idPermisoRequerido != null ? Number(v.idPermisoRequerido) : null,
      orden: v.orden != null && v.orden !== '' ? Number(v.orden) : null,
      estado: !!v.estado,
    };
    if (!this.nuevo()) payload.idMenu = this.menu()?.idMenu;

    this.save.emit(payload);
  }

  onCancel() { this.cancel.emit(); }
}
