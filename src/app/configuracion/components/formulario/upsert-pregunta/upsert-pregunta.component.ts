import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  effect,
  EventEmitter,
  inject,
  input,
  Output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormPregunta, TipoPregunta } from '../../../../../interfaces/configuracion';

@Component({
  selector: 'app-upsert-pregunta',
  imports: [FormsModule],
  templateUrl: './upsert-pregunta.component.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpsertPreguntaComponent {
  private cdr = inject(ChangeDetectorRef);
  pregunta = input<FormPregunta>({
    seccionId: '',
    titulo: '',
    subtitulo: '',
    tipo: 'TEXT',
    valorDefecto: '',
    opciones: '',
    placeholder: '',
    patronValidacion: '',
    mensajeError: '',
    orden: 0,
    visible: true,
    obligatorio: false,
    activo: true,
  });
  nuevo = input<boolean>(true);
  key = input<number>(0);

  @Output() save = new EventEmitter<FormPregunta>();
  @Output() cancel = new EventEmitter<void>();

  readonly tiposPregunta: TipoPregunta[] = [
    'TEXT', 'NUMBER', 'SELECT', 'DATE', 'TIME',
    'FILE', 'TEXTAREA', 'CHECKBOX', 'RADIO',
  ];

  readonly tipoConOpciones: TipoPregunta[] = ['SELECT', 'CHECKBOX', 'RADIO'];

  form = signal<FormPregunta>(this.pregunta());

  constructor() {
    effect(() => {
      const p = this.pregunta();
      const _key = this.key();
      this.form.set({ ...p });
      this.cdr.markForCheck();
    });
  }

  set(field: keyof FormPregunta, value: any) {
    this.form.update(f => ({ ...f, [field]: value }));
    this.cdr.markForCheck();
  }

  requiresOpciones(): boolean {
    return this.tipoConOpciones.includes(this.form().tipo);
  }

  isValid = computed(() => !!this.form().titulo?.trim() && !!this.form().tipo);

  onSubmit() {
    if (!this.isValid) return;
    this.save.emit(this.form());
  }
}
