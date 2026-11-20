import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { HttpService } from '../HttpService';
import { ApiResponse } from '../../interfaces/catalogo';
import {
  IConversacion,
  IConversacionDetalle,
  ICrearConversacion,
  ICrearMensajeConversacion,
  IListadoConversaciones,
  IMensajeConversacion,
  IPendientesConversaciones,
} from '../../interfaces/flujo-fondos';

/**
 * Resultado de una petición. En el error viene el código del back (MS-FJF-64-03...) para
 * reaccionar a los 409: la otra persona cerró la conversación, el flujo se anuló, etc.
 */
export type ResultadoConversacion<T> =
  | { ok: true; data: T; message: string }
  | { ok: false; status: number; codigo: string | null; message: string };

/** Quita el prefijo "(MS-FJF-64-03) " del mensaje del back. */
const PREFIJO_CODIGO = /^\((MS-[A-Z]+-[\d-]+)\)\s*/;

/**
 * Conversaciones ("Notificaciones") de un flujo de fondos entre quien lo crea y quien lo aprueba.
 * El usuario lo toma el gateway del token: no se envía en el body.
 */
@Injectable({ providedIn: 'root' })
export class ConversacionFlujoService extends HttpService {
  private readonly base = '/flujo-fondos';

  constructor(http: HttpClient, private toastr: ToastrService) {
    super(http);
  }

  /** GET - Conversaciones del flujo (abiertas primero) con su resumen */
  listar(flujoId: string) {
    return this.executeRequest<IListadoConversaciones>('get', `${this.base}/flujos/${flujoId}/conversaciones`);
  }

  /** GET - Resumen liviano: badge del botón y aviso antes de aprobar (sin avisos: se pide por cada fila) */
  resumen(flujoId: string) {
    return this.executeRequest<IPendientesConversaciones>(
      'get', `${this.base}/flujos/${flujoId}/conversaciones/resumen`, undefined, true
    );
  }

  /** POST - Abre una conversación con su primer mensaje. Tarda 1–3 s: espera el correo */
  async crear(flujoId: string, body: ICrearConversacion) {
    const resp = await this.executeRequest<IConversacionDetalle>(
      'post', `${this.base}/flujos/${flujoId}/conversaciones`, body, true
    );
    if (resp.ok) this.avisarEnvio(resp.message, resp.data.mensajes.at(-1));
    else this.avisarError(resp);
    return resp;
  }

  /**
   * GET - Conversación con todos sus mensajes. Efecto secundario: marca como leídos los
   * mensajes dirigidos al usuario, pero la respuesta trae el estado anterior a la consulta.
   */
  ver(id: string) {
    return this.executeRequest<IConversacionDetalle>('get', `${this.base}/conversaciones/${id}`);
  }

  /** POST - Responder. Tarda 1–3 s: espera el correo */
  async responder(id: string, body: ICrearMensajeConversacion) {
    const resp = await this.executeRequest<IMensajeConversacion>(
      'post', `${this.base}/conversaciones/${id}/mensajes`, body, true
    );
    if (resp.ok) this.avisarEnvio(resp.message, resp.data);
    else this.avisarError(resp);
    return resp;
  }

  /** POST - Cerrar (cualquiera de los dos; se avisa por correo a la otra parte) */
  cerrar(id: string) {
    return this.executeRequest<IConversacion>('post', `${this.base}/conversaciones/${id}/cerrar`, {});
  }

  /** POST - Reabrir (no envía correo) */
  reabrir(id: string) {
    return this.executeRequest<IConversacion>('post', `${this.base}/conversaciones/${id}/reabrir`, {});
  }

  /**
   * El correo no es un error: el mensaje se guarda aunque falle.
   * - correoEnviado: éxito
   * - con destinatario pero sin correo: advertencia
   * - sin destinatario (no había a quién notificar): informativo
   */
  private avisarEnvio(message: string, mensaje: IMensajeConversacion | undefined) {
    if (!mensaje || mensaje.correoEnviado) {
      this.toastr.success(message, 'Éxito');
    } else if (mensaje.destinatarioId) {
      this.toastr.warning(message, 'Mensaje guardado');
    } else {
      this.toastr.info(message, 'Mensaje guardado');
    }
  }

  private avisarError(resp: { message: string }) {
    this.toastr.error(resp.message || 'Error en la operación', 'Error');
  }

  /**
   * Helper privado para ejecutar las peticiones HTTP
   * @param silencioso true = no muestra avisos de éxito ni de error
   */
  private async executeRequest<T>(
    method: 'get' | 'post',
    url: string,
    data?: any,
    silencioso = false
  ): Promise<ResultadoConversacion<T>> {
    try {
      const resp = await firstValueFrom(this[method]<ApiResponse<T>>(url, data));
      if (resp.body?.success) {
        if (method !== 'get' && !silencioso) {
          this.toastr.success(resp.body.message, 'Éxito');
        }
        return { ok: true, data: resp.body.data, message: resp.body.message };
      }
      const fallo = { ok: false as const, status: resp.status, codigo: null, message: resp.body?.message || 'Error en la operación' };
      if (!silencioso) this.avisarError(fallo);
      return fallo;
    } catch (error: any) {
      // Los errores de validación del gateway traen message como arreglo (y en inglés)
      const crudo = error?.error?.message;
      const texto: string = Array.isArray(crudo) ? crudo.join(', ') : (crudo || '');
      const fallo = {
        ok: false as const,
        status: error?.status ?? 0,
        codigo: texto.match(PREFIJO_CODIGO)?.[1] ?? null,
        message: texto.replace(PREFIJO_CODIGO, '') || 'Error en la operación',
      };
      if (!silencioso) this.avisarError(fallo);
      return fallo;
    }
  }
}
