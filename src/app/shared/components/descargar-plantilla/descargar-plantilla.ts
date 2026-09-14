import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, inject, input, OnInit, signal } from '@angular/core';
import { PlantillasService } from '../../../../services/config/plantillas.service';
import { IPlantilla } from '../../../../interfaces/plantillas/plantilla';

/**
 * Botón "Descargar plantilla" para los módulos que ofrecen un Excel de carga.
 * Solo aparece si la plantilla existe y está activa (se administran en Configuración > Plantillas).
 *
 *   <app-descargar-plantilla codigo="ONE-EX-USUARIO" />
 */
@Component({
  selector: 'app-descargar-plantilla',
  imports: [],
  templateUrl: './descargar-plantilla.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Sin caja propia: si la plantilla no está disponible no deja un hueco en el contenedor flex
  host: { style: 'display: contents' },
})
export class DescargarPlantillaComponent implements OnInit {
  private plantillasService = inject(PlantillasService);

  /** Código de la plantilla, ej. "ONE-EX-USUARIO". */
  codigo = input.required<string>();

  plantilla = signal<IPlantilla | null>(null);
  descargando = signal(false);

  async ngOnInit() {
    const resp = await this.plantillasService.getPlantillaByCodigo(this.codigo());
    this.plantilla.set(resp?.data ?? null);
  }

  async descargar() {
    const plantilla = this.plantilla();
    if (!plantilla || this.descargando()) return;
    this.descargando.set(true);
    try {
      await this.plantillasService.descargarPlantilla(plantilla.codigo, plantilla.nombre, plantilla.mimeType);
    } finally {
      this.descargando.set(false);
    }
  }
}
