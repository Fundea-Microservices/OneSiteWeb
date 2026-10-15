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
} from '@angular/core';
import { DecimalPipe, LowerCasePipe, NgTemplateOutlet } from '@angular/common';
import { AbstractControl, FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { debounceTime, Subject } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { CATALOGOS_ACTIVIDAD, IActividadEconomica } from '../../../../interfaces/actividad-economica';
import {
  CLASE_ESTADO_FLUJO,
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
  MAX_PLAZO_MESES,
} from '../../../../interfaces/flujo-fondos';
import { ActividadEconomicaService } from '../../../../services/flujo-fondos/actividad-economica.service';
import { CatalogoService } from '../../../../services/flujo-fondos/catalogo.service';
import { FalloConsulta, FlujoFondosService } from '../../../../services/flujo-fondos/flujo-fondos.service';
import { ActividadesEstacionalesComponent } from '../../components/flujo/actividades-estacionales/actividades-estacionales';
import { OtrosPrestamosComponent } from '../../components/flujo/otros-prestamos/otros-prestamos';
import { ProyeccionFlujoComponent } from '../../components/flujo/proyeccion-flujo/proyeccion-flujo';
import { formatoFecha, formatoPeriodo, maxDecimales, mesActual, montoCiclo } from '../../utils/flujo';

const SIMULAR_DEBOUNCE_MS = 600;

interface LineaValor {
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
 * - /flujo-fondos/flujos/:id: detalle de solo lectura con su proyección.
 */
@Component({
  selector: 'app-flujo',
  imports: [RouterLink, DecimalPipe, LowerCasePipe, NgTemplateOutlet, ReactiveFormsModule, ProyeccionFlujoComponent, OtrosPrestamosComponent, ActividadesEstacionalesComponent],
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

  readonly maxPlazo = MAX_PLAZO_MESES;
  readonly maxLineas = MAX_LINEAS_FLUJO;
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
  puedeCapturar = computed(() => !!this.solicitud() && !this.flujoActivo());

  // ── Captura ──────────────────────────────────────────────────────────────
  actividades = signal<IActividadEconomica[]>([]);
  cargandoActividades = signal(false);
  // Solo las de la región de la solicitud (la actividad guarda el id de región de Bantotal como texto)
  actividadesRegion = computed(() => {
    const regionId = this.solicitud()?.regionId;
    if (regionId === null || regionId === undefined) return [];
    return this.actividades().filter(a => a.region === String(regionId));
  });
  private unidades = signal<Map<string, string>>(new Map());
  private medidas = signal<Map<string, string>>(new Map());

  form = this.crearFormulario();
  lineasValor = signal<LineaValor[]>([]);
  horizonte = signal<{ fechaInicio: string; plazoMeses: number | null }>({ fechaInicio: '', plazoMeses: null });
  // Ya validados con POST /calendario-prestamo
  otrosPrestamos = signal<IOtroPrestamo[]>([]);
  // Solo las actividades estacionales completas (las vacías o a medias no se envían)
  estacionales = signal<IEstacionalInput[]>([]);

  agrupar = signal(false);
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
        this.cargarFlujo();
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
      plazoMeses: [12 as number | null, [Validators.required, Validators.min(1), Validators.max(MAX_PLAZO_MESES), Validators.pattern(/^\d+$/)]],
      lineas: this.fb.array<FormGroup>([], [Validators.minLength(1), Validators.maxLength(MAX_LINEAS_FLUJO)]),
    });
  }

  private crearLinea(): FormGroup {
    return this.fb.group({
      actividadEconomicaId: [null as string | null, Validators.required],
      nombre: ['', [Validators.required, Validators.maxLength(150)]],
      fechaSiembra: ['', [Validators.required, Validators.pattern(/^\d{4}-\d{2}-\d{2}$/)]],
      cantidad: [null as number | null, [Validators.required, Validators.min(0.01), maxDecimales(2)]],
    });
  }

  agregarLinea() {
    if (this.lineas.length >= MAX_LINEAS_FLUJO) return;
    const linea = this.crearLinea();
    // Nombre sugerido: el asesor lo cambia por "Terreno 1", "Siembra de agosto", etc.
    linea.controls['nombre'].setValue(`Línea ${this.lineas.length + 1}`, { emitEvent: false });
    this.lineas.push(linea);
  }

  /** Útil para dos terrenos de la misma actividad con distinta fecha de siembra. */
  duplicarLinea(i: number) {
    if (this.lineas.length >= MAX_LINEAS_FLUJO) return;
    const linea = this.crearLinea();
    const original = this.lineas.at(i).getRawValue();
    linea.setValue({ ...original, nombre: `${original.nombre} (copia)`.slice(0, 150) }, { emitEvent: false });
    this.lineas.insert(i + 1, linea);
  }

  quitarLinea(i: number) {
    this.lineas.removeAt(i);
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

  private async cargarCatalogos() {
    this.cargandoActividades.set(true);
    const [resp, unidades, medidas] = await Promise.all([
      this.actividadService.getActividades({ all: true }),
      this.catalogoService.select(CATALOGOS_ACTIVIDAD.unidadGiro, null, true),
      this.catalogoService.select(CATALOGOS_ACTIVIDAD.medidaProduccion, null, true),
    ]);
    this.actividades.set(resp?.data.actividades ?? []);
    this.unidades.set(new Map((unidades?.opciones ?? []).map(o => [o.value.toUpperCase(), o.label])));
    this.medidas.set(new Map((medidas?.opciones ?? []).map(o => [o.value.toUpperCase(), o.label])));
    this.cargandoActividades.set(false);
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
    this.form.reset({ fechaInicio: mesActual(), plazoMeses: 12 }, { emitEvent: false });
    this.lineasValor.set([]);
    this.horizonte.set({ fechaInicio: mesActual(), plazoMeses: 12 });
    this.otrosPrestamos.set([]);
    this.estacionales.set([]);
    this.secuenciaSimulacion++;
    this.simulacion.set(null);
    this.errorSimulacion.set(null);
    this.simulando.set(false);
    this.agrupar.set(false);
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
    if (this.flujoId()) {
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

  async guardar() {
    const solicitud = this.solicitud();
    this.form.markAllAsTouched();
    if (!solicitud || this.form.invalid || this.lineas.length === 0 || this.guardando()) return;

    // Al guardar, las actividades estacionales vacías o a medias no se descartan sin avisar
    const errorEstacionales = this.estacionalesRef()?.validarParaGuardar();
    if (errorEstacionales) {
      this.toastr.warning(errorEstacionales, 'Actividades estacionales');
      return;
    }

    // Un préstamo escrito pero no agregado se perdería sin avisar
    if (this.otrosPrestamosRef()?.capturaPendiente()) {
      this.toastr.warning('Agregue el préstamo a la tabla o limpie el formulario antes de guardar.', 'Préstamo sin agregar');
      return;
    }

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

  // ── Detalle ──────────────────────────────────────────────────────────────

  async cargarFlujo() {
    const id = this.flujoId();
    if (!id) return;
    this.cargandoFlujo.set(true);
    const flujo = await this.flujoService.getFlujoById(id, this.agrupar());
    if (this.flujoId() === id) {
      this.flujo.set(flujo);
      this.cargandoFlujo.set(false);
    }
  }
}
