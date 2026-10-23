import {
  ChangeDetectionStrategy,
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
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
import {
  IModeloScoring,
  ISolicitudBantotal,
} from '../../../../interfaces/scoring/scoring';

/** Lo que el modal entrega al guardar. */
export interface EvaluacionManual {
  scoringId: number;
  numeroSolicitud: number;
  datos: Omit<ISolicitudBantotal, 'numeroSolicitud'>;
}

/**
 * Modal "Crear Evaluación Manual" de la Pantalla 4.
 *
 * Captura los mismos campos que devolvería Bantotal, pero tecleados por el
 * asesor. Solo los datos del cliente: el cuestionario se responde después en la
 * pantalla de Captura de Datos, que ya resuelve el formulario dinámico.
 */
@Component({
  selector: 'app-crear-evaluacion-manual',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './crear-evaluacion-manual.component.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CrearEvaluacionManualComponent {
  private fb = inject(FormBuilder);

  /** Todos los modelos activos; aquí se filtran los que admiten captura. */
  modelos = input<IModeloScoring[]>([]);
  /** Cambia en cada apertura para rearmar el formulario. */
  formKey = input<number>(0);

  @Output() save = new EventEmitter<EvaluacionManual>();
  @Output() cancel = new EventEmitter<void>();

  form = signal<FormGroup>(this.fb.group({}));

  /**
   * Solo los modelos parametrizados para captura manual. Ofrecer otro llevaría
   * a un rechazo del backend que el asesor no podría entender desde aquí.
   */
  modelosDisponibles = computed(() =>
    this.modelos().filter(
      (modelo) => modelo.origenCaptura && modelo.estado === 'Activo',
    ),
  );

  constructor() {
    effect(() => {
      const _ = this.formKey();
      this.initForm();
    });
  }

  private initForm(): void {
    this.form.set(
      this.fb.group({
        scoringId: [null, [Validators.required]],
        numeroSolicitud: [
          null,
          [Validators.required, Validators.pattern(/^\d+$/)],
        ],
        numeroOperacion: [null],
        nombreCliente: [
          '',
          [Validators.required, Validators.maxLength(200)],
        ],
        dpi: ['', [Validators.required, Validators.maxLength(20)]],
        cuenta: ['', [Validators.required, Validators.maxLength(50)]],
        direccion: ['', [Validators.maxLength(300)]],
        region: ['', [Validators.maxLength(100)]],
        agencia: ['', [Validators.maxLength(100)]],
        montoCredito: [null, [Validators.required, Validators.min(0.01)]],
        productoCredito: [
          '',
          [Validators.required, Validators.maxLength(100)],
        ],
      }),
    );
  }

  onSubmit(): void {
    const form = this.form();

    if (form.invalid) {
      form.markAllAsTouched();
      return;
    }

    const v = form.getRawValue();

    this.save.emit({
      scoringId: Number(v.scoringId),
      numeroSolicitud: Number(v.numeroSolicitud),
      datos: {
        numeroOperacion: v.numeroOperacion ? Number(v.numeroOperacion) : null,
        nombreCliente: v.nombreCliente.trim(),
        dpi: v.dpi.trim(),
        cuenta: v.cuenta.trim(),
        direccion: v.direccion?.trim() || null,
        region: v.region?.trim() || null,
        agencia: v.agencia?.trim() || null,
        montoCredito: Number(v.montoCredito),
        productoCredito: v.productoCredito.trim(),
      },
    });
  }

  onCancel(): void {
    this.cancel.emit();
  }

  campoInvalido(campo: string): boolean {
    const control = this.form().get(campo);
    return !!control && control.invalid && control.touched;
  }
}
