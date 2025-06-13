import { Component, inject } from '@angular/core';
import { SideMenuComponent } from "../../components/side-menu/side-menu.component";
import { RouterOutlet } from '@angular/router';
import { AuthService } from '../../../../services/auth.service';

@Component({
  selector: 'app-dashboard-page',
  imports: [SideMenuComponent, RouterOutlet],
  templateUrl: './dashboard-page.html',
})
export default class DashboardPageComponent { 

  public authService = inject(AuthService)

  public user = this.authService.getUserStorage();

}
