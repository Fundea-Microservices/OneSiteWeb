import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DesembolsoService } from '../../../../services/aliado/desembolso.service';
import { AuthService } from '../../../../services/auth.service';
import {
  EstadoValidacion,
  IDesembolsoReferido,
  ILoteDesembolso,
  ValidacionDesembolso,
} from '../../../../interfaces/aliado/desembolso';
import { PaginationAllComponent } from '../../../shared/components/pagination-all/pagination-all';
import { AccionResolucion, ResolverLoteModal } from '../../components/desembolso/resolver-lote-modal/resolver-lote-modal';
import {
  claseEstadoLote,
  mismoUsuario,
  nombrePeriodo,
  puedeAprobar,
  puedeRechazar,
  puedeValidar,
} from '../../utils/desembolso.utils';

/** Registro del lote con los valores que el usuario está editando */
interface RegistroValidacion extends IDesembolsoReferido {
  validadoEdit: boolean | null;
  comentarioEdit: string;
}

@Component({
  selector: 'app-detalle-lote-desembolso-page',
  imports: [RouterLink, FormsModule, DatePipe, CurrencyPipe, PaginationAllComponent, ResolverLoteModal],
  templateUrl: './detalle-lote-desembolso-page.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class DetalleLoteDesembolsoPage {
  private desembolsoService = inject(DesembolsoService);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);

  readonly maxComentario = 500;
  readonly claseEstado = claseEstadoLote;

  private loteId = '';

  isLoading = signal(false);
  isSaving = signal(false);
  lote = signal<ILoteDesembolso | null>(null);
  registros = signal<RegistroValidacion[]>([]);

  // Filtros y paginación del lado del front
  busqueda = signal('');
  filtroValidacion = signal<EstadoValidacion | ''>('');
  pagination = signal<IPagination>({ page: 1, pageSize: 25, totalItems: 0 });

  // Aprobar / rechazar
  accionResolver = signal<AccionResolucion | null>(null);

  get usuarioId(): string {
    return this.authService.getUserStorage()?.userId;
  }

  periodoLabel = computed(() => nombrePeriodo(this.lote()?.periodo));
  editable = computed(() => !!this.lote() && puedeValidar(this.lote()!));

  contadores = computed(() => {
    let validos = 0, noValidos = 0, pendientes = 0, monto = 0;
    for (const r of this.registros()) {
      if (r.validadoEdit === true) { validos++; monto += Number(r.montoOtorgado) || 0; }
      else if (r.validadoEdit === false) noValidos++;
      else pendientes++;
    }
    return { validos, noValidos, pendientes, monto };
  });

  cambios = computed(() => this.registros().filter(r => this.tieneCambios(r)));

  sinComentario = computed(() =>
    this.registros().filter(r => r.validadoEdit === false && !r.comentarioEdit.trim()).length
  );

  puedeGuardar = computed(() =>
    this.editable() &&
    !this.isSaving() &&
    this.cambios().length > 0 &&
    this.contadores().pendientes === 0 &&
    this.sinComentario() === 0
  );

  /** Mientras haya cambios sin guardar no se permite aprobar/rechazar */
  puedeAprobar = computed(() => {
    const lote = this.lote();
    return !!lote && puedeAprobar(lote, this.usuarioId) && this.cambios().length === 0;
  });

  puedeRechazar = computed(() => {
    const lote = this.lote();
    return !!lote && puedeRechazar(lote, this.usuarioId) && this.cambios().length === 0;
  });

  esperaOtroUsuario = computed(() => {
    const lote = this.lote();
    return lote?.estado === 'PROCESADO' && mismoUsuario(lote.usuarioIdProceso, this.usuarioId);
  });

  registrosFiltrados = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    const filtro = this.filtroValidacion();

    return this.registros().filter(r => {
      if (filtro === 'PENDIENTE' && r.validadoEdit !== null) return false;
      if (filtro === 'VALIDO' && r.validadoEdit !== true) return false;
      if (filtro === 'NO_VALIDO' && r.validadoEdit !== false) return false;
      if (!texto) return true;
      return [r.dpi, this.nombreCliente(r), r.nombreEmpresa, r.username, r.cuenta, r.operacion]
        .some(v => (v ?? '').toString().toLowerCase().includes(texto));
    });
  });

  registrosPagina = computed(() => {
    const { page, pageSize } = this.pagination();
    const inicio = (page - 1) * pageSize;
    return this.registrosFiltrados().slice(inicio, inicio + pageSize);
  });

  paginationView = computed<IPagination>(() => ({
    ...this.pagination(),
    totalItems: this.registrosFiltrados().length,
  }));

  ngOnInit() {
    this.loteId = this.route.snapshot.paramMap.get('loteId') ?? '';
    this.cargar();
  }

  async cargar() {
    if (!this.loteId) return;
    this.isLoading.set(true);

    const respLote = await this.desembolsoService.obtenerLote(this.loteId);
    if (!respLote?.data) {
      this.isLoading.set(false);
      return;
    }
    this.lote.set(respLote.data);

    const respDetalle = await this.desembolsoService.listarDetalle(this.loteId, {
      page: 1,
      limit: Math.max(respLote.data.desembolsos, 1),
    });

    this.registros.set(
      (respDetalle?.data ?? []).map(r => ({
        ...r,
        validadoEdit: r.validado,
        comentarioEdit: r.comentarioValidado ?? '',
      }))
    );
    this.pagination.update(p => ({ ...p, page: 1 }));
    this.isLoading.set(false);
  }

  // ─── Edición ───────────────────────────────────────────────────────────────

  nombreCliente(r: IDesembolsoReferido): string {
    return [r.primerNombre, r.segundoNombre, r.primerApellido, r.segundoApellido].filter(Boolean).join(' ');
  }

  tieneCambios(r: RegistroValidacion): boolean {
    return r.validadoEdit !== r.validado || r.comentarioEdit.trim() !== (r.comentarioValidado ?? '').trim();
  }

  requiereComentario(r: RegistroValidacion): boolean {
    return r.validadoEdit === false && !r.comentarioEdit.trim();
  }

  setValidado(id: string, validado: boolean) {
    this.actualizarRegistro(id, { validadoEdit: validado });
  }

  setComentario(id: string, comentario: string) {
    this.actualizarRegistro(id, { comentarioEdit: comentario });
  }

  marcarPendientesComoAplica() {
    this.registros.update(lista =>
      lista.map(r => (r.validadoEdit === null ? { ...r, validadoEdit: true } : r))
    );
  }

  descartarCambios() {
    this.registros.update(lista =>
      lista.map(r => ({ ...r, validadoEdit: r.validado, comentarioEdit: r.comentarioValidado ?? '' }))
    );
  }

  private actualizarRegistro(id: string, cambios: Partial<RegistroValidacion>) {
    this.registros.update(lista => lista.map(r => (r.id === id ? { ...r, ...cambios } : r)));
  }

  // ─── Filtros ───────────────────────────────────────────────────────────────

  onBusqueda(valor: string) {
    this.busqueda.set(valor);
    this.pagination.update(p => ({ ...p, page: 1 }));
  }

  onFiltroValidacion(valor: EstadoValidacion | '') {
    this.filtroValidacion.set(valor);
    this.pagination.update(p => ({ ...p, page: 1 }));
  }

  onChangePage(newPagination: IPagination) {
    this.pagination.set(newPagination);
  }

  // ─── Guardar ───────────────────────────────────────────────────────────────

  async guardar() {
    if (!this.puedeGuardar()) return;

    const detalles: ValidacionDesembolso[] = this.cambios().map(r => {
      const comentario = r.comentarioEdit.trim();
      return {
        id: r.id,
        validado: r.validadoEdit as boolean,
        ...(comentario ? { comentarioValidado: comentario } : {}),
      };
    });

    this.isSaving.set(true);
    const resp = await this.desembolsoService.procesarLote(this.loteId, { detalles });
    this.isSaving.set(false);

    if (resp?.data) {
      this.lote.set(resp.data);
      // Lo guardado pasa a ser el nuevo estado original
      this.registros.update(lista =>
        lista.map(r => ({
          ...r,
          validado: r.validadoEdit,
          comentarioValidado: r.comentarioEdit.trim() || null,
          comentarioEdit: r.comentarioEdit.trim(),
        }))
      );
    }
  }

  // ─── Aprobar / rechazar ────────────────────────────────────────────────────

  onLoteResuelto(lote: ILoteDesembolso) {
    this.lote.set(lote);
    this.accionResolver.set(null);
  }
}
