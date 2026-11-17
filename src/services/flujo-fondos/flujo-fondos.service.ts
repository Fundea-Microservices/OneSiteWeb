import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { HttpService } from '../HttpService';
import {
  CalendarioPrestamoResponse,
  CambiarEstadoFlujoResponse,
  ICambiarEstadoFlujo,
  ConsultaSolicitudResponse,
  EstadoFlujo,
  FlujoDetalleResponse,
  FlujosResponse,
  IFlujoCreate,
  IFlujoDetalle,
  IFlujoEncabezado,
  IFlujoExistente,
  IFlujoUpdate,
  IOtroPrestamo,
  IOtroPrestamoInput,
  IParametrosFlujo,
  IResumenActividades,
  ISimulacionFlujo,
  ISimularFlujoInput,
  ISolicitudCreditoBantotal,
  ParametrosFlujoResponse,
  ResumenActividadesResponse,
  SimulacionFlujoResponse,
} from '../../interfaces/flujo-fondos';

export interface FlujosFiltro {
  page?: number;
  limit?: number;
  search?: string;
  numeroSolicitud?: number;
  documento?: string;
  estado?: EstadoFlujo | '';
}

/**
 * Por qué falló la consulta de la solicitud: cada caso se explica distinto al asesor.
 * - SOLICITUD: Bantotal rechazó la solicitud (FF-01-*: sin evaluación, sin cuenta, no activa...)
 * - CONFIGURACION: el gateway no se autenticó con Bantotal o no vino data (502); no es del asesor
 * - SIN_CONEXION: Bantotal no respondió (503) o no hay red; se puede reintentar
 */
export type FalloConsulta = 'SOLICITUD' | 'CONFIGURACION' | 'SIN_CONEXION' | 'OTRO';

export type ResultadoConsultaSolicitud =
  | { ok: true; solicitud: ISolicitudCreditoBantotal; flujoActivo: IFlujoEncabezado | null }
  | { ok: false; fallo: FalloConsulta; mensaje: string };

export type ResultadoCreacion =
  | { ok: true; flujo: IFlujoDetalle }
  | { ok: false; existente: IFlujoExistente | null };

@Injectable({
  providedIn: 'root'
})
export class FlujoFondosService extends HttpService {

  private readonly endpoint = '/flujo-fondos/flujos';

  constructor(http: HttpClient, private toastr: ToastrService) {
    super(http);
  }

