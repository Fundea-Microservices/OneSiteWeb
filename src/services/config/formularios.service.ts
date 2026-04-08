import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpService } from '../HttpService';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { 
  FormEncabezado, 
  FormEncabezadoByIdResponse, 
  FormEncabezadoResponse 
} from '../../interfaces/configuracion';

@Injectable({
  providedIn: 'root'
})
export class FormulariosService extends HttpService {

  private readonly endpoints = {
    formularioEncabezado: '/formulario/encabezado',
  };

  constructor(http: HttpClient, private toastr: ToastrService) {
    super(http);
  }

  async getFormEncabezados({ page = 1, limit = 10, search = '' } = {}) {
    try {
      const params: any = { page, limit, search };
      const resp = await firstValueFrom(this.get<FormEncabezadoResponse>(`${this.endpoints.formularioEncabezado}`, params));
      return resp.body?.success ? resp.body : null;
    } catch (error: any) {
      console.error("Error en getFormEncabezados:", error);
      this.toastr.error(error?.error?.message || '', 'Error al obtener encabezados');
      return null;
    }
  }

  async getFormEncabezadoById(id: string) {
    try {
      const resp = await firstValueFrom(this.get<FormEncabezadoByIdResponse>(`${this.endpoints.formularioEncabezado}/${id}`));
      return resp.body?.success ? resp.body : null;
    } catch (error: any) {
      console.error("Error en getFormEncabezadoById:", error);
      this.toastr.error(error?.error?.message || '', 'Error al obtener encabezado');
      return null;
    }
  }

  async createFormEncabezado(data: FormEncabezado) {
    try {
      // 🛡️ Filtramos solo los campos permitidos por el CreateEncabezadoDto
      const payload = {
        nombre: data.nombre,
        descripcion: data.descripcion,
        activo: data.activo
      };

      const resp = await firstValueFrom(this.post<FormEncabezadoByIdResponse>(this.endpoints.formularioEncabezado, payload));
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Éxito');
        return resp.body;
      }
      return null;
    } catch (error: any) {
      console.error("Error en createFormEncabezado:", error);
      this.toastr.error(error?.error?.message || '', 'Error al crear encabezado');
      return null;
    }
  }

  async updateFormEncabezado(data: FormEncabezado) {
    try {
      if (!data.formId) throw new Error("ID de formulario no proporcionado");

      // 🛡️ Filtramos solo los campos permitidos por el UpdateEncabezadoDto
      // formId se envía tanto en URL como en body según el controlador
      const payload = {
        formId: data.formId,
        nombre: data.nombre,
        descripcion: data.descripcion,
        activo: data.activo
      };

      // URL correcta según el controlador: PUT /formulario/encabezado/:formId
      const url = `${this.endpoints.formularioEncabezado}/${data.formId}`;
      const resp = await firstValueFrom(this.put<FormEncabezadoByIdResponse>(url, payload));
      
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Éxito');
        return resp.body;
      }
      return null;
    } catch (error: any) {
      console.error("Error en updateFormEncabezado:", error);
      this.toastr.error(error?.error?.message || '', 'Error al actualizar encabezado');
      return null;
    }
  }

  async deleteFormEncabezado(id: string) {
    try {
      const resp = await firstValueFrom(this.delete<FormEncabezadoByIdResponse>(`${this.endpoints.formularioEncabezado}/${id}`));
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Éxito');
        return resp.body;
      }
      return null;
    } catch (error: any) {
      console.error("Error en deleteFormEncabezado:", error);
      this.toastr.error(error?.error?.message || '', 'Error al eliminar encabezado');
      return null;
    }
  }
}
