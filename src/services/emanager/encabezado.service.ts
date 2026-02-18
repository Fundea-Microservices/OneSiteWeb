import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpService } from '../HttpService';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { IEncabezado, EncabezadoResponse, EncabezadosResponse } from '../../interfaces/emanager/encabezado';

@Injectable({
  providedIn: 'root'
})
export class EncabezadoService extends HttpService {

  private readonly endpoints = {
    encabezado: '/emanager/encabezado',
  };

  constructor(http: HttpClient, private toastr: ToastrService) {
    super(http);
  }

  async getEncabezados({ page = 1, limit = 10, search = '', all = false } = {}) {
    try {
      let params: any = { page, limit, search };
      if (all) {
        params = { ...params, all: all };
      }
      const resp = await firstValueFrom(this.get<EncabezadosResponse>(`${this.endpoints.encabezado}`, params));
      if (resp.body?.success) {
        return resp.body;
      }
      return null;
    } catch (error: any) {
      console.log('🚀 ~ EncabezadoService ~ getEncabezados ~ error:', error);
      this.toastr.error(error?.error?.message || '', 'Error al obtener encabezados');
      return null;
    }
  }

  async getEncabezadoById(id: string) {
    try {
      const resp = await firstValueFrom(this.get<EncabezadoResponse>(`${this.endpoints.encabezado}/${id}`));
      if (resp.body?.success) {
        return resp.body;
      }
      return null;
    } catch (error: any) {
      console.log('🚀 ~ EncabezadoService ~ getEncabezadoById ~ error:', error);
      this.toastr.error(error?.error?.message || '', 'Error al obtener encabezado');
      return null;
    }
  }

  async createEncabezado(createEncabezado: IEncabezado) {
    try {
      // Excluimos campos de auditoría o ID que genera la BD y enviamos el resto
      const { encabezadoId, created_at, updated_at, deleted_at, ...data } = createEncabezado;

      const resp = await firstValueFrom(
        this.post<EncabezadoResponse>(`${this.endpoints.encabezado}`, data)
      );
      
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Success');
        return resp.body;
      }
      return null;
    } catch (error: any) {
      console.log('🚀 ~ EncabezadoService ~ createEncabezado ~ error:', error);
      this.toastr.error(error?.error?.message || '', 'Error al crear encabezado');
      return null;
    }
  }

  async updateEncabezado(encabezadoUpdate: IEncabezado) {
    try {
      // Separamos el ID y las fechas del resto de la data
      const { encabezadoId, created_at, updated_at, deleted_at, ...data } = encabezadoUpdate;
      
      if (!encabezadoId) {
        this.toastr.error('encabezadoId requerido para actualizar', 'Error');
        return null;
      }

      const resp = await firstValueFrom(
        this.put<EncabezadoResponse>(`${this.endpoints.encabezado}/${encabezadoId}`, data)
      );

      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Success');
        return resp.body;
      }
      return null;
    } catch (error: any) {
      console.log('🚀 ~ EncabezadoService ~ updateEncabezado ~ error:', error);
      this.toastr.error(error?.error?.message || '', 'Error al actualizar encabezado');
      return null;
    }
  }

  async deleteEncabezado(encabezadoId: string) {
    try {
      const resp = await firstValueFrom(
        this.delete<EncabezadoResponse>(`${this.endpoints.encabezado}`, { encabezadoId })
      );
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Success');
        return resp.body;
      }
      return null;
    } catch (error: any) {
      console.log('🚀 ~ EncabezadoService ~ deleteEncabezado ~ error:', error);
      this.toastr.error(error?.error?.message || '', 'Error al eliminar encabezado');
      return null;
    }
  }
}
