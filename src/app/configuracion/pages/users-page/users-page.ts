import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, inject, signal, ViewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Modal } from 'bootstrap';
import { IRol, IUser } from '../../../../interfaces/auth';
import { RolService } from '../../../../services/rol.service';
import { PaginationComponent } from '../../../shared/components/pagination/pagination';
import { UserService } from '../../../../services/user.service';
import { UpsertUserComponent } from "../../components/user/upsert-user/upsert-user.component";
import { IMetodo } from '../../../../interfaces/metodo';
import { MetodoService } from '../../../../services/metodo.service';

const emptyUser: IUser = {
  userId: '',
  fullName: 'Sin autenticar',
  userName: '',
  name1: '',
  name2: '',
  name3: '',
  lastName1: '',
  lastName2: '',
  lastName3: '',
  password: '',
  email: '',
  photoUrl: '',
  lastPasswordUpdate: new Date(),
  fingerprint: null,
  validateMAC: null,
  active: false,
  rolId: '',
  puestoId: null,
  puesto: null,
  metodoId: null,
  created_at: new Date(),
  rol: {
    rolId: '',
    name: 'Sin autenticar',
    active: false,
    guest: false,
    created_at: new Date()
  }
}


@Component({
  selector: 'app-users-page',
  imports: [RouterLink, PaginationComponent, UpsertUserComponent],
  templateUrl: './users-page.html',
  styleUrl: './users-page.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class UsersPageComponent {

  rolService = inject(RolService);
  metodoService = inject(MetodoService);
  userService = inject(UserService);
  rolesList = signal<IRol[]>([]);
  metodosList = signal<IMetodo[]>([]);
  usersList = signal<IUser[]>([]);
  metadata = signal({})// Cambia el tipo según tu modelo de datos
  nuevoUsuario = signal(true)
  usuarioEdit = signal<IUser>(emptyUser);

  pagination = signal<IPagination>({
    page: 1,
    pageSize: 10,
    totalItems: 0
  })
  isLoading = signal(false);
  formKey = signal(Date.now());

  @ViewChild('upsertUsuarioModal') modalElementRef!: ElementRef;
  private modalUpsertInstance!: bootstrap.Modal;

  @ViewChild('deleteUsuarioModal') modalDeleteElementRef!: ElementRef;
  private modalDeleteInstance!: bootstrap.Modal;

  modal = signal({
    titulo: 'Crear Usuario',
    visible: false,
  });

  buscador = signal('');
  rolFilter = signal('');
  metodoFilter = signal('');

  constructor() { }

  ngOnInit() {

    this.rolesList.set([]); // Limpiamos la lista antes de cargar nuevos datos
    this.loadFilters();
    this.fetchData();
  }

  ngAfterViewInit() {
    this.modalUpsertInstance = new Modal(this.modalElementRef.nativeElement);
    this.modalDeleteInstance = new Modal(this.modalDeleteElementRef.nativeElement);
  }

  async loadFilters() {
    let resp = await this.rolService.getRoles({ all: true });
    if (resp) {
      this.rolesList.set(resp.data.roles);
    }

    let metodosResp = await this.metodoService.getMetodos({all: true});
    if (metodosResp) {
      this.metodosList.set(metodosResp.data.metodos);
    }
  }

  async fetchData() {
    if (this.isLoading()) return;
    this.isLoading.set(true);
    let params: any = {
      page: this.pagination().page,
      limit: this.pagination().pageSize,
      search: this.buscador()
    }
    if (this.rolFilter()) {
      params.rolId = this.rolFilter();
    }
    if (this.metodoFilter()) {
      params.metodoId = this.metodoFilter();
    }
    let resp = await this.userService.getUsers(params);
    if (resp) {
      let { users, metadata } = resp.data;
      this.usersList.set(users);
      this.metadata.set(metadata);
      this.pagination.set({
        page: metadata.page,
        pageSize: metadata.limit,
        totalItems: metadata.total
      });
    }
    this.isLoading.set(false);
  }

  async deleteUsuario(user: IUser) {
    let resp = await this.userService.deleteUser(user);    
    if (resp?.success) {
      this.fetchData();
      if (this.modalDeleteInstance) {
        this.modalDeleteInstance.hide();
      }
    }
  }

  changeActive(user: IUser, checked: boolean) {
    user.active = checked;
    this.updateUser(user);
  }

  async createUser(user: IUser) {
    let resp = await this.userService.createUser(user)
    if (resp?.success) {
      this.fetchData()
      this.closeModal();
      this.usuarioEdit.set(emptyUser);
      this.nuevoUsuario.set(true)
    }
  }

  async updateUser(user: IUser) {
    let resp = await this.userService.updateUser(user)
    if (resp?.success) {
      this.fetchData()
      this.closeModal();
    }
  }

  onChangePage(newPagination: IPagination) {
    this.usersList.set([]); // Limpiamos la lista antes de cargar nuevos datos
    this.pagination.set(newPagination);
    this.fetchData();
  }

  openModal(nuevo: boolean = true, user: IUser = emptyUser) {
    this.nuevoUsuario.set(nuevo);
    if(this.nuevoUsuario()) {
      this.usuarioEdit.set(emptyUser)
    }else {
      this.usuarioEdit.set(user);
    }
    
    this.formKey.set(Date.now()); // esto obliga al componente hijo a resetear
    this.modal.set({
      titulo: user.userId ? 'Actualizar Usuario' : 'Crear Usuario',
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

  openDeleteModal(user: IUser) {
    this.usuarioEdit.set(user);
    if (!this.modalDeleteInstance) {
      this.modalDeleteInstance = new Modal(this.modalDeleteElementRef.nativeElement);
    }
    this.modalDeleteInstance.show();
    // this.openModal();
  }

  onSave(user: IUser) {
    if (!user.userId) {
      this.createUser(user);
    } else {
      this.updateUser(user);
    }
  }


}
