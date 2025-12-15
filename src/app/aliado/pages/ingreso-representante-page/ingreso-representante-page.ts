import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-ingreso-representante-page',
  imports: [RouterLink],
  templateUrl: './ingreso-representante-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class IngresoRepresentantePage { }
