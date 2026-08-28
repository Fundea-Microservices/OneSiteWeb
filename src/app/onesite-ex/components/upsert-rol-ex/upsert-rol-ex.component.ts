import {
  ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, effect,
  EventEmitter, inject, input, Output, signal,
} from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { IRolEx, IRolExUpsert } from '../../../../interfaces/onesiteex-auth/onesiteex-auth';

@Component({
  selector: 'app-upsert-rol-ex',
  imports: [ReactiveFormsModule],
  templateUrl: './upsert-rol-ex.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class UpsertRolExComponent {
  private fb = inject(FormBuilder);

  rol = input<IRolEx | null>(null);
  /** Módulos ya parseados por la página (rolService.parsePermisos). */
  modulosIniciales = input<string[]>([]);
  nuevo = input<boolean>(true);
  formKey = input<number>(0);

  @Output() save = new EventEmitter<IRolExUpsert>();
  @Output() cancel = new EventEmitter<void>();

  form = signal<FormGroup>(this.fb.group({}));

  // Editor de módulos: lista de claves cortas que se serializan como {"modulos":[...]}.
  modulos = signal<string[]>([]);
  nuevoModulo = signal('');

  constructor() {
    effect(() => {
      const _ = this.formKey();
      this.initForm(this.rol(), this.nuevo());
    });
  }

  private initForm(rol: IRolEx | null, isNuevo: boolean) {
    this.modulos.set(isNuevo ? [] : [...this.modulosIniciales()]);
    this.nuevoModulo.set('');
    this.form.set(this.fb.group({
      nombreRol: [isNuevo ? '' : rol?.nombreRol ?? '', [Validators.required, Validators.maxLength(50)]],
      codigo: [isNuevo ? '' : rol?.codigo ?? '', [Validators.maxLength(20)]],
      accesoLectura: [isNuevo ? true : rol?.accesoLectura ?? false],
      accesoEscritura: [isNuevo ? false : rol?.accesoEscritura ?? false],
    }));
  }

  hasError(field: string, error: string) {
    const c = this.form().get(field);
    return !!(c?.touched && c?.errors?.[error]);
  }

  agregarModulo() {
    const value = this.nuevoModulo().trim();
    if (!value) return;
    if (this.modulos().includes(value)) { this.nuevoModulo.set(''); return; }
    this.modulos.update(list => [...list, value]);
    this.nuevoModulo.set('');
  }

  quitarModulo(modulo: string) {
    this.modulos.update(list => list.filter(m => m !== modulo));
  }

  get btnText() { return this.nuevo() ? 'Crear rol' : 'Actualizar rol'; }

  onSubmit() {
    this.form().markAllAsTouched();
    if (!this.form().valid) return;

    const v = this.form().value;
    const payload: IRolExUpsert = {
      nombreRol: v.nombreRol?.trim(),
      codigo: v.codigo?.trim() || null,
      accesoLectura: !!v.accesoLectura,
      accesoEscritura: !!v.accesoEscritura,
      // JSON válido con comillas (trampa §6): {"modulos":[...]}.
      permisosJSON: JSON.stringify({ modulos: this.modulos() }),
    };
    if (!this.nuevo()) payload.idRol = this.rol()?.idRol;

    this.save.emit(payload);
  }

  onCancel() { this.cancel.emit(); }
}
