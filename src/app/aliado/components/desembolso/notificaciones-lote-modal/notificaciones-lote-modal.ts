import { ChangeDetectionStrategy, Component, computed, CUSTOM_ELEMENTS_SCHEMA, inject, input, output, signal } from '@angular/core';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DesembolsoService } from '../../../../../services/aliado/desembolso.service';
import { NotificacionLoteService } from '../../../../../services/aliado/notificacion-lote.service';
import { AuthService } from '../../../../../services/auth.service';
import { UserService } from '../../../../../services/usuarios/user.service';
import { IUser } from '../../../../../interfaces/auth';
import {
  EstadoNotificacion,
  IComisionEmpresa,
  IDesembolsoReferido,
  IHiloNotificacion,
  INotificacionLoteListado,
  INotificacionMensaje,
  IResumenLote,
} from '../../../../../interfaces/aliado/desembolso';
import { PaginationAllComponent } from '../../../../shared/components/pagination-all/pagination-all';
import { mismoUsuario, nombrePeriodo } from '../../../utils/desembolso.utils';

type Seccion = 'listado' | 'nueva';

/**
 * "Historial de Notificaciones" de un lote: conversaciones entre usuarios de OneSite
 * sobre una empresa del lote (y opcionalmente un cliente puntual).
 */
