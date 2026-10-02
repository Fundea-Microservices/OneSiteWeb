import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
  computed,
  inject,
  input,
  effect,
  signal
} from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ICatalogo, ICatalogoOpcion, IOpcionCreate, IOpcionUpdate } from '../../../../../interfaces/catalogo';

@Component({
  selector: 'app-upsert-opcion',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './upsert-opcion.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpsertOpcionComponent {
  fb = inject(FormBuilder);

  catalogo = input<ICatalogo | null>(null);
  opcion = input<ICatalogoOpcion | null>(null);
  nuevo = input<boolean>(true);
  formKey = input<number>(0);
  // Opciones del catálogo padre (solo si el catálogo depende de otro)
  opcionesPadre = input<ICatalogoOpcion[]>([]);

  @Output() save = new EventEmitter<IOpcionCreate | IOpcionUpdate>();
  @Output() cancel = new EventEmitter<void>();

  form = signal<FormGroup>(this.fb.group({}));

  requierePadre = computed(() => !!this.catalogo()?.catalogoPadreId);

  // Activas, más la que ya tenga asignada la opción aunque esté inactiva
  opcionesPadreSelect = computed(() => {
    const actual = this.opcion()?.padreId;
    return this.opcionesPadre().filter(o => o.activo || o.id === actual);
  });

  constructor() {
    effect(() => {
      this.formKey();
      const isNuevo = this.nuevo();
      const opcion = this.opcion();
      const requierePadre = this.requierePadre();

      const newForm = this.fb.group({
        codigo: [{ value: isNuevo ? '' : opcion?.codigo ?? '', disabled: !isNuevo }, [Validators.required, Validators.maxLength(50)]],
        nombre: [isNuevo ? '' : opcion?.nombre ?? '', [Validators.required, Validators.maxLength(150)]],
        padreId: [isNuevo ? '' : opcion?.padreId ?? '', requierePadre ? [Validators.required] : []],
        orden: [isNuevo ? 0 : opcion?.orden ?? 0, [Validators.min(0)]],
        porDefecto: [isNuevo ? false : opcion?.porDefecto ?? false],
        activo: [isNuevo ? true : opcion?.activo ?? true],
      });

      this.form.set(newForm);
    });
  }

  get btnText(): string {
    return this.nuevo() ? 'Crear Opción' : 'Actualizar Opción';
  }

  hasError(field: string, error: string): boolean {
    const ctrl = this.form().get(field);
    return !!(ctrl?.touched && ctrl?.errors?.[error]);
  }

  onSubmit() {
    this.form().markAllAsTouched();
    if (!this.form().valid) return;

    // form.value excluye `codigo` en edición (control deshabilitado): el código no se puede cambiar
    const { codigo, nombre, padreId, orden, porDefecto, activo } = this.form().value;
    const base = {
      nombre: nombre.trim(),
      // Si el catálogo no depende de otro, la opción no lleva padre
      padreId: this.requierePadre() ? padreId : null,
      orden: Number(orden) || 0,
      porDefecto,
      activo,
    };

    if (this.nuevo()) {
      this.save.emit({ ...base, catalogoId: this.catalogo()!.id, codigo: codigo.trim() });
    } else {
      this.save.emit({ ...base, id: this.opcion()!.id });
    }
  }

  onCancel() {
    this.cancel.emit();
  }
}
