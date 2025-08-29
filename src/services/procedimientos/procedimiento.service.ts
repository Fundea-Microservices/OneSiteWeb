import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpService } from '../HttpService';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { IProcedimiento, ProcedimientoResponse } from '../../interfaces/procedimientos/procedimiento';

@Injectable({
  providedIn: 'root'
})
export class ProcedimientoService extends HttpService {

  private readonly endpoints = {
    procedimiento: '/procedimientos',
  };

  constructor(http: HttpClient, private toastr: ToastrService) {
    super(http); // pasa HttpClient al servicio base
  }

  async getProcedimientos({ page = 1, limit = 10, search = '', all = false } = {}) {
    try {
      let params: any = {
        page,
        limit,
        search
      }
      if (all) {
        params = { ...params, all: all };
      }
      const resp = await firstValueFrom(this.get<ProcedimientoResponse>(`${this.endpoints.procedimiento}`, params));
      if (resp.body?.success) {
        // this.toastr.success(resp.body.message, 'Success');
        return resp.body;
      }

      return null;
    } catch (error: any) {
      console.log("🚀 ~ ProcedimientoService ~ getProcedimientos ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error al obtener procedimientos');
      return null;
    }
  }

  async updateProcedimiento(procedimientoUpdate: IProcedimiento) {
    try {

      const {versiones, ...updateObj} = procedimientoUpdate;

      const resp = await firstValueFrom(this.put<ProcedimientoResponse>(`${this.endpoints.procedimiento}`, updateObj));
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Success');
        return resp.body;
      }

      return null;
    } catch (error: any) {
      console.log("🚀 ~ ProcedimientoService ~ updateProcedimiento ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error al actualizar procedimiento');
      return null;
    }
  }

  async createProcedimiento(createProcedimiento: IProcedimiento) {
    try {
      //Obtenemos solo lo necesario para crear el procedimiento
      const { nombre, descripcion, procedimiento, activo, versionCode } = createProcedimiento;
      const resp = await firstValueFrom(this.post<ProcedimientoResponse>(`${this.endpoints.procedimiento}`, { nombre, descripcion, procedimiento, activo, versionCode }));
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Success');
        return resp.body;
      }

      return null;
    } catch (error: any) {
      console.log("🚀 ~ ProcedimientoService ~ createProcedimiento ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error al crear procedimiento');
      return null;
    }
  }

  async deleteProcedimiento(procedimientoDelete: IProcedimiento) {
    try {
      const resp = await firstValueFrom(this.delete<ProcedimientoResponse>(`${this.endpoints.procedimiento}`, procedimientoDelete));
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Success');
        return resp.body;
      }

      return null;
    } catch (error: any) {
      console.log("🚀 ~ ProcedimientoService ~ deleteProcedimiento ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error al eliminar procedimiento');
      return null;
    }
  }

  async getProcedimientoById(id: string) {
    try {
      const resp = await firstValueFrom(this.get<ProcedimientoResponse>(`${this.endpoints.procedimiento}/${id}`));
      if (resp.body?.success) {
        // this.toastr.success(resp.body.message, 'Success');
        return resp.body;
      }

      return null;
    } catch (error: any) {
      console.log("🚀 ~ ProcedimientoService ~ getProcedimientoById ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error en obtener procedimiento');
      return null;
    }
  }

  

}
