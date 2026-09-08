import {
  AfterViewInit, ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA,
  ElementRef, inject, OnInit, signal, ViewChild,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Modal } from 'bootstrap';
import { PaginationComponent } from '../../../shared/components/pagination/pagination';
import { PreguntaService } from '../../../../services/encuesta/pregunta.service';
import { IPregunta } from '../../../../interfaces/encuesta/encuesta';
import { UpsertPreguntaComponent } from '../../components/upsert-pregunta/upsert-pregunta.component';
import { UpsertReglaComponent } from '../../components/upsert-regla/upsert-regla.component';
import { ReglaService } from '../../../../services/encuesta/regla.service';
import { IRegla } from '../../../../interfaces/encuesta/encuesta';

const emptyRegla = (idPregunta: number): IRegla => ({
  idPregunta,
  sintaxisCalculo: null,
  reglaValidacion: null,
  reglaVisibilidad: null,
});

@Component({
  selector: 'app-matriz-detalle-page',
  imports: [RouterLink, PaginationComponent, UpsertPreguntaComponent, UpsertReglaComponent],
  templateUrl: './matriz-detalle-page.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class MatrizDetallePage implements OnInit, AfterViewInit {
  private route = inject(ActivatedRoute);
  private preguntaService = inject(PreguntaService);
  private reglaService = inject(ReglaService);

  /** idPregunta of the MATRIZ parent question */
  idPreguntaMatriz = signal(0);

  /** The MATRIZ parent question (loaded to get codigo and idSeccion) */
  matrizPregunta = signal<IPregunta | null>(null);

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
    this.idPreguntaMatriz.set(id);
    this.loadMatrizPregunta(id);
  }

  ngAfterViewInit() {
    this.modalInstance = new Modal(this.modalRef.nativeElement);
    this.deleteModalInstance = new Modal(this.deleteModalRef.nativeElement);
    this.reglaModalInstance = new Modal(this.reglaModalRef.nativeElement);
  }

  async loadMatrizPregunta(idPregunta: number) {
    const resp = await this.preguntaService.getPreguntaById(idPregunta);
    if (resp?.data) {
      this.matrizPregunta.set(resp.data);
      this.fetchData();
    }
  }

  async fetchData() {
    const matriz = this.matrizPregunta();
    if (!matriz || this.isLoading()) return;
    this.isLoading.set(true);
    try {
      const resp = await this.preguntaService.getPreguntas({
        page: this.pagination().page,
        limit: this.pagination().pageSize,
        search: this.buscador(),
        idMatrizPadre: matriz.idPregunta,
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

  private emptyPregunta(): IPregunta {
    const matriz = this.matrizPregunta()!;
    return {
      idSeccion: matriz.idSeccion,
      etiqueta: '',
      tipoDato: 'TEXT',
      orden: 1,
      codigo: 0,
      idMatrizPadre: matriz.idPregunta,
    };
  }

  openModal(esNuevo: boolean, pregunta?: IPregunta) {
    this.nuevo.set(esNuevo);
    this.formKey.set(Date.now());
    this.preguntaEdit.set(esNuevo ? this.emptyPregunta() : { ...pregunta! });
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
    // Always ensure idMatrizPadre is set on save
    const withMatriz: IPregunta = { ...pregunta, idMatrizPadre: this.matrizPregunta()!.idPregunta };
    const resp = this.nuevo()
      ? await this.preguntaService.createPregunta(withMatriz)
      : await this.preguntaService.updatePregunta(withMatriz);
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

  // ── Drag & drop reordering ──────────────────────────────────────────────
  private dragIndex = -1;

  onDragStart(index: number) { this.dragIndex = index; }
  onDragOver(event: DragEvent) { event.preventDefault(); }

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

  onDragEnd() { this.dragIndex = -1; }

  onChangePage(p: IPagination) { this.pagination.set(p); this.fetchData(); }
}
