import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  DestroyRef,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormulariosService } from '../../../../../services/config/formularios.service';
import {
  FormEncabezado,
  FormEncabezadoCompleto,
  FormPregunta,
  FormSeccion,
  TipoPregunta,
} from '../../../../../interfaces/configuracion';

export interface FormRespuesta {
  tipo: TipoPregunta;
  nombre: string;
  valor: string;
  preguntaId?: string;
}

@Component({
  selector: 'app-render-formulario',
  imports: [ReactiveFormsModule],
  templateUrl: './render-formulario.component.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class RenderFormularioComponent implements OnInit {
  private service = inject(FormulariosService);
  private destroyRef = inject(DestroyRef);

  encabezadoId = input.required<string>();
  valoresIniciales = input<{ preguntaId: string; valor: string }[]>([]);
  /** Tipos de pregunta en los que se ignorará el validador 'obligatorio'. Por defecto: ['FILE'] */
  ignorarObligatorioEnTipos = input<TipoPregunta[]>(['FILE']);

  listado = output<FormRespuesta[]>();
  valido = output<boolean>();
  mensaje = output<string>();

  isLoading = signal(true);
  formReady = signal(false);
  encabezado = signal<FormEncabezado | null>(null);
  secciones = signal<FormSeccion[]>([]);
  activeTab = signal<string>('');

  form = new FormGroup({});

  async ngOnInit() {
    const id = this.encabezadoId();
    try {
      // Una sola llamada al endpoint que ya trae secciones + preguntas embebidas
      const resp = await this.service.getFormCompleto(id);
      if (resp?.data) {
        const full: FormEncabezadoCompleto = resp.data;
        this.encabezado.set(full);

        const seccionesList: FormSeccion[] = (full.secciones ?? [])
          .filter(s => s.activo)
          .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
          .map(s => ({
            ...s,
            preguntas: (s.preguntas ?? [])
              .filter(p => p.activo)
              .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)),
          }));

        this.secciones.set(seccionesList);
        this.buildForm(seccionesList);
        this.formReady.set(true);

        this.form.valueChanges
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe(() => this.emitOutputs());
        this.emitOutputs();

        if (seccionesList.length > 0) {
          this.activeTab.set(seccionesList[0].seccionId!);
        }
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  private buildForm(secciones: FormSeccion[]) {
    // Construir mapa de valores guardados (case-insensitive por si los UUIDs vienen con distinto casing)
    const savedValues = this.valoresIniciales() ?? [];
    const valorMap = new Map<string, string>(
      savedValues.map(v => [v.preguntaId.toLowerCase(), v.valor])
    );

    secciones.forEach(seccion => {
      (seccion.preguntas ?? []).forEach(pregunta => {
        if (!pregunta.preguntaId) return;
        const validators = [];
        const ignorarObligatorio = this.ignorarObligatorioEnTipos().includes(pregunta.tipo);
        if (pregunta.obligatorio && !ignorarObligatorio) validators.push(Validators.required);
        if (pregunta.patronValidacion) validators.push(Validators.pattern(pregunta.patronValidacion));

        const savedValue = valorMap.get(pregunta.preguntaId.toLowerCase());
        let defaultValue: string | boolean = savedValue ?? pregunta.valorDefecto ?? '';
        if (savedValue === undefined && pregunta.tipo === 'CHECKBOX' && !pregunta.opciones) {
          defaultValue = defaultValue === 'true' || defaultValue === '1';
        }

        this.form.addControl(pregunta.preguntaId, new FormControl(defaultValue, validators));
      });
    });
  }

  setTab(seccionId: string) {
    this.activeTab.set(seccionId);
  }

  getOpciones(pregunta: FormPregunta): string[] {
    return pregunta.opciones?.split(',').map(o => o.trim()).filter(o => o) ?? [];
  }

  getControl(preguntaId: string): FormControl {
    return this.form.get(preguntaId) as FormControl;
  }

  hasError(preguntaId: string): boolean {
    const ctrl = this.getControl(preguntaId);
    return ctrl ? ctrl.invalid && (ctrl.dirty || ctrl.touched) : false;
  }

  getErrorMessage(pregunta: FormPregunta): string {
    const ctrl = this.getControl(pregunta.preguntaId!);
    if (!ctrl) return '';
    if (ctrl.hasError('required')) return 'Este campo es obligatorio';
    if (ctrl.hasError('pattern')) return pregunta.mensajeError || 'El valor ingresado no es válido';
    return '';
  }

  isChecked(preguntaId: string, option: string): boolean {
    const val: string = this.getControl(preguntaId)?.value ?? '';
    return val.split(',').map((s: string) => s.trim()).includes(option);
  }

  toggleCheckbox(preguntaId: string, option: string, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    const ctrl = this.getControl(preguntaId);
    const current: string[] = (ctrl?.value ?? '')
      .split(',')
      .map((s: string) => s.trim())
      .filter((s: string) => s);

    if (checked) {
      if (!current.includes(option)) current.push(option);
    } else {
      const idx = current.indexOf(option);
      if (idx > -1) current.splice(idx, 1);
    }
    ctrl?.setValue(current.join(','));
    ctrl?.markAsDirty();
  }

  getVisiblePreguntas(seccion: FormSeccion): FormPregunta[] {
    return (seccion.preguntas ?? []).filter(p => p.visible !== false);
  }

  // Mapa de nombre de archivo seleccionado por preguntaId
  fileNames = new Map<string, string>();

  onFileSelected(preguntaId: string, event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.fileNames.set(preguntaId, file.name);
      const ctrl = this.getControl(preguntaId);
      ctrl?.setValue(file.name);
      ctrl?.markAsDirty();
    }
  }

  getFileName(preguntaId: string): string {
    return this.fileNames.get(preguntaId) ?? '';
  }

  /** Marca todos los controles como tocados, activa los mensajes de error en el UI
   *  y emite los outputs. Devuelve true si el formulario es válido. */
  validarFormulario(): boolean {
    this.form.markAllAsTouched();
    this.emitOutputs();
    return this.form.valid;
  }

  private emitOutputs() {
    const listado: FormRespuesta[] = [];
    this.secciones().forEach(seccion => {
      this.getVisiblePreguntas(seccion).forEach(pregunta => {
        if (!pregunta.preguntaId) return;
        listado.push({
          tipo: pregunta.tipo,
          nombre: pregunta.titulo,
          valor: this.getControl(pregunta.preguntaId)?.value ?? '',
          preguntaId: pregunta.preguntaId,
        });
      });
    });
    this.listado.emit(listado);

    this.valido.emit(this.form.valid);

    const errores: string[] = [];
    this.secciones().forEach(seccion => {
      (seccion.preguntas ?? []).forEach(pregunta => {
        if (!pregunta.preguntaId) return;
        const ctrl = this.getControl(pregunta.preguntaId);
        if (!ctrl || !ctrl.invalid) return;
        if (ctrl.hasError('required')) {
          errores.push(`El campo "${pregunta.titulo}" es obligatorio`);
        } else if (ctrl.hasError('pattern')) {
          errores.push(`El campo "${pregunta.titulo}": ${pregunta.mensajeError || 'El valor ingresado no es válido'}`);
        }
      });
    });
    this.mensaje.emit(errores.join(', '));
  }
}
