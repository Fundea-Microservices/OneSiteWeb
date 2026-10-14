import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { IMesPrestamoProyeccion, IMesProyeccion, IProyeccionFlujo } from '../../../../../interfaces/flujo-fondos';
import { etiquetaFormaPago, formatoFecha, formatoPeriodo } from '../../../utils/flujo';

/**
 * Matriz de la proyección: una fila (ingreso y egreso) por elemento de `filas` y una
 * columna por mes. El pie sale de totales.meses.
 */
@Component({
  selector: 'app-proyeccion-flujo',
  imports: [DecimalPipe],
  templateUrl: './proyeccion-flujo.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProyeccionFlujoComponent {

  proyeccion = input.required<IProyeccionFlujo>();

  // Las columnas salen de los totales: siempre traen todos los meses del plazo
  columnas = computed(() => this.proyeccion().totales.meses.map(m => ({
    numeroMes: m.numeroMes,
    etiqueta: formatoPeriodo(m.periodo),
  })));

  readonly formatoFecha = formatoFecha;
  readonly etiquetaFormaPago = etiquetaFormaPago;

  /** Tooltip de la cuota: cuánto es capital y cuánto interés. */
  detallePago(mes: IMesPrestamoProyeccion | undefined): string {
    if (!mes?.cuota) return '';
    return `Capital ${mes.capital.toFixed(2)} · Interés ${mes.interes.toFixed(2)}`;
  }

  /** Tooltip de la celda: en qué mes del ciclo cae y qué porcentaje aplica. */
  detalleMes(mes: IMesProyeccion | undefined, tipo: 'INGRESO' | 'EGRESO'): string {
    if (!mes || this.proyeccion().agrupado) return '';
    if (mes.mesCiclo === null || mes.mesCiclo === undefined) return 'Antes de la siembra';
    const porcentaje = tipo === 'INGRESO' ? mes.porcentajeIngreso : mes.porcentajeEgreso;
    return `Mes ${mes.mesCiclo} del ciclo · ${porcentaje ?? 0} %`;
  }

  antesDeSiembra(mes: IMesProyeccion | undefined): boolean {
    return !this.proyeccion().agrupado && !!mes && (mes.mesCiclo === null || mes.mesCiclo === undefined);
  }
}
