import { Component, CUSTOM_ELEMENTS_SCHEMA, inject, viewChild } from '@angular/core';
import { SideMenuComponent } from "../../components/side-menu/side-menu.component";
import { RouterOutlet } from '@angular/router';
import { AuthService } from '../../../../services/auth.service';

@Component({
  selector: 'app-dashboard-page',
  imports: [SideMenuComponent, RouterOutlet],
  templateUrl: './dashboard-page.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export default class DashboardPageComponent {

  public authService = inject(AuthService)
  public sideMenu = viewChild(SideMenuComponent);

  public user = this.authService.getUserStorage();

  toggleMenu() {
    this.sideMenu()?.toggleMenu();
  }

}
