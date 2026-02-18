import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
  inject,
  input,
  effect,
  signal
} from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { IEncabezadoDetalle } from '../../../../../interfaces/emanager/encabezado';
import { TipoTrama, TipoRespuesta, TipoInput } from '../../../../../interfaces/emanager/getion';

export interface EncabezadoDetalleValidationRules {
  encabezadoId?: any[];
  codigo?: any[];
  tag?: any[];
  nombreInput?: any[];
  tipo?: any[];
  codigoParametro?: any[];
  tipoRespuesta?: any[];
  tipoInput?: any[];
  opciones?: any[];
  valorDefecto?: any[];
  orden?: any[];
}

@Component({
  selector: 'app-upsert-encabezado-detalle',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './upsert-encabezado-detalle.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpsertEncabezadoDetalleComponent {
  fb = inject(FormBuilder);

  encabezadoDetalle = input<IEncabezadoDetalle>({
    detalleId: '',
    encabezadoId: '',
    codigo: undefined,
    tag: undefined,
    nombreInput: undefined,
    catalogo: undefined,
    catalogoHijo: undefined,
    procedimiento: undefined,
    tipo: 'CLIENTE',
    codigoParametro: undefined,
    tipoRespuesta: 'TEXT',
    tipoInput: 'TEXT',
    opciones: undefined,
    valorDefecto: undefined,
    obligatorio: false,
    orden: 0,
    visible: true,
    activo: true,
  });

  nuevo = input<boolean>(true);

  // Opciones para los selects
  tipoOptions: TipoTrama[] = ['CLIENTE', 'PARAMETRO'];
  tipoRespuestaOptions: TipoRespuesta[] = ['TEXT', 'NUMBER', 'DATE', 'BOOLEAN', 'FILE'];
  tipoInputOptions: TipoInput[] = ['TEXT', 'NUMBER', 'DATE', 'SELECT', 'EMAIL', 'SWITCH', 'FILE'];

  validationRules: EncabezadoDetalleValidationRules = {
    encabezadoId: [Validators.required],
    codigo: [Validators.min(0)],
    tag: [Validators.maxLength(100)],
    nombreInput: [Validators.maxLength(100)],
    tipo: [Validators.required],
    tipoRespuesta: [Validators.required],
    tipoInput: [Validators.required],
    orden: [Validators.required, Validators.min(0)],
  };

  @Output() save = new EventEmitter<IEncabezadoDetalle>();
  @Output() cancel = new EventEmitter<void>();

  form = signal<FormGroup>(this.fb.group({}));

  constructor() {
    effect(() => {
      const isNuevo = this.nuevo();
      const encabezadoDetalle = this.encabezadoDetalle();

      const newForm = this.fb.group({
        encabezadoId: [encabezadoDetalle.encabezadoId, this.validationRules.encabezadoId],
        codigo: [encabezadoDetalle.codigo, this.validationRules.codigo],
        tag: [encabezadoDetalle.tag, this.validationRules.tag],
        nombreInput: [encabezadoDetalle.nombreInput, this.validationRules.nombreInput],
        catalogoHijo: [encabezadoDetalle.catalogoHijo],
        catalogo: [encabezadoDetalle.catalogo],
        procedimiento: [encabezadoDetalle.procedimiento],
        tipo: [encabezadoDetalle.tipo, this.validationRules.tipo],
        codigoParametro: [encabezadoDetalle.codigoParametro],
        tipoRespuesta: [encabezadoDetalle.tipoRespuesta, this.validationRules.tipoRespuesta],
        tipoInput: [encabezadoDetalle.tipoInput, this.validationRules.tipoInput],
        opciones: [encabezadoDetalle.opciones],
        valorDefecto: [encabezadoDetalle.valorDefecto],
        obligatorio: [encabezadoDetalle.obligatorio],
        orden: [encabezadoDetalle.orden, this.validationRules.orden],
        visible: [encabezadoDetalle.visible],
        activo: [encabezadoDetalle.activo],
      });

      if (isNuevo) {
        newForm.reset({
          encabezadoId: encabezadoDetalle.encabezadoId,
          codigo: undefined,
          tag: '',
          nombreInput: '',
          catalogo: '',
          catalogoHijo: '',
          procedimiento: '',
          tipo: 'CLIENTE',
          codigoParametro: undefined,
          tipoRespuesta: 'TEXT',
          tipoInput: 'TEXT',
          opciones: '',
          valorDefecto: '',
          obligatorio: false,
          orden: encabezadoDetalle.orden,
          visible: true,
          activo: true,
        });
      }

      const toggleSelectFields = (tipoInput: TipoInput | null | undefined) => {
        const catalogoControl = newForm.get('catalogo');
        const procedimientoControl = newForm.get('procedimiento');

        if (!catalogoControl || !procedimientoControl) return;

        if (tipoInput === 'SELECT') {
          catalogoControl.enable({ emitEvent: false });
          procedimientoControl.enable({ emitEvent: false });
        } else {
          catalogoControl.reset('', { emitEvent: false });
          procedimientoControl.reset('', { emitEvent: false });
          catalogoControl.disable({ emitEvent: false });
          procedimientoControl.disable({ emitEvent: false });
        }
      };

      toggleSelectFields(newForm.get('tipoInput')?.value as TipoInput | null | undefined);
      newForm.get('tipoInput')?.valueChanges.subscribe((value) => {
        toggleSelectFields(value as TipoInput | null | undefined);
      });

      this.form.set(newForm);
    });
  }

  get btnText(): string {
    return this.nuevo() ? 'Crear Detalle' : 'Actualizar Detalle';
  }

  onSubmit() {
    if (this.form().valid) {
      const formValue = this.form().value;
      const value: IEncabezadoDetalle = {
        ...this.encabezadoDetalle(),
        ...formValue,
        codigo: formValue.codigo ? Number(formValue.codigo) : undefined,
        orden: Number(formValue.orden ?? 0),
        codigoParametro: formValue.codigoParametro ? Number(formValue.codigoParametro) : undefined,
      };
      this.save.emit(value);
    }
  }

  onCancel() {
    this.cancel.emit();
  }
}
