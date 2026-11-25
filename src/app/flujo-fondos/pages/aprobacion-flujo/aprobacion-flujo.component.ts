import {
  ChangeDetectionStrategy,
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  DestroyRef,
  ElementRef,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Modal } from 'bootstrap';
import { CATALOGOS_ACTIVIDAD } from '../../../../interfaces/actividad-economica';
import {
  EstadoFlujo,
  ICategoriaParametro,
  IFlujoDetalle,
  ILineaFlujo,
  IParametroFlujo,
  IParametrosFlujo,
  IPendientesConversaciones,
} from '../../../../interfaces/flujo-fondos';
import { CatalogoService } from '../../../../services/flujo-fondos/catalogo.service';
import { ConversacionFlujoService } from '../../../../services/flujo-fondos/conversacion.service';
import { FlujoFondosService } from '../../../../services/flujo-fondos/flujo-fondos.service';
import { FormatoExcelFlujo, ReporteFlujoService } from '../../../../services/flujo-fondos/reporte-flujo.service';
import { NotificacionesFlujoModal } from '../../components/notificaciones-flujo-modal/notificaciones-flujo-modal';
import { ActividadesEstacionalesComponent } from '../../components/flujo/actividades-estacionales/actividades-estacionales';
import { OtrosPrestamosComponent } from '../../components/flujo/otros-prestamos/otros-prestamos';
import { ProyeccionFlujoComponent } from '../../components/flujo/proyeccion-flujo/proyeccion-flujo';
import { ResumenActividadesComponent } from '../../components/flujo/resumen-actividades/resumen-actividades';
import { SeccionComponent } from '../../../shared/components/seccion/seccion';
import { formatoFecha, formatoPeriodo, montoCiclo, sumaMontos, sumarMeses } from '../../utils/flujo';

const MAX_COMENTARIO = 500;

/** categoria: null no debería llegar (la BD la exige), pero viene tipada como nullable. */
const SIN_CATEGORIA = 'SIN_CATEGORIA';
const COLOR_SIN_CATEGORIA = '#6C757D';

type Tono = 'warning' | 'success' | 'danger' | 'secondary';

/** Cómo se presenta cada estado en el banner del dictamen. */
const ESTADO_DICTAMEN: Record<EstadoFlujo, { etiqueta: string; tono: Tono; icono: string }> = {
  CREADO: { etiqueta: 'En revisión', tono: 'warning', icono: 'alert-circle-outline' },
  CORREGIDO: { etiqueta: 'Corregido · En revisión', tono: 'warning', icono: 'alert-circle-outline' },
  RECHAZADO: { etiqueta: 'Rechazado', tono: 'danger', icono: 'close-circle-outline' },
  ACEPTADO: { etiqueta: 'Aprobado', tono: 'success', icono: 'checkmark-circle-outline' },
  ANULADO: { etiqueta: 'Anulado', tono: 'secondary', icono: 'ban-outline' },
};

/**
 * Aprobación de un flujo de fondos (rol analista de crédito).
 *
 * Se busca por número de solicitud (?solicitud=894512): de los flujos de la solicitud se
 * toma el que no está anulado (el back solo permite uno). La revisión es de solo lectura;
 * "Aprobar flujo" lo pasa a ACEPTADO con POST /:id/estado y desde ahí ya no se puede editar.
 * "Flujo preliminar" muestra la misma matriz que se genera al crear o editar el flujo.
 */
