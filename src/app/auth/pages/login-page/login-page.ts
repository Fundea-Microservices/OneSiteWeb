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

  errorObj = signal<{ message: string; code: number, isError: boolean }>({
    message: '',
    code: 0,
    isError: false
  });

  async login() {

    try {

      let authData = await  this.authService.login({ userName: this.userName(), password: this.password() })
      if(authData.success) {
        localStorage.setItem('token', authData?.data.token || '');
        localStorage.setItem('user', JSON.stringify(authData?.data.user || {}));

        this.errorObj.set({
          message: '',
          code: 0,
          isError: false
        });

        if (authData?.data.user.rolId) {
          let accesosData = await this.authService.getMenusByRol(authData?.data.user.rolId);
          localStorage.setItem('menu', JSON.stringify(accesosData.body?.data.accesos || []));
        }

        this.router.navigate(['/home']);
      } else {
        this.errorObj.set({
          message: authData.message || 'Login failed',
          code: 401,
          isError: true
        });
      }

    } catch (error) {
      console.error('Login failed:', error);
    }
    
  }
}
