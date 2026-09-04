import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, OnDestroy, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { PartidasContablesService } from '../../../../services/erp-bc/partidas-contables.service';
import { CuentaExternaCuadre, EstadoEjecucionData } from '../../../../interfaces/erp-bc/partidas-contables';

/**
 * Cada cuánto se re-consulta el estado mientras el proceso sigue corriendo.
 * La carga completa recorre todas las páginas de Bantotal y tarda minutos; el
 * reenvío de errores lee directo los asientos en error y termina en segundos.
 */
const POLL_CARGA_MS   = 5 * 60 * 1000;
const POLL_REENVIO_MS = 12 * 1000;

/**
 * Cuántas cuentas descuadradas se listan de entrada. `cuentasDescuadradas` no
 * tiene tope: un día mal cargado puede traer cientos de filas.
 */
const CUENTAS_VISIBLES = 15;

type AccionEnCurso = 'carga' | 'reenvio' | null;

/**
 * Desenlace único de la ejecución. Los flags del backend no son excluyentes
 * entre sí, así que se evalúan en orden y gana el primero que aplica.
 */
type VistaEstado =
  | 'sin-registro'
  | 'avance'
  | 'descuadre'
  | 'interrumpida'
  | 'reenvio'
  | 'error'
  | 'ok';

