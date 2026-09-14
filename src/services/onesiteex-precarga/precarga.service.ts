import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { HttpService } from '../HttpService';
import {
  IAnularPrecargas,
  IAnularPrecargasResultado,
  IDetallePrecargaFilters,
  IPrecargaDetalle,
  PrecargaListResponse,
  PrecargaSingleResponse,
} from '../../interfaces/onesiteex-precarga/onesiteex-precarga';

@Injectable({ providedIn: 'root' })
export class PrecargaService extends HttpService {
  private readonly base = '/onesiteex/precarga';

  constructor(http: HttpClient, private toastr: ToastrService) {
    super(http);
  }

  /** Precargas cargadas en el rango (ambas fechas inclusivas), en cualquier estado. */
  async getDetalle({
    fechaInicio, fechaFin, idEncuesta, idEmpresa, idEncuestador, estado, page = 1, limit = 10, all,
  }: IDetallePrecargaFilters) {
    try {
      const params: any = all ? { all: true } : { page, limit };
      params['fechaInicio'] = fechaInicio;
      params['fechaFin'] = fechaFin;
      if (idEncuesta != null) params['idEncuesta'] = idEncuesta;
      if (idEmpresa != null) params['idEmpresa'] = idEmpresa;
      if (idEncuestador != null) params['idEncuestador'] = idEncuestador;
      if (estado) params['estado'] = estado;
      const resp = await firstValueFrom(
        this.get<PrecargaListResponse<IPrecargaDetalle>>(`${this.base}/detalle`, params)
      );
      return resp.body?.success ? resp.body : null;
    } catch (error: any) {
      this.toastr.error(error?.error?.message || '', 'Error al obtener las precargas');
      return null;
    }
  }

  /**
   * Pasa a ANULADO las que sigan en CARGADO. No es todo o nada: las que no se
   * pudieron anular vienen en `noAnuladas` con su motivo. Si no se anula
   * ninguna el servidor responde 409.
   */
  async anularPrecargas(dto: IAnularPrecargas) {
    try {
      const resp = await firstValueFrom(
        this.post<PrecargaSingleResponse<IAnularPrecargasResultado>>(`${this.base}/anular`, dto)
      );
      if (resp.body?.success) {
        if (resp.body.data?.noAnuladas?.length) this.toastr.warning(resp.body.message || '', 'Anulación parcial');
        else this.toastr.success(resp.body.message || 'Precargas anuladas', 'Éxito');
        return resp.body;
      }
      return null;
    } catch (error: any) {
      this.toastr.error(error?.error?.message || '', 'No se anularon las precargas');
      return null;
    }
  }
}
