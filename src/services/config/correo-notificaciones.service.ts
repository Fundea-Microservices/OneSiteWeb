import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpService } from '../HttpService';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { CorreoNotificacionResponse } from '../../interfaces/configuracion';

@Injectable({
  providedIn: 'root'
})
export class CorreoNotificacionesService extends HttpService {

  private readonly endpoints = {
    correoNotificaciones: '/config/correo-notificaciones',
  };

  constructor(http: HttpClient, private toastr: ToastrService) {
    super(http);
  }

  async getCorreosNotificacion({
    page = 1,
    limit = 10,
    search = '',
    tipoNotificacion,
    activo,
    all,
  }: {
    page?: number;
    limit?: number;
    search?: string;
    tipoNotificacion?: string;
    activo?: boolean;
    all?: boolean;
  } = {}) {
    try {
      const params: any = { page, limit, search };
      if (tipoNotificacion !== undefined) params.tipoNotificacion = tipoNotificacion;
      if (activo !== undefined) params.activo = activo;
      if (all !== undefined) params.all = all;
      const resp = await firstValueFrom(this.get<CorreoNotificacionResponse>(`${this.endpoints.correoNotificaciones}`, params));
      return resp.body?.success ? resp.body : null;
    } catch (error: any) {
      console.error("Error en getCorreosNotificacion:", error);
      this.toastr.error(error?.error?.message || '', 'Error al obtener correos de notificación');
      return null;
    }
  }
}
