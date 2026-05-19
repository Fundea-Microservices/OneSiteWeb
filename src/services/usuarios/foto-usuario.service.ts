import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../environments/environment';
import { UsersResponse } from '../../interfaces/auth';

interface StorageUploadResponse {
  success: boolean;
  fileName: string;
  categoria: string;
  size: number;
  mimeType: string;
  url: string;
}

@Injectable({
  providedIn: 'root'
})
export class FotoPerfilService {

  private readonly endpoints = {
    storageUpload: '/storage/upload',
    storageDownload: '/storage',
    fotoUrl: '/config/user/foto',
  };

  private baseUrl: string = environment.apiPath;

  constructor(private http: HttpClient, private toastr: ToastrService) {}

  private getToken(): string {
    return localStorage.getItem('token') || '';
  }

  private setHeaders(extraHeaders: { [key: string]: string } = {}): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${this.getToken()}`,
      ...extraHeaders,
    });
  }

  async actualizarFotoUsuario(formData: FormData): Promise<UsersResponse | null> {
    try {
      // Paso 1: subir el archivo al servicio de storage
      const uploadResp = await firstValueFrom(
        this.http.post<StorageUploadResponse>(
          `${this.baseUrl}${this.endpoints.storageUpload}/perfil`,
          formData,
          { headers: this.setHeaders() },
        )
      );

      if (!uploadResp?.success || !uploadResp.url) {
        this.toastr.error('Error al subir la imagen', 'Error');
        return null;
      }

      // Paso 2: guardar la URL resultante en el perfil del usuario
      const resp = await firstValueFrom(
        this.http.post<UsersResponse>(
          `${this.baseUrl}${this.endpoints.fotoUrl}`,
          { url: uploadResp.url },
          { headers: this.setHeaders({ 'Content-Type': 'application/json' }) },
        )
      );

      return resp;
    } catch (error: any) {
      console.error('🚀 ~ actualizarFotoUsuario ~ error:', error);
      this.toastr.error(error?.error?.message || 'Error al actualizar la foto del usuario', 'Error');
      return null;
    }
  }

  /**
   * Descarga la foto de perfil a partir de la URL almacenada en el usuario.
   * @param photoUrl Valor guardado en user.photoUrl, con formato "perfil/nombre.jpg"
   */
  async descargarFotoUsuario(photoUrl: string | null | undefined): Promise<string | null> {
    if (!photoUrl) return null;

    try {
      const slashIndex = photoUrl.indexOf('/');
      if (slashIndex === -1) return null;

      const categoria = photoUrl.substring(0, slashIndex);
      const fileName = photoUrl.substring(slashIndex + 1);

      const response = await firstValueFrom(
        this.http.get(`${this.baseUrl}${this.endpoints.storageDownload}/${categoria}/${fileName}`, {
          headers: this.setHeaders(),
          responseType: 'blob',
        })
      );

      if (response.size === 0) {
        this.toastr.warning('El usuario no tiene una foto asignada.', 'Aviso');
        return null;
      }

      return URL.createObjectURL(response);
    } catch (error: any) {
      console.error('🚀 ~ FotoPerfilService ~ descargarFotoUsuario ~ error:', error);
      return null;
    }
  }

}
