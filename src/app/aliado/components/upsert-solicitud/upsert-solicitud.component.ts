import { Component, OnInit, inject, signal, input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TipoSolicitud, EstadoSolicitud, TipoAfiliacion } from '../../../../interfaces/aliado/generalidades';
import { GeneralidadesService } from '../../../../services/aliado/generalidades.service';
import { CatalogosBantotalService } from '../../../../services/api-bantotal/catalogos.service';
import { Representante } from '../../../../interfaces/aliado/representante';
import { IEmpresaRepresentante } from '../../../../interfaces/aliado/empresa-representante';
import { ICuentaBancaria } from '../../../../interfaces/aliado/cuenta-bancaria';
import { StorageService } from '../../../../services/storage.service';
import { CorreoNotificacionesService } from '../../../../services/config/correo-notificaciones.service';
import { ICorreoNotificacion, TipoNotificacion } from '../../../../interfaces/configuracion';

export interface Region {
  regionId: string; // valorCore
  nombre: string;
}

export interface Agencia {
  agenciaId: string; // valorCore
  nombre: string;
  regionId: string;  // padreValorCore
}

export interface SolicitudFormData {
  tipoSolicitudId: string;
  estadoSolicitudId: string;
  tipoAfiliacionId: string;
  regionId: string;
  agenciaId: string;
  agenciaNombre: string;
  correoSupervisor?: string;
  observaciones?: string;
  documentoCargado?: string; // URL/path del archivo subido al storage
}

interface CartaDatos {
  municipio: string;
  departamento: string;
  fechaDia: string;
  fechaMes: string;
  fechaAnio: string;
  fundeaNombreRep: string;
  fundeaDpi: string;
  fundeaCalidad: string;
  empresaNombre: string;
  afiliadoNombreRep: string;
  afiliadoDpi: string;
  afiliadoCalidad: string;
  nombreAgencia: string;
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
  private catalogosService = inject(CatalogosBantotalService);
  private storageService = inject(StorageService);
  private correoNotificacionesService = inject(CorreoNotificacionesService);

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
  correosSupervisor = signal<ICorreoNotificacion[]>([]);

  // Signals para el formulario
  selectedTipoSolicitud = signal('');
  selectedEstadoSolicitud = signal('');
  selectedTipoAfiliacion = signal('');
  selectedRegion = signal('');
  selectedAgencia = signal('');
  selectedCorreoSupervisor = signal('');
  archivoSeleccionado = signal<File | null>(null);
  nombreArchivo = signal('');
  documentoCargadoUrl = signal<string | null>(null);
  subiendoArchivo = signal(false);
  descargandoDocumento = signal(false);
  observaciones = signal('');
  estadoDeshabilitado = signal(false);

  isLoading = signal(false);

