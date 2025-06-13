import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-config-page',
  imports: [RouterOutlet],
  templateUrl: './config-page.html',
  styleUrl: './config-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ConfigPageComponent { }
