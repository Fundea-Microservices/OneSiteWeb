import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  inject,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Modal } from 'bootstrap';
import { CatalogoVariableService } from '../../../../services/scoring/catalogo-variable.service';
import { ModeloScoringService } from '../../../../services/scoring/modelo-scoring.service';
import {
  ICatalogoVariable,
  IModeloScoring,
  IOpcionVariable,
} from '../../../../interfaces/scoring/scoring';
import { UpsertCatalogoVariableComponent } from '../../components/upsert-catalogo-variable/upsert-catalogo-variable.component';
import { UpsertOpcionVariableComponent } from '../../components/upsert-opcion-variable/upsert-opcion-variable.component';

/** Pantalla 2: Catálogo de Variables. */
@Component({
  selector: 'app-catalogo-variables-page',
  imports: [
    RouterLink,
    UpsertCatalogoVariableComponent,
    UpsertOpcionVariableComponent,
  ],
  templateUrl: './catalogo-variables-page.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class CatalogoVariablesPage implements OnInit, AfterViewInit {
  private catalogoService = inject(CatalogoVariableService);
  private modeloService = inject(ModeloScoringService);

  // ── Cabecera ──────────────────────────────────────────────────────────────

  scoringList = signal<IModeloScoring[]>([]);
  /** null hasta que se elige un scoring: la pantalla no lista nada sin él. */
  scoringId = signal<number | null>(null);
  buscador = signal('');

  /** Nombre del scoring elegido, para el encabezado del modal de catálogo. */
  nombreScoringSeleccionado = computed(
    () =>
      this.scoringList().find((s) => s.scoringId === this.scoringId())
        ?.nombreScoring ?? '',
  );

  // ── Tabla 1: catálogos ────────────────────────────────────────────────────

  catalogoList = signal<ICatalogoVariable[]>([]);

  /** Sin filtrar por búsqueda: alimenta el select de Opción Padre, que
      ofrece las opciones de los otros catálogos del scoring. */
  catalogosPadre = signal<ICatalogoVariable[]>([]);
  catalogoEdit = signal<ICatalogoVariable | null>(null);
  nuevoCatalogo = signal(true);
  formKeyCatalogo = signal(Date.now());
  isLoading = signal(false);
  modalCatalogo = signal({ titulo: 'Nuevo Catálogo de Variable' });
  catalogoAccion = signal<ICatalogoVariable | null>(null);

  // ── Tabla 2: opciones ─────────────────────────────────────────────────────

  catalogoSeleccionado = signal<ICatalogoVariable | null>(null);
  opcionList = signal<IOpcionVariable[]>([]);

  /** Filtro de la tabla por la opción del catálogo padre. 0 = todas. */
  filtroPadre = signal<number>(0);

  /** El catálogo del que depende el que se está viendo. */
  catalogoPadre = computed(() => {
    const padreId = this.catalogoSeleccionado()?.catalogoPadreId;
    if (!padreId) return undefined;
    return this.catalogosPadre().find((c) => c.catalogoId === padreId);
  });

  /** Nombre de cada opción padre, para la columna Padre. */
  nombresPadre = computed(() => {
    const mapa = new Map<number, string>();
    for (const opcion of this.catalogoPadre()?.opciones ?? []) {
      if (opcion.opcionId) mapa.set(opcion.opcionId, opcion.descripcionOpcion);
    }
    return mapa;
  });

  opcionesVisibles = computed(() => {
    const padre = this.filtroPadre();
    const todas = this.opcionList();
    return padre ? todas.filter((o) => o.opcionPadreId === padre) : todas;
  });

  nombrePadreDe(opcion: IOpcionVariable): string {
    if (!opcion.opcionPadreId) return '—';
    return this.nombresPadre().get(opcion.opcionPadreId) ?? '—';
  }
  opcionEdit = signal<IOpcionVariable | null>(null);
  nuevaOpcion = signal(true);
  formKeyOpcion = signal(Date.now());
  isLoadingOpciones = signal(false);
  opcionAccion = signal<IOpcionVariable | null>(null);

  /**
   * El modal de opciones alterna entre la lista y el formulario en vez de
   * abrir un segundo modal encima: Bootstrap no maneja bien los modales
   * anidados (el backdrop del segundo tapa al primero y al cerrar uno se
   * pierde el scroll del otro).
   */
  modoOpcion = signal<'lista' | 'form'>('lista');

  @ViewChild('catalogoModal') catalogoModalRef!: ElementRef;
  private catalogoModalInstance!: Modal;
  @ViewChild('opcionesModal') opcionesModalRef!: ElementRef;
  private opcionesModalInstance!: Modal;
  @ViewChild('inactivarModal') inactivarModalRef!: ElementRef;
  private inactivarModalInstance!: Modal;

  async ngOnInit() {
    const resp = await this.modeloService.getModelos({
      estado: 'Activo',
      limite: 200,
    });
    this.scoringList.set(resp?.items ?? []);
  }

  ngAfterViewInit() {
    this.catalogoModalInstance = new Modal(this.catalogoModalRef.nativeElement);
    this.opcionesModalInstance = new Modal(this.opcionesModalRef.nativeElement);
    this.inactivarModalInstance = new Modal(
      this.inactivarModalRef.nativeElement,
    );
  }

  // ── Catálogos ─────────────────────────────────────────────────────────────

  async onScoringChange(valor: string) {
    this.scoringId.set(valor ? Number(valor) : null);
    this.catalogoList.set([]);
    await this.fetchCatalogos();
  }

  async fetchCatalogos() {
    const scoringId = this.scoringId();
    if (!scoringId || this.isLoading()) return;

    this.isLoading.set(true);
    try {
      const lista = await this.catalogoService.getCatalogos({
        scoringId,
        busqueda: this.buscador(),
      });
      this.catalogoList.set(lista);

      // Con búsqueda activa la lista no sirve de padres: faltarían los
      // catálogos que el filtro dejó fuera.
      this.catalogosPadre.set(
        this.buscador().trim()
          ? await this.catalogoService.getCatalogos({ scoringId })
          : lista,
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  openCatalogoModal(esNuevo: boolean, catalogo?: ICatalogoVariable) {
    if (!this.scoringId()) return;

    this.nuevoCatalogo.set(esNuevo);
    this.formKeyCatalogo.set(Date.now());
    this.catalogoEdit.set(esNuevo ? null : (catalogo ?? null));
    this.modalCatalogo.set({
      titulo: esNuevo ? 'Nuevo Catálogo de Variable' : 'Editar Catálogo',
    });
    this.catalogoModalInstance.show();
  }

  closeCatalogoModal() {
    this.catalogoModalInstance.hide();
  }

  async guardarCatalogo(catalogo: ICatalogoVariable) {
    const resp = this.nuevoCatalogo()
      ? await this.catalogoService.createCatalogo(catalogo)
      : await this.catalogoService.updateCatalogo({
          ...catalogo,
          catalogoId: this.catalogoEdit()?.catalogoId,
        });

    if (resp) {
      this.closeCatalogoModal();
      await this.fetchCatalogos();
    }
  }

  openInactivarModal(catalogo: ICatalogoVariable) {
    this.catalogoAccion.set(catalogo);
    this.inactivarModalInstance.show();
  }

  async confirmarInactivar() {
    const catalogo = this.catalogoAccion();
    if (!catalogo?.catalogoId) return;

    const resp = await this.catalogoService.inactivarCatalogo(
      catalogo.catalogoId,
    );
    this.inactivarModalInstance.hide();
    if (resp) await this.fetchCatalogos();
  }

  // ── Opciones ──────────────────────────────────────────────────────────────

  /** Botón [O] de la tabla 1: abre el modal con la tabla 2. */
  async verOpciones(catalogo: ICatalogoVariable) {
    this.catalogoSeleccionado.set(catalogo);
    this.modoOpcion.set('lista');
    this.opcionesModalInstance.show();
    await this.fetchOpciones();
  }

  async fetchOpciones() {
    const catalogoId = this.catalogoSeleccionado()?.catalogoId;
    if (!catalogoId) return;

    this.isLoadingOpciones.set(true);
    try {
      this.opcionList.set(await this.catalogoService.getOpciones(catalogoId));
    } finally {
      this.isLoadingOpciones.set(false);
    }
  }

  openOpcionForm(esNueva: boolean, opcion?: IOpcionVariable) {
    this.nuevaOpcion.set(esNueva);
    this.formKeyOpcion.set(Date.now());
    this.opcionEdit.set(esNueva ? null : (opcion ?? null));
    this.modoOpcion.set('form');
  }

  volverALista() {
    this.modoOpcion.set('lista');
  }

  async guardarOpcion(opcion: IOpcionVariable) {
    const resp = this.nuevaOpcion()
      ? await this.catalogoService.createOpcion(opcion)
      : await this.catalogoService.updateOpcion({
          ...opcion,
          opcionId: this.opcionEdit()?.opcionId,
        });

    if (resp) {
      this.modoOpcion.set('lista');
      await this.fetchOpciones();
    }
  }

  async inactivarOpcion(opcion: IOpcionVariable) {
    if (!opcion.opcionId) return;
    const resp = await this.catalogoService.inactivarOpcion(opcion.opcionId);
    if (resp) await this.fetchOpciones();
  }

  closeOpcionesModal() {
    this.opcionesModalInstance.hide();
  }

  // ── Reordenamiento por arrastre ───────────────────────────────────────────

  private arrastrandoCatalogo = signal<number | null>(null);
  private arrastrandoOpcion = signal<number | null>(null);

  onDragOver(evento: DragEvent) {
    evento.preventDefault();
  }

  onDragStartCatalogo(indice: number) {
    this.arrastrandoCatalogo.set(indice);
  }

  async onDropCatalogo(indiceDestino: number) {
    const origen = this.arrastrandoCatalogo();
    this.arrastrandoCatalogo.set(null);
    if (origen === null || origen === indiceDestino) return;

    const lista = [...this.catalogoList()];
    const [movido] = lista.splice(origen, 1);
    lista.splice(indiceDestino, 0, movido);
    this.catalogoList.set(lista);

    const ids = lista
      .map((c) => c.catalogoId)
      .filter((id): id is number => !!id);

    const resp = await this.catalogoService.reordenarCatalogos(ids);
    if (!resp) await this.fetchCatalogos();
  }

  onDragStartOpcion(indice: number) {
    this.arrastrandoOpcion.set(indice);
  }

  async onDropOpcion(indiceDestino: number) {
    const origen = this.arrastrandoOpcion();
    this.arrastrandoOpcion.set(null);
    if (origen === null || origen === indiceDestino) return;

    const lista = [...this.opcionList()];
    const [movido] = lista.splice(origen, 1);
    lista.splice(indiceDestino, 0, movido);
    this.opcionList.set(lista);

    const ids = lista.map((o) => o.opcionId).filter((id): id is number => !!id);

    const resp = await this.catalogoService.reordenarOpciones(ids);
    if (!resp) await this.fetchOpciones();
  }
}
