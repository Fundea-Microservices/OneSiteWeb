import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpService } from '../HttpService';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { IReporte, ReporteResponse, ReportesResponse } from '../../interfaces/reportes/reporte';
import { AtributosResponse, IAtributo } from '../../interfaces/reportes/atributo';
import { IParametro, ParametrosResponse } from '../../interfaces/reportes/parametro';
import { IRegla, ReglasEjecucionResponse } from '../../interfaces/reportes/regla-ejecucion';

@Injectable({
  providedIn: 'root'
})
export class ReglaEjecucionService extends HttpService {

  private readonly endpoints = {
    regla: '/regla-ejecucion',
  };

  constructor(http: HttpClient, private toastr: ToastrService) {
    super(http); // pasa HttpClient al servicio base
  }

  async getReglas({ page = 1, limit = 10, search = '', all = false, parentId = '' } = {}) {
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
      const resp = await firstValueFrom(this.get<ReglasEjecucionResponse>(`${this.endpoints.regla}`, params));
      if (resp.body?.success) {
        // this.toastr.success(resp.body.message, 'Success');
        return resp.body;
      }

      return null;
    } catch (error: any) {
      console.log("🚀 ~ ReglaEjecucionService ~ getReglas ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error en reglas');
      return null;
    }
  }

  async updateRegla(reglaUpdate: IRegla) {
    try {
      const {rol, ...update} = reglaUpdate
      const resp = await firstValueFrom(this.put<ReglasEjecucionResponse>(`${this.endpoints.regla}`, update));
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Success');
        return resp.body;
      }

      return null;
    } catch (error: any) {
      console.log("🚀 ~ ReglaEjecucionService ~ updateRegla ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error en reglas');
      return null;
    }
  }

  async createRegla(createRegla: IRegla) {
    try {
      //Obtenemos solo lo necesario para crear la regla
      const { reporteId, rolId, active, horaInicio, horaFin, diaSemana, diaMes } = createRegla;
      const resp = await firstValueFrom(this.post<ReglasEjecucionResponse>(`${this.endpoints.regla}`, { reporteId, rolId, active, horaInicio, horaFin, diaSemana, diaMes }));
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

  async deleteRegla(reglaDelete: IRegla) {
    try {
      const resp = await firstValueFrom(this.delete<ReglasEjecucionResponse>(`${this.endpoints.regla}`, reglaDelete));
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
