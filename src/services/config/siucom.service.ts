import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpService } from '../HttpService';
import { firstValueFrom } from 'rxjs';
import { SiucomAccesoResponse } from '../../interfaces/auth';
import { ConsultaAuditoriaResponse, ConsultaAuditoriaSiucomParams } from '../../interfaces/siucom/auditoria';

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
    acceso: '/config/siucom/acceso',
    auditoria: '/config/siucom/auditoria'
  };

  constructor(http: HttpClient) {
    super(http);
  }

  /** Solo incluye los parámetros con valor (todos son opcionales). */
  private limpiarParams(params: ConsultaAuditoriaSiucomParams): Record<string, string> {
    const query: Record<string, string> = {};
    (Object.keys(params) as (keyof ConsultaAuditoriaSiucomParams)[]).forEach((key) => {
      const value = params[key];
      if (value !== undefined && value !== null && `${value}`.trim() !== '') {
        query[key] = `${value}`;
      }
    });
    return query;
  }

  /** Consulta de auditoría SIUCOM (formato JSON). */
  async consultarAuditoria(params: ConsultaAuditoriaSiucomParams): Promise<ConsultaAuditoriaResponse | null> {
    try {
      const query = this.limpiarParams({ ...params, formato: 'json' });
      const resp = await firstValueFrom(this.get<ConsultaAuditoriaResponse>(this.endpoints.auditoria, query));
      return resp.body;
    } catch (error: any) {
      console.error('❌ Error al consultar auditoría SIUCOM:', error);
      return error?.error ?? null;
    }
  }

  /** Descarga la auditoría SIUCOM como archivo CSV. */
  async descargarAuditoriaCsv(params: ConsultaAuditoriaSiucomParams): Promise<boolean> {
    try {
      const query = this.limpiarParams({ ...params, formato: 'csv' });
      const resp = await firstValueFrom(this.getBlob(this.endpoints.auditoria, query));
      const blob = resp.body;
      if (!blob) return false;

      const nombre = this.obtenerNombreArchivo(resp.headers.get('Content-Disposition'))
        ?? `auditoria_siucom_${new Date().toISOString().split('T')[0]}.csv`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nombre;
      a.click();
      URL.revokeObjectURL(url);
      return true;
    } catch (error: any) {
      console.error('❌ Error al descargar auditoría SIUCOM (CSV):', error);
      return false;
    }
  }

  /** Extrae el filename del header Content-Disposition, si viene. */
  private obtenerNombreArchivo(contentDisposition: string | null): string | null {
    if (!contentDisposition) return null;
    const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(contentDisposition);
    return match?.[1] ? decodeURIComponent(match[1]) : null;
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
