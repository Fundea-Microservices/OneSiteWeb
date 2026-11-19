import { ChangeDetectionStrategy, Component, type OnInit, ViewChild, ElementRef, ChangeDetectorRef, signal, inject, input, effect, model, untracked, AfterViewInit, output } from '@angular/core';
import { initFlowbite } from 'flowbite';
import { CommonModule } from '@angular/common';
import { CatalogosBantotalService } from '../../../../../services/api-bantotal/catalogos.service';
import { CatalogoSimple } from '../../../../../interfaces/api-bantotal/catalogos';
import { RepresentanteService } from '../../../../../services/aliado/representante.service';
import { Representante } from '../../../../../interfaces/aliado/representante';
import { FechaInput } from '../../../../shared/components/fecha-input/fecha-input';

@Component({
  selector: 'app-upsert-datos-generales',
  imports: [CommonModule, FechaInput],
  templateUrl: './upsert-datos-generales.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpsertDatosGenerales implements OnInit, AfterViewInit {
  representante = model<Representante | null>(null);
  camposBloqueados = input<boolean>(false);
  cuentaBT = input<number | null>(null);
  clienteUId = input<number | null>(null);
  buscandoCliente = input<boolean>(false);
  llenadorManualHabilitado = input<boolean>(false);
  mostrarAlertaDocumento = signal(false);
  private ignorarSiguienteClick = false;
  
  // Output para emitir cambios del documento sin formato
  documentoSinFormatoChange = output<string>();

  // Formatea el documento en el formato #### ##### ####
  formatDocumento(value: string): string {
    // Elimina todo lo que no sea dígito
    const digits = value.replace(/\D/g, '');
    // Aplica el formato
    let formatted = '';
    if (digits.length > 0) {
      formatted += digits.substring(0, 4);
    }
    if (digits.length > 4) {
      formatted += ' ' + digits.substring(4, 9);
    }
    if (digits.length > 9) {
      formatted += ' ' + digits.substring(9, 13);
    }
    return formatted.trim();
  }

  onDocumentoClick(): void {
    if (this.ignorarSiguienteClick) {
      this.ignorarSiguienteClick = false;
      return;
    }
    if (this.llenadorManualHabilitado() && this.documento()) {
      this.mostrarAlertaDocumento.set(true);
    }
  }

  cerrarAlertaDocumento(): void {
    this.ignorarSiguienteClick = true;
    this.mostrarAlertaDocumento.set(false);
  }

  // Se llama en el input del documento
  onDocumentoInput(event: Event): void {
    const input = (event.target as HTMLInputElement).value;
    const formatted = this.formatDocumento(input);
    this.documento.set(formatted);
    
    // Emitir el documento sin formato para búsqueda en Bantotal
    const documentoSinFormato = formatted.replace(/\s/g, '');
    this.documentoSinFormatoChange.emit(documentoSinFormato);
  }

  @ViewChild('fileIn') fileInput!: ElementRef;
  @ViewChild('fileInputFront') fileInputFront!: ElementRef;
  @ViewChild('fileInputBack') fileInputBack!: ElementRef;

  private catalogosService = inject(CatalogosBantotalService);

  estadoCivil: string = "";
  mostrarConyuge: boolean = false;

  // Catálogos
  estadosCiviles = signal<CatalogoSimple[]>([]);
  etnias = signal<CatalogoSimple[]>([]);

  // Campos requeridos
  documento = signal<string>('');
  primerNombre = signal<string>('');
  segundoNombre = signal<string>('');
  tercerNombre = signal<string>('');
  primerApellido = signal<string>('');
  segundoApellido = signal<string>('');
  fechaNacimiento = signal<string>('');
  nit = signal<string>('');
  sexo = signal<string>('');
  estadoCivilId = signal<string>('');
  nacionalidad = signal<number>(320);
  etnia = signal<number>(6);
  fechaVencimiento = signal<string>('');

  paisDocumento = signal<number>(320)
  tipoDocumento = signal<number>(1)

  // Input de datos extraídos
  datosExtraidos = input<any>();


  constructor() {
    // Effect para sincronizar cambios del representante al componente
    effect(() => {
      const rep = this.representante();
      if (rep) {
        this.documento.set(rep.documento || '');
        this.primerNombre.set(rep.primerNombre || '');
        this.segundoNombre.set(rep.segundoNombre || '');
        this.tercerNombre.set(rep.tercerNombre || '');
        this.primerApellido.set(rep.primerApellido || '');
        this.segundoApellido.set(rep.segundoApellido || '');
        this.fechaNacimiento.set(rep.fechaNacimiento || '');
        this.fechaVencimiento.set(rep.fechaVencimiento || '');
        this.nit.set(rep.nit || '');
        this.sexo.set(rep.sexo || '');
        this.etnia.set(rep.etnia || 6);
        this.nacionalidad.set(rep.nacionalidad || 320);
        if(rep.estadoCivil?.toString()){
          if(rep.estadoCivil.toString() == "CASADO" || rep.estadoCivil.toString() == "CASADA" || rep.estadoCivil.toString() == "2"){
            this.estadoCivilId.set("2")
          }
          if(rep.estadoCivil.toString() == "SOLTERO" || rep.estadoCivil.toString() == "SOLTERA" || rep.estadoCivil.toString() == "1"){
            this.estadoCivilId.set("1")
          }

        }
        this.paisDocumento.set(rep.paisDocumento || 320);
        this.tipoDocumento.set(rep.tipoDocumento || 1);        
      }
    });

    // Effect para sincronizar cambios del componente al representante sin ciclar
    effect(() => {
      const rep = untracked(() => this.representante());
      if (rep) {
        this.representante.set({
          ...rep,
          documento: this.documento(),
          primerNombre: this.primerNombre(),
          segundoNombre: this.segundoNombre(),
          tercerNombre: this.tercerNombre(),
          primerApellido: this.primerApellido(),
          segundoApellido: this.segundoApellido(),
          fechaNacimiento: this.fechaNacimiento() || '',
          fechaVencimiento: this.fechaVencimiento() || '',
          nit: this.nit(),
          sexo: this.sexo(),
          etnia: this.etnia(),
          nacionalidad: this.nacionalidad(),
          estadoCivil: this.estadoCivilId() ? Number(this.estadoCivilId()) : undefined,
          paisDocumento: this.paisDocumento(),
          tipoDocumento: this.tipoDocumento()
        });
      }
    });
  }

  ngOnInit(): void {
    initFlowbite();
    this.cargarCatalogos();
  }

  ngAfterViewInit(): void {
    // Reinicializar Flowbite después de que la vista esté lista
    initFlowbite();
  }

  // Método para validar si todos los campos requeridos están completos
  isValid(): boolean {
    return !!(
      this.documento() &&
      this.primerNombre() &&
      this.primerApellido() &&
      this.segundoApellido() &&
      this.fechaNacimiento() &&
      this.nit() &&
      this.sexo() &&
      this.estadoCivilId()
    );
  }

  cargarCatalogos() {
    const estadosCiviles = this.catalogosService.obtenerLocal('estado_civil');
    if (estadosCiviles) {
      this.estadosCiviles.set(estadosCiviles);
    }

    const etnias = this.catalogosService.obtenerLocal('etnia');
    if (etnias) {
      this.etnias.set(etnias);
    }
  }

  onEstadoCivilChange() {
    
  }

  /**
   * Convierte una fecha en formato DD/MM/YYYY a YYYY-MM-DD para el input type="date"
   */
  toISODate(fecha: string | undefined | null): string {
    if (!fecha) return '';
    const partes = fecha.split('/');
    if (partes.length === 3) {
      const [dia, mes, anio] = partes;
      // Si el año tiene solo 2 dígitos, asume 19xx o 20xx
      let year = anio;
      if (anio.length === 2) {
        year = (parseInt(anio, 10) < 50 ? '20' : '19') + anio;
      }
      return `${year}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
    }
    // Si ya está en formato ISO, regresa igual
    if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return fecha;
    return '';
  }

  /**
   * Convierte una fecha en formato YYYY-MM-DD a DD/MM/YYYY para mostrar en la app
   */
  toDisplayDate(fecha: string | undefined | null): string {
    if (!fecha) return '';
    const partes = fecha.split('-');
    if (partes.length === 3) {
      const [anio, mes, dia] = partes;
      return `${dia}/${mes}/${anio}`;
    }
    // Si ya está en formato DD/MM/YYYY, regresa igual
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(fecha)) return fecha;
    return '';
  }




}