@Component({
  selector: 'app-ejecutar-carga-asientos-contables-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './ejecutar-carga-asientos-contables-page.html',
  styleUrl: './ejecutar-carga-asientos-contables-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class EjecutarCargaAsientosContablesPage implements OnDestroy {

  private service = inject(PartidasContablesService);

  fecha  = signal('');
  estado = signal<EstadoEjecucionData | null>(null);

  /** Ya se hizo al menos una búsqueda para la fecha actual. */
  consultado     = signal(false);
  isBuscando     = signal(false);
  isRefrescando  = signal(false);
  accion         = signal<AccionEnCurso>(null);
  errorMsg       = signal('');
  avisoMsg       = signal('');
  ultimaConsulta = signal<Date | null>(null);
  /** La tabla de cuentas descuadradas arranca recortada. */
  verTodasLasCuentas = signal(false);

  private pollId: ReturnType<typeof setInterval> | null = null;
  private pollMsActual: number | null = null;

  // ── Fecha ──────────────────────────────────────────────────────────────────

  /** Máxima fecha permitida: ayer (no se permite hoy ni fechas futuras). */
  get maxFecha(): string {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return this.toLocalDateString(d);
  }

  get fechaValida(): boolean {
    const f = this.fecha();
    return !!f && f <= this.maxFecha;
  }

  private toLocalDateString(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  /** Al cambiar la fecha el estado mostrado deja de ser válido: se limpia todo. */
  onFechaChange(valor: string) {
    this.fecha.set(valor ?? '');
    this.detenerPolling();
    this.estado.set(null);
    this.consultado.set(false);
    this.errorMsg.set('');
    this.avisoMsg.set('');
    this.ultimaConsulta.set(null);
    this.verTodasLasCuentas.set(false);
  }

  // ── Estado derivado ────────────────────────────────────────────────────────

  ejecucion   = computed(() => this.estado()?.ejecucion ?? null);
  enEjecucion = computed(() => this.estado()?.enEjecucion === true);

  /** El último registro de la fecha es un reenvío de errores, no una carga. */
  esReenvio = computed(() => this.ejecucion()?.tipo === 'REENVIO');

  /**
   * La carga se detuvo en la validación de cuadre. Los asientos quedaron
   * guardados en el intermedio y el ERP no recibió nada.
   */
  descuadre = computed(() => this.estado()?.descuadre === true);

  /** Hay asientos en ERROR que el ERP rechazó y tiene sentido reintentar. */
  puedeReenviar = computed(() => this.estado()?.puedeReenviar === true);

  /**
   * Desenlace a pintar. `tieneErrores` sale `true` también en un descuadre, así
   * que el orden importa: el descuadre se resuelve antes que el reenvío.
   */
  vista = computed<VistaEstado>(() => {
    const e = this.estado();
    if (!e || !e.existe)   return 'sin-registro';
    if (e.enEjecucion)     return 'avance';
    if (e.descuadre)       return 'descuadre';
    if (e.interrumpida)    return 'interrumpida';
    if (e.puedeReenviar)   return 'reenvio';
    if (e.ejecucion?.error) return 'error';
    return 'ok';
  });

  /** Terminó sin incidencias: solo se muestra el resumen. */
  finalizadaLimpia = computed(() => this.vista() === 'ok');

  // ── Cuentas que no cuadran ─────────────────────────────────────────────────

  cuentasDescuadradas = computed<CuentaExternaCuadre[]>(
    () => this.ejecucion()?.cuentasDescuadradas ?? []
  );

  /** Total de cuentas externas de la fecha, cuadren o no. `null` si no se calculó. */
  totalCuentasExternas = computed(() => this.ejecucion()?.cuentasExternas?.length ?? null);

  /** La tabla se recorta salvo que el usuario pida verla entera. */
  cuentasVisibles = computed<CuentaExternaCuadre[]>(() => {
    const cuentas = this.cuentasDescuadradas();
    return this.verTodasLasCuentas() ? cuentas : cuentas.slice(0, CUENTAS_VISIBLES);
  });

  cuentasOcultas = computed(() =>
    Math.max(0, this.cuentasDescuadradas().length - this.cuentasVisibles().length)
  );

  hayCuentasOcultas = computed(() => this.cuentasOcultas() > 0);

  alternarCuentas() {
    this.verTodasLasCuentas.update(v => !v);
  }

  /** Los asientos sin cuenta externa se agrupan bajo cadena vacía. */
  etiquetaCuenta(cuenta: string): string {
    return cuenta?.trim() ? cuenta : 'Sin cuenta externa';
  }

  /**
   * Un reenvío que no encontró nada que reenviar: termina al instante con
   * `registrosObtenidos: 0` y `porcentaje: 0`. No es un fallo.
   */
  reenvioSinErrores = computed(() => {
    const ej = this.ejecucion();
    return !!ej && ej.tipo === 'REENVIO' && !this.enEjecucion() && ej.registrosObtenidos === 0;
  });

  /**
   * La barra se pinta indeterminada mientras no haya porcentaje real: un
   * proceso recién arrancado (o un reenvío corto) reporta 0% y una barra
   * vacía parece colgada.
   */
  progresoIndeterminado = computed(() => {
    const ej = this.ejecucion();
    return this.enEjecucion() && (ej?.porcentaje ?? 0) <= 0;
  });

  /**
   * Reenvío rápido: solo lo que quedó en error. Se decide con `puedeReenviar`,
   * nunca con `tieneErrores`: en un descuadre los asientos están en INICIO y el
   * reenvío no encontraría nada que hacer.
   */
  mostrarBotonReenviarErrores = computed(() => {
    const e = this.estado();
    return !!e?.puedeReenviar && e.puedeEjecutar;
  });

  /**
   * Carga completa: sin registro previo, interrumpida, descuadrada, con
   * rechazos del ERP o con fallo técnico. Vuelve a recorrer Bantotal y también
   * levanta lo que quedó en PENDIENTE. Una carga que terminó limpia no se
   * relanza.
   */
  mostrarBotonEjecutar = computed(() => {
    const e = this.estado();
    if (!e || !e.puedeEjecutar) return false;
    return this.vista() !== 'avance' && this.vista() !== 'ok';
  });

  textoBotonEjecutar = computed(() => {
    switch (this.vista()) {
      case 'descuadre':    return 'Volver a ejecutar la carga';
      case 'interrumpida': return 'Reintentar carga';
      case 'reenvio':      return 'Volver a enviar todo';
      default:             return 'Ejecutar carga';
    }
  });

  textoBotonReenviar = computed(() => {
    const n = this.ejecucion()?.registrosConError ?? 0;
    return n === 1 ? 'Reenviar 1 asiento' : `Reenviar ${n} asientos`;
  });

  /** Rótulos que cambian de significado en un reenvío. */
  etiquetaObtenidos = computed(() =>
    this.esReenvio() ? 'Asientos en error encontrados' : 'Registros obtenidos'
  );

  etiquetaInsertados = computed(() =>
    this.esReenvio() ? 'Reenviados con éxito' : 'Registros insertados'
  );

  textoFrecuencia = computed(() =>
    this.esReenvio()
      ? `cada ${POLL_REENVIO_MS / 1000} segundos`
      : `cada ${POLL_CARGA_MS / 60000} minutos`
  );

  /** Formatea `duracionSegundos` como "1h 12m 05s". */
  formatDuracion(segundos: number | null | undefined): string {
    const s = Math.max(0, Math.floor(segundos ?? 0));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const seg = s % 60;
    if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m ${String(seg).padStart(2, '0')}s`;
    if (m > 0) return `${m}m ${String(seg).padStart(2, '0')}s`;
    return `${seg}s`;
  }

  // ── Acciones ───────────────────────────────────────────────────────────────

  /** Busca si ya existe una ejecución para la fecha seleccionada. */
  async buscar() {
    if (!this.fechaValida || this.isBuscando()) return;

    this.isBuscando.set(true);
    this.errorMsg.set('');
    this.avisoMsg.set('');
    this.estado.set(null);
    this.verTodasLasCuentas.set(false);

    await this.consultar();

    this.consultado.set(true);
    this.isBuscando.set(false);
  }

  /** Refresco manual, para no esperar el ciclo automático. */
  async refrescar() {
    if (!this.fechaValida || this.isRefrescando() || this.isBuscando()) return;

    this.isRefrescando.set(true);
    this.errorMsg.set('');
    await this.consultar();
    this.isRefrescando.set(false);
  }

  /** Dispara la carga completa para la fecha. */
  ejecutar() {
    if (!this.mostrarBotonEjecutar()) return;
    return this.disparar('carga');
  }

  /** Reenvía únicamente los asientos que quedaron en error. */
  reenviarErrores() {
    if (!this.mostrarBotonReenviarErrores()) return;
    return this.disparar('reenvio');
  }

  private async disparar(modo: Exclude<AccionEnCurso, null>) {
    if (!this.fechaValida || this.accion() !== null) return;

    this.accion.set(modo);
    this.errorMsg.set('');
    this.avisoMsg.set('');

    const dto = { fecha: this.fecha() };
    const peticion$ = modo === 'reenvio'
      ? this.service.reenviarErrores(dto)
      : this.service.cargar(dto);

    const porDefecto = modo === 'reenvio'
      ? 'Reenvío iniciado. El avance se actualiza automáticamente.'
      : 'Carga iniciada. El avance se actualiza automáticamente.';

    try {
      const resp = await firstValueFrom(peticion$);
      if (resp?.success) {
        this.avisoMsg.set(resp.message || porDefecto);
      } else {
        this.errorMsg.set(resp?.message ?? 'No se pudo iniciar el proceso.');
        this.accion.set(null);
        return;
      }
    } catch (error: any) {
      // 409: ya hay un proceso vivo de ese día. No es un fallo, el GET manda.
      if (error?.status === 409) {
        this.avisoMsg.set(
          this.mensajeError(error, 'Ya hay un proceso en curso para esta fecha.')
        );
      } else {
        this.errorMsg.set(this.mensajeError(error, 'Error al iniciar el proceso.'));
        this.accion.set(null);
        return;
      }
    }

    // El 202 solo confirma que arrancó: el estado real lo da la consulta.
    await this.consultar();
    this.consultado.set(true);
    this.accion.set(null);
  }

  // ── Consulta y polling ─────────────────────────────────────────────────────

  private async consultar() {
    try {
      const resp = await firstValueFrom(this.service.getEjecucion(this.fecha()));
      if (resp?.success) {
        this.estado.set(resp.data);
        this.ultimaConsulta.set(new Date());
        this.sincronizarPolling();
      } else {
        this.errorMsg.set(resp?.message ?? 'No se pudo consultar la ejecución.');
      }
    } catch (error) {
      // Se conserva el último estado conocido para no perder el avance en pantalla.
      this.errorMsg.set(this.mensajeError(error, 'Error al consultar la ejecución.'));
    }
  }

  /**
   * Mantiene el ciclo de consulta vivo solo mientras el proceso está corriendo,
   * y lo reinicia si cambia la cadencia (una carga y un reenvío no se consultan
   * al mismo ritmo).
   */
  private sincronizarPolling() {
    if (!this.enEjecucion()) {
      this.detenerPolling();
      return;
    }

    const ms = this.esReenvio() ? POLL_REENVIO_MS : POLL_CARGA_MS;
    if (this.pollId !== null && this.pollMsActual === ms) return;

    this.detenerPolling();
    this.pollMsActual = ms;
    this.pollId = setInterval(() => this.consultar(), ms);
  }

  private detenerPolling() {
    if (this.pollId !== null) {
      clearInterval(this.pollId);
      this.pollId = null;
    }
    this.pollMsActual = null;
  }

  private mensajeError(error: any, porDefecto: string): string {
    return error?.error?.message ?? error?.message ?? porDefecto;
  }

  ngOnDestroy() {
    this.detenerPolling();
  }
}
