import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, signal, ViewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Modal } from 'bootstrap';
import { GestionRepresentanteAccordion } from '../../components/representante/gestion-representante-accordion/gestion-representante-accordion';

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
  selector: 'app-ingreso-representante-page',
  imports: [RouterLink, GestionRepresentanteAccordion],
  templateUrl: './ingreso-representante-page.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class IngresoRepresentantePage { 
  searchMode: 'nombre' | 'documento' = 'nombre';
  isLoading = signal(false);
  formKey = signal(Date.now());
  buscador = signal('');
  nuevoRepresentante = signal(true);
  representanteEdit = signal<IEmpresa>(emptyEmpresa);

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
    // Simulamos una llamada a una API con un retraso
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Aquí podrías filtrar por el buscador
    const searchTerm = this.buscador().toLowerCase();
    if (searchTerm) {
      const filtered = this.empresasList().filter(e => 
        e.nombre.toLowerCase().includes(searchTerm)
      );
      // En una app real, aquí harías la petición filtrada
    }
    
    this.isLoading.set(false);
  }

  openModal(nuevo: boolean = true, empresa: IEmpresa = emptyEmpresa) {
    this.nuevoRepresentante.set(nuevo);
    
    if (nuevo) {
      // Si es nuevo, reiniciamos con el objeto vacío
      this.representanteEdit.set({ ...emptyEmpresa });
    } else {
      // Si es edición, usamos el objeto recibido
      this.representanteEdit.set(empresa);
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
