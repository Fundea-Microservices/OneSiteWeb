import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { ValidarDocumentoParams, ValidarDocumentoResponse } from '../../interfaces/terceros/agente';

@Injectable({
  providedIn: 'root'
})
export class AgenteService {

  private http = inject(HttpClient);
  private endpoint = environment.agente.endpoint;
  private apiKey = environment.agente.apiKey;

  /**
   * Valida un documento mediante OCR/IA
   * @param params Parámetros con acción y archivo
   * @returns Observable con la respuesta de validación
   */
  validarDocumento(params: ValidarDocumentoParams): Observable<ValidarDocumentoResponse> {
    const formData = new FormData();
    formData.append('accion', params.accion);
    formData.append('api_key', this.apiKey);
    formData.append('upload_file', params.upload_file);

    const headers = new HttpHeaders({
      'api_key': this.apiKey
    });

    console.log('🚀 Validando documento:', params.accion);

    return this.http.post<ValidarDocumentoResponse>(this.endpoint, formData, { headers }).pipe(
      map(response => {
        console.log('✅ Documento validado:', response);
        return response;
      }),
      catchError(error => {
        console.error('❌ Error al validar documento:', error);
        
        // Intentar extraer el mensaje de error del servidor
        const errorMessage = error.error?.documento?.metadata?.mensaje_usuario 
          || error.error?.metadata?.mensaje_usuario
          || error.message 
          || 'Error al validar el documento';

        // Retornar respuesta de error estructurada
        const errorResponse: ValidarDocumentoResponse = {
          metadata: {
            success: false,
            statusCode: error.status || 500,
            timestamp: new Date().toISOString(),
            tipo_archivo_procesado: 'desconocido',
            procesado_por: 'Sistema',
            mensaje_usuario: errorMessage
          },
          contenido_documento: {
            validacion_tipo: {
              tipo_detectado: 'ERROR',
              es_documento_esperado: false,
              confianza_prediccion: 'N/A',
              mensaje_error: errorMessage
            },
            datos_especificos: null
          },
          auditoria_calidad: {
            puntuacion_1_100: 0,
            nivel_legibilidad: 'CRITICO',
            problemas_detectados: [errorMessage],
            feedback_para_asesor: 'Error en el proceso de validación'
          },
          resumen_ejecutivo: {
            decision_ia: 'RECHAZADO',
            accion_sugerida: 'REINTENTAR',
            riesgo_fraude: 'DESCONOCIDO',
            llaves_para_cruce: {
              identificador_principal: null,
              nombre_normalizado: null,
              fecha_clave: null
            }
          }
        };

        return of(errorResponse);
      })
    );
  }

  /**
   * Verifica si la respuesta es exitosa
   * @param response Respuesta del servicio
   * @returns true si es exitosa
   */
  isSuccessResponse(response: ValidarDocumentoResponse): boolean {
    return response.metadata?.success === true || 
           response.documento?.metadata?.success === true;
  }

  /**
   * Obtiene el mensaje para mostrar al usuario
   * @param response Respuesta del servicio
   * @returns Mensaje legible
   */
  getMensajeUsuario(response: ValidarDocumentoResponse): string {
    return response.metadata?.mensaje_usuario 
      || response.documento?.metadata?.mensaje_usuario 
      || 'Sin mensaje';
  }

  /**
   * Verifica si el documento fue aprobado
   * @param response Respuesta del servicio
   * @returns true si fue aprobado
   */
  isDocumentoAprobado(response: ValidarDocumentoResponse): boolean {
    // Verificar success en metadata (prioritario)
    const success = response.metadata?.success 
      || response.documento?.metadata?.success;
    
    // Si success es false, rechazar directamente
    if (success === false) {
      return false;
    }
    
    // Obtener decision_ia de ambas estructuras posibles
    const decision = response.resumen_ejecutivo?.decision_ia 
      || response.documento?.resumen_ejecutivo?.decision_ia;
    
    // Si success es true, verificar que no sea RECHAZADO explícitamente
    if (success === true) {
      // Aceptar APROBADO, REVISION, o cualquier otra decision que no sea RECHAZADO
      return decision !== 'RECHAZADO';
    }
    
    // Si success es undefined, usar decision_ia como fallback
    if (decision) {
      return decision !== 'RECHAZADO';
    }
    
    // Como último recurso, verificar si el mensaje NO indica error crítico
    const mensaje = this.getMensajeUsuario(response).toLowerCase();
    const esError = mensaje.includes('error') || 
                    mensaje.includes('rechazado') || 
                    mensaje.includes('inválido') ||
                    mensaje.includes('fallido');
    
    return !esError;
  }

}
