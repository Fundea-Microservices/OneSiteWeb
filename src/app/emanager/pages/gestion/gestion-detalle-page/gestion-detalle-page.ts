import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, signal, ViewChild, inject, ChangeDetectorRef } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { Modal } from 'bootstrap';
import { TramaDetalleService } from '../../../../../services/emanager/trama-detalle.service';
import { ITramaDetalle } from '../../../../../interfaces/emanager/getion';
import { PaginationAllComponent } from '../../../../shared/components/pagination-all/pagination-all';
import { UpsertTramaDetalleComponent } from '../../../components/trama/upsert-trama-detalle/upsert-trama-detalle';

@Component({
  selector: 'app-gestion-detalle-page',
  imports: [RouterLink, PaginationAllComponent, UpsertTramaDetalleComponent],
  templateUrl: './gestion-detalle-page.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class GestionDetallePage {
  private tramaDetalleService = inject(TramaDetalleService);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);

  isLoading = signal(false);
  buscador = signal('');
  tramaId = signal<string>('');

  nuevoTramaDetalle = signal(true);
  tramaDetalleEdit = signal<ITramaDetalle>(this.getEmptyTramaDetalle());

  tramaDetallesList = signal<ITramaDetalle[]>([]);
  pagination = signal<IPagination>({ page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });

  @ViewChild('upsertTramaDetalleModal') modalElementRef!: ElementRef;
  private modalUpsertInstance!: bootstrap.Modal;

  @ViewChild('deleteTramaDetalleModal') modalDeleteElementRef!: ElementRef;
  private modalDeleteInstance!: bootstrap.Modal;

  modal = signal({
    titulo: 'Crear Detalle de Trama',
    visible: false,
  });

  ngOnInit() {
    // Obtener el tramaId de la ruta
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.tramaId.set(id);
        this.fetchData();
      }
    });
  }

  ngAfterViewInit() {
    this.modalUpsertInstance = new Modal(this.modalElementRef.nativeElement);
    this.modalDeleteInstance = new Modal(this.modalDeleteElementRef.nativeElement);
  }

  private getEmptyTramaDetalle(): ITramaDetalle {
    return {
      detalleId: '',
      tramaId: this.tramaId(),
      codigo: 0,
      valor: '',
      tag: '',
      nombreInput: '',
      tipo: 'CLIENTE',
      codigoParametro: undefined,
      tipoRespuesta: 'TEXT',
      tipoInput: 'TEXT',
      opciones: undefined,
      valorDefecto: undefined,
      orden: 0,
      obligatorio: true,
      visible: true,
      visibleApp: true,
      validacion: undefined,
      validacionMsg: undefined,
      activo: true,
    };
  }

  async fetchData() {
    if (this.isLoading()) return;

    this.isLoading.set(true);

    try {
      const currentPagination = this.pagination();
      const resultado = await this.tramaDetalleService.getTramaDetalles({
        tramaId: this.tramaId(),
        page: currentPagination.page,
        limit: currentPagination.pageSize,
        search: this.buscador()
      });

      if (resultado?.data) {
        this.tramaDetallesList.set(resultado.data);

        if (resultado.metadata) {
          const metadata = resultado.metadata;
          this.pagination.set({
            page: metadata.page || 1,
            pageSize: metadata.limit || 10,
            totalItems: metadata.total || 0,
            totalPages: metadata.totalPages || 0
          });
        }
      } else {
        this.tramaDetallesList.set([]);
        this.pagination.set({ page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
      }

      this.cdr.markForCheck();
    } catch (error) {
      console.error('❌ Error en fetchData:', error);
      this.tramaDetallesList.set([]);
    } finally {
      this.isLoading.set(false);
      this.cdr.markForCheck();
    }
  }

  onChangePage(newPagination: IPagination) {
    this.pagination.set(newPagination);
    this.fetchData();
  }

  async createTramaDetalle(tramaDetalle: ITramaDetalle) {
    const resp = await this.tramaDetalleService.createTramaDetalle(tramaDetalle);
    if (resp?.success) {
      this.fetchData();
      this.closeModal();
      this.tramaDetalleEdit.set(this.getEmptyTramaDetalle());
      this.nuevoTramaDetalle.set(true);
    }
  }

  async updateTramaDetalle(tramaDetalle: ITramaDetalle) {
    const resp = await this.tramaDetalleService.updateTramaDetalle(tramaDetalle);
    if (resp?.success) {
      this.fetchData();
      this.closeModal();
    }
  }

  async deleteTramaDetalle(tramaDetalle: ITramaDetalle) {
    if (!tramaDetalle.detalleId) return;
    const resp = await this.tramaDetalleService.deleteTramaDetalle(tramaDetalle.detalleId);
    if (resp?.success) {
      this.fetchData();
      if (this.modalDeleteInstance) {
        this.modalDeleteInstance.hide();
      }
    }
  }

  async upsertTramaDetalle(tramaDetalle: ITramaDetalle) {
    if (!tramaDetalle.detalleId) {
      await this.createTramaDetalle(tramaDetalle);
    } else {
      await this.updateTramaDetalle(tramaDetalle);
    }
  }

  openModal(nuevo: boolean = true, tramaDetalle: ITramaDetalle = this.getEmptyTramaDetalle()) {
    this.nuevoTramaDetalle.set(nuevo);

    if (this.nuevoTramaDetalle()) {
      const emptyDetalle = this.getEmptyTramaDetalle();
      emptyDetalle.tramaId = this.tramaId();
      
      // Calcular el siguiente orden disponible
      const currentList = this.tramaDetallesList();
      if (currentList.length > 0) {
        const maxOrden = Math.max(...currentList.map(item => item.orden || 0));
        emptyDetalle.orden = maxOrden + 1;
      } else {
        emptyDetalle.orden = 1;
      }
      
      this.tramaDetalleEdit.set(emptyDetalle);
      this.modal.set({ titulo: 'Crear Detalle de Trama', visible: true });
    } else {
      this.tramaDetalleEdit.set(tramaDetalle);
      this.modal.set({ titulo: 'Actualizar Detalle de Trama', visible: true });
    }

    if (!this.modalUpsertInstance) {
      this.modalUpsertInstance = new Modal(this.modalElementRef.nativeElement);
    }
    this.modalUpsertInstance.show();
  }

  closeModal() {
    if (this.modalUpsertInstance) {
      this.modalUpsertInstance.hide();
    }
  }

  openDeleteModal(tramaDetalle: ITramaDetalle) {
    this.tramaDetalleEdit.set(tramaDetalle);
    if (!this.modalDeleteInstance) {
      this.modalDeleteInstance = new Modal(this.modalDeleteElementRef.nativeElement);
    }
    this.modalDeleteInstance.show();
  }

  async toggleObligatorio(item: ITramaDetalle) {
    const updatedItem = { ...item, obligatorio: !item.obligatorio };
    const resp = await this.tramaDetalleService.updateTramaDetalle(updatedItem);
    if (resp?.success) {
      this.fetchData();
    }
  }

  async toggleVisible(item: ITramaDetalle) {
    const updatedItem = { ...item, visible: !item.visible };
    const resp = await this.tramaDetalleService.updateTramaDetalle(updatedItem);
    if (resp?.success) {
      this.fetchData();
    }
  }

  async toggleVisibleApp(item: ITramaDetalle) {
    const updatedItem = { ...item, visibleApp: !item.visibleApp };
    const resp = await this.tramaDetalleService.updateTramaDetalle(updatedItem);
    if (resp?.success) {
      this.fetchData();
    }
  }
}
