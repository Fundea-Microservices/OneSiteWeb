import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { HttpService } from './HttpService';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { IMetodo } from '../interfaces/metodo';
import { MenuResponse } from '../interfaces/menu';
import { IMenu } from '../interfaces/auth';

@Injectable({
  providedIn: 'root'
})
export class MenuService extends HttpService {

  private readonly endpoints = {
    menu: '/acceso/menu',
    submenu: '/acceso/submenu'
  };

  constructor(http: HttpClient, private toastr: ToastrService) {
    super(http); // pasa HttpClient al servicio base
  }

  async getMenus({ page = 1, limit = 10, search = '', all = false } = {}) {
    try {
      let params: any = {
        page,
        limit,
        search
      }
      if (all) {
        params = {...params, all: all};
      }
      const resp =  await firstValueFrom(this.get<MenuResponse>(`${this.endpoints.menu}`, params));
      if (resp.body?.success) {
        // this.toastr.success(resp.body.message, 'Success');
        return resp.body;
      }

      return null;
    } catch (error: any) {
      console.log("🚀 ~ MenuService ~ getMenus ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error en menus');
      return null;
    }
  }

  async getSubmenus({ page = 1, limit = 10, search = '', all = false } = {}) {
    try {
      let params: any = {
        page,
        limit,
        search
      }
      if (all) {
        params = {...params, all: all};
      }
      const resp =  await firstValueFrom(this.get<MenuResponse>(`${this.endpoints.submenu}`, params));
      if (resp.body?.success) {
        // this.toastr.success(resp.body.message, 'Success');
        return resp.body;
      }

      return null;
    } catch (error: any) {
      console.log("🚀 ~ MenuService ~ getSubmenus ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error en submenus');
      return null;
    }
  }

  async updateMenu(menuUpdate: IMenu) {
    try {
      const resp =  await firstValueFrom(this.put<MenuResponse>(`${this.endpoints.menu}`, menuUpdate));
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Success');
        return resp.body;
      }

      return null;
    } catch (error: any) {
      console.log("🚀 ~ MenuService ~ updateMenu ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error en menus');
      return null;
    }
  }

  async createMenu(createMenu: IMenu) {
    try {
      //Obtenemos solo lo necesario para crear el menu
      const { name, description, pathApp, pathWeb, label, icon, color, main, active } = createMenu;
      const resp =  await firstValueFrom(this.post<MenuResponse>(`${this.endpoints.menu}`, {name, description, pathApp, pathWeb, label, icon, color, main, active}));
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Success');
        return resp.body;
      }

      return null;
    } catch (error: any) {
      console.log("🚀 ~ MenuService ~ createMenu ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error en menus');
      return null;
    }
  }

  async deleteMenu(menuDelete: IMenu) {
    try {
      const resp =  await firstValueFrom(this.delete<MenuResponse>(`${this.endpoints.menu}`, menuDelete));
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Success');
        return resp.body;
      }

      return null;
    } catch (error: any) {
      console.log("🚀 ~ MenuService ~ deleteMenu ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error en menus');
      return null;
    }
  }
}
