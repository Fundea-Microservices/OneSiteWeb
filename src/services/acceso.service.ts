import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpService } from './HttpService';
import { AccesoResponse, AuthResponse, IUser } from '../interfaces/auth';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { IAcceso } from '../interfaces/acceso';

@Injectable({
  providedIn: 'root'
})
export class AccesoService extends HttpService {

  private readonly endpoints = {
    accesosByRol: '/acceso/rol',
    accesos: '/acceso',
  };

  constructor(http: HttpClient, private toastr: ToastrService) {
    super(http); // pasa HttpClient al servicio base
  }

  getAccesosStorage() {
    const user = localStorage.getItem('accesos');
    if (user) {
      return JSON.parse(user);
    }
    return null;
  }

  async getAccesosByRol(rolId: string, params: any = {}) {
    try {
      const resp = await firstValueFrom(this.get<AccesoResponse>(`${this.endpoints.accesosByRol}/${rolId}`, params))

      return resp;

    } catch (error: any) {
      console.error("Error fetching accesos by role:", error);
      this.toastr.error(error?.error?.message || '', 'Error al obtener los accesos por rol');
      return null;
    }
  }

  async updateAcceso(accesoUpdate: IAcceso) {
      try {
        const { subMenus, menu,  ...acceso } = accesoUpdate; // Excluimos subMenus del objeto accesoUpdate
        const resp =  await firstValueFrom(this.put<AccesoResponse>(`${this.endpoints.accesos}`, acceso));
        if (resp.body?.success) {
          this.toastr.success(resp.body.message, 'Success');
          return resp.body;
        }
  
        return null;
      } catch (error: any) {
        console.log("🚀 ~ AccesoService ~ updateAcceso ~ error:", error)
        this.toastr.error(error?.error?.message || '', 'Error en actualización de acceso');
        return null;
      }
    }

    async createAcceso(createAcceso: IAcceso) {
      try {
        //Obtenemos solo lo necesario para crear el acceso
        const { rolId, menuId, showApp, showWeb, active, orderMenu, mainMenuId } = createAcceso;
        let params: any = { rolId, menuId, showApp, showWeb, active, orderMenu };
        // SI el acceso tiene un mainMenuId, lo agregamos a los parámetros
        if (mainMenuId && mainMenuId !== '') {
          params = { ...params, mainMenuId };
        }
        const resp =  await firstValueFrom(this.post<AccesoResponse>(`${this.endpoints.accesos}`, params));
        if (resp.body?.success) {
          this.toastr.success(resp.body.message, 'Success');
          return resp.body;
        }
  
        return null;
      } catch (error: any) {
        console.log("🚀 ~ AccesoService ~ createAcceso ~ error:", error)
        this.toastr.error(error?.error?.message || '', 'Error en creación de acceso');
        return null;
      }
    }

    async deleteAcceso(accesoDelete: IAcceso) {
      try {
        const {menu, subMenus, rol, ...deleteAcceso} = accesoDelete
        const resp =  await firstValueFrom(this.delete<AccesoResponse>(`${this.endpoints.accesos}`, deleteAcceso));
        if (resp.body?.success) {
          this.toastr.success(resp.body.message, 'Success');
          return resp.body;
        }
  
        return null;
      } catch (error: any) {
        console.log("🚀 ~ AccesoService ~ deleteAcceso ~ error:", error)
        this.toastr.error(error?.error?.message || '', 'Error en eliminación de acceso');
        return null;
      }
    }


}
