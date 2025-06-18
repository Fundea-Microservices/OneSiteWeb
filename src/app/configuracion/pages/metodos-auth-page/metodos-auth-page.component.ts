import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, inject, signal, ViewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PaginationComponent } from '../../../shared/components/pagination/pagination';
import { DatePipe } from '@angular/common';
import { Modal } from 'bootstrap';
import { MetodoService } from '../../../../services/metodo.service';
import { IMetodo } from '../../../../interfaces/metodo';
import { UpsertMetodoComponent } from "../../components/metodo/upsert-metodo/upsert-metodo.component";
import { empty } from 'rxjs';

const emptyMetodo: IMetodo = {
    metodoId: '',
    name: '',
    code: '',
    description: '',
    verb: '',
    tokenLocation: null,
    isDefault: false,
    active: true,
  }

@Component({
  selector: 'app-metodos-auth-page',
  imports: [RouterLink, PaginationComponent, DatePipe, UpsertMetodoComponent],
  templateUrl: './metodos-auth-page.component.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class MetodosAuthPageComponent {
  metodoService = inject(MetodoService);
  metodosList = signal<IMetodo[]>([]);
  metadata = signal({})// Cambia el tipo según tu modelo de datos
  nuevoMetodo = signal(true)
  metodoEdit = signal<IMetodo>(emptyMetodo)

  pagination = signal<IPagination>({
    page: 1,
    pageSize: 10,
    totalItems: 0
  })
  isLoading = signal(false);
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

    this.metodosList.set([]); // Limpiamos la lista antes de cargar nuevos datos
    this.fetchData();
  }

  ngAfterViewInit() {
    this.modalUpsertInstance = new Modal(this.modalElementRef.nativeElement);
    this.modalDeleteInstance = new Modal(this.modalDeleteElementRef.nativeElement);
  }

  async fetchData() {
    if (this.isLoading()) return;
    this.isLoading.set(true);
    let resp = await this.metodoService.getMetodos({ page: this.pagination().page, limit: this.pagination().pageSize, search: this.buscador() });
    if (resp) {
      let { metodos, metadata } = resp.data;
      this.metodosList.set(metodos);
      this.metadata.set(metadata);
      this.pagination.set({
        page: metadata.page,
        pageSize: metadata.limit,
        totalItems: metadata.total
      });
    }
    this.isLoading.set(false);
  }

  async deleteMetodo(metodo: IMetodo) {
    let resp = await this.metodoService.deleteMetodo(metodo);
    if (resp?.success) {
      this.fetchData();
      if (this.modalDeleteInstance) {
        this.modalDeleteInstance.hide();
      }
    }
  }

  changeActive(metodo: IMetodo, checked: boolean) {
    metodo.active = checked;
    this.updateMetodo(metodo);
  }

  async createMetodo(metodo: IMetodo) {
    let resp = await this.metodoService.createMetodo(metodo)
    if (resp?.success) {
      this.fetchData()
      this.closeModal();
      this.metodoEdit.set(emptyMetodo);
      this.nuevoMetodo.set(true); // Reseteamos el estado de nuevo método
    }
  }

  async updateMetodo(metodo: IMetodo) {
    let resp = await this.metodoService.updateMetodo(metodo)
    if (resp?.success) {
      this.fetchData()
      this.closeModal();
    }
  }

  onChangePage(newPagination: IPagination) {
    this.metodosList.set([]); // Limpiamos la lista antes de cargar nuevos datos
    this.pagination.set(newPagination);
    this.fetchData();
  }

  async upsertMetodo(metodo: IMetodo) {
    if (!metodo.metodoId) {
      this.createMetodo(metodo);
    } else {
      this.updateMetodo(metodo);
    }
  }

  openModal(nuevo: boolean = true, metodo: IMetodo = emptyMetodo) {
    this.nuevoMetodo.set(nuevo);

    if (this.nuevoMetodo()) {
      this.metodoEdit.set(emptyMetodo)
    } else {
      this.metodoEdit.set(metodo);
    }
    this.formKey.set(Date.now()); // esto obliga al componente hijo a resetear
    this.modal.set({ titulo: nuevo ? 'Crear Método' : 'Actualizar Método', visible: true });
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

  openDeleteModal(metodo: IMetodo) {
    this.metodoEdit.set(metodo);
    this.modal.set({
      titulo: metodo.metodoId ? 'Actualizar Método' : 'Crear Método',
      visible: true,
    });
    if (!this.modalDeleteInstance) {
      this.modalDeleteInstance = new Modal(this.modalDeleteElementRef.nativeElement);
    }
    this.modalDeleteInstance.show();
  }
 }
