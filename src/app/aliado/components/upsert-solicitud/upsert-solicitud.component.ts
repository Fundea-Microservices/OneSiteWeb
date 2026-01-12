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
  template: `
    <form (ngSubmit)="onSubmit()" class="needs-validation">
      <!-- Información del Solicitante y Entidad -->
      <div class="row mb-4">
        <div class="col-md-6">
          <div class="card bg-light">
            <div class="card-body">
              <h6 class="card-title text-primary mb-2">
                <i class="bi bi-person-circle me-2"></i>Solicitante
              </h6>
              <p class="card-text mb-0 fw-semibold">{{ getNombreCompleto() }}</p>
              @if (representante()?.correoElectronico) {
              <p class="card-text text-muted small mb-0">{{ representante()?.correoElectronico }}</p>
              }
            </div>
          </div>
        </div>
        <div class="col-md-6">
          <div class="card bg-light">
            <div class="card-body">
              <h6 class="card-title text-success mb-2">
                <i class="bi bi-building me-2"></i>Entidad
              </h6>
              <p class="card-text mb-0 fw-semibold">{{ empresa()?.nombreEmpresa || 'Sin empresa' }}</p>
              @if (cuentaBancaria()?.numeroCuenta) {
              <p class="card-text text-muted small mb-0">
                <i class="bi bi-bank2 me-1"></i>Cuenta: {{ cuentaBancaria()?.numeroCuenta }}
              </p>
              }
            </div>
          </div>
        </div>
      </div>

      <div class="row mb-3">
        <div class="col-md-6">
          <label for="tipoSolicitud" class="form-label">Tipo de Solicitud *</label>
          <select
            id="tipoSolicitud"
            class="form-select"
            [(ngModel)]="selectedTipoSolicitud"
            name="tipoSolicitud"
            required
            [disabled]="isLoading()"
          >
            <option value="">Selecciona un tipo de solicitud</option>
            @for (tipo of tiposSolicitud(); track tipo.tipoSolicitudId) {
            <option [value]="tipo.tipoSolicitudId">{{ tipo.nombre }}</option>
            }
          </select>
        </div>

        <div class="col-md-6">
          <label for="estadoSolicitud" class="form-label">Estado de Solicitud *</label>
          <select
            id="estadoSolicitud"
            class="form-select"
            [(ngModel)]="selectedEstadoSolicitud"
            name="estadoSolicitud"
            required
            [disabled]="isLoading() || estadoDeshabilitado()"
          >
            <option value="">Selecciona un estado de solicitud</option>
            @for (estado of estadosSolicitud(); track estado.estadoSolicitudId) {
            <option [value]="estado.estadoSolicitudId">{{ estado.nombre }}</option>
            }
          </select>
          @if (estadoDeshabilitado()) {
          <small class="text-muted">Estado automático para nuevas solicitudes</small>
          }
        </div>
      </div>

      <div class="row mb-3">
        <div class="col-md-6">
          <label for="tipoAfiliacion" class="form-label">Tipo de Afiliación *</label>
          <select
            id="tipoAfiliacion"
            class="form-select"
            [(ngModel)]="selectedTipoAfiliacion"
            name="tipoAfiliacion"
            required
            [disabled]="isLoading()"
          >
            <option value="">Selecciona un tipo de afiliación</option>
            @for (tipo of tiposAfiliacion(); track tipo.tipoAfiliacionId) {
            <option [value]="tipo.tipoAfiliacionId">{{ tipo.nombre }}</option>
            }
          </select>
        </div>

        <div class="col-md-6">
          <label for="region" class="form-label">Región *</label>
          <select
            id="region"
            class="form-select"
            [(ngModel)]="selectedRegion"
            name="region"
            (change)="onRegionChange(selectedRegion())"
            required
            [disabled]="isLoading()"
          >
            <option value="">Selecciona una región</option>
            @for (region of regiones(); track region.regionId) {
            <option [value]="region.regionId">{{ region.nombre }}</option>
            }
          </select>
        </div>
      </div>

      <div class="row mb-3">
        <div class="col-md-6">
          <label for="agencia" class="form-label">Agencia *</label>
          <select
            id="agencia"
            class="form-select"
            [(ngModel)]="selectedAgencia"
            name="agencia"
            required
            [disabled]="isLoading() || selectedRegion() === ''"
          >
            <option value="">Selecciona una agencia</option>
            @for (agencia of agenciasFilterradas(); track agencia.agenciaId) {
            <option [value]="agencia.agenciaId">{{ agencia.nombre }}</option>
            }
          </select>
        </div>

        <div class="col-md-6">
          <label for="archivo" class="form-label">Archivo PDF</label>
          <div class="input-group">
            <input
              type="file"
              id="archivo"
              class="form-control"
              accept=".pdf"
              (change)="onArchivoSeleccionado($event)"
              [disabled]="isLoading()"
            />
            @if (nombreArchivo()) {
            <span class="input-group-text text-success">✓ {{ nombreArchivo() }}</span>
            }
          </div>
        </div>
      </div>

      <div class="row mb-3">
        <div class="col-12">
          <label for="observaciones" class="form-label">Observaciones</label>
          <textarea
            id="observaciones"
            class="form-control"
            [(ngModel)]="observaciones"
            name="observaciones"
            rows="3"
            placeholder="Ingrese observaciones adicionales..."
            [disabled]="isLoading()"
          ></textarea>
        </div>
      </div>

      <div class="row">
        <div class="col-12">
          <button type="submit" class="btn btn-primary" [disabled]="isLoading()">
            @if (isLoading()) {
            <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
            } {{ nuevo() ? 'Crear Solicitud' : 'Actualizar Solicitud' }}
          </button>
          <button type="button" class="btn btn-secondary ms-2" (click)="onCancel()" [disabled]="isLoading()">
            Cancelar
          </button>
        </div>
      </div>
    </form>
  `,
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
}
