import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { HttpService } from '../HttpService';
import {
  CampoMarca,
  CapturaListResponse,
  CapturaSingleResponse,
  ICaptura,
  ICapturaDetalle,
  ICapturaFilters,
  IMarcarCapturaResultado,
  Marca,
} from '../../interfaces/onesiteex-captura/onesiteex-captura';

@Injectable({ providedIn: 'root' })
export class CapturaService extends HttpService {
  private readonly base = '/onesiteex/captura';

  constructor(http: HttpClient, private toastr: ToastrService) {
    super(http);
  }

  /** Encuestas contestadas en el rango (ambas fechas inclusivas). */
  async getCapturas({
    fechaInicio, fechaFin, idEncuesta, idEncuestador, idEmpresa, validado, page = 1, limit = 10, all,
  }: ICapturaFilters) {
    try {
      const params: any = all ? { all: true } : { page, limit };
      if (fechaInicio) params['fechaInicio'] = fechaInicio;
      if (fechaFin) params['fechaFin'] = fechaFin;
      if (idEncuesta != null) params['idEncuesta'] = idEncuesta;
      if (idEncuestador != null) params['idEncuestador'] = idEncuestador;
      if (idEmpresa != null) params['idEmpresa'] = idEmpresa;
      if (validado) params['validado'] = validado;
      const resp = await firstValueFrom(
        this.get<CapturaListResponse<ICaptura>>(this.base, params)
      );
      return resp.body?.success ? resp.body : null;
    } catch (error: any) {
      this.toastr.error(error?.error?.message || '', 'Error al obtener las encuestas');
      return null;
    }
  }

  /** La captura con sus respuestas agrupadas por sección, en el orden de la encuesta. */
  async getCaptura(idCaptura: string) {
    try {
      const resp = await firstValueFrom(
        this.get<CapturaSingleResponse<ICapturaDetalle>>(`${this.base}/${idCaptura}`)
      );
      return resp.body?.success ? resp.body : null;
    } catch (error: any) {
      this.toastr.error(error?.error?.message || '', 'Error al obtener la encuesta');
      return null;
    }
  }

  /** Marca la encuesta como revisada y deja al usuario como revisor. */
  async revisarCaptura(idCaptura: string, usuario: string, valor: Marca = 'Si') {
    return this.marcarCaptura('revisado', idCaptura, usuario, valor);
  }

  /** Marca la encuesta como válida y deja al usuario como validador. */
  async validarCaptura(idCaptura: string, usuario: string, valor: Marca = 'Si') {
    return this.marcarCaptura('validado', idCaptura, usuario, valor);
  }

  /**
   * Las dos marcas comparten forma: solo cambian la ruta y el texto. Solo
   * funcionan sobre capturas sin esa marca; si otro supervisor se adelantó el
   * servidor responde 409 y no se sobrescribe nada.
   */
  private async marcarCaptura(
    campo: CampoMarca,
    idCaptura: string,
    usuario: string,
    valor: Marca,
  ) {
    const accion = campo === 'revisado' ? 'revisar' : 'validar';
    try {
      const resp = await firstValueFrom(
        this.patch<CapturaSingleResponse<IMarcarCapturaResultado>>(
          `${this.base}/${idCaptura}/${accion}`,
          { usuario, valor },
        )
      );
      if (resp.body?.success) {
        this.toastr.success(resp.body.message || 'Encuesta marcada', 'Éxito');
        return resp.body;
      }
      return null;
    } catch (error: any) {
      this.toastr.error(error?.error?.message || '', `No se pudo ${accion} la encuesta`);
      return null;
    }
  }
}
