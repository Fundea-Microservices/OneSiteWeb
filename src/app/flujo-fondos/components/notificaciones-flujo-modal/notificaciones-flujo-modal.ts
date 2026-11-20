import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  inject,
  Injector,
  input,
  OnInit,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  EstadoConversacion,
  EstadoFlujo,
  IConversacion,
  IConversacionDetalle,
  IFlujoReferencia,
  IMensajeConversacion,
  MAX_ASUNTO_CONVERSACION,
  MAX_MENSAJE_CONVERSACION,
} from '../../../../interfaces/flujo-fondos';
import { ConversacionFlujoService } from '../../../../services/flujo-fondos/conversacion.service';
import { formatoFechaHora, haceCuanto } from '../../utils/flujo';

type Seccion = 'listado' | 'nueva';

/** Abiertas primero; después, la de actividad más reciente (el mismo orden que el back). */
function ordenar(lista: IConversacion[]): IConversacion[] {
  return [...lista].sort((a, b) =>
    Number(b.estado === 'ABIERTA') - Number(a.estado === 'ABIERTA')
    || b.ultimaActividad.localeCompare(a.ultimaActividad));
}

/** Mensaje que el usuario no había visto: la respuesta de "ver" trae el estado anterior a marcarlo leído. */
const esNuevo = (m: IMensajeConversacion) => !m.propio && m.fechaLectura === null && m.destinatarioId !== null;

/**
 * "Notificaciones" de un flujo de fondos: conversaciones entre quien crea el flujo y quien
 * lo aprueba. Cada mensaje se notifica por correo a la otra parte (lo resuelve el back).
 * Con el flujo ANULADO solo se puede consultar y cerrar.
 */
