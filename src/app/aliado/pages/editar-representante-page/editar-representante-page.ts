
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, signal, AfterViewInit, effect, OnInit } from '@angular/core';
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

@Component({
  selector: 'app-editar-representante-page',
  imports: [CommonModule, RouterLink, UpsertDatosGenerales, UpsertContacto, UpsertActividadLaboralFinanciera],
  templateUrl: './editar-representante-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class EditarRepresentantePage implements OnInit, AfterViewInit {

  private representanteService = inject(RepresentanteService);
  private clienteService = inject(ClienteBantotalService);
  private toastr = inject(ToastrService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  // Estados
  cargando = signal(false);
  guardando = signal(false);
  camposBloqueados = signal(true); // Por defecto bloqueados
  cuentaBT = signal<number | null>(null);
  buscandoCliente = signal(false);
  private debounceTimeout: any = null;

  representante = signal<Representante | null>(null);
  representanteId = signal<string>('');

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

        // Si tiene documento, cargar la cuenta BT
        if (resultado.data.representante.documento) {
          const docSinFormato = resultado.data.representante.documento.replace(/\s/g, '');

        }

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

    try {
      const resultado = await this.representanteService.actualizarRepresentante(
        this.representanteId(),
        rep
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
}
