import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  inject,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Modal } from 'bootstrap';
import { Router, RouterLink } from '@angular/router';
import { PaginationComponent } from '../../../shared/components/pagination/pagination';
import { EvaluacionScoringService } from '../../../../services/scoring/evaluacion.service';
import {
  IEvaluacionCredito,
  IExpediente,
  IModeloScoring,
  IOpcionExterna,
} from '../../../../interfaces/scoring/scoring';
import { CatalogoVariableService } from '../../../../services/scoring/catalogo-variable.service';
import {
  claseMarco,
  clasePie,
  clasePunto,
  claseTabla,
  estiloMarco,
  estiloPie,
  estiloPunto,
  estiloTabla,
} from '../../utils/semaforo-colores';
import { AuditoriaScoringService } from '../../../../services/scoring/auditoria.service';
import { ModeloScoringService } from '../../../../services/scoring/modelo-scoring.service';
import {
  CrearEvaluacionManualComponent,
  EvaluacionManual,
} from '../../components/crear-evaluacion-manual/crear-evaluacion-manual.component';

/**
 * Todo se guarda como texto, tal como sale de los controles: la conversión a
 * número y la traducción de código a nombre ocurren al consultar, en un solo
 * lugar, en vez de repartidas por cada campo.
 */
interface FiltrosBandeja {
  evaluacionId: string;
  cliente: string;
  /** Código del catálogo del core, no el nombre. */
  region: string;
  /** Código del catálogo del core, no el nombre. */
  agencia: string;
  usuario: string;
  desde: string;
  hasta: string;
}

const aFecha = (valor: Date): string => {
  const mes = String(valor.getMonth() + 1).padStart(2, '0');
  const dia = String(valor.getDate()).padStart(2, '0');
  return `${valor.getFullYear()}-${mes}-${dia}`;
};

/**
 * Del día 1 del mes en curso a hoy.
 *
 * La bandeja arranca acotada: sin rango traía el histórico completo. Para
 * ver meses anteriores hay que ampliar el rango a mano.
 */
const filtrosPorDefecto = (): FiltrosBandeja => {
  const hoy = new Date();

  return {
    evaluacionId: '',
    cliente: '',
    region: '',
    agencia: '',
    usuario: '',
    desde: aFecha(new Date(hoy.getFullYear(), hoy.getMonth(), 1)),
    hasta: aFecha(hoy),
  };
};

