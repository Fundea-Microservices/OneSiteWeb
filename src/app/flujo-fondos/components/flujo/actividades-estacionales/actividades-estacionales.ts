import {
  ChangeDetectionStrategy,
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  signal,
  ViewChild,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Modal } from 'bootstrap';
import {
  IEstacional,
  IEstacionalInput,
  ITransaccionEstacionalInput,
  MAX_ESTACIONALES,
  MAX_TRANSACCIONES_ESTACIONAL,
  TipoTransaccion,
} from '../../../../../interfaces/flujo-fondos';
import { formatoFecha, fueraDeHorizonte, maxDecimales, sumaMontos, sumarMeses } from '../../../utils/flujo';

interface TransaccionValor {
  concepto: string;
  tipo: TipoTransaccion;
  fecha: string;
  monto: number | string | null;
}

interface ActividadValor {
  descripcion: string;
  transacciones: TransaccionValor[];
}

/** Lo que muestra la tabla principal, venga de la captura o de un flujo guardado. */
interface FilaEstacional {
  descripcion: string;
  totalIngreso: number;
  totalEgreso: number;
  margenNeto: number;
  transacciones: number;
  fueraDeHorizonte: number;
  incompleta: boolean;
}

const montoValido = (monto: unknown) => monto !== null && monto !== '' && !isNaN(Number(monto)) && Number(monto) > 0;

/**
 * Actividades económicas estacionales del cliente (0 a 20), por fuera del catálogo:
 * "Venta de Duraznos", "Venta de Zapatos"... Cada una con 1 a 100 transacciones.
 *
 * Mientras se captura, la alerta de "fuera del horizonte" se calcula aquí con el mismo
 * criterio del back. En un flujo guardado (`editable` en false) se usan las marcas del back.
 */
