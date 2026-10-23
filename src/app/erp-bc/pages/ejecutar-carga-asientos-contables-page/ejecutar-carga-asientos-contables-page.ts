import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, LOCALE_ID, OnDestroy, computed, inject, signal } from '@angular/core';
import { CommonModule, formatNumber } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { PartidasContablesService } from '../../../../services/erp-bc/partidas-contables.service';
import { PaginationAllComponent } from '../../../shared/components/pagination-all/pagination-all';
import {
  AlcanceCarga,
  CuadrePoliza,
  ErroresEjecucionMetadata,
  EstadoEjecucionData,
  GrupoErrorAsientos,
  LoteCargaAsientos
} from '../../../../interfaces/erp-bc/partidas-contables';

/**
 * Cada cuánto se re-consulta el estado mientras el proceso sigue corriendo.
 * La carga completa recorre todas las páginas de Bantotal y tarda minutos; el
 * reenvío de errores lee directo los asientos en error y termina en segundos.
 */
const POLL_CARGA_MS   = 5 * 60 * 1000;
const POLL_REENVIO_MS = 12 * 1000;

/**
 * Cuántas pólizas descuadradas se listan de entrada. El lote del día puede
 * traer hasta 500: un día mal cargado llena la pantalla.
 */
const POLIZAS_VISIBLES = 15;

/** Grupos de error por página: el mismo valor por defecto del backend. */
const ERRORES_POR_PAGINA = 10;

const PAGINACION_ERRORES_INICIAL: IPagination = {
  page: 1, pageSize: ERRORES_POR_PAGINA, totalItems: 0, totalPages: 0,
};

/**
 * El backend reescribe `comentario` en cada página (fases 1 y 3) y en cada
 * bloque enviado (fases 2 y 4). Es la única fuente del avance por página y
 * del total por enviar.
 * - Fases 1 y 2: lote del día, sobre la bitácora principal.
 * - Fases 3 y 4: lotes de fecha valor anterior, sobre la bitácora de cada lote.
 */
const RE_FASE_CARGA          = /^Fase 1 en proceso \| página (\d+) de (\d+)/;
const RE_FASE_ENVIO          = /^Fase 2 en proceso \| (\d+) de (\d+)/;
const RE_FASE_CARGA_ANTERIOR = /^Fase 3 en proceso \| página (\d+) de (\d+)/;
const RE_FASE_ENVIO_ANTERIOR = /^Fase 4 en proceso \| (\d+) de (\d+)/;

/**
 * Lo que el backend agrega al comentario de la bitácora principal al terminar
 * el lote del día y pasar a las fases 3-4.
 */
const MARCA_FASES_ANTERIORES = 'Procesando asientos con fecha valor anterior';

const COLOR_FASE_CARGA    = 'bg-primary';
const COLOR_FASE_ENVIO    = 'bg-success';
const COLOR_FASE_DETENIDA = 'bg-warning';

type AccionEnCurso = 'carga' | 'reenvio' | null;

type EstadoFase = 'pendiente' | 'en-curso' | 'completa' | 'detenida';

interface ProgresoFase {
  titulo:     string;
  estado:     EstadoFase;
  /** `null` pinta la barra indeterminada: hay avance pero no un total contra el cual medirlo. */
  porcentaje: number | null;
  detalle:    string;
  color:      string;
}

/**
 * Desenlace único de la ejecución. Los flags del backend no son excluyentes
 * entre sí, así que se evalúan en orden y gana el primero que aplica.
 */
type VistaEstado =
  | 'sin-registro'
  | 'avance'
  | 'descuadre'
  | 'interrumpida'
  | 'reenvio'
  | 'error'
  | 'ok';

/** Desenlace de un lote suelto (el del día o uno de fecha valor anterior). */
type VistaLote = Exclude<VistaEstado, 'sin-registro'>;

const ESTADO_LOTE: Record<VistaLote, { texto: string; clase: string }> = {
  avance:       { texto: 'En ejecución',        clase: 'bg-primary' },
  descuadre:    { texto: 'Pólizas sin cuadrar', clase: 'bg-danger' },
  interrumpida: { texto: 'Interrumpido',        clase: 'bg-warning text-dark' },
  reenvio:      { texto: 'Con rechazos',        clase: 'bg-danger' },
  error:        { texto: 'Con fallo',           clase: 'bg-danger' },
  ok:           { texto: 'Enviado',             clase: 'bg-success' },
};

const OPCIONES_ALCANCE: { valor: AlcanceCarga; texto: string; ayuda: string }[] = [
  {
    valor: 'AMBAS',
    texto: 'Todo',
    ayuda: 'El lote del día y un lote por cada fecha valor anterior registrada en la fecha.',
  },
  {
    valor: 'DIA',
    texto: 'Solo fecha del día',
    ayuda: 'Solo los asientos con fecha valor igual a la fecha.',
  },
  {
    valor: 'ANTERIORES',
    texto: 'Solo fechas anteriores',
    ayuda: 'Solo los asientos registrados en la fecha con fecha valor anterior.',
  },
];

