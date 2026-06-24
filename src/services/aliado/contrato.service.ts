import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ContratoParams {
  representanteId?: string;
  empresaId?: string;
  cuentaBancariaId?: string;
}

@Injectable({ providedIn: 'root' })
export class ContratoService {
  private readonly base = '/aliado/solicitud/contrato/afiliacion';
  private baseUrl: string = environment.apiPath;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene el token desde localStorage.
   */
  private getToken(): string {
    return localStorage.getItem('token') || '';
  }

  private setHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${this.getToken()}`,
    });
  }

  /**
   * GET - Descarga el PDF del contrato (carta de entendimiento).
   * La respuesta es binaria (application/pdf), por eso se pide como blob.
   * Se requiere al menos uno de los IDs (idealmente los tres para llenar todo el contrato).
   * @param ids representanteId, empresaId y/o cuentaBancariaId como query params
   * @returns Blob del PDF
   * @throws El mensaje de error parseado desde el blob JSON del gateway
   */
  async descargarContrato(ids: ContratoParams): Promise<Blob> {
    let params = new HttpParams();
    if (ids.representanteId) params = params.set('representanteId', ids.representanteId);
    if (ids.empresaId) params = params.set('empresaId', ids.empresaId);
    if (ids.cuentaBancariaId) params = params.set('cuentaBancariaId', ids.cuentaBancariaId);

    try {
      const blob = await firstValueFrom(
        this.http.get(`${this.baseUrl}${this.base}`, {
          headers: this.setHeaders(),
          params,
          responseType: 'blob',
        })
      );
      return blob;
    } catch (err: any) {
      // En error el body es JSON pero llega como Blob -> hay que parsearlo
      const mensaje = await this.leerErrorBlob(err?.error);
      throw new Error(mensaje);
    }
  }

  private async leerErrorBlob(blob: unknown): Promise<string> {
    if (blob instanceof Blob) {
      try {
        return JSON.parse(await blob.text())?.message ?? 'Error al generar el contrato';
      } catch {
        return 'Error al generar el contrato';
      }
    }
    return 'Error al generar el contrato';
  }
}
