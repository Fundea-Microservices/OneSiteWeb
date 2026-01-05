import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { UpsertContacto } from '../../components/representante/upsert-contacto/upsert-contacto';
import { UpsertActividadLaboralFinanciera } from '../../components/representante/upsert-actividad-laboral-financiera/upsert-actividad-laboral-financiera';
import { AgenteService } from '../../../../services/terceros/agente.service';
import { ToastrService } from 'ngx-toastr';
import { ValidarDocumentoResponse } from '../../../../interfaces/terceros/agente';
import { RepresentanteService } from '../../../../services/aliado/representante.service';
import { Representante } from '../../../../interfaces/aliado/representante';
import { UpsertDatosGenerales } from '../../components/representante/upsert-datos-generales/upsert-datos-generales';


@Component({
  selector: 'app-crear-representante-page',
  imports: [CommonModule, RouterLink, UpsertDatosGenerales, UpsertContacto, UpsertActividadLaboralFinanciera],
  templateUrl: './crear-representante-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class CrearRepresentantePage {

  private agenteService = inject(AgenteService);
  private toastr = inject(ToastrService);
  private representanteService = inject(RepresentanteService);

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

  
  representante = signal<Representante>({
    representanteId: '',
    documento: '',
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
    departamentoDomicilio: 1,
    telefonoCelular: '',
    telefonoFijo: '',
  });

  constructor(private cdr: ChangeDetectorRef) { }

  onMouseEnter(section: 'datos' | 'contacto' | 'actividad') {
    this.activeSection.set(section);
  }

  onMouseLeave() {
    // Opcional: descomentar si quieres que se cierre al salir el mouse
    // this.activeSection.set(null);
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
      
      // Validar con el servicio
      this.validarDocumentoFrontal(file);
    };
    reader.readAsDataURL(file);
  }

  validarDocumentoFrontal(file: File) {
    this.validandoFront.set(true);
    this.dpiFrontValidado.set(false);
    
    console.log('🔍 Validando DPI frontal...');
    
    this.agenteService.validarDocumento({
      accion: 'dpi_frente',
      upload_file: file
    }).subscribe({
      next: (response) => {
        this.validandoFront.set(false);
        
        console.log('📦 Respuesta completa del servicio:', response);
        console.log('🔍 Success:', response.metadata?.success || response.documento?.metadata?.success);
        console.log('🔍 Decision IA:', response.resumen_ejecutivo?.decision_ia || response.documento?.resumen_ejecutivo?.decision_ia);
        console.log('🔍 Mensaje:', this.agenteService.getMensajeUsuario(response));
        
        if (this.agenteService.isDocumentoAprobado(response)) {
          this.dpiFrontValidado.set(true);
          this.datosFrontalDPI.set(response);
          this.extraerDatosFrontales(response);
          this.toastr.success('DPI frontal validado correctamente',this.agenteService.getMensajeUsuario(response));
          console.log('✅ DPI frontal aprobado');
        } else {
          this.dpiFrontValidado.set(false);
          this.intentosFallidos.update(count => count + 1);
          const mensaje = this.agenteService.getMensajeUsuario(response);
          this.toastr.error(mensaje, 'Error de validación');
          console.log('❌ DPI frontal rechazado:', mensaje);
          
          // Si ya hay 3 intentos fallidos, habilitar entrada manual
          if (this.intentosFallidos() >= 3) {
            this.dpiValidado.set(true);
            this.toastr.warning('Se habilitó el ingreso manual de datos', 'Ingreso manual');
            console.log('⚠️ 3 intentos fallidos - Habilitando ingreso manual');
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
        console.error('❌ Error en validación frontal:', error);
        
        // Si ya hay 3 intentos fallidos, habilitar entrada manual
        if (this.intentosFallidos() >= 3) {
          this.dpiValidado.set(true);
          this.toastr.warning('Se habilitó el ingreso manual de datos', 'Ingreso manual');
          console.log('⚠️ 3 intentos fallidos - Habilitando ingreso manual');
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
      this.representante.update(current => ({
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
        fechaNacimiento: datos.fecha_nacimiento || '',
        fechaEmision: datos.fecha_de_emision || '',
        sexo: datos.sexo_codigo || '',
        nacionalidad: Number(datos.nacionalidad_pais || ''),
        camposBloqueados: true
      }));
      
    }
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
      
      // Validar con el servicio
      this.validarDocumentoReverso(file);
    };
    reader.readAsDataURL(file);
  }

  validarDocumentoReverso(file: File) {
    this.validandoBack.set(true);
    this.dpiBackValidado.set(false);
    
    console.log('🔍 Validando DPI reverso...');
    
    this.agenteService.validarDocumento({
      accion: 'dpi_reverso',
      upload_file: file
    }).subscribe({
      next: (response) => {
        this.validandoBack.set(false);
        
        console.log('📦 Respuesta completa del servicio (reverso):', response);
        console.log('🔍 Success:', response.metadata?.success || response.documento?.metadata?.success);
        console.log('🔍 Decision IA:', response.resumen_ejecutivo?.decision_ia || response.documento?.resumen_ejecutivo?.decision_ia);
        console.log('🔍 Mensaje:', this.agenteService.getMensajeUsuario(response));
        
        if (this.agenteService.isDocumentoAprobado(response)) {
          this.dpiBackValidado.set(true);
          this.datosReversoDPI.set(response);
          this.extraerDatosReverso(response);
          this.toastr.success('DPI reverso validado correctamente', 'Éxito');
          console.log('✅ DPI reverso aprobado');
        } else {
          this.dpiBackValidado.set(false);
          this.intentosFallidos.update(count => count + 1);
          const mensaje = this.agenteService.getMensajeUsuario(response);
          this.toastr.error(mensaje, 'Error de validación');
          console.log('❌ DPI reverso rechazado:', mensaje);
          
          // Si ya hay 3 intentos fallidos, habilitar entrada manual
          if (this.intentosFallidos() >= 3) {
            this.dpiValidado.set(true);
            this.toastr.warning('Se habilitó el ingreso manual de datos', 'Ingreso manual');
            console.log('⚠️ 3 intentos fallidos - Habilitando ingreso manual');
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
        console.error('❌ Error en validación reverso:', error);
        
        // Si ya hay 3 intentos fallidos, habilitar entrada manual
        if (this.intentosFallidos() >= 3) {
          this.dpiValidado.set(true);
          this.toastr.warning('Se habilitó el ingreso manual de datos', 'Ingreso manual');
          console.log('⚠️ 3 intentos fallidos - Habilitando ingreso manual');
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
      this.representante.update(current => ({
        ...current,
        estadoCivil: Number(demografia?.estado_civil),
        profesion: Number(demografia?.profesion_oficio || ''),
        pueblo: demografia?.pueblo || '',
        comunidadLinguistica: demografia?.comunidad_linguistica || '',
        lugarNacimiento: geografia?.nacimiento_completo || '',
        municipioNacimiento: geografia?.nacimiento_municipio || '',
        departamentoNacimiento: geografia?.nacimiento_departamento || '',
        lugarVecindad: geografia?.vecindad_completa || '',
        municipioVecindad: geografia?.vecindad_municipio || '',
        departamentoVecindad: geografia?.vecindad_departamento || '',
        numeroSerie: seguridad?.numero_de_serie || ''
      }));
      
      console.log('📋 Datos reverso extraídos:', this.representante());
    }
  }

  async onGuardar() {
    try {
      // Recolectar todos los datos del signal representante
      const datos = this.representante();

      // Normalizar documento: eliminar todos los espacios en blanco
      const documentoLimpio = (datos.documento || '').replace(/\s+/g, '');
      console.log("🚀 ~ CrearRepresentantePage ~ onGuardar ~ datos.documento:", datos.documento)
      this.representante.update(curr => ({ ...curr, documento: documentoLimpio }));

      // Usar la versión normalizada para validación y envío
      datos.documento = documentoLimpio;
      console.log("🚀 ~ CrearRepresentantePage ~ onGuardar ~ datos:", datos);
      
      // Validar que tengamos datos básicos
      if (!datos.documento || !datos.primerNombre || !datos.primerApellido) {
        this.toastr.error('Por favor completa los campos requeridos', 'Campos incompletos');
        return;
      }

      // Llamar al servicio con el valor del signal (no el signal mismo)
      const resp = await this.representanteService.crearRepresentante(datos);
      
      if (resp?.success) {
        this.toastr.success('Representante creado correctamente', 'Éxito');
        // Limpiar formulario
        this.representante.set({} as Representante);
        // Redirigir si es necesario
      } else {
        this.toastr.error(resp?.message || 'Error al crear representante', 'Error');
      }
    } catch (error: any) {
      console.error('❌ Error en onGuardar:', error);
      this.toastr.error(error?.message || 'Error inesperado', 'Error');
    }
  }

}