@Component({
  selector: 'app-notificaciones-flujo-modal',
  imports: [FormsModule],
  templateUrl: './notificaciones-flujo-modal.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificacionesFlujoModal implements OnInit {
  private conversacionService = inject(ConversacionFlujoService);
  private injector = inject(Injector);

  flujo = input.required<IFlujoReferencia>();
  /** Conversación que se abre al mostrar la ventana (p. ej. desde el aviso antes de aprobar) */
  conversacionId = input<string | null>(null);

  cerrar = output<void>();
  /** Se emite al crear, responder, cerrar, reabrir o leer, para refrescar el badge de quien abrió la ventana */
  actualizado = output<void>();

  readonly maxAsunto = MAX_ASUNTO_CONVERSACION;
  readonly maxMensaje = MAX_MENSAJE_CONVERSACION;
  readonly formatoFechaHora = formatoFechaHora;
  readonly haceCuanto = haceCuanto;

  private chatRef = viewChild<ElementRef<HTMLElement>>('chat');

  seccionesCerradas = signal<Set<Seccion>>(new Set());

  /** El detalle de una conversación trae el estado vigente del flujo: puede haberse anulado */
  estadoFlujo = signal<EstadoFlujo | null>(null);
  anulado = computed(() => (this.estadoFlujo() ?? this.flujo().estado) === 'ANULADO');

  // ─── Listado ───────────────────────────────────────────────────────────────
  isLoading = signal(false);
  conversaciones = signal<IConversacion[]>([]);
  estadoFiltro = signal<EstadoConversacion | ''>('');

  filtradas = computed(() => {
    const estado = this.estadoFiltro();
    return estado ? this.conversaciones().filter(c => c.estado === estado) : this.conversaciones();
  });

  /** Se calcula del listado para que siga al día con los cambios locales */
  resumen = computed(() => {
    const lista = this.conversaciones();
    return {
      total: lista.length,
      abiertas: lista.filter(c => c.estado === 'ABIERTA').length,
      noLeidos: lista.reduce((suma, c) => suma + c.noLeidos, 0),
    };
  });

  // ─── Conversación abierta ─────────────────────────────────────────────────
  abiertaId = signal<string | null>(null);
  hilo = signal<IConversacionDetalle | null>(null);
  cargandoHilo = signal(false);
  /** Ids de los mensajes que el usuario no había visto al abrir la conversación */
  nuevos = signal<Set<string>>(new Set());
  respuesta = signal('');
  procesando = signal(false);
  confirmandoCierre = signal(false);

  // ─── Nueva conversación ───────────────────────────────────────────────────
  asunto = signal('');
  mensaje = signal('');
  enviando = signal(false);

  formularioValido = computed(() => !!this.asunto().trim() && !!this.mensaje().trim());

  async ngOnInit() {
    await this.fetchData();
    const id = this.conversacionId();
    if (id) this.abrirConversacion(id);
  }

  async fetchData() {
    this.isLoading.set(true);
    const resp = await this.conversacionService.listar(this.flujo().id);
    this.isLoading.set(false);

    if (resp.ok) {
      this.conversaciones.set(resp.data.conversaciones);
      // Sin conversaciones, el formulario de nueva queda a la vista
      if (!resp.data.conversaciones.length) this.mostrarSeccion('nueva');
    } else if (resp.status === 404) {
      // MS-FJF-60-01: el flujo no existe
      this.cerrar.emit();
    }
  }

  /** Vuelve a leer el listado y la conversación abierta (no hay tiempo real) */
  async refrescar() {
    await this.fetchData();
    const id = this.abiertaId();
    if (id) this.cargarHilo(id);
  }

  abierta(seccion: Seccion): boolean {
    return !this.seccionesCerradas().has(seccion);
  }

  toggleSeccion(seccion: Seccion) {
    this.seccionesCerradas.update(actual => {
      const nuevas = new Set(actual);
      if (nuevas.has(seccion)) nuevas.delete(seccion);
      else nuevas.add(seccion);
      return nuevas;
    });
  }

  private mostrarSeccion(seccion: Seccion) {
    this.seccionesCerradas.update(actual => {
      const nuevas = new Set(actual);
      nuevas.delete(seccion);
      return nuevas;
    });
  }

  // ─── Conversación ─────────────────────────────────────────────────────────

  toggleConversacion(c: IConversacion) {
    if (this.abiertaId() === c.id) {
      this.cerrarHilo();
      return;
    }
    this.abrirConversacion(c.id);
  }

  private abrirConversacion(id: string) {
    this.abiertaId.set(id);
    this.hilo.set(null);
    this.respuesta.set('');
    this.confirmandoCierre.set(false);
    this.mostrarSeccion('listado');
    this.cargarHilo(id);
  }

  private cerrarHilo() {
    this.abiertaId.set(null);
    this.hilo.set(null);
    this.confirmandoCierre.set(false);
  }

  private async cargarHilo(id: string) {
    this.cargandoHilo.set(true);
    const resp = await this.conversacionService.ver(id);
    // El usuario pudo abrir otra mientras cargaba
    if (this.abiertaId() !== id) return;
    this.cargandoHilo.set(false);

    if (!resp.ok) {
      // MS-FJF-62-01: la conversación ya no existe
      if (resp.codigo === 'MS-FJF-62-01') {
        this.cerrarHilo();
        this.fetchData();
      }
      return;
    }

    const nuevos = new Set(resp.data.mensajes.filter(esNuevo).map(m => m.id));
    const teniaNoLeidos = (this.conversaciones().find(c => c.id === id)?.noLeidos ?? 0) > 0;

    this.nuevos.set(nuevos);
    this.mostrarHilo({ ...resp.data, noLeidos: 0 });
    this.desplazarChat();

    // Al consultarla, el back la marcó como leída: se refresca el badge
    if (nuevos.size || teniaNoLeidos) this.actualizado.emit();
  }

  /** Muestra la conversación y sincroniza su fila del listado */
  private mostrarHilo(hilo: IConversacionDetalle) {
    this.hilo.set(hilo);
    this.estadoFlujo.set(hilo.flujo.estado);
    this.sincronizarFila(hilo);
  }

  /** Reemplaza (o agrega) la fila con los campos de encabezado de la conversación */
  private sincronizarFila(c: IConversacion) {
    const { id, flujoFondosId, numero, asunto, estado, usuarioId, usuarioNombre, usuarioCierreId,
      usuarioCierreNombre, fechaCierre, created_at, updated_at, totalMensajes, noLeidos,
      ultimaActividad, ultimoMensaje } = c;
    const fila: IConversacion = {
      id, flujoFondosId, numero, asunto, estado, usuarioId, usuarioNombre, usuarioCierreId,
      usuarioCierreNombre, fechaCierre, created_at, updated_at, totalMensajes, noLeidos,
      ultimaActividad, ultimoMensaje,
    };
    this.conversaciones.update(lista => ordenar(
      lista.some(x => x.id === id) ? lista.map(x => x.id === id ? fila : x) : [fila, ...lista]
    ));
  }

  /** Lleva el chat al primer mensaje nuevo o, si no hay, al último */
  private desplazarChat() {
    afterNextRender(() => {
      const chat = this.chatRef()?.nativeElement;
      if (!chat) return;
      const nuevo = chat.querySelector<HTMLElement>('[data-nuevo]');
      // El contenedor es `relative`: offsetTop se mide desde su borde
      chat.scrollTop = nuevo ? nuevo.offsetTop - 8 : chat.scrollHeight;
    }, { injector: this.injector });
  }

  esNuevo(m: IMensajeConversacion): boolean {
    return this.nuevos().has(m.id);
  }

  tituloCorreo(m: IMensajeConversacion): string {
    if (m.correoEnviado) return `Notificado por correo a ${m.correoDestinatario}`;
    if (m.destinatarioId) return 'No se pudo notificar por correo';
    return 'No había otro participante a quien notificar';
  }

  async responder() {
    const hilo = this.hilo();
    const mensaje = this.respuesta().trim();
    if (!hilo || hilo.estado !== 'ABIERTA' || this.anulado() || !mensaje || this.procesando()) return;

    this.procesando.set(true);
    const resp = await this.conversacionService.responder(hilo.id, { mensaje });
    this.procesando.set(false);

    if (!resp.ok) {
      this.manejarError(resp.codigo, hilo.id);
      return;
    }

    const m = resp.data;
    this.respuesta.set('');
    this.mostrarHilo({
      ...hilo,
      mensajes: [...hilo.mensajes, m],
      totalMensajes: hilo.totalMensajes + 1,
      noLeidos: 0,
      ultimaActividad: m.created_at,
      ultimoMensaje: { usuarioNombre: m.usuarioNombre, mensaje: m.mensaje, created_at: m.created_at },
    });
    this.desplazarChat();
    this.actualizado.emit();
  }

  async cerrarConversacion() {
    const hilo = this.hilo();
    if (!hilo || hilo.estado !== 'ABIERTA' || this.procesando()) return;

    this.procesando.set(true);
    const resp = await this.conversacionService.cerrar(hilo.id);
    this.procesando.set(false);
    this.confirmandoCierre.set(false);

    if (!resp.ok) {
      this.manejarError(resp.codigo, hilo.id);
      return;
    }
    this.mostrarHilo({ ...hilo, ...resp.data });
    this.actualizado.emit();
  }

  async reabrir() {
    const hilo = this.hilo();
    if (!hilo || hilo.estado !== 'CERRADA' || this.anulado() || this.procesando()) return;

    this.procesando.set(true);
    const resp = await this.conversacionService.reabrir(hilo.id);
    this.procesando.set(false);

    if (!resp.ok) {
      this.manejarError(resp.codigo, hilo.id);
      return;
    }
    this.mostrarHilo({ ...hilo, ...resp.data });
    this.actualizado.emit();
  }

  /** Errores 404/409 de responder, cerrar y reabrir: el aviso ya lo mostró el servicio */
  private manejarError(codigo: string | null, id: string) {
    switch (codigo) {
      // La conversación ya no existe
      case 'MS-FJF-64-02':
      case 'MS-FJF-65-01':
      case 'MS-FJF-66-01':
        this.cerrarHilo();
        this.fetchData();
        break;
      // La otra persona la cerró o la reabrió mientras tanto
      case 'MS-FJF-64-03':
      case 'MS-FJF-65-02':
      case 'MS-FJF-66-02':
        this.cargarHilo(id);
        break;
      // El flujo se anuló
      case 'MS-FJF-64-05':
      case 'MS-FJF-66-04':
        this.estadoFlujo.set('ANULADO');
        break;
    }
  }

  // ─── Nueva conversación ───────────────────────────────────────────────────

  async enviar() {
    if (!this.formularioValido() || this.enviando() || this.anulado()) return;

    this.enviando.set(true);
    const resp = await this.conversacionService.crear(this.flujo().id, {
      asunto: this.asunto().trim(),
      mensaje: this.mensaje().trim(),
    });
    this.enviando.set(false);

    if (!resp.ok) {
      if (resp.codigo === 'MS-FJF-63-04') this.estadoFlujo.set('ANULADO');
      return;
    }

    this.asunto.set('');
    this.mensaje.set('');
    this.actualizado.emit();

    // La respuesta ya es el detalle: se muestra sin volver a consultar
    this.estadoFiltro.set('');
    this.abiertaId.set(resp.data.id);
    this.nuevos.set(new Set());
    this.respuesta.set('');
    this.confirmandoCierre.set(false);
    this.cargandoHilo.set(false);
    this.mostrarHilo(resp.data);
    this.mostrarSeccion('listado');
    this.desplazarChat();
  }
}
