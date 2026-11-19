import {
  ChangeDetectionStrategy,
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  DestroyRef,
  inject,
  OnInit,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import { DecimalPipe, LowerCasePipe, NgTemplateOutlet } from '@angular/common';
import { AbstractControl, FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { debounceTime, Subject } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { CATALOGOS_ACTIVIDAD, IActividadEconomica } from '../../../../interfaces/actividad-economica';
import {
  CLASE_ESTADO_FLUJO,
  IEstacional,
  IFlujoDetalle,
  IFlujoEncabezado,
  IFlujoExistente,
  IEstacionalInput,
  ILineaFlujoInput,
  IOtroPrestamo,
  IProyeccionFlujoInput,
  ISimulacionFlujo,
  ISolicitudCreditoBantotal,
  MAX_ESTACIONALES,
  MAX_LINEAS_FLUJO,
  MAX_OTROS_PRESTAMOS,
  PLAZO_FLUJO_MESES,
} from '../../../../interfaces/flujo-fondos';
import { ActividadEconomicaService } from '../../../../services/flujo-fondos/actividad-economica.service';
import { CatalogoService } from '../../../../services/flujo-fondos/catalogo.service';
import { FalloConsulta, FlujoFondosService } from '../../../../services/flujo-fondos/flujo-fondos.service';
import { ActividadesEstacionalesComponent } from '../../components/flujo/actividades-estacionales/actividades-estacionales';
import { OtrosPrestamosComponent } from '../../components/flujo/otros-prestamos/otros-prestamos';
import { ProyeccionFlujoComponent } from '../../components/flujo/proyeccion-flujo/proyeccion-flujo';
import { ResumenActividadesComponent } from '../../components/flujo/resumen-actividades/resumen-actividades';
import { formatoFecha, formatoPeriodo, maxDecimales, mesActual, montoCiclo } from '../../utils/flujo';
import { SeccionComponent } from '../../../shared/components/seccion/seccion';
import { AutocompleteComponent, AutocompleteOption } from '../../../shared/components/autocomplete/autocomplete';

const SIMULAR_DEBOUNCE_MS = 600;

/** Resultados que muestra el buscador de actividad de cada línea. */
const MAX_RESULTADOS_ACTIVIDAD = 5;

interface LineaValor {
  // Solo filtran el buscador de actividad: no se envían al back
  filtroActividad: string | null;      // código de opción de ACTI
  filtroSubActividad: string | null;   // código de opción de SUB-ACT
  actividadEconomicaId: string | null;
  nombre: string;
  fechaSiembra: string;
  cantidad: number | string | null;
}

/**
 * Flujo de fondos de una solicitud.
 *
 * - /flujo-fondos/flujos/nuevo: se consulta la solicitud en Bantotal y, si no tiene un
 *   flujo activo, se capturan horizonte, líneas, actividades estacionales y préstamos en
 *   otras instituciones con vista previa (POST /simular).
 * - /flujo-fondos/flujos/:id: detalle del flujo. Mientras el back lo marque `editable`
 *   (CREADO, RECHAZADO, CORREGIDO) se editan todos sus elementos con la misma captura y vista
 *   previa de la creación, y se guarda con PUT /:id. ACEPTADO y ANULADO son de solo lectura
 *   (se aprueban en /flujo-fondos/aprobacion/revisar; el back también rechaza el PUT con 409).
 */
@Component({
  selector: 'app-flujo',
  imports: [RouterLink, DecimalPipe, LowerCasePipe, NgTemplateOutlet, ReactiveFormsModule, ProyeccionFlujoComponent, OtrosPrestamosComponent, ActividadesEstacionalesComponent, ResumenActividadesComponent, SeccionComponent, AutocompleteComponent],
  templateUrl: './flujo.component.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class FlujoComponent implements OnInit {

  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private flujoService = inject(FlujoFondosService);
  private actividadService = inject(ActividadEconomicaService);
  private catalogoService = inject(CatalogoService);
  private toastr = inject(ToastrService);

  private otrosPrestamosRef = viewChild(OtrosPrestamosComponent);
  private estacionalesRef = viewChild(ActividadesEstacionalesComponent);
  private resumenRef = viewChild(ResumenActividadesComponent);
  private secciones = viewChildren(SeccionComponent);

  readonly maxLineas = MAX_LINEAS_FLUJO;
  readonly maxResultadosActividad = MAX_RESULTADOS_ACTIVIDAD;
  readonly maxPrestamos = MAX_OTROS_PRESTAMOS;
  readonly maxEstacionales = MAX_ESTACIONALES;
  readonly claseEstado = CLASE_ESTADO_FLUJO;
  readonly formatoFecha = formatoFecha;
  readonly formatoPeriodo = formatoPeriodo;

  flujoId = signal<string | null>(null);

  // ── Consulta de la solicitud ─────────────────────────────────────────────
  numeroSolicitud = signal('');
  consultando = signal(false);
  falloConsulta = signal<{ fallo: FalloConsulta; mensaje: string } | null>(null);
  solicitud = signal<ISolicitudCreditoBantotal | null>(null);
  // El 409 al guardar solo trae { id, codigo, estado }
  flujoActivo = signal<IFlujoEncabezado | IFlujoExistente | null>(null);

  /** Detalle de un flujo que todavía se puede editar. */
  modoEdicion = computed(() => !!this.flujoId() && !!this.flujo()?.editable);
  /** La captura está activa: flujo nuevo de una solicitud sin flujo, o flujo guardado editable. */
  puedeCapturar = computed(() => this.flujoId() ? this.modoEdicion() : !!this.solicitud() && !this.flujoActivo());

  // ── Captura ──────────────────────────────────────────────────────────────
  actividades = signal<IActividadEconomica[]>([]);
  cargandoActividades = signal(false);
  // Al crear, la región viene de la solicitud en Bantotal; al editar, de la copia guardada en el flujo
  regionId = computed(() => this.flujoId() ? this.flujo()?.regionId ?? null : this.solicitud()?.regionId ?? null);
  regionNombre = computed(() => (this.flujoId() ? this.flujo()?.region : this.solicitud()?.region) || this.regionId());
  // Solo las de la región (la actividad guarda el id de región de Bantotal como texto)
  actividadesRegion = computed(() => {
    const regionId = this.regionId();
    if (regionId === null) return [];
    return this.actividades().filter(a => a.region === String(regionId));
  });
  private unidades = signal<Map<string, string>>(new Map());
  private medidas = signal<Map<string, string>>(new Map());
  private tiposActividad = signal<Map<string, string>>(new Map());
  private subActividades = signal<Map<string, string>>(new Map());

  /** Select "Actividad": solo los tipos (ACTI) que tienen actividades en la región. */
  filtrosActividad = computed(() => this.opcionesUnicas(this.actividadesRegion().map(a => a.actividad), this.tiposActividad()));

  /** Select "Subactividad" por tipo ('' = sin tipo elegido): solo las que tienen actividades en la región. */
  private subActividadesPorTipo = computed(() => {
    const porTipo = new Map<string, string[]>([['', []]]);
    for (const a of this.actividadesRegion()) {
      porTipo.get('')!.push(a.subActividad);
      if (!porTipo.has(a.actividad)) porTipo.set(a.actividad, []);
      porTipo.get(a.actividad)!.push(a.subActividad);
    }
    const subs = this.subActividades();
    return new Map([...porTipo].map(([tipo, codigos]) => [tipo, this.opcionesUnicas(codigos, subs)]));
  });

  filtrosSubActividad(tipo: string | null | undefined) {
    return this.subActividadesPorTipo().get(tipo ?? '') ?? [];
  }

  /** Lo que ya usa el flujo guardado aunque ya no esté entre las de la región. */
  private actividadesGuardadas = computed<AutocompleteOption<string>[]>(() =>
    (this.flujoId() ? this.flujo()?.lineas ?? [] : [])
      .map(l => ({ value: l.actividadEconomicaId, label: `${l.codigoActividad} · ${l.nombreActividad}` })));

  /**
   * Opciones del buscador de una línea según sus filtros. Se cachean por filtro para que el
   * autocomplete reciba el mismo arreglo en cada ciclo; la caché se rehace si cambian las actividades.
   */
  private cacheOpciones = computed(() => {
    this.actividadesRegion();
    this.subActividades();
    this.actividadesGuardadas();
    return new Map<string, AutocompleteOption<string>[]>();
  });

  opcionesActividad(linea: LineaValor | undefined): AutocompleteOption<string>[] {
    const tipo = linea?.filtroActividad ?? null;
    const sub = linea?.filtroSubActividad ?? null;
    const seleccionada = linea?.actividadEconomicaId ?? null;
    const cache = this.cacheOpciones();

    const clave = `${tipo ?? ''}|${sub ?? ''}`;
    let opciones = cache.get(clave);
    if (!opciones) {
      const subs = this.subActividades();
      opciones = this.actividadesRegion()
        .filter(a => (!tipo || a.actividad === tipo) && (!sub || a.subActividad === sub))
        .map(a => ({ value: a.id, label: `${a.codigo} · ${a.nombre}`, detalle: subs.get(a.subActividad.toUpperCase()) ?? a.subActividad }));
      cache.set(clave, opciones);
    }

    // La elegida tiene que estar en la lista para que el buscador muestre su nombre
    if (!seleccionada || opciones.some(o => o.value === seleccionada)) return opciones;
    const claveConElegida = `${clave}|${seleccionada}`;
    let conElegida = cache.get(claveConElegida);
    if (!conElegida) {
      const actividad = this.actividad(seleccionada);
      const elegida = actividad
        ? { value: actividad.id, label: `${actividad.codigo} · ${actividad.nombre}` }
        : this.actividadesGuardadas().find(o => o.value === seleccionada);
      conElegida = elegida ? [...opciones, elegida] : opciones;
      cache.set(claveConElegida, conElegida);
    }
    return conElegida;
  }

  /** Códigos sin repetir con su nombre de catálogo, ordenados por nombre. */
  private opcionesUnicas(codigos: string[], nombres: Map<string, string>) {
    return [...new Set(codigos.filter(Boolean))]
      .map(codigo => ({ value: codigo, label: nombres.get(codigo.toUpperCase()) ?? codigo }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  form = this.crearFormulario();
  lineasValor = signal<LineaValor[]>([]);
  horizonte = signal<{ fechaInicio: string; plazoMeses: number | null }>({ fechaInicio: '', plazoMeses: null });
  // Ya validados con POST /calendario-prestamo
  otrosPrestamos = signal<IOtroPrestamo[]>([]);
  // Solo las actividades estacionales completas (las vacías o a medias no se envían)
  estacionales = signal<IEstacionalInput[]>([]);
  // Con las que arranca la captura de estacionales al editar; una referencia nueva la vuelve a llenar
  estacionalesIniciales = signal<IEstacional[] | null>(null);

  agrupar = signal(true);
  simulacion = signal<ISimulacionFlujo | null>(null);
  simulando = signal(false);
  errorSimulacion = signal<string | null>(null);
  private simularSolicitado = new Subject<void>();
  private secuenciaSimulacion = 0;

  guardando = signal(false);

  // ── Detalle ──────────────────────────────────────────────────────────────
  flujo = signal<IFlujoDetalle | null>(null);
  cargandoFlujo = signal(false);

  /** Rango del horizonte para mostrarlo junto al plazo: 'Oct 2026 – Sep 2027'. */
  rangoHorizonte = computed(() => {
    const { fechaInicio, plazoMeses } = this.horizonte();
    if (!fechaInicio || !plazoMeses || plazoMeses < 1) return '';
    const [anio, mes] = fechaInicio.split('-').map(Number);
    const fin = (mes - 1) + (plazoMeses - 1);
    const finPeriodo = `${anio + Math.floor(fin / 12)}-${String((fin % 12) + 1).padStart(2, '0')}-01`;
    return `${formatoPeriodo(`${fechaInicio}-01`)} – ${formatoPeriodo(finPeriodo)}`;
  });

  get lineas(): FormArray<FormGroup> {
    return this.form.controls.lineas as FormArray<FormGroup>;
  }

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      this.flujoId.set(id);
      if (id) {
        this.flujo.set(null);
        this.reiniciarCaptura();
        this.cargarFlujo(true);
      }
    });

    this.cargarCatalogos();

    this.form.valueChanges.subscribe(() => this.alCambiarFormulario());
    this.simularSolicitado.pipe(debounceTime(SIMULAR_DEBOUNCE_MS)).subscribe(() => this.simular());
    this.destroyRef.onDestroy(() => this.simularSolicitado.complete());
  }

  // ── Formulario ───────────────────────────────────────────────────────────

  private crearFormulario() {
    return this.fb.group({
      fechaInicio: [mesActual(), [Validators.required, Validators.pattern(/^\d{4}-\d{2}$/)]],
      // Deshabilitado: se muestra y se envía (getRawValue), pero no se edita
      plazoMeses: [{ value: PLAZO_FLUJO_MESES, disabled: true }],
      lineas: this.fb.array<FormGroup>([], [Validators.minLength(1), Validators.maxLength(MAX_LINEAS_FLUJO)]),
    });
  }

  private crearLinea(): FormGroup {
    return this.fb.group({
      filtroActividad: [null as string | null],
      filtroSubActividad: [null as string | null],
      actividadEconomicaId: [null as string | null, Validators.required],
      nombre: ['', [Validators.required, Validators.maxLength(150)]],
      fechaSiembra: ['', [Validators.required, Validators.pattern(/^\d{4}-\d{2}-\d{2}$/)]],
      cantidad: [null as number | null, [Validators.required, Validators.min(0.01), maxDecimales(2)]],
    });
  }

  agregarLinea() {
    if (this.lineas.length >= MAX_LINEAS_FLUJO) return;
    const linea = this.crearLinea();
    // No. de siembra sugerido (filas actuales + 1); el asesor lo puede cambiar
    linea.controls['nombre'].setValue(`${this.lineas.length + 1}`, { emitEvent: false });
    this.lineas.push(linea);
  }

  /** Útil para dos terrenos de la misma actividad con distinta fecha de siembra. */
  duplicarLinea(i: number) {
    if (this.lineas.length >= MAX_LINEAS_FLUJO) return;
    const linea = this.crearLinea();
    const original = this.lineas.at(i).getRawValue();
    linea.setValue({ ...original, nombre: `${this.lineas.length + 1}` }, { emitEvent: false });
    this.lineas.insert(i + 1, linea);
  }

  quitarLinea(i: number) {
    this.lineas.removeAt(i);
  }

  /** Al cambiar el tipo se limpia la subactividad, y la actividad si ya no es de ese tipo. */
  onFiltroActividad(linea: FormGroup, tipo: string | null) {
    const actividad = this.actividad(linea.get('actividadEconomicaId')?.value);
    this.aplicarFiltros(linea, tipo, null, !!tipo && !!actividad && actividad.actividad !== tipo);
  }

  /** Al cambiar la subactividad se limpia la actividad si ya no es de esa subactividad. */
  onFiltroSubActividad(linea: FormGroup, sub: string | null) {
    const actividad = this.actividad(linea.get('actividadEconomicaId')?.value);
    // Elegir la subactividad sin tipo deja el tipo de esa subactividad
    const tipo = linea.get('filtroActividad')?.value
      ?? (sub ? this.actividadesRegion().find(a => a.subActividad === sub)?.actividad ?? null : null);
    this.aplicarFiltros(linea, tipo, sub, !!sub && !!actividad && actividad.subActividad !== sub);
  }

  /**
   * Los filtros no se envían: se guardan sin emitir para no lanzar otra simulación.
   * Solo emite si hay que limpiar la actividad, porque eso sí cambia la captura.
   */
  private aplicarFiltros(linea: FormGroup, tipo: string | null, sub: string | null, limpiarActividad: boolean) {
    linea.patchValue({ filtroActividad: tipo, filtroSubActividad: sub }, { emitEvent: false });
    if (limpiarActividad) {
      linea.get('actividadEconomicaId')?.setValue(null);
    } else {
      this.lineasValor.set(this.form.getRawValue().lineas as LineaValor[]);
    }
  }

  /** Elegida en el buscador: los filtros toman su tipo y subactividad. */
  onActividadElegida(linea: FormGroup, id: string | null) {
    const actividad = this.actividad(id);
    if (actividad) {
      linea.patchValue({ filtroActividad: actividad.actividad, filtroSubActividad: actividad.subActividad }, { emitEvent: false });
    }
    linea.get('actividadEconomicaId')?.markAsTouched();
    linea.get('actividadEconomicaId')?.setValue(id);
  }

  private alCambiarFormulario() {
    const v = this.form.getRawValue();
    this.lineasValor.set(v.lineas as LineaValor[]);
    this.horizonte.set({ fechaInicio: v.fechaInicio ?? '', plazoMeses: v.plazoMeses === null ? null : Number(v.plazoMeses) });
    this.solicitarSimulacion();
  }

  hasError(control: AbstractControl | null, error: string): boolean {
    return !!(control?.touched && control?.errors?.[error]);
  }

  invalido(control: AbstractControl | null): boolean {
    return !!(control?.touched && control?.invalid);
  }

  // ── Actividades ──────────────────────────────────────────────────────────

  /** Devuelve false si no se pudieron traer las actividades. */
  private async cargarCatalogos(): Promise<boolean> {
    this.cargandoActividades.set(true);
    try {
      const [resp, unidades, medidas, tipos, subs] = await Promise.all([
        this.actividadService.getActividades({ all: true }),
        this.catalogoService.select(CATALOGOS_ACTIVIDAD.unidadGiro, null, true),
        this.catalogoService.select(CATALOGOS_ACTIVIDAD.medidaProduccion, null, true),
        this.catalogoService.select(CATALOGOS_ACTIVIDAD.actividad, null, true),
        this.catalogoService.select(CATALOGOS_ACTIVIDAD.subActividad, null, true),
      ]);
      const aMapa = (opciones: { value: string; label: string }[] | undefined) =>
        new Map((opciones ?? []).map(o => [o.value.toUpperCase(), o.label]));
      // Si falla una recarga, se conserva lo que ya estaba (el servicio ya mostró el error)
      if (resp) this.actividades.set(resp.data.actividades ?? []);
      if (unidades) this.unidades.set(aMapa(unidades.opciones));
      if (medidas) this.medidas.set(aMapa(medidas.opciones));
      if (tipos) this.tiposActividad.set(aMapa(tipos.opciones));
      if (subs) this.subActividades.set(aMapa(subs.opciones));
      if (resp) this.completarFiltrosLineas();
      return !!resp;
    } finally {
      this.cargandoActividades.set(false);
    }
  }

  /** Botón "Actualizar": trae de nuevo las actividades por si se crearon o cambiaron mientras se captura. */
  async actualizarActividades() {
    if (this.cargandoActividades()) return;
    const ok = await this.cargarCatalogos();
    if (!ok) return;
    this.toastr.success('Actividades económicas actualizadas.', 'Actividades');
    // Los montos por ciclo dependen de la distribución de cada actividad
    if (this.lineas.length) this.solicitarSimulacion();
  }

  /**
   * Las líneas que ya tienen actividad pero no filtros (flujo cargado antes que las actividades)
   * toman el tipo y la subactividad de su actividad. Sin emitir: no cambia nada que se envíe.
   */
  private completarFiltrosLineas() {
    for (const linea of this.lineas.controls) {
      const { filtroActividad, actividadEconomicaId } = linea.getRawValue();
      const actividad = this.actividad(actividadEconomicaId);
      if (filtroActividad || !actividad) continue;
      linea.patchValue({ filtroActividad: actividad.actividad, filtroSubActividad: actividad.subActividad }, { emitEvent: false });
    }
    this.lineasValor.set(this.form.getRawValue().lineas as LineaValor[]);
  }

  actividad(id: string | null | undefined): IActividadEconomica | undefined {
    return id ? this.actividades().find(a => a.id === id) : undefined;
  }

  unidad(codigo: string | null | undefined): string {
    if (!codigo) return '';
    return this.unidades().get(codigo.toUpperCase()) ?? codigo;
  }

  medida(codigo: string | null | undefined): string {
    if (!codigo) return '';
    return this.medidas().get(codigo.toUpperCase()) ?? codigo;
  }

  /** Monto por ciclo de la línea: cantidad × cantidadEstimada × precio (o costo) unitario. */
  montosLinea(linea: LineaValor) {
    const actividad = this.actividad(linea.actividadEconomicaId);
    const cantidad = Number(linea.cantidad);
    if (!actividad || !cantidad || cantidad <= 0) return null;
    return {
      ingreso: montoCiclo(cantidad, Number(actividad.cantidadEstimada), Number(actividad.precioU)),
      egreso: montoCiclo(cantidad, Number(actividad.cantidadEstimada), actividad.costoU === null ? null : Number(actividad.costoU)),
    };
  }

  // ── Consulta de la solicitud ─────────────────────────────────────────────

  /** Solo dígitos: el número de solicitud es entero. */
  onNumeroSolicitud(input: HTMLInputElement) {
    const numero = input.value.replace(/\D/g, '');
    input.value = numero;
    this.numeroSolicitud.set(numero);
  }

  async consultarSolicitud() {
    const numero = Number(this.numeroSolicitud());
    if (!Number.isInteger(numero) || numero <= 0 || this.consultando()) return;

    this.consultando.set(true);
    this.falloConsulta.set(null);
    this.solicitud.set(null);
    this.flujoActivo.set(null);
    this.reiniciarCaptura();

    const resultado = await this.flujoService.consultarSolicitud(numero);
    this.consultando.set(false);

    if (!resultado.ok) {
      this.falloConsulta.set({ fallo: resultado.fallo, mensaje: resultado.mensaje });
      return;
    }

    this.solicitud.set(resultado.solicitud);
    this.flujoActivo.set(resultado.flujoActivo);
    if (!resultado.flujoActivo) {
      this.agregarLinea();
    }
  }

  /** Otra solicitud: se descarta lo capturado. */
  cambiarSolicitud() {
    this.solicitud.set(null);
    this.flujoActivo.set(null);
    this.falloConsulta.set(null);
    this.reiniciarCaptura();
  }

  private reiniciarCaptura() {
    this.lineas.clear({ emitEvent: false });
    this.form.reset({ fechaInicio: mesActual(), plazoMeses: PLAZO_FLUJO_MESES }, { emitEvent: false });
    this.lineasValor.set([]);
    this.horizonte.set({ fechaInicio: mesActual(), plazoMeses: PLAZO_FLUJO_MESES });
    this.otrosPrestamos.set([]);
    this.estacionales.set([]);
    this.estacionalesIniciales.set(null);
    this.secuenciaSimulacion++;
    this.simulacion.set(null);
    this.errorSimulacion.set(null);
    this.simulando.set(false);
    this.agrupar.set(true);
  }

  abrirFlujo(id: string) {
    this.router.navigate(['/flujo-fondos/flujos', id]);
  }

  // ── Simulación ───────────────────────────────────────────────────────────

  private payload(): IProyeccionFlujoInput {
    const v = this.form.getRawValue();
    return {
      fechaInicio: `${v.fechaInicio}-01`,
      plazoMeses: Number(v.plazoMeses),
      lineas: (v.lineas as LineaValor[]).map<ILineaFlujoInput>(l => ({
        actividadEconomicaId: l.actividadEconomicaId!,
        nombre: l.nombre.trim(),
        fechaSiembra: l.fechaSiembra,
        cantidad: Number(l.cantidad),
      })),
      // Solo los datos de captura: el calendario lo recalcula el back
      otrosPrestamos: this.otrosPrestamos().map(p => ({
        institucion: p.institucion,
        montoPrestamo: p.montoPrestamo,
        saldo: p.saldo,
        cuota: p.cuota,
        formaPago: p.formaPago,
        fechaSiguientePago: p.fechaSiguientePago,
        tasaInteresAnual: p.tasaInteresAnual,
      })),
      estacionales: this.estacionales(),
    };
  }

  onOtrosPrestamosChange(prestamos: IOtroPrestamo[]) {
    this.otrosPrestamos.set(prestamos);
    this.solicitarSimulacion();
  }

  /** Capturadas, incluidas las vacías o a medias (el signal `estacionales` solo tiene las completas). */
  cantidadEstacionales(): number {
    return this.estacionalesRef()?.actividades.length ?? 0;
  }

  onEstacionalesChange(estacionales: IEstacionalInput[]) {
    this.estacionales.set(estacionales);
    this.solicitarSimulacion();
  }

  solicitarSimulacion() {
    if (!this.puedeCapturar()) return;
    this.simularSolicitado.next();
  }

  cambiarAgrupacion(agrupar: boolean) {
    this.agrupar.set(agrupar);
    // Al editar se muestra la vista previa de lo capturado, no lo guardado
    if (this.flujoId() && !this.modoEdicion()) {
      this.cargarFlujo();
    } else {
      this.simular();
    }
  }

  /** Solo se simula con el formulario válido: el back rechazaría el resto con 400. */
  private async simular() {
    if (!this.puedeCapturar()) return;
    if (this.form.invalid || this.lineas.length === 0) {
      this.secuenciaSimulacion++;
      this.simulando.set(false);
      return;
    }

    const secuencia = ++this.secuenciaSimulacion;
    this.simulando.set(true);
    const resp = await this.flujoService.simular({ ...this.payload(), agrupar: this.agrupar() });

    // Llegó una respuesta vieja: el formulario cambió mientras se calculaba
    if (secuencia !== this.secuenciaSimulacion) return;
    this.simulando.set(false);

    if ('error' in resp) {
      this.errorSimulacion.set(resp.error);
      return;
    }
    this.errorSimulacion.set(null);
    this.simulacion.set(resp.data);
  }

  // ── Guardar ──────────────────────────────────────────────────────────────

  /** Validaciones comunes al crear y al guardar cambios: avisa y devuelve false si algo falta. */
  private capturaLista(): boolean {
    if (this.guardando()) return false;
    const lista = this.validarCaptura();
    // Una sección minimizada escondería el error: se abren todas para que se vea
    if (!lista) this.secciones().forEach(s => s.abrir());
    return lista;
  }

  private validarCaptura(): boolean {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.lineas.length === 0) return false;

    // Al guardar, las actividades estacionales vacías o a medias no se descartan sin avisar
    const errorEstacionales = this.estacionalesRef()?.validarParaGuardar();
    if (errorEstacionales) {
      this.toastr.warning(errorEstacionales, 'Actividades estacionales');
      return false;
    }

    // Un préstamo escrito pero no agregado se perdería sin avisar
    if (this.otrosPrestamosRef()?.capturaPendiente()) {
      this.toastr.warning('Agregue el préstamo a la tabla o limpie el formulario antes de guardar.', 'Préstamo sin agregar');
      return false;
    }

    return true;
  }

  async guardar() {
    const solicitud = this.solicitud();
    if (!solicitud || !this.capturaLista()) return;

    this.guardando.set(true);
    const resultado = await this.flujoService.createFlujo({ numeroSolicitud: solicitud.numeroSolicitud, ...this.payload() });
    this.guardando.set(false);

    if (resultado.ok) {
      this.router.navigate(['/flujo-fondos/flujos', resultado.flujo.id]);
      return;
    }

    // 409: otro usuario creó un flujo para la solicitud mientras se capturaba
    if (resultado.existente) {
      this.flujoActivo.set(resultado.existente);
    }
  }

  // ── Resumen ──────────────────────────────────────────────────────────────

  /** El endpoint del resumen necesita el id: mientras se captura, primero hay que guardar. */
  verResumen() {
    const id = this.flujoId();
    if (!id) {
      this.toastr.warning('Guarde el flujo para ver el resumen de actividades.', 'Flujo sin guardar');
      return;
    }
    this.resumenRef()?.abrir(id);
  }

  // ── Detalle ──────────────────────────────────────────────────────────────

  /** Con `poblar` y el flujo editable, la captura se llena con lo guardado. */
  async cargarFlujo(poblar = false) {
    const id = this.flujoId();
    if (!id) return;
    this.cargandoFlujo.set(true);
    const flujo = await this.flujoService.getFlujoById(id, this.agrupar());
    if (this.flujoId() === id) {
      this.flujo.set(flujo);
      this.cargandoFlujo.set(false);
      if (poblar && flujo?.editable) {
        this.poblarCaptura(flujo);
      }
    }
  }

  /** Lleva el flujo guardado a la captura; su proyección sirve de vista previa mientras se recalcula. */
  private poblarCaptura(f: IFlujoDetalle) {
    this.lineas.clear({ emitEvent: false });
    for (const l of f.lineas) {
      const linea = this.crearLinea();
      const actividad = this.actividad(l.actividadEconomicaId);
      linea.setValue({
        filtroActividad: actividad?.actividad ?? null,
        filtroSubActividad: actividad?.subActividad ?? null,
        actividadEconomicaId: l.actividadEconomicaId,
        nombre: l.nombre,
        fechaSiembra: l.fechaSiembra.slice(0, 10),
        cantidad: Number(l.cantidad),
      }, { emitEvent: false });
      this.lineas.push(linea, { emitEvent: false });
    }
    this.form.patchValue({ fechaInicio: f.fechaInicio.slice(0, 7), plazoMeses: f.plazoMeses }, { emitEvent: false });
    this.form.markAsPristine();
    this.form.markAsUntouched();

    this.otrosPrestamosRef()?.limpiar();
    this.otrosPrestamos.set(f.otrosPrestamos);
    // El componente de estacionales se llena solo y avisa con (cambio)
    this.estacionales.set([]);
    this.estacionalesIniciales.set([...f.estacionales]);

    this.secuenciaSimulacion++;
    this.simulando.set(false);
    this.errorSimulacion.set(null);
    this.simulacion.set({
      fechaInicio: f.fechaInicio,
      plazoMeses: f.plazoMeses,
      lineas: f.lineas,
      otrosPrestamos: f.otrosPrestamos,
      estacionales: f.estacionales,
      proyeccion: f.proyeccion,
    });

    const v = this.form.getRawValue();
    this.lineasValor.set(v.lineas as LineaValor[]);
    this.horizonte.set({ fechaInicio: v.fechaInicio ?? '', plazoMeses: v.plazoMeses === null ? null : Number(v.plazoMeses) });
  }

  /** Vuelve a lo guardado. */
  descartarCambios() {
    const f = this.flujo();
    if (f?.editable) {
      this.poblarCaptura(f);
    }
  }

  /** PUT /:id con todo lo capturado: líneas, horizonte, préstamos y actividades estacionales. */
  async guardarCambios() {
    const id = this.flujoId();
    if (!id || !this.modoEdicion() || !this.capturaLista()) return;

    this.guardando.set(true);
    const flujo = await this.flujoService.updateFlujo(id, this.payload());
    this.guardando.set(false);

    if (!flujo || this.flujoId() !== id) return;
    // Lo capturado ya es lo guardado: no se vuelve a poblar para no cerrar lo que el usuario tiene abierto,
    // solo se toman los préstamos con sus ids nuevos y el estado (RECHAZADO pasa a CORREGIDO)
    this.flujo.set(flujo);
    this.otrosPrestamos.set(flujo.otrosPrestamos);
    this.form.markAsPristine();
  }
}
