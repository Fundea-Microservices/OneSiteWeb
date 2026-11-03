import {
  ChangeDetectionStrategy,
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  ViewChild,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Modal } from 'bootstrap';
import { IResumenActividades } from '../../../../../interfaces/flujo-fondos';
import { FlujoFondosService } from '../../../../../services/flujo-fondos/flujo-fondos.service';
import { formatoFecha, formatoPeriodo, nombreMes } from '../../../utils/flujo';

const MESES_POR_ANIO = 12;

/**
 * Modal "Sección I: Actividades Económicas": ingresos y egresos por año de cada actividad
 * de un flujo guardado. Los netos y totales son los del API, no se recalculan.
 */
@Component({
  selector: 'app-resumen-actividades',
  imports: [DecimalPipe],
  templateUrl: './resumen-actividades.html',
  // Mismo caso que la matriz de la proyección: los fondos de las celdas de .table
  // necesitan estilos propios porque Bootstrap le gana a las utilidades de Tailwind.
  styles: `
    .encabezado {
      background-color: var(--bs-dark);
      color: #FFFFFF;
    }
    .encabezado-ingreso { color: var(--bs-success-border-subtle); }
    .encabezado-egreso { color: var(--bs-danger-border-subtle); }
    .celda-ingreso { background-color: var(--bs-success-bg-subtle); }
    .celda-egreso { background-color: var(--bs-danger-bg-subtle); }
    .celda-margen { background-color: var(--bs-primary-bg-subtle); }
    .celda-total { background-color: var(--bs-tertiary-bg); }
    .etiqueta-cultivo {
      background-color: var(--bs-success-bg-subtle);
      border: 1px solid var(--bs-success-border-subtle);
      color: var(--bs-success-text-emphasis);
    }
    .etiqueta-pecuario {
      background-color: #F3E8FF;
      border: 1px solid #E9D5FF;
      color: #6B21A8;
    }
    .etiqueta-otra {
      background-color: var(--bs-secondary-bg-subtle);
      border: 1px solid var(--bs-secondary-border-subtle);
      color: var(--bs-secondary-text-emphasis);
    }
  `,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResumenActividadesComponent {
  private flujoService = inject(FlujoFondosService);

  readonly formatoFecha = formatoFecha;
  readonly formatoPeriodo = formatoPeriodo;
  readonly nombreMes = nombreMes;

  resumen = signal<IResumenActividades | null>(null);
  cargando = signal(false);
  private secuencia = 0;

  /** Sus montos solo cubren los meses dentro del plazo: 0 significa que el año no se proyectó. */
  avisos = computed(() => (this.resumen()?.anios ?? [])
    .filter(a => a.mesesProyectados < MESES_POR_ANIO)
    .map(a => {
      if (a.mesesProyectados === 0) return `Año ${a.anio}: no se proyectó, por eso sus montos están en 0.`;
      return a.mesesProyectados === 1
        ? `Año ${a.anio}: solo incluye 1 mes proyectado.`
        : `Año ${a.anio}: solo incluye ${a.mesesProyectados} meses proyectados.`;
    }));

  @ViewChild('resumenModal') modalElementRef!: ElementRef;
  private modalInstance?: Modal;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.modalInstance?.dispose());
  }

  async abrir(flujoId: string) {
    const secuencia = ++this.secuencia;
    this.resumen.set(null);
    this.cargando.set(true);
    if (!this.modalInstance) {
      this.modalInstance = new Modal(this.modalElementRef.nativeElement);
    }
    this.modalInstance.show();

    const resumen = await this.flujoService.getResumenActividades(flujoId);

    // Llegó una respuesta vieja: el modal se volvió a abrir mientras se consultaba
    if (secuencia !== this.secuencia) return;
    this.resumen.set(resumen);
    this.cargando.set(false);
  }

  claseActividad(actividad: string): string {
    const nombre = actividad?.trim().toLowerCase();
    if (nombre === 'cultivo') return 'etiqueta-cultivo';
    if (nombre === 'pecuario') return 'etiqueta-pecuario';
    return 'etiqueta-otra';
  }
}
