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

export interface CartaDatos {
  // Datos Generales
  municipio: string;
  departamento: string;
  fechaDia: string;
  fechaMes: string;
  fechaAnio: string;

  // Representante FUNDEA (Parte I)
  fundeaNombreRep: string;
  fundeaDpi: string;
  fundeaCalidad: string; // Ej: "Mandatario Judicial..."

  // Empresa Afiliada (Parte II)
  empresaNombre: string;
  afiliadoNombreRep: string;
  afiliadoDpi: string;
  afiliadoCalidad: string; // Ej: "Propietario", "Gerente General"

  // Cláusula Sexta
  nombreAgencia: string; // Para "Jefe(a) de Agencia ____"
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
      if (file.size > 1048576) { // 1MB = 1048576 bytes
        alert('El archivo excede el tamaño máximo permitido de 1MB.');
        this.archivoSeleccionado.set(null);
        this.nombreArchivo.set('');
        return;
      }
      this.archivoSeleccionado.set(file);
      this.nombreArchivo.set(file.name);
    }
  }

  // Función principal que llamas desde tu botón
  generarDocumento(): void {
    // 1. Preparar los datos (Aquí puedes sacarlos de tu formulario reactivo o BD)
    // Si algún dato no existe, puedes pasar null o string vacío ''
    const datos: CartaDatos = {
      municipio: 'Quetzaltenango', // Ejemplo
      departamento: 'Quetzaltenango',
      fechaDia: new Date().getDate().toString(),
      fechaMes: new Date().toLocaleDateString('es-ES', { month: 'long' }),
      fechaAnio: new Date().getFullYear().toString(),
      
      fundeaNombreRep: this.getNombreCompleto(), // Variable asignable
      fundeaDpi: this.representante()?.documento || '',
      fundeaCalidad: 'Representante Legal',

      empresaNombre: this.empresa()?.nombreEmpresa || '', 
      afiliadoNombreRep: this.representante()?.primerNombre + ' ' + this.representante()?.primerApellido || '',
      afiliadoDpi: this.representante()?.documento || '',
      afiliadoCalidad: 'Propietario',

      nombreAgencia: 'Central'
    };

    const htmlContent = this.crearHTMLDocumento(datos);

    // Proceso de impresión (igual al tuyo, funciona bien)
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (iframeDoc) {
      iframeDoc.write(htmlContent);
      iframeDoc.close();

      setTimeout(() => {
        iframe.contentWindow?.print();
        // Limpieza opcional: document.body.removeChild(iframe); 
        this.documentoGenerado.set(true);
      }, 500); // Aumenté un poco el tiempo para asegurar carga de estilos
    }
  }

  private crearHTMLDocumento(d: CartaDatos): string {
    // Helper para renderizar texto o línea si está vacío
    const val = (texto: string) => texto ? `<b>${texto}</b>` : '_________________________';

    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>Carta de Entendimiento FUNDEA</title>
        <style>
          @page {
            size: letter;
            margin: 1.5cm 2cm; /* Márgenes ajustados al estándar de documentos */
          }
          
          body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 10pt; /* Tamaño más similar a documentos legales */
            line-height: 1.4;
            color: #000;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact; /* CRUCIAL: Imprime fondos de color */
            print-color-adjust: exact;
          }

          /* Encabezado Azul */
          .header {
            background-color: #005eb8; /* Azul Fundea aproximado */
            color: white;
            padding: 15px 40px;
            margin: -1.5cm -2cm 30px -2cm; /* Se expande fuera de los márgenes de página */
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .logo-text {
            font-family: Arial, sans-serif;
            font-weight: 900;
            font-size: 28pt;
            letter-spacing: -1px;
          }

          .slogan {
            font-style: italic;
            font-size: 9pt;
            margin-top: -5px;
          }

          /* Títulos */
          .doc-title {
            text-align: center;
            font-weight: bold;
            font-size: 12pt;
            margin-bottom: 20px;
            text-transform: uppercase;
          }

          /* Texto General */
          p {
            margin-bottom: 12px;
            text-align: justify;
          }

          /* Cláusulas */
          .clausula-title {
            font-weight: bold;
            text-transform: uppercase;
            margin-top: 15px;
            margin-bottom: 5px;
            display: block;
          }

          ul, ol {
            margin-top: 5px;
            margin-bottom: 10px;
            padding-left: 30px;
          }
          
          li {
            margin-bottom: 5px;
            text-align: justify;
          }

          /* Tabla de Comisiones simulada */
          .tabla-comisiones {
            margin-left: 20px;
            margin-bottom: 10px;
            font-weight: bold;
          }

          /* Firmas */
          .firmas-container {
            margin-top: 50px;
            display: flex;
            justify-content: space-between;
            page-break-inside: avoid; /* Evita que las firmas se corten */
          }

          .firma-box {
            width: 45%;
            text-align: left;
          }

          .linea-firma {
            border-top: 1px solid black;
            margin-top: 40px;
            margin-bottom: 5px;
            width: 100%;
            display: block;
          }

          .info-firma {
            font-size: 9pt;
            line-height: 1.3;
          }

          /* Footer */
          .footer {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            text-align: center;
            font-size: 8pt;
            color: #666;
            border-top: 1px solid #ccc;
            padding-top: 5px;
            background: white;
          }

          /* Utilidad para saltos de página */
          .page-break { page-break-before: always; }
          
          /* Ocultar footer visual en pantalla, mostrar en impresión si se desea */
          @media print {
            .header {
              -webkit-print-color-adjust: exact;
            }
          }
        </style>
      </head>
      <body>

        <div class="header">
          <div>
            <div class="logo-text">FUNDEA</div>
          </div>
        </div>

        <div class="doc-title">
          CARTA DE ENTENDIMIENTO<br>
          RED DE REFERIDOS FUNDEA
        </div>

        <p>
          En el municipio de ${val(d.municipio)}, departamento de ${val(d.departamento)}, 
          el día ${val(d.fechaDia)} de ${val(d.fechaMes)} de ${val(d.fechaAnio)}, comparecen:
        </p>

        <p>
          <strong>I. FUNDACIÓN PARA EL DESARROLLO EMPRESARIAL Y AGRÍCOLA -FUNDEA-</strong>, 
          entidad no lucrativa debidamente constituida conforme las leyes de la República de Guatemala, 
          representada en este acto por ${val(d.fundeaNombreRep)}, 
          quien se identifica con DPI No. ${val(d.fundeaDpi)}, 
          en su calidad de ${val(d.fundeaCalidad)} (acreditar representación legal). [cite: 8, 9]
        </p>

        <p>
          <strong>II. ${val(d.empresaNombre)}</strong>, en adelante "LA EMPRESA AFILIADA", 
          representada por ${val(d.afiliadoNombreRep)}, 
          quien se identifica con DPI No. ${val(d.afiliadoDpi)}, 
          en su calidad de ${val(d.afiliadoCalidad)} (acreditar representación legal). [cite: 10, 11]
        </p>

        <div class="clausula-title">CLÁUSULA PRIMERA - OBJETO</div>
        <p>
          El presente documento tiene por finalidad establecer los términos de cooperación mediante los cuales 
          LA EMPRESA AFILIADA referirá a FUNDEA clientes potenciales interesados en la obtención de crédito, 
          conforme políticas internas y normativa aplicable. 
        </p>

        <div class="clausula-title">CLÁUSULA SEGUNDA - RESPONSABILIDADES DE LA EMPRESA AFILIADA</div>
        <ol>
          <li>Enviar información de clientes potenciales mediante la aplicación autorizada.</li>
          <li>Completar toda la información requerida, bajo principio de veracidad.</li>
          <li>Obtener consentimiento informado del cliente para compartir datos.</li>
          <li>Capacitar a sus colaboradores según lineamientos de FUNDEA.</li>
          <li>Abstenerse de prometer aprobaciones o condiciones crediticias.</li>
          <li>Cumplir legislación de protección de datos. [cite: 20-26]</li>
        </ol>

        <div class="clausula-title">CLÁUSULA TERCERA - RESPONSABILIDADES DE FUNDEA</div>
        <ol>
          <li>Recibir y evaluar solicitudes.</li>
          <li>Procesar información conforme normativa vigente.</li>
          <li>Pagar comisiones en los plazos establecidos.</li>
          <li>Proporcionar capacitación necesaria. [cite: 27-31]</li>
        </ol>
        
        <p>
          <strong>De la observación especial:</strong> Con los clientes referidos, FUNDEA, a través de su departamento específico o
          personas designadas, realizarán el estudio crediticio para determinar la aprobación o no de la solicitud de
          crédito. FUNDEA en ningún caso garantizará la aprobación del crédito que se realice en la forma y modo de
          esta carta de entendimiento. [cite: 36, 37]
        </p>

        <div class="clausula-title">CLÁUSULA CUARTA - TABLA DE COMISIONES</div>
        <p>
          Cuando LA EMPRESA AFILIADA, proporcione las cantidades de clientes que se detallan a continuación,
          FUNDEA realizará el pago de las siguientes comisiones de conformidad con el número de desembolsos que
          se realicen: [cite: 38, 39]
        </p>

        <div class="tabla-comisiones">
          <div>• 1-4 desembolsos/mes: Q100 c/u</div>
          <div>• 5-9 desembolsos/mes: Q150 c/u</div>
          <div>• 10 desembolsos/mes o más: Q200 c/u [cite: 40-42]</div>
        </div>

        <p><strong>Condiciones para devengar comisión:</strong></p>
        <p style="margin-left: 20px;">
          a) Cliente nuevo.<br>
          b) Formulario completo.<br>
          c) Crédito aprobado y desembolsado posterior a la fecha de referencia. [cite: 43-46]
        </p>

        <div class="clausula-title">CLÁUSULA QUINTA - CONFIDENCIALIDAD Y PROTECCIÓN DE DATOS</div>
        <p>
          Ambas partes deberán mantener estricta confidencialidad y cumplir la normativa aplicable, notificando
          cualquier filtración inmediatamente. [cite: 47, 48]
        </p>

        <div class="clausula-title">CLÁUSULA SEXTA - SUPERVISIÓN Y COMUNICACIÓN</div>
        <p>
          Coordinación a cargo del Jefe(a) de Agencia ${val(d.nombreAgencia)} de FUNDEA y el representante designado de
          LA EMPRESA AFILIADA. [cite: 49-52]
        </p>

        <div class="clausula-title">CLÁUSULA SÉPTIMA - LIMITACIÓN DE RESPONSABILIDAD</div>
        <p>
          FUNDEA es la única entidad responsable del análisis y aprobación del crédito. No se generan relaciones
          laborales ni obligaciones adicionales. [cite: 53, 54]
        </p>

        <div class="clausula-title">CLÁUSULA OCTAVA - TERMINACIÓN</div>
        <p>
          FUNDEA podrá revocar la afiliación en cualquier momento mediante notificación escrita. Cualquier
          modificación deberá hacerse mediante intercambio de cartas. [cite: 59, 60]
        </p>

        <div class="clausula-title">CLÁUSULA NOVENA - VIGENCIA</div>
        <p>
          Esta carta de entendimiento entra en vigencia a partir de su firma y por tiempo indefinido. [cite: 61, 62]
        </p>

        <div style="text-align: center; font-weight: bold; margin-top: 30px;">FIRMAS</div>
        
        <div class="firmas-container">
          <div class="firma-box">
            <div style="font-weight: bold; margin-bottom: 40px;">Por FUNDEA:</div>
            <span class="linea-firma"></span>
            <div class="info-firma">
              Nombre: ${val(d.fundeaNombreRep)}<br>
              Cargo: ${val(d.fundeaCalidad)}<br>
              DPI: ${val(d.fundeaDpi)}
            </div>
          </div>

          <div class="firma-box">
            <div style="font-weight: bold; margin-bottom: 40px;">Por la Empresa Afiliada:</div>
            <span class="linea-firma"></span>
            <div class="info-firma">
              Nombre: ${val(d.afiliadoNombreRep)}<br>
              Cargo: ${val(d.afiliadoCalidad)}<br>
              DPI: ${val(d.afiliadoDpi)}
            </div>
          </div>
        </div>
        
        <div class="footer">
          Oficinas Centrales: 15 avenida 2-09 zona 13, Ciudad de Guatemala. PBX: 2444-2222<br>
          www.fundea.org.gt
        </div>
        
      </body>
      </html>
    `;
  }
}
