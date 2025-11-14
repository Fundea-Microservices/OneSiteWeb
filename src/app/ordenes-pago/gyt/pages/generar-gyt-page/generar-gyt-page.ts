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
            @page {
              size: A4;
              margin: 10mm;
            }
            
            body { 
              margin: 0; 
              padding: 0;
              font-family: Arial, sans-serif;
              background: white;
              font-size: 8px; /* Reducido para que quepa mejor */
            }
            
            /* Contenedor principal optimizado para una página */
            .boleta-container {
              width: 100%;
              max-width: 19cm;
              margin: 0 auto 5mm;
              padding: 4mm; /* Reducido de 8mm */
              background-color: white;
              border: 1px solid #000;
              font-family: Arial, sans-serif;
              font-size: 8px; /* Reducido */
              color: #000;
              position: relative;
              page-break-inside: avoid;
              box-sizing: border-box;
            }

            /* Header compacto */
            .header-logos {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 3mm; /* Reducido de 6mm */
              padding-bottom: 1mm; /* Reducido de 2mm */
              border-bottom: 1px solid #333;
            }

            .logo-banco {
              display: flex;
              align-items: center;
              gap: 3mm; /* Reducido de 5mm */
            }

            .logo-placeholder {
              width: 12mm; /* Reducido de 15mm */
              height: 12mm; /* Reducido de 15mm */
              background-color: #666;
              border: 1px solid #333;
              border-radius: 4px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 5px;
              color: white;
            }

            .banco-text {
              display: flex;
              flex-direction: column;
              line-height: 1.1;
            }

            .banco-nombre, .banco-continental {
              font-size: 11px; /* Reducido de 14px */
              font-weight: bold;
              color: #000;
              margin: 0;
              letter-spacing: 0.3px;
            }

            .logo-fundea {
              background-color: #000;
              color: white;
              padding: 1.5mm 4mm; /* Reducido */
              border-radius: 10px;
              display: flex;
              align-items: center;
              gap: 2mm;
              font-weight: bold;
            }

            .fundea-text {
              font-size: 10px; /* Reducido de 12px */
              font-weight: bold;
              letter-spacing: 0.5px;
            }

            /* Información principal compacta */
            .info-principal {
              margin-bottom: 2mm; /* Reducido de 4mm */
            }

            /* Campos horizontales compactos */
            .campo-horizontal {
              display: flex;
              margin-bottom: 0.5mm; /* Reducido de 1mm */
              align-items: stretch;
            }

            .campo-horizontal .campo-label {
              background-color: #000;
              color: white;
              padding: 0.5mm 1mm; /* Reducido */
              font-size: 7px; /* Reducido */
              font-weight: bold;
              text-transform: uppercase;
              margin: 0;
              border: 1px solid #000;
              border-right: none;
              border-radius: 3px 0 0 3px;
              letter-spacing: 0.2px;
              white-space: nowrap;
              display: flex;
              align-items: center;
              min-width: 35%;
            }

            .campo-horizontal .campo-value {
              border: 1px solid #000;
              padding: 0.5mm 1mm; /* Reducido */
              background-color: white;
              font-size: 8px; /* Reducido */
              color: #000;
              display: flex;
              align-items: center;
              margin: 0;
              font-weight: normal;
              border-radius: 0 3px 3px 0;
              flex: 1;
            }

            /* Filas de campos compactas */
            .campo-row {
              display: flex;
              gap: 1mm; /* Reducido de 2mm */
              margin-bottom: 0.5mm; /* Reducido de 1mm */
              align-items: stretch;
            }

            .campo-row-item {
              flex: 1;
            }

            /* Texto legal compacto */
            .texto-legal {
              background-color: white;
              border: 1px solid #000;
              border-radius: 4px;
              padding: 1.5mm; /* Reducido */
              font-size: 7px; /* Reducido */
              line-height: 1.2;
              margin-bottom: 2mm; /* Reducido */
              text-align: justify;
              color: #000;
            }

            /* Sección de firmas compacta */
            .seccion-firmas {
              display: flex;
              gap: 1mm; /* Reducido de 2mm */
              justify-content: space-between;
              align-items: flex-end;
            }

            .firma-box, .testigo-box {
              flex: 1;
              display: flex;
              flex-direction: column;
              border: 1px solid #000;
              border-radius: 4px;
              background-color: white;
              min-height: 15mm; /* Reducido de 25mm */
              overflow: hidden;
            }

            .huella-box {
              flex: 0.6; /* Más compacto */
            }

            .testigo-box {
              flex: 1.2; /* Reducido */
            }

            /* DPI Testigo compacto */
            .testigo-dpi-horizontal {
              display: flex;
              align-items: stretch;
            }

            .testigo-dpi-label {
              background-color: #000;
              color: white;
              padding: 0.5mm 1mm; /* Reducido */
              font-size: 6px; /* Reducido */
              font-weight: bold;
              text-transform: uppercase;
              margin: 0;
              border: 1px solid #000;
              border-right: none;
              border-radius: 3px 0 0 3px;
              letter-spacing: 0.2px;
              white-space: nowrap;
              display: flex;
              align-items: center;
              min-width: 35%;
            }

            .testigo-dpi-area {
              border: 1px solid #000;
              background-color: white;
              border-radius: 0 3px 3px 0;
              flex: 1;
              min-height: 4mm; /* Reducido */
              margin: 0;
            }

            .firma-area, .huella-area, .firma-area-testigo {
              flex: 1;
              min-height: 10mm; /* Reducido de 18mm */
              background-color: white;
              border: none;
              display: flex;
              align-items: center;
              justify-content: center;
              color: #999;
              font-size: 5px;
              margin-top: 1mm; /* Para testigo */
            }

            .firma-label, .firma-label-testigo {
              font-size: 7px; /* Reducido */
              font-weight: bold;
              text-align: center;
              color: white;
              background-color: #000;
              padding: 0.5mm; /* Reducido */
              margin: 0;
              text-transform: uppercase;
              letter-spacing: 0.2px;
            }

            /* Separadores compactos */
            .separador-copia {
              display: flex;
              align-items: center;
              margin: 2mm 0; /* Reducido de 5mm */
              page-break-inside: avoid;
            }

            .linea-puntos {
              flex: 1;
              height: 1px;
              background-image: repeating-linear-gradient(to right, #000 0, #000 1px, transparent 1px, transparent 2px);
              margin: 0 1mm;
            }

            .tipo-copia {
              padding: 0 2mm;
              font-size: 8px; /* Reducido */
              font-weight: bold;
              color: #000;
              background-color: white;
              text-align: center;
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
