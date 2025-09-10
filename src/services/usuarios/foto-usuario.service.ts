import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { HttpService } from '../HttpService';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { IReporte, ReporteResponse, ReportesResponse } from '../../interfaces/reportes/reporte';
import { EjecutarResponse } from '../../interfaces/reportes/ejecutar';
import { PlantillaResponse } from '../../interfaces/reportes/plantilla';
import { environment } from '../../environments/environment';
import { UsersResponse } from '../../interfaces/auth';

@Injectable({
  providedIn: 'root'
})
export class FotoPerfilService {

  private readonly endpoints = {
    fotoUrl: '/config/user/foto',
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


  async actualizarFotoUsuario(formData: FormData) {
    try {
      const resp = await firstValueFrom(
        this.http.post<UsersResponse>(
          `${this.baseUrl}${this.endpoints.fotoUrl}`,
          formData,
          {
            headers: this.setHeaders(),
          }
        )
      );
      console.log("🚀 ~ resp:", resp);
      return resp;
    } catch (error: any) {
      console.error('🚀 ~ actualizarFotoUsuario ~ error:', error);
      this.toastr.error(error?.error?.message || 'Error al actualizar la foto del usuario', 'Error');
      return null;
    }
  }

  async descargarFotoUsuario(usuarioId: string): Promise<string | null> {
    try {
      const response = await firstValueFrom(
        this.http.get(`${this.baseUrl}${this.endpoints.fotoUrl}/${usuarioId}`, {
          headers: this.setHeaders(),
          responseType: 'blob'
        })
      );
      console.log("🚀 ~ FotoPerfilService ~ descargarFotoUsuario ~ response:", response)

      if (response.size === 0) {
        this.toastr.warning('El usuario no tiene una foto asignada.', 'Aviso');
        return null;
      }

      // Convertimos el Blob en una URL para mostrarla en el <img>
      return URL.createObjectURL(response);
    } catch (error: any) {
      console.error("🚀 ~ FotoPerfilService ~ descargarFotoUsuario ~ error:", error);
      // this.toastr.error(error?.error?.message || 'No se pudo obtener la foto del usuario', 'Error');
      return null;
    }
  }

}
