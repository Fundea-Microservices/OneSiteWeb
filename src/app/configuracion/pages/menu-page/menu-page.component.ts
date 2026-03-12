import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, inject, signal, ViewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Modal } from 'bootstrap';
import { DatePipe } from '@angular/common';
import { UpsertMetodoComponent } from '../../components/metodo/upsert-metodo/upsert-metodo.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination';
import { IMenu } from '../../../../interfaces/auth';
import { MenuService } from '../../../../services/config/menu.service';
import { MenuTablaComponent } from "../../components/menu/menu-tabla/menu-tabla.component";
import { UpsertMenuComponent } from "../../components/menu/upsert-menu/upsert-menu.component";

const emptyMenu: IMenu = {
    menuId: '',
    name: '',
    description: '',
    pathApp: '',
    pathWeb: '',
    label: '',
    icon: '',
    color: '',
    main: false,
    active: true,
    created_at: new Date()
  }

@Component({
  selector: 'app-menu-page',
  imports: [RouterLink, PaginationComponent, MenuTablaComponent, UpsertMenuComponent, UpsertMenuComponent],
  templateUrl: './menu-page.component.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class MenuPageComponent { 

  menuService = inject(MenuService);
  menuList = signal<IMenu[]>([]);
  submenuList = signal<IMenu[]>([]);
  metadata = signal({})// Cambia el tipo según tu modelo de datos
  nuevoMenu = signal(true);
  menuEdit = signal<IMenu>(emptyMenu);

  paginationMenu = signal<IPagination>({
    page: 1,
    pageSize: 10,
    totalItems: 0
  })
  paginationSubmenu = signal<IPagination>({
    page: 1,
    pageSize: 10,
    totalItems: 0
  })
  isLoading = signal(false);
  isLoading2 = signal(false);
  formKey = signal(Date.now());

  @ViewChild('upsertModal') modalElementRef!: ElementRef;
  private modalUpsertInstance!: bootstrap.Modal;

  @ViewChild('deleteModal') modalDeleteElementRef!: ElementRef;
  private modalDeleteInstance!: bootstrap.Modal;

  modal = signal({
    titulo: 'Crear Rol',
    visible: false,
  });

  buscador = signal('');

  constructor() { }

  ngOnInit() {

    this.menuList.set([]); // Limpiamos la lista antes de cargar nuevos datos
    this.fetchDataMenu();
    this.fetchDataSubmenu();
  }

  ngAfterViewInit() {
    this.modalUpsertInstance = new Modal(this.modalElementRef.nativeElement);
    this.modalDeleteInstance = new Modal(this.modalDeleteElementRef.nativeElement);
  }

  async fetchDataMenu() {
    if (this.isLoading()) return;
    this.isLoading.set(true);
    let resp = await this.menuService.getMenus({ page: this.paginationMenu().page, limit: this.paginationMenu().pageSize, search: this.buscador() });
    if (resp) {
      let { menus, metadata } = resp.data;
      this.menuList.set(menus);
      this.metadata.set(metadata);
      this.paginationMenu.set({
        page: metadata.page,
        pageSize: metadata.limit,
        totalItems: metadata.total
      });
    }
    this.isLoading.set(false);
  }

  async fetchDataSubmenu() {
    if (this.isLoading2()) return;
    this.isLoading2.set(true);
    let resp = await this.menuService.getSubmenus({ page: this.paginationSubmenu().page, limit: this.paginationSubmenu().pageSize, search: this.buscador() });
    if (resp) {
      let { menus, metadata } = resp.data;
      this.submenuList.set(menus);
      this.metadata.set(metadata);
      this.paginationSubmenu.set({
        page: metadata.page,
        pageSize: metadata.limit,
        totalItems: metadata.total
      });
    }
    this.isLoading2.set(false);
  }

  async deleteMenu(menu: IMenu) {
    let resp = await this.menuService.deleteMenu(menu);
    if (resp?.success) {
      this.fetchDataMenu();
      this.fetchDataSubmenu()
      if (this.modalDeleteInstance) {
        this.modalDeleteInstance.hide();
      }
    }
  }

  changeActive(menu: IMenu) {
    // menu.active = checked;
    this.updateMenu(menu);
  }

  async createMenu(menu: IMenu) {
    let resp = await this.menuService.createMenu(menu)
    if (resp?.success) {
      this.fetchDataMenu()
      this.fetchDataSubmenu();
      this.closeModal();
      this.menuEdit.set(emptyMenu);
      this.nuevoMenu.set(true); // Reseteamos el estado de nuevo menú
    }
  }

  async updateMenu(menu: IMenu) {
    let resp = await this.menuService.updateMenu(menu)
    if (resp?.success) {
      this.fetchDataMenu()
      this.fetchDataSubmenu();
      this.closeModal();
    }
  }

  onChangePageMenu(newPagination: IPagination) {
    this.menuList.set([]); // Limpiamos la lista antes de cargar nuevos datos
    this.paginationMenu.set(newPagination);
    this.fetchDataMenu();
  }

  onChangePageSubmenu(newPagination: IPagination) {
    this.submenuList.set([]); // Limpiamos la lista antes de cargar nuevos datos
    this.paginationSubmenu.set(newPagination);
    this.fetchDataSubmenu();
  }

  async upsertMenu(menu: IMenu) {
    // Si el pathWeb no empieza con '/', lo agregamos
    if (menu.pathWeb && !menu.pathWeb.startsWith('/')) {
      menu.pathWeb = '/' + menu.pathWeb;
    }
    if (!menu.menuId) {
      this.createMenu(menu);
    } else {
      this.updateMenu(menu);
    }
  }

  openModal(nuevo: boolean = true, menu: IMenu = emptyMenu) {
    this.nuevoMenu.set(nuevo);

    if (this.nuevoMenu()) {
      this.menuEdit.set(emptyMenu)
    } else {
      this.menuEdit.set(menu);
    }
    this.formKey.set(Date.now()); // esto obliga al componente hijo a resetear
    this.modal.set({ titulo: nuevo ? 'Crear Menú' : 'Actualizar Menú', visible: true });
    if (!this.modalUpsertInstance) {
      this.modalUpsertInstance = new Modal(this.modalElementRef.nativeElement);
    }
    this.modalUpsertInstance.show();
  }

  closeModal() {
    if (this.modalUpsertInstance) {
      this.modalUpsertInstance.hide();
    }
  }

  openDeleteModal(menu: IMenu) {
    this.menuEdit.set(menu);
    this.modal.set({
      titulo: menu.menuId ? 'Actualizar Menú' : 'Crear Menú',
      visible: true,
    });
    if (!this.modalDeleteInstance) {
      this.modalDeleteInstance = new Modal(this.modalDeleteElementRef.nativeElement);
    }
    this.modalDeleteInstance.show();
  }
}
