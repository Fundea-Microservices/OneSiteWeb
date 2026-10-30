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
import { PreguntaDinamicaService } from '../../../../services/scoring/pregunta-dinamica.service';
import { CatalogoVariableService } from '../../../../services/scoring/catalogo-variable.service';
import { ModeloScoringService } from '../../../../services/scoring/modelo-scoring.service';
import {
  ICatalogoVariable,
  IModeloScoring,
  IPreguntaDinamica,
} from '../../../../interfaces/scoring/scoring';
import { UpsertPreguntaDinamicaComponent } from '../../components/upsert-pregunta-dinamica/upsert-pregunta-dinamica.component';

/** Pantalla 3: Gestión de Preguntas. */
@Component({
  selector: 'app-gestion-preguntas-page',
  imports: [RouterLink, UpsertPreguntaDinamicaComponent],
  templateUrl: './gestion-preguntas-page.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class GestionPreguntasPage implements OnInit, AfterViewInit {
  private preguntaService = inject(PreguntaDinamicaService);
  private catalogoService = inject(CatalogoVariableService);
  private modeloService = inject(ModeloScoringService);

  scoringList = signal<IModeloScoring[]>([]);
  scoringId = signal<number | null>(null);
  buscador = signal('');

  preguntaList = signal<IPreguntaDinamica[]>([]);
  catalogos = signal<ICatalogoVariable[]>([]);
  preguntaEdit = signal<IPreguntaDinamica | null>(null);
  preguntaAccion = signal<IPreguntaDinamica | null>(null);
  nuevo = signal(true);
  formKey = signal(Date.now());
  isLoading = signal(false);
  modal = signal({ titulo: 'Nueva Pregunta' });

  @ViewChild('upsertModal') modalRef!: ElementRef;
  private modalInstance!: Modal;
  @ViewChild('deleteModal') deleteModalRef!: ElementRef;
  private deleteModalInstance!: Modal;

  async ngOnInit() {
    const resp = await this.modeloService.getModelos({
      estado: 'Activo',
      limite: 200,
    });
    this.scoringList.set(resp?.items ?? []);
  }

  ngAfterViewInit() {
    this.modalInstance = new Modal(this.modalRef.nativeElement);
    this.deleteModalInstance = new Modal(this.deleteModalRef.nativeElement);
  }

  async onScoringChange(valor: string) {
    this.scoringId.set(valor ? Number(valor) : null);
    this.preguntaList.set([]);
    this.catalogos.set([]);

    const scoringId = this.scoringId();
    if (!scoringId) return;

    // Los catálogos se cargan junto con las preguntas: el modal los necesita
    // para el desplegable de catálogo de respuestas.
    this.catalogos.set(
      await this.catalogoService.getCatalogos({ scoringId }),
    );
    await this.fetchData();
  }

  async fetchData() {
    const scoringId = this.scoringId();
    if (!scoringId || this.isLoading()) return;

    this.isLoading.set(true);
    try {
      this.preguntaList.set(
        await this.preguntaService.getPreguntas(scoringId, this.buscador()),
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  openModal(esNuevo: boolean, pregunta?: IPreguntaDinamica) {
    if (!this.scoringId()) return;

    this.nuevo.set(esNuevo);
    this.formKey.set(Date.now());
    this.preguntaEdit.set(esNuevo ? null : (pregunta ?? null));
    this.modal.set({
      titulo: esNuevo ? 'Nueva Pregunta' : 'Configurar Pregunta',
    });
    this.modalInstance.show();
  }

  closeModal() {
    this.modalInstance.hide();
  }

  async guardar(pregunta: IPreguntaDinamica) {
    const resp = this.nuevo()
      ? await this.preguntaService.createPregunta(pregunta)
      : await this.preguntaService.updatePregunta({
          ...pregunta,
          preguntaId: this.preguntaEdit()?.preguntaId,
        });

    if (resp) {
      this.closeModal();
      await this.fetchData();
    }
  }

  openDeleteModal(pregunta: IPreguntaDinamica) {
    this.preguntaAccion.set(pregunta);
    this.deleteModalInstance.show();
  }

  async confirmarEliminar() {
    const pregunta = this.preguntaAccion();
    if (!pregunta?.preguntaId) return;

    const resp = await this.preguntaService.deletePregunta(pregunta.preguntaId);
    this.deleteModalInstance.hide();
    if (resp) await this.fetchData();
  }

  // ── Reordenamiento ────────────────────────────────────────────────────────

  private arrastrando = signal<number | null>(null);

  onDragStart(indice: number) {
    this.arrastrando.set(indice);
  }

  onDragOver(evento: DragEvent) {
    evento.preventDefault();
  }

  async onDrop(indiceDestino: number) {
    const origen = this.arrastrando();
    this.arrastrando.set(null);
    if (origen === null || origen === indiceDestino) return;

    const lista = [...this.preguntaList()];
    const [movido] = lista.splice(origen, 1);
    lista.splice(indiceDestino, 0, movido);
    this.preguntaList.set(lista);

    const ids = lista
      .map((p) => p.preguntaId)
      .filter((id): id is number => !!id);

    const resp = await this.preguntaService.reordenar(ids);
    if (!resp) await this.fetchData();
  }

  // ── Utilidades de plantilla ───────────────────────────────────────────────

  nombreCatalogo(catalogoId: number | null | undefined): string {
    if (!catalogoId) return 'Ninguno';
    const catalogo = this.catalogos().find((c) => c.catalogoId === catalogoId);
    return catalogo?.codigoExterno || catalogo?.descripcionCatalogo || '—';
  }

  etiquetaTipo(tipo: string): string {
    const etiquetas: Record<string, string> = {
      Casilla: 'Casilla',
      Texto: 'Texto',
      Entero: 'Entero',
      Decimal: 'Decimal',
      BotonOpcion: 'Botón de opción',
      Desplegable: 'Lista desplegable',
    };
    return etiquetas[tipo] ?? tipo;
  }
}
