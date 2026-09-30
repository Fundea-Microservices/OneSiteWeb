import {
  ChangeDetectionStrategy,
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { IJob, JobTipo } from '../../../../interfaces/jobs/job';
import {
  describirProgramacion,
  JOB_HORA_REGEX,
  JOB_PROCEDIMIENTO_REGEX,
  OPCIONES_DIA,
  OPCIONES_MES,
  payloadParaEditar,
  payloadParaEnviar,
  tipoJob,
  validarDiaMes,
} from '../job-formato';

/**
 * Datos del formulario ya validados. `payload` llega como string JSON compacto ('' si no hay).
 * Los campos del tipo no elegido llegan vacíos: quien arma el body decide cuáles enviar.
 */
export interface JobForm {
  nombre: string;
  descripcion: string;
  tipo: JobTipo;
  pattern: string;
  payload: string;
  procedimiento: string;
  mes: number;
  dia: number;
  hora: string;
  activo: boolean;
}

@Component({
  selector: 'app-upsert-job',
  imports: [FormsModule],
  templateUrl: './upsert-job.component.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpsertJobComponent {
  /** Job a editar; null para crear uno nuevo. */
  job = input<IJob | null>(null);
  /** Cambia en cada apertura del modal para reiniciar el formulario. */
  key = input<number>(0);
  guardando = input<boolean>(false);

  save = output<JobForm>();
  cancel = output<void>();

  readonly opcionesMes = OPCIONES_MES;
  readonly opcionesDia = OPCIONES_DIA;
  readonly horaPattern = JOB_HORA_REGEX.source;
  readonly procedimientoPattern = JOB_PROCEDIMIENTO_REGEX.source;

  nuevo = computed(() => !this.job());
  form = signal<JobForm>(this.formDesde(null));
  errorPayload = signal<string | null>(null);
  /** Los errores se muestran tras el primer intento de guardar de cada apertura. */
  enviado = signal(false);

  constructor() {
    effect(() => {
      const job = this.job();
      this.key();
      this.form.set(this.formDesde(job));
      this.errorPayload.set(null);
      this.enviado.set(false);
    });
  }

  private formDesde(job: IJob | null): JobForm {
    return {
      nombre: job?.nombre ?? '',
      descripcion: job?.descripcion ?? '',
      tipo: job ? tipoJob(job) : 'PATTERN',
      pattern: job?.pattern ?? '',
      payload: payloadParaEditar(job?.payload),
      procedimiento: job?.procedimiento ?? '',
      mes: job?.mes ?? 0,
      dia: job?.dia ?? 0,
      hora: job?.hora ?? '',
      activo: job?.activo ?? true,
    };
  }

  /** El form es un objeto mutable (ngModel); se leen sus valores en cada detección de cambios. */
  get programacion(): string | null {
    const { mes, dia, hora } = this.form();
    return JOB_HORA_REGEX.test(hora) ? describirProgramacion({ mes, dia, hora }) : null;
  }

  get validacionDiaMes() {
    const { mes, dia } = this.form();
    return validarDiaMes(mes, dia);
  }

  /** Al editar, avisa que el backend limpiará los campos del tipo anterior. */
  get cambioDeTipo(): boolean {
    const job = this.job();
    return !!job && tipoJob(job) !== this.form().tipo;
  }

  // ─── Payload ───────────────────────────────────────────────────

  private validarPayload(): string | null {
    try {
      const compacto = payloadParaEnviar(this.form().payload);
      this.errorPayload.set(null);
      return compacto;
    } catch {
      this.errorPayload.set('El payload no es un JSON válido. Ej. {"tipo": "diario"}');
      return null;
    }
  }

  formatearPayload() {
    if (this.validarPayload() === null) return;
    this.form.update(f => ({ ...f, payload: payloadParaEditar(f.payload) }));
  }

  // ─── Guardar ───────────────────────────────────────────────────

  onSave(ngForm: NgForm) {
    this.enviado.set(true);
    const f = this.form();
    const esPattern = f.tipo === 'PATTERN';
    // El payload solo aplica a PATTERN; en PROCEDIMIENTO no se valida ni se envía
    const payload = esPattern ? this.validarPayload() : '';
    if (!esPattern) this.errorPayload.set(null);
    if (ngForm.invalid || payload === null || this.validacionDiaMes.error) return;

    this.save.emit({
      nombre: f.nombre.trim(),
      descripcion: f.descripcion.trim(),
      tipo: f.tipo,
      pattern: esPattern ? f.pattern.trim() : '',
      payload,
      procedimiento: esPattern ? '' : f.procedimiento.trim(),
      mes: Number(f.mes),
      dia: Number(f.dia),
      hora: f.hora,
      activo: f.activo,
    });
  }
}
