import {
  ChangeDetectionStrategy,
  Component,
  effect,
  EventEmitter,
  inject,
  input,
  OnInit,
  Output,
  signal,
} from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ICatalogo, ICatalogoOpcion } from '../../../../interfaces/catalogo-maestro/catalogo-maestro';
import { CatalogoService } from '../../../../services/config/catalogo-maestro.service';
import { CatalogoOpcionService } from '../../../../services/config/catalogo-opcion.service';

@Component({
  selector: 'app-upsert-catalogo-opcion',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './upsert-catalogo-opcion.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpsertCatalogoOpcionComponent implements OnInit {
  private fb = inject(FormBuilder);
  private catalogoService = inject(CatalogoService);
  private opcionService = inject(CatalogoOpcionService);

  opcion = input<ICatalogoOpcion>({
    id: '',
    idCatalogo: '',
    nombre: '',
    codigo: '',
    orden: 0,
    activo: true,
    porDefecto: false,
    idPadre: null,
  });

  nuevo = input<boolean>(true);
  formKey = input<number>(0);

  @Output() save = new EventEmitter<ICatalogoOpcion>();
  @Output() cancel = new EventEmitter<void>();

  form = signal<FormGroup>(this.fb.group({}));
  catalogosPadre = signal<ICatalogo[]>([]);
  opcionesPadre = signal<ICatalogoOpcion[]>([]);
  catalogoPadreId = signal<string>('');
  cargandoOpciones = signal(false);

  constructor() {
    effect(() => {
      const _ = this.formKey();
      const op = this.opcion();
      const isNuevo = this.nuevo();
      this.initForm(op, isNuevo);
      if (!isNuevo && op.idPadre) {
        this.preSelectCatalogoPadre(op.idPadre);
      } else {
        this.catalogoPadreId.set('');
        this.opcionesPadre.set([]);
      }
    });
  }

  ngOnInit() {
    this.loadCatalogos();
  }

  private async loadCatalogos() {
    const resp = await this.catalogoService.getCatalogos({ all: true });
    this.catalogosPadre.set(resp?.data ?? []);
  }

  private async preSelectCatalogoPadre(idPadre: string) {
    const resp = await this.opcionService.getOpcionById(idPadre);
    if (resp?.data) {
      const idCatalogo = resp.data.idCatalogo;
      this.catalogoPadreId.set(idCatalogo);
      const opResp = await this.opcionService.getOpciones({ idCatalogo, all: true });
      this.opcionesPadre.set(opResp?.data ?? []);
    }
  }

  async onCatalogoPadreChange(catalogoId: string) {
    this.catalogoPadreId.set(catalogoId);
    this.form().get('idPadre')?.setValue('');
    if (!catalogoId) {
      this.opcionesPadre.set([]);
      return;
    }
    this.cargandoOpciones.set(true);
    const resp = await this.opcionService.getOpciones({ idCatalogo: catalogoId, all: true });
    this.opcionesPadre.set(resp?.data ?? []);
    this.cargandoOpciones.set(false);
  }

  private initForm(op: ICatalogoOpcion, isNuevo: boolean) {
    const newForm = this.fb.group({
      nombre: [isNuevo ? '' : op.nombre, [Validators.required, Validators.maxLength(150)]],
      codigo: [isNuevo ? '' : op.codigo, [Validators.required, Validators.maxLength(15)]],
      orden: [isNuevo ? 0 : (op.orden ?? 0), [Validators.min(0)]],
      activo: [isNuevo ? true : op.activo],
      porDefecto: [isNuevo ? false : op.porDefecto],
      idPadre: [isNuevo ? '' : (op.idPadre ?? '')],
    });
    this.form.set(newForm);
  }

  get btnText(): string {
    return this.nuevo() ? 'Crear opción' : 'Actualizar opción';
  }

  hasError(field: string, error: string): boolean {
    const ctrl = this.form().get(field);
    return !!(ctrl?.touched && ctrl?.errors?.[error]);
  }

  onSubmit() {
    this.form().markAllAsTouched();
    if (!this.form().valid) return;

    const formValue = { ...this.form().value };
    if (!formValue.idPadre) formValue.idPadre = null;

    const value: ICatalogoOpcion = {
      ...this.opcion(),
      ...formValue,
    };
    this.save.emit(value);
  }

  onCancel() {
    this.cancel.emit();
  }
}
