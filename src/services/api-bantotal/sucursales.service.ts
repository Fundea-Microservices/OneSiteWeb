import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpService } from '../HttpService';
import { firstValueFrom } from 'rxjs';
import { MisSucursalesData, MisSucursalesResponse, TodasSucursalesResponse } from '../../interfaces/api-bantotal/sucursales';

@Injectable({
  providedIn: 'root'
})
export class SucursalesBantotalService extends HttpService {

  private readonly endpoints = {
    misSucursales: '/api-bantotal/sucursales/mis-sucursales-onesite',
    todasLasSucursales: '/api-bantotal/sucursales'
  };

  constructor(http: HttpClient) {
    super(http);
  }

  async getTodasLasSucursales(): Promise<MisSucursalesData | null> {
    try {
      const resp = await firstValueFrom(
        this.get<TodasSucursalesResponse>(this.endpoints.todasLasSucursales)
      );
      const rawData = resp.body?.data;
      if (!rawData) return null;

      return {
        regiones: rawData.regiones.map(r => ({
          id: r.identificador,
          descripcion: r.descripcion,
          direccion: r.direccion,
          telefono: r.telefono,
          latitud: r.latitud,
          longitud: r.longitud,
        })),
        agencias: rawData.agencias.map(a => ({
          id: a.identificador,
          descripcion: a.descripcion,
          direccion: a.direccion,
          telefono: a.telefono,
          latitud: a.latitud,
          longitud: a.longitud,
          regionId: a.regionId,
        })),
      };
    } catch (error: any) {
      console.error('❌ Error al obtener todas las sucursales:', error);
      return null;
    }
  }

  async getMisSucursales(usuario?: string): Promise<MisSucursalesResponse | null> {
    try {
      const params = usuario ? { usuario } : undefined;
      const resp = await firstValueFrom(
        this.get<MisSucursalesResponse>(this.endpoints.misSucursales, params)
      );
      return resp.body;
    } catch (error: any) {
      console.error('❌ Error al obtener sucursales:', error);
      return null;
    }
  }
}