@Component({
  selector: 'app-aprobacion-flujo',
  imports: [
    RouterLink,
    DatePipe,
    DecimalPipe,
    SeccionComponent,
    ProyeccionFlujoComponent,
    OtrosPrestamosComponent,
    ActividadesEstacionalesComponent,
    ResumenActividadesComponent,
    NotificacionesFlujoModal,
  ],
  templateUrl: './aprobacion-flujo.component.html',
  styles: `
    .titulo-pagina { font-size: 1.75rem; font-weight: 700; letter-spacing: -0.01em; }
    .eyebrow { font-size: .75rem; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; color: var(--bs-secondary-color); }

    .dictamen { border: 1px solid; border-radius: .75rem; }
    .dictamen-icono {
      width: 2.5rem; height: 2.5rem; border-radius: 50%;
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 1.4rem; color: #FFFFFF; flex-shrink: 0;
    }
    .dictamen-warning { background: var(--bs-warning-bg-subtle); border-color: var(--bs-warning-border-subtle); }
    .dictamen-warning .dictamen-icono { background: var(--bs-warning); }
    .dictamen-success { background: var(--bs-success-bg-subtle); border-color: var(--bs-success-border-subtle); }
    .dictamen-success .dictamen-icono { background: var(--bs-success); }
    .dictamen-danger { background: var(--bs-danger-bg-subtle); border-color: var(--bs-danger-border-subtle); }
    .dictamen-danger .dictamen-icono { background: var(--bs-danger); }
    .dictamen-secondary { background: var(--bs-secondary-bg-subtle); border-color: var(--bs-secondary-border-subtle); }
    .dictamen-secondary .dictamen-icono { background: var(--bs-secondary); }
    .pildora { border: 1px solid currentColor; border-radius: 999px; padding: .15rem .75rem; font-weight: 700; font-size: .8rem; text-transform: uppercase; }
    .pildora-warning { color: var(--bs-warning-text-emphasis); background: var(--bs-warning-border-subtle); }
    .pildora-success { color: var(--bs-success-text-emphasis); background: var(--bs-success-border-subtle); }
    .pildora-danger { color: var(--bs-danger-text-emphasis); background: var(--bs-danger-border-subtle); }
    .pildora-secondary { color: var(--bs-secondary-text-emphasis); background: var(--bs-secondary-border-subtle); }

    .expediente { border-left: 4px solid var(--bs-primary) !important; }
    .dato-etiqueta { font-size: .7rem; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; color: var(--bs-secondary-color); }
    .dato-valor { font-weight: 600; }

    .kpi { border: 1px solid var(--bs-border-color); border-radius: .5rem; padding: .9rem 1rem; height: 100%; background: var(--bs-tertiary-bg); }
    .kpi-titulo { font-size: .75rem; font-weight: 600; text-transform: uppercase; color: var(--bs-secondary-color); }
    .kpi-valor { font-family: var(--bs-font-monospace); font-size: 1.25rem; font-weight: 700; margin: .25rem 0; }
    .kpi-nota { font-size: .75rem; color: var(--bs-secondary-color); }
    .kpi-primary { background: var(--bs-primary-bg-subtle); border-color: var(--bs-primary-border-subtle); }
    .kpi-primary .kpi-titulo, .kpi-primary .kpi-valor, .kpi-primary .kpi-nota { color: var(--bs-primary-text-emphasis); }
    .kpi-success { background: var(--bs-success-bg-subtle); border-color: var(--bs-success-border-subtle); }
    .kpi-success .kpi-titulo, .kpi-success .kpi-valor, .kpi-success .kpi-nota { color: var(--bs-success-text-emphasis); }
    .kpi-danger { background: var(--bs-danger-bg-subtle); border-color: var(--bs-danger-border-subtle); }
    .kpi-danger .kpi-titulo, .kpi-danger .kpi-valor, .kpi-danger .kpi-nota { color: var(--bs-danger-text-emphasis); }

    .kpi-categoria {
      background: color-mix(in srgb, var(--cat) 7%, var(--bs-body-bg));
      border-color: color-mix(in srgb, var(--cat) 35%, var(--bs-body-bg));
      border-left: 4px solid var(--cat);
    }
    .kpi-categoria .kpi-titulo, .kpi-categoria .kpi-valor { color: var(--cat); }
    .kpi-tipo { font-size: .65rem; font-weight: 700; text-transform: uppercase; border-radius: 999px; padding: .05rem .5rem; }

    .tabla-oscura thead th { background-color: var(--bs-dark); color: #FFFFFF; font-weight: 600; white-space: nowrap; }
    .etiqueta-cultivo { background-color: var(--bs-success-bg-subtle); border: 1px solid var(--bs-success-border-subtle); color: var(--bs-success-text-emphasis); }
    .etiqueta-pecuario { background-color: #F3E8FF; border: 1px solid #E9D5FF; color: #6B21A8; }
    .etiqueta-otra { background-color: var(--bs-secondary-bg-subtle); border: 1px solid var(--bs-secondary-border-subtle); color: var(--bs-secondary-text-emphasis); }

    .btn-aprobar { font-weight: 700; text-transform: uppercase; padding: .6rem 1.75rem; }
    .badge-notificaciones { font-size: .7rem; }
  `,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class AprobacionFlujoComponent implements OnInit {

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private flujoService = inject(FlujoFondosService);
  private catalogoService = inject(CatalogoService);
  private conversacionService = inject(ConversacionFlujoService);
  private reporteService = inject(ReporteFlujoService);

  private resumenRef = viewChild(ResumenActividadesComponent);
  private preliminarModalRef = viewChild.required<ElementRef>('preliminarModal');
  private aprobarModalRef = viewChild.required<ElementRef>('aprobarModal');
  private preliminarModal?: Modal;
  private aprobarModal?: Modal;

  readonly formatoFecha = formatoFecha;
  readonly formatoPeriodo = formatoPeriodo;
  readonly maxComentario = MAX_COMENTARIO;

  // ── Búsqueda ─────────────────────────────────────────────────────────────
  numeroSolicitud = signal('');
  buscando = signal(false);
  mensajeBusqueda = signal<string | null>(null);
  private secuencia = 0;

  // ── Flujo ────────────────────────────────────────────────────────────────
  flujo = signal<IFlujoDetalle | null>(null);
  agrupar = signal(true);
  cargandoProyeccion = signal(false);
  /** Formato que se está generando (null: ninguno). */
  descargandoExcel = signal<FormatoExcelFlujo | null>(null);
  private unidades = signal<Map<string, string>>(new Map());
  /** codigoActividad → tipo de actividad (Cultivo, Pecuario...), sale del resumen de actividades. */
  private tipos = signal<Map<string, string>>(new Map());

  // ── Aprobación ───────────────────────────────────────────────────────────
  comentario = signal('');
  aprobando = signal(false);
  /** Se vuelven a consultar las conversaciones antes de mostrar la confirmación */
  revisandoPendientes = signal(false);

  // ── Notificaciones (conversaciones) ──────────────────────────────────────
  /** null = no se pudo consultar (sin badge) */
  pendientes = signal<IPendientesConversaciones | null>(null);
  notificacionesAbiertas = signal(false);
  /** Conversación que se abre directamente (desde el aviso antes de aprobar) */
  conversacionInicial = signal<string | null>(null);

  tituloNotificaciones = computed(() => {
    const p = this.pendientes();
    if (!p) return 'Notificaciones';
    return `Notificaciones: ${p.abiertas} abiertas · ${p.cerradas} cerradas · ${p.noLeidos} sin leer`;
  });

  dictamen = computed(() => {
    const f = this.flujo();
    return f ? ESTADO_DICTAMEN[f.estado] : null;
  });

  puedeAprobar = computed(() => !!this.flujo()?.estadosSiguientes.includes('ACEPTADO'));

  /** Por qué el botón de aprobar está deshabilitado. */
  motivoNoAprobable = computed(() => {
    const f = this.flujo();
    if (!f || this.puedeAprobar()) return '';
    if (f.estado === 'ACEPTADO') return 'El flujo ya fue aprobado.';
    if (f.estado === 'RECHAZADO') return 'El flujo fue rechazado: debe corregirse antes de aprobarlo.';
    return `Un flujo en estado ${f.estado} no se puede aprobar.`;
  });

  /** Rango del horizonte: 'Oct 2026 – Sep 2028'. */
  rangoHorizonte = computed(() => {
    const f = this.flujo();
    if (!f) return '';
    const inicio = f.fechaInicio.slice(0, 10);
    return `${formatoPeriodo(inicio)} – ${formatoPeriodo(sumarMeses(inicio, f.plazoMeses - 1))}`;
  });

  // ── Sección I: parámetros de Bantotal ────────────────────────────────────
  parametros = signal<IParametrosFlujo | null>(null);
  cargandoParametros = signal(false);
  errorParametros = signal<string | null>(null);

  /**
   * Tarjetas de la sección I: una por categoría con la suma del montoBase (antes del factor)
   * de sus parámetros con montoBase > 0.
   * Si una categoría tiene ingresos y egresos, se parte en dos tarjetas (esIngreso manda, no la categoría).
   * Orden: categoria.orden y, dentro de la misma categoría, primero el ingreso.
   */
  tarjetasCategoria = computed(() => {
    const p = this.parametros()?.parametros;
    if (!p) return null;

    type Grupo = { cat: string; categoria: ICategoriaParametro | null; esIngreso: boolean; parametros: IParametroFlujo[] };
    const grupos = new Map<string, Grupo>();
    for (const x of p) {
      if (!(x.montoBase > 0)) continue;
      const cat = x.categoriaId ?? x.categoria?.id ?? SIN_CATEGORIA;
      const key = `${cat}|${x.esIngreso ? 'I' : 'E'}`;
      const grupo = grupos.get(key) ?? { cat, categoria: x.categoria ?? null, esIngreso: x.esIngreso, parametros: [] };
      grupo.parametros.push(x);
      grupos.set(key, grupo);
    }

    // Categorías con ingresos y egresos a la vez: sus dos tarjetas llevan la etiqueta del tipo
    const conAmbos = new Set([...grupos.values()].filter(g => g.esIngreso && grupos.has(`${g.cat}|E`)).map(g => g.cat));

    return [...grupos.entries()]
      .sort(([, a], [, b]) =>
        (a.categoria?.orden ?? Number.MAX_SAFE_INTEGER) - (b.categoria?.orden ?? Number.MAX_SAFE_INTEGER)
        || a.cat.localeCompare(b.cat)
        || Number(b.esIngreso) - Number(a.esIngreso))
      .map(([key, g]) => ({
        key,
        nombre: g.categoria?.nombre ?? 'Sin categoría',
        color: g.categoria?.color || COLOR_SIN_CATEGORIA,
        esIngreso: g.esIngreso,
        dividida: conAmbos.has(g.cat),
        total: sumaMontos(g.parametros.map(x => x.montoBase)),
        detalle: g.parametros.map(x => x.nombre || x.clave).join(', '),
      }));
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.preliminarModal?.dispose();
      this.aprobarModal?.dispose();
    });
  }

  ngOnInit() {
    this.cargarUnidades();
    this.route.queryParamMap.subscribe(params => {
      const solicitud = (params.get('solicitud') ?? '').replace(/\D/g, '');
      this.numeroSolicitud.set(solicitud);
      if (solicitud) {
        this.cargar(Number(solicitud));
      } else {
        this.limpiar();
      }
    });
  }

  private async cargarUnidades() {
    const unidades = await this.catalogoService.select(CATALOGOS_ACTIVIDAD.unidadGiro, null, true);
    if (unidades) this.unidades.set(new Map((unidades.opciones ?? []).map(o => [o.value.toUpperCase(), o.label])));
  }

  unidad(codigo: string | null | undefined): string {
    if (!codigo) return '';
    return this.unidades().get(codigo.toUpperCase()) ?? codigo;
  }

  // ── Búsqueda ─────────────────────────────────────────────────────────────

  /** Solo dígitos: el número de solicitud es entero. */
  onNumeroSolicitud(input: HTMLInputElement) {
    const numero = input.value.replace(/\D/g, '');
    input.value = numero;
    this.numeroSolicitud.set(numero);
  }

  /** La URL lleva la solicitud: se puede recargar o compartir el enlace del expediente. */
  revisar() {
    const numero = this.numeroSolicitud();
    if (!numero || this.buscando()) return;
    if (this.route.snapshot.queryParamMap.get('solicitud') === numero) {
      this.cargar(Number(numero));
      return;
    }
    this.router.navigate([], { relativeTo: this.route, queryParams: { solicitud: numero } });
  }

  private limpiar() {
    this.secuencia++;
    this.flujo.set(null);
    this.tipos.set(new Map());
    this.parametros.set(null);
    this.errorParametros.set(null);
    this.cargandoParametros.set(false);
    this.pendientes.set(null);
    this.notificacionesAbiertas.set(false);
    this.mensajeBusqueda.set(null);
    this.buscando.set(false);
  }

  private async cargar(numeroSolicitud: number) {
    this.limpiar();
    const secuencia = this.secuencia;
    this.buscando.set(true);

    // Del más reciente al más antiguo; a lo sumo uno no está anulado
    const resp = await this.flujoService.getFlujos({ numeroSolicitud, limit: 50 });
    if (secuencia !== this.secuencia) return;

    if (!resp) {
      this.buscando.set(false);
      this.mensajeBusqueda.set('No se pudo consultar la solicitud. Intente de nuevo.');
      return;
    }

    const flujos = resp.data.flujos ?? [];
    const activo = flujos.find(f => f.estado !== 'ANULADO');
    if (!activo) {
      this.buscando.set(false);
      this.mensajeBusqueda.set(flujos.length
        ? `La solicitud ${numeroSolicitud} no tiene un flujo de fondos vigente: ${flujos.length === 1 ? 'su único flujo está anulado' : `sus ${flujos.length} flujos están anulados`}.`
        : `La solicitud ${numeroSolicitud} no tiene flujo de fondos.`);
      return;
    }

    // Puede tardar (la primera vez consulta Bantotal) y fallar sin impedir la revisión
    this.cargarParametros(activo.id);
    this.cargarPendientes(activo.id);

    const [flujo, resumen] = await Promise.all([
      this.flujoService.getFlujoById(activo.id, this.agrupar()),
      this.flujoService.getResumenActividades(activo.id),
    ]);
    if (secuencia !== this.secuencia) return;
    this.buscando.set(false);

    if (!flujo) {
      this.mensajeBusqueda.set('No se pudo cargar el flujo de fondos. Intente de nuevo.');
      return;
    }

    const tipos = new Map<string, string>();
    resumen?.filas.forEach(fila => fila.codigosActividad.forEach(codigo => tipos.set(codigo, fila.actividad)));
    this.tipos.set(tipos);
    this.flujo.set(flujo);
  }

  // ── Sección I ────────────────────────────────────────────────────────────

  async cargarParametros(id: string) {
    const secuencia = this.secuencia;
    this.cargandoParametros.set(true);
    this.errorParametros.set(null);
    const resp = await this.flujoService.getParametros(id);
    if (secuencia !== this.secuencia) return;
    this.cargandoParametros.set(false);
    if ('data' in resp) {
      this.parametros.set(resp.data);
    } else {
      this.errorParametros.set(resp.error);
    }
  }

  // ── Sección II ───────────────────────────────────────────────────────────

  tipoActividad(linea: ILineaFlujo): string {
    return this.tipos().get(linea.codigoActividad) ?? '';
  }

  claseTipo(tipo: string): string {
    const nombre = tipo.trim().toLowerCase();
    if (nombre === 'cultivo') return 'etiqueta-cultivo';
    if (nombre === 'pecuario') return 'etiqueta-pecuario';
    return 'etiqueta-otra';
  }

  /** Ingreso y egreso de un ciclo completo: cantidad × cantidad estimada × precio (o costo) unitario. */
  montosLinea(l: ILineaFlujo) {
    const cantidad = Number(l.cantidad);
    const estimada = Number(l.cantidadEstimada);
    return {
      ingreso: montoCiclo(cantidad, estimada, Number(l.precioU)),
      egreso: montoCiclo(cantidad, estimada, l.costoU === null ? null : Number(l.costoU)),
    };
  }

  verResumen() {
    const f = this.flujo();
    if (f) this.resumenRef()?.abrir(f.id);
  }

  // ── Flujo preliminar ─────────────────────────────────────────────────────

  abrirPreliminar() {
    if (!this.flujo()) return;
    this.preliminarModal ??= new Modal(this.preliminarModalRef().nativeElement);
    this.preliminarModal.show();
  }

  /** La matriz agrupada o por línea la arma el back: se vuelve a pedir el flujo. */
  async cambiarAgrupacion(agrupar: boolean) {
    const f = this.flujo();
    if (!f) return;
    this.agrupar.set(agrupar);
    this.cargandoProyeccion.set(true);
    const secuencia = this.secuencia;
    const flujo = await this.flujoService.getFlujoById(f.id, agrupar);
    if (secuencia !== this.secuencia) return;
    this.cargandoProyeccion.set(false);
    if (flujo) this.flujo.set(flujo);
  }

  // ── Descargar Excel ──────────────────────────────────────────────────────

  /**
   * Llena la plantilla del formato con el flujo y la descarga (en el navegador):
   * AJUSTADO (principal) = FLUJOF-REPORTE-EXCEL, usa los parámetros de la sección I;
   * DETALLADO (secundario) = FLUJOF-REPORTE-EXCEL-V2.
   */
  async descargarExcel(formato: FormatoExcelFlujo) {
    const f = this.flujo();
    if (!f || this.descargandoExcel()) return;
    this.descargandoExcel.set(formato);
    try {
      await this.reporteService.descargarExcel(f, formato, this.parametros()?.parametros);
    } finally {
      this.descargandoExcel.set(null);
    }
  }

  // ── Notificaciones ───────────────────────────────────────────────────────

  /** Badge del botón y aviso antes de aprobar. Si falla (404 MS-FJF-61-01), el botón queda sin badge. */
  async cargarPendientes(id: string) {
    const secuencia = this.secuencia;
    const resp = await this.conversacionService.resumen(id);
    if (secuencia !== this.secuencia) return;
    this.pendientes.set(resp.ok ? resp.data : null);
  }

  abrirNotificaciones(conversacionId: string | null = null) {
    if (!this.flujo()) return;
    this.conversacionInicial.set(conversacionId);
    this.notificacionesAbiertas.set(true);
  }

  cerrarNotificaciones() {
    this.notificacionesAbiertas.set(false);
    this.conversacionInicial.set(null);
  }

  onNotificacionesActualizadas() {
    const f = this.flujo();
    if (f) this.cargarPendientes(f.id);
  }

  /** Desde el aviso de la confirmación: se deja la aprobación y se revisan las conversaciones */
  revisarConversaciones(conversacionId: string | null = null) {
    this.aprobarModal?.hide();
    this.abrirNotificaciones(conversacionId);
  }

  // ── Aprobación ───────────────────────────────────────────────────────────

  /**
   * Antes de confirmar se consultan las conversaciones: si hay abiertas se avisa en la
   * confirmación, sin bloquear (el back permite aprobar igual).
   */
  async abrirAprobacion() {
    const f = this.flujo();
    if (!f || !this.puedeAprobar() || this.revisandoPendientes()) return;

    this.revisandoPendientes.set(true);
    await this.cargarPendientes(f.id);
    this.revisandoPendientes.set(false);
    if (this.flujo() !== f) return;

    this.comentario.set('');
    this.aprobarModal ??= new Modal(this.aprobarModalRef().nativeElement);
    this.aprobarModal.show();
  }

  onComentario(input: HTMLTextAreaElement) {
    this.comentario.set(input.value);
  }

  async aprobar() {
    const f = this.flujo();
    if (!f || !this.puedeAprobar() || this.aprobando()) return;

    this.aprobando.set(true);
    const comentario = this.comentario().trim();
    const actualizado = await this.flujoService.cambiarEstado(f.id, {
      estado: 'ACEPTADO',
      ...(comentario ? { comentario } : {}),
    });

    // Con éxito o con 409 (otro usuario lo cambió), se vuelve a leer: el estado, `editable`
    // y `estadosSiguientes` los decide el back
    const secuencia = this.secuencia;
    const flujo = await this.flujoService.getFlujoById(f.id, this.agrupar());
    this.aprobando.set(false);
    if (actualizado) this.aprobarModal?.hide();
    if (flujo && secuencia === this.secuencia) this.flujo.set(flujo);
  }
}
