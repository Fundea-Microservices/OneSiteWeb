import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpService } from '../HttpService';
import { Observable, throwError, firstValueFrom } from 'rxjs';
import { map, catchError, take } from 'rxjs/operators';
import { signal } from '@angular/core';
import {
  ListarCatalogosParams,
  ListarCatalogosResponse,
  Catalogo,
  ConfiguracionCatalogosResponse,
  CatalogoSimple
} from '../../interfaces/api-bantotal/catalogos';

/**
 * Servicio para interactuar con la API de Bantotal - Módulo de Catálogos
 * 
 * Este servicio maneja todas las operaciones relacionadas con la gestión
 * de catálogos en el sistema Bantotal (países, departamentos, municipios,
 * actividades, etc.). Los catálogos son datos que rara vez cambian.
 */
@Injectable({
  providedIn: 'root'
})
export class CatalogosBantotalService extends HttpService {

  private readonly endpoints = {
    listar: '/api-bantotal/catalogos'
  };

  private readonly configEndpoints = {
    configuracion: '/config/general'
  };

  // Signal público para controlar el estado de carga
  actualizandoCatalogos = signal(false);

  constructor(http: HttpClient) {
    super(http);
  }

  /**
   * Listar catálogos con filtros opcionales
   * 
   * @param params - Parámetros de búsqueda y filtrado
   * @returns Observable con la lista de catálogos y metadata de paginación
   * 
   * @example
   * ```typescript
   * // Obtener todos los municipios activos (primera página)
   * this.catalogosService.listarCatalogos({
   *   grupo: 'municipio',
   *   activo: true,
   *   page: 1,
   *   limit: 50
   * }).subscribe(result => {
   *   console.log('Municipios:', result.catalogos);
   *   console.log('Total:', result.metadata.total);
   * });
   * 
   * // Buscar actividades específicas
   * this.catalogosService.listarCatalogos({
   *   grupo: 'actividad',
   *   busqueda: 'TRANSPORTE',
   *   page: 1,
   *   limit: 20
   * }).subscribe(result => {
   *   console.log('Actividades encontradas:', result.catalogos);
   * });
   * 
   * // Obtener todos los catálogos sin paginación
   * this.catalogosService.listarCatalogos({
   *   all: true
   * }).subscribe(result => {
   *   console.log('Todos los catálogos:', result.catalogos);
   * });
   * ```
   */
  listarCatalogos(params?: ListarCatalogosParams): Observable<ListarCatalogosResponse> {
    // Construir query params como objeto plano
    const queryParams: any = {};

    if (params) {
      if (params.activo !== undefined) queryParams.activo = params.activo;
      if (params.grupo) queryParams.grupo = params.grupo;
      if (params.busqueda) queryParams.busqueda = params.busqueda;
      if (params.all !== undefined) queryParams.all = params.all;
      if (params.page) queryParams.page = params.page;
      if (params.limit) queryParams.limit = params.limit;
    }

    // Pasar queryParams directamente, no dentro de otro objeto
    return this.get<ListarCatalogosResponse>(
      this.endpoints.listar,
      queryParams
    ).pipe(
      map((response) => {
        // Extraer el cuerpo de la respuesta si es un HttpResponse
        const body = 'body' in response ? response.body : response;
        if (!body) {
          throw new Error('La respuesta no tiene cuerpo (body)');
        }
        return body;
      }),
      catchError((error) => {
        console.error('❌ Error al listar catálogos:', {
          status: error.status,
          statusText: error.statusText,
          error: error.error,
          url: error.url
        });

        // Extraer mensaje de error del backend
        let errorMessage = 'Error al listar los catálogos';
        if (error.error?.message) {
          errorMessage = error.error.message;
          console.error('📋 Mensaje del backend:', errorMessage);
        }

        return throwError(() => ({
          message: errorMessage,
          status: error.status,
          error: error.error
        }));
      })
    );
  }

  /**
   * Obtener catálogos por grupo específico
   * 
   * @param grupo - Nombre del grupo (ej: 'pais', 'departamento', 'municipio', 'actividad')
   * @param activo - Filtrar solo activos (default: true)
   * @returns Observable con la lista de catálogos del grupo
   * 
   * @example
   * ```typescript
   * // Obtener todos los países activos
   * this.catalogosService.obtenerPorGrupo('pais').subscribe(result => {
   *   console.log('Países:', result.catalogos);
   * });
   * 
   * // Obtener todos los departamentos (incluyendo inactivos)
   * this.catalogosService.obtenerPorGrupo('departamento', false).subscribe(result => {
   *   console.log('Departamentos:', result.catalogos);
   * });
   * ```
   */
  obtenerPorGrupo(grupo: string, activo: boolean = true): Observable<ListarCatalogosResponse> {

    return this.listarCatalogos({
      grupo,
      activo,
      all: true // Obtener todos sin paginación
    });
  }

  /**
   * Buscar catálogos por texto
   * 
   * @param busqueda - Texto a buscar en el nombre del catálogo
   * @param grupo - Grupo opcional para filtrar
   * @returns Observable con la lista de catálogos encontrados
   * 
   * @example
   * ```typescript
   * // Buscar "GUATEMALA" en todos los grupos
   * this.catalogosService.buscar('GUATEMALA').subscribe(result => {
   *   console.log('Resultados:', result.catalogos);
   * });
   * 
   * // Buscar "AGRO" solo en actividades
   * this.catalogosService.buscar('AGRO', 'actividad').subscribe(result => {
   *   console.log('Actividades agrícolas:', result.catalogos);
   * });
   * ```
   */
  buscar(busqueda: string, grupo?: string): Observable<ListarCatalogosResponse> {

    return this.listarCatalogos({
      busqueda,
      grupo,
      activo: true,
      all: true
    });
  }

