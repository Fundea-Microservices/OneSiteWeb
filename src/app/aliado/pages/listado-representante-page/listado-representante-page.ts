import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, signal, ViewChild, inject, ChangeDetectorRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Modal } from 'bootstrap';
import { GestionRepresentanteAccordion } from '../../components/representante/gestion-representante-accordion/gestion-representante-accordion';
import { RepresentanteService } from '../../../../services/aliado/representante.service';
import { Representante } from '../../../../interfaces/aliado/representante';
import { DatePipe } from '@angular/common';

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
  imports: [RouterLink, GestionRepresentanteAccordion, RouterLink],
  templateUrl: './listado-representante-page.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ListadoRepresentantePage { 
  private representanteService = inject(RepresentanteService);
  private cdr = inject(ChangeDetectorRef);

  searchMode: 'nombre' | 'documento' = 'nombre';
  isLoading = signal(false);
  formKey = signal(Date.now());
  buscador = signal('');
  nuevoRepresentante = signal(true);
  representanteEdit = signal<Representante | null>(null);

  // Nuevos signals para representantes
  representantesList = signal<Representante[]>([]);
  tipoDocumento = signal<number>(1); // 1 = DPI, 2 = NIT
  nroDocumento = signal<string>('');

  @ViewChild('upsertRepresentanteModal') modalElementRef!: ElementRef;
  private modalUpsertInstance!: bootstrap.Modal;

  modal = signal({
    titulo: 'Crear Representante',
    visible: false,
  });

  
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
    console.log('🔍 Buscando representantes...', {
      modo: this.searchMode,
      busqueda: this.buscador(),
      documento: this.nroDocumento(),
      tipoDoc: this.tipoDocumento()
    });

    try {
      let resultado;

      // Normalizar número (quita espacios en blanco)
      const numeroDoc = (this.nroDocumento() || '').replace(/\s+/g, '');

      if (this.searchMode === 'nombre') {
        // Búsqueda por nombre/apellido
        resultado = await this.representanteService.listarRepresentantes({
          busqueda: this.buscador() || undefined,
          activo: true,
          page: 1,
          limit: 50
        });
      } else {
        // Búsqueda por documento
        resultado = await this.representanteService.listarRepresentantes({
          documento: numeroDoc || undefined,
          tipoDocumento: this.tipoDocumento(),
          activo: true,
          // Si es NIT (2), envía también el nit normalizado
          nit: this.tipoDocumento() === 2 ? numeroDoc || undefined : undefined,
          page: 1,
          limit: 50
        });
      }

      if (resultado?.data?.representantes) {
        this.representantesList.set(resultado.data.representantes);
        console.log(`✅ ${resultado.data.representantes.length} representante(s) encontrado(s)`);
      } else {
        this.representantesList.set([]);
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
}
