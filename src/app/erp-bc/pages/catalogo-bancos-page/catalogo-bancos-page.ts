import { ChangeDetectionStrategy, Component, computed, CUSTOM_ELEMENTS_SCHEMA, ElementRef, inject, OnDestroy, signal, ViewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Modal } from 'bootstrap';
import { ToastrService } from 'ngx-toastr';
import { ActualizarBanco, Banco, CrearBanco } from '../../../../interfaces/erp-bc/catalogo-bancos';
import { AuthService } from '../../../../services/auth.service';
import { CatalogoBancosService, ErrorBanco, interpretarErrorBanco } from '../../../../services/erp-bc/catalogo-bancos.service';
import { PaginationComponent } from '../../../shared/components/pagination/pagination';
import { UpsertBancoComponent } from '../../components/upsert-banco/upsert-banco';

const MSG_ACCESO_DENEGADO = 'No tienes acceso al catálogo de bancos.';
const MSG_SIN_RESPUESTA = 'No se pudo completar la operación. Intenta de nuevo.';

const DEBOUNCE_FILTROS_MS = 350;
const ENTERO_MAX = 2147483647;

interface FiltrosListado {
  rubroContable: string;
  alias: string;
  cuenta?: number;
}

const SIN_FILTROS: FiltrosListado = { rubroContable: '', alias: '' };

