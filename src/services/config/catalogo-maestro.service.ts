import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { HttpService } from '../HttpService';
import {
  ICatalogo,
  CatalogoResponse,
  CatalogoSingleResponse,
} from '../../interfaces/catalogo-maestro/catalogo-maestro';

@Injectable({
  providedIn: 'root',
})
export class CatalogoService extends HttpService {
  private readonly endpoint = '/onesiteex/catalogo';

  constructor(http: HttpClient, private toastr: ToastrService) {
    super(http);
  }

  async getCatalogos({
    page = 1,
    limit = 10,
    search = '',
    activo,
    all = false,
  }: { page?: number; limit?: number; search?: string; activo?: boolean; all?: boolean } = {}) {
    try {
      const params: any = { page, limit };
      if (search) params['search'] = search;
      if (activo !== undefined) params['activo'] = activo;
      if (all) params['all'] = all;

      const resp = await firstValueFrom(
        this.get<CatalogoResponse>(this.endpoint, params)
      );
      return resp.body?.success ? resp.body : null;
    } catch (error: any) {
      console.error('Error en getCatalogos:', error);
      this.toastr.error(error?.error?.message || '', 'Error en catálogos');
      return null;
    }
  }

  async getCatalogoById(id: string) {
    try {
      const resp = await firstValueFrom(
        this.get<CatalogoSingleResponse>(`${this.endpoint}/${id}`)
      );
      return resp.body?.success ? resp.body : null;
    } catch (error: any) {
      console.error('Error en getCatalogoById:', error);
      this.toastr.error(error?.error?.message || '', 'Error en catálogos');
      return null;
    }
  }

  async createCatalogo(catalogo: Pick<ICatalogo, 'nombre' | 'codigo' | 'activo'>) {
    try {
      const { nombre, codigo, activo } = catalogo;
      const resp = await firstValueFrom(
        this.post<CatalogoSingleResponse>(this.endpoint, { nombre, codigo, activo })
      );
      if (resp.body?.success) {
        this.toastr.success(resp.body.message || 'Catálogo creado', 'Éxito');
        return resp.body;
      }
      return null;
    } catch (error: any) {
      console.error('Error en createCatalogo:', error);
      this.toastr.error(error?.error?.message || '', 'Error al crear catálogo');
      return null;
    }
  }

  async updateCatalogo(catalogo: ICatalogo) {
    try {
      const { id, nombre, codigo, activo } = catalogo;
      const resp = await firstValueFrom(
        this.put<CatalogoSingleResponse>(this.endpoint, { id, nombre, codigo, activo })
      );
      if (resp.body?.success) {
        this.toastr.success(resp.body.message || 'Catálogo actualizado', 'Éxito');
        return resp.body;
      }
      return null;
    } catch (error: any) {
      console.error('Error en updateCatalogo:', error);
      this.toastr.error(error?.error?.message || '', 'Error al actualizar catálogo');
      return null;
    }
  }

  async deleteCatalogo(id: string) {
    try {
      const resp = await firstValueFrom(
        this.delete<CatalogoSingleResponse>(`${this.endpoint}/${id}`)
      );
      if (resp.body?.success) {
        this.toastr.success(resp.body.message || 'Catálogo eliminado', 'Éxito');
        return resp.body;
      }
      return null;
    } catch (error: any) {
      console.error('Error en deleteCatalogo:', error);
      this.toastr.error(error?.error?.message || '', 'Error al eliminar catálogo');
      return null;
    }
  }

  async bulkImport(items: { codigoCatalogo: string; nombreCatalogo: string; codigo: string; opcion: string; orden: number; catalogoPadre?: string; opcionPadre?: string }[]) {
    try {
      const resp = await firstValueFrom(
        this.post<{ success: boolean; message: string; data: { nuevos: number; duplicados: number; total: number } }>(
          '/onesiteex/catalogo-opcion/cargar-excel',
          { items }
        )
      );
      return resp.body?.success ? resp.body : null;
    } catch (error: any) {
      console.error('Error en bulkImport:', error);
      this.toastr.error(error?.error?.message || '', 'Error en importación');
      return null;
    }
  }
}


