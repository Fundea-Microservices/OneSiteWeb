import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { SideMenuHeaderComponent } from "./side-menu-header/side-menu-header";
import { SideMenuListComponent } from "./side-menu-list/side-menu-list";
import { LoadingCatalogsComponent } from './loading-catalogs/loading-catalogs.component';

@Component({
  selector: 'app-side-menu',
  imports: [SideMenuHeaderComponent, SideMenuListComponent, LoadingCatalogsComponent],
  templateUrl: './side-menu.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SideMenuComponent {
  public isMenuOpen = signal(false);

  toggleMenu() {
    this.isMenuOpen.update(value => !value);
  }

  closeMenu() {
    this.isMenuOpen.set(false);
  }
}
