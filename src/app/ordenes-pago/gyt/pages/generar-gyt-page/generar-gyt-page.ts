import { ChangeDetectionStrategy, Component, signal, CUSTOM_ELEMENTS_SCHEMA, ViewContainerRef, ComponentRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { OrdenGytComponent } from '../../components/orden-gyt/orden-gyt.component';
import { PrestamosBantotalService } from '../../../../../services/api-bantotal/prestamo.service';
import { BuscarPrestamoPorDocumentoResponse } from '../../../../../interfaces/api-bantotal/prestamo';
import { OrdenesGytService } from '../../../../../services/ordenes-gyt/ordenes-gyt.service';
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

  constructor(
    private toastr: ToastrService, 
    private viewContainerRef: ViewContainerRef,
    private prestamosService: PrestamosBantotalService,
    private ordenesGytService: OrdenesGytService
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
      
      console.log("🚀 ~ GenerarGytPage ~ buscarCliente ~ prestamoData:", prestamoData);
      
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
        telefono: 'N/A', // No viene en la respuesta de préstamo
        correo: 'N/A', // No viene en la respuesta de préstamo
        montoPrestamo: prestamo.detalles[0].Valor, // Usar el valor del primer detalle
        numeroOperacion: prestamo.idOperacionFmt // Usar el ID formateado del préstamo
      };
      
      this.cliente.set(clienteData);
      
      // Mensaje de éxito con información del préstamo
      const nombreCompleto = `${persona.primerNombre} ${persona.primerApellido}`;
      const montoDesembolso = prestamo.detalles[0].Valor;
      this.toastr.success(
        `Préstamo: ${prestamo.idOperacionFmt} - Monto: Q${montoDesembolso.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        `Cliente: ${nombreCompleto}`
      );
      
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

    this.procesandoOrden.set(true);
    this.numeroOrdenApi.set(null);

    // Mostrar UI de progreso inmediatamente en estado "preparar"
    this.ordenPago.set({
      id: '...',
      estado: 'preparar',
      cliente: clienteData,
      fechaCreacion: new Date()
    });

    const dto: CrearOrdenGytDto = {
      nombre: clienteData.nombres,
      apellido: clienteData.apellidos,
      documentoCliente: clienteData.numeroIdentificacion,
      tipoDocumentoCliente: clienteData.tipoIdentificacion,
      monto: clienteData.montoPrestamo,
      descripcion: 'ORDEN GENERADA DESDE ONESITE',
      telefono: clienteData.telefono === 'N/A' ? '24442222' : clienteData.telefono,
      correo: clienteData.correo === 'N/A' ? 'sincorreo@gmail.com' : clienteData.correo,
      canalCobro: '6',
      cuentaDebito: '00000000018',
      gestion: `GESTION-${clienteData.numeroOperacion}`,
      usuario: undefined
    };

    try {
      // Paso 1: Crear orden
      const respuestaCrear = await new Promise<CrearOrdenGytApiResponse>((resolve, reject) => {
        this.ordenesGytService.crearOrdenApi(dto).subscribe({ next: resolve, error: reject });
      });

      const numeroOrden = respuestaCrear.data.orden.numero;
      this.numeroOrdenApi.set(numeroOrden);
      this.ordenPago.set({ ...this.ordenPago()!, id: numeroOrden });
      this.toastr.info(`Orden ${numeroOrden} creada`, 'Paso 1/3');

      // Paso 2: Revisar orden
      this.ordenPago.set({ ...this.ordenPago()!, estado: 'revisar' });
      await new Promise<void>((resolve, reject) => {
        this.ordenesGytService.revisarOrdenApi(numeroOrden).subscribe({ next: () => resolve(), error: reject });
      });
      this.toastr.info(`Orden ${numeroOrden} revisada`, 'Paso 2/3');

      // Paso 3: Autorizar orden
      this.ordenPago.set({ ...this.ordenPago()!, estado: 'pagar' });
      await new Promise<void>((resolve, reject) => {
        this.ordenesGytService.autorizarOrdenApi(numeroOrden).subscribe({ next: () => resolve(), error: reject });
      });
      this.toastr.info(`Orden ${numeroOrden} autorizada`, 'Paso 3/3');

      this.procesandoOrden.set(false);
      this.toastr.success(`Orden ${numeroOrden} procesada exitosamente`, 'Completado');

    } catch (error: any) {
      this.ordenPago.set(null);
      this.procesandoOrden.set(false);

      let msg = 'Error al procesar la orden de pago';
      if (error?.error?.message) msg = error.error.message;
      else if (error?.message) msg = error.message;

      this.toastr.error(msg, 'Error');
    }
  }

  async generarPDF() {
    const orden = this.ordenPago();
    if (!orden) return;

    this.toastr.info('Abriendo ventana de impresión...', 'Procesando');
    
    try {
      // Crear el componente dinámicamente
      const componentRef: ComponentRef<OrdenGytComponent> = this.viewContainerRef.createComponent(OrdenGytComponent);
      
      // Pasar los datos al componente
      componentRef.instance.ordenData = {
        cliente: orden.cliente,
        ordenId: orden.id,
        fecha: orden.fechaCreacion,
        monto: orden.cliente.montoPrestamo
      };
      
      // Detectar cambios para que se renderice
      componentRef.changeDetectorRef.detectChanges();
      
      // Esperar un momento para que se renderice completamente
      setTimeout(() => {
        try {
          // Obtener el HTML renderizado del componente
          const elementoHTML = componentRef.location.nativeElement;
          let htmlContent = elementoHTML.outerHTML;
          
          // Obtener la URL base para corregir las rutas de las imágenes
          const baseUrl = window.location.origin;
        
          // Reemplazar las rutas relativas de las imágenes con rutas absolutas
          const htmlContentWithImages = htmlContent.replace(/src="logos\//g, `src="${baseUrl}/logos/`);
          
          this.abrirVentanaImpresion(htmlContentWithImages);
          
          // Limpiar el componente temporal
          componentRef.destroy();
          
        } catch (error) {
          this.toastr.error('Error al generar la boleta', 'Error');
          console.error('Error:', error);
        }
      }, 500);
      
    } catch (error) {
      this.toastr.error('Error al crear el componente', 'Error');
      console.error('Error:', error);
    }
  }

  private abrirVentanaImpresion(htmlContentWithImages: string) {
    // Obtener el ID de la orden para el nombre del archivo
    const ordenId = this.ordenPago()?.id || 'ORDEN-PAGO';
    
    const ventana = window.open('', '_blank', 'width=800,height=600');
    
    if (ventana) {
      ventana.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Boleta ${ordenId}</title>
          <style>
            @page {
              size: letter portrait;
              margin: 0.3cm; /* Márgenes muy pequeños para maximizar espacio */
            }
            
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 0; /* Sin padding - cada boleta tiene su margen */
              background: white;
              font-size: 9px;
              line-height: 1.2;
              page-break-inside: avoid;
              max-height: 25cm; /* Forzar altura máxima para una página carta */
              overflow: hidden;
            }

            /* Contenedor que force todo en una página */
            .page-container {
              height: 100vh;
              max-height: 25cm;
              page-break-inside: avoid;
              overflow: hidden;
            }

            /* Estilos exactos del componente orden-gyt.component.css con escala 80% */
            
            .boleta-container {
              width: 19cm; /* Ancho más apropiado para carta */
              min-height: 4cm; /* Altura muy reducida para que quepan dos */
              max-height: 10cm; /* Altura máxima controlada */
              margin: 0.2cm auto 0.5mm; /* Márgenes muy pequeños */
              padding: 2mm; /* Padding muy reducido */
              background-color: white;
              font-family: Arial, sans-serif;
              font-size: 9px;
              color: #000;
              position: relative;
              transform: scale(0.8); /* Escala que mantiene legibilidad pero es más compacta */
              transform-origin: top center;
              page-break-inside: avoid;
              border: none; /* Sin bordes */
              /* Sin page-break-before para permitir dos en una página */
            }

            /* Segunda boleta en vista normal - mayor separación */
            .boleta-container:nth-child(2) {
              margin-top: 6cm; /* Mayor separación para vista normal */
            }

            /* Ya no necesitamos la regla para la primera boleta */

            /* Header con logos */
            .header-logos {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 6mm;
              padding-bottom: 2mm;
              border-bottom: 1px solid #333;
            }

            .logo-banco {
              display: flex;
              align-items: center;
              gap: 5mm;
            }

            .logo-placeholder {
              width: 15mm;
              height: 15mm;
              background-color: #666;
              border: 1px solid #333;
              border-radius: 6px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 6px;
              color: white;
            }

            .banco-text {
              display: flex;
              flex-direction: column;
              line-height: 1.1;
            }

            .banco-nombre {
              font-size: 17px;
              font-weight: bold;
              color: #000;
              margin: 0;
              letter-spacing: 0.5px;
              text-align: center;
            }

            .banco-continental {
              font-size: 20px;
              font-weight: bold;
              color: #000;
              margin: 0;
              letter-spacing: 0.5px;
            }

            .logo-fundea {
              color: white;
              padding: 2.5mm 6mm;
              border-radius: 18px;
              display: flex;
              align-items: center;
              gap: 3mm;
              font-weight: bold;
            }

            .fundea-logo-placeholder {
              width: 8mm;
              height: 8mm;
              background-color: white;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              color: #000;
              font-size: 6px;
              font-weight: bold;
            }

            .fundea-text {
              font-size: 12px;
              font-weight: bold;
              letter-spacing: 1px;
            }

            /* Información principal */
            .info-principal {
              margin-bottom: 4mm;
            }

            /* Campos horizontales */
            .campo-horizontal {
              display: flex;
              margin-bottom: 1mm;
              align-items: stretch;
            }

            .campo-horizontal .campo-label {
              background-color: #000;
              color: white;
              padding: 1mm 1.5mm;
              font-size: 9px;
              font-weight: bold;
              text-transform: uppercase;
              margin: 0;
              border: 1px solid #000;
              border-right: none;
              border-radius: 6px 0 0 6px;
              letter-spacing: 0.3px;
              white-space: nowrap;
              display: flex;
              align-items: center;
              min-width: 25%;
            }

            .campo-horizontal .campo-value {
              border: 1px solid #000;
              padding: 1.5mm;
              background-color: white;
              font-size: 11px;
              color: #000;
              display: flex;
              align-items: center;
              margin: 0;
              font-weight: normal;
              border-radius: 0 4px 4px 0;
              flex: 1;
            }

            .campo-horizontal .campo-value-2 {
              border: 1px solid #000;
              padding: 1.5mm;
              background-color: white;
              font-size: 11px;
              color: #000;
              display: flex;
              align-items: center;
              margin: 0;
              font-weight: normal;
              border-radius: 0 4px 4px 0;
              flex: 1;
            }

            .campo-horizontal .campo-label-2 {
              background-color: #000;
              color: white;
              padding: 1mm 1.5mm;
              font-size: 9px;
              font-weight: bold;
              text-transform: uppercase;
              margin: 0;
              border: 1px solid #000;
              border-right: none;
              border-radius: 6px 0 0 6px;
              letter-spacing: 0.3px;
              white-space: nowrap;
              display: flex;
              align-items: center;
              min-width: 12%;
            }

            /* Filas que contienen múltiples campos */
            .campo-row {
              display: flex;
              gap: 2mm;
              margin-bottom: 1mm;
              align-items: stretch;
            }

            .campo-row-item {
              flex: 1;
            }

            /* Texto legal */
            .texto-legal {
              background-color: white;
              border: 1px solid #000;
              border-radius: 6px;
              padding: 2.5mm;
              font-size: 10px;
              line-height: 1.3;
              margin-bottom: 4mm;
              text-align: justify;
              color: #000;
            }

            /* Sección de firmas */
            .seccion-firmas {
              display: flex;
              gap: 2mm;
              justify-content: space-between;
              align-items: flex-end;
            }

            .firma-box {
              flex: 1;
              display: flex;
              flex-direction: column;
              border: 1px solid #000;
              border-radius: 6px;
              background-color: white;
              min-height: 25mm;
              overflow: hidden;
            }

            .huella-box {
              flex: 0.45;
            }

            .testigo-box {
              flex: 1.3;
            }

            .testigo-dpi-horizontal {
              display: flex;
              align-items: stretch;
            }

            .testigo-dpi-label {
              background-color: #000;
              color: white;
              padding: 1mm 1.5mm;
              font-size: 8px;
              font-weight: bold;
              text-transform: uppercase;
              margin: 0;
              border: 1px solid #000;
              border-right: none;
              border-radius: 4px 0 0 4px;
              letter-spacing: 0.3px;
              white-space: nowrap;
              display: flex;
              align-items: center;
              min-width: 30%;
            }

            .testigo-dpi-area {
              border: 1px solid #000;
              background-color: white;
              border-radius: 0 4px 4px 0;
              flex: 1;
              min-height: 6mm;
              margin: 0;
            }

            .firma-area,
            .huella-area {
              flex: 1;
              min-height: 18mm;
              background-color: white;
              border: none;
              display: flex;
              align-items: center;
              justify-content: center;
              color: #999;
              font-size: 6px;
            }

            .firma-label {
              font-size: 9px;
              font-weight: bold;
              text-align: center;
              color: white;
              background-color: #000;
              padding: 1mm;
              margin: 0;
              text-transform: uppercase;
              letter-spacing: 0.3px;
            }

            .firma-area-testigo {
              flex: 1;
              min-height: 18mm;
              background-color: white;
              border: 1px solid #000;
              border-radius: 6px 6px 0 0;
              display: flex;
              align-items: center;
              justify-content: center;
              color: #999;
              font-size: 6px;
              margin-top: 1mm;
            }

            .firma-label-testigo {
              font-size: 9px;
              font-weight: bold;
              text-align: center;
              color: white;
              background-color: #000;
              border: 1px solid #000;
              border-radius: 0 0 6px 6px;
              padding: 1mm;
              margin: 0;
              text-transform: uppercase;
              letter-spacing: 0.3px;
            }

            /* Separadores para copias */
            .separador-copia {
              display: flex;
              align-items: center;
              margin: 5mm 0;
              page-break-inside: avoid;
            }

            .linea-puntos {
              flex: 1;
              height: 1px;
              background-image: repeating-linear-gradient(to right,
                  #000 0,
                  #000 2px,
                  transparent 2px,
                  transparent 4px);
              margin: 0 2mm;
            }

            .tipo-copia {
              padding: 10px 0; /* Padding muy reducido */
              font-size: 9px; /* Tamaño de fuente reducido */
              font-weight: bold;
              color: #000;
              background-color: white;
              text-align: center;
              margin-top: 15px; 
              page-break-inside: avoid;
            }

            /* Estilos para impresión con márgenes correctos y escala 80% */
            @media print {
              body {
                font-size: 9px !important;
                padding: 0 !important; /* Sin padding - cada boleta tiene su margen */
                margin: 0 !important;
              }

              .boleta-container {
                width: 19cm !important; /* Ancho más apropiado para carta */
                margin: 0.2cm auto 0.5mm !important; /* Márgenes muy pequeños */
                padding: 2mm !important;
                border: none !important; /* Sin bordes */
                /* ELIMINADO page-break-before para permitir dos boletas en una página */
                page-break-inside: avoid !important;
                background-color: white !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                min-height: 4cm !important; /* Altura muy reducida para que quepan dos */
                max-height: 10cm !important; /* Altura máxima controlada */
                box-sizing: border-box !important;
                transform: scale(0.8) !important; /* Escala que mantiene legibilidad pero es más compacta */
                transform-origin: top center !important;
              }

              /* Primera boleta - margen superior para separar de borde de página */
              .boleta-container:first-child {
                margin-top: 1cm !important; /* Margen superior para la primera boleta */
              }

              /* Segunda boleta - desplazar hacia abajo para evitar superposición */
              .boleta-container:nth-child(2) {
                margin-top: 2.5cm !important; /* Desplazar 2.5cm hacia abajo */
              }

              /* Evitar saltos de página */
              .header-logos,
              .info-principal,
              .seccion-firmas,
              .separador-copia,
              .campo-horizontal,
              .campo-row {
                break-inside: avoid !important;
                page-break-inside: avoid !important;
              }

              /* Asegurar colores en impresión */
              .campo-horizontal .campo-label,
              .campo-horizontal .campo-label-2,
              .logo-fundea,
              .firma-label,
              .firma-label-testigo,
              .testigo-dpi-label {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }

              .no-print {
                display: none !important;
              }
            }
          </style>
        </head>
        <body>
          ${htmlContentWithImages}
          <script>
            window.focus();
            
            // Mensaje para el usuario
            document.title = 'Boleta GYT - Presione Ctrl+P para imprimir';
            
            // Agregar mensaje informativo
            const mensaje = document.createElement('div');
            mensaje.style.cssText = 'position: fixed; top: 10px; right: 10px; background: #333; color: white; padding: 10px; border-radius: 5px; z-index: 1000; font-size: 12px; font-family: Arial;';
            mensaje.innerHTML = 'Presione <strong>Ctrl+P</strong> para imprimir';
            document.body.appendChild(mensaje);
            
            // Ocultar mensaje después de 5 segundos
            setTimeout(() => {
              mensaje.style.display = 'none';
            }, 5000);
            
            // Ocultar mensaje al imprimir
            window.addEventListener('beforeprint', () => {
              mensaje.style.display = 'none';
            });
          </script>
          
          <script>
            // Establecer el nombre del archivo para descarga
            document.title = 'Boleta_${ordenId}';
            
            // Opcional: intentar establecer el nombre para el guardado
            if (window.chrome) {
              // Para Chrome, el título se usa como nombre sugerido
              setTimeout(function() {
                document.title = 'Boleta_${ordenId}';
              }, 100);
            }
          </script>
        </body>
        </html>
      `);
      ventana.document.close();
    }
  }

  limpiarFormulario() {
    this.numeroOperacion.set('');
    this.documentoCliente.set('');
    this.cliente.set(null);
    this.prestamoInfo.set(null);
    this.ordenPago.set(null);
    this.ordenGytGenerada.set(null);
    this.numeroOrdenApi.set(null);
  }
}