import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { HttpService } from '../HttpService';
import {
  CrearNotificacionRequest,
  DesembolsoResponse,
  IHiloNotificacion,
  INotificacionLoteListado,
  INotificacionMensaje,
  IResumenNotificacionesLote,
  ListarNotificacionesLoteQuery,
  ResponderMensajeRequest,
} from '../../interfaces/aliado/desembolso';

/**
 * Notificaciones (conversaciones) entre usuarios de OneSite sobre un lote de desembolso y una empresa.
 * El remitente lo toma el API del token.
 */
@Injectable({ providedIn: 'root' })
export class NotificacionLoteService extends HttpService {
  private readonly base = '/aliado/desembolso';

  constructor(http: HttpClient, private toastr: ToastrService) {
    super(http);
  }

  /**
   * POST - Crear una conversación con su primer mensaje
   */
  async crear(loteId: string, data: CrearNotificacionRequest) {
    return this.executeRequest<IHiloNotificacion>('post', `${this.base}/lote/${loteId}/notificaciones`, data);
  }

  /**
   * GET - Conversaciones del lote, con mensajes sin leer y por responder del usuario
   */
  async listarPorLote(loteId: string, query: ListarNotificacionesLoteQuery) {
    return this.executeRequest<INotificacionLoteListado[]>(
      'get', `${this.base}/lote/${loteId}/notificaciones`, this.cleanParams(query)
    );
  }

  /**
   * GET - Conteos por empresa y totales del lote (sin avisos: se pide por cada fila del listado)
   */
  async resumenPorLote(loteId: string) {
    return this.executeRequest<IResumenNotificacionesLote>(
      'get', `${this.base}/lote/${loteId}/notificaciones/resumen`, undefined, true
    );
  }

  /**
   * GET - Conversación completa
   */
  async obtener(notificacionId: string) {
    return this.executeRequest<IHiloNotificacion>('get', `${this.base}/notificaciones/${notificacionId}`);
  }

  /**
   * PUT - Marcar como leídos los mensajes recibidos de la conversación (sin avisos: se llama al abrirla)
   */
  async marcarLeida(notificacionId: string) {
    return this.executeRequest<{ actualizados: number }>(
      'put', `${this.base}/notificaciones/${notificacionId}/leer`, {}, true
    );
  }

  /**
   * PUT - Cerrar la conversación (solo quien la inició)
   */
  async cerrar(notificacionId: string) {
    return this.executeRequest<IHiloNotificacion>('put', `${this.base}/notificaciones/${notificacionId}/cerrar`, {});
  }

  /**
   * POST - Responder un mensaje recibido (solo su destinatario, una vez)
   */
  async responder(mensajeId: string, data: ResponderMensajeRequest) {
    return this.executeRequest<IHiloNotificacion>(
      'post', `${this.base}/notificaciones/mensajes/${mensajeId}/responder`, data
    );
  }

  /**
   * PUT - Reintentar el correo de un mensaje enviado por el usuario
   */
  async reenviarCorreo(mensajeId: string) {
    return this.executeRequest<INotificacionMensaje>(
      'put', `${this.base}/notificaciones/mensajes/${mensajeId}/reenviar-correo`, {}
    );
  }

  /** Quita los parámetros vacíos para no enviarlos en el query string */
  private cleanParams(query: object): { [key: string]: any } {
    return Object.fromEntries(
      Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== '')
    );
  }

  /**
   * Helper privado para ejecutar las peticiones HTTP
   * @param silencioso true = no muestra avisos de éxito ni de error
   */
  private async executeRequest<T>(
    method: 'get' | 'post' | 'put',
    url: string,
    data?: any,
    silencioso = false
  ): Promise<DesembolsoResponse<T> | null> {
    try {
      const resp = await firstValueFrom(this[method]<DesembolsoResponse<T>>(url, data));
      if (resp.body?.success) {
        if (method !== 'get' && !silencioso) {
          this.toastr.success(resp.body.message, 'Éxito');
        }
        return resp.body;
      }
      return null;
    } catch (error: any) {
      if (!silencioso) {
        const message = error?.error?.message;
        this.toastr.error(
          Array.isArray(message) ? message.join('\n') : message || 'Error en la operación',
          'Error'
        );
      }
      return null;
    }
  }
}
