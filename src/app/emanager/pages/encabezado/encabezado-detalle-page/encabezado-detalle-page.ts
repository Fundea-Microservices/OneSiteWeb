import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, signal, ViewChild, inject, ChangeDetectorRef } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { Modal } from 'bootstrap';
import { EncabezadoDetalleService } from '../../../../../services/emanager/encabezado-detalle.service';
import { IEncabezado, IEncabezadoDetalle } from '../../../../../interfaces/emanager/encabezado';
import { PaginationAllComponent } from '../../../../shared/components/pagination-all/pagination-all';
import { UpsertEncabezadoDetalleComponent } from '../../../components/encabezado/upsert-encabezado-detalle/upsert-encabezado-detalle';
import { EncabezadoService } from '../../../../../services/emanager/encabezado.service';

@Component({
  selector: 'app-encabezado-detalle-page',
  imports: [RouterLink, PaginationAllComponent, UpsertEncabezadoDetalleComponent],
  templateUrl: './encabezado-detalle-page.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class EncabezadoDetallePage {
  private encabezadoDetalleService = inject(EncabezadoDetalleService);
  private encabezadoService = inject(EncabezadoService);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);

  isLoading = signal(false);
  buscador = signal('');
  encabezadoId = signal<string>('');
  encabezado = signal<IEncabezado>({} as IEncabezado);

  nuevoEncabezadoDetalle = signal(true);
  encabezadoDetalleEdit = signal<IEncabezadoDetalle>(this.getEmptyEncabezadoDetalle());

  encabezadoDetallesList = signal<IEncabezadoDetalle[]>([]);
  pagination = signal<IPagination>({ page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });

  @ViewChild('upsertEncabezadoDetalleModal') modalElementRef!: ElementRef;
  private modalUpsertInstance!: bootstrap.Modal;

  @ViewChild('deleteEncabezadoDetalleModal') modalDeleteElementRef!: ElementRef;
  private modalDeleteInstance!: bootstrap.Modal;

  modal = signal({
    titulo: 'Crear Detalle de Encabezado',
    visible: false,
  });

  ngOnInit() {
    // Obtener el encabezadoId de la ruta
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.encabezadoId.set(id);
        this.fetchData();
      }
    });
  }

  ngAfterViewInit() {
    this.modalUpsertInstance = new Modal(this.modalElementRef.nativeElement);
    this.modalDeleteInstance = new Modal(this.modalDeleteElementRef.nativeElement);
  }

  private getEmptyEncabezadoDetalle(): IEncabezadoDetalle {
    return {
      detalleId: '',
      encabezadoId: this.encabezadoId(),
      codigo: 0,
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
      activo: true,
    };
  }

  async fetchData() {
    if (this.isLoading()) return;

    this.isLoading.set(true);

    try {
      // Obtenemos información del encabezado para mostrar su nombre en el título
      const encabezadoResp = await this.encabezadoService.getEncabezadoById(this.encabezadoId());
      if (encabezadoResp?.data) {
        this.encabezado.set(encabezadoResp.data);
      } else {
        this.encabezado.set({} as IEncabezado);
      }
    } catch (error) {
      console.log("🚀 ~ EncabezadoDetallePage ~ fetchData ~ error:", error);
    }

    try {
      const currentPagination = this.pagination();
      const resultado = await this.encabezadoDetalleService.getEncabezadoDetalles({
        encabezadoId: this.encabezadoId(),
        page: currentPagination.page,
        limit: currentPagination.pageSize,
        search: this.buscador()
      });

      if (resultado?.data) {
        this.encabezadoDetallesList.set(resultado.data);

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
        this.encabezadoDetallesList.set([]);
        this.pagination.set({ page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
      }

      this.cdr.markForCheck();
    } catch (error) {
      console.error('❌ Error en fetchData:', error);
      this.encabezadoDetallesList.set([]);
    } finally {
      this.isLoading.set(false);
      this.cdr.markForCheck();
    }
  }

  onChangePage(newPagination: IPagination) {
    this.pagination.set(newPagination);
    this.fetchData();
  }

  async createEncabezadoDetalle(encabezadoDetalle: IEncabezadoDetalle) {
    const resp = await this.encabezadoDetalleService.createEncabezadoDetalle(encabezadoDetalle);
    if (resp?.success) {
      this.fetchData();
      this.closeModal();
      this.encabezadoDetalleEdit.set(this.getEmptyEncabezadoDetalle());
      this.nuevoEncabezadoDetalle.set(true);
    }
  }

  async updateEncabezadoDetalle(encabezadoDetalle: IEncabezadoDetalle) {
    const resp = await this.encabezadoDetalleService.updateEncabezadoDetalle(encabezadoDetalle);
    if (resp?.success) {
      this.fetchData();
      this.closeModal();
    }
  }

  async deleteEncabezadoDetalle(encabezadoDetalle: IEncabezadoDetalle) {
    if (!encabezadoDetalle.detalleId) return;
    const resp = await this.encabezadoDetalleService.deleteEncabezadoDetalle(encabezadoDetalle.detalleId);
    if (resp?.success) {
      this.fetchData();
      if (this.modalDeleteInstance) {
        this.modalDeleteInstance.hide();
      }
    }
  }

  async upsertEncabezadoDetalle(encabezadoDetalle: IEncabezadoDetalle) {
    if (!encabezadoDetalle.detalleId) {
      await this.createEncabezadoDetalle(encabezadoDetalle);
    } else {
      await this.updateEncabezadoDetalle(encabezadoDetalle);
    }
  }

  openModal(nuevo: boolean = true, encabezadoDetalle: IEncabezadoDetalle = this.getEmptyEncabezadoDetalle()) {
    this.nuevoEncabezadoDetalle.set(nuevo);

    if (this.nuevoEncabezadoDetalle()) {
      const emptyDetalle = this.getEmptyEncabezadoDetalle();
      emptyDetalle.encabezadoId = this.encabezadoId();
      
      // Calcular el siguiente orden disponible
      const currentList = this.encabezadoDetallesList();
      if (currentList.length > 0) {
        const maxOrden = Math.max(...currentList.map(item => item.orden || 0));
        emptyDetalle.orden = maxOrden + 1;
      } else {
        emptyDetalle.orden = 1;
      }
      
      this.encabezadoDetalleEdit.set(emptyDetalle);
      this.modal.set({ titulo: 'Crear Detalle de Encabezado', visible: true });
    } else {
      this.encabezadoDetalleEdit.set(encabezadoDetalle);
      this.modal.set({ titulo: 'Actualizar Detalle de Encabezado', visible: true });
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

  openDeleteModal(encabezadoDetalle: IEncabezadoDetalle) {
    this.encabezadoDetalleEdit.set(encabezadoDetalle);
    if (!this.modalDeleteInstance) {
      this.modalDeleteInstance = new Modal(this.modalDeleteElementRef.nativeElement);
    }
    this.modalDeleteInstance.show();
  }

  async toggleObligatorio(item: IEncabezadoDetalle) {
    const updatedItem = { ...item, obligatorio: !item.obligatorio };
    const resp = await this.encabezadoDetalleService.updateEncabezadoDetalle(updatedItem);
    if (resp?.success) {
      this.fetchData();
    }
  }

  async toggleVisible(item: IEncabezadoDetalle) {
    const updatedItem = { ...item, visible: !item.visible };
    const resp = await this.encabezadoDetalleService.updateEncabezadoDetalle(updatedItem);
    if (resp?.success) {
      this.fetchData();
    }
  }
}