@Component({
  selector: 'app-ejecutar-carga-asientos-contables-page',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationAllComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './ejecutar-carga-asientos-contables-page.html',
  styleUrl: './ejecutar-carga-asientos-contables-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class EjecutarCargaAsientosContablesPage implements OnDestroy {

  private service = inject(PartidasContablesService);
  private locale  = inject(LOCALE_ID);

  readonly opcionesAlcance = OPCIONES_ALCANCE;

  fecha  = signal('');
  estado = signal<EstadoEjecucionData | null>(null);

  /** Ya se hizo al menos una búsqueda para la fecha actual. */
  consultado     = signal(false);
  isBuscando     = signal(false);
  isRefrescando  = signal(false);
  accion         = signal<AccionEnCurso>(null);
  errorMsg       = signal('');
  avisoMsg       = signal('');
  ultimaConsulta = signal<Date | null>(null);
  /** La tabla de pólizas descuadradas del día arranca recortada. */
  verTodasLasPolizas = signal(false);
  /** Id del lote anterior desplegado en la tabla, si hay alguno. */
  loteAbierto = signal<string | null>(null);

  /** Alcance con el que se lanzará la próxima carga. */
  alcance = signal<AlcanceCarga>('AMBAS');
  /** Mientras el usuario no toque el selector, el alcance sigue a la sugerencia. */
  private alcanceElegido = false;

  // Panel de errores de envío agrupados por mensaje.
  verErrores         = signal(false);
  errores            = signal<GrupoErrorAsientos[]>([]);
  erroresMeta        = signal<ErroresEjecucionMetadata | null>(null);
  paginacionErrores  = signal<IPagination>(PAGINACION_ERRORES_INICIAL);
  isCargandoErrores  = signal(false);
  erroresMsg         = signal('');
  /** Descarta respuestas que llegan después de cambiar de fecha o cerrar el panel. */
  private erroresSeq = 0;

  private pollId: ReturnType<typeof setInterval> | null = null;
  private pollMsActual: number | null = null;

  // ── Fecha ──────────────────────────────────────────────────────────────────

  /** Máxima fecha permitida: ayer (no se permite hoy ni fechas futuras). */
  get maxFecha(): string {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return this.toLocalDateString(d);
  }

  get fechaValida(): boolean {
    const f = this.fecha();
    return !!f && f <= this.maxFecha;
  }

  private toLocalDateString(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  /** Al cambiar la fecha el estado mostrado deja de ser válido: se limpia todo. */
  onFechaChange(valor: string) {
    this.fecha.set(valor ?? '');
    this.detenerPolling();
    this.estado.set(null);
    this.consultado.set(false);
    this.errorMsg.set('');
    this.avisoMsg.set('');
    this.ultimaConsulta.set(null);
    this.reiniciarVista();
  }

  private reiniciarVista() {
    this.verTodasLasPolizas.set(false);
    this.loteAbierto.set(null);
    this.alcanceElegido = false;
    this.alcance.set('AMBAS');
    this.cerrarErrores();
  }

  // ── Alcance ────────────────────────────────────────────────────────────────

  onAlcanceChange(valor: AlcanceCarga) {
    this.alcance.set(valor);
    this.alcanceElegido = true;
  }

  etiquetaAlcance(alcance: AlcanceCarga | null | undefined): string {
    return OPCIONES_ALCANCE.find(o => o.valor === alcance)?.texto ?? '';
  }

  ayudaAlcance = computed(() =>
    OPCIONES_ALCANCE.find(o => o.valor === this.alcance())?.ayuda ?? ''
  );

  // ── Estado derivado ────────────────────────────────────────────────────────

  /** Último resultado del lote del día. `null` si ninguna corrida lo procesó. */
  ejecucion       = computed(() => this.estado()?.ejecucion ?? null);
  anteriores      = computed(() => this.estado()?.anteriores ?? []);
  ultimaEjecucion = computed(() => this.estado()?.ultimaEjecucion ?? null);

  /** Ya considera todos los lotes. */
  enEjecucion = computed(() => this.estado()?.enEjecucion === true);

  /** El último resultado del lote del día es un reenvío de errores, no una carga. */
  esReenvio = computed(() => this.ejecucion()?.tipo === 'REENVIO');

  /** La corrida en curso (o la última) es un reenvío: define la cadencia del polling. */
  ultimaEsReenvio = computed(() => this.ultimaEjecucion()?.tipo === 'REENVIO');

  /**
   * La última corrida no es la que dejó el resultado del lote del día: pasa
   * con alcance ANTERIORES, o si solo se han corrido cargas de ese alcance.
   */
  ultimaDistinta = computed(() => {
    const u = this.ultimaEjecucion();
    return !!u && u.id !== this.ejecucion()?.id;
  });

  /** Hay asientos en ERROR en algún lote que el ERP rechazó y tiene sentido reintentar. */
  puedeReenviar = computed(() => this.estado()?.puedeReenviar === true);

  /**
   * Desenlace general a pintar. Las banderas generales resumen todos los
   * lotes. `tieneErrores` sale `true` también en un descuadre, así que el
   * orden importa: el descuadre se resuelve antes que el reenvío.
   */
  vista = computed<VistaEstado>(() => {
    const e = this.estado();
    if (!e || !e.existe)   return 'sin-registro';
    if (e.enEjecucion)     return 'avance';
    if (e.descuadre)       return 'descuadre';
    if (e.interrumpida)    return 'interrumpida';
    if (e.puedeReenviar)   return 'reenvio';
    if (e.tieneErrores)    return 'error';
    return 'ok';
  });

  /** Mismo criterio que `vista`, pero con las banderas de un solo lote. */
  vistaDeLote(lote: LoteCargaAsientos): VistaLote {
    if (lote.enEjecucion)                return 'avance';
    if (lote.descuadre)                  return 'descuadre';
    if (lote.interrumpida)               return 'interrumpida';
    if (lote.puedeReenviar)              return 'reenvio';
    if (lote.tieneErrores || lote.error) return 'error';
    return 'ok';
  }

  estadoLote(lote: LoteCargaAsientos) {
    return ESTADO_LOTE[this.vistaDeLote(lote)];
  }

  /** Desenlace del lote del día; `null` si no hay resultado del día. */
  vistaDia = computed<VistaLote | null>(() => {
    const ej = this.ejecucion();
    return ej ? this.vistaDeLote(ej) : null;
  });

  /** Lotes anteriores que no terminaron limpios. */
  anterioresConIncidencia = computed(() =>
    this.anteriores().filter(l => {
      const v = this.vistaDeLote(l);
      return v !== 'ok' && v !== 'avance';
    }).length
  );

  anterioresConDescuadre = computed(() => this.anteriores().some(l => l.descuadre));

  /** Terminó sin incidencias en ningún lote. */
  finalizadaLimpia = computed(() => this.vista() === 'ok');

  /** Existe registro de la fecha, pero ninguna corrida ha procesado el lote del día. */
  diaPendiente = computed(() => !!this.estado()?.existe && !this.ejecucion());

  /**
   * No hay rastro de que se hayan procesado las fechas valor anteriores: no
   * hay lotes y ninguna corrida visible tuvo un alcance que las incluyera
   * (p. ej. ejecuciones previas a este cambio, o cargas con alcance DIA).
   */
  anterioresPendientes = computed(() => {
    const e = this.estado();
    if (!e?.existe || e.anteriores.length > 0) return false;
    const alcances = [e.ultimaEjecucion?.alcance, e.ejecucion?.alcance];
    return !alcances.some(a => a === 'AMBAS' || a === 'ANTERIORES');
  });

  /**
   * Alcance que conviene relanzar según qué lotes quedaron mal o sin procesar.
   * Es solo la opción preseleccionada: el usuario puede cambiarla.
   */
  alcanceSugerido = computed<AlcanceCarga>(() => {
    const e = this.estado();
    if (!e?.existe) return 'AMBAS';
    if (e.interrumpida && !e.enEjecucion) return e.ultimaEjecucion?.alcance ?? 'AMBAS';

    const ej = e.ejecucion;
    const dia = !ej || this.vistaDeLote(ej) !== 'ok';
    const ant = this.anterioresPendientes() || e.anteriores.some(l => this.vistaDeLote(l) !== 'ok');

    if (dia && !ant) return 'DIA';
    if (ant && !dia) return 'ANTERIORES';
    return 'AMBAS';
  });

  // ── Pólizas que no cuadran (lote del día) ──────────────────────────────────

  polizasDescuadradas = computed<CuadrePoliza[]>(
    () => this.ejecucion()?.polizasDescuadradas ?? []
  );

  /** Total real: la lista puede venir recortada por el backend. */
  totalPolizasDescuadradas = computed(() => this.ejecucion()?.totalPolizasDescuadradas ?? 0);

  /** Total de pólizas del lote, cuadren o no. `null` si no se calculó el cuadre. */
  totalPolizas = computed(() => {
    const ej = this.ejecucion();
    return ej?.polizas ? ej.totalPolizas : null;
  });

  /** La tabla se recorta salvo que el usuario pida verla entera. */
  polizasVisibles = computed<CuadrePoliza[]>(() => {
    const polizas = this.polizasDescuadradas();
    return this.verTodasLasPolizas() ? polizas : polizas.slice(0, POLIZAS_VISIBLES);
  });

  polizasOcultas = computed(() =>
    Math.max(0, this.polizasDescuadradas().length - this.polizasVisibles().length)
  );

  hayPolizasOcultas = computed(() => this.polizasOcultas() > 0);

  alternarPolizas() {
    this.verTodasLasPolizas.update(v => !v);
  }

  /** Los asientos sin póliza se agrupan bajo cadena vacía. */
  etiquetaPoliza(poliza: string): string {
    return poliza?.trim() ? poliza : 'Sin póliza';
  }

  alternarLote(id: string) {
    this.loteAbierto.update(actual => actual === id ? null : id);
  }

  /**
   * Un reenvío que no encontró nada que reenviar: termina al instante con
   * `registrosObtenidos: 0` y `porcentaje: 0`. No es un fallo.
   */
  reenvioSinErrores = computed(() => {
    const ej = this.ejecucion();
    return !!ej && ej.tipo === 'REENVIO' && !this.enEjecucion() && ej.registrosObtenidos === 0;
  });

  // ── Errores de envío ───────────────────────────────────────────────────────

  /**
   * Hay asientos en ERROR en algún lote. En un descuadre también sale `true`;
   * ahí el listado puede venir vacío porque los asientos quedan en INICIO.
   */
  mostrarBotonVerErrores = computed(() => this.estado()?.tieneErrores === true);

  alternarErrores() {
    if (this.verErrores()) {
      this.cerrarErrores();
      return;
    }
    this.verErrores.set(true);
    this.paginacionErrores.set(PAGINACION_ERRORES_INICIAL);
    this.cargarErrores();
  }

  cerrarErrores() {
    this.erroresSeq++;
    this.verErrores.set(false);
    this.errores.set([]);
    this.erroresMeta.set(null);
    this.paginacionErrores.set(PAGINACION_ERRORES_INICIAL);
    this.isCargandoErrores.set(false);
    this.erroresMsg.set('');
  }

  onChangePageErrores(p: IPagination) {
    this.paginacionErrores.set(p);
    this.cargarErrores();
  }

  numeroFilaError(index: number): number {
    const { page, pageSize } = this.paginacionErrores();
    return index + 1 + (page - 1) * pageSize;
  }

  private async cargarErrores() {
    const seq = ++this.erroresSeq;
    const { page, pageSize } = this.paginacionErrores();

    this.isCargandoErrores.set(true);
    this.erroresMsg.set('');

    try {
      const resp = await firstValueFrom(
        this.service.getErrores(this.fecha(), { page, limit: pageSize })
      );
      if (seq !== this.erroresSeq) return;

      if (!resp?.success) {
        this.erroresMsg.set(resp?.message ?? 'No se pudieron consultar los errores.');
        return;
      }

      const m = resp.data.metadata;

      // Tras un reenvío pueden quedar menos grupos y la página actual quedar
      // fuera de rango: se salta a la última que exista.
      if (resp.data.errores.length === 0 && page > 1 && m.totalPages > 0) {
        this.paginacionErrores.update(p => ({ ...p, page: m.totalPages }));
        this.cargarErrores();
        return;
      }

      this.errores.set(resp.data.errores);
      this.erroresMeta.set(m);
      this.paginacionErrores.set({
        page:       m.page,
        pageSize:   m.limit,
        totalItems: m.total,
        totalPages: m.totalPages,
      });
    } catch (error) {
      if (seq !== this.erroresSeq) return;
      this.erroresMsg.set(this.mensajeError(error, 'Error al consultar los errores.'));
    } finally {
      if (seq === this.erroresSeq) this.isCargandoErrores.set(false);
    }
  }

  // ── Progreso por fase ──────────────────────────────────────────────────────

  /** Lotes anteriores creados por la corrida en curso (los demás son de corridas previas). */
  private lotesAnterioresEnCurso = computed(() => {
    const ult = this.ultimaEjecucion();
    if (!ult) return [];
    const desde = Date.parse(ult.fechaInicio);
    return this.anteriores().filter(l => Date.parse(l.fechaInicio) >= desde);
  });

  /**
   * Una barra por fase mientras el proceso corre. El alcance de la corrida
   * decide cuáles se muestran: DIA = 1-2, ANTERIORES = 3-4, AMBAS = 1-4. El
   * reenvío no pasa por Bantotal: solo tiene envío.
   *
   * Una barra sin porcentaje real se pinta indeterminada: un proceso recién
   * arrancado reporta 0% y una barra vacía parece colgada.
   */
  fases = computed<ProgresoFase[]>(() => {
    if (!this.enEjecucion()) return [];

    const ult = this.ultimaEjecucion();
    const ej  = this.ejecucion();

    // `ejecucion` solo describe la corrida en curso si es la misma bitácora:
    // con alcance ANTERIORES es el resultado de una corrida previa.
    const dia = ej && (!ult || ej.id === ult.id) ? ej : null;

    if ((ult?.tipo ?? dia?.tipo) === 'REENVIO') {
      return dia ? [this.faseReenvio(dia)] : [];
    }

    const alcance: AlcanceCarga = ult?.alcance ?? 'AMBAS';
    const lotes = this.lotesAnterioresEnCurso();

    // Con AMBAS las fases 3-4 arrancan cuando el lote del día ya terminó.
    const enAnteriores = alcance === 'ANTERIORES'
      || lotes.length > 0
      || (ult?.comentario ?? '').includes(MARCA_FASES_ANTERIORES);

    const fases: ProgresoFase[] = [];
    if (alcance !== 'ANTERIORES') fases.push(...this.fasesDelDia(dia, enAnteriores));
    if (alcance !== 'DIA')        fases.push(...this.fasesAnteriores(lotes, enAnteriores));
    return fases;
  });

  private faseReenvio(ej: LoteCargaAsientos): ProgresoFase {
    return {
      titulo:     'Reenvío a Business Central',
      estado:     'en-curso',
      porcentaje: ej.porcentaje > 0 ? ej.porcentaje : null,
      detalle:    ej.registrosObtenidos > 0
        ? `${this.num(ej.registrosProcesados)} de ${this.num(ej.registrosObtenidos)} asiento(s)`
        : 'Buscando asientos en error…',
      color:      COLOR_FASE_ENVIO,
    };
  }

  /**
   * Fases 1 y 2. `porcentaje` solo mide la fase 1 (procesados / obtenidos);
   * el avance de la fase 2 sale del `comentario` de la bitácora.
   */
  private fasesDelDia(ej: LoteCargaAsientos | null, terminado: boolean): ProgresoFase[] {
    const tituloCarga = 'Fase 1 · Obtener lote del día de Bantotal';
    const tituloEnvio = 'Fase 2 · Enviar lote del día a Business Central';

    if (!ej) {
      return [
        { titulo: tituloCarga, estado: 'en-curso', porcentaje: null,
          detalle: 'Consultando Bantotal…', color: COLOR_FASE_CARGA },
        { titulo: tituloEnvio, estado: 'pendiente', porcentaje: 0,
          detalle: 'Empieza al terminar la fase 1', color: COLOR_FASE_ENVIO },
      ];
    }

    // El lote del día ya cerró y la corrida sigue con las fechas anteriores.
    if (terminado) {
      const carga: ProgresoFase = {
        titulo: tituloCarga, estado: 'completa', porcentaje: 100,
        detalle: `${this.num(ej.registrosProcesados)} registro(s)`, color: COLOR_FASE_CARGA,
      };

      let envio: ProgresoFase;
      if (ej.enviado) {
        envio = {
          titulo: tituloEnvio, estado: 'completa', porcentaje: 100,
          detalle: `${this.num(ej.registrosEnviados ?? 0)} aceptado(s)`
            + (ej.registrosConError > 0 ? ` · ${this.num(ej.registrosConError)} con error` : ''),
          color: COLOR_FASE_ENVIO,
        };
      } else if (ej.registrosObtenidos === 0) {
        envio = {
          titulo: tituloEnvio, estado: 'completa', porcentaje: 100,
          detalle: 'Sin asientos que enviar', color: COLOR_FASE_ENVIO,
        };
      } else {
        // Descuadre o fallo: el lote del día no llegó al ERP, pero los lotes
        // anteriores son independientes y siguen.
        envio = {
          titulo: tituloEnvio, estado: 'detenida', porcentaje: 100,
          detalle: 'No se envió: el lote se detuvo antes del envío', color: COLOR_FASE_DETENIDA,
        };
      }
      return [carga, envio];
    }

    const comentario = ej.comentario ?? '';

    // Durante la fase 1 enviados y errores se escriben en 0, así que cualquier
    // valor mayor indica que ya arrancó el envío.
    const lote    = RE_FASE_ENVIO.exec(comentario);
    const tocados = (ej.registrosEnviados ?? 0) + ej.registrosConError;
    const enEnvio = !!lote || tocados > 0;

    // Entre ambas fases corre la validación de cuadre sin guardar la bitácora:
    // la fase 1 ya está al 100% y la 2 todavía no reporta nada.
    const cargaLista = enEnvio
      || (ej.registrosObtenidos > 0 && ej.registrosProcesados >= ej.registrosObtenidos);

    const pagina = cargaLista ? null : RE_FASE_CARGA.exec(comentario);

    const carga: ProgresoFase = {
      titulo:     tituloCarga,
      estado:     cargaLista ? 'completa' : 'en-curso',
      porcentaje: cargaLista ? 100 : (ej.porcentaje > 0 ? ej.porcentaje : null),
      detalle:    ej.registrosObtenidos > 0
        ? `${this.num(ej.registrosProcesados)} de ${this.num(ej.registrosObtenidos)} registro(s)`
          + (pagina ? ` · página ${this.num(+pagina[1])} de ${this.num(+pagina[2])}` : '')
        : 'Consultando Bantotal…',
      color:      COLOR_FASE_CARGA,
    };

    let envio: ProgresoFase;

    if (enEnvio) {
      const hechos = lote ? +lote[1] : tocados;
      const total  = lote ? +lote[2] : 0;
      const pct    = total > 0 ? Math.min(100, Math.round((hechos / total) * 100)) : 0;
      envio = {
        titulo:     tituloEnvio,
        estado:     'en-curso',
        porcentaje: pct > 0 ? pct : null,
        detalle:    total > 0
          ? `${this.num(hechos)} de ${this.num(total)} asiento(s)`
          : `${this.num(hechos)} asiento(s) enviado(s)`,
        color:      COLOR_FASE_ENVIO,
      };
    } else {
      envio = {
        titulo:     tituloEnvio,
        estado:     'pendiente',
        porcentaje: 0,
        detalle:    cargaLista ? 'Validando cuadre de pólizas…' : 'Empieza al terminar la fase 1',
        color:      COLOR_FASE_ENVIO,
      };
    }

    return [carga, envio];
  }

  /**
   * Fases 3 y 4. La fase 3 recorre Bantotal una sola vez y reparte cada página
   * en un lote por fecha valor: todos los lotes reportan la misma página. La
   * fase 4 cuadra y envía lote por lote, y cierra cada bitácora al terminar.
   */
  private fasesAnteriores(lotes: LoteCargaAsientos[], iniciado: boolean): ProgresoFase[] {
    const tituloCarga = 'Fase 3 · Obtener fechas valor anteriores de Bantotal';
    const tituloEnvio = 'Fase 4 · Enviar lotes anteriores a Business Central';

    if (!iniciado) {
      return [
        { titulo: tituloCarga, estado: 'pendiente', porcentaje: 0,
          detalle: 'Empieza al terminar el lote del día', color: COLOR_FASE_CARGA },
        { titulo: tituloEnvio, estado: 'pendiente', porcentaje: 0,
          detalle: 'Empieza al terminar la fase 3', color: COLOR_FASE_ENVIO },
      ];
    }

    const cerrados   = lotes.filter(l => !!l.fechaFin).length;
    const enviando   = lotes.find(l => RE_FASE_ENVIO_ANTERIOR.test(l.comentario ?? ''));
    const pagina     = lotes
      .map(l => RE_FASE_CARGA_ANTERIOR.exec(l.comentario ?? ''))
      .find((m): m is RegExpExecArray => !!m);
    const ultimaPag  = !!pagina && +pagina[1] >= +pagina[2];
    const cargaLista = cerrados > 0 || !!enviando || ultimaPag;
    const nLotes     = `${this.num(lotes.length)} lote(s)`;

    let carga: ProgresoFase;
    if (cargaLista) {
      carga = {
        titulo: tituloCarga, estado: 'completa', porcentaje: 100,
        detalle: nLotes, color: COLOR_FASE_CARGA,
      };
    } else if (pagina) {
      const pct = Math.min(100, Math.round((+pagina[1] / +pagina[2]) * 100));
      carga = {
        titulo: tituloCarga, estado: 'en-curso', porcentaje: pct > 0 ? pct : null,
        detalle: `${nLotes} · página ${this.num(+pagina[1])} de ${this.num(+pagina[2])}`,
        color: COLOR_FASE_CARGA,
      };
    } else {
      carga = {
        titulo: tituloCarga, estado: 'en-curso', porcentaje: null,
        detalle: 'Consultando Bantotal…', color: COLOR_FASE_CARGA,
      };
    }

    if (!cargaLista) {
      return [carga, {
        titulo: tituloEnvio, estado: 'pendiente', porcentaje: 0,
        detalle: 'Empieza al terminar la fase 3', color: COLOR_FASE_ENVIO,
      }];
    }

    const pct = lotes.length > 0 ? Math.round((cerrados / lotes.length) * 100) : 0;
    let detalle = `${this.num(cerrados)} de ${nLotes}`;
    const bloque = enviando ? RE_FASE_ENVIO_ANTERIOR.exec(enviando.comentario ?? '') : null;
    if (enviando && bloque) {
      detalle += ` · ${enviando.fechaValor}: ${this.num(+bloque[1])} de ${this.num(+bloque[2])} asiento(s)`;
    } else if (cerrados === 0) {
      detalle += ' · validando cuadre de pólizas…';
    }

    return [carga, {
      titulo: tituloEnvio, estado: 'en-curso', porcentaje: pct > 0 ? pct : null,
      detalle, color: COLOR_FASE_ENVIO,
    }];
  }

  private num(valor: number): string {
    return formatNumber(valor, this.locale, '1.0-0');
  }

  /**
   * Reenvío rápido: solo lo que quedó en error, en todos los lotes. Se decide
   * con `puedeReenviar`, nunca con `tieneErrores`: en un descuadre los asientos
   * están en INICIO y el reenvío no encontraría nada que hacer.
   */
  mostrarBotonReenviarErrores = computed(() => {
    const e = this.estado();
    return !!e?.puedeReenviar && e.puedeEjecutar;
  });

  /**
   * Carga: sin registro previo, interrumpida, descuadrada, con rechazos del
   * ERP o con fallo técnico. Vuelve a recorrer Bantotal y también levanta lo
   * que quedó en PENDIENTE. Una carga que terminó limpia no se relanza, salvo
   * que quede una parte de la fecha (día o anteriores) sin procesar.
   */
  mostrarBotonEjecutar = computed(() => {
    const e = this.estado();
    if (!e || !e.puedeEjecutar) return false;
    const v = this.vista();
    if (v === 'avance') return false;
    if (v === 'ok') return this.diaPendiente() || this.anterioresPendientes();
    return true;
  });

  textoBotonEjecutar = computed(() => {
    switch (this.vista()) {
      case 'descuadre':    return 'Volver a ejecutar la carga';
      case 'interrumpida': return 'Reintentar carga';
      case 'reenvio':      return 'Volver a enviar todo';
      default:             return 'Ejecutar carga';
    }
  });

  /** Asientos rechazados que cubre el reenvío: suma de todos los lotes reenviables. */
  asientosAReenviar = computed(() => {
    const e = this.estado();
    if (!e) return 0;
    return [e.ejecucion, ...e.anteriores]
      .filter((l): l is LoteCargaAsientos => !!l?.puedeReenviar)
      .reduce((total, l) => total + (l.registrosConError ?? 0), 0);
  });

  textoBotonReenviar = computed(() => {
    const n = this.asientosAReenviar();
    return n === 1 ? 'Reenviar 1 asiento' : `Reenviar ${n} asientos`;
  });

  registrosEnviados = computed(() => this.ejecucion()?.registrosEnviados ?? null);

  /** La ejecución es anterior al contador: se pinta «sin dato», nunca 0. */
  enviadosSinDato = computed(() => !!this.ejecucion() && this.registrosEnviados() === null);

  /** Rótulos que cambian de significado en un reenvío. */
  etiquetaObtenidos = computed(() =>
    this.esReenvio() ? 'Asientos en error encontrados' : 'Registros obtenidos'
  );

  etiquetaProcesados = computed(() =>
    this.esReenvio() ? 'Asientos reintentados' : 'Registros procesados'
  );

  etiquetaEnviados = computed(() =>
    this.esReenvio() ? 'Reenviados con éxito' : 'Aceptados por Business Central'
  );

  etiquetaConError = computed(() =>
    this.esReenvio() ? 'Siguen en error' : 'Registros con error'
  );

  resumenEtiqueta = computed(() =>
    this.esReenvio() ? this.etiquetaEnviados() : 'Registros insertados'
  );

  resumenValor = computed<number | null>(() => {
    const ej = this.ejecucion();
    if (!ej) return null;
    return this.esReenvio() ? this.registrosEnviados() : ej.registrosInsertados;
  });

  textoFrecuencia = computed(() =>
    this.ultimaEsReenvio()
      ? `cada ${POLL_REENVIO_MS / 1000} segundos`
      : `cada ${POLL_CARGA_MS / 60000} minutos`
  );

  /** Formatea `duracionSegundos` como "1h 12m 05s". */
  formatDuracion(segundos: number | null | undefined): string {
    const s = Math.max(0, Math.floor(segundos ?? 0));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const seg = s % 60;
    if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m ${String(seg).padStart(2, '0')}s`;
    if (m > 0) return `${m}m ${String(seg).padStart(2, '0')}s`;
    return `${seg}s`;
  }

  // ── Acciones ───────────────────────────────────────────────────────────────

  /** Busca si ya existe una ejecución para la fecha seleccionada. */
  async buscar() {
    if (!this.fechaValida || this.isBuscando()) return;

    this.isBuscando.set(true);
    this.errorMsg.set('');
    this.avisoMsg.set('');
    this.estado.set(null);
    this.reiniciarVista();

    await this.consultar();

    this.consultado.set(true);
    this.isBuscando.set(false);
  }

  /** Refresco manual, para no esperar el ciclo automático. */
  async refrescar() {
    if (!this.fechaValida || this.isRefrescando() || this.isBuscando()) return;

    this.isRefrescando.set(true);
    this.errorMsg.set('');
    await this.consultar();
    this.isRefrescando.set(false);
  }

  /** Dispara la carga para la fecha con el alcance elegido. */
  ejecutar() {
    if (!this.mostrarBotonEjecutar()) return;
    return this.disparar('carga');
  }

  /** Reenvía únicamente los asientos que quedaron en error, en todos los lotes. */
  reenviarErrores() {
    if (!this.mostrarBotonReenviarErrores()) return;
    return this.disparar('reenvio');
  }

  private async disparar(modo: Exclude<AccionEnCurso, null>) {
    if (!this.fechaValida || this.accion() !== null) return;

    this.accion.set(modo);
    this.errorMsg.set('');
    this.avisoMsg.set('');

    const fecha = this.fecha();
    const peticion$ = modo === 'reenvio'
      ? this.service.reenviarErrores({ fecha })
      : this.service.cargar({ fecha, alcance: this.alcance() });

    const porDefecto = modo === 'reenvio'
      ? 'Reenvío iniciado. El avance se actualiza automáticamente.'
      : 'Carga iniciada. El avance se actualiza automáticamente.';

    try {
      const resp = await firstValueFrom(peticion$);
      if (resp?.success) {
        this.avisoMsg.set(resp.message || porDefecto);
      } else {
        this.errorMsg.set(resp?.message ?? 'No se pudo iniciar el proceso.');
        this.accion.set(null);
        return;
      }
    } catch (error: any) {
      // 409: ya hay un proceso vivo de ese día (con cualquier alcance). No es
      // un fallo, el GET manda.
      if (error?.status === 409) {
        this.avisoMsg.set(
          this.mensajeError(error, 'Ya hay un proceso en curso para esta fecha.')
        );
      } else {
        this.errorMsg.set(this.mensajeError(error, 'Error al iniciar el proceso.'));
        this.accion.set(null);
        return;
      }
    }

    // El 202 solo confirma que arrancó: el estado real lo da la consulta.
    this.alcanceElegido = false;
    await this.consultar();
    this.consultado.set(true);
    this.accion.set(null);
  }

  // ── Consulta y polling ─────────────────────────────────────────────────────

  private async consultar() {
    try {
      const resp = await firstValueFrom(this.service.getEjecucion(this.fecha()));
      if (resp?.success) {
        // Respuestas de un backend previo al cambio no traen la lista.
        this.estado.set({ ...resp.data, anteriores: resp.data.anteriores ?? [] });
        this.ultimaConsulta.set(new Date());
        if (!this.alcanceElegido) this.alcance.set(this.alcanceSugerido());
        this.sincronizarErrores();
        this.sincronizarPolling();
      } else {
        this.errorMsg.set(resp?.message ?? 'No se pudo consultar la ejecución.');
      }
    } catch (error) {
      // Se conserva el último estado conocido para no perder el avance en pantalla.
      this.errorMsg.set(this.mensajeError(error, 'Error al consultar la ejecución.'));
    }
  }

  /**
   * Con el panel abierto, cada consulta del estado refresca también los
   * errores (un reenvío los va reduciendo); si ya no quedan, se cierra.
   */
  private sincronizarErrores() {
    if (!this.verErrores()) return;
    if (this.mostrarBotonVerErrores()) {
      this.cargarErrores();
    } else {
      this.cerrarErrores();
    }
  }

  /**
   * Mantiene el ciclo de consulta vivo solo mientras algún lote está
   * corriendo, y lo reinicia si cambia la cadencia (una carga y un reenvío no
   * se consultan al mismo ritmo).
   */
  private sincronizarPolling() {
    if (!this.enEjecucion()) {
      this.detenerPolling();
      return;
    }

    const ms = this.ultimaEsReenvio() ? POLL_REENVIO_MS : POLL_CARGA_MS;
    if (this.pollId !== null && this.pollMsActual === ms) return;

    this.detenerPolling();
    this.pollMsActual = ms;
    this.pollId = setInterval(() => this.consultar(), ms);
  }

  private detenerPolling() {
    if (this.pollId !== null) {
      clearInterval(this.pollId);
      this.pollId = null;
    }
    this.pollMsActual = null;
  }

  private mensajeError(error: any, porDefecto: string): string {
    return error?.error?.message ?? error?.message ?? porDefecto;
  }

  ngOnDestroy() {
    this.detenerPolling();
  }
}