/** Pantalla 4: bandeja de Evaluación de Solicitudes de Crédito. */
@Component({
  selector: 'app-evaluacion-page',
  imports: [
    RouterLink,
    DecimalPipe,
    PaginationComponent,
    CrearEvaluacionManualComponent,
  ],
  templateUrl: './evaluacion-page.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class EvaluacionPage implements OnInit, AfterViewInit {
  private evaluacionService = inject(EvaluacionScoringService);
  private modeloService = inject(ModeloScoringService);
  private catalogoService = inject(CatalogoVariableService);
  private auditoriaService = inject(AuditoriaScoringService);
  private router = inject(Router);

  evaluacionList = signal<IEvaluacionCredito[]>([]);
  numeroSolicitud = signal('');
  isLoading = signal(false);
  isConsultando = signal(false);
  procesando = signal<number | null>(null);
  pagination = signal<IPagination>({ page: 1, pageSize: 10, totalItems: 0 });

  modelos = signal<IModeloScoring[]>([]);
  formKeyManual = signal(Date.now());
  isCreandoManual = signal(false);

  // ── Filtros de la bandeja ─────────────────────────────────────────────────

  /**
   * El formulario trabaja sobre un BORRADOR y la bandeja sobre lo APLICADO.
   *
   * Son dos estados a propósito: consultar en cada tecla haría saltar la
   * tabla mientras todavía se está armando el criterio, y paginar tomaría
   * campos a medio escribir. Nada se consulta hasta [Aplicar filtros].
   *
   * Región y Agencia guardan el CÓDIGO del catálogo, no el nombre: el código
   * es lo que encadena la agencia con su región. Al consultar se traduce a
   * nombre, que es lo que el snapshot de Bantotal dejó en la evaluación.
   */
  borrador = signal<FiltrosBandeja>(filtrosPorDefecto());
  private aplicados = signal<FiltrosBandeja>(filtrosPorDefecto());
  /** Regiones y agencias del core, en una sola consulta al abrir. */
  private catalogoUbicaciones = signal<IOpcionExterna[]>([]);

  regiones = computed(() =>
    this.catalogoUbicaciones()
      .filter((o) => o.grupo.toLowerCase() === 'region' && o.activo)
      .sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre)),
  );

  /**
   * Las agencias de la región elegida.
   *
   * Sin región elegida se listan todas: filtrar por agencia sin saber su
   * región es un caso real (el asesor conoce su agencia, no a qué región la
   * asignaron).
   */
  agencias = computed(() => {
    const region = this.borrador().region;

    return this.catalogoUbicaciones()
      .filter((o) => o.grupo.toLowerCase() === 'agencia' && o.activo)
      .filter((o) => !region || o.codigoPadre === region)
      .sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre));
  });

  /** Hay algo que limpiar: ya aplicado, o recién escrito y sin aplicar. */
  hayFiltros = computed(() =>
    [
      ...Object.values(this.borrador()),
      ...Object.values(this.aplicados()),
      this.numeroSolicitud(),
    ].some((valor) => !!valor),
  );
  /**
   * Cada boton aparece solo si algun modelo activo habilita ese origen. Si no,
   * el asesor veria una accion que el backend va a rechazar.
   */
  hayBantotal = computed(() =>
    this.modelos().some((m) => m.origenBantotal && m.estado === 'Activo'),
  );
  hayCaptura = computed(() =>
    this.modelos().some((m) => m.origenCaptura && m.estado === 'Activo'),
  );

  /**
   * Resultado de una evaluación ya procesada.
   *
   * Es el mismo expediente que consulta Auditoría, pero aquí se muestra sin el
   * desglose matemático: al asesor le interesa el dictamen, no los doce
   * factores con sus coeficientes. Ese detalle es trabajo del auditor, y
   * mezclarlo acá convierte una consulta rápida en una pantalla que hay que
   * recorrer.
   */
  resultado = signal<IExpediente | null>(null);
  isCargandoResultado = signal(false);

  @ViewChild('manualModal') manualModalRef!: ElementRef;
  private manualModalInstance!: Modal;

  @ViewChild('resultadoModal') resultadoModalRef!: ElementRef;
  private resultadoModalInstance!: Modal;


  async ngOnInit() {
    const resp = await this.modeloService.getModelos({
      estado: 'Activo',
      limite: 200,
    });
    this.modelos.set(resp?.items ?? []);

    /* Una sola llamada trae las regiones con sus agencias anidadas; el
       servicio las devuelve aplanadas y cada agencia conserva su región en
       codigoPadre, que es lo que alimenta la cascada de los filtros. */
    this.catalogoUbicaciones.set(
      await this.catalogoService.getCatalogoExterno('region'),
    );

    await this.fetchData();
  }

  ngAfterViewInit() {
    this.manualModalInstance = new Modal(this.manualModalRef.nativeElement);
    this.resultadoModalInstance = new Modal(this.resultadoModalRef.nativeElement);
  }

  openManualModal() {
    this.formKeyManual.set(Date.now());
    this.manualModalInstance.show();
  }

  closeManualModal() {
    this.manualModalInstance.hide();
  }

  /**
   * Guarda la evaluacion en estado Solicitud y lleva a la captura del
   * cuestionario, que es la pantalla que ya resuelve el formulario dinamico.
   */
  async guardarManual(manual: EvaluacionManual) {
    this.isCreandoManual.set(true);
    try {
      const resp = await this.evaluacionService.createEvaluacion({
        numeroSolicitud: manual.numeroSolicitud,
        scoringId: manual.scoringId,
        datosBantotal: manual.datos,
        respuestas: [],
        origenDatos: 'Captura',
      });

      if (resp?.data?.evaluacionId) {
        this.closeManualModal();
        this.router.navigate([
          '/scoring/evaluacion/captura/evaluacion',
          resp.data.evaluacionId,
        ]);
      }
    } finally {
      this.isCreandoManual.set(false);
    }
  }

  async fetchData() {
    if (this.isLoading()) return;
    this.isLoading.set(true);
    try {
      const filtros = this.aplicados();
      const numero = Number(this.numeroSolicitud());
      const evaluacionId = Number(filtros.evaluacionId);

      const resp = await this.evaluacionService.getEvaluaciones({
        numeroSolicitud:
          Number.isFinite(numero) && numero > 0 ? numero : undefined,
        evaluacionId:
          Number.isFinite(evaluacionId) && evaluacionId > 0
            ? evaluacionId
            : undefined,
        cliente: filtros.cliente || undefined,
        // La evaluación guardó el nombre, no el código del catálogo.
        region: this.nombreUbicacion(filtros.region),
        agencia: this.nombreUbicacion(filtros.agencia),
        usuario: filtros.usuario || undefined,
        fechaDesde: filtros.desde || undefined,
        fechaHasta: filtros.hasta || undefined,
        pagina: this.pagination().page,
        limite: this.pagination().pageSize,
      });

      if (resp) {
        this.evaluacionList.set(resp.items ?? []);
        this.pagination.set({
          page: resp.pagina,
          pageSize: resp.limite,
          totalItems: resp.total,
        });
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  /** El nombre con el que el core identifica una región o agencia. */
  private nombreUbicacion(codigo: string): string | undefined {
    if (!codigo) return undefined;

    return this.catalogoUbicaciones().find((o) => o.codigo === codigo)?.nombre;
  }

  /**
   * La caja de Bantotal filtra por número de solicitud y es independiente del
   * formulario: no puede pasar por aplicarFiltros(), que vuelca el borrador y
   * borraría lo que el usuario tiene escrito sin aplicar.
   */
  filtrarPorSolicitud() {
    this.pagination.update((p) => ({ ...p, page: 1 }));
    this.fetchData();
  }

  /** Escribe un campo del borrador. No consulta nada. */
  editar(campo: keyof FiltrosBandeja, valor: string) {
    this.borrador.update((f) => ({ ...f, [campo]: valor }));
  }

  /**
   * Cambiar de región descarta la agencia elegida: puede no pertenecer a la
   * región nueva, y entonces el filtro combinado no devolvería nada sin que se
   * entienda por qué.
   */
  cambiarRegion(codigo: string) {
    this.borrador.update((f) => ({ ...f, region: codigo, agencia: '' }));
  }

  /**
   * Filtrar siempre vuelve a la página 1: con otro criterio la página 3 de
   * antes no corresponde a nada, y la bandeja saldría vacía.
   */
  aplicarFiltros() {
    this.aplicados.set({ ...this.borrador() });
    this.pagination.update((p) => ({ ...p, page: 1 }));
    this.fetchData();
  }

  /**
   * Vuelve al rango del mes en curso y consulta de inmediato, sin esperar a
   * [Aplicar]: quien limpia quiere ver el resultado, no los campos en blanco.
   */
  limpiarFiltros() {
    this.borrador.set(filtrosPorDefecto());
    this.aplicados.set(filtrosPorDefecto());
    this.numeroSolicitud.set('');
    this.pagination.update((p) => ({ ...p, page: 1 }));
    this.fetchData();
  }
  changePage(pagination: IPagination) {
    this.pagination.set(pagination);
    this.fetchData();
  }

  /**
   * Botón [Consultar Bantotal].
   *
   * Solo navega a la captura si el core confirma la solicitud: si no existe, el
   * servicio ya mostró ERR-SCOR-007 y no tiene sentido abrir un formulario que
   * no se podría guardar.
   */
  async consultarBantotal() {
    const numero = Number(this.numeroSolicitud());
    if (!Number.isFinite(numero) || numero <= 0) return;

    this.isConsultando.set(true);
    try {
      const solicitud = await this.evaluacionService.consultarBantotal(numero);
      if (solicitud) {
        this.router.navigate(['/scoring/evaluacion/captura/solicitud', numero]);
      }
    } finally {
      this.isConsultando.set(false);
    }
  }

  abrirCaptura(evaluacion: IEvaluacionCredito) {
    this.router.navigate([
      '/scoring/evaluacion/captura/evaluacion',
      evaluacion.evaluacionId,
    ]);
  }

  /**
   * Resultado del dictamen, sin salir de la bandeja.
   *
   * Antes esto navegaba a Auditoría. Son dos consultas distintas: el asesor
   * quiere ver en qué quedó la evaluación que acaba de procesar, y el auditor
   * quiere reconstruir la aritmética. Mandar al primero a la pantalla del
   * segundo le hacía perder el filtro y el lugar en la bandeja.
   */
  async verResultado(evaluacion: IEvaluacionCredito) {
    if (!evaluacion.evaluacionId) return;

    this.resultado.set(null);
    this.isCargandoResultado.set(true);
    this.resultadoModalInstance.show();

    try {
      this.resultado.set(
        await this.auditoriaService.getExpediente(evaluacion.evaluacionId),
      );
    } finally {
      this.isCargandoResultado.set(false);
    }
  }

  cerrarResultado() {
    this.resultadoModalInstance.hide();
  }

  /** Para el detalle matemático completo, que vive en Auditoría. */
  verExpediente(evaluacionId: number) {
    this.cerrarResultado();
    this.router.navigate(['/scoring/auditoria'], {
      queryParams: { evaluacionId },
    });
  }

  /** Botón [P]: calcula el dictamen y sella la evaluación. */
  async procesar(evaluacion: IEvaluacionCredito) {
    if (!evaluacion.evaluacionId) return;

    this.procesando.set(evaluacion.evaluacionId);
    try {
      const resp = await this.evaluacionService.procesar(
        evaluacion.evaluacionId,
      );
      if (resp) await this.fetchData();
    } finally {
      this.procesando.set(null);
    }
  }

  /**
   * Colores del dictamen, para la plantilla.
   *
   * Viven en un módulo aparte porque la bandeja y Auditoría tienen que
   * pintar el mismo dictamen igual, y dos copias de la regla terminarían
   * divergiendo. Cada par es clase + estilo: la clase es el camino de
   * siempre, el estilo el del hexadecimal parametrizado.
   */
  readonly clasePunto = clasePunto;
  readonly estiloPunto = estiloPunto;
  readonly claseMarco = claseMarco;
  readonly estiloMarco = estiloMarco;

}
