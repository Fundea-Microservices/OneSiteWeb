import { ChangeDetectionStrategy, Component, computed, signal, CUSTOM_ELEMENTS_SCHEMA, ViewContainerRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { PrestamosBantotalService } from '../../../../../services/api-bantotal/prestamo.service';
import { BuscarPrestamoPorDocumentoResponse } from '../../../../../interfaces/api-bantotal/prestamo';
import { OrdenesGytService } from '../../../../../services/ordenes-gyt/ordenes-gyt.service';
import { OrdenGytImpresionService } from '../../../../../services/ordenes-gyt/orden-gyt-impresion.service';
import { OrdenGyt, CrearOrdenGytDto, CrearOrdenGytApiResponse } from '../../../../../interfaces/ordenes-gyt/orden-gyt';

interface Cliente {
  nombres: string;
  apellidos: string;
  tipoIdentificacion: string;
  numeroIdentificacion: string;
  telefono: string;
  correo: string;
  montoPrestamo: number;
  numeroOperacion: string;
  
}

interface OrdenPago {
  id: string;
  estado: 'preparar' | 'revisar' | 'pagar' | 'completado';
  cliente: Cliente;
  fechaCreacion: Date;
}

const MENSAJE_TELEFONO_INVALIDO = 'El número de teléfono del cliente no es válido o no está actualizado';

/** Números PBX conocidos que no deben aceptarse como teléfono del cliente */
const TELEFONOS_PBX = new Set<string>(['24442222']);

/**
 * Normaliza un teléfono de Guatemala a 8 dígitos (quita espacios, guiones y prefijo +502).
 * Retorna null si no se puede normalizar.
 */
function normalizarTelefonoGt(telefono: string | null | undefined): string | null {
  if (!telefono) return null;
  let digitos = telefono.replace(/\D/g, '');
  if (digitos.length === 11 && digitos.startsWith('502')) {
    digitos = digitos.slice(3);
  }
  return digitos.length === 8 ? digitos : null;
}

/**
 * Valida que sea un teléfono de Guatemala válido:
 * - 8 dígitos (opcionalmente con prefijo +502)
 * - Inicia con 2, 3, 4, 5, 6 o 7 (fijos y celulares)
 * - No es un número de relleno (todos iguales o secuencial, ej. 12345678, 55555555)
 * - No es un PBX conocido
 */
function esTelefonoGtValido(telefono: string | null | undefined): boolean {
  const numero = normalizarTelefonoGt(telefono);
  if (!numero) return false;
  if (!/^[2-7]\d{7}$/.test(numero)) return false;
  if (/^(\d)\1{7}$/.test(numero)) return false;
  if ('0123456789'.includes(numero) || '9876543210'.includes(numero)) return false;
  if (TELEFONOS_PBX.has(numero)) return false;
  return true;
}

@Component({
  selector: 'app-generar-gyt-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './generar-gyt-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class GenerarGytPage {
  
  // Formulario de búsqueda
  numeroOperacion = signal('');
  documentoCliente = signal('');
  
  // Estado de la aplicación
  cliente = signal<Cliente | null>(null);
  prestamoInfo = signal<BuscarPrestamoPorDocumentoResponse | null>(null); // Datos completos del préstamo
  ordenPago = signal<OrdenPago | null>(null);
  ordenGytGenerada = signal<OrdenGyt | null>(null); // Orden guardada en el sistema
  numeroOrdenApi = signal<string | null>(null); // Número retornado por la API (ej: OPA-156)
  cargandoCliente = signal(false);
  procesandoOrden = signal(false);

  etapaActual = signal<'crear' | 'revisar' | 'autorizar' | 'completado' | null>(null);
  etapaError  = signal(false);
  mensajeError = signal('');

  readonly mensajeTelefonoInvalido = MENSAJE_TELEFONO_INVALIDO;
  telefonoValido = computed(() => esTelefonoGtValido(this.cliente()?.telefono));

  etapaLabel = computed(() => {
    switch (this.etapaActual()) {
      case 'crear':     return 'Creando orden';
      case 'revisar':   return 'Revisando orden';
      case 'autorizar': return 'Autorizando orden';
      case 'completado': return 'Completado';
      default: return '';
    }
  });

  etapaDescripcion = computed(() => {
    switch (this.etapaActual()) {
      case 'crear':     return 'Registrando la orden en el sistema...';
      case 'revisar':   return 'Enviando la orden a revisión...';
      case 'autorizar': return 'Autorizando la orden de pago...';
      default: return '';
    }
  });

  etapaLabelCorto = computed(() => {
    switch (this.etapaActual()) {
      case 'crear':     return 'crear la orden';
      case 'revisar':   return 'revisar la orden';
      case 'autorizar': return 'autorizar la orden';
      default: return '';
    }
  });

  constructor(
    private toastr: ToastrService,
    private viewContainerRef: ViewContainerRef,
    private prestamosService: PrestamosBantotalService,
    private ordenesGytService: OrdenesGytService,
    private impresionService: OrdenGytImpresionService
  ) {}

  get formularioValido(): boolean {
    return this.numeroOperacion().trim() !== '' && this.documentoCliente().trim() !== '';
  }

  /**
   * Valida que el documento tenga exactamente 13 dígitos
   */
  validarDocumento(): boolean {
    const documento = this.documentoCliente().trim();
    
    // Verificar que tenga exactamente 13 caracteres
    if (documento.length !== 13) {
      this.toastr.warning('El documento debe tener exactamente 13 dígitos', 'Documento inválido');
      return false;
    }
    
    // Verificar que todos sean números
    if (!/^\d{13}$/.test(documento)) {
      this.toastr.warning('El documento debe contener solo números', 'Documento inválido');
      return false;
    }
    
    return true;
  }

  /**
   * Verifica si el documento es válido para mostrar en el template
   */
  esDocumentoValido(): boolean {
    const documento = this.documentoCliente().trim();
    return documento.length === 13 && /^\d{13}$/.test(documento);
  }

  /**
   * Verifica si el documento tiene contenido pero no es válido
   */
  esDocumentoInvalido(): boolean {
    const documento = this.documentoCliente().trim();
    return documento.length > 0 && !this.esDocumentoValido();
  }

  /**
   * Verifica si el documento tiene longitud incorrecta
   */
  tieneLogitudIncorrecta(): boolean {
    const documento = this.documentoCliente().trim();
    return documento.length > 0 && documento.length !== 13;
  }

  /**
   * Verifica si el documento tiene 13 dígitos pero contiene caracteres no numéricos
   */
  tieneCaracteresInvalidos(): boolean {
    const documento = this.documentoCliente().trim();
    return documento.length === 13 && !/^\d{13}$/.test(documento);
  }

  async buscarCliente() {
    // Validar que los campos estén completos
    if (!this.formularioValido) {
      this.toastr.warning('Por favor complete todos los campos', 'Datos incompletos');
      return;
    }

    // Validar que el documento tenga 13 dígitos
    if (!this.validarDocumento()) {
      return;
    }

    // Limpiar datos de búsqueda anterior
    this.cliente.set(null);
    this.prestamoInfo.set(null);
    this.ordenGytGenerada.set(null);
    this.ordenPago.set(null);
    this.numeroOrdenApi.set(null);
    this.etapaActual.set(null);
    this.etapaError.set(false);
    this.mensajeError.set('');

    this.cargandoCliente.set(true);
    
    try {
      // Buscar préstamo en API Bantotal
      const prestamoData = await new Promise<BuscarPrestamoPorDocumentoResponse>((resolve, reject) => {
        this.prestamosService.buscarPrestamoPorDocumento({
          documento: this.documentoCliente().trim(),
          prestamo: this.numeroOperacion().trim(),
          pais: 320,
          tipoDoc: 1
        }).subscribe({
          next: resolve,
          error: reject
        });
      });
      
      // Guardar datos completos del préstamo
      this.prestamoInfo.set(prestamoData);
      
      // Extraer información de la persona y préstamo
      const persona = prestamoData.persona;
      const prestamo = prestamoData.prestamo;
      
      // Validar que existan detalles del préstamo
      if (!prestamo.detalles || prestamo.detalles.length === 0) {
        this.cargandoCliente.set(false);
        this.toastr.error(
          'La operación tiene que estar en la etapa de desembolso para generar la orden',
          'Proceso incompleto'
        );
        return;
      }
      
      // Mapear datos al formato Cliente
      const clienteData: Cliente = {
        nombres: `${persona.primerNombre} ${persona.segundoNombre || ''}`.trim(),
        apellidos: `${persona.primerApellido} ${persona.segundoApellido || ''}`.trim(),
        tipoIdentificacion: persona.tipoDocumento,
        numeroIdentificacion: persona.numeroDocumento,
        telefono: persona.telefono, // No viene en la respuesta de préstamo
        correo: persona.correo, // No viene en la respuesta de préstamo
        montoPrestamo: prestamo.detalles[0].Valor, // Usar el valor del primer detalle
        numeroOperacion: prestamo.idOperacionFmt // Usar el ID formateado del préstamo
      };
      
      this.cliente.set(clienteData);

      // Limpiar inputs de búsqueda tras encontrar el cliente
      this.numeroOperacion.set('');
      this.documentoCliente.set('');

      // Mensaje de éxito con información del préstamo
      const nombreCompleto = `${persona.primerNombre} ${persona.primerApellido}`;
      const montoDesembolso = prestamo.detalles[0].Valor;
      this.toastr.success(
        `Préstamo: ${prestamo.idOperacionFmt} - Monto: Q${montoDesembolso.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        `Cliente: ${nombreCompleto}`
      );

      if (!this.telefonoValido()) {
        this.toastr.error(MENSAJE_TELEFONO_INVALIDO, 'Teléfono inválido');
      }

    } catch (error: any) {
      console.error('Error al buscar préstamo:', error);
      
      // Extraer el mensaje de error del backend
      let errorMessage = 'Error al buscar el préstamo';
      let errorTitle = 'Error';
      
      if (error.error?.data?.message) {
        // Mensaje detallado del backend (estructura: error.error.data.message)
        errorMessage = error.error.data.message;
        
        // Personalizar el título según el código de error
        if (errorMessage.includes('No se encontró el préstamo')) {
          errorTitle = 'Préstamo no encontrado';
        } else if (errorMessage.includes('No se encontró la persona')) {
          errorTitle = 'Cliente no encontrado';
        } else if (errorMessage.includes('No se encontró el cliente')) {
          errorTitle = 'Cliente no asociado';
        }
      } else if (error.error?.message) {
        // Mensaje alternativo (estructura: error.error.message)
        errorMessage = error.error.message;
      } else if (error.message) {
        // Mensaje HTTP genérico
        errorMessage = error.message;
      }
      
      // Mostrar mensaje específico según el status
      if (error.status === 404) {
        this.toastr.error(
          errorMessage || 'No se encontró el préstamo para el documento ingresado', 
          errorTitle || 'No encontrado'
        );
      } else if (error.status === 400) {
        this.toastr.error(
          errorMessage || 'Datos inválidos o parámetros incorrectos', 
          errorTitle || 'Error de validación'
        );
      } else if (error.status === 0) {
        this.toastr.error(
          'No se pudo conectar con el servidor. Verifique su conexión.', 
          'Error de conexión'
        );
      } else {
        this.toastr.error(
          errorMessage || 'Error al conectar con el servidor Bantotal', 
          errorTitle || 'Error de búsqueda'
        );
      }
    } finally {
      this.cargandoCliente.set(false);
    }
  }

  async procesarOrden() {
    const clienteData = this.cliente();
    if (!clienteData) {
      this.toastr.error('No hay datos del cliente', 'Error');
      return;
    }

    if (!this.telefonoValido()) {
      this.procesandoOrden.set(false);
      this.toastr.error(MENSAJE_TELEFONO_INVALIDO, 'Teléfono inválido');
      return;
    }

    this.procesandoOrden.set(true);
    this.etapaActual.set('crear');
    this.etapaError.set(false);
    this.mensajeError.set('');
    this.numeroOrdenApi.set(null);

    this.ordenPago.set({ id: '...', estado: 'preparar', cliente: clienteData, fechaCreacion: new Date() });

    const prestamoData = this.prestamoInfo()!;
    const detalle = prestamoData.prestamo.detalles[0];

    const dto: CrearOrdenGytDto = {
      nombre: clienteData.nombres,
      apellido: clienteData.apellidos,
      documentoCliente: clienteData.numeroIdentificacion,
      tipoDocumentoCliente: clienteData.tipoIdentificacion,
      monto: clienteData.montoPrestamo,
      descripcion: 'ORDEN GENERADA DESDE ONESITE',
      telefono: normalizarTelefonoGt(clienteData.telefono)!,
      correo: clienteData.correo === 'N/A' ? 'sincorreo@gmail.com' : clienteData.correo,
      canalCobro: '6',
      cuentaDebito: '00000000018',
      gestion: `GESTION-${clienteData.numeroOperacion}`,
      cuenta: prestamoData.cliente.clienteUId,
      operacion: detalle.Numero_Operacion,
      subOperacion: detalle.Sub_Operacion,
      tipoOperacion: detalle.Ittope,
      agenciaId: detalle.ID_Agencia,
      agencia: detalle.Nombre_Agencia?.trim() ?? '',
      usuario: undefined
    };

    try {
      const respuestaCrear = await new Promise<CrearOrdenGytApiResponse>((resolve, reject) => {
        this.ordenesGytService.crearOrdenApi(dto).subscribe({ next: resolve, error: reject });
      });
      const numeroOrden = respuestaCrear.data.orden.numero;
      this.numeroOrdenApi.set(numeroOrden);
      this.ordenPago.set({ ...this.ordenPago()!, id: numeroOrden });
    } catch (error: any) {
      this.etapaError.set(true);
      this.mensajeError.set(this.extraerMensajeError(error));
      this.procesandoOrden.set(false);
      return;
    }

    await this.ejecutarRevisar();
  }

  private async ejecutarRevisar() {
    this.etapaActual.set('revisar');
    this.etapaError.set(false);
    const numeroOrden = this.numeroOrdenApi()!;
    try {
      await new Promise<void>((resolve, reject) => {
        this.ordenesGytService.revisarOrdenApi(numeroOrden).subscribe({ next: () => resolve(), error: reject });
      });
    } catch (error: any) {
      this.etapaError.set(true);
      this.mensajeError.set(this.extraerMensajeError(error));
      this.procesandoOrden.set(false);
      return;
    }
    await this.ejecutarAutorizar();
  }

  private async ejecutarAutorizar() {
    this.etapaActual.set('autorizar');
    this.etapaError.set(false);
    const numeroOrden = this.numeroOrdenApi()!;
    try {
      await new Promise<void>((resolve, reject) => {
        this.ordenesGytService.autorizarOrdenApi(numeroOrden).subscribe({ next: () => resolve(), error: reject });
      });
    } catch (error: any) {
      this.etapaError.set(true);
      this.mensajeError.set(this.extraerMensajeError(error));
      this.procesandoOrden.set(false);
      return;
    }
    this.etapaActual.set('completado');
    this.procesandoOrden.set(false);
    this.toastr.success(`Orden ${numeroOrden} procesada exitosamente`, 'Completado');
  }

  reintentarEtapa() {
    this.procesandoOrden.set(true);
    switch (this.etapaActual()) {
      case 'crear':     this.procesarOrden();     break;
      case 'revisar':   this.ejecutarRevisar();   break;
      case 'autorizar': this.ejecutarAutorizar(); break;
    }
  }

  private extraerMensajeError(error: any): string {
    return error?.error?.message ?? error?.message ?? 'Error desconocido';
  }

  generarPDF() {
    const orden = this.ordenPago();
    if (!orden) return;

    this.impresionService.imprimirOrden(this.viewContainerRef, {
      cliente: orden.cliente,
      ordenId: orden.id,
      fecha: orden.fechaCreacion,
      monto: orden.cliente.montoPrestamo
    });
  }

  limpiarFormulario() {
    this.numeroOperacion.set('');
    this.documentoCliente.set('');
    this.cliente.set(null);
    this.prestamoInfo.set(null);
    this.ordenPago.set(null);
    this.ordenGytGenerada.set(null);
    this.numeroOrdenApi.set(null);
    this.etapaActual.set(null);
    this.etapaError.set(false);
    this.mensajeError.set('');
  }
}