  async ngOnInit(): Promise<void> {
    await this.loadData();
    await this.cargarCorreosSupervisor();
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
      const [tipos, estados, afiliaciones] = await Promise.all([
        this.generalidadesService.getAllTipoSolicitud({ all: true }),
        this.generalidadesService.getAllEstadoSolicitud({ all: true }),
        this.generalidadesService.getAllTipoAfiliacion({ all: true }),
      ]);

      // Cargar regiones y agencias desde catálogos (grupo=region, hijos=agencias)
      const regionesResp = await new Promise<{regiones: Region[], agencias: Agencia[]}>((resolve) => {
        this.catalogosService.listarCatalogos({ grupo: 'region', all: true }).subscribe({
          next: (result) => {
            const catalogos: any[] = (result as any)?.data?.data?.catalogos
              ?? (result as any)?.data?.catalogos
              ?? [];
            const regiones: Region[] = [];
            const agencias: Agencia[] = [];
            for (const r of catalogos) {
              regiones.push({ regionId: r.valorCore, nombre: r.nombre });
              for (const a of (r.hijos ?? [])) {
                agencias.push({ agenciaId: a.valorCore, nombre: a.nombre, regionId: a.padreValorCore });
              }
            }
            resolve({ regiones, agencias });
          },
          error: () => resolve({ regiones: [], agencias: [] }),
        });
      });

      this.tiposSolicitud.set((tipos?.data as TipoSolicitud[]) ?? []);
      this.estadosSolicitud.set((estados?.data as EstadoSolicitud[]) ?? []);
      this.tiposAfiliacion.set((afiliaciones?.data as TipoAfiliacion[]) ?? []);
      this.regiones.set(regionesResp.regiones);
      this.agencias.set(regionesResp.agencias);

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

  private async cargarCorreosSupervisor(): Promise<void> {
    try {
      const response = await this.correoNotificacionesService.getCorreosNotificacion({
        all: true,
        activo: true,
        tipoNotificacion: TipoNotificacion.SupervisorRegional,
      });
      this.correosSupervisor.set(response?.data ?? []);
    } catch (error) {
      console.error('Error al cargar correos del supervisor regional:', error);
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
    this.selectedCorreoSupervisor.set(data.correoSupervisor ?? '');
    if (data.observaciones) {
      this.observaciones.set(data.observaciones);
    }
    // Preservar el documento ya cargado para que no se pierda en el submit
    if (data.documentoCargado) {
      this.documentoCargadoUrl.set(data.documentoCargado);
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
      agenciaNombre: this.getAgenciaNombre(this.selectedAgencia()),
      correoSupervisor: this.selectedCorreoSupervisor() || undefined,
      observaciones: this.observaciones() || undefined,
      documentoCargado: this.documentoCargadoUrl() ?? undefined,
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

  async descargarDocumento(): Promise<void> {
    const path = this.solicitudData()?.documentoCargado;
    if (!path) return;

    this.descargandoDocumento.set(true);
    try {
      const url = await this.storageService.downloadFileAsUrl(path);
      if (url) {
        const fileName = path.includes('/') ? path.substring(path.lastIndexOf('/') + 1) : path;
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      }
    } finally {
      this.descargandoDocumento.set(false);
    }
  }

  async onArchivoSeleccionado(event: any): Promise<void> {
    const file: File | undefined = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('El archivo no debe superar los 5MB.');
      (event.target as HTMLInputElement).value = '';
      return;
    }
    this.nombreArchivo.set(file.name);
    this.documentoCargadoUrl.set(null);
    this.archivoSeleccionado.set(file);
    this.subiendoArchivo.set(true);

    try {
      // Derivar prefijo del nombre del tipo de solicitud
      const tipoNombre = (
        this.tipoSolicitudSeleccionado?.nombre ??
        this.tiposSolicitud().find(t => t.tipoSolicitudId === this.selectedTipoSolicitud())?.nombre ?? ''
      ).toLowerCase();

      let prefijo = 'solicitud';
      if (tipoNombre.includes('afiliaci')) {
        prefijo = 'afiliacion';
      } else if (tipoNombre.includes('cuenta')) {
        prefijo = 'cambio_cuenta';
      }

      const documento = this.representante()?.documento ?? 'sin_documento';
      const customName = `${prefijo}_${documento}`;

      const result = await this.storageService.uploadFile(file, 'aliados', customName);
      if (result?.data?.url) {
        this.documentoCargadoUrl.set(result.data.url);
      } else {
        this.nombreArchivo.set('');
        this.archivoSeleccionado.set(null);
        (event.target as HTMLInputElement).value = '';
      }
    } finally {
      this.subiendoArchivo.set(false);
    }
  }

  generarDocumento(): void {
    const rep = this.representante();
    const emp = this.empresa();

    const nombres = [rep?.primerNombre, rep?.segundoNombre, rep?.tercerNombre].filter(Boolean).join(' ');
    const apellidos = [rep?.primerApellido, rep?.segundoApellido].filter(Boolean).join(' ');
    const nombreCompleto = `${nombres} ${apellidos}`.trim();

    const datos: CartaDatos = {
      municipio: '',
      departamento: '',
      fechaDia: new Date().getDate().toString(),
      fechaMes: new Date().toLocaleDateString('es-ES', { month: 'long' }),
      fechaAnio: new Date().getFullYear().toString(),
      fundeaNombreRep: nombreCompleto,
      fundeaDpi: rep?.documento || '',
      fundeaCalidad: 'Representante Legal',
      empresaNombre: emp?.nombreEmpresa || '',
      afiliadoNombreRep: nombreCompleto,
      afiliadoDpi: rep?.documento || '',
      afiliadoCalidad: 'Propietario',
      nombreAgencia: this.getAgenciaNombre(this.selectedAgencia()) || 'Central',
    };

    const htmlContent = this.crearHTMLDocumento(datos);
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (iframeDoc) {
      iframeDoc.write(htmlContent);
      iframeDoc.close();
      setTimeout(() => iframe.contentWindow?.print(), 500);
    }
  }

  private crearHTMLDocumento(d: CartaDatos): string {
    const val = (texto: string) => texto ? `<b>${texto}</b>` : '_________________________';
    return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Carta de Entendimiento FUNDEA</title>
<style>
@page{size:letter;margin:1.5cm 2cm}
body{font-family:Arial,Helvetica,sans-serif;font-size:10pt;line-height:1.4;color:#000;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.header{background-color:#005eb8;color:white;padding:15px 40px;margin:-1.5cm -2cm 30px -2cm;display:flex;justify-content:space-between;align-items:center}
.logo-text{font-family:Arial,sans-serif;font-weight:900;font-size:28pt;letter-spacing:-1px}
.doc-title{text-align:center;font-weight:bold;font-size:12pt;margin-bottom:20px;text-transform:uppercase}
p{margin-bottom:12px;text-align:justify}
.clausula-title{font-weight:bold;text-transform:uppercase;margin-top:15px;margin-bottom:5px;display:block}
ul,ol{margin-top:5px;margin-bottom:10px;padding-left:30px}
li{margin-bottom:5px;text-align:justify}
.tabla-comisiones{margin-left:20px;margin-bottom:10px;font-weight:bold}
.firmas-container{margin-top:50px;display:flex;justify-content:space-between;page-break-inside:avoid}
.firma-box{width:45%;text-align:left}
.linea-firma{border-top:1px solid black;margin-top:40px;margin-bottom:5px;width:100%;display:block}
.info-firma{font-size:9pt;line-height:1.3}
.footer{position:fixed;bottom:0;left:0;right:0;text-align:center;font-size:8pt;color:#666;border-top:1px solid #ccc;padding-top:5px;background:white}
</style></head><body>
<div class="header"><div><div class="logo-text">FUNDEA</div></div></div>
<div class="doc-title">CARTA DE ENTENDIMIENTO<br>RED DE REFERIDOS FUNDEA</div>
<p>En el municipio de ${val(d.municipio)}, departamento de ${val(d.departamento)}, el día ${val(d.fechaDia)} de ${val(d.fechaMes)} de ${val(d.fechaAnio)}, comparecen:</p>
<p><strong>I. FUNDACIÓN PARA EL DESARROLLO EMPRESARIAL Y AGRÍCOLA -FUNDEA-</strong>, entidad no lucrativa debidamente constituida conforme las leyes de la República de Guatemala, representada en este acto por ${val(d.fundeaNombreRep)}, quien se identifica con DPI No. ${val(d.fundeaDpi)}, en su calidad de ${val(d.fundeaCalidad)} (acreditar representación legal).</p>
<p><strong>II. ${val(d.empresaNombre)}</strong>, en adelante "LA EMPRESA AFILIADA", representada por ${val(d.afiliadoNombreRep)}, quien se identifica con DPI No. ${val(d.afiliadoDpi)}, en su calidad de ${val(d.afiliadoCalidad)} (acreditar representación legal).</p>
<div class="clausula-title">CLÁUSULA PRIMERA - OBJETO</div>
<p>El presente documento tiene por finalidad establecer los términos de cooperación mediante los cuales LA EMPRESA AFILIADA referirá a FUNDEA clientes potenciales interesados en la obtención de crédito, conforme políticas internas y normativa aplicable.</p>
<div class="clausula-title">CLÁUSULA SEGUNDA - RESPONSABILIDADES DE LA EMPRESA AFILIADA</div>
<ol><li>Enviar información de clientes potenciales mediante la aplicación autorizada.</li><li>Completar toda la información requerida, bajo principio de veracidad.</li><li>Obtener consentimiento informado del cliente para compartir datos.</li><li>Capacitar a sus colaboradores según lineamientos de FUNDEA.</li><li>Abstenerse de prometer aprobaciones o condiciones crediticias.</li><li>Cumplir legislación de protección de datos.</li></ol>
<div class="clausula-title">CLÁUSULA TERCERA - RESPONSABILIDADES DE FUNDEA</div>
<ol><li>Recibir y evaluar solicitudes.</li><li>Procesar información conforme normativa vigente.</li><li>Pagar comisiones en los plazos establecidos.</li><li>Proporcionar capacitación necesaria.</li></ol>
<p><strong>De la observación especial:</strong> Con los clientes referidos, FUNDEA realizará el estudio crediticio para determinar la aprobación o no de la solicitud de crédito. FUNDEA en ningún caso garantizará la aprobación del crédito.</p>
<div class="clausula-title">CLÁUSULA CUARTA - TABLA DE COMISIONES</div>
<p>Cuando LA EMPRESA AFILIADA proporcione las cantidades de clientes que se detallan a continuación, FUNDEA realizará el pago de las siguientes comisiones de conformidad con el número de desembolsos que se realicen:</p>
<div class="tabla-comisiones"><div>• 1-4 desembolsos/mes: Q100 c/u</div><div>• 5-9 desembolsos/mes: Q150 c/u</div><div>• 10 desembolsos/mes o más: Q200 c/u</div></div>
<p><strong>Condiciones para devengar comisión:</strong></p>
<p style="margin-left:20px">a) Cliente nuevo.<br>b) Formulario completo.<br>c) Crédito aprobado y desembolsado posterior a la fecha de referencia.</p>
<div class="clausula-title">CLÁUSULA QUINTA - CONFIDENCIALIDAD Y PROTECCIÓN DE DATOS</div>
<p>Ambas partes deberán mantener estricta confidencialidad y cumplir la normativa aplicable, notificando cualquier filtración inmediatamente.</p>
<div class="clausula-title">CLÁUSULA SEXTA - SUPERVISIÓN Y COMUNICACIÓN</div>
<p>Coordinación a cargo del Jefe(a) de Agencia ${val(d.nombreAgencia)} de FUNDEA y el representante designado de LA EMPRESA AFILIADA.</p>
<div class="clausula-title">CLÁUSULA SÉPTIMA - LIMITACIÓN DE RESPONSABILIDAD</div>
<p>FUNDEA es la única entidad responsable del análisis y aprobación del crédito. No se generan relaciones laborales ni obligaciones adicionales.</p>
<div class="clausula-title">CLÁUSULA OCTAVA - TERMINACIÓN</div>
<p>FUNDEA podrá revocar la afiliación en cualquier momento mediante notificación escrita. Cualquier modificación deberá hacerse mediante intercambio de cartas.</p>
<div class="clausula-title">CLÁUSULA NOVENA - VIGENCIA</div>
<p>Esta carta de entendimiento entra en vigencia a partir de su firma y por tiempo indefinido.</p>
<div style="text-align:center;font-weight:bold;margin-top:30px">FIRMAS</div>
<div class="firmas-container">
  <div class="firma-box"><div style="font-weight:bold;margin-bottom:40px">Por FUNDEA:</div><span class="linea-firma"></span><div class="info-firma">Nombre: ${val(d.fundeaNombreRep)}<br>Cargo: ${val(d.fundeaCalidad)}<br>DPI: ${val(d.fundeaDpi)}</div></div>
  <div class="firma-box"><div style="font-weight:bold;margin-bottom:40px">Por la Empresa Afiliada:</div><span class="linea-firma"></span><div class="info-firma">Nombre: ${val(d.afiliadoNombreRep)}<br>Cargo: ${val(d.afiliadoCalidad)}<br>DPI: ${val(d.afiliadoDpi)}</div></div>
</div>
<div class="footer">Oficinas Centrales: 15 avenida 2-09 zona 13, Ciudad de Guatemala. PBX: 2444-2222<br>www.fundea.org.gt</div>
</body></html>`;
  }

}
