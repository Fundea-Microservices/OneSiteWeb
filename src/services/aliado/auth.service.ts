import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpService } from '../HttpService';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { IUsuarioAliado } from '../../interfaces/aliado/usuario-aliado';
import { AuthAliadoResponse } from '../../interfaces/aliado/auth';

@Injectable({
  providedIn: 'root'
})
export class AuthAliadoService extends HttpService {

  private readonly endpoints = {
    login: '/aliado/login',
    changePassword: '/aliado/change-password'
  };

  constructor(http: HttpClient, private toastr: ToastrService) {
    super(http); // pasa HttpClient al servicio base
  }

  getUserStorage(): IUsuarioAliado {
    const user = localStorage.getItem('userAliado');
    if (user) {
      return JSON.parse(user);
    }
    return {
      userId: '',
      fullName: 'Usuario no encontrado',
      userName: '',
      email: '',
      active: false,
      empresaId: '',
      created_at: new Date(),
      updated_at: null,
      deleted_at: null
    };
  }


  get token(): string | null {
    return localStorage.getItem('tokenAliado');
  }

  isAuthenticated(): boolean {
    if (!!this.token) {
      if (this.isTokenExpired(this.token)) {
        this.logout('Cierre de sesión por expiración del token');
        return false;
      }
    }
    return false;
  }

  /**
   * Cierra la sesión del usuario aliado.
   * @param message Mensaje opcional a mostrar en la notificación.
   */
  logout(message: string = '') {
    if (message) {
      this.toastr.error(message, 'Sesión cerrada');
    }
    localStorage.removeItem('tokenAliado');
    localStorage.removeItem('userAliado');
  }

  async login(data: { userName: string; password: string }) {
    try {

      const resp = await firstValueFrom(this.post<AuthAliadoResponse>(this.endpoints.login, data));
      if (resp.body?.success) {
        // this.toastr.success(resp.body.message, 'Success');
        return resp.body;
      }
      return null;
    } catch (error: any) {
      console.log("🚀 ~ AuthAliadoService ~ login ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error en login');
      return error.error;
    }
  }
  /**
   * Cambia la contraseña del usuario aliado.
   * @param data Objeto con userId, current (contraseña actual) y newPassword (nueva contraseña).
   * @returns Respuesta del servidor o null en caso de error.
   */
  async changePassword(data: { userId: string; current: string; newPassword: string }) {
    try {

      const resp = await firstValueFrom(this.put<AuthAliadoResponse>(this.endpoints.changePassword, data));
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Success');
        return resp.body;
      }

      return null;
    } catch (error: any) {
      console.log("🚀 ~ AuthAliadoService ~ changePassword ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error al cambiar la contraseña');
      return null;
    }
  }

  isTokenExpired(token: string): boolean {
    try {
      const [, payload] = token.split('.');
      const decoded = JSON.parse(atob(payload));
      const exp = decoded.exp;
      const now = Math.floor(Date.now() / 1000);
      return exp < now;
    } catch {
      return true;
    }
  }
}
