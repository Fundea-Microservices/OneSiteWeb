import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpService } from '../HttpService';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { IReporte, ReporteResponse, ReportesResponse } from '../../interfaces/reportes/reporte';
import { AtributosResponse, IAtributo } from '../../interfaces/reportes/atributo';

@Injectable({
  providedIn: 'root'
})
export class AtributoService extends HttpService {

  private readonly endpoints = {
    atributo: '/atributo-reporte',
    reordenar: '/atributo-reporte/reordenar',
  };

  constructor(http: HttpClient, private toastr: ToastrService) {
    super(http); // pasa HttpClient al servicio base
  }

  async getAtributos({ page = 1, limit = 10, search = '', all = false, parentId = '' } = {}) {
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
      const resp = await firstValueFrom(this.get<AtributosResponse>(`${this.endpoints.atributo}`, params));
      if (resp.body?.success) {
        // this.toastr.success(resp.body.message, 'Success');
        return resp.body;
      }

      return null;
    } catch (error: any) {
      console.log("🚀 ~ ReporteService ~ getAtributos ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error en atributos');
      return null;
    }
  }

  async updateAtributo(atributoUpdate: IAtributo) {
    try {
      const resp = await firstValueFrom(this.put<AtributosResponse>(`${this.endpoints.atributo}`, atributoUpdate));
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Success');
        return resp.body;
      }

      return null;
    } catch (error: any) {
      console.log("🚀 ~ ReporteService ~ updateAtributo ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error en atributos');
      return null;
    }
  }


  async createAtributo(createAtributo: IAtributo) {
    try {
      //Obtenemos solo lo necesario para crear el atributo
      const { reporteId, variable, alias, tipo, formato, orden, visible } = createAtributo;
      const resp = await firstValueFrom(this.post<AtributosResponse>(`${this.endpoints.atributo}`, { reporteId, variable, alias, tipo, formato, orden, visible }));
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Success');
        return resp.body;
      }

      return null;
    } catch (error: any) {
      console.log("🚀 ~ ReporteService ~ createAtributo ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error en atributos');
      return null;
    }
  }

  async deleteAtributo(atributoDelete: IAtributo) {
    try {
      const resp = await firstValueFrom(this.delete<AtributosResponse>(`${this.endpoints.atributo}`, atributoDelete));
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Success');
        return resp.body;
      }

      return null;
    } catch (error: any) {
      console.log("🚀 ~ ReporteService ~ deleteAtributo ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error en atributos');
      return null;
    }
  }

  async reordenarAtributos(atributos: { atributoId: string; orden: number }[]) {
    console.log("🚀 ~ AtributoService ~ reordenarAtributos ~ atributos  1  :", atributos)
    try {
      const resp = await firstValueFrom(this.post<AtributosResponse>(`${this.endpoints.reordenar}`, atributos ));
      console.log("🚀 ~ AtributoService ~ reordenarAtributos ~ resp  2 :", resp)
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Success');
        return resp.body;
      }

      return null;
    } catch (error: any) {
      console.log("🚀 ~ ReporteService ~ reordenarAtributos ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error en atributos');
      return null;
    }
  }

}
