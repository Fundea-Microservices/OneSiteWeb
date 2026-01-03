import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpService } from '../HttpService';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { IEmpresaRepresentante } from '../../interfaces/aliado/empresa-representante';

export interface ListarEmpresasRepresentanteParams {
  page?: number;
  limit?: number;
  busqueda?: string;
  nit?: string;
  representanteId?: string;
  activo?: boolean;
}

export interface EmpresaRepresentanteResponse {
  success: boolean;
  message: string;
  statusCode: number;
  data?: IEmpresaRepresentante | IEmpresaRepresentante[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class EmpresaRepresentanteService extends HttpService {

  private readonly endpoints = {
    empresa: '/api-bantotal/empresa/representante',
  };

  constructor(http: HttpClient, private toastr: ToastrService) {
    super(http);
  }

  /**
   * Obtener empresa por ID
   */
  async byId(empresaId: string): Promise<EmpresaRepresentanteResponse | null> {
    try {
      const resp = await firstValueFrom(
        this.get<EmpresaRepresentanteResponse>(`${this.endpoints.empresa}/${empresaId}`)
      );
      if (resp.body?.success) {
        return resp.body;
      }
      return null;
    } catch (error: any) {
      console.error('🚀 ~ EmpresaRepresentanteService ~ byId ~ error:', error);
      this.toastr.error(error?.error?.message || 'Error al obtener empresa', 'Error');
      return null;
    }
  }

  /**
   * Listar empresas con filtros opcionales
   */
  async listarEmpresas(
    params: ListarEmpresasRepresentanteParams = {}
  ): Promise<EmpresaRepresentanteResponse | null> {
    try {
      const queryParams: any = {
        page: params.page || 1,
        limit: params.limit || 10,
      };

      if (params.busqueda) {
        queryParams.busqueda = params.busqueda.trim();
      }
      if (params.nit) {
        // Normalizamos el nit: removemos espacios
        queryParams.nit = params.nit.replace(/\s+/g, '');
      }
      if (params.representanteId) {
        queryParams.representanteId = params.representanteId;
      }
      if (params.activo !== undefined) {
        queryParams.activo = params.activo;
      }

      const resp = await firstValueFrom(
        this.get<EmpresaRepresentanteResponse>(this.endpoints.empresa, queryParams)
      );

      if (resp.body?.success) {
        return resp.body;
      }

      return null;
    } catch (error: any) {
      console.error('🚀 ~ EmpresaRepresentanteService ~ listarEmpresas ~ error:', error);
      this.toastr.error(error?.error?.message || 'Error al listar empresas', 'Error');
      return null;
    }
  }

  /**
   * Crear nueva empresa-representante
   */
  async crearEmpresa(empresa: IEmpresaRepresentante): Promise<EmpresaRepresentanteResponse | null> {
    try {
      // Preparamos el objeto con solo los campos necesarios para la creación
      const createPayload = {
        representanteId: empresa.representanteId,
        nombreEmpresa: empresa.nombreEmpresa,
        nit: empresa.nit.replace(/\s+/g, ''), // Normalizamos espacios
        telefono: empresa.telefono,
        departamento: empresa.departamento,
        municipio: empresa.municipio,
        direccion: empresa.direccion,
        tipoActividad: empresa.tipoActividad,
        actividad: empresa.actividad,
        detalleActividad: empresa.detalleActividad,
        fechaInicioActividad: empresa.fechaInicioActividad,
        usrIngreso: empresa.usrIngreso,
      };

      const resp = await firstValueFrom(
        this.post<EmpresaRepresentanteResponse>(this.endpoints.empresa, createPayload)
      );

      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Éxito');
        return resp.body;
      }

      return null;
    } catch (error: any) {
      console.error('🚀 ~ EmpresaRepresentanteService ~ crearEmpresa ~ error:', error);
      this.toastr.error(error?.error?.message || 'Error al crear empresa', 'Error');
      return null;
    }
  }

  /**
   * Actualizar empresa existente
   */
  async actualizarEmpresa(
    empresaId: string,
    empresa: Partial<IEmpresaRepresentante>
  ): Promise<EmpresaRepresentanteResponse | null> {
    try {
      // Preparamos el objeto con los campos a actualizar
      const updatePayload: any = {};

      if (empresa.nombreEmpresa) updatePayload.nombreEmpresa = empresa.nombreEmpresa;
      if (empresa.nit) updatePayload.nit = empresa.nit.replace(/\s+/g, '');
      if (empresa.telefono !== undefined) updatePayload.telefono = empresa.telefono;
      if (empresa.departamento) updatePayload.departamento = empresa.departamento;
      if (empresa.municipio) updatePayload.municipio = empresa.municipio;
      if (empresa.direccion) updatePayload.direccion = empresa.direccion;
      if (empresa.tipoActividad) updatePayload.tipoActividad = empresa.tipoActividad;
      if (empresa.actividad) updatePayload.actividad = empresa.actividad;
      if (empresa.detalleActividad !== undefined) updatePayload.detalleActividad = empresa.detalleActividad;
      if (empresa.fechaInicioActividad) updatePayload.fechaInicioActividad = empresa.fechaInicioActividad;
      if (empresa.usrIngreso !== undefined) updatePayload.usrIngreso = empresa.usrIngreso;

      const resp = await firstValueFrom(
        this.put<EmpresaRepresentanteResponse>(
          `${this.endpoints.empresa}/${empresaId}`,
          updatePayload
        )
      );

      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Éxito');
        return resp.body;
      }

      return null;
    } catch (error: any) {
      console.error('🚀 ~ EmpresaRepresentanteService ~ actualizarEmpresa ~ error:', error);
      this.toastr.error(error?.error?.message || 'Error al actualizar empresa', 'Error');
      return null;
    }
  }

  /**
   * Eliminar empresa (soft delete)
   */
  async eliminarEmpresa(empresaId: string): Promise<EmpresaRepresentanteResponse | null> {
    try {
      const resp = await firstValueFrom(
        this.delete<EmpresaRepresentanteResponse>(`${this.endpoints.empresa}/${empresaId}`)
      );

      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Éxito');
        return resp.body;
      }

      return null;
    } catch (error: any) {
      console.error('🚀 ~ EmpresaRepresentanteService ~ eliminarEmpresa ~ error:', error);
      this.toastr.error(error?.error?.message || 'Error al eliminar empresa', 'Error');
      return null;
    }
  }

  /**
   * Obtener empresas de un representante específico
   */
  async obtenerEmpresasPorRepresentante(
    representanteId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<EmpresaRepresentanteResponse | null> {
    return this.listarEmpresas({
      representanteId,
      page,
      limit,
    });
  }
}
