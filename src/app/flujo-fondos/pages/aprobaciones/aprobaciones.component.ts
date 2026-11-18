import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BandejaFlujosComponent } from '../../components/bandeja-flujos/bandeja-flujos.component';

/**
 * Bandeja del analista: lista los flujos con filtros y "Aprobar" abre el expediente
 * en /flujo-fondos/aprobacion/revisar?solicitud=N.
 */
@Component({
  selector: 'app-aprobaciones',
  imports: [RouterLink, BandejaFlujosComponent],
  templateUrl: './aprobaciones.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class AprobacionesComponent {}
