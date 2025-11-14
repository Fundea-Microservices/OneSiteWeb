import { ChangeDetectionStrategy, Component, signal, CUSTOM_ELEMENTS_SCHEMA, ViewContainerRef, ComponentRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { OrdenGytComponent } from '../../components/orden-gyt/orden-gyt.component';

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
  imports: [FormsModule],
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
  ordenPago = signal<OrdenPago | null>(null);
  cargandoCliente = signal(false);
  procesandoOrden = signal(false);

  constructor(private toastr: ToastrService, private viewContainerRef: ViewContainerRef) {}

  get formularioValido(): boolean {
    return this.numeroOperacion().trim() !== '' && this.documentoCliente().trim() !== '';
  }

  async buscarCliente() {
    if (!this.formularioValido) {
      this.toastr.warning('Complete todos los campos requeridos', 'Advertencia');
      return;
    }

    this.cargandoCliente.set(true);
    
    // Simulación de API
    setTimeout(() => {
      // Datos simulados del cliente
      const clienteSimulado: Cliente = {
        nombres: 'Juan Carlos',
        apellidos: 'García López',
        tipoIdentificacion: 'DPI',
        numeroIdentificacion: this.documentoCliente(),
        telefono: '+502 1234 5678',
        correo: 'juan.garcia@email.com',
        montoPrestamo: 25000,
        numeroOperacion: this.numeroOperacion()
      };

      this.cliente.set(clienteSimulado);
      this.cargandoCliente.set(false);
      this.toastr.success('Cliente encontrado correctamente', 'Éxito');
    }, 1500);
  }

  async generarOrdenPago() {
    const clienteData = this.cliente();
    if (!clienteData) return;

    this.procesandoOrden.set(true);
    
    const nuevaOrden: OrdenPago = {
      id: 'OP-' + Date.now(),
      estado: 'preparar',
      cliente: clienteData,
      fechaCreacion: new Date()
    };

    this.ordenPago.set(nuevaOrden);
    
    // Proceso automático de los 3 estados
    await this.procesarEstadoOrden('preparar');
    await this.procesarEstadoOrden('revisar');
    await this.procesarEstadoOrden('pagar');
    
    this.procesandoOrden.set(false);
    this.toastr.success('Orden de pago completada exitosamente', 'Proceso Finalizado');
  }

  private async procesarEstadoOrden(estado: 'preparar' | 'revisar' | 'pagar') {
    const orden = this.ordenPago();
    if (!orden) return;

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        orden.estado = estado;
        this.ordenPago.set({ ...orden });
        
        const mensajes = {
          preparar: 'Orden preparada para revisión',
          revisar: 'Orden revisada y validada',
          pagar: 'Orden procesada para pago'
        };
        
        this.toastr.info(mensajes[estado], `Estado: ${estado.toUpperCase()}`);
        resolve();
      }, 2000);
    });
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
        // Obtener el HTML renderizado del componente
        const elementoHTML = componentRef.location.nativeElement;
        let htmlContent = elementoHTML.outerHTML;
        
        // Obtener la URL base para corregir las rutas de las imágenes
        const baseUrl = window.location.origin;
        
        // Reemplazar las rutas relativas de las imágenes con rutas absolutas
        htmlContent = htmlContent.replace(/src="logos\//g, `src="${baseUrl}/logos/`);
        
        // Abrir ventana nueva solo con el componente
        this.abrirVentanaImpresion(htmlContent, orden.id);
        
        // Limpiar el componente temporal
        componentRef.destroy();
        
        this.toastr.success('Ventana de impresión abierta. Use Ctrl+P para imprimir', 'Listo');
      }, 500);
      
    } catch (error) {
      console.error('Error abriendo ventana de impresión:', error);
      this.toastr.error('Error al abrir la ventana de impresión', 'Error');
    }
  }

  private abrirVentanaImpresion(htmlContent: string, ordenId: string) {
    const ventana = window.open('', '_blank', 'width=900,height=700,scrollbars=yes,resizable=yes');
    if (ventana) {
      // Obtener la URL base para las rutas de assets
      const baseUrl = window.location.origin;
      
      // Reemplazar las rutas relativas de las imágenes con rutas absolutas
      const htmlContentWithImages = htmlContent.replace(/src="logos\//g, `src="${baseUrl}/logos/`);
      
      ventana.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Boleta GYT - Orden ${ordenId}</title>
          <meta charset="utf-8">
          <style>
            /* Estilos exactos para replicar la imagen de la boleta GYT */

            .boleta-container {
              width: 21cm;
              /* Tamaño carta */
              min-height: 13.5cm;
              margin: 0 auto 10mm;
              padding: 8mm;
              background-color: white;
              /* Cambiado de #e8e8e8 a blanco */
              border: 2px solid #000;
              font-family: Arial, sans-serif;
              font-size: 9px;
              color: #000;
              position: relative;
            }

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
              /* Placeholder para logo del banco */
              border: 1px solid #333;
              border-radius: 6px;
              /* Bordes redondeados */
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 6px;
              color: white;
            }

            .logo-placeholder::before {
              text-align: center;
              line-height: 1.2;
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
              background-color: #000;
              color: white;
              padding: 2.5mm 6mm;
              /* Reducido de 3mm 8mm */
              border-radius: 18px;
              /* Aumentado para mantener la forma ovalada */
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

            .fundea-logo-placeholder::before {
              content: "F";
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

            /* Campos horizontales - Label a la izquierda, valor a la derecha como en la imagen */
            .campo-horizontal {
              display: flex;
              margin-bottom: 1mm;
              align-items: stretch;
            }

            .campo-horizontal .campo-label {
              background-color: #000;
              color: white;
              padding: 1mm 1.5mm;
              /* Reducido de 1.5mm 2mm */
              font-size: 9px;
              /* Aumentado de 7px */
              font-weight: bold;
              text-transform: uppercase;
              margin: 0;
              border: 1px solid #000;
              border-right: none;
              border-radius: 6px 0 0 6px;
              /* Bordes redondeados solo a la izquierda */
              letter-spacing: 0.3px;
              white-space: nowrap;
              display: flex;
              align-items: center;
              min-width: 25%;
              /* Ancho fijo para los labels */
            }

            .campo-horizontal .campo-value {
              border: 1px solid #000;
              padding: 1.5mm;
              /* Reducido de 2mm */
              background-color: white;
              font-size: 11px;
              /* Aumentado de 9px */
              color: #000;
              display: flex;
              align-items: center;
              margin: 0;
              font-weight: normal;
              border-radius: 0 4px 4px 0;
              /* Bordes redondeados solo a la derecha */
              flex: 1;
              /* Toma el resto del espacio */
            }

            .campo-horizontal .campo-value-2 {
              border: 1px solid #000;
              padding: 1.5mm;
              /* Reducido de 2mm */
              background-color: white;
              font-size: 11px;
              /* Aumentado de 9px */
              color: #000;
              display: flex;
              align-items: center;
              margin: 0;
              font-weight: normal;
              border-radius: 0 4px 4px 0;
              /* Bordes redondeados solo a la derecha */
              flex: 1;
              /* Toma el resto del espacio */
            }

            .campo-horizontal .campo-label-2 {
              background-color: #000;
              color: white;
              padding: 1mm 1.5mm;
              /* Reducido de 1.5mm 2mm */
              font-size: 9px;
              /* Aumentado de 7px */
              font-weight: bold;
              text-transform: uppercase;
              margin: 0;
              border: 1px solid #000;
              border-right: none;
              border-radius: 6px 0 0 6px;
              /* Bordes redondeados solo a la izquierda */
              letter-spacing: 0.3px;
              white-space: nowrap;
              display: flex;
              align-items: center;
              min-width: 12%;
              /* Ancho fijo para los labels */
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
              /* Bordes redondeados */
              padding: 2.5mm;
              /* Reducido de 3mm */
              font-size: 10px;
              /* Aumentado de 8px */
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
              /* Bordes redondeados */
              background-color: white;
              min-height: 25mm;
              overflow: hidden;
              /* Para que los elementos internos respeten el border-radius */
            }

            .huella-box {
              flex: 0.45;
              /* Más pequeño que las firmas */
            }

            .testigo-box {
              flex: 1.3;
              display: flex;
              flex-direction: column;
              /* Bordes redondeados */
              background-color: white;
              min-height: 25mm;
              overflow: hidden;
              /* Para que los elementos internos respeten el border-radius */
            }

            /* DPI Testigo como campo horizontal */
            .testigo-dpi-horizontal {
              display: flex;
              align-items: stretch;
            }

            .testigo-dpi-label {
              background-color: #000;
              color: white;
              padding: 1mm 1.5mm;
              /* Reducido de 1.5mm 2mm */
              font-size: 8px;
              /* Un poco más pequeño que los campos normales */
              font-weight: bold;
              text-transform: uppercase;
              margin: 0;
              border: 1px solid #000;
              border-right: none;
              border-radius: 4px 0 0 4px;
              /* Bordes redondeados solo a la izquierda */
              letter-spacing: 0.3px;
              white-space: nowrap;
              display: flex;
              align-items: center;
              min-width: 30%;
              /* Un poco más ancho para "DPI TESTIGO:" */
            }

            .testigo-dpi-area {
              border: 1px solid #000;
              background-color: white;
              border-radius: 0 4px 4px 0;
              /* Bordes redondeados solo a la derecha */
              flex: 1;
              min-height: 6mm;
              /* Altura específica para el DPI */
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
              /* Aumentado de 7px */
              font-weight: bold;
              text-align: center;
              color: white;
              background-color: #000;
              padding: 1mm;
              /* Reducido de 1.5mm */
              margin: 0;
              text-transform: uppercase;
              letter-spacing: 0.3px;
            }

            .firma-box-testigo {
              flex: 1.3;
              display: flex;
              flex-direction: column;
              border: 1px solid #000;
              border-radius: 6px;
              /* Bordes redondeados */
              background-color: white;
              min-height: 25mm; /* Igualado con las otras cajas de firma */
            }

            .firma-area-testigo {
              flex: 1;
              min-height: 18mm; /* Reducido para hacer espacio al margen superior */
              background-color: white;
              border: 1px solid #000;
              border-radius: 6px 6px 0 0;
              display: flex;
              align-items: center;
              justify-content: center;
              color: #999;
              font-size: 6px;
              margin-top: 1mm; /* Espacio entre DPI TESTIGO y FIRMA TESTIGO */
            }

            .firma-label-testigo {
              font-size: 9px;
              /* Aumentado de 7px */
              font-weight: bold;
              text-align: center;
              color: white;
              background-color: #000;
              border: 1px solid #000;
              border-radius: 0 0 6px 6px;
              padding: 1mm;
              /* Reducido de 1.5mm */
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
              padding: 0 4mm;
              font-size: 10px;
              font-weight: bold;
              color: #000;
              background-color: white;
              /* Cambiado de #e8e8e8 a blanco */
              text-align: center;
            }

            /* Estilos para impresión */
            @media print {
              .boleta-container {
                margin: 0;
                padding: 6mm;
                border: 1px solid #000;
                page-break-after: always;
                background-color: white;
                /* Cambiado de #e8e8e8 a blanco */
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }

              .header-logos,
              .info-principal,
              .seccion-firmas {
                break-inside: avoid;
              }

              .separador-copia {
                break-inside: avoid;
                page-break-before: avoid;
              }

              /* Asegurar que los colores se impriman correctamente */
              .campo-horizontal .campo-label,
              .logo-fundea,
              .firma-label,
              .logo-placeholder {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }

              /* Ocultar elementos que no deben imprimirse */
              .no-print {
                display: none !important;
              }
            }

            /* Estilos para impresión - Forzar una página */
            @media print {
              @page {
                size: A4;
                margin: 8mm;
              }
              
              body { 
                margin: 0; 
                padding: 0; 
                background: white;
                font-size: 7px; /* Aún más pequeño para impresión */
              }
              
              .boleta-container {
                margin: 0 0 3mm 0; /* Espacio mínimo entre boletas */
                padding: 3mm;
                border: 1px solid #000;
                page-break-inside: avoid;
                background-color: white;
                box-sizing: border-box;
                width: 100%;
                max-height: none;
              }
              
              /* Evitar saltos de página innecesarios */
              .header-logos,
              .info-principal,
              .seccion-firmas,
              .separador-copia {
                break-inside: avoid;
                page-break-inside: avoid;
              }
              
              /* La primera boleta y separador juntos */
              .boleta-container:first-of-type + .separador-copia {
                page-break-before: avoid;
              }
              
              /* La segunda boleta y separador juntos */
              .boleta-container:last-of-type + .separador-copia {
                page-break-before: avoid;
              }
              
              /* Asegurar que los colores se impriman correctamente */
              .campo-horizontal .campo-label,
              .logo-fundea,
              .firma-label,
              .firma-label-testigo,
              .testigo-dpi-label {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
          </style>
        </head>
        <body>
          ${htmlContentWithImages}
          <script>
            // Enfocar la ventana
            window.focus();
            
            // Mensaje para el usuario
            document.title = 'Boleta GYT - Presione Ctrl+P para imprimir';
            
            // Agregar mensaje informativo
            const mensaje = document.createElement('div');
            mensaje.style.cssText = 'position: fixed; top: 10px; right: 10px; background: #333; color: white; padding: 10px; border-radius: 5px; z-index: 1000; font-size: 12px;';
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
    this.ordenPago.set(null);
  }
}
