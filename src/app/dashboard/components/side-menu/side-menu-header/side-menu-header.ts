import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AuthService } from '../../../../../services/auth.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-side-menu-header',
  imports: [RouterLink],
  templateUrl: './side-menu-header.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SideMenuHeaderComponent {

  private authService = inject(AuthService);

  public user = this.authService.getUserStorage();

 }
