import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpService } from '../HttpService';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { Solicitud } from '../../interfaces/aliado/solicitudes';

interface SolicitudResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data?: T | T[];
}

@Injectable({ providedIn: 'root' })
export class SolicitudesService extends HttpService {
  private readonly base = '/api-bantotal/solicitud/representante';

  constructor(http: HttpClient, private toastr: ToastrService) {
    super(http);
  }

  /**
   * POST - Crear una nueva solicitud
   * @param data - Datos de la solicitud a crear
   */
  async createSolicitud(data: Partial<Solicitud>) {
    return this.executeRequest<Solicitud>('post', this.base, data);
  }

  /**
   * POST - Buscar solicitudes por criterios
   * @param searchParams - Parámetros de búsqueda
   */
  async searchSolicitudes(searchParams: {
    nombreRepresentante?: string;
    tipoDocumento?: number;
    documento?: string;
    regionId?: number;
    agenciaId?: number;
  }) {
    return this.executeRequest<Solicitud[]>('post', `${this.base}/search`, searchParams);
  }

  /**
   * GET - Listar todas las solicitudes
   * @param representanteId - (Opcional) Filtrar por representante
   * @param estadoSolicitudId - (Opcional) Filtrar por estado
   */
  async findAllSolicitudes(representanteId?: string, estadoSolicitudId?: string) {
    const params: { [key: string]: any } = {};
    if (representanteId) params['representanteId'] = representanteId;
    if (estadoSolicitudId) params['estadoSolicitudId'] = estadoSolicitudId;

    return this.executeRequest<Solicitud[]>('get', this.base, params);
  }

  /**
   * GET - Obtener una solicitud por ID
   * @param id - ID de la solicitud
   */
  async findOneSolicitud(id: string) {
    return this.executeRequest<Solicitud>('get', `${this.base}/${id}`);
  }

  /**
   * PATCH - Actualizar una solicitud
   * @param id - ID de la solicitud
   * @param data - Datos a actualizar
   */
  async updateSolicitud(id: string, data: Partial<Solicitud>) {
    return this.executeRequest<Solicitud>('patch', `${this.base}/${id}`, data);
  }

  /**
   * DELETE - Eliminar una solicitud
   * @param id - ID de la solicitud
   */
  async deleteSolicitud(id: string) {
    return this.executeRequest<Solicitud>('delete', `${this.base}/${id}`);
  }

  /**
   * Helper privado para ejecutar las peticiones HTTP
   */
  private async executeRequest<T>(
    method: 'get' | 'post' | 'patch' | 'delete',
    url: string,
    data?: any
  ): Promise<SolicitudResponse<T> | null> {
    try {
      const request =
        method === 'get' || method === 'delete'
          ? this[method]<SolicitudResponse<T>>(url, data)
          : this[method]<SolicitudResponse<T>>(url, data);

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
