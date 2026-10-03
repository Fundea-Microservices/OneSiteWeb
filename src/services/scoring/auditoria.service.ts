import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { HttpService } from '../HttpService';
import {
  IEvaluacionCredito,
  IExpediente,
  PaginadoScoring,
} from '../../interfaces/scoring/scoring';

/** Pantalla 5: Auditoría y Trazabilidad de Dictámenes. Solo lectura. */
@Injectable({ providedIn: 'root' })
export class AuditoriaScoringService extends HttpService {
  private readonly base = '/scoring/auditoria';

  constructor(http: HttpClient, private toastr: ToastrService) {
    super(http);
  }

  async consultar({
    numeroSolicitud,
    pagina = 1,
    limite = 10,
  }: {
    numeroSolicitud?: number;
    pagina?: number;
    limite?: number;
  } = {}) {
    try {
      const params: any = { pagina, limite };
      if (numeroSolicitud) params['numeroSolicitud'] = numeroSolicitud;

      const resp = await firstValueFrom(
        this.get<PaginadoScoring<IEvaluacionCredito>>(this.base, params),
      );
      return resp.body ?? null;
    } catch (error: any) {
      this.toastr.error(error?.error?.message || '', 'Error en auditoría');
      return null;
    }
  }

  /**
   * Expediente con el desglose matemático.
   *
   * Si la evaluación no está procesada el backend devuelve ERR-SCOR-006 y aquí
   * se muestra ese mensaje: no es una restricción cosmética, una evaluación en
   * estado Solicitud no tiene desglose y abrir la pantalla mostraría un
   * expediente vacío como si fuera un dictamen.
   */
  async getExpediente(evaluacionId: number) {
    try {
      const resp = await firstValueFrom(
        this.get<IExpediente>(`${this.base}/${evaluacionId}/expediente`),
      );
      return resp.body ?? null;
    } catch (error: any) {
      this.toastr.error(
        error?.error?.message || '',
        'No se puede abrir el expediente',
      );
      return null;
    }
  }
}
