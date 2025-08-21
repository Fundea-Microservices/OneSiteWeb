import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { HttpService } from '../HttpService';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { IReporte, ReporteResponse, ReportesResponse } from '../../interfaces/reportes/reporte';
import { EjecutarResponse } from '../../interfaces/reportes/ejecutar';
import { PlantillaResponse } from '../../interfaces/reportes/plantilla';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PlantillaService {

  private readonly endpoints = {
    plantilla: '/reportes/plantilla',
  };

  constructor(private http: HttpClient, private toastr: ToastrService) {

  }
  private baseUrl: string = environment.apiPath;

  /**
  * Obtiene el token desde localStorage. 
  * Asegúrate de que tu AuthService lo guarde ahí correctamente después del login.
  */
  private getToken(): string {
    return localStorage.getItem('token') || '';
  }

  private setHeaders(extraHeaders: { [key: string]: string } = {}): HttpHeaders {
    let headers = new HttpHeaders({
      'Authorization': `Bearer ${this.getToken()}`,
      ...extraHeaders
    });

    return headers;
  }


  async guardarPlantilla(formData: FormData) {
    try {
      const resp = await firstValueFrom(
        this.http.post<PlantillaResponse>(
          `${this.baseUrl}${this.endpoints.plantilla}`,
          formData,
          {
            headers: this.setHeaders(),
          }
        )
      );
      console.log("🚀 ~ resp:", resp);
      return resp;
    } catch (error: any) {
      console.error('🚀 ~ guardarPlantilla ~ error:', error);
      this.toastr.error(error?.error?.message || 'Error al guardar la plantilla', 'Error');
      return null;
    }
  }

}
