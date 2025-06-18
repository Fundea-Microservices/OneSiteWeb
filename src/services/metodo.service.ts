import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { HttpService } from './HttpService';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { IMetodo, MetodoResponse } from '../interfaces/metodo';

@Injectable({
  providedIn: 'root'
})
export class MetodoService extends HttpService {

  private readonly endpoints = {
    metodo: '/config/metodo',
  };

  constructor(http: HttpClient, private toastr: ToastrService) {
    super(http); // pasa HttpClient al servicio base
  }

  async getMetodos({ page = 1, limit = 10, search = '', all = false } = {}) {
    try {
      let params: any = {
        page,
        limit,
        search
      }
      if (all) {
        params = {...params, all: all};
      }
      const resp =  await firstValueFrom(this.get<MetodoResponse>(`${this.endpoints.metodo}`, params));
      if (resp.body?.success) {        
        // this.toastr.success(resp.body.message, 'Success');      
        return resp.body;
      }

      return null;
    } catch (error: any) {
      console.log("🚀 ~ MetodoService ~ getMetodos ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error en metodos');
      return null;
    }
  }

  async updateMetodo(metodoUpdate: IMetodo) {
    try {
      const resp =  await firstValueFrom(this.put<MetodoResponse>(`${this.endpoints.metodo}`, metodoUpdate));
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Success');
        return resp.body;
      }

      return null;
    } catch (error: any) {
      console.log("🚀 ~ MetodoService ~ getMetodos ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error en metodos');
      return null;
    }
  }

  async createMetodo(createMetodo: IMetodo) {
    try {
      //Obtenemos solo lo necesario para crear el metodo
      const { name, description, code, verb, active, isDefault } = createMetodo;
      const resp =  await firstValueFrom(this.post<MetodoResponse>(`${this.endpoints.metodo}`, {name, description, code, verb, active, isDefault}));
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Success');
        return resp.body;
      }

      return null;
    } catch (error: any) {
      console.log("🚀 ~ MetodoService ~ createMetodo ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error en metodos');
      return null;
    }
  }

  async deleteMetodo(metodoDelete: IMetodo) {
    try {
      const resp =  await firstValueFrom(this.delete<MetodoResponse>(`${this.endpoints.metodo}`, metodoDelete));
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Success');
        return resp.body;
      }

      return null;
    } catch (error: any) {
      console.log("🚀 ~ MetodoService ~ deleteMetodo ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error en metodos');
      return null;
    }
  }
}
