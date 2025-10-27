import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AuthService } from '../../../../services/auth.service';
import { Router } from '@angular/router';
import { IMenu } from '../../../../interfaces/auth';
import { AccesoService } from '../../../../services/acceso.service';
import { UpperCasePipe } from '@angular/common';
import { ConfiguracionService } from '../../../../services/configuracion.service';

@Component({
  selector: 'app-login-page',
  imports: [UpperCasePipe],
  templateUrl: './login-page.html',
  styleUrl: './login-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class LoginPageComponent {

  public authService = inject(AuthService)
  public configService = inject(ConfiguracionService)
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

  entorno = signal({
    ambiente: 'SIN DEFINIR',
    version: '1.0.0',
    textColor: '#3c5ce8',
    bgColor: '#d1d6f0'
  });

  ngOnInit() {
    this.fetchData();
  }

  async fetchData() {
    // Buscamos los parámetros de configuración inicial si es que hay
    let entornoAmbiente = await this.configService.getConfigByKey('entorno_ambiente');
    let entornoColor = await this.configService.getConfigByKey('entorno_color');
    let entornoColorFondo = await this.configService.getConfigByKey('entorno_color_fondo');

    if(entornoAmbiente && entornoAmbiente.data) {
      this.entorno.set({
        ...this.entorno(),
        ambiente: String(entornoAmbiente.data.value)
      });
    }
    if(entornoColor && entornoColor.data) {
      this.entorno.set({
        ...this.entorno(),
        textColor: String(entornoColor.data.value)
      });
    }
    if(entornoColorFondo && entornoColorFondo.data) {
      this.entorno.set({
        ...this.entorno(),
        bgColor: String(entornoColorFondo.data.value)
      });
    }
    
  }

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
        this.loading.set(false);
        this.router.navigate(['/home']);
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
