import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpService } from '../HttpService';
import { CatalogosResponse, CatalogoResponse, ICatalogo } from '../../interfaces/catalogo';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

@Injectable({
  providedIn: 'root'
})
export class CatalogoService extends HttpService {

  private readonly endpoints = {
    catalogo: '/flujo-fondos/catalogos',
  };

  constructor(http: HttpClient, private toastr: ToastrService) {
    super(http);
  }

  async getCatalogos({ page = 1, limit = 10, search = '', all = false, tipo = '' } = {}) {
    try {
      let params: any = {
        page,
        limit,
        search
      }
      if (all) {
        params = {...params, all: all};
      }
      if (tipo) {
        params = {...params, tipo: tipo};
      }
      const resp = await firstValueFrom(this.get<CatalogosResponse>(`${this.endpoints.catalogo}`, params));
      if (resp.body?.success) {
        return resp.body;
      }

      return null;
    } catch (error: any) {
      console.log("🚀 ~ CatalogoService ~ getCatalogos ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error en catálogos');
      return null;
    }
  }

  async getCatalogoById(id: string) {
    try {
      const resp = await firstValueFrom(this.get<CatalogoResponse>(`${this.endpoints.catalogo}/${id}`));
      if (resp.body?.success) {
        return resp.body;
      }

      return null;
    } catch (error: any) {
      console.log("🚀 ~ CatalogoService ~ getCatalogoById ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error al obtener catálogo');
      return null;
    }
  }

  async updateCatalogo(catalogoUpdate: ICatalogo) {
    try {
      const { updated_at, deleted_at, created_at, ...data } = catalogoUpdate;
      const resp = await firstValueFrom(this.put<CatalogoResponse>(`${this.endpoints.catalogo}`, data));
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Success');
        return resp.body;
      }

      return null;
    } catch (error: any) {
      console.log("🚀 ~ CatalogoService ~ updateCatalogo ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error al actualizar catálogo');
      return null;
    }
  }

  async createCatalogo(createCatalogo: ICatalogo) {
    try {
      const { catalogoId, created_at, updated_at, deleted_at, ...data } = createCatalogo;
      const resp = await firstValueFrom(this.post<CatalogoResponse>(`${this.endpoints.catalogo}`, data));
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Success');
        return resp.body;
      }

      return null;
    } catch (error: any) {
      console.log("🚀 ~ CatalogoService ~ createCatalogo ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error al crear catálogo');
      return null;
    }
  }

  async deleteCatalogo(catalogoDelete: ICatalogo) {
    try {
      const resp = await firstValueFrom(this.delete<CatalogoResponse>(`${this.endpoints.catalogo}/${catalogoDelete.catalogoId}`, {}));
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Success');
        return resp.body;
      }

      return null;
    } catch (error: any) {
      console.log("🚀 ~ CatalogoService ~ deleteCatalogo ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error al eliminar catálogo');
      return null;
    }
  }
}
