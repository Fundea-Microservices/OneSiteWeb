import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthAliadoService } from '../../../../services/aliado/auth.service';

@Component({
  selector: 'app-login-aliado',
  imports: [RouterLink],
  templateUrl: './login-aliado.component.html',
  styleUrls: ['./login-aliado.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class LoginAliadoComponent { 
  
  public authService = inject(AuthAliadoService)  
  public userAliado = this.authService.getUserStorage();
  public router = inject(Router)

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
      if(authData.success) {
        localStorage.setItem('tokenAliado', authData?.data.token || '');
        localStorage.setItem('userAliado', JSON.stringify(authData?.data.user || {}));

        this.errorObj.set({
          message: '',
          code: 0,
          isError: false
        });
        this.loading.set(false);
        this.router.navigate(['/aliado/home']);
      } else {
        this.loading.set(false);
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
