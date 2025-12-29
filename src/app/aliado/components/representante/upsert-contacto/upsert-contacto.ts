import { ChangeDetectionStrategy, Component, type OnInit, signal, inject, computed, input, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CatalogosBantotalService } from '../../../../../services/api-bantotal/catalogos.service';
import { CatalogoSimple } from '../../../../../interfaces/api-bantotal/catalogos';

@Component({
  selector: 'app-upsert-contacto',
  imports: [CommonModule],
  templateUrl: './upsert-contacto.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpsertContacto implements OnInit {

  private catalogosService = inject(CatalogosBantotalService);

  // Catálogos
  paises = signal<CatalogoSimple[]>([]);
  departamentos = signal<CatalogoSimple[]>([]);
  municipios = signal<CatalogoSimple[]>([]);

  // Valores seleccionados
  selectedPaisCode = signal<string>('320');
  selectedDepartamentoCode = signal<string>('1');
  selectedMunicipioId = signal<string>('');

  // Campos requeridos
  telefonoCelular = signal<string>('');
  correoElectronico = signal<string>('');
  direccionCompleta = signal<string>('');

  // Input de datos extraídos
  datosExtraidos = input<any>();

  // Filtros computados
  departamentosFiltrados = computed(() => {
    const paisId = (this.paises().find(p => p.valorCore === this.selectedPaisCode()))?.catalogoId;
    if (!paisId) return [];
    
    const pais = this.paises().find(p => p.catalogoId === paisId);
    if (!pais) return [];
    
    return this.departamentos().filter(d => d.padreValorCore === pais.valorCore);
  });

  municipiosFiltrados = computed(() => {
    const deptoId = (this.departamentos().find(p => p.valorCore === this.selectedDepartamentoCode()))?.catalogoId;
    if (!deptoId) return [];
    
    const depto = this.departamentos().find(d => d.catalogoId === deptoId);
    if (!depto) return [];
    
    return this.municipios().filter(m => m.padreValorCore === depto.valorCore);
  });

  ngOnInit(): void {
    this.cargarCatalogos();
  }

  constructor() {
    // Effect para mapear geografía cuando llegan datos extraídos
    effect(() => {
      const datos = this.datosExtraidos();
      if (datos && datos.departamentoVecindad) {
        // Buscar departamento por nombre
        const depto = this.departamentos().find(d => 
          d.nombre.toLowerCase().includes(datos.departamentoVecindad.toLowerCase())
        );
        
        if (depto) {
          this.selectedDepartamentoCode.set(depto.valorCore);
          
          // Buscar municipio después de seleccionar departamento
          setTimeout(() => {
            if (datos.municipioVecindad) {
              const muni = this.municipios().find(m => 
                m.nombre.toLowerCase().includes(datos.municipioVecindad.toLowerCase()) &&
                m.padreValorCore === depto.valorCore
              );
              
              if (muni) {
                this.selectedMunicipioId.set(muni.catalogoId);
              }
            }
          }, 100);
        }
        
        console.log('📍 Datos de ubicación cargados automáticamente');
      }
    });
  }

  cargarCatalogos() {
    const paises = this.catalogosService.obtenerLocal('pais');
    const departamentos = this.catalogosService.obtenerLocal('departamento');
    const municipios = this.catalogosService.obtenerLocal('municipio');

    if (paises) {
      this.paises.set(paises);
      
      // Seleccionar automáticamente Guatemala (valorCore = 320)
      const guatemala = paises.find(p => p.valorCore === '320');
      if (guatemala) {
        this.selectedPaisCode.set(guatemala.valorCore);
      }
    }
    
    if (departamentos) this.departamentos.set(departamentos);
    if (municipios) this.municipios.set(municipios);
    console.log("PAIS SELECTED: ", this.selectedPaisCode());
    
  }

  onPaisChange() {
    // Limpiar selecciones dependientes
    this.selectedDepartamentoCode.set('');
    this.selectedMunicipioId.set('');
    console.log("PAIS SELECTED 2: ", this.selectedPaisCode());
  }

  onDepartamentoChange() {
    // Limpiar municipio cuando cambia departamento
    this.selectedMunicipioId.set('');
  }

  // Método para validar si todos los campos requeridos están completos
  isValid(): boolean {
    return !!(
      this.telefonoCelular() &&
      this.selectedPaisCode() &&
      this.selectedDepartamentoCode() &&
      this.selectedMunicipioId() &&
      this.direccionCompleta()
    );
  }

}
