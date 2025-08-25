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
    exportar_csv: '/reportes/ejecutar/csv',
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

  async exportarExcel(data: any): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.httpService.post(`${this.baseUrl}${this.endpoints.exportar_excel}`, data, {
        headers: this.setHeaders({}),
        observe: 'response',
        responseType: 'blob'
      }).subscribe({
        next: (response) => {
          const contentType = response.headers.get('Content-Type') || '';

          if (response.body && contentType.includes('spreadsheetml')) {
            const url = window.URL.createObjectURL(response.body);
            const a = document.createElement('a');
            a.href = url;
            a.download = data.fileName ? `${data.fileName}.xlsx` : 'reporte.xlsx';
            a.click();
            window.URL.revokeObjectURL(url);

            resolve(true); // Descarga iniciada
          } else {
            const reader = new FileReader();
            reader.onload = () => {
              try {
                const error = JSON.parse(reader.result as string);
                this.toastr.error(error.message || 'Error desconocido', 'Error');
              } catch {
                this.toastr.error('Error desconocido al procesar la respuesta', 'Error');
              }
              reject(false);
            };
            reader.readAsText(response.body || new Blob());
          }
        },
        error: (err) => {
          this.handleBlobError(err, reject);
        }
      });
    });
  }

  async exportarExcelPlantilla(data: any): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.httpService.post(`${this.baseUrl}${this.endpoints.exportar_excel_plantilla}`, data, {
        headers: this.setHeaders({}),
        observe: 'response',
        responseType: 'blob'
      }).subscribe({
        next: (response) => {
          const contentType = response.headers.get('Content-Type') || '';

          if (response.body && contentType.includes('spreadsheetml')) {
            const url = window.URL.createObjectURL(response.body);
            const a = document.createElement('a');
            a.href = url;
            a.download = data.fileName ? `${data.fileName}.xlsx` : 'reporte.xlsx';
            a.click();
            window.URL.revokeObjectURL(url);

            resolve(true);
          } else {
            const reader = new FileReader();
            reader.onload = () => {
              try {
                const error = JSON.parse(reader.result as string);
                this.toastr.error(error.message || 'Error desconocido', 'Error');
              } catch {
                this.toastr.error('Error desconocido al procesar la respuesta', 'Error');
              }
              reject(false);
            };
            reader.readAsText(response.body || new Blob());
          }
        },
        error: (err) => {
          this.handleBlobError(err, reject);
        }
      });
    });
  }

  async exportarPDFPlantilla(data: any): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.httpService.post(`${this.baseUrl}${this.endpoints.exportar_pdf_plantilla}`, data, {
        headers: this.setHeaders({}),
        observe: 'response',
        responseType: 'blob'
      }).subscribe({
        next: (response) => {
          const contentType = response.headers.get('Content-Type') || '';

          if (response.body && contentType.includes('pdf')) {
            const url = window.URL.createObjectURL(response.body);
            const a = document.createElement('a');
            a.href = url;
            a.download = data.fileName ? `${data.fileName}.pdf` : 'reporte.pdf';
            a.click();
            window.URL.revokeObjectURL(url);

            resolve(true);
          } else {
            const reader = new FileReader();
            reader.onload = () => {
              try {
                const error = JSON.parse(reader.result as string);
                this.toastr.error(error.message || 'Error desconocido', 'Error');
              } catch {
                this.toastr.error('Error desconocido al generar el PDF', 'Error');
              }
              reject(false);
            };
            reader.readAsText(response.body || new Blob());
          }
        },
        error: (err) => {
          this.handleBlobError(err, reject);
        }
      });
    });
  }


  async exportarCSV(data: any): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.httpService.post(`${this.baseUrl}${this.endpoints.exportar_csv}`, data, {
        headers: this.setHeaders({}),
        observe: 'response',
        responseType: 'blob'
      }).subscribe({
        next: (response) => {
          const contentType = response.headers.get('Content-Type');

          if (response.body && contentType?.includes('text/csv')) {
            const url = window.URL.createObjectURL(response.body);
            const a = document.createElement('a');
            a.href = url;
            a.download = (data.fileName ? `${data.fileName}.csv` : 'reporte.csv');
            a.click();
            window.URL.revokeObjectURL(url);

            resolve(true); // <-- DESCARGA INICIADA, LIBERAR BOTÓN
          } else {
            const reader = new FileReader();
            reader.onload = () => {
              try {
                const error = JSON.parse(reader.result as string);
                this.toastr.error(error.message || 'Error desconocido', 'Error');
              } catch {
                this.toastr.error('Error desconocido al procesar la respuesta', 'Error');
              }
              reject(false); // <-- ERROR
            };
            reader.readAsText(response.body || new Blob());
          }
        },
        error: (err) => {
          this.handleBlobError(err, reject);
        }
      });
    });
  }

  private handleBlobError(err: any, reject: (value: boolean) => void) {
    console.log("🚀 ~ Error al exportar reporte:", err);

    if (err.error instanceof Blob && err.error.type === 'application/json') {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const errorJson = JSON.parse(reader.result as string);
          this.toastr.error(errorJson.message || 'No se pudo exportar el reporte', 'Error');
        } catch {
          this.toastr.error('Error desconocido al procesar la respuesta', 'Error');
        }
        reject(false);
      };
      reader.readAsText(err.error);
    } else {
      this.toastr.error(err.message || 'No se pudo exportar el reporte', 'Error');
      reject(false);
    }
  }



}
