import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpService } from '../HttpService';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { 
  ICuentaBancaria, 
  CreateCuentaBancariaDto, 
  UpdateCuentaBancariaDto,
  ListarCuentasBancariasDto 
} from '../../interfaces/aliado/cuenta-bancaria';

export interface CuentaBancariaResponse {
  success: boolean;
  message: string;
  statusCode: number;
  data?: {
    cuentaBancaria: ICuentaBancaria;
  };
}

export interface CuentasBancariasResponse {
  success: boolean;
  message: string;
  statusCode: number;
  data?: {
    data: ICuentaBancaria[];
    metadata: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

@Injectable({
  providedIn: 'root'
})
export class CuentaBancariaService extends HttpService {

  private readonly endpoints = {
    base: '/aliado/cuenta-bancaria',
  };

  constructor(http: HttpClient, private toastr: ToastrService) {
    super(http);
  }

  /**
   * Crear una nueva cuenta bancaria
   */
  async crear(dto: CreateCuentaBancariaDto): Promise<CuentaBancariaResponse | null> {
    try {
      const resp = await firstValueFrom(
        this.post<CuentaBancariaResponse>(this.endpoints.base, dto)
      );
      
      if (resp.body?.success) {
        this.toastr.success(resp.body.message || 'Cuenta bancaria creada exitosamente', 'Éxito');
        return resp.body;
      }
      
      this.toastr.error(resp.body?.message || 'Error al crear la cuenta bancaria', 'Error');
      return null;
    } catch (error: any) {
      console.error('🚀 ~ CuentaBancariaService ~ crear ~ error:', error);
      this.toastr.error(error?.error?.message || 'Error al crear la cuenta bancaria', 'Error');
      return null;
    }
  }

  /**
   * Listar cuentas bancarias con filtros opcionales
   */
  async listar(filtros?: ListarCuentasBancariasDto): Promise<CuentasBancariasResponse | null> {
    try {
      const queryParams: any = {};
      
      if (filtros) {
        if (filtros.page !== undefined) queryParams.page = filtros.page;
        if (filtros.limit !== undefined) queryParams.limit = filtros.limit;
        if (filtros.busqueda) queryParams.busqueda = filtros.busqueda;
        if (filtros.numeroCuenta) queryParams.numeroCuenta = filtros.numeroCuenta;
        if (filtros.empresaId) queryParams.empresaId = filtros.empresaId;
        if (filtros.representanteId) queryParams.representanteId = filtros.representanteId;
        if (filtros.activo !== undefined) queryParams.activo = filtros.activo;
      }

      const resp = await firstValueFrom(
        this.get<CuentasBancariasResponse>(this.endpoints.base, queryParams)
      );
      
      if (resp.body?.success) {
        return resp.body;
      }
      
      return null;
    } catch (error: any) {
      console.error('🚀 ~ CuentaBancariaService ~ listar ~ error:', error);
      this.toastr.error(error?.error?.message || 'Error al listar las cuentas bancarias', 'Error');
      return null;
    }
  }

  /**
   * Obtener cuentas bancarias por empresa
   */
  async obtenerPorEmpresa(empresaId: string, page: number = 1, limit: number = 100): Promise<CuentasBancariasResponse | null> {
    return this.listar({ empresaId, page, limit });
  }

  /**
   * Obtener cuentas bancarias por representante
   */
  async obtenerPorRepresentante(representanteId: string, page: number = 1, limit: number = 100): Promise<CuentasBancariasResponse | null> {
    return this.listar({ representanteId, page, limit });
  }

  /**
   * Obtener una cuenta bancaria por ID
   */
  async obtenerPorId(id: string): Promise<CuentaBancariaResponse | null> {
    try {
      const resp = await firstValueFrom(
        this.get<CuentaBancariaResponse>(`${this.endpoints.base}/${id}`)
      );
      
      if (resp.body?.success) {
        return resp.body;
      }
      
      return null;
    } catch (error: any) {
      console.error('🚀 ~ CuentaBancariaService ~ obtenerPorId ~ error:', error);
      this.toastr.error(error?.error?.message || 'Error al obtener la cuenta bancaria', 'Error');
      return null;
    }
  }

  /**
   * Actualizar una cuenta bancaria
   */
  async actualizar(id: string, dto: UpdateCuentaBancariaDto): Promise<CuentaBancariaResponse | null> {
    try {
      const resp = await firstValueFrom(
        this.put<CuentaBancariaResponse>(`${this.endpoints.base}/${id}`, dto)
      );
      
      if (resp.body?.success) {
        this.toastr.success(resp.body.message || 'Cuenta bancaria actualizada exitosamente', 'Éxito');
        return resp.body;
      }
      
      this.toastr.error(resp.body?.message || 'Error al actualizar la cuenta bancaria', 'Error');
      return null;
    } catch (error: any) {
      console.error('🚀 ~ CuentaBancariaService ~ actualizar ~ error:', error);
      this.toastr.error(error?.error?.message || 'Error al actualizar la cuenta bancaria', 'Error');
      return null;
    }
  }

  /**
   * Eliminar una cuenta bancaria
   */
  async eliminar(id: string): Promise<boolean> {
    try {
      const resp = await firstValueFrom(
        this.delete<CuentaBancariaResponse>(`${this.endpoints.base}/${id}`)
      );
      
      if (resp.body?.success) {
        this.toastr.success(resp.body.message || 'Cuenta bancaria eliminada exitosamente', 'Éxito');
        return true;
      }
      
      this.toastr.error(resp.body?.message || 'Error al eliminar la cuenta bancaria', 'Error');
      return false;
    } catch (error: any) {
      console.error('🚀 ~ CuentaBancariaService ~ eliminar ~ error:', error);
      this.toastr.error(error?.error?.message || 'Error al eliminar la cuenta bancaria', 'Error');
      return false;
    }
  }
}
