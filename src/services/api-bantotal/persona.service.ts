import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpService } from '../HttpService';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import {
  ApiBantotalResponse,
  BuscarPersonaPorDocumentoParams,
  BuscarPersonaPorDocumentoResponse,
  PersonaCompleta,
  CuentasClienteResponse
} from '../../interfaces/api-bantotal/persona';

/**
 * Servicio para interactuar con la API de Bantotal - Módulo de Personas
 * 
 * Este servicio maneja todas las operaciones relacionadas con la gestión
 * de personas en el sistema Bantotal.
 */
@Injectable({
  providedIn: 'root'
})
export class PersonasBantotalService extends HttpService {

  private readonly endpoints = {
    buscarPorDocumento: '/api-bantotal/persona/documento',
    obtenerPorId: '/api-bantotal/persona/id',
    obtenerCuentas: '/api-bantotal/persona/cuentas',
    obtenerDatosPorDocumento: '/api-bantotal/persona/datos'
  };

  constructor(http: HttpClient) {
    super(http);
  }

  /**
   * Buscar personaUId por número de documento
   * 
   * @param documento - Número de documento a buscar
   * @param params - Parámetros adicionales (país y tipo de documento)
   * @returns Observable con el personaUId encontrado
   * 
   * @example
   * ```typescript
   * this.personasService.buscarPersonaPorDocumento('123456789', { 
   *   pais: 1, 
   *   tipoDoc: 1 
   * }).subscribe(persona => {
   *   console.log('PersonaUId:', persona.personaUId);
   * });
   * ```
   */
  buscarPersonaPorDocumento(
    documento: string,
    params?: BuscarPersonaPorDocumentoParams
  ): Observable<BuscarPersonaPorDocumentoResponse> {
    const url = `${this.endpoints.buscarPorDocumento}/${documento}`;
    const queryParams: any = {};

    if (params?.pais !== undefined) {
      queryParams.pais = params.pais;
    }
    if (params?.tipoDoc !== undefined) {
      queryParams.tipoDoc = params.tipoDoc;
    }

    return this.get<ApiBantotalResponse<BuscarPersonaPorDocumentoResponse>>(
      url,
      Object.keys(queryParams).length > 0 ? queryParams : undefined
    ).pipe(
      map(response => response.body?.data as BuscarPersonaPorDocumentoResponse)
    );
  }

  /**
   * Obtener datos completos de una persona por su personaUId
   * 
   * @param personaUId - ID único de la persona en Bantotal
   * @returns Observable con los datos completos de la persona
   * 
   * @example
   * ```typescript
   * this.personasService.obtenerPersonaPorId('12345').subscribe(persona => {
   *   console.log('Nombre completo:', persona.nombreCompleto);
   *   console.log('Email:', persona.correoElectronico);
   * });
   * ```
   */
  obtenerPersonaPorId(personaUId: string): Observable<PersonaCompleta> {
    const url = `${this.endpoints.obtenerPorId}/${personaUId}`;
    
    return this.get<ApiBantotalResponse<PersonaCompleta>>(url).pipe(
      map(response => response.body?.data as PersonaCompleta)
    );
  }

  /**
   * Obtener todas las cuentas asociadas a un cliente
   * 
   * @param personaUId - ID único de la persona en Bantotal
   * @returns Observable con las cuentas del cliente
   * 
   * @example
   * ```typescript
   * this.personasService.obtenerCuentasCliente('12345').subscribe(cuentas => {
   *   console.log('Total de cuentas:', cuentas.totalCuentas);
   *   cuentas.cuentas.forEach(cuenta => {
   *     console.log(`Cuenta: ${cuenta.numeroCuenta} - Saldo: ${cuenta.saldo}`);
   *   });
   * });
   * ```
   */
  obtenerCuentasCliente(personaUId: string): Observable<CuentasClienteResponse> {
    const url = `${this.endpoints.obtenerCuentas}/${personaUId}`;
    
    return this.get<ApiBantotalResponse<CuentasClienteResponse>>(url).pipe(
      map(response => response.body?.data as CuentasClienteResponse)
    );
  }

  /**
   * Obtener datos completos de una persona por documento (operación en 2 pasos)
   * 
   * Este método primero busca el personaUId por documento y luego obtiene
   * los datos completos de la persona.
   * 
   * @param documento - Número de documento a buscar
   * @param params - Parámetros adicionales (país y tipo de documento)
   * @returns Observable con los datos completos de la persona
   * 
   * @example
   * ```typescript
   * this.personasService.obtenerDatosPorDocumento('123456789', {
   *   pais: 1,
   *   tipoDoc: 1
   * }).subscribe(persona => {
   *   console.log('Datos completos:', persona);
   * });
   * ```
   */
  obtenerDatosPorDocumento(
    documento: string,
    params?: BuscarPersonaPorDocumentoParams
  ): Observable<PersonaCompleta> {
    const url = `${this.endpoints.obtenerDatosPorDocumento}/${documento}`;
    const queryParams: any = {};

    if (params?.pais !== undefined) {
      queryParams.pais = params.pais;
    }
    if (params?.tipoDoc !== undefined) {
      queryParams.tipoDoc = params.tipoDoc;
    }

    console.log('🔍 [PersonaService] Buscando persona por documento:', documento, queryParams);

    return this.get<ApiBantotalResponse<PersonaCompleta>>(
      url,
      Object.keys(queryParams).length > 0 ? queryParams : undefined
    ).pipe(
      map(response => {
        console.log('✅ [PersonaService] Respuesta completa:', response.body);
        
        // La respuesta puede tener una estructura anidada: response.body.data.data
        const bodyData = response.body?.data as any;
        
        // Verificar si hay una segunda capa de anidamiento
        if (bodyData?.data) {
          console.log('📦 [PersonaService] Datos extraídos de capa anidada:', bodyData.data);
          return bodyData.data as PersonaCompleta;
        }
        
        // Si no hay anidamiento, retornar directamente
        console.log('📦 [PersonaService] Datos extraídos directamente:', bodyData);
        return bodyData as PersonaCompleta;
      }),
      catchError(error => {
        console.error('❌ [PersonaService] Error al buscar persona:', {
          status: error.status,
          statusText: error.statusText,
          errorData: error.error,
          url: error.url
        });
        
        if (error.error?.data?.message) {
          console.error('📋 [PersonaService] Mensaje del backend:', error.error.data.message);
        }
        
        return throwError(() => error);
      })
    );
  }

  /**
   * Método auxiliar para validar si un documento es válido
   * 
   * @param documento - Número de documento a validar
   * @returns true si el documento es válido, false en caso contrario
   */
  validarDocumento(documento: string): boolean {
    return !!(documento && documento.trim().length > 0);
  }

  /**
   * Método auxiliar para formatear el nombre completo de una persona
   * 
   * @param persona - Datos de la persona
   * @returns Nombre completo formateado
   */
  formatearNombreCompleto(persona: PersonaCompleta): string {
    const partes: string[] = [];
    
    if (persona.primerNombre) partes.push(persona.primerNombre);
    if (persona.segundoNombre) partes.push(persona.segundoNombre);
    if (persona.primerApellido) partes.push(persona.primerApellido);
    if (persona.segundoApellido) partes.push(persona.segundoApellido);
    if (persona.apellidoCasada) partes.push(`de ${persona.apellidoCasada}`);
    
    return partes.join(' ');
  }
}
