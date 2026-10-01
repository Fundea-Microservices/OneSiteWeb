import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { HttpService } from './HttpService';
import { AccesoResponse, AuthResponse, IContextoExterno, IUser, Realm } from '../interfaces/auth';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

@Injectable({
  providedIn: 'root'
})
export class AuthService extends HttpService {

  private readonly endpoints = {
    login: '/auth/login',
    loginExterno: '/auth/login-externo',
    verify: '/auth/verify',
    menus: '/acceso/menu',
    menuByRol: '/acceso/rol',
    changePassword: '/config/change-password'
  };

  /** Mensaje por defecto cuando el token ya no es válido */
  public static readonly MSG_SESION_EXPIRADA = 'Su sesión ha expirado. Por favor inicie sesión nuevamente para continuar.';

  private readonly router = inject(Router);

  /** Evita cierres de sesión y toasts duplicados cuando varias peticiones fallan a la vez */
  private cerrandoSesion = false;

  // 🔑 Signal para el estado del usuario
  private _user = signal<IUser>(this.loadUserFromStorage());
  public user = this._user.asReadonly();

  /** Origen de la sesión actual. Sin dato en storage se asume colaborador interno. */
  public realm = computed<Realm>(() => this._user().realm ?? 'INTERNAL');

  /** true cuando la sesión pertenece a un usuario externo de OneSiteEx */
  public esExterno = computed<boolean>(() => this.realm() === 'ONESITEEX');

  /** Empresa y rol de OneSiteEx del usuario externo; null para internos */
  public contextoExterno = computed<IContextoExterno | null>(() => this._user().externo ?? null);

  constructor(http: HttpClient, private toastr: ToastrService) {
    super(http);
  }

  /** Cargar usuario desde localStorage (si existe) */
  private loadUserFromStorage(): IUser {
    const user = localStorage.getItem('user');
    if (user) return JSON.parse(user);

    // Usuario "vacío"
    return {
      userId: '',
      fullName: 'Sin autenticar',
      userName: '',
      name1: '',
      name2: '',
      name3: '',
      lastName1: '',
      lastName2: '',
      lastName3: '',
      password: '',
      email: '',
      photoUrl: '',
      lastPasswordUpdate: new Date(),
      fingerprint: null,
      validateMAC: null,
      active: false,
      rolId: '',
      puestoId: null,
      puesto: null,
      metodoId: null,
      realm: 'INTERNAL',
      externo: null,
      created_at: new Date(),
      rol: {
        rolId: '',
        name: 'Sin autenticar',
        active: false,
        guest: false,
        created_at: new Date()
      }
    };
  }

  /** Obtener snapshot del usuario actual */
  getUserStorage(): IUser {
    return this._user();
  }

  /** Actualizar usuario en memoria y storage */
  updateUser(user: IUser) {
    this._user.set(user);
    localStorage.setItem('user', JSON.stringify(user));
  }

  get token(): string | null {
    return localStorage.getItem('token');
  }