  /**
   * Actualiza y almacena en localStorage todos los catálogos de Bantotal.
   * 
   * 1. Obtiene la lista de grupos de catálogos desde el endpoint de configuración.
   * 2. Para cada grupo, solicita todos los catálogos correspondientes.
   * 3. Simplifica los datos para que sean más ligeros.
   * 4. Guarda todo en un solo objeto en localStorage bajo la clave 'BANTOTAL_CATALOGOS'.
   * 
   * @returns Promise<void> que se resuelve cuando todos los catálogos han sido guardados.
   * 
   * @example
   * ```typescript
   * await this.catalogosService.actualizarCatalogos();
   * console.log('¡Catálogos actualizados en localStorage!');
   * ```
   */
  async actualizarCatalogos(): Promise<void> {
    // Activar el estado de carga
    this.actualizandoCatalogos.set(true);

    try {
      // 1. Obtener la lista de grupos de catálogos
      const httpResponse = await firstValueFrom(
        this.get<ConfiguracionCatalogosResponse>(`${this.configEndpoints.configuracion}/catalogos`)
      );

      const configBody = httpResponse ? httpResponse.body : null;

      if (!configBody || !configBody.data || !configBody.data.value) {
        throw new Error('No se pudo obtener la configuración de los grupos de catálogos.');
      }

      const grupos: string[] = JSON.parse(configBody.data.value);

      // 2. Preparar todas las peticiones en paralelo
      // Usamos el get directo sin pasar por listarCatalogos para evitar el catchError
      const promesas = grupos.map(grupo => {
        const queryParams: any = {
          grupo,
          all: true,
          activo: true
        };

        return firstValueFrom(
          this.get<any>(this.endpoints.listar, queryParams).pipe(
            map((response) => {
              const body = 'body' in response ? response.body : response;
              if (!body) {
                throw new Error(`No hay respuesta para el grupo: ${grupo}`);
              }

              // La respuesta tiene doble anidamiento: body.data.data.catalogos
              const catalogosData = body.data?.data?.catalogos;

              if (!catalogosData || !Array.isArray(catalogosData)) {
                console.error(`⚠️ Estructura inválida para grupo "${grupo}":`, body);
                throw new Error(`Estructura de respuesta inválida para el grupo: ${grupo}`);
              }

              return { grupo, catalogos: catalogosData };
            })
          )
        );
      });

      const resultados = await Promise.all(promesas);

      // 3. Procesar y estructurar los resultados
      const catalogosParaStorage: { [key: string]: CatalogoSimple[] } = {};

      resultados.forEach(({ grupo, catalogos }) => {
        // Mapear a la interfaz simplificada
        catalogosParaStorage[grupo] = catalogos.map((c: any) => ({
          catalogoId: c.catalogoId,
          grupo: c.grupo,
          nombre: c.nombre,
          valorCore: c.valorCore,
          padreId: c.padreId,
          padreValorCore: c.padreValorCore,
          activo: c.activo,
          orden: c.orden,
        }));
      });

      // 4. Guardar en localStorage
      localStorage.setItem('BANTOTAL_CATALOGOS', JSON.stringify(catalogosParaStorage));
      
      // Desactivar el estado de carga
      this.actualizandoCatalogos.set(false);

    } catch (error) {
      console.error('❌ Error fatal durante la actualización de catálogos:', error);

      // Desactivar el estado de carga incluso si hay error
      this.actualizandoCatalogos.set(false);

      // Opcional: limpiar localStorage si falla
      // localStorage.removeItem('BANTOTAL_CATALOGOS');
      throw error; // Re-lanzar el error para que el llamador pueda manejarlo
    }
  }

  /**
 * Obtiene un grupo de catálogos desde el localStorage.
 * 
 * @param grupo - El nombre del grupo a obtener (ej: 'pais', 'departamento').
 * @returns Un array de `CatalogoSimple` o `null` si no se encuentra.
 * 
 * @example
 * ```typescript
 * const paises = this.catalogosService.obtenerLocal('pais');
 * if (paises) {
 *   console.log('Países desde localStorage:', paises);
 * }
 * ```
 */
  obtenerLocal(grupo: string): CatalogoSimple[] | null {
    const catalogosStorage = localStorage.getItem('BANTOTAL_CATALOGOS');

    if (!catalogosStorage) {
      console.warn('⚠️ No se encontraron catálogos en localStorage. Ejecute actualizarCatalogos() primero.');
      return null;
    }

    try {
      const todosLosCatalogos = JSON.parse(catalogosStorage);
      const grupoSolicitado = todosLosCatalogos[grupo];

      if (grupoSolicitado) {
        return grupoSolicitado;
      } else {
        console.warn(`🟡 No se encontró el grupo "${grupo}" en los catálogos de localStorage.`);
        return null;
      }
    } catch (error) {
      console.error('❌ Error al parsear los catálogos desde localStorage:', error);
      return null;
    }
  }

  /**
   * Obtiene todos los catálogos almacenados en localStorage.
   * @returns Un objeto con todos los grupos de catálogos, o null.
   */
  obtenerTodosLocal(): { [key: string]: CatalogoSimple[] } | null {
    const catalogosStorage = localStorage.getItem('BANTOTAL_CATALOGOS');
    if (!catalogosStorage) {
      console.warn('⚠️ No se encontraron catálogos en localStorage.');
      return null;
    }
    try {
      return JSON.parse(catalogosStorage);
    } catch (error) {
      console.error('❌ Error al parsear los catálogos desde localStorage:', error);
      return null;
    }
  }
}
