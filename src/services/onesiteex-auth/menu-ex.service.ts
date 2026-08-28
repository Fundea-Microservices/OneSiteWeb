import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { HttpService } from '../HttpService';
import {
  AuthExListResponse,
  AuthExSingleResponse,
  IMenuEx,
  IMenuExFilters,
  IMenuExUpsert,
} from '../../interfaces/onesiteex-auth/onesiteex-auth';

/**
 * Administra los ítems del drawer data-driven de la app móvil (tabla Cat_Menu_AppEx).
 * NO confundir con el sidebar de OneSiteWeb (services/config/menu.service.ts, /acceso/menu).
 * Endpoints admin asumidos (contrato §5): confirmar contra onesiteapp_ex-ms.
 */
@Injectable({ providedIn: 'root' })
export class MenuExService extends HttpService {
  private readonly base = '/onesiteex/auth/menu';

  constructor(http: HttpClient, private toastr: ToastrService) {
    super(http);
  }

  async getMenus({ page = 1, limit = 10, search = '', idPadre, estado, all }: IMenuExFilters = {}) {
    try {
      const params: any = all ? { all: true } : { page, limit };
      if (search) params['search'] = search;
      if (idPadre) params['idPadre'] = idPadre;
      if (estado !== undefined) params['estado'] = estado;
      const resp = await firstValueFrom(this.get<AuthExListResponse<IMenuEx>>(this.base, params));
      return resp.body?.success ? resp.body : null;
    } catch (error: any) {
      this.toastr.error(error?.error?.message || '', 'Error al obtener menús');
      return null;
    }
  }

  async createMenu(menu: IMenuExUpsert) {
    try {
      const body: any = {
        nombre: menu.nombre,
        rutaPantalla: menu.rutaPantalla,
      };
      if (menu.icono) body['icono'] = menu.icono;
      if (menu.idPermisoRequerido != null) body['idPermisoRequerido'] = Number(menu.idPermisoRequerido);
      if (menu.idPadre != null) body['idPadre'] = Number(menu.idPadre);
      if (menu.orden != null) body['orden'] = Number(menu.orden);
      if (menu.estado !== undefined) body['estado'] = menu.estado;
      const resp = await firstValueFrom(this.post<AuthExSingleResponse<IMenuEx>>(this.base, body));
      if (resp.body?.success) { this.toastr.success(resp.body.message || 'Menú creado', 'Éxito'); return resp.body; }
      return null;
    } catch (error: any) {
      this.toastr.error(error?.error?.message || '', 'Error al crear menú');
      return null;
    }
  }

  /** El idMenu va en el body (patrón forbidNonWhitelisted, como usuarios). */
  async updateMenu(menu: IMenuExUpsert) {
    try {
      const body: any = { idMenu: Number(menu.idMenu) };
      if (menu.nombre) body['nombre'] = menu.nombre;
      if (menu.rutaPantalla) body['rutaPantalla'] = menu.rutaPantalla;
      if (menu.icono !== undefined) body['icono'] = menu.icono;
      if (menu.idPermisoRequerido !== undefined)
        body['idPermisoRequerido'] = menu.idPermisoRequerido == null ? null : Number(menu.idPermisoRequerido);
      if (menu.idPadre !== undefined)
        body['idPadre'] = menu.idPadre == null ? null : Number(menu.idPadre);
      if (menu.orden !== undefined) body['orden'] = menu.orden == null ? null : Number(menu.orden);
      if (menu.estado !== undefined) body['estado'] = menu.estado;
      const resp = await firstValueFrom(this.put<AuthExSingleResponse<IMenuEx>>(this.base, body));
      if (resp.body?.success) { this.toastr.success(resp.body.message || 'Menú actualizado', 'Éxito'); return resp.body; }
      return null;
    } catch (error: any) {
      this.toastr.error(error?.error?.message || '', 'Error al actualizar menú');
      return null;
    }
  }

  async deleteMenu(id: number) {
    try {
      const resp = await firstValueFrom(
        this.delete<AuthExSingleResponse<{ idMenu: number }>>(`${this.base}/${id}`)
      );
      if (resp.body?.success) { this.toastr.success(resp.body.message || 'Menú eliminado', 'Éxito'); return resp.body; }
      return null;
    } catch (error: any) {
      this.toastr.error(error?.error?.message || '', 'Error al eliminar menú');
      return null;
    }
  }
}
