import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { HttpService } from '../HttpService';
import {
  CargarPartidasDto,
  CargarPartidasResponse,
  ErroresEjecucionParams,
  ErroresEjecucionResponse,
  EstadoEjecucionResponse,
  ReenviarErroresDto
} from '../../interfaces/erp-bc/partidas-contables';

@Injectable({
  providedIn: 'root'
})
export class PartidasContablesService extends HttpService {

  private readonly endpoints = {
    cargar:          '/financiero-bc/partidas-contables/cargar',
    reenviarErrores: '/financiero-bc/partidas-contables/reenviar-errores',
    ejecuciones:     '/financiero-bc/partidas-contables/ejecuciones',
    errores:         '/financiero-bc/partidas-contables/errores',
  };

  constructor(http: HttpClient) {
    super(http);
  }

  /**
   * Dispara la carga de partidas contables hacia Business Central para la fecha
   * indicada. Responde 202 casi inmediato: el proceso sigue corriendo en el
   * backend y el avance se consulta con `getEjecucion`.
   * Responde 409 si ya hay una carga viva para ese día, aunque tenga otro
   * `alcance`. Sin `alcance` el backend asume `AMBAS`.
   * El token se envía automáticamente en los headers por HttpService.
   */
  cargar(dto: CargarPartidasDto): Observable<CargarPartidasResponse> {
    return this.post<CargarPartidasResponse>(this.endpoints.cargar, dto).pipe(
      map(response => response.body!),
      catchError(error => {
        console.error('❌ [PartidasContablesService] Error al cargar partidas:', {
          status: error.status,
          errorData: error.error
        });
        return throwError(() => error);
      })
    );
  }

  /**
   * Reenvía únicamente los asientos que quedaron en error para la fecha
   * indicada, en todos sus lotes (el del día y los de fecha valor anterior).
   * El backend los busca solo, sin volver a recorrer Bantotal, así que termina
   * en segundos. Responde 202 con la bitácora de tipo `REENVIO`.
   * Solo se manda `fecha`: cualquier campo extra devuelve 400.
   */
  reenviarErrores(dto: ReenviarErroresDto): Observable<CargarPartidasResponse> {
    return this.post<CargarPartidasResponse>(this.endpoints.reenviarErrores, dto).pipe(
      map(response => response.body!),
      catchError(error => {
        console.error('❌ [PartidasContablesService] Error al reenviar los asientos en error:', {
          status: error.status,
          errorData: error.error
        });
        return throwError(() => error);
      })
    );
  }

  /**
   * Consulta las bitácoras de la fecha indicada: el último resultado del lote
   * del día (`ejecucion`), el de cada lote de fecha valor anterior
   * (`anteriores`) y la última corrida con cualquier alcance
   * (`ultimaEjecucion`). Las banderas generales (`enEjecucion`, `descuadre`,
   * `puedeReenviar`...) resumen todos los lotes.
   *
   * Un descuadre responde 200 con `success: true`: la carga terminó bien, lo
   * que falló son los datos de origen. No hay que tratarlo como error de red.
   *
   * @param fecha formato `YYYY-MM-DD`
   */
  getEjecucion(fecha: string): Observable<EstadoEjecucionResponse> {
    return this.get<EstadoEjecucionResponse>(`${this.endpoints.ejecuciones}/${fecha}`).pipe(
      map(response => response.body!),
      catchError(error => {
        console.error('❌ [PartidasContablesService] Error al consultar la ejecución:', {
          status: error.status,
          errorData: error.error
        });
        return throwError(() => error);
      })
    );
  }

  /**
   * Asientos en ERROR de la fecha agrupados por mensaje, paginados sobre los
   * grupos. Cubre lo mismo que el reenvío: el lote del día y los de fecha
   * valor anterior. Sin parámetros el backend usa `page=1`, `limit=10` y
   * `todos=false`.
   *
   * @param fecha formato `YYYY-MM-DD`
   */
  getErrores(fecha: string, params: ErroresEjecucionParams = {}): Observable<ErroresEjecucionResponse> {
    return this.get<ErroresEjecucionResponse>(`${this.endpoints.errores}/${fecha}`, params).pipe(
      map(response => response.body!),
      catchError(error => {
        console.error('❌ [PartidasContablesService] Error al consultar los errores de la ejecución:', {
          status: error.status,
          errorData: error.error
        });
        return throwError(() => error);
      })
    );
  }
}
