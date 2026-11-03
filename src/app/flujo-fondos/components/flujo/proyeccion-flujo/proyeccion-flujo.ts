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
  // La identidad deja las celdas de .table con fondo transparente (--bs-table-bg) y esa regla
  // de Bootstrap le gana a las utilidades de Tailwind (que van en @layer): la columna fija
  // necesita un fondo sólido propio para que los meses no se vean por debajo al deslizar.
  styles: `
    .col-fija {
      position: sticky;
      left: 0;
      z-index: 1;
      background-color: var(--bs-body-bg);
      /* Con border-collapse el borde no viaja con la celda fija: se dibuja la separación */
      box-shadow: inset -1px 0 0 var(--bs-border-color);
    }
    .col-fija-encabezado {
      z-index: 2;
      background-color: var(--bs-tertiary-bg);
    }
  `,
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
    if (mes.mesCiclo === null || mes.mesCiclo === undefined) return 'Fuera del ciclo';
    const porcentaje = tipo === 'INGRESO' ? mes.porcentajeIngreso : mes.porcentajeEgreso;
    return `Mes ${mes.mesCiclo} del ciclo · ${porcentaje ?? 0} %`;
  }

  fueraDelCiclo(mes: IMesProyeccion | undefined): boolean {
    return !this.proyeccion().agrupado && !!mes && (mes.mesCiclo === null || mes.mesCiclo === undefined);
  }
}
