import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AuthService } from '../../../../services/auth.service';
import { Router } from '@angular/router';
import { IMenu } from '../../../../interfaces/auth';

@Component({
  selector: 'app-login-page',
  imports: [],
  templateUrl: './login-page.html',
  styleUrl: './login-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class LoginPageComponent {

  public authService = inject(AuthService)
  public router = inject(Router)

  public user = this.authService.getUserStorage();
  userName = signal('iesteban');
  password = signal('');

  async login() {

    try {
      let authData = await  this.authService.login({ userName: this.userName(), password: this.password() })
      localStorage.setItem('token', authData.body?.data.token || '');
      localStorage.setItem('user', JSON.stringify(authData.body?.data.user || {}));

      if (authData.body?.data.user.rolId) {
        let accesosData = await this.authService.getMenusByRol(authData.body?.data.user.rolId);
        localStorage.setItem('menu', JSON.stringify(accesosData.body?.data.accesos || []));
      }

      this.router.navigate(['/home']);

    } catch (error) {
      console.error('Login failed:', error);
    }
    
  }
}
