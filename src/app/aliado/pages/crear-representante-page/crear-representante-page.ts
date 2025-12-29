import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UpsertDatosAliado02 } from '../../components/representante/upsert-datos-aliado-02/upsert-datos-aliado-02';
import { UpsertContacto } from '../../components/representante/upsert-contacto/upsert-contacto';
import { UpsertActividadLaboralFinanciera } from '../../components/representante/upsert-actividad-laboral-financiera/upsert-actividad-laboral-financiera';
import { AgenteService } from '../../../../services/terceros/agente.service';
import { ToastrService } from 'ngx-toastr';
import { ValidarDocumentoResponse } from '../../../../interfaces/terceros/agente';
import { RepresentanteService } from '../../../../services/aliado/representante.service';

@Component({
  selector: 'app-crear-representante-page',
  imports: [RouterLink, UpsertDatosAliado02, UpsertContacto, UpsertActividadLaboralFinanciera],
  templateUrl: './crear-representante-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class CrearRepresentantePage {

  private agenteService = inject(AgenteService);
  private toastr = inject(ToastrService);
  private representanteService = inject(RepresentanteService);

  frontPreview: string | ArrayBuffer | null = null;
  backPreview: string | ArrayBuffer | null = null;

  dpfFrontValidado = signal(false);
  dpfBackValidado = signal(false)
  dpiValidado = signal(true);

  // Archivos originales para enviar al servicio
  frontFile: File | null = null;
  backFile: File | null = null;

  // Estados de validación
  validandoFront = signal(false);
  validandoBack = signal(false);

  // Datos extraídos del documento
  datosFrontalDPI = signal<ValidarDocumentoResponse | null>(null);
  datosReversoDPI = signal<ValidarDocumentoResponse | null>(null);

  // Objeto representante con datos extraídos
  datosRepresentante = signal({
    // Datos del frontal
    primerNombre: '',
    segundoNombre: '',
    tercerNombre: '',
    primerApellido: '',
    segundoApellido: '',
    apellidoCasada: '',
    nroDocumento: '',
    cuiVisual: '',
    fechaNacimiento: '',
    fechaEmision: '',
    sexo: '',
    nacionalidad: '',
    
    // Datos del reverso
    estadoCivil: '',
    profesion: '',
    pueblo: '',
    comunidadLinguistica: '',
    lugarNacimiento: '',
    municipioNacimiento: '',
    departamentoNacimiento: '',
    lugarVecindad: '',
    municipioVecindad: '',
    departamentoVecindad: '',
    numeroSerie: '',
    
    // Campos de validación
    camposBloqueados: false
  });

  // Efecto para dpiValidado si los dos previews están listos


  activeSection = signal<'datos' | 'contacto' | 'actividad' | null>('datos');

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
    this.dpfFrontValidado.set(false);
    
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
          this.dpfFrontValidado.set(true);
          this.datosFrontalDPI.set(response);
          this.extraerDatosFrontales(response);
          this.toastr.success('DPI frontal validado correctamente', 'Éxito');
          console.log('✅ DPI frontal aprobado');
        } else {
          this.dpfFrontValidado.set(false);
          const mensaje = this.agenteService.getMensajeUsuario(response);
          this.toastr.error(mensaje, 'Error de validación');
          console.log('❌ DPI frontal rechazado:', mensaje);
        }
        
        // Actualizar estado global
        //this.dpiValidado.set(this.dpfFrontValidado() && this.dpfBackValidado());
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.validandoFront.set(false);
        this.dpfFrontValidado.set(false);
        this.toastr.error('Error al validar el documento', 'Error');
        console.error('❌ Error en validación frontal:', error);
        this.cdr.markForCheck();
      }
    });
  }

  extraerDatosFrontales(response: ValidarDocumentoResponse) {
    const datos = response.contenido_documento?.datos_especificos;
    const desglose = datos?.desglose_nombre;
    
    if (datos && desglose) {
      this.datosRepresentante.update(current => ({
        ...current,
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
        nacionalidad: datos.nacionalidad_pais || '',
        camposBloqueados: true
      }));
      
      console.log('📋 Datos frontales extraídos:', this.datosRepresentante());
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
    this.dpfBackValidado.set(false);
    
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
          this.dpfBackValidado.set(true);
          this.datosReversoDPI.set(response);
          this.extraerDatosReverso(response);
          this.toastr.success('DPI reverso validado correctamente', 'Éxito');
          console.log('✅ DPI reverso aprobado');
        } else {
          this.dpfBackValidado.set(false);
          const mensaje = this.agenteService.getMensajeUsuario(response);
          this.toastr.error(mensaje, 'Error de validación');
          console.log('❌ DPI reverso rechazado:', mensaje);
        }
        
        // Actualizar estado global
        //this.dpiValidado.set(this.dpfFrontValidado() && this.dpfBackValidado());
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.validandoBack.set(false);
        this.dpfBackValidado.set(false);
        this.toastr.error('Error al validar el documento', 'Error');
        console.error('❌ Error en validación reverso:', error);
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
      this.datosRepresentante.update(current => ({
        ...current,
        estadoCivil: demografia?.estado_civil || '',
        profesion: demografia?.profesion_oficio || '',
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
      
      console.log('📋 Datos reverso extraídos:', this.datosRepresentante());
    }
  }

  async onGuardar() {
    try {
      // Aquí deberías recolectar todos los datos de los formularios hijos y las imágenes
      // Ejemplo simple: solo datos extraídos y fotos
      const datos = this.datosRepresentante();
      console.log("🚀 ~ CrearRepresentantePage ~ onGuardar ~ datos:", datos)
      const representante: any = {
        ...datos,
        fotoFrontalDpi: null,
        fotoReversoDpi: null
      };
      const resp = await this.representanteService.crearRepresentante(representante);
      if (resp?.success) {
        this.toastr.success('Representante creado correctamente', 'Éxito');
        // Redirigir o limpiar formulario si es necesario
      } else {
        this.toastr.error(resp?.message || 'Error al crear representante', 'Error');
      }
    } catch (error: any) {
      this.toastr.error(error?.message || 'Error inesperado', 'Error');
    }
  }

}
