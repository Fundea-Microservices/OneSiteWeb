import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { HttpService } from '../HttpService';
import {
  IProcedimientoScoring,
  PaginadoScoring,
  RespuestaScoring,
} from '../../interfaces/scoring/scoring';

/** Catálogo de procedimientos almacenados del módulo de Scoring. */
@Injectable({ providedIn: 'root' })
export class ProcedimientoScoringService extends HttpService {
  private readonly base = '/scoring/procedimiento';

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

  async getProcedimientos({
    busqueda = '',
    estado,
    pagina = 1,
    limite = 10,
  }: {
    busqueda?: string;
    estado?: string;
    pagina?: number;
    limite?: number;
  } = {}) {
    try {
      const params: any = { pagina, limite };
      if (busqueda?.trim()) params['busqueda'] = busqueda.trim();
      if (estado) params['estado'] = estado;

      const resp = await firstValueFrom(
        this.get<PaginadoScoring<IProcedimientoScoring>>(this.base, params),
      );
      return resp.body ?? null;
    } catch (error: any) {
      return this.error(error, 'Error al listar procedimientos');
    }
  }

  /** Alimenta los desplegables de proceso del modal de modelo. */
  async getAplicados() {
    try {
      const resp = await firstValueFrom(
        this.get<IProcedimientoScoring[]>(`${this.base}/aplicados`),
      );
      return resp.body ?? [];
    } catch (error: any) {
      this.error(error, 'Error al listar procedimientos');
      return [];
    }
  }

  async getProcedimiento(procedimientoId: number) {
    try {
      const resp = await firstValueFrom(
        this.get<IProcedimientoScoring>(`${this.base}/${procedimientoId}`),
      );
      return resp.body ?? null;
    } catch (error: any) {
      return this.error(error, 'Error al consultar el procedimiento');
    }
  }

  /** Solo registra el script: no lo ejecuta. Eso es aplicar(). */
  async createProcedimiento(procedimiento: IProcedimientoScoring) {
    try {
      const resp = await firstValueFrom(
        this.post<RespuestaScoring<IProcedimientoScoring>>(
          this.base,
          procedimiento,
        ),
      );
      return this.exito(resp.body);
    } catch (error: any) {
      return this.error(error, 'Error al crear el procedimiento');
    }
  }

  async updateProcedimiento(
    procedimientoId: number,
    procedimiento: IProcedimientoScoring,
  ) {
    try {
      const resp = await firstValueFrom(
        this.put<RespuestaScoring<IProcedimientoScoring>>(
          `${this.base}/${procedimientoId}`,
          procedimiento,
        ),
      );
      return this.exito(resp.body);
    } catch (error: any) {
      return this.error(error, 'Error al actualizar el procedimiento');
    }
  }

  /** Ejecuta el script contra la base. */
  async aplicar(procedimientoId: number) {
    try {
      const resp = await firstValueFrom(
        this.post<RespuestaScoring<IProcedimientoScoring>>(
          `${this.base}/${procedimientoId}/aplicar`,
          {},
        ),
      );
      return this.exito(resp.body);
    } catch (error: any) {
      return this.error(error, 'Error al aplicar el procedimiento');
    }
  }

  async cambiarEstado(procedimientoId: number, estado: string) {
    try {
      const resp = await firstValueFrom(
        this.patch<RespuestaScoring<IProcedimientoScoring>>(
          `${this.base}/${procedimientoId}/estado`,
          { estado },
        ),
      );
      return this.exito(resp.body);
    } catch (error: any) {
      return this.error(error, 'Error al cambiar el estado');
    }
  }
}
