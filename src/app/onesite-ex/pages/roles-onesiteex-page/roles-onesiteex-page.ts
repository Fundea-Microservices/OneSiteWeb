import {
  AfterViewInit, ChangeDetectionStrategy, Component, computed, CUSTOM_ELEMENTS_SCHEMA,
  ElementRef, inject, OnInit, signal, ViewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Modal } from 'bootstrap';
import { PaginationComponent } from '../../../shared/components/pagination/pagination';
import { UpsertRolExComponent } from '../../components/upsert-rol-ex/upsert-rol-ex.component';
import { RolExService } from '../../../../services/onesiteex-auth/rol-ex.service';
import { IRolEx, IRolExUpsert } from '../../../../interfaces/onesiteex-auth/onesiteex-auth';

@Component({
  selector: 'app-roles-onesiteex-page',
  imports: [RouterLink, PaginationComponent, UpsertRolExComponent],
  templateUrl: './roles-onesiteex-page.html',
  styleUrl: './roles-onesiteex-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export default class RolesOnesiteexPage implements OnInit, AfterViewInit {
  private rolService = inject(RolExService);

  rolList = signal<IRolEx[]>([]);

  rolEdit = signal<IRolEx | null>(null);
  nuevo = signal(true);
  formKey = signal(Date.now());
  isLoading = signal(false);
  modal = signal({ titulo: 'Nuevo rol' });

  buscador = signal('');
  pagination = signal<IPagination>({ page: 1, pageSize: 10, totalItems: 0 });

  hayFiltrosActivos = computed(() => !!this.buscador());

  // Módulos del rol en edición, para precargar el editor de chips.
  modulosEdit = computed(() => this.rolService.parsePermisos(this.rolEdit()).modulos ?? []);

  @ViewChild('upsertModal') modalRef!: ElementRef;
  private modalInstance!: Modal;
  @ViewChild('deleteModal') deleteModalRef!: ElementRef;
  private deleteModalInstance!: Modal;

  ngOnInit() {
    this.fetchData();
  }

  ngAfterViewInit() {
    this.modalInstance = new Modal(this.modalRef.nativeElement);
    this.deleteModalInstance = new Modal(this.deleteModalRef.nativeElement);
  }

  // ─── Datos ─────────────────────────────────────────────────────────────────

  async fetchData() {
    if (this.isLoading()) return;
    this.isLoading.set(true);
    try {
      const resp = await this.rolService.getRoles({
        page: this.pagination().page,
        limit: this.pagination().pageSize,
        search: this.buscador(),
      });
      if (resp?.data) {
        this.rolList.set(resp.data ?? []);
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

  modulosRol(rol: IRolEx) {
    return this.rolService.parsePermisos(rol).modulos ?? [];
  }

  // ─── CRUD ──────────────────────────────────────────────────────────────────

  openModal(esNuevo: boolean, rol?: IRolEx) {
    this.nuevo.set(esNuevo);
    this.formKey.set(Date.now());
    this.rolEdit.set(esNuevo ? null : { ...rol! });
    this.modal.set({ titulo: esNuevo ? 'Nuevo rol' : 'Editar rol' });
    this.modalInstance.show();
  }

  closeModal() { this.modalInstance.hide(); }

  openDeleteModal(rol: IRolEx) {
    this.rolEdit.set({ ...rol });
    this.deleteModalInstance.show();
  }

  async upsertRol(rol: IRolExUpsert) {
    const resp = this.nuevo()
      ? await this.rolService.createRol(rol)
      : await this.rolService.updateRol(rol);
    if (resp?.success) { this.closeModal(); this.fetchData(); }
  }

  async deleteRol() {
    const id = this.rolEdit()?.idRol;
    if (!id) return;
    const resp = await this.rolService.deleteRol(id);
    if (resp?.success) { this.deleteModalInstance.hide(); this.fetchData(); }
  }
}
