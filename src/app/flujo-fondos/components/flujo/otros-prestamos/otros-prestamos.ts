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
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Modal } from 'bootstrap';
import {
  FORMAS_PAGO,
  FormaPago,
  IOtroPrestamo,
  IOtroPrestamoInput,
  MAX_OTROS_PRESTAMOS,
  MAX_TASA_INTERES_ANUAL,
} from '../../../../../interfaces/flujo-fondos';
import { FlujoFondosService } from '../../../../../services/flujo-fondos/flujo-fondos.service';
import { etiquetaFormaPago, formatoFecha, maxDecimales, tasaPeriodo } from '../../../utils/flujo';

const FORMA_PAGO_DEFAULT: FormaPago = 'MENSUAL';

/** El saldo no puede ser mayor que el monto del préstamo (MS-FJF-51-01). */
const saldoNoMayorAlMonto = (group: AbstractControl): ValidationErrors | null => {
  const monto = group.get('montoPrestamo')?.value;
  const saldo = group.get('saldo')?.value;
  if (monto === null || monto === '' || saldo === null || saldo === '') return null;
  return Number(saldo) > Number(monto) ? { saldoMayor: true } : null;
};

const numeroONulo = (valor: unknown) =>
  valor === null || valor === undefined || valor === '' || isNaN(Number(valor)) ? null : Number(valor);

/**
 * Préstamos del cliente en otras instituciones (0 a 20). Cada préstamo se valida con
 * POST /calendario-prestamo antes de entrar a la tabla; sus cuotas entran al flujo como egresos.
 *
 * Con `editable` en false solo se muestra la tabla y el calendario.
 */
