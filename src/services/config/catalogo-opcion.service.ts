import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { HttpService } from '../HttpService';
import {
  ICatalogoOpcion,
  CatalogoOpcionResponse,
  CatalogoOpcionSingleResponse,
} from '../../interfaces/catalogo-maestro/catalogo-maestro';

@Injectable({
  providedIn: 'root',
})
export class CatalogoOpcionService extends HttpService {
  private readonly endpoint = '/onesiteex/catalogo-opcion';

  constructor(http: HttpClient, private toastr: ToastrService) {
    super(http);
  }

  async getOpciones({
    page = 1,
    limit = 10,
    search = '',
    idCatalogo,
    activo,
    all = false,
  }: {
    page?: number;
    limit?: number;
    search?: string;
    idCatalogo?: string;
    activo?: boolean;
    all?: boolean;
  } = {}) {
    try {
      const params: any = { page, limit };
      if (search) params['search'] = search;
      if (idCatalogo) params['idCatalogo'] = idCatalogo;
      if (activo !== undefined) params['activo'] = activo;
      if (all) params['all'] = all;

      const resp = await firstValueFrom(
        this.get<CatalogoOpcionResponse>(this.endpoint, params)
      );
      return resp.body?.success ? resp.body : null;
    } catch (error: any) {
      console.error('Error en getOpciones:', error);
      this.toastr.error(error?.error?.message || '', 'Error en opciones de catálogo');
      return null;
    }
  }

  async getOpcionById(id: string) {
    try {
      const resp = await firstValueFrom(
        this.get<CatalogoOpcionSingleResponse>(`${this.endpoint}/${id}`)
      );
      return resp.body?.success ? resp.body : null;
    } catch (error: any) {
      console.error('Error en getOpcionById:', error);
      this.toastr.error(error?.error?.message || '', 'Error en opciones de catálogo');
      return null;
    }
  }

  async createOpcion(opcion: Omit<ICatalogoOpcion, 'id' | 'createdAt' | 'updatedAt'>) {
    try {
      const { idCatalogo, nombre, codigo, orden, activo, porDefecto, idPadre } = opcion;
      const body: any = { idCatalogo, nombre, codigo, activo, porDefecto };
      if (orden !== undefined) body['orden'] = orden;
      if (idPadre) body['idPadre'] = idPadre;
      const resp = await firstValueFrom(
        this.post<CatalogoOpcionSingleResponse>(this.endpoint, body)
      );
      if (resp.body?.success) {
        this.toastr.success(resp.body.message || 'Opción creada', 'Éxito');
        return resp.body;
      }
      return null;
    } catch (error: any) {
      console.error('Error en createOpcion:', error);
      this.toastr.error(error?.error?.message || '', 'Error al crear opción');
      return null;
    }
  }

  async updateOpcion(opcion: ICatalogoOpcion) {
    try {
      const { id, idCatalogo, nombre, codigo, orden, activo, porDefecto, idPadre } = opcion;
      const body: any = { id, idCatalogo, nombre, codigo, activo, porDefecto };
      if (orden !== undefined) body['orden'] = orden;
      if (idPadre) body['idPadre'] = idPadre;
      const resp = await firstValueFrom(
        this.put<CatalogoOpcionSingleResponse>(this.endpoint, body)
      );
      if (resp.body?.success) {
        this.toastr.success(resp.body.message || 'Opción actualizada', 'Éxito');
        return resp.body;
      }
      return null;
    } catch (error: any) {
      console.error('Error en updateOpcion:', error);
      this.toastr.error(error?.error?.message || '', 'Error al actualizar opción');
      return null;
    }
  }

  async deleteOpcion(id: string) {
    try {
      const resp = await firstValueFrom(
        this.delete<CatalogoOpcionSingleResponse>(`${this.endpoint}/${id}`)
      );
      if (resp.body?.success) {
        this.toastr.success(resp.body.message || 'Opción eliminada', 'Éxito');
        return resp.body;
      }
      return null;
    } catch (error: any) {
      console.error('Error en deleteOpcion:', error);
      this.toastr.error(error?.error?.message || '', 'Error al eliminar opción');
      return null;
    }
  }
}
