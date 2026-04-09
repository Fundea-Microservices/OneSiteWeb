import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormulariosService } from '../../../../../services/config/formularios.service';
import {
  FormEncabezado,
  FormEncabezadoCompleto,
  FormPregunta,
  FormSeccion,
} from '../../../../../interfaces/configuracion';

@Component({
  selector: 'app-render-formulario',
  imports: [ReactiveFormsModule],
  templateUrl: './render-formulario.component.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class RenderFormularioComponent implements OnInit {
  private service = inject(FormulariosService);

  encabezadoId = input.required<string>();

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

        if (seccionesList.length > 0) {
          this.activeTab.set(seccionesList[0].seccionId!);
        }
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  private buildForm(secciones: FormSeccion[]) {
    secciones.forEach(seccion => {
      (seccion.preguntas ?? []).forEach(pregunta => {
        if (!pregunta.preguntaId) return;
        const validators = [];
        if (pregunta.obligatorio) validators.push(Validators.required);
        if (pregunta.patronValidacion) validators.push(Validators.pattern(pregunta.patronValidacion));

        let defaultValue: string | boolean = pregunta.valorDefecto ?? '';
        if (pregunta.tipo === 'CHECKBOX' && !pregunta.opciones) {
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
}
