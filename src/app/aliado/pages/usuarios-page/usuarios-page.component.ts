import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, inject, signal, ViewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PaginationComponent } from '../../../shared/components/pagination/pagination';
import { IUsuarioAliado } from '../../../../interfaces/aliado/usuario-aliado';
import { EmpresaAliadoService } from '../../../../services/aliado/empresa.service';
import { Modal } from 'bootstrap';
import { IEmpresaAliado } from '../../../../interfaces/aliado/empresa';
import { UsuarioAliadoService } from '../../../../services/aliado/usuario-aliado.service';
import { UpsertUsuarioAliadoComponent } from '../../components/usuario/upsert-usuario/upsert-usuario.component';

const emptyUser: IUsuarioAliado = {
  userId: '',
  fullName: 'Sin autenticar',
  userName: '',
  email: '',
  active: false,
  created_at: new Date(),
  empresaId: ''
}

@Component({
  selector: 'app-usuarios-page',
  imports: [RouterLink, PaginationComponent, UpsertUsuarioAliadoComponent],
  templateUrl: './usuarios-page.component.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class UsuariosPageComponent {

  empresaService = inject(EmpresaAliadoService);
  usuarioService = inject(UsuarioAliadoService);
  empresasList = signal<IEmpresaAliado[]>([]);
  usuariosList = signal<IUsuarioAliado[]>([]);
  metadata = signal({})// Cambia el tipo según tu modelo de datos
  nuevoUsuario = signal(true)
  usuarioEdit = signal<IUsuarioAliado>(emptyUser);

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
  empresaFIlter = signal('');
  metodoFilter = signal('');

  constructor() { }

  ngOnInit() {

    this.empresasList.set([]); // Limpiamos la lista antes de cargar nuevos datos
    this.loadFilters();
    this.fetchData();
  }

  ngAfterViewInit() {
    this.modalUpsertInstance = new Modal(this.modalElementRef.nativeElement);
    this.modalDeleteInstance = new Modal(this.modalDeleteElementRef.nativeElement);
  }

  async loadFilters() {
    let resp = await this.empresaService.getEmpresas({ all: true });
    if (resp) {
      this.empresasList.set(resp.data.empresas);
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
    if (this.empresaFIlter()) {
      params.rolId = this.empresaFIlter();
    }
    if (this.metodoFilter()) {
      params.metodoId = this.metodoFilter();
    }
    let resp = await this.usuarioService.getUsuarios(params);
    if (resp) {
      let { users, metadata } = resp.data;
      this.usuariosList.set(users);
      this.metadata.set(metadata);
      this.pagination.set({
        page: metadata.page,
        pageSize: metadata.limit,
        totalItems: metadata.total
      });
    }
    this.isLoading.set(false);
  }

  async deleteUsuario(user: IUsuarioAliado) {
    let resp = await this.usuarioService.deleteUsuario(user);
    if (resp?.success) {
      this.fetchData();
      if (this.modalDeleteInstance) {
        this.modalDeleteInstance.hide();
      }
    }
  }

  changeActive(user: IUsuarioAliado, checked: boolean) {
    user.active = checked;
    this.updateUser(user);
  }

  async createUser(user: IUsuarioAliado) {
    let resp = await this.usuarioService.createUsuario(user)
    if (resp?.success) {
      this.fetchData()
      this.closeModal();
      this.usuarioEdit.set(emptyUser);
      this.nuevoUsuario.set(true)
    }
  }

  async updateUser(user: IUsuarioAliado) {
    let resp = await this.usuarioService.updateUsuario(user)
    if (resp?.success) {
      this.fetchData()
      this.closeModal();
    }
  }

  onChangePage(newPagination: IPagination) {
    this.usuariosList.set([]); // Limpiamos la lista antes de cargar nuevos datos
    this.pagination.set(newPagination);
    this.fetchData();
  }

  openModal(nuevo: boolean = true, user: IUsuarioAliado = emptyUser) {
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

  openDeleteModal(user: IUsuarioAliado) {
    this.usuarioEdit.set(user);
    if (!this.modalDeleteInstance) {
      this.modalDeleteInstance = new Modal(this.modalDeleteElementRef.nativeElement);
    }
    this.modalDeleteInstance.show();
    // this.openModal();
  }

  onSave(user: IUsuarioAliado) {
    if (!user.userId) {
      this.createUser(user);
    } else {
      this.updateUser(user);
    }
  }

 }
