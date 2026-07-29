import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { HttpService } from '../HttpService';
import {
  AuthExListResponse,
  IEmpresaEx,
  IEmpresaExFilters,
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
}
