import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-dashboard-aliado',
  imports: [RouterOutlet],
  templateUrl: './dashboard-aliado.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class DashboardAliadoComponent { }
