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
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Modal } from 'bootstrap';
import { PaginationComponent } from '../../../shared/components/pagination/pagination';
import { CatalogoService } from '../../../../services/config/catalogo-maestro.service';
import { CatalogoOpcionService } from '../../../../services/config/catalogo-opcion.service';
import { ICatalogo, ICatalogoOpcion } from '../../../../interfaces/catalogo-maestro/catalogo-maestro';
import { UpsertCatalogoOpcionComponent } from '../../components/upsert-catalogo-opcion/upsert-catalogo-opcion.component';

const emptyOpcion = (idCatalogo: string): ICatalogoOpcion => ({
  id: '',
  idCatalogo,
  nombre: '',
  codigo: '',
  orden: 0,
  activo: true,
  porDefecto: false,
  idPadre: null,
});

@Component({
  selector: 'app-catalogo-opcion-page',
  imports: [RouterLink, PaginationComponent, UpsertCatalogoOpcionComponent],
  templateUrl: './catalogo-opcion-page.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class CatalogoOpcionPage implements OnInit, AfterViewInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private catalogoService = inject(CatalogoService);
  private opcionService = inject(CatalogoOpcionService);

  idCatalogo = signal<string>('');
  catalogo = signal<ICatalogo | null>(null);

  opcionList = signal<ICatalogoOpcion[]>([]);
  opcionEdit = signal<ICatalogoOpcion>(emptyOpcion(''));
  nuevo = signal<boolean>(true);
  formKey = signal(Date.now());

  pagination = signal<IPagination>({ page: 1, pageSize: 10, totalItems: 0 });
  isLoading = signal(false);
  buscador = signal('');
  todasLasOpciones = signal<ICatalogoOpcion[]>([]);
  padresExternos = signal<Map<string, string>>(new Map());

  modal = signal({ titulo: 'Crear opción' });

  @ViewChild('upsertModal') modalElementRef!: ElementRef;
  private modalUpsertInstance!: Modal;

  @ViewChild('deleteModal') modalDeleteElementRef!: ElementRef;
  private modalDeleteInstance!: Modal;

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.idCatalogo.set(id);
    this.loadCatalogo(id);
    this.loadTodasLasOpciones(id);
    this.fetchData();
  }

  ngAfterViewInit() {
    this.modalUpsertInstance = new Modal(this.modalElementRef.nativeElement);
    this.modalDeleteInstance = new Modal(this.modalDeleteElementRef.nativeElement);
  }

  private async resolveNombresPadre(opciones: ICatalogoOpcion[]) {
    const localIds = new Set(this.todasLasOpciones().map(o => o.id));
    const mapa = new Map(this.padresExternos());
    const pendientes = opciones
      .map(o => o.idPadre)
      .filter((id): id is string => !!id && !localIds.has(id) && !mapa.has(id));
    const unicos = [...new Set(pendientes)];
    await Promise.all(
      unicos.map(async id => {
        const resp = await this.opcionService.getOpcionById(id);
        if (resp?.data) mapa.set(id, resp.data.nombre);
      })
    );
    this.padresExternos.set(mapa);
  }

  async loadCatalogo(id: string) {
    const resp = await this.catalogoService.getCatalogoById(id);
    if (resp?.data) {
      this.catalogo.set(resp.data);
    }
  }

  async loadTodasLasOpciones(idCatalogo: string) {
    const resp = await this.opcionService.getOpciones({ idCatalogo, all: true });
    if (resp?.data) {
      this.todasLasOpciones.set(resp.data);
    }
  }

  nombrePadre(idPadre: string | null | undefined): string {
    if (!idPadre) return '—';
    const local = this.todasLasOpciones().find(o => o.id === idPadre);
    if (local) return local.nombre;
    return this.padresExternos().get(idPadre) ?? '—';
  }

  async fetchData() {
    if (this.isLoading()) return;
    this.isLoading.set(true);
    try {
      const resp = await this.opcionService.getOpciones({
        page: this.pagination().page,
        limit: this.pagination().pageSize,
        search: this.buscador(),
        idCatalogo: this.idCatalogo(),
      });
      if (resp?.data) {
        this.opcionList.set(resp.data ?? []);
        const metadata = resp.metadata;
        if (metadata) {
          this.pagination.set({
            page: metadata.page,
            pageSize: metadata.limit,
            totalItems: metadata.total,
          });
        }
        await this.resolveNombresPadre(resp.data);
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  openModal(esNuevo: boolean, opcion?: ICatalogoOpcion) {
    this.nuevo.set(esNuevo);
    this.formKey.set(Date.now());
    if (esNuevo) {
      this.opcionEdit.set(emptyOpcion(this.idCatalogo()));
      this.modal.set({ titulo: 'Crear opción' });
    } else {
      this.opcionEdit.set({ ...opcion! });
      this.modal.set({ titulo: 'Editar opción' });
    }
    this.modalUpsertInstance.show();
  }

  closeModal() {
    this.modalUpsertInstance.hide();
  }

  openDeleteModal(opcion: ICatalogoOpcion) {
    this.opcionEdit.set({ ...opcion });
    this.modalDeleteInstance.show();
  }

  async upsertOpcion(opcion: ICatalogoOpcion) {
    if (this.nuevo()) {
      await this.createOpcion(opcion);
    } else {
      await this.updateOpcion(opcion);
    }
  }

  async createOpcion(opcion: ICatalogoOpcion) {
    const resp = await this.opcionService.createOpcion(opcion);
    if (resp?.success) {
      this.closeModal();
      this.fetchData();
      this.loadTodasLasOpciones(this.idCatalogo());
    }
  }

  async updateOpcion(opcion: ICatalogoOpcion) {
    const resp = await this.opcionService.updateOpcion(opcion);
    if (resp?.success) {
      this.closeModal();
      this.fetchData();
      this.loadTodasLasOpciones(this.idCatalogo());
    }
  }

  async toggleActivo(item: ICatalogoOpcion) {
    const updated = { ...item, activo: !item.activo };
    const resp = await this.opcionService.updateOpcion(updated);
    if (resp?.success) {
      this.opcionList.update(list =>
        list.map(o => o.id === item.id ? { ...o, activo: !o.activo } : o)
      );
    }
  }

  async togglePorDefecto(item: ICatalogoOpcion) {
    const updated = { ...item, porDefecto: !item.porDefecto };
    const resp = await this.opcionService.updateOpcion(updated);
    if (resp?.success) {
      this.opcionList.update(list =>
        list.map(o => o.id === item.id ? { ...o, porDefecto: !o.porDefecto } : o)
      );
    }
  }

  async deleteOpcion() {
    const id = this.opcionEdit().id!;
    const resp = await this.opcionService.deleteOpcion(id);
    if (resp?.success) {
      this.modalDeleteInstance.hide();
      this.fetchData();
      this.loadTodasLasOpciones(this.idCatalogo());
    }
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

    const previous = this.opcionList();
    const list = [...previous];
    const [draggedItem] = list.splice(this.dragIndex, 1);
    list.splice(dropIndex, 0, draggedItem);
    this.dragIndex = -1;

    const offset = (this.pagination().page - 1) * this.pagination().pageSize;
    const reordered = list.map((item, i) => ({ ...item, orden: offset + i + 1 }));
    this.opcionList.set(reordered);

    const cambios = reordered.filter(item =>
      previous.find(o => o.id === item.id)?.orden !== item.orden
    );
    await Promise.all(cambios.map(item => this.opcionService.updateOpcion(item)));
  }

  onDragEnd() {
    this.dragIndex = -1;
  }

  onChangePage(newPagination: IPagination) {
    this.pagination.set(newPagination);
    this.fetchData();
  }

  goBack() {
    this.router.navigate(['/onesiteex/catalogos']);
  }
}
