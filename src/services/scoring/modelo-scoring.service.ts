import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { HttpService } from '../HttpService';
import {
  IModeloScoring,
  IRangoDictamen,
  ITipoScoring,
  PaginadoScoring,
  RespuestaScoring,
} from '../../interfaces/scoring/scoring';

/**
 * Pantalla 1: Creación de Scoring.
 *
 * Los mensajes de éxito y error salen del backend: traen el código del catálogo
 * de la especificación (OK-SCOR-001, ERR-SCOR-001...) y su texto oficial. El
 * front no los reescribe.
 */
@Injectable({ providedIn: 'root' })
export class ModeloScoringService extends HttpService {
  private readonly base = '/scoring/modelo';

  constructor(http: HttpClient, private toastr: ToastrService) {
    super(http);
  }

  private error(error: any, contexto: string): null {
    this.toastr.error(error?.error?.message || '', contexto);
    return null;
  }

  private exito<T>(respuesta: RespuestaScoring<T> | null | undefined): RespuestaScoring<T> | null {
    if (!respuesta?.success) return null;
    this.toastr.success(respuesta.message, 'Éxito');
    return respuesta;
  }

  async getModelos({
    busqueda = '',
    estado,
    incluirVersiones,
    pagina = 1,
    limite = 10,
  }: {
    busqueda?: string;
    estado?: string;
    incluirVersiones?: boolean;
    pagina?: number;
    limite?: number;
  } = {}) {
    try {
      const params: any = { pagina, limite };
      if (busqueda) params['busqueda'] = busqueda;
      if (estado) params['estado'] = estado;
      if (incluirVersiones) params['incluirVersiones'] = incluirVersiones;

      const resp = await firstValueFrom(
        this.get<PaginadoScoring<IModeloScoring>>(this.base, params),
      );
      return resp.body ?? null;
    } catch (error: any) {
      return this.error(error, 'Error al listar modelos de scoring');
    }
  }

  /** Alimenta el desplegable "Tipo de Scoring". */
  async getTipos() {
    try {
      const resp = await firstValueFrom(
        this.get<ITipoScoring[]>(`${this.base}/tipos`),
      );
      return resp.body ?? [];
    } catch (error: any) {
      this.error(error, 'Error al listar tipos de scoring');
      return [];
    }
  }

  async getModeloById(scoringId: number) {
    try {
      const resp = await firstValueFrom(
        this.get<IModeloScoring & { rangos: IRangoDictamen[] }>(
          `${this.base}/${scoringId}`,
        ),
      );
      return resp.body ?? null;
    } catch (error: any) {
      return this.error(error, 'Error al consultar el modelo');
    }
  }

  /** Crea la versión 1. Un código repetido devuelve ERR-SCOR-001. */
  async createModelo(modelo: IModeloScoring) {
    try {
      const resp = await firstValueFrom(
        this.post<RespuestaScoring<IModeloScoring>>(
          this.base,
          this.aPayload(modelo),
        ),
      );
      return this.exito(resp.body);
    } catch (error: any) {
      return this.error(error, 'Error al crear el modelo');
    }
  }

  /**
   * Edita el modelo. Falla si ya tiene evaluaciones asociadas: en ese caso hay
   * que versionar, porque cambiar coeficientes alteraría dictámenes emitidos.
   */
  async updateModelo(modelo: IModeloScoring) {
    try {
      const resp = await firstValueFrom(
        this.put<RespuestaScoring<IModeloScoring>>(
          `${this.base}/${modelo.scoringId}`,
          this.aPayload(modelo),
        ),
      );
      return this.exito(resp.body);
    } catch (error: any) {
      return this.error(error, 'Error al actualizar el modelo');
    }
  }

  /** Clona el modelo a la versión siguiente. La nueva nace inactiva. */
  async versionarModelo(scoringId: number) {
    try {
      const resp = await firstValueFrom(
        this.post<RespuestaScoring<IModeloScoring>>(
          `${this.base}/${scoringId}/version`,
          {},
        ),
      );
      return this.exito(resp.body);
    } catch (error: any) {
      return this.error(error, 'Error al versionar el modelo');
    }
  }

  /**
   * El botón rojo de la tabla. El borrado es lógico: inactivar un scoring con
   * evaluaciones en estado Solicitud devuelve ERR-SCOR-003.
   */
  async cambiarEstado(scoringId: number, estado: string) {
    try {
      const resp = await firstValueFrom(
        this.patch<RespuestaScoring<IModeloScoring>>(
          `${this.base}/${scoringId}/estado`,
          { estado },
        ),
      );
      return this.exito(resp.body);
    } catch (error: any) {
      return this.error(error, 'Error al cambiar el estado');
    }
  }

  /** Aplica el orden tras arrastrar filas. El arreglo llega en el orden final. */
  async reordenar(ids: number[]) {
    try {
      const resp = await firstValueFrom(
        this.patch<RespuestaScoring<{ reordenados: number }>>(
          `${this.base}/orden/aplicar`,
          { ids },
        ),
      );
      return resp.body?.success ? resp.body : null;
    } catch (error: any) {
      return this.error(error, 'Error al reordenar');
    }
  }

  /**
   * Quita del payload lo que el backend calcula o rechaza.
   *
   * version, fechas y usuarios los administra el microservicio; enviarlos haría
   * fallar la validación, que corre con forbidNonWhitelisted.
   */
  private aPayload(modelo: IModeloScoring): Record<string, unknown> {
    const {
      scoringId,
      version,
      fechaCreacion,
      fechaModificacion,
      usuarioCreacion,
      usuarioModificacion,
      tipoScoring,
      rangos,
      ...resto
    } = modelo;

    return {
      ...resto,
      rangos: (rangos ?? []).map(({ rangoId, scoringId: _s, ...rango }) => rango),
    };
  }
}
