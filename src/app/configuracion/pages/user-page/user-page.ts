import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, inject } from '@angular/core';
import { BreadcrumbComponent } from "../../../shared/components/breadcrumb/breadcrumb";
import { AuthService } from '../../../../services/auth.service';

@Component({
  selector: 'app-user-page',
  imports: [BreadcrumbComponent],
  templateUrl: './user-page.html',
  styleUrl: './user-page.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class UserPageComponent {

  private authService = inject(AuthService);

  public user = this.authService.getUserStorage(); 

 }
