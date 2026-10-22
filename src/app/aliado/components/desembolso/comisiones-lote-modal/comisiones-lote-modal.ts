import { ChangeDetectionStrategy, Component, computed, CUSTOM_ELEMENTS_SCHEMA, inject, input, output, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, NgTemplateOutlet } from '@angular/common';
import { DesembolsoService } from '../../../../../services/aliado/desembolso.service';
import { AuthService } from '../../../../../services/auth.service';
import { CatalogosBantotalService } from '../../../../../services/api-bantotal/catalogos.service';
import {
  CategoriaComision,
  ICategoriaComision,
  IComisionEmpresa,
  ILoteDesembolso,
  IResumenComisiones,
} from '../../../../../interfaces/aliado/desembolso';
import { claseEstadoLote, mismoUsuario, nombrePeriodo, puedeAprobar, puedePagar, puedeRechazar } from '../../../utils/desembolso.utils';
import { AccionResolucion, ResolverLoteModal } from '../resolver-lote-modal/resolver-lote-modal';
import { ClientesEmpresaModal } from '../clientes-empresa-modal/clientes-empresa-modal';

type Seccion = 'info' | 'categorias' | 'desglose' | 'dictamen';

/** Colores por categoría (clases completas para que Tailwind las detecte) */
const ESTILO_CATEGORIA: Record<CategoriaComision, { badge: string; monto: string }> = {
  A: { badge: 'bg-blue-100 text-blue-800', monto: 'text-blue-700' },
  B: { badge: 'bg-amber-100 text-amber-800', monto: 'text-orange-600' },
  C: { badge: 'bg-green-100 text-green-800', monto: 'text-green-700' },
};

/** Ventana "Aprobación de pago de comisiones" de un lote */
@Component({
  selector: 'app-comisiones-lote-modal',
  imports: [DatePipe, CurrencyPipe, NgTemplateOutlet, ResolverLoteModal, ClientesEmpresaModal],
  templateUrl: './comisiones-lote-modal.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'onEscape()' },
})
export class ComisionesLoteModal {
  private desembolsoService = inject(DesembolsoService);
  private authService = inject(AuthService);
  private catalogosService = inject(CatalogosBantotalService);

  loteId = input.required<string>();

  cerrar = output<void>();
  /** Se emite tras aprobar, rechazar o pagar, para que el listado se recargue */
  actualizado = output<ILoteDesembolso>();

  readonly claseEstado = claseEstadoLote;

  isLoading = signal(false);
  resumen = signal<IResumenComisiones | null>(null);
  regiones = signal<Map<string, string>>(new Map());

  accionResolver = signal<AccionResolucion | null>(null);
  empresaVer = signal<IComisionEmpresa | null>(null);

  /** Secciones del acordeón que el usuario colapsó (todas abiertas al inicio) */
  seccionesCerradas = signal<Set<Seccion>>(new Set());

  get usuarioId(): string {
    return this.authService.getUserStorage()?.userId;
  }

  lote = computed(() => this.resumen()?.lote ?? null);
  periodoLabel = computed(() => nombrePeriodo(this.lote()?.periodo));

  puedeAprobar = computed(() => !!this.lote() && puedeAprobar(this.lote()!, this.usuarioId));
  puedeRechazar = computed(() => !!this.lote() && puedeRechazar(this.lote()!, this.usuarioId));
  puedePagar = computed(() => !!this.lote() && puedePagar(this.lote()!));

  /** El lote está PROCESADO y lo validó el usuario logueado: debe resolverlo otra persona */
  esperaOtroUsuario = computed(() => {
    const lote = this.lote();
    return lote?.estado === 'PROCESADO' && mismoUsuario(lote.usuarioIdProceso, this.usuarioId);
  });

  ngOnInit() {
    this.cargarRegiones();
    this.cargar();
  }

  async cargar() {
    this.isLoading.set(true);
    const resp = await this.desembolsoService.obtenerComisiones(this.loteId());
    this.resumen.set(resp?.data ?? null);
    this.isLoading.set(false);
  }

  private cargarRegiones() {
    this.catalogosService.listarCatalogos({ grupo: 'region', all: true }).subscribe({
      next: (result) => {
        const catalogos: any[] = (result as any)?.data?.data?.catalogos
          ?? (result as any)?.data?.catalogos
          ?? [];
        this.regiones.set(new Map(catalogos.map(r => [String(r.valorCore), r.nombre])));
      },
    });
  }

  nombreRegion(regionId: number | null): string {
    if (regionId === null) return '—';
    return this.regiones().get(String(regionId)) ?? String(regionId);
  }

  /** "1 a 4 Casos" · "≥ 10 Casos" */
  rangoCasos(c: ICategoriaComision): string {
    return c.maxCasos === null ? `≥ ${c.minCasos} Casos` : `${c.minCasos} a ${c.maxCasos} Casos`;
  }

  estiloCategoria(categoria: CategoriaComision | null) {
    return categoria ? ESTILO_CATEGORIA[categoria] : { badge: 'bg-gray-100 text-gray-600', monto: 'text-gray-700' };
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

  onResuelto(lote: ILoteDesembolso) {
    this.accionResolver.set(null);
    this.actualizado.emit(lote);
    // Al aprobar, el desglose queda guardado (preliminar = false): se vuelve a pedir
    this.cargar();
  }

  /** Esc cierra solo la ventana de más arriba; el modal de aprobar/rechazar/pagar se cierra con sus botones */
  onEscape() {
    if (this.empresaVer()) this.empresaVer.set(null);
    else if (!this.accionResolver()) this.cerrar.emit();
  }
}
