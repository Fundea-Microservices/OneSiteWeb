import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpService } from '../HttpService';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../environments/environment';
import {
  IDocumento,
  IVersionDocumento,
  DocumentoResponse,
  DocumentoByIdResponse,
  VersionDocumentoResponse,
  VersionDocumentoByIdResponse,
  IParametro,
  ParametroResponse,
  ParametroBulkResponse,
} from '../../interfaces/documentos/documento';

@Injectable({
  providedIn: 'root',
})
export class DocumentosService extends HttpService {
  private readonly endpoints = {
    documento: '/doc/documento',
    version: '/doc/version',
    upload: '/doc/version/upload',
    parametro: '/doc/parametro',
  };

  private readonly httpClient: HttpClient;

  constructor(http: HttpClient, private toastr: ToastrService) {
    super(http);
    this.httpClient = http;
  }

  // ─── DOCUMENTOS ───────────────────────────────────────────────

  async getDocumentos({ page = 1, limit = 10, search = '', activo }: { page?: number; limit?: number; search?: string; activo?: boolean } = {}) {
    try {
      const params: any = { page, limit };
      if (search) params['search'] = search;
      if (activo !== undefined) params['activo'] = activo;
      const resp = await firstValueFrom(
        this.get<DocumentoResponse>(this.endpoints.documento, params)
      );
      return resp.body?.success ? resp.body : null;
    } catch (error: any) {
      this.toastr.error(error?.error?.message || '', 'Error al obtener documentos');
      return null;
    }
  }

  async getDocumentoById(id: string) {
    try {
      const resp = await firstValueFrom(
        this.get<DocumentoByIdResponse>(`${this.endpoints.documento}/${id}`)
      );
      return resp.body?.success ? resp.body : null;
    } catch (error: any) {
      this.toastr.error(error?.error?.message || '', 'Error al obtener documento');
      return null;
    }
  }