@Component({
  selector: 'app-catalogo-bancos-page',
  standalone: true,
  imports: [DatePipe, RouterLink, PaginationComponent, UpsertBancoComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './catalogo-bancos-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class CatalogoBancosPage implements OnDestroy {

  private service = inject(CatalogoBancosService);
  private authService = inject(AuthService);
  private toastr = inject(ToastrService);

  readonly msgAccesoDenegado = MSG_ACCESO_DENEGADO;

  bancos = signal<Banco[]>([]);
  pagination = signal<IPagination>({ page: 1, pageSize: 10, totalItems: 0 });

  isLoading = signal(false);
  isSaving = signal(false);
  errorLista = signal('');
  accesoDenegado = signal(false);

  /** Banco que se está editando; `null` = alta de uno nuevo. */
  bancoEdit = signal<Banco | null>(null);
  /** Banco cuyo detalle se está consultando para abrir la edición. */
  abriendoId = signal<number | null>(null);
  formKey = signal(Date.now());

  /** Descarta respuestas de una consulta anterior a la última solicitada. */
  private fetchSeq = 0;

  // Filtros tal como están en los controles
  filtroRubro = signal('');
  filtroAlias = signal('');
  filtroCuenta = signal('');
  /** Filtros con los que se consulta la lista: cambian solo al aplicarlos. */
  private filtrosAplicados = signal<FiltrosListado>(SIN_FILTROS);
  private debounceId: ReturnType<typeof setTimeout> | null = null;

  rubrosContables = signal<string[]>([]);

  /** Incluye el rubro elegido aunque ya no esté en el catálogo, para no perder la selección. */
  opcionesRubro = computed(() => {
    const rubro = this.filtroRubro();
    const rubros = this.rubrosContables();
    return rubro && !rubros.includes(rubro) ? [rubro, ...rubros] : rubros;
  });

  /** Vacío también es válido: no se manda el parámetro. */
  cuentaValida = computed(() => {
    const cuenta = this.filtroCuenta().trim();
    return !cuenta || (/^\d+$/.test(cuenta) && Number(cuenta) <= ENTERO_MAX);
  });

  hayFiltrosAplicados = computed(() => {
    const f = this.filtrosAplicados();
    return !!(f.rubroContable || f.alias || f.cuenta !== undefined);
  });

  hayFiltrosEscritos = computed(() =>
    !!(this.filtroRubro() || this.filtroAlias().trim() || this.filtroCuenta().trim())
  );

  /** Banco cuyo estado se está cambiando desde el switch de la tabla. */
  cambiandoEstadoId = signal<number | null>(null);
  /** Banco que espera confirmación para desactivarse. */
  bancoPorDesactivar = signal<Banco | null>(null);

  @ViewChild('upsertBancoModal') modalElementRef!: ElementRef;
  private modalUpsert!: Modal;

  @ViewChild('desactivarBancoModal') modalDesactivarElementRef!: ElementRef;
  private modalDesactivar!: Modal;

  ngOnInit() {
    this.fetchData();
    this.cargarRubrosContables();
  }

  ngAfterViewInit() {
    this.modalUpsert = new Modal(this.modalElementRef.nativeElement);
    this.modalDesactivar = new Modal(this.modalDesactivarElementRef.nativeElement);
  }

  // ── Activar / desactivar ───────────────────────────────────────────────────

  /**
   * El switch no cambia hasta que el API responde: se devuelve a su valor y se
   * actualiza la fila con el resultado. Desactivar pide confirmación; activar no.
   */
  onSwitchActivo(banco: Banco, switchEl: HTMLInputElement) {
    switchEl.checked = banco.activo;
    if (this.cambiandoEstadoId() !== null) return;

    if (banco.activo) {
      this.bancoPorDesactivar.set(banco);
      this.modalDesactivar.show();
    } else {
      this.cambiarEstado(banco, true);
    }
  }

  async confirmarDesactivar() {
    const banco = this.bancoPorDesactivar();
    if (!banco) return;
    await this.cambiarEstado(banco, false);
    this.modalDesactivar.hide();
  }

  private async cambiarEstado(banco: Banco, activo: boolean) {
    if (this.cambiandoEstadoId() !== null) return;
    this.cambiandoEstadoId.set(banco.catalogoBancoId);

    try {
      const resp = await this.service.actualizarBanco(banco.catalogoBancoId, { activo });
      this.bancos.update(lista =>
        lista.map(b => b.catalogoBancoId === banco.catalogoBancoId ? { ...b, activo } : b)
      );
      this.toastr.success(resp.message, 'Catálogo de bancos');
    } catch (error) {
      this.manejarErrorGuardado(error);
    } finally {
      this.cambiandoEstadoId.set(null);
    }
  }

  // ── Listado ────────────────────────────────────────────────────────────────

  async fetchData() {
    const seq = ++this.fetchSeq;
    this.isLoading.set(true);
    this.errorLista.set('');

    try {
      const { page, pageSize } = this.pagination();
      const resp = await this.service.getBancos({ page, limit: pageSize, ...this.filtrosAplicados() });
      if (seq !== this.fetchSeq) return;

      const { bancos, metadata } = resp.data;
      this.bancos.set(bancos);
      this.pagination.set({ page: metadata.page, pageSize: metadata.limit, totalItems: metadata.total });
    } catch (error) {
      if (seq !== this.fetchSeq) return;

      const err = interpretarErrorBanco(error);
      this.bancos.set([]);
      this.accesoDenegado.set(err.status === 403);
      if (!this.sesionCerrada(err) && err.status !== 403) {
        this.errorLista.set(err.mensaje || MSG_SIN_RESPUESTA);
      }
    } finally {
      if (seq === this.fetchSeq) this.isLoading.set(false);
    }
  }

  onChangePage(pagination: IPagination) {
    this.pagination.set(pagination);
    this.fetchData();
  }

  /** Un alta o edición puede agregar o quitar rubros contables del filtro. */
  private recargar() {
    this.fetchData();
    this.cargarRubrosContables();
  }

  // ── Filtros ────────────────────────────────────────────────────────────────

  /** Opciones del select: los rubros contables distintos de todo el catálogo. */
  private async cargarRubrosContables() {
    try {
      const resp = await this.service.getBancos({ todos: true });
      const rubros = new Set(resp.data.bancos.map(b => b.dynamicsRubroContable));
      this.rubrosContables.set([...rubros].sort((a, b) => a.localeCompare(b, 'es', { numeric: true })));
    } catch {
      // Sin opciones el select solo ofrece "Todos"; el listado ya informa el error.
    }
  }

  onRubroChange(valor: string) {
    this.filtroRubro.set(valor);
    this.aplicarFiltros();
  }

  onAliasInput(valor: string) {
    this.filtroAlias.set(valor);
    this.programarFiltros();
  }

  onCuentaInput(valor: string) {
    this.filtroCuenta.set(valor);
    this.programarFiltros();
  }

  /** Alias y cuenta se escriben tecla a tecla: se consulta al dejar de escribir. */
  private programarFiltros() {
    this.cancelarDebounce();
    this.debounceId = setTimeout(() => this.aplicarFiltros(), DEBOUNCE_FILTROS_MS);
  }

  private cancelarDebounce() {
    if (this.debounceId !== null) clearTimeout(this.debounceId);
    this.debounceId = null;
  }

  /** Consulta con los filtros de los controles, siempre desde la página 1. */
  aplicarFiltros() {
    this.cancelarDebounce();
    if (!this.cuentaValida()) return;

    const cuenta = this.filtroCuenta().trim();
    const filtros: FiltrosListado = {
      rubroContable: this.filtroRubro(),
      alias: this.filtroAlias().trim(),
      cuenta: cuenta ? Number(cuenta) : undefined,
    };

    const actuales = this.filtrosAplicados();
    if (filtros.rubroContable === actuales.rubroContable
      && filtros.alias === actuales.alias
      && filtros.cuenta === actuales.cuenta) return;

    this.filtrosAplicados.set(filtros);
    this.pagination.update(p => ({ ...p, page: 1 }));
    this.fetchData();
  }

  limpiarFiltros() {
    this.filtroRubro.set('');
    this.filtroAlias.set('');
    this.filtroCuenta.set('');
    this.aplicarFiltros();
  }

  ngOnDestroy() {
    this.cancelarDebounce();
  }

  // ── Modal ──────────────────────────────────────────────────────────────────

  abrirCrear() {
    this.abrirModal(null);
  }

  /** Se consulta el banco antes de editar para comparar los cambios contra el dato vigente. */
  async abrirEditar(banco: Banco) {
    if (this.abriendoId() !== null) return;
    this.abriendoId.set(banco.catalogoBancoId);

    try {
      const resp = await this.service.getBanco(banco.catalogoBancoId);
      this.abrirModal(resp.data);
    } catch (error) {
      const err = interpretarErrorBanco(error);
      if (err.status === 404) {
        this.avisarBancoNoExiste(err);
      } else {
        this.notificarError(err);
      }
    } finally {
      this.abriendoId.set(null);
    }
  }

  private abrirModal(banco: Banco | null) {
    this.bancoEdit.set(banco);
    this.formKey.set(Date.now());
    this.modalUpsert.show();
  }

  cerrarModal() {
    this.modalUpsert.hide();
  }

  // ── Guardado ───────────────────────────────────────────────────────────────

  async crearBanco(datos: CrearBanco) {
    if (this.isSaving()) return;
    this.isSaving.set(true);

    try {
      const resp = await this.service.crearBanco(datos);
      this.toastr.success(resp.message, 'Catálogo de bancos');
      this.cerrarModal();
      this.recargar();
    } catch (error) {
      this.manejarErrorGuardado(error);
    } finally {
      this.isSaving.set(false);
    }
  }

  async actualizarBanco(cambios: ActualizarBanco) {
    if (this.isSaving()) return;

    if (Object.keys(cambios).length === 0) {
      this.toastr.info('El banco no tiene cambios', 'Catálogo de bancos');
      this.cerrarModal();
      return;
    }

    this.isSaving.set(true);

    try {
      const resp = await this.service.actualizarBanco(this.bancoEdit()!.catalogoBancoId, cambios);
      this.toastr.success(resp.message, 'Catálogo de bancos');
      this.cerrarModal();
      this.recargar();
    } catch (error) {
      this.manejarErrorGuardado(error);
    } finally {
      this.isSaving.set(false);
    }
  }

  /**
   * Fuera de los casos con trato propio, el modal sigue abierto y conserva lo
   * capturado para que el usuario corrija o reintente.
   */
  private manejarErrorGuardado(error: unknown) {
    const err = interpretarErrorBanco(error);

    // El cambio sí se guardó: reintentar produciría un duplicado.
    if (err.status === 500 && err.codigo === 'BANCO_SIN_BITACORA') {
      this.toastr.warning(
        'El cambio sí se guardó, pero no quedó registrado en la bitácora. No es necesario volver a intentarlo.',
        'Catálogo de bancos'
      );
      this.cerrarModal();
      this.recargar();
      return;
    }

    if (err.status === 404) {
      this.cerrarModal();
      this.avisarBancoNoExiste(err);
      return;
    }

    if (err.status === 409) {
      this.toastr.warning(err.mensaje || 'La combinación de rubro, cuenta y suboperación ya existe.', 'Banco duplicado');
      return;
    }

    this.notificarError(err);
  }

  private avisarBancoNoExiste(err: ErrorBanco) {
    this.toastr.warning(err.mensaje || 'El banco ya no existe.', 'Catálogo de bancos');
    this.fetchData();
  }

  private notificarError(err: ErrorBanco) {
    if (this.sesionCerrada(err)) return;

    if (err.status === 403) {
      this.toastr.error(MSG_ACCESO_DENEGADO, 'Acceso denegado');
      return;
    }
    this.toastr.error(err.mensaje || MSG_SIN_RESPUESTA, 'Catálogo de bancos');
  }

  /**
   * Ante un 401 el interceptor ya cerró la sesión y avisó al usuario. Si el token
   * sigue en su lugar, el 401 fue de otra causa (el API no respondió) y sí se muestra.
   */
  private sesionCerrada(err: ErrorBanco): boolean {
    return err.status === 401 && !this.authService.token;
  }
}
