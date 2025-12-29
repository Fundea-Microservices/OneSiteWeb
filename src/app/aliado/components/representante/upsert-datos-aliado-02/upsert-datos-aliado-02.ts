import { ChangeDetectionStrategy, Component, type OnInit, ViewChild, ElementRef, ChangeDetectorRef, signal, inject, input, effect } from '@angular/core';
import { initFlowbite } from 'flowbite';
import { CommonModule } from '@angular/common';
import { CatalogosBantotalService } from '../../../../../services/api-bantotal/catalogos.service';
import { CatalogoSimple } from '../../../../../interfaces/api-bantotal/catalogos';
import { RepresentanteService } from '../../../../../services/aliado/representante.service';
import { CrearRepresentanteDto } from '../../../../../interfaces/aliado/representante';

@Component({
  selector: 'app-upsert-datos-aliado-02',
  imports: [CommonModule],
  templateUrl: './upsert-datos-aliado-02.html',

})
export class UpsertDatosAliado02 implements OnInit {
      // Propiedades opcionales para el DTO
      correoElectronico = signal<string>('');
      telefonoCelular = signal<number|undefined>(undefined);
      direccionRepresentante = signal<string>('');
      codigoPostal = signal<number|undefined>(undefined);
      ocupacionId = signal<number|undefined>(undefined);
      actividadLaboralId = signal<number|undefined>(undefined);
      ingresos = signal<number|undefined>(undefined);
      paisDomicilioId = signal<number|undefined>(undefined);
      departamentoId = signal<number|undefined>(undefined);
      localidadId = signal<number|undefined>(undefined);
      usrIngreso = signal<string>('admin');
      telefonoFijo = signal<number|undefined>(undefined);
      asesorId = signal<number|undefined>(undefined);
      fechaVencimiento = signal<string>('');
      profesionId = signal<number|undefined>(undefined);
      etniaId = signal<number|undefined>(undefined);
      sabeLeer = signal<string>('');
      sabeEscribir = signal<string>('');
      idNacionalidad = signal<number|undefined>(undefined);
      nombreEmpresa = signal<string>('');
      fechaInicioActividad = signal<string>('');
      sectorId = signal<number|undefined>(undefined);
      clasificacionInternaId = signal<number|undefined>(undefined);
      barrioId = signal<number|undefined>(undefined);
      cuentabanTotal = signal<number|undefined>(undefined);
    private representanteService = inject(RepresentanteService);

