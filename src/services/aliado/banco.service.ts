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
  data?: IBancoRepresentante[];
}

export interface TiposCuentaResponse {
  success: boolean;
  message: string;
  statusCode: number;
  data?: ITipoCuentaRepresentante[];
}

@Injectable({
  providedIn: 'root'
})
export class BancoService extends HttpService {

  private readonly endpoints = {
    bancos: '-bantotal/banco/bancos',
    tiposCuenta: '-bantotal/banco/tipo-cuentas',
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
      
      if (resp.body?.success && resp.body.data) {
        return resp.body.data;
      }
      
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
      
      if (resp.body?.success && resp.body.data) {
        return resp.body.data;
      }
      
      return [];
    } catch (error: any) {
      console.error('🚀 ~ BancoService ~ obtenerTiposCuenta ~ error:', error);
      this.toastr.error(error?.error?.message || 'Error al obtener tipos de cuenta', 'Error');
      return [];
    }
  }
}
