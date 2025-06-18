import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IAcceso } from '../../../../../interfaces/acceso';

@Component({
  selector: 'app-side-menu-list-item',
  imports: [RouterLink],
  templateUrl: './side-menu-list-item.html',
  styleUrl: './side-menu-list-item.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SideMenuListItemComponent {

  acceso = input.required<IAcceso>();
 }
