import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, signal, ViewChild, inject, ChangeDetectorRef } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { Modal } from 'bootstrap';
import { GestionRepresentanteAccordion } from '../../components/representante/gestion-representante-accordion/gestion-representante-accordion';
import { RepresentanteService } from '../../../../services/aliado/representante.service';
import { Representante } from '../../../../interfaces/aliado/representante';
import { DatePipe } from '@angular/common';
import { PaginationAllComponent } from '../../../shared/components/pagination-all/pagination-all';
import { AuthService } from '../../../../services/auth.service';

export interface IEmpresa {
  empresaId?: string;
  nombre: string;
  direccion: string;
  nit: string;
  telefono: string;
  activo: boolean;
}


const emptyEmpresa: IEmpresa = {
  empresaId: '',
  nombre: '',
  direccion: '',
  nit: '',
  telefono: '',
  activo: true,
}

@Component({
  selector: 'app-listado-representante-page',
  imports: [RouterLink, GestionRepresentanteAccordion, PaginationAllComponent],
  templateUrl: './listado-representante-page.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ListadoRepresentantePage { 
  private representanteService = inject(RepresentanteService);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);

  private isFirstLoad = true;

  get usuarioId(): string {
    return this.authService.getUserStorage().userId;
  }

  searchMode: 'nombre' | 'documento' = 'nombre';
  isLoading = signal(false);
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  formKey = signal(Date.now());
  buscador = signal('');
  nuevoRepresentante = signal(true);
  representanteEdit = signal<Representante | null>(null);

  // Nuevos signals para representantes
  representantesList = signal<Representante[]>([]);
  tipoDocumento = signal<number>(1); // 1 = DPI, 2 = NIT
  nroDocumento = signal<string>('');
  pagination = signal<IPagination>({ page: 1, pageSize: 10, totalItems: 0 });

  @ViewChild('upsertRepresentanteModal') modalElementRef!: ElementRef;
  private modalUpsertInstance!: bootstrap.Modal;

  modal = signal({
    titulo: 'Crear Representante',
    visible: false,
  });

  modalOtroUsuarioOpen = signal(false);
  rutaPendiente = signal<string[] | null>(null);

  
  empresasList = signal<IEmpresa[]>([

    {
      empresaId: '3',
      nombre: 'Paola Citán',
      direccion: '6543789210101',
      nit: 'Individual',
      telefono: '2456-7890',
      activo: false
    }
  ]);

  ngOnInit() {
    this.fetchData();
  }

  ngAfterViewInit() {
    this.modalUpsertInstance = new Modal(this.modalElementRef.nativeElement);
  }

  async fetchData() {
    if (this.isLoading()) return;
    
    this.isLoading.set(true);

    try {
      let resultado;

      // Normalizar número (quita espacios en blanco)
      const numeroDoc = (this.nroDocumento() || '').replace(/\s+/g, '');

      const usuarioId = this.isFirstLoad ? (this.authService.getUserStorage().userId || undefined) : undefined;
      this.isFirstLoad = false;

      if (this.searchMode === 'nombre') {
        // Búsqueda por nombre/apellido
        resultado = await this.representanteService.listarRepresentantes({
          busqueda: this.buscador() || undefined,
          activo: true,
          page: this.pagination().page,
          limit: this.pagination().pageSize,
          usuarioId
        });
      } else {
        // Búsqueda por documento
        resultado = await this.representanteService.listarRepresentantes({
          documento: numeroDoc || undefined,
          tipoDocumento: this.tipoDocumento(),
          activo: true,
          // Si es NIT (2), envía también el nit normalizado
          nit: this.tipoDocumento() === 2 ? numeroDoc || undefined : undefined,
          page: this.pagination().page,
          limit: this.pagination().pageSize,
          usuarioId
        });
      }

      if (resultado?.data?.representantes) {
        this.representantesList.set(resultado.data.representantes);        
        // Actualizar metadata de paginación
        if (resultado.metadata) {
          const metadata = resultado.metadata;
          this.pagination.set({
            page: metadata.page || 1,
            pageSize: metadata.limit || 10,
            totalItems: metadata.total || 0
          });
        }
      } else {
        this.representantesList.set([]);
        this.pagination.set({ page: 1, pageSize: 10, totalItems: 0 });
        console.warn('⚠️ No se encontraron representantes');
      }

      this.cdr.markForCheck();
    } catch (error) {
      console.error('❌ Error en fetchData:', error);
      this.representantesList.set([]);
    } finally {
      this.isLoading.set(false);
      this.cdr.markForCheck();
    }
  }

  openModal(nuevo: boolean = true, representante?: Representante) {
    this.nuevoRepresentante.set(nuevo);
    
    if (nuevo) {
      // Si es nuevo, reiniciamos con null
      this.representanteEdit.set(null);
    } else {
      // Si es edición, usamos el objeto recibido
      this.representanteEdit.set(representante || null);
    }
    
    this.formKey.set(Date.now()); // esto obliga al componente hijo a resetear
    this.modal.set({ titulo: nuevo ? 'Crear Representante' : 'Actualizar Representante', visible: true });
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

  onAccionRepresentante(tipo: 'editar' | 'empresas', item: Representante) {
    const ruta = tipo === 'editar'
      ? ['/aliado/editar-representante', item.representanteId]
      : ['/aliado/empresas-representante', item.representanteId];

    if (item.usuarioId && item.usuarioId !== this.usuarioId) {
      this.rutaPendiente.set(ruta);
      this.modalOtroUsuarioOpen.set(true);
    } else {
      this.router.navigate(ruta);
    }
  }

  confirmarNavegacion() {
    const ruta = this.rutaPendiente();
    this.modalOtroUsuarioOpen.set(false);
    this.rutaPendiente.set(null);
    if (ruta) this.router.navigate(ruta);
  }

  cancelarNavegacion() {
    this.modalOtroUsuarioOpen.set(false);
    this.rutaPendiente.set(null);
  }

  onBuscadorInput(value: string): void {
    this.buscador.set(value);
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.fetchData(), 1000);
  }

  onChangePage(newPagination: IPagination) {
    this.pagination.set(newPagination);
    this.fetchData();
  }
}
