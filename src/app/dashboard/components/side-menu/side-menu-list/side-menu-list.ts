import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-side-menu-list',
  imports: [],
  templateUrl: './side-menu-list.html',
  styleUrl: './side-menu-list.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SideMenuListComponent { }
