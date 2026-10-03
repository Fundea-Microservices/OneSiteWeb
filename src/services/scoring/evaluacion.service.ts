import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { HttpService } from '../HttpService';
import {
  ICuestionario,
  IEvaluacionCredito,
  IRespuestaCaptura,
  ISimulacion,
  ISolicitudBantotal,
  PaginadoScoring,
  RespuestaScoring,
} from '../../interfaces/scoring/scoring';

/** Pantalla 4: Evaluación de Solicitudes de Crédito. */
@Injectable({ providedIn: 'root' })
export class EvaluacionScoringService extends HttpService {
  private readonly base = '/scoring/evaluacion';

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

  /**
   * Botón [Consultar Bantotal].
   *
   * Si la solicitud no existe, el backend devuelve ERR-SCOR-007 con su texto
   * oficial y aquí se muestra tal cual.
   */
  async consultarBantotal(numeroSolicitud: number) {
    try {
      const resp = await firstValueFrom(
        this.get<ISolicitudBantotal>(`${this.base}/solicitud/${numeroSolicitud}`),
      );
      return resp.body ?? null;
    } catch (error: any) {
      return this.error(error, 'Consulta a Bantotal');
    }
  }

  async getEvaluaciones({
    numeroSolicitud,
    scoringId,
    estadoEvaluacion,
    pagina = 1,
    limite = 10,
  }: {
    numeroSolicitud?: number;
    scoringId?: number;
    estadoEvaluacion?: string;
    pagina?: number;
    limite?: number;
  } = {}) {
    try {
      const params: any = { pagina, limite };
      if (numeroSolicitud) params['numeroSolicitud'] = numeroSolicitud;
      if (scoringId) params['scoringId'] = scoringId;
      if (estadoEvaluacion) params['estadoEvaluacion'] = estadoEvaluacion;

      const resp = await firstValueFrom(
        this.get<PaginadoScoring<IEvaluacionCredito>>(this.base, params),
      );
      return resp.body ?? null;
    } catch (error: any) {
      return this.error(error, 'Error al listar evaluaciones');
    }
  }

  async getEvaluacionById(evaluacionId: number) {
    try {
      const resp = await firstValueFrom(
        this.get<IEvaluacionCredito>(`${this.base}/${evaluacionId}`),
      );
      return resp.body ?? null;
    } catch (error: any) {
      return this.error(error, 'Error al consultar la evaluación');
    }
  }

  /** Preguntas visibles y opciones activas del scoring elegido. */
  async getCuestionario(scoringId: number) {
    try {
      const resp = await firstValueFrom(
        this.get<ICuestionario>(`${this.base}/cuestionario/${scoringId}`),
      );
      return resp.body ?? null;
    } catch (error: any) {
      return this.error(error, 'Error al cargar el cuestionario');
    }
  }

  /**
   * Calcula punteo y semáforo sin guardar.
   *
   * Es lo que alimenta los campos calculados mientras se captura (la utilidad
   * del mockup) y la proyección del punteo. Sin toast: se llama a cada cambio
   * del formulario.
   */
  async simular(scoringId: number, respuestas: IRespuestaCaptura[]) {
    try {
      const resp = await firstValueFrom(
        this.post<ISimulacion>(`${this.base}/simular`, {
          scoringId,
          respuestas,
        }),
      );
      return resp.body ?? null;
    } catch (error: any) {
      return null;
    }
  }

  async createEvaluacion(payload: {
    numeroSolicitud: number;
    scoringId: number;
    datosBantotal: Omit<ISolicitudBantotal, 'numeroSolicitud'>;
    respuestas: IRespuestaCaptura[];
  }) {
    try {
      const resp = await firstValueFrom(
        this.post<RespuestaScoring<IEvaluacionCredito>>(this.base, payload),
      );
      return this.exito(resp.body);
    } catch (error: any) {
      return this.error(error, 'Error al guardar la evaluación');
    }
  }

  /** Solo mientras la evaluación siga en estado Solicitud. */
  async updateEvaluacion(evaluacionId: number, respuestas: IRespuestaCaptura[]) {
    try {
      const resp = await firstValueFrom(
        this.put<RespuestaScoring<IEvaluacionCredito>>(
          `${this.base}/${evaluacionId}`,
          { respuestas },
        ),
      );
      return this.exito(resp.body);
    } catch (error: any) {
      return this.error(error, 'Error al actualizar la evaluación');
    }
  }

  /** Botón [P]: calcula el dictamen y sella la evaluación. */
  async procesar(evaluacionId: number) {
    try {
      const resp = await firstValueFrom(
        this.post<RespuestaScoring<IEvaluacionCredito>>(
          `${this.base}/${evaluacionId}/procesar`,
          {},
        ),
      );
      return this.exito(resp.body);
    } catch (error: any) {
      return this.error(error, 'Error al procesar la evaluación');
    }
  }
}
