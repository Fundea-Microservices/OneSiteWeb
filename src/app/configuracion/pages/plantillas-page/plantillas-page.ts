import {
  ChangeDetectionStrategy,
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  inject,
  signal,
  ViewChild,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Modal } from 'bootstrap';
import { PlantillasService } from '../../../../services/config/plantillas.service';
import { AuthService } from '../../../../services/auth.service';
import { IPlantilla, UpdatePlantillaDto } from '../../../../interfaces/plantillas/plantilla';
import { PaginationAllComponent } from '../../../shared/components/pagination-all/pagination-all';
import {
  PlantillaForm,
  PlantillaGuardar,
  UpsertPlantillaComponent,
} from '../../components/plantillas/upsert-plantilla/upsert-plantilla.component';
import { formatearTamanio, formatoExcel, PLANTILLA_TAMANIO_MAX_MB } from '../../components/plantillas/plantilla-archivo';

type FiltroEstado = '' | 'activas' | 'inactivas';

@Component({
  selector: 'app-plantillas-page',
  imports: [RouterLink, DatePipe, FormsModule, PaginationAllComponent, UpsertPlantillaComponent],
  templateUrl: './plantillas-page.html',
  styleUrl: './plantillas-page.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class PlantillasPage {
  private plantillasService = inject(PlantillasService);
  private authService = inject(AuthService);

  /** Listar, crear, editar y eliminar son exclusivos de roles con `isAdmin` (el API responde 403). */
  readonly esAdmin = computed(() => !!this.authService.user()?.rol?.isAdmin);

  readonly tamanioMaxMb = PLANTILLA_TAMANIO_MAX_MB;
  readonly formatearTamanio = formatearTamanio;
  readonly formatoExcel = formatoExcel;

  isLoading = signal(false);
  guardando = signal(false);
  /** Código de la plantilla con una descarga o cambio de estado en curso. */
  procesando = signal<string | null>(null);

  plantillaList = signal<IPlantilla[]>([]);
  pagination = signal<IPagination>({ page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
  filtros = { search: '', modulo: '', categoria: '', estado: '' as FiltroEstado };

  /** Módulos y categorías ya registrados, para sugerirlos al filtrar y al registrar. */
  modulos = signal<string[]>([]);
  categorias = signal<string[]>([]);

  /** null = crear una nueva. */
  plantillaEdit = signal<IPlantilla | null>(null);
  plantillaEliminar = signal<IPlantilla | null>(null);
  formKey = signal(0);

  @ViewChild('upsertModal') upsertModalRef!: ElementRef;
  private upsertModalInstance?: Modal;

  @ViewChild('deleteModal') deleteModalRef!: ElementRef;
  private deleteModalInstance?: Modal;

  ngOnInit() {
    if (!this.esAdmin()) return;
    this.fetchData();
    this.cargarSugerencias();
  }

  ngAfterViewInit() {
    this.upsertModalInstance = new Modal(this.upsertModalRef.nativeElement);
    this.deleteModalInstance = new Modal(this.deleteModalRef.nativeElement);
  }

  // ─── Listado ───────────────────────────────────────────────────

  async fetchData() {
    if (this.isLoading()) return;
    this.isLoading.set(true);
    try {
      const { page, pageSize } = this.pagination();
      const resp = await this.plantillasService.getPlantillas({
        page,
        limit: pageSize,
        search: this.filtros.search.trim(),
        modulo: this.filtros.modulo.trim(),
        categoria: this.filtros.categoria.trim(),
        activo: this.filtros.estado ? this.filtros.estado === 'activas' : undefined,
      });
      const m = resp?.metadata;
      const limit = Number(m?.limit ?? pageSize);
      const total = Number(m?.total ?? 0);
      this.plantillaList.set(resp?.data ?? []);
      this.pagination.set({
        page: Number(m?.page ?? page),
        pageSize: limit,
        totalItems: total,
        totalPages: Math.ceil(total / limit),
      });
    } finally {
      this.isLoading.set(false);
    }
  }

  async cargarSugerencias() {
    const resp = await this.plantillasService.getPlantillas({ all: true });
    const data = resp?.data ?? [];
    this.modulos.set(valoresUnicos(data.map(p => p.modulo)));
    this.categorias.set(valoresUnicos(data.map(p => p.categoria)));
  }

  buscar() {
    this.pagination.update(p => ({ ...p, page: 1 }));
    this.fetchData();
  }

  limpiarFiltros() {
    this.filtros = { search: '', modulo: '', categoria: '', estado: '' };
    this.buscar();
  }

  onChangePage(p: IPagination) {
    this.pagination.set(p);
    this.fetchData();
  }

  numeroFila(index: number): number {
    const { page, pageSize } = this.pagination();
    return index + 1 + (page - 1) * pageSize;
  }

  // ─── Acciones por fila ─────────────────────────────────────────

  async descargar(item: IPlantilla) {
    this.procesando.set(item.codigo);
    try {
      await this.plantillasService.descargarPlantilla(item.codigo, item.nombre, item.mimeType);
    } finally {
      this.procesando.set(null);
    }
  }

  async toggleActivo(item: IPlantilla, event: Event) {
    const input = event.target as HTMLInputElement;
    const ok = await this.cambiarEstado(item, input.checked);
    // Si falló, el switch vuelve a su estado real (la lista no cambió, así que Angular no lo repinta)
    if (!ok) input.checked = item.activo;
  }

  private async cambiarEstado(item: IPlantilla, activo: boolean): Promise<boolean> {
    this.procesando.set(item.codigo);
    try {
      const resp = await this.plantillasService.updatePlantilla(item.codigo, { activo });
      if (resp) this.reemplazarEnLista(resp.data);
      return !!resp;
    } finally {
      this.procesando.set(null);
    }
  }

  private reemplazarEnLista(plantilla: IPlantilla) {
    this.plantillaList.update(list => list.map(p => (p.codigo === plantilla.codigo ? plantilla : p)));
  }

  // ─── Crear / editar ────────────────────────────────────────────

  openUpsertModal(item: IPlantilla | null = null) {
    this.plantillaEdit.set(item);
    this.formKey.update(k => k + 1);
    this.upsertModalInstance?.show();
  }

  closeUpsertModal() {
    this.upsertModalInstance?.hide();
  }

  async onSavePlantilla({ datos, archivo }: PlantillaGuardar) {
    const original = this.plantillaEdit();
    this.guardando.set(true);
    try {
      const ok = original
        ? await this.actualizar(original, datos, archivo)
        : !!(await this.plantillasService.createPlantilla(datos, archivo!));
      if (ok) {
        this.upsertModalInstance?.hide();
        this.fetchData();
        this.cargarSugerencias();
      }
    } finally {
      this.guardando.set(false);
    }
  }

  /**
   * Envía solo los campos que cambiaron (el PUT rechaza campos de más) y, si se eligió,
   * el archivo nuevo, que el backend publica como la siguiente versión.
   */
  private async actualizar(original: IPlantilla, datos: PlantillaForm, archivo: File | null): Promise<boolean> {
    const cambios: UpdatePlantillaDto = {};
    if (datos.nombre !== original.nombre) cambios.nombre = datos.nombre;
    if (datos.modulo !== original.modulo) cambios.modulo = datos.modulo;
    if (datos.categoria !== (original.categoria ?? '')) cambios.categoria = datos.categoria;
    if (datos.descripcion !== (original.descripcion ?? '')) cambios.descripcion = datos.descripcion;
    if (datos.activo !== original.activo) cambios.activo = datos.activo;

    const hayCambios = Object.keys(cambios).length > 0;
    if (hayCambios && !(await this.plantillasService.updatePlantilla(original.codigo, cambios))) {
      return false;
    }
    if (archivo && !(await this.plantillasService.reemplazarArchivo(original.codigo, archivo))) {
      // Los datos sí se guardaron: se refleja en la tabla y el modal queda abierto para reintentar el archivo
      if (hayCambios) this.fetchData();
      return false;
    }
    return true;
  }

  // ─── Eliminar ──────────────────────────────────────────────────

  openDeleteModal(item: IPlantilla) {
    this.plantillaEliminar.set(item);
    this.deleteModalInstance?.show();
  }

  async deletePlantilla() {
    const item = this.plantillaEliminar();
    if (!item) return;
    this.guardando.set(true);
    try {
      const resp = await this.plantillasService.deletePlantilla(item.codigo);
      if (!resp) return;
      this.deleteModalInstance?.hide();
      // Si era el único registro de la página, se regresa a la anterior
      const { page } = this.pagination();
      if (this.plantillaList().length === 1 && page > 1) {
        this.pagination.update(p => ({ ...p, page: page - 1 }));
      }
      this.fetchData();
    } finally {
      this.guardando.set(false);
    }
  }

  /** Alternativa que sugiere el API cuando solo se quiere ocultar la plantilla un tiempo. */
  async desactivarEnLugarDeEliminar() {
    const item = this.plantillaEliminar();
    if (item && (await this.cambiarEstado(item, false))) {
      this.deleteModalInstance?.hide();
    }
  }
}

function valoresUnicos(valores: (string | null)[]): string[] {
  return [...new Set(valores.filter((v): v is string => !!v))].sort((a, b) => a.localeCompare(b));
}
