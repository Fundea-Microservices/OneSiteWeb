import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpService } from '../HttpService';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { CrearRepresentanteDto, Representante, RepresentanteResponse, ListarRepresentantesParams } from '../../interfaces/aliado/representante';

/**
 * Servicio para gestionar representantes de empresas aliadas
 * 
 * Este servicio maneja todas las operaciones CRUD relacionadas con
 * los representantes legales de las empresas.
 */
@Injectable({
  providedIn: 'root'
})
export class RepresentanteService extends HttpService {

  private readonly endpoints = {
    representante: '/representante',
  };

  constructor(http: HttpClient, private toastr: ToastrService) {
    super(http);
  }

  /**
   * Crear un nuevo representante
   * 
   * @param representante - Datos del representante a crear
   * @returns Promise con la respuesta del backend o null en caso de error
   * 
   * @example
   * ```typescript
   * const nuevoRepresentante: CrearRepresentanteDto = {
   *   primerNombre: "Juan",
   *   segundoNombre: "Carlos",
   *   primerApellido: "Pérez",
   *   segundoApellido: "García",
   *   nroDocumento: "1234567890123",
   *   tipoDocumentoId: 1,
   *   paisDocumentoId: 320,
   *   fechaNacimiento: "1985-05-15",
   *   sexo: "M",
   *   correoElectronico: "juan.perez@example.com",
   *   telefonoCelular: 12345678,
   *   direccionRepresentante: "Zona 10, Ciudad de Guatemala",
   *   codigoPostal: 1010,
   *   estadoCivilId: 1,
   *   ocupacionId: 5,
   *   actividadLaboralId: 3,
   *   ingresos: 5000,
   *   paisDomicilioId: 320,
   *   departamentoId: 1,
   *   localidadId: 1,
   *   usrIngreso: "admin"
   * };
   * 
   * const resultado = await this.representanteService.crearRepresentante(nuevoRepresentante);
   * if (resultado) {
   *   console.log('Representante creado:', resultado.data?.representante);
   * }
   * ```
   */
  async crearRepresentante(representante: CrearRepresentanteDto): Promise<RepresentanteResponse | null> {
    console.log('🚀 Creando nuevo representante...');
    console.log('📋 Datos:', representante);

    try {
      const resp = await firstValueFrom(
        this.post<RepresentanteResponse>(this.endpoints.representante, representante)
      );

      if (resp.body?.success) {
        console.log('✅ Representante creado exitosamente');
        this.toastr.success(resp.body.message || 'Representante creado correctamente', '¡Éxito!');
        return resp.body;
      }

      console.warn('⚠️ Respuesta no exitosa:', resp.body);
      return null;

    } catch (error: any) {
      console.error('❌ Error al crear representante:', error);
      
      const errorMsg = error?.error?.message || error?.message || 'Error al crear el representante';
      this.toastr.error(errorMsg, 'Error');
      
      return null;
    }
  }

  /**
   * Obtener representantes con filtros avanzados
   * 
   * @param params - Parámetros de filtrado (paginación, búsqueda, documento, tipo, activo)
   * @returns Promise con la lista de representantes o null en caso de error
   * 
   * @example
   * ```typescript
   * // Buscar por nombre o apellido
   * const resultado = await this.representanteService.listarRepresentantes({ 
   *   page: 1, 
   *   limit: 10, 
   *   busqueda: 'Juan' 
   * });
   * 
   * // Buscar por número de documento específico
   * const resultado = await this.representanteService.listarRepresentantes({ 
   *   nroDocumento: '1234567890123'
   * });
   * 
   * // Filtrar por tipo de documento y solo activos
   * const resultado = await this.representanteService.listarRepresentantes({ 
   *   tipoDocumentoId: 1,
   *   activo: true,
   *   page: 1,
   *   limit: 20
   * });
   * ```
   */
  async listarRepresentantes(params: ListarRepresentantesParams = {}): Promise<RepresentanteResponse | null> {
    console.log('🔍 Listando representantes con filtros:', params);

    try {
      // Construir query params solo con valores definidos
      const queryParams: any = {};
      
      if (params.page !== undefined) queryParams.page = params.page;
      if (params.limit !== undefined) queryParams.limit = params.limit;
      if (params.busqueda) queryParams.busqueda = params.busqueda;
      if (params.nroDocumento) queryParams.nroDocumento = params.nroDocumento;
      if (params.tipoDocumentoId !== undefined) queryParams.tipoDocumentoId = params.tipoDocumentoId;
      if (params.activo !== undefined) queryParams.activo = params.activo;

      const resp = await firstValueFrom(
        this.get<RepresentanteResponse>(this.endpoints.representante, queryParams)
      );

      if (resp.body?.success) {
        const total = resp.body.data?.representantes?.length || 0;
        console.log(`✅ ${total} representante(s) encontrado(s)`);
        if (resp.body.metadata) {
          console.log('📋 Metadata:', resp.body.metadata);
        }
        return resp.body;
      }

      console.warn('⚠️ Respuesta no exitosa:', resp.body);
      return null;

    } catch (error: any) {
      console.error('❌ Error al listar representantes:', error);
      this.toastr.error(error?.error?.message || 'Error al cargar representantes', 'Error');
      return null;
    }
  }

  /**
   * Actualizar un representante existente
   * 
   * @param representanteId - ID del representante a actualizar
   * @param representante - Datos del representante a actualizar
   * @returns Promise con la respuesta del backend o null en caso de error
   */
  async actualizarRepresentante(representanteId: string, representante: Partial<CrearRepresentanteDto>): Promise<RepresentanteResponse | null> {
    console.log(`🔄 Actualizando representante ${representanteId}...`);

    try {
      const resp = await firstValueFrom(
        this.put<RepresentanteResponse>(`${this.endpoints.representante}/${representanteId}`, representante)
      );

      if (resp.body?.success) {
        console.log('✅ Representante actualizado exitosamente');
        this.toastr.success(resp.body.message || 'Representante actualizado correctamente', '¡Éxito!');
        return resp.body;
      }

      return null;

    } catch (error: any) {
      console.error('❌ Error al actualizar representante:', error);
      this.toastr.error(error?.error?.message || 'Error al actualizar el representante', 'Error');
      return null;
    }
  }

  /**
   * Eliminar (desactivar) un representante
   * 
   * @param representanteId - ID del representante a eliminar
   * @returns Promise con la respuesta del backend o null en caso de error
   */
  async eliminarRepresentante(representanteId: string): Promise<RepresentanteResponse | null> {
    console.log(`🗑️ Eliminando representante ${representanteId}...`);

    try {
      const resp = await firstValueFrom(
        this.delete<RepresentanteResponse>(`${this.endpoints.representante}/${representanteId}`)
      );

      if (resp.body?.success) {
        console.log('✅ Representante eliminado exitosamente');
        this.toastr.success(resp.body.message || 'Representante eliminado correctamente', '¡Éxito!');
        return resp.body;
      }

      return null;

    } catch (error: any) {
      console.error('❌ Error al eliminar representante:', error);
      this.toastr.error(error?.error?.message || 'Error al eliminar el representante', 'Error');
      return null;
    }
  }
}
