import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpService } from '../HttpService';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { IGestion, ITrama, TramaResponse, TramasResponse } from '../../interfaces/emanager/getion';

@Injectable({
  providedIn: 'root'
})
export class TramaService extends HttpService {

  private readonly endpoints = {
    gestion: 'dev/emanager/gestion/gestion-documento',
  };

  constructor(http: HttpClient, private toastr: ToastrService) {
    super(http);
  }


  async createGestionDocumento(createGestion: IGestion) {
    try {
      // Excluimos tramaEjecucionId y created_at porque los genera el backend
      const { tramaEjecucionId, created_at, ...data } = createGestion;

      // data incluye: usuario, usuarioId, trama, operacion, nombreCliente, documento
      const resp = await firstValueFrom(
        this.post<TramaResponse>(`${this.endpoints.gestion}`, data)
      );
      
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Success');
        return resp.body;
      }
      return null;
    } catch (error: any) {
      console.log('🚀 ~ GestionService ~ createGestion ~ error:', error);
      this.toastr.error(error?.error?.message || '', 'Error al crear gestión');
      return null;
    }
  }

}