@Component({
  selector: 'app-actividades-estacionales',
  imports: [DecimalPipe, ReactiveFormsModule],
  templateUrl: './actividades-estacionales.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActividadesEstacionalesComponent {
  private fb = inject(FormBuilder);

  /** Flujo guardado (solo lectura). */
  estacionales = input<IEstacional[]>([]);
  editable = input(false);
  /** Horizonte de la captura: fechaInicio en YYYY-MM. */
  horizonte = input<{ fechaInicio: string; plazoMeses: number | null } | null>(null);

  /** Actividades completas, listas para enviar a POST /simular. */
  cambio = output<IEstacionalInput[]>();

  readonly maxEstacionales = MAX_ESTACIONALES;
  readonly maxTransacciones = MAX_TRANSACCIONES_ESTACIONAL;
  readonly formatoFecha = formatoFecha;

  actividades = this.fb.array<FormGroup>([]);
  private valor = signal<ActividadValor[]>([]);

  nuevaDescripcion = signal('');
  errorNueva = signal<string | null>(null);

  seleccionada = signal<number | null>(null);
  @ViewChild('detalleModal') modalElementRef!: ElementRef;
  private modalInstance?: Modal;

  filas = computed<FilaEstacional[]>(() => {
    if (!this.editable()) {
      return this.estacionales().map(e => ({
        descripcion: e.descripcion,
        totalIngreso: e.totalIngreso,
        totalEgreso: e.totalEgreso,
        margenNeto: e.margenNeto,
        transacciones: e.transacciones.length,
        fueraDeHorizonte: e.transaccionesFueraDeHorizonte,
        incompleta: false,
      }));
    }

    return this.valor().map((a, i) => {
      // Los totales suman todo lo capturado, también lo que está fuera del horizonte (igual que el back)
      const totales = this.totalesCaptura(a.transacciones);
      return {
        descripcion: a.descripcion,
        ...totales,
        transacciones: a.transacciones.length,
        fueraDeHorizonte: a.transacciones.filter(t => this.fuera(t.fecha)).length,
        incompleta: a.transacciones.length === 0 || !!this.actividades.at(i)?.invalid,
      };
    });
  });

  /** Totales de la actividad abierta en el modal. */
  resumenSeleccionada = computed(() => {
    const i = this.seleccionada();
    return i === null ? null : this.filas()[i] ?? null;
  });

  constructor() {
    const sub = this.actividades.valueChanges.subscribe(() => {
      this.valor.set(this.actividades.getRawValue() as ActividadValor[]);
      this.cambio.emit(this.payload());
    });
    inject(DestroyRef).onDestroy(() => {
      sub.unsubscribe();
      this.modalInstance?.dispose();
    });
  }

  private totalesCaptura(transacciones: TransaccionValor[]) {
    const montos = (tipo: TipoTransaccion) =>
      transacciones.filter(t => t.tipo === tipo && montoValido(t.monto)).map(t => Number(t.monto));
    const totalIngreso = sumaMontos(montos('INGRESO'));
    const totalEgreso = sumaMontos(montos('EGRESO'));
    return { totalIngreso, totalEgreso, margenNeto: sumaMontos([totalIngreso, -totalEgreso]) };
  }

  fuera(fecha: string | null | undefined): boolean {
    const h = this.horizonte();
    if (!fecha || !h?.fechaInicio || !h.plazoMeses) return false;
    return fueraDeHorizonte(fecha, h.fechaInicio, h.plazoMeses);
  }

  // ── Formulario ───────────────────────────────────────────────────────────

  private crearTransaccion(valor: Partial<TransaccionValor> = {}): FormGroup {
    return this.fb.group({
      concepto: [valor.concepto ?? '', [Validators.required, Validators.maxLength(150)]],
      tipo: [valor.tipo ?? 'INGRESO' as TipoTransaccion, Validators.required],
      fecha: [valor.fecha ?? '', [Validators.required, Validators.pattern(/^\d{4}-\d{2}-\d{2}$/)]],
      monto: [valor.monto ?? null, [Validators.required, Validators.min(0.01), maxDecimales(2)]],
    });
  }

  actividad(i: number): FormGroup {
    return this.actividades.at(i);
  }

  descripcion(i: number): FormControl<string> {
    return this.actividad(i).get('descripcion') as FormControl<string>;
  }

  transacciones(i: number): FormArray<FormGroup> {
    return this.actividad(i).get('transacciones') as FormArray<FormGroup>;
  }

  hasError(control: AbstractControl | null, error: string): boolean {
    return !!(control?.touched && control?.errors?.[error]);
  }

  invalido(control: AbstractControl | null): boolean {
    return !!(control?.touched && control?.invalid);
  }

  onNuevaDescripcion(input: HTMLInputElement) {
    this.nuevaDescripcion.set(input.value);
    this.errorNueva.set(null);
  }

  /** "+ Agregar actividad": se crea con una transacción y se abre su detalle. */
  agregarActividad(input: HTMLInputElement) {
    const descripcion = this.nuevaDescripcion().trim();
    if (!descripcion) {
      this.errorNueva.set('Escriba la descripción de la actividad');
      return;
    }
    if (descripcion.length > 150) {
      this.errorNueva.set('Máximo 150 caracteres');
      return;
    }
    if (this.actividades.length >= MAX_ESTACIONALES) return;

    this.actividades.push(this.fb.group({
      descripcion: [descripcion, [Validators.required, Validators.maxLength(150)]],
      // Sugerencia del back: el concepto se prellena con la descripción
      transacciones: this.fb.array<FormGroup>([this.crearTransaccion({ concepto: descripcion })]),
    }));

    this.nuevaDescripcion.set('');
    input.value = '';
    this.verDetalle(this.actividades.length - 1);
  }

  quitarActividad(i: number) {
    this.actividades.removeAt(i);
  }

  agregarTransaccion(i: number) {
    const lista = this.transacciones(i);
    if (lista.length >= MAX_TRANSACCIONES_ESTACIONAL) return;
    const ultima = lista.length ? lista.at(lista.length - 1).getRawValue() as TransaccionValor : null;
    lista.push(this.crearTransaccion({
      concepto: this.actividad(i).get('descripcion')?.value ?? '',
      tipo: ultima?.tipo ?? 'INGRESO',
    }));
  }

  /**
   * No hay repetición automática: si el cliente vende todos los meses se captura una
   * transacción por fecha. Esto solo copia la transacción al mes siguiente para agilizarlo.
   */
  duplicarAlMesSiguiente(i: number, j: number) {
    const lista = this.transacciones(i);
    if (lista.length >= MAX_TRANSACCIONES_ESTACIONAL) return;
    const original = lista.at(j).getRawValue() as TransaccionValor;
    const fecha = /^\d{4}-\d{2}-\d{2}$/.test(original.fecha) ? sumarMeses(original.fecha, 1) : '';
    lista.insert(j + 1, this.crearTransaccion({ ...original, fecha }));
  }

  quitarTransaccion(i: number, j: number) {
    this.transacciones(i).removeAt(j);
  }

  // ── Envío ────────────────────────────────────────────────────────────────

  /**
   * Solo actividades y transacciones completas: el back rechazaría el resto con 400, y
   * las actividades vacías no se envían.
   */
  payload(): IEstacionalInput[] {
    return this.actividades.controls.flatMap(grupo => {
      const descripcion = grupo.get('descripcion');
      if (descripcion?.invalid) return [];
      const transacciones = (grupo.get('transacciones') as FormArray<FormGroup>).controls
        .filter(t => t.valid)
        .map<ITransaccionEstacionalInput>(t => {
          const v = t.getRawValue();
          return { concepto: v.concepto.trim(), tipo: v.tipo, fecha: v.fecha, monto: Number(v.monto) };
        });
      return transacciones.length ? [{ descripcion: descripcion!.value.trim(), transacciones }] : [];
    });
  }

  /** Al guardar todo debe estar completo: null si está bien, o el mensaje para el usuario. */
  validarParaGuardar(): string | null {
    this.actividades.markAllAsTouched();
    for (let i = 0; i < this.actividades.length; i++) {
      const descripcion = this.actividad(i).get('descripcion')?.value || `Actividad ${i + 1}`;
      if (this.transacciones(i).length === 0) {
        return `La actividad estacional "${descripcion}" no tiene transacciones: agregue al menos una o quítela.`;
      }
      if (this.actividad(i).invalid) {
        return `La actividad estacional "${descripcion}" tiene transacciones incompletas.`;
      }
    }
    return null;
  }

  // ── Detalle de transacciones ─────────────────────────────────────────────

  verDetalle(i: number) {
    this.seleccionada.set(i);
    if (!this.modalInstance) {
      this.modalInstance = new Modal(this.modalElementRef.nativeElement);
    }
    this.modalInstance.show();
  }
}
