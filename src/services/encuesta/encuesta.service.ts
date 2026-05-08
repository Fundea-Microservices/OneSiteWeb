import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { HttpService } from '../HttpService';
import {
  IEncuesta,
  EncuestaListResponse,
  EncuestaSingleResponse,
} from '../../interfaces/encuesta/encuesta';

@Injectable({ providedIn: 'root' })
export class EncuestaService extends HttpService {
  private readonly base = '/onesiteex/encuestas/encuesta';

  constructor(http: HttpClient, private toastr: ToastrService) {
    super(http);
  }

  async getEncuestas({ page = 1, limit = 10, search = '', estado, all }: { page?: number; limit?: number; search?: string; estado?: boolean; all?: boolean } = {}) {
    try {
      const params: any = { page, limit };
      if (search) params['search'] = search;
      if (estado !== undefined) params['estado'] = estado;
      if (all) params['all'] = all;
      const resp = await firstValueFrom(this.get<EncuestaListResponse>(this.base, params));
      return resp.body?.success ? resp.body : null;
    } catch (error: any) {
      this.toastr.error(error?.error?.message || '', 'Error en encuestas');
      return null;
    }
  }

  async getEncuestaById(id: number) {
    try {
      const resp = await firstValueFrom(this.get<EncuestaSingleResponse>(`${this.base}/${id}`));
      return resp.body?.success ? resp.body : null;
    } catch (error: any) {
      this.toastr.error(error?.error?.message || '', 'Error en encuestas');
      return null;
    }
  }

  async createEncuesta(encuesta: IEncuesta) {
    try {
      const { nombre, versionActiva, estado } = encuesta;
      const body: any = { nombre };
      if (versionActiva != null) body['versionActiva'] = versionActiva;
      if (estado !== undefined) body['estado'] = estado;
      const resp = await firstValueFrom(this.post<EncuestaSingleResponse>(this.base, body));
      if (resp.body?.success) { this.toastr.success(resp.body.message || 'Encuesta creada', 'Éxito'); return resp.body; }
      return null;
    } catch (error: any) {
      this.toastr.error(error?.error?.message || '', 'Error al crear encuesta');
      return null;
    }
  }

  async updateEncuesta(encuesta: IEncuesta) {
    try {
      const { fechaModificacion, fechaCreacion, ...body } = encuesta;
      const resp = await firstValueFrom(this.put<EncuestaSingleResponse>(this.base, body));
      if (resp.body?.success) { this.toastr.success(resp.body.message || 'Encuesta actualizada', 'Éxito'); return resp.body; }
      return null;
    } catch (error: any) {
      this.toastr.error(error?.error?.message || '', 'Error al actualizar encuesta');
      return null;
    }
  }

  async deleteEncuesta(id: number) {
    try {
      const resp = await firstValueFrom(this.delete<EncuestaSingleResponse>(`${this.base}/${id}`));
      if (resp.body?.success) { this.toastr.success(resp.body.message || 'Encuesta eliminada', 'Éxito'); return resp.body; }
      return null;
    } catch (error: any) {
      this.toastr.error(error?.error?.message || '', 'Error al eliminar encuesta');
      return null;
    }
  }
}
