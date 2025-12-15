import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AuthAliadoService } from '../../../../../services/aliado/auth.service';
import { RouterLink, RouterModule } from '@angular/router';

@Component({
  selector: 'app-side-menu-aliados',
  imports: [RouterLink, RouterModule],
  templateUrl: './side-menu-aliados.component.html',
  styleUrls: ['./side-menu-aliados.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SideMenuAliadosComponent { 
  public authService = inject(AuthAliadoService)

  public user = this.authService.getUserStorage();
 }
