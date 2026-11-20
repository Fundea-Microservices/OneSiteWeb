import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConfiguracionService } from '../../../../services/config/configuracion.service';
import { IConfiguracion } from '../../../../interfaces/configuracion';
import {
  DiaSemana,
  JOB_CARGA_ASIENTOS_KEY,
  JobCargaAsientosContables,
} from '../../../../interfaces/erp-bc/partidas-contables';

const HORA_MIN = '00:00';
const HORA_MAX = '07:00';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Días en el orden en que se muestran (lunes primero). */
const DIAS: ReadonlyArray<{ key: DiaSemana; label: string }> = [
  { key: 'lunes',     label: 'Lunes' },
  { key: 'martes',    label: 'Martes' },
  { key: 'miercoles', label: 'Miércoles' },
  { key: 'jueves',    label: 'Jueves' },
  { key: 'viernes',   label: 'Viernes' },
  { key: 'sabado',    label: 'Sábado' },
  { key: 'domingo',   label: 'Domingo' },
];

interface HorarioDia {
  ejecutar: boolean;
  hora:     string;
}

type Horarios = Record<DiaSemana, HorarioDia>;

@Component({
  selector: 'app-configurar-carga-asientos-contables-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './configurar-carga-asientos-contables-page.html',
  styleUrl: './configurar-carga-asientos-contables-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ConfigurarCargaAsientosContablesPage {

  private configService = inject(ConfiguracionService);

  readonly horaMin = HORA_MIN;
  readonly horaMax = HORA_MAX;
  readonly dias = DIAS;

  config = signal<IConfiguracion | null>(null);

  /**
   * Valor guardado tal como vino. Se conserva al guardar para no perder
   * propiedades que esta pantalla no edita (p. ej. `alcance`).
   */
  private valorOriginal: Partial<JobCargaAsientosContables> = {};

  horarios    = signal<Horarios>(this.horariosIniciales(''));
  correo      = signal('');
  activo      = signal(false);
  diaAnterior = signal(false); // se preserva tal cual está guardado

  isLoading = signal(false);
  isSaving  = signal(false);
  errorMsg  = signal('');

  /** Correos escritos, separados por coma o punto y coma, sin vacíos. */
  readonly correos = computed(() =>
    this.correo()
      .split(/[,;]/)
      .map(c => c.trim())
      .filter(c => c.length > 0),
  );

  readonly correosInvalidos = computed(() => this.correos().filter(c => !EMAIL_REGEX.test(c)));

  readonly correoValido = computed(() => this.correos().length > 0 && this.correosInvalidos().length === 0);

  readonly algunDiaActivo = computed(() => DIAS.some(d => this.horarios()[d.key].ejecutar));

  readonly horariosValidos = computed(() =>
    this.algunDiaActivo() && DIAS.every(d => this.diaValido(d.key)),
  );

  readonly formularioValido = computed(() => !!this.config() && this.horariosValidos() && this.correoValido());

  ngOnInit() {
    this.cargar();
  }

  async cargar() {
    this.isLoading.set(true);
    this.errorMsg.set('');
    // Se obtiene desde el listado (no desde get-by-key) porque el detalle por
    // clave no devuelve el configId (UUID) que exige el endpoint de update.
    const resp = await this.configService.getConfiguraciones({ search: JOB_CARGA_ASIENTOS_KEY, limit: 50 });
    const config = resp?.data?.configuraciones?.find(c => c.key === JOB_CARGA_ASIENTOS_KEY) ?? null;
    if (config) {
      this.config.set(config);
      try {
        const raw = config.value;
        const val: Partial<JobCargaAsientosContables> = (typeof raw === 'string' ? JSON.parse(raw) : raw) ?? {};
        this.valorOriginal = val;
        this.horarios.set(this.horariosDeValor(val));
        this.correo.set(val?.correo ?? '');
        this.activo.set(String(val?.activo) === 'true');
        this.diaAnterior.set(String(val?.diaAnterior) === 'true');
      } catch {
        this.errorMsg.set('El valor de la configuración no tiene un formato válido.');
      }
    } else {
      this.errorMsg.set('No se encontró la configuración "' + JOB_CARGA_ASIENTOS_KEY + '".');
    }
    this.isLoading.set(false);
  }

  /** Una hora está dentro de la ventana permitida. */
  horaEnRango(hora: string): boolean {
    return !!hora && hora >= this.horaMin && hora <= this.horaMax;
  }

  /** Un día sin ejecutar siempre es válido; uno activo necesita hora en rango. */
  diaValido(dia: DiaSemana): boolean {
    const h = this.horarios()[dia];
    return !h.ejecutar || this.horaEnRango(h.hora);
  }

  setEjecutar(dia: DiaSemana, ejecutar: boolean) {
    this.horarios.update(h => ({ ...h, [dia]: { ...h[dia], ejecutar } }));
  }

  setHora(dia: DiaSemana, hora: string) {
    this.horarios.update(h => ({ ...h, [dia]: { ...h[dia], hora } }));
  }

  /** Copia la hora del lunes a los demás días que se ejecutan. */
  copiarHoraLunes() {
    const hora = this.horarios().lunes.hora;
    if (!hora) return;
    this.horarios.update(h => {
      const copia = { ...h };
      for (const d of DIAS) {
        if (copia[d.key].ejecutar) copia[d.key] = { ...copia[d.key], hora };
      }
      return copia;
    });
  }

  async guardar() {
    if (!this.formularioValido() || this.isSaving()) return;

    this.isSaving.set(true);

    const horarios = this.horarios();
    const horariosGuardados = Object.fromEntries(
      DIAS.map(d => [d.key, horarios[d.key].ejecutar ? horarios[d.key].hora : '']),
    ) as Record<DiaSemana, string>;

    const nuevoValor: JobCargaAsientosContables = {
      ...this.valorOriginal,
      activo:      String(this.activo()),
      // Compatibilidad: una versión anterior del backend sólo lee `hora`.
      hora:        DIAS.map(d => horariosGuardados[d.key]).find(h => !!h) ?? '',
      horarios:    horariosGuardados,
      correo:      [...new Set(this.correos())].join(', '),
      diaAnterior: String(this.diaAnterior()),
    };

    const configActualizado: IConfiguracion = {
      ...this.config()!,
      value: JSON.stringify(nuevoValor),
    };

    const resp = await this.configService.updateConfiguracion(configActualizado);
    if (resp?.success) {
      this.config.set(configActualizado);
      this.valorOriginal = nuevoValor;
      this.correo.set(nuevoValor.correo);
    }
    this.isSaving.set(false);
  }

  /**
   * Horario por día a partir de lo guardado. Sin `horarios` (formato anterior)
   * todos los días se ejecutan a la `hora` única.
   */
  private horariosDeValor(val: Partial<JobCargaAsientosContables>): Horarios {
    if (!val?.horarios) {
      return this.horariosIniciales(val?.hora ?? '');
    }
    const horarios = this.horariosIniciales('');
    for (const d of DIAS) {
      const hora = val.horarios[d.key] ?? '';
      horarios[d.key] = { ejecutar: !!hora, hora };
    }
    return horarios;
  }

  private horariosIniciales(hora: string): Horarios {
    return Object.fromEntries(DIAS.map(d => [d.key, { ejecutar: true, hora }])) as Horarios;
  }
}
