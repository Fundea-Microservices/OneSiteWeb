import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { HttpService } from '../HttpService';
import {
  CargarPartidasDto,
  CargarPartidasResponse,
  EstadoEjecucionResponse
} from '../../interfaces/erp-bc/partidas-contables';

@Injectable({
  providedIn: 'root'
})
export class PartidasContablesService extends HttpService {

  private readonly endpoints = {
    cargar:          '/financiero-bc/partidas-contables/cargar',
    reenviarErrores: '/financiero-bc/partidas-contables/reenviar-errores',
    ejecuciones:     '/financiero-bc/partidas-contables/ejecuciones',
  };

  constructor(http: HttpClient) {
    super(http);
  }

  /**
   * Dispara la carga de partidas contables hacia Business Central para la fecha
   * indicada. Responde 202 casi inmediato: el proceso sigue corriendo en el
   * backend y el avance se consulta con `getEjecucion`.
   * Responde 409 si ya hay una carga viva para ese día.
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
   * indicada. El backend los busca solo, sin volver a recorrer Bantotal, así
   * que termina en segundos. Responde 202 con la bitácora de tipo `REENVIO`.
   * Solo se manda `fecha`: cualquier campo extra devuelve 400.
   */
  reenviarErrores(dto: CargarPartidasDto): Observable<CargarPartidasResponse> {
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
   * Consulta el registro de LogsCargaAsientos de la fecha indicada: si existe,
   * si sigue en ejecución, su progreso y si se permite (re)ejecutar la carga.
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
}
