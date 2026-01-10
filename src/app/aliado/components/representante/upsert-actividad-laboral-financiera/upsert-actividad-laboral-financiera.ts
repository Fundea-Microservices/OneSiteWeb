import { ChangeDetectionStrategy, Component, type OnInit, AfterViewInit, signal, inject, input, effect, model, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { initFlowbite } from 'flowbite';
import { CatalogosBantotalService } from '../../../../../services/api-bantotal/catalogos.service';
import { CatalogoSimple } from '../../../../../interfaces/api-bantotal/catalogos';
import { Representante } from '../../../../../interfaces/aliado/representante';

@Component({
  selector: 'app-upsert-actividad-laboral-financiera',
  imports: [CommonModule],
  templateUrl: './upsert-actividad-laboral-financiera.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpsertActividadLaboralFinanciera implements OnInit, AfterViewInit {

  private catalogosService = inject(CatalogosBantotalService);
  representante = model<Representante | null>(null);
  camposBloqueados = input<boolean>(false);

  // Catálogos
  ocupaciones = signal<CatalogoSimple[]>([]);
  actividadesLaborales = signal<CatalogoSimple[]>([]);
  sectores = signal<CatalogoSimple[]>([]);
  profesiones = signal<CatalogoSimple[]>([]);
  
  selectedOcupacionId = signal<string>('');
  selectedSectorId = signal<string>('');
  nombreEmpresa = signal<string>('');
  fechaInicioActividad = signal<string>('');
  ingresos = signal<number>(0);
  
  // Campos
  profesion = signal<string>('');
  actividadLaboral = signal<string>('');

  // Input de datos extraídos
  datosExtraidos = input<any>();

  ngOnInit(): void {
     initFlowbite();
     this.cargarCatalogos();
   }

  ngAfterViewInit(): void {
    // Reinicializar Flowbite después de que la vista esté lista
    initFlowbite();
  }

  constructor() {
    // Effect para sincronizar cambios del representante al componente
    effect(() => {
      const rep = this.representante();
      if (rep) {
        this.selectedOcupacionId.set(rep.ocupacion?.toString() || '');
        this.actividadLaboral.set(rep.actividadLaboral?.toString() || '');
        this.selectedSectorId.set(rep.sectorId?.toString() || '');
        this.profesion.set(rep.profesion?.toString() || '');
        this.nombreEmpresa.set(rep.nombreEmpresa?.toString() || '');
        this.ingresos.set(rep.ingresos || 0);
        this.fechaInicioActividad.set(rep.fechaInicioActividad || '');
      }
    });

    // Effect para sincronizar cambios del componente al representante sin ciclar
    effect(() => {
      const rep = untracked(() => this.representante());
      if (rep) {
        this.representante.set({
          ...rep,
          ocupacion: this.selectedOcupacionId() ? Number(this.selectedOcupacionId()) : undefined,
          actividadLaboral: this.actividadLaboral() ? Number(this.actividadLaboral()) : undefined,
          sectorId: this.selectedSectorId() ? Number(this.selectedSectorId()) : undefined,
          profesion: this.profesion() ? Number(this.profesion()) : undefined,
          nombreEmpresa: this.nombreEmpresa() ? this.nombreEmpresa() : undefined,
          fechaInicioActividad:this.fechaInicioActividad() || '',
          ingresos: this.ingresos() ? this.ingresos() : 0
        });
      }
    });

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
    
    const profesiones = this.catalogosService.obtenerLocal('profesion');
    if (profesiones) {
      this.profesiones.set(profesiones);
    }
  }

  // Método para validar si todos los campos requeridos están completos
  isValid(): boolean {
    return !!(
      this.selectedOcupacionId() &&
      this.actividadLaboral()
    );
  }

}
