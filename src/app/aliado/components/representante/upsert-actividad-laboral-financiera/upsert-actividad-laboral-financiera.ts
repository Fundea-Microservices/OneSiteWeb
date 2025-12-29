import { ChangeDetectionStrategy, Component, type OnInit, signal, inject, input, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { initFlowbite } from 'flowbite';
import { CatalogosBantotalService } from '../../../../../services/api-bantotal/catalogos.service';
import { CatalogoSimple } from '../../../../../interfaces/api-bantotal/catalogos';

@Component({
  selector: 'app-upsert-actividad-laboral-financiera',
  imports: [CommonModule],
  templateUrl: './upsert-actividad-laboral-financiera.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpsertActividadLaboralFinanciera implements OnInit {

  private catalogosService = inject(CatalogosBantotalService);

  // Catálogos
  ocupaciones = signal<CatalogoSimple[]>([]);
  actividadesLaborales = signal<CatalogoSimple[]>([]);
  sectores = signal<CatalogoSimple[]>([]);
  
  selectedOcupacionId = signal<string>('');
  selectedSectorId = signal<string>('');

  // Campos
  profesion = signal<string>('');
  actividadLaboralId = signal<string>('');

  // Input de datos extraídos
  datosExtraidos = input<any>();

  ngOnInit(): void {
     initFlowbite();
     this.cargarCatalogos();
   }

  constructor() {
    // Effect para llenar profesión si está disponible en datos extraídos
    effect(() => {
      const datos = this.datosExtraidos();
      if (datos && datos.profesion) {
        this.profesion.set(datos.profesion);
        console.log('💼 Profesión cargada automáticamente');
      }
    });
  }

  cargarCatalogos() {
    const ocupaciones = this.catalogosService.obtenerLocal('ocupacion');
    if (ocupaciones) {
      this.ocupaciones.set(ocupaciones);
    }
    
    const actividadesLaborales = this.catalogosService.obtenerLocal('actividad_laboral');
    if (actividadesLaborales) {
      this.actividadesLaborales.set(actividadesLaborales);
    }
    
    const sectores = this.catalogosService.obtenerLocal('sector');
    if (sectores) {
      this.sectores.set(sectores);
    }
  }

  // Método para validar si todos los campos requeridos están completos
  isValid(): boolean {
    return !!(
      this.selectedOcupacionId() &&
      this.actividadLaboralId()
    );
  }

}
