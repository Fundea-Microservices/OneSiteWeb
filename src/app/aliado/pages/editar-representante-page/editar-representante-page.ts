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
          if (docSinFormato.length === 13) {
            this.buscarClientePorDocumento(docSinFormato);
          }
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
   * Buscar datos del cliente en Bantotal por documento
   */
  buscarClientePorDocumento(documentoSinFormato: string) {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }

    if (documentoSinFormato.length !== 13) {
      this.cuentaBT.set(null);
      return;
    }

    this.debounceTimeout = setTimeout(() => {
      this.buscandoCliente.set(true);
      console.log('🔍 Buscando cliente con documento:', documentoSinFormato);

      this.clienteService.obtenerDatosBantotal({
        documento: documentoSinFormato,
        pais: 320,
        tipoDoc: 1
      }).subscribe({
        next: (datos) => {
          console.log('✅ Datos de cliente encontrados:', datos);
          
          if (datos.cuentaBT) {
            this.cuentaBT.set(datos.cuentaBT);
            console.log(`💳 Cuenta Bantotal encontrada: ${datos.cuentaBT}`);
          }
          
          this.buscandoCliente.set(false);
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.log('⚠️ Cliente no encontrado en Bantotal:', error.message);
          this.cuentaBT.set(null);
          this.buscandoCliente.set(false);
          this.cdr.detectChanges();
        }
      });
    }, 500);
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
    if (!rep.documento || !rep.primerNombre || !rep.primerApellido) {
      this.toastr.error('Por favor complete los campos requeridos', 'Error');
      return;
    }

    this.guardando.set(true);
    console.log('💾 Guardando cambios del representante...', rep);

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
}