  /**
   * Decodifica el payload del JWT sin validar la firma (eso lo hace el API).
   * Sirve para saber, del lado del cliente, si el token ya venció.
   */
  private getTokenPayload(token: string): { exp?: number } | null {
    try {
      const payload = token.split('.')[1];
      if (!payload) return null;

      // base64url -> base64
      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(base64));
    } catch {
      return null;
    }
  }

  /**
   * Indica si el token está vencido (o es ilegible).
   * @param token Token a evaluar; por defecto el almacenado en localStorage.
   */
  isTokenExpired(token: string | null = this.token): boolean {
    if (!token) return true;

    const payload = this.getTokenPayload(token);
    if (!payload?.exp) return true; // token sin exp o corrupto: se trata como vencido

    const ahora = Math.floor(Date.now() / 1000);
    return payload.exp <= ahora;
  }

  isAuthenticated(): boolean {
    return !!this.token && !this.isTokenExpired();
  }

  /**
   * Cierra la sesión por token vencido/inválido y redirige al login.
   * Es idempotente: varias peticiones fallando en paralelo generan un solo cierre.
   */
  sesionExpirada(message: string = AuthService.MSG_SESION_EXPIRADA) {
    if (this.cerrandoSesion) return;
    this.cerrandoSesion = true;

    this.logout(message || AuthService.MSG_SESION_EXPIRADA);
    this.router.navigate(['/fundea/login']).finally(() => {
      this.cerrandoSesion = false;
    });
  }

  logout(message: string = '') {
    if (message) {
      this.toastr.error(message, 'Sesión cerrada');
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('accesos');

    // Resetear signal del usuario
    this._user.set(this.loadUserFromStorage());
  }

  /**
   * Inicia sesión contra el API.
   * @param data Credenciales; el backend normaliza `userName` a minúsculas.
   * @param esExterno true consume `/auth/login-externo` (usuarios de OneSiteEx).
   *                  El body y la forma de la respuesta son idénticos, solo cambia la URL.
   */
  async login(data: { userName: string; password: string }, esExterno = false) {
    const endpoint = esExterno ? this.endpoints.loginExterno : this.endpoints.login;

    try {
      const resp = await firstValueFrom(this.post<AuthResponse>(endpoint, data));
      if (resp.body?.success) {
        // Guardar en signal y storage (incluyendo SIUCOM y el contexto externo si vienen en la respuesta)
        if (resp.body.data?.user) {
          this.updateUser({
            ...resp.body.data.user,
            siucom: resp.body.data.siucom,
            realm: resp.body.data.realm ?? resp.body.data.user.realm ?? 'INTERNAL',
            externo: resp.body.data.externo ?? null,
          });
        }
        return resp.body;
      }
      return null;
    } catch (error: any) {
      console.log("🚀 ~ AuthService ~ login ~ error:", error);
      const mensaje = AuthService.traducirErrorLogin(error);
      this.toastr.error(mensaje, 'Error en login');
      return { ...(error?.error ?? {}), success: false, message: mensaje };
    }
  }

  /**
   * Traduce un error de login a un mensaje para el usuario.
   * Los errores de login no traen campo `error`: el código viaja dentro del `message`.
   */
  static traducirErrorLogin(error: any): string {
    const mensaje: string = error?.error?.message ?? '';

    if (error?.status === 0)   return 'No fue posible conectar con el servidor. Intente nuevamente.';
    if (error?.status === 429) return 'Demasiados intentos. Espere un minuto e intente de nuevo.';

    if (mensaje.includes('MS-AUT-09-02')) return 'Usuario o contraseña incorrectos.';
    if (mensaje.includes('MS-AUT-09-01')) return 'El acceso de usuarios externos no está disponible.';
    if (mensaje.includes('MS-AUT-09-03')) return 'Su usuario aún no tiene acceso. Solicite el alta a un administrador.';
    if (mensaje.includes('MS-AUT-09-05')) return 'Su acceso fue desactivado. Contacte al administrador.';
    if (mensaje.includes('MS-AUT-09-06') || mensaje.includes('MS-AUT-09-07')) {
      return 'Su rol no está configurado correctamente. Contacte al administrador.';
    }
    if (mensaje.includes('MS-AUT-01-07')) return 'Este usuario debe ingresar activando "Usuario externo".';
    if (mensaje.includes('MS-AUT-01-01') || mensaje.includes('MS-AUT-01-03')) return 'Usuario o contraseña incorrectos.';

    return mensaje || 'No fue posible iniciar sesión. Intente nuevamente.';
  }


  getMenus(params?: { [key: string]: any }) {
    return this.get(this.endpoints.menus, params);
  }

  async changePassword(data: { userId: string; current: string; newPassword: string }) {
    try {
      const resp = await firstValueFrom(this.put<AuthResponse>(this.endpoints.changePassword, data));
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Success');
        return resp.body;
      }
      return null;
    } catch (error: any) {
      console.log("🚀 ~ AuthService ~ changePassword ~ error:", error);
      this.toastr.error(error?.error?.message || '', 'Error al cambiar la contraseña');
      return null;
    }
  }
}
