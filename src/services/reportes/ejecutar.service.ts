import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpService } from '../HttpService';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { IReporte, ReporteResponse, ReportesResponse } from '../../interfaces/reportes/reporte';
import { EjecutarResponse } from '../../interfaces/reportes/ejecutar';

@Injectable({
  providedIn: 'root'
})
export class EjecutarService extends HttpService {

  private readonly endpoints = {
    ejecutar: '/reportes/ejecutar',
  };

  constructor(http: HttpClient, private toastr: ToastrService) {
    super(http); // pasa HttpClient al servicio base
  }


  async ejecutarReporte(data: any) {
    try {
      const resp = await firstValueFrom(this.post<EjecutarResponse>(`${this.endpoints.ejecutar}`, data));
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Success');
        return resp.body;
      }

      return null;
    } catch (error: any) {
      console.log("🚀 ~ EjecutarService ~ ejecutarReporte ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error al ejecutar reporte');
      return null;
    }
  }
  

}
