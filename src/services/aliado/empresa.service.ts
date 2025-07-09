import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpService } from '../HttpService';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { EmpresaAliadoResponse, IEmpresaAliado } from '../../interfaces/aliado/empresa';

@Injectable({
  providedIn: 'root'
})
export class EmpresaAliadoService extends HttpService {

  private readonly endpoints = {
    empresa: '/aliado/empresa',
  };

  constructor(http: HttpClient, private toastr: ToastrService) {
    super(http); // pasa HttpClient al servicio base
  }

  async getEmpresas({ page = 1, limit = 10, search = '', all = false } = {}) {
    try {
      let params: any = {
        page,
        limit,
        search
      }
      if (all) {
        params = {...params, all: all};
      }
      const resp =  await firstValueFrom(this.get<EmpresaAliadoResponse>(`${this.endpoints.empresa}`, params));
      if (resp.body?.success) {
        // this.toastr.success(resp.body.message, 'Success');
        return resp.body;
      }

      return null;
    } catch (error: any) {
      console.log("🚀 ~ EmpresaAService ~ getEmpresas ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error en empresas');
      return null;
    }
  }

  async updateEmpresa(empresaUpdate: IEmpresaAliado) {
    try {
      const resp =  await firstValueFrom(this.put<EmpresaAliadoResponse>(`${this.endpoints.empresa}`, empresaUpdate));
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Success');
        return resp.body;
      }

      return null;
    } catch (error: any) {
      console.log("🚀 ~ EmpresaAService ~ updateEmpresa ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error en empresas');
      return null;
    }
  }

  async createEmpresa(createEmpresa: IEmpresaAliado) {
    try {
      //Obtenemos solo lo necesario para crear la empresa
      const { name, description, pathImg, address, latitud, longitud, phone, phone2, email, active } = createEmpresa;
      const resp =  await firstValueFrom(this.post<EmpresaAliadoResponse>(`${this.endpoints.empresa}`, {name, description, pathImg, address, latitud, longitud, phone, phone2, email, active}));
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Success');
        return resp.body;
      }

      return null;
    } catch (error: any) {
      console.log("🚀 ~ EmpresaAService ~ createEmpresa ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error en empresas');
      return null;
    }
  }

  async deleteEmpresa(empresaDelete: IEmpresaAliado) {
    try {
      const resp =  await firstValueFrom(this.delete<EmpresaAliadoResponse>(`${this.endpoints.empresa}`, empresaDelete));
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Success');
        return resp.body;
      }

      return null;
    } catch (error: any) {
      console.log("🚀 ~ EmpresaAService ~ deleteEmpresa ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error en empresas');
      return null;
    }
  }
}
