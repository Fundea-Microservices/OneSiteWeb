import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpService } from '../HttpService';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { EmpresaAliadoResponse, IEmpresaAliado } from '../../interfaces/aliado/empresa';

@Injectable({
  providedIn: 'root'
})
export class EmpresaCastigadosService extends HttpService {

  private readonly endpoints = {
    empresa: '/castigados/empresas',
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
      console.log("🚀 ~ EmpresaCastigadosService ~ getEmpresas ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error en empresas');
      return null;
    }
  }

}
