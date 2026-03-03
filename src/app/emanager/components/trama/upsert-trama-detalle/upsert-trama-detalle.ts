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
import { ITramaDetalle, TipoTrama, TipoRespuesta, TipoInput } from '../../../../../interfaces/emanager/getion';

export interface TramaDetalleValidationRules {
  tramaId?: any[];
  codigo?: any[];
  valor?: any[];
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
  selector: 'app-upsert-trama-detalle',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './upsert-trama-detalle.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpsertTramaDetalleComponent {
  fb = inject(FormBuilder);

  tramaDetalle = input<ITramaDetalle>({
    detalleId: '',
    tramaId: '',
    codigo: undefined,
    codigoInterno: undefined,
    valor: undefined,
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

  validationRules: TramaDetalleValidationRules = {
    tramaId: [Validators.required],
    codigo: [Validators.min(0)],
    valor: [Validators.maxLength(100)],
    tag: [Validators.maxLength(100)],
    nombreInput: [Validators.maxLength(100)],
    tipo: [Validators.required],
    tipoRespuesta: [Validators.required],
    tipoInput: [Validators.required],
    orden: [Validators.required, Validators.min(0)],
  };

  @Output() save = new EventEmitter<ITramaDetalle>();
  @Output() cancel = new EventEmitter<void>();

  form = signal<FormGroup>(this.fb.group({}));

  constructor() {
    effect(() => {
      const isNuevo = this.nuevo();
      const tramaDetalle = this.tramaDetalle();

      const newForm = this.fb.group({
        tramaId: [tramaDetalle.tramaId, this.validationRules.tramaId],
        codigo: [tramaDetalle.codigo, this.validationRules.codigo],
        codigoInterno: [tramaDetalle.codigoInterno],
        valor: [tramaDetalle.valor, this.validationRules.valor],
        tag: [tramaDetalle.tag, this.validationRules.tag],
        nombreInput: [tramaDetalle.nombreInput, this.validationRules.nombreInput],
        catalogoHijo: [tramaDetalle.catalogoHijo],
        catalogo: [tramaDetalle.catalogo],
        procedimiento: [tramaDetalle.procedimiento],
        tipo: [tramaDetalle.tipo, this.validationRules.tipo],
        codigoParametro: [tramaDetalle.codigoParametro],
        tipoRespuesta: [tramaDetalle.tipoRespuesta, this.validationRules.tipoRespuesta],
        tipoInput: [tramaDetalle.tipoInput, this.validationRules.tipoInput],
        opciones: [tramaDetalle.opciones],
        valorDefecto: [tramaDetalle.valorDefecto],
        obligatorio: [tramaDetalle.obligatorio],
        orden: [tramaDetalle.orden, this.validationRules.orden],
        visible: [tramaDetalle.visible],
        activo: [tramaDetalle.activo],
      });

      if (isNuevo) {
        newForm.reset({
          tramaId: tramaDetalle.tramaId,
          codigo: undefined,
          codigoInterno: undefined,
          valor: '',
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
          orden: tramaDetalle.orden,
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
      const value: ITramaDetalle = {
        ...this.tramaDetalle(),
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
