import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { HttpService } from './HttpService';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { ConfiguracionByKeyResponse, ConfiguracionResponse, IConfiguracion } from '../interfaces/configuracion';

@Injectable({
  providedIn: 'root'
})
export class ConfiguracionService extends HttpService {

  private readonly endpoints = {
    configuracion: '/config/general',
  };

  constructor(http: HttpClient, private toastr: ToastrService) {
    super(http); // pasa HttpClient al servicio base
  }

  async getConfiguraciones({ page = 1, limit = 10, search = '', all = false } = {}) {
    try {
      let params: any = {
        page,
        limit,
        search
      }
      if (all) {
        params = {...params, all: all};
      }
      const resp =  await firstValueFrom(this.get<ConfiguracionResponse>(`${this.endpoints.configuracion}`, params));
      if (resp.body?.success) {        
        // this.toastr.success(resp.body.message, 'Success');      
        return resp.body;
      }

      return null;
    } catch (error: any) {
      console.log("🚀 ~ ConfiguracionMetodo ~ getConfiguraciones ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error en configuraciones');
      return null;
    }
  }

  async getConfigByKey(key: string) {
    try {
      const resp =  await firstValueFrom(this.get<ConfiguracionByKeyResponse>(`${this.endpoints.configuracion}/${key}`));
      if (resp.body?.success) {
        return resp.body;
      }

      return null;
    } catch (error: any) {
      console.log("🚀 ~ ConfiguracionMetodo ~ getConfigByKey ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error en configuraciones');
      return null;
    }
  }


  async updateConfiguracion(configUpdate: IConfiguracion) {
    try {
      const resp =  await firstValueFrom(this.put<ConfiguracionResponse>(`${this.endpoints.configuracion}`, configUpdate));
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Success');
        return resp.body;
      }

      return null;
    } catch (error: any) {
      console.log("🚀 ~ ConfiguracionMetodo ~ updateConfiguracion ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error en configuraciones');
      return null;
    }
  }

  async createConfiguracion(createConfiguracion: IConfiguracion) {
    try {
      //Obtenemos solo lo necesario para crear la configuracion
      const { key, value, description, type, active } = createConfiguracion;
      const resp =  await firstValueFrom(this.post<ConfiguracionResponse>(`${this.endpoints.configuracion}`, {key, value, description, type, active}));
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Success');
        return resp.body;
      }

      return null;
    } catch (error: any) {
      console.log("🚀 ~ ConfiguracionMetodo ~ createConfiguracion ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error en configuraciones');
      return null;
    }
  }

  async deleteConfiguracion(configDelete: IConfiguracion) {
    try {
      const resp =  await firstValueFrom(this.delete<ConfiguracionResponse>(`${this.endpoints.configuracion}`, configDelete));
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Success');
        return resp.body;
      }

      return null;
    } catch (error: any) {
      console.log("🚀 ~ ConfiguracionMetodo ~ deleteConfiguracion ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error en configuraciones');
      return null;
    }
  }
}
