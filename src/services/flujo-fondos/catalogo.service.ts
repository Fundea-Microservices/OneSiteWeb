import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpService } from '../HttpService';
import {
  CatalogosResponse,
  CatalogoResponse,
  CatalogoSelectResponse,
  ICatalogo,
  ICatalogoCreate,
  ICatalogoOpcion,
  ICatalogoSelect,
  ICatalogoUpdate,
  IOpcionCreate,
  IOpcionUpdate,
  OpcionesResponse,
  OpcionResponse,
} from '../../interfaces/catalogo';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

export interface CatalogosFiltro {
  page?: number;
  limit?: number;
  search?: string;
  active?: boolean;
  all?: boolean;
}

export interface OpcionesFiltro extends CatalogosFiltro {
  catalogoId: string;
  parentId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CatalogoService extends HttpService {

  private readonly endpoints = {
    catalogo: '/flujo-fondos/catalogos',
    opciones: '/flujo-fondos/catalogos/opciones',
    select: '/flujo-fondos/catalogos/select',
  };

  // Los catálogos cambian poco: los selects se cachean por código + padre + inactivos
  private readonly selectCache = new Map<string, Promise<ICatalogoSelect | null>>();

  constructor(http: HttpClient, private toastr: ToastrService) {
    super(http);
  }

  /** Arma los query params omitiendo los vacíos (el microservicio rechaza parámetros no reconocidos). */
  private buildParams(filtro: { [key: string]: any }) {
    const params: { [key: string]: any } = {};
    Object.entries(filtro).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params[key] = value;
      }
    });
    return params;
  }

  // ---------- Catálogos ----------

  async getCatalogos({ page = 1, limit = 10, search, active, all }: CatalogosFiltro = {}) {
    try {
      const params = this.buildParams({ page, limit, search, active, all: all || undefined });
      const resp = await firstValueFrom(this.get<CatalogosResponse>(this.endpoints.catalogo, params));
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

  async getCatalogoById(id: string): Promise<ICatalogo | null> {
    try {
      const resp = await firstValueFrom(this.get<CatalogoResponse>(`${this.endpoints.catalogo}/${id}`));
      if (resp.body?.success) {
        return this.extraerEntidad<ICatalogo>(resp.body.data, 'catalogo');
      }

      return null;
    } catch (error: any) {
      console.log("🚀 ~ CatalogoService ~ getCatalogoById ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error al obtener catálogo');
      return null;
    }
  }

  /** Los códigos se envían siempre en mayúsculas. */
  private normalizarCatalogo<T extends Partial<ICatalogoCreate>>(catalogo: T): T {
    const normalizado = { ...catalogo };
    if (normalizado.codigo) normalizado.codigo = normalizado.codigo.trim().toUpperCase();
    if (normalizado.codigoExterno) normalizado.codigoExterno = normalizado.codigoExterno.trim().toUpperCase();
    return normalizado;
  }

  private normalizarOpcion<T extends Partial<IOpcionCreate>>(opcion: T): T {
    const normalizado = { ...opcion };
    if (normalizado.codigo) normalizado.codigo = normalizado.codigo.trim().toUpperCase();
    return normalizado;
  }

  /** El POST/GET por id puede traer la entidad directa o envuelta ({ catalogo } / { opcion }). */
  private extraerEntidad<T>(data: any, key: string): T {
    return (data?.[key] ?? data) as T;
  }

  async createCatalogo(catalogo: ICatalogoCreate) {
    try {
      const resp = await firstValueFrom(this.post<CatalogoResponse>(this.endpoints.catalogo, this.normalizarCatalogo(catalogo)));
      if (resp.body?.success) {
        this.selectCache.clear();
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

  async updateCatalogo(catalogo: ICatalogoUpdate) {
    try {
      const resp = await firstValueFrom(this.put<CatalogoResponse>(this.endpoints.catalogo, this.normalizarCatalogo(catalogo)));
      if (resp.body?.success) {
        this.selectCache.clear();
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

  /** El DELETE desactiva el catálogo (activo = false), no lo borra. */
  async desactivarCatalogo(id: string) {
    try {
      const resp = await firstValueFrom(this.delete<CatalogoResponse>(`${this.endpoints.catalogo}/${id}`));
      if (resp.body?.success) {
        this.selectCache.clear();
        this.toastr.success(resp.body.message, 'Success');
        return resp.body;
      }

      return null;
    } catch (error: any) {
      console.log("🚀 ~ CatalogoService ~ desactivarCatalogo ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error al desactivar catálogo');
      return null;
    }
  }

  // ---------- Opciones ----------

  async getOpciones({ catalogoId, parentId, page = 1, limit = 10, search, active, all }: OpcionesFiltro) {
    try {
      const params = this.buildParams({ catalogoId, parentId, page, limit, search, active, all: all || undefined });
      const resp = await firstValueFrom(this.get<OpcionesResponse>(this.endpoints.opciones, params));
      if (resp.body?.success) {
        return resp.body;
      }

      return null;
    } catch (error: any) {
      console.log("🚀 ~ CatalogoService ~ getOpciones ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error en opciones de catálogo');
      return null;
    }
  }

  async getOpcionById(id: string): Promise<ICatalogoOpcion | null> {
    try {
      const resp = await firstValueFrom(this.get<OpcionResponse>(`${this.endpoints.opciones}/${id}`));
      if (resp.body?.success) {
        return this.extraerEntidad<ICatalogoOpcion>(resp.body.data, 'opcion');
      }

      return null;
    } catch (error: any) {
      console.log("🚀 ~ CatalogoService ~ getOpcionById ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error al obtener opción');
      return null;
    }
  }

  async createOpcion(opcion: IOpcionCreate) {
    try {
      const resp = await firstValueFrom(this.post<OpcionResponse>(this.endpoints.opciones, this.normalizarOpcion(opcion)));
      if (resp.body?.success) {
        this.selectCache.clear();
        this.toastr.success(resp.body.message, 'Success');
        return resp.body;
      }

      return null;
    } catch (error: any) {
      console.log("🚀 ~ CatalogoService ~ createOpcion ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error al crear opción');
      return null;
    }
  }

  async updateOpcion(opcion: IOpcionUpdate) {
    try {
      const resp = await firstValueFrom(this.put<OpcionResponse>(this.endpoints.opciones, this.normalizarOpcion(opcion)));
      if (resp.body?.success) {
        this.selectCache.clear();
        this.toastr.success(resp.body.message, 'Success');
        return resp.body;
      }

      return null;
    } catch (error: any) {
      console.log("🚀 ~ CatalogoService ~ updateOpcion ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error al actualizar opción');
      return null;
    }
  }

  /** Guarda el nuevo `orden` de varias opciones (arrastrar y soltar). Sin toast de éxito por opción. */
  async actualizarOrdenOpciones(cambios: { id: string; orden: number }[]) {
    try {
      await Promise.all(cambios.map(cambio => firstValueFrom(this.put<OpcionResponse>(this.endpoints.opciones, cambio))));
      return true;
    } catch (error: any) {
      console.log("🚀 ~ CatalogoService ~ actualizarOrdenOpciones ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error al actualizar el orden');
      return false;
    } finally {
      this.selectCache.clear();
    }
  }

  /** El DELETE desactiva la opción (activo = false), no la borra. */
  async desactivarOpcion(id: string) {
    try {
      const resp = await firstValueFrom(this.delete<OpcionResponse>(`${this.endpoints.opciones}/${id}`));
      if (resp.body?.success) {
        this.selectCache.clear();
        this.toastr.success(resp.body.message, 'Success');
        return resp.body;
      }

      return null;
    } catch (error: any) {
      console.log("🚀 ~ CatalogoService ~ desactivarOpcion ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error al desactivar opción');
      return null;
    }
  }

  // ---------- Importación masiva ----------
  // Sin toasts por registro: lanzan el mensaje del backend para que la importación lo reporte por fila.

  async crearCatalogoImportacion(catalogo: ICatalogoCreate): Promise<ICatalogo> {
    try {
      const resp = await firstValueFrom(this.post<CatalogoResponse>(this.endpoints.catalogo, this.normalizarCatalogo(catalogo)));
      if (!resp.body?.success) throw new Error(resp.body?.message || 'No se pudo crear el catálogo');
      this.selectCache.clear();
      return this.extraerEntidad<ICatalogo>(resp.body.data, 'catalogo');
    } catch (error: any) {
      throw new Error(error?.error?.message || error?.message || 'No se pudo crear el catálogo');
    }
  }

  async crearOpcionImportacion(opcion: IOpcionCreate): Promise<ICatalogoOpcion> {
    try {
      const resp = await firstValueFrom(this.post<OpcionResponse>(this.endpoints.opciones, this.normalizarOpcion(opcion)));
      if (!resp.body?.success) throw new Error(resp.body?.message || 'No se pudo crear la opción');
      this.selectCache.clear();
      return this.extraerEntidad<ICatalogoOpcion>(resp.body.data, 'opcion');
    } catch (error: any) {
      throw new Error(error?.error?.message || error?.message || 'No se pudo crear la opción');
    }
  }

  // ---------- Select ----------

  /**
   * Opciones para llenar un select. El select guarda `value` (código de la opción), nunca el id.
   * Para un select hijo, `padre` es el código (no el id) de la opción elegida en el select padre.
   * `incluirInactivos` solo para traducir códigos guardados en vistas de detalle, no para captura.
   */
  select(codigo: string, padre?: string | null, incluirInactivos = false): Promise<ICatalogoSelect | null> {
    const key = `${codigo}|${padre ?? ''}|${incluirInactivos}`;
    if (!this.selectCache.has(key)) {
      const params = this.buildParams({ padre, incluirInactivos: incluirInactivos || undefined });
      const request = firstValueFrom(this.get<CatalogoSelectResponse>(`${this.endpoints.select}/${codigo}`, params))
        .then(resp => resp.body?.success ? resp.body.data : null)
        .catch((error: any) => {
          console.log("🚀 ~ CatalogoService ~ select ~ error:", error)
          this.toastr.error(error?.error?.message || '', `Error al cargar ${codigo}`);
          return null;
        })
        .then(data => {
          // No cachear errores para poder reintentar
          if (!data) this.selectCache.delete(key);
          return data;
        });
      this.selectCache.set(key, request);
    }
    return this.selectCache.get(key)!;
  }
}
