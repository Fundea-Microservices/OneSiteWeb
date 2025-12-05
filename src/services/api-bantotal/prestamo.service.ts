import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpService } from '../HttpService';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import {
  ApiBantotalPrestamoResponse,
  BuscarPrestamoPorDocumentoParams,
  BuscarPrestamoPorDocumentoResponse
} from '../../interfaces/api-bantotal/prestamo';

/**
 * Servicio para interactuar con la API de Bantotal - Módulo de Préstamos
 * 
 * Este servicio maneja todas las operaciones relacionadas con la gestión
 * de préstamos en el sistema Bantotal.
 */
@Injectable({
  providedIn: 'root'
})
export class PrestamosBantotalService extends HttpService {

  private readonly endpoints = {
    buscarPorDocumento: '/api-bantotal/prestamo/buscar-por-documento'
  };

  constructor(http: HttpClient) {
    super(http);
  }

  /**
   * Buscar préstamo por documento y prestamoUID
   * 
   * @param params - Parámetros de búsqueda (documento, prestamo, tipoDoc opcional, pais opcional)
   * @returns Observable con la información completa del préstamo, persona y cliente
   * 
   * @example
   * ```typescript
   * this.prestamosService.buscarPrestamoPorDocumento({
   *   documento: '6543782370101',
   *   prestamo: '0000367503-000',
   *   pais: 320,
   *   tipoDoc: 1
   * }).subscribe(result => {
   *   console.log('Persona:', result.persona);
   *   console.log('Cliente:', result.cliente);
   *   console.log('Préstamo:', result.prestamo);
   *   console.log('Saldo:', result.prestamo.saldo);
   *   console.log('Estado:', result.prestamo.estado);
   * });
   * ```
   */
  buscarPrestamoPorDocumento(
    params: BuscarPrestamoPorDocumentoParams
  ): Observable<BuscarPrestamoPorDocumentoResponse> {
    const url = this.endpoints.buscarPorDocumento;
    
    // Construir el body con los parámetros
    const body: any = {
      documento: params.documento,
      prestamo: params.prestamo
    };

    // Agregar parámetros opcionales si están presentes
    if (params.tipoDoc !== undefined) {
      body.tipoDoc = params.tipoDoc;
    }
    if (params.pais !== undefined) {
      body.pais = params.pais;
    }

    console.log('🔍 [PrestamoService] Buscando préstamo con:', body);

    return this.post<ApiBantotalPrestamoResponse<BuscarPrestamoPorDocumentoResponse>>(
      url,
      body
    ).pipe(
      map(response => {
        console.log('✅ [PrestamoService] Respuesta completa:', response.body);
        
        // La respuesta tiene una estructura anidada: response.body.data.data
        const bodyData = response.body?.data as any;
        
        // Verificar si hay una segunda capa de anidamiento
        if (bodyData?.data) {
          console.log('📦 [PrestamoService] Datos extraídos de capa anidada:', bodyData.data);
          return bodyData.data as BuscarPrestamoPorDocumentoResponse;
        }
        
        // Si no hay anidamiento, retornar directamente
        console.log('📦 [PrestamoService] Datos extraídos directamente:', bodyData);
        return bodyData as BuscarPrestamoPorDocumentoResponse;
      }),
      catchError(error => {
        console.error('❌ [PrestamoService] Error al buscar préstamo:', {
          status: error.status,
          statusText: error.statusText,
          errorData: error.error,
          url: error.url
        });
        
        // Enriquecer el error con información adicional para mejor debugging
        if (error.error?.data?.message) {
          console.error('📋 [PrestamoService] Mensaje del backend:', error.error.data.message);
        }
        
        return throwError(() => error);
      })
    );
  }

  /**
   * Obtener información resumida del préstamo
   * Útil para mostrar en listas o tarjetas
   * 
   * @param params - Parámetros de búsqueda
   * @returns Observable con solo la información del préstamo
   */
  obtenerInfoPrestamo(
    params: BuscarPrestamoPorDocumentoParams
  ): Observable<any> {
    return this.buscarPrestamoPorDocumento(params).pipe(
      map(response => response.prestamo)
    );
  }

  /**
   * Verificar si un préstamo está en estado normal
   * 
   * @param params - Parámetros de búsqueda
   * @returns Observable con boolean indicando si el préstamo está normal
   */
  verificarEstadoPrestamo(
    params: BuscarPrestamoPorDocumentoParams
  ): Observable<boolean> {
    return this.buscarPrestamoPorDocumento(params).pipe(
      map(response => response.prestamo.estado.toLowerCase() === 'normal')
    );
  }
}
