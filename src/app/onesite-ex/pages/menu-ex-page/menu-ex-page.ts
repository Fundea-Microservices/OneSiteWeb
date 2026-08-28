import {
  AfterViewInit, ChangeDetectionStrategy, Component, computed, CUSTOM_ELEMENTS_SCHEMA,
  ElementRef, inject, OnInit, signal, ViewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Modal } from 'bootstrap';
import { PaginationComponent } from '../../../shared/components/pagination/pagination';
import { UpsertMenuExComponent } from '../../components/upsert-menu-ex/upsert-menu-ex.component';
import { MenuExService } from '../../../../services/onesiteex-auth/menu-ex.service';
import { RolExService } from '../../../../services/onesiteex-auth/rol-ex.service';
import { IMenuEx, IMenuExUpsert, IRolEx } from '../../../../interfaces/onesiteex-auth/onesiteex-auth';

@Component({
  selector: 'app-menu-ex-page',
  imports: [RouterLink, PaginationComponent, UpsertMenuExComponent],
  templateUrl: './menu-ex-page.html',
  styleUrl: './menu-ex-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export default class MenuExPage implements OnInit, AfterViewInit {
  private menuService = inject(MenuExService);
  private rolService = inject(RolExService);

  menuList = signal<IMenuEx[]>([]);
  // Todos los menús (para el select de padre y para resolver el nombre del padre en la tabla).
  menuTodos = signal<IMenuEx[]>([]);
  rolList = signal<IRolEx[]>([]);

  menuEdit = signal<IMenuEx | null>(null);
  nuevo = signal(true);
  formKey = signal(Date.now());
  isLoading = signal(false);
  modal = signal({ titulo: 'Nuevo ítem de menú' });

  buscador = signal('');
  pagination = signal<IPagination>({ page: 1, pageSize: 10, totalItems: 0 });

  hayFiltrosActivos = computed(() => !!this.buscador());

  private menuMap = computed(() => new Map(this.menuTodos().map(m => [m.idMenu, m])));
  private rolMap = computed(() => new Map(this.rolList().map(r => [r.idRol, r])));

  @ViewChild('upsertModal') modalRef!: ElementRef;
  private modalInstance!: Modal;
  @ViewChild('deleteModal') deleteModalRef!: ElementRef;
  private deleteModalInstance!: Modal;

  ngOnInit() {
    this.fetchCatalogos();
    this.fetchData();
  }

  ngAfterViewInit() {
    this.modalInstance = new Modal(this.modalRef.nativeElement);
    this.deleteModalInstance = new Modal(this.deleteModalRef.nativeElement);
  }

  // ─── Datos ─────────────────────────────────────────────────────────────────

  async fetchCatalogos() {
    const [menus, roles] = await Promise.all([
      this.menuService.getMenus({ all: true }),
      this.rolService.getRoles({ all: true }),
    ]);
    this.menuTodos.set(menus?.data ?? []);
    this.rolList.set(roles?.data ?? []);
  }

  async fetchData() {
    if (this.isLoading()) return;
    this.isLoading.set(true);
    try {
      const resp = await this.menuService.getMenus({
        page: this.pagination().page,
        limit: this.pagination().pageSize,
        search: this.buscador(),
      });
      if (resp?.data) {
        this.menuList.set(resp.data ?? []);
        const m = resp.metadata;
        if (m) {
          this.pagination.set({
            page: m.page ?? 1,
            pageSize: m.limit ?? this.pagination().pageSize,
            totalItems: m.total,
          });
        }
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  buscar() {
    this.pagination.update(p => ({ ...p, page: 1 }));
    this.fetchData();
  }

  limpiarFiltros() {
    this.buscador.set('');
    this.buscar();
  }

  onChangePage(p: IPagination) { this.pagination.set(p); this.fetchData(); }

  // ─── Etiquetas ─────────────────────────────────────────────────────────────

  nombrePadre(idPadre: number | null) {
    if (idPadre == null) return '—';
    return this.menuMap().get(idPadre)?.nombre ?? `#${idPadre}`;
  }

  nombrePermiso(idPermiso: number | null) {
    if (idPermiso == null) return null;
    return this.rolMap().get(idPermiso)?.nombreRol ?? `#${idPermiso}`;
  }

  // ─── CRUD ──────────────────────────────────────────────────────────────────

  openModal(esNuevo: boolean, menu?: IMenuEx) {
    this.nuevo.set(esNuevo);
    this.formKey.set(Date.now());
    this.menuEdit.set(esNuevo ? null : { ...menu! });
    this.modal.set({ titulo: esNuevo ? 'Nuevo ítem de menú' : 'Editar ítem de menú' });
    this.modalInstance.show();
  }

  closeModal() { this.modalInstance.hide(); }

  openDeleteModal(menu: IMenuEx) {
    this.menuEdit.set({ ...menu });
    this.deleteModalInstance.show();
  }

  async upsertMenu(menu: IMenuExUpsert) {
    const resp = this.nuevo()
      ? await this.menuService.createMenu(menu)
      : await this.menuService.updateMenu(menu);
    if (resp?.success) {
      this.closeModal();
      await this.fetchCatalogos();
      this.fetchData();
    }
  }

  async deleteMenu() {
    const id = this.menuEdit()?.idMenu;
    if (!id) return;
    const resp = await this.menuService.deleteMenu(id);
    if (resp?.success) {
      this.deleteModalInstance.hide();
      await this.fetchCatalogos();
      this.fetchData();
    }
  }

  /** Toggle de estado optimista: actualiza la lista local y recarga solo si falla. */
  async toggleEstado(menu: IMenuEx, checked: boolean) {
    const resp = await this.menuService.updateMenu({ idMenu: menu.idMenu, estado: checked });
    if (resp?.success) {
      this.menuList.update(list =>
        list.map(m => m.idMenu === menu.idMenu ? { ...m, estado: checked } : m)
      );
    } else {
      this.fetchData();
    }
  }
}
