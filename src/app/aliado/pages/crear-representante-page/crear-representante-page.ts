import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, signal, AfterViewInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { UpsertContacto } from '../../components/representante/upsert-contacto/upsert-contacto';
import { UpsertActividadLaboralFinanciera } from '../../components/representante/upsert-actividad-laboral-financiera/upsert-actividad-laboral-financiera';
import { AgenteService } from '../../../../services/terceros/agente.service';
import { ToastrService } from 'ngx-toastr';
import { ValidarDocumentoResponse } from '../../../../interfaces/terceros/agente';
import { RepresentanteService } from '../../../../services/aliado/representante.service';
import { Representante } from '../../../../interfaces/aliado/representante';
import { UpsertDatosGenerales } from '../../components/representante/upsert-datos-generales/upsert-datos-generales';
import { ClienteBantotalService } from '../../../../services/api-bantotal/cliente.service';
import { initFlowbite } from 'flowbite';


@Component({
  selector: 'app-crear-representante-page',
  imports: [CommonModule, RouterLink, UpsertDatosGenerales, UpsertContacto, UpsertActividadLaboralFinanciera],
  templateUrl: './crear-representante-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class CrearRepresentantePage implements AfterViewInit {

  private agenteService = inject(AgenteService);
  private toastr = inject(ToastrService);
  private representanteService = inject(RepresentanteService);
  private clienteService = inject(ClienteBantotalService);
  private router = inject(Router);

  frontPreview: string | ArrayBuffer | null = null;
  backPreview: string | ArrayBuffer | null = null;

  dpiFrontValidado = signal(false);
  dpiBackValidado = signal(false)
  dpiValidado = signal(false);
  intentosFallidos = signal(0);

  // Archivos originales para enviar al servicio
  frontFile: File | null = null;
  backFile: File | null = null;

  // Estados de validación
  validandoFront = signal(false);
  validandoBack = signal(false);

  // Datos extraídos del documento
  datosFrontalDPI = signal<ValidarDocumentoResponse | null>(null);
  datosReversoDPI = signal<ValidarDocumentoResponse | null>(null);
  camposBloqueados = signal(false);
  activeSection = signal<'datos' | 'contacto' | 'actividad' | null>('datos');
  llenadorManualHabilitado = signal(false);

  postCreateModalOpen = signal(false);
  lastCreatedRepresentanteId = signal<string | null>(null);

  // Datos de búsqueda Bantotal
  cuentaBT = signal<number | null>(null);
  clienteUId = signal<number | null>(null);
  buscandoCliente = signal(false);
  private debounceTimeout: any = null;


  representante = signal<Representante>(this.buildRepresentanteInicial());

  private buildRepresentanteInicial(documento: string = ''): Representante {
    return {
      representanteId: '',
      documento: documento,
      direccion: '',
      nit: '',
      correoElectronico: '',
      paisDocumento: 320,
      tipoDocumento: 1,
      primerApellido: '',
      segundoApellido: '',
      primerNombre: '',
      segundoNombre: '',
      sexo: 'M',
      etnia: 6,
      nacionalidad: 320,
      paisDomicilio: 320,
      departamentoDomicilio: 0,
      telefonoCelular: '',
      telefonoFijo: '',
    };
  }

  constructor(private cdr: ChangeDetectorRef) {
    // Effect para reinicializar Flowbite cuando se muestre el contenido
    effect(() => {
      if (this.dpiValidado() || this.llenadorManualHabilitado()) {
        // Usar setTimeout para asegurar que el DOM esté actualizado
        setTimeout(() => {
          initFlowbite();
        }, 100);
      }
    });
  }

  ngAfterViewInit(): void {
    // Inicializar Flowbite cuando la vista esté lista
    initFlowbite();
  }

  onMouseEnter(section: 'datos' | 'contacto' | 'actividad') {
    this.activeSection.set(section);
  }

  onMouseLeave() {
    // Opcional: descomentar si quieres que se cierre al salir el mouse
    // this.activeSection.set(null);
  }

  toggleLlenadoManual() {
    this.llenadorManualHabilitado.update(value => !value);

    // Si se habilita el llenado manual, desbloqueamos los campos
    if (this.llenadorManualHabilitado()) {
      this.camposBloqueados.set(false);
      if (!this.dpiValidado()) {
        this.reiniciarCampos();
      }
      // Reinicializar Flowbite después de mostrar los campos
      setTimeout(() => {
        initFlowbite();
        this.cdr.detectChanges();
      }, 100);
    }
    else {
      this.camposBloqueados.set(true);
    }
  }

  reiniciarCampos(documento: string = '') {
    this.representante.set(this.buildRepresentanteInicial(documento));

    this.cuentaBT.set(null);
    this.clienteUId.set(null);
  }

  limpiarFormularioCompleto() {
    this.reiniciarCampos();
    this.frontPreview = null;
    this.backPreview = null;
    this.frontFile = null;
    this.backFile = null;
    this.dpiFrontValidado.set(false);
    this.dpiBackValidado.set(false);
    this.dpiValidado.set(false);
    this.intentosFallidos.set(0);
    this.datosFrontalDPI.set(null);
    this.datosReversoDPI.set(null);
    this.validandoFront.set(false);
    this.validandoBack.set(false);
    this.camposBloqueados.set(false);
    this.llenadorManualHabilitado.set(false);
    this.activeSection.set('datos');
    this.buscandoCliente.set(false);

    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = null;
    }

    const frontInput = document.getElementById('frontDpiInput') as HTMLInputElement | null;
    if (frontInput) {
      frontInput.value = '';
    }

    const backInput = document.getElementById('backDpiInput') as HTMLInputElement | null;
    if (backInput) {
      backInput.value = '';
    }

    this.cdr.detectChanges();
  }

  /**
   * Verifica si el DPI está vencido comparando la fecha de vencimiento con la fecha actual
   * @returns true si la fecha de vencimiento es menor a la fecha actual
   */
  esDpiVencido(): boolean {
    const fechaVencimiento = this.representante().fechaVencimiento;
    if (!fechaVencimiento) {
      return false;
    }

    let fechaVenc: Date;
    // Si la fecha está en formato DD/MM/YYYY
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(fechaVencimiento)) {
      const [dia, mes, anio] = fechaVencimiento.split('/');
      fechaVenc = new Date(parseInt(anio, 10), parseInt(mes, 10) - 1, parseInt(dia, 10));
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(fechaVencimiento)) {
      // Si está en formato ISO
      fechaVenc = new Date(fechaVencimiento);
    } else {
      // Otro formato, intentar parsear directo
      fechaVenc = new Date(fechaVencimiento);
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    fechaVenc.setHours(0, 0, 0, 0);

    return fechaVenc < hoy;
  }

  /**
   * Buscar datos del cliente en Bantotal por documento
   * Se ejecuta con debounce de 500ms cuando el documento tiene 13 dígitos
   * Mapea automáticamente los datos obtenidos al representante
   */
  buscarClientePorDocumento(documentoSinFormato: string) {
    // Limpiar el debounce anterior si existe
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }

    // Solo buscar si tiene exactamente 13 dígitos
    if (documentoSinFormato.length !== 13) {
      this.cuentaBT.set(null);
      this.clienteUId.set(null);
      return;
    }

    // Establecer nuevo debounce de 500ms
    this.debounceTimeout = setTimeout(() => {
      this.buscandoCliente.set(true);

      this.clienteService.obtenerDatosBantotal({
        documento: documentoSinFormato,
        pais: 320,
        tipoDoc: 1
      }).subscribe({
        next: (datos) => {
          console.log('Datos de cliente encontrados:', datos);

          // Mapear datos de Bantotal al representante
          this.representante.update(current => {
            const datosActualizados = {
              ...current,
              // Datos básicos
              documento: datos.nroDocumento || current.documento,
              primerNombre: datos.primerNombre || current.primerNombre,
              segundoNombre: datos.segundoNombre || current.segundoNombre,
              primerApellido: datos.primerApellido || current.primerApellido,
              segundoApellido: datos.segundoApellido || current.segundoApellido,
              nit: '',
              // Datos personales
              fechaNacimiento: this.normalizarFecha(datos.fechaNacimiento) || current.fechaNacimiento,
              sexo: datos.sexo || current.sexo,
              nacionalidad: parseInt(datos.nacionalidadId || '320', 10),

              // Datos de contacto
              correoElectronico: datos.correoElectronico || current.correoElectronico,
              telefonoCelular: datos.telefonoCelular || current.telefonoCelular,
              telefonoFijo: datos.telefonoFijo || current.telefonoFijo,

              // Datos de domicilio
              direccion: datos.domicilio || '',
              paisDomicilio: parseInt(datos.paisDomicilioId || '320', 10),
              departamentoDomicilio: parseInt(datos.departamentoId || '0', 10),
              municipioDomicilio: datos.localidadId ? (typeof datos.localidadId === 'number' ? datos.localidadId : parseInt(datos.localidadId, 10)) : undefined,
              localidad: datos.localidadId ? (typeof datos.localidadId === 'number' ? datos.localidadId : parseInt(datos.localidadId, 10)) : undefined,
              

              // Datos de documento
              paisDocumento: parseInt(datos.paisDocumentoId || '320', 10),
              tipoDocumento: parseInt(datos.tipoDocumentoId || '1', 10),

              // Datos laborales y financieros
              ocupacion: datos.ocupacionId ? parseInt(datos.ocupacionId, 10) : undefined,
              actividadLaboral: datos.actividadLaboralId ? parseInt(datos.actividadLaboralId, 10) : undefined,
              ingresos: datos.ingresos ? parseFloat(datos.ingresos) : current.ingresos,
              fechaInicioActividad: datos.fechaInicioActividad || current.fechaInicioActividad,
              fechaVencimiento: this.normalizarFecha(datos.fechaVencimiento) || current.fechaVencimiento,
              profesion: datos.profesionId ? parseInt(datos.profesionId.toString(), 10) : current.profesion,
              etnia: datos.etniaId ? parseInt(datos.etniaId.toString(), 10) : current.etnia,
              sectorId: datos.sectorId ? parseInt(datos.sectorId.toString(), 10) : current.sectorId,
              // Estado civil (si aplica)
              estadoCivil: datos.estadoCivil ? parseInt(datos.estadoCivil.toString(), 10) : current.estadoCivil,

              // Cuenta Bantotal
              cuentaBT: datos.cuentaBT || current.cuentaBT,
              cuentaBantotal: Number(datos.cuentaBT) || current.cuentaBantotal,
              clienteUId: datos.clienteUId || current.clienteUId,
            };
            return datosActualizados;
          });

          if (datos.cuentaBT) {
            this.cuentaBT.set(datos.cuentaBT);
          }

          this.buscandoCliente.set(false);
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.log('Cliente no encontrado en Bantotal o error en búsqueda:', error.message);
          this.cuentaBT.set(null);
          this.buscandoCliente.set(false);
          this.cdr.detectChanges();
          if(!this.dpiValidado()) this.reiniciarCampos(documentoSinFormato);
        }
      });
    }, 500); // Esperar 500ms antes de hacer la búsqueda
  }

  onFrontImageSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    // Guardar el archivo para enviar al servicio
    this.frontFile = file;

    // Mostrar preview
    const reader = new FileReader();
    reader.onload = () => {
      this.frontPreview = reader.result;
      this.cdr.markForCheck();

      // Si el llenador manual está habilitado, no consultar al servicio
      if (!this.llenadorManualHabilitado()) {
        this.validarDocumentoFrontal(file);
      }
    };
    reader.readAsDataURL(file);
  }

  validarDocumentoFrontal(file: File) {
    this.validandoFront.set(true);
    this.dpiFrontValidado.set(false);

    console.log('Validando DPI frontal...');

    this.agenteService.validarDocumento({
      accion: 'dpi_frente',
      upload_file: file
    }).subscribe({
      next: (response) => {
        this.validandoFront.set(false);

        // console.log('Respuesta completa del servicio:', response);

        if (this.agenteService.isDocumentoAprobado(response)) {
          this.dpiFrontValidado.set(true);
          this.datosFrontalDPI.set(response);
          this.extraerDatosFrontales(response);
          this.toastr.success('DPI frontal validado correctamente', this.agenteService.getMensajeUsuario(response));
          if (this.llenadorManualHabilitado()) {
            this.camposBloqueados.set(false);
          }
        } else {
          this.dpiFrontValidado.set(false);
          this.intentosFallidos.update(count => count + 1);
          const mensaje = this.agenteService.getMensajeUsuario(response);
          this.toastr.error(mensaje, 'Error de validación');

          // Si ya hay 3 intentos fallidos, habilitar entrada manual
          if (this.intentosFallidos() >= 3) {
            this.dpiValidado.set(true);
            this.toastr.warning('Se habilitó el ingreso manual de datos', 'Ingreso manual');
          }
        }

        // Actualizar estado global
        //this.dpiValidado.set(this.dpfFrontValidado() && this.dpfBackValidado());
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.validandoFront.set(false);
        this.dpiFrontValidado.set(false);
        this.intentosFallidos.update(count => count + 1);
        this.toastr.error('Error al validar el documento', 'Error');

        // Si ya hay 3 intentos fallidos, habilitar entrada manual
        if (this.intentosFallidos() >= 3) {
          this.dpiValidado.set(true);
          this.toastr.warning('Se habilitó el ingreso manual de datos', 'Ingreso manual');
        }

        this.cdr.markForCheck();
      }
    });
  }

  extraerDatosFrontales(response: ValidarDocumentoResponse) {
    const datos = response.contenido_documento?.datos_especificos;
    const desglose = datos?.desglose_nombre;

    if (datos && desglose) {
      this.camposBloqueados.set(true);
      this.dpiFrontValidado.set(true);
      this.dpiValidado.set(this.dpiFrontValidado() && this.dpiBackValidado());

      // Normalizar fechas que vienen con año de 2 dígitos (0174 -> 1974)
      const fechaNacimiento = this.normalizarFecha(datos.fecha_nacimiento);
      const fechaEmision = this.normalizarFecha(datos.fecha_de_emision);

      console.log("🚀 ~ CrearRepresentantePage ~ extraerDatosFrontales ~ datos:", datos.fecha_nacimiento)
      this.representante.update(current => {
        return {
          ...current,
          documento: datos.cui_numero,
          primerNombre: desglose.nombre_1 || '',
          segundoNombre: desglose.nombre_2 || '',
          tercerNombre: desglose.nombre_3 || '',
          primerApellido: desglose.apellido_1 || '',
          segundoApellido: desglose.apellido_2 || '',
          apellidoCasada: desglose.apellido_casada || '',
          nroDocumento: datos.cui_numero || '',
          cuiVisual: datos.cui_visual || '',
          fechaNacimiento: this.normalizarFecha(fechaNacimiento),
          fechaEmision: this.normalizarFecha(fechaEmision),
          sexo: datos.sexo_codigo || '',
          nacionalidad: Number(datos.nacionalidad_pais || ''),
          camposBloqueados: true,
          // LImpiamos el resto de campos
          nit: '',
          etnia: 0,
          telefonoCelular: '',
          telefonoFijo: '',
          correoElectronico: '',
          departamentoDomicilio : 0,
          localidad: undefined,
          direccion: '',
          ocupacion: undefined,
          profesion: undefined,
          nombreEmpresa: '',
          actividadLaboral: undefined,
          fechaInicioActividad: '',
          sectorId: undefined
        };
      });

      if (this.dpiValidado() && this.representante().documento) {
        // Esperar 1 segundo antes de buscar el cliente por documento
        setTimeout(() => {
          this.buscarClientePorDocumento(this.representante().documento!);
        }, 1000);
      }

    }
  }

  // Función helper para normalizar fechas en diferentes formatos
  private normalizarFecha(fecha: string | undefined): string {
    if (!fecha) return '';

    // Detectar y convertir formato ISO (YYYY-MM-DD)
    if (fecha.includes('-')) {
      const partes = fecha.split('-');
      if (partes.length === 3) {
        const [anio, mes, dia] = partes;
        const fechaFormato = `${dia}/${mes}/${anio}`;
        return fechaFormato;
      }
    }

    // Formato esperado: DD/MM/YYYY o DD/MM/YY
    const partes = fecha.split('/');
    if (partes.length !== 3) {
      return fecha;
    }

    let [dia, mes, anio] = partes;

    // Si el año tiene 4 dígitos pero empieza con 0 (ej: 0174 -> 1974)
    if (anio.length === 4 && anio.startsWith('0')) {
      anio = '1' + anio.substring(1);
    }
    // Si el año tiene 2 dígitos (ej: 74 -> 1974)
    else if (anio.length === 2) {
      const anioNum = parseInt(anio, 10);
      // Asumir que años < 50 son 2000+, años >= 50 son 1900+
      anio = (anioNum < 50 ? '20' : '19') + anio;
    }

    const fechaFormato = `${dia}/${mes}/${anio}`;
    return fechaFormato;
  }


  onBackImageSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    // Guardar el archivo para enviar al servicio
    this.backFile = file;

    // Mostrar preview
    const reader = new FileReader();
    reader.onload = () => {
      this.backPreview = reader.result;
      this.cdr.markForCheck();

      // Si el llenador manual está habilitado, no consultar al servicio
      if (!this.llenadorManualHabilitado()) {
        this.validarDocumentoReverso(file);
      }
    };
    reader.readAsDataURL(file);
  }

  validarDocumentoReverso(file: File) {
    this.validandoBack.set(true);
    this.dpiBackValidado.set(false);

    console.log('Validando DPI reverso...');

    this.agenteService.validarDocumento({
      accion: 'dpi_reverso',
      upload_file: file
    }).subscribe({
      next: (response) => {
        this.validandoBack.set(false);

        // console.log('Respuesta completa del servicio (reverso):', response);

        if (this.agenteService.isDocumentoAprobado(response)) {
          this.dpiBackValidado.set(true);
          this.datosReversoDPI.set(response);
          this.extraerDatosReverso(response);
          this.toastr.success('DPI reverso validado correctamente', 'Éxito');
          if (this.llenadorManualHabilitado()) {
            this.camposBloqueados.set(false);
          }
        } else {
          this.dpiBackValidado.set(false);
          this.intentosFallidos.update(count => count + 1);
          const mensaje = this.agenteService.getMensajeUsuario(response);
          this.toastr.error(mensaje, 'Error de validación');

          // Si ya hay 3 intentos fallidos, habilitar entrada manual
          if (this.intentosFallidos() >= 3) {
            this.dpiValidado.set(true);
            this.toastr.warning('Se habilitó el ingreso manual de datos', 'Ingreso manual');
          }
        }

        // Actualizar estado global
        //this.dpiValidado.set(this.dpfFrontValidado() && this.dpfBackValidado());
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.validandoBack.set(false);
        this.dpiBackValidado.set(false);
        this.intentosFallidos.update(count => count + 1);
        this.toastr.error('Error al validar el documento', 'Error');

        // Si ya hay 3 intentos fallidos, habilitar entrada manual
        if (this.intentosFallidos() >= 3) {
          this.dpiValidado.set(true);
          this.toastr.warning('Se habilitó el ingreso manual de datos', 'Ingreso manual');
        }

        this.cdr.markForCheck();
      }
    });
  }

  extraerDatosReverso(response: ValidarDocumentoResponse) {
    const datos = response.contenido_documento?.datos_especificos;
    const demografia = datos?.demografia;
    const geografia = datos?.geografia;
    const seguridad = datos?.datos_seguridad;

    if (datos) {
      this.camposBloqueados.set(true);
      this.dpiBackValidado.set(true);
      this.dpiValidado.set(this.dpiFrontValidado() && this.dpiBackValidado());

      // Mapear estado civil de string a código numérico
      let estadoCivilCodigo: number | undefined;
      if (demografia?.estado_civil) {
        const estadoCivilStr = demografia.estado_civil.toUpperCase();
        if (estadoCivilStr === 'CASADO' || estadoCivilStr === 'CASADA') {
          estadoCivilCodigo = 2;
        } else if (estadoCivilStr === 'SOLTERO' || estadoCivilStr === 'SOLTERA') {
          estadoCivilCodigo = 1;
        } else if (estadoCivilStr === 'DIVORCIADO' || estadoCivilStr === 'DIVORCIADA') {
          estadoCivilCodigo = 3;
        } else if (estadoCivilStr === 'VIUDO' || estadoCivilStr === 'VIUDA') {
          estadoCivilCodigo = 4;
        } else if (estadoCivilStr === 'UNIDO' || estadoCivilStr === 'UNIDA') {
          estadoCivilCodigo = 5;
        }
      }

      // Normalizar fecha de vencimiento
      const fechaVencimiento = this.normalizarFecha(demografia?.fecha_de_vencimiento);

      this.representante.update(current => ({
        ...current,
        estadoCivil: estadoCivilCodigo,
        profesion: demografia?.profesion_oficio ? undefined : current.profesion, // Solo actualizar si tiene valor
        pueblo: demografia?.pueblo || '',
        comunidadLinguistica: demografia?.comunidad_linguistica || '',
        lugarNacimiento: geografia?.nacimiento_completo || '',
        municipioNacimiento: geografia?.nacimiento_municipio || '',
        departamentoNacimiento: geografia?.nacimiento_departamento || '',
        lugarVecindad: geografia?.vecindad_completa || '',
        municipioVecindad: geografia?.vecindad_municipio || '',
        departamentoVecindad: geografia?.vecindad_departamento || '',
        numeroSerie: seguridad?.numero_de_serie || '',
        fechaVencimiento: fechaVencimiento
      }));
    }

    if (this.dpiValidado() && this.representante().documento) {
      // Esperar 1 segundo antes de buscar el cliente por documento
      setTimeout(() => {
        this.buscarClientePorDocumento(this.representante().documento!);
      }, 1000);
    }

  }

  private isValidEmail(email: string | undefined | null): boolean {
    if (!email) return false;
    const trimmed = String(email).trim();
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(trimmed);
  }

  private sanitizeRepresentante(input: any): Representante {
    // Normalizar y seleccionar solo las propiedades válidas de la interfaz Representante
    const documento = String(input?.documento || '').replace(/\s+/g, '');
    const correo = String(input?.correoElectronico || '').trim();

    const payload: Representante = {
      representanteId: String(input?.representanteId || ''),
      direccion: String(input?.direccion || ''),
      nit: String(input?.nit || ''),
      codigoPostal: input?.codigoPostal ? String(input.codigoPostal) : undefined,
      telefonoFijo: input?.telefonoFijo ? String(input.telefonoFijo) : undefined,
      telefonoCelular: input?.telefonoCelular ? String(input.telefonoCelular) : undefined,
      correoElectronico: correo,
      asesorId: typeof input?.asesorId === 'number' ? input.asesorId : undefined,
      paisDocumento: Number(input?.paisDocumento ?? 320),
      tipoDocumento: Number(input?.tipoDocumento ?? 1),
      documento: documento || undefined,
      fechaVencimiento: input?.fechaVencimiento ? String(input.fechaVencimiento) : undefined,
      primerApellido: String(input?.primerApellido || ''),
      segundoApellido: input?.segundoApellido ? String(input.segundoApellido) : undefined,
      primerNombre: String(input?.primerNombre || ''),
      segundoNombre: input?.segundoNombre ? String(input.segundoNombre) : undefined,
      tercerNombre: input?.tercerNombre ? String(input.tercerNombre) : undefined,
      fechaNacimiento: input?.fechaNacimiento ? String(input.fechaNacimiento) : undefined,
      sexo: String(input?.sexo || 'M'),
      profesion: input?.profesion != null ? Number(input.profesion) : undefined,
      etnia: input?.etnia != null ? Number(input.etnia) : undefined,
      sabeLeer: typeof input?.sabeLeer === 'boolean' ? input.sabeLeer : undefined,
      sabeEscribir: typeof input?.sabeEscribir === 'boolean' ? input.sabeEscribir : undefined,
      estadoCivil: input?.estadoCivil != null ? Number(input.estadoCivil) : undefined,
      nacionalidad: input?.nacionalidad != null ? Number(input.nacionalidad) : undefined,
      ocupacion: input?.ocupacion != null ? Number(input.ocupacion) : undefined,
      nombreEmpresa: input?.nombreEmpresa ? String(input.nombreEmpresa) : undefined,
      actividadLaboral: input?.actividadLaboral != null ? Number(input.actividadLaboral) : undefined,
      fechaInicioActividad: input?.fechaInicioActividad ? String(input.fechaInicioActividad) : undefined,
      ingresos: input?.ingresos != null ? Number(input.ingresos) : undefined,
      sectorId: input?.sectorId != null ? Number(input.sectorId) : undefined,
      clasificacionInterna: input?.clasificacionInterna != null ? Number(input.clasificacionInterna) : undefined,
      paisDomicilio: Number(input?.paisDomicilio ?? 320),
      departamentoDomicilio: Number(input?.departamentoDomicilio ?? 1),
      localidad: input?.localidad != null ? Number(input.localidad) : undefined,
      barrio: input?.barrio != null ? Number(input.barrio) : undefined,
      cuentaBantotal: input?.cuentaBantotal ? Number(input.cuentaBantotal) : undefined,
      clienteUId: input?.clienteUId ? Number(input.clienteUId) : undefined,
      fotoFrontalDpi: input?.fotoFrontalDpi ? String(input.fotoFrontalDpi) : undefined,
      fotoReversoDpi: input?.fotoReversoDpi ? String(input.fotoReversoDpi) : undefined,
      usuarioIngreso: input?.usuarioIngreso ? String(input.usuarioIngreso) : undefined,
      created_at: input?.created_at ?? undefined,
      updated_at: input?.updated_at ?? undefined,
      deleted_at: input?.deleted_at ?? undefined,
    };

    return payload;
  }

  async onGuardar() {
    if (!this.frontPreview || !this.backPreview) {
      alert('Las fotos de DPI, de frente y reverso son obligatorias.');
      return; // Prevent saving if images are not uploaded
    }

    try {
      // Recolectar y sanitizar el payload según la interfaz Representante
      const datosCrudos = this.representante();
      const payload = this.sanitizeRepresentante(datosCrudos);

      // Validar que tengamos datos básicos requeridos
      const camposRequeridos = [
        'documento', 'primerNombre', 'primerApellido', 'fechaNacimiento', 'sexo',
        'estadoCivil', 'nacionalidad', 'etnia', 'fechaVencimiento', 'nit',
        'telefonoCelular', 'paisDomicilio', 'departamentoDomicilio', 'direccion',
        'actividadLaboral', 'sectorId', 'fechaInicioActividad', 'ingresos'
      ];

      let camposFaltantes: string[] = [];
      const payloadAny = payload as any;
      for (const campo of camposRequeridos) {
        if (
          payloadAny[campo] === undefined ||
          payloadAny[campo] === null ||
          (typeof payloadAny[campo] === 'string' && payloadAny[campo].toString().trim() === '') 
        ) {
          camposFaltantes.push(campo);
        }
      }

      if(payload.departamentoDomicilio === 0) camposFaltantes.push('departamentoDomicilio'); 
      if(payload.localidad === 0) camposFaltantes.push('municipioDomicilio'); 
      if(payload.ingresos === 0) camposFaltantes.push('ingresos'); 

      if (camposFaltantes.length > 0) {
       this.toastr.error('Por favor completa los campos requeridos: ' + camposFaltantes.join(', '), 'Campos incompletos');
        return;
      }

      // Llamar al servicio con el valor del signal (no el signal mismo)
      const resp = await this.representanteService.crearRepresentante(payload);

      if (resp?.success) {
        const nuevoRepresentanteId = resp.data?.representanteId || payload.representanteId || null;
        this.lastCreatedRepresentanteId.set(nuevoRepresentanteId);
        this.limpiarFormularioCompleto();
        this.abrirModalPostCreacion();
      } else {
        this.toastr.error(resp?.message || 'Error al crear representante', 'Error');
      }
    } catch (error: any) {
      console.error('❌ Error en onGuardar:', error);
      this.toastr.error(error?.message || 'Error inesperado', 'Error');
    }
  }

  abrirModalPostCreacion() {
    if (!this.lastCreatedRepresentanteId()) {
      this.irAListadoRepresentante();
      return;
    }

    this.postCreateModalOpen.set(true);
  }

  irAListadoRepresentante() {
    this.postCreateModalOpen.set(false);
    this.router.navigate(['/aliado/listado-representante']);
  }

  irAEmpresasRepresentante() {
    const representanteId = this.lastCreatedRepresentanteId();

    if (!representanteId) {
      this.irAListadoRepresentante();
      return;
    }

    this.postCreateModalOpen.set(false);
    this.router.navigate(['/aliado/empresas-representante', representanteId]);
  }

}
