import {
  ChangeDetectionStrategy,
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { EvaluacionScoringService } from '../../../../services/scoring/evaluacion.service';
import { ModeloScoringService } from '../../../../services/scoring/modelo-scoring.service';
import {
  ICuestionario,
  IEvaluacionCredito,
  IModeloScoring,
  IPreguntaCuestionario,
  IRespuestaCaptura,
  ISolicitudBantotal,
} from '../../../../interfaces/scoring/scoring';

/**
 * Formulario de Captura de Datos de la Pantalla 4.
 *
 * Dos modos según la ruta:
 * - /captura/solicitud/:numeroSolicitud  → evaluación nueva, datos desde Bantotal
 * - /captura/evaluacion/:evaluacionId    → evaluación existente en estado Solicitud
 */
@Component({
  selector: 'app-captura-evaluacion-page',
  imports: [RouterLink, DecimalPipe],
  templateUrl: './captura-evaluacion-page.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class CapturaEvaluacionPage implements OnInit {
  private evaluacionService = inject(EvaluacionScoringService);
  private modeloService = inject(ModeloScoringService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  /** Sección 1: snapshot de Bantotal, solo lectura. */
  datosBantotal = signal<ISolicitudBantotal | null>(null);
  numeroSolicitud = signal<number | null>(null);

  /** Existe solo en modo edición. */
  evaluacion = signal<IEvaluacionCredito | null>(null);

  scoringList = signal<IModeloScoring[]>([]);
  scoringId = signal<number | null>(null);
  cuestionario = signal<ICuestionario | null>(null);

  /** preguntaId -> valor capturado. */
  respuestas = signal<Map<number, IRespuestaCaptura>>(new Map());
  /** preguntaId -> valor resuelto por el motor (incluye las calculadas). */
  valoresCalculados = signal<Record<string, number>>({});

  isLoading = signal(false);
  isGuardando = signal(false);
  isSimulando = signal(false);

  private temporizadorSimulacion: ReturnType<typeof setTimeout> | null = null;

  esEdicion = computed(() => this.evaluacion() !== null);

  /** Una evaluación procesada es inmutable; el formulario se abre en lectura. */
  soloLectura = computed(
    () => this.evaluacion()?.estadoEvaluacion === 'Procesado',
  );

  preguntas = computed(() => this.cuestionario()?.preguntas ?? []);

  async ngOnInit() {
    this.isLoading.set(true);
    try {
      const params = this.route.snapshot.paramMap;
      const numeroSolicitud = params.get('numeroSolicitud');
      const evaluacionId = params.get('evaluacionId');

      const resp = await this.modeloService.getModelos({
        estado: 'Activo',
        limite: 200,
      });
      this.scoringList.set(resp?.items ?? []);

      if (numeroSolicitud) {
        await this.cargarDesdeBantotal(Number(numeroSolicitud));
      } else if (evaluacionId) {
        await this.cargarEvaluacion(Number(evaluacionId));
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  /** Modo alta: los datos del cliente los trae el core. */
  private async cargarDesdeBantotal(numeroSolicitud: number) {
    this.numeroSolicitud.set(numeroSolicitud);
    const solicitud =
      await this.evaluacionService.consultarBantotal(numeroSolicitud);

    if (!solicitud) {
      this.router.navigate(['/scoring/evaluacion']);
      return;
    }

    this.datosBantotal.set(solicitud);
  }

  /**
   * Modo edición: el snapshot sale de la evaluación guardada, no de Bantotal.
   * Es deliberado — el expediente debe mostrar lo que se tuvo a la vista el día
   * de la captura, no lo que el core diga hoy.
   */
  private async cargarEvaluacion(evaluacionId: number) {
    const evaluacion =
      await this.evaluacionService.getEvaluacionById(evaluacionId);

    if (!evaluacion) {
      this.router.navigate(['/scoring/evaluacion']);
      return;
    }

    this.evaluacion.set(evaluacion);
    this.numeroSolicitud.set(evaluacion.numeroSolicitud);
    this.datosBantotal.set({
      numeroSolicitud: evaluacion.numeroSolicitud,
      numeroOperacion: evaluacion.numeroOperacion ?? null,
      nombreCliente: evaluacion.nombreCliente,
      dpi: evaluacion.dpi,
      cuenta: evaluacion.cuenta,
      direccion: evaluacion.direccion ?? null,
      region: evaluacion.region ?? null,
      agencia: evaluacion.agencia ?? null,
      montoCredito: evaluacion.montoCredito,
      productoCredito: evaluacion.productoCredito,
    });

    this.scoringId.set(evaluacion.scoringId);
    await this.cargarCuestionario(evaluacion.scoringId);

    const mapa = new Map<number, IRespuestaCaptura>();
    for (const respuesta of evaluacion.respuestas ?? []) {
      mapa.set(respuesta.preguntaId, {
        preguntaId: respuesta.preguntaId,
        opcionId: respuesta.opcionId ?? null,
        valorIngresado: respuesta.valorIngresado ?? null,
      });
    }
    this.respuestas.set(mapa);
    this.simular();
  }

  async onScoringChange(valor: string) {
    const scoringId = valor ? Number(valor) : null;
    this.scoringId.set(scoringId);
    this.respuestas.set(new Map());
    this.valoresCalculados.set({});

    if (scoringId) await this.cargarCuestionario(scoringId);
    else this.cuestionario.set(null);
  }

  private async cargarCuestionario(scoringId: number) {
    this.cuestionario.set(
      await this.evaluacionService.getCuestionario(scoringId),
    );
  }

  // ── Captura ───────────────────────────────────────────────────────────────

  valorDe(preguntaId: number): string {
    return this.respuestas().get(preguntaId)?.valorIngresado ?? '';
  }

  opcionDe(preguntaId: number): number | null {
    return this.respuestas().get(preguntaId)?.opcionId ?? null;
  }

  /** El valor que el motor resolvió para una pregunta calculada. */
  calculadoDe(preguntaId: number): number | null {
    const valor = this.valoresCalculados()[String(preguntaId)];
    return valor === undefined ? null : valor;
  }

  setValor(pregunta: IPreguntaCuestionario, valor: string) {
    const mapa = new Map(this.respuestas());
    mapa.set(pregunta.preguntaId, {
      preguntaId: pregunta.preguntaId,
      opcionId: mapa.get(pregunta.preguntaId)?.opcionId ?? null,
      valorIngresado: valor,
    });
    this.respuestas.set(mapa);
    this.programarSimulacion();
  }

  setOpcion(pregunta: IPreguntaCuestionario, opcionId: string) {
    const mapa = new Map(this.respuestas());
    const opcion = pregunta.opciones.find(
      (o) => o.opcionId === Number(opcionId),
    );

    mapa.set(pregunta.preguntaId, {
      preguntaId: pregunta.preguntaId,
      opcionId: opcionId ? Number(opcionId) : null,
      // Se guarda también la descripción: el desglose de auditoría muestra
      // texto, y así queda legible sin volver a consultar el catálogo.
      valorIngresado: opcion?.descripcionOpcion ?? null,
    });
    this.respuestas.set(mapa);
    this.programarSimulacion();
  }

  setCasilla(pregunta: IPreguntaCuestionario, marcada: boolean) {
    const mapa = new Map(this.respuestas());
    mapa.set(pregunta.preguntaId, {
      preguntaId: pregunta.preguntaId,
      opcionId: null,
      valorIngresado: marcada ? 'true' : 'false',
    });
    this.respuestas.set(mapa);
    this.programarSimulacion();
  }

  /**
   * Recalcula contra el backend con un respiro, para que los campos calculados
   * (la utilidad del formulario) y el punteo proyectado se actualicen mientras
   * se captura sin disparar una petición por tecla.
   */
  private programarSimulacion() {
    if (this.temporizadorSimulacion) clearTimeout(this.temporizadorSimulacion);
    this.temporizadorSimulacion = setTimeout(() => this.simular(), 450);
  }

  private async simular() {
    const scoringId = this.scoringId();
    if (!scoringId) return;

    this.isSimulando.set(true);
    try {
      const resultado = await this.evaluacionService.simular(
        scoringId,
        this.respuestasArray(),
        this.evaluacion()?.evaluacionId,
      );

      /* Solo interesan los campos calculados: el punteo se consulta en
         Auditoría. Si la simulación falla —el modelo todavía incompleto, un
         punteo que no cae en ningún rango— no es un error de captura, así que
         se conservan los valores que ya había en pantalla. */
      if (resultado) {
        this.valoresCalculados.set(resultado.valoresCalculados ?? {});
      }
    } finally {
      this.isSimulando.set(false);
    }
  }

  private respuestasArray(): IRespuestaCaptura[] {
    // Las calculadas no se envían: su valor lo produce el motor con la fórmula.
    const calculadas = new Set(
      this.preguntas()
        .filter((p) => p.respuestaCalculada)
        .map((p) => p.preguntaId),
    );

    return [...this.respuestas().values()].filter(
      (respuesta) => !calculadas.has(respuesta.preguntaId),
    );
  }

  // ── Guardado ──────────────────────────────────────────────────────────────

  async guardar() {
    const scoringId = this.scoringId();
    const datos = this.datosBantotal();
    const numeroSolicitud = this.numeroSolicitud();

    if (!scoringId || !datos || !numeroSolicitud) return;

    this.isGuardando.set(true);
    try {
      const evaluacionId = this.evaluacion()?.evaluacionId;

      const resp = evaluacionId
        ? await this.evaluacionService.updateEvaluacion(
            evaluacionId,
            this.respuestasArray(),
          )
        : await this.evaluacionService.createEvaluacion({
            numeroSolicitud,
            scoringId,
            datosBantotal: {
              numeroOperacion: datos.numeroOperacion,
              nombreCliente: datos.nombreCliente,
              dpi: datos.dpi,
              cuenta: datos.cuenta,
              direccion: datos.direccion,
              region: datos.region,
              agencia: datos.agencia,
              montoCredito: datos.montoCredito,
              productoCredito: datos.productoCredito,
            },
            respuestas: this.respuestasArray(),
          });

      if (resp) this.router.navigate(['/scoring/evaluacion']);
    } finally {
      this.isGuardando.set(false);
    }
  }

  volver() {
    this.router.navigate(['/scoring/evaluacion']);
  }

}
