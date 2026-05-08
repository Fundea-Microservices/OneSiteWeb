import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { HttpService } from '../HttpService';
import {
  ISeccion,
  SeccionListResponse,
  SeccionSingleResponse,
} from '../../interfaces/encuesta/encuesta';

@Injectable({ providedIn: 'root' })
export class SeccionService extends HttpService {
  private readonly base = '/onesiteex/encuestas/seccion';

  constructor(http: HttpClient, private toastr: ToastrService) {
    super(http);
  }

  async getSecciones({ page = 1, limit = 10, search = '', idEncuesta, all }: { page?: number; limit?: number; search?: string; idEncuesta?: number; all?: boolean } = {}) {
    try {
      const params: any = { page, limit };
      if (search) params['search'] = search;
      if (idEncuesta != null) params['idEncuesta'] = idEncuesta;
      if (all) params['all'] = all;
      const resp = await firstValueFrom(this.get<SeccionListResponse>(this.base, params));
      return resp.body?.success ? resp.body : null;
    } catch (error: any) {
      this.toastr.error(error?.error?.message || '', 'Error en secciones');
      return null;
    }
  }

  async getSeccionById(id: number) {
    try {
      const resp = await firstValueFrom(this.get<SeccionSingleResponse>(`${this.base}/${id}`));
      return resp.body?.success ? resp.body : null;
    } catch (error: any) {
      this.toastr.error(error?.error?.message || '', 'Error en secciones');
      return null;
    }
  }

  async createSeccion(seccion: ISeccion) {
    try {
      const { fechaModificacion, fechaCreacion, ...body } = seccion;
      const resp = await firstValueFrom(this.post<SeccionSingleResponse>(this.base, body));
      if (resp.body?.success) { this.toastr.success(resp.body.message || 'Sección creada', 'Éxito'); return resp.body; }
      return null;
    } catch (error: any) {
      this.toastr.error(error?.error?.message || '', 'Error al crear sección');
      return null;
    }
  }

  async updateSeccion(seccion: ISeccion) {
    try {
      const { fechaModificacion, fechaCreacion, ...body } = seccion;
      const resp = await firstValueFrom(this.put<SeccionSingleResponse>(this.base, body));
      if (resp.body?.success) { this.toastr.success(resp.body.message || 'Sección actualizada', 'Éxito'); return resp.body; }
      return null;
    } catch (error: any) {
      this.toastr.error(error?.error?.message || '', 'Error al actualizar sección');
      return null;
    }
  }

  async deleteSeccion(id: number) {
    try {
      const resp = await firstValueFrom(this.delete<SeccionSingleResponse>(`${this.base}/${id}`));
      if (resp.body?.success) { this.toastr.success(resp.body.message || 'Sección eliminada', 'Éxito'); return resp.body; }
      return null;
    } catch (error: any) {
      this.toastr.error(error?.error?.message || '', 'Error al eliminar sección');
      return null;
    }
  }
}
