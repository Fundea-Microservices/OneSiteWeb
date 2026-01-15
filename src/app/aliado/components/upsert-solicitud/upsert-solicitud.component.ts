import { Component, OnInit, inject, signal, input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TipoSolicitud, EstadoSolicitud, TipoAfiliacion } from '../../../../interfaces/aliado/generalidades';
import { Agencia, Region } from '../../../../services/aliado/agencia-region.service';
import { GeneralidadesService } from '../../../../services/aliado/generalidades.service';
import { AgenciaRegionService } from '../../../../services/aliado/agencia-region.service';
import { Representante } from '../../../../interfaces/aliado/representante';
import { IEmpresaRepresentante } from '../../../../interfaces/aliado/empresa-representante';
import { ICuentaBancaria } from '../../../../interfaces/aliado/cuenta-bancaria';

export interface SolicitudFormData {
  tipoSolicitudId: string;
  estadoSolicitudId: string;
  tipoAfiliacionId: string;
  regionId: string;
  agenciaId: string;
  observaciones?: string;
  archivo?: File;
}

@Component({
  selector: 'app-upsert-solicitud',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './upsert-solicitud.component.html',
  styles: [`
    .form-label {
      font-weight: 500;
      color: #333;
    }
    .form-select, .form-control {
      border-radius: 0.375rem;
    }
    .spinner-border-sm {
      width: 1rem;
      height: 1rem;
    }
    .card {
      border: 1px solid #e0e0e0;
    }
    .card-body {
      padding: 1rem;
    }
    .card-title {
      font-size: 0.875rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class UpsertSolicitudComponent implements OnInit {
  private generalidadesService = inject(GeneralidadesService);
  private agenciaRegionService = inject(AgenciaRegionService);

  // Inputs usando input signals de Angular
  nuevo = input<boolean>(true);
  solicitudData = input<SolicitudFormData>();
  representante = input<Representante | null>(null);
  empresa = input<IEmpresaRepresentante | null>(null);
  cuentaBancaria = input<ICuentaBancaria | null>(null);
  tipoSolicitudId = input<string | null>(null);
  tipoAfiliacionId = input<string | null>(null);

  // Para mostrar el nombre si viene el id
  tipoSolicitudSeleccionado: TipoSolicitud | null = null;
  tipoAfiliacionSeleccionada: TipoAfiliacion | null = null;

  @Output() save = new EventEmitter<SolicitudFormData>();
  @Output() cancel = new EventEmitter<void>();

  // Signals para datos cargados
  tiposSolicitud = signal<TipoSolicitud[]>([]);
  estadosSolicitud = signal<EstadoSolicitud[]>([]);
  tiposAfiliacion = signal<TipoAfiliacion[]>([]);
  regiones = signal<Region[]>([]);
  agencias = signal<Agencia[]>([]);
  agenciasFilterradas = signal<Agencia[]>([]);

  // Signals para el formulario
  selectedTipoSolicitud = signal('');
  selectedEstadoSolicitud = signal('');
  selectedTipoAfiliacion = signal('');
  selectedRegion = signal('');
  selectedAgencia = signal('');
  archivoSeleccionado = signal<File | null>(null);
  nombreArchivo = signal('');
  observaciones = signal('');
  estadoDeshabilitado = signal(false);

  isLoading = signal(false);
  documentoGenerado = signal(false);

  async ngOnInit(): Promise<void> {
    await this.loadData();
    // Si es nuevo, buscar y seleccionar el estado "Espera" automáticamente
    if (this.nuevo()) {
      this.seleccionarEstadoEspera();
    }
    if (this.solicitudData() && !this.nuevo()) {
      this.populateForm();
    }

    // Si viene tipoSolicitudId, filtrar y guardar el tipo
    if (this.tipoSolicitudId()) {
      this.tipoSolicitudSeleccionado = this.tiposSolicitud().find(t => t.tipoSolicitudId === this.tipoSolicitudId()) || null;
      if (this.tipoSolicitudSeleccionado) {
        this.selectedTipoSolicitud.set(this.tipoSolicitudSeleccionado.tipoSolicitudId);
      }
    }
    // Si viene tipoAfiliacionId, filtrar y guardar el tipo
    if (this.tipoAfiliacionId()) {
      this.tipoAfiliacionSeleccionada = this.tiposAfiliacion().find(t => t.tipoAfiliacionId === this.tipoAfiliacionId()) || null;
      if (this.tipoAfiliacionSeleccionada) {
        this.selectedTipoAfiliacion.set(this.tipoAfiliacionSeleccionada.tipoAfiliacionId);
      }
    }
  }

  private async loadData(): Promise<void> {
    this.isLoading.set(true);
    try {
      const [tipos, estados, afiliaciones, regiones, agencias] = await Promise.all([
        this.generalidadesService.getAllTipoSolicitud({ all: true }),
        this.generalidadesService.getAllEstadoSolicitud({ all: true }),
        this.generalidadesService.getAllTipoAfiliacion({ all: true }),
        this.agenciaRegionService.getRegiones(),
        this.agenciaRegionService.getAgencias(),
      ]);

      this.tiposSolicitud.set((tipos?.data as TipoSolicitud[]) ?? []);
      this.estadosSolicitud.set((estados?.data as EstadoSolicitud[]) ?? []);
      this.tiposAfiliacion.set((afiliaciones?.data as TipoAfiliacion[]) ?? []);
      this.regiones.set(regiones ?? []);
      this.agencias.set(agencias ?? []);

      // Si es nuevo, intentar seleccionar "Espera" después de cargar los estados
      if (this.nuevo()) {
        this.seleccionarEstadoEspera();
      }
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  private seleccionarEstadoEspera(): void {
    const estadoEspera = this.estadosSolicitud().find(
      estado => estado.nombre?.toLowerCase().includes('espera')
    );

    if (estadoEspera) {
      this.selectedEstadoSolicitud.set(estadoEspera.estadoSolicitudId);
      this.estadoDeshabilitado.set(true);
    }
  }

  private populateForm(): void {
    const data = this.solicitudData();
    if (!data) return;
    this.selectedTipoSolicitud.set(data.tipoSolicitudId);
    this.selectedEstadoSolicitud.set(data.estadoSolicitudId);
    this.selectedTipoAfiliacion.set(data.tipoAfiliacionId);
    this.selectedRegion.set(data.regionId);
    this.selectedAgencia.set(data.agenciaId);
    if (data.observaciones) {
      this.observaciones.set(data.observaciones);
    }

    // Filtrar agencias basándose en la región seleccionada
    if (data.regionId) {
      const agenciasFiltradas = this.agencias().filter((a) => a.regionId === data.regionId);
      console.log('🔍 Agencias filtradas para región', data.regionId, ':', agenciasFiltradas.length);
      this.agenciasFilterradas.set(agenciasFiltradas);
    }
  }

  onRegionChange(regionId: string): void {
    this.selectedRegion.set(regionId);
    this.selectedAgencia.set('');
    this.agenciasFilterradas.set(
      this.agencias().filter((a) => a.regionId === regionId)
    );
  }

  onArchivoSeleccionado2(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      if (file.type === 'application/pdf') {
        this.archivoSeleccionado.set(file);
        this.nombreArchivo.set(file.name);
      } else {
        alert('Por favor selecciona un archivo PDF válido');
        this.archivoSeleccionado.set(null);
        this.nombreArchivo.set('');
      }
    }
  }

  onSubmit(): void {
    if (!this.documentoGenerado()) {
      alert('Debe generar el documento antes de crear la solicitud.');
      return;
    }
    if (!this.isFormValid()) {
      alert('Por favor completa todos los campos requeridos');
      return;
    }

    const formData: SolicitudFormData = {
      tipoSolicitudId: this.selectedTipoSolicitud(),
      estadoSolicitudId: this.selectedEstadoSolicitud(),
      tipoAfiliacionId: this.selectedTipoAfiliacion(),
      regionId: this.selectedRegion(),
      agenciaId: this.selectedAgencia(),
      observaciones: this.observaciones() || undefined,
      archivo: this.archivoSeleccionado() ?? undefined,
    };

    this.save.emit(formData);
  }

  onCancel(): void {
    this.cancel.emit();
  }

  private isFormValid(): boolean {
    return (
      this.selectedTipoSolicitud().length > 0 &&
      this.selectedEstadoSolicitud().length > 0 &&
      this.selectedTipoAfiliacion().length > 0 &&
      this.selectedRegion().length > 0 &&
      this.selectedAgencia().length > 0
    );
  }

  // Getters para template
  getNombreCompleto(): string {
    const rep = this.representante();
    if (!rep) return 'Sin representante';

    const nombres = [
      rep.primerNombre,
      rep.segundoNombre,
      rep.tercerNombre
    ].filter(Boolean).join(' ');

    const apellidos = [
      rep.primerApellido,
      rep.segundoApellido
    ].filter(Boolean).join(' ');

    return `${nombres} ${apellidos}`.trim() || 'Sin nombre';
  }

  getTipoSolicitudNombre(id: string): string {
    return this.tiposSolicitud().find((t) => t.tipoSolicitudId === id)?.nombre ?? '';
  }

  getEstadoSolicitudNombre(id: string): string {
    return this.estadosSolicitud().find((e) => e.estadoSolicitudId === id)?.nombre ?? '';
  }

  getTipoAfiliacionNombre(id: string): string {
    return this.tiposAfiliacion().find((t) => t.tipoAfiliacionId === id)?.nombre ?? '';
  }

  getRegionNombre(id: string): string {
    return this.regiones().find((r) => r.regionId === id)?.nombre ?? '';
  }

  getAgenciaNombre(id: string): string {
    return this.agencias().find((a) => a.agenciaId === id)?.nombre ?? '';
  }

  onArchivoSeleccionado(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.archivoSeleccionado.set(file);
      this.nombreArchivo.set(file.name);
    }
  }

  generarDocumento(): void {
    const rep = this.representante();
    if (!rep) return;

    // Crear elemento temporal para generar el HTML
    const htmlContent = this.crearHTMLDocumento(rep);

    // Crear iframe temporal para imprimir
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (iframeDoc) {
      iframeDoc.write(htmlContent);
      iframeDoc.close();

      // Esperar a que se cargue el contenido
      setTimeout(() => {
        iframe.contentWindow?.print();
        this.documentoGenerado.set(true);
      }, 250);
    }
  }

  private crearHTMLDocumento(rep: Representante): string {
    const empresa = this.empresa();
    const hoy = new Date();
    const dia = hoy.getDate();
    const mes = hoy.toLocaleDateString('es-ES', { month: 'long' });
    const anio = hoy.getFullYear();

    // Obtener municipio y departamento del representante
    const municipio = '___________________';
    const departamento = '___________________';

    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>Carta de Entendimiento - Red de Referidos FUNDEA</title>
        <style>
          @page {
            size: letter;
            margin: 3.5cm;
          }
          
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: Arial, sans-serif;
            font-size: 11pt;
            line-height: 1.5;
            color: #000;
            padding: 3.5cm 3.5cm 1cm 3.5cm;
          }
          
          .container {
            max-width: 100%;
          }
          
          .header {
            background: linear-gradient(135deg, #1976D2 0%, #1565C0 100%);
            padding: 25px 30px;
            text-align: left;
            margin: 0 -3.5cm 25px -3.5cm;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          
          .header-content {
            display: flex;
            align-items: center;
            width: 100%;
          }
          
          .logo-container {
            flex: 0 0 auto;
            margin-right: 20px;
          }
          
          .logo-text {
            font-size: 32pt;
            font-weight: bold;
            color: white;
            letter-spacing: 2px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
            font-family: 'Arial Black', Arial, sans-serif;
          }
          
          .logo-subtitle {
            color: white;
            font-size: 9pt;
            margin-top: 5px;
            font-style: italic;
            opacity: 0.95;
          }
          
          .header-right {
            flex: 1;
            text-align: right;
            color: white;
          }
          
          .titulo {
            text-align: center;
            font-weight: bold;
            font-size: 14pt;
            margin-bottom: 25px;
            line-height: 1.4;
            text-transform: uppercase;
          }
          
          .fecha-lugar {
            margin-bottom: 20px;
            line-height: 1.8;
            text-align: justify;
          }
          
          .partes {
            margin-bottom: 20px;
            text-align: justify;
            line-height: 1.7;
          }
          
          .partes p {
            margin-bottom: 15px;
          }
          
          .clausula {
            margin-bottom: 18px;
            text-align: justify;
          }
          
          .clausula-titulo {
            font-weight: bold;
            margin-bottom: 10px;
            font-size: 10.5pt;
          }
          
          .clausula-texto {
            margin-bottom: 10px;
            text-align: justify;
            line-height: 1.6;
          }
          
          ol, ul {
            margin-left: 25px;
            margin-bottom: 10px;
          }
          
          li {
            margin-bottom: 6px;
            line-height: 1.5;
          }
          
          .tabla-comisiones {
            margin: 12px 0 12px 20px;
            line-height: 1.7;
          }
          
          .condiciones {
            margin: 12px 0 12px 20px;
            line-height: 1.6;
          }
          
          .condiciones p {
            margin-bottom: 5px;
          }
          
          .firmas {
            margin-top: 60px;
            page-break-inside: avoid;
          }
          
          .firmas-titulo {
            font-weight: bold;
            margin-bottom: 35px;
            font-size: 12pt;
            text-align: center;
          }
          
          .firma-seccion {
            margin-bottom: 40px;
          }
          
          .firma-seccion p {
            margin-bottom: 8px;
            line-height: 1.8;
          }
          
          .firma-linea {
            display: inline-block;
            min-width: 300px;
            border-bottom: 1px solid #000;
            margin-left: 5px;
          }
          
          .page-break {
            page-break-after: always;
          }
          
          .footer-info {
            margin-top: 30px;
            text-align: center;
            font-size: 9pt;
            color: #666;
            padding-top: 15px;
            border-top: 1px solid #ddd;
          }
          
          @media print {
            body {
              font-size: 10.5pt;
              padding: 0 2cm 1cm 2cm;
            }
            
            .header {
              margin: -2.5cm -2cm 25px -2cm;
              break-inside: avoid;
            }
            
            .page-break {
              page-break-after: always;
            }
            
            .firmas {
              break-inside: avoid;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <!-- PÁGINA 1 -->
          <div class="header">
            <div class="header-content">
              <div class="logo-container">
                <div class="logo-text">FUNDEA</div>
                <div class="logo-subtitle">¡Que buena idea!</div>
              </div>
            </div>
          </div>
        
        <div class="titulo">
          CARTA DE ENTENDIMIENTO<br>
          RED DE REFERIDOS FUNDEA
        </div>
        
        <div class="fecha-lugar">
          En el municipio de ${municipio}, departamento de ${departamento}, el día ____ de ${mes} de ${anio}, comparecen:
        </div>
        
        <div class="partes">
          <p style="margin-bottom: 12px;"><strong>I.</strong> FUNDACIÓN PARA EL DESARROLLO EMPRESARIAL Y AGRÍCOLA –FUNDEA–, entidad no lucrativa debidamente constituida conforme las leyes de la República de Guatemala, representada en este acto por _________________________________________, quien se identifica con DPI No. _________________, en su calidad de _________________________________________ (acreditar representación legal).</p>
          
          <p><strong>II.</strong> _________________________________________, en adelante "LA EMPRESA AFILIADA", representada por _________________________________________, quien se identifica con DPI No. _________________, en su calidad de _________________________________________ (acreditar representación legal).</p>
        </div>
        
        <div class="clausula">
          <div class="clausula-titulo">CLÁUSULA PRIMERA – OBJETO</div>
          <div class="clausula-texto">
            El presente documento tiene por finalidad establecer los términos de cooperación mediante los cuales LA EMPRESA AFILIADA referirá a FUNDEA clientes potenciales interesados en la obtención de crédito, conforme políticas internas y normativa aplicable.
          </div>
        </div>
        
        <div class="clausula">
          <div class="clausula-titulo">CLÁUSULA SEGUNDA – RESPONSABILIDADES DE LA EMPRESA AFILIADA</div>
          <ol>
            <li>Enviar información de clientes potenciales mediante la aplicación autorizada.</li>
            <li>Completar toda la información requerida, bajo principio de veracidad.</li>
            <li>Obtener consentimiento informado del cliente para compartir datos.</li>
            <li>Capacitar a sus colaboradores según lineamientos de FUNDEA.</li>
            <li>Abstenerse de prometer aprobaciones o condiciones crediticias.</li>
            <li>Cumplir legislación de protección de datos.</li>
          </ol>
        </div>
        
        <div class="clausula">
          <div class="clausula-titulo">CLÁUSULA TERCERA – RESPONSABILIDADES DE FUNDEA</div>
          <ol>
            <li>Recibir y evaluar solicitudes.</li>
            <li>Procesar información conforme normativa vigente.</li>
            <li>Pagar comisiones en los plazos establecidos.</li>
            <li>Proporcionar capacitación necesaria.</li>
          </ol>
        </div>
        
        <div class="page-break"></div>
        
        <!-- PÁGINA 2 -->
        <div class="clausula-texto" style="margin-top: 0;">
          <strong>De la observación especial:</strong> Con los clientes referidos, FUNDEA, a través de su departamento específico o personas designadas, realizarán el estudio crediticio para determinar la aprobación o no de la solicitud de crédito. FUNDEA en ningún caso garantizará la aprobación del crédito que se realice en la forma y modo de esta carta de entendimiento.
        </div>
        
        <div class="clausula">
          <div class="clausula-titulo">CLÁUSULA CUARTA – TABLA DE COMISIONES</div>
          <div class="clausula-texto">
            Cuando LA EMPRESA AFILIADA, proporcione las cantidades de clientes que se detallan a continuación, FUNDEA realizará el pago de las siguientes comisiones de conformidad con el número de desembolsos que se realicen:
          </div>
          <div class="tabla-comisiones">
            <p>1–4 desembolsos/mes: Q100 c/u</p>
            <p>5–9 desembolsos/mes: Q150 c/u</p>
            <p>10 desembolsos/mes o más: Q200 c/u</p>
          </div>
          <div class="condiciones">
            <p><strong>Condiciones para devengar comisión:</strong></p>
            <p>a) Cliente nuevo.</p>
            <p>b) Formulario completo.</p>
            <p>c) Crédito aprobado y desembolsado posterior a la fecha de referencia.</p>
          </div>
        </div>
        
        <div class="clausula">
          <div class="clausula-titulo">CLÁUSULA QUINTA – CONFIDENCIALIDAD Y PROTECCIÓN DE DATOS</div>
          <div class="clausula-texto">
            Ambas partes deberán mantener estricta confidencialidad y cumplir la normativa aplicable, notificando cualquier filtración inmediatamente.
          </div>
        </div>
        
        <div class="clausula">
          <div class="clausula-titulo">CLÁUSULA SEXTA – SUPERVISIÓN Y COMUNICACIÓN</div>
          <div class="clausula-texto">
            Coordinación a cargo del Jefe(a) de Agencia ______________ de FUNDEA y el representante designado de LA EMPRESA AFILIADA.
          </div>
        </div>
        
        <div class="clausula">
          <div class="clausula-titulo">CLÁUSULA SÉPTIMA – LIMITACIÓN DE RESPONSABILIDAD</div>
          <div class="clausula-texto">
            FUNDEA es la única entidad responsable del análisis y aprobación del crédito. No se generan relaciones laborales ni obligaciones adicionales.
          </div>
        </div>
        
        <div class="page-break"></div>
        
        <!-- PÁGINA 3 -->
        <div class="clausula">
          <div class="clausula-titulo">CLÁUSULA OCTAVA – TERMINACIÓN</div>
          <div class="clausula-texto">
            FUNDEA podrá revocar la afiliación en cualquier momento mediante notificación escrita. Cualquier modificación deberá hacerse mediante intercambio de cartas.
          </div>
        </div>
        
        <div class="clausula">
          <div class="clausula-titulo">CLÁUSULA NOVENA – VIGENCIA</div>
          <div class="clausula-texto">
            Esta carta de entendimiento entra en vigencia a partir de su firma y por tiempo indefinido.
          </div>
        </div>
        
        <div class="firmas">
          <div class="firmas-titulo">FIRMAS</div>
          
          <div class="firma-seccion">
            <p><strong>Por FUNDEA:</strong></p>
            <p>Nombre: <span class="firma-linea"></span></p>
            <p>Cargo: <span class="firma-linea"></span></p>
            <p>DPI: <span class="firma-linea"></span></p>
            <p>Firma: <span class="firma-linea"></span></p>
          </div>
          
          <div class="firma-seccion">
            <p><strong>Por la Empresa Afiliada:</strong></p>
            <p>Nombre: <span class="firma-linea"></span></p>
            <p>Cargo: <span class="firma-linea"></span></p>
            <p>DPI: <span class="firma-linea"></span></p>
            <p>Firma: <span class="firma-linea"></span></p>
          </div>
        </div>
        
        <div class="footer-info">
          <p>Oficinas Centrales: 15 avenida 2-09 zona 13, Ciudad de Guatemala • PBX: 2444 - 2222</p>
          <p>www.fundea.org.gt</p>
        </div>
        </div>
      </body>
      </html>
    `;
  }
}
