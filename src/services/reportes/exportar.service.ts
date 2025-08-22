import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { HttpService } from '../HttpService';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { IReporte, ReporteResponse, ReportesResponse } from '../../interfaces/reportes/reporte';
import { EjecutarResponse } from '../../interfaces/reportes/ejecutar';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ExportarService {

  private readonly endpoints = {
    ejecutar: '/reportes/ejecutar',
    exportar_excel: '/reportes/ejecutar/excel',
    exportar_excel_plantilla: '/reportes/ejecutar/excel-plantilla',
    exportar_pdf_plantilla: '/reportes/ejecutar/pdf'
  };
  private baseUrl: string = environment.apiPath;

  constructor(private httpService: HttpClient, private toastr: ToastrService) {
  }

  /**
  * Obtiene el token desde localStorage. 
  * Asegúrate de que tu AuthService lo guarde ahí correctamente después del login.
  */
  private getToken(): string {
    return localStorage.getItem('token') || '';
  }

  private setHeaders(extraHeaders: { [key: string]: string } = {}): HttpHeaders {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.getToken()}`,
      ...extraHeaders
    });

    return headers;
  }

  async exportarExcel(data: any) {
    try {
      this.httpService.post(`${this.baseUrl}${this.endpoints.exportar_excel}`, data, {
        headers: this.setHeaders({}),
        observe: 'response',
        responseType: 'blob'
      }).subscribe({
        next: (response) => {
          // Si es Excel
          if (response.body && response.headers.get('Content-Type')?.includes('spreadsheetml')) {
            const url = window.URL.createObjectURL(response.body);
            const a = document.createElement('a');
            a.href = url;
            a.download = data.fileName || 'reporte.xlsx';
            a.click();
            window.URL.revokeObjectURL(url);
          } else {
            // Si vino JSON de error
            const reader = new FileReader();
            reader.onload = () => {
              const error = JSON.parse(reader.result as string);
              this.toastr.error(error.message, 'Error');
            };
            reader.readAsText(response.body || new Blob());
          }
        },
        error: (err) => {
          this.toastr.error(err.message || 'No se pudo exportar el reporte', 'Error');
        }
      });
      return null;
    } catch (error: any) {
      console.log("🚀 ~ EjecutarService ~ ejecutarReporte ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error al ejecutar reporte');
      return null;
    }
  }

  async exportarExcelPlantilla(data: any) {
    try {
      this.httpService.post(`${this.baseUrl}${this.endpoints.exportar_excel_plantilla}`, data, {
        headers: this.setHeaders({}),
        observe: 'response',
        responseType: 'blob'
      }).subscribe({
        next: (response) => {
          // Si es Excel
          if (response.body && response.headers.get('Content-Type')?.includes('spreadsheetml')) {
            const url = window.URL.createObjectURL(response.body);
            const a = document.createElement('a');
            a.href = url;
            a.download = data.fileName || 'reporte.xlsx';
            a.click();
            window.URL.revokeObjectURL(url);
          } else {
            // Si vino JSON de error
            const reader = new FileReader();
            reader.onload = () => {
              const error = JSON.parse(reader.result as string);
              this.toastr.error(error.message, 'Error');
            };
            reader.readAsText(response.body || new Blob());
          }
        },
        error: (err) => {
          this.toastr.error(err.message || 'No se pudo exportar el reporte', 'Error');
        }
      });
      return null;
    } catch (error: any) {
      console.log("🚀 ~ EjecutarService ~ ejecutarReporte ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error al ejecutar reporte');
      return null;
    }
  }

  async exportarPDFPlantilla(data: any) {
  try {
    this.httpService.post(`${this.baseUrl}${this.endpoints.exportar_pdf_plantilla}`, data, {
      headers: this.setHeaders({}),
      observe: 'response',
      responseType: 'blob'
    }).subscribe({
      next: (response) => {
        const contentType = response.headers.get('Content-Type') || '';

        // Si es PDF
        if (response.body && contentType.includes('pdf')) {
          const url = window.URL.createObjectURL(response.body);
          const a = document.createElement('a');
          a.href = url;
          a.download = data.fileName ? `${data.fileName}.pdf` : 'reporte.pdf';
          a.click();
          window.URL.revokeObjectURL(url);
        } else {
          // Si vino JSON de error
          const reader = new FileReader();
          reader.onload = () => {
            try {
              const error = JSON.parse(reader.result as string);
              this.toastr.error(error.message, 'Error');
            } catch {
              this.toastr.error('Error desconocido al generar el PDF', 'Error');
            }
          };
          reader.readAsText(response.body || new Blob());
        }
      },
      error: (err) => {
        this.toastr.error(err.message || 'No se pudo exportar el reporte', 'Error');
      }
    });

    return null;
  } catch (error: any) {
    console.log("🚀 ~ EjecutarService ~ exportarExcelPlantilla ~ error:", error);
    this.toastr.error(error?.error?.message || '', 'Error al ejecutar reporte');
    return null;
  }
}


}