  async createDocumento(data: IDocumento) {
    try {
      const payload = {
        nombre: data.nombre,
        codigo: data.codigo,
        categoria: data.categoria,
        descripcion: data.descripcion,
        activo: data.activo,
      };
      const resp = await firstValueFrom(
        this.post<DocumentoByIdResponse>(this.endpoints.documento, payload)
      );
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Éxito');
        return resp.body;
      }
      return null;
    } catch (error: any) {
      this.toastr.error(error?.error?.message || '', 'Error al crear documento');
      return null;
    }
  }

  async updateDocumento(data: IDocumento) {
    try {
      const payload = {
        documentoId: data.documentoId,
        nombre: data.nombre,
        codigo: data.codigo,
        categoria: data.categoria,
        descripcion: data.descripcion,
        activo: data.activo,
      };
      const resp = await firstValueFrom(
        this.put<DocumentoByIdResponse>(this.endpoints.documento, payload)
      );
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Éxito');
        return resp.body;
      }
      return null;
    } catch (error: any) {
      this.toastr.error(error?.error?.message || '', 'Error al actualizar documento');
      return null;
    }
  }

  async deleteDocumento(id: string) {
    try {
      const resp = await firstValueFrom(
        this.delete<{ success: boolean; message: string }>(`${this.endpoints.documento}/${id}`)
      );
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Éxito');
        return resp.body;
      }
      return null;
    } catch (error: any) {
      this.toastr.error(error?.error?.message || '', 'Error al eliminar documento');
      return null;
    }
  }

  // ─── VERSIONES ─────────────────────────────────────────────────

  async getVersiones({ page = 1, limit = 10, documentoId, aprobado, vigente }: { page?: number; limit?: number; documentoId?: string; aprobado?: boolean; vigente?: boolean } = {}) {
    try {
      const params: any = { page, limit };
      if (documentoId) params['documentoId'] = documentoId;
      if (aprobado !== undefined) params['aprobado'] = aprobado;
      if (vigente !== undefined) params['vigente'] = vigente;
      const resp = await firstValueFrom(
        this.get<VersionDocumentoResponse>(this.endpoints.version, params)
      );
      return resp.body?.success ? resp.body : null;
    } catch (error: any) {
      this.toastr.error(error?.error?.message || '', 'Error al obtener versiones');
      return null;
    }
  }

  async getVersionById(id: string) {
    try {
      const resp = await firstValueFrom(
        this.get<VersionDocumentoByIdResponse>(`${this.endpoints.version}/${id}`)
      );
      return resp.body?.success ? resp.body : null;
    } catch (error: any) {
      this.toastr.error(error?.error?.message || '', 'Error al obtener versión');
      return null;
    }
  }

  async createVersion(data: Partial<IVersionDocumento>) {
    try {
      const resp = await firstValueFrom(
        this.post<VersionDocumentoByIdResponse>(this.endpoints.version, data)
      );
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Éxito');
        return resp.body;
      }
      return null;
    } catch (error: any) {
      this.toastr.error(error?.error?.message || '', 'Error al crear versión');
      return null;
    }
  }

  async updateVersion(data: Partial<IVersionDocumento>) {
    try {

      const {created_at, updated_at, deleted_at, ...dataSend} = data;
      const resp = await firstValueFrom(
        this.put<VersionDocumentoByIdResponse>(this.endpoints.version, dataSend)
      );
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Éxito');
        return resp.body;
      }
      return null;
    } catch (error: any) {
      this.toastr.error(error?.error?.message || '', 'Error al actualizar versión');
      return null;
    }
  }

  async deleteVersion(id: string) {
    try {
      const resp = await firstValueFrom(
        this.delete<{ success: boolean; message: string }>(`${this.endpoints.version}/${id}`)
      );
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Éxito');
        return resp.body;
      }
      return null;
    } catch (error: any) {
      this.toastr.error(error?.error?.message || '', 'Error al eliminar versión');
      return null;
    }
  }

  async uploadArchivoVersion(file: File): Promise<string | null> {
    try {
      const token = localStorage.getItem('token') || '';
      const formData = new FormData();
      formData.append('file', file);
      const resp = await firstValueFrom(
        this.httpClient.post<{ success: boolean; data: { rutaArchivo: string }; message: string }>(
          `${environment.apiPath}${this.endpoints.upload}`,
          formData,
          { headers: { Authorization: `Bearer ${token}` }, observe: 'body' }
        )
      );
      if (resp?.success) return resp.data.rutaArchivo;
      return null;
    } catch (error: any) {
      this.toastr.error(error?.error?.message || '', 'Error al subir archivo');
      return null;
    }
  }

  // ─── PARÁMETROS ────────────────────────────────────────────────

  async getParametros({ versionId, page = 1, limit = 100, all = true }: { versionId: string; page?: number; limit?: number; all?: boolean }) {
    try {
      const params: any = { versionId, page, limit, all };
      const resp = await firstValueFrom(
        this.get<ParametroResponse>(this.endpoints.parametro, params)
      );
      return resp.body?.success ? resp.body : null;
    } catch (error: any) {
      this.toastr.error(error?.error?.message || '', 'Error al obtener parámetros');
      return null;
    }
  }

  /** Envía los parámetros en lotes de 30 */
  async createParametrosBulk(parametros: Pick<IParametro, 'versionId' | 'nombreTag' | 'valor'>[]): Promise<boolean> {
    const CHUNK = 30;
    try {
      for (let i = 0; i < parametros.length; i += CHUNK) {
        const chunk = parametros.slice(i, i + CHUNK);
        const resp = await firstValueFrom(
          this.post<ParametroBulkResponse>(
            `${this.endpoints.parametro}/bulk`,
            { parametros: chunk }
          )
        );
        if (!resp.body?.success) return false;
      }
      return true;
    } catch (error: any) {
      this.toastr.error(error?.error?.message || '', 'Error al guardar parámetros');
      return false;
    }
  }

  /** Actualiza solo los valores por defecto de parámetros existentes de una versión */
  async updateParametrosBulk(versionId: string, parametros: { parametroId: string; valor: string }[]): Promise<boolean> {
    try {
      const resp = await firstValueFrom(
        this.put<ParametroBulkResponse>(
          `${this.endpoints.parametro}/bulk`,
          { versionId, parametros }
        )
      );
      return !!resp.body?.success;
    } catch (error: any) {
      this.toastr.error(error?.error?.message || '', 'Error al actualizar parámetros');
      return false;
    }
  }
}