@Component({
  selector: 'app-notificaciones-lote-modal',
  imports: [FormsModule, DatePipe, NgTemplateOutlet, PaginationAllComponent],
  templateUrl: './notificaciones-lote-modal.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificacionesLoteModal {
  private desembolsoService = inject(DesembolsoService);
  private notificacionService = inject(NotificacionLoteService);
  private authService = inject(AuthService);
  private userService = inject(UserService);

  loteId = input.required<string>();
  /** Empresa con la que se abre la ventana: filtra el listado y queda elegida en "Enviar nueva" */
  idEmpresa = input<string | null>(null);

  cerrar = output<void>();
  /** Se emite al crear, responder, cerrar o leer, para refrescar los contadores de quien abrió la ventana */
  actualizado = output<void>();

  readonly maxAsunto = 200;
  readonly maxMensaje = 4000;

  seccionesCerradas = signal<Set<Seccion>>(new Set());

  lote = signal<IResumenLote | null>(null);
  empresas = signal<IComisionEmpresa[]>([]);

  // ─── Listado ───────────────────────────────────────────────────────────────
  isLoading = signal(false);
  notificaciones = signal<INotificacionLoteListado[]>([]);
  pagination = signal<IPagination>({ page: 1, pageSize: 10, totalItems: 0 });
  empresaFiltro = signal('');
  estadoFiltro = signal<EstadoNotificacion | ''>('');

  // ─── Conversación abierta ─────────────────────────────────────────────────
  abiertaId = signal<string | null>(null);
  hilo = signal<IHiloNotificacion | null>(null);
  cargandoHilo = signal(false);
  respuesta = signal('');
  procesando = signal(false);

  // ─── Nueva notificación ───────────────────────────────────────────────────
  nuevaEmpresa = signal('');
  clientes = signal<IDesembolsoReferido[]>([]);
  cargandoClientes = signal(false);
  nuevoCliente = signal('');
  busquedaUsuario = signal('');
  usuarios = signal<IUser[]>([]);
  buscandoUsuarios = signal(false);
  destinatario = signal<IUser | null>(null);
  asunto = signal('');
  mensaje = signal('');
  enviando = signal(false);

  private timerBusqueda: ReturnType<typeof setTimeout> | undefined;

  get usuarioId(): string {
    return this.authService.getUserStorage()?.userId;
  }

  periodoLabel = computed(() => nombrePeriodo(this.lote()?.periodo));

  empresaSeleccionada = computed(() => this.empresas().find(e => mismoUsuario(e.idEmpresa, this.nuevaEmpresa())) ?? null);

  formularioValido = computed(() =>
    !!this.nuevaEmpresa() && !!this.destinatario() && !!this.asunto().trim() && !!this.mensaje().trim()
  );

  ngOnInit() {
    if (this.idEmpresa()) {
      this.empresaFiltro.set(this.idEmpresa()!);
      this.nuevaEmpresa.set(this.idEmpresa()!);
      this.cargarClientes();
    }
    this.cargarEmpresas();
    this.fetchData();
  }

  ngOnDestroy() {
    clearTimeout(this.timerBusqueda);
  }

  private async cargarEmpresas() {
    const resp = await this.desembolsoService.obtenerComisiones(this.loteId());
    if (resp?.data) {
      const { id, lote, periodo, estado } = resp.data.lote;
      this.lote.set({ id, lote, periodo, estado });
      this.empresas.set(resp.data.empresas);
    }
  }

  async fetchData() {
    this.isLoading.set(true);
    const resp = await this.notificacionService.listarPorLote(this.loteId(), {
      page: this.pagination().page,
      limit: this.pagination().pageSize,
      idEmpresa: this.empresaFiltro(),
      estado: this.estadoFiltro() || undefined,
    });

    this.notificaciones.set(resp?.data ?? []);
    this.pagination.update(p => ({
      ...p,
      page: resp?.metadata?.page ?? p.page,
      totalItems: resp?.metadata?.total ?? resp?.data?.length ?? 0,
    }));
    this.isLoading.set(false);
  }

  filtrar() {
    this.pagination.update(p => ({ ...p, page: 1 }));
    this.fetchData();
  }

  onChangePage(newPagination: IPagination) {
    this.pagination.set(newPagination);
    this.fetchData();
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

  nombreEmpresa(idEmpresa: string): string {
    return this.empresas().find(e => mismoUsuario(e.idEmpresa, idEmpresa))?.nombreEmpresa ?? '—';
  }

  // ─── Conversación ─────────────────────────────────────────────────────────

  async toggleConversacion(n: INotificacionLoteListado) {
    if (this.abiertaId() === n.id) {
      this.abiertaId.set(null);
      this.hilo.set(null);
      return;
    }

    this.abiertaId.set(n.id);
    this.hilo.set(null);
    this.respuesta.set('');
    this.cargandoHilo.set(true);
    const resp = await this.notificacionService.obtener(n.id);
    // El usuario pudo abrir otra mientras cargaba
    if (this.abiertaId() !== n.id) return;
    this.cargandoHilo.set(false);

    if (resp?.data) {
      this.mostrarHilo(resp.data);
      if (resp.data.acciones.sinLeer > 0) this.marcarLeida(n.id);
    }
  }

  private async marcarLeida(id: string) {
    const resp = await this.notificacionService.marcarLeida(id);
    if (!resp) return;
    this.notificaciones.update(lista => lista.map(n => n.id === id ? { ...n, sinLeer: 0 } : n));
    this.actualizado.emit();
  }

  /** Muestra la conversación y sincroniza su fila del listado */
  private mostrarHilo(hilo: IHiloNotificacion) {
    this.hilo.set(hilo);
    this.notificaciones.update(lista => lista.map(n => n.id !== hilo.id ? n : {
      ...n,
      estado: hilo.estado,
      fechaUltimoMensaje: hilo.fechaUltimoMensaje,
      mensajes: hilo.mensajes.length,
      porResponder: hilo.acciones.mensajeResponderId ? n.porResponder : 0,
    }));
  }

  esMio(m: INotificacionMensaje): boolean {
    return mismoUsuario(m.remitenteId, this.usuarioId);
  }

  nombreRemitente(m: INotificacionMensaje): string {
    return m.remitenteNombre || m.remitenteUsuario;
  }

  nombreDestinatario(m: INotificacionMensaje): string {
    return m.destinatarioNombre || m.destinatarioUsuario;
  }

  async responder() {
    const hilo = this.hilo();
    const mensajeId = hilo?.acciones.mensajeResponderId;
    const mensaje = this.respuesta().trim();
    if (!mensajeId || !mensaje || this.procesando()) return;

    this.procesando.set(true);
    const resp = await this.notificacionService.responder(mensajeId, { mensaje });
    this.procesando.set(false);

    if (resp?.data) {
      this.respuesta.set('');
      this.mostrarHilo(resp.data);
      this.actualizado.emit();
    }
  }

  async cerrarConversacion() {
    const hilo = this.hilo();
    if (!hilo?.acciones.puedeCerrar || this.procesando()) return;

    this.procesando.set(true);
    const resp = await this.notificacionService.cerrar(hilo.id);
    this.procesando.set(false);

    if (resp?.data) {
      this.mostrarHilo(resp.data);
      this.actualizado.emit();
    }
  }

  async reenviarCorreo(m: INotificacionMensaje) {
    if (this.procesando()) return;

    this.procesando.set(true);
    const resp = await this.notificacionService.reenviarCorreo(m.id);
    this.procesando.set(false);

    if (resp?.data) {
      const actualizado = resp.data;
      this.hilo.update(h => h && {
        ...h,
        mensajes: h.mensajes.map(x => x.id === actualizado.id ? actualizado : x),
      });
    }
  }

  // ─── Nueva notificación ───────────────────────────────────────────────────

  onEmpresaNueva(idEmpresa: string) {
    this.nuevaEmpresa.set(idEmpresa);
    this.nuevoCliente.set('');
    this.clientes.set([]);
    if (idEmpresa) this.cargarClientes();
  }

  private async cargarClientes() {
    const idEmpresa = this.nuevaEmpresa();
    this.cargandoClientes.set(true);
    const resp = await this.desembolsoService.obtenerClientesEmpresa(this.loteId(), idEmpresa);
    if (this.nuevaEmpresa() !== idEmpresa) return;
    this.clientes.set(resp?.data?.clientes ?? []);
    this.cargandoClientes.set(false);
  }

  /** "Librería Artemis — Banco Industrial (Cuenta: 004-1029384-5)" */
  etiquetaEmpresa(e: IComisionEmpresa): string {
    const cuenta = e.cuentaDestino;
    const detalle = cuenta
      ? `${cuenta.nombreBanco || 'Banco'} (Cuenta: ${cuenta.numeroCuenta})`
      : 'Sin cuenta registrada';
    return `${e.nombreEmpresa || '—'} — ${detalle}`;
  }

  nombreCliente(r: IDesembolsoReferido): string {
    return [r.primerNombre, r.segundoNombre, r.primerApellido, r.segundoApellido].filter(Boolean).join(' ');
  }

  /** Busca usuarios internos a partir de 3 caracteres, con espera para no consultar en cada tecla */
  onBusquedaUsuario(texto: string) {
    this.busquedaUsuario.set(texto);
    clearTimeout(this.timerBusqueda);

    const termino = texto.trim();
    if (termino.length < 3) {
      this.usuarios.set([]);
      return;
    }
    this.timerBusqueda = setTimeout(() => this.buscarUsuarios(termino), 400);
  }

  private async buscarUsuarios(termino: string) {
    this.buscandoUsuarios.set(true);
    const resp = await this.userService.getUsers({ page: 1, limit: 10, search: termino });
    if (this.busquedaUsuario().trim() !== termino) return;
    this.buscandoUsuarios.set(false);

    // Solo usuarios internos, activos, con correo y distintos al que envía
    this.usuarios.set((resp?.data?.users ?? []).filter(u =>
      u.active !== false
      && !!u.email
      && u.realm !== 'ONESITEEX'
      && !String(u.userName).startsWith('ex:')
      && !mismoUsuario(u.userId, this.usuarioId)
    ));
  }

  elegirDestinatario(u: IUser) {
    this.destinatario.set(u);
    this.busquedaUsuario.set('');
    this.usuarios.set([]);
  }

  async enviar() {
    if (!this.formularioValido() || this.enviando()) return;

    this.enviando.set(true);
    const resp = await this.notificacionService.crear(this.loteId(), {
      idEmpresa: this.nuevaEmpresa(),
      desembolsoId: this.nuevoCliente() || undefined,
      destinatarioId: this.destinatario()!.userId,
      asunto: this.asunto().trim(),
      mensaje: this.mensaje().trim(),
    });
    this.enviando.set(false);

    if (!resp?.data) return;

    this.destinatario.set(null);
    this.asunto.set('');
    this.mensaje.set('');
    this.nuevoCliente.set('');
    this.actualizado.emit();

    // Se muestra la conversación creada al inicio del listado
    this.estadoFiltro.set('');
    if (this.empresaFiltro() && !mismoUsuario(this.empresaFiltro(), resp.data.idEmpresa)) this.empresaFiltro.set('');
    this.pagination.update(p => ({ ...p, page: 1 }));
    await this.fetchData();
    this.abiertaId.set(resp.data.id);
    this.hilo.set(resp.data);
    this.seccionesCerradas.update(s => {
      const nuevas = new Set(s);
      nuevas.delete('listado');
      return nuevas;
    });
  }
}
