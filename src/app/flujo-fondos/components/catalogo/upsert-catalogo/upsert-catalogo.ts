import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
  computed,
  inject,
  input,
  effect,
  signal,
  untracked
} from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ICatalogo, ICatalogoCreate, ICatalogoUpdate } from '../../../../../interfaces/catalogo';
import { CatalogoService } from '../../../../../services/flujo-fondos/catalogo.service';

@Component({
  selector: 'app-upsert-catalogo',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './upsert-catalogo.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpsertCatalogoComponent {
  fb = inject(FormBuilder);
  catalogoService = inject(CatalogoService);

  catalogo = input<ICatalogo | null>(null);
  nuevo = input<boolean>(true);
  formKey = input<number>(0);

  @Output() save = new EventEmitter<ICatalogoCreate | ICatalogoUpdate>();
  @Output() cancel = new EventEmitter<void>();

  form = signal<FormGroup>(this.fb.group({}));
  catalogos = signal<ICatalogo[]>([]);

  // Un catálogo no puede depender de sí mismo
  catalogosPadre = computed(() => {
    const id = this.catalogo()?.id;
    return this.catalogos().filter(c => c.id !== id);
  });

  constructor() {
    effect(() => {
      this.formKey();
      const isNuevo = this.nuevo();
      const catalogo = this.catalogo();

      const newForm = this.fb.group({
        codigo: [{ value: isNuevo ? '' : catalogo?.codigo ?? '', disabled: !isNuevo }, [Validators.required, Validators.maxLength(50)]],
        codigoExterno: [isNuevo ? '' : catalogo?.codigoExterno ?? '', [Validators.required, Validators.maxLength(50)]],
        nombre: [isNuevo ? '' : catalogo?.nombre ?? '', [Validators.required, Validators.maxLength(200)]],
        catalogoPadreId: [isNuevo ? '' : catalogo?.catalogoPadreId ?? ''],
        activo: [isNuevo ? true : catalogo?.activo ?? true],
      });

      this.form.set(newForm);
      untracked(() => this.loadCatalogos());
    });
  }

  private async loadCatalogos() {
    const resp = await this.catalogoService.getCatalogos({ all: true });
    this.catalogos.set(resp?.data.catalogos ?? []);
  }

  get btnText(): string {
    return this.nuevo() ? 'Crear Catálogo' : 'Actualizar Catálogo';
  }

  hasError(field: string, error: string): boolean {
    const ctrl = this.form().get(field);
    return !!(ctrl?.touched && ctrl?.errors?.[error]);
  }

  onSubmit() {
    this.form().markAllAsTouched();
    if (!this.form().valid) return;

    // form.value excluye `codigo` en edición (control deshabilitado): el código no se puede cambiar
    const { codigo, codigoExterno, nombre, catalogoPadreId, activo } = this.form().value;
    const base = {
      codigoExterno: codigoExterno.trim(),
      nombre: nombre.trim(),
      catalogoPadreId: catalogoPadreId || null,
      activo,
    };

    if (this.nuevo()) {
      this.save.emit({ ...base, codigo: codigo.trim() });
    } else {
      this.save.emit({ ...base, id: this.catalogo()!.id });
    }
  }

  onCancel() {
    this.cancel.emit();
  }
}
