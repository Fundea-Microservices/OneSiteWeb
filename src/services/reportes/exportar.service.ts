import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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
  };
  private baseUrl: string = environment.apiPath;

  constructor(private httpService: HttpClient, private toastr: ToastrService) {
  }

  async exportarExcel(data: any) {
    try {
      this.httpService.post(`${this.baseUrl}${this.endpoints.exportar_excel}`, data, {
        responseType: 'blob' // 👈 importante
      }).subscribe((file: Blob) => {
        const url = window.URL.createObjectURL(file);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'reporte.xlsx';
        a.click();
        window.URL.revokeObjectURL(url);
      }); 
      return null;
    } catch (error: any) {
      console.log("🚀 ~ EjecutarService ~ ejecutarReporte ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error al ejecutar reporte');
      return null;
    }
  }


}
