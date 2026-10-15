import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, inject, signal, ViewChild } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Modal } from 'bootstrap';
import {
  CampoCatalogoActividad,
  CampoOpcionActividad,
  CATALOGOS_ACTIVIDAD,
  IActividadCreate,
  IActividadEconomica,
  IActividadUpdate,
} from '../../../../interfaces/actividad-economica';
import { IOpcionSelect } from '../../../../interfaces/catalogo';
import { ActividadEconomicaService } from '../../../../services/flujo-fondos/actividad-economica.service';
import { CatalogoService } from '../../../../services/flujo-fondos/catalogo.service';
import { SucursalesBantotalService } from '../../../../services/api-bantotal/sucursales.service';
import { PaginationComponent } from '../../../shared/components/pagination/pagination';
import { UpsertActividadComponent } from '../../components/actividad-economica/upsert-actividad/upsert-actividad';

// Catálogos que se muestran en la tabla (el listado trae códigos, no nombres). La región sale de Bantotal
const CAMPOS_TABLA: CampoCatalogoActividad[] = ['actividad', 'subActividad', 'giro', 'medidaProduccion'];

@Component({
  selector: 'app-actividades-economicas',
  imports: [RouterLink, DecimalPipe, PaginationComponent, UpsertActividadComponent],
  templateUrl: './actividades-economicas.component.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ActividadesEconomicasComponent {

  actividadService = inject(ActividadEconomicaService);
  catalogoService = inject(CatalogoService);
  sucursalesService = inject(SucursalesBantotalService);

  actividadesList = signal<IActividadEconomica[]>([]);
  nuevaActividad = signal(true);
  actividadEdit = signal<IActividadEconomica | null>(null);
  cargandoEdicionId = signal<string | null>(null);
  guardando = signal(false);

  pagination = signal<IPagination>({
    page: 1,
    pageSize: 10,
    totalItems: 0
  });
  isLoading = signal(false);
  formKey = signal(Date.now());

  @ViewChild('upsertActividadModal') modalElementRef!: ElementRef;
  private modalUpsertInstance!: bootstrap.Modal;

  @ViewChild('deleteActividadModal') modalDeleteElementRef!: ElementRef;
  private modalDeleteInstance!: bootstrap.Modal;

  modal = signal({ titulo: 'Crear Actividad Económica' });

  // Filtros: '' = Todas (no se envía el parámetro)
  buscador = signal('');
  regionFilter = signal('');
  actividadFilter = signal('');
  subActividadFilter = signal('');

  opcionesRegion = signal<IOpcionSelect[]>([]);
  opcionesActividad = signal<IOpcionSelect[]>([]);
  opcionesSubActividad = signal<IOpcionSelect[]>([]);

  // value -> label por campo, incluyendo opciones desactivadas
  nombres = signal<Partial<Record<CampoOpcionActividad, Map<string, string>>>>({});

  ngOnInit() {
    this.cargarCatalogos();
    this.fetchData();
  }

  ngAfterViewInit() {
    this.modalUpsertInstance = new Modal(this.modalElementRef.nativeElement);
    this.modalDeleteInstance = new Modal(this.modalDeleteElementRef.nativeElement);
  }

  private async cargarCatalogos() {
    // incluirInactivos: así se traducen también registros con opciones ya desactivadas
    const [regiones, ...catalogos] = await Promise.all([
      this.sucursalesService.getRegionesSelect(),
      ...CAMPOS_TABLA.map(campo => this.catalogoService.select(CATALOGOS_ACTIVIDAD[campo], null, true)),
    ]);

    const nombres: Partial<Record<CampoOpcionActividad, Map<string, string>>> = {
      region: new Map(regiones.map(o => [o.value, o.label])),
    };
    CAMPOS_TABLA.forEach((campo, i) => {
      nombres[campo] = new Map((catalogos[i]?.opciones ?? []).map(o => [o.value.toUpperCase(), o.label]));
    });
    this.nombres.set(nombres);

    this.opcionesRegion.set(regiones);
    this.opcionesActividad.set(catalogos[CAMPOS_TABLA.indexOf('actividad')]?.opciones ?? []);
  }

  nombre(campo: CampoOpcionActividad, codigo: string | null | undefined): string {
    if (!codigo) return '—';
    return this.nombres()[campo]?.get(codigo.toUpperCase()) ?? codigo;
  }

  async fetchData() {
    if (this.isLoading()) return;
    this.isLoading.set(true);
    const resp = await this.actividadService.getActividades({
      page: this.pagination().page,
      limit: this.pagination().pageSize,
      search: this.buscador().trim(),
      region: this.regionFilter(),
      actividad: this.actividadFilter(),
      subActividad: this.subActividadFilter(),
    });
    if (resp) {
      const { actividades, metadata } = resp.data;
      this.actividadesList.set(actividades);
      this.pagination.set({
        page: metadata.page,
        pageSize: metadata.limit,
        totalItems: metadata.total
      });
    }
    this.isLoading.set(false);
  }

  buscar() {
    this.pagination.update(p => ({ ...p, page: 1 }));
    this.fetchData();
  }

  onRegionChange(region: string) {
    this.regionFilter.set(region);
    this.buscar();
  }

  /** El filtro de subactividad depende del de actividad. */
  async onActividadChange(actividad: string) {
    this.actividadFilter.set(actividad);
    this.subActividadFilter.set('');
    this.opcionesSubActividad.set([]);
    this.buscar();
    if (actividad) {
      const resp = await this.catalogoService.select(CATALOGOS_ACTIVIDAD.subActividad, actividad, true);
      if (this.actividadFilter() === actividad) {
        this.opcionesSubActividad.set(resp?.opciones ?? []);
      }
    }
  }

  onSubActividadChange(subActividad: string) {
    this.subActividadFilter.set(subActividad);
    this.buscar();
  }

  onChangePage(newPagination: IPagination) {
    this.actividadesList.set([]);
    this.pagination.set(newPagination);
    this.fetchData();
  }

  async openModal(nuevo: boolean = true, actividad: IActividadEconomica | null = null) {
    if (nuevo) {
      this.actividadEdit.set(null);
    } else {
      // El listado no trae la distribución: se pide la actividad completa
      this.cargandoEdicionId.set(actividad!.id);
      const completa = await this.actividadService.getActividadById(actividad!.id);
      this.cargandoEdicionId.set(null);
      if (!completa) return;
      this.actividadEdit.set(completa);
    }

    this.nuevaActividad.set(nuevo);
    this.formKey.set(Date.now());
    this.modal.set({ titulo: nuevo ? 'Crear Actividad Económica' : 'Actualizar Actividad Económica' });

    if (!this.modalUpsertInstance) {
      this.modalUpsertInstance = new Modal(this.modalElementRef.nativeElement);
    }
    this.modalUpsertInstance.show();
  }

  closeModal() {
    this.modalUpsertInstance?.hide();
  }

  async onSave(actividad: IActividadCreate | IActividadUpdate) {
    // La petición tarda: un segundo clic crearía la actividad dos veces
    if (this.guardando()) return;
    this.guardando.set(true);
    const resp = await ('id' in actividad
      ? this.actividadService.updateActividad(actividad)
      : this.actividadService.createActividad(actividad)
    ).finally(() => this.guardando.set(false));
    if (resp?.success) {
      this.fetchData();
      this.closeModal();
    }
  }

  openDeleteModal(actividad: IActividadEconomica) {
    this.actividadEdit.set(actividad);
    if (!this.modalDeleteInstance) {
      this.modalDeleteInstance = new Modal(this.modalDeleteElementRef.nativeElement);
    }
    this.modalDeleteInstance.show();
  }

  async deleteActividad(actividad: IActividadEconomica) {
    const resp = await this.actividadService.deleteActividad(actividad.id);
    if (resp?.success) {
      this.fetchData();
      this.modalDeleteInstance?.hide();
    }
  }
}