@Component({
  selector: 'app-otros-prestamos',
  imports: [DecimalPipe, ReactiveFormsModule],
  templateUrl: './otros-prestamos.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OtrosPrestamosComponent {
  private fb = inject(FormBuilder);
  private flujoService = inject(FlujoFondosService);

  prestamos = input<IOtroPrestamo[]>([]);
  editable = input(false);
  prestamosChange = output<IOtroPrestamo[]>();

  readonly maxPrestamos = MAX_OTROS_PRESTAMOS;
  readonly maxTasa = MAX_TASA_INTERES_ANUAL;
  readonly formasPago = FORMAS_PAGO;
  readonly formatoFecha = formatoFecha;
  readonly etiquetaFormaPago = etiquetaFormaPago;

  form = this.fb.group({
    institucion: ['', [Validators.required, Validators.maxLength(150)]],
    montoPrestamo: [null as number | null, [Validators.required, Validators.min(0.01), maxDecimales(2)]],
    saldo: [null as number | null, [Validators.required, Validators.min(0.01), maxDecimales(2)]],
    cuota: [null as number | null, [Validators.required, Validators.min(0.01), maxDecimales(2)]],
    formaPago: [FORMA_PAGO_DEFAULT as FormaPago, Validators.required],
    fechaSiguientePago: ['', [Validators.required, Validators.pattern(/^\d{4}-\d{2}-\d{2}$/)]],
    tasaInteresAnual: [null as number | null, [Validators.required, Validators.min(0), Validators.max(MAX_TASA_INTERES_ANUAL), maxDecimales(4)]],
  }, { validators: saldoNoMayorAlMonto });

  private valores = signal<{ tasaAnual: number | null; formaPago: FormaPago | null }>({ tasaAnual: null, formaPago: FORMA_PAGO_DEFAULT });

  /** "Tasa interés mensual (automático)": el nombre cambia con la forma de pago. */
  tasaPeriodo = computed(() => tasaPeriodo(this.valores().tasaAnual, this.valores().formaPago));
  etiquetaTasaPeriodo = computed(() => `Tasa interés ${etiquetaFormaPago(this.valores().formaPago).toLowerCase()}`);

  calculando = signal(false);
  error = signal<string | null>(null);
  editandoIndex = signal<number | null>(null);
  capturaPendiente = signal(false);

  prestamoCalendario = signal<IOtroPrestamo | null>(null);
  @ViewChild('calendarioModal') modalElementRef!: ElementRef;
  private modalInstance?: Modal;

  constructor() {
    const sub = this.form.valueChanges.subscribe(v => {
      this.valores.set({ tasaAnual: numeroONulo(v.tasaInteresAnual), formaPago: v.formaPago ?? null });
      this.capturaPendiente.set(this.form.dirty);
    });
    inject(DestroyRef).onDestroy(() => {
      sub.unsubscribe();
      this.modalInstance?.dispose();
    });
  }

  hasError(path: string, error: string): boolean {
    const ctrl = this.form.get(path);
    return !!(ctrl?.touched && ctrl?.errors?.[error]);
  }

  invalido(path: string): boolean {
    const ctrl = this.form.get(path);
    return !!(ctrl?.touched && ctrl?.invalid);
  }

  saldoMayor(): boolean {
    return !!(this.form.errors?.['saldoMayor'] && (this.form.controls.saldo.touched || this.form.controls.montoPrestamo.touched));
  }

  // ── Captura ──────────────────────────────────────────────────────────────

  private payload(): IOtroPrestamoInput {
    const v = this.form.getRawValue();
    return {
      institucion: v.institucion!.trim(),
      montoPrestamo: Number(v.montoPrestamo),
      saldo: Number(v.saldo),
      cuota: Number(v.cuota),
      formaPago: v.formaPago!,
      fechaSiguientePago: v.fechaSiguientePago!,
      tasaInteresAnual: Number(v.tasaInteresAnual),
    };
  }

  /** "+ Agregar préstamo": el back valida y calcula el calendario antes de agregarlo a la tabla. */
  async agregar() {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.calculando()) return;

    const editando = this.editandoIndex();
    if (editando === null && this.prestamos().length >= MAX_OTROS_PRESTAMOS) return;

    this.calculando.set(true);
    this.error.set(null);
    const resp = await this.flujoService.calendarioPrestamo(this.payload());
    this.calculando.set(false);

    if ('error' in resp) {
      this.error.set(resp.error);
      return;
    }

    const lista = [...this.prestamos()];
    if (editando === null) {
      lista.push(resp.data);
    } else {
      // Se conserva el id para que el back sepa que es el mismo préstamo
      lista[editando] = { ...resp.data, id: lista[editando].id };
    }
    this.prestamosChange.emit(lista.map((p, i) => ({ ...p, orden: i + 1 })));
    this.limpiar();
  }

  editar(i: number) {
    const p = this.prestamos()[i];
    this.form.reset({
      institucion: p.institucion,
      montoPrestamo: p.montoPrestamo,
      saldo: p.saldo,
      cuota: p.cuota,
      formaPago: p.formaPago,
      fechaSiguientePago: p.fechaSiguientePago,
      tasaInteresAnual: p.tasaInteresAnual,
    });
    this.editandoIndex.set(i);
    this.error.set(null);
    this.capturaPendiente.set(false);
  }

  limpiar() {
    this.form.reset({ formaPago: FORMA_PAGO_DEFAULT });
    this.editandoIndex.set(null);
    this.error.set(null);
    this.capturaPendiente.set(false);
  }

  quitar(i: number) {
    const editando = this.editandoIndex();
    if (editando === i) {
      this.limpiar();
    } else if (editando !== null && editando > i) {
      this.editandoIndex.set(editando - 1);
    }
    const lista = this.prestamos().filter((_, j) => j !== i);
    this.prestamosChange.emit(lista.map((p, j) => ({ ...p, orden: j + 1 })));
  }

  // ── Calendario de amortización ───────────────────────────────────────────

  verCalendario(prestamo: IOtroPrestamo) {
    this.prestamoCalendario.set(prestamo);
    if (!this.modalInstance) {
      this.modalInstance = new Modal(this.modalElementRef.nativeElement);
    }
    this.modalInstance.show();
  }
}
