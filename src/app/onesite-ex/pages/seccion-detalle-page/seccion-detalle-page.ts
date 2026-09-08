import {
  AfterViewInit, ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA,
  ElementRef, inject, OnInit, signal, ViewChild,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Modal } from 'bootstrap';
import { PaginationComponent } from '../../../shared/components/pagination/pagination';
import { SeccionService } from '../../../../services/encuesta/seccion.service';
import { PreguntaService } from '../../../../services/encuesta/pregunta.service';
import { ReglaService } from '../../../../services/encuesta/regla.service';
import { ISeccion, IPregunta, IRegla } from '../../../../interfaces/encuesta/encuesta';
import { UpsertPreguntaComponent } from '../../components/upsert-pregunta/upsert-pregunta.component';
import { UpsertReglaComponent } from '../../components/upsert-regla/upsert-regla.component';

const emptyPregunta = (idSeccion: number): IPregunta => ({
  idSeccion,
  etiqueta: '',
  tipoDato: 'TEXT',
  orden: 1,
  esEditable: true,
  esVisibleDefault: true,
  codigo: 0
});

const emptyRegla = (idPregunta: number): IRegla => ({
  idPregunta,
  sintaxisCalculo: null,
  reglaValidacion: null,
  reglaVisibilidad: null,
});

@Component({
  selector: 'app-seccion-detalle-page',
  imports: [RouterLink, PaginationComponent, UpsertPreguntaComponent, UpsertReglaComponent],
  templateUrl: './seccion-detalle-page.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class SeccionDetallePage implements OnInit, AfterViewInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private seccionService = inject(SeccionService);
  private preguntaService = inject(PreguntaService);
  private reglaService = inject(ReglaService);

  idSeccion = signal(0);
  seccion = signal<ISeccion | null>(null);
  preguntaList = signal<IPregunta[]>([]);
  preguntaEdit = signal<IPregunta>({ idSeccion: 0, etiqueta: '', tipoDato: 'TEXT', orden: 1, codigo: 0 });
  reglaEdit = signal<IRegla>({ idPregunta: 0 });
  nuevo = signal(true);
  formKey = signal(Date.now());
  reglaFormKey = signal(Date.now());
  isLoading = signal(false);
  buscador = signal('');
  pagination = signal<IPagination>({ page: 1, pageSize: 10, totalItems: 0 });
  modal = signal({ titulo: 'Nueva pregunta' });

  @ViewChild('upsertModal') modalRef!: ElementRef;
  private modalInstance!: Modal;
  @ViewChild('deleteModal') deleteModalRef!: ElementRef;
  private deleteModalInstance!: Modal;
  @ViewChild('reglaModal') reglaModalRef!: ElementRef;
  private reglaModalInstance!: Modal;

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.idSeccion.set(id);
    this.loadSeccion(id);
    this.fetchData();
  }

  ngAfterViewInit() {
    this.modalInstance = new Modal(this.modalRef.nativeElement);
    this.deleteModalInstance = new Modal(this.deleteModalRef.nativeElement);
    this.reglaModalInstance = new Modal(this.reglaModalRef.nativeElement);
  }

  async loadSeccion(id: number) {
    const resp = await this.seccionService.getSeccionById(id);
    if (resp?.data) this.seccion.set(resp.data);
  }

  async fetchData() {
    if (this.isLoading()) return;
    this.isLoading.set(true);
    try {
      const resp = await this.preguntaService.getPreguntas({
        page: this.pagination().page,
        limit: this.pagination().pageSize,
        search: this.buscador(),
        idSeccion: this.idSeccion(),
        sinPreguntasMatriz: true,
      });
      if (resp?.data) {
        this.preguntaList.set(resp.data ?? []);
        const m = resp.metadata;
        if (m) this.pagination.set({ page: m.page, pageSize: m.limit, totalItems: m.total });
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  openModal(esNuevo: boolean, pregunta?: IPregunta) {
    this.nuevo.set(esNuevo);
    this.formKey.set(Date.now());
    this.preguntaEdit.set(esNuevo ? emptyPregunta(this.idSeccion()) : { ...pregunta! });
    this.modal.set({ titulo: esNuevo ? 'Nueva pregunta' : 'Editar pregunta' });
    this.modalInstance.show();
  }

  closeModal() { this.modalInstance.hide(); }

  openDeleteModal(pregunta: IPregunta) {
    this.preguntaEdit.set({ ...pregunta });
    this.deleteModalInstance.show();
  }

  async openReglaModal(pregunta: IPregunta) {
    this.reglaFormKey.set(Date.now());
    const resp = await this.reglaService.getReglaByPregunta(pregunta.idPregunta!);
    this.reglaEdit.set(resp?.data ?? emptyRegla(pregunta.idPregunta!));
    this.reglaModalInstance.show();
  }

  closeReglaModal() { this.reglaModalInstance.hide(); }

  async upsertPregunta(pregunta: IPregunta) {
    const resp = this.nuevo()
      ? await this.preguntaService.createPregunta(pregunta)
      : await this.preguntaService.updatePregunta(pregunta);
    if (resp?.success) { this.closeModal(); this.fetchData(); }
  }

  async deletePregunta() {
    const resp = await this.preguntaService.deletePregunta(this.preguntaEdit().idPregunta!);
    if (resp?.success) { this.deleteModalInstance.hide(); this.fetchData(); }
  }

  async toggleBoolPregunta(pregunta: IPregunta, field: 'esEditable' | 'esVisibleDefault', checked: boolean) {
    const updated = { ...pregunta, [field]: checked };
    const resp = await this.preguntaService.updatePregunta(updated);
    if (resp?.success) {
      this.preguntaList.update(list =>
        list.map(p => p.idPregunta === pregunta.idPregunta ? { ...p, [field]: checked } : p)
      );
    }
  }

  async saveRegla(regla: IRegla) {
    const existe = !!(this.reglaEdit().sintaxisCalculo || this.reglaEdit().reglaValidacion || this.reglaEdit().reglaVisibilidad);
    const resp = existe
      ? await this.reglaService.updateRegla(regla)
      : await this.reglaService.createRegla(regla);
    if (resp?.success) { this.closeReglaModal(); }
  }

  onChangePage(p: IPagination) { this.pagination.set(p); this.fetchData(); }

  goToMatriz(pregunta: IPregunta) {
    this.router.navigate(['/onesiteex/encuestas/matriz', pregunta.idPregunta]);
  }

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

    const previous = this.preguntaList();
    const list = [...previous];
    const [draggedItem] = list.splice(this.dragIndex, 1);
    list.splice(dropIndex, 0, draggedItem);
    this.dragIndex = -1;

    const reordered = list.map((item, i) => ({ ...item, orden: i + 1 }));
    this.preguntaList.set(reordered);

    const cambios = reordered.filter(item =>
      previous.find(p => p.idPregunta === item.idPregunta)?.orden !== item.orden
    );
    await Promise.all(cambios.map(item => this.preguntaService.updatePregunta(item)));
  }

  onDragEnd() {
    this.dragIndex = -1;
  }
}