  /** Omite los parámetros vacíos: "Todos" en un filtro no envía el parámetro. */
  private buildParams(filtro: { [key: string]: any }) {
    const params: { [key: string]: any } = {};
    Object.entries(filtro).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params[key] = value;
      }
    });
    return params;
  }

  /** Bandeja. `search` busca en código, nombre del cliente y documento. */
  async getFlujos({ page = 1, limit = 10, search, numeroSolicitud, documento, estado }: FlujosFiltro = {}) {
    try {
      const params = this.buildParams({ page, limit, search, numeroSolicitud, documento, estado });
      const resp = await firstValueFrom(this.get<FlujosResponse>(this.endpoint, params));
      if (resp.body?.success) {
        return resp.body;
      }

      return null;
    } catch (error: any) {
      console.log("🚀 ~ FlujoFondosService ~ getFlujos ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error en flujos de fondos');
      return null;
    }
  }

  /**
   * Consulta la solicitud en Bantotal y si ya tiene un flujo no anulado.
   *
   * Sin toast: la pantalla muestra el resultado junto al buscador. Una caída del
   * core (5xx) no debe parecer un problema de la solicitud, o el asesor la daría por perdida.
   * El 401 lo maneja el flujo normal de sesión.
   */
  async consultarSolicitud(numeroSolicitud: number): Promise<ResultadoConsultaSolicitud> {
    try {
      const resp = await firstValueFrom(this.get<ConsultaSolicitudResponse>(`${this.endpoint}/detalle/${numeroSolicitud}`));
      if (resp.body?.success) {
        return { ok: true, ...resp.body.data };
      }

      return { ok: false, fallo: 'OTRO', mensaje: resp.body?.message || 'No se pudo consultar la solicitud.' };
    } catch (error: any) {
      console.log("🚀 ~ FlujoFondosService ~ consultarSolicitud ~ error:", error)
      const status: number = error?.status ?? 0;
      const mensaje: string = error?.error?.message || '';

      // Bantotal explica qué le pasa a la solicitud (FF-01-NO_EVALUACION, FF-01-NO_CLIENTE...)
      if (status === 400) {
        return { ok: false, fallo: 'SOLICITUD', mensaje: mensaje || `Bantotal rechazó la solicitud ${numeroSolicitud}.` };
      }
      if (status === 502) {
        return { ok: false, fallo: 'CONFIGURACION', mensaje: mensaje || 'No se pudo consultar el Core Bantotal. Contacte al administrador.' };
      }
      if (status === 0 || status === 503) {
        return { ok: false, fallo: 'SIN_CONEXION', mensaje: mensaje || 'No se pudo conectar con Bantotal. Intente de nuevo en unos minutos.' };
      }
      return { ok: false, fallo: 'OTRO', mensaje: mensaje || 'No se pudo consultar la solicitud.' };
    }
  }

  /**
   * Vista previa de la matriz, sin guardar. Sin toast: se llama mientras se captura,
   * y el error (p. ej. actividad sin distribución) se muestra junto a la matriz.
   */
  async simular(body: ISimularFlujoInput): Promise<{ data: ISimulacionFlujo } | { error: string }> {
    try {
      const resp = await firstValueFrom(this.post<SimulacionFlujoResponse>(`${this.endpoint}/simular`, body));
      if (resp.body?.success) {
        return { data: resp.body.data };
      }

      return { error: resp.body?.message || 'No se pudo calcular la proyección.' };
    } catch (error: any) {
      console.log("🚀 ~ FlujoFondosService ~ simular ~ error:", error)
      return { error: error?.error?.message || 'No se pudo calcular la proyección.' };
    }
  }

  /**
   * Calcula y valida un préstamo en otra institución sin guardarlo. Sin toast: el error
   * (MS-FJF-51-01/02/03: saldo mayor al monto, cuota que no cubre el interés...) se
   * muestra junto al formulario del préstamo.
   */
  async calendarioPrestamo(body: IOtroPrestamoInput): Promise<{ data: IOtroPrestamo } | { error: string }> {
    try {
      const resp = await firstValueFrom(this.post<CalendarioPrestamoResponse>(`${this.endpoint}/calendario-prestamo`, body));
      if (resp.body?.success) {
        return { data: resp.body.data };
      }

      return { error: resp.body?.message || 'No se pudo calcular el calendario del préstamo.' };
    } catch (error: any) {
      console.log("🚀 ~ FlujoFondosService ~ calendarioPrestamo ~ error:", error)
      return { error: error?.error?.message || 'No se pudo calcular el calendario del préstamo.' };
    }
  }

  /** 409 (MS-FJF-42-01): la solicitud ya tiene un flujo; viene { id, codigo, estado } para abrirlo. */
  async createFlujo(body: IFlujoCreate): Promise<ResultadoCreacion> {
    try {
      const resp = await firstValueFrom(this.post<FlujoDetalleResponse>(this.endpoint, body));
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Success');
        return { ok: true, flujo: resp.body.data };
      }

      return { ok: false, existente: null };
    } catch (error: any) {
      console.log("🚀 ~ FlujoFondosService ~ createFlujo ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error al crear flujo de fondos');
      const existente = error?.status === 409 && error?.error?.data?.id ? error.error.data as IFlujoExistente : null;
      return { ok: false, existente };
    }
  }

  /**
   * Reemplaza líneas, préstamos y actividades estacionales y recalcula la proyección.
   * Un flujo RECHAZADO pasa a CORREGIDO; ACEPTADO y ANULADO no se editan (409 MS-FJF-45-02).
   */
  async updateFlujo(id: string, body: IFlujoUpdate): Promise<IFlujoDetalle | null> {
    try {
      const resp = await firstValueFrom(this.put<FlujoDetalleResponse>(`${this.endpoint}/${id}`, body));
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Success');
        return resp.body.data;
      }

      return null;
    } catch (error: any) {
      console.log("🚀 ~ FlujoFondosService ~ updateFlujo ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error al actualizar flujo de fondos');
      return null;
    }
  }

  /**
   * Acepta, rechaza o anula el flujo (POST /:id/estado). Un flujo ACEPTADO ya no se edita
   * y solo puede pasar a ANULADO. 409 (MS-FJF-46-02) si el estado actual no lo permite.
   */
  async cambiarEstado(id: string, body: ICambiarEstadoFlujo): Promise<IFlujoEncabezado | null> {
    try {
      const resp = await firstValueFrom(this.post<CambiarEstadoFlujoResponse>(`${this.endpoint}/${id}/estado`, body));
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Success');
        return resp.body.data;
      }

      return null;
    } catch (error: any) {
      console.log("🚀 ~ FlujoFondosService ~ cambiarEstado ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error al cambiar estado del flujo de fondos');
      return null;
    }
  }

  /** Detalle con su proyección. Con agrupar=true la matriz suma las líneas de la misma actividad. */
  async getFlujoById(id: string, agrupar = false): Promise<IFlujoDetalle | null> {
    try {
      const resp = await firstValueFrom(this.get<FlujoDetalleResponse>(`${this.endpoint}/${id}`, { agrupar }));
      if (resp.body?.success) {
        return resp.body.data;
      }

      return null;
    } catch (error: any) {
      console.log("🚀 ~ FlujoFondosService ~ getFlujoById ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error al obtener flujo de fondos');
      return null;
    }
  }

  /** Resumen por año de las actividades. Solo existe para un flujo guardado: necesita su id. */
  async getResumenActividades(id: string): Promise<IResumenActividades | null> {
    try {
      const resp = await firstValueFrom(this.get<ResumenActividadesResponse>(`${this.endpoint}/${id}/resumen-actividades`));
      if (resp.body?.success) {
        return resp.body.data;
      }

      return null;
    } catch (error: any) {
      console.log("🚀 ~ FlujoFondosService ~ getResumenActividades ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error al obtener resumen de actividades');
      return null;
    }
  }

  /**
   * Parámetros de ingreso y egreso calculados con los datos de Bantotal. La primera vez el
   * back consulta Bantotal y los guarda (201); después solo lee lo guardado (200).
   *
   * Sin toast: la sección muestra el error con opción de reintentar. 400 trae en data.claves
   * los parámetros que no se pudieron calcular; 502/503 son del core, no del flujo.
   */
  async getParametros(id: string): Promise<{ data: IParametrosFlujo } | { error: string }> {
    try {
      const resp = await firstValueFrom(this.get<ParametrosFlujoResponse>(`${this.endpoint}/${id}/parametros`));
      if (resp.body?.success) {
        return { data: resp.body.data };
      }

      return { error: resp.body?.message || 'No se pudieron obtener los datos de Bantotal.' };
    } catch (error: any) {
      console.log("🚀 ~ FlujoFondosService ~ getParametros ~ error:", error)
      const status: number = error?.status ?? 0;
      const mensaje: string = error?.error?.message || '';
      const claves: string[] = Array.isArray(error?.error?.data?.claves) ? error.error.data.claves : [];

      if (status === 400 && claves.length) {
        return { error: `${mensaje || 'No se pudieron calcular los parámetros.'} (${claves.join(', ')})` };
      }
      if (status === 502) {
        return { error: mensaje || 'No se pudo consultar el Core Bantotal. Contacte al administrador.' };
      }
      if (status === 0 || status === 503) {
        return { error: mensaje || 'No se pudo conectar con Bantotal. Intente de nuevo en unos minutos.' };
      }
      return { error: mensaje || 'No se pudieron obtener los datos de Bantotal.' };
    }
  }
}
