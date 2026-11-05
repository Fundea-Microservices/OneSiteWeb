import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, inject, signal, ViewChild } from '@angular/core';
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

@Component({
  selector: 'app-catalogo-bancos-page',
  standalone: true,
  imports: [DatePipe, RouterLink, PaginationComponent, UpsertBancoComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './catalogo-bancos-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class CatalogoBancosPage {

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

  @ViewChild('upsertBancoModal') modalElementRef!: ElementRef;
  private modalUpsert!: Modal;

  ngOnInit() {
    this.fetchData();
  }

  ngAfterViewInit() {
    this.modalUpsert = new Modal(this.modalElementRef.nativeElement);
  }

  // ── Listado ────────────────────────────────────────────────────────────────

  async fetchData() {
    const seq = ++this.fetchSeq;
    this.isLoading.set(true);
    this.errorLista.set('');

    try {
      const { page, pageSize } = this.pagination();
      const resp = await this.service.getBancos({ page, limit: pageSize });
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

  /** El listado se ordena por id ascendente: un banco nuevo queda en la última página. */
  private irAUltimaPagina() {
    const { totalItems, pageSize } = this.pagination();
    this.pagination.update(p => ({ ...p, page: Math.ceil((totalItems + 1) / pageSize) }));
    this.fetchData();
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
      this.irAUltimaPagina();
    } catch (error) {
      this.manejarErrorGuardado(error, () => this.irAUltimaPagina());
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
      this.fetchData();
    } catch (error) {
      this.manejarErrorGuardado(error, () => this.fetchData());
    } finally {
      this.isSaving.set(false);
    }
  }

  /**
   * Fuera de los casos con trato propio, el modal sigue abierto y conserva lo
   * capturado para que el usuario corrija o reintente.
   */
  private manejarErrorGuardado(error: unknown, recargar: () => void) {
    const err = interpretarErrorBanco(error);

    // El cambio sí se guardó: reintentar produciría un duplicado.
    if (err.status === 500 && err.codigo === 'BANCO_SIN_BITACORA') {
      this.toastr.warning(
        'El cambio sí se guardó, pero no quedó registrado en la bitácora. No es necesario volver a intentarlo.',
        'Catálogo de bancos'
      );
      this.cerrarModal();
      recargar();
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
