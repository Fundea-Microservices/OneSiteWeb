import {
  AfterViewInit, ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA,
  ElementRef, inject, OnInit, signal, ViewChild,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Modal } from 'bootstrap';
import { PaginationComponent } from '../../../shared/components/pagination/pagination';
import { EncuestaService } from '../../../../services/encuesta/encuesta.service';
import { SeccionService } from '../../../../services/encuesta/seccion.service';
import { IEncuesta, ISeccion } from '../../../../interfaces/encuesta/encuesta';
import { UpsertSeccionComponent } from '../../components/upsert-seccion/upsert-seccion.component';

const emptySeccion = (idEncuesta: number): ISeccion => ({
  idEncuesta,
  titulo: '',
  orden: 1,
  esVisibleDefault: true,
});

@Component({
  selector: 'app-encuesta-detalle-page',
  imports: [RouterLink, PaginationComponent, UpsertSeccionComponent],
  templateUrl: './encuesta-detalle-page.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class EncuestaDetallePage implements OnInit, AfterViewInit {
  private route = inject(ActivatedRoute);
  private encuestaService = inject(EncuestaService);
  private seccionService = inject(SeccionService);

  idEncuesta = signal(0);
  encuesta = signal<IEncuesta | null>(null);
  seccionList = signal<ISeccion[]>([]);
  seccionEdit = signal<ISeccion>({ idEncuesta: 0, titulo: '', orden: 1 });
  nuevo = signal(true);
  formKey = signal(Date.now());
  isLoading = signal(false);
  buscador = signal('');
  pagination = signal<IPagination>({ page: 1, pageSize: 10, totalItems: 0 });
  modal = signal({ titulo: 'Nueva sección' });

  @ViewChild('upsertModal') modalRef!: ElementRef;
  private modalInstance!: Modal;
  @ViewChild('deleteModal') deleteModalRef!: ElementRef;
  private deleteModalInstance!: Modal;

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.idEncuesta.set(id);
    this.loadEncuesta(id);
    this.fetchData();
  }

  ngAfterViewInit() {
    this.modalInstance = new Modal(this.modalRef.nativeElement);
    this.deleteModalInstance = new Modal(this.deleteModalRef.nativeElement);
  }

  async loadEncuesta(id: number) {
    const resp = await this.encuestaService.getEncuestaById(id);
    if (resp?.data) this.encuesta.set(resp.data);
  }

  async fetchData() {
    if (this.isLoading()) return;
    this.isLoading.set(true);
    try {
      const resp = await this.seccionService.getSecciones({
        page: this.pagination().page,
        limit: this.pagination().pageSize,
        search: this.buscador(),
        idEncuesta: this.idEncuesta(),
      });
      if (resp?.data) {
        this.seccionList.set(resp.data ?? []);
        const m = resp.metadata;
        if (m) this.pagination.set({ page: m.page, pageSize: m.limit, totalItems: m.total });
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  openModal(esNuevo: boolean, seccion?: ISeccion) {
    this.nuevo.set(esNuevo);
    this.formKey.set(Date.now());
    this.seccionEdit.set(esNuevo ? emptySeccion(this.idEncuesta()) : { ...seccion! });
    this.modal.set({ titulo: esNuevo ? 'Nueva sección' : 'Editar sección' });
    this.modalInstance.show();
  }

  closeModal() { this.modalInstance.hide(); }

  openDeleteModal(seccion: ISeccion) {
    this.seccionEdit.set({ ...seccion });
    this.deleteModalInstance.show();
  }

  async upsertSeccion(seccion: ISeccion) {
    const resp = this.nuevo()
      ? await this.seccionService.createSeccion(seccion)
      : await this.seccionService.updateSeccion(seccion);
    if (resp?.success) { this.closeModal(); this.fetchData(); }
  }

  async deleteSeccion() {
    const resp = await this.seccionService.deleteSeccion(this.seccionEdit().idSeccion!);
    if (resp?.success) { this.deleteModalInstance.hide(); this.fetchData(); }
  }

  async toggleVisibleDefault(seccion: ISeccion, checked: boolean) {
    const updated = { ...seccion, esVisibleDefault: checked };
    const resp = await this.seccionService.updateSeccion(updated);
    if (resp?.success) {
      this.seccionList.update(list =>
        list.map(s => s.idSeccion === seccion.idSeccion ? { ...s, esVisibleDefault: checked } : s)
      );
    }
  }

  onChangePage(p: IPagination) { this.pagination.set(p); this.fetchData(); }

  // ── Drag & drop reordering ──────────────────────────────────────────────
  private dragIndex = -1;

  onDragStart(index: number) {
    this.dragIndex = index;
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
  }

  async onDrop(dropIndex: number) {
    if (this.dragIndex === -1 || this.dragIndex === dropIndex) return;

    const previous = this.seccionList();
    const list = [...previous];
    const [draggedItem] = list.splice(this.dragIndex, 1);
    list.splice(dropIndex, 0, draggedItem);
    this.dragIndex = -1;

    const offset = (this.pagination().page - 1) * this.pagination().pageSize;
    const reordered = list.map((item, i) => ({ ...item, orden: offset + i + 1 }));
    this.seccionList.set(reordered);

    const cambios = reordered.filter(item =>
      previous.find(p => p.idSeccion === item.idSeccion)?.orden !== item.orden
    );
    await Promise.all(cambios.map(item => this.seccionService.updateSeccion(item)));
  }

  onDragEnd() {
    this.dragIndex = -1;
  }
}
