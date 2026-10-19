import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { HttpService } from '../HttpService';
import {
  AprobarLoteRequest,
  DesembolsoResponse,
  GenerarLoteRequest,
  IDesembolsoReferido,
  ILoteDesembolso,
  ListarDesembolsosQuery,
  ListarLotesQuery,
  ProcesarLoteRequest,
  RechazarLoteRequest,
} from '../../interfaces/aliado/desembolso';

@Injectable({ providedIn: 'root' })
export class DesembolsoService extends HttpService {
  private readonly base = '/aliado/desembolso/lote';

  constructor(http: HttpClient, private toastr: ToastrService) {
    super(http);
  }

  /**
   * POST - Generar el lote de un período (solo meses anteriores al actual)
   */
  async generarLote(data: GenerarLoteRequest) {
    return this.executeRequest<ILoteDesembolso>('post', this.base, data);
  }

  /**
   * GET - Listar lotes generados
   */
  async listarLotes(query: ListarLotesQuery) {
    return this.executeRequest<ILoteDesembolso[]>('get', this.base, this.cleanParams(query));
  }

  /**
   * GET - Obtener la cabecera de un lote
   */
  async obtenerLote(id: string) {
    return this.executeRequest<ILoteDesembolso>('get', `${this.base}/${id}`);
  }

  /**
   * GET - Listar los desembolsos referidos de un lote
   */
  async listarDetalle(id: string, query: ListarDesembolsosQuery) {
    return this.executeRequest<IDesembolsoReferido[]>('get', `${this.base}/${id}/detalle`, this.cleanParams(query));
  }

  /**
   * PUT - Guardar la validación de los registros del lote
   */
  async procesarLote(id: string, data: ProcesarLoteRequest) {
    return this.executeRequest<ILoteDesembolso>('put', `${this.base}/${id}/procesar`, data);
  }

  /**
   * PUT - Aprobar un lote PROCESADO
   */
  async aprobarLote(id: string, data: AprobarLoteRequest) {
    return this.executeRequest<ILoteDesembolso>('put', `${this.base}/${id}/aprobar`, data);
  }

  /**
   * PUT - Rechazar un lote SOLICITADO o PROCESADO
   */
  async rechazarLote(id: string, data: RechazarLoteRequest) {
    return this.executeRequest<ILoteDesembolso>('put', `${this.base}/${id}/rechazar`, data);
  }

  /** Quita los parámetros vacíos para no enviarlos en el query string */
  private cleanParams(query: object): { [key: string]: any } {
    return Object.fromEntries(
      Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== '')
    );
  }

  /**
   * Helper privado para ejecutar las peticiones HTTP
   */
  private async executeRequest<T>(
    method: 'get' | 'post' | 'put',
    url: string,
    data?: any
  ): Promise<DesembolsoResponse<T> | null> {
    try {
      const resp = await firstValueFrom(this[method]<DesembolsoResponse<T>>(url, data));
      if (resp.body?.success) {
        if (method !== 'get') {
          this.toastr.success(resp.body.message, 'Éxito');
        }
        return resp.body;
      }
      return null;
    } catch (error: any) {
      const message = error?.error?.message;
      this.toastr.error(
        Array.isArray(message) ? message.join('\n') : message || 'Error en la operación',
        'Error'
      );
      return null;
    }
  }
}
