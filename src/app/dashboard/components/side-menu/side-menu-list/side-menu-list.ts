import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, inject } from '@angular/core';
import { AuthService } from '../../../../../services/auth.service';
import { Router, RouterLink } from '@angular/router';
import { SideMenuListItemComponent } from '../side-menu-list-item/side-menu-list-item';
import { AccesoService } from '../../../../../services/acceso.service';

@Component({
  selector: 'app-side-menu-list',
  imports: [RouterLink],
  templateUrl: './side-menu-list.html',
  styleUrl: './side-menu-list.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SideMenuListComponent { 

  public authService = inject(AuthService);
  public accesoService = inject(AccesoService);
  
  public router = inject(Router)

  public accesos: any[] = [];

  ngOnInit(): void {
    this.accesos = this.accesoService.getAccesosStorage() || [];
  }


  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
