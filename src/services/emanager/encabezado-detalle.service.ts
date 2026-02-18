import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpService } from '../HttpService';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { IEncabezadoDetalle, EncabezadoDetalleResponse, EncabezadoDetallesResponse } from '../../interfaces/emanager/encabezado';

@Injectable({
  providedIn: 'root'
})
export class EncabezadoDetalleService extends HttpService {

  private readonly endpoints = {
    encabezadoDetalle: '/emanager/encabezado-detalle',
  };

  constructor(http: HttpClient, private toastr: ToastrService) {
    super(http);
  }

  async getEncabezadoDetalles({ page = 1, limit = 10, search = '', all = false, encabezadoId = '' } = {}) {
    try {
      let params: any = { page, limit, search };
      
      if (all) params = { ...params, all: all };
      if (encabezadoId) params = { ...params, encabezadoId: encabezadoId };
      console.log("🚀 ~ adsfasdf EncabezadoDetalleService ~ getEncabezadoDetalles ~ params:", params)

      const resp = await firstValueFrom(this.get<EncabezadoDetallesResponse>(`${this.endpoints.encabezadoDetalle}`, params));
      
      if (resp.body?.success) {
        return resp.body;
      }
      return null;
    } catch (error: any) {
      console.log('🚀 ~ EncabezadoDetalleService ~ getEncabezadoDetalles ~ error:', error);
      this.toastr.error(error?.error?.message || '', 'Error al obtener encabezado detalles');
      return null;
    }
  }

  async getEncabezadoDetalleById(id: string) {
    try {
      const resp = await firstValueFrom(this.get<EncabezadoDetalleResponse>(`${this.endpoints.encabezadoDetalle}/${id}`));
      if (resp.body?.success) {
        return resp.body;
      }
      return null;
    } catch (error: any) {
      console.log('🚀 ~ EncabezadoDetalleService ~ getEncabezadoDetalleById ~ error:', error);
      this.toastr.error(error?.error?.message || '', 'Error al obtener encabezado detalle');
      return null;
    }
  }

  async createEncabezadoDetalle(createEncabezadoDetalle: IEncabezadoDetalle) {
    try {
      // Optimización: Usamos desestructuración para quitar campos automáticos y enviar el resto.
      const { detalleId, created_at, updated_at, deleted_at, ...data } = createEncabezadoDetalle;

      const resp = await firstValueFrom(
        this.post<EncabezadoDetalleResponse>(`${this.endpoints.encabezadoDetalle}`, data)
      );

      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Success');
        return resp.body;
      }
      return null;
    } catch (error: any) {
      console.log('🚀 ~ EncabezadoDetalleService ~ createEncabezadoDetalle ~ error:', error);
      this.toastr.error(error?.error?.message || '', 'Error al crear encabezado detalle');
      return null;
    }
  }

  async updateEncabezadoDetalle(encabezadoDetalleUpdate: IEncabezadoDetalle) {
    try {
      const { detalleId, created_at, updated_at, deleted_at, ...data } = encabezadoDetalleUpdate;
      
      if (!detalleId) {
        this.toastr.error('detalleId requerido para actualizar', 'Error');
        return null;
      }

      const resp = await firstValueFrom(
        this.put<EncabezadoDetalleResponse>(`${this.endpoints.encabezadoDetalle}/${detalleId}`, data)
      );

      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Success');
        return resp.body;
      }
      return null;
    } catch (error: any) {
      console.log('🚀 ~ EncabezadoDetalleService ~ updateEncabezadoDetalle ~ error:', error);
      this.toastr.error(error?.error?.message || '', 'Error al actualizar encabezado detalle');
      return null;
    }
  }

  async deleteEncabezadoDetalle(detalleId: string) {
    try {
      const resp = await firstValueFrom(
        this.delete<EncabezadoDetalleResponse>(`${this.endpoints.encabezadoDetalle}`, { detalleId })
      );
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Success');
        return resp.body;
      }
      return null;
    } catch (error: any) {
      console.log('🚀 ~ EncabezadoDetalleService ~ deleteEncabezadoDetalle ~ error:', error);
      this.toastr.error(error?.error?.message || '', 'Error al eliminar encabezado detalle');
      return null;
    }
  }
}
