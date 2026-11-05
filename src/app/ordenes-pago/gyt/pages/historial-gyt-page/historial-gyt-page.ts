import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { OrdenesGytService } from '../../../../../services/ordenes-gyt/ordenes-gyt.service';
import { ConsultarPorFechaGytDto, EstadoOrdenGyt, OrdenGytApiDetalle } from '../../../../../interfaces/ordenes-gyt/orden-gyt';

@Component({
  selector: 'app-historial-gyt-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './historial-gyt-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class HistorialGytPageComponent {

  fechaInicio = signal('');
  fechaFin    = signal('');
  etapa       = signal('');

  isLoading     = signal(false);
  ordenes       = signal<OrdenGytApiDetalle[]>([]);
  errorBusqueda = signal('');
  buscado       = signal(false);

  constructor(private ordenesService: OrdenesGytService) {}

  get formularioValido(): boolean {
    return this.fechaInicio().trim() !== '' && this.fechaFin().trim() !== '';
  }

  private yyyymmddToDdmmyyyy(fecha: string): string {
    const [y, m, d] = fecha.split('-');
    return `${d}/${m}/${y}`;
  }

  async buscar() {
    if (!this.formularioValido) return;

    this.isLoading.set(true);
    this.errorBusqueda.set('');
    this.ordenes.set([]);
    this.buscado.set(false);

    const dto: ConsultarPorFechaGytDto = {
      fechaInicio: this.yyyymmddToDdmmyyyy(this.fechaInicio()),
      fechaFin:    this.yyyymmddToDdmmyyyy(this.fechaFin()),
      ...(this.etapa() ? { etapa: this.etapa() as ConsultarPorFechaGytDto['etapa'] } : {})
    };

    try {
      const resp = await firstValueFrom(this.ordenesService.consultarPorFechaApi(dto));
      const lista: OrdenGytApiDetalle[] = Array.isArray(resp?.data) ? resp.data
        : Array.isArray(resp) ? resp
        : [];
      this.ordenes.set(lista);
    } catch (error: any) {
      this.errorBusqueda.set(error?.error?.message ?? error?.message ?? 'Error al consultar el historial');
    } finally {
      this.isLoading.set(false);
      this.buscado.set(true);
    }
  }

  getUltimoEstado(orden: OrdenGytApiDetalle): EstadoOrdenGyt | null {
    if (!orden.estados?.length) return null;
    return orden.estados.reduce((prev, curr) =>
      curr.ordenSecuencia > prev.ordenSecuencia ? curr : prev
    ).estado;
  }

  getEstadoBadgeClass(estado: string | null): string {
    switch (estado?.toUpperCase()) {
      case 'CREADO':       return 'bg-secondary';
      case 'REVISADO':     return 'bg-info text-dark';
      case 'PENDIENTE':    return 'bg-warning text-dark';
      case 'AUTORIZADO':   return 'bg-primary';
      case 'EN_COLA_PAGO': return 'bg-dark';
      case 'PAGADO':       return 'bg-success';
      case 'ERROR_PAGO':   return 'bg-danger';
      case 'ELIMINADO':    return 'bg-danger';
      default:             return 'bg-secondary';
    }
  }
}
