import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpService } from '../HttpService';
import { firstValueFrom } from 'rxjs';
import { SiucomAccesoResponse } from '../../interfaces/auth';

export interface SiucomAccesoRequest {
  usuarioId: string;
  nombre: string;
  region: string;
  agencia: string;
  rol: string;
}

@Injectable({
  providedIn: 'root'
})
export class SiucomService extends HttpService {

  private readonly endpoints = {
    acceso: '/config/siucom/acceso'
  };

  constructor(http: HttpClient) {
    super(http);
  }

  /**
   * Acceso SIUCOM (get-or-create).
   * Si el usuario ya tiene registro lo devuelve (creado: false, HTTP 200);
   * si no, lo crea en el servicio externo SIUCOM y lo persiste (creado: true, HTTP 201).
   */
  async getOrCreateAcceso(data: SiucomAccesoRequest): Promise<SiucomAccesoResponse | null> {
    try {
      const resp = await firstValueFrom(this.post<SiucomAccesoResponse>(this.endpoints.acceso, data));
      return resp.body;
    } catch (error: any) {
      console.error('❌ Error al obtener/crear acceso SIUCOM:', error);
      return error?.error || null;
    }
  }
}