    // Construye el DTO y guarda el representante, solo con los campos válidos y tipado estricto
    async guardarRepresentante() {
      // Helper para fechas: convierte string a string ISO (YYYY-MM-DD) o ''
      const toIso = (d: string) => d ? new Date(d).toISOString().substring(0, 10) : '';
      // Helper para sexo: solo 'M' o 'F', default 'M'
      const sexoValue: 'M' | 'F' = this.sexo() === 'F' ? 'F' : 'M';
      // Construir DTO solo con los campos válidos
      const dto: any = {
        primerNombre: this.primerNombre(),
        primerApellido: this.primerApellido(),
        nroDocumento: this.documento().replace(/\D/g, ''),
        tipoDocumentoId: 1, // Ajusta según tu lógica
        paisDocumentoId: 320,
        fechaNacimiento: toIso(this.fechaNacimiento()),
        sexo: sexoValue,
        correoElectronico: this.correoElectronico() || '',
        telefonoCelular: this.telefonoCelular() ?? 0,
        direccionRepresentante: this.direccionRepresentante() || '',
        estadoCivilId: Number(this.estadoCivilId()) || 0,
        ocupacionId: this.ocupacionId() ?? 0,
        actividadLaboralId: this.actividadLaboralId() ?? 0,
        ingresos: this.ingresos() ?? 0,
        paisDomicilioId: this.paisDomicilioId() ?? 320,
        departamentoId: this.departamentoId() ?? 0,
        localidadId: this.localidadId() ?? 0,
        usrIngreso: this.usrIngreso() || 'admin',
      };
      // Agregar opcionales solo si existen
      if (this.segundoNombre()) dto.segundoNombre = this.segundoNombre();
      if (this.tercerNombre()) dto.tercerNombre = this.tercerNombre();
      if (this.segundoApellido()) dto.segundoApellido = this.segundoApellido();
      if (this.codigoPostal()) dto.codigoPostal = this.codigoPostal();
      if (this.telefonoFijo()) dto.telefonoFijo = this.telefonoFijo();
      if (this.asesorId()) dto.asesorId = this.asesorId();
      if (this.fechaVencimiento()) dto.fechaVencimiento = this.fechaVencimiento();
      if (this.profesionId()) dto.profesionId = this.profesionId();
      if (this.etniaId()) dto.etniaId = this.etniaId();
      if (this.sabeLeer()) dto.sabeLeer = this.sabeLeer();
      if (this.sabeEscribir()) dto.sabeEscribir = this.sabeEscribir();
      if (this.idNacionalidad()) dto.idNacionalidad = this.idNacionalidad();
      if (this.nombreEmpresa()) dto.nombreEmpresa = this.nombreEmpresa();
      if (this.fechaInicioActividad()) dto.fechaInicioActividad = this.fechaInicioActividad();
      if (this.sectorId()) dto.sectorId = this.sectorId();
      if (this.clasificacionInternaId()) dto.clasificacionInternaId = this.clasificacionInternaId();
      if (this.barrioId()) dto.barrioId = this.barrioId();
      if (this.cuentabanTotal()) dto.cuentabanTotal = this.cuentabanTotal();
      if (this.nit()) dto.nit = this.nit();
      // Lista blanca de campos válidos según el DTO
      const camposValidos = [
        'primerNombre','segundoNombre','tercerNombre','primerApellido','segundoApellido','nroDocumento','tipoDocumentoId','paisDocumentoId','fechaNacimiento','sexo','correoElectronico','telefonoCelular','direccionRepresentante','codigoPostal','telefonoFijo','asesorId','fechaVencimiento','profesionId','etniaId','sabeLeer','sabeEscribir','estadoCivilId','idNacionalidad','ocupacionId','nombreEmpresa','actividadLaboralId','fechaInicioActividad','ingresos','sectorId','clasificacionInternaId','paisDomicilioId','departamentoId','localidadId','barrioId','cuentabanTotal','usrIngreso','nit'
      ];
      const dtoFiltrado: CrearRepresentanteDto = Object.keys(dto)
        .filter(key => camposValidos.includes(key))
        .reduce((acc, key) => {
          acc[key] = dto[key];
          return acc;
        }, {} as any);
      await this.representanteService.crearRepresentante(dtoFiltrado);
    }
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

