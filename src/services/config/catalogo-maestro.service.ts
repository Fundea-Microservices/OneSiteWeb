import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { HttpService } from '../HttpService';
import {
  ICatalogoMaestro,
  CatalogoMaestroMetadata,
  CatalogoMaestroResponse,
  CatalogoMaestroSingleResponse,
} from '../../interfaces/catalogo-maestro/catalogo-maestro';

@Injectable({
  providedIn: 'root',
})
export class CatalogoMaestroService extends HttpService {
  private readonly endpoint = '/onesiteex/catalogo-maestro';

  constructor(http: HttpClient, private toastr: ToastrService) {
    super(http);
  }

  async getCatalogos({
    page = 1,
    limit = 10,
    search = '',
    nombreCatalogo = '',
    all = false,
  } = {}) {
    try {
      const params: any = { page, limit };
      if (search) params['search'] = search;
      if (nombreCatalogo) params['nombreCatalogo'] = nombreCatalogo;
      if (all) params['all'] = all;

      const resp = await firstValueFrom(
        this.get<CatalogoMaestroResponse>(this.endpoint, params)
      );
      return resp.body?.success ? resp.body : null;
    } catch (error: any) {
      console.error('Error en getCatalogos:', error);
      this.toastr.error(
        error?.error?.message || '',
        'Error en catálogo maestro'
      );
      return null;
    }
  }

  async getCatalogoById(id: number) {
    try {
      const resp = await firstValueFrom(
        this.get<CatalogoMaestroSingleResponse>(`${this.endpoint}/${id}`)
      );
      return resp.body?.success ? resp.body : null;
    } catch (error: any) {
      console.error('Error en getCatalogoById:', error);
      this.toastr.error(
        error?.error?.message || '',
        'Error en catálogo maestro'
      );
      return null;
    }
  }

  async createCatalogo(catalogo: ICatalogoMaestro) {
    try {
      const { nombreCatalogo, codigoOpcion, valorOpcion, idPadreOpcion } =
        catalogo;
      const body: any = { nombreCatalogo, codigoOpcion, valorOpcion };
      if (idPadreOpcion) body['idPadreOpcion'] = idPadreOpcion;

      const resp = await firstValueFrom(
        this.post<CatalogoMaestroSingleResponse>(this.endpoint, body)
      );
      if (resp.body?.success) {
        this.toastr.success(resp.body.message || 'Catálogo creado', 'Éxito');
        return resp.body;
      }
      return null;
    } catch (error: any) {
      console.error('Error en createCatalogo:', error);
      this.toastr.error(
        error?.error?.message || '',
        'Error al crear catálogo'
      );
      return null;
    }
  }

  async updateCatalogo(catalogo: ICatalogoMaestro) {
    try {
      const resp = await firstValueFrom(
        this.put<CatalogoMaestroSingleResponse>(this.endpoint, catalogo)
      );
      if (resp.body?.success) {
        this.toastr.success(
          resp.body.message || 'Catálogo actualizado',
          'Éxito'
        );
        return resp.body;
      }
      return null;
    } catch (error: any) {
      console.error('Error en updateCatalogo:', error);
      this.toastr.error(
        error?.error?.message || '',
        'Error al actualizar catálogo'
      );
      return null;
    }
  }

  async deleteCatalogo(id: number) {
    try {
      const resp = await firstValueFrom(
        this.delete<CatalogoMaestroSingleResponse>(`${this.endpoint}/${id}`)
      );
      if (resp.body?.success) {
        this.toastr.success(
          resp.body.message || 'Catálogo eliminado',
          'Éxito'
        );
        return resp.body;
      }
      return null;
    } catch (error: any) {
      console.error('Error en deleteCatalogo:', error);
      this.toastr.error(
        error?.error?.message || '',
        'Error al eliminar catálogo'
      );
      return null;
    }
  }
}
