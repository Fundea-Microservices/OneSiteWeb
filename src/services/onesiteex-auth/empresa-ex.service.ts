import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { HttpService } from '../HttpService';
import {
  AuthExListResponse,
  AuthExSingleResponse,
  IEmpresaEx,
  IEmpresaExFilters,
  IEmpresaExUpsert,
} from '../../interfaces/onesiteex-auth/onesiteex-auth';

@Injectable({ providedIn: 'root' })
export class EmpresaExService extends HttpService {
  private readonly base = '/onesiteex/auth/empresa';

  constructor(http: HttpClient, private toastr: ToastrService) {
    super(http);
  }

  async getEmpresas({ page = 1, limit = 10, search = '', estado, all }: IEmpresaExFilters = {}) {
    try {
      const params: any = all ? { all: true } : { page, limit };
      if (search) params['search'] = search;
      if (estado !== undefined) params['estado'] = estado;
      const resp = await firstValueFrom(this.get<AuthExListResponse<IEmpresaEx>>(this.base, params));
      return resp.body?.success ? resp.body : null;
    } catch (error: any) {
      this.toastr.error(error?.error?.message || '', 'Error al obtener empresas');
      return null;
    }
  }

  async getEmpresaById(id: number) {
    try {
      const resp = await firstValueFrom(this.get<AuthExSingleResponse<IEmpresaEx>>(`${this.base}/${id}`));
      return resp.body?.success ? resp.body : null;
    } catch (error: any) {
      this.toastr.error(error?.error?.message || '', 'Error al obtener empresa');
      return null;
    }
  }

  async createEmpresa(empresa: IEmpresaExUpsert) {
    try {
      const body: any = {
        nombreEmpresa: empresa.nombreEmpresa,
        codigoEnrolamiento: empresa.codigoEnrolamiento,
      };
      if (empresa.codigo != null && empresa.codigo !== '') body['codigo'] = empresa.codigo;
      if (empresa.estado !== undefined) body['estado'] = empresa.estado;
      const resp = await firstValueFrom(this.post<AuthExSingleResponse<IEmpresaEx>>(this.base, body));
      if (resp.body?.success) { this.toastr.success(resp.body.message || 'Empresa creada', 'Éxito'); return resp.body; }
      return null;
    } catch (error: any) {
      this.toastr.error(error?.error?.message || '', 'Error al crear empresa');
      return null;
    }
  }

  /**
   * El idEmpresa va en el body, no en la URL.
   * El backend usa forbidNonWhitelisted: se arma el payload solo con campos editables.
   */
  async updateEmpresa(empresa: IEmpresaExUpsert) {
    try {
      const body: any = { idEmpresa: Number(empresa.idEmpresa) };
      if (empresa.nombreEmpresa) body['nombreEmpresa'] = empresa.nombreEmpresa;
      if (empresa.codigoEnrolamiento) body['codigoEnrolamiento'] = empresa.codigoEnrolamiento;
      if (empresa.codigo !== undefined) body['codigo'] = empresa.codigo || null;
      if (empresa.estado !== undefined) body['estado'] = empresa.estado;
      const resp = await firstValueFrom(this.put<AuthExSingleResponse<IEmpresaEx>>(this.base, body));
      if (resp.body?.success) { this.toastr.success(resp.body.message || 'Empresa actualizada', 'Éxito'); return resp.body; }
      return null;
    } catch (error: any) {
      this.toastr.error(error?.error?.message || '', 'Error al actualizar empresa');
      return null;
    }
  }

  /** Baja lógica: deja estado = false, no borra el registro. */
  async deleteEmpresa(id: number) {
    try {
      const resp = await firstValueFrom(
        this.delete<AuthExSingleResponse<{ idEmpresa: number }>>(`${this.base}/${id}`)
      );
      if (resp.body?.success) { this.toastr.success(resp.body.message || 'Empresa dada de baja', 'Éxito'); return resp.body; }
      return null;
    } catch (error: any) {
      this.toastr.error(error?.error?.message || '', 'Error al dar de baja la empresa');
      return null;
    }
  }
}
