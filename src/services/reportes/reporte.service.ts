import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpService } from '../HttpService';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { IReporte, ReporteResponse, ReportesResponse } from '../../interfaces/reportes/reporte';

@Injectable({
  providedIn: 'root'
})
export class ReporteService extends HttpService {

  private readonly endpoints = {
    reporte: '/reportes',
  };

  constructor(http: HttpClient, private toastr: ToastrService) {
    super(http); // pasa HttpClient al servicio base
  }

  async getReportes({ page = 1, limit = 10, search = '', all = false } = {}) {
    try {
      let params: any = {
        page,
        limit,
        search
      }
      if (all) {
        params = { ...params, all: all };
      }
      const resp = await firstValueFrom(this.get<ReportesResponse>(`${this.endpoints.reporte}`, params));
      if (resp.body?.success) {
        // this.toastr.success(resp.body.message, 'Success');
        return resp.body;
      }

      return null;
    } catch (error: any) {
      console.log("🚀 ~ ReporteService ~ getReportes ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error al obtener reportes');
      return null;
    }
  }

  async updateReporte(reporteUpdate: IReporte) {
    try {
      const resp = await firstValueFrom(this.put<ReportesResponse>(`${this.endpoints.reporte}`, reporteUpdate));
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Success');
        return resp.body;
      }

      return null;
    } catch (error: any) {
      console.log("🚀 ~ ReporteService ~ updateReporte ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error al actualizar reporte');
      return null;
    }
  }

  async createReporte(createReporte: IReporte) {
    try {
      //Obtenemos solo lo necesario para crear el reporte
      const { nombre, descripcion, procedimiento, activo } = createReporte;
      const resp = await firstValueFrom(this.post<ReportesResponse>(`${this.endpoints.reporte}`, { nombre, descripcion, procedimiento, activo }));
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Success');
        return resp.body;
      }

      return null;
    } catch (error: any) {
      console.log("🚀 ~ ReporteService ~ createReporte ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error al crear reporte');
      return null;
    }
  }

  async deleteReporte(reporteDelete: IReporte) {
    try {
      const resp = await firstValueFrom(this.delete<ReportesResponse>(`${this.endpoints.reporte}`, reporteDelete));
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Success');
        return resp.body;
      }

      return null;
    } catch (error: any) {
      console.log("🚀 ~ ReporteService ~ deleteReporte ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error al eliminar reporte');
      return null;
    }
  }

  async getReporteById(id: string) {
    try {
      const resp = await firstValueFrom(this.get<ReporteResponse>(`${this.endpoints.reporte}/${id}`));
      if (resp.body?.success) {
        // this.toastr.success(resp.body.message, 'Success');
        return resp.body;
      }

      return null;
    } catch (error: any) {
      console.log("🚀 ~ ReporteService ~ getReportes ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error en obtener reporte');
      return null;
    }
  }

  

}
