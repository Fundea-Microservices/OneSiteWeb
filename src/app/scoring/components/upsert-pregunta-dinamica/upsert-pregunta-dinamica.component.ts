import {
  ChangeDetectionStrategy,
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  DestroyRef,
  effect,
  EventEmitter,
  inject,
  input,
  Output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Subscription, debounceTime, distinctUntilChanged } from 'rxjs';
import {
  ICatalogoVariable,
  IPreguntaDinamica,
  TIPOS_PREGUNTA,
  TIPOS_PREGUNTA_SELECCION,
  TipoPregunta,
} from '../../../../interfaces/scoring/scoring';
import { PreguntaDinamicaService } from '../../../../services/scoring/pregunta-dinamica.service';

/** Modal "Configurar Pregunta Dinámica" de la Pantalla 3. */
@Component({
  selector: 'app-upsert-pregunta-dinamica',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './upsert-pregunta-dinamica.component.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpsertPreguntaDinamicaComponent {
  private fb = inject(FormBuilder);
  private preguntaService = inject(PreguntaDinamicaService);

  pregunta = input<IPreguntaDinamica | null>(null);
  scoringId = input.required<number>();
  catalogos = input<ICatalogoVariable[]>([]);
  /** Las demás preguntas del scoring, para elegir de cuál depende esta. */
  preguntas = input<IPreguntaDinamica[]>([]);
  nuevo = input<boolean>(true);
  formKey = input<number>(0);

  @Output() save = new EventEmitter<IPreguntaDinamica>();
  @Output() cancel = new EventEmitter<void>();


  form = signal<FormGroup>(this.construirForm(null));
  readonly tiposPregunta = TIPOS_PREGUNTA;

  private tipoActual = signal<TipoPregunta | null>(null);
  private esCalculada = signal(false);
  /** La pregunta toma sus opciones del API, no de un catálogo local. */
  usaApiExterna = signal(false);

  private subs: Subscription[] = [];

  /** Estado de la validación en vivo de la fórmula. */
  formulaEstado = signal<'vacia' | 'validando' | 'valida' | 'invalida'>('vacia');
  formulaMensaje = signal('');
  formulaReferencias = signal<string[]>([]);

  /** El tipo admite opciones, vengan de un catálogo local o del API. */
  esDeSeleccion = computed(() => {
    const tipo = this.tipoActual();
    return tipo ? TIPOS_PREGUNTA_SELECCION.includes(tipo) : false;
  });

  requiereCatalogo = computed(
    () => this.esDeSeleccion() && !this.usaApiExterna(),
  );

  respuestaCalculada = computed(() => this.esCalculada());

  /** Solo catálogos activos: uno inactivo no despliega opciones al evaluar. */
  catalogosActivos = computed(() =>
    this.catalogos().filter((catalogo) => catalogo.estado === 'Activo'),
  );

  posiblesPadres = computed(() =>
    this.preguntas().filter(
      (otra) =>
        otra.preguntaId !== this.pregunta()?.preguntaId &&
        (otra.tipoPregunta === 'Desplegable' ||
          otra.tipoPregunta === 'BotonOpcion'),
    ),
  );

  constructor() {
    effect(() => {
      const _ = this.formKey();
      this.initForm(this.pregunta());
    });

    inject(DestroyRef).onDestroy(() => this.limpiarSubs());
  }

  private limpiarSubs(): void {
    this.subs.forEach((sub) => sub.unsubscribe());
    this.subs = [];
  }

  private initForm(pregunta: IPreguntaDinamica | null): void {
    this.form.set(this.construirForm(pregunta));

    this.tipoActual.set((pregunta?.tipoPregunta as TipoPregunta) ?? 'Texto');
    this.esCalculada.set(pregunta?.respuestaCalculada ?? false);
    this.formulaEstado.set('vacia');
    this.formulaMensaje.set('');
    this.formulaReferencias.set([]);

    this.sincronizar();

    if (pregunta?.respuestaCalculada && pregunta.formula) {
      this.validarFormula(pregunta.formula);
    }
  }

  private construirForm(pregunta: IPreguntaDinamica | null): FormGroup {
    return this.fb.group({
        codigoPregunta: [
          pregunta?.codigoPregunta ?? '',
          [
            Validators.required,
            Validators.maxLength(20),
            Validators.pattern(/^[A-Za-z][A-Za-z0-9_]*$/),
          ],
        ],
        enunciado: [
          pregunta?.enunciado ?? '',
          [Validators.required, Validators.maxLength(500)],
        ],
        tipoPregunta: [pregunta?.tipoPregunta ?? 'Texto', [Validators.required]],
        catalogoRespuestasId: [pregunta?.catalogoRespuestasId ?? null],
        preguntaVisible: [pregunta?.preguntaVisible ?? true],
        preguntaCalculada: [pregunta?.preguntaCalculada ?? false],
        aplicaScore: [pregunta?.aplicaScore ?? true],
        respuestaCalculada: [pregunta?.respuestaCalculada ?? false],
        requiereRTE: [pregunta?.requiereRTE ?? false],
        preguntaPadreId: [pregunta?.preguntaPadreId ?? null],
        grupoExterno: [pregunta?.grupoExterno ?? ''],
        formula: [pregunta?.formula ?? ''],
        peso: [pregunta?.peso ?? 0, [Validators.required]],
        constante: [pregunta?.constante ?? 0, [Validators.required]],
        valorReferencia: [pregunta?.valorReferencia ?? 0, [Validators.required]],
        coeficienteA: [pregunta?.coeficienteA ?? 0, [Validators.required]],
        coeficienteB: [pregunta?.coeficienteB ?? 0, [Validators.required]],
        observacionesPregunta: [
          pregunta?.observacionesPregunta ?? '',
          [Validators.maxLength(500)],
        ],
      ordenDespliegue: [pregunta?.ordenDespliegue ?? null],
    });
  }

  private sincronizar(): void {
    this.limpiarSubs();

    const form = this.form();
    const tipo = form.get('tipoPregunta');
    const calculada = form.get('respuestaCalculada');
    const catalogo = form.get('catalogoRespuestasId');
    const formula = form.get('formula');
    const grupo = form.get('grupoExterno');

    if (!tipo || !calculada || !catalogo || !formula || !grupo) return;

  
    const aplicarOrigenOpciones = (): void => {
      const nuevoTipo = tipo.value as TipoPregunta;
      this.tipoActual.set(nuevoTipo);

      const esSeleccion = TIPOS_PREGUNTA_SELECCION.includes(nuevoTipo);
      const usaApi = !!String(grupo.value ?? '').trim();
      this.usaApiExterna.set(usaApi);

      if (esSeleccion && !usaApi) {
        catalogo.setValidators([Validators.required]);
      } else {
        catalogo.setValidators([]);
        catalogo.setValue(null, { emitEvent: false });
      }
      catalogo.updateValueAndValidity({ emitEvent: false });
    };

    const aplicarTipo = (): void => aplicarOrigenOpciones();

    const aplicarCalculada = (valor: unknown): void => {
      const activa = valor === true || valor === 'true';
      this.esCalculada.set(activa);

      formula.setValidators(activa ? [Validators.required] : []);
      formula.updateValueAndValidity({ emitEvent: false });

      if (!activa) {
        this.formulaEstado.set('vacia');
        this.formulaMensaje.set('');
      }
    };

    aplicarTipo();
    aplicarCalculada(calculada.value);

    this.subs.push(
      tipo.valueChanges.subscribe(aplicarTipo),
      grupo.valueChanges.subscribe(aplicarOrigenOpciones),
      calculada.valueChanges.subscribe(aplicarCalculada),
      // Se valida contra el backend mientras se escribe, con respiro suficiente
      // para no disparar una petición por tecla.
      formula.valueChanges
        .pipe(debounceTime(500), distinctUntilChanged())
        .subscribe((valor) => this.validarFormula(String(valor ?? ''))),
    );
  }

  /** Comprueba sintaxis, referencias existentes y ausencia de ciclos. */
  private async validarFormula(formula: string): Promise<void> {
    if (!this.esCalculada()) return;

    const texto = formula.trim();
    if (!texto) {
      this.formulaEstado.set('vacia');
      this.formulaMensaje.set('');
      this.formulaReferencias.set([]);
      return;
    }

    this.formulaEstado.set('validando');

    const resultado = await this.preguntaService.validarFormula(
      this.scoringId(),
      texto,
      this.form().get('codigoPregunta')?.value || undefined,
    );

    if (resultado.valida) {
      this.formulaEstado.set('valida');
      this.formulaMensaje.set('');
      this.formulaReferencias.set(resultado.referencias);
    } else {
      this.formulaEstado.set('invalida');
      this.formulaMensaje.set(resultado.mensaje);
      this.formulaReferencias.set([]);
    }
  }

  onSubmit(): void {
    const form = this.form();

    if (form.invalid) {
      form.markAllAsTouched();
      return;
    }

    // Guardar con una fórmula que el backend ya rechazó solo produciría el
    // mismo error un segundo después.
    if (this.esCalculada() && this.formulaEstado() === 'invalida') return;

    const valores = form.getRawValue();

    this.save.emit({
      ...(this.pregunta() ?? {}),
      ...valores,
      scoringId: this.scoringId(),
      peso: Number(valores.peso),
      constante: Number(valores.constante),
      valorReferencia: Number(valores.valorReferencia),
      coeficienteA: Number(valores.coeficienteA),
      coeficienteB: Number(valores.coeficienteB),
      catalogoRespuestasId: valores.catalogoRespuestasId || null,
      preguntaPadreId: valores.preguntaPadreId ?? null,
      grupoExterno: valores.grupoExterno?.trim() || null,
      formula: valores.respuestaCalculada ? valores.formula : null,
      observacionesPregunta: valores.observacionesPregunta?.trim() || null,
      ordenDespliegue: valores.ordenDespliegue ?? undefined,
    } as IPreguntaDinamica);
  }

  onCancel(): void {
    this.cancel.emit();
  }

  campoInvalido(campo: string): boolean {
    const control = this.form().get(campo);
    return !!control && control.invalid && control.touched;
  }
}
