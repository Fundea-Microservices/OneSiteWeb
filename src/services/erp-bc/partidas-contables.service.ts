import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { HttpService } from '../HttpService';
import {
  CargarPartidasDto,
  CargarPartidasResponse
} from '../../interfaces/erp-bc/partidas-contables';

@Injectable({
  providedIn: 'root'
})
export class PartidasContablesService extends HttpService {

  private readonly endpoints = {
    cargar: '/financiero-bc/partidas-contables/cargar',
  };

  constructor(http: HttpClient) {
    super(http);
  }

  /**
   * Carga las partidas contables hacia Business Central para la fecha indicada.
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
}
