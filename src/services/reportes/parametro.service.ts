import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpService } from '../HttpService';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { IReporte, ReporteResponse, ReportesResponse } from '../../interfaces/reportes/reporte';
import { AtributosResponse, IAtributo } from '../../interfaces/reportes/atributo';
import { IParametro, ParametrosResponse } from '../../interfaces/reportes/parametro';

@Injectable({
  providedIn: 'root'
})
export class ParametroService extends HttpService {

  private readonly endpoints = {
    parametro: '/parametro-reporte',
  };

  constructor(http: HttpClient, private toastr: ToastrService) {
    super(http); // pasa HttpClient al servicio base
  }

  async getParametros({ page = 1, limit = 10, search = '', all = false, parentId = '' } = {}) {
    try {
      let params: any = {
        page,
        limit,
        search,
        parentId
      }
      if (all) {
        params = { ...params, all: all };
      }
      const resp = await firstValueFrom(this.get<ParametrosResponse>(`${this.endpoints.parametro}`, params));
      if (resp.body?.success) {
        // this.toastr.success(resp.body.message, 'Success');
        return resp.body;
      }

      return null;
    } catch (error: any) {
      console.log("🚀 ~ ReporteService ~ getAtributos ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error en empresas');
      return null;
    }
  }

  async updateParametro(parametroUpdate: IParametro) {
    try {
      const resp = await firstValueFrom(this.put<ParametrosResponse>(`${this.endpoints.parametro}`, parametroUpdate));
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Success');
        return resp.body;
      }

      return null;
    } catch (error: any) {
      console.log("🚀 ~ ReporteService ~ updateAtributo ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error en reportes');
      return null;
    }
  }



  async createParametro(createParametro: IParametro) {
    try {
      //Obtenemos solo lo necesario para crear el parámetro
      const { reporteId, variable, nombre, tipo, obligatorio, valor, orden } = createParametro;
      const resp = await firstValueFrom(this.post<ParametrosResponse>(`${this.endpoints.parametro}`, { reporteId, variable, nombre, tipo, obligatorio, valor, orden }));
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Success');
        return resp.body;
      }

      return null;
    } catch (error: any) {
      console.log("🚀 ~ ReporteService ~ createAtributo ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error en reportes');
      return null;
    }
  }

  async deleteParametro(parametroDelete: IParametro) {
    try {
      const resp = await firstValueFrom(this.delete<ParametrosResponse>(`${this.endpoints.parametro}`, parametroDelete));
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Success');
        return resp.body;
      }

      return null;
    } catch (error: any) {
      console.log("🚀 ~ ReporteService ~ deleteAtributo ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error en reportes');
      return null;
    }
  }


}
