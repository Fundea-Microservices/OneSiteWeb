import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '../HttpService';
import {
  ActualizarBanco,
  Banco,
  CrearBanco,
  FiltrosBancos,
  ListaBancos,
  RespuestaApi
} from '../../interfaces/erp-bc/catalogo-bancos';

export interface ErrorBanco {
  status: number;
  /** Código de negocio que viene al inicio del mensaje, p. ej. `BANCO_DUPLICADO`. */
  codigo: string | null;
  /** Mensaje para el usuario, sin el prefijo del código. */
  mensaje: string;
}

/**
 * Normaliza un error del API. `message` llega como texto en los errores de
 * negocio ("(BANCO_DUPLICADO) El banco 3 ya tiene...") y como arreglo en los de
 * validación de campos.
 */
export function interpretarErrorBanco(error: any): ErrorBanco {
  const message = error?.error?.message;
  const texto = Array.isArray(message) ? message.join('. ') : typeof message === 'string' ? message : '';

  return {
    status: error?.status ?? 0,
    codigo: texto.match(/^\((\w+)\)/)?.[1] ?? null,
    mensaje: texto.replace(/^\(\w+\)\s*/, ''),
  };
}

/**
 * Los errores no se atrapan aquí: cada código exige una reacción distinta en la
 * pantalla (ver `interpretarErrorBanco`).
 */
@Injectable({
  providedIn: 'root'
})
export class CatalogoBancosService extends HttpService {

  private readonly endpoint = '/financiero-bc/catalogos/bancos';

  constructor(http: HttpClient) {
    super(http);
  }

  async getBancos(filtros: FiltrosBancos = {}): Promise<RespuestaApi<ListaBancos>> {
    const resp = await firstValueFrom(this.get<RespuestaApi<ListaBancos>>(this.endpoint, this.armarParams(filtros)));
    return resp.body!;
  }

  /** Omite los filtros vacíos y quita los espacios de los extremos. */
  private armarParams(filtros: FiltrosBancos) {
    const params: { [clave: string]: string } = {};
    Object.entries(filtros).forEach(([clave, valor]) => {
      if (valor === undefined || valor === null) return;
      const texto = String(valor).trim();
      if (texto !== '') params[clave] = texto;
    });
    return params;
  }

  async getBanco(id: number): Promise<RespuestaApi<Banco>> {
    const resp = await firstValueFrom(this.get<RespuestaApi<Banco>>(`${this.endpoint}/${id}`));
    return resp.body!;
  }

  async crearBanco(banco: CrearBanco): Promise<RespuestaApi<Banco>> {
    const resp = await firstValueFrom(this.post<RespuestaApi<Banco>>(this.endpoint, banco));
    return resp.body!;
  }

  async actualizarBanco(id: number, cambios: ActualizarBanco): Promise<RespuestaApi<Banco>> {
    const resp = await firstValueFrom(this.patch<RespuestaApi<Banco>>(`${this.endpoint}/${id}`, cambios));
    return resp.body!;
  }
}
