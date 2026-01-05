import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpService } from '../HttpService';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { IBancoRepresentante, ITipoCuentaRepresentante } from '../../interfaces/aliado/banco';

export interface BancosResponse {
  success: boolean;
  message: string;
  statusCode: number;
  data?: {
    success: boolean;
    statusCode: string;
    path: string;
    timestamp: string;
    message: string;
    data: IBancoRepresentante[];
    metadata: {
      total: number;
    };
  };
}

export interface TiposCuentaResponse {
  success: boolean;
  message: string;
  statusCode: number;
  data?: {
    success: boolean;
    statusCode: string;
    path: string;
    timestamp: string;
    message: string;
    data: ITipoCuentaRepresentante[];
    metadata: {
      total: number;
    };
  };
}

@Injectable({
  providedIn: 'root'
})
export class BancoService extends HttpService {

  private readonly endpoints = {
    bancos: '/api-bantotal/banco/bancos',
    tiposCuenta: '/api-bantotal/banco/tipo-cuentas',
  };

  constructor(http: HttpClient, private toastr: ToastrService) {
    super(http);
  }

  /**
   * Obtener todos los bancos
   */
  async obtenerBancos(): Promise<IBancoRepresentante[]> {
    try {
      const resp = await firstValueFrom(
        this.get<BancosResponse>(this.endpoints.bancos)
      );
      
      // La respuesta tiene doble anidamiento: resp.body.data.data
      if (resp.body?.success && resp.body.data?.data && Array.isArray(resp.body.data.data)) {
        console.log('🏦 Bancos cargados:', resp.body.data.data);
        return resp.body.data.data;
      }
      
      console.warn('⚠️ Estructura de respuesta de bancos inesperada:', resp.body);
      return [];
    } catch (error: any) {
      console.error('🚀 ~ BancoService ~ obtenerBancos ~ error:', error);
      this.toastr.error(error?.error?.message || 'Error al obtener bancos', 'Error');
      return [];
    }
  }

  /**
   * Obtener todos los tipos de cuenta
   */
  async obtenerTiposCuenta(): Promise<ITipoCuentaRepresentante[]> {
    try {
      const resp = await firstValueFrom(
        this.get<TiposCuentaResponse>(this.endpoints.tiposCuenta)
      );
      
      // La respuesta tiene doble anidamiento: resp.body.data.data
      if (resp.body?.success && resp.body.data?.data && Array.isArray(resp.body.data.data)) {
        console.log('💳 Tipos de cuenta cargados:', resp.body.data.data);
        return resp.body.data.data;
      }
      
      console.warn('⚠️ Estructura de respuesta de tipos de cuenta inesperada:', resp.body);
      return [];
    } catch (error: any) {
      console.error('🚀 ~ BancoService ~ obtenerTiposCuenta ~ error:', error);
      this.toastr.error(error?.error?.message || 'Error al obtener tipos de cuenta', 'Error');
      return [];
    }
  }
}
