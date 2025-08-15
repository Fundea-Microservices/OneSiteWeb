import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ReporteService } from '../../../../services/reportes/reporte.service';
import { IReporte } from '../../../../interfaces/reportes/reporte';
import ReporteAtributosComponent from '../reporte-atributos/reporte-atributos.component';
import ReporteParametrosComponent from '../reporte-parametros/reporte-parametros.component';
import ReglasEjecucionComponent from '../reglas-ejecucion/reglas-ejecucion.component';

@Component({
  selector: 'app-reporte-detalle',
  imports: [RouterLink, ReporteAtributosComponent, ReporteParametrosComponent, ReglasEjecucionComponent],
  templateUrl: './reporte-detalle.component.html',
  styleUrls: ['./reporte-detalle.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ReporteDetalleComponent { 
  reporteService = inject(ReporteService);
  buscandoReporte = signal(true)
  sinReporte = signal(true)
  reporte = signal<IReporte>({} as IReporte)
  reporteId = signal('')

  mostrarProcedimiento = false;

  constructor (private route: ActivatedRoute) {}

  ngOnInit() {
    this.fetchData();
  }

  async fetchData() {
    this.buscandoReporte.set(true);
    this.sinReporte.set(true);
    // Obtenemos el id de la ruta
    this.reporteId.set(this.route.snapshot.paramMap.get('id') || '');
    const response = await this.reporteService.getReporteById(this.reporteId());
    if (response?.data) {
      this.reporte.set(response.data);
      this.sinReporte.set(false)
    } else {
      this.sinReporte.set(true);
    }
    this.buscandoReporte.set(false);
  }
}
