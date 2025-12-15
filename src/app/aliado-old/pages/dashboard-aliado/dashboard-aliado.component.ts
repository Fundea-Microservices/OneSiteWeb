import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SideMenuAliadosComponent } from '../../components/common/side-menu-aliados/side-menu-aliados.component';

@Component({
  selector: 'app-dashboard-aliado',
  imports: [RouterOutlet, SideMenuAliadosComponent],
  templateUrl: './dashboard-aliado.component.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class DashboardAliadoComponent { }
