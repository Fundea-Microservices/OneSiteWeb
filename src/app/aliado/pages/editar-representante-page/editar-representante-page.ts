
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, signal, AfterViewInit, effect, OnInit, computed, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { UpsertContacto } from '../../components/representante/upsert-contacto/upsert-contacto';
import { UpsertActividadLaboralFinanciera } from '../../components/representante/upsert-actividad-laboral-financiera/upsert-actividad-laboral-financiera';
import { RepresentanteService } from '../../../../services/aliado/representante.service';
import { ToastrService } from 'ngx-toastr';
import { Representante } from '../../../../interfaces/aliado/representante';
import { UpsertDatosGenerales } from '../../components/representante/upsert-datos-generales/upsert-datos-generales';
import { ClienteBantotalService } from '../../../../services/api-bantotal/cliente.service';
import { initFlowbite } from 'flowbite';
import { AuthService } from '../../../../services/auth.service';
import { StorageService } from '../../../../services/storage.service';
import { FormRespuesta, RenderFormularioComponent } from '../../../configuracion/components/formulario/render-formulario/render-formulario.component';
import { FormulariosService } from '../../../../services/config/formularios.service';

@Component({
  selector: 'app-editar-representante-page',
  imports: [CommonModule, RouterLink, UpsertDatosGenerales, UpsertContacto, UpsertActividadLaboralFinanciera, RenderFormularioComponent],
  templateUrl: './editar-representante-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class EditarRepresentantePage implements OnInit, AfterViewInit {

  private representanteService = inject(RepresentanteService);
  private clienteService = inject(ClienteBantotalService);
  private authService = inject(AuthService);
  private storageService = inject(StorageService);
  private formulariosService = inject(FormulariosService);
  private toastr = inject(ToastrService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  readonly ENCABEZADO_ID = '26EB556D-6C24-4FBE-B589-02FAB42518C7';

  // Solo puede editar si el usuarioId del representante coincide con el del usuario logueado
  puedeEditar = computed(() => {
    const rep = this.representante();
    if (!rep) return false;
    const usuarioLogueado = this.authService.getUserStorage().userId;
    return !!usuarioLogueado && rep.usuarioId === usuarioLogueado;
  });

  // Estados
  cargando = signal(false);
  guardando = signal(false);
  camposBloqueados = signal(true); // Por defecto bloqueados
  cuentaBT = signal<number | null>(null);
  buscandoCliente = signal(false);
  private debounceTimeout: any = null;

  representante = signal<Representante | null>(null);
  representanteId = signal<string>('');

  // URLs de fotos del DPI (solo lectura)
  fotoFrontalUrl = signal<string | null>(null);
  fotoReversoUrl = signal<string | null>(null);
  cargandoFotos = signal(false);

  // Lightbox de fotos DPI
  fotoModalUrl = signal<string | null>(null);
  fotoModalTitulo = signal<string>('');

  // Formulario dinámico (datos adicionales)
  renderFormRef = viewChild(RenderFormularioComponent);
  datosAdicionales = signal<FormRespuesta[]>([]);
  mensajeFormDinamico = signal<string>('');
  valoresFormDinamico = signal<{ preguntaId: string; valor: string }[] | null>(null);
  cargandoFormulario = signal(false);
  errorFormulario = signal<string | null>(null);

  onListadoFormDinamico(listado: FormRespuesta[]) {
    this.datosAdicionales.set(listado.filter(d => d.tipo !== 'FILE'));
  }

  async cargarValoresFormulario(representanteId: string) {
    this.cargandoFormulario.set(true);
    this.errorFormulario.set(null);
    try {
      const valores = await this.formulariosService.obtenerValoresFormulario(
        this.ENCABEZADO_ID, representanteId
      );
      console.log("🚀 ~ EditarRepresentantePage ~ cargarValoresFormulario ~ valores:", valores)
      this.valoresFormDinamico.set(valores ?? []);
    } catch (error: any) {
      this.valoresFormDinamico.set(null);
      const apiMsg = error?.error?.message || error?.message || null;
      const displayMsg = apiMsg
        ? `No se pudieron cargar los datos adicionales del formulario: ${apiMsg}`
        : 'No se pudieron cargar los datos adicionales del formulario. Intente más tarde.';
      this.errorFormulario.set(displayMsg);
      this.toastr.error(apiMsg || 'No se pudieron cargar los datos adicionales del formulario', 'Error');
    } finally {
      this.cargandoFormulario.set(false);
      this.cdr.markForCheck();
    }
  }

  ngOnInit(): void {
    // Obtener el ID de la ruta
    this.route.params.subscribe(params => {
      const id = params['representanteId'];
      if (id) {
        this.representanteId.set(id);
        this.cargarRepresentante(id);
      }
    });
  }

  ngAfterViewInit(): void {
    initFlowbite();
  }

  /**
   * Cargar los datos del representante
   */
  async cargarRepresentante(representanteId: string) {
    this.cargando.set(true);
    console.log('🔄 Cargando representante:', representanteId);

    try {
      const resultado = await this.representanteService.byId(representanteId);

      if (resultado?.data?.representante) {
        this.representante.set(resultado.data.representante);

          // Cargar fotos del DPI
          const rep = resultado.data.representante;
          if (rep.fotoFrontalDpi || rep.fotoReversoDpi) {
            this.cargandoFotos.set(true);
            const [urlFrontal, urlReverso] = await Promise.all([
              this.storageService.downloadFileAsUrl(rep.fotoFrontalDpi),
              this.storageService.downloadFileAsUrl(rep.fotoReversoDpi),
            ]);
            this.fotoFrontalUrl.set(urlFrontal);
            this.fotoReversoUrl.set(urlReverso);
            this.cargandoFotos.set(false);
          }
        if (resultado.data.representante.documento) {
          const docSinFormato = resultado.data.representante.documento.replace(/\s/g, '');

        }

        // Cargar valores del formulario dinámico
        await this.cargarValoresFormulario(representanteId);

        console.log('✅ Representante cargado:', resultado.data.representante);
      } else {
        this.toastr.error('No se encontró el representante', 'Error');
      }
    } catch (error) {
      console.error('❌ Error al cargar representante:', error);
      this.toastr.error('Error al cargar los datos del representante', 'Error');
    } finally {
      this.cargando.set(false);
      this.cdr.detectChanges();
    }
  }

  /**
   * Toggle para bloquear/desbloquear campos
   */
  toggleBloquearCampos() {
    this.camposBloqueados.update(value => !value);
  }


  /**
   * Guardar cambios del representante
   */
  async guardarCambios() {
    const rep = this.representante();
    if (!rep) {
      this.toastr.error('No hay datos del representante', 'Error');
      return;
    }

    if (!this.puedeEditar()) {
      this.toastr.warning('No tienes permiso para editar este representante', 'Sin permiso');
      return;
    }

    // Validaciones básicas
    const camposFaltantes: string[] = [];
    if (!rep.documento) camposFaltantes.push('Documento');
    if (!rep.primerNombre) camposFaltantes.push('Primer Nombre');
    if (!rep.primerApellido) camposFaltantes.push('Primer Apellido');
    if (!rep.fechaNacimiento) camposFaltantes.push('Fecha de Nacimiento');
    if (!rep.sexo) camposFaltantes.push('Sexo');
    if (!rep.estadoCivil) camposFaltantes.push('Estado Civil');
    if (!rep.etnia) camposFaltantes.push('Etnia');
    if (!rep.fechaVencimiento) camposFaltantes.push('Fecha de Vencimiento');
    if (!rep.nit) camposFaltantes.push('NIT');
    if (!rep.telefonoCelular) camposFaltantes.push('Teléfono Celular');
    if (!rep.departamentoDomicilio) camposFaltantes.push('Departamento');
    if (!rep.localidad) camposFaltantes.push('Localidad');
    if (!rep.direccion) camposFaltantes.push('Dirección');
    if (!rep.actividadLaboral) camposFaltantes.push('Actividad Laboral');
    if (!rep.fechaInicioActividad) camposFaltantes.push('Fecha de Inicio de Actividad');
    if (!rep.sectorId) camposFaltantes.push('Sector');
    if (!rep.correoElectronico) camposFaltantes.push('Correo Electrónico');
    // Agrega aquí más campos obligatorios si lo necesitas

    if (camposFaltantes.length > 0) {
      this.toastr.error(`Faltan los siguientes campos obligatorios: ${camposFaltantes.join(', ')}`, 'Error');
      return;
    }

    // Validar formulario dinámico
    const formDinamicoValido = this.renderFormRef()?.validarFormulario() ?? true;
    if (!formDinamicoValido) {
      const msg = this.mensajeFormDinamico();
      this.toastr.error(msg || 'Por favor completa los campos obligatorios del formulario.', 'Campos incompletos');
      return;
    }

    try {
      const resultado = await this.representanteService.actualizarRepresentante(
        this.representanteId(),
        { ...rep, datosAdicionales: this.datosAdicionales() }
      );

      if (resultado?.success) {
        this.toastr.success('Representante actualizado correctamente', 'Éxito');
        console.log('✅ Representante actualizado:', resultado);
        // Redirigir al listado después de 2 segundos
        setTimeout(() => {
          this.router.navigate(['/aliado/listado-representante']);
        }, 2000);
      } else {
        this.toastr.error(resultado?.message || 'Error al actualizar', 'Error');
      }
    } catch (error: any) {
      console.error('❌ Error al guardar representante:', error);
      this.toastr.error(error?.message || 'Error al guardar los cambios', 'Error');
    } finally {
      this.guardando.set(false);
      this.cdr.detectChanges();
    }
  }

  /**
   * Cancelar y volver al listado
   */
  cancelar() {
    this.router.navigate(['/aliado/listado-representante']);
  }

  /**
   * Verifica si el DPI está vencido comparando la fecha de vencimiento con la fecha actual
   * @returns true si la fecha de vencimiento es menor a la fecha actual
   */
  esDpiVencido(): boolean {
    const fechaVencimiento = this.representante()?.fechaVencimiento;
    if (!fechaVencimiento) {
      return false;
    }

    let fechaVenc: Date;
    // Si la fecha está en formato DD/MM/YYYY
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(fechaVencimiento)) {
      const [dia, mes, anio] = fechaVencimiento.split('/');
      fechaVenc = new Date(parseInt(anio, 10), parseInt(mes, 10) - 1, parseInt(dia, 10));
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(fechaVencimiento)) {
      fechaVenc = new Date(`${fechaVencimiento}T00:00:00`);
    } else {
      fechaVenc = new Date(fechaVencimiento);
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    fechaVenc.setHours(0, 0, 0, 0);

    return fechaVenc < hoy;
  }

  abrirFotoModal(url: string | null, titulo: string): void {
    if (!url) return;
    this.fotoModalUrl.set(url);
    this.fotoModalTitulo.set(titulo);
  }

  cerrarFotoModal(): void {
    this.fotoModalUrl.set(null);
    this.fotoModalTitulo.set('');
  }
}
