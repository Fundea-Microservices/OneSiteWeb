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

  async descargarPlantilla(reporteId: string) {
    try {
      this.http.get(`${this.baseUrl}${this.endpoints.plantilla}/${reporteId}`, {
        headers: this.setHeaders(),
        observe: 'response',
        responseType: 'blob'
      }).subscribe({
        next: (response) => {
          const contentType = response.headers.get('Content-Type');
          const contentDisposition = response.headers.get('Content-Disposition');
          console.log("🚀 ~ PlantillaService ~ descargarPlantilla ~ response.headers:", response.headers)

          // Si es Excel
          if (response.body && contentType?.includes('spreadsheetml')) {
            // Obtener nombre real del archivo desde Content-Disposition
            let fileName = 'plantilla.xlsx';
            if (contentDisposition) {
              const match = contentDisposition.match(/filename="(.+)"/);
              if (match && match[1]) {
                fileName = match[1];
              }
            }

            const url = window.URL.createObjectURL(response.body);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.click();
            window.URL.revokeObjectURL(url);
          } else {
            // Si vino JSON de error
            const reader = new FileReader();
            reader.onload = () => {
              try {
                const error = JSON.parse(reader.result as string);
                this.toastr.error(error.message, 'Error');
              } catch (e) {
                this.toastr.error('Error desconocido al procesar la respuesta', 'Error');
              }
            };
            reader.readAsText(response.body || new Blob());
          }
        },
        error: (err) => {
          console.log("🚀 ~ PlantillaService ~ descargarPlantilla ~ err:", err)
          this.toastr.error(err.message || 'No se pudo exportar la plantilla', 'Error');
        }
      });
      return null;
    } catch (error: any) {
      console.log("🚀 ~ PlantillaService ~ descargarPlantilla ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error al descargar plantilla');
      return null;
    }
  }

}
