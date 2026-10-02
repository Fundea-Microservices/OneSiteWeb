import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  DestroyRef,
  EventEmitter,
  Output,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { AbstractControl, FormArray, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import {
  CampoCatalogoActividad,
  CATALOGOS_ACTIVIDAD,
  IActividadCreate,
  IActividadEconomica,
  IActividadUpdate,
  TipoDistribucion,
  UNIDAD_GIRO_CUERDAS,
} from '../../../../../interfaces/actividad-economica';
import { IOpcionSelect } from '../../../../../interfaces/catalogo';
import { CatalogoService } from '../../../../../services/flujo-fondos/catalogo.service';
import {
  aFormulario,
  aPayload,
  distribucionCompleta,
  DistribucionForm,
  MESES,
  repartoUniforme,
  sumaCentesimas,
  TIPOS_DISTRIBUCION,
} from '../../../utils/distribucion';

type OpcionesCampos = Record<CampoCatalogoActividad, IOpcionSelect[]>;

const sinOpciones = (): OpcionesCampos => ({
  giro: [], unidadGiro: [], region: [], actividad: [], subActividad: [], area: [], medidaProduccion: [],
});

const ceros = () => MESES.map(() => 0);

const mismoCodigo = (a?: string | null, b?: string | null) => (a ?? '').toUpperCase() === (b ?? '').toUpperCase();

/** Máximo `n` decimales (el backend valida IsNumber({ maxDecimalPlaces: 2 })). */
const maxDecimales = (n: number): ValidatorFn => (control: AbstractControl): ValidationErrors | null => {
  const valor = control.value;
  if (valor === null || valor === undefined || valor === '') return null;
  const escalado = Number(valor) * 10 ** n;
  return Math.abs(Math.round(escalado) - escalado) < 1e-6 ? null : { decimales: n };
};

@Component({
  selector: 'app-upsert-actividad',
  standalone: true,
  imports: [ReactiveFormsModule, DecimalPipe],
  templateUrl: './upsert-actividad.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpsertActividadComponent {
  private fb = inject(FormBuilder);
  private catalogoService = inject(CatalogoService);

  actividad = input<IActividadEconomica | null>(null);
  nuevo = input<boolean>(true);
  formKey = input<number>(0);

  @Output() save = new EventEmitter<IActividadCreate | IActividadUpdate>();
  @Output() cancel = new EventEmitter<void>();

  readonly meses = MESES;
  readonly tipos = TIPOS_DISTRIBUCION;

  form = signal<FormGroup>(this.fb.group({}));
  opciones = signal<OpcionesCampos>(sinOpciones());
  cargandoSubactividades = signal(false);
  esCuerdas = signal(false);
  distribucion = signal<DistribucionForm>({ INGRESO: ceros(), EGRESO: ceros() });

  // Totales en porcentaje (sumados en centésimas)
  totales = computed(() => {
    const d = this.distribucion();
    return { INGRESO: sumaCentesimas(d.INGRESO) / 100, EGRESO: sumaCentesimas(d.EGRESO) / 100 };
  });
  distribucionOk = computed(() => distribucionCompleta(this.distribucion()));

  private subs: Subscription[] = [];

  constructor() {
    effect(() => {
      this.formKey();
      const actividad = this.actividad();
      const nuevo = this.nuevo();
      untracked(() => this.construirFormulario(actividad, nuevo));
    });

    inject(DestroyRef).onDestroy(() => this.subs.forEach(s => s.unsubscribe()));
  }

  // ── Construcción del formulario ─────────────────────────────────────────

  private construirFormulario(actividad: IActividadEconomica | null, nuevo: boolean) {
    this.subs.forEach(s => s.unsubscribe());
    this.subs = [];

    const a = nuevo ? null : actividad;
    const distribucion = a ? aFormulario(a.distribucion) : { INGRESO: ceros(), EGRESO: ceros() };
    const porcentaje = (valor: number) => [valor, [Validators.required, Validators.min(0), Validators.max(100), maxDecimales(2)]];

    const form = this.fb.group({
      codigo: [{ value: a?.codigo ?? '', disabled: true }],
      nombre: [a?.nombre ?? '', [Validators.required, Validators.maxLength(150)]],
      giro: [a?.giro ?? null, Validators.required],
      unidadGiro: [a?.unidadGiro ?? null, Validators.required],
      area: [a?.area ?? null],
      region: [a?.region ?? null, Validators.required],
      actividad: [a?.actividad ?? null, Validators.required],
      subActividad: [a?.subActividad ?? null, Validators.required],
      descripcion: [a?.descripcion ?? '', Validators.maxLength(500)],
      ciclo: [a?.ciclo ?? null, [Validators.required, Validators.min(1), Validators.pattern(/^\d+$/)]],
      medidaProduccion: [a?.medidaProduccion ?? null, Validators.required],
      cantidadEstimada: [a?.cantidadEstimada ?? null, [Validators.required, Validators.min(0), maxDecimales(2)]],
      precioU: [a?.precioU ?? null, [Validators.required, Validators.min(0), maxDecimales(2)]],
      costoU: [a?.costoU ?? null, [Validators.min(0), maxDecimales(2)]],
      distribucion: this.fb.group({
        INGRESO: this.fb.array(distribucion.INGRESO.map(porcentaje)),
        EGRESO: this.fb.array(distribucion.EGRESO.map(porcentaje)),
      }),
    });

    this.form.set(form);
    this.opciones.set(sinOpciones());
    this.cargandoSubactividades.set(false);
    this.distribucion.set(distribucion);
    this.esCuerdas.set(mismoCodigo(a?.unidadGiro, UNIDAD_GIRO_CUERDAS));

    this.subs.push(
      form.controls.distribucion.valueChanges.subscribe(valor => {
        this.distribucion.set({ INGRESO: valor.INGRESO ?? ceros(), EGRESO: valor.EGRESO ?? ceros() } as DistribucionForm);
      }),

      // Unidad de giro → área: el área solo aplica a Cuerdas
      form.controls.unidadGiro.valueChanges.subscribe(unidad => {
        const cuerdas = mismoCodigo(unidad, UNIDAD_GIRO_CUERDAS);
        this.esCuerdas.set(cuerdas);
        if (!cuerdas) {
          form.controls.area.setValue(null);
        } else if (!form.controls.area.value) {
          this.aplicarPorDefecto(form, 'area');
        }
      }),

      // Actividad → subactividad: limpiar y recargar con el nuevo padre
      form.controls.actividad.valueChanges.subscribe(actividad => {
        form.controls.subActividad.setValue(null);
        this.opciones.update(o => ({ ...o, subActividad: [] }));
        if (actividad) this.cargarCampo(form, 'subActividad', actividad, true);
      }),
    );

    this.cargarOpciones(form, nuevo);
  }

  private async cargarOpciones(form: FormGroup, nuevo: boolean) {
    const campos: CampoCatalogoActividad[] = ['giro', 'unidadGiro', 'region', 'actividad', 'area', 'medidaProduccion'];
    await Promise.all(campos.map(campo => this.cargarCampo(form, campo, null, nuevo)));

    // En altas la subactividad se carga al preseleccionar la actividad (valueChanges)
    const actividad = form.get('actividad')?.value;
    if (!nuevo && actividad) {
      await this.cargarCampo(form, 'subActividad', actividad, false);
    }
  }

  /**
   * Llena el select de un campo. Si el valor guardado ya no está activo, se agrega
   * marcado como inactivo para no perderlo al editar.
   */
  private async cargarCampo(form: FormGroup, campo: CampoCatalogoActividad, padre: string | null, aplicarDefault: boolean) {
    const codigo = CATALOGOS_ACTIVIDAD[campo];
    if (campo === 'subActividad') this.cargandoSubactividades.set(true);

    const resp = await this.catalogoService.select(codigo, padre);
    let lista = resp?.opciones ?? [];

    const actual = form.get(campo)?.value;
    if (actual && !lista.some(o => mismoCodigo(o.value, actual))) {
      const todas = await this.catalogoService.select(codigo, padre, true);
      const guardada = todas?.opciones.find(o => mismoCodigo(o.value, actual));
      lista = [...lista, {
        value: actual,
        label: `${guardada?.label ?? actual} (inactiva)`,
        padre: guardada?.padre ?? null,
        porDefecto: false,
        activo: false,
      }];
    }

    // El formulario pudo reconstruirse mientras se cargaba
    if (this.form() !== form) return;
    if (campo === 'subActividad') {
      // Si cambiaron la actividad mientras cargaba, esta lista ya no aplica
      if (!mismoCodigo(form.get('actividad')?.value, padre)) return;
      this.cargandoSubactividades.set(false);
    }

    this.opciones.update(o => ({ ...o, [campo]: lista }));
    if (aplicarDefault && !actual && (campo !== 'area' || this.esCuerdas())) {
      this.aplicarPorDefecto(form, campo);
    }
  }

  /** En altas se preselecciona la opción marcada como por defecto. */
  private aplicarPorDefecto(form: FormGroup, campo: CampoCatalogoActividad) {
    const porDefecto = this.opciones()[campo].find(o => o.porDefecto && o.activo);
    if (porDefecto) form.get(campo)?.setValue(porDefecto.value);
  }

  // ── Distribución ─────────────────────────────────────────────────────────

  private filaDistribucion(tipo: TipoDistribucion) {
    return this.form().get(['distribucion', tipo]) as FormArray;
  }

  repartir(tipo: TipoDistribucion) {
    this.filaDistribucion(tipo).setValue(repartoUniforme());
  }

  limpiar(tipo: TipoDistribucion) {
    this.filaDistribucion(tipo).setValue(ceros());
  }

  copiarIngresosAEgresos() {
    this.filaDistribucion('EGRESO').setValue([...this.filaDistribucion('INGRESO').value]);
  }

  /** Cuánto falta (positivo) o sobra (negativo) para llegar a 100 %. */
  diferencia(tipo: TipoDistribucion): number {
    return (10000 - Math.round(this.totales()[tipo] * 100)) / 100;
  }

  // ── Envío ────────────────────────────────────────────────────────────────

  get btnText(): string {
    return this.nuevo() ? 'Crear Actividad' : 'Actualizar Actividad';
  }

  hasError(path: string | (string | number)[], error: string): boolean {
    const ctrl = this.form().get(path);
    return !!(ctrl?.touched && ctrl?.errors?.[error]);
  }

  invalido(path: string | (string | number)[]): boolean {
    const ctrl = this.form().get(path);
    return !!(ctrl?.touched && ctrl?.invalid);
  }

  onSubmit() {
    const form = this.form();
    form.markAllAsTouched();
    if (form.invalid || !this.distribucionOk()) return;

    const v = form.getRawValue();
    const numeroOpcional = (valor: unknown) => valor === null || valor === '' ? null : Number(valor);

    const datos: IActividadCreate = {
      nombre: v.nombre.trim(),
      giro: v.giro,
      unidadGiro: v.unidadGiro,
      region: v.region,
      actividad: v.actividad,
      subActividad: v.subActividad,
      area: this.esCuerdas() ? (v.area || null) : null,
      descripcion: v.descripcion?.trim() || null,
      ciclo: Number(v.ciclo),
      medidaProduccion: v.medidaProduccion,
      cantidadEstimada: Number(v.cantidadEstimada),
      precioU: Number(v.precioU),
      costoU: numeroOpcional(v.costoU),
      distribucion: aPayload(this.distribucion()),
    };

    if (this.nuevo()) {
      this.save.emit(datos);
    } else {
      this.save.emit({ ...datos, id: this.actividad()!.id });
    }
  }

  onCancel() {
    this.cancel.emit();
  }
}
