import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpService } from './HttpService';
import { AccesoResponse, AuthResponse, IUser } from '../interfaces/auth';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

@Injectable({
  providedIn: 'root'
})
export class AuthService extends HttpService {

  private readonly endpoints = {
    login: '/auth/login',
    verify: '/auth/verify',
    menus: '/acceso/menu',
    menuByRol: '/acceso/menu/rol',
    changePassword: '/config/change-password'
  };

  constructor(http: HttpClient, private toastr: ToastrService) {
    super(http); // pasa HttpClient al servicio base
  }

  getUserStorage(): IUser {
    const user = localStorage.getItem('user');
    if (user) {
      return JSON.parse(user);
    }
    return {
      userId: '',
      name: 'Sin autenticar',
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
      methodId: null,
      created_at: new Date(),
      rol: {
        rolId: '',
        name: 'Sin autenticar',
        active: false,
        guest: false,
        createdAt: new Date()
      }
    };
  }

  getMenusStorage() {
    const user = localStorage.getItem('menu');
    if (user) {
      return JSON.parse(user);
    }
    return null;
  }

  get token(): string | null {
    return localStorage.getItem('token');
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('menu');
  }

  async login(data: { userName: string; password: string }) {
    try {

      const resp = await firstValueFrom(this.post<AuthResponse>(this.endpoints.login, data));
      if (resp.body?.success) {
        // this.toastr.success(resp.body.message, 'Success');
        return resp.body;
      }
      return null;
    } catch (error: any) {
      console.log("🚀 ~ AuthService ~ login ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error en login');
      return error.error;
    }
  }

  verify(data: any) {
    return this.post(this.endpoints.verify, data);
  }

  getMenus(params?: { [key: string]: any }) {
    return this.get(this.endpoints.menus, params);
  }

  async getMenusByRol(rolId: string) {
    const resp = await firstValueFrom(this.get<AccesoResponse>(`${this.endpoints.menuByRol}/${rolId}`))

    return resp;
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
      console.log("🚀 ~ AuthService ~ changePassword ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error al cambiar la contraseña');
      return null;
    }
  }
}
