import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, inject, signal } from '@angular/core';
import { AuthService } from '../../../../services/auth.service';
import { Router } from '@angular/router';
import { IMenu } from '../../../../interfaces/auth';
import { AccesoService } from '../../../../services/config/acceso.service';
import { UpperCasePipe } from '@angular/common';
import { ConfiguracionService } from '../../../../services/config/configuracion.service';
import { CatalogosBantotalService } from '../../../../services/api-bantotal/catalogos.service';
import { LoadingScreenComponent } from '../../../shared/components/loading-screen/loading-screen.component';

@Component({
  selector: 'app-login-page',
  imports: [UpperCasePipe, LoadingScreenComponent],
  templateUrl: './login-page.html',
  styleUrl: './login-page.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class LoginPageComponent {

  public authService = inject(AuthService)
  public configService = inject(ConfiguracionService)
  public accesoService = inject(AccesoService)
  public catalogosService = inject(CatalogosBantotalService)
  public router = inject(Router)

  public user = this.authService.getUserStorage();
  userName = signal('');
  password = signal('');

  private readonly EXTERNO_PREF_KEY = 'login_externo';

  /** Switch del formulario: envía las credenciales al login de OneSiteEx */
  esExterno = signal(localStorage.getItem(this.EXTERNO_PREF_KEY) === '1');

  onPasswordInput(value: string) {
    this.password.set(value);
  }

  toggleExterno() {
    const valor = !this.esExterno();
    this.esExterno.set(valor);
    localStorage.setItem(this.EXTERNO_PREF_KEY, valor ? '1' : '0');
    // Un mensaje del otro modo ya no aplica
    this.errorObj.set({ message: '', code: 0, isError: false });
  }

  verPassword = signal(false);
  toggleVerPassword() { this.verPassword.update(v => !v); }

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

  private readonly ENTORNO_CACHE_KEY = 'entorno_config';
  refreshingEntorno = signal(false);

  ngOnInit() {
    this.fetchData();
  }

  async fetchData(forceRefresh = false) {
    if (!forceRefresh) {
      const cached = localStorage.getItem(this.ENTORNO_CACHE_KEY);
      if (cached) {
        try {
          this.entorno.set({ ...this.entorno(), ...JSON.parse(cached) });
          return;
        } catch {
          // caché corrupto, continuar con el API
        }
      }
    }

    const [entornoAmbiente, entornoColor, entornoColorFondo] = await Promise.all([
      this.configService.getConfigByKey('entorno_ambiente'),
      this.configService.getConfigByKey('entorno_color'),
      this.configService.getConfigByKey('entorno_color_fondo'),
    ]);

    const updates: Partial<{ ambiente: string; textColor: string; bgColor: string }> = {};
    if (entornoAmbiente?.data) updates.ambiente    = String(entornoAmbiente.data.value);
    if (entornoColor?.data)     updates.textColor   = String(entornoColor.data.value);
    if (entornoColorFondo?.data) updates.bgColor    = String(entornoColorFondo.data.value);

    const newEntorno = { ...this.entorno(), ...updates };
    this.entorno.set(newEntorno);
    localStorage.setItem(this.ENTORNO_CACHE_KEY, JSON.stringify({
      ambiente:  newEntorno.ambiente,
      textColor: newEntorno.textColor,
      bgColor:   newEntorno.bgColor,
    }));
  }

  async refreshEntorno() {
    this.refreshingEntorno.set(true);
    localStorage.removeItem(this.ENTORNO_CACHE_KEY);
    await this.fetchData(true);
    this.refreshingEntorno.set(false);
  }

  loading = signal(false);
  loadingMessage = signal('Cargando...');
  loadingSubtitle = signal('');

  async login() {

    try {
      this.loading.set(true);
      this.loadingMessage.set('Iniciando sesión...');
      this.loadingSubtitle.set('');
      this.errorObj.set({
        message: '',
        code: 0,
        isError: false
      })

      let authData = await this.authService.login(
        { userName: this.userName(), password: this.password() },
        this.esExterno()
      )
      if(authData?.success) {
        // El usuario (con realm y contexto externo) ya quedó guardado por el AuthService
        localStorage.setItem('token', authData?.data.token || '');

        this.errorObj.set({
          message: '',
          code: 0,
          isError: false
        });

        if (authData?.data.user.rolId) {
          this.loadingMessage.set('Cargando permisos...');
          let accesosData = await this.accesoService.getAccesosByRol(authData?.data.user.rolId);
          if( accesosData) {
            localStorage.setItem('accesos', JSON.stringify(accesosData.body?.data.accesos || []));
            if(accesosData.body?.data.accesos.length == 0) {
              this.authService.logout('No hay configurados accesos para su rol');
              this.loading.set(false);
              return;
            }
          } else {
            this.authService.logout('No se encontraron accesos para el rol');
            this.loading.set(false);
            return;
          }
        }

        // Cargar catálogos antes de navegar.
        // Los externos no tienen acceso a las rutas internas de catálogos (403), así que se omite.
        if (!this.authService.esExterno()) {
          this.loadingMessage.set('Cargando catálogos...');
          this.loadingSubtitle.set('Esto puede tomar unos segundos');
          try {
            await this.catalogosService.actualizarCatalogos();
            console.log('✅ Catálogos cargados exitosamente');
          } catch (error) {
            console.error('❌ Error al cargar catálogos:', error);
            // Continuar aunque falle la carga de catálogos
          }
        }

        this.loading.set(false);
        this.router.navigate(['/fundea']);
      } else {
        this.loading.set(false);
        this.errorObj.set({
          message: authData?.message || 'No fue posible iniciar sesión. Intente nuevamente.',
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
