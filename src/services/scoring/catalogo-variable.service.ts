import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { HttpService } from '../HttpService';
import {
  ICatalogoVariable,
  IOpcionVariable,
  RespuestaScoring,
} from '../../interfaces/scoring/scoring';

/** Pantalla 2: Catálogo de Variables (tabla 1: catálogos, tabla 2: opciones). */
@Injectable({ providedIn: 'root' })
export class CatalogoVariableService extends HttpService {
  private readonly base = '/scoring/catalogo';

  constructor(http: HttpClient, private toastr: ToastrService) {
    super(http);
  }

  private error(error: any, contexto: string): null {
    this.toastr.error(error?.error?.message || '', contexto);
    return null;
  }

  private exito<T>(respuesta: RespuestaScoring<T> | null | undefined) {
    if (!respuesta?.success) return null;
    this.toastr.success(respuesta.message, 'Éxito');
    return respuesta;
  }

  // ── Catálogos ───────────────────────────────────────────────────────────

  /** scoringId es obligatorio: la pantalla exige elegir scoring antes de listar. */
  async getCatalogos({
    scoringId,
    busqueda = '',
    estado,
  }: {
    scoringId: number;
    busqueda?: string;
    estado?: string;
  }) {
    try {
      const params: any = { scoringId };
      if (busqueda) params['busqueda'] = busqueda;
      if (estado) params['estado'] = estado;

      const resp = await firstValueFrom(
        this.get<ICatalogoVariable[]>(this.base, params),
      );
      return resp.body ?? [];
    } catch (error: any) {
      this.error(error, 'Error al listar catálogos');
      return [];
    }
  }

  async getCatalogoById(catalogoId: number) {
    try {
      const resp = await firstValueFrom(
        this.get<ICatalogoVariable>(`${this.base}/${catalogoId}`),
      );
      return resp.body ?? null;
    } catch (error: any) {
      return this.error(error, 'Error al consultar el catálogo');
    }
  }

  async createCatalogo(catalogo: ICatalogoVariable) {
    try {
      const { catalogoId, opciones, ...body } = catalogo;
      const resp = await firstValueFrom(
        this.post<RespuestaScoring<ICatalogoVariable>>(this.base, body),
      );
      return this.exito(resp.body);
    } catch (error: any) {
      return this.error(error, 'Error al crear el catálogo');
    }
  }

  async updateCatalogo(catalogo: ICatalogoVariable) {
    try {
      const { catalogoId, opciones, ...body } = catalogo;
      const resp = await firstValueFrom(
        this.put<RespuestaScoring<ICatalogoVariable>>(
          `${this.base}/${catalogoId}`,
          body,
        ),
      );
      return this.exito(resp.body);
    } catch (error: any) {
      return this.error(error, 'Error al actualizar el catálogo');
    }
  }

  /** Inactiva. Falla si alguna pregunta lo usa como catálogo de respuestas. */
  async inactivarCatalogo(catalogoId: number) {
    try {
      const resp = await firstValueFrom(
        this.delete<RespuestaScoring<unknown>>(`${this.base}/${catalogoId}`),
      );
      return this.exito(resp.body);
    } catch (error: any) {
      return this.error(error, 'Error al inactivar el catálogo');
    }
  }

  async reordenarCatalogos(ids: number[]) {
    try {
      const resp = await firstValueFrom(
        this.patch<RespuestaScoring<{ reordenados: number }>>(
          `${this.base}/orden/aplicar`,
          { ids },
        ),
      );
      return resp.body?.success ? resp.body : null;
    } catch (error: any) {
      return this.error(error, 'Error al reordenar catálogos');
    }
  }

  // ── Opciones ────────────────────────────────────────────────────────────

  async getOpciones(catalogoId: number, estado?: string) {
    try {
      const params: any = {};
      if (estado) params['estado'] = estado;

      const resp = await firstValueFrom(
        this.get<IOpcionVariable[]>(`${this.base}/${catalogoId}/opcion`, params),
      );
      return resp.body ?? [];
    } catch (error: any) {
      this.error(error, 'Error al listar opciones');
      return [];
    }
  }

  async createOpcion(opcion: IOpcionVariable) {
    try {
      const { opcionId, ...body } = opcion;
      const resp = await firstValueFrom(
        this.post<RespuestaScoring<IOpcionVariable>>(
          `${this.base}/opcion`,
          body,
        ),
      );
      return this.exito(resp.body);
    } catch (error: any) {
      return this.error(error, 'Error al crear la opción');
    }
  }

  async updateOpcion(opcion: IOpcionVariable) {
    try {
      const { opcionId, ...body } = opcion;
      const resp = await firstValueFrom(
        this.put<RespuestaScoring<IOpcionVariable>>(
          `${this.base}/opcion/${opcionId}`,
          body,
        ),
      );
      return this.exito(resp.body);
    } catch (error: any) {
      return this.error(error, 'Error al actualizar la opción');
    }
  }

  async inactivarOpcion(opcionId: number) {
    try {
      const resp = await firstValueFrom(
        this.delete<RespuestaScoring<unknown>>(`${this.base}/opcion/${opcionId}`),
      );
      return this.exito(resp.body);
    } catch (error: any) {
      return this.error(error, 'Error al inactivar la opción');
    }
  }

  async reordenarOpciones(ids: number[]) {
    try {
      const resp = await firstValueFrom(
        this.patch<RespuestaScoring<{ reordenados: number }>>(
          `${this.base}/opcion/orden/aplicar`,
          { ids },
        ),
      );
      return resp.body?.success ? resp.body : null;
    } catch (error: any) {
      return this.error(error, 'Error al reordenar opciones');
    }
  }
}
