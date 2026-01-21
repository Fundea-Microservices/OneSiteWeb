import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpService } from '../HttpService';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { SeguimientoSolicitud } from '../../interfaces/aliado/solicitudes';

interface SeguimientoResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data?: T | T[];
}

@Injectable({ providedIn: 'root' })
export class SeguimientoSolicitudService extends HttpService {
  private readonly base = '/aliado/solicitud/representante/seguimiento';
  private readonly baseSeguimiento = '/aliado/solicitud/seguimiento';

  constructor(http: HttpClient, private toastr: ToastrService) {
    super(http);
  }

  /**
   * POST - Crear un nuevo seguimiento de solicitud
   * @param data - Datos del seguimiento a crear
   */
  async createSeguimientoSolicitud(data: Partial<SeguimientoSolicitud>) {
    return this.executeRequest<SeguimientoSolicitud>('post', this.baseSeguimiento, data);
  }

  /**
   * GET - Listar todos los seguimientos
   * @param solicitudId - (Opcional) Filtrar por solicitud
   */
  async findAllSeguimientoSolicitud(solicitudId?: string) {
    const params: { [key: string]: any } = {};
    if (solicitudId) params['solicitudId'] = solicitudId;

    return this.executeRequest<SeguimientoSolicitud[]>('get', this.base, params);
  }

  /**
   * GET - Obtener un seguimiento por ID
   * @param id - ID del seguimiento
   */
  async findOneSeguimientoSolicitud(id: string) {
    return this.executeRequest<SeguimientoSolicitud>('get', `${this.base}/${id}`);
  }

  /**
   * DELETE - Eliminar un seguimiento
   * @param id - ID del seguimiento
   */
  async removeSeguimientoSolicitud(id: string) {
    return this.executeRequest<SeguimientoSolicitud>('delete', `${this.base}/${id}`);
  }

  /**
   * Helper privado para ejecutar las peticiones HTTP
   */
  private async executeRequest<T>(
    method: 'get' | 'post' | 'patch' | 'delete',
    url: string,
    data?: any
  ): Promise<SeguimientoResponse<T> | null> {
    try {
      const request =
        method === 'get' || method === 'delete'
          ? this[method]<SeguimientoResponse<T>>(url, data)
          : this[method]<SeguimientoResponse<T>>(url, data);

      const resp = await firstValueFrom(request);
      if (resp.body?.success) {
        if (method !== 'get') {
          this.toastr.success(resp.body.message, 'Éxito');
        }
        return resp.body;
      }
      return null;
    } catch (error: any) {
      this.toastr.error(
        error?.error?.message || 'Error en la operación',
        'Error'
      );
      return null;
    }
  }
}
