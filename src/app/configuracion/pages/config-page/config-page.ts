import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-config-page',
  imports: [RouterOutlet],
  templateUrl: './config-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ConfigPageComponent { }
