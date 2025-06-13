import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpService } from './HttpService';
import { AccesoResponse, AuthResponse } from '../interfaces/auth';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService extends HttpService {

  private readonly endpoints = {
    login: '/auth/login',
    verify: '/auth/verify',
    menus: '/acceso/menu',
    menuByRol: '/acceso/menu/rol',
  };

  constructor(http: HttpClient) {
    super(http); // pasa HttpClient al servicio base
  }

  getUserStorage() {
    const user = localStorage.getItem('user');
    if (user) {
      return JSON.parse(user);
    }
    return null;
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
    const resp = await firstValueFrom(this.post<AuthResponse>(this.endpoints.login, data));
    return resp;
  }

  verify(data: any) {
    return this.post(this.endpoints.verify, data);
  }

  getMenus(params?: { [key: string]: any }) {
    return this.get(this.endpoints.menus, params);
  }

  async getMenusByRol(rolId: string) {
    const resp =  await firstValueFrom(this.get<AccesoResponse>(`${this.endpoints.menuByRol}/${rolId}`))

    return resp;
  }
}
