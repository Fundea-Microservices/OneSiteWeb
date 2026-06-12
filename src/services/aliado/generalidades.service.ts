import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpService } from '../HttpService';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { TipoSolicitud, EstadoSolicitud, TipoAfiliacion } from '../../interfaces/aliado/generalidades';

interface GeneralidadResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data?: T | T[];
}

@Injectable({ providedIn: 'root' })
export class GeneralidadesService extends HttpService {
  private readonly base = '/aliado/solicitud/generales';

  constructor(http: HttpClient, private toastr: ToastrService) {
    super(http);
  }

  // ==================== ESTADO SOLICITUD ====================
  async getAllEstadoSolicitud(params?: { [key: string]: any }) {
    return this.executeRequest<EstadoSolicitud[]>('get', `${this.base}/estado-solicitud`, params);
  }

  async getEstadoSolicitud(id: string) {
    return this.executeRequest<EstadoSolicitud>('get', `${this.base}/estado-solicitud/${id}`);
  }

  async createEstadoSolicitud(data: { nombre: string; activo?: boolean }) {
    return this.executeRequest<EstadoSolicitud>('post', `${this.base}/estado-solicitud`, data);
  }

  async updateEstadoSolicitud(id: string, data: { nombre?: string; activo?: boolean }) {
    return this.executeRequest<EstadoSolicitud>('patch', `${this.base}/estado-solicitud/${id}`, data);
  }

  async deleteEstadoSolicitud(id: string) {
    return this.executeRequest<EstadoSolicitud>('delete', `${this.base}/estado-solicitud/${id}`);
  }

  // ==================== TIPO AFILIACION ====================
  async getAllTipoAfiliacion(params?: { [key: string]: any }) {
    return this.executeRequest<TipoAfiliacion[]>('get', `${this.base}/tipo-afiliacion`, params);
  }

  async getTipoAfiliacion(id: string) {
    return this.executeRequest<TipoAfiliacion>('get', `${this.base}/tipo-afiliacion/${id}`);
  }

  async createTipoAfiliacion(data: { nombre: string; activo?: boolean }) {
    return this.executeRequest<TipoAfiliacion>('post', `${this.base}/tipo-afiliacion`, data);
  }

  async updateTipoAfiliacion(id: string, data: { nombre?: string; activo?: boolean }) {
    return this.executeRequest<TipoAfiliacion>('patch', `${this.base}/tipo-afiliacion/${id}`, data);
  }

  async deleteTipoAfiliacion(id: string) {
    return this.executeRequest<TipoAfiliacion>('delete', `${this.base}/tipo-afiliacion/${id}`);
  }

  // ==================== TIPO SOLICITUD ====================
  async getAllTipoSolicitud(params?: { [key: string]: any }) {
    return this.executeRequest<TipoSolicitud[]>('get', `${this.base}/tipo-solicitud`, params);
  }

  async getTipoSolicitud(id: string) {
    return this.executeRequest<TipoSolicitud>('get', `${this.base}/tipo-solicitud/${id}`);
  }

  async createTipoSolicitud(data: { nombre: string; codigo?: string | null; mostrarPreguntas?: boolean; activo?: boolean }) {
    return this.executeRequest<TipoSolicitud>('post', `${this.base}/tipo-solicitud`, data);
  }

  async updateTipoSolicitud(id: string, data: { nombre?: string; codigo?: string | null; mostrarPreguntas?: boolean; activo?: boolean }) {
    return this.executeRequest<TipoSolicitud>('patch', `${this.base}/tipo-solicitud/${id}`, data);
  }

  async deleteTipoSolicitud(id: string) {
    return this.executeRequest<TipoSolicitud>('delete', `${this.base}/tipo-solicitud/${id}`);
  }

  // ==================== HELPER ====================
  private async executeRequest<T>(method: 'get' | 'post' | 'patch' | 'delete', url: string, data?: any): Promise<GeneralidadResponse<T> | null> {
    try {
      const request = method === 'get' || method === 'delete' 
        ? this[method]<GeneralidadResponse<T>>(url, data)
        : this[method]<GeneralidadResponse<T>>(url, data);
      
      const resp = await firstValueFrom(request);
      if (resp.body?.success) {
        if (method !== 'get') this.toastr.success(resp.body.message, 'Éxito');
        return resp.body;
      }
      return null;
    } catch (error: any) {
      this.toastr.error(error?.error?.message || 'Error en la operación', 'Error');
      return null;
    }
  }
}
