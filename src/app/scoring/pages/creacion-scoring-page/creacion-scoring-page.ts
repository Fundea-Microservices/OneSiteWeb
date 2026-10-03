import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  inject,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Modal } from 'bootstrap';
import { SlicePipe } from '@angular/common';
import { PaginationComponent } from '../../../shared/components/pagination/pagination';
import { ModeloScoringService } from '../../../../services/scoring/modelo-scoring.service';
import {
  IModeloScoring,
  ITipoScoring,
} from '../../../../interfaces/scoring/scoring';
import { UpsertModeloScoringComponent } from '../../components/upsert-modelo-scoring/upsert-modelo-scoring.component';

/** Pantalla 1: Creación de Scoring. */
@Component({
  selector: 'app-creacion-scoring-page',
  imports: [SlicePipe, RouterLink, PaginationComponent, UpsertModeloScoringComponent],
  templateUrl: './creacion-scoring-page.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class CreacionScoringPage implements OnInit, AfterViewInit {
  private modeloService = inject(ModeloScoringService);

  modeloList = signal<IModeloScoring[]>([]);
  tipos = signal<ITipoScoring[]>([]);
  modeloEdit = signal<IModeloScoring | null>(null);
  nuevo = signal(true);
  formKey = signal(Date.now());
  isLoading = signal(false);
  buscador = signal('');
  filtroEstado = signal('');
  pagination = signal<IPagination>({ page: 1, pageSize: 10, totalItems: 0 });
  modal = signal({ titulo: 'Nuevo Modelo de Scoring' });

  /** Modelo sobre el que se confirma inactivación o versionado. */
  modeloAccion = signal<IModeloScoring | null>(null);

  @ViewChild('upsertModal') modalRef!: ElementRef;
  private modalInstance!: Modal;
  @ViewChild('estadoModal') estadoModalRef!: ElementRef;
  private estadoModalInstance!: Modal;
  @ViewChild('versionModal') versionModalRef!: ElementRef;
  private versionModalInstance!: Modal;

  async ngOnInit() {
    this.tipos.set(await this.modeloService.getTipos());
    await this.fetchData();
  }

  ngAfterViewInit() {
    this.modalInstance = new Modal(this.modalRef.nativeElement);
    this.estadoModalInstance = new Modal(this.estadoModalRef.nativeElement);
    this.versionModalInstance = new Modal(this.versionModalRef.nativeElement);
  }

  async fetchData() {
    if (this.isLoading()) return;
    this.isLoading.set(true);
    try {
      const resp = await this.modeloService.getModelos({
        busqueda: this.buscador(),
        estado: this.filtroEstado(),
        pagina: this.pagination().page,
        limite: this.pagination().pageSize,
      });

      if (resp) {
        this.modeloList.set(resp.items ?? []);
        this.pagination.set({
          page: resp.pagina,
          pageSize: resp.limite,
          totalItems: resp.total,
        });
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  changePage(pagination: IPagination) {
    this.pagination.set(pagination);
    this.fetchData();
  }

  // ── Alta y edición ────────────────────────────────────────────────────────

  async openModal(esNuevo: boolean, modelo?: IModeloScoring) {
    this.nuevo.set(esNuevo);
    this.formKey.set(Date.now());

    // La tabla no trae los rangos: se piden al abrir para editar, si no el
    // formulario los pintaría vacíos y al guardar los borraría.
    const detalle =
      !esNuevo && modelo?.scoringId
        ? await this.modeloService.getModeloById(modelo.scoringId)
        : null;

    this.modeloEdit.set(detalle ?? (esNuevo ? null : (modelo ?? null)));
    this.modal.set({
      titulo: esNuevo ? 'Nuevo Modelo de Scoring' : 'Editar Modelo de Scoring',
    });
    this.modalInstance.show();
  }

  closeModal() {
    this.modalInstance.hide();
  }

  async guardar(modelo: IModeloScoring) {
    const resp = this.nuevo()
      ? await this.modeloService.createModelo(modelo)
      : await this.modeloService.updateModelo({
          ...modelo,
          scoringId: this.modeloEdit()?.scoringId,
        });

    if (resp) {
      this.closeModal();
      await this.fetchData();
    }
  }

  // ── Cambio de estado (borrado lógico) ─────────────────────────────────────

  openEstadoModal(modelo: IModeloScoring) {
    this.modeloAccion.set(modelo);
    this.estadoModalInstance.show();
  }

  async confirmarCambioEstado() {
    const modelo = this.modeloAccion();
    if (!modelo?.scoringId) return;

    const nuevoEstado = modelo.estado === 'Activo' ? 'Inactivo' : 'Activo';
    const resp = await this.modeloService.cambiarEstado(
      modelo.scoringId,
      nuevoEstado,
    );

    this.estadoModalInstance.hide();
    if (resp) await this.fetchData();
  }

  // ── Versionado ────────────────────────────────────────────────────────────

  openVersionModal(modelo: IModeloScoring) {
    this.modeloAccion.set(modelo);
    this.versionModalInstance.show();
  }

  async confirmarVersionar() {
    const modelo = this.modeloAccion();
    if (!modelo?.scoringId) return;

    const resp = await this.modeloService.versionarModelo(modelo.scoringId);
    this.versionModalInstance.hide();
    if (resp) await this.fetchData();
  }

  // ── Reordenamiento por arrastre ───────────────────────────────────────────

  private arrastrando = signal<number | null>(null);

  onDragStart(indice: number) {
    this.arrastrando.set(indice);
  }

  onDragOver(evento: DragEvent) {
    evento.preventDefault();
  }

  /**
   * Reacomoda en memoria y manda el orden final completo. El backend numera
   * 1..N por posición, así que no hay que calcular el valor de cada fila.
   */
  async onDrop(indiceDestino: number) {
    const origen = this.arrastrando();
    this.arrastrando.set(null);

    if (origen === null || origen === indiceDestino) return;

    const lista = [...this.modeloList()];
    const [movido] = lista.splice(origen, 1);
    lista.splice(indiceDestino, 0, movido);
    this.modeloList.set(lista);

    const ids = lista
      .map((modelo) => modelo.scoringId)
      .filter((id): id is number => !!id);

    const resp = await this.modeloService.reordenar(ids);
    if (!resp) await this.fetchData();
  }

  // ── Utilidades de plantilla ───────────────────────────────────────────────

  nombreTipo(idTipoScoring: number): string {
    return (
      this.tipos().find((t) => t.idTipoScoring === idTipoScoring)
        ?.descripcion ?? '—'
    );
  }

  ejecutaSP(idTipoScoring: number): boolean {
    return (
      this.tipos().find((t) => t.idTipoScoring === idTipoScoring)
        ?.ejecutaProcedimiento ?? false
    );
  }
}
