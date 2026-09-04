import {
  AfterViewInit, ChangeDetectionStrategy, Component, computed, CUSTOM_ELEMENTS_SCHEMA,
  ElementRef, inject, OnInit, signal, ViewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Modal } from 'bootstrap';
import { PaginationComponent } from '../../../shared/components/pagination/pagination';
import { PrecargaConfigService } from '../../../../services/onesiteex-precarga/precarga-config.service';
import { EncuestaService } from '../../../../services/encuesta/encuesta.service';
import { IConfigEncabezado } from '../../../../interfaces/onesiteex-precarga/onesiteex-precarga';
import { IEncuesta } from '../../../../interfaces/encuesta/encuesta';

type EstadoFiltro = '' | 'true' | 'false';

@Component({
  selector: 'app-precarga-config-page',
  imports: [RouterLink, PaginationComponent],
  templateUrl: './precarga-config-page.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class PrecargaConfigPage implements OnInit, AfterViewInit {
  private precargaService = inject(PrecargaConfigService);
  private encuestaService = inject(EncuestaService);

  configList = signal<IConfigEncabezado[]>([]);
  encuestaList = signal<IEncuesta[]>([]);
  configEdit = signal<IConfigEncabezado | null>(null);
  isLoading = signal(false);
  descargando = signal<string | null>(null);

  buscador = signal('');
  filtroEncuesta = signal<number | null>(null);
  filtroEstado = signal<EstadoFiltro>('');

  pagination = signal<IPagination>({ page: 1, pageSize: 10, totalItems: 0 });

  hayFiltrosActivos = computed(() =>
    !!this.buscador() || this.filtroEncuesta() !== null || this.filtroEstado() !== ''
  );

  private encuestaMap = computed(() => new Map(this.encuestaList().map(e => [e.idEncuesta, e])));

  @ViewChild('deleteModal') deleteModalRef!: ElementRef;
  private deleteModalInstance!: Modal;

  ngOnInit() {
    this.fetchEncuestas();
    this.fetchData();
  }

  ngAfterViewInit() {
    this.deleteModalInstance = new Modal(this.deleteModalRef.nativeElement);
  }

  async fetchEncuestas() {
    const resp = await this.encuestaService.getEncuestas({ all: true });
    this.encuestaList.set(resp?.data ?? []);
  }

  async fetchData() {
    if (this.isLoading()) return;
    this.isLoading.set(true);
    try {
      const estado = this.filtroEstado();
      const resp = await this.precargaService.getConfigs({
        page: this.pagination().page,
        limit: this.pagination().pageSize,
        search: this.buscador(),
        idEncuesta: this.filtroEncuesta() ?? undefined,
        activo: estado === '' ? undefined : estado === 'true',
      });
      if (resp?.data) {
        this.configList.set(resp.data ?? []);
        const m = resp.metadata;
        if (m) this.pagination.set({ page: m.page ?? 1, pageSize: m.limit ?? this.pagination().pageSize, totalItems: m.total });
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
    this.filtroEncuesta.set(null);
    this.filtroEstado.set('');
    this.buscar();
  }

  onChangeEncuesta(value: string) {
    this.filtroEncuesta.set(value ? Number(value) : null);
    this.buscar();
  }

  onChangeEstado(value: string) {
    this.filtroEstado.set(value as EstadoFiltro);
    this.buscar();
  }

  onChangePage(p: IPagination) { this.pagination.set(p); this.fetchData(); }

  nombreEncuesta(idEncuesta: number) { return this.encuestaMap().get(idEncuesta)?.nombre ?? `#${idEncuesta}`; }

  async toggleActivo(config: IConfigEncabezado, checked: boolean) {
    const resp = await this.precargaService.updateConfig(config.id, { activo: checked });
    if (resp?.success) {
      this.configList.update(list => list.map(c => c.id === config.id ? { ...c, activo: checked } : c));
    } else {
      this.fetchData();
    }
  }

  async descargarPlantilla(config: IConfigEncabezado) {
    if (this.descargando()) return;
    this.descargando.set(config.id);
    try {
      await this.precargaService.descargarPlantilla(config);
    } finally {
      this.descargando.set(null);
    }
  }

  openDeleteModal(config: IConfigEncabezado) {
    this.configEdit.set({ ...config });
    this.deleteModalInstance.show();
  }

  async deleteConfig() {
    const id = this.configEdit()?.id;
    if (!id) return;
    const resp = await this.precargaService.deleteConfig(id);
    if (resp?.success) { this.deleteModalInstance.hide(); this.fetchData(); }
  }
}
