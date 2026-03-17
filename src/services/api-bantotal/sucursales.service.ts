import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpService } from '../HttpService';
import { firstValueFrom } from 'rxjs';
import { MisSucursalesResponse } from '../../interfaces/api-bantotal/sucursales';

@Injectable({
  providedIn: 'root'
})
export class SucursalesBantotalService extends HttpService {

  private readonly endpoints = {
    misSucursales: '/api-bantotal/sucursales/mis-sucursales-onesite'
  };

  constructor(http: HttpClient) {
    super(http);
  }

  async getMisSucursales(): Promise<MisSucursalesResponse | null> {
    try {
      const resp = await firstValueFrom(
        this.get<MisSucursalesResponse>(this.endpoints.misSucursales)
      );
      return resp.body;
    } catch (error: any) {
      console.error('❌ Error al obtener sucursales:', error);
      return null;
    }
  }
}
