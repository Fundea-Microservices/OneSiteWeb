import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { HttpService } from '../HttpService';
import {
  AuthExListResponse,
  IRolEx,
  IRolExFilters,
  IRolExPermisos,
} from '../../interfaces/onesiteex-auth/onesiteex-auth';

@Injectable({ providedIn: 'root' })
export class RolExService extends HttpService {
  private readonly base = '/onesiteex/auth/rol';

  constructor(http: HttpClient, private toastr: ToastrService) {
    super(http);
  }

  /** No existe filtro estado: la tabla Roles_Permisos_AppEx no tiene esa columna. */
  async getRoles({ page = 1, limit = 10, search = '', all }: IRolExFilters = {}) {
    try {
      const params: any = all ? { all: true } : { page, limit };
      if (search) params['search'] = search;
      const resp = await firstValueFrom(this.get<AuthExListResponse<IRolEx>>(this.base, params));
      return resp.body?.success ? resp.body : null;
    } catch (error: any) {
      this.toastr.error(error?.error?.message || '', 'Error al obtener roles');
      return null;
    }
  }

  /** permisosJSON llega como string; devuelve {} si viene vacío o mal formado. */
  parsePermisos(rol: IRolEx | null | undefined): IRolExPermisos {
    if (!rol?.permisosJSON) return {};
    try {
      return JSON.parse(rol.permisosJSON) ?? {};
    } catch {
      return {};
    }
  }
}
