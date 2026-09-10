import {
  AfterViewInit, ChangeDetectionStrategy, Component, computed, CUSTOM_ELEMENTS_SCHEMA,
  ElementRef, inject, OnInit, signal, ViewChild,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Modal } from 'bootstrap';
import { PaginationComponent } from '../../../shared/components/pagination/pagination';
import { UpsertEmpresaExComponent } from '../../components/upsert-empresa-ex/upsert-empresa-ex.component';
import { EmpresaExService } from '../../../../services/onesiteex-auth/empresa-ex.service';
import {
  IEmpresaEx,
  IEmpresaExUpsert,
} from '../../../../interfaces/onesiteex-auth/onesiteex-auth';

type EstadoFiltro = '' | 'true' | 'false';

@Component({
  selector: 'app-empresas-onesiteex-page',
  imports: [RouterLink, DatePipe, PaginationComponent, UpsertEmpresaExComponent],
  templateUrl: './empresas-onesiteex-page.html',
  styleUrl: './empresas-onesiteex-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export default class EmpresasOnesiteexPage implements OnInit, AfterViewInit {
  private empresaService = inject(EmpresaExService);

  empresaList = signal<IEmpresaEx[]>([]);

  empresaEdit = signal<IEmpresaEx | null>(null);
  nuevo = signal(true);
  formKey = signal(Date.now());
  isLoading = signal(false);
  modal = signal({ titulo: 'Nueva empresa' });

  // Filtros
  buscador = signal('');
  filtroEstado = signal<EstadoFiltro>('');

  pagination = signal<IPagination>({ page: 1, pageSize: 10, totalItems: 0 });

  hayFiltrosActivos = computed(() => !!this.buscador() || this.filtroEstado() !== '');

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
      const estado = this.filtroEstado();
      const resp = await this.empresaService.getEmpresas({
        page: this.pagination().page,
        limit: this.pagination().pageSize,
        search: this.buscador(),
        estado: estado === '' ? undefined : estado === 'true',
      });
      if (resp?.data) {
        this.empresaList.set(resp.data ?? []);
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
    this.filtroEstado.set('');
    this.buscar();
  }

  onChangeEstado(value: string) {
    this.filtroEstado.set(value as EstadoFiltro);
    this.buscar();
  }

  onChangePage(p: IPagination) { this.pagination.set(p); this.fetchData(); }

  // ─── CRUD ──────────────────────────────────────────────────────────────────

  openModal(esNuevo: boolean, empresa?: IEmpresaEx) {
    this.nuevo.set(esNuevo);
    this.formKey.set(Date.now());
    this.empresaEdit.set(esNuevo ? null : { ...empresa! });
    this.modal.set({ titulo: esNuevo ? 'Nueva empresa' : 'Editar empresa' });
    this.modalInstance.show();
  }

  closeModal() { this.modalInstance.hide(); }

  openDeleteModal(empresa: IEmpresaEx) {
    this.empresaEdit.set({ ...empresa });
    this.deleteModalInstance.show();
  }

  async upsertEmpresa(empresa: IEmpresaExUpsert) {
    const resp = this.nuevo()
      ? await this.empresaService.createEmpresa(empresa)
      : await this.empresaService.updateEmpresa(empresa);
    if (resp?.success) { this.closeModal(); this.fetchData(); }
  }

  async deleteEmpresa() {
    const id = this.empresaEdit()?.idEmpresa;
    if (!id) return;
    const resp = await this.empresaService.deleteEmpresa(id);
    if (resp?.success) { this.deleteModalInstance.hide(); this.fetchData(); }
  }

  /** El switch de la tabla da de alta/baja vía PUT (la baja lógica también se puede revertir). */
  async toggleEstado(empresa: IEmpresaEx, checked: boolean) {
    const resp = await this.empresaService.updateEmpresa({ idEmpresa: empresa.idEmpresa, estado: checked });
    if (resp?.success) {
      this.empresaList.update(list =>
        list.map(e => e.idEmpresa === empresa.idEmpresa ? { ...e, estado: checked } : e)
      );
    } else {
      this.fetchData();
    }
  }
}
