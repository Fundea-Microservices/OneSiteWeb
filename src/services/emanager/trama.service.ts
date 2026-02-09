import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpService } from '../HttpService';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { ITrama, TramaResponse, TramasResponse } from '../../interfaces/emanager/getion';

@Injectable({
  providedIn: 'root'
})
export class TramaService extends HttpService {

  private readonly endpoints = {
    trama: '/emanager/gestion/trama',
  };

  constructor(http: HttpClient, private toastr: ToastrService) {
    super(http); // pasa HttpClient al servicio base
  }

  async getTramas({ page = 1, limit = 10, search = '', all = false } = {}) {
    try {
      let params: any = {
        page,
        limit,
        search
      };
      if (all) {
        params = { ...params, all: all };
      }
      const resp = await firstValueFrom(this.get<TramasResponse>(`${this.endpoints.trama}`, params));
      if (resp.body?.success) {
        return resp.body;
      }

      return null;
    } catch (error: any) {
      console.log('🚀 ~ TramaService ~ getTramas ~ error:', error);
      this.toastr.error(error?.error?.message || '', 'Error al obtener tramas');
      return null;
    }
  }

  async getTramaById(id: string) {
    try {
      const resp = await firstValueFrom(this.get<TramaResponse>(`${this.endpoints.trama}/${id}`));
      if (resp.body?.success) {
        return resp.body;
      }

      return null;
    } catch (error: any) {
      console.log('🚀 ~ TramaService ~ getTramaById ~ error:', error);
      this.toastr.error(error?.error?.message || '', 'Error al obtener trama');
      return null;
    }
  }

  async createTrama(createTrama: ITrama) {
    try {
      const { procesoId, descripcion, codigo, activo } = createTrama;
      const resp = await firstValueFrom(
        this.post<TramaResponse>(`${this.endpoints.trama}`, { procesoId, descripcion, codigo, activo })
      );
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Success');
        return resp.body;
      }

      return null;
    } catch (error: any) {
      console.log('🚀 ~ TramaService ~ createTrama ~ error:', error);
      this.toastr.error(error?.error?.message || '', 'Error al crear trama');
      return null;
    }
  }

  async updateTrama(tramaUpdate: ITrama) {
    try {
      const { tramaId, created_at, updated_at, deleted_at, ...data } = tramaUpdate;
      if (!tramaId) {
        this.toastr.error('tramaId requerido para actualizar', 'Error');
        return null;
      }
      const resp = await firstValueFrom(
        this.put<TramaResponse>(`${this.endpoints.trama}/${tramaId}`, data)
      );
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Success');
        return resp.body;
      }

      return null;
    } catch (error: any) {
      console.log('🚀 ~ TramaService ~ updateTrama ~ error:', error);
      this.toastr.error(error?.error?.message || '', 'Error al actualizar trama');
      return null;
    }
  }

  async deleteTrama(tramaId: string) {
    try {
      const resp = await firstValueFrom(
        this.delete<TramaResponse>(`${this.endpoints.trama}`, { tramaId })
      );
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Success');
        return resp.body;
      }

      return null;
    } catch (error: any) {
      console.log('🚀 ~ TramaService ~ deleteTrama ~ error:', error);
      this.toastr.error(error?.error?.message || '', 'Error al eliminar trama');
      return null;
    }
  }
}
