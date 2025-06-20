import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AuthService } from '../../../../services/auth.service';
import { Router } from '@angular/router';
import { IMenu } from '../../../../interfaces/auth';
import { AccesoService } from '../../../../services/acceso.service';

@Component({
  selector: 'app-login-page',
  imports: [],
  templateUrl: './login-page.html',
  styleUrl: './login-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class LoginPageComponent {

  public authService = inject(AuthService)
  public accesoService = inject(AccesoService)
  public router = inject(Router)

  public user = this.authService.getUserStorage();
  userName = signal('');
  password = signal('');

  errorObj = signal<{ message: string; code: number, isError: boolean }>({
    message: '',
    code: 0,
    isError: false
  });

  loading = signal(false);

  async login() {

    try {
      this.loading.set(true);
      this.errorObj.set({
        message: '',
        code: 0,
        isError: false
      })

      let authData = await  this.authService.login({ userName: this.userName(), password: this.password() })
      this.loading.set(false);
      if(authData.success) {
        localStorage.setItem('token', authData?.data.token || '');
        localStorage.setItem('user', JSON.stringify(authData?.data.user || {}));

        this.errorObj.set({
          message: '',
          code: 0,
          isError: false
        });

        if (authData?.data.user.rolId) {
          let accesosData = await this.accesoService.getAccesosByRol(authData?.data.user.rolId);
          if( accesosData) {
            localStorage.setItem('accesos', JSON.stringify(accesosData.body?.data.accesos || []));
            if(accesosData.body?.data.accesos.length == 0) {
              this.authService.logout('No hay configurados accesos para su rol');
            }
          } else {
            this.authService.logout('No se encontraron accesos para el rol');
          }
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
      this.loading.set(false);
      console.error('Login failed:', error);
    }
    
  }
}
