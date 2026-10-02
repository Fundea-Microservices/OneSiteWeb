import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { HttpService } from '../HttpService';
import {
  ActividadesResponse,
  ActividadResponse,
  IActividadCreate,
  IActividadEconomica,
  IActividadUpdate,
} from '../../interfaces/actividad-economica';

export interface ActividadesFiltro {
  page?: number;
  limit?: number;
  search?: string;
  region?: string;
  actividad?: string;
  subActividad?: string;
  all?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ActividadEconomicaService extends HttpService {

  private readonly endpoint = '/flujo-fondos/actividades-economicas';

  constructor(http: HttpClient, private toastr: ToastrService) {
    super(http);
  }

  /** Omite los parámetros vacíos: "Todas" en un filtro no envía el parámetro. */
  private buildParams(filtro: { [key: string]: any }) {
    const params: { [key: string]: any } = {};
    Object.entries(filtro).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params[key] = value;
      }
    });
    return params;
  }

  async getActividades({ page = 1, limit = 10, search, region, actividad, subActividad, all }: ActividadesFiltro = {}) {
    try {
      const params = this.buildParams({ page, limit, search, region, actividad, subActividad, all: all || undefined });
      const resp = await firstValueFrom(this.get<ActividadesResponse>(this.endpoint, params));
      if (resp.body?.success) {
        return resp.body;
      }

      return null;
    } catch (error: any) {
      console.log("🚀 ~ ActividadEconomicaService ~ getActividades ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error en actividades económicas');
      return null;
    }
  }

  async getActividadById(id: string): Promise<IActividadEconomica | null> {
    try {
      const resp = await firstValueFrom(this.get<ActividadResponse>(`${this.endpoint}/${id}`));
      if (resp.body?.success) {
        return resp.body.data;
      }

      return null;
    } catch (error: any) {
      console.log("🚀 ~ ActividadEconomicaService ~ getActividadById ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error al obtener actividad económica');
      return null;
    }
  }

  async createActividad(actividad: IActividadCreate) {
    try {
      const resp = await firstValueFrom(this.post<ActividadResponse>(this.endpoint, actividad));
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Success');
        return resp.body;
      }

      return null;
    } catch (error: any) {
      console.log("🚀 ~ ActividadEconomicaService ~ createActividad ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error al crear actividad económica');
      return null;
    }
  }

  async updateActividad(actividad: IActividadUpdate) {
    try {
      const resp = await firstValueFrom(this.put<ActividadResponse>(this.endpoint, actividad));
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Success');
        return resp.body;
      }

      return null;
    } catch (error: any) {
      console.log("🚀 ~ ActividadEconomicaService ~ updateActividad ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error al actualizar actividad económica');
      return null;
    }
  }

  /** Borrado lógico: la actividad deja de aparecer en el listado. */
  async deleteActividad(id: string) {
    try {
      const resp = await firstValueFrom(this.delete<ActividadResponse>(`${this.endpoint}/${id}`));
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Success');
        return resp.body;
      }

      return null;
    } catch (error: any) {
      console.log("🚀 ~ ActividadEconomicaService ~ deleteActividad ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error al eliminar actividad económica');
      return null;
    }
  }
}
