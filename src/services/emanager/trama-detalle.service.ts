import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpService } from '../HttpService';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { ITramaDetalle, TramaDetalleResponse, TramaDetallesResponse } from '../../interfaces/emanager/getion';

@Injectable({
  providedIn: 'root'
})
export class TramaDetalleService extends HttpService {

  private readonly endpoints = {
    trama: '/emanager/gestion/trama-detalle',
  };

  constructor(http: HttpClient, private toastr: ToastrService) {
    super(http);
  }

  async getTramaDetalles({ page = 1, limit = 10, search = '', all = false, tramaId = '' } = {}) {
    try {
      let params: any = { page, limit, search };
      
      if (all) params = { ...params, all: all };
      if (tramaId) params = { ...params, tramaId: tramaId };

      const resp = await firstValueFrom(this.get<TramaDetallesResponse>(`${this.endpoints.trama}`, params));
      
      if (resp.body?.success) {
        return resp.body;
      }
      return null;
    } catch (error: any) {
      console.log('🚀 ~ TramaDetalleService ~ getTramaDetalles ~ error:', error);
      this.toastr.error(error?.error?.message || '', 'Error al obtener trama detalles');
      return null;
    }
  }

  async getTramaDetalleById(id: string) {
    try {
      const resp = await firstValueFrom(this.get<TramaDetalleResponse>(`${this.endpoints.trama}/${id}`));
      if (resp.body?.success) {
        return resp.body;
      }
      return null;
    } catch (error: any) {
      console.log('🚀 ~ TramaDetalleService ~ getTramaDetalleById ~ error:', error);
      this.toastr.error(error?.error?.message || '', 'Error al obtener trama detalle');
      return null;
    }
  }

  async createTramaDetalle(createTramaDetalle: ITramaDetalle) {
    try {
      // Optimización: Usamos desestructuración para quitar campos automáticos y enviar el resto.
      // Esto envía automáticamente: tag, nombreInput, orden, visible, obligatorio, etc.
      const { detalleId, created_at, updated_at, deleted_at, ...data } = createTramaDetalle;

      const resp = await firstValueFrom(
        this.post<TramaDetalleResponse>(`${this.endpoints.trama}`, data)
      );

      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Success');
        return resp.body;
      }
      return null;
    } catch (error: any) {
      console.log('🚀 ~ TramaDetalleService ~ createTramaDetalle ~ error:', error);
      this.toastr.error(error?.error?.message || '', 'Error al crear trama detalle');
      return null;
    }
  }

  async updateTramaDetalle(tramaDetalleUpdate: ITramaDetalle) {
    try {
      const { detalleId, created_at, updated_at, deleted_at, ...data } = tramaDetalleUpdate;
      
      if (!detalleId) {
        this.toastr.error('detalleId requerido para actualizar', 'Error');
        return null;
      }

      const resp = await firstValueFrom(
        this.put<TramaDetalleResponse>(`${this.endpoints.trama}/${detalleId}`, data)
      );

      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Success');
        return resp.body;
      }
      return null;
    } catch (error: any) {
      console.log('🚀 ~ TramaDetalleService ~ updateTramaDetalle ~ error:', error);
      this.toastr.error(error?.error?.message || '', 'Error al actualizar trama detalle');
      return null;
    }
  }

  async deleteTramaDetalle(detalleId: string) {
    try {
      const resp = await firstValueFrom(
        this.delete<TramaDetalleResponse>(`${this.endpoints.trama}`, { detalleId })
      );
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Success');
        return resp.body;
      }
      return null;
    } catch (error: any) {
      console.log('🚀 ~ TramaDetalleService ~ deleteTramaDetalle ~ error:', error);
      this.toastr.error(error?.error?.message || '', 'Error al eliminar trama detalle');
      return null;
    }
  }
}