import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { HttpService } from '../HttpService';
import {
  CreatePlantillaDto,
  PlantillaByCodigoResponse,
  PlantillaDeleteResponse,
  PlantillaFiltros,
  PlantillaListResponse,
  UpdatePlantillaDto,
} from '../../interfaces/plantillas/plantilla';

@Injectable({
  providedIn: 'root',
})
export class PlantillasService extends HttpService {

  private readonly endpoints = {
    plantillas: '/plantillas',
  };

  constructor(http: HttpClient, private toastr: ToastrService) {
    super(http);
  }

  /** El código viaja en la URL de casi todos los endpoints. */
  private urlPlantilla(codigo: string, sufijo = ''): string {
    return `${this.endpoints.plantillas}/${encodeURIComponent(codigo)}${sufijo}`;
  }

  /** `message` llega como string o como string[] (errores de validación). */
  private mensajeError(error: any): string {
    const message = error?.error?.message;
    return Array.isArray(message) ? message.join(' · ') : message || '';
  }

  // ─── CONSULTA (Admin) ──────────────────────────────────────────

  async getPlantillas({ page = 1, limit = 10, search, modulo, categoria, activo, all }: PlantillaFiltros = {}) {
    try {
      const params: Record<string, string | number | boolean> = { page, limit };
      if (search) params['search'] = search;
      if (modulo) params['modulo'] = modulo;
      if (categoria) params['categoria'] = categoria;
      if (activo !== undefined) params['activo'] = activo;
      if (all) params['all'] = true;
      const resp = await firstValueFrom(
        this.get<PlantillaListResponse>(this.endpoints.plantillas, params)
      );
      return resp.body?.success ? resp.body : null;
    } catch (error: any) {
      this.toastr.error(this.mensajeError(error), 'Error al obtener plantillas');
      return null;
    }
  }

  // ─── CONSULTA (cualquier usuario autenticado) ──────────────────

  /**
   * Obtiene una plantilla activa por código, para que los módulos muestren su botón
   * "Descargar plantilla". Si no existe o está inactiva (404) devuelve null sin notificar.
   */
  async getPlantillaByCodigo(codigo: string) {
    try {
      const resp = await firstValueFrom(
        this.get<PlantillaByCodigoResponse>(this.urlPlantilla(codigo))
      );
      return resp.body?.success ? resp.body : null;
    } catch (error: any) {
      if (error?.status !== 404) {
        this.toastr.error(this.mensajeError(error), 'Error al obtener plantilla');
      }
      return null;
    }
  }

  /**
   * Descarga el Excel de una plantilla activa. El endpoint pide token, así que se solicita
   * como blob; el nombre del archivo lo pone el frontend porque `Content-Disposition` no es
   * legible por CORS.
   * @param mimeType MIME registrado de la plantilla, por si la respuesta no trae el tipo.
   */
  async descargarPlantilla(codigo: string, nombreArchivo: string, mimeType?: string): Promise<boolean> {
    try {
      const blob = await this.obtenerArchivo(codigo);

      const tipo = [blob.type, mimeType].find(t => t?.includes('spreadsheetml') || t?.includes('ms-excel'));
      const extension = tipo?.includes('ms-excel') ? 'xls' : 'xlsx';
      const nombre = nombreArchivo.replace(/[\\/:*?"<>|]+/g, '').trim() || codigo;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${nombre}.${extension}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url));
      return true;
    } catch (error: any) {
      // El backend responde 500 (no 404) si el código no existe o la plantilla está inactiva,
      // por eso cualquier fallo se trata como "no disponible".
      console.error('🚀 ~ PlantillasService ~ descargarPlantilla ~ error:', error);
      this.toastr.error('La plantilla no está disponible para descarga', 'Error al descargar plantilla');
      return false;
    }
  }

  /**
   * Archivo de una plantilla activa, sin descargarlo: para los módulos que la llenan con datos
   * (p. ej. el Excel del flujo de fondos). Null si no existe, está inactiva o viene vacía;
   * el aviso lo da quien la pide.
   */
  async getArchivoPlantilla(codigo: string): Promise<Blob | null> {
    try {
      return await this.obtenerArchivo(codigo);
    } catch (error: any) {
      console.error('🚀 ~ PlantillasService ~ getArchivoPlantilla ~ error:', error);
      return null;
    }
  }

  private async obtenerArchivo(codigo: string): Promise<Blob> {
    const resp = await firstValueFrom(this.getBlob(this.urlPlantilla(codigo, '/descargar')));
    const blob = resp.body;
    if (!blob || blob.size === 0) throw new Error('Archivo vacío');
    return blob;
  }

  // ─── ADMINISTRACIÓN (Admin) ────────────────────────────────────

  async createPlantilla(datos: CreatePlantillaDto, archivo: File) {
    try {
      const formData = new FormData();
      formData.append('file', archivo);
      formData.append('codigo', datos.codigo);
      formData.append('nombre', datos.nombre);
      formData.append('modulo', datos.modulo);
      // Los opcionales vacíos no se envían
      if (datos.categoria) formData.append('categoria', datos.categoria);
      if (datos.descripcion) formData.append('descripcion', datos.descripcion);

      const resp = await firstValueFrom(
        this.postFormData<PlantillaByCodigoResponse>(this.endpoints.plantillas, formData)
      );
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Éxito');
        return resp.body;
      }
      return null;
    } catch (error: any) {
      this.toastr.error(this.mensajeError(error), 'Error al crear plantilla');
      return null;
    }
  }

  /** Solo se envían los campos editables; el código no se puede cambiar. */
  async updatePlantilla(codigo: string, cambios: UpdatePlantillaDto) {
    try {
      const resp = await firstValueFrom(
        this.put<PlantillaByCodigoResponse>(this.urlPlantilla(codigo), cambios)
      );
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Éxito');
        return resp.body;
      }
      return null;
    } catch (error: any) {
      this.toastr.error(this.mensajeError(error), 'Error al actualizar plantilla');
      return null;
    }
  }

  /** Reemplaza el Excel conservando la metadata; el backend sube `version` en 1. */
  async reemplazarArchivo(codigo: string, archivo: File) {
    try {
      const formData = new FormData();
      formData.append('file', archivo);
      const resp = await firstValueFrom(
        this.putFormData<PlantillaByCodigoResponse>(this.urlPlantilla(codigo, '/archivo'), formData)
      );
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Éxito');
        return resp.body;
      }
      return null;
    } catch (error: any) {
      this.toastr.error(this.mensajeError(error), 'Error al reemplazar archivo');
      return null;
    }
  }

  /** Borrado lógico: deja de listarse, no se puede descargar y el código queda libre. */
  async deletePlantilla(codigo: string) {
    try {
      const resp = await firstValueFrom(
        this.delete<PlantillaDeleteResponse>(this.urlPlantilla(codigo))
      );
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Éxito');
        return resp.body;
      }
      return null;
    } catch (error: any) {
      this.toastr.error(this.mensajeError(error), 'Error al eliminar plantilla');
      return null;
    }
  }
}
