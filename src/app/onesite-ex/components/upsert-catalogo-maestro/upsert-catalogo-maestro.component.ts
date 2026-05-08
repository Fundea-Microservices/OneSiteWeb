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
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ICatalogoMaestro } from '../../../../interfaces/catalogo-maestro/catalogo-maestro';

export interface CatalogPreset {
  nombre: string;
  codigo: string;
}

@Component({
  selector: 'app-upsert-catalogo-maestro',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './upsert-catalogo-maestro.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpsertCatalogoMaestroComponent {
  private fb = inject(FormBuilder);

  readonly catalogoPresets: CatalogPreset[] = [
    { nombre: 'Departamento',     codigo: 'D'   },
    { nombre: 'Municipio',        codigo: 'M'   },
    { nombre: 'Tipo Crédito',     codigo: 'TC'  },
    { nombre: 'Tipo Cliente',     codigo: 'TCL' },
    { nombre: 'Estado Civil',     codigo: 'EC'  },
    { nombre: 'Género',           codigo: 'GEN' },
    { nombre: 'Moneda',           codigo: 'MON' },
    { nombre: 'País',             codigo: 'P'   },
  ];

  catalogo = input<ICatalogoMaestro>({
    nombreCatalogo: '',
    codigoOpcion: '',
    valorOpcion: '',
    idPadreOpcion: null,
  });

  nuevo = input<boolean>(true);
  formKey = input<number>(0);

  @Output() save = new EventEmitter<ICatalogoMaestro>();
  @Output() cancel = new EventEmitter<void>();

  form = signal<FormGroup>(this.fb.group({}));

  constructor() {
    effect(() => {
      const _ = this.formKey();
      const cat = this.catalogo();
      const isNuevo = this.nuevo();
      this.initForm(cat, isNuevo);
    });
  }

  private initForm(cat: ICatalogoMaestro, isNuevo: boolean) {
    const newForm = this.fb.group({
      nombreCatalogo: [cat.nombreCatalogo, [Validators.required, Validators.maxLength(100)]],
      codigoOpcion: [cat.codigoOpcion, [Validators.required, Validators.maxLength(50)]],
      valorOpcion: [cat.valorOpcion, [Validators.required]],
      idPadreOpcion: [cat.idPadreOpcion ?? null, [Validators.maxLength(50)]],
    });

    if (isNuevo) {
      newForm.reset({
        nombreCatalogo: '',
        codigoOpcion: '',
        valorOpcion: '',
        idPadreOpcion: null,
      });
    }

    this.form.set(newForm);
  }

  get btnText(): string {
    return this.nuevo() ? 'Crear catálogo' : 'Actualizar catálogo';
  }

  /** Called when the user picks or types a value in the nombreCatalogo input */
  onNombreChange(value: string) {
    this.form().get('nombreCatalogo')?.setValue(value);
    const preset = this.catalogoPresets.find(
      (p) => p.nombre.toLowerCase() === value.trim().toLowerCase()
    );
    if (preset) {
      // Only auto-fill codigo when the field is empty (don't overwrite user edits)
      const codigoCtrl = this.form().get('codigoOpcion');
      if (!codigoCtrl?.value) {
        codigoCtrl?.setValue(preset.codigo);
      }
    }
  }

  hasError(field: string, error: string): boolean {
    const ctrl = this.form().get(field);
    return !!(ctrl?.touched && ctrl?.errors?.[error]);
  }

  onSubmit() {
    this.form().markAllAsTouched();
    if (!this.form().valid) return;

    const value: ICatalogoMaestro = {
      ...this.catalogo(),
      ...this.form().value,
    };
    this.save.emit(value);
  }

  onCancel() {
    this.cancel.emit();
  }
}
