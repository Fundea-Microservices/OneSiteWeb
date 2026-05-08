import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { HttpService } from '../HttpService';
import {
  IPregunta,
  PreguntaListResponse,
  PreguntaSingleResponse,
} from '../../interfaces/encuesta/encuesta';

@Injectable({ providedIn: 'root' })
export class PreguntaService extends HttpService {
  private readonly base = '/onesiteex/encuestas/pregunta';

  constructor(http: HttpClient, private toastr: ToastrService) {
    super(http);
  }

  async getPreguntas({ page = 1, limit = 10, search = '', idSeccion, all }: { page?: number; limit?: number; search?: string; idSeccion?: number; all?: boolean } = {}) {
    try {
      const params: any = { page, limit };
      if (search) params['search'] = search;
      if (idSeccion != null) params['idSeccion'] = idSeccion;
      if (all) params['all'] = all;
      const resp = await firstValueFrom(this.get<PreguntaListResponse>(this.base, params));
      return resp.body?.success ? resp.body : null;
    } catch (error: any) {
      this.toastr.error(error?.error?.message || '', 'Error en preguntas');
      return null;
    }
  }

  async getPreguntaById(id: number) {
    try {
      const resp = await firstValueFrom(this.get<PreguntaSingleResponse>(`${this.base}/${id}`));
      return resp.body?.success ? resp.body : null;
    } catch (error: any) {
      this.toastr.error(error?.error?.message || '', 'Error en preguntas');
      return null;
    }
  }

  async createPregunta(pregunta: IPregunta) {
    try {
      const { fechaModificacion, fechaCreacion, ...body } = pregunta;
      const resp = await firstValueFrom(this.post<PreguntaSingleResponse>(this.base, body));
      if (resp.body?.success) { this.toastr.success(resp.body.message || 'Pregunta creada', 'Éxito'); return resp.body; }
      return null;
    } catch (error: any) {
      this.toastr.error(error?.error?.message || '', 'Error al crear pregunta');
      return null;
    }
  }

  async updatePregunta(pregunta: IPregunta) {
    try {
      const { fechaModificacion, fechaCreacion, ...body } = pregunta;
      const resp = await firstValueFrom(this.put<PreguntaSingleResponse>(this.base, body));
      if (resp.body?.success) { this.toastr.success(resp.body.message || 'Pregunta actualizada', 'Éxito'); return resp.body; }
      return null;
    } catch (error: any) {
      this.toastr.error(error?.error?.message || '', 'Error al actualizar pregunta');
      return null;
    }
  }

  async deletePregunta(id: number) {
    try {
      const resp = await firstValueFrom(this.delete<PreguntaSingleResponse>(`${this.base}/${id}`));
      if (resp.body?.success) { this.toastr.success(resp.body.message || 'Pregunta eliminada', 'Éxito'); return resp.body; }
      return null;
    } catch (error: any) {
      this.toastr.error(error?.error?.message || '', 'Error al eliminar pregunta');
      return null;
    }
  }
}
