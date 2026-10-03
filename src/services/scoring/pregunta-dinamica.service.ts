import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { HttpService } from '../HttpService';
import {
  IPreguntaDinamica,
  IValidacionFormula,
  RespuestaScoring,
} from '../../interfaces/scoring/scoring';

/** Pantalla 3: Gestión de Preguntas. */
@Injectable({ providedIn: 'root' })
export class PreguntaDinamicaService extends HttpService {
  private readonly base = '/scoring/pregunta';

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

  async getPreguntas(scoringId: number, busqueda = '') {
    try {
      const params: any = { scoringId };
      if (busqueda) params['busqueda'] = busqueda;

      const resp = await firstValueFrom(
        this.get<IPreguntaDinamica[]>(this.base, params),
      );
      return resp.body ?? [];
    } catch (error: any) {
      this.error(error, 'Error al listar preguntas');
      return [];
    }
  }

  async getPreguntaById(preguntaId: number) {
    try {
      const resp = await firstValueFrom(
        this.get<IPreguntaDinamica>(`${this.base}/${preguntaId}`),
      );
      return resp.body ?? null;
    } catch (error: any) {
      return this.error(error, 'Error al consultar la pregunta');
    }
  }

  async createPregunta(pregunta: IPreguntaDinamica) {
    try {
      const resp = await firstValueFrom(
        this.post<RespuestaScoring<IPreguntaDinamica>>(
          this.base,
          this.aPayload(pregunta),
        ),
      );
      return this.exito(resp.body);
    } catch (error: any) {
      return this.error(error, 'Error al crear la pregunta');
    }
  }

  async updatePregunta(pregunta: IPreguntaDinamica) {
    try {
      const resp = await firstValueFrom(
        this.put<RespuestaScoring<IPreguntaDinamica>>(
          `${this.base}/${pregunta.preguntaId}`,
          this.aPayload(pregunta),
        ),
      );
      return this.exito(resp.body);
    } catch (error: any) {
      return this.error(error, 'Error al actualizar la pregunta');
    }
  }

  /** Falla si otra fórmula referencia el código de esta pregunta. */
  async deletePregunta(preguntaId: number) {
    try {
      const resp = await firstValueFrom(
        this.delete<RespuestaScoring<unknown>>(`${this.base}/${preguntaId}`),
      );
      return this.exito(resp.body);
    } catch (error: any) {
      return this.error(error, 'Error al eliminar la pregunta');
    }
  }

  /**
   * Comprueba la fórmula sin guardarla: sintaxis, que las preguntas que
   * referencia existan, y que no cierre un ciclo con las demás fórmulas.
   *
   * No muestra toast de éxito: se llama mientras el usuario escribe y un toast
   * por pulsación sería insoportable. El error sí se devuelve para que el modal
   * lo pinte junto al campo.
   */
  async validarFormula(scoringId: number, formula: string, codigoPregunta?: string) {
    try {
      const resp = await firstValueFrom(
        this.post<IValidacionFormula>(`${this.base}/validar-formula`, {
          scoringId,
          formula,
          ...(codigoPregunta ? { codigoPregunta } : {}),
        }),
      );
      return { valida: true, mensaje: '', referencias: resp.body?.referencias ?? [] };
    } catch (error: any) {
      return {
        valida: false,
        mensaje:
          error?.error?.detalle ||
          error?.error?.message ||
          'La fórmula contiene errores.',
        referencias: [] as string[],
      };
    }
  }

  async reordenar(ids: number[]) {
    try {
      const resp = await firstValueFrom(
        this.patch<RespuestaScoring<{ reordenadas: number }>>(
          `${this.base}/orden/aplicar`,
          { ids },
        ),
      );
      return resp.body?.success ? resp.body : null;
    } catch (error: any) {
      return this.error(error, 'Error al reordenar preguntas');
    }
  }

  /**
   * La fórmula solo viaja cuando la respuesta es calculada. Mandarla en una
   * pregunta normal no rompe nada, pero deja basura en la base que después
   * confunde al revisar por qué una pregunta "tiene fórmula" y no la usa.
   */
  private aPayload(pregunta: IPreguntaDinamica): Record<string, unknown> {
    const { preguntaId, catalogoRespuestas, ordenDespliegue, ...resto } =
      pregunta;

    return {
      ...resto,
      catalogoRespuestasId: resto.catalogoRespuestasId || undefined,
      formula: resto.respuestaCalculada ? resto.formula : undefined,
      observacionesPregunta: resto.observacionesPregunta || undefined,
    };
  }
}
