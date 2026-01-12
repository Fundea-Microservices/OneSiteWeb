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

  async ngOnInit(): Promise<void> {
    await this.loadData();
    
    // Si es nuevo, buscar y seleccionar el estado "Espera" automáticamente
    if (this.nuevo()) {
      this.seleccionarEstadoEspera();
    }
    
    if (this.solicitudData() && !this.nuevo()) {
      this.populateForm();
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
  }

  onRegionChange(regionId: string): void {
    this.selectedRegion.set(regionId);
    this.selectedAgencia.set('');
    this.agenciasFilterradas.set(
      this.agencias().filter((a) => a.regionId === regionId)
    );
  }

  onArchivoSeleccionado(event: Event): void {
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
      }, 250);
    }
  }

  private crearHTMLDocumento(rep: Representante): string {
    const hoy = new Date().toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Solicitud de Afiliación</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            padding: 40px;
          }
          
          .container {
            max-width: 800px;
            margin: 0 auto;
            border: 2px solid #000;
            padding: 40px;
            background: white;
          }
          
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #000;
            padding-bottom: 20px;
          }
          
          .header h1 {
            font-size: 24px;
            margin-bottom: 10px;
          }
          
          .header p {
            font-size: 12px;
            color: #666;
          }
          
          .section {
            margin-bottom: 25px;
          }
          
          .section-title {
            font-weight: bold;
            font-size: 14px;
            border-bottom: 1px solid #000;
            padding-bottom: 5px;
            margin-bottom: 10px;
          }
          
          .row {
            display: flex;
            gap: 30px;
            margin-bottom: 10px;
          }
          
          .col {
            flex: 1;
          }
          
          .field {
            margin-bottom: 12px;
          }
          
          .label {
            font-weight: bold;
            font-size: 11px;
            color: #000;
          }
          
          .value {
            font-size: 11px;
            color: #333;
            padding: 4px 0;
            border-bottom: 1px solid #ccc;
            min-height: 18px;
          }
          
          .signature-section {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #000;
          }
          
          .signature-line {
            display: flex;
            justify-content: space-around;
            margin-top: 50px;
          }
          
          .signature-box {
            text-align: center;
            width: 150px;
          }
          
          .sig-line {
            border-top: 1px solid #000;
            margin-top: 30px;
            padding-top: 5px;
            font-size: 10px;
          }
          
          .date-section {
            text-align: center;
            margin-bottom: 20px;
            font-size: 11px;
          }
          
          @media print {
            body {
              padding: 0;
            }
            .container {
              border: none;
              max-width: 100%;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>SOLICITUD DE AFILIACIÓN</h1>
            <p>Fundación para el Desarrollo Empresarial (FUNDEA)</p>
          </div>
          
          <div class="date-section">
            <strong>Fecha:</strong> ${hoy}
          </div>
          
          <div class="section">
            <div class="section-title">DATOS DEL REPRESENTANTE</div>
            <div class="row">
              <div class="col">
                <div class="field">
                  <span class="label">Nombre Completo:</span>
                  <div class="value">${this.getNombreCompleto()}</div>
                </div>
              </div>
              <div class="col">
                <div class="field">
                  <span class="label">Documento:</span>
                  <div class="value">${rep.documento || ''}</div>
                </div>
              </div>
            </div>
            
            <div class="row">
              <div class="col">
                <div class="field">
                  <span class="label">NIT:</span>
                  <div class="value">${rep.nit || ''}</div>
                </div>
              </div>
              <div class="col">
                <div class="field">
                  <span class="label">Teléfono Celular:</span>
                  <div class="value">${rep.telefonoCelular || ''}</div>
                </div>
              </div>
            </div>
            
            <div class="row">
              <div class="col">
                <div class="field">
                  <span class="label">Correo Electrónico:</span>
                  <div class="value">${rep.correoElectronico || ''}</div>
                </div>
              </div>
              <div class="col">
                <div class="field">
                  <span class="label">Teléfono Fijo:</span>
                  <div class="value">${rep.telefonoFijo || ''}</div>
                </div>
              </div>
            </div>
            
            <div class="row">
              <div class="col">
                <div class="field">
                  <span class="label">Dirección:</span>
                  <div class="value">${rep.direccion || ''}</div>
                </div>
              </div>
            </div>
            
            <div class="row">
              <div class="col">
                <div class="field">
                  <span class="label">Fecha de Nacimiento:</span>
                  <div class="value">${rep.fechaNacimiento ? new Date(rep.fechaNacimiento).toLocaleDateString('es-ES') : ''}</div>
                </div>
              </div>
              <div class="col">
                <div class="field">
                  <span class="label">Sexo:</span>
                  <div class="value">${rep.sexo === 'M' ? 'Masculino' : rep.sexo === 'F' ? 'Femenino' : ''}</div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="section">
            <div class="section-title">DATOS DE ACTIVIDAD LABORAL</div>
            <div class="row">
              <div class="col">
                <div class="field">
                  <span class="label">Nombre Empresa:</span>
                  <div class="value">${rep.nombreEmpresa || ''}</div>
                </div>
              </div>
              <div class="col">
                <div class="field">
                  <span class="label">Ingresos Mensuales:</span>
                  <div class="value">Q ${(rep.ingresos || 0).toLocaleString('es-ES')}</div>
                </div>
              </div>
            </div>
            
            <div class="row">
              <div class="col">
                <div class="field">
                  <span class="label">Fecha Inicio Actividad:</span>
                  <div class="value">${rep.fechaInicioActividad ? new Date(rep.fechaInicioActividad).toLocaleDateString('es-ES') : ''}</div>
                </div>
              </div>
              <div class="col">
                <div class="field">
                  <span class="label">Profesión/Ocupación:</span>
                  <div class="value"></div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="signature-section">
            <p style="font-size: 12px; margin-bottom: 10px;"><strong>Declaración:</strong></p>
            <p style="font-size: 11px; line-height: 1.8; margin-bottom: 20px;">
              Declaro bajo protesta de decir verdad que todos los datos e información proporcionada en este documento son correctos y verídicos. Autorizo a FUNDEA para que verifique la información contenida en esta solicitud.
            </p>
            
            <div class="signature-line">
              <div class="signature-box">
                <div class="sig-line">
                  <strong>${this.getNombreCompleto()}</strong><br>
                  Firma del Representante
                </div>
              </div>
              <div class="signature-box">
                <div class="sig-line">Fecha</div>
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}
