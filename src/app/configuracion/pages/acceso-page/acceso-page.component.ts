import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, inject, signal, ViewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RolService } from '../../../../services/rol.service';
import { IMenu, IRol } from '../../../../interfaces/auth';
import { IAcceso } from '../../../../interfaces/acceso';
import { empty } from 'rxjs';
import { AccesoService } from '../../../../services/config/acceso.service';
import { Modal } from 'bootstrap';
import { PaginationComponent } from '../../../shared/components/pagination/pagination';
import { MenuService } from '../../../../services/config/menu.service';
import { UpsertAccesoComponent } from "../../components/acceso/upsert-acceso/upsert-acceso.component";

const emptyAcceso: IAcceso = {
  accesoId: '',
  rolId: '',
  menuId: '',
  showApp: true,
  showWeb: true,
  active: true,
  orderMenu: 0,
  menu: {
    menuId: '',
    name: '',
    description: '',
    pathApp: '',
    pathWeb: '',
    label: '',
    icon: '',
    color: 'black',
    main: true,
    active: true,
  },
  rol: {
    rolId: '',
    name: '',
    active: true,
    guest: false,
  },
}

const emptyRol: IRol = {
  rolId: '',
  name: '',
  active: true,
  guest: false,
};

@Component({
  selector: 'app-acceso-page',
  imports: [RouterLink, UpsertAccesoComponent],
  templateUrl: './acceso-page.component.html',
  styleUrls: ['./acceso-page.component.css'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class AccesoPageComponent {
  
  rolService = inject(RolService);
  accesoService = inject(AccesoService);
  menuService = inject(MenuService);

  rolesList = signal<IRol[]>([]);
  accesosList = signal<IAcceso[]>([]);
  allMenus = signal<IMenu[]>([]);
  allSubmenus = signal<IMenu[]>([]);
  menusUnused = signal<IMenu[]>([]);
  submenusUnused = signal<IMenu[]>([]);
  
  metadata = signal({})// Cambia el tipo según tu modelo de datos
  nuevoMenu = signal(true)
  accesoEdit = signal<IAcceso>(emptyAcceso);

  isLoading = signal(false);
  formKey = signal(Date.now());

  @ViewChild('upsertModal') modalElementRef!: ElementRef;
  private modalUpsertInstance!: bootstrap.Modal;

  @ViewChild('deleteModal') modalDeleteElementRef!: ElementRef;
  private modalDeleteInstance!: bootstrap.Modal;

  modal = signal({
    titulo: 'Crear acceso',
    visible: false,
  });

  rolFilter = signal('');

  constructor() { }

  ngOnInit() {

    this.rolesList.set([]); // Limpiamos la lista antes de cargar nuevos datos
    this.loadFilters();
    this.fetchData();
    this.loadAllMenus();
  }

  ngAfterViewInit() {
    this.modalUpsertInstance = new Modal(this.modalElementRef.nativeElement);
    this.modalDeleteInstance = new Modal(this.modalDeleteElementRef.nativeElement);
  }

  async loadAllMenus() {
    // Cargamos todos los menus disponibles
    let menusResponse = await this.menuService.getMenus({all: true});
    if(menusResponse && menusResponse.data.menus) {
      this.allMenus.set(menusResponse.data.menus);
    }
    let submenusResponse = await this.menuService.getSubmenus({all: true});
    if(submenusResponse && submenusResponse.data.menus) {
      this.allSubmenus.set(submenusResponse.data.menus);
    }
  }

  async loadAccesosUnused() {
    // Filtramos los menus que no están en la lista de accesos
      this.allMenus().forEach(menu => {
        const menuFound = this.accesosList().find(acceso => acceso.menu?.menuId === menu.menuId);
        if (!menuFound) {
          this.menusUnused.update(unusedMenus => [...unusedMenus, menu]);
        }
      });
      // También filtramos los submenus
      this.allSubmenus().forEach(submenu => {
        let isFound = false; 
        this.accesosList().forEach(acceso => {
          const submenuFound = acceso.subMenus?.find(s => s.menuId === submenu.menuId);
          if (submenuFound) {
            isFound = true;
          }
        });
        if (!isFound) {
          // Si el submenu no está en la lista de submenus, lo agregamos a los submenus no usados
          this.submenusUnused.update(unusedSubmenus => [...unusedSubmenus, submenu]);
        }
      })
  }

  async loadFilters() {
    let resp = await this.rolService.getRoles({ all: true });
    if (resp) {
      this.rolesList.set(resp.data.roles);
    }
  }

  async fetchData() {
    if (this.isLoading()) return;
    //Si no hay un rol seleccionado, no hacemos la consulta
    if (this.rolFilter() == '') { 
      this.accesosList.set([]); // Limpiamos la lista si no hay rol seleccionado
      return; 
    }
    this.isLoading.set(true);
    this.menusUnused.set([])
    this.submenusUnused.set([])
    let params: any = {
      page: 1,
      limit: 10,
      search: '',
      rolId: this.rolFilter() || undefined,
    }
    let resp = await this.accesoService.getAccesosByRol(this.rolFilter(), params);
    if (resp?.body?.success) {
      let { accesos, metadata } = resp.body.data;
      this.accesosList.set(accesos);
      this.metadata.set(metadata);
      this.loadAccesosUnused();
    }
    this.isLoading.set(false);
  }

  async deleteAcceso(acceso: IAcceso) {
    let resp = await this.accesoService.deleteAcceso(acceso);
    if (resp?.success) {
      this.fetchData();
      if (this.modalDeleteInstance) {
        this.modalDeleteInstance.hide();
      }
    }
  }

  changeActive(acceso: IAcceso, checked: boolean) {
    acceso.active = checked;
    this.updateAcceso(acceso);
  }

  changeShowApp(acceso: IAcceso, checked: boolean) {
    acceso.showApp = checked;
    this.updateAcceso(acceso);
  }

  changeShowWeb(acceso: IAcceso, checked: boolean) {
    acceso.showWeb = checked;
    this.updateAcceso(acceso);
  }

  async createAcceso(acceso: IAcceso) {
    let resp = await this.accesoService.createAcceso(acceso)
    if (resp?.success) {
      this.fetchData()
      this.closeModal();
      this.accesoEdit.set(emptyAcceso);
      this.nuevoMenu.set(true)
    }
  }

  async updateAcceso(acceso: IAcceso) {
    let resp = await this.accesoService.updateAcceso(acceso)
    if (resp?.success) {
      // this.fetchData()
      this.closeModal();
    }
  }

  openModal(nuevo: boolean = true, acceso: IAcceso = emptyAcceso) {
    this.nuevoMenu.set(nuevo);   
    
    this.formKey.set(Date.now()); // esto obliga al componente hijo a resetear
    this.modal.set({
      titulo: acceso.accesoId ? 'Actualizar Acceso' : 'Crear Acceso',
      visible: true,
    });

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

  openDeleteModal(acceso: IAcceso) {
    this.accesoEdit.set(acceso);
    this.accesoEdit.update(acceso => {
      return {
        ...acceso,
        rolId: this.rolActual().rolId || '',
        rol: {
          ...this.rolActual(),
        },
      };
    });
    if (!this.modalDeleteInstance) {
      this.modalDeleteInstance = new Modal(this.modalDeleteElementRef.nativeElement);
    }
    this.modalDeleteInstance.show();
    // this.openModal();
  }

  onSave(acceso: IAcceso) {
    if (!acceso.accesoId) {
      this.createAcceso(acceso);
    } else {
      this.updateAcceso(acceso);
    }
  }

  rolActual(): IRol {
    return this.rolesList().find(rol => rol.rolId === this.rolFilter()) || emptyRol;
  }

  addMenu(menu: IMenu) {
    this.accesoEdit.update(acceso => {
      return {
        ...acceso,
        menuId: menu.menuId || '',
        menu: {
          ...menu,
        },
        rolId: this.rolActual().rolId || '',
        rol: {
          ...this.rolActual(),
        },
      };
    });

    this.openModal(true, this.accesoEdit());

  }

  changeRolSelected(rolId: string) {
    this.rolFilter.set(rolId)
    this.fetchData();
  }

}
