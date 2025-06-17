import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, inject, signal, ViewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RolService } from '../../../../services/rol.service';
import { IRol } from '../../../../interfaces/auth';
import { UpsertRolComponent } from "../../components/rol/upsert-rol/upsert-rol";
import { PaginationComponent } from '../../../shared/components/pagination/pagination';
import { DatePipe } from '@angular/common';
import { Modal } from 'bootstrap'; // Bootstrap v5.x

@Component({
  selector: 'app-rol-page',
  imports: [RouterLink, UpsertRolComponent, PaginationComponent, DatePipe],
  templateUrl: './rol-page.html',
  styleUrl: './rol-page.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class RolPageComponent {

  rolService = inject(RolService);
  rolesList = signal<IRol[]>([]);
  metadata = signal({})// Cambia el tipo según tu modelo de datos
  nuevoRol = signal(true)
  rolEdit = signal<IRol>({
    rolId: '',
    name: '',
    active: true,
    guest: false,
  })

  pagination = signal<IPagination>({
    page: 1,
    pageSize: 10,
    totalItems: 0
  })

  @ViewChild('upsertRolModal') modalElementRef!: ElementRef;
  private modalUpsertInstance!: bootstrap.Modal;

  @ViewChild('deleteRolModal') modalDeleteElementRef!: ElementRef;
  private modalDeleteInstance!: bootstrap.Modal;

  modal = signal({
    titulo: 'Crear Rol',
    visible: false,
  });

  buscador = signal('');

  constructor() { }

  ngOnInit() {

    this.rolesList.set([]); // Limpiamos la lista antes de cargar nuevos datos
    this.fetchData();
  }

  ngAfterViewInit() {
    this.modalUpsertInstance = new Modal(this.modalElementRef.nativeElement);
    this.modalDeleteInstance = new Modal(this.modalDeleteElementRef.nativeElement);
  }

  async fetchData() {
    let resp = await this.rolService.getRoles({ page: this.pagination().page, limit: this.pagination().pageSize, search: this.buscador() });
    if (resp) {
      let { roles, metadata } = resp.data;
      this.rolesList.set(roles);
      this.metadata.set(metadata);
      this.pagination.set({
        page: metadata.page,
        pageSize: metadata.limit,
        totalItems: metadata.total
      });
    }
  }

  async deleteRol(rol: IRol) {
    let resp = await this.rolService.deleteRol(rol);
    if (resp?.success) {
      this.fetchData();
      if (this.modalDeleteInstance) {
        this.modalDeleteInstance.hide();
      }
    }
  }

  changeActive(rol: IRol, checked: boolean) {
    rol.active = checked;
    this.updateRol(rol);
  }

  async createRol(rol: IRol) {
    let resp = await this.rolService.createRol(rol)
    if (resp?.success) {
      this.fetchData()
      this.closeModal();
      this.rolEdit.set({
        rolId: '',
        name: '',
        active: true,
        guest: false,
      })
      this.nuevoRol.set(true); // Reseteamos el estado de nuevo rol
    }
  }

  async updateRol(rol: IRol) {
    let resp = await this.rolService.updateRol(rol)
    if (resp?.success) {
      this.fetchData()
      this.closeModal();
    }
  }

  onChangePage(newPagination: IPagination) {
    this.rolesList.set([]); // Limpiamos la lista antes de cargar nuevos datos
    this.pagination.set(newPagination);
    this.fetchData();
  }

  async upsertRol(rol: IRol) {
    if (!rol.rolId) {
      this.createRol(rol);
    } else {
      this.updateRol(rol);
    }
  }

  openModal(nuevo: boolean = true, rol: IRol = { rolId: '', name: '', active: true, guest: false, }) {
    this.nuevoRol.set(nuevo);

    if (this.nuevoRol()) {
      this.rolEdit.set({
        rolId: '',
        name: '',
        active: true,
        guest: false,
      })
      this.modal.set({
        titulo: 'Crear Rol',
        visible: true,
      });
    } else {
      this.rolEdit.set(rol);
      this.modal.set({
        titulo: 'Actualizar Rol',
        visible: true,
      });
    }
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

  openDeleteModal(rol: IRol) {
    this.rolEdit.set(rol);
    this.modal.set({
      titulo: rol.rolId ? 'Actualizar Rol' : 'Crear Rol',
      visible: true,
    });
    if (!this.modalDeleteInstance) {
      this.modalDeleteInstance = new Modal(this.modalDeleteElementRef.nativeElement);
    }
    this.modalDeleteInstance.show();
    // this.openModal();
  }



}
