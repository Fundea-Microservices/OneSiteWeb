import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { HttpService } from './HttpService';
import { AccesoResponse, AuthResponse, IRol, RolesResponse } from '../interfaces/auth';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

@Injectable({
  providedIn: 'root'
})
export class RolService extends HttpService {

  private readonly endpoints = {
    rol: '/config/rol',
  };

  constructor(http: HttpClient, private toastr: ToastrService) {
    super(http); // pasa HttpClient al servicio base
  }

  /**
   * @param externo true solo roles externos, false solo internos, sin valor todos.
   *                Con `all: true` el API devuelve únicamente los activos.
   */
  async getRoles({ page = 1, limit = 10, search = '', all = false, externo }: {
    page?: number; limit?: number; search?: string; all?: boolean; externo?: boolean;
  } = {}) {
    try {
      let params: any = {
        page,
        limit,
        search
      }
      if (all) {
        params = {...params, all: all};
      }
      if (externo !== undefined) {
        params = {...params, externo};
      }
      const resp =  await firstValueFrom(this.get<RolesResponse>(`${this.endpoints.rol}`, params));
      if (resp.body?.success) {        
        // this.toastr.success(resp.body.message, 'Success');      
        return resp.body;
      }

      return null;
    } catch (error: any) {
      console.log("🚀 ~ RolService ~ getRoles ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error en roles');
      return null;
    }
  }

  async updateRol(rolUpdate: IRol) {
    try {
      //Obtenemos solo lo necesario para actualizar el rol
      const { updated_at, deleted_at, ...data } = rolUpdate;
      const resp =  await firstValueFrom(this.put<RolesResponse>(`${this.endpoints.rol}`, data));
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Success');
        return resp.body;
      }

      return null;
    } catch (error: any) {
      console.log("🚀 ~ RolService ~ getRoles ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error en roles');
      return null;
    }
  }

  async createRol(createRol: IRol) {
    try {
      //Obtenemos solo lo necesario para crear el rol
      const { name, active, guest, externo = false, gestionAccesos = false } = createRol;
      const resp =  await firstValueFrom(this.post<RolesResponse>(`${this.endpoints.rol}`, {name, active, guest, externo, gestionAccesos}));
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Success');
        return resp.body;
      }

      return null;
    } catch (error: any) {
      console.log("🚀 ~ RolService ~ getRoles ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error en roles');
      return null;
    }
  }

  async deleteRol(rolDelete: IRol) {
    try {
      const resp =  await firstValueFrom(this.delete<RolesResponse>(`${this.endpoints.rol}`, rolDelete));
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Success');
        return resp.body;
      }

      return null;
    } catch (error: any) {
      console.log("🚀 ~ RolService ~ getRoles ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error en roles');
      return null;
    }
  }
}
