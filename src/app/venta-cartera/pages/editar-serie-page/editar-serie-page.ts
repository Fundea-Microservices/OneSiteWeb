import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { SerieDetalle, SerieEncabezado } from '../../../../interfaces/venta-cartera/serie';
import { SerieService } from '../../../../services/venta-cartera/serie.service';

const PAGE_SIZE = 50;

@Component({
  selector: 'app-editar-serie-page',
  imports: [RouterLink, CurrencyPipe, DatePipe],
  templateUrl: './editar-serie-page.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class EditarSeriePage {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private serieService = inject(SerieService);
  private cdr = inject(ChangeDetectorRef);
  private toastr = inject(ToastrService);

  readonly PAGE_SIZE = PAGE_SIZE;

  serieId = signal('');
  serieEncabezado = signal<SerieEncabezado | null>(null);
  detalleList = signal<SerieDetalle[]>([]);

  isLoadingEncabezado = signal(false);
  isLoadingDetalles = signal(false);
  loadProgress = signal(0);
  loadProgressLabel = signal('Cargando detalles...');

  isSaving = signal(false);
  saveProgress = signal(0);

  currentPage = signal(1);
  changesCount = signal(0);

  // Internal change tracking (not signals — updated imperatively)
  private originalActivos = new Map<string, boolean>();
  private changedMap = new Map<string, boolean>();

  // Computed
  totalDetalles = computed(() => this.detalleList().length);
  totalActivos = computed(() => this.detalleList().filter(d => d.activo).length);
  totalInactivos = computed(() => this.totalDetalles() - this.totalActivos());
  saldoCapitalActivo = computed(() =>
    this.detalleList().filter(d => d.activo).reduce((sum, d) => sum + (d.saldoCapital ?? 0), 0)
  );
  moraActiva = computed(() =>
    this.detalleList().filter(d => d.activo).reduce((sum, d) => sum + (d.capitalMora ?? 0), 0)
  );
  totalDisplayPages = computed(() => Math.ceil(this.detalleList().length / PAGE_SIZE));
  pagedDetalles = computed(() => {
    const start = (this.currentPage() - 1) * PAGE_SIZE;
    return this.detalleList().slice(start, start + PAGE_SIZE);
  });
  allPageActivos = computed(() => {
    const items = this.pagedDetalles();
    return items.length > 0 && items.every(d => d.activo);
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('serieId') || '';
    this.serieId.set(id);
    if (id) {
      this.fetchEncabezado(id);
      this.fetchAllDetalles(id);
    }
  }

  async fetchEncabezado(serieId: string) {
    this.isLoadingEncabezado.set(true);
    try {
      const resp = await this.serieService.getSerieEncabezadoById(serieId);
      this.serieEncabezado.set(resp?.data ?? null);
    } catch (e) {
      console.error('Error fetching encabezado:', e);
    } finally {
      this.isLoadingEncabezado.set(false);
      this.cdr.markForCheck();
    }
  }

  async fetchAllDetalles(serieId: string) {
    this.isLoadingDetalles.set(true);
    this.loadProgress.set(0);
    this.detalleList.set([]);
    this.originalActivos.clear();
    this.changedMap.clear();
    this.changesCount.set(0);

    try {
      const first = await this.serieService.getSerieDetalles({ serieId, page: 1, limit: PAGE_SIZE });
      if (!first?.data) return;

      const total = first.metadata.total ?? 0;
      const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

      let all: SerieDetalle[] = [...first.data];
      this.loadProgress.set(Math.round((1 / totalPages) * 100));
      this.loadProgressLabel.set(`Cargando detalles (1 / ${totalPages})...`);
      this.cdr.markForCheck();

      for (let page = 2; page <= totalPages; page++) {
        const resp = await this.serieService.getSerieDetalles({ serieId, page, limit: PAGE_SIZE });
        if (resp?.data) {
          all = [...all, ...resp.data];
        }
        this.loadProgress.set(Math.round((page / totalPages) * 100));
        this.loadProgressLabel.set(`Cargando detalles (${page} / ${totalPages})...`);
        this.cdr.markForCheck();
      }

      // Store original activo values for change tracking
      all.forEach(d => {
        if (d.id) this.originalActivos.set(d.id, !!d.activo);
      });

      this.detalleList.set(all);
    } catch (e) {
      console.error('Error fetching detalles:', e);
    } finally {
      this.isLoadingDetalles.set(false);
      this.loadProgress.set(0);
      this.cdr.markForCheck();
    }
  }

  isChanged(id: string | undefined): boolean {
    return id ? this.changedMap.has(id) : false;
  }

  toggleDetalleActivo(item: SerieDetalle, checked: boolean) {
    if (!item.id) return;

    this.detalleList.update(items =>
      items.map(d => d.id === item.id ? { ...d, activo: checked } : d)
    );

    const original = this.originalActivos.get(item.id);
    if (original === checked) {
      this.changedMap.delete(item.id);
    } else {
      this.changedMap.set(item.id, checked);
    }
    this.changesCount.set(this.changedMap.size);
    this.cdr.markForCheck();
  }

  togglePageActivos(checked: boolean) {
    this.pagedDetalles().forEach(item => this.toggleDetalleActivo(item, checked));
  }

  prevPage() {
    this.currentPage.update(p => Math.max(1, p - 1));
  }

  nextPage() {
    this.currentPage.update(p => Math.min(this.totalDisplayPages(), p + 1));
  }

  async saveChanges() {
    if (this.changedMap.size === 0) {
      this.toastr.info('No hay cambios que guardar', 'Sin cambios');
      return;
    }

    const toUpdate = this.detalleList().filter(d => d.id && this.changedMap.has(d.id));
    const CHUNK_SIZE = 50;
    const chunks: SerieDetalle[][] = [];
    for (let i = 0; i < toUpdate.length; i += CHUNK_SIZE) {
      chunks.push(toUpdate.slice(i, i + CHUNK_SIZE));
    }

    this.isSaving.set(true);
    this.saveProgress.set(0);

    let savedCount = 0;
    let failedCount = 0;

    try {
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const detalles = chunk.map(d => ({ id: d.id!, activo: !!d.activo }));
        const result = await this.serieService.updateSerieDetallesBatch(this.serieId(), detalles);

        if (result?.success) {
          savedCount += chunk.length;
          chunk.forEach(d => {
            this.changedMap.delete(d.id!);
            this.originalActivos.set(d.id!, !!d.activo);
          });
        } else {
          failedCount += chunk.length;
        }

        this.saveProgress.set(Math.round(((i + 1) / chunks.length) * 100));
        this.cdr.markForCheck();
      }

      this.changesCount.set(this.changedMap.size);

      if (savedCount > 0) {
        this.toastr.success(`Se actualizaron ${savedCount} registro(s)`, 'Guardado exitoso');
        this.router.navigate(['/venta-cartera/titularizacion']);
      }
      if (failedCount > 0) {
        this.toastr.warning(`${failedCount} registro(s) no se pudieron guardar`, 'Advertencia');
      }
    } catch (e) {
      console.error('Error saving changes:', e);
      this.toastr.error('No se pudieron guardar los cambios', 'Error');
    } finally {
      this.isSaving.set(false);
      this.saveProgress.set(0);
      this.cdr.markForCheck();
    }
  }
}
