import {
  AfterViewInit, ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA,
  ElementRef, inject, OnInit, signal, ViewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Modal } from 'bootstrap';
import { PaginationComponent } from '../../../shared/components/pagination/pagination';
import { EncuestaService } from '../../../../services/encuesta/encuesta.service';
import { IEncuesta } from '../../../../interfaces/encuesta/encuesta';
import { UpsertEncuestaComponent } from '../../components/upsert-encuesta/upsert-encuesta.component';

const emptyEncuesta: IEncuesta = { nombre: '', estado: true };

@Component({
  selector: 'app-encuesta-page',
  imports: [RouterLink, PaginationComponent, UpsertEncuestaComponent],
  templateUrl: './encuesta-page.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class EncuestaPage implements OnInit, AfterViewInit {
  private encuestaService = inject(EncuestaService);

  encuestaList = signal<IEncuesta[]>([]);
  encuestaEdit = signal<IEncuesta>(emptyEncuesta);
  nuevo = signal(true);
  formKey = signal(Date.now());
  isLoading = signal(false);
  buscador = signal('');
  pagination = signal<IPagination>({ page: 1, pageSize: 10, totalItems: 0 });
  modal = signal({ titulo: 'Nueva encuesta' });

  @ViewChild('upsertModal') modalRef!: ElementRef;
  private modalInstance!: Modal;
  @ViewChild('deleteModal') deleteModalRef!: ElementRef;
  private deleteModalInstance!: Modal;

  ngOnInit() { this.fetchData(); }

  ngAfterViewInit() {
    this.modalInstance = new Modal(this.modalRef.nativeElement);
    this.deleteModalInstance = new Modal(this.deleteModalRef.nativeElement);
  }

  async fetchData() {
    if (this.isLoading()) return;
    this.isLoading.set(true);
    try {
      const resp = await this.encuestaService.getEncuestas({
        page: this.pagination().page,
        limit: this.pagination().pageSize,
        search: this.buscador(),
      });
      if (resp?.data) {
        this.encuestaList.set(resp.data ?? []);
        const m = resp.metadata;
        if (m) this.pagination.set({ page: m.page, pageSize: m.limit, totalItems: m.total });
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  openModal(esNuevo: boolean, encuesta?: IEncuesta) {
    this.nuevo.set(esNuevo);
    this.formKey.set(Date.now());
    this.encuestaEdit.set(esNuevo ? { ...emptyEncuesta } : { ...encuesta! });
    this.modal.set({ titulo: esNuevo ? 'Nueva encuesta' : 'Editar encuesta' });
    this.modalInstance.show();
  }

  closeModal() { this.modalInstance.hide(); }

  openDeleteModal(encuesta: IEncuesta) {
    this.encuestaEdit.set({ ...encuesta });
    this.deleteModalInstance.show();
  }

  async upsertEncuesta(encuesta: IEncuesta) {
    const resp = this.nuevo()
      ? await this.encuestaService.createEncuesta(encuesta)
      : await this.encuestaService.updateEncuesta(encuesta);
    if (resp?.success) { this.closeModal(); this.fetchData(); }
  }

  async deleteEncuesta() {
    const resp = await this.encuestaService.deleteEncuesta(this.encuestaEdit().idEncuesta!);
    if (resp?.success) { this.deleteModalInstance.hide(); this.fetchData(); }
  }

  async toggleEstado(encuesta: IEncuesta, checked: boolean) {
    const updated = { ...encuesta, estado: checked };
    const resp = await this.encuestaService.updateEncuesta(updated);
    if (resp?.success) {
      this.encuestaList.update(list =>
        list.map(e => e.idEncuesta === encuesta.idEncuesta ? { ...e, estado: checked } : e)
      );
    }
  }

  onChangePage(p: IPagination) { this.pagination.set(p); this.fetchData(); }
}
