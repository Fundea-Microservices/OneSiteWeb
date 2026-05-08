import { ChangeDetectionStrategy, Component, effect, EventEmitter, inject, input, Output, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { IPregunta } from '../../../../interfaces/encuesta/encuesta';

export const TIPOS_DATO = ['TEXT', 'NUMBER', 'DATE', 'BOOLEAN', 'SELECT', 'MULTISELECT', 'TEXTAREA', 'FILE'];
export const ORIGENES_TIPO = ['CATALOGO', 'API', 'LISTA_ESTATICA'];

@Component({
  selector: 'app-upsert-pregunta',
  imports: [ReactiveFormsModule],
  templateUrl: './upsert-pregunta.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpsertPreguntaComponent {
  private fb = inject(FormBuilder);

  readonly tiposDato = TIPOS_DATO;
  readonly origenesTipo = ORIGENES_TIPO;

  pregunta = input<IPregunta>({ idSeccion: 0, etiqueta: '', tipoDato: 'TEXT', orden: 1 });
  nuevo = input<boolean>(true);
  formKey = input<number>(0);

  @Output() save = new EventEmitter<IPregunta>();
  @Output() cancel = new EventEmitter<void>();

  form = signal<FormGroup>(this.fb.group({}));

  constructor() {
    effect(() => {
      const _ = this.formKey();
      this.initForm(this.pregunta(), this.nuevo());
    });
  }

  private initForm(preg: IPregunta, isNuevo: boolean) {
    const g = this.fb.group({
      etiqueta: [preg.etiqueta, [Validators.required]],
      tipoDato: [preg.tipoDato, [Validators.required, Validators.maxLength(50)]],
      orden: [preg.orden, [Validators.required, Validators.min(1)]],
      idMatrizPadre: [preg.idMatrizPadre ?? null],
      origenDatosTipo: [preg.origenDatosTipo ?? null, [Validators.maxLength(50)]],
      origenDatosCmd: [preg.origenDatosCmd ?? null, [Validators.maxLength(255)]],
      esEditable: [preg.esEditable ?? true],
      esVisibleDefault: [preg.esVisibleDefault ?? true],
    });
    if (isNuevo) g.reset({ etiqueta: '', tipoDato: 'TEXT', orden: 1, idMatrizPadre: null, origenDatosTipo: null, origenDatosCmd: null, esEditable: true, esVisibleDefault: true });
    this.form.set(g);
  }

  hasError(field: string, error: string) {
    const c = this.form().get(field);
    return !!(c?.touched && c?.errors?.[error]);
  }

  get tieneOrigen(): boolean {
    const t = this.form().get('tipoDato')?.value;
    return t === 'SELECT' || t === 'MULTISELECT';
  }

  get btnText() { return this.nuevo() ? 'Crear pregunta' : 'Actualizar pregunta'; }

  onSubmit() {
    this.form().markAllAsTouched();
    if (!this.form().valid) return;
    this.save.emit({ ...this.pregunta(), ...this.form().value });
  }

  onCancel() { this.cancel.emit(); }
}
