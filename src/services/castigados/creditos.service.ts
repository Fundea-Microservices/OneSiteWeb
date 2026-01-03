import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpService } from '../HttpService';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { CreditoCastigadoResponse, CreditoCastigadoView } from '../../interfaces/castigados/credito-view';

@Injectable({
  providedIn: 'root'
})
export class CreditosCastigadosService extends HttpService {

  private readonly endpoints = {
    creditos: '/castigados/creditos',
    trasladar: '/castigados/creditos/trasladar',
  };

  constructor(http: HttpClient, private toastr: ToastrService) {
    super(http); // pasa HttpClient al servicio base
  }

  async getCreditos({ page = 1, limit = 10, search = '', fechaInicial = '', fechaFinal = '', all = false } = {}) {
    try {
      let params: any = {
        page,
        limit,
        search,
        fechaInicial,
        fechaFinal
      }
      if (all) {
        params = {...params, all: all};
      }
      const resp =  await firstValueFrom(this.get<CreditoCastigadoResponse>(`${this.endpoints.creditos}`, params));
      if (resp.body?.success) {
        // this.toastr.success(resp.body.message, 'Success');
        return resp.body;
      }

      return null;
    } catch (error: any) {
      console.log("🚀 ~ CreditosCastigadosService ~ getCreditos ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error en créditos');
      return null;
    }
  }

  async trasladarCreditos(data: any) {
    try {
      const resp =  await firstValueFrom(this.post<CreditoCastigadoResponse>(`${this.endpoints.trasladar}`,data));
      if (resp.body?.success) {
        if(resp.body.statusCode == 206){
          this.toastr.warning(resp.body.message, 'Warning', {timeOut: 200000});
        }
        this.toastr.success(resp.body.message, 'Success', {timeOut: 5000});
        return resp.body;
      }

      return null;
    } catch (error: any) {
      console.log("🚀 ~ CreditosCastigadosService ~ trasladarCreditos ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error en empresas');
      return null;
    }
  }

}
