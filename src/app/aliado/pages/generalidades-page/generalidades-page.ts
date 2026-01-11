import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, signal, ElementRef, ViewChild, AfterViewInit, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Modal } from 'bootstrap';
import { TipoSolicitud, EstadoSolicitud, TipoAfiliacion } from '../../../../interfaces/aliado/generalidades';
import { UpsertGeneralidadComponent, Generalidad } from '../../components/generalidades/upsert-generalidad.component';
import { GeneralidadesService } from '../../../../services/aliado/generalidades.service';

@Component({
  selector: 'app-generalidades-page',
  imports: [CommonModule, RouterLink, UpsertGeneralidadComponent],
  templateUrl: './generalidades-page.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class GeneralidadesPage implements AfterViewInit, OnInit {
  private generalidadesService = inject(GeneralidadesService);

  tiposSolicitud = signal<TipoSolicitud[]>([]);
  estadosSolicitud = signal<EstadoSolicitud[]>([]);
  tiposAfiliacion = signal<TipoAfiliacion[]>([]);
  isLoading = signal(false);

  // Estado de modal y selección
  tipoSeleccionado = signal<'tipoSolicitud' | 'estadoSolicitud' | 'tipoAfiliacion'>('tipoSolicitud');
  modalTitle = signal('Crear Tipo Solicitud');
  nuevoRegistro = signal(true);
  generalidadEdit = signal<Generalidad | undefined>(undefined);

  @ViewChild('upsertGeneralidadModal') modalElementRef!: ElementRef;
  private modalUpsertInstance!: Modal;

  @ViewChild('deleteGeneralidadModal') modalDeleteElementRef!: ElementRef;
  private modalDeleteInstance!: Modal;

  async ngOnInit(): Promise<void> {
    await this.loadAll();
  }

  ngAfterViewInit(): void {
    this.modalUpsertInstance = new Modal(this.modalElementRef.nativeElement);
    this.modalDeleteInstance = new Modal(this.modalDeleteElementRef.nativeElement);
  }

  private async loadAll() {
    if (this.isLoading()) return;
    this.isLoading.set(true);

    const [tipoResp, estadoResp, afiliacionResp] = await Promise.all([
      this.generalidadesService.getAllTipoSolicitud({ all: true }),
      this.generalidadesService.getAllEstadoSolicitud({ all: true }),
      this.generalidadesService.getAllTipoAfiliacion({ all: true }),
    ]);

    this.tiposSolicitud.set((tipoResp?.data as TipoSolicitud[]) ?? []);
    this.estadosSolicitud.set((estadoResp?.data as EstadoSolicitud[]) ?? []);
    this.tiposAfiliacion.set((afiliacionResp?.data as TipoAfiliacion[]) ?? []);

    this.isLoading.set(false);
  }

  // Métodos para acciones
  crearTipoSolicitud() {
    console.log('Crear Tipo Solicitud');
  }

  editarTipoSolicitud(item: TipoSolicitud) {
    console.log('Editar Tipo Solicitud:', item);
  }

  eliminarTipoSolicitud(item: TipoSolicitud) {
    console.log('Eliminar Tipo Solicitud:', item);
  }

  changeActiveTipoSolicitud(item: TipoSolicitud, newValue: boolean) {
    this.generalidadesService.updateTipoSolicitud(item.tipoSolicitudId, { activo: newValue })
      .then(() => this.loadAll());
  }

  crearEstadoSolicitud() {
    console.log('Crear Estado Solicitud');
  }

  editarEstadoSolicitud(item: EstadoSolicitud) {
    console.log('Editar Estado Solicitud:', item);
  }

  eliminarEstadoSolicitud(item: EstadoSolicitud) {
    console.log('Eliminar Estado Solicitud:', item);
  }

  changeActiveEstadoSolicitud(item: EstadoSolicitud, newValue: boolean) {
    this.generalidadesService.updateEstadoSolicitud(item.estadoSolicitudId, { activo: newValue })
      .then(() => this.loadAll());
  }

  crearTipoAfiliacion() {
    console.log('Crear Tipo Afiliación');
  }

  editarTipoAfiliacion(item: TipoAfiliacion) {
    console.log('Editar Tipo Afiliación:', item);
  }

  eliminarTipoAfiliacion(item: TipoAfiliacion) {
    console.log('Eliminar Tipo Afiliación:', item);
  }

  changeActiveTipoAfiliacion(item: TipoAfiliacion, newValue: boolean) {
    this.generalidadesService.updateTipoAfiliacion(item.tipoAfiliacionId, { activo: newValue })
      .then(() => this.loadAll());
  }

  openModal(nuevo: boolean, tipo: 'tipoSolicitud' | 'estadoSolicitud' | 'tipoAfiliacion', item?: Generalidad) {
    this.tipoSeleccionado.set(tipo);
    this.nuevoRegistro.set(nuevo);

    const titulo = `${nuevo ? 'Crear' : 'Editar'} ${this.getTipoLabel(tipo)}`;
    this.modalTitle.set(titulo);

    if (nuevo) {
      this.generalidadEdit.set(this.getDefaultByTipo(tipo));
    } else if (item) {
      this.generalidadEdit.set(item);
    }

    if (!this.modalUpsertInstance && this.modalElementRef) {
      this.modalUpsertInstance = new Modal(this.modalElementRef.nativeElement);
    }
    this.modalUpsertInstance.show();
  }

  closeModal() {
    if (this.modalUpsertInstance) {
      this.modalUpsertInstance.hide();
    }
  }

  openDeleteModal(tipo: 'tipoSolicitud' | 'estadoSolicitud' | 'tipoAfiliacion', item: Generalidad) {
    this.tipoSeleccionado.set(tipo);
    this.generalidadEdit.set(item);
    if (!this.modalDeleteInstance && this.modalDeleteElementRef) {
      this.modalDeleteInstance = new Modal(this.modalDeleteElementRef.nativeElement);
    }
    this.modalDeleteInstance.show();
  }

  closeDeleteModal() {
    if (this.modalDeleteInstance) {
      this.modalDeleteInstance.hide();
    }
  }

  upsertGeneralidad(payload: { nombre: string; activo: boolean; mostrarPreguntas?: boolean }) {
    const tipo = this.tipoSeleccionado();
    const esNuevo = this.nuevoRegistro();
    const actual = this.generalidadEdit();
    if (tipo === 'tipoSolicitud') {
      if (esNuevo) {
        this.generalidadesService.createTipoSolicitud({ nombre: payload.nombre, mostrarPreguntas: payload.mostrarPreguntas, activo: payload.activo })
          .then(() => this.loadAll())
          .finally(() => this.closeModal());
      } else if (actual && 'tipoSolicitudId' in actual) {
        this.generalidadesService.updateTipoSolicitud(actual.tipoSolicitudId, { nombre: payload.nombre, mostrarPreguntas: payload.mostrarPreguntas, activo: payload.activo })
          .then(() => this.loadAll())
          .finally(() => this.closeModal());
      }
    }

    if (tipo === 'estadoSolicitud') {
      if (esNuevo) {
        this.generalidadesService.createEstadoSolicitud({ nombre: payload.nombre, activo: payload.activo })
          .then(() => this.loadAll())
          .finally(() => this.closeModal());
      } else if (actual && 'estadoSolicitudId' in actual) {
        this.generalidadesService.updateEstadoSolicitud(actual.estadoSolicitudId, { nombre: payload.nombre, activo: payload.activo })
          .then(() => this.loadAll())
          .finally(() => this.closeModal());
      }
    }

    if (tipo === 'tipoAfiliacion') {
      if (esNuevo) {
        this.generalidadesService.createTipoAfiliacion({ nombre: payload.nombre, activo: payload.activo })
          .then(() => this.loadAll())
          .finally(() => this.closeModal());
      } else if (actual && 'tipoAfiliacionId' in actual) {
        this.generalidadesService.updateTipoAfiliacion(actual.tipoAfiliacionId, { nombre: payload.nombre, activo: payload.activo })
          .then(() => this.loadAll())
          .finally(() => this.closeModal());
      }
    }
  }

  deleteGeneralidad() {
    const tipo = this.tipoSeleccionado();
    const actual = this.generalidadEdit();
    if (!actual) return;

    if (tipo === 'tipoSolicitud' && 'tipoSolicitudId' in actual) {
      this.generalidadesService.deleteTipoSolicitud(actual.tipoSolicitudId)
        .then(() => this.loadAll())
        .finally(() => this.closeDeleteModal());
    }

    if (tipo === 'estadoSolicitud' && 'estadoSolicitudId' in actual) {
      this.generalidadesService.deleteEstadoSolicitud(actual.estadoSolicitudId)
        .then(() => this.loadAll())
        .finally(() => this.closeDeleteModal());
    }

    if (tipo === 'tipoAfiliacion' && 'tipoAfiliacionId' in actual) {
      this.generalidadesService.deleteTipoAfiliacion(actual.tipoAfiliacionId)
        .then(() => this.loadAll())
        .finally(() => this.closeDeleteModal());
    }
  }

  getTipoLabel(tipo: 'tipoSolicitud' | 'estadoSolicitud' | 'tipoAfiliacion') {
    if (tipo === 'tipoSolicitud') return 'Tipo Solicitud';
    if (tipo === 'estadoSolicitud') return 'Estado Solicitud';
    return 'Tipo Afiliación';
  }

  private getDefaultByTipo(tipo: 'tipoSolicitud' | 'estadoSolicitud' | 'tipoAfiliacion'): Generalidad {
    if (tipo === 'tipoSolicitud') {
      return { tipoSolicitudId: '', nombre: '', mostrarPreguntas: false, activo: true } as TipoSolicitud;
    }
    if (tipo === 'estadoSolicitud') {
      return { estadoSolicitudId: '', nombre: '', activo: true } as EstadoSolicitud;
    }
    return { tipoAfiliacionId: '', nombre: '', activo: true } as TipoAfiliacion;
  }
}
