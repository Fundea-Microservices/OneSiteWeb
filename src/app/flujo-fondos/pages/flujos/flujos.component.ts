import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BandejaFlujosComponent } from '../../components/bandeja-flujos/bandeja-flujos.component';

/** Bandeja de flujos de fondos del asesor: ver, editar y crear. */
@Component({
  selector: 'app-flujos',
  imports: [RouterLink, BandejaFlujosComponent],
  templateUrl: './flujos.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class FlujosComponent {}
