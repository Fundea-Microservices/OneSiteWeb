import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpService } from '../HttpService';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  ApiBantotalClienteResponse,
  DocumentoDto,
  ObtenerCuentaClienteResponse,
  ObtenerDatosBantotalResponse
} from '../../interfaces/api-bantotal/cliente';

/**
 * Servicio para interactuar con la API de Bantotal - Módulo de Clientes
 * 
 * Este servicio maneja todas las operaciones relacionadas con la gestión
 * de clientes en el sistema Bantotal.
 */
@Injectable({
  providedIn: 'root'
})
export class ClienteBantotalService extends HttpService {

  private readonly endpoints = {
    obtenerCuenta: '/api-bantotal/cliente',
    datosBantotal: '/api-bantotal/cliente/datos-bantotal'
  };

  constructor(http: HttpClient) {
    super(http);
  }

  /**
   * Obtener cuenta de cliente por clienteUId
   * 
   * @param clienteUId - Identificador único del cliente
   * @returns Observable con los datos de la cuenta del cliente
   * 
   * @example
   * ```typescript
   * this.clienteService.obtenerCuentaCliente('181128').subscribe(cuenta => {
   *   console.log('Cuenta BT:', cuenta.cuentaBT);
   * });
   * ```
   */
  obtenerCuentaCliente(clienteUId: string): Observable<ObtenerCuentaClienteResponse> {
    const url = `${this.endpoints.obtenerCuenta}/${clienteUId}/cuenta`;
    
    return this.get<ApiBantotalClienteResponse<ObtenerCuentaClienteResponse>>(url).pipe(
      map(response => {
        if (!response.body?.success) {
          throw new Error(response.body?.message || 'Error al obtener cuenta del cliente');
        }
        return response.body.data as ObtenerCuentaClienteResponse;
      })
    );
  }

  /**
   * Obtener datos Bantotal de un cliente por documento (DPI)
   * 
   * Retorna información completa del cliente incluyendo:
   * - Datos personales (nombre, apellidos, fecha de nacimiento, etc.)
   * - Datos de contacto (teléfono, correo)
   * - Datos de domicilio
   * - Datos bancarios (personaUId, clienteUId, cuentaBT)
   * 
   * @param documentoDto - DTO con documento y parámetros opcionales
   * @returns Observable con los datos completos del cliente
   * 
   * @example
   * ```typescript
   * this.clienteService.obtenerDatosBantotal({
   *   documento: '1234567890101',
   *   pais: 320,
   *   tipoDoc: 1
   * }).subscribe(datos => {
   *   console.log('Nombre:', datos.primerNombre, datos.primerApellido);
   *   console.log('Cuenta BT:', datos.cuentaBT);
   *   console.log('Cliente UID:', datos.clienteUId);
   * });
   * ```
   */
  obtenerDatosBantotal(documentoDto: DocumentoDto): Observable<ObtenerDatosBantotalResponse> {
    return this.post<ApiBantotalClienteResponse<ObtenerDatosBantotalResponse>>(
      this.endpoints.datosBantotal,
      documentoDto
    ).pipe(
      map(response => {
        if (!response.body?.success) {
          throw new Error(response.body?.message || 'Error al obtener datos Bantotal');
        }
        return response.body.data as ObtenerDatosBantotalResponse;
      })
    );
  }

  /**
   * Verificar si un cliente existe en Bantotal por documento
   * 
   * @param documento - Número de documento
   * @param pais - Código de país (opcional, default: 320 - Guatemala)
   * @param tipoDoc - Tipo de documento (opcional, default: 1 - DPI)
   * @returns Observable<boolean> - true si el cliente existe
   * 
   * @example
   * ```typescript
   * this.clienteService.existeCliente('1234567890101').subscribe(existe => {
   *   if (existe) {
   *     console.log('Cliente existe en Bantotal');
   *   }
   * });
   * ```
   */
  existeCliente(documento: string, pais?: number, tipoDoc?: number): Observable<boolean> {
    return this.obtenerDatosBantotal({
      documento,
      pais,
      tipoDoc
    }).pipe(
      map(() => true),
      // Si hay error, el cliente no existe
      map(() => false)
    );
  }
}
