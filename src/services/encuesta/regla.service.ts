import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { HttpService } from '../HttpService';
import {
  IRegla,
  ReglaSingleResponse,
} from '../../interfaces/encuesta/encuesta';

@Injectable({ providedIn: 'root' })
export class ReglaService extends HttpService {
  private readonly base = '/onesiteex/encuestas/regla';

  constructor(http: HttpClient, private toastr: ToastrService) {
    super(http);
  }

  async getReglaByPregunta(idPregunta: number) {
    try {
      const resp = await firstValueFrom(this.get<ReglaSingleResponse>(`${this.base}/${idPregunta}`));
      return resp.body?.success ? resp.body : null;
    } catch (error: any) {
      this.toastr.error(error?.error?.message || '', 'Error en reglas');
      return null;
    }
  }

  async createRegla(regla: IRegla) {
    try {
      const { fechaModificacion, fechaCreacion, ...body } = regla as any;
      const resp = await firstValueFrom(this.post<ReglaSingleResponse>(this.base, body));
      if (resp.body?.success) { this.toastr.success(resp.body.message || 'Regla creada', 'Éxito'); return resp.body; }
      return null;
    } catch (error: any) {
      this.toastr.error(error?.error?.message || '', 'Error al crear regla');
      return null;
    }
  }

  async updateRegla(regla: IRegla) {
    try {
      const { fechaModificacion, fechaCreacion, ...body } = regla as any;
      const resp = await firstValueFrom(this.put<ReglaSingleResponse>(this.base, body));
      if (resp.body?.success) { this.toastr.success(resp.body.message || 'Regla actualizada', 'Éxito'); return resp.body; }
      return null;
    } catch (error: any) {
      this.toastr.error(error?.error?.message || '', 'Error al actualizar regla');
      return null;
    }
  }

  async deleteRegla(idPregunta: number) {
    try {
      const resp = await firstValueFrom(this.delete<ReglaSingleResponse>(`${this.base}/${idPregunta}`));
      if (resp.body?.success) { this.toastr.success(resp.body.message || 'Regla eliminada', 'Éxito'); return resp.body; }
      return null;
    } catch (error: any) {
      this.toastr.error(error?.error?.message || '', 'Error al eliminar regla');
      return null;
    }
  }
}