  // Se llama en el input del documento
  onDocumentoInput(event: Event): void {
    const input = (event.target as HTMLInputElement).value;
    const formatted = this.formatDocumento(input);
    this.documento.set(formatted);
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
  nacionalidad = signal<string>('GT');
  etnia = signal<string>('');

  paisDocumentoId = signal<number>(320)
  tipoDocumentoId = signal<number>(1)

  // Input de datos extraídos
  datosExtraidos = input<any>();

  // Signal para controlar bloqueo
  camposBloqueados = signal<boolean>(false);

  ngOnInit(): void {
    initFlowbite();
    this.cargarCatalogos();
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

  constructor(private cdr: ChangeDetectorRef) {
    // Effect para actualizar campos solo válidos del DTO cuando llegan datos extraídos
    effect(() => {
      const datos = this.datosExtraidos();
      if (datos && typeof datos === 'object') {
        // Solo asignar campos válidos del DTO
        if ('primerNombre' in datos) this.primerNombre.set(datos.primerNombre || '');
        if ('segundoNombre' in datos) this.segundoNombre.set(datos.segundoNombre || '');
        if ('tercerNombre' in datos) this.tercerNombre.set(datos.tercerNombre || '');
        if ('primerApellido' in datos) this.primerApellido.set(datos.primerApellido || '');
        if ('segundoApellido' in datos) this.segundoApellido.set(datos.segundoApellido || '');
        if ('fechaNacimiento' in datos) this.fechaNacimiento.set(datos.fechaNacimiento);
        if ('sexo' in datos) this.sexo.set(datos.sexo);
        if ('estadoCivilId' in datos) this.estadoCivilId.set(datos.estadoCivilId);
        if ('documento' in datos) this.documento.set(this.formatDocumento(datos.documento));
        else if ('nroDocumento' in datos) this.documento.set(this.formatDocumento(datos.nroDocumento));
        if ('correoElectronico' in datos) this.correoElectronico.set(datos.correoElectronico);
        if ('telefonoCelular' in datos) this.telefonoCelular.set(datos.telefonoCelular);
        if ('direccionRepresentante' in datos) this.direccionRepresentante.set(datos.direccionRepresentante);
        if ('codigoPostal' in datos) this.codigoPostal.set(datos.codigoPostal);
        if ('telefonoFijo' in datos) this.telefonoFijo.set(datos.telefonoFijo);
        if ('asesorId' in datos) this.asesorId.set(datos.asesorId);
        if ('paisDocumentoId' in datos) this.paisDocumentoId.set(datos.paisDocumentoId);
        if ('tipoDocumentoId' in datos) this.tipoDocumentoId.set(datos.tipoDocumentoId);
        if ('fechaVencimiento' in datos) this.fechaVencimiento.set(datos.fechaVencimiento);
        if ('profesionId' in datos) this.profesionId.set(datos.profesionId);
        if ('etniaId' in datos) this.etniaId.set(datos.etniaId);
        if ('sabeLeer' in datos) this.sabeLeer.set(datos.sabeLeer);
        if ('sabeEscribir' in datos) this.sabeEscribir.set(datos.sabeEscribir);
        if ('idNacionalidad' in datos) this.idNacionalidad.set(datos.idNacionalidad);
        if ('ocupacionId' in datos) this.ocupacionId.set(datos.ocupacionId);
        if ('nombreEmpresa' in datos) this.nombreEmpresa.set(datos.nombreEmpresa);
        if ('actividadLaboralId' in datos) this.actividadLaboralId.set(datos.actividadLaboralId);
        if ('fechaInicioActividad' in datos) this.fechaInicioActividad.set(datos.fechaInicioActividad);
        if ('ingresos' in datos) this.ingresos.set(datos.ingresos);
        if ('sectorId' in datos) this.sectorId.set(datos.sectorId);
        if ('clasificacionInternaId' in datos) this.clasificacionInternaId.set(datos.clasificacionInternaId);
        if ('paisDomicilioId' in datos) this.paisDomicilioId.set(datos.paisDomicilioId);
        if ('departamentoId' in datos) this.departamentoId.set(datos.departamentoId);
        if ('localidadId' in datos) this.localidadId.set(datos.localidadId);
        if ('barrioId' in datos) this.barrioId.set(datos.barrioId);
        if ('cuentabanTotal' in datos) this.cuentabanTotal.set(datos.cuentabanTotal);
        if ('usrIngreso' in datos) this.usrIngreso.set(datos.usrIngreso);
        if ('nit' in datos) this.nit.set(datos.nit);
        // Restaurar el bloqueo de campos si camposBloqueados viene en los datos
        if ('camposBloqueados' in datos) this.camposBloqueados.set(!!datos.camposBloqueados);
        this.cdr.markForCheck();
      }
    });
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
    const civ = this.estadoCivil;

    this.mostrarConyuge = civ === 'Casado/a' || civ === 'Unión de hecho';

    // 🔥 NECESARIO porque estás usando OnPush
    this.cdr.markForCheck();
  }

  seleccionarArchivo() {
    this.fileInput.nativeElement.click(); // abre el explorador de archivos
  }

  archivoSeleccionado(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;



    // Simulación de procesamiento
    setTimeout(() => {
      this.mostrarToast("Cargando archivo: " + file.name, "success");

    }, 1500);
  }


  mostrarToast(mensaje: string, tipo: 'info' | 'success' | 'error' = 'info') {
    const contenedor = document.getElementById('toast-container');

    const toast = document.createElement('div');
    toast.className = `
    flex items-center gap-3 px-4 py-3 rounded shadow-lg text-white 
    animate-slide-in
    ${tipo === 'info' ? 'bg-green-600' : ''}
    ${tipo === 'success' ? 'bg-green-600' : ''}
    ${tipo === 'error' ? 'bg-red-600' : ''}
  `;

    toast.innerHTML = `
    <div class="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
    <span>${mensaje}</span>
  `;

    contenedor?.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('animate-fade-out');
      setTimeout(() => toast.remove(), 400);
    }, 2000);
  }

}
