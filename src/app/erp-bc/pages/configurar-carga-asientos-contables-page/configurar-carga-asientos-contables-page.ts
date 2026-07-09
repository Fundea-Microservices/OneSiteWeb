import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConfiguracionService } from '../../../../services/config/configuracion.service';
import { IConfiguracion } from '../../../../interfaces/configuracion';
import { JOB_CARGA_ASIENTOS_KEY } from '../../../../interfaces/erp-bc/partidas-contables';

const HORA_MIN = '00:00';
const HORA_MAX = '07:00';

// ⚠️ SOLO PRUEBAS: poner en false para permitir cualquier hora sin restricción.
// Debe estar en true en producción para forzar la ventana 00:00 - 07:00.
const VALIDAR_HORAS = false;

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
  readonly validarHoras = VALIDAR_HORAS;

  config = signal<IConfiguracion | null>(null);

  hora        = signal('');
  correo      = signal('');
  activo      = signal(false);
  diaAnterior = signal(false); // se preserva tal cual está guardado

  isLoading = signal(false);
  isSaving  = signal(false);
  errorMsg  = signal('');

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
        const val = typeof raw === 'string' ? JSON.parse(raw) : raw;
        this.hora.set(val?.hora ?? '');
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

  get horaValida(): boolean {
    const h = this.hora();
    if (!h) return false;
    if (!this.validarHoras) return true; // pruebas: cualquier hora es válida
    return h >= this.horaMin && h <= this.horaMax;
  }

  get correoValido(): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.correo().trim());
  }

  get formularioValido(): boolean {
    return !!this.config() && this.horaValida && this.correoValido;
  }

  async guardar() {
    if (!this.formularioValido || this.isSaving()) return;

    this.isSaving.set(true);

    const nuevoValor = {
      activo:      String(this.activo()),
      hora:        this.hora(),
      correo:      this.correo().trim(),
      diaAnterior: String(this.diaAnterior()),
    };

    const configActualizado: IConfiguracion = {
      ...this.config()!,
      value: JSON.stringify(nuevoValor),
    };

    const resp = await this.configService.updateConfiguracion(configActualizado);
    if (resp?.success) {
      this.config.set(configActualizado);
    }
    this.isSaving.set(false);
  }
}
