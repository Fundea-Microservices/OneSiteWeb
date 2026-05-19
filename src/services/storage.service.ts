import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../environments/environment';

export interface StorageUploadData {
  fileName: string;
  categoria: string;
  sizeMB: string;
  mimeType: string;
  url: string;
}

export interface StorageUploadResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: StorageUploadData;
}

export type StorageCategoria = 'perfil' | 'dpiRepresentante' | 'documento';

@Injectable({
  providedIn: 'root',
})
export class StorageService {

  private readonly baseUrl = environment.apiPath;

  private readonly endpoints = {
    upload: '/storage/upload',
    download: '/storage',
    delete: '/storage',
  };

  constructor(private http: HttpClient, private toastr: ToastrService) {}

  // ─── Auth ────────────────────────────────────────────────────────────────────

  private getToken(): string {
    return localStorage.getItem('token') || '';
  }

  private setHeaders(extraHeaders: { [key: string]: string } = {}): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${this.getToken()}`,
      ...extraHeaders,
    });
  }

  // ─── Upload ───────────────────────────────────────────────────────────────────

  /**
   * Sube un archivo a la categoría indicada.
   * @param file       Archivo a subir
   * @param categoria  Categoría de destino: 'perfil' | 'dpiRepresentante' | 'documento'
   * @param customName Nombre personalizado (sin extensión, opcional)
   * @returns          Objeto con la URL resultante, o null si falla
   */
  async uploadFile(
    file: File,
    categoria: StorageCategoria,
    customName?: string,
  ): Promise<StorageUploadResponse | null> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (customName) formData.append('customName', customName);

      const resp = await firstValueFrom(
        this.http.post<StorageUploadResponse>(
          `${this.baseUrl}${this.endpoints.upload}/${categoria}`,
          formData,
          { headers: this.setHeaders() },
        )
      );

      if (!resp?.success || !resp?.data?.url) {
        this.toastr.error('No se pudo subir el archivo', 'Error');
        return null;
      }

      return resp;
    } catch (error: any) {
      console.error('🚀 ~ StorageService ~ uploadFile ~ error:', error);
      this.toastr.error(error?.error?.message || 'Error al subir el archivo', 'Error');
      return null;
    }
  }

  // ─── Download ────────────────────────────────────────────────────────────────

  /**
   * Descarga un archivo y retorna un object URL utilizable en <img src> o <a href>.
   * @param fileUrl URL almacenada en BD con formato "categoria/nombreArchivo.ext"
   * @returns       Object URL del Blob, o null si no existe
   */
  async downloadFileAsUrl(fileUrl: string | null | undefined): Promise<string | null> {
    if (!fileUrl) return null;

    try {
      const slashIndex = fileUrl.indexOf('/');
      if (slashIndex === -1) return null;

      const categoria = fileUrl.substring(0, slashIndex);
      const fileName = fileUrl.substring(slashIndex + 1);

      const blob = await firstValueFrom(
        this.http.get(`${this.baseUrl}${this.endpoints.download}/${categoria}/${fileName}`, {
          headers: this.setHeaders(),
          responseType: 'blob',
        })
      );

      if (blob.size === 0) return null;

      return URL.createObjectURL(blob);
    } catch (error: any) {
      console.error('🚀 ~ StorageService ~ downloadFileAsUrl ~ error:', error);
      return null;
    }
  }

  /**
   * Descarga un archivo y retorna el Blob directamente (útil para PDFs, documentos, etc.).
   * @param fileUrl URL almacenada en BD con formato "categoria/nombreArchivo.ext"
   * @returns       Blob del archivo, o null si no existe
   */
  async downloadFileAsBlob(fileUrl: string | null | undefined): Promise<Blob | null> {
    if (!fileUrl) return null;

    try {
      const slashIndex = fileUrl.indexOf('/');
      if (slashIndex === -1) return null;

      const categoria = fileUrl.substring(0, slashIndex);
      const fileName = fileUrl.substring(slashIndex + 1);

      const blob = await firstValueFrom(
        this.http.get(`${this.baseUrl}${this.endpoints.download}/${categoria}/${fileName}`, {
          headers: this.setHeaders(),
          responseType: 'blob',
        })
      );

      return blob.size > 0 ? blob : null;
    } catch (error: any) {
      console.error('🚀 ~ StorageService ~ downloadFileAsBlob ~ error:', error);
      return null;
    }
  }

  // ─── Delete ───────────────────────────────────────────────────────────────────

  /**
   * Elimina un archivo del storage.
   * @param fileUrl URL almacenada en BD con formato "categoria/nombreArchivo.ext"
   * @returns       true si se eliminó correctamente, false si falló
   */
  async deleteFile(fileUrl: string | null | undefined): Promise<boolean> {
    if (!fileUrl) return false;

    try {
      const slashIndex = fileUrl.indexOf('/');
      if (slashIndex === -1) return false;

      const categoria = fileUrl.substring(0, slashIndex);
      const fileName = fileUrl.substring(slashIndex + 1);

      await firstValueFrom(
        this.http.delete(
          `${this.baseUrl}${this.endpoints.delete}/${categoria}/${fileName}`,
          { headers: this.setHeaders() },
        )
      );

      return true;
    } catch (error: any) {
      console.error('🚀 ~ StorageService ~ deleteFile ~ error:', error);
      this.toastr.error(error?.error?.message || 'Error al eliminar el archivo', 'Error');
      return false;
    }
  }
}
