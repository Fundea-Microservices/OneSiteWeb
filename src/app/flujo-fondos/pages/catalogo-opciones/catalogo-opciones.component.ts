import { ChangeDetectionStrategy, Component, computed, CUSTOM_ELEMENTS_SCHEMA, ElementRef, inject, signal, ViewChild } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { Modal } from 'bootstrap';
import { ICatalogo, ICatalogoOpcion, IOpcionCreate, IOpcionUpdate } from '../../../../interfaces/catalogo';
import { CatalogoService } from '../../../../services/flujo-fondos/catalogo.service';
import { PaginationComponent } from '../../../shared/components/pagination/pagination';
import { UpsertOpcionComponent } from '../../components/catalogo/upsert-opcion/upsert-opcion';

@Component({
  selector: 'app-catalogo-opciones',
  imports: [RouterLink, PaginationComponent, UpsertOpcionComponent, CdkDropList, CdkDrag, CdkDragHandle],
  templateUrl: './catalogo-opciones.component.html',
  styles: [`
    .drag-handle { cursor: grab; }
    .cdk-drag-preview { display: table; background: var(--bs-body-bg); box-shadow: 0 4px 12px rgba(0, 0, 0, .2); }
    .cdk-drag-preview td, .cdk-drag-preview th { padding: .25rem .5rem; }
    .cdk-drag-placeholder { opacity: .35; }
    .cdk-drag-animating, .cdk-drop-list-dragging tr:not(.cdk-drag-placeholder) { transition: transform 200ms ease; }
  `],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class CatalogoOpcionesComponent {

  private route = inject(ActivatedRoute);
  catalogoService = inject(CatalogoService);

  catalogoId = signal('');
  catalogo = signal<ICatalogo | null>(null);
  opcionesList = signal<ICatalogoOpcion[]>([]);
  // Opciones del catálogo padre: llenan el select de padre y traducen padreId a nombre
  opcionesPadre = signal<ICatalogoOpcion[]>([]);
  nuevaOpcion = signal(true);
  opcionEdit = signal<ICatalogoOpcion | null>(null);

  tienePadre = computed(() => !!this.catalogo()?.catalogoPadreId);
  nombresPadre = computed(() => new Map(this.opcionesPadre().map(o => [o.id, o.nombre])));

  pagination = signal<IPagination>({
    page: 1,
    pageSize: 10,
    totalItems: 0
  });
  isLoading = signal(false);
  guardandoOrden = signal(false);
  formKey = signal(Date.now());

  @ViewChild('upsertOpcionModal') modalElementRef!: ElementRef;
  private modalUpsertInstance!: bootstrap.Modal;

  @ViewChild('desactivarOpcionModal') modalDesactivarElementRef!: ElementRef;
  private modalDesactivarInstance!: bootstrap.Modal;

  modal = signal({ titulo: 'Crear Opción' });

  buscador = signal('');
  // '' = todos, 'true' = activos, 'false' = inactivos
  activoFilter = signal<'' | 'true' | 'false'>('');
  padreFilter = signal('');

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.catalogoId.set(id);
    this.loadCatalogo(id);
    this.fetchData();
  }

  ngAfterViewInit() {
    this.modalUpsertInstance = new Modal(this.modalElementRef.nativeElement);
    this.modalDesactivarInstance = new Modal(this.modalDesactivarElementRef.nativeElement);
  }

  async loadCatalogo(id: string) {
    const catalogo = await this.catalogoService.getCatalogoById(id);
    this.catalogo.set(catalogo);
    if (catalogo?.catalogoPadreId) {
      const resp = await this.catalogoService.getOpciones({ catalogoId: catalogo.catalogoPadreId, all: true });
      this.opcionesPadre.set(resp?.data.opciones ?? []);
    }
  }

  async fetchData() {
    if (this.isLoading()) return;
    this.isLoading.set(true);
    const activo = this.activoFilter();
    const resp = await this.catalogoService.getOpciones({
      catalogoId: this.catalogoId(),
      parentId: this.padreFilter() || undefined,
      page: this.pagination().page,
      limit: this.pagination().pageSize,
      search: this.buscador().trim(),
      // Sin `active` no se filtra; `active=false` ahora sí devuelve solo inactivos
      active: activo === '' ? undefined : activo === 'true',
    });
    if (resp) {
      const { opciones, metadata } = resp.data;
      this.opcionesList.set(opciones);
      this.pagination.set({
        page: metadata.page,
        pageSize: metadata.limit,
        totalItems: metadata.total
      });
    }
    this.isLoading.set(false);
  }

  buscar() {
    this.pagination.update(p => ({ ...p, page: 1 }));
    this.fetchData();
  }

  nombrePadre(opcion: ICatalogoOpcion): string {
    if (!opcion.padreId) return '—';
    return opcion.padre?.nombre ?? this.nombresPadre().get(opcion.padreId) ?? '—';
  }

  async changeActivo(opcion: ICatalogoOpcion, cbx: HTMLInputElement) {
    const checked = cbx.checked;
    const resp = await this.catalogoService.updateOpcion({ id: opcion.id, activo: checked });
    if (resp?.success) {
      this.opcionesList.update(list => list.map(o => o.id === opcion.id ? { ...o, activo: checked } : o));
    } else {
      cbx.checked = !checked;
    }
  }

  async changePorDefecto(opcion: ICatalogoOpcion, cbx: HTMLInputElement) {
    const checked = cbx.checked;
    const resp = await this.catalogoService.updateOpcion({ id: opcion.id, porDefecto: checked });
    if (resp?.success) {
      // El backend desmarca la anterior por defecto: recargar
      this.fetchData();
    } else {
      cbx.checked = !checked;
    }
  }

  async onDrop(event: CdkDragDrop<ICatalogoOpcion[]>) {
    if (event.previousIndex === event.currentIndex || this.guardandoOrden()) return;

    const anterior = this.opcionesList();
    const lista = [...anterior];
    moveItemInArray(lista, event.previousIndex, event.currentIndex);

    // Se reparten los mismos valores de `orden` que ya tenía la página (llegan ordenados del backend):
    // así no cambia la posición respecto a opciones de otras páginas u ocultas por los filtros.
    const valores = anterior.map(o => o.orden ?? 0);
    for (let i = 1; i < valores.length; i++) {
      // Empates (p. ej. varias opciones en 0) se vuelven consecutivos para que el nuevo orden se respete
      if (valores[i] <= valores[i - 1]) valores[i] = valores[i - 1] + 1;
    }

    const reordenada = lista.map((o, i) => ({ ...o, orden: valores[i] }));
    const cambios = reordenada
      .filter(o => anterior.find(a => a.id === o.id)?.orden !== o.orden)
      .map(o => ({ id: o.id, orden: o.orden }));

    this.opcionesList.set(reordenada);
    if (!cambios.length) return;

    this.guardandoOrden.set(true);
    const ok = await this.catalogoService.actualizarOrdenOpciones(cambios);
    this.guardandoOrden.set(false);
    if (!ok) {
      // Puede haber quedado guardada solo una parte: recargar lo que tiene el backend
      this.fetchData();
    }
  }

  async desactivarOpcion(opcion: ICatalogoOpcion) {
    const resp = await this.catalogoService.desactivarOpcion(opcion.id);
    if (resp?.success) {
      this.fetchData();
      this.modalDesactivarInstance?.hide();
    }
  }

  async createOpcion(opcion: IOpcionCreate) {
    const resp = await this.catalogoService.createOpcion(opcion);
    if (resp?.success) {
      this.fetchData();
      this.closeModal();
    }
  }

  async updateOpcion(opcion: IOpcionUpdate) {
    const resp = await this.catalogoService.updateOpcion(opcion);
    if (resp?.success) {
      this.fetchData();
      this.closeModal();
    }
  }

  onSave(opcion: IOpcionCreate | IOpcionUpdate) {
    if ('id' in opcion) {
      this.updateOpcion(opcion);
    } else {
      this.createOpcion(opcion);
    }
  }

  onChangePage(newPagination: IPagination) {
    this.opcionesList.set([]);
    this.pagination.set(newPagination);
    this.fetchData();
  }

  openModal(nuevo: boolean = true, opcion: ICatalogoOpcion | null = null) {
    this.nuevaOpcion.set(nuevo);
    this.opcionEdit.set(nuevo ? null : opcion);
    this.formKey.set(Date.now());
    this.modal.set({ titulo: nuevo ? 'Crear Opción' : 'Actualizar Opción' });

    if (!this.modalUpsertInstance) {
      this.modalUpsertInstance = new Modal(this.modalElementRef.nativeElement);
    }
    this.modalUpsertInstance.show();
  }

  closeModal() {
    this.modalUpsertInstance?.hide();
  }

  openDesactivarModal(opcion: ICatalogoOpcion) {
    this.opcionEdit.set(opcion);
    if (!this.modalDesactivarInstance) {
      this.modalDesactivarInstance = new Modal(this.modalDesactivarElementRef.nativeElement);
    }
    this.modalDesactivarInstance.show();
  }
}
